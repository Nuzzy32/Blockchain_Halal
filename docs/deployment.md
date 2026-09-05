# Deployment — CattleTraceability

Diisi saat Fase 3. Frontend (Fase 4) membaca alamat + ABI dari file ini.

## Compiler

| | |
|---|---|
| Solidity | `0.8.24` |
| Optimizer | enabled, 200 runs |
| Ukuran bytecode | 3.626 bytes (batas 24.576) |

## Contract

| | |
|---|---|
| Network | Polygon Amoy testnet |
| chainId | `80002` |
| RPC (frontend) | `https://polygon-amoy-bor-rpc.publicnode.com` |
| RPC (cadangan) | `https://polygon-amoy.drpc.org` |
| Explorer | `https://amoy.polygonscan.com` |
| Blok deploy | `46758635` |
| **Alamat contract** | `0x3B32AfD1D507d4312c9Dc09563a4Ee8C6B57d34D` |
| **Tx hash deploy** | `0xa873acbcfdc6fd07d4c3ecdc1da2193a82f59e21443c39d59c0694a77ef09a21` |
| Tanggal deploy | 2026-09-05 |
| Terverifikasi (Sourcify) | sudah, otomatis lewat plugin Remix |

## Akun & Role

Enum `Role`: `0 = None`, `1 = Farmer`, `2 = Butcher`, `3 = Distributor`.

| Peran | Label MetaMask | Alamat | Nilai role | Tx hash `setRole` |
|---|---|---|---|---|
| Owner (deployer) | `Owner` | `0x088Da3284A7EE0735E2B7962CE2E236f148A51db` | — | — |
| Peternak | `Peternak` | `0x060b8A144800DAB4b638c3e350613BE744aF8A6c` | `1` | `0xdd095f531ce76b1534a947267a488dfe3088f75183d7a36f22329258517f5f87` |
| Rumah Potong | `RumahPotong` | `0x4cb58bd06DE17e01079441Ebcd98DCE11238b476` | `2` | `0x6d98716bb399a977d04a5a2fc39a4e73f0e4dd4d8ed4220caa81b0c942a66722` |
| Distributor | `Distributor` | `0x6a9f05b6D81a5061a85ef2B3998b9dB811717e11` | `3` | `0xcea9b0bb6a24d9283a2b577cff422835c3856385631470c475722d59f22f316b` |

## Bukti transaksi smoke test (sapi id 1) — SELESAI ✓

| Tahap | Dipanggil oleh | Tx hash | Timestamp on-chain |
|---|---|---|---|
| `registerCattle(1, 24, "Rumput & Konsentrat", "A")` | Peternak | `0x9f7f5ea038be1a2656c48208a201134024dc9f9ae74622cb9fd7ec5d354af9d2` | 2026-09-05 04:11:05 UTC |
| `recordSlaughter(1)` | RumahPotong | `0xf2b26fb311a0ff1f06615a9685511d80f8a83c5885d21701cc28457cd45fd453` | 2026-09-05 04:16:55 UTC |
| `recordShipping(1)` | Distributor | `0x60efc93485d1b8fa3ac3ba89b63fe39401544237b10e46140dfab24865d1b11a` | 2026-09-05 04:19:18 UTC |

Data akhir sapi id 1: umur 24 bulan, pakan "Rumput & Konsentrat", grade A.
Alur penuh register → sembelih → kirim tervalidasi berurutan di on-chain.

> **Catatan penting**: Remix punya bug tampilan (`_context7.t3.error.indexOf is not a
> function`) yang membuat transaksi yang **sebenarnya berhasil** tampil sebagai
> "Interaction failed" di MetaMask/Remix. Selalu verifikasi status transaksi lewat
> `eth_call` langsung ke RPC atau lewat block explorer, jangan percaya begitu saja
> pesan error di UI Remix untuk kasus ini.

> **Catatan RPC**: RPC resmi `https://rpc-amoy.polygon.technology` yang dipakai saat Fase 3
> sudah tidak bisa di-resolve DNS-nya per 2026-09-05. Frontend memakai publicnode sebagai
> gantinya (chainId tetap `0x13882`, contract & data tidak berubah). Kalau MetaMask masih
> memakai RPC lama dan gagal, ganti RPC jaringan Amoy di MetaMask ke alamat publicnode di atas.

## Langkah deploy (ringkas)

1. Tambahkan network Amoy di MetaMask pakai nilai di tabel Contract di atas (symbol: `POL`).
2. Siapkan 4 akun berlabel, isi test POL dari faucet Polygon ke **keempat**-nya —
   tiga akun aktor juga butuh gas untuk menulis.
3. Remix → paste `contracts/CattleTraceability.sol` → compile `0.8.24`, optimizer on / 200 runs.
4. Tab **Solidity Unit Testing** → jalankan `contracts/CattleTraceability_test.sol`.
   Harus 11 fungsi hijau / 27 assertion. **Jangan deploy sebelum ini hijau.**
5. Environment **Injected Provider – MetaMask**, akun aktif `Owner` → Deploy.
6. Dari `Owner`, panggil `setRole` 3× sesuai tabel Akun & Role.
7. Verify contract via plugin Etherscan/Sourcify di Remix.
8. Jalankan smoke test 4 langkah di tabel di atas, screenshot ke `docs/screenshots/`.
9. Isi semua `0x...` di file ini.

## ABI

Hasil compile `0.8.24` + optimizer 200 runs. Identik dengan artifact Remix pada setting yang sama.

```json
[
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "by",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "at",
        "type": "uint256"
      }
    ],
    "name": "CattleRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "who",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum CattleTraceability.Role",
        "name": "role",
        "type": "uint8"
      }
    ],
    "name": "RoleAssigned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "by",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "at",
        "type": "uint256"
      }
    ],
    "name": "ShippingRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "by",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "at",
        "type": "uint256"
      }
    ],
    "name": "SlaughterRecorded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getRecord",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "age",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "feedType",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "grade",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "registeredDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "slaughterDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "shippedDate",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "farmer",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "butcher",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "distributor",
            "type": "address"
          }
        ],
        "internalType": "struct CattleTraceability.CattleRecord",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "recordShipping",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "recordSlaughter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "age",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "feedType",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "grade",
        "type": "string"
      }
    ],
    "name": "registerCattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "roles",
    "outputs": [
      {
        "internalType": "enum CattleTraceability.Role",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "who",
        "type": "address"
      },
      {
        "internalType": "enum CattleTraceability.Role",
        "name": "r",
        "type": "uint8"
      }
    ],
    "name": "setRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]```

---

## Frontend (Fase 4)

Kode di `frontend/`. React + Vite + Tailwind v4, ethers v6, `qrcode.react`.

Sistem desain (palet, tipografi, spasi, motion) didokumentasikan di
`design-system/traceability-sapi/MASTER.md`, termasuk lima penyimpangan terverifikasi
dari rekomendasi generator beserta angka kontras yang mendasarinya. **Baca file itu
sebelum mengubah warna** — pasangan warna di `frontend/src/index.css` sudah diukur
memenuhi 4.5:1 untuk teks dan 3:1 untuk batas kontrol.

| | |
|---|---|
| Situs live | <https://nuzzy32.github.io/Blockchain_Halal/> |
| Repo | <https://github.com/Nuzzy32/Blockchain_Halal> |
| Panel aktor | `/` — butuh MetaMask, form menyesuaikan role wallet |
| Halaman konsumen | `/?id=<nomor sapi>` — read-only, tanpa wallet |

Contoh halaman konsumen untuk sapi id 1:
<https://nuzzy32.github.io/Blockchain_Halal/?id=1>

Alamat contract dan ABI ada di `frontend/src/contract.js` (ABI ditulis dalam bentuk
human-readable ethers, isinya setara dengan ABI JSON di atas).

### Menjalankan

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173/Blockchain_Halal/
```

### Sanity check

Memverifikasi bahwa alamat + ABI di `frontend/src/contract.js` benar-benar cocok dengan
contract yang hidup di Amoy. Jalankan setiap kali file itu diubah:

```bash
node scripts/check.mjs
```

### Deploy ke GitHub Pages

`base` di `frontend/vite.config.js` harus sama dengan nama repo GitHub — nilai itu juga
dipakai untuk menyusun URL di dalam QR code.

```bash
cd frontend && npm run deploy
```
