/**
 * Deploy DocumentRegistry.sol to Polygon Amoy (testnet) or Polygon Mainnet.
 *
 * Usage:
 *   npm run deploy:contract          # → Polygon Amoy testnet
 *   npx hardhat run scripts/deploy-registry.ts --network polygon   # → mainnet
 *
 * Prerequisites:
 *   1. POLYGON_RPC_URL and BLOCKCHAIN_WALLET_KEY set in .env.local
 *   2. Wallet funded with MATIC (testnet: https://faucet.polygon.technology)
 */

import { ethers, network } from 'hardhat'
import fs from 'fs'
import path from 'path'

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('\n📋 Deployment summary')
  console.log('  Network  :', network.name)
  console.log('  Deployer :', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('  Balance  :', ethers.formatEther(balance), 'MATIC')

  if (balance === 0n) {
    console.error('\n❌ Wallet has no MATIC. Fund it first:')
    console.error('   Testnet faucet: https://faucet.polygon.technology')
    process.exit(1)
  }

  console.log('\n⏳ Deploying DocumentRegistry…')
  const Factory  = await ethers.getContractFactory('DocumentRegistry')
  const contract = await Factory.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  const txHash  = contract.deploymentTransaction()?.hash ?? '—'
  const isAmoy  = network.name === 'amoy'

  console.log('\n✅ DocumentRegistry deployed!')
  console.log('  Contract address :', address)
  console.log('  Deploy tx        :', txHash)
  console.log('  Polygonscan      :', isAmoy
    ? `https://amoy.polygonscan.com/address/${address}`
    : `https://polygonscan.com/address/${address}`)

  // ── Write address to .env.local automatically ──────────────────────────────
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, 'utf-8')
    if (env.includes('DOCUMENT_REGISTRY_ADDR=')) {
      env = env.replace(
        /DOCUMENT_REGISTRY_ADDR=.*/,
        `DOCUMENT_REGISTRY_ADDR=${address}`
      )
    } else {
      env += `\nDOCUMENT_REGISTRY_ADDR=${address}\n`
    }
    fs.writeFileSync(envPath, env)
    console.log('\n✏️  DOCUMENT_REGISTRY_ADDR updated in .env.local')
  }

  // ── Also save ABI for reference ────────────────────────────────────────────
  const artifactPath = path.join(process.cwd(), 'contracts', 'artifacts', 'contracts', 'DocumentRegistry.sol', 'DocumentRegistry.json')
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
    const outPath  = path.join(process.cwd(), 'contracts', 'DocumentRegistry.address.json')
    fs.writeFileSync(outPath, JSON.stringify({ address, network: network.name, deployedAt: new Date().toISOString(), abi: artifact.abi }, null, 2))
    console.log('  ABI + address saved to contracts/DocumentRegistry.address.json')
  }

  console.log('\n🚀 Next step: restart your dev server (npm run dev) to pick up the new address.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
