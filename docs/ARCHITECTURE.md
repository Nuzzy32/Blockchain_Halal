# Arsitektur Sistem

## 1. Gambaran Umum

Sistem ini terdiri dari tiga lapis: smart contract di blockchain sebagai sumber kebenaran, frontend web sebagai antarmuka, dan QR code sebagai jembatan antara dunia fisik dan digital.

Tidak ada backend server. Frontend berbicara langsung ke blockchain. Keputusan ini diambil karena menambah backend justru mengurangi nilai desentralisasi sistem, dan untuk skala prototype, backend hanya menambah kerumitan tanpa manfaat berarti.

```
┌──────────────────────────────────────────────┐
│  PENGGUNA INTERNAL (peternak, RPH, distributor)│
│  Browser + MetaMask                           │
└────────────────┬─────────────────────────────┘
                 │ tanda tangan transaksi
                 ▼
┌──────────────────────────────────────────────┐
│  FRONTEND (React + ethers.js)                 │
│  - Form input per peran                       │
│  - Generator QR code                          │
│  - Halaman publik hasil scan                  │
└────────┬───────────────────────┬─────────────┘
         │ tulis (butuh wallet)  │ baca (tanpa wallet)
         ▼                       ▼
┌──────────────────────────────────────────────┐
│  SMART CONTRACT (Polygon Amoy testnet)        │
│  - AccessControl: manajemen peran             │
│  - CattleRegistry: data sapi & kemasan        │
└──────────────────────────────────────────────┘
         ▲
         │ pemindaian
┌────────┴─────────────────────────────────────┐
│  KONSUMEN                                     │
│  Kamera ponsel → QR di kemasan → halaman web  │
│  Tidak butuh wallet                           │
└──────────────────────────────────────────────┘
```

## 2. Komponen

### 2.1 Smart Contract

Satu contract utama, `CattleRegistry`, yang memuat:

- Penyimpanan data sapi dan kemasan
- Logika kontrol akses berbasis peran
- Fungsi tulis untuk tiap tahap rantai pasok
- Fungsi baca publik untuk konsumen

Alasan memakai satu contract, bukan beberapa: di skala prototype, memisah contract menambah kompleksitas komunikasi antar-contract dan biaya gas, tanpa manfaat nyata. Kalau nanti berkembang, pemisahan bisa dilakukan belakangan.

### 2.2 Frontend

Aplikasi React satu halaman dengan empat area:

| Rute | Untuk siapa | Butuh wallet |
|---|---|---|
| `/admin` | Admin | Ya |
| `/farmer` | Peternak | Ya |
| `/abattoir` | RPH | Ya |
| `/distributor` | Distributor | Ya |
| `/trace/:packageId` | Konsumen | Tidak |

Rute `/trace/:packageId` adalah yang dituju oleh QR code. Halaman ini memakai RPC provider read-only, jadi terbuka di ponsel mana pun tanpa setup apa pun.

### 2.3 QR Code

QR berisi URL, bukan data. Formatnya:

```
https://<domain-aplikasi>/trace/<packageId>
```

Alasan menyimpan URL dan bukan data langsung di QR:
- Data di QR bisa dipalsukan siapa saja yang punya generator QR
- URL memaksa pembacaan data dari blockchain, jadi yang tampil selalu data asli
- Kalau data disimpan di QR, ukuran QR jadi besar dan sulit dipindai

## 3. Alur Data

### Alur tulis

```
1. Pengguna membuka halaman sesuai perannya
2. Menghubungkan MetaMask
3. Frontend mengecek peran wallet lewat fungsi view di contract
4. Kalau peran tidak sesuai, form dikunci dengan pesan jelas
5. Pengguna mengisi form, frontend memvalidasi input
6. Frontend menyusun transaksi lewat ethers.js
7. MetaMask meminta konfirmasi tanda tangan
8. Transaksi dikirim ke jaringan
9. Frontend menunggu konfirmasi block
10. Event dari contract dibaca untuk mendapat ID yang baru dibuat
11. UI diperbarui, tautan block explorer ditampilkan
```

### Alur baca

```
1. Konsumen memindai QR dengan kamera ponsel
2. Browser membuka /trace/<packageId>
3. Frontend membuat provider read-only (tanpa wallet)
4. Memanggil getPackageTrace(packageId)
5. Contract mengembalikan data kemasan dan data sapi induknya
6. Data ditampilkan dalam bentuk linimasa
7. Tautan ke block explorer disediakan untuk verifikasi mandiri
```

## 4. Keputusan Arsitektur dan Alasannya

### Kenapa tidak ada backend server

Kalau ada backend yang jadi perantara, maka backend itu jadi titik kepercayaan baru. Konsumen harus percaya backend tidak memanipulasi data sebelum menampilkannya. Dengan frontend membaca langsung ke blockchain, rantai kepercayaannya lebih pendek.

Trade-off yang diterima: frontend jadi lebih berat dan tidak ada tempat menyimpan cache. Untuk skala prototype, ini tidak jadi masalah.

### Kenapa dua level ID (sapi dan kemasan)

Satu ekor sapi menghasilkan ratusan kemasan daging dengan potongan berbeda. Kalau QR hanya menyimpan ID sapi, maka semua kemasan dari sapi yang sama punya QR identik, dan sistemnya tidak mencerminkan realita retail.

Dengan dua level, `packageId` menunjuk ke `cattleId` induknya. Konsumen memindai kemasan spesifik, tapi tetap melihat riwayat hewan asalnya.

### Kenapa semua data on-chain, bukan IPFS

Data yang disimpan berupa angka dan teks pendek. Total per sapi di bawah 300 byte. Memakai IPFS untuk data sekecil ini menambah dependency dan titik kegagalan baru (file IPFS bisa hilang kalau tidak ada yang melakukan pinning), tanpa penghematan gas yang berarti.

Kalau nanti ada kebutuhan menyimpan foto hewan atau dokumen sertifikat, barulah IPFS relevan. Itu di luar scope prototype ini.

### Kenapa Polygon Amoy, bukan Ethereum Sepolia

Gas di Polygon jauh lebih murah dan block time lebih cepat, jadi demo terasa responsif. Keduanya EVM-compatible, kode Solidity yang sama bisa dipindah kapan saja tanpa perubahan.

### Kenapa enum, bukan string

Menyimpan string "Premium" di Solidity memakan slot storage lebih banyak daripada menyimpan angka. Grade dan jenis pakan adalah nilai berkategori dengan opsi terbatas, jadi enum lebih tepat secara teknis dan jauh lebih hemat gas. Penerjemahan ke teks yang dibaca manusia dilakukan di frontend.

## 5. Batasan Sistem

| Batasan | Penjelasan |
|---|---|
| Kejujuran data input | Blockchain tidak bisa memverifikasi kebenaran data dari dunia nyata |
| Throughput | Terbatas kecepatan block testnet, tidak cocok untuk volume produksi |
| Biaya gas | Di mainnet, setiap pencatatan berbiaya nyata dan perlu model bisnis |
| Kehilangan kunci wallet | Kalau RPH kehilangan private key, perannya harus diberikan ulang oleh admin |
| Tidak ada penghapusan data | Data salah tidak bisa dihapus, hanya bisa ditandai lewat catatan koreksi |
