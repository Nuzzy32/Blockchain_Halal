// Validasi murni yang mencerminkan batas contract (docs/DATA-MODEL.md §5). Contract tetap
// penjaga terakhir; tujuan di sini supaya pengguna tidak membayar gas untuk transaksi yang
// pasti ditolak. Setiap validator mengembalikan pesan error atau null.
import { isAddress } from 'ethers'
import { byteLength, formatDate } from './format.js'

const UINT64_MAX = 2n ** 64n - 1n

function intInRange(value, labelText, min, max, unit) {
  const t = String(value ?? '').trim()
  if (!t) return `${labelText} wajib diisi.`
  if (!/^\d+$/.test(t)) return `${labelText} harus berupa angka bulat.`
  const n = Number(t)
  if (n < min || n > max) {
    return `${labelText} harus antara ${min.toLocaleString('id-ID')} dan ${max.toLocaleString('id-ID')} ${unit}.`
  }
  return null
}

export const validateAge = (v) => intInRange(v, 'Umur', 6, 120, 'bulan')
export const validateLiveWeight = (v) => intInRange(v, 'Berat hidup', 100, 1500, 'kg')
export const validatePackageGrams = (v) => intInRange(v, 'Berat kemasan', 100, 50_000, 'gram')
export const validateChoice = (v, labelText) => (v ? null : `${labelText} wajib dipilih.`)

export function validateShortText(v, labelText) {
  const t = String(v ?? '').trim()
  if (!t) return `${labelText} wajib diisi.`
  if (byteLength(t) > 31) return `${labelText} maksimal 31 karakter (huruf tanpa aksen).`
  return null
}

export function validateAddress(v) {
  const t = String(v ?? '').trim()
  if (!t) return 'Alamat wallet wajib diisi.'
  return isAddress(t) ? null : 'Alamat wallet tidak valid (harus 0x diikuti 40 karakter heksadesimal).'
}

/** "5", " 007 ", "HCT-P-000005" -> "5". Selain bilangan bulat positif muat uint64 -> null. */
export function parseId(raw) {
  if (raw === null || raw === undefined) return null
  const m = String(raw).trim().match(/^(?:HCT-[CP]-)?(\d+)$/i)
  if (!m) return null
  const n = BigInt(m[1])
  return n > 0n && n <= UINT64_MAX ? n.toString() : null
}

export const validateId = (v, labelText) => (parseId(v) ? null : `${labelText} harus berupa nomor positif, misalnya 5 atau HCT-C-000005.`)

/** "1, 2 5" -> { ids: ['1','2','5'] }. Ganda, kosong, atau lebih dari max -> { error }. */
export function parseIdList(text, max) {
  const tokens = String(text ?? '').split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0) return { error: 'Isi minimal satu ID kemasan.' }
  const ids = []
  for (const token of tokens) {
    const idValue = parseId(token)
    if (!idValue) return { error: `"${token}" bukan ID kemasan yang valid.` }
    if (ids.includes(idValue)) return { error: `ID ${idValue} ditulis dua kali.` }
    ids.push(idValue)
  }
  if (ids.length > max) return { error: `Maksimal ${max} kemasan per transaksi.` }
  return { ids }
}

/**
 * Nilai datetime-local (presisi menit) -> unix detik untuk contract.
 * Detik dipilih paling awal di dalam menit itu yang masih >= minSeconds, supaya mencatat di
 * menit yang sama dengan tahap sebelumnya tidak ditolak contract.
 */
export function resolveTimestamp(value, { minSeconds = 0n, nowSeconds, label: labelText = 'Tanggal' }) {
  if (!value) return { error: `${labelText} wajib diisi.` }
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return { error: `${labelText} tidak valid.` }
  const start = BigInt(Math.floor(ms / 1000))
  if (start > nowSeconds) return { error: `${labelText} tidak boleh di masa depan.` }
  if (start + 59n < minSeconds) return { error: `${labelText} tidak boleh sebelum ${formatDate(minSeconds)}.` }
  return { seconds: start > minSeconds ? start : minSeconds }
}

/** Isi QR -> ID kemasan, hanya kalau URL situs ini dengan ?trace=N. Selain itu null (SECURITY A9). */
export function scanTarget(text, origin, basePath) {
  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.origin !== origin) return null
  const base = basePath.replace(/\/$/, '')
  if (url.pathname !== base && url.pathname !== `${base}/`) return null
  return parseId(url.searchParams.get('trace'))
}
