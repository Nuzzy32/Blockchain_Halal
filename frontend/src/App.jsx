import InternalPanel from './InternalPanel.jsx'
import ScanPage from './ScanPage.jsx'
import TracePage from './TracePage.jsx'
import { parseId } from './validation.js'

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
  if (params.has('scan')) return <ScanPage />
  return <InternalPanel />
}
