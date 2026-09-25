import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import { configVariable } from 'hardhat/config'

export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: '0.8.28',
    // Ditulis eksplisit supaya bytecode yang di-deploy sama dengan yang dicocokkan saat verifikasi.
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    amoy: {
      type: 'http',
      url: 'https://polygon-amoy-bor-rpc.publicnode.com',
      chainId: 80002,
      // Dibaca dari keystore terenkripsi Hardhat (npx hardhat keystore set AMOY_PRIVATE_KEY), tidak pernah ada di repo.
      accounts: [configVariable('AMOY_PRIVATE_KEY')],
    },
  },
}
