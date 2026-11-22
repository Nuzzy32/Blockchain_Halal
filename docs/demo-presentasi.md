# Demo Presentasi: QR yang Bisa Dipindai dari Ponsel Mana Saja

Tujuannya: dosen memindai QR pakai kamera ponselnya sendiri, lewat data seluler atau Wi-Fi mana pun,
tanpa MetaMask.

Ada dua jalur. **Jalur A (Amoy)** adalah yang sebenarnya: QR bisa dicetak dan tetap berfungsi
selamanya. **Jalur B (laptop + tunnel)** adalah cadangan kalau POL Amoy belum didapat.

Aturan utama di dua jalur: **QR harus dibuat dari alamat publik, bukan dari `localhost`.** Isi QR
mengikuti alamat halaman tempat QR itu dibuat. QR yang dibuat di `http://localhost:...` hanya bisa
dibuka di laptop itu sendiri.

---

## Jalur A — Polygon Amoy (utama)

### Kebutuhan POL

| Wallet | Untuk | Perkiraan |
|---|---|---|
| Owner `0x088D…51db` | *Deploy* (2,4 juta *gas*) + 3 × `grantRole` | 0,15 POL |
| Peternak `0x060b…8A6c` | 1 sapi dengan foto (1,05 juta *gas*) | 0,07 POL |
| RumahPotong `0x4cb5…b476` | Sembelih dengan foto (1,04 juta *gas*) + buat kemasan | 0,09 POL |
| Distributor `0x6a9f…7e11` | Catat pengiriman | 0,01 POL |
| **Total** | | **sekitar 0,35 POL** |

Dihitung pada harga *gas* 56 *gwei* (22 November 2026). Saldo semua wallet ini saat itu: Owner 0,022,
Peternak 0,008, RumahPotong 0,002, Distributor 0,001.

### Langkah

1. **Klaim POL** ke wallet Owner dari faucet Amoy (QuickNode, Chainlink, atau Alchemy). Faucet memakai
   CAPTCHA dan login, jadi dikerjakan sendiri.
2. **Bagi POL** dari Owner ke wallet Peternak, RumahPotong, dan Distributor lewat MetaMask
   (Send), sesuai tabel di atas.
3. **Deploy**, ikuti `docs/deployment-v1.md` bagian "Cara deploy":

   ```bash
   npx hardhat keystore set AMOY_PRIVATE_KEY
   npx hardhat run --build-profile production scripts/deploy.js --network amoy
   ```

   Private key hanya diketik sendiri di terminal, jangan pernah ditempel ke chat.
4. **Kirim output perintah deploy** (alamat contract, tx hash, nomor blok) ke Claude. Claude mengisi
   `frontend/src/chain.js`, memeriksa contract-nya, lalu menyiapkan `npm run deploy` untuk GitHub Pages.
5. **Isi data demo dari situs online** `https://nuzzy32.github.io/Blockchain_Halal/?panel=1`, dengan
   MetaMask di jaringan Amoy:
   - Peternak: daftarkan sapi dengan foto dan eartag
   - RumahPotong: sembelih (cocokkan eartag), lalu buat kemasan. **QR yang muncul di sini yang dicetak.**
   - Distributor: catat pengiriman kemasan itu
6. **Uji sendiri** sebelum presentasi: matikan Wi-Fi ponsel, pindai QR pakai data seluler, pastikan
   halaman terbuka lengkap dengan foto.

---

## Jalur B — Laptop + tunnel (cadangan tanpa POL)

Situs dan *node* Hardhat tetap jalan di laptop. Cloudflare Tunnel memberi alamat publik
`https://<acak>.trycloudflare.com` yang meneruskan ke laptop, jadi ponsel dosen bisa membukanya dari
jaringan mana pun. `cloudflared` sudah terpasang di laptop ini (`brew install cloudflared`), tanpa akun.

Batasannya:

- **Laptop harus menyala dan terhubung internet** selama dosen memindai.
- **Alamatnya berubah setiap tunnel dijalankan.** Jangan cetak QR sebelumnya; buat QR saat presentasi
  dan tampilkan di layar proyektor.
- **Datanya simulasi** dan hilang saat *node* dimatikan. Tidak ada tautan ke *block explorer*.
- **Siapa pun yang tahu alamatnya bisa ikut menulis data** lewat akun demo. Matikan tunnel setelah
  presentasi.

### Menyalakan (sekitar 2 menit, lakukan sebelum presentasi dimulai)

Buka empat terminal di folder project. Jangan tutup satu pun selama presentasi.

**Terminal 1 — node blockchain lokal:**

```bash
npx hardhat node
```

**Terminal 2 — contract dan data contoh** (sekali, setelah terminal 1 siap):

```bash
npx hardhat run scripts/deploy.js --network localhost && npx hardhat run scripts/seed.js --network localhost
```

**Terminal 3 — situs:**

```bash
cd frontend && npm run demo
```

**Terminal 4 — alamat publik:**

```bash
cloudflared tunnel --url http://localhost:4173
```

Tunggu baris berisi `https://....trycloudflare.com`. Itu alamat publik untuk presentasi ini.

### Saat presentasi

1. Di laptop, buka **`<alamat-tunnel>/Blockchain_Halal/?panel=1`**. Pakai alamat tunnel, bukan
   `localhost`, supaya QR berisi alamat publik.
2. Masuk sebagai **RPH** (akun demo), buat kemasan dari sapi yang sudah disembelih (data contoh: sapi
   HCT-C-000003). Label QR muncul setelah tersimpan.
3. Tampilkan QR di layar. Dosen memindai pakai kamera ponsel dan langsung melihat halaman konsumen.
4. Kalau ingin menunjukkan alur lengkap: masuk sebagai Peternak dan daftarkan sapi baru, lalu RPH
   menyembelih (eartag harus sama), buat kemasan, lalu Distributor mencatat pengiriman.

Sebelum dosen memindai, coba dulu dari ponsel sendiri dengan Wi-Fi dimatikan.

### Setelah presentasi

Tekan `Ctrl+C` di keempat terminal. Alamat tunnel langsung mati.

### Kalau ada masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Halaman "Gagal memuat data" | Terminal 1 tertutup atau *node* di-restart | Nyalakan terminal 1 lagi, ulangi terminal 2 |
| Ponsel tidak bisa membuka alamat | Tunnel mati atau laptop tidur | Cek terminal 4; jalankan ulang, lalu buat QR baru (alamatnya berubah) |
| QR membuka `localhost` | Panel dibuka dari `localhost:4173` | Buka panel lewat alamat tunnel, buat kemasan baru |
| `Port 4173 is in use` | `npm run demo` masih jalan dari sebelumnya | Tutup terminal lama, atau pakai yang sudah jalan |

---

## Cadangan terakhir

Rekam video layar alur lengkap (daftar → sembelih → kemasan → pindai di ponsel) sebelum presentasi,
untuk diputar kalau internet ruangan bermasalah.
