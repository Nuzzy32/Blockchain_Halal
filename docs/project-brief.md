# Project Brief: Sistem Traceability Sapi Berbasis Blockchain

## Konteks
Tugas mata kuliah Inovasi Sistem Informasi Teknologi. Tujuannya bikin prototype sistem digitalisasi rantai pasok daging sapi (dari peternakan sampai supermarket) yang tercatat di blockchain, bisa dicek konsumen lewat QR code di kemasan.

Status saat ini: baru tahap perencanaan/desain, belum mulai coding.

## Aktor dalam Sistem
- **Peternak**: input data awal sapi
- **Rumah Potong (Butcher House)**: catat tanggal & proses sembelih
- **Distributor/Supermarket**: catat tanggal kirim
- **Konsumen**: scan QR buat lihat histori sapi (read-only, gak butuh wallet)

## Data yang Dicatat
- ID unik sapi
- Umur sapi
- Jenis pakan (feed type)
- Grade sapi
- Tanggal disembelih
- Tanggal dikirim dari rumah potong

## Tech Stack yang Disepakati
- **Smart contract**: Solidity
- **Jaringan**: testnet (Polygon Amoy atau Sepolia), gratis dan cukup buat demo tugas
- **Dev environment**: mulai dari Remix IDE untuk prototyping cepat
- **Wallet**: MetaMask
- **Frontend**: React atau HTML/JS sederhana + library ethers.js buat komunikasi ke smart contract
- **QR Code**: library qrcode.js, isinya link ke halaman tracking berdasarkan ID sapi

Catatan: semua data (angka & teks pendek) aman ditaruh langsung di smart contract, gak perlu IPFS atau storage eksternal untuk skala prototype ini.

## Struktur Data Smart Contract (draft awal)

```solidity
struct CattleRecord {
    uint id;
    uint age;
    string feedType;
    string grade;
    uint slaughterDate;
    uint shippedDate;
    address recordedBy;
}

mapping(uint => CattleRecord) public records;
```

Fungsi utama yang dibutuhkan:
- `registerCattle()` — peternak input data awal sapi
- `recordSlaughter()` — rumah potong isi tanggal sembelih
- `recordShipping()` — catat tanggal kirim
- `getRecord()` — fungsi baca (view, gratis, gak butuh wallet), dipanggil saat konsumen scan QR

## Pertimbangan Keamanan
Tambahkan role-based access control pakai modifier, jadi cuma alamat wallet tertentu yang boleh update tahap tertentu. Contoh: cuma wallet milik rumah potong yang boleh manggil `recordSlaughter()`.

## Alur Sistem End-to-End
1. Peternak input data sapi lewat form → transaksi tercatat di blockchain
2. Sapi disembelih → rumah potong update tanggal sembelih
3. Daging dikirim ke distributor/supermarket → dicatat tanggal kirimnya
4. Sistem generate QR code otomatis berisi ID unik sapi, ditaruh di label kemasan
5. Konsumen scan QR → halaman web manggil `getRecord(id)` → histori sapi muncul

## Roadmap Pembangunan (estimasi 5-6 minggu)

| Fase | Durasi | Fokus | Checkpoint |
|---|---|---|---|
| 0. Riset & Scope | 2-3 hari | Finalisasi aktor, data, alur sistem | Dokumen 1 halaman aktor + data + alur |
| 1. Belajar Dasar | 4-5 hari | Konsep blockchain, latihan Solidity | Bisa deploy contract sederhana ke testnet |
| 2. Desain Smart Contract | 2-3 hari | Rancang struct, fungsi, role-based access | Desain fix sebelum coding |
| 3. Build Smart Contract | 4-5 hari | Tulis & deploy contract, test manual | Semua fungsi berjalan sesuai ekspektasi |
| 4. Build Frontend | 5-7 hari | Form input, integrasi ethers.js, generate QR, halaman publik | Data dari frontend masuk ke blockchain |
| 5. Integrasi & Testing | 3-4 hari | Test alur penuh, cek edge case | Demo end-to-end tanpa error |
| 6. Dokumentasi & Laporan | 3-4 hari | Screenshot bukti transaksi, tulis laporan | Laporan & slide siap |
| 7. Demo & Presentasi | 1 hari | Latihan demo, siapin jawaban dosen | Siap presentasi |

## Yang Dibutuhkan dari Sesi Ini
Mulai kerjakan dari Fase 2 (desain final struct & fungsi smart contract) atau Fase 3 (tulis kode smart contract-nya di Solidity), sesuai progress terakhir user.
