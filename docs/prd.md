# PRD — Pengembangan Lanjutan Sistem Traceability Sapi

**Versi:** 1.1 · **Tanggal:** 2026-09-05 · **Status:** Draf untuk ditinjau

Dokumen ini mendefinisikan kebutuhan pengembangan lanjutan di atas sistem yang sudah
berjalan (Fase 1–4 selesai). Rencana implementasi teknis per fitur ditulis terpisah.

> **Perubahan v1.1:** Fitur penilaian konsumen dibatalkan — bertentangan dengan prinsip
> inti "konsumen cukup memindai QR tanpa wallet". Rinciannya di §8.

---

## 1. Latar belakang

Sistem traceability sapi berbasis blockchain sudah berjalan dan bisa diakses publik:

| Komponen | Status |
|---|---|
| Smart contract `CattleTraceability` | Live di Polygon Amoy, `0x3B32AfD1D507d4312c9Dc09563a4Ee8C6B57d34D`, terverifikasi Sourcify |
| Frontend React (panel aktor + halaman konsumen) | Live di <https://nuzzy32.github.io/Blockchain_Halal/> |
| Data tercatat | Sapi id 1 lengkap 3 tahap (daftar → sembelih → kirim) |

Yang sudah bisa dilakukan sistem saat ini: peternak mendaftarkan sapi (umur, jenis pakan,
grade), rumah potong mencatat penyembelihan, distributor mencatat pengiriman, dan konsumen
memindai QR di kemasan daging untuk melihat riwayat lengkap — tanpa wallet, tanpa aplikasi.

**Keterbatasan yang memicu pengembangan ini:**

1. Nama dan tujuan proyek menyangkut **kehalalan**, tetapi status halal belum tercatat
   sama sekali di blockchain — informasi terpenting bagi konsumen justru belum ada.
2. Data hanya bisa dilihat **satu sapi per satu** — tidak ada gambaran menyeluruh untuk
   pengelola sistem (berapa total sapi, sebaran grade, seberapa cepat rantai pasoknya).
3. Distributor harus mencatat pengiriman **satu per satu**, tidak realistis untuk skala
   operasional nyata.

---

## 2. Tujuan

| # | Tujuan | Ukuran keberhasilan |
|---|---|---|
| T1 | Status kehalalan tercatat dan bisa diverifikasi publik | Konsumen yang memindai QR melihat status halal + metode penyembelihan, langsung dari data on-chain |
| T2 | Pengelola bisa melihat kondisi rantai pasok secara menyeluruh | Ada satu halaman yang menampilkan total sapi, sebaran grade, dan rata-rata durasi tiap tahap |
| T3 | Pencatatan pengiriman efisien untuk skala nyata | Distributor bisa mencatat banyak sapi dalam satu transaksi |

**Prinsip yang tidak boleh dilanggar:** konsumen akhir cukup memindai QR — tidak perlu
wallet, aplikasi, akun, atau biaya apa pun. Setiap usulan fitur diuji terhadap prinsip ini.

---

## 3. Aktor

Aktor = pihak yang **menulis** data ke blockchain (butuh wallet + role).

| Aktor | Role on-chain | Wewenang | Status |
|---|---|---|---|
| Owner | — (deployer) | Menetapkan role aktor lain | Sudah ada |
| Peternak | `1` Farmer | Mendaftarkan sapi baru (id, umur, pakan, grade) | Sudah ada |
| Rumah Potong | `2` Butcher | Mencatat penyembelihan; **(baru)** menyatakan status halal + metode | Diperluas |
| Distributor | `3` Distributor | Mencatat pengiriman; **(baru)** pengiriman massal | Diperluas |

Konsumen **bukan aktor** — ia hanya membaca, tidak pernah menulis ke blockchain, sehingga
tidak butuh wallet maupun role. Posisinya dijelaskan di §4.

**Keputusan: tidak ada aktor baru pada tahap ini.** Sertifikasi halal dilakukan sendiri
oleh Rumah Potong (*self-declaration*) saat mencatat penyembelihan, bukan oleh lembaga
sertifikasi independen. Konsekuensinya kredibilitasnya lebih rendah karena pihak yang
menyembelih juga yang mengklaim kehalalannya — ini diterima untuk sekarang demi
kesederhanaan, dan dicatat sebagai kandidat pengembangan berikutnya (lihat §8).

---

## 4. Pengguna & penerima manfaat

Perlu dibedakan: **aktor** menulis data, **pengguna** membaca/memakai sistem.

| Pengguna | Cara pakai | Manfaat yang didapat |
|---|---|---|
| **Konsumen akhir** (pelanggan minimarket) | Pindai QR di bungkus daging — tanpa aplikasi, tanpa wallet | Tahu asal-usul daging yang dibeli: umur sapi, pakan, grade, kapan disembelih & dikirim, **dan apakah disembelih sesuai syariat** — kepastian yang selama ini hanya berupa klaim di label |
| **Pengelola / pemilik sistem** | Buka halaman dashboard | Melihat kesehatan rantai pasok tanpa membuka data satu per satu: volume, sebaran mutu, titik lambat pada proses |
| **Peternak** | Panel aktor | Reputasi terbangun dari rekam jejak yang tidak bisa diubah dan bisa ditunjukkan ke pembeli |
| **Rumah Potong** | Panel aktor | Klaim kehalalan tercatat permanen dan bisa diverifikasi siapa pun — pembeda dari pesaing yang hanya mengklaim lisan |
| **Distributor** | Panel aktor | Pencatatan massal memangkas pekerjaan berulang; jejak pengiriman jadi bukti tanggung jawab saat ada sengketa |
| **Penguji / dosen** | Situs live + dashboard | Bisa memverifikasi sendiri bahwa data benar-benar di blockchain publik, bukan basis data biasa yang disamarkan |

---

## 5. Ruang lingkup

Tiga fitur, dipecah menjadi dua sub-proyek independen berdasarkan dampak teknisnya.
Urutan pengerjaan dipilih dari yang paling rendah risikonya.

| Fase | Fitur | Perubahan smart contract | Alasan urutan |
|---|---|---|---|
| **1** | F1 — Dashboard statistik | Tidak ada | Murni frontend; membaca event yang sudah ter-emit. Tidak ada risiko terhadap sistem yang sudah live |
| **2** | F2 — Status halal<br>F3 — Pengiriman massal | Contract inti versi **v2** (deploy ulang) | Keduanya mengubah contract inti, jadi digabung dalam satu kali deploy ulang, bukan dua kali |

---

## 6. Kebutuhan per fitur

### F1 — Dashboard statistik `Fase 1`

Halaman ringkasan kondisi rantai pasok, dibaca dari data on-chain yang sudah ada.

**Akses:** URL publik terpisah (`?dashboard=1`), tanpa wallet. Datanya memang sudah publik
di blockchain, jadi tidak ada alasan menguncinya di balik wallet — sekaligus konsisten
dengan halaman konsumen yang juga bebas akses.

**Isi yang ditampilkan:**

| # | Bagian | Detail |
|---|---|---|
| F1.1 | Ringkasan & corong tahapan | Total sapi terdaftar; berapa yang **baru terdaftar**, sudah **disembelih**, sudah **dikirim** |
| F1.2 | Sebaran grade | Jumlah/persentase sapi per grade (A, B, C, …) dalam bentuk visual |
| F1.3 | Rata-rata durasi proses | Rata-rata waktu daftar→sembelih dan sembelih→kirim, dalam satuan yang mudah dibaca |
| F1.4 | Daftar sapi terbaru | Tabel sapi terbaru (id, grade, status tahap), tiap baris menuju halaman lacaknya (`?id=`) |

**Kebutuhan non-fungsional:**

- Mengikuti sistem desain di `design-system/traceability-sapi/MASTER.md` (palet, tipografi,
  token spasi) agar seragam dengan halaman yang sudah ada.
- Menampilkan keadaan **memuat**, **kosong** (belum ada sapi sama sekali), dan **gagal**
  (RPC bermasalah) secara eksplisit — bukan halaman kosong tanpa penjelasan.
- Responsif; layak dibuka dari ponsel.

**Catatan teknis yang mengikat:** contract tidak menyimpan daftar seluruh id sapi, sehingga
data dikumpulkan dari **log event** `CattleRegistered` (sejak blok deploy) lalu diperkaya
dengan `getRecord(id)` per sapi. Tidak perlu fungsi baru di contract.

---

### F2 — Status halal `Fase 2`

| # | Kebutuhan |
|---|---|
| F2.1 | Rumah Potong menyatakan status halal (**ya/tidak**) bersamaan saat mencatat penyembelihan |
| F2.2 | Rumah Potong mencatat **metode penyembelihan** sebagai teks (mis. "Manual sesuai syariat") |
| F2.3 | Kedua data tersimpan on-chain dan tidak dapat diubah setelah tercatat |
| F2.4 | Halaman konsumen menampilkan status halal secara **menonjol** beserta metodenya — ini informasi yang paling dicari saat memindai QR |
| F2.5 | Konsumen tetap tidak perlu wallet untuk melihatnya (hanya operasi baca) |
| F2.6 | Dashboard (F1) menampilkan berapa persen sapi berstatus halal |

---

### F3 — Pengiriman massal `Fase 2`

| # | Kebutuhan |
|---|---|
| F3.1 | Distributor dapat mencatat pengiriman beberapa id sapi dalam **satu** transaksi |
| F3.2 | Aturan yang sudah ada tetap berlaku per sapi (harus sudah disembelih, belum pernah dikirim) |
| F3.3 | Bila satu id gagal memenuhi syarat, perilaku transaksi harus jelas dan konsisten — **keputusan terbuka**: seluruh transaksi dibatalkan, atau yang valid tetap diproses? |
| F3.4 | Panel distributor menyediakan cara memasukkan banyak id sekaligus |

---

## 7. Batasan teknis

| Batasan | Konsekuensi |
|---|---|
| Smart contract bersifat **permanen** setelah deploy | F2 & F3 tidak bisa menambal contract yang ada — harus deploy versi baru dengan alamat baru |
| Tidak ada backend & tidak ada penyimpanan eksternal | Semua data di blockchain; agregasi statistik dihitung di sisi peramban |
| Di-host di GitHub Pages (statis) | Navigasi tetap memakai query param, bukan path routing |
| Jaringan Polygon Amoy (testnet) | RPC publik bisa lambat/terbatas; antarmuka harus tahan terhadap kegagalan baca |
| Menulis data butuh gas | Hanya aktor yang menulis. Konsumen tidak pernah menulis, sehingga bebas dari biaya ini |

**Dampak deploy ulang contract (F2/F3) yang harus diputuskan:**

Contract v2 punya alamat baru dan **basis data kosong**. Riwayat sapi yang sudah tercatat
di v1 (saat ini: sapi id 1, lengkap 3 tahap) tidak ikut berpindah. Pilihan yang perlu
ditentukan sebelum fase 2:

- **(a)** Mulai bersih di v2 — data lama di v1 ditinggalkan, tetap tersimpan permanen di
  blockchain sebagai bukti historis pengerjaan tugas (Fase 3 roadmap awal)
- **(b)** Frontend membaca dua contract sekaligus — data lama tetap bisa dilacak, tetapi
  menambah kerumitan di sisi frontend

---

## 8. Di luar ruang lingkup

Dicatat agar batasnya jelas, **tidak** dikerjakan pada siklus ini:

- **Penilaian/rating oleh konsumen** — sempat dipertimbangkan, lalu **dibatalkan**: memberi
  penilaian adalah operasi tulis yang menuntut wallet dan gas, sementara nilai inti sistem
  ini justru "konsumen cukup memindai QR". Memaksakannya akan membuat fitur yang secara
  praktis tidak akan dipakai pelanggan minimarket. Bila kelak diinginkan, bentuk yang lebih
  masuk akal adalah penilaian antar aktor rantai pasok (yang memang sudah punya wallet).
- Lembaga sertifikasi halal independen sebagai aktor terpisah (kandidat kuat untuk siklus
  berikutnya — akan menaikkan kredibilitas F2 secara signifikan)
- Notifikasi (surel/pesan) antar aktor — membutuhkan backend, bertentangan dengan arsitektur tanpa server
- Penarikan produk (*recall*) dan penelusuran balik saat ditemukan masalah
- Aplikasi seluler khusus — situs web sudah responsif
- Pemindahan ke mainnet — tetap di testnet untuk keperluan tugas
- Foto/dokumen pendukung (butuh IPFS atau penyimpanan eksternal)

---

## 9. Kriteria selesai

| Fase | Dinyatakan selesai bila |
|---|---|
| 1 | Halaman `?dashboard=1` terbuka di situs live, keempat bagian (F1.1–F1.4) menampilkan angka yang cocok dengan data on-chain saat diperiksa manual, dan tetap masuk akal saat RPC gagal |
| 2 | Contract v2 ter-deploy & terverifikasi; alur penuh sapi baru (daftar → sembelih **dengan status halal** → kirim massal) berhasil dari frontend; konsumen yang memindai QR melihat status halal tanpa wallet |

---

## 10. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Deploy ulang contract v2 mengacaukan sistem yang sudah live dan sudah dinilai | Tinggi | Kerjakan setelah Fase 1; simpan alamat v1 di dokumentasi; uji tuntas di frontend lokal sebelum mengganti alamat di situs live |
| Status halal hanya berupa klaim sepihak Rumah Potong | Sedang | Sampaikan apa adanya di antarmuka dan laporan — yang dijamin blockchain adalah *klaim itu tidak bisa diubah diam-diam*, bukan kebenaran klaimnya. Sertifikasi independen jadi pengembangan lanjutan |
| RPC publik Amoy tidak stabil (RPC resmi sudah mati DNS sekali) | Sedang | Sudah ada RPC cadangan; dashboard harus menampilkan status gagal dengan jelas, bukan macet memuat |
| Menghitung statistik dari seluruh log event melambat saat data membesar | Rendah | Skala tugas ini kecil; bila melambat, batasi rentang blok atau jumlah data yang diambil |
