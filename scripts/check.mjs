// Sanity check: memastikan ADDRESS + ABI di frontend/src/contract.js benar-benar cocok
// dengan contract yang hidup di Polygon Amoy. Gagal dalam hitungan detik kalau ada salah
// ketik, alih-alih muncul sebagai form yang misterius tidak jalan.
//
//   node scripts/check.mjs
import assert from 'node:assert/strict'
import { ADDRESS, readContract } from '../frontend/src/contract.js'

const PETERNAK = '0x060b8A144800DAB4b638c3e350613BE744aF8A6c' // docs/deployment.md
const ct = readContract()

const rec = await ct.getRecord(1)
assert.equal(rec.grade, 'A', 'grade sapi id 1 harus "A"')
assert.equal(rec.age, 24n, 'umur sapi id 1 harus 24 bulan')
assert.notEqual(rec.shippedDate, 0n, 'sapi id 1 seharusnya sudah dikirim')

assert.equal(await ct.roles(PETERNAK), 1n, 'wallet Peternak harus punya role Farmer (1)')

// getRecord harus revert untuk id yang tidak dikenal — halaman track mengandalkan ini
// untuk membedakan "QR tidak valid" dari data kosong.
await assert.rejects(() => ct.getRecord(999999), /data tidak ditemukan/)

console.log(`OK — contract ${ADDRESS} cocok dengan ABI di frontend/src/contract.js`)
console.log(`     sapi id 1: umur ${rec.age} bln, pakan "${rec.feedType}", grade ${rec.grade}`)
