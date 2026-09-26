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
        <p className="mt-3 text-base text-muted">Dari sapi {cattleLabel(cattle.cattleId)} · disembelih {freshnessText(cattle.slaughteredAt)}</p>
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
        <p className="mt-5 border-t border-divider pt-4 text-base leading-relaxed text-muted">
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
            <p className="mt-1 text-base font-medium tnum text-muted">{formatDate(step.date)}</p>
            {step.facts && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-base sm:grid-cols-3">
                {step.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
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
                <span className="break-all font-mono text-base text-muted">tx {step.tx}</span>
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
      <p className="mt-2 max-w-prose text-base leading-relaxed">
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
