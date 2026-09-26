// Format dan label murni (tanpa React, tanpa jaringan) — diuji lewat `npm test`.
import { decodeBytes32String, encodeBytes32String, id } from 'ethers'

/* ---------- peran ---------- */

export const ROLE_KEYS = ['ADMIN', 'FARMER', 'ABATTOIR', 'DISTRIBUTOR']
export const ROLE = Object.fromEntries(ROLE_KEYS.map((k) => [k, id(`${k}_ROLE`)]))
export const ROLE_LABEL = { ADMIN: 'Admin', FARMER: 'Peternak', ABATTOIR: 'RPH', DISTRIBUTOR: 'Distributor' }
export const roleKeyOf = (hash) => ROLE_KEYS.find((k) => ROLE[k] === String(hash).toLowerCase()) ?? null

/* ---------- enum — urutan angka harus sama dengan contracts/CattleRegistry.sol ---------- */

export const GRADE = { 1: 'Standard', 2: 'Choice', 3: 'Prime' }
export const FEED_TYPE = { 1: 'Rumput (grass-fed)', 2: 'Biji-bijian (grain-fed)', 3: 'Campuran', 4: 'Organik bersertifikat' }
export const SLAUGHTER_METHOD = { 1: 'Manual tanpa pemingsanan', 2: 'Manual dengan pemingsanan reversibel' }
export const CUT_TYPE = { 1: 'Sirloin', 2: 'Tenderloin (has dalam)', 3: 'Ribeye', 4: 'Brisket (sandung lamur)', 5: 'Shank (sengkel)', 6: 'Daging giling', 7: 'Lainnya' }
export const CATTLE_STATUS = { 0: 'Terdaftar', 1: 'Disembelih', 2: 'Dikemas' }
export const PACKAGE_STATUS = { 0: 'Dikemas', 1: 'Dikirim' }

export const options = (table) => Object.entries(table).map(([value, text]) => ({ value, label: text }))
export const label = (table, value) => table[Number(value)] ?? 'Tidak dikenal'

/* ---------- ID ---------- */

export const cattleLabel = (cattleId) => `HCT-C-${String(cattleId).padStart(6, '0')}`
export const packageLabel = (packageId) => `HCT-P-${String(packageId).padStart(6, '0')}`

/* ---------- bytes32 ---------- */

export const byteLength = (text) => new TextEncoder().encode(text).length
export const textToBytes32 = (text) => encodeBytes32String(text)

/** Data bytes32 dari chain ke teks. Yang tidak bisa di-decode ditampilkan sebagai hex, bukan dipaksa. */
export function bytes32ToText(hex) {
  try {
    return decodeBytes32String(hex)
  } catch {
    return hex
  }
}

/* ---------- waktu ---------- */

/** Unix detik -> teks tanggal Indonesia. 0 berarti tahap belum terjadi. */
export function formatDate(seconds) {
  if (!seconds || BigInt(seconds) === 0n) return null
  return new Date(Number(seconds) * 1000).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
}

export function freshnessText(seconds, nowMs = Date.now()) {
  const days = Math.floor((nowMs / 1000 - Number(seconds)) / 86_400)
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}

/** Date -> nilai <input type="datetime-local">, waktu lokal, tanpa detik. */
export function toDatetimeLocal(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

/* ---------- lain-lain ---------- */

export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

/** Pecah [from, to] per `size` blok — RPC publik menolak eth_getLogs dengan rentang besar. */
export function blockRanges(from, to, size) {
  const ranges = []
  for (let start = from; start <= to; start += size) ranges.push([start, Math.min(start + size - 1, to)])
  return ranges
}
