import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import {
  ADDRESS,
  AMOY_PARAMS,
  CHAIN_ID,
  dashboardUrl,
  Role,
  ROLE_LABEL,
  addressUrl,
  errorMessage,
  readContract,
  shortAddress,
  trackUrl,
  txUrl,
  writeContract,
} from './contract.js'

const hasMetaMask = () => typeof window.ethereum !== 'undefined'

/**
 * Panel untuk tiga aktor rantai pasok. Wallet yang terhubung menentukan form apa yang
 * muncul: role dibaca dari contract (`roles(address)`), bukan dipilih sendiri oleh user —
 * memilih sendiri tidak ada gunanya karena contract tetap akan menolak.
 */
export default function ActorPanel() {
  const wallet = useWallet()

  return (
    <div className="min-h-dvh">
      <TopBar wallet={wallet} />

      <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10">
        <header className="max-w-2xl">
          <p className="eyebrow">Panel aktor</p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Pencatatan Rantai Pasok
          </h1>
          <p className="mt-4 max-w-prose leading-relaxed text-muted">
            Setiap tahap dicatat oleh aktor yang berwenang dan disimpan permanen di
            jaringan Polygon Amoy.
          </p>
        </header>

        {!hasMetaMask() ? (
          <NoWallet />
        ) : (
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              {wallet.account && wallet.wrongNetwork && (
                <NetworkBanner onSwitch={wallet.switchNetwork} busy={wallet.switching} />
              )}
              {wallet.error && <Banner tone="danger">{wallet.error}</Banner>}
              {!wallet.account ? (
                <ConnectCard onConnect={wallet.connect} busy={wallet.connecting} />
              ) : (
                <RoleForm wallet={wallet} />
              )}
            </div>

            <QrCard />
          </div>
        )}
      </main>
    </div>
  )
}

/* ---------- wallet ---------- */

function useWallet() {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [role, setRole] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async (addr) => {
    setAccount(addr)
    if (!addr) return setRole(null)
    try {
      // Role dibaca lewat RPC publik, bukan lewat wallet: dengan begitu role tetap
      // terbaca walau wallet sedang berada di jaringan yang salah.
      setRole(Number(await readContract().roles(addr)))
    } catch {
      setRole(null)
    }
  }, [])

  // Pulihkan koneksi yang sudah pernah diberikan izin, tanpa memunculkan popup.
  useEffect(() => {
    if (!hasMetaMask()) return
    const eth = window.ethereum

    eth.request({ method: 'eth_accounts' }).then((a) => a[0] && load(a[0]))
    eth.request({ method: 'eth_chainId' }).then((c) => setChainId(BigInt(c)))

    const onAccounts = (a) => load(a[0] ?? null)
    const onChain = (c) => setChainId(BigInt(c))
    eth.on('accountsChanged', onAccounts)
    eth.on('chainChanged', onChain)
    return () => {
      eth.removeListener('accountsChanged', onAccounts)
      eth.removeListener('chainChanged', onChain)
    }
  }, [load])

  const connect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      await load(addr)
      setChainId(BigInt(await window.ethereum.request({ method: 'eth_chainId' })))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setConnecting(false)
    }
  }

  const switchNetwork = async () => {
    setSwitching(true)
    setError(null)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_PARAMS.chainId }],
      })
    } catch (err) {
      // 4902 = jaringan belum terdaftar di MetaMask, jadi tambahkan dulu.
      if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [AMOY_PARAMS],
          })
        } catch (addErr) {
          setError(errorMessage(addErr))
        }
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setSwitching(false)
    }
  }

  return {
    account,
    chainId,
    role,
    connecting,
    switching,
    error,
    connect,
    switchNetwork,
    wrongNetwork: chainId !== null && chainId !== CHAIN_ID,
  }
}

function TopBar({ wallet }) {
  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-5">
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Traceability Sapi
        </span>

        <a
          href={dashboardUrl()}
          className="tap ml-auto text-sm font-medium text-primary underline underline-offset-4"
        >
          Statistik
        </a>

        {wallet.account && (
          <div className="flex items-center gap-2">
            {wallet.role !== null && wallet.role !== Role.None && (
              <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary sm:inline">
                {ROLE_LABEL[wallet.role]}
              </span>
            )}
            <span
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-xs"
              style={wallet.wrongNetwork ? { color: 'var(--color-warn-text)' } : undefined}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{
                  background: wallet.wrongNetwork
                    ? 'var(--color-accent)'
                    : 'var(--color-primary)',
                }}
              />
              {shortAddress(wallet.account)}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

function Banner({ tone, children, action }) {
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

function NoWallet() {
  return (
    <div className="card mt-10 max-w-xl px-6 py-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        MetaMask tidak terdeteksi
      </h2>
      <p className="mt-3 leading-relaxed text-muted">
        Panel ini menulis transaksi ke blockchain, jadi membutuhkan wallet. Pasang ekstensi
        MetaMask, lalu muat ulang halaman ini.
      </p>
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary mt-6"
      >
        Pasang MetaMask
      </a>
      <p className="mt-6 border-t border-divider pt-4 text-sm leading-relaxed text-muted">
        Konsumen tidak membutuhkan wallet — halaman hasil scan QR bisa dibuka siapa saja.
      </p>
    </div>
  )
}

function ConnectCard({ onConnect, busy }) {
  return (
    <div className="card px-6 py-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Hubungkan wallet
      </h2>
      <p className="mt-3 max-w-md leading-relaxed text-muted">
        Form pencatatan akan menyesuaikan dengan role wallet Anda: peternak, rumah potong,
        atau distributor.
      </p>
      <button onClick={onConnect} disabled={busy} className="btn btn-primary mt-6">
        {busy ? 'Menunggu MetaMask…' : 'Hubungkan MetaMask'}
      </button>
    </div>
  )
}

function NetworkBanner({ onSwitch, busy }) {
  return (
    <Banner
      tone="warn"
      action={
        <button onClick={onSwitch} disabled={busy} className="btn btn-ghost shrink-0">
          {busy ? 'Memindahkan…' : 'Pindah ke Amoy'}
        </button>
      }
    >
      <strong className="font-display block font-semibold" style={{ color: 'var(--color-warn-text)' }}>
        Jaringan salah
      </strong>
      <span className="mt-0.5 block text-muted">
        Wallet Anda tidak berada di Polygon Amoy. Form dikunci sampai jaringan benar.
      </span>
    </Banner>
  )
}

/* ---------- form per role ---------- */

// Validasi sisi klien mencerminkan require() di contract. Tujuannya bukan menggantikan
// contract (itu tetap otoritas akhir), tapi supaya user tidak membayar gas untuk
// transaksi yang sudah pasti ditolak.
const positiveInt = (label) => (v) => {
  const t = v?.trim() ?? ''
  if (!t) return `${label} wajib diisi.`
  if (!/^\d+$/.test(t)) return `${label} harus berupa angka bulat.`
  if (Number(t) < 1) return `${label} tidak boleh 0.`
  return null
}
const nonEmpty = (label) => (v) =>
  v?.trim() ? null : `${label} tidak boleh kosong.`

const idField = { name: 'id', label: 'Nomor sapi', placeholder: 'contoh: 2', validate: positiveInt('Nomor sapi') }

const FORMS = {
  [Role.Farmer]: {
    title: 'Daftarkan sapi baru',
    lead: 'Nomor ini yang nanti dicetak sebagai QR code di kemasan.',
    action: 'Daftarkan sapi',
    fields: [
      idField,
      { name: 'age', label: 'Umur (bulan)', placeholder: 'contoh: 24', validate: positiveInt('Umur') },
      { name: 'feedType', label: 'Jenis pakan', placeholder: 'contoh: Rumput & Konsentrat', validate: nonEmpty('Jenis pakan') },
      { name: 'grade', label: 'Grade', placeholder: 'contoh: A', validate: nonEmpty('Grade') },
    ],
    send: (ct, f) => ct.registerCattle(f.id.trim(), f.age.trim(), f.feedType.trim(), f.grade.trim()),
  },
  [Role.Butcher]: {
    title: 'Catat penyembelihan',
    lead: 'Tanggal diambil otomatis dari waktu blockchain, bukan diisi manual.',
    action: 'Catat penyembelihan',
    fields: [idField],
    send: (ct, f) => ct.recordSlaughter(f.id.trim()),
  },
  [Role.Distributor]: {
    title: 'Catat pengiriman',
    lead: 'Hanya sapi yang sudah tercatat disembelih yang dapat dikirim.',
    action: 'Catat pengiriman',
    fields: [idField],
    send: (ct, f) => ct.recordShipping(f.id.trim()),
  },
}

function RoleForm({ wallet }) {
  const cfg = FORMS[wallet.role]
  const [values, setValues] = useState({})
  const [touched, setTouched] = useState({})
  const [tx, setTx] = useState({ status: 'idle' })
  const formRef = useRef(null)

  if (wallet.role === null) {
    return (
      <div className="card px-6 py-8 text-muted" role="status">
        Membaca role wallet…
      </div>
    )
  }

  if (!cfg) return <NoRole account={wallet.account} />

  const busy = tx.status === 'signing' || tx.status === 'mining'
  const locked = wallet.wrongNetwork || busy
  const errorFor = (f) => f.validate(values[f.name] ?? '')

  const submit = async (e) => {
    e.preventDefault()

    // Tandai semua field tersentuh supaya pesan inline muncul, lalu fokuskan yang pertama
    // bermasalah — pengguna keyboard tidak perlu menebak field mana yang salah.
    const firstBad = cfg.fields.find((f) => errorFor(f))
    if (firstBad) {
      setTouched(Object.fromEntries(cfg.fields.map((f) => [f.name, true])))
      formRef.current?.querySelector(`[name="${firstBad.name}"]`)?.focus()
      return
    }

    setTx({ status: 'signing' })
    try {
      const ct = await writeContract()
      const sent = await cfg.send(ct, values)
      setTx({ status: 'mining', hash: sent.hash })
      await sent.wait()
      setTx({ status: 'success', hash: sent.hash })
      setValues({})
      setTouched({})
    } catch (err) {
      setTx({ status: 'error', message: errorMessage(err) })
    }
  }

  return (
    <div className="card px-6 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{cfg.title}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{cfg.lead}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {ROLE_LABEL[wallet.role]}
        </span>
      </div>

      <form ref={formRef} onSubmit={submit} noValidate className="mt-7 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {cfg.fields.map((f) => {
            const err = touched[f.name] ? errorFor(f) : null
            return (
              <div key={f.name}>
                <label
                  htmlFor={`f-${f.name}`}
                  className="mb-1.5 block text-sm font-medium"
                >
                  {f.label}
                </label>
                <input
                  id={`f-${f.name}`}
                  name={f.name}
                  className="field"
                  inputMode={f.validate === idField.validate ? 'numeric' : undefined}
                  placeholder={f.placeholder}
                  disabled={locked}
                  aria-invalid={err ? 'true' : undefined}
                  aria-describedby={err ? `e-${f.name}` : undefined}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  onBlur={() => setTouched({ ...touched, [f.name]: true })}
                />
                {err && (
                  <p
                    id={`e-${f.name}`}
                    className="mt-1.5 text-sm font-medium"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    {err}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <button type="submit" disabled={locked} className="btn btn-primary">
          {tx.status === 'signing'
            ? 'Menunggu tanda tangan…'
            : tx.status === 'mining'
              ? 'Menunggu konfirmasi…'
              : cfg.action}
        </button>
      </form>

      <TxStatus tx={tx} />
    </div>
  )
}

function NoRole({ account }) {
  return (
    <div className="card px-6 py-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Wallet ini belum punya role
      </h2>
      <p className="mt-3 max-w-md leading-relaxed text-muted">
        Alamat{' '}
        <a
          href={addressUrl(account)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-primary underline underline-offset-4"
        >
          {shortAddress(account)}
        </a>{' '}
        belum ditetapkan sebagai peternak, rumah potong, atau distributor. Pemilik contract
        harus memanggil <code className="font-mono text-sm">setRole</code> terlebih dahulu,
        atau pindah ke akun aktor di MetaMask.
      </p>
    </div>
  )
}

function TxStatus({ tx }) {
  if (tx.status === 'idle' || tx.status === 'signing') return null

  if (tx.status === 'error') {
    return (
      <p
        role="alert"
        className="animate-rise mt-6 rounded-lg border px-4 py-3 text-sm leading-relaxed"
        style={{
          borderColor: 'var(--color-danger)',
          background: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
        }}
      >
        {tx.message}
      </p>
    )
  }

  const done = tx.status === 'success'
  return (
    <div
      role="status"
      aria-atomic="true"
      className={`animate-rise mt-6 rounded-lg border px-4 py-3 text-sm leading-relaxed ${
        done ? 'border-primary bg-primary-soft text-primary' : 'border-divider text-muted'
      }`}
    >
      <p className="font-display font-semibold">
        {done
          ? 'Tercatat permanen di blockchain.'
          : 'Transaksi terkirim, menunggu konfirmasi blockchain…'}
      </p>
      <a
        href={txUrl(tx.hash)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block break-all font-mono text-xs underline underline-offset-4"
      >
        {tx.hash}
      </a>
    </div>
  )
}

/* ---------- generator QR ---------- */

function QrCard() {
  const [id, setId] = useState('')
  const box = useRef(null)
  const valid = /^\d+$/.test(id.trim()) && Number(id) > 0
  const url = valid ? trackUrl(id.trim()) : ''

  const download = () => {
    const canvas = box.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `qr-sapi-${id.trim()}.png`
    a.click()
  }

  return (
    <aside className="card px-6 py-7">
      <h2 className="font-display text-lg font-semibold tracking-tight">QR untuk kemasan</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Cetak QR ini di label kemasan. Konsumen memindainya dengan kamera ponsel biasa —
        tanpa aplikasi khusus, tanpa wallet.
      </p>

      <label htmlFor="qr-id" className="mt-6 mb-1.5 block text-sm font-medium">
        Nomor sapi
      </label>
      <input
        id="qr-id"
        className="field"
        inputMode="numeric"
        placeholder="contoh: 2"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />

      {valid ? (
        <div className="animate-rise mt-5">
          <div
            ref={box}
            className="flex justify-center rounded-xl border border-divider bg-white p-5"
          >
            <QRCodeCanvas value={url} size={180} level="M" marginSize={2} />
          </div>
          <p className="mt-3 break-all text-center font-mono text-[11px] leading-relaxed text-muted">
            {url}
          </p>
          <button onClick={download} className="btn btn-ghost mt-3 w-full">
            Unduh PNG
          </button>
        </div>
      ) : (
        <div className="mt-5 flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
          Isi nomor sapi untuk membuat QR
        </div>
      )}

      <p className="mt-6 border-t border-divider pt-4 text-xs leading-relaxed text-muted">
        Smart contract
        <a
          href={addressUrl(ADDRESS)}
          target="_blank"
          rel="noreferrer"
          className="tap ml-1 break-all font-mono text-primary underline underline-offset-4"
        >
          {shortAddress(ADDRESS)}
        </a>
      </p>
    </aside>
  )
}
