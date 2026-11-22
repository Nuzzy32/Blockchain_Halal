import { useEffect, useState } from 'react'
import { Field, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { CUT_TYPE, cattleLabel, formatDate, label, packageLabel, toDatetimeLocal } from '../format.js'
import { usePackageList, useTx } from '../hooks.js'
import { readRegistry } from '../registry.js'
import { traceUrl } from '../chain.js'
import { resolveTimestamp } from '../validation.js'

const CREATED = 0n

export default function DistributorSection() {
  const [picked, setPicked] = useState([]) // ID kemasan (string) yang dicentang
  const [at, setAt] = useState(() => toDatetimeLocal(new Date()))
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(null) // { ids, seconds }
  const [maxBatch, setMaxBatch] = useState(50)
  const [shipped, setShipped] = useState([]) // ID kemasan yang baru dicatat dikirim
  const tx = useTx()
  const list = usePackageList()

  useEffect(() => {
    readRegistry().MAX_BATCH().then((n) => setMaxBatch(Number(n))).catch(() => {})
  }, [])

  const waiting = list.items.filter((p) => p.status === CREATED)
  const chosen = waiting.filter((p) => picked.includes(String(p.packageId)))
  const minSeconds = chosen.reduce((m, p) => (p.packagedAt > m ? p.packagedAt : m), 0n)
  const time = resolveTimestamp(at, { minSeconds, nowSeconds: BigInt(Math.floor(Date.now() / 1000)), label: 'Waktu kirim' })

  const idsError =
    (list.status === 'error' ? `Gagal membaca kemasan: ${list.message}` : null) ??
    (chosen.length === 0 ? 'Pilih minimal satu kemasan.' : null) ??
    (chosen.length > maxBatch ? `Maksimal ${maxBatch} kemasan per transaksi.` : null)
  const err = (e) => (touched ? e : null)

  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  const allPicked = waiting.length > 0 && chosen.length === waiting.length

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (idsError) return document.getElementById('ship-ids')?.focus()
    if (time.error) return document.getElementById('ship-at')?.focus()
    tx.reset()
    setShipped([])
    setReview({ ids: chosen.map((p) => String(p.packageId)), seconds: time.seconds })
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) => ct.recordShipping(review.ids, review.seconds))
    setReview(null)
    if (receipt) {
      setShipped(review.ids)
      setPicked([])
      setTouched(false)
    }
  }

  return (
    <Section badge="Distributor" step={4} title="Catat pengiriman" lead="Centang kemasan yang berangkat ke toko. Beberapa kemasan bisa dicatat sekaligus.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={!!review} className="space-y-5">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p id="ship-ids-label" className="text-sm font-medium">
                Kemasan siap dikirim {list.status === 'ok' && <span className="text-muted">({waiting.length})</span>}
              </p>
              {waiting.length > 1 && (
                <button
                  type="button"
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => setPicked(allPicked ? [] : waiting.slice(0, maxBatch).map((p) => String(p.packageId)))}
                >
                  {allPicked ? 'Batalkan semua' : 'Pilih semua'}
                </button>
              )}
            </div>
            {list.status === 'loading' ? (
              <p className="text-sm text-muted" role="status">Membaca daftar kemasan…</p>
            ) : waiting.length === 0 ? (
              <p className="rounded-lg border border-divider px-4 py-3 text-sm text-muted">Belum ada kemasan yang menunggu dikirim. RPH membuat kemasan dulu.</p>
            ) : (
              <ul
                id="ship-ids"
                tabIndex={-1}
                aria-labelledby="ship-ids-label"
                aria-describedby={err(idsError) ? 'ship-ids-error' : undefined}
                className="divide-y divide-divider overflow-hidden rounded-lg border border-divider text-sm"
              >
                {waiting.map((p) => {
                  const id = String(p.packageId)
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-primary-soft/50">
                        <input type="checkbox" className="h-5 w-5 shrink-0 accent-primary" checked={picked.includes(id)} onChange={() => toggle(id)} />
                        <span className="font-medium">{packageLabel(id)}</span>
                        <span className="ml-auto text-right text-muted">
                          {label(CUT_TYPE, p.cutType)} · {Number(p.weightGrams).toLocaleString('id-ID')} g · dari {cattleLabel(p.cattleId)}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            {err(idsError) && (
              <p id="ship-ids-error" className="mt-1.5 text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                {idsError}
              </p>
            )}
          </div>

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
      {shipped.length > 0 && (
        <div className="animate-rise mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-divider bg-bg px-4 py-3">
          <p className="min-w-0 flex-1 text-sm leading-relaxed">
            <strong className="font-semibold">Selesai.</strong> Riwayat {packageLabel(shipped[0])} sudah lengkap dan bisa dilihat konsumen lewat QR.
          </p>
          <a href={traceUrl(shipped[0])} target="_blank" rel="noreferrer" className="btn btn-primary shrink-0">Lihat halaman konsumen</a>
        </div>
      )}
    </Section>
  )
}
