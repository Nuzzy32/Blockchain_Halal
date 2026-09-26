// Dijalankan otomatis oleh npm sebelum `npm run deploy`. Selama alamat Amoy di src/chain.js
// kosong/belum benar, deploy ditolak: kalau tidak, situs v0 yang masih berfungsi tertimpa
// halaman "contract belum di-deploy".
import { isAddress, JsonRpcProvider } from 'ethers'
import { NETWORKS } from '../src/chain.js'

const { address, deployBlock, rpc } = NETWORKS.amoy

if (!isAddress(address)) {
  console.error('✗ Deploy dibatalkan: NETWORKS.amoy.address di frontend/src/chain.js masih kosong.')
  console.error('  Deploy contract v1 ke Amoy dulu (docs/deployment-v1.md), lalu isi alamat dan blok deploy-nya.')
  process.exit(1)
}
if (!(deployBlock > 0)) {
  console.error('✗ Deploy dibatalkan: NETWORKS.amoy.deployBlock di frontend/src/chain.js masih 0.')
  console.error('  Isi nomor blok saat contract di-deploy (docs/deployment-v1.md), bukan biarkan 0.')
  process.exit(1)
}
const code = await new JsonRpcProvider(rpc()).getCode(address)
if (code === '0x') {
  console.error(`✗ Deploy dibatalkan: tidak ada contract di alamat ${address} pada ${rpc()}.`)
  console.error('  Periksa NETWORKS.amoy.address — alamat ini belum punya kode contract di jaringan Amoy.')
  process.exit(1)
}
console.log(`✓ Alamat Amoy terisi: ${address}`)
