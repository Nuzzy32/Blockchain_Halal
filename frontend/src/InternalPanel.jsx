import { useState } from 'react'
import { Banner } from './components.jsx'
import { NETWORK, addressUrl, homeUrl, isDeployed, scanUrl } from './chain.js'
import { ROLE_KEYS, ROLE_LABEL, shortAddress } from './format.js'
import { hasMetaMask, useWallet } from './hooks.js'
import { STAGES } from './workflow.js'
import AdminSection from './sections/AdminSection.jsx'
import FarmerSection from './sections/FarmerSection.jsx'
import SlaughterSection from './sections/SlaughterSection.jsx'
import PackagingSection from './sections/PackagingSection.jsx'
import DistributorSection from './sections/DistributorSection.jsx'

/**
 * Panel untuk admin, peternak, RPH, dan distributor. Bagian yang tampil mengikuti peran
 * wallet aktif di contract; satu wallet bisa punya beberapa peran.
 */
export default function InternalPanel() {
  const wallet = useWallet()
  return (
    <div className="min-h-dvh">
      <TopBar wallet={wallet} />
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10">
        <header className="max-w-2xl">
          <p className="eyebrow">Panel internal · {NETWORK.name}</p>
          <h1 className="font-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Pencatatan Rantai Pasok</h1>
          <p className="mt-4 max-w-prose leading-relaxed text-muted">
            Setiap tahap dicatat oleh pihak yang memegang barangnya saat itu, lalu disimpan permanen di blockchain. Form yang
            tampil menyesuaikan peran wallet Anda.
          </p>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Konsumen tidak perlu halaman ini —{' '}
            <a href={scanUrl()} className="font-medium text-primary underline underline-offset-4">
              pindai QR di kemasan
            </a>
            .
          </p>
        </header>
        <div className="mt-10 space-y-6">
          <Guide roles={wallet.account ? wallet.roles : null} />
          <Body wallet={wallet} />
        </div>
      </main>
    </div>
  )
}

function Body({ wallet }) {
  if (!isDeployed()) return <NotDeployed />
  if (!hasMetaMask()) return <NoWallet />
  if (!wallet.account) return <ConnectCard onConnect={wallet.connect} busy={wallet.connecting} />

  const { roles } = wallet
  const anyRole = roles && ROLE_KEYS.some((k) => roles[k])

  return (
    <>
      {wallet.wrongNetwork && <NetworkBanner onSwitch={wallet.switchNetwork} busy={wallet.switching} />}
      {wallet.error && <Banner tone="danger">{wallet.error}</Banner>}
      {wallet.rolesError ? (
        <Banner
          tone="danger"
          action={
            <button className="btn btn-ghost shrink-0" onClick={wallet.refreshRoles}>
              Coba lagi
            </button>
          }
        >
          Gagal membaca peran wallet: {wallet.rolesError}
        </Banner>
      ) : roles === null ? (
        <div className="card px-6 py-8 text-muted" role="status">
          Membaca peran wallet…
        </div>
      ) : !anyRole ? (
        <NoRole account={wallet.account} />
      ) : (
        // Jaringan salah -> seluruh form terkunci lewat fieldset disabled.
        <fieldset disabled={wallet.wrongNetwork} className="min-w-0 space-y-6">
          <legend className="sr-only">Form pencatatan</legend>
          {roles.ADMIN && <div id="tahap-admin"><AdminSection wallet={wallet} /></div>}
          {roles.FARMER && <div id="tahap-daftar"><FarmerSection /></div>}
          {roles.ABATTOIR && <div id="tahap-sembelih"><SlaughterSection /></div>}
          {roles.ABATTOIR && <div id="tahap-kemas"><PackagingSection account={wallet.account} /></div>}
          {roles.DISTRIBUTOR && <div id="tahap-kirim"><DistributorSection /></div>}
        </fieldset>
      )}
    </>
  )
}

function TopBar({ wallet }) {
  const { roles } = wallet
  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-surface">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-5">
        <a href={homeUrl()} className="tap font-display text-[15px] font-semibold tracking-tight">HalalChain Trace</a>
        <a href={scanUrl()} className="tap ml-auto text-sm font-medium text-primary underline underline-offset-4">
          Pindai QR
        </a>
        {wallet.account && (
          <div className="flex items-center gap-2">
            {roles &&
              ROLE_KEYS.filter((k) => roles[k]).map((k) => (
                <span key={k} className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary sm:inline">
                  {ROLE_LABEL[k]}
                </span>
              ))}
            <span
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-xs"
              style={wallet.wrongNetwork ? { color: 'var(--color-warn-text)' } : undefined}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: wallet.wrongNetwork ? 'var(--color-accent)' : 'var(--color-primary)' }}
              />
              {shortAddress(wallet.account)}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

function Card({ title, children }) {
  return (
    <div className="card px-6 py-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 max-w-md leading-relaxed text-muted">{children}</div>
    </div>
  )
}

function NotDeployed() {
  return (
    <Card title="Contract v1 belum di-deploy">
      Contract HalalChain Trace v1 belum di-deploy ke {NETWORK.name}. Setelah deploy, isi alamatnya di{' '}
      <code className="font-mono text-sm">frontend/src/chain.js</code>.
    </Card>
  )
}

function NoWallet() {
  return (
    <Card title="MetaMask tidak terdeteksi">
      <p>Panel ini menulis transaksi ke blockchain, jadi membutuhkan wallet. Pasang MetaMask, lalu muat ulang halaman.</p>
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="btn btn-primary mt-6">
        Pasang MetaMask
      </a>
      <p className="mt-6 border-t border-divider pt-4 text-sm">
        Konsumen tidak membutuhkan wallet — halaman hasil pindai QR bisa dibuka siapa saja.
      </p>
    </Card>
  )
}

function ConnectCard({ onConnect, busy }) {
  return (
    <Card title="Hubungkan wallet">
      <p>Form pencatatan menyesuaikan peran wallet Anda: admin, peternak, RPH, atau distributor.</p>
      <button onClick={onConnect} disabled={busy} className="btn btn-primary mt-6">
        {busy ? 'Menunggu MetaMask…' : 'Hubungkan MetaMask'}
      </button>
    </Card>
  )
}

function NetworkBanner({ onSwitch, busy }) {
  return (
    <Banner
      tone="warn"
      action={
        <button onClick={onSwitch} disabled={busy} className="btn btn-ghost shrink-0">
          {busy ? 'Memindahkan…' : `Pindah ke ${NETWORK.name}`}
        </button>
      }
    >
      <strong className="font-display block font-semibold" style={{ color: 'var(--color-warn-text)' }}>
        Jaringan salah
      </strong>
      <span className="mt-0.5 block text-muted">Wallet tidak berada di {NETWORK.name}. Form dikunci sampai jaringan benar.</span>
    </Banner>
  )
}

/**
 * Peta alur: siapa mengisi tahap mana. Setelah wallet tersambung, tahap milik wallet ini
 * ditandai dan menjadi tautan ke form-nya; tahap lain menyebut siapa yang mengisinya.
 */
function Guide({ roles }) {
  return (
    <nav aria-label="Alur pencatatan">
      <ol className="grid gap-px overflow-hidden rounded-xl border border-divider bg-divider sm:grid-cols-2">
        {STAGES.map((s, i) => {
          const mine = roles?.[s.role]
          return (
            <li key={s.anchor} className={`flex flex-col px-5 py-4 ${mine ? 'bg-primary-soft' : 'bg-surface'}`}>
              <p className="eyebrow tnum">Tahap {i + 1} · {s.who}</p>
              <p className="font-display mt-1.5 text-[17px] font-semibold leading-snug">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.does}</p>
              {roles &&
                (mine ? (
                  <a href={`#${s.anchor}`} className="tap mt-auto text-sm font-semibold text-primary underline underline-offset-4">
                    Bagian Anda — isi sekarang
                  </a>
                ) : (
                  <p className="mt-auto pt-3 text-sm text-muted">Diisi oleh {s.who}</p>
                ))}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function NoRole({ account }) {
  const [copied, setCopied] = useState(false)
  const url = addressUrl(account)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Card title="Wallet ini belum punya peran">
      <p>Form pencatatan baru muncul setelah admin memberi peran ke alamat wallet ini.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-divider bg-bg px-4 py-3">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="min-w-0 break-all font-mono text-sm text-primary underline underline-offset-4">
            {account}
          </a>
        ) : (
          <span className="min-w-0 break-all font-mono text-sm text-ink">{account}</span>
        )}
        <button type="button" onClick={copy} className="btn btn-ghost ml-auto shrink-0">
          {copied ? 'Tersalin' : 'Salin alamat'}
        </button>
      </div>
      <ol className="mt-5 list-decimal space-y-1.5 pl-5">
        <li>Salin alamat di atas.</li>
        <li>Kirim ke admin sambil menyebut peran Anda: Peternak, RPH, atau Distributor.</li>
        <li>Setelah admin mencatatnya, muat ulang halaman ini.</li>
      </ol>
      <p className="mt-4 text-sm">Salah akun? Pindah akun di MetaMask — halaman menyesuaikan otomatis.</p>
    </Card>
  )
}
