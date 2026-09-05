# Dashboard Statistik — Implementation Plan (Fase 1)

> **Untuk pengerjaan oleh agen:** WAJIB pakai sub-skill `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi plan ini task demi task.
> Setiap langkah memakai checkbox (`- [ ]`) untuk penanda kemajuan.

**Goal:** Menambahkan halaman dashboard publik (`?dashboard=1`) yang meringkas seluruh data
sapi on-chain: total & corong tahapan, sebaran grade, rata-rata durasi proses, dan daftar
sapi terbaru.

**Architecture:** Murni penambahan di frontend — smart contract tidak disentuh sama sekali.
Daftar sapi dikumpulkan dari log event `CattleRegistered` (contract tidak menyimpan daftar
id), lalu tiap id dibaca detailnya lewat `getRecord`. Logika agregasi dipisah ke modul murni
tanpa jaringan agar bisa diuji dengan skrip node, mengikuti pola `scripts/check.mjs` yang
sudah ada.

**Tech Stack:** React 18, Vite 6, Tailwind CSS v4, ethers v6. Tanpa dependency baru.

**Spec:** `docs/prd.md` — fitur F1, Fase 1.

## Global Constraints

- **Tanpa dependency baru.** Tidak ada library chart; grafik dibuat dengan CSS/SVG biasa.
- **Sistem desain:** token dan kelas di `frontend/src/index.css` adalah sumber kebenaran
  (palet hijau "Citizen Science"). Perhatikan: tabel warna oranye di
  `design-system/traceability-sapi/MASTER.md` **sudah di-override** oleh index.css — pakai
  yang di index.css. Kelas siap pakai: `card`, `btn`, `btn-primary`, `btn-ghost`, `field`,
  `eyebrow`, `tnum`, `tap`, `stagger`, `animate-rise`.
- **Warna hanya lewat token:** `text-muted`, `text-primary`, `bg-surface`, `bg-primary-soft`,
  `border-divider`, `border-border`, `bg-warn-bg`, `text-on-primary`, `bg-bg`. Jangan
  menuliskan nilai hex langsung.
- **Bahasa antarmuka: Indonesia.** Semua label, pesan galat, dan status.
- **Aksesibilitas:** target sentuh ≥44px (kelas `tap`/`btn`), status muat memakai
  `role="status"` + `aria-live="polite"`, grafik wajib punya padanan teks (angka tertulis,
  bukan hanya panjang batang). Jangan hapus cincin fokus.
- **Read-only:** halaman ini tidak pernah memanggil `window.ethereum`. Tanpa wallet.
- **Bilangan on-chain adalah `bigint`.** Jangan campur `bigint` dengan `number` dalam
  operasi aritmatika — konversi eksplisit dengan `Number()`.
- **Commit** di akhir tiap task, pesan bahasa Indonesia berformat `feat:` / `test:` / `chore:`.

## Fakta terverifikasi (sudah diuji langsung ke chain)

| Fakta | Nilai |
|---|---|
| Alamat contract | `0x3B32AfD1D507d4312c9Dc09563a4Ee8C6B57d34D` |
| Blok deploy | `46758635` |
| Batas `eth_getLogs` RPC publik | **10.000 blok per permintaan** — rentang penuh ditolak kedua RPC |
| Data saat ini | 1 sapi: `#1`, grade `A`, umur `24`, reg `1788581465`, potong `1788581815`, kirim `1788581958` |

---

## Struktur file

| File | Status | Tanggung jawab |
|---|---|---|
| `frontend/src/stats.js` | Baru | Agregasi murni: record → angka dashboard. Tanpa jaringan, tanpa React |
| `frontend/src/contract.js` | Ubah | Tambah event ke ABI, konstanta blok deploy, dan `fetchAllCattle()` |
| `frontend/src/DashboardPage.jsx` | Baru | Seluruh tampilan dashboard |
| `frontend/src/App.jsx` | Ubah | Rute `?dashboard=1` |
| `scripts/check-stats.mjs` | Baru | Uji `stats.js` dengan data buatan (cepat, tanpa jaringan) |
| `scripts/check.mjs` | Ubah | Tambah verifikasi `fetchAllCattle()` ke chain sungguhan |
| `frontend/package.json` | Ubah | Skrip `check:stats` |

---

## Task 1: Modul agregasi murni (`stats.js`)

**Files:**
- Create: `frontend/src/stats.js`
- Create: `scripts/check-stats.mjs`
- Modify: `frontend/package.json` (tambah skrip `check:stats`)

**Interfaces:**
- Consumes: tidak ada (task pertama)
- Produces:
  - `stageOf(rec) -> 0 | 1 | 2` (0 terdaftar, 1 disembelih, 2 dikirim)
  - `summarize(records) -> { total, funnel: {registered, slaughtered, shipped}, grades: Array<{grade, count}>, avgToSlaughter: number|null, avgToShip: number|null, recent: Array<rec> }`
  - `formatDuration(seconds) -> string | null`
  - Konstanta `STAGE = { REGISTERED: 0, SLAUGHTERED: 1, SHIPPED: 2 }`

- [ ] **Step 1: Tulis skrip uji yang gagal**

Buat `scripts/check-stats.mjs`:

```js
// Uji modul agregasi murni — tanpa jaringan, jalan dalam milidetik.
//
//   node scripts/check-stats.mjs
import assert from 'node:assert/strict'
import { STAGE, formatDuration, stageOf, summarize } from '../frontend/src/stats.js'

// Record buatan yang meniru bentuk hasil ethers: field bigint, diakses lewat nama.
// Angka dipilih bulat agar rata-ratanya mudah diperiksa: +1 jam, lalu +2 jam.
const sapiLengkap = {
  id: 1n, age: 24n, feedType: 'Rumput', grade: 'A',
  registeredDate: 1_000_000n, slaughterDate: 1_003_600n, shippedDate: 1_010_800n,
}
const sapiDisembelih = {
  id: 2n, age: 30n, feedType: 'Silase', grade: 'B',
  registeredDate: 2_000_000n, slaughterDate: 2_003_600n, shippedDate: 0n,
}
const sapiBaru = {
  id: 3n, age: 18n, feedType: 'Rumput', grade: 'A',
  registeredDate: 3_000_000n, slaughterDate: 0n, shippedDate: 0n,
}

// --- stageOf ---
assert.equal(stageOf(sapiBaru), STAGE.REGISTERED, 'sapi tanpa tanggal potong = tahap terdaftar')
assert.equal(stageOf(sapiDisembelih), STAGE.SLAUGHTERED, 'ada tanggal potong, belum kirim')
assert.equal(stageOf(sapiLengkap), STAGE.SHIPPED, 'sudah ada tanggal kirim')

// --- summarize ---
const s = summarize([sapiLengkap, sapiDisembelih, sapiBaru])

assert.equal(s.total, 3, 'total sapi')
// Corong bersifat kumulatif: yang sudah dikirim ikut terhitung sudah disembelih.
assert.deepEqual(s.funnel, { registered: 3, slaughtered: 2, shipped: 1 }, 'corong tahapan')

assert.deepEqual(
  s.grades,
  [{ grade: 'A', count: 2 }, { grade: 'B', count: 1 }],
  'sebaran grade, urut dari terbanyak',
)

assert.equal(s.avgToSlaughter, 3600, 'rata-rata daftar->potong = 1 jam')
assert.equal(s.avgToShip, 7200, 'rata-rata potong->kirim = 2 jam (hanya 1 sapi yang punya data)')

assert.deepEqual(s.recent.map((r) => r.id), [3n, 2n, 1n], 'terbaru dulu berdasarkan tanggal daftar')

// Kumpulan kosong tidak boleh melempar galat — dashboard harus tetap bisa dirender.
const kosong = summarize([])
assert.equal(kosong.total, 0)
assert.equal(kosong.avgToSlaughter, null, 'tanpa data, rata-rata harus null bukan NaN')
assert.deepEqual(kosong.grades, [])

// --- formatDuration ---
assert.equal(formatDuration(null), null, 'null tetap null')
assert.equal(formatDuration(45), '45 detik')
assert.equal(formatDuration(350), '6 menit')
assert.equal(formatDuration(3600), '1 jam')
assert.equal(formatDuration(5400), '1 jam 30 menit')
assert.equal(formatDuration(86_400), '1 hari')
assert.equal(formatDuration(97_200), '1 hari 3 jam')

console.log('OK — stats.js: stageOf, summarize, formatDuration sesuai harapan')
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

```bash
node scripts/check-stats.mjs
```

Diharapkan: GAGAL dengan `ERR_MODULE_NOT_FOUND` — `frontend/src/stats.js` belum ada.

- [ ] **Step 3: Tulis implementasi**

Buat `frontend/src/stats.js`:

```js
/**
 * Agregasi data sapi untuk dashboard.
 *
 * Murni: tanpa jaringan, tanpa React, tanpa bigint bocor ke luar. Dipisah dari
 * pengambilan data supaya bisa diuji cepat dengan node (scripts/check-stats.mjs).
 */

export const STAGE = { REGISTERED: 0, SLAUGHTERED: 1, SHIPPED: 2 }

/** Tahap terjauh yang sudah dicapai satu sapi. Tanggal 0 berarti tahap belum terjadi. */
export function stageOf(rec) {
  if (rec.shippedDate !== 0n) return STAGE.SHIPPED
  if (rec.slaughterDate !== 0n) return STAGE.SLAUGHTERED
  return STAGE.REGISTERED
}

const average = (xs) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null

/** Semua angka yang dibutuhkan dashboard, dihitung sekali dari daftar record. */
export function summarize(records) {
  const funnel = { registered: 0, slaughtered: 0, shipped: 0 }
  const gradeCount = new Map()
  const toSlaughter = []
  const toShip = []

  for (const rec of records) {
    const stage = stageOf(rec)

    // Kumulatif: sapi yang sudah dikirim juga terhitung sudah disembelih & terdaftar,
    // sehingga corongnya selalu menurun dan mudah dibaca.
    funnel.registered += 1
    if (stage >= STAGE.SLAUGHTERED) funnel.slaughtered += 1
    if (stage >= STAGE.SHIPPED) funnel.shipped += 1

    const grade = rec.grade || '—'
    gradeCount.set(grade, (gradeCount.get(grade) ?? 0) + 1)

    if (rec.slaughterDate !== 0n) {
      toSlaughter.push(Number(rec.slaughterDate - rec.registeredDate))
    }
    if (rec.shippedDate !== 0n) {
      toShip.push(Number(rec.shippedDate - rec.slaughterDate))
    }
  }

  const grades = [...gradeCount]
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count || a.grade.localeCompare(b.grade))

  const recent = [...records].sort((a, b) =>
    Number(b.registeredDate - a.registeredDate),
  )

  return {
    total: records.length,
    funnel,
    grades,
    avgToSlaughter: average(toSlaughter),
    avgToShip: average(toShip),
    recent,
  }
}

/** Detik -> teks Indonesia yang mudah dibaca. null kalau memang tidak ada datanya. */
export function formatDuration(seconds) {
  if (seconds == null) return null

  const s = Math.round(seconds)
  if (s < 60) return `${s} detik`

  const totalMinutes = Math.round(s / 60)
  if (totalMinutes < 60) return `${totalMinutes} menit`

  const totalHours = Math.floor(s / 3600)
  if (totalHours < 24) {
    const minutes = Math.round((s % 3600) / 60)
    return minutes ? `${totalHours} jam ${minutes} menit` : `${totalHours} jam`
  }

  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return hours ? `${days} hari ${hours} jam` : `${days} hari`
}
```

- [ ] **Step 4: Tambahkan skrip npm**

Di `frontend/package.json`, pada objek `"scripts"`, tambahkan satu baris setelah `"check"`:

```json
    "check": "node ../scripts/check.mjs",
    "check:stats": "node ../scripts/check-stats.mjs"
```

- [ ] **Step 5: Jalankan untuk memastikan lulus**

```bash
cd frontend && npm run check:stats
```

Diharapkan: `OK — stats.js: stageOf, summarize, formatDuration sesuai harapan`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stats.js scripts/check-stats.mjs frontend/package.json
git commit -m "feat: modul agregasi statistik sapi + uji murni tanpa jaringan"
```

---

## Task 2: Pengambilan data dari chain (`fetchAllCattle`)

**Files:**
- Modify: `frontend/src/contract.js`
- Modify: `scripts/check.mjs`

**Interfaces:**
- Consumes: konstanta `ADDRESS`, `RPC`, `ABI`, dan fungsi `readContract()` yang sudah ada di `contract.js`
- Produces:
  - `DEPLOY_BLOCK` — number, blok tempat contract di-deploy
  - `fetchAllCattle() -> Promise<Array<record>>` — seluruh sapi yang pernah didaftarkan,
    tiap elemen berbentuk sama dengan hasil `getRecord()` (field bigint diakses lewat nama)

- [ ] **Step 1: Tulis uji yang gagal**

Di `scripts/check.mjs`, tambahkan di bagian import — ubah baris import menjadi:

```js
import { ADDRESS, fetchAllCattle, readContract } from '../frontend/src/contract.js'
```

Lalu tambahkan sebelum baris `console.log` terakhir:

```js
// fetchAllCattle harus menemukan sapi lewat log event, bukan menebak id.
const semua = await fetchAllCattle()
assert.ok(semua.length >= 1, 'minimal ada 1 sapi yang pernah didaftarkan')
assert.ok(
  semua.some((r) => r.id === 1n && r.grade === 'A'),
  'sapi id 1 (grade A) harus ikut terambil oleh fetchAllCattle',
)
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

```bash
cd frontend && npm run check
```

Diharapkan: GAGAL — `fetchAllCattle is not a function` (belum diekspor dari `contract.js`).

- [ ] **Step 3: Tambahkan event ke ABI**

Di `frontend/src/contract.js`, pada array `ABI`, tambahkan satu baris di bagian atas array
(sebelum baris `'function registerCattle...'`):

```js
export const ABI = [
  // Event dibutuhkan dashboard untuk mengumpulkan daftar id sapi — contract tidak
  // menyimpan daftarnya, jadi satu-satunya sumber adalah log event.
  'event CattleRegistered(uint256 indexed id, address indexed by, uint256 at)',
  'function registerCattle(uint256 id, uint256 age, string feedType, string grade)',
```

- [ ] **Step 4: Tambahkan konstanta dan fungsi pengambilan data**

Di `frontend/src/contract.js`, tambahkan tepat setelah baris `export const EXPLORER = ...`:

```js
// Blok tempat contract di-deploy (docs/deployment.md). Titik awal penelusuran log —
// tidak perlu memindai dari blok 0.
export const DEPLOY_BLOCK = 46758635
```

Lalu tambahkan setelah fungsi `readContract()`:

```js
/**
 * Seluruh sapi yang pernah didaftarkan, lengkap dengan detailnya.
 *
 * Contract tidak menyimpan daftar id, jadi id dikumpulkan dari log event
 * CattleRegistered lalu tiap id dibaca detailnya lewat getRecord.
 *
 * ponytail: RPC publik menolak eth_getLogs dengan rentang >10.000 blok, jadi rentang
 * dipecah dan seluruh potongan diminta sekaligus. Jumlah permintaan bertambah ~4 per hari
 * sejak deploy (Amoy ~2 detik/blok). Untuk skala tugas ini masih hitungan milidetik; kalau
 * kelak terasa lambat, tambahkan penghitung id di contract v2 (Fase 2) supaya daftar sapi
 * bisa dibaca langsung tanpa memindai log.
 */
export async function fetchAllCattle() {
  const provider = new JsonRpcProvider(RPC)
  const ct = new Contract(ADDRESS, ABI, provider)
  const latest = await provider.getBlockNumber()
  const MAX_RANGE = 10_000

  const ranges = []
  for (let from = DEPLOY_BLOCK; from <= latest; from += MAX_RANGE) {
    ranges.push([from, Math.min(from + MAX_RANGE - 1, latest)])
  }

  const chunks = await Promise.all(
    ranges.map(([from, to]) =>
      ct.queryFilter(ct.filters.CattleRegistered(), from, to),
    ),
  )

  const ids = chunks.flat().map((log) => log.args.id)
  return Promise.all(ids.map((id) => ct.getRecord(id)))
}
```

- [ ] **Step 5: Jalankan untuk memastikan lulus**

```bash
cd frontend && npm run check
```

Diharapkan: LULUS — `OK — contract 0x3B32... cocok dengan ABI di frontend/src/contract.js`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/contract.js scripts/check.mjs
git commit -m "feat: fetchAllCattle - kumpulkan seluruh sapi dari log event"
```

---

## Task 3: Halaman dashboard — kerangka, rute, dan ringkasan

**Files:**
- Create: `frontend/src/DashboardPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `fetchAllCattle()` (Task 2); `summarize()`, `formatDuration()` (Task 1);
  `errorMessage()`, `ADDRESS`, `addressUrl()` dari `contract.js`
- Produces: komponen default `DashboardPage` (tanpa props)

- [ ] **Step 1: Buat halaman dashboard**

Buat `frontend/src/DashboardPage.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { ADDRESS, addressUrl, errorMessage, fetchAllCattle } from './contract.js'
import { formatDuration, summarize } from './stats.js'

/**
 * Ringkasan seluruh rantai pasok, dibaca dari blockchain tanpa wallet.
 *
 * Halaman ini tidak menampilkan apa pun yang belum ada di blockchain — semua angka
 * dihitung ulang dari data mentah tiap kali dibuka, tidak ada cache atau basis data.
 */
export default function DashboardPage() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetchAllCattle()
      .then((records) => {
        if (!cancelled) setState({ status: 'ok', stats: summarize(records) })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(err) })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-8 sm:pt-12">
        {state.status === 'loading' && <Loading />}
        {state.status === 'error' && <LoadError message={state.message} />}
        {state.status === 'ok' && state.stats.total === 0 && <Empty />}
        {state.status === 'ok' && state.stats.total > 0 && <Stats stats={state.stats} />}
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-surface">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-2.5 px-5">
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Traceability Sapi
        </span>
        <span className="eyebrow ml-auto">Statistik rantai pasok</span>
      </div>
    </header>
  )
}

function Stats({ stats }) {
  return (
    <div className="stagger space-y-10">
      <section>
        <p className="eyebrow">Total sapi tercatat</p>
        <h1 className="font-display mt-2 text-6xl font-bold leading-none tnum sm:text-7xl">
          {stats.total}
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-muted">
          Seluruh angka di halaman ini dihitung langsung dari catatan blockchain Polygon
          Amoy, bukan dari basis data terpisah.
        </p>
      </section>

      <Funnel funnel={stats.funnel} total={stats.total} />
      <Durations stats={stats} />
      <Provenance />
    </div>
  )
}

/* ---------- corong tahapan ---------- */

function Funnel({ funnel, total }) {
  const steps = [
    { label: 'Terdaftar di peternakan', value: funnel.registered },
    { label: 'Sudah disembelih', value: funnel.slaughtered },
    { label: 'Sudah dikirim', value: funnel.shipped },
  ]

  return (
    <section>
      <h2 className="eyebrow mb-3">Posisi di rantai pasok</h2>
      <ol className="overflow-hidden rounded-xl border border-divider">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center gap-4 bg-surface px-5 py-4 ${
              i > 0 ? 'border-t border-divider' : ''
            }`}
          >
            <span className="font-display w-12 shrink-0 text-2xl font-bold tnum">
              {s.value}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{s.label}</span>
              {/* Batang hanya pelengkap; angkanya sudah tertulis di sebelah kiri. */}
              <span
                aria-hidden
                className="mt-1.5 block h-1.5 rounded-full bg-primary"
                style={{ width: `${total ? (s.value / total) * 100 : 0}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- rata-rata durasi ---------- */

function Durations({ stats }) {
  return (
    <section>
      <h2 className="eyebrow mb-3">Rata-rata waktu proses</h2>
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-divider bg-divider sm:grid-cols-2">
        <Duration label="Daftar → disembelih" seconds={stats.avgToSlaughter} />
        <Duration label="Disembelih → dikirim" seconds={stats.avgToShip} />
      </dl>
    </section>
  )
}

function Duration({ label, seconds }) {
  const text = formatDuration(seconds)
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="font-display mt-1.5 text-lg font-semibold leading-snug">
        {text ?? <span className="text-muted">Belum ada data</span>}
      </dd>
    </div>
  )
}

function Provenance() {
  return (
    <section className="rounded-xl border border-divider bg-warn-bg px-5 py-5">
      <h2 className="eyebrow" style={{ color: 'var(--color-warn-text)' }}>
        Sumber data
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed">
        Dihitung dari catatan smart contract berikut. Siapa pun bisa memverifikasi angkanya
        sendiri lewat block explorer.
      </p>
      <a
        href={addressUrl(ADDRESS)}
        target="_blank"
        rel="noreferrer"
        className="tap mt-2 break-all font-mono text-xs font-medium underline underline-offset-4"
        style={{ color: 'var(--color-warn-text)' }}
      >
        {ADDRESS}
      </a>
    </section>
  )
}

/* ---------- keadaan selain data siap ---------- */

function Loading() {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <span className="sr-only">Memuat statistik dari blockchain</span>
      <div aria-hidden className="space-y-3">
        <div className="h-3 w-40 rounded bg-divider" />
        <div className="h-16 w-40 animate-pulse rounded-lg bg-divider" />
      </div>
      <div aria-hidden className="h-40 animate-pulse rounded-xl bg-divider/70" />
      <div aria-hidden className="h-28 animate-pulse rounded-xl bg-divider/50" />
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

function Empty() {
  return (
    <Message title="Belum ada sapi tercatat">
      Belum ada satu pun sapi yang didaftarkan ke blockchain. Statistik akan muncul setelah
      peternak mendaftarkan sapi pertama.
    </Message>
  )
}

function LoadError({ message }) {
  return (
    <Message
      title="Gagal memuat statistik"
      action={
        <button onClick={() => window.location.reload()} className="btn btn-ghost mt-6">
          Muat ulang
        </button>
      }
    >
      Tidak bisa menghubungi jaringan Polygon Amoy. Periksa koneksi internet, lalu muat
      ulang halaman.
      <span className="mt-3 block font-mono text-xs">{message}</span>
    </Message>
  )
}
```

- [ ] **Step 2: Tambahkan rute di App.jsx**

Ganti seluruh isi `frontend/src/App.jsx` dengan:

```jsx
import ActorPanel from './ActorPanel.jsx'
import DashboardPage from './DashboardPage.jsx'
import TrackPage from './TrackPage.jsx'

/**
 * Tiga tampilan, dipilih dari query param — tanpa router.
 *
 *   ?id=7        -> halaman publik yang dibuka konsumen setelah scan QR
 *   ?dashboard=1 -> ringkasan statistik, juga publik
 *   (tanpa)      -> panel aktor yang butuh MetaMask
 *
 * Query param dipilih alih-alih path routing karena GitHub Pages tidak punya SPA
 * rewrite: "/repo/?id=7" langsung mengenai index.html tanpa konfigurasi apa pun.
 */
export default function App() {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('id')

  // id harus bilangan bulat positif. Selain itu (kosong, huruf, negatif) jatuh ke
  // panel aktor, bukan error — QR yang rusak tidak boleh membuat halaman blank.
  const id = raw !== null && /^\d+$/.test(raw.trim()) ? raw.trim() : null
  if (id) return <TrackPage id={id} />

  if (params.has('dashboard')) return <DashboardPage />

  return <ActorPanel />
}
```

- [ ] **Step 3: Jalankan dev server dan periksa di peramban**

```bash
cd frontend && npm run dev
```

Buka `http://localhost:5173/Blockchain_Halal/?dashboard=1`. Diharapkan:
- Total sapi: **1**
- Corong: Terdaftar 1, Disembelih 1, Dikirim 1
- Rata-rata daftar→disembelih: **6 menit** · disembelih→dikirim: **2 menit**
  (dari data terverifikasi: 350 dan 143 detik)
- Buka juga `?id=1` dan halaman tanpa query — keduanya harus tetap berfungsi seperti semula.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/DashboardPage.jsx frontend/src/App.jsx
git commit -m "feat: halaman dashboard statistik + rute ?dashboard=1"
```

---

## Task 4: Sebaran grade dan daftar sapi terbaru

> **Sebelum mengerjakan task ini, muat skill `dataviz`** — task ini membuat grafik, dan
> instruksi global pengguna mewajibkan skill yang relevan dipakai. Bentuk yang dipilih
> (batang horizontal berlabel) sudah ditetapkan di bawah; pakai skill untuk memvalidasi
> pilihan warna, label, dan keterbacaannya.

**Files:**
- Modify: `frontend/src/DashboardPage.jsx`

**Interfaces:**
- Consumes: `stats.grades` (Array `{grade, count}`) dan `stats.recent` (Array record)
  dari `summarize()` (Task 1); `stageOf()` dari `stats.js`; `formatDate()` dari `contract.js`
- Produces: tidak ada ekspor baru — hanya komponen internal di file yang sama

- [ ] **Step 1: Perluas import di DashboardPage.jsx**

Ganti dua baris import teratas menjadi:

```jsx
import { useEffect, useState } from 'react'
import {
  ADDRESS,
  addressUrl,
  errorMessage,
  fetchAllCattle,
  formatDate,
} from './contract.js'
import { formatDuration, stageOf, summarize } from './stats.js'
```

- [ ] **Step 2: Pasang dua bagian baru ke dalam `Stats`**

Di komponen `Stats`, sisipkan dua baris di antara `<Durations …/>` dan `<Provenance />`:

```jsx
      <Funnel funnel={stats.funnel} total={stats.total} />
      <Durations stats={stats} />
      <Grades grades={stats.grades} total={stats.total} />
      <Recent records={stats.recent} />
      <Provenance />
```

- [ ] **Step 3: Tambahkan komponen `Grades` dan `Recent`**

Sisipkan sebelum blok komentar `/* ---------- keadaan selain data siap ---------- */`:

```jsx
/* ---------- sebaran grade ---------- */

/**
 * Batang horizontal berlabel, bukan pie: kategorinya sedikit, dan perbandingan panjang
 * batang jauh lebih mudah dibaca daripada perbandingan sudut. Angka dan persentase
 * ditulis eksplisit supaya grafik ini tetap terbaca tanpa melihat panjang batangnya.
 */
function Grades({ grades, total }) {
  return (
    <section>
      <h2 className="eyebrow mb-3">Sebaran grade</h2>
      <ul className="space-y-3">
        {grades.map(({ grade, count }) => {
          const percent = Math.round((count / total) * 100)
          return (
            <li key={grade} className="flex items-center gap-4">
              <span className="font-display w-10 shrink-0 text-lg font-semibold">
                {grade}
              </span>
              <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-divider">
                <span
                  aria-hidden
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-24 shrink-0 text-right text-sm tnum text-muted">
                {count} ekor · {percent}%
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------- sapi terbaru ---------- */

const STAGE_LABEL = ['Terdaftar', 'Disembelih', 'Dikirim']

function Recent({ records }) {
  // Sepuluh terbaru sudah cukup untuk gambaran; sisanya bisa dilihat lewat halaman lacak.
  const rows = records.slice(0, 10)

  return (
    <section>
      <h2 className="eyebrow mb-3">Sapi terbaru</h2>
      <div className="overflow-hidden rounded-xl border border-divider">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider bg-surface">
              <th className="eyebrow px-5 py-3 text-left">Nomor</th>
              <th className="eyebrow px-5 py-3 text-left">Grade</th>
              <th className="eyebrow px-5 py-3 text-left">Status</th>
              <th className="eyebrow px-5 py-3 text-left">Terdaftar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rec) => (
              <tr key={String(rec.id)} className="border-t border-divider bg-surface">
                <td className="px-5 py-3">
                  <a
                    href={`?id=${rec.id}`}
                    className="font-display font-semibold text-primary underline underline-offset-4"
                  >
                    #{String(rec.id)}
                  </a>
                </td>
                <td className="px-5 py-3 font-medium">{rec.grade}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                    {STAGE_LABEL[stageOf(rec)]}
                  </span>
                </td>
                <td className="px-5 py-3 tnum text-muted">{formatDate(rec.registeredDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Periksa di peramban**

```bash
cd frontend && npm run dev
```

Buka `http://localhost:5173/Blockchain_Halal/?dashboard=1`. Diharapkan:
- Sebaran grade: `A · 1 ekor · 100%`, batang penuh
- Tabel sapi terbaru: satu baris `#1`, grade `A`, status `Dikirim`, tanggal terbaca
- Klik `#1` → membuka halaman lacak sapi 1

Periksa juga di lebar ponsel (DevTools, ±375px): tabel tidak boleh membuat halaman
menggeser ke samping.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/DashboardPage.jsx
git commit -m "feat: sebaran grade dan tabel sapi terbaru di dashboard"
```

---

## Task 5: Uji akhir dan publikasi

**Files:**
- Modify: `docs/testing.md` (tambah bagian pengujian dashboard)

**Interfaces:**
- Consumes: seluruh hasil Task 1–4
- Produces: tidak ada kode baru

- [ ] **Step 1: Jalankan seluruh pemeriksaan otomatis**

```bash
cd frontend && npm run check:stats && npm run check && npm run build
```

Diharapkan: dua skrip cetak `OK`, dan `vite build` selesai tanpa galat.

- [ ] **Step 2: Tambahkan matriks uji dashboard ke `docs/testing.md`**

Sisipkan di akhir file:

```markdown
## D. Dashboard statistik (Fase 1)

| # | Aksi | Harapan | Status |
|---|---|---|---|
| D1 | Buka `?dashboard=1` tanpa wallet terpasang | Halaman terbuka penuh, tidak ada permintaan connect wallet | `[ ]` |
| D2 | Bandingkan "Total sapi" dengan jumlah sapi yang sudah didaftarkan | Angkanya sama | `[ ]` |
| D3 | Bandingkan corong tahapan dengan status tiap sapi | Terdaftar ≥ Disembelih ≥ Dikirim, dan cocok dengan kenyataan | `[ ]` |
| D4 | Periksa sebaran grade | Jumlah per grade cocok; totalnya sama dengan total sapi | `[ ]` |
| D5 | Klik nomor sapi di tabel "Sapi terbaru" | Membuka halaman lacak sapi tersebut | `[ ]` |
| D6 | Matikan koneksi internet lalu muat ulang | Muncul "Gagal memuat statistik" + tombol Muat ulang, bukan layar kosong | `[ ]` |
| D7 | Buka di lebar ponsel (±375px) | Tidak ada geseran horizontal; tabel tetap terbaca | `[ ]` |
```

- [ ] **Step 3: Commit dan publikasikan**

```bash
git add docs/testing.md
git commit -m "docs: matriks uji dashboard statistik"
cd frontend && npm run deploy
```

- [ ] **Step 4: Verifikasi di situs live**

Buka <https://nuzzy32.github.io/Blockchain_Halal/?dashboard=1> dan jalankan D1–D7 dari
matriks di atas. Catat hasilnya di `docs/testing.md`.

---

## Batas yang diketahui

| Batas | Kapan jadi masalah | Jalan keluar |
|---|---|---|
| Jumlah permintaan `eth_getLogs` bertambah ~4 per hari sejak blok deploy | Setelah beberapa bulan, pemuatan dashboard terasa lambat | Tambahkan penghitung/daftar id di contract v2 (Fase 2), lalu ganti pemindaian log dengan pembacaan langsung |
| `getRecord` dipanggil satu per satu untuk tiap sapi | Ratusan sapi sekaligus bisa kena batas laju RPC | Batasi jumlah yang diambil, atau tambahkan fungsi baca massal di contract v2 |
| Sepuluh sapi terbaru saja yang ditampilkan | Saat data banyak dan pengguna ingin menelusuri semuanya | Tambahkan penomoran halaman atau pencarian berdasarkan id |
