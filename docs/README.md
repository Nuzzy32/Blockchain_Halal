# HalalChain Trace

Prototype sistem ketertelusuran rantai pasok daging sapi berbasis blockchain, dari peternakan sampai rak supermarket.

Konsumen memindai QR code di kemasan daging, lalu melihat riwayat lengkap hewan tersebut: umur, jenis pakan, grade, kapan disembelih, siapa juru sembelihnya, nomor sertifikat halal, dan kapan dikirim dari rumah potong hewan.

> Project tugas mata kuliah Inovasi Sistem Informasi Teknologi. Berjalan di testnet, bukan aplikasi production.

## Kenapa Blockchain

Sistem pencatatan rantai pasok yang ada sekarang umumnya berupa database terpusat milik satu pihak. Masalahnya, pihak yang punya database itu juga pihak yang diawasi. Data tanggal sembelih atau grade daging bisa diubah tanpa jejak kalau ada kepentingan.

Blockchain memberi tiga hal yang tidak dimiliki database biasa:

1. **Immutability** — data yang sudah tercatat tidak bisa diubah atau dihapus diam-diam
2. **Jejak audit permanen** — setiap perubahan punya timestamp dan identitas penginput
3. **Verifikasi independen** — konsumen bisa memverifikasi data tanpa harus percaya pada supermarket atau RPH

### Batasan yang perlu diakui

Blockchain menjamin data **tidak berubah setelah masuk**, tetapi tidak menjamin data **benar saat dimasukkan**. Kalau petugas RPH menginput grade palsu, sistem akan menyimpan kebohongan itu secara permanen.

Mitigasi yang diterapkan di prototype ini: hanya wallet tersertifikasi yang boleh menginput data pada tahap tertentu, dan setiap input meninggalkan jejak alamat wallet penginput. Ini mengurangi risiko, tidak menghilangkannya. Penjelasan lengkap ada di `docs/SECURITY.md`.

## Fitur

- Registrasi data sapi oleh peternak (umur, jenis pakan, grade)
- Pencatatan penyembelihan oleh RPH, termasuk data halal (juru sembelih dan nomor sertifikat)
- Pembuatan batch kemasan dari satu ekor sapi, masing-masing dengan ID unik
- Pencatatan pengiriman dari RPH ke distributor
- Generate QR code per kemasan
- Halaman publik hasil scan, bisa dibuka siapa saja tanpa wallet
- Kontrol akses berbasis peran di level smart contract

## Tech Stack

- **Smart contract:** Solidity ^0.8.20
- **Development:** Hardhat
- **Jaringan:** Polygon Amoy testnet
- **Frontend:** React + Vite + Tailwind CSS
- **Web3:** ethers.js v6
- **QR:** qrcode (generate), html5-qrcode (scan)

## Cara Menjalankan

### Prasyarat
- Node.js 22 atau lebih baru (syarat Hardhat 3)
- MetaMask terpasang di browser
- Saldo POL testnet dari faucet Polygon Amoy

### Setup

```bash
git clone <url-repo>
cd halalchain-trace
npm install
```

> Gunakan wallet khusus testing. Jangan pernah memakai wallet yang berisi aset bernilai nyata.

### Compile dan test

```bash
npx hardhat compile
npm test
```

### Deploy ke testnet

Private key disimpan terenkripsi lewat keystore Hardhat, bukan file `.env`. Langkah lengkap (keystore, deploy, verifikasi) ada di `docs/deployment-v1.md`.

### Jalankan frontend

```bash
cd frontend
npm run dev
```

## Struktur Folder

```
contracts/        Smart contract Solidity
test/             Unit test
scripts/          Script deploy dan seed
frontend/         Aplikasi web
docs/             Dokumentasi project
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [PRD](docs/PRD.md) | Kebutuhan produk, user story, kriteria keberhasilan |
| [Architecture](docs/ARCHITECTURE.md) | Arsitektur sistem dan alur data |
| [Data Model](docs/DATA-MODEL.md) | Struktur data on-chain |
| [Contracts](docs/CONTRACTS.md) | Spesifikasi fungsi smart contract |
| [Security](docs/SECURITY.md) | Threat model dan mitigasi |
| [Design System](docs/DESIGN-SYSTEM.md) | Token visual dan komponen UI |
| [Roadmap](docs/ROADMAP.md) | Fase pengerjaan |

## Status

Tahap perencanaan. Lihat `docs/ROADMAP.md` untuk progress terkini.

## Lisensi

MIT
