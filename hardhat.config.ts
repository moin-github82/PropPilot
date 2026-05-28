import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const WALLET_KEY  = process.env.BLOCKCHAIN_WALLET_KEY ?? ''
const POLYGON_RPC = process.env.POLYGON_RPC_URL ?? ''

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // Polygon Amoy — testnet (free MATIC from faucet)
    amoy: {
      url:      POLYGON_RPC || 'https://rpc-amoy.polygon.technology',
      accounts: WALLET_KEY ? [WALLET_KEY] : [],
      chainId:  80002,
    },
    // Polygon Mainnet — production
    polygon: {
      url:      POLYGON_RPC || 'https://polygon-rpc.com',
      accounts: WALLET_KEY ? [WALLET_KEY] : [],
      chainId:  137,
    },
    // Local Hardhat node — for testing without spending MATIC
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
  },

  paths: {
    sources:   './contracts',
    artifacts: './contracts/artifacts',
    cache:     './contracts/cache',
  },
}

export default config
