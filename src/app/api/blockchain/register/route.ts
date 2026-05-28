/**
 * POST /api/blockchain/register
 *
 * Accepts a multipart/form-data upload with:
 *   file      — the document (PDF, image, etc.)
 *   docType   — one of: epc | property_report | survey | legal | other
 *   postcode  — UK postcode this document relates to
 *
 * Hashes the file, stores it in /tmp (dev) or Vercel Blob (prod),
 * writes the hash to the Polygon smart contract, and returns
 * a blockchain certificate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import {
  registerDocument,
  isBlockchainConfigured,
  DOC_TYPES,
  hashFile,
  type DocTypeName,
} from '../../../lib/blockchain'

const VALID_DOC_TYPES = new Set(Object.keys(DOC_TYPES))
const MAX_FILE_BYTES  = 20 * 1024 * 1024   // 20 MB

export async function POST(req: NextRequest) {
  // ── Config guard ──────────────────────────────────────────────────────────
  if (!isBlockchainConfigured()) {
    return NextResponse.json(
      {
        error: 'Blockchain not configured',
        hint: 'Add POLYGON_RPC_URL, BLOCKCHAIN_WALLET_KEY, and DOCUMENT_REGISTRY_ADDR to .env.local',
        setupGuide: '/tools/documents#setup',
      },
      { status: 503 }
    )
  }

  // ── Parse form data ───────────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  const docType   = (formData.get('docType')  as string ?? 'other').toLowerCase() as DocTypeName
  const postcode  = (formData.get('postcode') as string ?? '').trim()

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'No file provided — include a "file" field in the form data' }, { status: 400 })
  }
  if (!VALID_DOC_TYPES.has(docType)) {
    return NextResponse.json(
      { error: `Invalid docType "${docType}". Valid values: ${[...VALID_DOC_TYPES].join(', ')}` },
      { status: 400 }
    )
  }
  if (fileEntry.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` }, { status: 413 })
  }

  // ── Read file buffer ──────────────────────────────────────────────────────
  const arrayBuffer = await fileEntry.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)
  const fileName    = fileEntry.name || 'document'

  // ── Store file locally (dev) or in Vercel Blob (prod) ─────────────────────
  let storedUrl: string
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob — production
      const { put } = await import('@vercel/blob')
      const blob = await put(`documents/${hashFile(buffer).slice(2, 18)}_${fileName}`, buffer, {
        access: 'private',
        contentType: fileEntry.type || 'application/octet-stream',
      })
      storedUrl = blob.url
    } else {
      // Local filesystem — development fallback
      const uploadDir = path.join(process.cwd(), 'tmp', 'uploads')
      await mkdir(uploadDir, { recursive: true })
      const safeName  = `${hashFile(buffer).slice(2, 18)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const filePath  = path.join(uploadDir, safeName)
      await writeFile(filePath, buffer)
      storedUrl = `/tmp/uploads/${safeName}`
    }
  } catch (storageErr) {
    console.error('[blockchain/register] storage error:', storageErr)
    return NextResponse.json({ error: 'Failed to store file', details: String(storageErr) }, { status: 500 })
  }

  // ── Register hash on Polygon ───────────────────────────────────────────────
  try {
    const result = await registerDocument({ fileBuffer: buffer, docType, postcode, fileName })

    console.log(`[blockchain/register] registered ${fileName} tx=${result.txHash}`)

    return NextResponse.json({
      success:        true,
      fileName,
      docType,
      postcode:       postcode || null,
      fileHash:       result.fileHash,
      storedUrl,
      txHash:         result.txHash,
      blockNumber:    result.blockNumber,
      polygonscanUrl: result.polygonscanUrl,
      contractAddress: result.contractAddress,
      gasUsed:        result.gasUsed,
      registeredAt:   new Date().toISOString(),
      network:        process.env.POLYGON_NETWORK ?? 'amoy',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[blockchain/register] contract error:', msg)

    const isAlreadyRegistered = msg.toLowerCase().includes('already registered')
    if (isAlreadyRegistered) {
      return NextResponse.json(
        { error: 'This document is already registered on-chain', fileHash: hashFile(buffer) },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Blockchain registration failed', details: msg }, { status: 500 })
  }
}
