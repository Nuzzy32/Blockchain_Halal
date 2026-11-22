import { useState } from 'react'
import { Field, NextStep, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { BREED, COAT_COLOR, FEED_TYPE, GRADE, GRADE_HINT, SEX, cattleLabel, label, options, textToBytes32 } from '../format.js'
import { usePhotoUrl, useTx } from '../hooks.js'
import { compressPhoto } from '../photo.js'
import { eventsOf } from '../registry.js'
import { validateAge, validateChoice, validateLiveWeight, validateShortText } from '../validation.js'

const EMPTY = { age: '', weight: '', grade: '', feed: '', breed: '', sex: '', coat: '', farmId: '' }
const NO_PHOTO = { bytes: null, error: null, busy: false }

export default function FarmerSection() {
  const [v, setV] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(false)
  const [created, setCreated] = useState(null)
  const [photo, setPhoto] = useState(NO_PHOTO)
  const photoUrl = usePhotoUrl(photo.bytes)
  const tx = useTx()

  const errors = {
    age: validateAge(v.age),
    weight: validateLiveWeight(v.weight),
    grade: validateChoice(v.grade, 'Grade'),
    feed: validateChoice(v.feed, 'Jenis pakan'),
    breed: validateChoice(v.breed, 'Ras'),
    sex: validateChoice(v.sex, 'Jenis kelamin'),
    coat: validateChoice(v.coat, 'Warna bulu'),
    farmId: validateShortText(v.farmId, 'Kode peternakan'),
    photo: photo.error ?? (photo.busy ? 'Foto masih diproses…' : photo.bytes ? null : 'Foto sapi wajib diunggah.'),
  }
  const err = (k) => (touched ? errors[k] : null)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return setPhoto(NO_PHOTO)
    setPhoto({ ...NO_PHOTO, busy: true })
    try {
      setPhoto({ ...NO_PHOTO, bytes: await compressPhoto(file) })
    } catch (err) {
      setPhoto({ ...NO_PHOTO, error: err.message })
    }
  }

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    const firstBad = Object.keys(errors).find((k) => errors[k])
    if (firstBad) return document.getElementById(`farmer-${firstBad}`)?.focus()
    tx.reset()
    setCreated(null)
    setReview(true)
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) =>
      ct.registerCattle(
        Number(v.age), Number(v.weight), Number(v.grade), Number(v.feed),
        Number(v.breed), Number(v.sex), Number(v.coat), textToBytes32(v.farmId.trim()), photo.bytes,
      ),
    )
    setReview(false)
    if (!receipt) return
    const [ev] = eventsOf(receipt, 'CattleRegistered')
    setCreated(ev?.args.cattleId ?? null)
    setV(EMPTY)
    setPhoto(NO_PHOTO)
    setTouched(false)
  }

  return (
    <Section badge="Peternak" step={1} title="Daftarkan sapi" lead="ID sapi dibuat otomatis oleh contract, lalu sapi langsung muncul di daftar RPH.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={review} className="grid gap-5 sm:grid-cols-2">
          <Field id="farmer-age" label="Umur (bulan)" error={err('age')}>
            <input {...fieldProps('farmer-age', err('age'), { inputMode: 'numeric', placeholder: '6–120' })} value={v.age} onChange={set('age')} />
          </Field>
          <Field id="farmer-weight" label="Berat hidup (kg)" error={err('weight')}>
            <input {...fieldProps('farmer-weight', err('weight'), { inputMode: 'numeric', placeholder: '100–1500' })} value={v.weight} onChange={set('weight')} />
          </Field>
          <Field id="farmer-grade" label="Grade" error={err('grade')} hint={GRADE_HINT[v.grade] ?? 'Dinilai dari marbling, lemak di sela serat daging.'}>
            <select {...fieldProps('farmer-grade', err('grade'), { 'aria-describedby': 'farmer-grade-hint' })} value={v.grade} onChange={set('grade')}>
              <option value="">Pilih grade…</option>
              {options(GRADE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="farmer-feed" label="Jenis pakan" error={err('feed')}>
            <select {...fieldProps('farmer-feed', err('feed'))} value={v.feed} onChange={set('feed')}>
              <option value="">Pilih jenis pakan…</option>
              {options(FEED_TYPE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="farmer-breed" label="Ras" error={err('breed')}>
            <select {...fieldProps('farmer-breed', err('breed'))} value={v.breed} onChange={set('breed')}>
              <option value="">Pilih ras…</option>
              {options(BREED).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="farmer-sex" label="Jenis kelamin" error={err('sex')}>
            <select {...fieldProps('farmer-sex', err('sex'))} value={v.sex} onChange={set('sex')}>
              <option value="">Pilih jenis kelamin…</option>
              {options(SEX).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="farmer-coat" label="Warna bulu" error={err('coat')}>
            <select {...fieldProps('farmer-coat', err('coat'))} value={v.coat} onChange={set('coat')}>
              <option value="">Pilih warna bulu…</option>
              {options(COAT_COLOR).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="farmer-farmId" label="Kode peternakan" error={err('farmId')} hint="Kode, bukan nama orang — data ini publik dan permanen.">
            <input {...fieldProps('farmer-farmId', err('farmId'), { placeholder: 'contoh: FARM-JTG-001', autoComplete: 'off', 'aria-describedby': 'farmer-farmId-hint' })} value={v.farmId} onChange={set('farmId')} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id="farmer-photo"
              label="Foto sapi"
              error={err('photo')}
              hint={photo.busy ? 'Mengecilkan foto…' : 'Seluruh badan sapi dari samping, cahaya terang. Dikecilkan otomatis (maks. 30 KB) dan lokasi GPS di foto dibuang.'}
            >
              <div className="flex flex-wrap items-center gap-4">
                {photoUrl && <img src={photoUrl} alt="Pratinjau foto sapi" className="h-24 w-32 rounded-lg border border-divider object-cover" />}
                <input
                  key={String(created)}
                  {...fieldProps('farmer-photo', err('photo'), { 'aria-describedby': 'farmer-photo-hint' })}
                  type="file"
                  accept="image/*"
                  onChange={pickPhoto}
                  className="field min-w-0 flex-1 file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-medium file:text-primary"
                />
              </div>
            </Field>
            {photo.bytes && (
              <p className="mt-1.5 text-sm text-muted" role="status">{(photo.bytes.length / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} KB, siap dicatat.</p>
            )}
          </div>
        </fieldset>

        {review ? (
          <Review
            rows={[
              ['Umur', `${v.age} bulan`],
              ['Berat hidup', `${v.weight} kg`],
              ['Grade', label(GRADE, v.grade)],
              ['Jenis pakan', label(FEED_TYPE, v.feed)],
              ['Ras', label(BREED, v.breed)],
              ['Jenis kelamin', label(SEX, v.sex)],
              ['Warna bulu', label(COAT_COLOR, v.coat)],
              ['Kode peternakan', v.farmId.trim()],
              ['Foto', <img key="foto" src={photoUrl} alt="Foto sapi yang akan dicatat" className="h-20 w-28 rounded-md object-cover" />],
            ]}
            status={tx.state.status}
            onConfirm={confirm}
            onCancel={() => setReview(false)}
          />
        ) : (
          <button type="submit" className="btn btn-primary">Lanjut ke ringkasan</button>
        )}
      </form>

      <TxStatus tx={tx.state} />
      {created !== null && (
        <>
          <p className="animate-rise mt-4 rounded-lg bg-primary-soft px-4 py-3 text-primary" role="status">
            ID sapi baru: <strong className="font-display text-lg">{cattleLabel(created)}</strong>
          </p>
          <NextStep role="ABATTOIR">RPH memilih sapi ini dari daftar lalu mencatat penyembelihannya.</NextStep>
        </>
      )}
    </Section>
  )
}
