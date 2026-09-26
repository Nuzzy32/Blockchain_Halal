// Akses contract CattleRegistry: baca lewat RPC publik (tanpa wallet), tulis lewat MetaMask.
import { BrowserProvider, Contract, Interface } from 'ethers'
import abi from './CattleRegistry.abi.json'
import { NETWORK, readProvider } from './chain.js'
import { describeRevert } from './errors.js'
import { ROLE, ROLE_KEYS } from './format.js'

const iface = new Interface(abi)

export const readRegistry = () => new Contract(NETWORK.address, abi, readProvider())

export async function writeRegistry() {
  const signer = await new BrowserProvider(window.ethereum).getSigner()
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
  if (err?.code === 'ACTION_REJECTED') return 'Transaksi dibatalkan di MetaMask.'
  const revert = revertOf(err)
  if (revert) return describeRevert(revert.name, [...revert.args])
  return err?.shortMessage ?? err?.message ?? 'Terjadi kesalahan yang tidak diketahui.'
}
