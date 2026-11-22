import { useState } from 'react'
import { CattleSummary, Field, NextStep, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import {
  SLAUGHTER_METHOD, SLAUGHTER_METHOD_HINT, SYARIAH_CHECKLIST, cattleLabel, cattleOption, formatDate, label, options, textToBytes32, toDatetimeLocal,
} from '../format.js'
import { useCattle, useCattleList, useTx } from '../hooks.js'
import { resolveTimestamp, validateChoice, validateShortText } from '../validation.js'

const REGISTERED = 0n

export default function SlaughterSection() {
  const [v, setV] = useState(() => ({ cattle: '', at: toDatetimeLocal(new Date()), slaughterman: '', cert: '', method: '', syariah: false }))
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(null) // { seconds } saat ringkasan tampil
  const [done, setDone] = useState(null) // ID sapi yang baru dicatat
  const tx = useTx()
  const list = useCattleList()
  const lookup = useCattle(v.cattle)
  const waiting = list.items.filter((c) => c.status === REGISTERED)

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
  const cattleReady = lookup.status === 'ok' && lookup.cattle.status === REGISTERED
  const time = cattleReady
    ? resolveTimestamp(v.at, { minSeconds: lookup.cattle.registeredAt, nowSeconds, label: 'Waktu sembelih' })
    : { error: null }

  const errors = {
    cattle: !v.cattle ? 'Pilih sapi yang akan dicatat.' : !cattleReady ? 'Sapi ini sudah dicatat penyembelihannya.' : null,
    method: validateChoice(v.method, 'Metode sembelih'),
    at: time.error,
    slaughterman: validateShortText(v.slaughterman, 'ID juru sembelih'),
    cert: validateShortText(v.cert, 'Nomor sertifikat halal'),
    syariah: v.syariah ? null : 'Konfirmasi dulu bahwa penyembelihan memenuhi syarat syariat.',
  }
  const err = (k) => (touched ? errors[k] : null)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    const firstBad = Object.keys(errors).find((k) => errors[k])
    if (firstBad) return document.getElementById(`slaughter-${firstBad}`)?.focus()
    tx.reset()
    setDone(null)
    setReview({ seconds: time.seconds })
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) =>
      ct.recordSlaughter(lookup.cattleId, review.seconds, textToBytes32(v.slaughterman.trim()), textToBytes32(v.cert.trim()), Number(v.method)),
    )
    setReview(null)
    if (receipt) {
      setDone(lookup.cattleId)
      // Form kemasan di bawah langsung memilih sapi ini.
      window.dispatchEvent(new CustomEvent('pack:select', { detail: String(lookup.cattleId) }))
      // Juru sembelih dan sertifikat biasanya sama untuk sapi berikutnya; yang lain dikosongkan.
      setV({ ...v, cattle: '', at: toDatetimeLocal(new Date()), syariah: false })
      setTouched(false)
    }
  }

  return (
    <Section badge="RPH" step={2} title="Catat penyembelihan" lead="Data halal dicatat sekali dan tidak bisa diedit — periksa sebelum menyimpan.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={!!review} className="space-y-5">
          <Field
            id="slaughter-cattle"
            label="Sapi yang disembelih"
            error={err('cattle')}
            hint={list.status === 'ok' && waiting.length === 0 ? 'Belum ada sapi yang menunggu disembelih. Peternak mendaftarkan sapi dulu.' : null}
          >
            <select {...fieldProps('slaughter-cattle', err('cattle'), { 'aria-describedby': 'slaughter-cattle-hint' })} value={v.cattle} onChange={set('cattle')}>
              <option value="">{list.status === 'loading' ? 'Membaca daftar sapi…' : `Pilih sapi (${waiting.length} menunggu)…`}</option>
              {waiting.map((c) => <option key={String(c.cattleId)} value={String(c.cattleId)}>{cattleOption(c)}</option>)}
            </select>
          </Field>
          <CattleSummary lookup={lookup} />
          <Field
            id="slaughter-method"
            label="Metode sembelih (keduanya syar'i)"
            error={err('method')}
            hint={SLAUGHTER_METHOD_HINT[v.method] ?? 'Bedanya hanya ada tidaknya pemingsanan (stunning) sebelum disembelih.'}
          >
            <select {...fieldProps('slaughter-method', err('method'), { 'aria-describedby': 'slaughter-method-hint' })} value={v.method} onChange={set('method')}>
              <option value="">Pilih metode…</option>
              {options(SLAUGHTER_METHOD).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="slaughter-at" label="Waktu sembelih" error={err('at')}>
              <input {...fieldProps('slaughter-at', err('at'), { type: 'datetime-local', max: toDatetimeLocal(new Date()) })} value={v.at} onChange={set('at')} />
            </Field>
            <Field id="slaughter-slaughterman" label="ID sertifikat juru sembelih" error={err('slaughterman')} hint="ID sertifikat, bukan nama orang.">
              <input {...fieldProps('slaughter-slaughterman', err('slaughterman'), { placeholder: 'contoh: JULEHA-0042', autoComplete: 'off', 'aria-describedby': 'slaughter-slaughterman-hint' })} value={v.slaughterman} onChange={set('slaughterman')} />
            </Field>
            <Field id="slaughter-cert" label="Nomor sertifikat halal" error={err('cert')}>
              <input {...fieldProps('slaughter-cert', err('cert'), { placeholder: 'contoh: ID00410000123', autoComplete: 'off' })} value={v.cert} onChange={set('cert')} />
            </Field>
          </div>

          <div className="rounded-lg border border-divider bg-bg px-5 py-4">
            <p className="font-display font-semibold">Syarat penyembelihan halal</p>
            <p className="mt-0.5 text-sm text-muted">Menurut Fatwa MUI No. 12 Tahun 2009 tentang Standar Sertifikasi Penyembelihan Halal.</p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
              {SYARIAH_CHECKLIST.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <label className="mt-4 flex items-start gap-3 border-t border-divider pt-4 text-sm font-medium">
              <input
                id="slaughter-syariah"
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                checked={v.syariah}
                onChange={(e) => setV({ ...v, syariah: e.target.checked })}
                aria-invalid={err('syariah') ? 'true' : undefined}
                aria-describedby={err('syariah') ? 'slaughter-syariah-error' : undefined}
              />
              Saya menyatakan penyembelihan sapi ini memenuhi seluruh syarat di atas.
            </label>
            {err('syariah') && (
              <p id="slaughter-syariah-error" className="mt-1.5 text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                {err('syariah')}
              </p>
            )}
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
      {done && <NextStep anchor="tahap-kemas">buat kemasan dari sapi {cattleLabel(done)} di form di bawah.</NextStep>}
    </Section>
  )
}
