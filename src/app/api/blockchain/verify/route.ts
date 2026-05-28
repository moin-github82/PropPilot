/**
 * POST /api/blockchain/verify
 *
 * Accepts a multipart/form-data upload with a single "file" field.
 * Hashes the file and checks whether that hash is recorded on the
 * Polygon smart contract.
 *
 * Returns { registered: true/false, ...metadata } — no gas required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyDocument, isBlockchainConfigured, hashFile } from '../../../lib/blockchain'

const MAX_FILE_BYTES = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  if (!isBlockchainConfigured()) {
    return NextResponse.json(
      {
        error: 'Blockchain not configured',
        hint: 'Add POLYGON_RPC_URL, BLOCKCHAIN_WALLET_KEY, and DOCUMENT_REGISTRY_ADDR to .env.local',
      },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (fileEntry.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer())

  try {
    const result = await verifyDocument(buffer)
    console.log(`[blockchain/verify] hash=${result.fileHash} registered=${result.registered}`)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[blockchain/verify] error:', msg)
    return NextResponse.json({ error: 'Verification failed', details: msg }, { status: 500 })
  }
}

/**
 * GET /api/blockchain/verify?hash=0x...
 * Verify by pre-computed hash (no file upload needed).
 */
export async function GET(req: NextRequest) {
  if (!isBlockchainConfigured()) {
    return NextResponse.json({ error: 'Blockchain not configured' }, { status: 503 })
  }

  const hash = req.nextUrl.searchParams.get('hash')
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    return NextResponse.json(
      { error: 'Provide a valid 32-byte hex hash as ?hash=0x...' },
      { status: 400 }
    )
  }

  // Build a tiny buffer that hashes to the provided value — not possible,
  // so for hash-only verification we call the contract directly.
  // We reuse verifyDocument's contract call with a pre-hashed value.
  try {
    const { ethers } = await import('ethers')
    const provider   = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL!)
    const abi        = [
      'function verifyDocument(bytes32 _hash) external view returns (bool exists, uint8 docType, string postcode, string fileName, address registeredBy, uint256 timestamp)',
    ]
    const contract   = new ethers.Contract(process.env.DOCUMENT_REGISTRY_ADDR!, abi, provider)
    const [exists, docTypeNum, postcode, fileName, registeredBy, timestamp] =
      await contract.verifyDocument(hash)

    const isTestnet  = process.env.POLYGON_NETWORK === 'amoy'
    const { POLYGONSCAN_TX } = await import('../../../lib/blockchain')

    if (!exists) return NextResponse.json({ registered: false, fileHash: hash })

    return NextResponse.json({
      registered:   true,
      fileHash:     hash,
      docType:      ['EPC Certificate','Property Report','Survey','Legal Document','Other'][Number(docTypeNum)] ?? 'Unknown',
      postcode,
      fileName,
      registeredBy,
      registeredAt: new Date(Number(timestamp) * 1000).toISOString(),
      polygonscanUrl: POLYGONSCAN_TX(hash, isTestnet),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Verification failed', details: String(err) }, { status: 500 })
  }
}
