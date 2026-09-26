// Salin ABI CattleRegistry dari hasil compile Hardhat ke frontend, supaya frontend tidak
// pernah memakai ABI yang diketik tangan. Jalankan lewat `npm run export-abi` (compile dulu).
import { readFile, writeFile } from 'node:fs/promises'

const artifactUrl = new URL('../artifacts/contracts/CattleRegistry.sol/CattleRegistry.json', import.meta.url)
const targetUrl = new URL('../frontend/src/CattleRegistry.abi.json', import.meta.url)

const { abi } = JSON.parse(await readFile(artifactUrl, 'utf8'))
await writeFile(targetUrl, JSON.stringify(abi, null, 2) + '\n')
console.log(`ABI ditulis ke frontend/src/CattleRegistry.abi.json (${abi.length} entri)`)
