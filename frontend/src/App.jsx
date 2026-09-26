import { Suspense, lazy } from 'react'
import TracePage from './TracePage.jsx'
import { parseId } from './validation.js'

// Lazy: halaman konsumen (?trace=) tidak perlu mengunduh kode landing (GSAP), panel internal, atau scanner kamera.
const Landing = lazy(() => import('./Landing.jsx'))
const InternalPanel = lazy(() => import('./InternalPanel.jsx'))
const ScanPage = lazy(() => import('./ScanPage.jsx'))

const fallback = (
  <p className="p-8 text-muted" role="status">
    Memuat…
  </p>
)

/**
 * Halaman dipilih dari query param, tanpa router — GitHub Pages tidak punya SPA rewrite,
 * jadi "/repo/?param" selalu mengenai index.html.
 *
 *   ?trace=5  halaman konsumen kemasan #5 (tujuan QR). Nilai tidak valid -> "tidak ditemukan".
 *   ?scan=1   scanner QR kamera
 *   ?panel=1  panel internal, butuh MetaMask
 *   (tanpa)   landing page
 */
export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('trace')) return <TracePage id={parseId(params.get('trace'))} />
  const Page = params.has('scan') ? ScanPage : params.has('panel') ? InternalPanel : Landing
  return (
    <Suspense fallback={fallback}>
      <Page />
    </Suspense>
  )
}
