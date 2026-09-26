import InternalPanel from './InternalPanel.jsx'

/**
 * Halaman dipilih dari query param, tanpa router — GitHub Pages tidak punya SPA rewrite,
 * jadi "/repo/?param" selalu mengenai index.html.
 *
 *   ?trace=5  halaman konsumen kemasan #5 (tujuan QR)   — Task 7
 *   ?scan=1   scanner QR                                — Task 8
 *   (tanpa)   panel internal, butuh MetaMask
 */
export default function App() {
  return <InternalPanel />
}
