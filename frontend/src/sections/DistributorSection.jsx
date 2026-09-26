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
