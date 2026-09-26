// Nama custom error contract -> kalimat Indonesia untuk pengguna.
import {
  CATTLE_STATUS, PACKAGE_STATUS, ROLE_LABEL, cattleLabel, formatDate, label, packageLabel, roleKeyOf, shortAddress,
} from './format.js'

const FIELD_LABEL = {
  farmId: 'Kode peternakan',
  slaughtermanId: 'ID juru sembelih',
  halalCertNo: 'Nomor sertifikat halal',
  grade: 'Grade',
  feedType: 'Jenis pakan',
  method: 'Metode sembelih',
  cutType: 'Jenis potongan',
  cutTypes: 'Daftar kemasan',
  packageIds: 'Daftar ID kemasan',
}
const field = (name) => FIELD_LABEL[name] ?? name
const num = (n) => Number(n).toLocaleString('id-ID')

const MESSAGES = {
  Unauthorized: ([, role]) => `Wallet ini tidak punya peran ${ROLE_LABEL[roleKeyOf(role)] ?? 'yang dibutuhkan'}.`,
  CattleNotFound: ([cattleId]) => `Sapi ${cattleLabel(cattleId)} tidak terdaftar.`,
  PackageNotFound: ([packageId]) => `Kemasan ${packageLabel(packageId)} tidak ditemukan.`,
  InvalidCattleStatus: ([cattleId, current, expected]) =>
    `Sapi ${cattleLabel(cattleId)} berstatus ${label(CATTLE_STATUS, current)}, seharusnya ${label(CATTLE_STATUS, expected)}.`,
  InvalidPackageStatus: ([packageId, current, expected]) =>
    `Kemasan ${packageLabel(packageId)} berstatus ${label(PACKAGE_STATUS, current)}, hanya kemasan berstatus ${label(PACKAGE_STATUS, expected)} yang bisa dicatat.`,
  InvalidAge: ([given]) => `Umur ${num(given)} bulan di luar batas 6–120 bulan.`,
  InvalidWeight: ([given]) => `Berat ${num(given)} di luar batas yang diizinkan.`,
  InvalidTimestamp: ([given]) =>
    `Tanggal ${formatDate(given) ?? given} ditolak: tidak boleh di masa depan atau sebelum tahap sebelumnya.`,
  EmptyField: ([name]) => `${field(name)} wajib diisi.`,
  UnspecifiedEnum: ([name]) => `${field(name)} wajib dipilih.`,
  BatchTooLarge: ([given, max]) => `Maksimal ${num(max)} item per transaksi, diberikan ${num(given)}.`,
  ZeroAddress: () => 'Alamat nol tidak boleh diberi peran.',
  LastAdmin: () => 'Admin terakhir tidak bisa dicabut — contract akan terkunci tanpa admin.',
  LengthMismatch: () => 'Jumlah jenis potongan dan jumlah berat tidak sama.',
  WrongAbattoir: ([cattleId, abattoir]) =>
    `Sapi ${cattleLabel(cattleId)} disembelih RPH lain (${shortAddress(abattoir)}), hanya RPH itu yang boleh mengemasnya.`,
  PackageWeightExceeded: ([, total, max]) =>
    `Total berat kemasan ${num(total)} g melebihi berat hidup sapi (${num(max)} g).`,
}

export function describeRevert(name, args = []) {
  const message = MESSAGES[name]
  return message ? message(args) : `Transaksi ditolak contract (${name}).`
}
