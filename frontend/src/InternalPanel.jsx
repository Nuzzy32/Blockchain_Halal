import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Banner } from './components.jsx'
import { NETWORK, addressUrl, homeUrl, isDeployed, scanUrl } from './chain.js'
import { ROLE_KEYS, ROLE_LABEL, shortAddress } from './format.js'
import { hasMetaMask, useWallet } from './hooks.js'
import { demoAccounts, demoAvailable, errorMessage } from './registry.js'
import { STAGES } from './workflow.js'
import AdminSection from './sections/AdminSection.jsx'
import FarmerSection from './sections/FarmerSection.jsx'
import SlaughterSection from './sections/SlaughterSection.jsx'
import PackagingSection from './sections/PackagingSection.jsx'
import DistributorSection from './sections/DistributorSection.jsx'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const exampleUrl = () => `${import.meta.env.BASE_URL}?trace=1`
const heldRoles = (roles) => (roles ? ROLE_KEYS.filter((k) => roles[k]) : [])
const roleNames = (roles) => heldRoles(roles).map((k) => ROLE_LABEL[k]).join(' + ')

const ROLE_DESC = {
  ADMIN: 'Memberi dan mencabut peran wallet pihak lain.',
  FARMER: STAGES[0].does,
  ABATTOIR: 'Mencatat penyembelihan halal, lalu membuat kemasan dan QR.',
  DISTRIBUTOR: STAGES[3].does,
}

/**
 * Dashboard pencatatan untuk admin, peternak, RPH, dan distributor. Bagian yang tampil mengikuti peran
 * wallet aktif di contract; satu wallet bisa punya beberapa peran.
 */
export default function InternalPanel() {
  const wallet = useWallet()
  const root = useRef(null)

  // Semua animasi opt-in lewat no-preference: kalau tidak berjalan, konten tetap tampil penuh.
  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-hero-in] > *', { y: 28, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07 })
        gsap.from('[data-identity]', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.15 })
      })
    },
    { scope: root },
  )
  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-stage]', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 })
        gsap.utils.toArray('[data-rise]').forEach((el) => {
          gsap.from(el, { y: 32, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } })
        })
      })
    },
    { scope: root, dependencies: [wallet.account, wallet.roles], revertOnUpdate: true },
  )

  return (
    <div ref={root} className="min-h-dvh bg-bg">
      <Nav wallet={wallet} />
      <main className="w-full max-w-full overflow-x-clip">
        <Hero wallet={wallet} />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <div className="min-w-0 space-y-8">
            <Body wallet={wallet} />
          </div>
          <Aside />
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Nav({ wallet }) {
  const roles = heldRoles(wallet.roles)
  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4">
      <nav
        aria-label="Utama"
        className="mx-auto flex max-w-7xl items-center gap-2 rounded-full border border-white/50 bg-surface/85 py-2 pl-5 pr-2 shadow-[0_12px_40px_-12px_rgb(11_29_19/0.35)] backdrop-blur-xl"
      >
        <a href={homeUrl()} className="font-display flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Seal className="h-5 w-5 text-primary" />
          <span className="max-sm:sr-only">HalalChain Trace</span>
        </a>
        <span className="hidden text-sm text-muted md:inline">/ Dashboard pencatatan</span>
        <a href={scanUrl()} className="ml-auto hidden rounded-full px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary-soft hover:text-ink sm:block">
          Pindai QR
        </a>
        {wallet.account ? (
          <div className="flex items-center gap-2 max-sm:ml-auto">
            {roles.map((k) => (
              <span key={k} className="hidden rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary lg:inline">
                {ROLE_LABEL[k]}
              </span>
            ))}
            <span
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-night px-3.5 py-2 font-mono text-xs text-[#f0fdf4]"
              title={wallet.account}
            >
              <span aria-hidden className={`h-2 w-2 rounded-full ${wallet.wrongNetwork ? 'bg-accent' : 'bg-[#4ade80]'}`} />
              {shortAddress(wallet.account)}
            </span>
            {wallet.demo && (
              <button
                type="button"
                onClick={wallet.demoLogout}
                className="whitespace-nowrap rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition-colors hover:border-primary hover:bg-primary-soft"
              >
                Keluar demo
              </button>
            )}
          </div>
        ) : (
          <span className="rounded-full bg-night px-4 py-2.5 text-sm font-semibold text-white max-sm:ml-auto">Belum masuk</span>
        )}
      </nav>
    </header>
  )
}

function heroCopy(wallet) {
  if (!isDeployed()) return ['Contract belum siap dipakai.', 'Deploy contract dulu, lalu isi alamatnya di frontend/src/chain.js.']
  if (!wallet.account)
    return [
      'Catat setiap tahap, dari kandang sampai kemasan.',
      'Masuk dengan akun Anda. Form yang muncul menyesuaikan peran: peternak, RPH, distributor, atau admin.',
    ]
  if (wallet.roles === null) return ['Membaca peran akun Anda…', 'Sebentar, peran dibaca langsung dari smart contract.']
  const names = roleNames(wallet.roles)
  if (!names) return ['Akun ini belum punya peran.', 'Minta admin memberi peran ke alamat wallet ini, atau masuk dengan akun lain.']
  return [`Anda masuk sebagai ${names}.`, 'Tahap yang menjadi bagian Anda ditandai terang di bawah. Klik untuk langsung ke form-nya.']
}

function Hero({ wallet }) {
  const [title, lead] = heroCopy(wallet)
  return (
    <section className="grain relative isolate overflow-hidden bg-night text-[#f0fdf4]">
      <div aria-hidden className="absolute -left-32 -top-20 -z-10 h-[32rem] w-[32rem] rounded-full bg-[#1f7a45] opacity-35 blur-[140px]" />
      <div aria-hidden className="absolute -right-24 bottom-0 -z-10 h-[24rem] w-[24rem] rounded-full bg-[#b45309] opacity-15 blur-[140px]" />

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-36 sm:px-8 md:pb-20 md:pt-44">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
          <div data-hero-in className="max-w-4xl">
            <p className="text-sm font-medium text-[#9fc9ad]">Dashboard pencatatan · {NETWORK.name}</p>
            <h1 className="font-display mt-5 text-[clamp(2.25rem,4.4vw,4.25rem)] font-semibold leading-[1.03] tracking-[-0.035em] [text-wrap:balance]">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#b9d3c1]">{lead}</p>
          </div>
          <Identity wallet={wallet} />
        </div>

        <StageMap roles={wallet.account ? wallet.roles : null} />
      </div>
    </section>
  )
}

function Identity({ wallet }) {
  const roles = heldRoles(wallet.roles)
  return (
    <aside
      data-identity
      aria-label="Akun aktif"
      className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-md lg:translate-y-6"
    >
      {wallet.account ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#b9d3c1]">{wallet.demo ? 'Akun demo' : 'Akun MetaMask'}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${wallet.wrongNetwork ? 'bg-accent text-black' : 'bg-[#4ade80]/15 text-[#86efac]'}`}>
              {wallet.wrongNetwork ? 'Jaringan salah' : 'Terhubung'}
            </span>
          </div>
          <p className="mt-3 break-all font-mono text-sm text-[#f0fdf4]">{wallet.account}</p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5">
            {wallet.roles === null ? (
              <span className="text-sm text-[#b9d3c1]">Membaca peran…</span>
            ) : roles.length ? (
              roles.map((k) => (
                <span key={k} className="rounded-full bg-[#f0fdf4] px-3 py-1.5 text-sm font-semibold text-night">
                  {ROLE_LABEL[k]}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#b9d3c1]">Belum punya peran</span>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[#b9d3c1]">Belum masuk</p>
          <p className="font-display mt-2 text-2xl font-semibold tracking-tight">Tiga langkah untuk mulai</p>
          <ol className="mt-4 space-y-2 text-[15px] leading-relaxed text-[#b9d3c1]">
            <li className="flex gap-3"><Num n={1} /> {demoAvailable() ? 'Pilih akun demo atau hubungkan MetaMask.' : 'Hubungkan MetaMask.'}</li>
            <li className="flex gap-3"><Num n={2} /> Isi form tahap yang menjadi bagian Anda.</li>
            <li className="flex gap-3"><Num n={3} /> Periksa ringkasan, lalu simpan ke blockchain.</li>
          </ol>
        </>
      )}
    </aside>
  )
}

function Num({ n }) {
  return (
    <span aria-hidden className="font-display mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[#f0fdf4]">
      {n}
    </span>
  )
}

/**
 * Peta alur: siapa mengisi tahap mana. Setelah wallet tersambung, tahap milik wallet ini
 * menyala dan menjadi tautan ke form-nya; tahap lain menyebut siapa yang mengisinya.
 */
function StageMap({ roles }) {
  return (
    <nav aria-label="Alur pencatatan" className="mt-16 md:mt-20">
      <ol className="grid grid-flow-dense gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((s, i) => {
          const mine = roles?.[s.role]
          const body = (
            <>
              <span className="flex items-center justify-between gap-3">
                <span className={`font-display text-4xl font-semibold tnum ${mine ? 'text-primary' : 'text-white/25'}`}>{i + 1}</span>
                <span className={`text-sm font-semibold ${mine ? 'text-primary' : 'text-[#9fc9ad]'}`}>{s.who}</span>
              </span>
              <span className="font-display mt-6 block text-xl font-semibold tracking-tight">{s.title}</span>
              <span className={`mt-1.5 block text-sm leading-relaxed ${mine ? 'text-muted' : 'text-[#b9d3c1]'}`}>{s.does}</span>
              <span className={`mt-5 flex items-center gap-1.5 text-sm font-semibold ${mine ? 'text-primary' : 'text-[#9fc9ad]'}`}>
                {mine ? (
                  <>
                    Isi sekarang
                    <Arrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                ) : roles ? (
                  `Diisi oleh ${s.who}`
                ) : (
                  'Butuh peran ' + s.who
                )}
              </span>
            </>
          )
          return (
            <li key={s.anchor} data-stage className="flex">
              {mine ? (
                <a href={`#${s.anchor}`} className="group flex w-full flex-col rounded-[1.5rem] bg-[#f0fdf4] p-6 text-night transition-transform duration-300 hover:-translate-y-1">
                  {body}
                </a>
              ) : (
                <div className="flex w-full flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Body({ wallet }) {
  if (!isDeployed()) return <NotDeployed />
  if (!wallet.account) {
    return (
      <>
        {demoAvailable() && <DemoLogin onPick={wallet.demoLogin} />}
        {hasMetaMask() ? <ConnectCard onConnect={wallet.connect} busy={wallet.connecting} /> : <NoWallet />}
      </>
    )
  }

  const { roles } = wallet
  const anyRole = heldRoles(roles).length > 0

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
        <div className="card space-y-4 px-8 py-10" role="status">
          <span className="sr-only">Membaca peran wallet…</span>
          <div aria-hidden className="h-4 w-32 animate-pulse rounded-full bg-divider" />
          <div aria-hidden className="h-8 w-72 animate-pulse rounded-full bg-divider" />
          <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-divider/60" />
        </div>
      ) : !anyRole ? (
        <>
          {/* MetaMask bisa tersambung otomatis dengan akun pribadi tanpa peran; tetap tawarkan akun demo. */}
          {demoAvailable() && !wallet.demo && <DemoLogin onPick={wallet.demoLogin} />}
          <NoRole account={wallet.account} />
        </>
      ) : (
        // Jaringan salah -> seluruh form terkunci lewat fieldset disabled.
        <fieldset disabled={wallet.wrongNetwork} className="min-w-0 space-y-8">
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

function Aside() {
  return (
    <aside className="self-start lg:sticky lg:top-28">
      <div className="rounded-[1.5rem] border border-divider bg-surface p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Sebelum menyimpan</h2>
        <ul className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted">
          {[
            ['Permanen.', 'Data yang tersimpan tidak bisa diubah atau dihapus, bahkan oleh admin.'],
            ['Periksa ringkasan.', 'Setiap form menampilkan ringkasan dulu sebelum disimpan.'],
            ['Publik.', 'Jangan isi nama orang, NIK, atau alamat. Pakai kode, misalnya FARM-JTG-001.'],
          ].map(([b, t]) => (
            <li key={b} className="flex gap-3">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="font-semibold text-ink">{b}</strong> {t}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 rounded-[1.5rem] bg-primary-soft p-6">
        <p className="font-display font-semibold">Ingin melihat hasilnya?</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">Begini tampilan yang dilihat konsumen setelah memindai QR.</p>
        <a href={exampleUrl()} className="btn btn-ghost mt-4">
          Lihat contoh hasil pindai
        </a>
      </div>
    </aside>
  )
}

/** Hanya di node Hardhat lokal: masuk sebagai akun tes tanpa MetaMask. */
function DemoLogin({ onPick }) {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    demoAccounts()
      .then((accounts) => !cancelled && setState({ status: 'ok', accounts }))
      .catch((err) => !cancelled && setState({ status: 'error', message: errorMessage(err) }))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section data-rise className="card overflow-hidden" aria-labelledby="demo-title">
      <header className="border-b border-divider px-6 py-6 sm:px-8 sm:py-7">
        <p className="text-sm font-semibold text-primary">Mode demo · khusus {NETWORK.name}</p>
        <h2 id="demo-title" className="font-display mt-1 text-2xl font-semibold tracking-tight">
          Pilih pihak yang ingin Anda perankan
        </h2>
        <p className="mt-1.5 max-w-lg text-[15px] leading-relaxed text-muted">
          Tanpa MetaMask. Transaksi ditandatangani akun tes node lokal — tidak tersedia di jaringan publik.
        </p>
      </header>
      <div className="px-6 py-7 sm:px-8">
        {state.status === 'loading' && (
          <div className="grid gap-3 sm:grid-cols-2" role="status">
            <span className="sr-only">Membaca akun tes dari node lokal…</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden className="h-32 animate-pulse rounded-[1.25rem] bg-divider/60" />
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }} role="alert">
            Node lokal tidak bisa dihubungi. Jalankan <code className="font-mono">npx hardhat node</code>, lalu muat ulang. ({state.message})
          </p>
        )}
        {state.status === 'ok' && state.accounts.length === 0 && (
          <p className="text-sm text-muted">Belum ada akun tes yang punya peran. Jalankan skrip deploy dan seed dulu (lihat docs/deployment-v1.md).</p>
        )}
        {state.status === 'ok' && state.accounts.length > 0 && (
          <ul className="grid grid-flow-dense gap-3 sm:grid-cols-2">
            {state.accounts.map((a) => {
              const keys = heldRoles(a.roles)
              return (
                <li key={a.address} className="flex sm:[&:last-child:nth-child(odd)]:col-span-2">
                  <button
                    type="button"
                    onClick={() => onPick(a.address)}
                    aria-label={`Masuk sebagai ${keys.map((k) => ROLE_LABEL[k]).join(' + ')}`}
                    className="group flex w-full flex-col items-start rounded-[1.25rem] border border-divider bg-bg p-5 text-left transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft"
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="font-display text-xl font-semibold tracking-tight">{keys.map((k) => ROLE_LABEL[k]).join(' + ')}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-night text-[#f0fdf4] transition-transform duration-300 group-hover:translate-x-1">
                        <Arrow className="h-4 w-4" />
                      </span>
                    </span>
                    <span className="mt-2 text-sm leading-relaxed text-muted">{ROLE_DESC[keys[0]]}</span>
                    <span className="mt-4 font-mono text-xs text-muted">{shortAddress(a.address)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function Card({ title, children }) {
  return (
    <section data-rise className="card px-6 py-8 sm:px-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 max-w-xl leading-relaxed text-muted">{children}</div>
    </section>
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
      <p>Dashboard ini menulis transaksi ke blockchain, jadi membutuhkan wallet. Pasang MetaMask, lalu muat ulang halaman.</p>
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="btn btn-primary mt-6">
        Pasang MetaMask
      </a>
      <p className="mt-6 border-t border-divider pt-4 text-sm">Konsumen tidak membutuhkan wallet — halaman hasil pindai QR bisa dibuka siapa saja.</p>
    </Card>
  )
}

function ConnectCard({ onConnect, busy }) {
  return (
    <Card title={demoAvailable() ? 'Atau hubungkan MetaMask' : 'Hubungkan MetaMask'}>
      <p>Pakai akun MetaMask yang sudah diberi peran oleh admin. Form pencatatan menyesuaikan peran akun itu.</p>
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
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-divider bg-bg px-4 py-3">
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
      <ol className="mt-6 space-y-3">
        {[
          'Salin alamat di atas.',
          'Kirim ke admin sambil menyebut peran Anda: Peternak, RPH, atau Distributor.',
          'Setelah admin mencatatnya, muat ulang halaman ini.',
        ].map((t, i) => (
          <li key={t} className="flex gap-3">
            <span aria-hidden className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-night text-xs font-semibold text-[#f0fdf4]">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm">Salah akun? Pindah akun di MetaMask — halaman menyesuaikan otomatis.</p>
    </Card>
  )
}

function Footer() {
  return (
    <footer className="border-t border-divider">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:px-8">
        <p>HalalChain Trace · data tercatat di {NETWORK.name}</p>
        <ul className="flex flex-wrap gap-x-6">
          <li><a className="tap hover:text-ink" href={homeUrl()}>Beranda</a></li>
          <li><a className="tap hover:text-ink" href={scanUrl()}>Pindai QR</a></li>
        </ul>
      </div>
    </footer>
  )
}

/* ---------- ikon SVG inline ---------- */

function Seal(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 2.5l2.4 1.5 2.8-.3 1 2.7 2.3 1.7-1 2.7 1 2.7-2.3 1.7-1 2.7-2.8-.3L12 21.5l-2.4-1.6-2.8.3-1-2.7-2.3-1.7 1-2.7-1-2.7 2.3-1.7 1-2.7 2.8.3L12 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.5 12l2.4 2.4 4.6-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Arrow(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
