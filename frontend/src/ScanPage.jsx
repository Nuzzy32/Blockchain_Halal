import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { scanTarget } from './validation.js'

const READER_ID = 'qr-reader'

/**
 * Pemindai kamera. Kamera baru diminta setelah pengguna menekan tombol (izin kamera harus
 * lewat gestur, dan menghindari start ganda React StrictMode). Hanya URL situs ini dengan
 * ?trace=N yang dibuka; selain itu ditolak supaya QR palsu tidak bisa mengarahkan ke situs
 * lain (SECURITY A9).
 */
export default function ScanPage() {
  const scanner = useRef(null)
  const [state, setState] = useState({ status: 'idle' }) // idle | starting | scanning | rejected | error

  const stop = async () => {
    const s = scanner.current
    scanner.current = null
    if (s?.isScanning) await s.stop().catch(() => {})
  }

  useEffect(() => () => void stop(), [])

  const start = async () => {
    setState({ status: 'starting' })
    const s = new Html5Qrcode(READER_ID)
    scanner.current = s
    try {
      await s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (text) => {
          const packageId = scanTarget(text, window.location.origin, import.meta.env.BASE_URL)
          await stop()
          if (packageId) window.location.assign(`${import.meta.env.BASE_URL}?trace=${packageId}`)
          else setState({ status: 'rejected' })
        },
        () => {}, // frame tanpa QR — normal, abaikan
      )
      setState({ status: 'scanning' })
    } catch (err) {
      scanner.current = null
      setState({ status: 'error', message: String(err?.message ?? err) })
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-divider bg-surface">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <span className="font-display text-[15px] font-semibold tracking-tight">HalalChain Trace</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-8">
        <p className="eyebrow">Pindai kemasan</p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">Arahkan kamera ke QR di label</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted">
          Kamera ponsel biasa juga bisa membuka QR ini langsung. Halaman ini untuk yang ingin memindai dari dalam situs.
        </p>

        <div id={READER_ID} className="mt-6 overflow-hidden rounded-xl border border-divider bg-surface" />

        <div className="mt-6" aria-live="polite">
          {(state.status === 'idle' || state.status === 'rejected' || state.status === 'error') && (
            <button className="btn btn-primary" onClick={start}>
              {state.status === 'idle' ? 'Mulai kamera' : 'Pindai lagi'}
            </button>
          )}
          {state.status === 'starting' && <p className="text-muted" role="status">Meminta izin kamera…</p>}
          {state.status === 'scanning' && (
            <button className="btn btn-ghost" onClick={async () => { await stop(); setState({ status: 'idle' }) }}>
              Hentikan kamera
            </button>
          )}
          {state.status === 'rejected' && (
            <p className="mt-4 rounded-lg border px-4 py-3 text-sm" role="alert" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              QR ini bukan label HalalChain Trace, jadi tidak dibuka. Waspadai label yang mengarahkan ke situs lain.
            </p>
          )}
          {state.status === 'error' && (
            <p className="mt-4 rounded-lg border px-4 py-3 text-sm" role="alert" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              Kamera tidak bisa dibuka. Pastikan izin kamera diberikan dan halaman dibuka lewat HTTPS. ({state.message})
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
