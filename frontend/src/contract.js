import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers'

// Nilai-nilai di bawah ini harus cocok dengan docs/deployment.md.
// scripts/check.mjs memverifikasinya langsung ke chain — jalankan setelah mengubah file ini.
export const ADDRESS = '0x3B32AfD1D507d4312c9Dc09563a4Ee8C6B57d34D'
export const CHAIN_ID = 80002n
// RPC publik Amoy. Yang resmi (rpc-amoy.polygon.technology) sempat tidak bisa di-resolve
// DNS-nya, jadi dipakai publicnode sebagai default. Cadangan: https://polygon-amoy.drpc.org
export const RPC = 'https://polygon-amoy-bor-rpc.publicnode.com'
export const EXPLORER = 'https://amoy.polygonscan.com'

// ABI human-readable: ethers v6 menerima bentuk ini dan hasilnya identik dengan
// ABI JSON hasil compile, tapi 6 baris alih-alih ~280.
export const ABI = [
  'function registerCattle(uint256 id, uint256 age, string feedType, string grade)',
  'function recordSlaughter(uint256 id)',
  'function recordShipping(uint256 id)',
  'function roles(address) view returns (uint8)',
  'function getRecord(uint256 id) view returns (tuple(uint256 id, uint256 age, string feedType, string grade, uint256 registeredDate, uint256 slaughterDate, uint256 shippedDate, address farmer, address butcher, address distributor))',
]

export const Role = { None: 0, Farmer: 1, Butcher: 2, Distributor: 3 }

export const ROLE_LABEL = {
  0: 'Tanpa Role',
  1: 'Peternak',
  2: 'Rumah Potong',
  3: 'Distributor',
}

// Parameter untuk wallet_addEthereumChain, dipakai kalau Amoy belum ada di MetaMask.
export const AMOY_PARAMS = {
  chainId: '0x13882', // 80002
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: [RPC, 'https://polygon-amoy.drpc.org'],
  blockExplorerUrls: [EXPLORER],
}

/** Contract read-only lewat RPC publik. Tanpa wallet — dipakai halaman konsumen. */
export function readContract() {
  return new Contract(ADDRESS, ABI, new JsonRpcProvider(RPC))
}

/** Contract yang bisa menulis, ditandatangani wallet yang sedang aktif di MetaMask. */
export async function writeContract() {
  const signer = await new BrowserProvider(window.ethereum).getSigner()
  return new Contract(ADDRESS, ABI, signer)
}

export const txUrl = (hash) => `${EXPLORER}/tx/${hash}`
export const addressUrl = (addr) => `${EXPLORER}/address/${addr}`

/** URL yang di-encode ke QR code. Ikut base Vite, jadi benar di dev maupun di GitHub Pages. */
export const trackUrl = (id) =>
  `${window.location.origin}${import.meta.env.BASE_URL}?id=${id}`

/**
 * Pesan revert dari contract sudah berbahasa Indonesia dan jelas ("CT: sapi sudah
 * disembelih"), jadi diteruskan apa adanya. Yang perlu diterjemahkan hanya kasus
 * non-contract: user membatalkan, atau jaringan bermasalah.
 */
export function errorMessage(err) {
  if (err?.code === 'ACTION_REJECTED') return 'Transaksi dibatalkan di MetaMask.'
  const reason = err?.reason ?? err?.info?.error?.message ?? err?.shortMessage
  if (reason) return reason.replace(/^execution reverted:?\s*/i, '')
  return err?.message ?? 'Terjadi kesalahan yang tidak diketahui.'
}

/** Unix timestamp (detik, bigint) -> teks tanggal Indonesia. 0 berarti tahap belum terjadi. */
export function formatDate(ts) {
  if (!ts || ts === 0n) return null
  return new Date(Number(ts) * 1000).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')
