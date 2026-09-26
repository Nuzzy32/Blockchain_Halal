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
