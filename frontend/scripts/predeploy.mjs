// Dijalankan otomatis oleh npm sebelum `npm run deploy`. Selama alamat Amoy di src/chain.js
// kosong, deploy ditolak: kalau tidak, situs v0 yang masih berfungsi tertimpa halaman
// "contract belum di-deploy".
import { NETWORKS } from '../src/chain.js'

if (!NETWORKS.amoy.address) {
  console.error('✗ Deploy dibatalkan: NETWORKS.amoy.address di frontend/src/chain.js masih kosong.')
  console.error('  Deploy contract v1 ke Amoy dulu (docs/deployment-v1.md), lalu isi alamat dan blok deploy-nya.')
  process.exit(1)
}
console.log(`✓ Alamat Amoy terisi: ${NETWORKS.amoy.address}`)
