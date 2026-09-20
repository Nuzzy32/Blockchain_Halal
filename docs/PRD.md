# Product Requirements Document

**Project:** HalalChain Trace
**Versi:** 1.0
**Status:** Draft

## 1. Latar Belakang Masalah

Konsumen daging sapi di Indonesia tidak punya cara untuk memverifikasi klaim yang tertulis di kemasan. Label "halal", "grade premium", atau "daging segar" harus diterima begitu saja karena tidak ada bukti yang bisa dicek sendiri.

Tiga masalah konkret:

1. **Klaim halal tidak terverifikasi.** Konsumen tidak tahu siapa yang menyembelih, apakah juru sembelihnya bersertifikat, dan apakah prosesnya sesuai syariat.
2. **Kesegaran tidak transparan.** Tidak ada informasi kapan hewan disembelih dan berapa lama daging sudah dalam perjalanan.
3. **Pencatatan terpusat rawan dimanipulasi.** Data rantai pasok disimpan di sistem internal masing-masing pihak, bisa diubah tanpa jejak.

## 2. Tujuan

### Tujuan produk
Membangun sistem pencatatan rantai pasok daging sapi yang datanya tidak bisa diubah setelah tercatat, dan bisa diverifikasi langsung oleh konsumen lewat pemindaian QR code di kemasan.

### Tujuan akademik
Menunjukkan penerapan teknologi blockchain pada permasalahan nyata, lengkap dengan pertimbangan desain, keamanan, dan keterbatasannya.

### Bukan tujuan project ini
- Menggantikan sistem sertifikasi halal resmi
- Melakukan verifikasi fisik atau inspeksi di lapangan
- Integrasi dengan sistem ERP supermarket yang sudah ada
- Menangani pembayaran atau transaksi finansial
- Skala produksi dengan ribuan transaksi per detik

## 3. Pengguna dan Peran

| Peran | Siapa | Yang dilakukan | Butuh wallet |
|---|---|---|---|
| Admin | Pengelola sistem | Memberikan dan mencabut peran | Ya |
| Peternak | Peternakan sapi | Mendaftarkan data awal sapi | Ya |
| RPH | Rumah potong hewan | Mencatat penyembelihan dan data halal | Ya |
| Distributor | Pengirim ke retail | Mencatat pengiriman | Ya |
| Konsumen | Pembeli di supermarket | Memindai QR dan melihat riwayat | **Tidak** |

Konsumen sengaja dibuat tidak butuh wallet. Kalau konsumen harus memasang MetaMask hanya untuk mengecek sepotong daging, sistemnya tidak akan dipakai siapa pun.

## 4. User Story

### Peternak
> Sebagai peternak, saya ingin mendaftarkan data sapi saya (umur, jenis pakan, grade) ke sistem, supaya nilai jual ternak saya bisa dibuktikan dan tidak diklaim sepihak oleh pembeli.

Kriteria diterima:
- Form input berisi umur, jenis pakan, dan grade
- Setelah submit, sistem mengembalikan ID sapi yang unik
- Transaksi bisa diverifikasi di block explorer
- Wallet yang tidak punya peran peternak ditolak sistem

### RPH
> Sebagai petugas RPH, saya ingin mencatat proses penyembelihan beserta identitas juru sembelih dan nomor sertifikat halal, supaya klaim halal produk kami punya bukti yang tidak bisa dibantah.

Kriteria diterima:
- Bisa memilih sapi yang sudah terdaftar berdasarkan ID
- Input tanggal sembelih, ID juru sembelih, nomor sertifikat halal, metode sembelih
- Sapi yang sudah pernah dicatat sembelih tidak bisa dicatat dua kali
- Hanya wallet berperan RPH yang bisa mengakses fungsi ini

### RPH (pengemasan)
> Sebagai petugas RPH, saya ingin membuat beberapa kemasan dari satu ekor sapi, supaya tiap kemasan di supermarket bisa ditelusuri balik ke hewan asalnya.

Kriteria diterima:
- Dari satu cattleId bisa dibuat banyak packageId
- Tiap kemasan punya jenis potongan dan berat
- Tiap packageId menghasilkan QR code yang bisa diunduh untuk dicetak

### Distributor
> Sebagai distributor, saya ingin mencatat kapan kemasan dikirim dari RPH, supaya konsumen tahu berapa lama daging sudah dalam perjalanan.

Kriteria diterima:
- Hanya kemasan yang sudah dibuat yang bisa dicatat pengirimannya
- Tanggal kirim tidak boleh lebih awal dari tanggal sembelih

### Konsumen
> Sebagai konsumen di supermarket, saya ingin memindai QR di kemasan dan langsung melihat riwayat daging itu, supaya saya yakin dengan apa yang saya beli.

Kriteria diterima:
- Halaman terbuka tanpa perlu memasang aplikasi atau wallet apa pun
- Menampilkan seluruh riwayat: data sapi, data sembelih, data halal, data kirim
- Menampilkan tautan ke block explorer sebagai bukti independen
- Halaman terbaca dengan baik di layar ponsel
- Kalau ID tidak ditemukan, muncul pesan yang jelas, bukan halaman kosong

## 5. Alur Utama

```
Peternak daftar sapi
      ↓  cattleId dibuat
RPH catat penyembelihan + data halal
      ↓  status sapi berubah
RPH buat kemasan dari sapi tersebut
      ↓  packageId dibuat, QR digenerate
Distributor catat pengiriman
      ↓
Kemasan sampai di supermarket
      ↓
Konsumen scan QR → lihat riwayat lengkap
```

## 6. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F1 | Registrasi data sapi oleh peternak | Wajib |
| F2 | Pencatatan penyembelihan oleh RPH | Wajib |
| F3 | Pencatatan data halal (juleha, sertifikat, metode) | Wajib |
| F4 | Pembuatan kemasan dari satu ekor sapi | Wajib |
| F5 | Pencatatan pengiriman | Wajib |
| F6 | Generate QR code per kemasan | Wajib |
| F7 | Halaman publik hasil scan tanpa wallet | Wajib |
| F8 | Kontrol akses berbasis peran | Wajib |
| F9 | Pemberian dan pencabutan peran oleh admin | Wajib |
| F10 | Tautan verifikasi ke block explorer | Sebaiknya ada |
| F11 | Scanner QR di dalam aplikasi web | Sebaiknya ada |
| F12 | Dashboard statistik untuk admin | Opsional |
| F13 | Dukungan bahasa Indonesia dan Inggris | Opsional |

## 7. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Waktu muat halaman scan | Di bawah 3 detik pada koneksi 4G |
| Perangkat | Mobile first, halaman konsumen dipakai di ponsel sambil belanja |
| Aksesibilitas | Kontras teks minimal 4.5:1, ukuran font minimal 16px |
| Biaya transaksi | Gratis, memakai testnet |
| Ketersediaan | Mengikuti uptime jaringan testnet, tidak ada SLA |
| Privasi | Tidak ada data pribadi tersimpan on-chain |

## 8. Kriteria Keberhasilan

Prototype dianggap berhasil kalau:

1. Satu alur penuh dari registrasi sampai scan QR bisa didemonstrasikan tanpa error
2. Seluruh transaksi bisa diverifikasi di block explorer Polygon Amoy
3. Wallet tanpa peran yang sesuai benar-benar ditolak saat mencoba menulis data
4. Halaman konsumen terbuka di ponsel tanpa wallet dan menampilkan data yang benar
5. Ada unit test yang mencakup fungsi utama dan kasus penolakan akses
6. Keterbatasan sistem terdokumentasi dengan jujur di laporan

## 9. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data input tidak jujur di sumber | Tinggi | Kontrol akses berbasis peran, jejak audit, diakui sebagai batasan |
| Kesulitan teknis karena pemula di blockchain | Sedang | Mulai dari Remix, pindah ke Hardhat setelah paham |
| Testnet down saat demo | Sedang | Siapkan rekaman video demo sebagai cadangan |
| Biaya gas membengkak karena desain boros | Rendah | Pakai enum dan uint kecil, hindari string panjang |
| Waktu pengerjaan tidak cukup | Sedang | Fitur opsional dipotong lebih dulu, bukan fitur wajib |
