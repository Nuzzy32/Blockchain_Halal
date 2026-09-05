import { useEffect, useState } from 'react'
import {
  ADDRESS,
  dashboardUrl,
  addressUrl,
  errorMessage,
  formatDate,
  readContract,
  shortAddress,
} from './contract.js'

/**
 * Halaman yang dibuka konsumen setelah scan QR.
 * Membaca lewat RPC publik — tanpa MetaMask, tanpa wallet, tanpa biaya.
 *
 * Struktur mengikuti pertanyaan konsumen, bukan pola landing page: apa nomornya,
 * sudah sampai tahap mana, datanya apa, siapa yang mencatat, bagaimana membuktikannya.
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
      <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-8 sm:pt-12">
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
    <header className="sticky top-0 z-20 border-b border-divider bg-surface">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-5">
        <Seal className="h-5 w-5 text-primary" />
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Traceability Sapi
        </span>
        {/* Sengaja hanya ke statistik, bukan ke panel aktor: konsumen yang memindai QR
            tidak punya wallet, jadi mengarahkannya ke sana hanya membingungkan.
            Info jaringan tetap tersedia di bagian "Cara memverifikasi sendiri". */}
        <a
          href={dashboardUrl()}
          className="tap ml-auto text-sm font-medium text-primary underline underline-offset-4"
        >
          Statistik
        </a>
      </div>
    </header>
  )
}

/* ---------- tahap rantai pasok ---------- */

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

const currentStage = (rec) =>
  rec.shippedDate !== 0n ? 2 : rec.slaughterDate !== 0n ? 1 : 0

function Record({ id, rec }) {
  const stage = currentStage(rec)
  const badge = ['Terdaftar', 'Disembelih', 'Dikirim'][stage]

  return (
    <div className="stagger space-y-10">
      {/* Identitas — angka besar sebagai jangkar visual, gaya Swiss. */}
      <section>
        <p className="eyebrow">Nomor identitas sapi</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-3">
          <h1 className="font-display text-6xl font-bold leading-none tnum sm:text-7xl">
            <span className="text-muted">#</span>
            {id}
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            {badge}
          </span>
        </div>
        <p className="mt-4 max-w-prose leading-relaxed text-muted">
          Seluruh riwayat di bawah ini tercatat permanen di blockchain dan tidak dapat
          diubah setelah dicatat.
        </p>
      </section>

      {/* Data — grid tegas dengan garis pemisah, bukan kartu bertumpuk. */}
      <section>
        <h2 className="eyebrow mb-3">Data ternak</h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-divider bg-divider sm:grid-cols-3">
          <Fact label="Umur" value={`${rec.age} bulan`} />
          <Fact label="Grade" value={rec.grade} />
          <Fact label="Jenis pakan" value={rec.feedType} className="col-span-2 sm:col-span-1" />
        </dl>
      </section>

      <section>
        <h2 className="font-display mb-5 text-xl font-semibold tracking-tight">
          Perjalanan rantai pasok
        </h2>
        <ol>
          {STAGES.map((s, i) => (
            <Step
              key={s.key}
              n={i + 1}
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
    <div className={`bg-surface px-5 py-4 ${className}`}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 font-display text-lg font-semibold leading-snug">{value}</dd>
    </div>
  )
}

function Step({ n, stage, date, actor, done, last }) {
  return (
    <li className="relative flex gap-5 pb-8 last:pb-0">
      {/* Rel vertikal timeline; disembunyikan di langkah terakhir. */}
      {!last && (
        <span
          aria-hidden
          className={`absolute left-4 top-9 bottom-1 w-px ${done ? 'bg-primary/30' : 'bg-divider'}`}
        />
      )}

      <span
        className={`font-display relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
          done
            ? 'bg-primary text-on-primary'
            : 'border border-border bg-surface text-muted'
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`font-display text-[17px] font-semibold leading-snug ${done ? '' : 'text-muted'}`}>
          {stage.label}
        </p>

        {done ? (
          <>
            <p className="mt-1 text-sm font-medium tnum text-muted">{date}</p>
            <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-muted">
              {stage.note}
            </p>
            <a
              href={addressUrl(actor)}
              target="_blank"
              rel="noreferrer"
              className="tap mt-3 flex-wrap gap-2 text-sm"
            >
              <span className="eyebrow">{stage.role}</span>
              <span className="font-mono font-medium text-primary underline underline-offset-4">
                {shortAddress(actor)}
              </span>
            </a>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Belum tercatat</p>
        )}
      </div>
    </li>
  )
}

function Provenance() {
  return (
    <section className="rounded-xl border border-divider bg-warn-bg px-5 py-5">
      <h2 className="eyebrow" style={{ color: 'var(--color-warn-text)' }}>
        Cara memverifikasi sendiri
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed">
        Data ini dibaca langsung dari smart contract di jaringan Polygon Amoy. Siapa pun
        dapat memeriksanya di block explorer tanpa mempercayai situs ini.
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

/* ---------- keadaan selain data ketemu ---------- */

function Loading({ id }) {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <span className="sr-only">Memuat data sapi nomor {id} dari blockchain</span>
      <div aria-hidden className="space-y-3">
        <div className="h-3 w-40 rounded bg-divider" />
        <div className="h-16 w-52 animate-pulse rounded-lg bg-divider" />
      </div>
      <div aria-hidden className="h-24 animate-pulse rounded-xl bg-divider/70" />
      <div aria-hidden className="h-52 animate-pulse rounded-xl bg-divider/50" />
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
    <Message title={`Sapi #${id} tidak ditemukan`}>
      Tidak ada catatan untuk nomor ini di blockchain. QR code mungkin salah, rusak, atau
      berasal dari kemasan yang tidak resmi.
    </Message>
  )
}

function LoadError({ message }) {
  return (
    <Message
      title="Gagal memuat data"
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

/* ---------- ikon SVG inline (bukan emoji, tanpa dependency icon set) ---------- */

function Check(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M5 10.5l3.2 3.2L15 7"
        stroke="currentColor"
        strokeWidth="2.2"
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
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12l2.4 2.4 4.6-4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
