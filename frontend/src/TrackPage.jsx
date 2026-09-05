import { useEffect, useState } from 'react'
import {
  ADDRESS,
  addressUrl,
  errorMessage,
  formatDate,
  readContract,
  shortAddress,
} from './contract.js'

/**
 * Halaman yang dibuka konsumen setelah scan QR.
 * Membaca lewat RPC publik — tanpa MetaMask, tanpa wallet, tanpa biaya.
 */
export default function TrackPage({ id }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    readContract()
      .getRecord(id)
      .then((rec) => {
        if (!cancelled) setState({ status: 'ok', rec })
      })
      .catch((err) => {
        if (cancelled) return
        // getRecord() sengaja revert untuk id tak dikenal, jadi "tidak ditemukan"
        // harus dibedakan dari RPC mati — pesannya beda jauh untuk konsumen.
        const msg = errorMessage(err)
        const notFound = /tidak ditemukan/i.test(msg)
        setState({ status: notFound ? 'notfound' : 'error', message: msg })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8 sm:pt-12">
        {state.status === 'loading' && <Loading id={id} />}
        {state.status === 'notfound' && <NotFound id={id} />}
        {state.status === 'error' && <LoadError message={state.message} />}
        {state.status === 'ok' && <Record id={id} rec={state.rec} />}
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-5 py-4">
        <Seal className="h-6 w-6 text-forest" />
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Traceability Sapi
        </span>
        <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Polygon Amoy
        </span>
      </div>
    </header>
  )
}

/* ---------- status tahap ---------- */

const STAGES = [
  {
    key: 'registeredDate',
    actor: 'farmer',
    label: 'Terdaftar di peternakan',
    role: 'Peternak',
    note: 'Data awal sapi dicatat: umur, jenis pakan, dan grade.',
  },
  {
    key: 'slaughterDate',
    actor: 'butcher',
    label: 'Disembelih di rumah potong',
    role: 'Rumah Potong',
    note: 'Tanggal penyembelihan diambil dari waktu blockchain, bukan input manual.',
  },
  {
    key: 'shippedDate',
    actor: 'distributor',
    label: 'Dikirim ke distributor',
    role: 'Distributor',
    note: 'Daging meninggalkan rumah potong menuju titik penjualan.',
  },
]

function currentStage(rec) {
  if (rec.shippedDate !== 0n) return 2
  if (rec.slaughterDate !== 0n) return 1
  return 0
}

function Record({ id, rec }) {
  const stage = currentStage(rec)
  const badge = ['Terdaftar', 'Disembelih', 'Dikirim'][stage]

  return (
    <div className="animate-rise space-y-6">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Nomor identitas sapi
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-5xl font-semibold leading-none tracking-tight tnum sm:text-6xl">
            #{id}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-3 py-1 text-sm font-medium text-forest">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-600" />
            {badge}
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Seluruh riwayat di bawah ini tercatat permanen di blockchain dan tidak dapat
          diubah setelah dicatat.
        </p>
      </section>

      <section className="card grid grid-cols-2 divide-line sm:grid-cols-3 sm:divide-x">
        <Fact label="Umur ternak" value={`${rec.age} bulan`} />
        <Fact label="Grade" value={rec.grade} />
        <Fact
          label="Jenis pakan"
          value={rec.feedType}
          className="col-span-2 border-t border-line sm:col-span-1 sm:border-t-0"
        />
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">
          Perjalanan rantai pasok
        </h2>
        <ol className="relative">
          {STAGES.map((s, i) => (
            <Step
              key={s.key}
              stage={s}
              date={formatDate(rec[s.key])}
              actor={rec[s.actor]}
              done={i <= stage}
              last={i === STAGES.length - 1}
            />
          ))}
        </ol>
      </section>

      <Provenance />
    </div>
  )
}

function Fact({ label, value, className = '' }) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-[17px] font-medium leading-snug">{value}</p>
    </div>
  )
}

function Step({ stage, date, actor, done, last }) {
  return (
    <li className="relative flex gap-4 pb-7 last:pb-0">
      {/* Konektor vertikal antar-langkah; disembunyikan di langkah terakhir. */}
      {!last && (
        <span
          aria-hidden
          className={`absolute left-[15px] top-8 bottom-1 w-px ${
            done ? 'bg-forest-600/35' : 'bg-line'
          }`}
        />
      )}

      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold ${
          done
            ? 'border-forest bg-forest text-white'
            : 'border-line bg-surface text-muted'
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : '·'}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className={`font-medium leading-snug ${done ? '' : 'text-muted'}`}>
          {stage.label}
        </p>

        {done ? (
          <>
            <p className="mt-0.5 text-sm tnum text-muted">{date}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{stage.note}</p>
            <a
              href={addressUrl(actor)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-forest-600 underline decoration-forest-600/30 underline-offset-4 hover:decoration-forest-600"
            >
              <span className="text-muted">{stage.role}</span>
              <span className="font-mono">{shortAddress(actor)}</span>
            </a>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-muted">Belum tercatat</p>
        )}
      </div>
    </li>
  )
}

function Provenance() {
  return (
    <section className="rounded-xl border border-line bg-amber-soft px-5 py-4">
      <p className="text-[13px] leading-relaxed text-ink/80">
        Data ini dibaca langsung dari smart contract di jaringan Polygon Amoy. Siapa pun
        dapat memverifikasinya secara independen tanpa mempercayai situs ini.
      </p>
      <a
        href={addressUrl(ADDRESS)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block break-all font-mono text-[12px] text-amber-brand underline underline-offset-4"
      >
        {ADDRESS}
      </a>
    </section>
  )
}

/* ---------- keadaan selain data ketemu ---------- */

function Loading({ id }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-sm text-muted">Membaca data sapi #{id} dari blockchain…</p>
      <div className="h-14 w-48 animate-pulse rounded-lg bg-line/60" />
      <div className="card h-24 animate-pulse" />
      <div className="h-40 animate-pulse rounded-xl bg-line/40" />
    </div>
  )
}

function NotFound({ id }) {
  return (
    <div className="animate-rise card px-6 py-10 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Sapi #{id} tidak ditemukan
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        Tidak ada catatan untuk nomor ini di blockchain. QR code mungkin salah, rusak,
        atau berasal dari kemasan yang tidak resmi.
      </p>
    </div>
  )
}

function LoadError({ message }) {
  return (
    <div className="animate-rise card px-6 py-10 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Gagal memuat data
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        Tidak bisa menghubungi jaringan Polygon Amoy. Periksa koneksi internet, lalu muat
        ulang halaman.
      </p>
      <p className="mt-4 font-mono text-[12px] text-muted">{message}</p>
      <button onClick={() => window.location.reload()} className="btn btn-ghost mt-5">
        Muat ulang
      </button>
    </div>
  )
}

/* ---------- ikon inline (menghindari dependency icon set) ---------- */

function Check(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M5 10.5l3.2 3.2L15 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Seal(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 2.5l2.4 1.5 2.8-.3 1 2.7 2.3 1.7-1 2.7 1 2.7-2.3 1.7-1 2.7-2.8-.3L12 21.5l-2.4-1.6-2.8.3-1-2.7-2.3-1.7 1-2.7-1-2.7 2.3-1.7 1-2.7 2.8.3L12 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12l2.4 2.4 4.6-4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
