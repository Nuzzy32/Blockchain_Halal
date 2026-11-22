import { useState } from 'react'
import { CattleSummary, Field, NextStep, PhotoField, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import {
  SLAUGHTER_METHOD, SLAUGHTER_METHOD_HINT, SYARIAH_CHECKLIST, cattleLabel, cattleOption, formatDate, label, normalizeEartag, options,
  textToBytes32, toDatetimeLocal,
} from '../format.js'
import { photoError, useCattle, useCattleList, useCattlePhoto, usePhotoPicker, usePhotoUrl, useTx } from '../hooks.js'
import { slaughtermanName } from '../slaughtermen.js'
import { resolveTimestamp, validateChoice, validateShortText } from '../validation.js'

const REGISTERED = 0n

export default function SlaughterSection() {
  const [v, setV] = useState(() => ({ cattle: '', at: toDatetimeLocal(new Date()), eartag: '', slaughterman: '', cert: '', method: '', syariah: false }))
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(null) // { seconds } saat ringkasan tampil
  const [done, setDone] = useState(null) // ID sapi yang baru dicatat
  const tx = useTx()
  const list = useCattleList()
  const lookup = useCattle(v.cattle)
  const waiting = list.items.filter((c) => c.status === REGISTERED)

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
  const cattleReady = lookup.status === 'ok' && lookup.cattle.status === REGISTERED
  const photo = useCattlePhoto(cattleReady ? lookup.cattle : null)
  const photoUrl = usePhotoUrl(photo.status === 'ok' ? photo.bytes : null)
  const picker = usePhotoPicker()
  const anteUrl = usePhotoUrl(picker.photo.bytes)
  // ID sertifikat disimpan huruf besar, supaya cocok dengan daftar juru sembelih dan konsisten di blockchain.
  const slaughtermanId = v.slaughterman.trim().toUpperCase()
  const slaughterman = slaughtermanName(slaughtermanId)
  const tag = normalizeEartag(v.eartag)
  const time = cattleReady
    ? resolveTimestamp(v.at, { minSeconds: lookup.cattle.registeredAt, nowSeconds, label: 'Waktu sembelih' })
    : { error: null }

  const errors = {
    cattle: !v.cattle ? 'Pilih sapi yang akan dicatat.' : !cattleReady ? 'Sapi ini sudah dicatat penyembelihannya.' : null,
    // Dicek di sini supaya salah ketik tidak membayar gas; contract tetap menolak yang tidak cocok.
    eartag: !cattleReady ? null : validateShortText(tag, 'Nomor eartag')
      ?? (textToBytes32(tag) === lookup.cattle.eartag ? null : 'Tidak cocok dengan eartag sapi ini. Pastikan sapinya benar.'),
    photo: cattleReady ? photoError(picker.photo, 'Foto sapi sebelum disembelih') : null,
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
      ct.recordSlaughter(lookup.cattleId, textToBytes32(tag), review.seconds, textToBytes32(slaughtermanId), textToBytes32(v.cert.trim()), Number(v.method), picker.photo.bytes),
    )
    setReview(null)
    if (receipt) {
      setDone(lookup.cattleId)
      // Form kemasan di bawah langsung memilih sapi ini.
      window.dispatchEvent(new CustomEvent('pack:select', { detail: String(lookup.cattleId) }))
      // Juru sembelih dan sertifikat biasanya sama untuk sapi berikutnya; yang lain dikosongkan.
      setV({ ...v, cattle: '', eartag: '', at: toDatetimeLocal(new Date()), syariah: false })
      picker.clear()
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
            <select {...fieldProps('slaughter-cattle', err('cattle'), { 'aria-describedby': 'slaughter-cattle-hint' })} value={v.cattle} onChange={(e) => { setV({ ...v, cattle: e.target.value, eartag: '' }); picker.clear() }}>
              <option value="">{list.status === 'loading' ? 'Membaca daftar sapi…' : `Pilih sapi (${waiting.length} menunggu)…`}</option>
              {waiting.map((c) => <option key={String(c.cattleId)} value={String(c.cattleId)}>{cattleOption(c)}</option>)}
            </select>
          </Field>
          <CattleSummary lookup={lookup} />
          {cattleReady && (
            <div className="rounded-lg border border-divider bg-bg px-5 py-4">
              <p className="font-display font-semibold">Cocokkan dengan sapi yang datang</p>
              <p className="mt-0.5 text-sm text-muted">Bandingkan foto dari peternak dengan sapinya, baca nomor eartag langsung dari telinga sapi, lalu foto sapinya sebelum disembelih.</p>
              <div className="mt-4 flex flex-wrap items-start gap-5">
                {photoUrl ? (
                  <img src={photoUrl} alt={`Foto sapi ${cattleLabel(lookup.cattleId)} dari peternak`} className="aspect-[4/3] w-full max-w-64 rounded-lg border border-divider object-cover" />
                ) : (
                  <p className="flex aspect-[4/3] w-full max-w-64 items-center justify-center rounded-lg border border-divider px-4 text-center text-sm text-muted">
                    {photo.status === 'none' ? 'Peternak tidak menyertakan foto.' : photo.status === 'failed' ? 'Foto tidak dapat dimuat.' : 'Memuat foto…'}
                  </p>
                )}
                <div className="min-w-48 flex-1">
                  <Field id="slaughter-eartag" label="Nomor eartag di telinga sapi" error={err('eartag')}>
                    <input {...fieldProps('slaughter-eartag', err('eartag'), { placeholder: 'ketik dari eartag', autoComplete: 'off' })} value={v.eartag} onChange={set('eartag')} />
                  </Field>
                </div>
              </div>
              <div className="mt-5 border-t border-divider pt-4">
                <PhotoField
                  id="slaughter-photo"
                  label="Foto sapi sebelum disembelih"
                  hint="Sapi hidup di RPH, seluruh badan terlihat. Bukti kondisi sapi saat pemeriksaan ante-mortem; tampil di halaman konsumen."
                  error={err('photo')}
                  picker={picker}
                  url={anteUrl}
                  resetKey={`${v.cattle}-${done}`}
                />
              </div>
            </div>
          )}
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
            <Field id="slaughter-slaughterman" label="ID sertifikat juru sembelih" error={err('slaughterman')} hint={slaughterman ? `Terdaftar di daftar juru sembelih: ${slaughterman}.` : 'ID sertifikat, bukan nama. Nama diambil dari daftar juru sembelih, tidak ditulis ke blockchain.'}>
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
              ['Eartag', `${tag} (cocok)`],
              ['Waktu sembelih', formatDate(review.seconds)],
              ['Metode', label(SLAUGHTER_METHOD, v.method)],
              ['Juru sembelih', slaughterman ? `${slaughterman} (${slaughtermanId})` : slaughtermanId],
              ['Sertifikat halal', v.cert.trim()],
              ['Foto sebelum disembelih', <img key="ante" src={anteUrl} alt="Foto sapi sebelum disembelih" className="h-20 w-28 rounded-md object-cover" />],
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
