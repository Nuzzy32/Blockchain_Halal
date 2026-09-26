import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseId, parseIdList, resolveTimestamp, scanTarget, validateAddress, validateAge, validateChoice,
  validateId, validateLiveWeight, validatePackageGrams, validateShortText,
} from './validation.js'

test('umur 6-120 bulan', () => {
  assert.equal(validateAge('6'), null)
  assert.equal(validateAge('120'), null)
  assert.match(validateAge('5'), /6.*120/)
  assert.match(validateAge('121'), /6.*120/)
  assert.match(validateAge(''), /wajib/)
  assert.match(validateAge('12.5'), /bulat/)
})

test('berat hidup 100-1500 kg dan berat kemasan 100-50000 g', () => {
  assert.equal(validateLiveWeight('100'), null)
  assert.equal(validateLiveWeight('1500'), null)
  assert.match(validateLiveWeight('99'), /100/)
  assert.equal(validatePackageGrams('50000'), null)
  assert.match(validatePackageGrams('50001'), /50\.000/)
})

test('pilihan enum wajib dipilih', () => {
  assert.equal(validateChoice('2', 'Grade'), null)
  assert.equal(validateChoice('', 'Grade'), 'Grade wajib dipilih.')
})

test('teks bytes32 wajib diisi dan maksimal 31 byte', () => {
  assert.equal(validateShortText('ID00410000123', 'Nomor sertifikat'), null)
  assert.equal(validateShortText('a'.repeat(31), 'X'), null)
  assert.match(validateShortText('a'.repeat(32), 'X'), /31/)
  assert.match(validateShortText('   ', 'X'), /wajib/)
})

test('ID positif, dengan atau tanpa awalan label', () => {
  assert.equal(parseId('5'), '5')
  assert.equal(parseId(' 007 '), '7')
  assert.equal(parseId('HCT-P-000005'), '5')
  assert.equal(parseId('0'), null)
  assert.equal(parseId('-1'), null)
  assert.equal(parseId('abc'), null)
  assert.equal(parseId('18446744073709551616'), null) // > uint64
  assert.equal(parseId(null), null)
  assert.equal(validateId('3', 'ID sapi'), null)
  assert.match(validateId('x', 'ID sapi'), /ID sapi/)
})

test('alamat wallet divalidasi', () => {
  assert.equal(validateAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'), null)
  assert.match(validateAddress('0x123'), /tidak valid/)
  assert.match(validateAddress(''), /wajib/)
})

test('daftar ID kemasan', () => {
  assert.deepEqual(parseIdList('1, 2  5', 50), { ids: ['1', '2', '5'] })
  assert.deepEqual(parseIdList('HCT-P-000003,4', 50), { ids: ['3', '4'] })
  assert.match(parseIdList('', 50).error, /minimal satu/)
  assert.match(parseIdList('1, x', 50).error, /"x"/)
  assert.match(parseIdList('1, 1', 50).error, /dua kali/)
  assert.match(parseIdList('1,2,3', 2).error, /Maksimal 2/)
})

test('timestamp dari datetime-local dijepit dalam menit yang dipilih', () => {
  const min = BigInt(Math.floor(new Date(2026, 8, 5, 10, 5, 30).getTime() / 1000))
  const now = min + 3600n
  // menit yang sama dengan registrasi -> pakai detik registrasi, bukan awal menit
  assert.deepEqual(resolveTimestamp('2026-09-05T10:05', { minSeconds: min, nowSeconds: now }), { seconds: min })
  // menit setelahnya -> awal menit itu
  assert.deepEqual(resolveTimestamp('2026-09-05T10:06', { minSeconds: min, nowSeconds: now }), { seconds: min + 30n })
  assert.match(resolveTimestamp('2026-09-05T10:04', { minSeconds: min, nowSeconds: now }).error, /sebelum/)
  assert.match(resolveTimestamp('2026-09-05T11:06', { minSeconds: min, nowSeconds: now }).error, /masa depan/)
  assert.match(resolveTimestamp('', { minSeconds: 0n, nowSeconds: now, label: 'Tanggal kirim' }).error, /Tanggal kirim wajib/)
})

test('hasil pindai hanya diterima kalau URL situs ini dengan ?trace', () => {
  const origin = 'https://nuzzy32.github.io'
  const base = '/Blockchain_Halal/'
  assert.equal(scanTarget('https://nuzzy32.github.io/Blockchain_Halal/?trace=5', origin, base), '5')
  assert.equal(scanTarget('https://nuzzy32.github.io/Blockchain_Halal?trace=5', origin, base), '5')
  assert.equal(scanTarget('https://evil.example/Blockchain_Halal/?trace=5', origin, base), null)
  assert.equal(scanTarget('https://nuzzy32.github.io/lain/?trace=5', origin, base), null)
  assert.equal(scanTarget('https://nuzzy32.github.io/Blockchain_Halal/?trace=abc', origin, base), null)
  assert.equal(scanTarget('bukan url', origin, base), null)
})
