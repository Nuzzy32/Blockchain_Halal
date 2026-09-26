# Spesifikasi Fase 4 v1.0 — Frontend HalalChain Trace

**Status:** Disetujui owner lewat diskusi 2026-09-25, menunggu review dokumen
**Cakupan ROADMAP:** Fase 4 (pengguna internal) dan Fase 5 (QR + halaman konsumen), plus scanner QR di web
**Contract:** `contracts/CattleRegistry.sol` (Fase 3, belum di-deploy ke Amoy karena POL testnet belum ada)

## 1. Tujuan

Frontend React yang menjalankan seluruh alur v1.0 dari registrasi sapi sampai konsumen memindai QR kemasan, dikembangkan dan diuji melawan jaringan Hardhat lokal, lalu dipindah ke Polygon Amoy cukup dengan mengisi alamat contract.

## 2. Keputusan yang sudah diambil

| # | Keputusan | Alasan |
|---|---|---|
| K1 | `frontend/` diubah langsung jadi v1 | Satu proyek React; kode v0 tetap ada di riwayat git; situs v0 di GitHub Pages tetap live sampai deploy ulang |
| K2 | Cakupan: Fase 4 + Fase 5 + scanner QR | Demo baru bermakna kalau alurnya utuh sampai scan |
| K3 | Pengembangan lokal pakai `npx hardhat node` + MetaMask | Alur identik dengan Amoy, termasuk tanda tangan MetaMask; tidak ada private key di kode frontend |
| K4 | Dashboard statistik v0 dihapus | Tidak dipilih owner; kodenya rusak di ABI v1 |
| K5 | Tidak dikerjakan: dashboard, cetak label massal, dua bahasa, daftar per aktor | Opsional di PRD; bisa ditambah tanpa mengubah contract |

## 3. Halaman

Dipilih dari query param, tanpa router — GitHub Pages tidak punya SPA rewrite, jadi `?param` selalu mengenai `index.html`.

| URL | Halaman | Wallet |
|---|---|---|
| `?trace=<packageId>` | Halaman konsumen, tujuan QR | Tidak |
| `?scan=1` | Scanner QR kamera | Tidak |
| tanpa param | Panel internal | Ya |

`?trace` sengaja tidak memakai `?id` milik v0: tautan v0 `?id=1` menunjuk sapi, dan akan diam-diam membuka *kemasan* 1 di v1. Nilai `trace` yang bukan bilangan bulat positif menampilkan halaman "kemasan tidak ditemukan", bukan layar kosong.

## 4. Jaringan

`frontend/src/chain.js` adalah satu-satunya tempat setelan jaringan, dipilih lewat `VITE_NETWORK`:

| | `local` | `amoy` |
|---|---|---|
| Dipakai oleh | `npm run dev` | `npm run build` / `npm run deploy` |
| chainId | `31337` | `80002` |
| RPC read-only | `http://<hostname halaman>:8545` | `https://polygon-amoy-bor-rpc.publicnode.com` |
| Alamat contract | `0x5FbDB2315678afecb367f032d93F642f64180aa3` (deploy pertama akun #0 Hardhat selalu di alamat ini) | kosong sampai owner deploy |
| Explorer | tidak ada — tampilkan hash saja | `https://amoy.polygonscan.com` |
| Blok awal pencarian log | `0` | blok deploy dari `docs/deployment-v1.md` |

RPC lokal memakai hostname halaman (bukan `127.0.0.1` tetap) supaya halaman yang dibuka dari ponsel se-Wi-Fi tetap menjangkau node di laptop.

Alamat Amoy yang masih kosong → setiap halaman menampilkan "Contract v1 belum di-deploy ke Polygon Amoy", bukan error.

## 5. ABI

`scripts/export-abi.js` (root repo) menyalin ABI dari artifact Hardhat ke `frontend/src/CattleRegistry.abi.json`, dan file itu di-commit. Tidak ada ABI yang diketik tangan: selain mencegah salah ketik, ethers butuh definisi custom error di ABI untuk menerjemahkan revert.

`scripts/check.mjs` diganti versi v1: memastikan ABI frontend sama dengan artifact, dan (kalau alamat Amoy terisi) alamat itu berisi bytecode. `scripts/check-stats.mjs` dihapus.

## 6. Pengembangan lokal

1. `npx hardhat node` (opsional `--hostname 0.0.0.0` untuk dibuka dari ponsel)
2. `npx hardhat run scripts/deploy.js --network localhost` — `deploy.js` memberi peran ke akun Hardhat #1 peternak, #2 RPH, #3 distributor saat jaringannya `localhost`; di Amoy tetap ke wallet v0
3. `npx hardhat run scripts/seed.js --network localhost` — contoh data: beberapa sapi di tiap tahap, beberapa kemasan, sebagian sudah dikirim. Hanya untuk `localhost` (menolak jalan di jaringan lain, karena butuh private key akun aktor)
4. `cd frontend && npm run dev`
5. MetaMask: tambah jaringan Hardhat Local (RPC `http://127.0.0.1:8545`, chainId `31337`), import akun #0-#3. Private key akun ini publik di dokumentasi Hardhat dan hanya berlaku di node lokal

Node Hardhat dimulai kosong tiap dijalankan ulang; langkah 2-3 diulang, dan MetaMask perlu "Clear activity data" supaya nonce-nya tidak bentrok.

## 7. Panel internal

**Bilah wallet:** tombol Connect MetaMask, alamat aktif, lencana peran (keempat peran dicek sekaligus lewat `checkRole`). Jaringan salah → banner dengan tombol pindah jaringan (`wallet_switchEthereumChain`, lalu `wallet_addEthereumChain` kalau belum ada). Tanpa MetaMask → kartu cara memasang. Wallet tanpa peran → kartu "Wallet ini belum punya peran" beserta alamatnya.

Wallet dengan beberapa peran melihat semua bagian perannya.

**Admin:** form alamat + pilihan peran + tombol Beri / Cabut. Setelah alamat valid diketik, peran yang sedang dimiliki alamat itu ditampilkan.

**Peternak:** form registrasi: umur (bulan, 6-120), berat hidup (kg, 100-1500), grade, jenis pakan, kode peternakan (maks 31 karakter ASCII). Berhasil → ID sapi baru dari event `CattleRegistered`, tampil sebagai `HCT-C-000042`.

**RPH — catat sembelih:** ID sapi → pratinjau sapi (status harus Terdaftar, selain itu ditolak sebelum MetaMask). Tanggal dan jam sembelih (`datetime-local`, default sekarang, tidak boleh masa depan, tidak boleh sebelum tanggal registrasi), ID juru sembelih, nomor sertifikat halal (maks 31 karakter), metode sembelih.

**RPH — buat kemasan:** ID sapi → pratinjau (status Disembelih/Dikemas, RPH pencatat harus wallet aktif, sisa berat = `liveWeightKg × 1000 − packagedGrams`). Baris kemasan: jenis potongan + berat (100-50.000 g), tambah/hapus baris, maks `MAX_BATCH` (dibaca dari contract), total dibandingkan sisa berat secara langsung. Berhasil → tiap kemasan baru tampil dengan QR, tombol unduh PNG, dan tautan ke halaman konsumennya.

**Distributor:** ID kemasan dipisah koma (`1, 2, 5`) → daftar pratinjau status tiap ID; tanggal kirim (default sekarang). Maks `MAX_BATCH`, tanpa ID ganda.

**Aturan semua form:**
- Validasi frontend mencerminkan batas contract (DATA-MODEL §5); contract tetap penjaga terakhir
- Sebelum MetaMask muncul, tampil ringkasan "Yang akan dicatat permanen" + tombol "Tandatangani di MetaMask" (SECURITY A12)
- Tiga keadaan: menunggu tanda tangan / menunggu konfirmasi blok, gagal, berhasil (tautan tx di Amoy, hash di lokal)
- Revert diterjemahkan dari nama custom error ke bahasa Indonesia; `ACTION_REJECTED` → "Transaksi dibatalkan di MetaMask"

## 8. Halaman konsumen (`?trace=N`)

Satu panggilan `getPackageTrace(N)` lewat RPC read-only.

- **Kepala:** `HCT-P-000005`, jenis potongan, berat, status (Dikemas / Dikirim)
- **Kartu halal:** nomor sertifikat halal, ID juru sembelih, metode sembelih, dan kalimat bahwa sistem hanya mencatat klaim — penilaian sah tidaknya wewenang lembaga sertifikasi (DATA-MODEL, catatan SlaughterMethod)
- **Kesegaran:** "Disembelih N hari lalu"
- **Linimasa:** Terdaftar di peternakan (tanggal, kode peternakan, umur, berat hidup, grade, pakan, wallet peternak) → Disembelih (tanggal, wallet RPH) → Dikemas (tanggal) → Dikirim (tanggal, wallet distributor) atau "Belum dikirim"
- **Verifikasi:** tautan tx per langkah dari event yang di-index (`CattleRegistered`/`CattleSlaughtered` per `cattleId`, `PackageCreated`/`PackageShipped` per `packageId`), dimuat setelah data utama tampil, rentang log dipecah per 10.000 blok. Gagal → tautan ke halaman contract di explorer
- **Keadaan:** memuat; kemasan tidak ditemukan (`PackageNotFound` → "QR ini tidak cocok dengan kemasan mana pun — bisa jadi salah cetak atau palsu"); RPC gagal + tombol coba lagi; contract belum di-deploy
- `bytes32` diubah ke teks lewat `decodeBytes32String` (gagal → tampil hex); enum lewat tabel label tetap; tidak ada `dangerouslySetInnerHTML` (SECURITY A10)
- Mobile-first, teks min 16 px, kontras min 4.5:1 (PRD §7)

## 9. QR dan scanner

**QR:** berisi URL `${origin}${BASE_URL}?trace=N` (ARCHITECTURE §2.3). Unduhan PNG siap cetak dengan teks label di bawahnya, misalnya `HCT-P-000005 · Sirloin 500 g`. Library tetap `qrcode.react`.

**Scanner (`?scan=1`):** `html5-qrcode`. Hasil pindai yang berupa URL situs ini dengan `?trace=N` → pindah ke halaman itu. URL ke situs lain atau teks lain → "QR ini bukan label HalalChain Trace", tidak dibuka (SECURITY A9). Kamera butuh HTTPS atau `localhost`; di ponsel scanner baru bisa diuji penuh setelah situs live di GitHub Pages.

## 10. Susunan file

```
frontend/src/
  chain.js                  setelan jaringan, provider read-only, tautan explorer
  CattleRegistry.abi.json   ABI hasil ekspor
  format.js                 label enum, bytes32 <-> teks, format ID/tanggal/alamat
  errors.js                 penerjemah custom error contract -> kalimat Indonesia
  validation.js             validator murni sesuai batas contract
  registry.js               contract baca/tulis, penerjemah error runtime, pencarian tx per langkah
  *.test.js                 uji murni (node --test)
  hooks.js                  useWallet, useTx, useCattle, usePackages
  components.jsx            Banner, Section, Field, Review, TxStatus, CattleSummary, QrLabel
  App.jsx                   pemilih halaman dari query param
  InternalPanel.jsx         bilah wallet + susunan bagian per peran (lazy-loaded dari App.jsx)
  sections/                 AdminSection, FarmerSection, SlaughterSection,
                            PackagingSection, DistributorSection
  TracePage.jsx             halaman konsumen (static import, tidak lazy)
  ScanPage.jsx              scanner (lazy-loaded dari App.jsx)
```

Dihapus: `ActorPanel.jsx`, `TrackPage.jsx`, `DashboardPage.jsx`, `stats.js`, `contract.js` (digantikan `chain.js` + `registry.js`). Bagian tampilan yang masih cocok dipakai ulang.

Dependency baru: `html5-qrcode` saja (sudah tercantum di tech stack `docs/CLAUDE.md`).

Tampilan mengikuti `design-system/traceability-sapi/MASTER.md` dan token di `frontend/src/index.css`.

## 11. Pengaman deploy situs

`npm run deploy` menolak jalan (keluar dengan pesan jelas) selama alamat Amoy di `chain.js` kosong. Tanpa ini, satu `npm run deploy` mengganti situs v0 yang berfungsi dengan halaman "contract belum di-deploy".

## 12. Pengujian

1. **Uji murni** (`node --test`, tanpa library baru): validator, batas 31 karakter `bytes32`, format `HCT-C`/`HCT-P`, parsing daftar ID kemasan, penerjemah error, validasi URL hasil pindai (URL situs lain ditolak)
2. **Uji alur di browser pratinjau** melawan Hardhat node + seed: browser pratinjau tidak punya MetaMask, jadi selama pengujian disisipkan penyedia EIP-1193 sementara lewat alat debugging yang meneruskan permintaan ke akun node Hardhat (akun node sudah ter-unlock). Sisipan ini tidak pernah masuk kode sumber
3. **Uji manual owner** dengan MetaMask asli: matriks di `docs/testing.md` bagian v1, termasuk buka halaman konsumen di ponsel

## 13. Kriteria selesai

- Seluruh alur registrasi → sembelih → kemasan + QR → kirim → halaman konsumen berjalan di jaringan lokal lewat UI
- Setiap penolakan contract yang bisa dipicu dari form tampil sebagai pesan bahasa Indonesia
- Uji murni lulus; konsol browser bersih dari error
- `npm run build` dengan `VITE_NETWORK=amoy` berhasil; `npm run deploy` menolak selama alamat Amoy kosong
- Pindah ke Amoy setelah owner deploy hanya perlu mengisi alamat dan blok deploy di `chain.js`
