import { Banner } from './components.jsx'
import { NETWORK, addressUrl, isDeployed, scanUrl } from './chain.js'
import { ROLE_KEYS, ROLE_LABEL, shortAddress } from './format.js'
import { hasMetaMask, useWallet } from './hooks.js'
import AdminSection from './sections/AdminSection.jsx'

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
            Setiap tahap dicatat oleh pihak yang berwenang dan disimpan permanen di blockchain.
          </p>
        </header>
        <div className="mt-10 space-y-6">
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
          {roles.ADMIN && <AdminSection wallet={wallet} />}
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
        <span className="font-display text-[15px] font-semibold tracking-tight">HalalChain Trace</span>
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

function NoRole({ account }) {
  const url = addressUrl(account)
  return (
    <Card title="Wallet ini belum punya peran">
      Alamat{' '}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="font-mono text-primary underline underline-offset-4">
          {account}
        </a>
      ) : (
        <span className="break-all font-mono">{account}</span>
      )}{' '}
      belum diberi peran. Minta admin memberikan peran lewat bagian "Kelola peran", atau pindah ke akun lain di MetaMask.
    </Card>
  )
}
