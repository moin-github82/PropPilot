/**
 * Polygon blockchain integration — document registry
 *
 * Uses ethers v6 + Polygon RPC to interact with the
 * DocumentRegistry smart contract.
 *
 * Required env vars:
 *   POLYGON_RPC_URL        — Alchemy/Infura Polygon endpoint
 *   BLOCKCHAIN_WALLET_KEY  — hex private key of the signing wallet
 *   DOCUMENT_REGISTRY_ADDR — deployed contract address
 */

import { ethers } from 'ethers'
import crypto from 'crypto'

// ── ABI (only the functions we call) ─────────────────────────────────────────

const REGISTRY_ABI = [
  // write
  'function registerDocument(bytes32 _hash, uint8 _docType, string calldata _postcode, string calldata _fileName) external',
  // read
  'function verifyDocument(bytes32 _hash) external view returns (bool exists, uint8 docType, string postcode, string fileName, address registeredBy, uint256 timestamp)',
  'function totalDocuments() external view returns (uint256)',
  // event
  'event DocumentRegistered(bytes32 indexed hash, uint8 indexed docType, string postcode, string fileName, address indexed registeredBy, uint256 timestamp)',
] as const

// ── Doc types (must match Solidity enum order) ────────────────────────────────

export const DOC_TYPES = {
  epc:             0,
  property_report: 1,
  survey:          2,
  legal:           3,
  other:           4,
} as const

export type DocTypeName = keyof typeof DOC_TYPES

export const DOC_TYPE_LABELS: Record<number, string> = {
  0: 'EPC Certificate',
  1: 'Property Report',
  2: 'Survey',
  3: 'Legal Document',
  4: 'Other',
}

// ── Chain config ──────────────────────────────────────────────────────────────

const POLYGON_CHAIN_IDS = {
  mainnet: 137,
  amoy:    80002,   // testnet
}

export const POLYGONSCAN_TX  = (txHash: string, testnet = false) =>
  testnet
    ? `https://amoy.polygonscan.com/tx/${txHash}`
    : `https://polygonscan.com/tx/${txHash}`

export const POLYGONSCAN_ADDR = (addr: string, testnet = false) =>
  testnet
    ? `https://amoy.polygonscan.com/address/${addr}`
    : `https://polygonscan.com/address/${addr}`

// ── Provider / signer factory ─────────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.POLYGON_RPC_URL
  if (!rpcUrl || rpcUrl === 'your_polygon_rpc_url_here') {
    throw new Error('POLYGON_RPC_URL not configured. Get a free endpoint at https://alchemy.com')
  }
  return new ethers.JsonRpcProvider(rpcUrl)
}

function getSigner(): ethers.Wallet {
  const key = process.env.BLOCKCHAIN_WALLET_KEY
  if (!key || key === 'your_wallet_private_key_here') {
    throw new Error('BLOCKCHAIN_WALLET_KEY not configured. Generate a new wallet with ethers.Wallet.createRandom()')
  }
  const cleanKey = key.startsWith('0x') ? key : `0x${key}`
  return new ethers.Wallet(cleanKey, getProvider())
}

function getContract(withSigner = false) {
  const address = process.env.DOCUMENT_REGISTRY_ADDR
  if (!address || address === 'your_contract_address_here') {
    throw new Error('DOCUMENT_REGISTRY_ADDR not configured. Deploy DocumentRegistry.sol to Polygon first.')
  }
  const runner = withSigner ? getSigner() : getProvider()
  return new ethers.Contract(address, REGISTRY_ABI, runner)
}

// ── Hashing ───────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 of a Buffer and return it as a 0x-prefixed 32-byte hex
 * string suitable for passing to the smart contract as bytes32.
 */
export function hashFile(buffer: Buffer): string {
  const digest = crypto.createHash('sha256').update(buffer).digest('hex')
  return `0x${digest}`
}

// ── Write ─────────────────────────────────────────────────────────────────────

export interface RegisterResult {
  txHash:          string
  blockNumber:     number
  fileHash:        string
  polygonscanUrl:  string
  contractAddress: string
  gasUsed:         string
}

/**
 * Register a document hash on Polygon.
 * Returns the transaction hash and Polygonscan URL.
 */
export async function registerDocument(params: {
  fileBuffer: Buffer
  docType:    DocTypeName
  postcode:   string
  fileName:   string
}): Promise<RegisterResult> {
  const { fileBuffer, docType, postcode, fileName } = params

  const fileHash   = hashFile(fileBuffer)
  const contract   = getContract(true)
  const isTestnet  = process.env.POLYGON_NETWORK === 'amoy'

  const tx = await contract.registerDocument(
    fileHash,
    DOC_TYPES[docType],
    postcode.toUpperCase().replace(/\s/g, ' ').trim(),
    fileName,
  )

  const receipt: ethers.TransactionReceipt = await tx.wait(1)  // wait 1 confirmation

  return {
    txHash:         receipt.hash,
    blockNumber:    receipt.blockNumber,
    fileHash,
    polygonscanUrl: POLYGONSCAN_TX(receipt.hash, isTestnet),
    contractAddress: process.env.DOCUMENT_REGISTRY_ADDR!,
    gasUsed:        receipt.gasUsed.toString(),
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export interface VerifyResult {
  registered:     boolean
  fileHash:       string
  docType?:       string
  postcode?:      string
  fileName?:      string
  registeredBy?:  string
  registeredAt?:  string   // ISO date string
  polygonscanUrl?: string
}

/**
 * Verify whether a document (by file content) is registered on Polygon.
 * Pass the raw file Buffer — the hash is computed here so the caller
 * never has to handle hex encoding.
 */
export async function verifyDocument(fileBuffer: Buffer): Promise<VerifyResult> {
  const fileHash = hashFile(fileBuffer)
  const contract = getContract(false)
  const isTestnet = process.env.POLYGON_NETWORK === 'amoy'

  const [exists, docTypeNum, postcode, fileName, registeredBy, timestamp] =
    await contract.verifyDocument(fileHash)

  if (!exists) {
    return { registered: false, fileHash }
  }

  return {
    registered:    true,
    fileHash,
    docType:       DOC_TYPE_LABELS[Number(docTypeNum)] ?? 'Unknown',
    postcode,
    fileName,
    registeredBy,
    registeredAt:  new Date(Number(timestamp) * 1000).toISOString(),
    polygonscanUrl: POLYGONSCAN_ADDR(process.env.DOCUMENT_REGISTRY_ADDR!, isTestnet),
  }
}

// ── Config check ──────────────────────────────────────────────────────────────

export function isBlockchainConfigured(): boolean {
  return !!(
    process.env.POLYGON_RPC_URL &&
    process.env.POLYGON_RPC_URL !== 'your_polygon_rpc_url_here' &&
    process.env.BLOCKCHAIN_WALLET_KEY &&
    process.env.BLOCKCHAIN_WALLET_KEY !== 'your_wallet_private_key_here' &&
    process.env.DOCUMENT_REGISTRY_ADDR &&
    process.env.DOCUMENT_REGISTRY_ADDR !== 'your_contract_address_here'
  )
}
