import ActorPanel from './ActorPanel.jsx'
import TrackPage from './TrackPage.jsx'

/**
 * Dua tampilan, dipilih dari query param — tanpa router.
 *
 *   ?id=7  -> halaman publik yang dibuka konsumen setelah scan QR
 *   (tanpa) -> panel aktor yang butuh MetaMask
 *
 * Query param dipilih alih-alih path routing karena GitHub Pages tidak punya SPA
 * rewrite: "/repo/?id=7" langsung mengenai index.html tanpa konfigurasi apa pun.
 */
export default function App() {
  const raw = new URLSearchParams(window.location.search).get('id')

  // id harus bilangan bulat positif. Selain itu (kosong, huruf, negatif) jatuh ke
  // panel aktor, bukan error — QR yang rusak tidak boleh membuat halaman blank.
  const id = raw !== null && /^\d+$/.test(raw.trim()) ? raw.trim() : null

  return id ? <TrackPage id={id} /> : <ActorPanel />
}
