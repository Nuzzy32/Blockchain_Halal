import { useEffect, useState } from 'react'
import { Field, Review, Section, TxStatus, fieldProps } from '../components.jsx'
import { ROLE, ROLE_KEYS, ROLE_LABEL } from '../format.js'
import { useTx } from '../hooks.js'
import { rolesOf } from '../registry.js'
import { validateAddress, validateChoice } from '../validation.js'

export default function AdminSection({ wallet }) {
  const [address, setAddress] = useState('')
  const [role, setRole] = useState('')
  const [touched, setTouched] = useState(false)
  const [pending, setPending] = useState(null) // 'grant' | 'revoke' | null
  const [held, setHeld] = useState(null)
  const [reload, setReload] = useState(0)
  const tx = useTx()

  const target = address.trim()
  const addressError = validateAddress(target)
  const roleError = validateChoice(role, 'Peran')

  // Peran yang sedang dimiliki alamat tujuan — contract tidak menyimpan daftar pemegang peran,
  // jadi hanya bisa dicek per alamat.
  useEffect(() => {
    setHeld(null)
    if (addressError) return
    let cancelled = false
    rolesOf(target)
      .then((r) => !cancelled && setHeld(r))
      .catch(() => !cancelled && setHeld('error'))
    return () => {
      cancelled = true
    }
  }, [target, addressError, reload])

  const ask = (action) => {
    setTouched(true)
    if (addressError || roleError) return
    tx.reset()
    setPending(action)
  }

  const confirm = async () => {
    const receipt = await tx.run((ct) => (pending === 'grant' ? ct.grantRole(target, ROLE[role]) : ct.revokeRole(target, ROLE[role])))
    setPending(null)
    if (receipt) {
      setReload((n) => n + 1)
      if (target.toLowerCase() === wallet.account?.toLowerCase()) wallet.refreshRoles()
    }
  }

  return (
    <Section badge="Admin" title="Kelola peran" lead="Beri atau cabut peran wallet. Hanya admin yang bisa melakukannya.">
      <div className="space-y-5">
        <Field id="admin-address" label="Alamat wallet" error={touched ? addressError : null}>
          <input
            {...fieldProps('admin-address', touched ? addressError : null)}
            className="field font-mono"
            placeholder="0x…"
            autoComplete="off"
            spellCheck="false"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        {!addressError && (
          <p className="text-sm text-muted" role="status">
            {held === null
              ? 'Membaca peran alamat ini…'
              : held === 'error'
                ? 'Gagal membaca peran alamat ini.'
                : `Peran saat ini: ${ROLE_KEYS.filter((k) => held[k]).map((k) => ROLE_LABEL[k]).join(', ') || 'tidak ada'}`}
          </p>
        )}

        <Field id="admin-role" label="Peran" error={touched ? roleError : null}>
          <select {...fieldProps('admin-role', touched ? roleError : null)} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Pilih peran…</option>
            {ROLE_KEYS.map((k) => (
              <option key={k} value={k}>
                {ROLE_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        {pending ? (
          <Review
            rows={[
              ['Aksi', pending === 'grant' ? 'Beri peran' : 'Cabut peran'],
              ['Alamat', <span className="font-mono">{target}</span>],
              ['Peran', ROLE_LABEL[role]],
            ]}
            status={tx.state.status}
            onConfirm={confirm}
            onCancel={() => setPending(null)}
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => ask('grant')}>
              Beri peran
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => ask('revoke')}>
              Cabut peran
            </button>
          </div>
        )}
      </div>
      <TxStatus tx={tx.state} />
    </Section>
  )
}
