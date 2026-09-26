import { Suspense, lazy } from 'react'
import TracePage from './TracePage.jsx'
import { parseId } from './validation.js'

// Lazy: halaman konsumen (?trace=) tidak perlu mengunduh kode panel internal atau scanner kamera.
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
 *   (tanpa)   panel internal, butuh MetaMask
 */
export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('trace')) return <TracePage id={parseId(params.get('trace'))} />
  if (params.has('scan')) {
    return (
      <Suspense fallback={fallback}>
        <ScanPage />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={fallback}>
      <InternalPanel />
    </Suspense>
  )
}
