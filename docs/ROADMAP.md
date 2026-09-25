# Roadmap

Status saat ini: **Fase 3 berjalan — contract dan test selesai, menunggu deploy ke Amoy oleh owner**

Estimasi total 5 sampai 6 minggu dengan ritme santai. Sesuaikan dengan tenggat tugas. Kalau waktu mepet, urutan fase tetap sama, hanya durasinya yang dipadatkan.

---

## Fase 0 — Riset dan Penentuan Scope
**Durasi:** 2 sampai 3 hari
**Status:** Selesai

- [x] Tentukan aktor sistem
- [x] Finalisasi data yang dicatat
- [x] Putuskan model dua level ID (sapi dan kemasan)
- [x] Masukkan data halal ke dalam scope
- [x] Susun dokumentasi project

**Checkpoint:** Dokumentasi lengkap tersedia di folder `docs/`

---

## Fase 1 — Dasar Blockchain dan Solidity
**Durasi:** 4 sampai 5 hari
**Status:** Selesai (dikuasai lewat purwarupa v0: deploy Remix ke Amoy, transaksi nyata tercatat di docs/deployment.md)

- [x] Pahami konsep dasar: block, transaksi, gas, wallet, testnet
- [x] Pasang MetaMask, tambahkan jaringan Polygon Amoy
- [x] Ambil token testnet dari faucet
- [x] Latihan Solidity: struct, mapping, enum, modifier, event
- [x] Deploy contract sederhana lewat Remix ke Amoy
- [x] Panggil fungsinya dari Remix dan lihat hasilnya di block explorer

**Checkpoint:** Bisa menjelaskan dengan kalimat sendiri apa yang terjadi saat sebuah transaksi dikirim

**Sumber belajar:** Solidity by Example, CryptoZombies, dokumentasi resmi Solidity

**Catatan:** Jangan lewati fase ini dan langsung menyalin kode jadi. Kalau tidak paham dasarnya, akan kesulitan menjawab pertanyaan dosen saat presentasi.

---

## Fase 2 — Setup Project dan Struktur Contract
**Durasi:** 2 hari
**Status:** Selesai

- [x] Inisialisasi project Hardhat
- [x] Setup `.gitignore` dan `.env.example` sebelum commit pertama
- [x] Buat repository Git, commit pertama
- [x] Tulis kerangka contract: enum, struct, mapping, custom error
- [x] Implementasi sistem peran
- [x] Test manajemen peran

**Checkpoint:** `npx hardhat compile` berhasil, test peran lulus

---

## Fase 3 — Implementasi Smart Contract
**Durasi:** 5 sampai 6 hari
**Status:** Berjalan

- [x] Implementasi `registerCattle` beserta validasinya
- [x] Implementasi `recordSlaughter` beserta data halal
- [x] Implementasi `createPackages` dengan batas batch
- [x] Implementasi `recordShipping`
- [x] Implementasi seluruh fungsi baca
- [x] Tulis unit test jalur normal
- [x] Tulis unit test jalur penolakan
- [ ] Deploy ke Polygon Amoy
- [ ] Verifikasi contract di block explorer

**Checkpoint:** Seluruh test lulus, contract terverifikasi dan bisa dibaca publik di explorer

**Ini fase terpenting.** Kalau contract sudah benar dan teruji, sisanya jauh lebih mudah.

---

## Fase 4 — Frontend Pengguna Internal
**Durasi:** 5 sampai 6 hari
**Status:** Belum mulai

- [ ] Setup React dan Vite dan Tailwind
- [ ] Terapkan token dari `DESIGN-SYSTEM.md`
- [ ] Integrasi koneksi wallet lewat MetaMask
- [ ] Deteksi peran wallet, kunci form yang tidak sesuai
- [ ] Halaman admin untuk manajemen peran
- [ ] Form peternak untuk registrasi sapi
- [ ] Form RPH untuk pencatatan sembelih
- [ ] Form RPH untuk pembuatan kemasan
- [ ] Form distributor untuk pencatatan kirim
- [ ] Tangani status loading, error, dan sukses di setiap form
- [ ] Tampilkan tautan block explorer setelah transaksi berhasil

**Checkpoint:** Data yang diinput lewat frontend benar-benar tercatat di blockchain dan terlihat di explorer

---

## Fase 5 — QR Code dan Halaman Konsumen
**Durasi:** 4 hari
**Status:** Belum mulai

- [ ] Generate QR per kemasan setelah dibuat
- [ ] Fitur unduh QR sebagai gambar untuk dicetak
- [ ] Halaman cetak label berisi beberapa QR sekaligus
- [ ] Rute publik `/trace/:packageId` dengan provider read-only
- [ ] Komponen linimasa riwayat
- [ ] Tampilan kemasan tidak ditemukan yang ramah
- [ ] Bagian verifikasi dengan tautan ke explorer
- [ ] Uji buka halaman di ponsel tanpa wallet terpasang

**Checkpoint:** QR dicetak, dipindai pakai kamera ponsel, halaman terbuka dan data benar

**Ini bagian yang paling berkesan saat demo.** Pastikan berjalan mulus.

---

## Fase 6 — Pengujian Menyeluruh
**Durasi:** 3 hari
**Status:** Belum mulai

- [ ] Uji alur penuh dari registrasi sampai pemindaian
- [ ] Uji kasus batas: umur di luar rentang, tanggal masa depan, batch terlalu besar
- [ ] Uji akses ditolak untuk wallet tanpa peran
- [ ] Uji tampilan di beberapa ukuran layar
- [ ] Periksa kontras dan aksesibilitas dasar
- [ ] Pastikan tidak ada error di konsol browser
- [ ] Jalankan daftar periksa keamanan di `SECURITY.md`

**Checkpoint:** Alur penuh berjalan tanpa error, daftar periksa keamanan lulus semua

---

## Fase 7 — Dokumentasi dan Laporan
**Durasi:** 3 sampai 4 hari
**Status:** Belum mulai

- [ ] Kumpulkan tangkapan layar tiap tahap
- [ ] Catat hash transaksi sebagai bukti pencatatan nyata
- [ ] Tulis laporan: latar belakang, arsitektur, implementasi, pengujian
- [ ] Tulis bagian keterbatasan sistem secara jujur
- [ ] Rapikan README
- [ ] Siapkan slide presentasi
- [ ] Rekam video demo sebagai cadangan kalau testnet bermasalah saat presentasi

**Checkpoint:** Laporan dan slide siap, bukti transaksi terkumpul

---

## Fase 8 — Persiapan Presentasi
**Durasi:** 1 hari
**Status:** Belum mulai

- [ ] Latihan demo dari awal sampai akhir
- [ ] Siapkan data contoh yang sudah terisi, supaya demo tidak perlu input dari nol
- [ ] Siapkan jawaban untuk pertanyaan yang mungkin muncul

**Pertanyaan yang kemungkinan besar ditanyakan dosen:**

1. Kenapa harus blockchain, kenapa tidak database biasa saja?
2. Bagaimana kalau orang yang menginput datanya berbohong?
3. Siapa yang membayar biaya gas kalau ini dipakai sungguhan?
4. Apa bedanya dengan sistem sertifikasi halal yang sudah ada?
5. Kenapa memilih Polygon dan bukan Ethereum?
6. Bagaimana kalau kemasan QR-nya dipalsukan?
7. Apakah data pribadi peternak aman?

Jawaban untuk nomor 1, 2, 4, dan 7 sudah tersedia di `README.md` dan `SECURITY.md`. Baca ulang sebelum presentasi.

---

## Yang Dipotong Kalau Waktu Tidak Cukup

Urutan pemotongan, dari yang paling aman dipotong:

1. Dukungan dua bahasa
2. Dashboard statistik admin
3. Scanner QR di dalam aplikasi, cukup andalkan kamera bawaan ponsel
4. Halaman cetak label massal, cukup unduh QR satu per satu
5. Penyempurnaan visual frontend, fungsional lebih penting daripada cantik

**Yang tidak boleh dipotong:** smart contract, kontrol akses, halaman konsumen, dan unit test. Empat ini adalah inti nilai project.

---

## Pengembangan di Luar Scope Tugas

Kalau nanti project ini dilanjutkan:

- Sensor IoT yang menulis data suhu rantai dingin langsung ke blockchain tanpa campur tangan manusia
- Tanda tangan ganda, misalnya pencatatan halal butuh persetujuan RPH dan pengawas sertifikasi
- Integrasi dengan basis data sertifikasi halal resmi
- Aplikasi mobile khusus dengan pemindai bawaan
- Dukungan multi-hewan, tidak hanya sapi
