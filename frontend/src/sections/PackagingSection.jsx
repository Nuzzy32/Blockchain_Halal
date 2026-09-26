import { useEffect, useState } from 'react'
import { CattleSummary, Field, QrLabel, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { CUT_TYPE, cattleLabel, label, options, shortAddress } from '../format.js'
import { useCattle, useTx } from '../hooks.js'
import { eventsOf, readRegistry } from '../registry.js'
import { validateChoice, validateId, validatePackageGrams } from '../validation.js'

const REGISTERED = 0n
// Penghitung biasa, bukan crypto.randomUUID(): yang terakhir hanya ada di secure context,
// sedangkan halaman dev yang dibuka dari ponsel lewat http://<ip-laptop> bukan secure context.
let rowSeq = 0
const newRow = () => ({ key: ++rowSeq, cut: '', grams: '' })

export default function PackagingSection({ account }) {
  const [cattle, setCattle] = useState('')
  const [rows, setRows] = useState(() => [newRow()])
  const [touched, setTouched] = useState(false)
  const [review, setReview] = useState(false)
  const [created, setCreated] = useState([])
  const [maxBatch, setMaxBatch] = useState(50)
  const tx = useTx()
  const lookup = useCattle(cattle)

  // Batas batch dibaca dari contract, bukan disalin angkanya (spec §7).
  useEffect(() => {
    readRegistry().MAX_BATCH().then((n) => setMaxBatch(Number(n))).catch(() => {})
  }, [])

  const c = lookup.status === 'ok' ? lookup.cattle : null
  const remaining = c ? Number(c.liveWeightKg) * 1000 - Number(c.packagedGrams) : 0
  const total = rows.reduce((sum, r) => sum + (Number(r.grams) || 0), 0)

  const cattleError =
    validateId(cattle, 'ID sapi') ??
    (lookup.status !== 'ok' ? 'Pilih sapi yang terdaftar.' : null) ??
    (c.status === REGISTERED ? 'Sapi ini belum disembelih.' : null) ??
    (c.abattoir.toLowerCase() !== account.toLowerCase()
      ? `Sapi ini disembelih RPH lain (${shortAddress(c.abattoir)}) — hanya RPH itu yang boleh mengemasnya.`
      : null)
  const rowErrors = rows.map((r) => ({ cut: validateChoice(r.cut, 'Jenis potongan'), grams: validatePackageGrams(r.grams) }))
  const totalError = c && total > remaining ? `Total ${total.toLocaleString('id-ID')} g melebihi sisa berat ${remaining.toLocaleString('id-ID')} g.` : null
  const invalid = cattleError || totalError || rowErrors.some((e) => e.cut || e.grams)

  const setRow = (key, field) => (e) => setRows(rows.map((r) => (r.key === key ? { ...r, [field]: e.target.value } : r)))

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    tx.reset()
    setCreated([])
    setReview(true)
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) => ct.createPackages(lookup.cattleId, rows.map((r) => Number(r.cut)), rows.map((r) => Number(r.grams))))
    setReview(false)
    if (!receipt) return
    setCreated(eventsOf(receipt, 'PackageCreated').map((ev) => ({ packageId: ev.args.packageId, cutType: ev.args.cutType, grams: ev.args.weightGrams })))
    setRows([newRow()])
    setTouched(false)
    lookup.reload()
  }

  return (
    <Section badge="RPH" title="Buat kemasan" lead="Satu sapi bisa dibuatkan beberapa kemasan. Tiap kemasan mendapat QR sendiri.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset disabled={review} className="space-y-5">
          <Field id="pack-cattle" label="ID sapi" error={touched ? cattleError : null}>
            <input {...fieldProps('pack-cattle', touched ? cattleError : null, { placeholder: 'contoh: 3 atau HCT-C-000003', autoComplete: 'off' })} value={cattle} onChange={(e) => setCattle(e.target.value)} />
          </Field>
          <CattleSummary lookup={lookup} />
          {c && c.status !== REGISTERED && (
            <p className="text-sm text-muted">
              Sisa berat yang boleh dikemas: <strong className="text-ink">{remaining.toLocaleString('id-ID')} g</strong>
            </p>
          )}

          <ol className="space-y-3">
            {rows.map((r, i) => {
              const errs = touched ? rowErrors[i] : {}
              return (
                <li key={r.key} className="grid items-start gap-3 sm:grid-cols-[1fr_10rem_auto]">
                  <Field id={`pack-cut-${r.key}`} label={`Potongan kemasan ${i + 1}`} error={errs.cut}>
                    <select {...fieldProps(`pack-cut-${r.key}`, errs.cut)} value={r.cut} onChange={setRow(r.key, 'cut')}>
                      <option value="">Pilih potongan…</option>
                      {options(CUT_TYPE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field id={`pack-grams-${r.key}`} label="Berat (gram)" error={errs.grams}>
                    <input {...fieldProps(`pack-grams-${r.key}`, errs.grams, { inputMode: 'numeric', placeholder: '100–50000' })} value={r.grams} onChange={setRow(r.key, 'grams')} />
                  </Field>
                  <button
                    type="button"
                    className="btn btn-ghost sm:mt-7"
                    onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                    disabled={rows.length === 1}
                    aria-label={`Hapus kemasan ${i + 1}`}
                  >
                    Hapus
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="btn btn-ghost" onClick={() => setRows([...rows, newRow()])} disabled={rows.length >= maxBatch}>
              Tambah kemasan
            </button>
            <p className="text-sm text-muted tnum">
              {rows.length}/{maxBatch} kemasan · total {total.toLocaleString('id-ID')} g
            </p>
          </div>
          {touched && totalError && <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }} role="alert">{totalError}</p>}
        </fieldset>

        {review ? (
          <Review
            rows={[
              ['Sapi', cattleLabel(lookup.cattleId)],
              ['Jumlah kemasan', String(rows.length)],
              ...rows.map((r, i) => [`Kemasan ${i + 1}`, `${label(CUT_TYPE, r.cut)} · ${Number(r.grams).toLocaleString('id-ID')} g`]),
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
      {created.length > 0 && (
        <div className="animate-rise mt-6">
          <h3 className="font-display text-lg font-semibold">Label QR kemasan baru</h3>
          <p className="mt-1 text-sm text-muted">Unduh dan cetak, lalu tempel di kemasan yang sesuai.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {created.map((p) => <QrLabel key={String(p.packageId)} packageId={p.packageId} cutType={p.cutType} grams={p.grams} />)}
          </div>
        </div>
      )}
    </Section>
  )
}
