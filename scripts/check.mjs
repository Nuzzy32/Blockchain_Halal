// Sanity check v1: ABI frontend harus sama dengan hasil compile, dan kalau alamat Amoy di
// frontend/src/chain.js sudah diisi, alamat itu harus berisi bytecode contract.
//
//   npm run export-abi && npm run check
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))

const artifact = await read('../artifacts/contracts/CattleRegistry.sol/CattleRegistry.json')
const frontendAbi = await read('../frontend/src/CattleRegistry.abi.json')
assert.deepEqual(frontendAbi, artifact.abi, 'ABI frontend beda dengan artifact — jalankan `npm run export-abi`')
console.log('✓ ABI frontend sama dengan artifact')

const { NETWORKS } = await import('../frontend/src/chain.js')
if (NETWORKS.amoy.address) {
  const { JsonRpcProvider } = await import('../frontend/node_modules/ethers/lib.esm/index.js')
  const code = await new JsonRpcProvider(NETWORKS.amoy.rpc()).getCode(NETWORKS.amoy.address)
  assert.notEqual(code, '0x', `Tidak ada contract di ${NETWORKS.amoy.address} (Amoy)`)
  console.log(`✓ Contract ada di Amoy: ${NETWORKS.amoy.address}`)
} else {
  console.log('• Alamat Amoy belum diisi di frontend/src/chain.js — pengecekan on-chain dilewati')
}
