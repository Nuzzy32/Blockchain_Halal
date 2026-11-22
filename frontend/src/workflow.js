// Alur pencatatan: satu sumber untuk landing page dan panduan di dashboard pencatatan.
// `role` = kunci ROLE_KEYS di format.js; `anchor` = id bagian form di panel.

export const STAGES = [
  {
    role: 'FARMER',
    who: 'Peternak',
    title: 'Daftarkan sapi',
    anchor: 'tahap-daftar',
    does: 'Mendaftarkan sapi hidup begitu siap dijual ke rumah potong.',
    fills: ['Umur (bulan)', 'Berat hidup', 'Grade', 'Jenis pakan', 'Ras, jenis kelamin, warna bulu', 'Kode peternakan', 'Foto sapi'],
    gets: 'ID sapi, misalnya HCT-C-000012. Sapi langsung muncul di daftar RPH.',
  },
  {
    role: 'ABATTOIR',
    who: 'RPH',
    title: 'Catat penyembelihan',
    anchor: 'tahap-sembelih',
    does: 'Mencatat penyembelihan halal satu kali, tepat setelah sapi disembelih.',
    fills: ['Sapi dari daftar', 'Waktu sembelih', 'Metode syar\'i', 'ID juru sembelih', 'Nomor sertifikat halal', 'Konfirmasi syarat halal'],
    gets: 'Status sapi berubah menjadi "Disembelih" dan siap dikemas.',
  },
  {
    role: 'ABATTOIR',
    who: 'RPH',
    title: 'Buat kemasan',
    anchor: 'tahap-kemas',
    does: 'Membagi daging menjadi kemasan. Setiap kemasan mendapat QR sendiri.',
    fills: ['Sapi yang sudah disembelih', 'Jenis potongan', 'Berat (gram)'],
    gets: 'ID kemasan dan label QR siap cetak untuk ditempel di kemasan.',
  },
  {
    role: 'DISTRIBUTOR',
    who: 'Distributor',
    title: 'Catat pengiriman',
    anchor: 'tahap-kirim',
    does: 'Mencatat kemasan yang berangkat ke toko. Beberapa kemasan bisa sekaligus.',
    fills: ['Centang kemasan yang dikirim', 'Waktu kirim'],
    gets: 'Kemasan berstatus "Dikirim" dan riwayatnya lengkap untuk konsumen.',
  },
]
