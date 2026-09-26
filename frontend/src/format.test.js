import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CUT_TYPE, GRADE, ROLE, blockRanges, bytes32ToText, byteLength, cattleLabel, formatDate,
  freshnessText, label, options, packageLabel, roleKeyOf, shortAddress, textToBytes32, toDatetimeLocal,
} from './format.js'

test('label ID diberi awalan dan nol di depan', () => {
  assert.equal(cattleLabel(42n), 'HCT-C-000042')
  assert.equal(packageLabel('5'), 'HCT-P-000005')
  assert.equal(packageLabel(1234567), 'HCT-P-1234567')
})

test('hash peran dipetakan balik ke kuncinya', () => {
  assert.equal(roleKeyOf(ROLE.ABATTOIR), 'ABATTOIR')
  assert.equal(roleKeyOf(ROLE.ABATTOIR.toUpperCase().replace('0X', '0x')), 'ABATTOIR')
  assert.equal(roleKeyOf('0x' + '11'.repeat(32)), null)
})

test('tabel enum menjadi opsi select dan label, nilai tak dikenal tidak dirender mentah', () => {
  assert.deepEqual(options(GRADE)[0], { value: '1', label: GRADE[1] })
  assert.equal(options(GRADE).length, 3)
  assert.equal(label(CUT_TYPE, 4n), CUT_TYPE[4])
  assert.equal(label(CUT_TYPE, 99), 'Tidak dikenal')
})

test('teks bolak-balik ke bytes32; bytes32 rusak tampil sebagai hex', () => {
  const hex = textToBytes32('FARM-JTG-001')
  assert.equal(hex.length, 66)
  assert.equal(bytes32ToText(hex), 'FARM-JTG-001')
  const notUtf8 = '0x' + 'ff'.repeat(32)
  assert.equal(bytes32ToText(notUtf8), notUtf8)
  assert.equal(byteLength('é'), 2)
})

test('tanggal 0 berarti tahap belum terjadi', () => {
  assert.equal(formatDate(0n), null)
  assert.match(formatDate(1758800000n), /2025/)
})

test('kesegaran dihitung dalam hari', () => {
  const now = 1_000_000 * 1000
  assert.equal(freshnessText(1_000_000n, now), 'hari ini')
  assert.equal(freshnessText(1_000_000n - 86_400n, now), 'kemarin')
  assert.equal(freshnessText(1_000_000n - 3n * 86_400n, now), '3 hari lalu')
})

test('alamat dipendekkan', () => {
  assert.equal(shortAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'), '0x7099…79C8')
  assert.equal(shortAddress(null), '')
})

test('datetime-local memakai waktu lokal tanpa detik', () => {
  assert.equal(toDatetimeLocal(new Date(2026, 8, 5, 7, 3, 59)), '2026-09-05T07:03')
})

test('rentang blok dipecah per ukuran', () => {
  assert.deepEqual(blockRanges(0, 25, 10), [[0, 9], [10, 19], [20, 25]])
  assert.deepEqual(blockRanges(5, 5, 10), [[5, 5]])
  assert.deepEqual(blockRanges(10, 3, 10), [])
})
