# Testing

## v1.0 — frontend HalalChain Trace

Jalankan di node Hardhat lokal sesuai `docs/deployment-v1.md` bagian "Pengembangan lokal" (setelah deploy + seed). Setelah contract v1 ada di Amoy, ulangi baris A dan C di situs live.

Status: `[ ]` belum diuji · `✓` sesuai harapan · `✗` gagal (tulis apa yang terjadi)

Putaran 2026-09-26: diuji di browser pratinjau terhadap node Hardhat lokal (deploy + seed), dengan penyedia EIP-1193 uji yang meneruskan transaksi ke akun Hardhat — **bukan MetaMask asli**. B10 (pindah jaringan), C3 (node mati), dan C4/C5 (kamera) belum diuji; kamera diblokir di browser pratinjau, logika penolakan URL scanner sudah dicakup uji murni `validation.test.js`. Ulangi seluruh tabel dengan MetaMask sebelum demo.

### A. Alur bahagia

| # | Akun MetaMask | Aksi | Harapan | Status |
|---|---|---|---|---|
| A1 | #1 Peternak | Daftarkan sapi: umur 28, berat 460, Prime, Rumput, `FARM-TES-001` | Ringkasan tampil → tanda tangan → "ID sapi baru: HCT-C-000005" | `✓` |
| A2 | #2 RPH | Catat sembelih sapi 5 (waktu default, metode manual tanpa pemingsanan, `JULEHA-0042`, `ID00410000123`) | Sukses; pratinjau sapi berubah ke Disembelih | `✓` |
| A3 | #2 RPH | Buat 2 kemasan dari sapi 5: Sirloin 500 g, Brisket 1000 g | Dua label QR HCT-P-000006 dan HCT-P-000007 tampil | `✓` |
| A4 | — | Unduh PNG label HCT-P-000006 | File `label-HCT-P-000006.png` berisi QR + teks label | `✓` |
| A5 | #3 Distributor | Kirim `6, 7` | Sukses; pratinjau kedua kemasan berubah ke Dikirim | `✓` |
| A6 | tanpa wallet | Buka `?trace=6` | Kartu halal terisi, 4 langkah linimasa terisi, tautan/hash tx tiap langkah | `✓` |
| A7 | #0 Admin | Beri peran Peternak ke alamat akun #4, lalu cabut | Daftar "Peran saat ini" ikut berubah | `✓` |

### B. Penolakan

| # | Akun | Aksi | Harapan | Status |
|---|---|---|---|---|
| B1 | #1 Peternak | Umur 5 | Pesan inline "Umur harus antara 6 dan 120 bulan", MetaMask tidak muncul | `✓` |
| B2 | #2 RPH | Sembelih sapi 1 (sudah disembelih) | Pesan inline status, tombol tidak lanjut | `✓` |
| B3 | #2 RPH | Kemasan dari sapi 4 (belum disembelih) | "Sapi ini belum disembelih." | `✓` |
| B4 | #2 RPH | Kemasan sapi 3 total 400.000 g (8 × 50.000) | "melebihi sisa berat" | `✓` |
| B5 | #3 Distributor | Kirim `1` (sudah dikirim) | "Sudah dikirim: HCT-P-000001." | `✓` |
| B6 | #3 Distributor | Kirim `999` | "Tidak ditemukan: HCT-P-000999." | `✓` |
| B7 | #0 Admin | Cabut peran Admin dari akun #0 sendiri | Pesan contract "Admin terakhir tidak bisa dicabut…" | `✓` |
| B8 | akun #4 tanpa peran | Buka panel | Kartu "Wallet ini belum punya peran" | `✓` |
| B9 | siapa saja | Tolak tanda tangan di MetaMask | "Transaksi dibatalkan di MetaMask." | `✓` |
| B10 | siapa saja | MetaMask di jaringan lain | Banner "Jaringan salah", form terkunci, tombol pindah jaringan berfungsi | `[ ]` |

### C. Halaman konsumen dan scanner

| # | Aksi | Harapan | Status |
|---|---|---|---|
| C1 | Buka `?trace=4` | Langkah "Dikirim distributor" berstatus "Belum dikirim" | `✓` |
| C2 | Buka `?trace=999` dan `?trace=abc` | "Kemasan tidak ditemukan" + peringatan label palsu | `✓` |
| C3 | Matikan node, buka `?trace=1` | "Gagal memuat data" + tombol Coba lagi | `[ ]` |
| C4 | `?scan=1` di laptop, pindai label A4 | Pindah ke `?trace=6` | `[ ]` |
| C5 | `?scan=1`, pindai QR berisi URL situs lain | "QR ini bukan label HalalChain Trace", tidak dibuka | `[ ]` |
| C6 | Buka `?trace=1` di ponsel (lebar 375 px) | Tanpa geser horizontal, teks terbaca, target sentuh ≥ 44 px | `✓` |

## v0 (arsip) — Fase 5 purwarupa

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

## E. Dashboard statistik (Fase 1)

| # | Aksi | Harapan | Status |
|---|---|---|---|
| E1 | Buka `?dashboard=1` tanpa wallet terpasang | Halaman terbuka penuh, tidak ada permintaan connect wallet | `[x]` |
| E2 | Bandingkan "Total sapi" dengan jumlah sapi yang sudah didaftarkan | Angkanya sama | `[x]` |
| E3 | Bandingkan corong tahapan dengan status tiap sapi | Tiap sapi terhitung tepat sekali; jumlah ketiganya = total | `[x]` |
| E4 | Periksa sebaran grade | Jumlah per grade cocok; totalnya sama dengan total sapi | `[x]` |
| E5 | Klik nomor sapi di tabel "Sapi terbaru" | Membuka halaman lacak sapi tersebut | `[x]` |
| E6 | Putus akses ke RPC lalu muat ulang | Muncul "Gagal memuat statistik" + tombol Muat ulang, bukan layar kosong | `[x]` |
| E7 | Buka di lebar ponsel (±375px) | Tidak ada geseran horizontal; tabel tetap terbaca | `[x]` |

Catatan E3: harapan semula ditulis sebagai corong kumulatif (Terdaftar ≥ Disembelih ≥
Dikirim). Dashboard yang jadi menampilkan **status eksklusif** — "masih di peternakan",
"sudah disembelih belum dikirim", "sudah dikirim" — supaya tiap sapi terhitung tepat
sekali. Harapan di tabel disesuaikan mengikuti perilaku yang benar itu.

Catatan E6: "matikan internet" diganti "arahkan RPC ke host yang tidak ada", dijalankan di
`npm run dev`. Jalur kodenya identik (`fetchAllCattle()` reject → `catch` → `LoadError`)
dan tidak butuh mencabut jaringan mesin penguji.

---

## Hasil

### Bagian E — Dashboard statistik (Fase 1)

- Tanggal pengujian: 5 September 2026
- Dijalankan oleh: Claude Code, di situs live <https://nuzzy32.github.io/Blockchain_Halal/>
  (E6 di `npm run dev`, lihat catatannya)
- Ringkasan: **7/7 lulus.** Data pembanding diambil langsung dari chain lewat
  `fetchAllCattle()`: 1 sapi tercatat, id 1, grade A, sudah sampai tahap dikirim
  (terdaftar 1788581465 → disembelih 1788581815 → dikirim 1788581958).
  Dashboard menampilkan total 1; status eksklusif 0 / 0 / 1; grade A 1 ekor 100%;
  rata-rata "daftar → disembelih" 6 menit dan "disembelih → dikirim" 2 menit — cocok
  dengan selisih timestamp di atas. Klik `#1` membuka `?id=1` dengan data yang benar.
  Pada 375 px `scrollWidth` sama dengan `clientWidth` (nol geseran horizontal) dan tidak
  ada satu pun elemen yang melewati tepi; kolom "Terdaftar" tersembunyi sesuai desain.
- Yang gagal & tindak lanjut: tidak ada.
- Catatan publish: setelah `npm run deploy`, `index.html` sempat terlayan dari cache
  peramban sehingga masih memuat bundel lama. Muat ulang dengan query pemecah cache
  menyelesaikannya — bukan bug aplikasi, tapi perlu diingat saat demo.

### Bagian A–D — Alur penulisan lewat MetaMask (Fase 5)

Belum dijalankan. Semuanya butuh MetaMask dengan 4 akun berlabel dan test POL, jadi harus
dijalankan sendiri oleh Adrian — bukan sesuatu yang bisa diotomatiskan dari sini.

## Screenshot

Simpan ke `docs/screenshots/`. Minimal yang dibutuhkan laporan Fase 6:

- [ ] Form peternak terisi, sebelum submit
- [ ] Status sukses + link tx hash
- [ ] QR code ter-generate untuk sapi id 2
- [ ] Halaman track sapi id 2 di layar HP (3 langkah terisi)
- [ ] Satu pesan revert, mis. B7 "sapi sudah disembelih"
- [ ] Banner "Jaringan salah" (D2)
- [ ] Halaman "Sapi #999 tidak ditemukan" (C2)
