// Satu-satunya tempat setelan jaringan. Dipilih lewat VITE_NETWORK:
// .env.development -> local (npm run dev), .env.production -> amoy (npm run build).
import { JsonRpcProvider } from 'ethers'

export const NETWORKS = {
  local: {
    key: 'local',
    name: 'Hardhat Local',
    chainId: 31337n,
    // Hostname halaman, bukan 127.0.0.1 tetap: ponsel se-Wi-Fi yang membuka http://<ip-laptop>:5175
    // ikut menjangkau node di laptop (jalankan node dengan --hostname 0.0.0.0).
    rpc: () => `http://${globalThis.location?.hostname ?? '127.0.0.1'}:8545`,
    // Deploy pertama akun #0 di node Hardhat yang baru selalu mendarat di alamat ini.
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    deployBlock: 0,
    explorer: null,
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  amoy: {
    key: 'amoy',
    name: 'Polygon Amoy Testnet',
    chainId: 80002n,
    rpc: () => 'https://polygon-amoy-bor-rpc.publicnode.com',
    // Diisi setelah owner deploy (docs/deployment-v1.md). Kosong = situs menampilkan "belum di-deploy".
    address: '',
    deployBlock: 0,
    explorer: 'https://amoy.polygonscan.com',
    currency: { name: 'POL', symbol: 'POL', decimals: 18 },
  },
}

// `import.meta.env` hanya ada di Vite; skrip node (scripts/check.mjs, predeploy) juga mengimpor file ini.
export const NETWORK = NETWORKS[import.meta.env?.VITE_NETWORK] ?? NETWORKS.amoy

export const isDeployed = () => NETWORK.address !== ''

export const readProvider = () =>
  new JsonRpcProvider(NETWORK.rpc(), Number(NETWORK.chainId), { staticNetwork: true })

export const txUrl = (hash) => (NETWORK.explorer ? `${NETWORK.explorer}/tx/${hash}` : null)
export const addressUrl = (addr) => (NETWORK.explorer ? `${NETWORK.explorer}/address/${addr}` : null)

/** Parameter wallet_addEthereumChain untuk jaringan aktif. */
export const addChainParams = () => ({
  chainId: `0x${NETWORK.chainId.toString(16)}`,
  chainName: NETWORK.name,
  nativeCurrency: NETWORK.currency,
  rpcUrls: [NETWORK.rpc()],
  ...(NETWORK.explorer ? { blockExplorerUrls: [NETWORK.explorer] } : {}),
})

// Tautan ikut base Vite supaya benar di dev maupun di GitHub Pages (subpath /Blockchain_Halal/).
export const traceUrl = (packageId) => `${window.location.origin}${import.meta.env.BASE_URL}?trace=${packageId}`
export const scanUrl = () => `${import.meta.env.BASE_URL}?scan=1`
