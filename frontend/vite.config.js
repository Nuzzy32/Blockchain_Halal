import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base harus sama dengan nama repo GitHub, karena GitHub Pages menyajikan
// situs di https://<user>.github.io/<repo>/. Kalau nama repo diubah, ubah di sini juga —
// QR code ikut memakai nilai ini lewat import.meta.env.BASE_URL.
export default defineConfig({
  base: '/Blockchain_Halal/',
  plugins: [react(), tailwindcss()],
  // Jaringan lokal: halaman memanggil node Hardhat lewat /rpc di origin yang sama, jadi cukup satu port
  // yang dibuka ke ponsel se-Wi-Fi atau ke internet lewat tunnel (docs/demo-presentasi.md).
  // `vite preview` ikut memakai setelan server ini.
  server: {
    proxy: { '/rpc': { target: 'http://127.0.0.1:8545', rewrite: () => '/' } },
    allowedHosts: ['.trycloudflare.com'],
  },
})
