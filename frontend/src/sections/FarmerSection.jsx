import { useState } from 'react'
import { Field, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { FEED_TYPE, GRADE, cattleLabel, label, options, textToBytes32 } from '../format.js'
import { useTx } from '../hooks.js'
import { eventsOf } from '../registry.js'
import { validateAge, validateChoice, validateLiveWeight, validateShortText } from '../validation.js'

const EMPTY = { age: '', weight: '', grade: '', feed: '', farmId: '' }

export default function FarmerSection() {
  const [v, setV] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(false)
  const [created, setCreated] = useState(null)
  const tx = useTx()

  const errors = {
    age: validateAge(v.age),
    weight: validateLiveWeight(v.weight),
    grade: validateChoice(v.grade, 'Grade'),
    feed: validateChoice(v.feed, 'Jenis pakan'),
    farmId: validateShortText(v.farmId, 'Kode peternakan'),
  }
  const err = (k) => (touched ? errors[k] : null)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

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
      ct.registerCattle(Number(v.age), Number(v.weight), Number(v.grade), Number(v.feed), textToBytes32(v.farmId.trim())),
    )
    setReview(false)
    if (!receipt) return
    const [ev] = eventsOf(receipt, 'CattleRegistered')
    setCreated(ev?.args.cattleId ?? null)
    setV(EMPTY)
    setTouched(false)
  }

  return (
    <Section badge="Peternak" step={1} title="Daftarkan sapi" lead="ID sapi dibuat otomatis oleh contract. Catat ID-nya untuk tahap sembelih.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={review} className="grid gap-5 sm:grid-cols-2">
          <Field id="farmer-age" label="Umur (bulan)" error={err('age')}>
            <input {...fieldProps('farmer-age', err('age'), { inputMode: 'numeric', placeholder: '6–120' })} value={v.age} onChange={set('age')} />
          </Field>
          <Field id="farmer-weight" label="Berat hidup (kg)" error={err('weight')}>
            <input {...fieldProps('farmer-weight', err('weight'), { inputMode: 'numeric', placeholder: '100–1500' })} value={v.weight} onChange={set('weight')} />
          </Field>
          <Field id="farmer-grade" label="Grade" error={err('grade')}>
            <select {...fieldProps('farmer-grade', err('grade'))} value={v.grade} onChange={set('grade')}>
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
          <Field id="farmer-farmId" label="Kode peternakan" error={err('farmId')} hint="Kode, bukan nama orang — data ini publik dan permanen.">
            <input {...fieldProps('farmer-farmId', err('farmId'), { placeholder: 'contoh: FARM-JTG-001', autoComplete: 'off', 'aria-describedby': 'farmer-farmId-hint' })} value={v.farmId} onChange={set('farmId')} />
          </Field>
        </fieldset>

        {review ? (
          <Review
            rows={[
              ['Umur', `${v.age} bulan`],
              ['Berat hidup', `${v.weight} kg`],
              ['Grade', label(GRADE, v.grade)],
              ['Jenis pakan', label(FEED_TYPE, v.feed)],
              ['Kode peternakan', v.farmId.trim()],
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
        <p className="animate-rise mt-4 rounded-lg bg-primary-soft px-4 py-3 text-primary" role="status">
          ID sapi baru: <strong className="font-display text-lg">{cattleLabel(created)}</strong>
        </p>
      )}
    </Section>
  )
}
