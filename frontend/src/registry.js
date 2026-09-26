// Akses contract CattleRegistry: baca lewat RPC publik (tanpa wallet), tulis lewat MetaMask
// (atau akun demo node lokal, lihat demoAvailable).
import { BrowserProvider, Contract, Interface } from 'ethers'
import abi from './CattleRegistry.abi.json'
import { NETWORK, readProvider } from './chain.js'
import { describeRevert } from './errors.js'
import { ROLE, ROLE_KEYS, blockRanges } from './format.js'

const iface = new Interface(abi)

export const readRegistry = () => new Contract(NETWORK.address, abi, readProvider())

// Mode demo (hanya node Hardhat lokal): node sendiri yang menandatangani untuk akun tesnya yang
// terbuka, jadi tidak ada private key di frontend. Di jaringan lain eth_accounts RPC kosong.
export const demoAvailable = () => NETWORK.key === 'local'
let demoAccount = null
export const setDemoAccount = (addr) => {
  demoAccount = demoAvailable() ? addr : null
}
export const demoActive = () => demoAccount !== null

/** Akun tes node lokal yang memegang minimal satu peran, beserta perannya. */
export async function demoAccounts() {
  const addrs = (await readProvider().send('eth_accounts', [])).slice(0, 10)
  const withRoles = await Promise.all(addrs.map(async (address) => ({ address, roles: await rolesOf(address) })))
  return withRoles.filter((a) => ROLE_KEYS.some((k) => a.roles[k]))
}

export async function writeRegistry() {
  const signer = demoAccount
    ? await readProvider().getSigner(demoAccount)
    : await new BrowserProvider(window.ethereum).getSigner()
  return new Contract(NETWORK.address, abi, signer)
}

/** Keempat peran sekaligus. Dibaca lewat RPC, jadi tetap benar walau MetaMask di jaringan lain. */
export async function rolesOf(address) {
  const ct = readRegistry()
  const held = await Promise.all(ROLE_KEYS.map((k) => ct.checkRole(address, ROLE[k])))
  return Object.fromEntries(ROLE_KEYS.map((k, i) => [k, held[i]]))
}

/** Event bernama `name` di receipt, sudah di-decode. */
export function eventsOf(receipt, name) {
  return receipt.logs
    .map((log) => {
      try {
        return iface.parseLog(log)
      } catch {
        return null
      }
    })
    .filter((e) => e?.name === name)
}

/** Custom error contract di dalam error ethers, atau null. */
function revertOf(err) {
  if (err?.revert?.name) return err.revert
  const data = err?.data ?? err?.info?.error?.data ?? err?.error?.data
  if (typeof data !== 'string') return null
  try {
    return iface.parseError(data)
  } catch {
    return null
  }
}

export const isRevert = (err, name) => revertOf(err)?.name === name

export function errorMessage(err) {
  if (err?.code === 'ACTION_REJECTED' || err?.code === 4001 || err?.info?.error?.code === 4001) {
    return 'Transaksi dibatalkan di MetaMask.'
  }
  if (err?.code === 'INSUFFICIENT_FUNDS') return 'Saldo wallet tidak cukup untuk biaya gas. Isi saldo testnet dulu.'
  if (err?.code === -32002 || err?.info?.error?.code === -32002) {
    return 'Permintaan MetaMask sebelumnya masih terbuka. Buka MetaMask dan selesaikan dulu.'
  }
  const revert = revertOf(err)
  if (revert) return describeRevert(revert.name, [...revert.args])
  if (err?.code === 'CALL_EXCEPTION') return 'Transaksi ditolak contract tanpa keterangan.'
  return err?.shortMessage ?? err?.message ?? 'Terjadi kesalahan yang tidak diketahui.'
}

/**
 * Hash transaksi tiap tahap untuk tautan verifikasi, dari event yang di-index per ID.
 * ponytail: rentang log dipecah per 10.000 blok karena batas RPC publik; jumlah permintaan
 * bertambah seiring umur contract (~4 per hari di Amoy). Kalau terasa lambat, simpan blok
 * tiap tahap di contract v2 supaya tidak perlu memindai log.
 */
export async function findStepTxs(cattleId, packageId) {
  const provider = readProvider()
  const ct = new Contract(NETWORK.address, abi, provider)
  const ranges = blockRanges(NETWORK.deployBlock, await provider.getBlockNumber(), 10_000)
  const first = async (filter) => {
    const chunks = await Promise.all(ranges.map(([from, to]) => ct.queryFilter(filter, from, to)))
    return chunks.flat()[0]?.transactionHash ?? null
  }
  const [registered, slaughtered, packaged, shipped] = await Promise.all([
    first(ct.filters.CattleRegistered(cattleId)),
    first(ct.filters.CattleSlaughtered(cattleId)),
    first(ct.filters.PackageCreated(packageId)),
    first(ct.filters.PackageShipped(packageId)),
  ])
  return { registered, slaughtered, packaged, shipped }
}
