# Fase 4 v1.0 — Frontend HalalChain Trace

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frontend React v1 yang menjalankan seluruh alur registrasi → sembelih → kemasan + QR → kirim → halaman konsumen melawan contract `CattleRegistry`, dikembangkan di node Hardhat lokal dan siap dipindah ke Polygon Amoy dengan mengisi satu alamat.

**Architecture:** `frontend/` v0 diganti di tempat. Halaman dipilih dari query param (`?trace=`, `?scan=`, tanpa param = panel internal). Setelan jaringan hanya di `src/chain.js` (dipilih `VITE_NETWORK`). Logika murni (label, validasi, terjemahan error) ada di modul tanpa React yang diuji `node --test`; komponen React tipis di atasnya. ABI diekspor dari artifact Hardhat, tidak diketik tangan.

**Tech Stack:** React 18, Vite 6, Tailwind 4, ethers 6, qrcode.react 4 (sudah terpasang), html5-qrcode 2.3 (baru), Node `--test`. Contract: Hardhat 3.18.

**Spec:** `docs/spec-v1-fase4-frontend.md` (wajib dibaca bersama plan ini). Pendukung: `docs/CONTRACTS.md`, `docs/DATA-MODEL.md` §5, `docs/SECURITY.md` A9/A10/A12, `docs/PRD.md` §4/§7.

## Global Constraints

- Tidak ada private key, mnemonic, atau API key di kode frontend. Semua tanda tangan lewat MetaMask (`docs/CLAUDE.md`).
- Halaman konsumen dan scanner harus jalan tanpa wallet, lewat RPC read-only.
- Semua input divalidasi di frontend **dan** contract; batas angka persis sama dengan DATA-MODEL §5: umur 6–120 bulan, berat hidup 100–1500 kg, berat kemasan 100–50000 g, teks `bytes32` maks 31 byte, batch maks `MAX_BATCH` (50).
- Setiap halaman menangani loading, error, dan kosong/tidak ditemukan.
- Tidak ada `dangerouslySetInnerHTML`; `bytes32` di-decode, enum lewat tabel label tetap (SECURITY A10).
- Ringkasan transaksi tampil sebelum MetaMask diminta tanda tangan (SECURITY A12).
- Scanner tidak pernah membuka URL di luar situs ini (SECURITY A9).
- Mobile-first, teks min 16 px, target sentuh min 44 px, kontras min 4.5:1 — pakai token dan kelas yang sudah ada di `frontend/src/index.css` (`card`, `field`, `btn`, `btn-primary`, `btn-ghost`, `tap`, `eyebrow`, `animate-rise`, `stagger`, warna `primary`, `ink`, `muted`, `divider`, `border`, `danger`, `warn-*`). Jangan ubah nilai token.
- Bahasa UI: Indonesia.
- Dependency baru hanya `html5-qrcode`.
- Commit message singkat, bahasa Indonesia, tanpa emoji, **tanpa baris Co-Authored-By AI**.
- Tidak pernah menjalankan apa pun dengan `--network amoy`, tidak menyentuh keystore Hardhat, tidak menjalankan `npm run deploy` di `frontend/` (itu menimpa situs v0 yang live).
- `contracts/` dan `test/` (root) tidak diubah.

## Struktur File

| File | Aksi | Tanggung jawab |
|---|---|---|
| `scripts/export-abi.js` | Buat (T1) | Salin ABI artifact → frontend |
| `scripts/deploy.js` | Ubah (T1) | Peran ke akun Hardhat #1-#3 di jaringan lokal |
| `scripts/seed.js` | Buat (T1) | Contoh data di `localhost` |
| `scripts/check.mjs` | Ganti (T1, T3) | ABI frontend = artifact; alamat Amoy berisi bytecode |
| `scripts/check-stats.mjs` | Hapus (T1) | — |
| `package.json` (root) | Ubah (T1) | skrip `export-abi`, `check` |
| `frontend/src/CattleRegistry.abi.json` | Buat (T1) | ABI hasil ekspor |
| `frontend/src/format.js` | Buat (T2) | Label enum/peran, format ID/tanggal, bytes32, rentang blok |
| `frontend/src/validation.js` | Buat (T2) | Validator, parsing ID, parsing URL pindai, resolusi timestamp |
| `frontend/src/errors.js` | Buat (T2) | Nama custom error → kalimat Indonesia |
| `frontend/src/*.test.js` | Buat (T2) | Uji murni |
| `frontend/src/chain.js` | Buat (T3) | Setelan jaringan |
| `frontend/src/registry.js` | Buat (T3, ubah T7) | Contract baca/tulis, peran, event, terjemahan error ethers |
| `frontend/src/hooks.js` | Buat (T3, ubah T4, T6) | `useWallet`, `useTx`, `useCattle`, `usePackages` |
| `frontend/src/components.jsx` | Buat (T3, ubah T4, T5) | `Banner`, `Section`, `Field`, `fieldProps`, `Review`, `TxStatus`, `CattleSummary`, `QrLabel` |
| `frontend/src/App.jsx` | Ganti (T3, ubah T7, T8) | Pemilih halaman |
| `frontend/src/InternalPanel.jsx` | Buat (T3, ubah T4-T6) | Bilah wallet + susunan bagian per peran |
| `frontend/src/sections/*.jsx` | Buat (T3-T6) | Satu file per form peran |
| `frontend/src/TracePage.jsx` | Buat (T7) | Halaman konsumen |
| `frontend/src/ScanPage.jsx` | Buat (T8) | Scanner |
| `frontend/.env.development`, `.env.production` | Buat (T3) | `VITE_NETWORK` |
| `frontend/scripts/predeploy.mjs` | Buat (T3) | Tolak deploy selama alamat Amoy kosong |
| `frontend/src/ActorPanel.jsx`, `TrackPage.jsx`, `DashboardPage.jsx`, `stats.js`, `contract.js` | Hapus (T3) | — |
| `docs/deployment-v1.md`, `docs/testing.md`, `docs/README.md`, `docs/ROADMAP.md` | Ubah (T9) | Cara pakai lokal, matriks uji v1, status |

---

### Task 1: Ekspor ABI, deploy lokal, seed data

**Files:**
- Create: `scripts/export-abi.js`, `scripts/seed.js`, `frontend/src/CattleRegistry.abi.json` (dihasilkan)
- Modify: `scripts/deploy.js`, `package.json` (root)
- Replace: `scripts/check.mjs`
- Delete: `scripts/check-stats.mjs`

**Interfaces:**
- Produces: `frontend/src/CattleRegistry.abi.json` (array ABI JSON, termasuk semua custom error dan event). Di node lokal yang baru dijalankan, `node scripts/deploy.js` menempatkan contract di `0x5FbDB2315678afecb367f032d93F642f64180aa3` dan memberi FARMER/ABATTOIR/DISTRIBUTOR ke akun Hardhat #1/#2/#3. `seed.js` menghasilkan sapi 1-4 dan kemasan 1-5 (lihat Step 5).

- [ ] **Step 1: Buat `scripts/export-abi.js`**

```js
// Salin ABI CattleRegistry dari hasil compile Hardhat ke frontend, supaya frontend tidak
// pernah memakai ABI yang diketik tangan. Jalankan lewat `npm run export-abi` (compile dulu).
import { readFile, writeFile } from 'node:fs/promises'

const artifactUrl = new URL('../artifacts/contracts/CattleRegistry.sol/CattleRegistry.json', import.meta.url)
const targetUrl = new URL('../frontend/src/CattleRegistry.abi.json', import.meta.url)

const { abi } = JSON.parse(await readFile(artifactUrl, 'utf8'))
await writeFile(targetUrl, JSON.stringify(abi, null, 2) + '\n')
console.log(`ABI ditulis ke frontend/src/CattleRegistry.abi.json (${abi.length} entri)`)
```

- [ ] **Step 2: Tambah skrip di `package.json` root**

Ubah blok `scripts` menjadi:

```json
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test mocha",
    "export-abi": "hardhat build --build-profile production && node scripts/export-abi.js",
    "check": "node scripts/check.mjs"
  }
```

Run: `npm run export-abi`
Expected: baris terakhir `ABI ditulis ke frontend/src/CattleRegistry.abi.json (N entri)` dengan N > 40; file ada dan berisi entri `"name": "WrongAbattoir"` dan `"name": "PackageCreated"`.

- [ ] **Step 3: Ubah `scripts/deploy.js` supaya jaringan lokal memakai akun Hardhat**

Ganti blok `const ACTORS = [...]` dan baris `const { ethers, networkName } = await network.create()` beserta `const [deployer] = await ethers.getSigners()` dengan:

```js
// Wallet aktor demo yang sama dengan purwarupa v0 (docs/deployment.md). Alamat publik, bukan rahasia.
const V0_ACTORS = [
  ['FARMER_ROLE', '0x060b8A144800DAB4b638c3e350613BE744aF8A6c'], // Peternak
  ['ABATTOIR_ROLE', '0x4cb58bd06DE17e01079441Ebcd98DCE11238b476'], // RumahPotong
  ['DISTRIBUTOR_ROLE', '0x6a9f05b6D81a5061a85ef2B3998b9dB811717e11'], // Distributor
]

// Jaringan simulasi (node lokal atau in-process) memakai akun tes Hardhat #1-#3, supaya
// frontend bisa dicoba dengan akun yang di-import ke MetaMask. Kunci akun ini publik.
const LOCAL_NETWORKS = ['localhost', 'default']

const { ethers, networkName } = await network.create()
const signers = await ethers.getSigners()
const deployer = signers[0]
const ACTORS = LOCAL_NETWORKS.includes(networkName)
  ? [
      ['FARMER_ROLE', signers[1].address],
      ['ABATTOIR_ROLE', signers[2].address],
      ['DISTRIBUTOR_ROLE', signers[3].address],
    ]
  : V0_ACTORS
```

Sisa skrip (deploy, cetak, loop `grantRole`) tidak berubah. Perbarui komentar pemakaian di baris atas file menjadi:

```js
// Deploy CattleRegistry lalu berikan peran ke wallet aktor demo.
//
//   Simulasi in-process: npx hardhat run scripts/deploy.js
//   Node lokal:          npx hardhat run scripts/deploy.js --network localhost
//   Polygon Amoy:        npx hardhat run --build-profile production scripts/deploy.js --network amoy
```

- [ ] **Step 4: Buat `scripts/seed.js`**

```js
// Isi contoh data di node Hardhat lokal, setelah scripts/deploy.js --network localhost.
//
//   npx hardhat run scripts/seed.js --network localhost
//
// Hanya untuk localhost: skrip ini menandatangani sebagai peternak, RPH, dan distributor
// sekaligus, dan itu hanya mungkin dengan akun tes Hardhat yang kuncinya publik.
import { network } from 'hardhat'

const ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' // deploy pertama akun #0 di node baru

const { ethers, networkName } = await network.create()
if (networkName !== 'localhost') {
  throw new Error(`seed.js hanya untuk --network localhost (sekarang: ${networkName})`)
}

const [, farmer, abattoir, distributor] = await ethers.getSigners()
const registry = await ethers.getContractAt('CattleRegistry', ADDRESS)
const b32 = ethers.encodeBytes32String
const latest = async () => (await ethers.provider.getBlock('latest')).timestamp
const send = async (txPromise) => (await txPromise).wait()

// Enum sesuai contracts/CattleRegistry.sol
const Grade = { Standard: 1, Choice: 2, Prime: 3 }
const Feed = { GrassFed: 1, GrainFed: 2, Mixed: 3, Organic: 4 }
const Method = { NoStunning: 1, WithStunning: 2 }
const Cut = { Sirloin: 1, Tenderloin: 2, Ribeye: 3, Brisket: 4, Shank: 5, Ground: 6 }

async function register(age, weightKg, grade, feed, farmId) {
  await send(registry.connect(farmer).registerCattle(age, weightKg, grade, feed, b32(farmId)))
}
async function slaughter(cattleId, method) {
  await send(registry.connect(abattoir).recordSlaughter(cattleId, await latest(), b32('JULEHA-0042'), b32('ID00410000123'), method))
}

// Sapi 1: sampai dikirim. Sapi 2: dikemas, belum dikirim. Sapi 3: disembelih. Sapi 4: terdaftar.
await register(30, 480, Grade.Prime, Feed.GrassFed, 'FARM-JTG-001')
await register(26, 420, Grade.Choice, Feed.Mixed, 'FARM-JTG-001')
await register(24, 390, Grade.Standard, Feed.GrainFed, 'FARM-BYL-007')
await register(34, 510, Grade.Prime, Feed.Organic, 'FARM-BYL-007')

await slaughter(1, Method.NoStunning)
await slaughter(2, Method.WithStunning)
await slaughter(3, Method.NoStunning)

await send(registry.connect(abattoir).createPackages(1, [Cut.Sirloin, Cut.Tenderloin, Cut.Brisket], [500, 400, 1000])) // kemasan 1-3
await send(registry.connect(abattoir).createPackages(2, [Cut.Ribeye, Cut.Ground], [450, 250])) // kemasan 4-5

await send(registry.connect(distributor).recordShipping([1, 2], await latest()))

console.log(`Sapi: ${await registry.totalCattle()} · Kemasan: ${await registry.totalPackages()}`)
console.log('Coba halaman konsumen: http://localhost:5175/Blockchain_Halal/?trace=1 (dikirim), ?trace=4 (belum dikirim)')
```

- [ ] **Step 5: Uji deploy + seed di node lokal**

```bash
npx hardhat node > "$TMPDIR/hardhat-node.log" 2>&1 &
sleep 5
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/seed.js --network localhost
```

Expected: deploy mencetak `Contract : 0x5FbDB2315678afecb367f032d93F642f64180aa3` dan tiga baris peran ke `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`, `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`, `0x90F79bf6EB2c4f870365E785982E1f101E93b906`. Seed mencetak `Sapi: 4 · Kemasan: 5`. Lalu hentikan node:

```bash
pkill -f "hardhat node"
```

Jalankan juga `npx hardhat run scripts/seed.js` (tanpa `--network`). Expected: error `seed.js hanya untuk --network localhost (sekarang: default)`.

- [ ] **Step 6: Ganti `scripts/check.mjs`**

```js
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
```

(Task 3 menambahkan pengecekan alamat Amoy setelah `chain.js` ada.)

Run: `npm run check`
Expected: `✓ ABI frontend sama dengan artifact`.

- [ ] **Step 7: Hapus skrip v0 dan commit**

```bash
git rm scripts/check-stats.mjs
git add scripts/export-abi.js scripts/seed.js scripts/deploy.js scripts/check.mjs package.json frontend/src/CattleRegistry.abi.json
git commit -m "chore: ekspor ABI, deploy lokal ke akun Hardhat, dan seed data contoh"
```

---

### Task 2: Modul murni — format, validasi, terjemahan error

**Files:**
- Create: `frontend/src/format.js`, `frontend/src/validation.js`, `frontend/src/errors.js`, `frontend/src/format.test.js`, `frontend/src/validation.test.js`, `frontend/src/errors.test.js`
- Modify: `frontend/package.json` (skrip `test`)

**Interfaces:**
- Produces (`format.js`):
  - `ROLE_KEYS = ['ADMIN','FARMER','ABATTOIR','DISTRIBUTOR']`, `ROLE: Record<key, bytes32 hex>`, `ROLE_LABEL: Record<key, string>`, `roleKeyOf(hash) → key | null`
  - `GRADE`, `FEED_TYPE`, `SLAUGHTER_METHOD`, `CUT_TYPE`, `CATTLE_STATUS`, `PACKAGE_STATUS` (objek `{ angka: label }`), `options(table) → [{ value: string, label }]`, `label(table, value) → string`
  - `cattleLabel(id) → 'HCT-C-000042'`, `packageLabel(id) → 'HCT-P-000005'`
  - `textToBytes32(text) → hex`, `bytes32ToText(hex) → string`, `byteLength(text) → number`
  - `formatDate(seconds) → string | null`, `freshnessText(seconds, nowMs) → string`, `shortAddress(addr) → string`
  - `toDatetimeLocal(date) → 'YYYY-MM-DDTHH:mm'`, `blockRanges(from, to, size) → [[from, to], ...]`
- Produces (`validation.js`): `validateAge`, `validateLiveWeight`, `validatePackageGrams`, `validateChoice(value, label)`, `validateShortText(value, label)`, `validateId(value, label)`, `validateAddress(value)` — semua `(string) → string | null`; `parseId(raw) → string | null` (bilangan bulat positif uint64 dinormalisasi); `parseIdList(text, max) → { ids: string[] } | { error: string }`; `resolveTimestamp(value, { minSeconds, nowSeconds, label }) → { seconds: bigint } | { error: string }`; `scanTarget(text, origin, basePath) → string | null`
- Produces (`errors.js`): `describeRevert(name, args) → string`

- [ ] **Step 1: Tambah skrip test di `frontend/package.json`**

Di blok `scripts`, tambahkan baris `"test": "node --test src/*.test.js",` tepat sebelum `"check"`, dan hapus baris `"check:stats": ...` (skripnya sudah dihapus di Task 1).

- [ ] **Step 2: Tulis `frontend/src/format.test.js`**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CUT_TYPE, GRADE, ROLE, blockRanges, bytes32ToText, byteLength, cattleLabel, formatDate,
  freshnessText, label, options, packageLabel, roleKeyOf, shortAddress, textToBytes32, toDatetimeLocal,
} from './format.js'

test('label ID diberi awalan dan nol di depan', () => {
  assert.equal(cattleLabel(42n), 'HCT-C-000042')
  assert.equal(packageLabel('5'), 'HCT-P-000005')
  assert.equal(packageLabel(1234567), 'HCT-P-1234567')
})

test('hash peran dipetakan balik ke kuncinya', () => {
  assert.equal(roleKeyOf(ROLE.ABATTOIR), 'ABATTOIR')
  assert.equal(roleKeyOf(ROLE.ABATTOIR.toUpperCase().replace('0X', '0x')), 'ABATTOIR')
  assert.equal(roleKeyOf('0x' + '11'.repeat(32)), null)
})

test('tabel enum menjadi opsi select dan label, nilai tak dikenal tidak dirender mentah', () => {
  assert.deepEqual(options(GRADE)[0], { value: '1', label: GRADE[1] })
  assert.equal(options(GRADE).length, 3)
  assert.equal(label(CUT_TYPE, 4n), CUT_TYPE[4])
  assert.equal(label(CUT_TYPE, 99), 'Tidak dikenal')
})

test('teks bolak-balik ke bytes32; bytes32 rusak tampil sebagai hex', () => {
  const hex = textToBytes32('FARM-JTG-001')
  assert.equal(hex.length, 66)
  assert.equal(bytes32ToText(hex), 'FARM-JTG-001')
  const notUtf8 = '0x' + 'ff'.repeat(32)
  assert.equal(bytes32ToText(notUtf8), notUtf8)
  assert.equal(byteLength('é'), 2)
})

test('tanggal 0 berarti tahap belum terjadi', () => {
  assert.equal(formatDate(0n), null)
  assert.match(formatDate(1758800000n), /2025/)
})

test('kesegaran dihitung dalam hari', () => {
  const now = 1_000_000 * 1000
  assert.equal(freshnessText(1_000_000n, now), 'hari ini')
  assert.equal(freshnessText(1_000_000n - 86_400n, now), 'kemarin')
  assert.equal(freshnessText(1_000_000n - 3n * 86_400n, now), '3 hari lalu')
})

test('alamat dipendekkan', () => {
  assert.equal(shortAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'), '0x7099…79C8')
  assert.equal(shortAddress(null), '')
})

test('datetime-local memakai waktu lokal tanpa detik', () => {
  assert.equal(toDatetimeLocal(new Date(2026, 8, 5, 7, 3, 59)), '2026-09-05T07:03')
})

test('rentang blok dipecah per ukuran', () => {
  assert.deepEqual(blockRanges(0, 25, 10), [[0, 9], [10, 19], [20, 25]])
  assert.deepEqual(blockRanges(5, 5, 10), [[5, 5]])
  assert.deepEqual(blockRanges(10, 3, 10), [])
})
```

- [ ] **Step 3: Tulis `frontend/src/validation.test.js`**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseId, parseIdList, resolveTimestamp, scanTarget, validateAddress, validateAge, validateChoice,
  validateId, validateLiveWeight, validatePackageGrams, validateShortText,
} from './validation.js'

test('umur 6-120 bulan', () => {
  assert.equal(validateAge('6'), null)
  assert.equal(validateAge('120'), null)
  assert.match(validateAge('5'), /6.*120/)
  assert.match(validateAge('121'), /6.*120/)
  assert.match(validateAge(''), /wajib/)
  assert.match(validateAge('12.5'), /bulat/)
})

test('berat hidup 100-1500 kg dan berat kemasan 100-50000 g', () => {
  assert.equal(validateLiveWeight('100'), null)
  assert.equal(validateLiveWeight('1500'), null)
  assert.match(validateLiveWeight('99'), /100/)
  assert.equal(validatePackageGrams('50000'), null)
  assert.match(validatePackageGrams('50001'), /50\.000/)
})

test('pilihan enum wajib dipilih', () => {
  assert.equal(validateChoice('2', 'Grade'), null)
  assert.equal(validateChoice('', 'Grade'), 'Grade wajib dipilih.')
})

test('teks bytes32 wajib diisi dan maksimal 31 byte', () => {
  assert.equal(validateShortText('ID00410000123', 'Nomor sertifikat'), null)
  assert.equal(validateShortText('a'.repeat(31), 'X'), null)
  assert.match(validateShortText('a'.repeat(32), 'X'), /31/)
  assert.match(validateShortText('   ', 'X'), /wajib/)
})

test('ID positif, dengan atau tanpa awalan label', () => {
  assert.equal(parseId('5'), '5')
  assert.equal(parseId(' 007 '), '7')
  assert.equal(parseId('HCT-P-000005'), '5')
  assert.equal(parseId('0'), null)
  assert.equal(parseId('-1'), null)
  assert.equal(parseId('abc'), null)
  assert.equal(parseId('18446744073709551616'), null) // > uint64
  assert.equal(parseId(null), null)
  assert.equal(validateId('3', 'ID sapi'), null)
  assert.match(validateId('x', 'ID sapi'), /ID sapi/)
})

test('alamat wallet divalidasi', () => {
  assert.equal(validateAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'), null)
  assert.match(validateAddress('0x123'), /tidak valid/)
  assert.match(validateAddress(''), /wajib/)
})

test('daftar ID kemasan', () => {
  assert.deepEqual(parseIdList('1, 2  5', 50), { ids: ['1', '2', '5'] })
  assert.deepEqual(parseIdList('HCT-P-000003,4', 50), { ids: ['3', '4'] })
  assert.match(parseIdList('', 50).error, /minimal satu/)
  assert.match(parseIdList('1, x', 50).error, /"x"/)
  assert.match(parseIdList('1, 1', 50).error, /dua kali/)
  assert.match(parseIdList('1,2,3', 2).error, /Maksimal 2/)
})

test('timestamp dari datetime-local dijepit dalam menit yang dipilih', () => {
  const min = BigInt(Math.floor(new Date(2026, 8, 5, 10, 5, 30).getTime() / 1000))
  const now = min + 3600n
  // menit yang sama dengan registrasi -> pakai detik registrasi, bukan awal menit
  assert.deepEqual(resolveTimestamp('2026-09-05T10:05', { minSeconds: min, nowSeconds: now }), { seconds: min })
  // menit setelahnya -> awal menit itu
  assert.deepEqual(resolveTimestamp('2026-09-05T10:06', { minSeconds: min, nowSeconds: now }), { seconds: min + 30n })
  assert.match(resolveTimestamp('2026-09-05T10:04', { minSeconds: min, nowSeconds: now }).error, /sebelum/)
  assert.match(resolveTimestamp('2026-09-05T11:06', { minSeconds: min, nowSeconds: now }).error, /masa depan/)
  assert.match(resolveTimestamp('', { minSeconds: 0n, nowSeconds: now, label: 'Tanggal kirim' }).error, /Tanggal kirim wajib/)
})

test('hasil pindai hanya diterima kalau URL situs ini dengan ?trace', () => {
  const origin = 'https://nuzzy32.github.io'
  const base = '/Blockchain_Halal/'
  assert.equal(scanTarget('https://nuzzy32.github.io/Blockchain_Halal/?trace=5', origin, base), '5')
  assert.equal(scanTarget('https://nuzzy32.github.io/Blockchain_Halal?trace=5', origin, base), '5')
  assert.equal(scanTarget('https://evil.example/Blockchain_Halal/?trace=5', origin, base), null)
  assert.equal(scanTarget('https://nuzzy32.github.io/lain/?trace=5', origin, base), null)
  assert.equal(scanTarget('https://nuzzy32.github.io/Blockchain_Halal/?trace=abc', origin, base), null)
  assert.equal(scanTarget('bukan url', origin, base), null)
})
```

- [ ] **Step 4: Tulis `frontend/src/errors.test.js`**

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeRevert } from './errors.js'
import { ROLE } from './format.js'

test('setiap custom error contract punya kalimat Indonesia', () => {
  assert.match(describeRevert('Unauthorized', ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', ROLE.ABATTOIR]), /RPH/)
  assert.match(describeRevert('CattleNotFound', [7n]), /HCT-C-000007/)
  assert.match(describeRevert('PackageNotFound', [9n]), /HCT-P-000009/)
  assert.match(describeRevert('InvalidCattleStatus', [1n, 1n, 0n]), /Disembelih.*Terdaftar/)
  assert.match(describeRevert('InvalidPackageStatus', [1n, 1n, 0n]), /Dikirim/)
  assert.match(describeRevert('InvalidAge', [5n]), /6.*120/)
  assert.match(describeRevert('InvalidWeight', [99n]), /99/)
  assert.match(describeRevert('InvalidTimestamp', [1758800000n]), /tanggal/i)
  assert.equal(describeRevert('EmptyField', ['halalCertNo']), 'Nomor sertifikat halal wajib diisi.')
  assert.equal(describeRevert('UnspecifiedEnum', ['method']), 'Metode sembelih wajib dipilih.')
  assert.match(describeRevert('BatchTooLarge', [51n, 50n]), /50/)
  assert.match(describeRevert('ZeroAddress', []), /nol/)
  assert.match(describeRevert('LastAdmin', []), /terakhir/)
  assert.match(describeRevert('LengthMismatch', [2n, 1n]), /tidak sama/)
  assert.match(describeRevert('WrongAbattoir', [3n, '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC']), /RPH lain/)
  assert.match(describeRevert('PackageWeightExceeded', [1n, 500000n, 450000n]), /500\.000.*450\.000/)
})

test('error tak dikenal tetap menyebut namanya', () => {
  assert.match(describeRevert('SomethingNew', []), /SomethingNew/)
})
```

- [ ] **Step 5: Jalankan test, pastikan gagal**

Run: `cd frontend && npm test`
Expected: FAIL — `Cannot find module .../format.js` (dan validation.js, errors.js).

- [ ] **Step 6: Tulis `frontend/src/format.js`**

```js
// Format dan label murni (tanpa React, tanpa jaringan) — diuji lewat `npm test`.
import { decodeBytes32String, encodeBytes32String, id } from 'ethers'

/* ---------- peran ---------- */

export const ROLE_KEYS = ['ADMIN', 'FARMER', 'ABATTOIR', 'DISTRIBUTOR']
export const ROLE = Object.fromEntries(ROLE_KEYS.map((k) => [k, id(`${k}_ROLE`)]))
export const ROLE_LABEL = { ADMIN: 'Admin', FARMER: 'Peternak', ABATTOIR: 'RPH', DISTRIBUTOR: 'Distributor' }
export const roleKeyOf = (hash) => ROLE_KEYS.find((k) => ROLE[k] === String(hash).toLowerCase()) ?? null

/* ---------- enum — urutan angka harus sama dengan contracts/CattleRegistry.sol ---------- */

export const GRADE = { 1: 'Standard', 2: 'Choice', 3: 'Prime' }
export const FEED_TYPE = { 1: 'Rumput (grass-fed)', 2: 'Biji-bijian (grain-fed)', 3: 'Campuran', 4: 'Organik bersertifikat' }
export const SLAUGHTER_METHOD = { 1: 'Manual tanpa pemingsanan', 2: 'Manual dengan pemingsanan reversibel' }
export const CUT_TYPE = { 1: 'Sirloin', 2: 'Tenderloin (has dalam)', 3: 'Ribeye', 4: 'Brisket (sandung lamur)', 5: 'Shank (sengkel)', 6: 'Daging giling', 7: 'Lainnya' }
export const CATTLE_STATUS = { 0: 'Terdaftar', 1: 'Disembelih', 2: 'Dikemas' }
export const PACKAGE_STATUS = { 0: 'Dikemas', 1: 'Dikirim' }

export const options = (table) => Object.entries(table).map(([value, text]) => ({ value, label: text }))
export const label = (table, value) => table[Number(value)] ?? 'Tidak dikenal'

/* ---------- ID ---------- */

export const cattleLabel = (cattleId) => `HCT-C-${String(cattleId).padStart(6, '0')}`
export const packageLabel = (packageId) => `HCT-P-${String(packageId).padStart(6, '0')}`

/* ---------- bytes32 ---------- */

export const byteLength = (text) => new TextEncoder().encode(text).length
export const textToBytes32 = (text) => encodeBytes32String(text)

/** Data bytes32 dari chain ke teks. Yang tidak bisa di-decode ditampilkan sebagai hex, bukan dipaksa. */
export function bytes32ToText(hex) {
  try {
    return decodeBytes32String(hex)
  } catch {
    return hex
  }
}

/* ---------- waktu ---------- */

/** Unix detik -> teks tanggal Indonesia. 0 berarti tahap belum terjadi. */
export function formatDate(seconds) {
  if (!seconds || BigInt(seconds) === 0n) return null
  return new Date(Number(seconds) * 1000).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
}

export function freshnessText(seconds, nowMs = Date.now()) {
  const days = Math.floor((nowMs / 1000 - Number(seconds)) / 86_400)
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}

/** Date -> nilai <input type="datetime-local">, waktu lokal, tanpa detik. */
export function toDatetimeLocal(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

/* ---------- lain-lain ---------- */

export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

/** Pecah [from, to] per `size` blok — RPC publik menolak eth_getLogs dengan rentang besar. */
export function blockRanges(from, to, size) {
  const ranges = []
  for (let start = from; start <= to; start += size) ranges.push([start, Math.min(start + size - 1, to)])
  return ranges
}
```

- [ ] **Step 7: Tulis `frontend/src/validation.js`**

```js
// Validasi murni yang mencerminkan batas contract (docs/DATA-MODEL.md §5). Contract tetap
// penjaga terakhir; tujuan di sini supaya pengguna tidak membayar gas untuk transaksi yang
// pasti ditolak. Setiap validator mengembalikan pesan error atau null.
import { isAddress } from 'ethers'
import { byteLength, formatDate } from './format.js'

const UINT64_MAX = 2n ** 64n - 1n

function intInRange(value, labelText, min, max, unit) {
  const t = String(value ?? '').trim()
  if (!t) return `${labelText} wajib diisi.`
  if (!/^\d+$/.test(t)) return `${labelText} harus berupa angka bulat.`
  const n = Number(t)
  if (n < min || n > max) {
    return `${labelText} harus antara ${min.toLocaleString('id-ID')} dan ${max.toLocaleString('id-ID')} ${unit}.`
  }
  return null
}

export const validateAge = (v) => intInRange(v, 'Umur', 6, 120, 'bulan')
export const validateLiveWeight = (v) => intInRange(v, 'Berat hidup', 100, 1500, 'kg')
export const validatePackageGrams = (v) => intInRange(v, 'Berat kemasan', 100, 50_000, 'gram')
export const validateChoice = (v, labelText) => (v ? null : `${labelText} wajib dipilih.`)

export function validateShortText(v, labelText) {
  const t = String(v ?? '').trim()
  if (!t) return `${labelText} wajib diisi.`
  if (byteLength(t) > 31) return `${labelText} maksimal 31 karakter (huruf tanpa aksen).`
  return null
}

export function validateAddress(v) {
  const t = String(v ?? '').trim()
  if (!t) return 'Alamat wallet wajib diisi.'
  return isAddress(t) ? null : 'Alamat wallet tidak valid (harus 0x diikuti 40 karakter heksadesimal).'
}

/** "5", " 007 ", "HCT-P-000005" -> "5". Selain bilangan bulat positif muat uint64 -> null. */
export function parseId(raw) {
  if (raw === null || raw === undefined) return null
  const m = String(raw).trim().match(/^(?:HCT-[CP]-)?(\d+)$/i)
  if (!m) return null
  const n = BigInt(m[1])
  return n > 0n && n <= UINT64_MAX ? n.toString() : null
}

export const validateId = (v, labelText) => (parseId(v) ? null : `${labelText} harus berupa nomor positif, misalnya 5 atau HCT-C-000005.`)

/** "1, 2 5" -> { ids: ['1','2','5'] }. Ganda, kosong, atau lebih dari max -> { error }. */
export function parseIdList(text, max) {
  const tokens = String(text ?? '').split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0) return { error: 'Isi minimal satu ID kemasan.' }
  const ids = []
  for (const token of tokens) {
    const idValue = parseId(token)
    if (!idValue) return { error: `"${token}" bukan ID kemasan yang valid.` }
    if (ids.includes(idValue)) return { error: `ID ${idValue} ditulis dua kali.` }
    ids.push(idValue)
  }
  if (ids.length > max) return { error: `Maksimal ${max} kemasan per transaksi.` }
  return { ids }
}

/**
 * Nilai datetime-local (presisi menit) -> unix detik untuk contract.
 * Detik dipilih paling awal di dalam menit itu yang masih >= minSeconds, supaya mencatat di
 * menit yang sama dengan tahap sebelumnya tidak ditolak contract.
 */
export function resolveTimestamp(value, { minSeconds = 0n, nowSeconds, label: labelText = 'Tanggal' }) {
  if (!value) return { error: `${labelText} wajib diisi.` }
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return { error: `${labelText} tidak valid.` }
  const start = BigInt(Math.floor(ms / 1000))
  if (start > nowSeconds) return { error: `${labelText} tidak boleh di masa depan.` }
  if (start + 59n < minSeconds) return { error: `${labelText} tidak boleh sebelum ${formatDate(minSeconds)}.` }
  return { seconds: start > minSeconds ? start : minSeconds }
}

/** Isi QR -> ID kemasan, hanya kalau URL situs ini dengan ?trace=N. Selain itu null (SECURITY A9). */
export function scanTarget(text, origin, basePath) {
  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.origin !== origin) return null
  const base = basePath.replace(/\/$/, '')
  if (url.pathname !== base && url.pathname !== `${base}/`) return null
  return parseId(url.searchParams.get('trace'))
}
```

- [ ] **Step 8: Tulis `frontend/src/errors.js`**

```js
// Nama custom error contract -> kalimat Indonesia untuk pengguna.
import {
  CATTLE_STATUS, PACKAGE_STATUS, ROLE_LABEL, cattleLabel, formatDate, label, packageLabel, roleKeyOf, shortAddress,
} from './format.js'

const FIELD_LABEL = {
  farmId: 'Kode peternakan',
  slaughtermanId: 'ID juru sembelih',
  halalCertNo: 'Nomor sertifikat halal',
  grade: 'Grade',
  feedType: 'Jenis pakan',
  method: 'Metode sembelih',
  cutType: 'Jenis potongan',
  cutTypes: 'Daftar kemasan',
  packageIds: 'Daftar ID kemasan',
}
const field = (name) => FIELD_LABEL[name] ?? name
const num = (n) => Number(n).toLocaleString('id-ID')

const MESSAGES = {
  Unauthorized: ([, role]) => `Wallet ini tidak punya peran ${ROLE_LABEL[roleKeyOf(role)] ?? 'yang dibutuhkan'}.`,
  CattleNotFound: ([cattleId]) => `Sapi ${cattleLabel(cattleId)} tidak terdaftar.`,
  PackageNotFound: ([packageId]) => `Kemasan ${packageLabel(packageId)} tidak ditemukan.`,
  InvalidCattleStatus: ([cattleId, current, expected]) =>
    `Sapi ${cattleLabel(cattleId)} berstatus ${label(CATTLE_STATUS, current)}, seharusnya ${label(CATTLE_STATUS, expected)}.`,
  InvalidPackageStatus: ([packageId, current, expected]) =>
    `Kemasan ${packageLabel(packageId)} berstatus ${label(PACKAGE_STATUS, current)}, hanya kemasan berstatus ${label(PACKAGE_STATUS, expected)} yang bisa dicatat.`,
  InvalidAge: ([given]) => `Umur ${num(given)} bulan di luar batas 6–120 bulan.`,
  InvalidWeight: ([given]) => `Berat ${num(given)} di luar batas yang diizinkan.`,
  InvalidTimestamp: ([given]) =>
    `Tanggal ${formatDate(given) ?? given} ditolak: tidak boleh di masa depan atau sebelum tahap sebelumnya.`,
  EmptyField: ([name]) => `${field(name)} wajib diisi.`,
  UnspecifiedEnum: ([name]) => `${field(name)} wajib dipilih.`,
  BatchTooLarge: ([given, max]) => `Maksimal ${num(max)} item per transaksi, diberikan ${num(given)}.`,
  ZeroAddress: () => 'Alamat nol tidak boleh diberi peran.',
  LastAdmin: () => 'Admin terakhir tidak bisa dicabut — contract akan terkunci tanpa admin.',
  LengthMismatch: () => 'Jumlah jenis potongan dan jumlah berat tidak sama.',
  WrongAbattoir: ([cattleId, abattoir]) =>
    `Sapi ${cattleLabel(cattleId)} disembelih RPH lain (${shortAddress(abattoir)}), hanya RPH itu yang boleh mengemasnya.`,
  PackageWeightExceeded: ([, total, max]) =>
    `Total berat kemasan ${num(total)} g melebihi berat hidup sapi (${num(max)} g).`,
}

export function describeRevert(name, args = []) {
  const message = MESSAGES[name]
  return message ? message(args) : `Transaksi ditolak contract (${name}).`
}
```

- [ ] **Step 9: Jalankan test, pastikan lulus**

Run: `cd frontend && npm test`
Expected: PASS, semua test di tiga file lulus (`# fail 0`).

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/src/format.js frontend/src/validation.js frontend/src/errors.js frontend/src/*.test.js
git commit -m "feat: modul format, validasi, dan terjemahan error frontend v1"
```

---

### Task 3: Kerangka aplikasi, wallet, dan bagian Admin

**Files:**
- Create: `frontend/src/chain.js`, `frontend/src/registry.js`, `frontend/src/hooks.js`, `frontend/src/components.jsx`, `frontend/src/InternalPanel.jsx`, `frontend/src/sections/AdminSection.jsx`, `frontend/.env.development`, `frontend/.env.production`, `frontend/scripts/predeploy.mjs`
- Replace: `frontend/src/App.jsx`
- Modify: `frontend/package.json`, `frontend/index.html` (judul), `scripts/check.mjs`
- Delete: `frontend/src/ActorPanel.jsx`, `frontend/src/TrackPage.jsx`, `frontend/src/DashboardPage.jsx`, `frontend/src/stats.js`, `frontend/src/contract.js`

**Interfaces:**
- Consumes: `format.js`, `validation.js`, `errors.js` (Task 2); `CattleRegistry.abi.json` (Task 1).
- Produces:
  - `chain.js`: `NETWORKS`, `NETWORK` (`{ key, name, chainId: bigint, rpc(): string, address, deployBlock, explorer, currency }`), `isDeployed()`, `readProvider()`, `txUrl(hash) → string|null`, `addressUrl(addr) → string|null`, `addChainParams()`, `traceUrl(packageId)`, `homeUrl()`, `scanUrl()`
  - `registry.js`: `readRegistry()`, `writeRegistry()` (async), `rolesOf(address) → { ADMIN, FARMER, ABATTOIR, DISTRIBUTOR }`, `eventsOf(receipt, name) → LogDescription[]`, `errorMessage(err) → string`, `isRevert(err, name) → boolean`
  - `hooks.js`: `hasMetaMask()`, `useWallet() → { account, roles, rolesError, connecting, switching, error, wrongNetwork, connect, switchNetwork, refreshRoles }`, `useTx() → { state, busy, run(send) → receipt|null, reset }`
  - `components.jsx`: `Banner({ tone, children, action })`, `Section({ badge, title, lead, children })`, `Field({ id, label, error, hint, children })`, `fieldProps(id, error, extra?)`, `Review({ rows, status, onConfirm, onCancel })`, `TxStatus({ tx })`
  - `InternalPanel.jsx` dengan komponen `Body` yang merender bagian per peran; Task 4-6 menambahkan barisnya.

- [ ] **Step 1: Buat file env**

`frontend/.env.development`:

```
# npm run dev -> node Hardhat lokal (docs/deployment-v1.md, bagian Pengembangan lokal)
VITE_NETWORK=local
```

`frontend/.env.production`:

```
# npm run build / npm run deploy -> Polygon Amoy
VITE_NETWORK=amoy
```

- [ ] **Step 2: Buat `frontend/src/chain.js`**

```js
// Satu-satunya tempat setelan jaringan. Dipilih lewat VITE_NETWORK:
// .env.development -> local (npm run dev), .env.production -> amoy (npm run build).
import { JsonRpcProvider } from 'ethers'

export const NETWORKS = {
  local: {
    key: 'local',
    name: 'Hardhat Local',
    chainId: 31337n,
    // Hostname halaman, bukan 127.0.0.1 tetap: ponsel se-Wi-Fi yang membuka http://<ip-laptop>:5175
    // ikut menjangkau node di laptop (jalankan node dengan --hostname 0.0.0.0).
    rpc: () => `http://${globalThis.location?.hostname ?? '127.0.0.1'}:8545`,
    // Deploy pertama akun #0 di node Hardhat yang baru selalu mendarat di alamat ini.
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    deployBlock: 0,
    explorer: null,
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  amoy: {
    key: 'amoy',
    name: 'Polygon Amoy Testnet',
    chainId: 80002n,
    rpc: () => 'https://polygon-amoy-bor-rpc.publicnode.com',
    // Diisi setelah owner deploy (docs/deployment-v1.md). Kosong = situs menampilkan "belum di-deploy".
    address: '',
    deployBlock: 0,
    explorer: 'https://amoy.polygonscan.com',
    currency: { name: 'POL', symbol: 'POL', decimals: 18 },
  },
}

// `import.meta.env` hanya ada di Vite; skrip node (scripts/check.mjs, predeploy) juga mengimpor file ini.
export const NETWORK = NETWORKS[import.meta.env?.VITE_NETWORK] ?? NETWORKS.amoy

export const isDeployed = () => NETWORK.address !== ''

export const readProvider = () =>
  new JsonRpcProvider(NETWORK.rpc(), Number(NETWORK.chainId), { staticNetwork: true })

export const txUrl = (hash) => (NETWORK.explorer ? `${NETWORK.explorer}/tx/${hash}` : null)
export const addressUrl = (addr) => (NETWORK.explorer ? `${NETWORK.explorer}/address/${addr}` : null)

/** Parameter wallet_addEthereumChain untuk jaringan aktif. */
export const addChainParams = () => ({
  chainId: `0x${NETWORK.chainId.toString(16)}`,
  chainName: NETWORK.name,
  nativeCurrency: NETWORK.currency,
  rpcUrls: [NETWORK.rpc()],
  ...(NETWORK.explorer ? { blockExplorerUrls: [NETWORK.explorer] } : {}),
})

// Tautan ikut base Vite supaya benar di dev maupun di GitHub Pages (subpath /Blockchain_Halal/).
export const traceUrl = (packageId) => `${window.location.origin}${import.meta.env.BASE_URL}?trace=${packageId}`
export const homeUrl = () => import.meta.env.BASE_URL
export const scanUrl = () => `${import.meta.env.BASE_URL}?scan=1`
```

- [ ] **Step 3: Buat `frontend/src/registry.js`**

```js
// Akses contract CattleRegistry: baca lewat RPC publik (tanpa wallet), tulis lewat MetaMask.
import { BrowserProvider, Contract, Interface } from 'ethers'
import abi from './CattleRegistry.abi.json'
import { NETWORK, readProvider } from './chain.js'
import { describeRevert } from './errors.js'
import { ROLE, ROLE_KEYS } from './format.js'

const iface = new Interface(abi)

export const readRegistry = () => new Contract(NETWORK.address, abi, readProvider())

export async function writeRegistry() {
  const signer = await new BrowserProvider(window.ethereum).getSigner()
  return new Contract(NETWORK.address, abi, signer)
}

/** Keempat peran sekaligus. Dibaca lewat RPC, jadi tetap benar walau MetaMask di jaringan lain. */
export async function rolesOf(address) {
  const ct = readRegistry()
  const held = await Promise.all(ROLE_KEYS.map((k) => ct.checkRole(address, ROLE[k])))
  return Object.fromEntries(ROLE_KEYS.map((k, i) => [k, held[i]]))
}

/** Event bernama `name` di receipt, sudah di-decode. */
export function eventsOf(receipt, name) {
  return receipt.logs
    .map((log) => {
      try {
        return iface.parseLog(log)
      } catch {
        return null
      }
    })
    .filter((e) => e?.name === name)
}

/** Custom error contract di dalam error ethers, atau null. */
function revertOf(err) {
  if (err?.revert?.name) return err.revert
  const data = err?.data ?? err?.info?.error?.data ?? err?.error?.data
  if (typeof data !== 'string') return null
  try {
    return iface.parseError(data)
  } catch {
    return null
  }
}

export const isRevert = (err, name) => revertOf(err)?.name === name

export function errorMessage(err) {
  if (err?.code === 'ACTION_REJECTED') return 'Transaksi dibatalkan di MetaMask.'
  const revert = revertOf(err)
  if (revert) return describeRevert(revert.name, [...revert.args])
  return err?.shortMessage ?? err?.message ?? 'Terjadi kesalahan yang tidak diketahui.'
}
```

- [ ] **Step 4: Buat `frontend/src/hooks.js`**

```js
import { useCallback, useEffect, useState } from 'react'
import { NETWORK, addChainParams } from './chain.js'
import { errorMessage, rolesOf, writeRegistry } from './registry.js'

export const hasMetaMask = () => typeof window.ethereum !== 'undefined'

/** Wallet MetaMask + peran yang dibaca dari contract (bukan dipilih sendiri: contract tetap akan menolak). */
export function useWallet() {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [roles, setRoles] = useState(null)
  const [rolesError, setRolesError] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState(null)

  const loadRoles = useCallback(async (addr) => {
    setRoles(null)
    setRolesError(null)
    if (!addr) return
    try {
      setRoles(await rolesOf(addr))
    } catch (err) {
      setRolesError(errorMessage(err))
    }
  }, [])

  const load = useCallback(
    (addr) => {
      setAccount(addr)
      loadRoles(addr)
    },
    [loadRoles],
  )

  // Pulihkan koneksi yang sudah pernah diizinkan, tanpa memunculkan popup.
  useEffect(() => {
    if (!hasMetaMask()) return
    const eth = window.ethereum
    eth.request({ method: 'eth_accounts' }).then((a) => a[0] && load(a[0]))
    eth.request({ method: 'eth_chainId' }).then((c) => setChainId(BigInt(c)))
    const onAccounts = (a) => load(a[0] ?? null)
    const onChain = (c) => setChainId(BigInt(c))
    eth.on('accountsChanged', onAccounts)
    eth.on('chainChanged', onChain)
    return () => {
      eth.removeListener('accountsChanged', onAccounts)
      eth.removeListener('chainChanged', onChain)
    }
  }, [load])

  const connect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setChainId(BigInt(await window.ethereum.request({ method: 'eth_chainId' })))
      load(addr)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setConnecting(false)
    }
  }

  const switchNetwork = async () => {
    setSwitching(true)
    setError(null)
    const params = addChainParams()
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: params.chainId }] })
    } catch (err) {
      // 4902 = jaringan belum terdaftar di MetaMask, jadi tambahkan dulu.
      if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [params] })
        } catch (addErr) {
          setError(errorMessage(addErr))
        }
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setSwitching(false)
    }
  }

  return {
    account,
    roles,
    rolesError,
    connecting,
    switching,
    error,
    wrongNetwork: chainId !== null && chainId !== NETWORK.chainId,
    connect,
    switchNetwork,
    refreshRoles: () => loadRoles(account),
  }
}

/** Satu transaksi: menunggu tanda tangan -> menunggu blok -> berhasil / gagal. */
export function useTx() {
  const [state, setState] = useState({ status: 'idle' })

  const run = async (send) => {
    setState({ status: 'signing' })
    try {
      const sent = await send(await writeRegistry())
      setState({ status: 'mining', hash: sent.hash })
      const receipt = await sent.wait()
      setState({ status: 'success', hash: sent.hash })
      return receipt
    } catch (err) {
      setState({ status: 'error', message: errorMessage(err) })
      return null
    }
  }

  return {
    state,
    busy: state.status === 'signing' || state.status === 'mining',
    run,
    reset: () => setState({ status: 'idle' }),
  }
}
```

- [ ] **Step 5: Buat `frontend/src/components.jsx`**

```jsx
import { Fragment } from 'react'
import { txUrl } from './chain.js'

export function Banner({ tone, children, action }) {
  const danger = tone === 'danger'
  return (
    <div
      role={danger ? 'alert' : 'status'}
      className="flex flex-wrap items-center gap-4 rounded-xl border px-5 py-4"
      style={{
        borderColor: danger ? 'var(--color-danger)' : 'var(--color-accent)',
        background: danger ? 'var(--color-danger-bg)' : 'var(--color-warn-bg)',
      }}
    >
      <div className="min-w-0 flex-1 text-sm leading-relaxed">{children}</div>
      {action}
    </div>
  )
}

/** Kartu satu form peran. */
export function Section({ badge, title, lead, children }) {
  return (
    <section className="card px-6 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          {lead && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{lead}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {badge}
        </span>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  )
}

export function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

/** Atribut aksesibilitas + kelas untuk kontrol di dalam <Field>. */
export const fieldProps = (id, error, extra = {}) => ({
  id,
  name: id,
  className: 'field',
  'aria-invalid': error ? 'true' : undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
  ...extra,
})

/** Ringkasan sebelum tanda tangan (SECURITY A12): pengguna membaca dulu apa yang dicatat permanen. */
export function Review({ rows, status, onConfirm, onCancel }) {
  const busy = status === 'signing' || status === 'mining'
  return (
    <div className="animate-rise rounded-lg border border-primary px-5 py-4" role="region" aria-label="Ringkasan transaksi">
      <p className="font-display font-semibold">Periksa sebelum menandatangani</p>
      <p className="mt-1 text-sm text-muted">Data ini tercatat permanen di blockchain dan tidak bisa diubah.</p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-muted">{k}</dt>
            <dd className="break-words font-medium">{v}</dd>
          </Fragment>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy}>
          {status === 'signing' ? 'Menunggu tanda tangan…' : status === 'mining' ? 'Menunggu konfirmasi…' : 'Tandatangani di MetaMask'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Ubah data
        </button>
      </div>
    </div>
  )
}

export function TxStatus({ tx }) {
  if (tx.status === 'idle' || tx.status === 'signing') return null

  if (tx.status === 'error') {
    return (
      <p
        role="alert"
        className="animate-rise mt-6 rounded-lg border px-4 py-3 text-sm leading-relaxed"
        style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
      >
        {tx.message}
      </p>
    )
  }

  const done = tx.status === 'success'
  const url = txUrl(tx.hash)
  return (
    <div
      role="status"
      aria-atomic="true"
      className={`animate-rise mt-6 rounded-lg border px-4 py-3 text-sm leading-relaxed ${
        done ? 'border-primary bg-primary-soft text-primary' : 'border-divider text-muted'
      }`}
    >
      <p className="font-display font-semibold">
        {done ? 'Tercatat permanen di blockchain.' : 'Transaksi terkirim, menunggu konfirmasi blok…'}
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all font-mono text-xs underline underline-offset-4">
          {tx.hash}
        </a>
      ) : (
        <p className="mt-1 break-all font-mono text-xs">{tx.hash}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Buat `frontend/src/sections/AdminSection.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Field, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { ROLE, ROLE_KEYS, ROLE_LABEL } from '../format.js'
import { useTx } from '../hooks.js'
import { rolesOf } from '../registry.js'
import { validateAddress, validateChoice } from '../validation.js'

export default function AdminSection({ wallet }) {
  const [address, setAddress] = useState('')
  const [role, setRole] = useState('')
  const [touched, setTouched] = useState(false)
  const [pending, setPending] = useState(null) // 'grant' | 'revoke' | null
  const [held, setHeld] = useState(null)
  const [reload, setReload] = useState(0)
  const tx = useTx()

  const target = address.trim()
  const addressError = validateAddress(target)
  const roleError = validateChoice(role, 'Peran')

  // Peran yang sedang dimiliki alamat tujuan — contract tidak menyimpan daftar pemegang peran,
  // jadi hanya bisa dicek per alamat.
  useEffect(() => {
    setHeld(null)
    if (addressError) return
    let cancelled = false
    rolesOf(target)
      .then((r) => !cancelled && setHeld(r))
      .catch(() => !cancelled && setHeld('error'))
    return () => {
      cancelled = true
    }
  }, [target, addressError, reload])

  const ask = (action) => {
    setTouched(true)
    if (addressError || roleError) return
    tx.reset()
    setPending(action)
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) => (pending === 'grant' ? ct.grantRole(target, ROLE[role]) : ct.revokeRole(target, ROLE[role])))
    setPending(null)
    if (receipt) {
      setReload((n) => n + 1)
      if (target.toLowerCase() === wallet.account?.toLowerCase()) wallet.refreshRoles()
    }
  }

  return (
    <Section badge="Admin" title="Kelola peran" lead="Beri atau cabut peran wallet. Hanya admin yang bisa melakukannya.">
      <div className="space-y-5">
        <Field id="admin-address" label="Alamat wallet" error={touched ? addressError : null}>
          <input
            {...fieldProps('admin-address', touched ? addressError : null)}
            className="field font-mono"
            placeholder="0x…"
            autoComplete="off"
            spellCheck="false"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        {!addressError && (
          <p className="text-sm text-muted" role="status">
            {held === null
              ? 'Membaca peran alamat ini…'
              : held === 'error'
                ? 'Gagal membaca peran alamat ini.'
                : `Peran saat ini: ${ROLE_KEYS.filter((k) => held[k]).map((k) => ROLE_LABEL[k]).join(', ') || 'tidak ada'}`}
          </p>
        )}

        <Field id="admin-role" label="Peran" error={touched ? roleError : null}>
          <select {...fieldProps('admin-role', touched ? roleError : null)} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Pilih peran…</option>
            {ROLE_KEYS.map((k) => (
              <option key={k} value={k}>
                {ROLE_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        {pending ? (
          <Review
            rows={[
              ['Aksi', pending === 'grant' ? 'Beri peran' : 'Cabut peran'],
              ['Alamat', <span className="font-mono">{target}</span>],
              ['Peran', ROLE_LABEL[role]],
            ]}
            status={tx.state.status}
            onConfirm={confirm}
            onCancel={() => setPending(null)}
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => ask('grant')}>
              Beri peran
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => ask('revoke')}>
              Cabut peran
            </button>
          </div>
        )}
      </div>
      <TxStatus tx={tx.state} />
    </Section>
  )
}
```

- [ ] **Step 7: Buat `frontend/src/InternalPanel.jsx`**

```jsx
import { Banner } from './components.jsx'
import { NETWORK, addressUrl, isDeployed, scanUrl } from './chain.js'
import { ROLE_KEYS, ROLE_LABEL, shortAddress } from './format.js'
import { hasMetaMask, useWallet } from './hooks.js'
import AdminSection from './sections/AdminSection.jsx'

/**
 * Panel untuk admin, peternak, RPH, dan distributor. Bagian yang tampil mengikuti peran
 * wallet aktif di contract; satu wallet bisa punya beberapa peran.
 */
export default function InternalPanel() {
  const wallet = useWallet()
  return (
    <div className="min-h-dvh">
      <TopBar wallet={wallet} />
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10">
        <header className="max-w-2xl">
          <p className="eyebrow">Panel internal · {NETWORK.name}</p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Pencatatan Rantai Pasok</h1>
          <p className="mt-4 max-w-prose leading-relaxed text-muted">
            Setiap tahap dicatat oleh pihak yang berwenang dan disimpan permanen di blockchain.
          </p>
        </header>
        <div className="mt-10 space-y-6">
          <Body wallet={wallet} />
        </div>
      </main>
    </div>
  )
}

function Body({ wallet }) {
  if (!isDeployed()) return <NotDeployed />
  if (!hasMetaMask()) return <NoWallet />
  if (!wallet.account) return <ConnectCard onConnect={wallet.connect} busy={wallet.connecting} />

  const { roles } = wallet
  const anyRole = roles && ROLE_KEYS.some((k) => roles[k])

  return (
    <>
      {wallet.wrongNetwork && <NetworkBanner onSwitch={wallet.switchNetwork} busy={wallet.switching} />}
      {wallet.error && <Banner tone="danger">{wallet.error}</Banner>}
      {wallet.rolesError ? (
        <Banner
          tone="danger"
          action={
            <button className="btn btn-ghost shrink-0" onClick={wallet.refreshRoles}>
              Coba lagi
            </button>
          }
        >
          Gagal membaca peran wallet: {wallet.rolesError}
        </Banner>
      ) : roles === null ? (
        <div className="card px-6 py-8 text-muted" role="status">
          Membaca peran wallet…
        </div>
      ) : !anyRole ? (
        <NoRole account={wallet.account} />
      ) : (
        // Jaringan salah -> seluruh form terkunci lewat fieldset disabled.
        <fieldset disabled={wallet.wrongNetwork} className="min-w-0 space-y-6">
          <legend className="sr-only">Form pencatatan</legend>
          {roles.ADMIN && <AdminSection wallet={wallet} />}
        </fieldset>
      )}
    </>
  )
}

function TopBar({ wallet }) {
  const { roles } = wallet
  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-surface">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-5">
        <span className="font-display text-[15px] font-semibold tracking-tight">HalalChain Trace</span>
        <a href={scanUrl()} className="tap ml-auto text-sm font-medium text-primary underline underline-offset-4">
          Pindai QR
        </a>
        {wallet.account && (
          <div className="flex items-center gap-2">
            {roles &&
              ROLE_KEYS.filter((k) => roles[k]).map((k) => (
                <span key={k} className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary sm:inline">
                  {ROLE_LABEL[k]}
                </span>
              ))}
            <span
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-xs"
              style={wallet.wrongNetwork ? { color: 'var(--color-warn-text)' } : undefined}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: wallet.wrongNetwork ? 'var(--color-accent)' : 'var(--color-primary)' }}
              />
              {shortAddress(wallet.account)}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

function Card({ title, children }) {
  return (
    <div className="card px-6 py-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 max-w-md leading-relaxed text-muted">{children}</div>
    </div>
  )
}

function NotDeployed() {
  return (
    <Card title="Contract v1 belum di-deploy">
      Contract HalalChain Trace v1 belum di-deploy ke {NETWORK.name}. Setelah deploy, isi alamatnya di{' '}
      <code className="font-mono text-sm">frontend/src/chain.js</code>.
    </Card>
  )
}

function NoWallet() {
  return (
    <Card title="MetaMask tidak terdeteksi">
      <p>Panel ini menulis transaksi ke blockchain, jadi membutuhkan wallet. Pasang MetaMask, lalu muat ulang halaman.</p>
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="btn btn-primary mt-6">
        Pasang MetaMask
      </a>
      <p className="mt-6 border-t border-divider pt-4 text-sm">
        Konsumen tidak membutuhkan wallet — halaman hasil pindai QR bisa dibuka siapa saja.
      </p>
    </Card>
  )
}

function ConnectCard({ onConnect, busy }) {
  return (
    <Card title="Hubungkan wallet">
      <p>Form pencatatan menyesuaikan peran wallet Anda: admin, peternak, RPH, atau distributor.</p>
      <button onClick={onConnect} disabled={busy} className="btn btn-primary mt-6">
        {busy ? 'Menunggu MetaMask…' : 'Hubungkan MetaMask'}
      </button>
    </Card>
  )
}

function NetworkBanner({ onSwitch, busy }) {
  return (
    <Banner
      tone="warn"
      action={
        <button onClick={onSwitch} disabled={busy} className="btn btn-ghost shrink-0">
          {busy ? 'Memindahkan…' : `Pindah ke ${NETWORK.name}`}
        </button>
      }
    >
      <strong className="font-display block font-semibold" style={{ color: 'var(--color-warn-text)' }}>
        Jaringan salah
      </strong>
      <span className="mt-0.5 block text-muted">Wallet tidak berada di {NETWORK.name}. Form dikunci sampai jaringan benar.</span>
    </Banner>
  )
}

function NoRole({ account }) {
  const url = addressUrl(account)
  return (
    <Card title="Wallet ini belum punya peran">
      Alamat{' '}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="font-mono text-primary underline underline-offset-4">
          {account}
        </a>
      ) : (
        <span className="break-all font-mono">{account}</span>
      )}{' '}
      belum diberi peran. Minta admin memberikan peran lewat bagian "Kelola peran", atau pindah ke akun lain di MetaMask.
    </Card>
  )
}
```

- [ ] **Step 8: Ganti `frontend/src/App.jsx`**

```jsx
import InternalPanel from './InternalPanel.jsx'

/**
 * Halaman dipilih dari query param, tanpa router — GitHub Pages tidak punya SPA rewrite,
 * jadi "/repo/?param" selalu mengenai index.html.
 *
 *   ?trace=5  halaman konsumen kemasan #5 (tujuan QR)   — Task 7
 *   ?scan=1   scanner QR                                — Task 8
 *   (tanpa)   panel internal, butuh MetaMask
 */
export default function App() {
  return <InternalPanel />
}
```

- [ ] **Step 9: Hapus file v0**

```bash
git rm frontend/src/ActorPanel.jsx frontend/src/TrackPage.jsx frontend/src/DashboardPage.jsx frontend/src/stats.js frontend/src/contract.js
```

Ganti `<title>` dan `<meta name="description">` di `frontend/index.html`:

```html
    <title>HalalChain Trace — Ketertelusuran Daging Sapi Halal</title>
    <meta name="description" content="Lacak riwayat kemasan daging sapi dari peternakan, penyembelihan halal, sampai pengiriman — tercatat di blockchain." />
```

- [ ] **Step 10: Buat pengaman deploy `frontend/scripts/predeploy.mjs`**

```js
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
```

Di `frontend/package.json`, tambahkan `"predeploy": "node scripts/predeploy.mjs",` tepat sebelum baris `"deploy"`.

- [ ] **Step 11: Tambah pengecekan alamat Amoy di `scripts/check.mjs`**

Tambahkan di akhir file:

```js
const { NETWORKS } = await import('../frontend/src/chain.js')
if (NETWORKS.amoy.address) {
  const { JsonRpcProvider } = await import('../frontend/node_modules/ethers/lib.esm/index.js')
  const code = await new JsonRpcProvider(NETWORKS.amoy.rpc()).getCode(NETWORKS.amoy.address)
  assert.notEqual(code, '0x', `Tidak ada contract di ${NETWORKS.amoy.address} (Amoy)`)
  console.log(`✓ Contract ada di Amoy: ${NETWORKS.amoy.address}`)
} else {
  console.log('• Alamat Amoy belum diisi di frontend/src/chain.js — pengecekan on-chain dilewati')
}
```

- [ ] **Step 12: Verifikasi**

```bash
cd frontend && npm test && npm run build && npx vite build --mode development
cd frontend && npm run predeploy; echo "exit=$?"
cd .. && npm run check
```

Expected: test lulus; kedua build berhasil tanpa error/warning selain ukuran chunk; `predeploy` mencetak `✗ Deploy dibatalkan…` dan `exit=1`; `npm run check` mencetak `✓ ABI…` dan `• Alamat Amoy belum diisi…`. **Jangan** menjalankan `npm run deploy`.

- [ ] **Step 13: Commit**

```bash
git add frontend/.env.development frontend/.env.production frontend/src frontend/scripts frontend/package.json frontend/index.html scripts/check.mjs
git commit -m "feat: kerangka frontend v1 dengan wallet, peran, dan kelola peran admin"
```

---

### Task 4: Form peternak dan pencatatan sembelih

**Files:**
- Create: `frontend/src/sections/FarmerSection.jsx`, `frontend/src/sections/SlaughterSection.jsx`
- Modify: `frontend/src/hooks.js` (tambah `useCattle`), `frontend/src/components.jsx` (tambah `CattleSummary`), `frontend/src/InternalPanel.jsx`

**Interfaces:**
- Consumes: `Section`, `Field`, `fieldProps`, `Review`, `TxStatus`, `useTx`, `readRegistry`, `eventsOf`, `errorMessage`, `isRevert` (Task 3); format + validation (Task 2).
- Produces:
  - `useCattle(idText) → { status: 'idle'|'loading'|'ok'|'notfound'|'error', cattle, message, reload }` — `cattle` = hasil `getCattle` (Result ethers, field bernama sesuai struct `CattleRecord`)
  - `CattleSummary({ lookup })` — menampilkan keadaan `useCattle`

- [ ] **Step 1: Tambah `useCattle` di akhir `frontend/src/hooks.js`**

Tambah import `readRegistry, isRevert` ke baris import dari `./registry.js` dan `parseId` dari `./validation.js`, lalu tambahkan:

```js
/** Data sapi untuk pratinjau form. `idText` mentah dari input; tidak valid -> idle. */
export function useCattle(idText) {
  const cattleId = parseId(idText)
  const [state, setState] = useState({ status: 'idle' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!cattleId) return setState({ status: 'idle' })
    let cancelled = false
    setState({ status: 'loading' })
    readRegistry()
      .getCattle(cattleId)
      .then((cattle) => !cancelled && setState({ status: 'ok', cattle }))
      .catch((err) => {
        if (cancelled) return
        setState(isRevert(err, 'CattleNotFound') ? { status: 'notfound' } : { status: 'error', message: errorMessage(err) })
      })
    return () => {
      cancelled = true
    }
  }, [cattleId, nonce])

  return { ...state, cattleId, reload: () => setNonce((n) => n + 1) }
}
```

- [ ] **Step 2: Tambah `CattleSummary` di akhir `frontend/src/components.jsx`**

Tambah import di atas file: `import { CATTLE_STATUS, FEED_TYPE, GRADE, bytes32ToText, cattleLabel, formatDate, label } from './format.js'`, lalu:

```jsx
/** Pratinjau sapi dari useCattle, supaya pengguna yakin memilih sapi yang benar sebelum mencatat. */
export function CattleSummary({ lookup }) {
  if (lookup.status === 'idle') return null
  if (lookup.status === 'loading') return <p className="text-sm text-muted" role="status">Membaca data sapi…</p>
  if (lookup.status === 'notfound') {
    return <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }} role="alert">Sapi {cattleLabel(lookup.cattleId)} tidak terdaftar.</p>
  }
  if (lookup.status === 'error') {
    return <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }} role="alert">Gagal membaca data sapi: {lookup.message}</p>
  }
  const c = lookup.cattle
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-divider bg-divider text-sm sm:grid-cols-4" aria-label="Data sapi">
      {[
        ['Sapi', cattleLabel(c.cattleId)],
        ['Status', label(CATTLE_STATUS, c.status)],
        ['Grade', label(GRADE, c.grade)],
        ['Berat hidup', `${c.liveWeightKg} kg`],
        ['Pakan', label(FEED_TYPE, c.feedType)],
        ['Peternakan', bytes32ToText(c.farmId)],
        ['Terdaftar', formatDate(c.registeredAt)],
      ].map(([k, v]) => (
        <div key={k} className="bg-surface px-3 py-2.5">
          <dt className="eyebrow">{k}</dt>
          <dd className="mt-1 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
```

- [ ] **Step 3: Buat `frontend/src/sections/FarmerSection.jsx`**

```jsx
import { useState } from 'react'
import { Field, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { FEED_TYPE, GRADE, cattleLabel, label, options, textToBytes32 } from '../format.js'
import { useTx } from '../hooks.js'
import { eventsOf } from '../registry.js'
import { validateAge, validateChoice, validateLiveWeight, validateShortText } from '../validation.js'

const EMPTY = { age: '', weight: '', grade: '', feed: '', farmId: '' }

export default function FarmerSection() {
  const [v, setV] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(false)
  const [created, setCreated] = useState(null)
  const tx = useTx()

  const errors = {
    age: validateAge(v.age),
    weight: validateLiveWeight(v.weight),
    grade: validateChoice(v.grade, 'Grade'),
    feed: validateChoice(v.feed, 'Jenis pakan'),
    farmId: validateShortText(v.farmId, 'Kode peternakan'),
  }
  const err = (k) => (touched ? errors[k] : null)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    const firstBad = Object.keys(errors).find((k) => errors[k])
    if (firstBad) return document.getElementById(`farmer-${firstBad}`)?.focus()
    tx.reset()
    setCreated(null)
    setReview(true)
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) =>
      ct.registerCattle(Number(v.age), Number(v.weight), Number(v.grade), Number(v.feed), textToBytes32(v.farmId.trim())),
    )
    setReview(false)
    if (!receipt) return
    const [ev] = eventsOf(receipt, 'CattleRegistered')
    setCreated(ev?.args.cattleId ?? null)
    setV(EMPTY)
    setTouched(false)
  }

  return (
    <Section badge="Peternak" title="Daftarkan sapi" lead="ID sapi dibuat otomatis oleh contract. Catat ID-nya untuk tahap sembelih.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={review} className="grid gap-5 sm:grid-cols-2">
          <Field id="farmer-age" label="Umur (bulan)" error={err('age')}>
            <input {...fieldProps('farmer-age', err('age'), { inputMode: 'numeric', placeholder: '6–120' })} value={v.age} onChange={set('age')} />
          </Field>
          <Field id="farmer-weight" label="Berat hidup (kg)" error={err('weight')}>
            <input {...fieldProps('farmer-weight', err('weight'), { inputMode: 'numeric', placeholder: '100–1500' })} value={v.weight} onChange={set('weight')} />
          </Field>
          <Field id="farmer-grade" label="Grade" error={err('grade')}>
            <select {...fieldProps('farmer-grade', err('grade'))} value={v.grade} onChange={set('grade')}>
              <option value="">Pilih grade…</option>
              {options(GRADE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="farmer-feed" label="Jenis pakan" error={err('feed')}>
            <select {...fieldProps('farmer-feed', err('feed'))} value={v.feed} onChange={set('feed')}>
              <option value="">Pilih jenis pakan…</option>
              {options(FEED_TYPE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="farmer-farmId" label="Kode peternakan" error={err('farmId')} hint="Kode, bukan nama orang — data ini publik dan permanen.">
            <input {...fieldProps('farmer-farmId', err('farmId'), { placeholder: 'contoh: FARM-JTG-001', autoComplete: 'off' })} value={v.farmId} onChange={set('farmId')} />
          </Field>
        </fieldset>

        {review ? (
          <Review
            rows={[
              ['Umur', `${v.age} bulan`],
              ['Berat hidup', `${v.weight} kg`],
              ['Grade', label(GRADE, v.grade)],
              ['Jenis pakan', label(FEED_TYPE, v.feed)],
              ['Kode peternakan', v.farmId.trim()],
            ]}
            status={tx.state.status}
            onConfirm={confirm}
            onCancel={() => setReview(false)}
          />
        ) : (
          <button type="submit" className="btn btn-primary">Lanjut ke ringkasan</button>
        )}
      </form>

      <TxStatus tx={tx.state} />
      {created !== null && (
        <p className="animate-rise mt-4 rounded-lg bg-primary-soft px-4 py-3 text-primary" role="status">
          ID sapi baru: <strong className="font-display text-lg">{cattleLabel(created)}</strong>
        </p>
      )}
    </Section>
  )
}
```

- [ ] **Step 4: Buat `frontend/src/sections/SlaughterSection.jsx`**

```jsx
import { useState } from 'react'
import { CattleSummary, Field, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { SLAUGHTER_METHOD, cattleLabel, formatDate, label, options, textToBytes32, toDatetimeLocal } from '../format.js'
import { useCattle, useTx } from '../hooks.js'
import { resolveTimestamp, validateChoice, validateId, validateShortText } from '../validation.js'

const REGISTERED = 0n

export default function SlaughterSection() {
  const [v, setV] = useState(() => ({ cattle: '', at: toDatetimeLocal(new Date()), slaughterman: '', cert: '', method: '' }))
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(null) // { seconds } saat ringkasan tampil
  const tx = useTx()
  const lookup = useCattle(v.cattle)

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
  const cattleReady = lookup.status === 'ok' && lookup.cattle.status === REGISTERED
  const time = cattleReady
    ? resolveTimestamp(v.at, { minSeconds: lookup.cattle.registeredAt, nowSeconds, label: 'Waktu sembelih' })
    : { error: null }

  const errors = {
    cattle:
      validateId(v.cattle, 'ID sapi') ??
      (lookup.status === 'ok' && !cattleReady ? `Sapi ini sudah ${label({ 1: 'disembelih', 2: 'dikemas' }, lookup.cattle.status)} — penyembelihan hanya bisa dicatat sekali.` : null) ??
      (lookup.status !== 'ok' ? 'Pilih sapi yang terdaftar.' : null),
    at: time.error,
    slaughterman: validateShortText(v.slaughterman, 'ID juru sembelih'),
    cert: validateShortText(v.cert, 'Nomor sertifikat halal'),
    method: validateChoice(v.method, 'Metode sembelih'),
  }
  const err = (k) => (touched ? errors[k] : null)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    const firstBad = Object.keys(errors).find((k) => errors[k])
    if (firstBad) return document.getElementById(`slaughter-${firstBad}`)?.focus()
    tx.reset()
    setReview({ seconds: time.seconds })
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) =>
      ct.recordSlaughter(lookup.cattleId, review.seconds, textToBytes32(v.slaughterman.trim()), textToBytes32(v.cert.trim()), Number(v.method)),
    )
    setReview(null)
    if (receipt) {
      lookup.reload()
      setTouched(false)
    }
  }

  return (
    <Section badge="RPH" title="Catat penyembelihan" lead="Data halal dicatat sekali dan tidak bisa diedit — periksa sebelum menandatangani.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={!!review} className="space-y-5">
          <Field id="slaughter-cattle" label="ID sapi" error={err('cattle')}>
            <input {...fieldProps('slaughter-cattle', err('cattle'), { placeholder: 'contoh: 3 atau HCT-C-000003', autoComplete: 'off' })} value={v.cattle} onChange={set('cattle')} />
          </Field>
          <CattleSummary lookup={lookup} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="slaughter-at" label="Waktu sembelih" error={err('at')}>
              <input {...fieldProps('slaughter-at', err('at'), { type: 'datetime-local', max: toDatetimeLocal(new Date()) })} value={v.at} onChange={set('at')} />
            </Field>
            <Field id="slaughter-method" label="Metode sembelih" error={err('method')}>
              <select {...fieldProps('slaughter-method', err('method'))} value={v.method} onChange={set('method')}>
                <option value="">Pilih metode…</option>
                {options(SLAUGHTER_METHOD).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field id="slaughter-slaughterman" label="ID sertifikat juru sembelih" error={err('slaughterman')} hint="ID sertifikat, bukan nama orang.">
              <input {...fieldProps('slaughter-slaughterman', err('slaughterman'), { placeholder: 'contoh: JULEHA-0042', autoComplete: 'off' })} value={v.slaughterman} onChange={set('slaughterman')} />
            </Field>
            <Field id="slaughter-cert" label="Nomor sertifikat halal" error={err('cert')}>
              <input {...fieldProps('slaughter-cert', err('cert'), { placeholder: 'contoh: ID00410000123', autoComplete: 'off' })} value={v.cert} onChange={set('cert')} />
            </Field>
          </div>
        </fieldset>

        {review ? (
          <Review
            rows={[
              ['Sapi', cattleLabel(lookup.cattleId)],
              ['Waktu sembelih', formatDate(review.seconds)],
              ['Metode', label(SLAUGHTER_METHOD, v.method)],
              ['Juru sembelih', v.slaughterman.trim()],
              ['Sertifikat halal', v.cert.trim()],
            ]}
            status={tx.state.status}
            onConfirm={confirm}
            onCancel={() => setReview(null)}
          />
        ) : (
          <button type="submit" className="btn btn-primary">Lanjut ke ringkasan</button>
        )}
      </form>
      <TxStatus tx={tx.state} />
    </Section>
  )
}
```

- [ ] **Step 5: Pasang di `InternalPanel.jsx`**

Tambah import:

```jsx
import FarmerSection from './sections/FarmerSection.jsx'
import SlaughterSection from './sections/SlaughterSection.jsx'
```

Di dalam `<fieldset>` pada `Body`, setelah baris `{roles.ADMIN && ...}` tambahkan:

```jsx
          {roles.FARMER && <FarmerSection />}
          {roles.ABATTOIR && <SlaughterSection />}
```

- [ ] **Step 6: Verifikasi dan commit**

Run: `cd frontend && npm test && npm run build`
Expected: test lulus, build berhasil tanpa error.

```bash
git add frontend/src
git commit -m "feat: form registrasi sapi dan pencatatan sembelih halal"
```

---

### Task 5: Pembuatan kemasan dan label QR

**Files:**
- Create: `frontend/src/sections/PackagingSection.jsx`
- Modify: `frontend/src/components.jsx` (tambah `QrLabel`), `frontend/src/InternalPanel.jsx`

**Interfaces:**
- Consumes: `useCattle`, `CattleSummary` (Task 4); `traceUrl` (Task 3).
- Produces: `QrLabel({ packageId, cutType, grams })` — QR berisi `traceUrl(packageId)` + tombol unduh PNG berlabel.

- [ ] **Step 1: Tambah `QrLabel` di akhir `frontend/src/components.jsx`**

Tambah import `import { useRef } from 'react'` (gabung dengan import `Fragment`), `import { QRCodeCanvas } from 'qrcode.react'`, `traceUrl` dari `./chain.js`, dan `CUT_TYPE, packageLabel` dari `./format.js`. Lalu:

```jsx
/** QR label kemasan. Isinya URL halaman konsumen, bukan data mentah (ARCHITECTURE §2.3). */
export function QrLabel({ packageId, cutType, grams }) {
  const box = useRef(null)
  const url = traceUrl(packageId)
  const caption = `${packageLabel(packageId)} · ${label(CUT_TYPE, cutType)} ${Number(grams).toLocaleString('id-ID')} g`

  // PNG siap cetak: QR di atas, teks label di bawah, latar putih.
  const download = () => {
    const qr = box.current?.querySelector('canvas')
    if (!qr) return
    const pad = 24
    const out = document.createElement('canvas')
    out.width = qr.width + pad * 2
    out.height = qr.height + pad * 2 + 36
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(qr, pad, pad)
    ctx.fillStyle = '#14532d'
    ctx.font = '600 16px "Work Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(caption, out.width / 2, qr.height + pad + 26, out.width - pad)
    const a = document.createElement('a')
    a.href = out.toDataURL('image/png')
    a.download = `label-${packageLabel(packageId)}.png`
    a.click()
  }

  return (
    <div className="rounded-xl border border-divider bg-white p-4 text-center">
      <div ref={box} className="flex justify-center">
        <QRCodeCanvas value={url} size={160} level="M" marginSize={2} />
      </div>
      <p className="mt-2 text-sm font-semibold">{caption}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={download} className="btn btn-ghost">Unduh PNG</button>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost">Buka halaman</a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Buat `frontend/src/sections/PackagingSection.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { CattleSummary, Field, QrLabel, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { CUT_TYPE, cattleLabel, label, options, shortAddress } from '../format.js'
import { useCattle, useTx } from '../hooks.js'
import { eventsOf, readRegistry } from '../registry.js'
import { validateChoice, validateId, validatePackageGrams } from '../validation.js'

const REGISTERED = 0n
// Penghitung biasa, bukan crypto.randomUUID(): yang terakhir hanya ada di secure context,
// sedangkan halaman dev yang dibuka dari ponsel lewat http://<ip-laptop> bukan secure context.
let rowSeq = 0
const newRow = () => ({ key: ++rowSeq, cut: '', grams: '' })

export default function PackagingSection({ account }) {
  const [cattle, setCattle] = useState('')
  const [rows, setRows] = useState(() => [newRow()])
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(false)
  const [created, setCreated] = useState([])
  const [maxBatch, setMaxBatch] = useState(50)
  const tx = useTx()
  const lookup = useCattle(cattle)

  // Batas batch dibaca dari contract, bukan disalin angkanya (spec §7).
  useEffect(() => {
    readRegistry().MAX_BATCH().then((n) => setMaxBatch(Number(n))).catch(() => {})
  }, [])

  const c = lookup.status === 'ok' ? lookup.cattle : null
  const remaining = c ? Number(c.liveWeightKg) * 1000 - Number(c.packagedGrams) : 0
  const total = rows.reduce((sum, r) => sum + (Number(r.grams) || 0), 0)

  const cattleError =
    validateId(cattle, 'ID sapi') ??
    (lookup.status !== 'ok' ? 'Pilih sapi yang terdaftar.' : null) ??
    (c.status === REGISTERED ? 'Sapi ini belum disembelih.' : null) ??
    (c.abattoir.toLowerCase() !== account.toLowerCase()
      ? `Sapi ini disembelih RPH lain (${shortAddress(c.abattoir)}) — hanya RPH itu yang boleh mengemasnya.`
      : null)
  const rowErrors = rows.map((r) => ({ cut: validateChoice(r.cut, 'Jenis potongan'), grams: validatePackageGrams(r.grams) }))
  const totalError = c && total > remaining ? `Total ${total.toLocaleString('id-ID')} g melebihi sisa berat ${remaining.toLocaleString('id-ID')} g.` : null
  const invalid = cattleError || totalError || rowErrors.some((e) => e.cut || e.grams)

  const setRow = (key, field) => (e) => setRows(rows.map((r) => (r.key === key ? { ...r, [field]: e.target.value } : r)))

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    tx.reset()
    setCreated([])
    setReview(true)
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) => ct.createPackages(lookup.cattleId, rows.map((r) => Number(r.cut)), rows.map((r) => Number(r.grams))))
    setReview(false)
    if (!receipt) return
    setCreated(eventsOf(receipt, 'PackageCreated').map((ev) => ({ packageId: ev.args.packageId, cutType: ev.args.cutType, grams: ev.args.weightGrams })))
    setRows([newRow()])
    setTouched(false)
    lookup.reload()
  }

  return (
    <Section badge="RPH" title="Buat kemasan" lead="Satu sapi bisa dibuatkan beberapa kemasan. Tiap kemasan mendapat QR sendiri.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={review} className="space-y-5">
          <Field id="pack-cattle" label="ID sapi" error={touched ? cattleError : null}>
            <input {...fieldProps('pack-cattle', touched ? cattleError : null, { placeholder: 'contoh: 3 atau HCT-C-000003', autoComplete: 'off' })} value={cattle} onChange={(e) => setCattle(e.target.value)} />
          </Field>
          <CattleSummary lookup={lookup} />
          {c && c.status !== REGISTERED && (
            <p className="text-sm text-muted">
              Sisa berat yang boleh dikemas: <strong className="text-ink">{remaining.toLocaleString('id-ID')} g</strong>
            </p>
          )}

          <ol className="space-y-3">
            {rows.map((r, i) => {
              const errs = touched ? rowErrors[i] : {}
              return (
                <li key={r.key} className="grid items-start gap-3 sm:grid-cols-[1fr_10rem_auto]">
                  <Field id={`pack-cut-${r.key}`} label={`Potongan kemasan ${i + 1}`} error={errs.cut}>
                    <select {...fieldProps(`pack-cut-${r.key}`, errs.cut)} value={r.cut} onChange={setRow(r.key, 'cut')}>
                      <option value="">Pilih potongan…</option>
                      {options(CUT_TYPE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field id={`pack-grams-${r.key}`} label="Berat (gram)" error={errs.grams}>
                    <input {...fieldProps(`pack-grams-${r.key}`, errs.grams, { inputMode: 'numeric', placeholder: '100–50000' })} value={r.grams} onChange={setRow(r.key, 'grams')} />
                  </Field>
                  <button
                    type="button"
                    className="btn btn-ghost sm:mt-7"
                    onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                    disabled={rows.length === 1}
                    aria-label={`Hapus kemasan ${i + 1}`}
                  >
                    Hapus
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="btn btn-ghost" onClick={() => setRows([...rows, newRow()])} disabled={rows.length >= maxBatch}>
              Tambah kemasan
            </button>
            <p className="text-sm text-muted tnum">
              {rows.length}/{maxBatch} kemasan · total {total.toLocaleString('id-ID')} g
            </p>
          </div>
          {touched && totalError && <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }} role="alert">{totalError}</p>}
        </fieldset>

        {review ? (
          <Review
            rows={[
              ['Sapi', cattleLabel(lookup.cattleId)],
              ['Jumlah kemasan', String(rows.length)],
              ...rows.map((r, i) => [`Kemasan ${i + 1}`, `${label(CUT_TYPE, r.cut)} · ${Number(r.grams).toLocaleString('id-ID')} g`]),
            ]}
            status={tx.state.status}
            onConfirm={confirm}
            onCancel={() => setReview(false)}
          />
        ) : (
          <button type="submit" className="btn btn-primary">Lanjut ke ringkasan</button>
        )}
      </form>

      <TxStatus tx={tx.state} />
      {created.length > 0 && (
        <div className="animate-rise mt-6">
          <h3 className="font-display text-lg font-semibold">Label QR kemasan baru</h3>
          <p className="mt-1 text-sm text-muted">Unduh dan cetak, lalu tempel di kemasan yang sesuai.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {created.map((p) => <QrLabel key={String(p.packageId)} packageId={p.packageId} cutType={p.cutType} grams={p.grams} />)}
          </div>
        </div>
      )}
    </Section>
  )
}
```

- [ ] **Step 3: Pasang di `InternalPanel.jsx`**

Tambah `import PackagingSection from './sections/PackagingSection.jsx'`, lalu ganti baris `{roles.ABATTOIR && <SlaughterSection />}` dengan:

```jsx
          {roles.ABATTOIR && <SlaughterSection />}
          {roles.ABATTOIR && <PackagingSection account={wallet.account} />}
```

- [ ] **Step 4: Verifikasi dan commit**

Run: `cd frontend && npm test && npm run build`
Expected: test lulus, build berhasil.

```bash
git add frontend/src
git commit -m "feat: pembuatan kemasan dengan batas berat dan label QR siap cetak"
```

---

### Task 6: Pencatatan pengiriman

**Files:**
- Create: `frontend/src/sections/DistributorSection.jsx`
- Modify: `frontend/src/hooks.js` (tambah `usePackages`), `frontend/src/InternalPanel.jsx`

**Interfaces:**
- Consumes: `readRegistry`, `isRevert`, `errorMessage` (Task 3); `parseIdList`, `resolveTimestamp` (Task 2).
- Produces: `usePackages(ids: string[]) → { status: 'idle'|'loading'|'ok'|'error', items: [{ id, found: boolean, pkg? }], message, reload }`

- [ ] **Step 1: Tambah `usePackages` di akhir `frontend/src/hooks.js`**

```js
/** Data beberapa kemasan sekaligus untuk pratinjau pengiriman. Kemasan yang tidak ada -> found: false. */
export function usePackages(ids) {
  const key = ids.join(',')
  const [state, setState] = useState({ status: 'idle', items: [] })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!key) return setState({ status: 'idle', items: [] })
    let cancelled = false
    setState({ status: 'loading', items: [] })
    const ct = readRegistry()
    Promise.all(
      key.split(',').map((id) =>
        ct.getPackageTrace(id).then(
          ([pkg]) => ({ id, found: true, pkg }),
          (err) => {
            if (isRevert(err, 'PackageNotFound')) return { id, found: false }
            throw err
          },
        ),
      ),
    )
      .then((items) => !cancelled && setState({ status: 'ok', items }))
      .catch((err) => !cancelled && setState({ status: 'error', items: [], message: errorMessage(err) }))
    return () => {
      cancelled = true
    }
  }, [key, nonce])

  return { ...state, reload: () => setNonce((n) => n + 1) }
}
```

- [ ] **Step 2: Buat `frontend/src/sections/DistributorSection.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Field, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { CUT_TYPE, PACKAGE_STATUS, formatDate, label, packageLabel, toDatetimeLocal } from '../format.js'
import { usePackages, useTx } from '../hooks.js'
import { readRegistry } from '../registry.js'
import { parseIdList, resolveTimestamp } from '../validation.js'

const CREATED = 0n

export default function DistributorSection() {
  const [text, setText] = useState('')
  const [at, setAt] = useState(() => toDatetimeLocal(new Date()))
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(null) // { ids, seconds }
  const [maxBatch, setMaxBatch] = useState(50)
  const tx = useTx()

  useEffect(() => {
    readRegistry().MAX_BATCH().then((n) => setMaxBatch(Number(n))).catch(() => {})
  }, [])

  const parsed = parseIdList(text, maxBatch)
  const lookup = usePackages(parsed.ids ?? [])
  const items = lookup.status === 'ok' ? lookup.items : []
  const missing = items.filter((i) => !i.found)
  const notReady = items.filter((i) => i.found && i.pkg.status !== CREATED)
  const minSeconds = items.reduce((m, i) => (i.found && i.pkg.packagedAt > m ? i.pkg.packagedAt : m), 0n)
  const time = resolveTimestamp(at, { minSeconds, nowSeconds: BigInt(Math.floor(Date.now() / 1000)), label: 'Waktu kirim' })

  const idsError =
    parsed.error ??
    (lookup.status === 'error' ? `Gagal membaca kemasan: ${lookup.message}` : null) ??
    (lookup.status !== 'ok' ? 'Menunggu data kemasan…' : null) ??
    (missing.length ? `Tidak ditemukan: ${missing.map((i) => packageLabel(i.id)).join(', ')}.` : null) ??
    (notReady.length ? `Sudah dikirim: ${notReady.map((i) => packageLabel(i.id)).join(', ')}.` : null)
  const err = (e) => (touched ? e : null)

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (idsError) return document.getElementById('ship-ids')?.focus()
    if (time.error) return document.getElementById('ship-at')?.focus()
    tx.reset()
    setReview({ ids: parsed.ids, seconds: time.seconds })
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) => ct.recordShipping(review.ids, review.seconds))
    setReview(null)
    if (receipt) {
      lookup.reload()
      setTouched(false)
    }
  }

  return (
    <Section badge="Distributor" title="Catat pengiriman" lead="Satu transaksi bisa mencatat beberapa kemasan sekaligus.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={!!review} className="space-y-5">
          <Field id="ship-ids" label="ID kemasan" error={err(idsError)} hint={`Pisahkan dengan koma, misalnya 1, 2, 5. Maksimal ${maxBatch}.`}>
            <input {...fieldProps('ship-ids', err(idsError), { placeholder: 'contoh: 1, 2, 5', autoComplete: 'off' })} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>

          {items.length > 0 && (
            <ul className="divide-y divide-divider rounded-lg border border-divider text-sm" aria-label="Kemasan yang dipilih">
              {items.map((i) => (
                <li key={i.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                  <span className="font-medium">{packageLabel(i.id)}</span>
                  {i.found ? (
                    <span className={i.pkg.status === CREATED ? 'text-muted' : ''} style={i.pkg.status === CREATED ? undefined : { color: 'var(--color-danger)' }}>
                      {label(CUT_TYPE, i.pkg.cutType)} · {Number(i.pkg.weightGrams).toLocaleString('id-ID')} g · {label(PACKAGE_STATUS, i.pkg.status)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-danger)' }}>Tidak ditemukan</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Field id="ship-at" label="Waktu kirim" error={err(time.error)}>
            <input {...fieldProps('ship-at', err(time.error), { type: 'datetime-local', max: toDatetimeLocal(new Date()) })} value={at} onChange={(e) => setAt(e.target.value)} />
          </Field>
        </fieldset>

        {review ? (
          <Review
            rows={[
              ['Kemasan', review.ids.map(packageLabel).join(', ')],
              ['Jumlah', String(review.ids.length)],
              ['Waktu kirim', formatDate(review.seconds)],
            ]}
            status={tx.state.status}
            onConfirm={confirm}
            onCancel={() => setReview(null)}
          />
        ) : (
          <button type="submit" className="btn btn-primary">Lanjut ke ringkasan</button>
        )}
      </form>
      <TxStatus tx={tx.state} />
    </Section>
  )
}
```

- [ ] **Step 3: Pasang di `InternalPanel.jsx`**

Tambah `import DistributorSection from './sections/DistributorSection.jsx'`, dan di dalam `<fieldset>` setelah baris `PackagingSection` tambahkan:

```jsx
          {roles.DISTRIBUTOR && <DistributorSection />}
```

- [ ] **Step 4: Verifikasi dan commit**

Run: `cd frontend && npm test && npm run build`
Expected: test lulus, build berhasil.

```bash
git add frontend/src
git commit -m "feat: pencatatan pengiriman beberapa kemasan sekaligus"
```

---

### Task 7: Halaman konsumen

**Files:**
- Create: `frontend/src/TracePage.jsx`
- Modify: `frontend/src/registry.js` (tambah `findStepTxs`), `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `readRegistry`, `isRevert`, `errorMessage`, `NETWORK`, `readProvider`, `txUrl`, `addressUrl`, `isDeployed`, `scanUrl` (Task 3); format (Task 2); `parseId` (Task 2).
- Produces: `findStepTxs(cattleId, packageId) → Promise<{ registered, slaughtered, packaged, shipped }>` (hash tx atau null); `TracePage({ id: string | null })`.

- [ ] **Step 1: Tambah `findStepTxs` di akhir `frontend/src/registry.js`**

Tambah `blockRanges` ke import dari `./format.js`, lalu:

```js
/**
 * Hash transaksi tiap tahap untuk tautan verifikasi, dari event yang di-index per ID.
 * ponytail: rentang log dipecah per 10.000 blok karena batas RPC publik; jumlah permintaan
 * bertambah seiring umur contract (~4 per hari di Amoy). Kalau terasa lambat, simpan blok
 * tiap tahap di contract v2 supaya tidak perlu memindai log.
 */
export async function findStepTxs(cattleId, packageId) {
  const provider = readProvider()
  const ct = new Contract(NETWORK.address, abi, provider)
  const ranges = blockRanges(NETWORK.deployBlock, await provider.getBlockNumber(), 10_000)
  const first = async (filter) => {
    const chunks = await Promise.all(ranges.map(([from, to]) => ct.queryFilter(filter, from, to)))
    return chunks.flat()[0]?.transactionHash ?? null
  }
  const [registered, slaughtered, packaged, shipped] = await Promise.all([
    first(ct.filters.CattleRegistered(cattleId)),
    first(ct.filters.CattleSlaughtered(cattleId)),
    first(ct.filters.PackageCreated(packageId)),
    first(ct.filters.PackageShipped(packageId)),
  ])
  return { registered, slaughtered, packaged, shipped }
}
```

- [ ] **Step 2: Buat `frontend/src/TracePage.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { NETWORK, addressUrl, isDeployed, scanUrl, txUrl } from './chain.js'
import {
  CUT_TYPE, FEED_TYPE, GRADE, PACKAGE_STATUS, SLAUGHTER_METHOD, bytes32ToText, cattleLabel, formatDate, freshnessText,
  label, packageLabel, shortAddress,
} from './format.js'
import { errorMessage, findStepTxs, isRevert, readRegistry } from './registry.js'

const SHIPPED = 1n

/**
 * Halaman yang dibuka konsumen setelah memindai QR. Dibaca lewat RPC publik — tanpa
 * wallet, tanpa biaya. Urutan mengikuti pertanyaan konsumen: kemasan apa, halal atau tidak,
 * seberapa segar, dari mana asalnya, dan bagaimana membuktikannya sendiri.
 */
export default function TracePage({ id }) {
  const [state, setState] = useState({ status: 'loading' })
  const [txs, setTxs] = useState(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!isDeployed() || !id) return
    let cancelled = false
    setState({ status: 'loading' })
    setTxs(null)
    readRegistry()
      .getPackageTrace(id)
      .then(([pkg, cattle]) => {
        if (cancelled) return
        setState({ status: 'ok', pkg, cattle })
        // Tautan tx dimuat setelah data utama tampil, supaya RPC yang lambat tidak menahan halaman.
        findStepTxs(cattle.cattleId, pkg.packageId)
          .then((t) => !cancelled && setTxs(t))
          .catch(() => !cancelled && setTxs('failed'))
      })
      .catch((err) => {
        if (cancelled) return
        setState(isRevert(err, 'PackageNotFound') ? { status: 'notfound' } : { status: 'error', message: errorMessage(err) })
      })
    return () => {
      cancelled = true
    }
  }, [id, nonce])

  let body
  if (!isDeployed()) body = <Message title="Belum tersedia">Contract HalalChain Trace v1 belum di-deploy ke {NETWORK.name}.</Message>
  else if (!id || state.status === 'notfound') body = <NotFound id={id} />
  else if (state.status === 'loading') body = <Loading />
  else if (state.status === 'error') body = <LoadError message={state.message} onRetry={() => setNonce((n) => n + 1)} />
  else body = <Trace pkg={state.pkg} cattle={state.cattle} txs={txs} />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-divider bg-surface">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-5">
          <Seal className="h-5 w-5 text-primary" />
          <span className="font-display text-[15px] font-semibold tracking-tight">HalalChain Trace</span>
          <a href={scanUrl()} className="tap ml-auto text-sm font-medium text-primary underline underline-offset-4">
            Pindai QR lain
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-8 sm:pt-12">{body}</main>
    </div>
  )
}

function Trace({ pkg, cattle, txs }) {
  const shipped = pkg.status === SHIPPED
  const steps = [
    {
      title: 'Terdaftar di peternakan',
      date: cattle.registeredAt,
      actorRole: 'Peternak',
      actor: cattle.farmer,
      tx: txs?.registered,
      facts: [
        ['Kode peternakan', bytes32ToText(cattle.farmId)],
        ['Umur', `${cattle.ageInMonths} bulan`],
        ['Berat hidup', `${cattle.liveWeightKg} kg`],
        ['Grade', label(GRADE, cattle.grade)],
        ['Pakan', label(FEED_TYPE, cattle.feedType)],
      ],
    },
    { title: 'Disembelih di RPH', date: cattle.slaughteredAt, actorRole: 'RPH', actor: cattle.abattoir, tx: txs?.slaughtered },
    { title: 'Dikemas', date: pkg.packagedAt, actorRole: 'RPH', actor: cattle.abattoir, tx: txs?.packaged },
    { title: 'Dikirim distributor', date: pkg.shippedAt, actorRole: 'Distributor', actor: shipped ? pkg.distributor : null, tx: txs?.shipped },
  ]

  return (
    <div className="stagger space-y-10">
      <section>
        <p className="eyebrow">Kemasan</p>
        <h1 className="font-display mt-2 text-4xl font-bold leading-none tnum sm:text-5xl">{packageLabel(pkg.packageId)}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-display text-lg font-semibold">
            {label(CUT_TYPE, pkg.cutType)} · {Number(pkg.weightGrams).toLocaleString('id-ID')} g
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            {label(PACKAGE_STATUS, pkg.status)}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted">Dari sapi {cattleLabel(cattle.cattleId)} · disembelih {freshnessText(cattle.slaughteredAt)}</p>
      </section>

      <section className="card px-6 py-6" aria-labelledby="halal-title">
        <div className="flex items-center gap-2.5">
          <Seal className="h-6 w-6 text-primary" />
          <h2 id="halal-title" className="font-display text-xl font-semibold tracking-tight">Data penyembelihan halal</h2>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Fact term="Nomor sertifikat halal" value={bytes32ToText(cattle.halalCertNo)} mono />
          <Fact term="ID juru sembelih" value={bytes32ToText(cattle.slaughtermanId)} mono />
          <Fact term="Metode" value={label(SLAUGHTER_METHOD, cattle.slaughterMethod)} />
        </dl>
        <p className="mt-5 border-t border-divider pt-4 text-sm leading-relaxed text-muted">
          Sistem ini mencatat klaim RPH secara permanen, bukan menerbitkan sertifikasi. Penilaian sah tidaknya
          penyembelihan tetap wewenang lembaga sertifikasi halal.
        </p>
      </section>

      <section>
        <h2 className="font-display mb-5 text-xl font-semibold tracking-tight">Perjalanan kemasan</h2>
        <ol>
          {steps.map((s, i) => (
            <Step key={s.title} n={i + 1} step={s} done={BigInt(s.date) !== 0n} last={i === steps.length - 1} txsFailed={txs === 'failed'} />
          ))}
        </ol>
      </section>

      <Provenance />
    </div>
  )
}

function Fact({ term, value, mono }) {
  return (
    <div>
      <dt className="eyebrow">{term}</dt>
      <dd className={`mt-1.5 break-words text-lg font-semibold ${mono ? 'font-mono text-base' : 'font-display'}`}>{value}</dd>
    </div>
  )
}

function Step({ n, step, done, last, txsFailed }) {
  const actorUrl = step.actor ? addressUrl(step.actor) : null
  const url = step.tx ? txUrl(step.tx) : null
  return (
    <li className="relative flex gap-5 pb-8 last:pb-0">
      {!last && <span aria-hidden className={`absolute left-4 top-9 bottom-1 w-px ${done ? 'bg-primary/30' : 'bg-divider'}`} />}
      <span
        className={`font-display relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
          done ? 'bg-primary text-on-primary' : 'border border-border bg-surface text-muted'
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-display text-[17px] font-semibold leading-snug ${done ? '' : 'text-muted'}`}>{step.title}</p>
        {!done ? (
          <p className="mt-1 text-sm text-muted">Belum dikirim</p>
        ) : (
          <>
            <p className="mt-1 text-sm font-medium tnum text-muted">{formatDate(step.date)}</p>
            {step.facts && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                {step.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                <span className="eyebrow mr-2">{step.actorRole}</span>
                {actorUrl ? (
                  <a href={actorUrl} target="_blank" rel="noreferrer" className="font-mono font-medium text-primary underline underline-offset-4">
                    {shortAddress(step.actor)}
                  </a>
                ) : (
                  <span className="font-mono">{shortAddress(step.actor)}</span>
                )}
              </span>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="tap font-medium text-primary underline underline-offset-4">
                  Lihat transaksi
                </a>
              ) : step.tx ? (
                <span className="break-all font-mono text-xs text-muted">tx {step.tx}</span>
              ) : (
                !txsFailed && <span className="text-xs text-muted">Mencari transaksi…</span>
              )}
            </p>
          </>
        )}
      </div>
    </li>
  )
}

function Provenance() {
  const url = addressUrl(NETWORK.address)
  return (
    <section className="rounded-xl border border-divider bg-warn-bg px-5 py-5">
      <h2 className="eyebrow" style={{ color: 'var(--color-warn-text)' }}>Cara memverifikasi sendiri</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed">
        Data ini dibaca langsung dari smart contract di jaringan {NETWORK.name}. Siapa pun dapat memeriksanya di block
        explorer tanpa mempercayai situs ini.
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="tap mt-2 break-all font-mono text-xs font-medium underline underline-offset-4" style={{ color: 'var(--color-warn-text)' }}>
          {NETWORK.address}
        </a>
      ) : (
        <p className="mt-2 break-all font-mono text-xs">{NETWORK.address}</p>
      )}
    </section>
  )
}

function Loading() {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <span className="sr-only">Memuat data kemasan dari blockchain</span>
      <div aria-hidden className="space-y-3">
        <div className="h-3 w-24 rounded bg-divider" />
        <div className="h-12 w-64 animate-pulse rounded-lg bg-divider" />
      </div>
      <div aria-hidden className="h-40 animate-pulse rounded-xl bg-divider/70" />
      <div aria-hidden className="h-64 animate-pulse rounded-xl bg-divider/50" />
    </div>
  )
}

function Message({ title, children, action }) {
  return (
    <div className="animate-rise card px-6 py-12 text-center" role="status">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted">{children}</p>
      {action}
    </div>
  )
}

function NotFound({ id }) {
  return (
    <Message title={id ? `Kemasan ${packageLabel(id)} tidak ditemukan` : 'Kemasan tidak ditemukan'}>
      QR ini tidak cocok dengan kemasan mana pun — bisa jadi salah cetak atau palsu. Jangan percaya klaim di label ini.
    </Message>
  )
}

function LoadError({ message, onRetry }) {
  return (
    <Message
      title="Gagal memuat data"
      action={
        <button onClick={onRetry} className="btn btn-ghost mt-6">
          Coba lagi
        </button>
      }
    >
      Tidak bisa menghubungi jaringan {NETWORK.name}. Periksa koneksi internet, lalu coba lagi.
      <span className="mt-3 block break-all font-mono text-xs">{message}</span>
    </Message>
  )
}

/* ---------- ikon SVG inline (tanpa dependency icon set) ---------- */

function Check(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Seal(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 2.5l2.4 1.5 2.8-.3 1 2.7 2.3 1.7-1 2.7 1 2.7-2.3 1.7-1 2.7-2.8-.3L12 21.5l-2.4-1.6-2.8.3-1-2.7-2.3-1.7 1-2.7-1-2.7 2.3-1.7 1-2.7 2.8.3L12 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.5 12l2.4 2.4 4.6-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

- [ ] **Step 3: Arahkan `?trace=` di `App.jsx`**

Ganti isi `App.jsx` dengan:

```jsx
import InternalPanel from './InternalPanel.jsx'
import TracePage from './TracePage.jsx'
import { parseId } from './validation.js'

/**
 * Halaman dipilih dari query param, tanpa router — GitHub Pages tidak punya SPA rewrite,
 * jadi "/repo/?param" selalu mengenai index.html.
 *
 *   ?trace=5  halaman konsumen kemasan #5 (tujuan QR). Nilai tidak valid -> "tidak ditemukan".
 *   ?scan=1   scanner QR                                — Task 8
 *   (tanpa)   panel internal, butuh MetaMask
 */
export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('trace')) return <TracePage id={parseId(params.get('trace'))} />
  return <InternalPanel />
}
```

- [ ] **Step 4: Verifikasi dan commit**

Run: `cd frontend && npm test && npm run build`
Expected: test lulus, build berhasil.

```bash
git add frontend/src
git commit -m "feat: halaman konsumen dengan data halal, linimasa, dan tautan verifikasi"
```

---

### Task 8: Scanner QR

**Files:**
- Create: `frontend/src/ScanPage.jsx`
- Modify: `frontend/package.json` + lockfile (dependency `html5-qrcode`), `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `scanTarget` (Task 2), `homeUrl` (Task 3).
- Produces: `ScanPage()`.

- [ ] **Step 1: Pasang dependency**

Run: `cd frontend && npm install html5-qrcode@^2.3.8`
Expected: `package.json` mendapat `"html5-qrcode": "^2.3.8"` di `dependencies`, tanpa error.

- [ ] **Step 2: Buat `frontend/src/ScanPage.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { scanTarget } from './validation.js'

const READER_ID = 'qr-reader'

/**
 * Pemindai kamera. Kamera baru diminta setelah pengguna menekan tombol (izin kamera harus
 * lewat gestur, dan menghindari start ganda React StrictMode). Hanya URL situs ini dengan
 * ?trace=N yang dibuka; selain itu ditolak supaya QR palsu tidak bisa mengarahkan ke situs
 * lain (SECURITY A9).
 */
export default function ScanPage() {
  const scanner = useRef(null)
  const [state, setState] = useState({ status: 'idle' }) // idle | starting | scanning | rejected | error

  const stop = async () => {
    const s = scanner.current
    scanner.current = null
    if (s?.isScanning) await s.stop().catch(() => {})
  }

  useEffect(() => () => void stop(), [])

  const start = async () => {
    setState({ status: 'starting' })
    const s = new Html5Qrcode(READER_ID)
    scanner.current = s
    try {
      await s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (text) => {
          const packageId = scanTarget(text, window.location.origin, import.meta.env.BASE_URL)
          await stop()
          if (packageId) window.location.assign(`${import.meta.env.BASE_URL}?trace=${packageId}`)
          else setState({ status: 'rejected' })
        },
        () => {}, // frame tanpa QR — normal, abaikan
      )
      setState({ status: 'scanning' })
    } catch (err) {
      scanner.current = null
      setState({ status: 'error', message: String(err?.message ?? err) })
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-divider bg-surface">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <span className="font-display text-[15px] font-semibold tracking-tight">HalalChain Trace</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-8">
        <p className="eyebrow">Pindai kemasan</p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">Arahkan kamera ke QR di label</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted">
          Kamera ponsel biasa juga bisa membuka QR ini langsung. Halaman ini untuk yang ingin memindai dari dalam situs.
        </p>

        <div id={READER_ID} className="mt-6 overflow-hidden rounded-xl border border-divider bg-surface" />

        <div className="mt-6" aria-live="polite">
          {(state.status === 'idle' || state.status === 'rejected' || state.status === 'error') && (
            <button className="btn btn-primary" onClick={start}>
              {state.status === 'idle' ? 'Mulai kamera' : 'Pindai lagi'}
            </button>
          )}
          {state.status === 'starting' && <p className="text-muted" role="status">Meminta izin kamera…</p>}
          {state.status === 'scanning' && (
            <button className="btn btn-ghost" onClick={async () => { await stop(); setState({ status: 'idle' }) }}>
              Hentikan kamera
            </button>
          )}
          {state.status === 'rejected' && (
            <p className="mt-4 rounded-lg border px-4 py-3 text-sm" role="alert" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              QR ini bukan label HalalChain Trace, jadi tidak dibuka. Waspadai label yang mengarahkan ke situs lain.
            </p>
          )}
          {state.status === 'error' && (
            <p className="mt-4 rounded-lg border px-4 py-3 text-sm" role="alert" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              Kamera tidak bisa dibuka. Pastikan izin kamera diberikan dan halaman dibuka lewat HTTPS. ({state.message})
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Arahkan `?scan=` di `App.jsx`**

Tambah `import ScanPage from './ScanPage.jsx'`, lalu tepat setelah baris `if (params.has('trace')) ...` tambahkan:

```jsx
  if (params.has('scan')) return <ScanPage />
```

dan ubah baris komentar `?scan=1   scanner QR                                — Task 8` menjadi `?scan=1   scanner QR kamera`.

- [ ] **Step 4: Verifikasi dan commit**

Run: `cd frontend && npm test && npm run build`
Expected: test lulus, build berhasil (peringatan ukuran chunk dari html5-qrcode boleh ada).

```bash
git add frontend/package.json frontend/package-lock.json frontend/src
git commit -m "feat: scanner QR kamera yang hanya membuka label HalalChain Trace"
```

---

### Task 9: Dokumentasi pemakaian dan status

**Files:**
- Modify: `docs/deployment-v1.md`, `docs/testing.md`, `docs/README.md`, `docs/ROADMAP.md`

- [ ] **Step 1: Tambah bagian di `docs/deployment-v1.md`**

Tambahkan tepat sebelum `## Contract`:

````markdown
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
````

- [ ] **Step 2: Tambah matriks uji v1 di `docs/testing.md`**

Ganti baris judul pertama `# Testing — Fase 5` dengan blok berikut (isi lama tetap di bawahnya sebagai arsip v0):

```markdown
# Testing

## v1.0 — frontend HalalChain Trace

Jalankan di node Hardhat lokal sesuai `docs/deployment-v1.md` bagian "Pengembangan lokal" (setelah deploy + seed). Setelah contract v1 ada di Amoy, ulangi baris A dan C di situs live.

Status: `[ ]` belum diuji · `✓` sesuai harapan · `✗` gagal (tulis apa yang terjadi)

### A. Alur bahagia

| # | Akun MetaMask | Aksi | Harapan | Status |
|---|---|---|---|---|
| A1 | #1 Peternak | Daftarkan sapi: umur 28, berat 460, Prime, Rumput, `FARM-TES-001` | Ringkasan tampil → tanda tangan → "ID sapi baru: HCT-C-000005" | `[ ]` |
| A2 | #2 RPH | Catat sembelih sapi 5 (waktu default, metode manual tanpa pemingsanan, `JULEHA-0042`, `ID00410000123`) | Sukses; pratinjau sapi berubah ke Disembelih | `[ ]` |
| A3 | #2 RPH | Buat 2 kemasan dari sapi 5: Sirloin 500 g, Brisket 1000 g | Dua label QR HCT-P-000006 dan HCT-P-000007 tampil | `[ ]` |
| A4 | — | Unduh PNG label HCT-P-000006 | File `label-HCT-P-000006.png` berisi QR + teks label | `[ ]` |
| A5 | #3 Distributor | Kirim `6, 7` | Sukses; pratinjau kedua kemasan berubah ke Dikirim | `[ ]` |
| A6 | tanpa wallet | Buka `?trace=6` | Kartu halal terisi, 4 langkah linimasa terisi, tautan/hash tx tiap langkah | `[ ]` |
| A7 | #0 Admin | Beri peran Peternak ke alamat akun #4, lalu cabut | Daftar "Peran saat ini" ikut berubah | `[ ]` |

### B. Penolakan

| # | Akun | Aksi | Harapan | Status |
|---|---|---|---|---|
| B1 | #1 Peternak | Umur 5 | Pesan inline "Umur harus antara 6 dan 120 bulan", MetaMask tidak muncul | `[ ]` |
| B2 | #2 RPH | Sembelih sapi 1 (sudah disembelih) | Pesan inline status, tombol tidak lanjut | `[ ]` |
| B3 | #2 RPH | Kemasan dari sapi 4 (belum disembelih) | "Sapi ini belum disembelih." | `[ ]` |
| B4 | #2 RPH | Kemasan sapi 3 total 400.000 g (8 × 50.000) | "melebihi sisa berat" | `[ ]` |
| B5 | #3 Distributor | Kirim `1` (sudah dikirim) | "Sudah dikirim: HCT-P-000001." | `[ ]` |
| B6 | #3 Distributor | Kirim `999` | "Tidak ditemukan: HCT-P-000999." | `[ ]` |
| B7 | #0 Admin | Cabut peran Admin dari akun #0 sendiri | Pesan contract "Admin terakhir tidak bisa dicabut…" | `[ ]` |
| B8 | akun #4 tanpa peran | Buka panel | Kartu "Wallet ini belum punya peran" | `[ ]` |
| B9 | siapa saja | Tolak tanda tangan di MetaMask | "Transaksi dibatalkan di MetaMask." | `[ ]` |
| B10 | siapa saja | MetaMask di jaringan lain | Banner "Jaringan salah", form terkunci, tombol pindah jaringan berfungsi | `[ ]` |

### C. Halaman konsumen dan scanner

| # | Aksi | Harapan | Status |
|---|---|---|---|
| C1 | Buka `?trace=4` | Langkah "Dikirim distributor" berstatus "Belum dikirim" | `[ ]` |
| C2 | Buka `?trace=999` dan `?trace=abc` | "Kemasan tidak ditemukan" + peringatan label palsu | `[ ]` |
| C3 | Matikan node, buka `?trace=1` | "Gagal memuat data" + tombol Coba lagi | `[ ]` |
| C4 | `?scan=1` di laptop, pindai label A4 | Pindah ke `?trace=6` | `[ ]` |
| C5 | `?scan=1`, pindai QR berisi URL situs lain | "QR ini bukan label HalalChain Trace", tidak dibuka | `[ ]` |
| C6 | Buka `?trace=1` di ponsel (lebar 375 px) | Tanpa geser horizontal, teks terbaca, target sentuh ≥ 44 px | `[ ]` |

## v0 (arsip) — Fase 5 purwarupa
```

- [ ] **Step 3: Perbarui `docs/README.md` bagian "Jalankan frontend"**

Ganti blok:

````markdown
### Jalankan frontend

```bash
cd frontend
npm run dev
```
````

dengan:

````markdown
### Jalankan frontend

`npm run dev` memakai node Hardhat lokal, jadi bisa dicoba tanpa POL. Langkah lengkapnya (node, deploy, seed, MetaMask) ada di `docs/deployment-v1.md` bagian "Pengembangan lokal".

```bash
cd frontend
npm install
npm test          # uji murni format, validasi, terjemahan error
npm run dev -- --port 5175
```
````

- [ ] **Step 4: Perbarui `docs/ROADMAP.md`**

- Baris status: `Status saat ini: **Fase 3 menunggu deploy ke Amoy (POL testnet belum ada); Fase 4 dan 5 selesai di jaringan lokal**`
- Fase 4: `**Status:** Selesai di jaringan lokal, menunggu deploy Amoy untuk checkpoint explorer`. Centang semua item kecuali `Tampilkan tautan block explorer setelah transaksi berhasil` (di lokal hanya hash; tautan aktif otomatis di Amoy). Ganti `Terapkan token dari \`DESIGN-SYSTEM.md\`` menjadi `Terapkan token dari \`design-system/traceability-sapi/MASTER.md\``.
- Fase 5: `**Status:** Selesai di jaringan lokal`. Centang semua item kecuali `Halaman cetak label berisi beberapa QR sekaligus` (tidak dipilih) dan `Uji buka halaman di ponsel tanpa wallet terpasang` (menunggu situs live). Ganti `Rute publik \`/trace/:packageId\`` menjadi `Rute publik \`?trace=<packageId>\` (query param karena GitHub Pages)`.

- [ ] **Step 5: Commit**

```bash
git add docs/deployment-v1.md docs/testing.md docs/README.md docs/ROADMAP.md
git commit -m "docs: panduan pengembangan lokal, matriks uji v1, dan status Fase 4-5"
```

---

### Task 10: Verifikasi end-to-end di browser (dijalankan controller)

Bukan untuk subagent implementer: butuh alat browser pratinjau. Controller menjalankan node + deploy + seed + dev server, menyisipkan penyedia EIP-1193 sementara lewat alat debugging (meneruskan `eth_requestAccounts`, `eth_accounts`, `eth_chainId`, `eth_sendTransaction`, dan panggilan baca ke `http://127.0.0.1:8545`, dengan akun node yang sudah ter-unlock), lalu menjalankan baris A1-A7, B1-B8, C1-C2, C6 dari `docs/testing.md` lewat UI. Sisipan tidak pernah ditulis ke kode sumber. Temuan dikirim sebagai perbaikan ke implementer; baris yang lulus dicentang di `docs/testing.md` dengan catatan "diuji di browser pratinjau dengan penyedia uji, bukan MetaMask".
