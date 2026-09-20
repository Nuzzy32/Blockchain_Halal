# CLAUDE.md

Panduan untuk AI assistant yang bekerja di repository ini.

## Tentang Project

**HalalChain Trace** adalah prototype sistem ketertelusuran (traceability) rantai pasok daging sapi berbasis blockchain. Data sapi dicatat dari peternakan, rumah potong hewan (RPH), sampai kemasan di supermarket. Konsumen memindai QR code di kemasan untuk melihat riwayat lengkap hewan tersebut, termasuk bukti penyembelihan halal.

Ini adalah **project tugas kuliah** mata kuliah Inovasi Sistem Informasi Teknologi. Target outputnya adalah prototype yang benar-benar berjalan di testnet, bukan aplikasi production dan bukan sekadar mockup.

## Prinsip Kerja di Repo Ini

1. **Scope prototype, bukan production.** Jangan menambahkan infrastruktur berat (Docker, CI/CD kompleks, microservices, message queue). Kalau ragu, pilih solusi paling sederhana yang tetap benar secara teknis.
2. **Jangan tambah fitur di luar brief.** Kalau ada ide bagus di luar scope, sampaikan sebagai saran, jangan langsung diimplementasikan.
3. **Testnet only.** Tidak pernah deploy ke mainnet. Tidak pernah menyentuh aset bernilai nyata.
4. **Owner project ini pemula di blockchain.** Jelaskan keputusan teknis penting secara singkat dengan bahasa manusia, bukan hanya menuliskan kode.
5. **Koreksi kalau ada yang salah.** Jangan mengiyakan permintaan yang secara teknis keliru. Jelaskan kenapa salah dan tawarkan alternatif.

## Struktur Repository

```
/contracts        Smart contract Solidity
/test             Unit test untuk contract
/scripts          Script deploy dan seed data
/frontend         Aplikasi web (form input + halaman publik hasil scan)
/docs             Dokumentasi project
```

## Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Smart contract | Solidity ^0.8.20 | Versi 0.8+ sudah punya proteksi overflow bawaan |
| Dev environment | Hardhat | Remix boleh dipakai untuk eksplorasi awal, tapi kode final ada di Hardhat |
| Jaringan | Polygon Amoy testnet | Gas murah, faucet tersedia, block explorer lengkap |
| Wallet | MetaMask | |
| Frontend | React + Vite | |
| Web3 library | ethers.js v6 | |
| QR generate | qrcode | Dipakai saat membuat label kemasan |
| QR scan | html5-qrcode | Dipakai di halaman konsumen |
| Styling | Tailwind CSS | Ikuti token di docs/DESIGN-SYSTEM.md |

## Aturan Kode

### Solidity
- Selalu pakai custom error, bukan `require` dengan string panjang. Lebih hemat gas.
- Pakai `enum` dan `uint8` untuk nilai berkategori (grade, jenis pakan, status), bukan `string`. String di Solidity mahal dan boros storage.
- Timestamp pakai `uint64`, cukup sampai tahun jauh di depan dan hemat slot.
- Setiap fungsi yang mengubah state wajib emit event.
- Fungsi baca wajib `view` supaya gratis dipanggil dari frontend.
- Urutkan variabel dalam struct supaya bisa packing ke slot 32 byte.

### Frontend
- Tidak ada private key, mnemonic, atau API key di dalam kode frontend. Semua penandatanganan transaksi lewat MetaMask.
- Halaman publik hasil scan QR harus bisa dibuka tanpa wallet. Pakai RPC provider read-only.
- Semua input user divalidasi di frontend **dan** di smart contract. Validasi frontend bisa dilewati orang yang paham teknis.
- Tangani 3 state di setiap halaman: loading, error, empty.

### Git
- Jangan pernah commit `.env`, private key, mnemonic, atau file konfigurasi AI assistant.
- Jangan pernah mencantumkan AI sebagai author atau co-author di commit message.
- Commit message singkat, deskriptif, tanpa emoji.
- Cek `git status` dan `git diff` sebelum push.

## Yang TIDAK Boleh Dilakukan

- Menyimpan data pribadi (nama lengkap, NIK, alamat, nomor telepon) di on-chain. Blockchain bersifat publik dan permanen.
- Membuat sistem custody private key user di server.
- Meminta atau menuliskan seed phrase di mana pun.
- Deploy ke mainnet.
- Menambahkan dependency baru yang besar tanpa persetujuan owner.

## Dokumen Rujukan

Baca dokumen berikut sebelum mengerjakan tugas terkait:

- `docs/PRD.md` — apa yang dibangun dan kenapa
- `docs/ARCHITECTURE.md` — bagaimana komponen saling terhubung
- `docs/DATA-MODEL.md` — struktur data on-chain
- `docs/CONTRACTS.md` — spesifikasi fungsi smart contract
- `docs/SECURITY.md` — threat model dan aturan keamanan
- `docs/DESIGN-SYSTEM.md` — token visual frontend
- `docs/ROADMAP.md` — fase pengerjaan dan status saat ini
