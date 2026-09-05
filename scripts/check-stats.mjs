// Uji modul agregasi murni — tanpa jaringan, jalan dalam milidetik.
//
//   node scripts/check-stats.mjs
import assert from 'node:assert/strict'
import { STAGE, formatDuration, stageOf, summarize } from '../frontend/src/stats.js'

// Record buatan yang meniru bentuk hasil ethers: field bigint, diakses lewat nama.
// Angka dipilih bulat agar rata-ratanya mudah diperiksa: +1 jam, lalu +2 jam.
const sapiLengkap = {
  id: 1n, age: 24n, feedType: 'Rumput', grade: 'A',
  registeredDate: 1_000_000n, slaughterDate: 1_003_600n, shippedDate: 1_010_800n,
}
const sapiDisembelih = {
  id: 2n, age: 30n, feedType: 'Silase', grade: 'B',
  registeredDate: 2_000_000n, slaughterDate: 2_003_600n, shippedDate: 0n,
}
const sapiBaru = {
  id: 3n, age: 18n, feedType: 'Rumput', grade: 'A',
  registeredDate: 3_000_000n, slaughterDate: 0n, shippedDate: 0n,
}

// --- stageOf ---
assert.equal(stageOf(sapiBaru), STAGE.REGISTERED, 'sapi tanpa tanggal potong = tahap terdaftar')
assert.equal(stageOf(sapiDisembelih), STAGE.SLAUGHTERED, 'ada tanggal potong, belum kirim')
assert.equal(stageOf(sapiLengkap), STAGE.SHIPPED, 'sudah ada tanggal kirim')

// --- summarize ---
const s = summarize([sapiLengkap, sapiDisembelih, sapiBaru])

assert.equal(s.total, 3, 'total sapi')
// Corong bersifat kumulatif: yang sudah dikirim ikut terhitung sudah disembelih.
assert.deepEqual(s.funnel, { registered: 3, slaughtered: 2, shipped: 1 }, 'corong tahapan')

assert.deepEqual(
  s.grades,
  [{ grade: 'A', count: 2 }, { grade: 'B', count: 1 }],
  'sebaran grade, urut dari terbanyak',
)

assert.equal(s.avgToSlaughter, 3600, 'rata-rata daftar->potong = 1 jam')
assert.equal(s.avgToShip, 7200, 'rata-rata potong->kirim = 2 jam (hanya 1 sapi yang punya data)')

assert.deepEqual(s.recent.map((r) => r.id), [3n, 2n, 1n], 'terbaru dulu berdasarkan tanggal daftar')

// Kumpulan kosong tidak boleh melempar galat — dashboard harus tetap bisa dirender.
const kosong = summarize([])
assert.equal(kosong.total, 0)
assert.equal(kosong.avgToSlaughter, null, 'tanpa data, rata-rata harus null bukan NaN')
assert.deepEqual(kosong.grades, [])

// --- formatDuration ---
assert.equal(formatDuration(null), null, 'null tetap null')
assert.equal(formatDuration(45), '45 detik')
assert.equal(formatDuration(350), '6 menit')
assert.equal(formatDuration(3600), '1 jam')
assert.equal(formatDuration(5400), '1 jam 30 menit')
assert.equal(formatDuration(86_400), '1 hari')
assert.equal(formatDuration(97_200), '1 hari 3 jam')

console.log('OK — stats.js: stageOf, summarize, formatDuration sesuai harapan')
