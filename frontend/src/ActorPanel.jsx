import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import {
  ADDRESS,
  AMOY_PARAMS,
  CHAIN_ID,
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
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Panel Pencatatan Rantai Pasok
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Setiap tahap dicatat oleh aktor yang berwenang dan disimpan permanen di
            jaringan Polygon Amoy. Hubungkan wallet untuk mulai mencatat.
          </p>
        </header>

        {!hasMetaMask() ? (
          <NoWallet />
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              {wallet.account && wallet.wrongNetwork && (
                <NetworkBanner onSwitch={wallet.switchNetwork} busy={wallet.switching} />
              )}
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
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Traceability Sapi
        </span>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-muted sm:inline">
          Panel Aktor
        </span>

        {wallet.account && (
          <div className="ml-auto flex items-center gap-2">
            {wallet.role !== null && wallet.role !== Role.None && (
              <span className="hidden rounded-full bg-forest-100 px-2.5 py-1 text-[12px] font-medium text-forest sm:inline">
                {ROLE_LABEL[wallet.role]}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[12px] ${
                wallet.wrongNetwork
                  ? 'border-amber-brand/40 bg-amber-soft text-amber-brand'
                  : 'border-line text-muted'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  wallet.wrongNetwork ? 'bg-amber-brand' : 'bg-forest-600'
                }`}
              />
              {shortAddress(wallet.account)}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

function NoWallet() {
  return (
    <div className="card mt-8 max-w-xl px-6 py-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        MetaMask tidak terdeteksi
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Panel ini menulis transaksi ke blockchain, jadi membutuhkan wallet. Pasang ekstensi
        MetaMask, lalu muat ulang halaman ini.
      </p>
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary mt-5"
      >
        Pasang MetaMask
      </a>
      <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
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
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        Form pencatatan akan menyesuaikan dengan role wallet Anda: peternak, rumah potong,
        atau distributor.
      </p>
      <button onClick={onConnect} disabled={busy} className="btn btn-primary mt-5">
        {busy ? 'Menunggu MetaMask…' : 'Hubungkan MetaMask'}
      </button>
    </div>
  )
}

function NetworkBanner({ onSwitch, busy }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-brand/30 bg-amber-soft px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-amber-brand">Jaringan salah</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink/70">
          Wallet Anda tidak berada di Polygon Amoy. Transaksi akan gagal atau terkirim ke
          jaringan yang keliru.
        </p>
      </div>
      <button onClick={onSwitch} disabled={busy} className="btn btn-ghost shrink-0">
        {busy ? 'Memindahkan…' : 'Pindah ke Amoy'}
      </button>
    </div>
  )
}

/* ---------- form per role ---------- */

const FORMS = {
  [Role.Farmer]: {
    title: 'Daftarkan sapi baru',
    lead: 'Catat data awal sapi. Nomor ini yang nanti dicetak sebagai QR code di kemasan.',
    action: 'Daftarkan sapi',
    fields: [
      { name: 'id', label: 'Nomor sapi', type: 'number', placeholder: 'mis. 2', min: 1 },
      { name: 'age', label: 'Umur (bulan)', type: 'number', placeholder: 'mis. 24', min: 1 },
      { name: 'feedType', label: 'Jenis pakan', placeholder: 'mis. Rumput & Konsentrat' },
      { name: 'grade', label: 'Grade', placeholder: 'mis. A' },
    ],
    send: (ct, f) => ct.registerCattle(f.id, f.age, f.feedType, f.grade),
  },
  [Role.Butcher]: {
    title: 'Catat penyembelihan',
    lead: 'Tanggal diambil otomatis dari waktu blockchain, bukan diisi manual.',
    action: 'Catat penyembelihan',
    fields: [{ name: 'id', label: 'Nomor sapi', type: 'number', placeholder: 'mis. 2', min: 1 }],
    send: (ct, f) => ct.recordSlaughter(f.id),
  },
  [Role.Distributor]: {
    title: 'Catat pengiriman',
    lead: 'Hanya sapi yang sudah tercatat disembelih yang dapat dikirim.',
    action: 'Catat pengiriman',
    fields: [{ name: 'id', label: 'Nomor sapi', type: 'number', placeholder: 'mis. 2', min: 1 }],
    send: (ct, f) => ct.recordShipping(f.id),
  },
}

function RoleForm({ wallet }) {
  const cfg = FORMS[wallet.role]
  const [values, setValues] = useState({})
  const [tx, setTx] = useState({ status: 'idle' })

  const locked = wallet.wrongNetwork || tx.status === 'signing' || tx.status === 'mining'

  if (wallet.role === null) return <div className="card px-6 py-8 text-muted">Membaca role…</div>

  if (!cfg) {
    return (
      <div className="card px-6 py-8">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Wallet ini belum punya role
        </h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
          Alamat{' '}
          <a
            href={addressUrl(wallet.account)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-forest-600 underline underline-offset-4"
          >
            {shortAddress(wallet.account)}
          </a>{' '}
          belum ditetapkan sebagai peternak, rumah potong, atau distributor. Pemilik
          contract harus memanggil <code className="font-mono text-[13px]">setRole</code>{' '}
          terlebih dahulu, atau pindah ke akun aktor di MetaMask.
        </p>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setTx({ status: 'signing' })
    try {
      const ct = await writeContract()
      const sent = await cfg.send(ct, values)
      setTx({ status: 'mining', hash: sent.hash })
      await sent.wait()
      setTx({ status: 'success', hash: sent.hash })
      setValues({})
    } catch (err) {
      setTx({ status: 'error', message: errorMessage(err) })
    }
  }

  return (
    <div className="card px-6 py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{cfg.title}</h2>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">{cfg.lead}</p>
        </div>
        <span className="shrink-0 rounded-full bg-forest-100 px-3 py-1 text-[12px] font-medium text-forest">
          {ROLE_LABEL[wallet.role]}
        </span>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {cfg.fields.map((f) => (
            <label key={f.name} className="block">
              <span className="mb-1.5 block text-[13px] font-medium">{f.label}</span>
              <input
                className="field"
                type={f.type ?? 'text'}
                min={f.min}
                placeholder={f.placeholder}
                required
                disabled={locked}
                value={values[f.name] ?? ''}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            </label>
          ))}
        </div>

        <button type="submit" disabled={locked} className="btn btn-primary">
          {tx.status === 'signing' && 'Menunggu tanda tangan…'}
          {tx.status === 'mining' && 'Menunggu konfirmasi blockchain…'}
          {tx.status !== 'signing' && tx.status !== 'mining' && cfg.action}
        </button>
      </form>

      <TxStatus tx={tx} />
    </div>
  )
}

function TxStatus({ tx }) {
  if (tx.status === 'idle' || tx.status === 'signing') return null

  if (tx.status === 'error') {
    return (
      <p className="animate-rise mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] leading-relaxed text-red-800">
        {tx.message}
      </p>
    )
  }

  const done = tx.status === 'success'
  return (
    <div
      className={`animate-rise mt-5 rounded-lg border px-4 py-3 text-[14px] leading-relaxed ${
        done ? 'border-forest-600/30 bg-forest-100 text-forest' : 'border-line bg-paper text-muted'
      }`}
    >
      <p className="font-medium">
        {done ? 'Tercatat di blockchain.' : 'Transaksi terkirim, menunggu konfirmasi…'}
      </p>
      <a
        href={txUrl(tx.hash)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block break-all font-mono text-[12px] underline underline-offset-4"
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
  const valid = /^\d+$/.test(id) && Number(id) > 0
  const url = valid ? trackUrl(id) : ''

  const download = () => {
    const canvas = box.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `qr-sapi-${id}.png`
    a.click()
  }

  return (
    <aside className="card px-6 py-7">
      <h2 className="font-display text-lg font-semibold tracking-tight">QR untuk kemasan</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Cetak QR ini di label kemasan. Konsumen memindainya dengan kamera ponsel biasa —
        tanpa aplikasi khusus, tanpa wallet.
      </p>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-[13px] font-medium">Nomor sapi</span>
        <input
          className="field"
          type="number"
          min={1}
          placeholder="mis. 2"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
      </label>

      {valid ? (
        <div className="animate-rise mt-5">
          <div
            ref={box}
            className="flex justify-center rounded-xl border border-line bg-white p-5"
          >
            <QRCodeCanvas value={url} size={192} level="M" marginSize={2} />
          </div>
          <p className="mt-3 break-all text-center font-mono text-[11px] leading-relaxed text-muted">
            {url}
          </p>
          <button onClick={download} className="btn btn-ghost mt-3 w-full">
            Unduh PNG
          </button>
        </div>
      ) : (
        <div className="mt-5 flex h-[248px] items-center justify-center rounded-xl border border-dashed border-line text-[13px] text-muted">
          Isi nomor sapi untuk membuat QR
        </div>
      )}

      <p className="mt-5 border-t border-line pt-4 text-[12px] leading-relaxed text-muted">
        Smart contract
        <a
          href={addressUrl(ADDRESS)}
          target="_blank"
          rel="noreferrer"
          className="ml-1 break-all font-mono text-forest-600 underline underline-offset-4"
        >
          {shortAddress(ADDRESS)}
        </a>
      </p>
    </aside>
  )
}
