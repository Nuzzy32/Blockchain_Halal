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
