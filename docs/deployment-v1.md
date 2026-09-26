# Deployment v1.0 — CattleRegistry

Contract purwarupa v0 (`CattleTraceability`) tetap hidup di alamat lamanya dan masih dipakai situs GitHub Pages; lihat `docs/deployment.md`. Dokumen ini khusus contract v1.0.

## Compiler

| | |
|---|---|
| Solidity | `0.8.28` |
| Optimizer | enabled, 200 runs |
| Build profile | `production` |

## Cara deploy (dijalankan owner)

Private key hanya pernah diketik owner sendiri. Jangan pernah menempelkannya ke chat, file, atau commit.

1. Pastikan wallet **Owner** (`0x088Da3284A7Ee0735e2b7962ce2e236F148A51db`) punya test POL dari faucet Polygon Amoy.
2. Simpan private key Owner ke keystore terenkripsi Hardhat. Perintah ini meminta password keystore baru, lalu private key (MetaMask → Account details → Show private key):

   ```bash
   npx hardhat keystore set AMOY_PRIVATE_KEY
   ```

3. Deploy dan berikan peran ke tiga wallet aktor:

   ```bash
   npx hardhat run --build-profile production scripts/deploy.js --network amoy
   ```

   Kalau perintah ini berhenti dengan error **setelah** baris `Contract :` tercetak, **jangan jalankan ulang** — itu akan membuat contract kedua. Simpan output-nya dan kirim ke Claude; peran yang belum terpasang bisa diberikan manual lewat `grantRole`.

4. Verifikasi kode sumber di Sourcify (tanpa API key), ganti `<ALAMAT>` dengan alamat dari langkah 3:

   ```bash
   npx hardhat verify sourcify --network amoy <ALAMAT>
   ```

   Perintah ini juga meminta password keystore, karena memakai jaringan `amoy`.

5. Salin seluruh output langkah 3 dan 4 ke tabel di bawah.

## Pengembangan lokal (tanpa POL)

Frontend dikembangkan melawan node Hardhat di laptop. Datanya simulasi dan hilang setiap node dimatikan.

1. Jalankan node (biarkan terminal ini terbuka):

   ```bash
   npx hardhat node
   ```

   Tambahkan `--hostname 0.0.0.0` kalau halaman ingin dibuka dari ponsel se-Wi-Fi.

2. Di terminal lain, deploy dan isi contoh data:

   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   npx hardhat run scripts/seed.js --network localhost
   ```

3. Jalankan frontend: `cd frontend && npm run dev -- --port 5175`, buka `http://localhost:5175/Blockchain_Halal/`.

4. MetaMask: tambah jaringan **Hardhat Local** (RPC `http://127.0.0.1:8545`, chainId `31337`, simbol `ETH`), lalu import akun tes Hardhat. Private key-nya tercetak di terminal langkah 1 — publik dan hanya berlaku di node lokal, jangan pernah dipakai di jaringan lain.

   | Akun Hardhat | Peran | Alamat |
   |---|---|---|
   | #0 | Admin (deployer) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
   | #1 | Peternak | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
   | #2 | RPH | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
   | #3 | Distributor | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |

5. Setiap node dijalankan ulang: ulangi langkah 2, lalu di MetaMask **Settings → Advanced → Clear activity tab data** untuk tiap akun, supaya nonce tidak bentrok.

## Setelah deploy ke Amoy

1. Isi `address` dan `deployBlock` pada `NETWORKS.amoy` di `frontend/src/chain.js` dari tabel di bawah.
2. `npm run export-abi && npm run check` — harus mencetak `✓ ABI…` dan `✓ Contract ada di Amoy…`.
3. `cd frontend && npm run deploy` — pengaman `predeploy` menolak jalan selama alamat Amoy masih kosong.

## Contract

| | |
|---|---|
| Network | Polygon Amoy testnet |
| chainId | `80002` |
| RPC | `https://polygon-amoy-bor-rpc.publicnode.com` |
| Explorer | `https://amoy.polygonscan.com` |
| Alamat contract | belum di-deploy |
| Tx hash deploy | belum di-deploy |
| Blok deploy | belum di-deploy |
| Tanggal deploy | belum di-deploy |
| Terverifikasi (Sourcify) | belum |

## Peran

| Peran | Label MetaMask | Alamat | Tx hash `grantRole` |
|---|---|---|---|
| `ADMIN_ROLE` (deployer) | `Owner` | `0x088Da3284A7Ee0735e2b7962ce2e236F148A51db` | otomatis di constructor |
| `FARMER_ROLE` | `Peternak` | `0x060b8A144800DAB4b638c3e350613BE744aF8A6c` | belum |
| `ABATTOIR_ROLE` | `RumahPotong` | `0x4cb58bd06DE17e01079441Ebcd98DCE11238b476` | belum |
| `DISTRIBUTOR_ROLE` | `Distributor` | `0x6a9f05b6D81a5061a85ef2B3998b9dB811717e11` | belum |

> SECURITY A4 menyarankan minimal dua admin. Setelah deploy, pertimbangkan `grantRole(<wallet kedua>, ADMIN_ROLE)` dari wallet Owner, supaya contract tidak mati kalau private key Owner hilang.
