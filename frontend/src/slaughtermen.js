// Daftar juru sembelih halal (Juleha): ID sertifikat -> nama, untuk ditampilkan di halaman konsumen.
//
// Sengaja DI LUAR blockchain. Nama adalah data pribadi; kalau ditulis ke contract, nama itu publik dan
// permanen selamanya, bahkan setelah orangnya berhenti bekerja (docs/SECURITY.md A3). Di sini nama bisa
// dihapus kapan saja, sementara catatan penyembelihan on-chain (yang hanya berisi ID) tetap utuh.
// Tambahkan nama hanya dengan persetujuan juru sembelih yang bersangkutan.
const SLAUGHTERMEN = {
  'JULEHA-0042': 'Ahmad Fauzi', // contoh untuk data demo, bukan orang sungguhan
}

/** Nama juru sembelih untuk ID sertifikat, atau null kalau tidak ada di daftar. */
export const slaughtermanName = (id) => SLAUGHTERMEN[String(id ?? '').trim().toUpperCase()] ?? null
