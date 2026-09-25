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

1. Pastikan wallet **Owner** (`0x088Da3284A7EE0735E2B7962CE2E236f148A51db`) punya test POL dari faucet Polygon Amoy.
2. Simpan private key Owner ke keystore terenkripsi Hardhat. Perintah ini meminta password keystore baru, lalu private key (MetaMask → Account details → Show private key):

   ```bash
   npx hardhat keystore set AMOY_PRIVATE_KEY
   ```

3. Deploy dan berikan peran ke tiga wallet aktor:

   ```bash
   npx hardhat run --build-profile production scripts/deploy.js --network amoy
   ```

4. Verifikasi kode sumber di Sourcify (tanpa API key), ganti `<ALAMAT>` dengan alamat dari langkah 3:

   ```bash
   npx hardhat verify sourcify --network amoy <ALAMAT>
   ```

5. Salin seluruh output langkah 3 dan 4 ke tabel di bawah.

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
| `ADMIN_ROLE` (deployer) | `Owner` | `0x088Da3284A7EE0735E2B7962CE2E236f148A51db` | otomatis di constructor |
| `FARMER_ROLE` | `Peternak` | `0x060b8A144800DAB4b638c3e350613BE744aF8A6c` | belum |
| `ABATTOIR_ROLE` | `RumahPotong` | `0x4cb58bd06DE17e01079441Ebcd98DCE11238b476` | belum |
| `DISTRIBUTOR_ROLE` | `Distributor` | `0x6a9f05b6D81a5061a85ef2B3998b9dB811717e11` | belum |

> SECURITY A4 menyarankan minimal dua admin. Setelah deploy, pertimbangkan `grantRole(<wallet kedua>, ADMIN_ROLE)` dari wallet Owner, supaya contract tidak mati kalau private key Owner hilang.
