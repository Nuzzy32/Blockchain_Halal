import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { NETWORK, addressUrl, isDeployed, panelUrl, scanUrl } from './chain.js'
import { STAGES } from './workflow.js'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const img = (seed, w = 1600, h = 1200) => `https://picsum.photos/seed/${seed}/${w}/${h}`
const exampleUrl = () => `${import.meta.env.BASE_URL}?trace=1`

const RECORDED = [
  'Nomor sertifikat halal',
  'ID juru sembelih',
  'Metode sembelih',
  'Kode peternakan',
  'Umur & berat hidup',
  'Jenis pakan',
  'Waktu kemas',
  'Waktu kirim',
  'Wallet pencatat',
]

const STATEMENT =
  'Sistem ini tidak menerbitkan sertifikat halal. Ia mencatat klaim setiap pihak secara permanen dan menunjukkan siapa yang mencatatnya. Penilaian sah tidaknya penyembelihan tetap wewenang lembaga sertifikasi halal.'

export default function Landing() {
  const root = useRef(null)

  // Semua animasi opt-in lewat no-preference: kalau tidak berjalan, konten tetap tampil penuh.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-hero] > *', { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 })
        gsap.from('[data-hero-media]', { y: 60, scale: 0.92, opacity: 0, duration: 1.2, ease: 'power3.out', delay: 0.25 })

        gsap.utils.toArray('[data-grow]').forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 0.86, opacity: 0.4 },
            { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 45%', scrub: true } },
          )
        })

        gsap.utils.toArray('[data-rise]').forEach((el) => {
          gsap.from(el, { y: 48, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
        })

        gsap.fromTo(
          '[data-word]',
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.05,
            ease: 'none',
            scrollTrigger: { trigger: '[data-statement]', start: 'top 75%', end: 'bottom 45%', scrub: true },
          },
        )
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="bg-bg">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">
        Lewati ke konten
      </a>
      <Nav />
      {/* clip, bukan hidden: overflow-x hidden menjadikan main scroll container dan mematikan sticky. */}
      <main id="konten" className="w-full max-w-full overflow-x-clip">
        <Hero />
        <Marquee />
        <Why />
        <HowItWorks />
        <Roles />
        <Statement />
        <Action />
      </main>
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4">
      <nav
        aria-label="Utama"
        className="mx-auto flex max-w-5xl items-center gap-2 rounded-full border border-white/50 bg-surface/85 py-2 pl-5 pr-2 shadow-[0_12px_40px_-12px_rgb(11_29_19/0.35)] backdrop-blur-xl"
      >
        <a href="#konten" className="font-display flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Seal className="h-5 w-5 text-primary" />
          HalalChain Trace
        </a>
        <ul className="ml-auto hidden items-center gap-1 text-sm font-medium md:flex">
          {[
            ['#cara-kerja', 'Cara kerja'],
            ['#peran', 'Siapa mengisi'],
            ['#batasan', 'Batasan'],
          ].map(([href, text]) => (
            <li key={href}>
              <a href={href} className="rounded-full px-3 py-2 text-muted transition-colors hover:bg-primary-soft hover:text-ink">
                {text}
              </a>
            </li>
          ))}
        </ul>
        <a href={panelUrl()} className="ml-auto hidden rounded-full px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-primary-soft sm:block md:ml-2">
          Masuk panel
        </a>
        <a href={scanUrl()} className="rounded-full bg-night px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px active:translate-y-px max-sm:ml-auto">
          Pindai QR
        </a>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="grain relative isolate overflow-hidden bg-night text-[#f0fdf4]">
      <div aria-hidden className="absolute -left-40 top-10 -z-10 h-[36rem] w-[36rem] rounded-full bg-[#1f7a45] opacity-35 blur-[140px]" />
      <div aria-hidden className="absolute -right-32 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#b45309] opacity-15 blur-[140px]" />

      <div className="mx-auto max-w-7xl px-5 pb-28 pt-40 sm:px-8 md:pb-40 md:pt-48">
        <div data-hero className="max-w-6xl">
          <p className="text-sm font-medium text-[#9fc9ad]">Ketertelusuran daging sapi halal di blockchain</p>
          <h1 className="font-display mt-6 text-[clamp(2.6rem,5.4vw,5.6rem)] font-semibold leading-[1.02] tracking-[-0.035em] [text-wrap:balance]">
            Dari kandang
            <span
              aria-hidden
              className="mx-[0.18em] inline-block h-[0.78em] w-[1.9em] rounded-full bg-cover bg-center align-[-0.06em] grayscale contrast-125"
              style={{ backgroundImage: `url(${img('pasture-green', 480, 240)})` }}
            />
            sampai kemasan, riwayatnya bisa Anda periksa sendiri.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#b9d3c1] md:text-xl">
            Peternak, rumah potong, dan distributor mencatat setiap tahap ke smart contract. Konsumen cukup memindai QR di
            label untuk melihat asal sapi, data penyembelihan halal, dan siapa yang mencatatnya.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={scanUrl()} className="rounded-full bg-[#f0fdf4] px-7 py-4 text-base font-semibold text-night transition-transform hover:-translate-y-0.5 active:translate-y-0">
              Pindai kemasan
            </a>
            <a href={exampleUrl()} className="rounded-full border border-white/35 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10">
              Lihat contoh hasil pindai
            </a>
          </div>
        </div>

        <figure
          data-hero-media
          className="relative mt-20 ml-auto w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/10 md:-mt-10 lg:-mt-40 lg:mr-[-2rem]"
        >
          <img
            src={img('abattoir-cold', 1200, 800)}
            alt="Ruang pendingin rumah potong hewan"
            className="aspect-[3/2] w-full object-cover opacity-80 grayscale contrast-125"
            loading="eager"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
            <span>
              <span className="block font-mono text-xs text-[#9fc9ad]">HCT-P-000005</span>
              <span className="font-display mt-1 block text-xl font-semibold">Sirloin · 500 g · Dikirim</span>
            </span>
            <span className="shrink-0 text-right text-sm text-[#b9d3c1]">4 dari 4 tahap tercatat</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function Marquee() {
  const row = RECORDED.map((t) => (
    <span key={t} className="font-display flex shrink-0 items-center gap-10 pr-10 text-2xl font-medium text-ink/80 md:text-3xl">
      {t}
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
    </span>
  ))
  return (
    <section aria-label="Data yang dicatat" className="border-b border-divider bg-surface py-8">
      <div className="marquee flex w-max" aria-hidden>
        {row}
        {row}
      </div>
      <p className="sr-only">Data yang dicatat: {RECORDED.join(', ')}.</p>
    </section>
  )
}

function Why() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-32 sm:px-8 md:py-48">
      <h2 data-rise className="font-display max-w-5xl text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">
        Label halal hanya selembar kertas. Riwayat di baliknya yang membuat label itu bisa dipercaya.
      </h2>

      <div className="mt-16 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-[minmax(18rem,auto)_minmax(18rem,auto)]">
        <article className="group relative isolate flex flex-col justify-end overflow-hidden rounded-[1.75rem] bg-night p-8 text-[#f0fdf4] md:col-span-2 md:row-span-2 md:p-10">
          <img
            src={img('phone-market', 1200, 1400)}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45 grayscale contrast-125 transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/60 to-night/10" />
          <h3 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Konsumen tidak perlu aplikasi.</h3>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-[#b9d3c1]">
            Kamera ponsel biasa membuka halaman riwayat kemasan. Tanpa akun, tanpa wallet, tanpa biaya.
          </p>
        </article>

        <article className="group flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-primary p-8 text-white md:col-span-2">
          <p className="font-display text-[clamp(3rem,6vw,5rem)] font-semibold leading-none tracking-tight transition-transform duration-700 ease-out group-hover:translate-x-2">
            Permanen.
          </p>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/85">
            Setelah tercatat, data tidak bisa diedit atau dihapus — bahkan oleh admin sistem ini.
          </p>
        </article>

        <article className="group rounded-[1.75rem] border border-divider bg-surface p-8 transition-colors hover:border-primary">
          <Key className="h-8 w-8 text-primary transition-transform duration-500 group-hover:-rotate-12" />
          <h3 className="font-display mt-8 text-xl font-semibold tracking-tight">Hanya pihak berwenang</h3>
          <p className="mt-2 leading-relaxed text-muted">Setiap tahap hanya bisa diisi wallet yang diberi peran oleh admin.</p>
        </article>

        <article className="group rounded-[1.75rem] border border-divider bg-warn-bg p-8 transition-colors hover:border-accent">
          <Glass className="h-8 w-8 text-warn-text transition-transform duration-500 group-hover:scale-110" />
          <h3 className="font-display mt-8 text-xl font-semibold tracking-tight">Cek tanpa percaya kami</h3>
          <p className="mt-2 leading-relaxed text-muted">Semua data terbuka di block explorer {NETWORK.name}.</p>
        </article>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="cara-kerja" className="border-y border-divider bg-surface">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-32 sm:px-8 md:py-48 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="self-start lg:sticky lg:top-28">
          <h2 className="font-display text-[clamp(2.25rem,4.2vw,4rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            Empat tahap, tiga pihak, satu riwayat.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Setiap tahap diisi oleh pihak yang memegang barangnya saat itu. Tahap berikutnya hanya bisa dicatat setelah tahap
            sebelumnya selesai, jadi urutannya tidak bisa diakali.
          </p>
          <a href={panelUrl()} className="btn btn-primary mt-10">
            Buka panel pencatatan
          </a>
        </div>

        <ol className="space-y-5">
          {STAGES.map((s, i) => (
            <li key={s.title} data-rise className="rounded-[1.5rem] border border-divider bg-bg p-7 md:p-9">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-semibold text-white tnum">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-primary">Diisi oleh {s.who}</span>
              </div>
              <h3 className="font-display mt-5 text-2xl font-semibold tracking-tight md:text-3xl">{s.title}</h3>
              <p className="mt-2 text-lg leading-relaxed text-muted">{s.does}</p>
              <div className="mt-6 grid gap-6 border-t border-divider pt-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold">Yang diisi</p>
                  <ul className="mt-2 space-y-1 text-muted">
                    {s.fills.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold">Hasilnya</p>
                  <p className="mt-2 leading-relaxed text-muted">{s.gets}</p>
                </div>
              </div>
            </li>
          ))}
          <li data-rise className="rounded-[1.5rem] bg-night p-7 text-[#f0fdf4] md:p-9">
            <span className="text-sm font-semibold text-[#9fc9ad]">Lalu konsumen</span>
            <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight md:text-3xl">Memindai QR di toko</h3>
            <p className="mt-2 text-lg leading-relaxed text-[#b9d3c1]">
              Keempat tahap tampil berurutan, lengkap dengan tanggal, data halal, dan tautan ke transaksinya.
            </p>
          </li>
        </ol>
      </div>
    </section>
  )
}

const ROLES = [
  {
    who: 'Peternak',
    task: 'Mendaftarkan sapi yang siap dijual.',
    need: 'MetaMask dan peran Peternak dari admin.',
    href: `${panelUrl()}#tahap-daftar`,
    cta: 'Daftarkan sapi',
    seed: 'cattle-field',
  },
  {
    who: 'RPH',
    task: 'Mencatat penyembelihan halal, lalu membuat kemasan dan mencetak QR.',
    need: 'MetaMask dan peran RPH dari admin.',
    href: `${panelUrl()}#tahap-sembelih`,
    cta: 'Catat penyembelihan',
    seed: 'butcher-steel',
  },
  {
    who: 'Distributor',
    task: 'Mencatat kemasan yang dikirim ke toko.',
    need: 'MetaMask dan peran Distributor dari admin.',
    href: `${panelUrl()}#tahap-kirim`,
    cta: 'Catat pengiriman',
    seed: 'truck-road',
  },
  {
    who: 'Konsumen',
    task: 'Memeriksa riwayat kemasan sebelum membeli.',
    need: 'Cukup kamera ponsel.',
    href: scanUrl(),
    cta: 'Pindai QR',
    seed: 'grocery-shelf',
  },
  {
    who: 'Admin',
    task: 'Memberi dan mencabut peran wallet pihak lain.',
    need: 'Wallet yang men-deploy contract.',
    href: `${panelUrl()}#tahap-admin`,
    cta: 'Kelola peran',
    seed: 'office-desk',
  },
]

function Roles() {
  const [open, setOpen] = useState(0)
  return (
    <section id="peran" className="mx-auto max-w-7xl px-5 py-32 sm:px-8 md:py-48">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 data-rise className="font-display max-w-3xl text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
          Anda yang mana? Mulai dari sini.
        </h2>
        <p className="max-w-sm text-muted">Peran diberikan admin ke alamat wallet Anda. Belum punya? Kirim alamat wallet ke admin.</p>
      </div>

      <div className="mt-16 flex flex-col gap-3 lg:h-[30rem] lg:flex-row">
        {ROLES.map((r, i) => {
          const active = open === i
          return (
            <article
              key={r.who}
              onMouseEnter={() => setOpen(i)}
              className={`group relative isolate flex min-h-[15rem] overflow-hidden rounded-[1.5rem] bg-night text-[#f0fdf4] transition-[flex-grow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:min-h-0 ${
                active ? 'lg:grow-[4]' : 'lg:grow'
              } lg:basis-0`}
            >
              <img
                src={img(r.seed, 900, 1000)}
                alt=""
                className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40 grayscale contrast-125 transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/70 to-night/20" />
              <div className="flex w-full flex-col justify-end p-7">
                <h3 className="font-display text-2xl font-semibold tracking-tight lg:whitespace-nowrap">
                  <button
                    type="button"
                    className="text-left lg:cursor-pointer"
                    aria-expanded={active}
                    aria-controls={`peran-${i}`}
                    onClick={() => setOpen(i)}
                    onFocus={() => setOpen(i)}
                  >
                    {r.who}
                  </button>
                </h3>
                <div
                  id={`peran-${i}`}
                  className={`transition-opacity duration-500 ${active ? 'lg:opacity-100' : 'lg:pointer-events-none lg:h-0 lg:opacity-0'}`}
                >
                  <p className="mt-3 max-w-sm text-lg leading-relaxed">{r.task}</p>
                  <p className="mt-2 max-w-sm text-sm text-[#b9d3c1]">Butuh: {r.need}</p>
                  <a
                    href={r.href}
                    className="mt-6 inline-flex rounded-full bg-[#f0fdf4] px-5 py-3 text-sm font-semibold text-night transition-transform hover:-translate-y-0.5"
                  >
                    {r.cta}
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function Statement() {
  return (
    <section id="batasan" className="border-t border-divider bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-32 sm:px-8 md:py-48">
        <p data-statement className="font-display text-[clamp(1.75rem,3.4vw,3.25rem)] font-medium leading-[1.2] tracking-[-0.02em]">
          {STATEMENT.split(' ').map((w, i) => (
            <span key={i} data-word>
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

function Action() {
  return (
    <section className="grain relative isolate overflow-hidden bg-night text-[#f0fdf4]">
      <div aria-hidden className="absolute left-1/2 top-full -z-10 h-[40rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f7a45] opacity-40 blur-[160px]" />
      <div className="mx-auto max-w-7xl px-5 py-32 text-center sm:px-8 md:py-48">
        <h2 data-grow className="font-display mx-auto max-w-6xl text-[clamp(2.75rem,7vw,7rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
          Punya kemasan di tangan? Pindai QR-nya.
        </h2>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <a href={scanUrl()} className="rounded-full bg-[#f0fdf4] px-8 py-4 text-base font-semibold text-night transition-transform hover:-translate-y-0.5">
            Pindai kemasan
          </a>
          <a href={panelUrl()} className="rounded-full border border-white/35 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10">
            Saya pihak pencatat
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const contract = isDeployed() ? addressUrl(NETWORK.address) : null
  return (
    <footer className="bg-night text-[#b9d3c1]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 border-t border-white/10 px-5 py-8 text-sm sm:px-8">
        <p>HalalChain Trace · {NETWORK.name}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li><a className="tap hover:text-white" href={exampleUrl()}>Contoh kemasan</a></li>
          <li><a className="tap hover:text-white" href={panelUrl()}>Panel pencatatan</a></li>
          {contract && (
            <li><a className="tap hover:text-white" href={contract} target="_blank" rel="noreferrer">Contract di explorer</a></li>
          )}
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

function Key(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="8" cy="15" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11.2 11.8L20 3m-3 3l2.5 2.5M14.5 8.5l2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Glass(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 15.5L21 21M8 10.5l1.8 1.8 3.4-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
