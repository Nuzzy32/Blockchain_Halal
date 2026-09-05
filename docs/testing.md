# Testing — Fase 5

Integrasi & testing end-to-end lewat **frontend**, bukan Remix. Sapi id 1 sudah terpakai
penuh pada smoke test Fase 3, jadi pengujian ini memakai **sapi id 2**.

Prasyarat: MetaMask terpasang dengan 4 akun berlabel sesuai `deployment.md`, semuanya di
jaringan Polygon Amoy dan punya test POL.

Jalankan pengujian di **situs live**, bukan localhost — hanya di sana QR code berisi URL
yang bisa dibuka ponsel:

<https://nuzzy32.github.io/Blockchain_Halal/>

Untuk mengubah kode dan mengujinya sebelum publish: `cd frontend && npm run dev`, lalu
`npm run deploy` untuk mendorong versi baru ke situs live.

Status: `[ ]` belum diuji · `✓` sesuai harapan · `✗` gagal (tulis apa yang terjadi)

---

## A. Alur bahagia — bukti utama untuk laporan

| # | Wallet aktif | Aksi di UI | Harapan | Status | Tx hash |
|---|---|---|---|---|---|
| A1 | Peternak | Daftarkan sapi: id `2`, umur `30`, pakan `Rumput Gajah`, grade `B` | Status hijau "Tercatat di blockchain" + link tx | `[ ]` | |
| A2 | — | Isi `2` di kartu "QR untuk kemasan", klik **Unduh PNG** | File `qr-sapi-2.png` terunduh | `[ ]` | — |
| A3 | RumahPotong | Catat penyembelihan id `2` | Sukses | `[ ]` | |
| A4 | Distributor | Catat pengiriman id `2` | Sukses | `[ ]` | |
| A5 | HP, tanpa wallet | Scan QR dari A2 | Halaman track sapi #2 terbuka, badge "Dikirim", 3 langkah timeline terisi | `[ ]` | — |

Setelah A4 selesai, salin ketiga tx hash ke tabel bukti transaksi di `deployment.md`.

## B. Aturan contract — tiap baris menguji satu `require`

Semua diuji lewat UI. Pesan yang diharapkan harus muncul di kotak merah di bawah tombol.

| # | Wallet | Aksi | Pesan yang diharapkan | Status |
|---|---|---|---|---|
| B1 | Peternak | Daftarkan id `2` lagi | `CT: sapi sudah terdaftar` | `[ ]` |
| B2 | Peternak | Daftarkan id `0` | `CT: id tidak boleh 0` | `[ ]` |
| B3 | Peternak | Daftarkan id `3`, umur `0` | `CT: umur tidak boleh 0` | `[ ]` |
| B4 | Peternak | Daftarkan id `3`, pakan diisi spasi saja | `CT: jenis pakan kosong` | `[ ]` |
| B5 | Peternak | Daftarkan id `3`, grade diisi spasi saja | `CT: grade kosong` | `[ ]` |
| B6 | RumahPotong | Sembelih id `999` (belum terdaftar) | `CT: sapi belum terdaftar` | `[ ]` |
| B7 | RumahPotong | Sembelih id `2` lagi | `CT: sapi sudah disembelih` | `[ ]` |
| B8 | Distributor | Kirim id `2` lagi | `CT: sapi sudah dikirim` | `[ ]` |
| B9 | Peternak | Daftarkan id `4`, lalu Distributor coba kirim id `4` | `CT: sapi belum disembelih` | `[ ]` |
| B10 | Owner (tanpa role aktor) | Buka panel | Kartu "Wallet ini belum punya role", tidak ada form | `[ ]` |

> B4/B5: input `required` menolak string kosong, jadi isi dengan spasi untuk menembus
> validasi HTML dan benar-benar sampai ke contract.
>
> B10 menguji guard role secara tidak langsung. Guard `onlyRole` sendiri sudah diuji
> penuh di 11 unit test contract (Fase 3) — UI tidak menyediakan cara memanggil fungsi
> milik role lain, karena form-nya memang tidak dirender.

## C. Halaman konsumen

| # | Aksi | Harapan | Status |
|---|---|---|---|
| C1 | Buka `?id=1` | Data sapi id 1 tampil lengkap, 3 langkah hijau | `[ ]` |
| C2 | Buka `?id=999` | "Sapi #999 tidak ditemukan", bukan layar kosong/crash | `[ ]` |
| C3 | Buka `?id=abc` | Jatuh ke panel aktor, tidak error | `[ ]` |
| C4 | Buka `?id=` (kosong) | Jatuh ke panel aktor, tidak error | `[ ]` |
| C5 | Buka `?id=2` di jendela **incognito tanpa MetaMask** | Halaman tetap tampil penuh — membuktikan konsumen tidak butuh wallet | `[ ]` |
| C6 | Buka `?id=2`, lalu daftarkan sapi baru id `5` dan buka `?id=5` | Hanya langkah "Terdaftar" hijau, dua langkah lain abu-abu "Belum tercatat" | `[ ]` |
| C7 | Matikan wifi, buka `?id=1` | Kartu "Gagal memuat data" + tombol Muat ulang | `[ ]` |
| C8 | Buka `?id=1` di layar HP | Terbaca nyaman, tidak ada scroll horizontal | `[ ]` |

## D. Perilaku wallet & jaringan

| # | Aksi | Harapan | Status |
|---|---|---|---|
| D1 | Buka panel di browser tanpa MetaMask | Kartu "MetaMask tidak terdeteksi" + tombol pasang | `[ ]` |
| D2 | Pindahkan MetaMask ke Ethereum Mainnet | Banner kuning "Jaringan salah", semua input terkunci | `[ ]` |
| D3 | Klik **Pindah ke Amoy** pada banner D2 | MetaMask minta konfirmasi, banner hilang, form aktif lagi | `[ ]` |
| D4 | Klik tombol submit lalu **tolak** di MetaMask | Pesan netral "Transaksi dibatalkan di MetaMask" | `[ ]` |
| D5 | Ganti akun di MetaMask saat panel terbuka (Peternak → Distributor) | Form ikut berganti tanpa perlu reload | `[ ]` |
| D6 | Muat ulang halaman setelah pernah connect | Wallet tersambung otomatis tanpa popup | `[ ]` |

---

## Hasil

_Isi setelah semua tabel di atas dijalankan._

- Tanggal pengujian:
- Dijalankan oleh:
- Ringkasan:
- Yang gagal & tindak lanjut:

## Screenshot

Simpan ke `docs/screenshots/`. Minimal yang dibutuhkan laporan Fase 6:

- [ ] Form peternak terisi, sebelum submit
- [ ] Status sukses + link tx hash
- [ ] QR code ter-generate untuk sapi id 2
- [ ] Halaman track sapi id 2 di layar HP (3 langkah terisi)
- [ ] Satu pesan revert, mis. B7 "sapi sudah disembelih"
- [ ] Banner "Jaringan salah" (D2)
- [ ] Halaman "Sapi #999 tidak ditemukan" (C2)

## D. Dashboard statistik (Fase 1)

| # | Aksi | Harapan | Status |
|---|---|---|---|
| D1 | Buka `?dashboard=1` tanpa wallet terpasang | Halaman terbuka penuh, tidak ada permintaan connect wallet | `[ ]` |
| D2 | Bandingkan "Total sapi" dengan jumlah sapi yang sudah didaftarkan | Angkanya sama | `[ ]` |
| D3 | Bandingkan corong tahapan dengan status tiap sapi | Terdaftar ≥ Disembelih ≥ Dikirim, dan cocok dengan kenyataan | `[ ]` |
| D4 | Periksa sebaran grade | Jumlah per grade cocok; totalnya sama dengan total sapi | `[ ]` |
| D5 | Klik nomor sapi di tabel "Sapi terbaru" | Membuka halaman lacak sapi tersebut | `[ ]` |
| D6 | Matikan koneksi internet lalu muat ulang | Muncul "Gagal memuat statistik" + tombol Muat ulang, bukan layar kosong | `[ ]` |
| D7 | Buka di lebar ponsel (±375px) | Tidak ada geseran horizontal; tabel tetap terbaca | `[ ]` |
