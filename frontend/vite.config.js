import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base harus sama dengan nama repo GitHub, karena GitHub Pages menyajikan
// situs di https://<user>.github.io/<repo>/. Kalau nama repo diubah, ubah di sini juga —
// QR code ikut memakai nilai ini lewat import.meta.env.BASE_URL.
export default defineConfig({
  base: '/Blockchain_Halal/',
  plugins: [react(), tailwindcss()],
})
