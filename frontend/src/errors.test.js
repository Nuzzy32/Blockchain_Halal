import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeRevert } from './errors.js'
import { ROLE } from './format.js'

test('setiap custom error contract punya kalimat Indonesia', () => {
  assert.match(describeRevert('Unauthorized', ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', ROLE.ABATTOIR]), /RPH/)
  assert.match(describeRevert('CattleNotFound', [7n]), /HCT-C-000007/)
  assert.match(describeRevert('PackageNotFound', [9n]), /HCT-P-000009/)
  assert.match(describeRevert('InvalidCattleStatus', [1n, 1n, 0n]), /Disembelih.*Terdaftar/)
  assert.match(describeRevert('InvalidPackageStatus', [1n, 1n, 0n]), /Dikirim/)
  assert.match(describeRevert('InvalidAge', [5n]), /6.*120/)
  assert.match(describeRevert('InvalidWeight', [99n]), /99/)
  assert.match(describeRevert('InvalidTimestamp', [1758800000n]), /tanggal/i)
  assert.equal(describeRevert('EmptyField', ['halalCertNo']), 'Nomor sertifikat halal wajib diisi.')
  assert.equal(describeRevert('UnspecifiedEnum', ['method']), 'Metode sembelih wajib dipilih.')
  assert.match(describeRevert('BatchTooLarge', [51n, 50n]), /50/)
  assert.match(describeRevert('ZeroAddress', []), /nol/)
  assert.match(describeRevert('LastAdmin', []), /terakhir/)
  assert.match(describeRevert('LengthMismatch', [2n, 1n]), /tidak sama/)
  assert.match(describeRevert('WrongAbattoir', [3n, '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC']), /RPH lain/)
  assert.match(describeRevert('PackageWeightExceeded', [1n, 500000n, 450000n]), /500\.000.*450\.000/)
})

test('error tak dikenal tetap menyebut namanya', () => {
  assert.match(describeRevert('SomethingNew', []), /SomethingNew/)
})
