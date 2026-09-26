import { Fragment, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { traceUrl, txUrl } from './chain.js'
import { CATTLE_STATUS, CUT_TYPE, FEED_TYPE, GRADE, bytes32ToText, cattleLabel, formatDate, label, packageLabel } from './format.js'
import { demoActive } from './registry.js'

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
export function Section({ badge, step, title, lead, children }) {
  return (
    <section data-rise className="card overflow-hidden">
      <header className="flex items-start gap-5 border-b border-divider px-6 py-6 sm:px-8 sm:py-7">
        <span
          aria-hidden
          className="font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-night text-lg font-semibold text-[#f0fdf4] tnum"
        >
          {step ?? <KeyIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary tnum">
            {step ? `Tahap ${step} dari 4 · ` : ''}
            {badge}
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
          {lead && <p className="mt-1.5 max-w-lg text-[15px] leading-relaxed text-muted">{lead}</p>}
        </div>
      </header>
      <div className="px-6 py-7 sm:px-8">{children}</div>
    </section>
  )
}

function KeyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="8" cy="15" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.2 11.8L20 3m-3 3l2.5 2.5M14.5 8.5l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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

/**
 * Atribut aksesibilitas + kelas untuk kontrol di dalam <Field>. Kalau Field merender hint
 * (lihat komponen Field di atas), pemanggil meneruskan `{ 'aria-describedby': `${id}-hint` }`
 * lewat `extra` — error tetap diutamakan di atas hint itu.
 */
export const fieldProps = (id, error, extra = {}) => ({
  id,
  name: id,
  className: 'field',
  ...extra,
  'aria-invalid': error ? 'true' : undefined,
  'aria-describedby': error ? `${id}-error` : extra['aria-describedby'],
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
          {status === 'signing'
            ? 'Menunggu tanda tangan…'
            : status === 'mining'
              ? 'Menunggu konfirmasi…'
              : demoActive()
                ? 'Simpan ke blockchain (akun demo)'
                : 'Tandatangani di MetaMask'}
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

/** Pratinjau sapi dari useCattle, supaya pengguna yakin memilih sapi yang benar sebelum mencatat. */
export function CattleSummary({ lookup }) {
  if (lookup.status === 'idle') return null
  if (lookup.status === 'loading') return <p className="text-sm text-muted" role="status">Membaca data sapi…</p>
  if (lookup.status === 'notfound') {
    return <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }} role="status">Sapi {cattleLabel(lookup.cattleId)} tidak terdaftar.</p>
  }
  if (lookup.status === 'error') {
    return <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }} role="status">Gagal membaca data sapi: {lookup.message}</p>
  }
  const c = lookup.cattle
  const items = [
    ['Sapi', cattleLabel(c.cattleId)],
    ['Status', label(CATTLE_STATUS, c.status)],
    ['Grade', label(GRADE, c.grade)],
    ['Berat hidup', `${c.liveWeightKg} kg`],
    ['Pakan', label(FEED_TYPE, c.feedType)],
    ['Peternakan', bytes32ToText(c.farmId)],
    ['Terdaftar', formatDate(c.registeredAt)],
  ]
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-divider bg-divider text-sm sm:grid-cols-4" aria-label="Data sapi">
      {items.map(([k, v], idx) => (
        <div key={k} className={`bg-surface px-3 py-2.5${idx === items.length - 1 ? ' col-span-2 sm:col-span-2' : ''}`}>
          <dt className="eyebrow">{k}</dt>
          <dd className="mt-1 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

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
