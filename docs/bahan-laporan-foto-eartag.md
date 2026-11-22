# Bahan Laporan: Foto, Ciri Fisik, dan *Eartag* Sapi

Bahan siap tempel untuk laporan HalalChain Trace. Bahasanya formal dan netral (tanpa "kami" atau
"penulis"), jadi bisa masuk ke versi formal maupun versi gaya contoh 2. Istilah asing ditulis miring.
Angka di sini terukur dari *node* Hardhat lokal per 22 November 2026, kecuali yang ditandai taksiran.

Penempatan yang disarankan:

| Bagian di bawah | Masuk ke |
|---|---|
| 1, 2, 3 | Deskripsi produk / fitur (BAB III) |
| 4 | Desain UI/UX, alur pengguna (BAB IV) |
| 5, 6 | Implementasi dan pengujian |
| 7 | Landasan teori (BAB II) atau pembahasan |
| 8, 9 | Keterbatasan dan saran pengembangan (BAB VI) |
| 10 | Lampiran / daftar pustaka |

---

## 1. Latar Belakang Fitur

Versi awal HalalChain Trace mencatat sapi sebagai deretan angka: umur, berat, *grade*, dan jenis
pakan, dengan ID yang dibuat otomatis oleh *smart contract* (misalnya HCT-C-000001). ID tersebut
hanya hidup di dalam sistem. Tidak ada yang mengikatnya ke sapi fisik, sehingga petugas rumah
potong hewan (RPH) tidak punya cara memastikan bahwa sapi yang datang memang sapi yang tercatat,
dan konsumen yang memindai QR tidak bisa membayangkan hewan asal daging yang dibelinya.

Tiga fitur ditambahkan untuk menutup celah ini:

1. **Ciri fisik**: ras, jenis kelamin, dan warna bulu, dicatat sebagai pilihan tetap (*enum*).
2. **Foto sapi**: diambil peternak saat pendaftaran dan tersimpan permanen di *blockchain*.
3. ***Eartag***: nomor pada anting telinga sapi, wajib unik dan wajib dicocokkan ulang oleh RPH
   saat mencatat penyembelihan.

## 2. Deskripsi Fitur

### 2.1 Ciri fisik

Peternak memilih ras (Bali, Madura, Peranakan Ongole, Limousin, Simental, Brahman, atau lainnya),
jenis kelamin (jantan atau betina), dan warna bulu (putih, abu-abu, krem, cokelat kemerahan, hitam,
atau belang). Nilai disimpan sebagai *enum* berukuran 1 *byte*, bukan teks bebas, karena teks di
Solidity mahal dan rawan salah ketik. Ketiga nilai ini menempati ruang kosong pada *slot*
penyimpanan yang sudah ada, sehingga tidak menambah biaya penyimpanan.

### 2.2 Foto sapi

Foto diambil dari kamera ponsel atau galeri, lalu diproses di *browser* sebelum dikirim:

- Dikecilkan ke format WebP (atau JPEG pada Safari lama) dengan ukuran maksimal 30 KB.
  Dalam pengujian, foto JPG 1280×960 piksel berukuran 405 KB menjadi 25,8 KB.
- Metadata EXIF, termasuk koordinat GPS lokasi peternakan, ikut terbuang karena foto digambar
  ulang lewat elemen `<canvas>`. Hasil pengujian mengonfirmasi data yang tercatat tidak lagi
  mengandung EXIF.
- Saat ditampilkan, foto hanya dirender jika *byte* awalnya dikenali sebagai WebP, JPEG, atau PNG.
  Berkas lain (misalnya SVG berisi skrip) diabaikan.

Foto tidak disimpan di *storage* kontrak, melainkan di *event* `CattlePhoto`. Menyimpan 30 KB di
*storage* membutuhkan sekitar 940 *slot* atau sekitar 19 juta *gas*, sedangkan lewat *event* hanya
sekitar 1 juta *gas*. *Log event* sama permanennya dengan *storage*; perbedaannya hanya *event* tidak
dapat dibaca oleh kontrak lain, dan memang hanya aplikasi web yang perlu membacanya. Nomor blok
tempat *event* itu berada disimpan di catatan sapi (`photoBlock`), sehingga halaman konsumen cukup
meminta satu blok untuk menampilkan foto.

Pendekatan yang lazim di proyek *blockchain* adalah menyimpan foto di IPFS dan hanya mencatat
*hash*-nya. Pendekatan itu tidak dipilih karena IPFS membutuhkan layanan *pinning* pihak ketiga
agar berkas tidak hilang, sedangkan *event* tidak bergantung pada layanan apa pun di luar jaringan
Polygon. Batasan 30 KB adalah harga dari pilihan ini.

### 2.3 *Eartag*

*Eartag* adalah anting plastik bernomor yang dipasang di telinga sapi dan sudah umum dipakai
peternak Indonesia untuk identifikasi ternak. Di HalalChain Trace, nomor ini menjadi pengikat antara
catatan digital dan hewan fisiknya:

- **Unik.** Satu nomor hanya untuk satu sapi. Kontrak menolak pendaftaran dengan nomor yang sudah
  dipakai (`EartagTaken`), sehingga satu sapi fisik tidak bisa memiliki dua catatan.
- **Dicocokkan RPH.** Saat mencatat penyembelihan, petugas RPH mengetik ulang nomor yang terbaca
  di telinga sapi sambil membandingkan foto dari peternak. Nomor yang tersimpan sengaja tidak
  ditampilkan di form RPH, sehingga petugas harus membacanya dari sapi. Kontrak menolak jika nomor
  berbeda (`EartagMismatch`).
- **Dinormalisasi.** Spasi dibuang dan huruf diubah ke kapital sebelum dikirim, sehingga
  "id 3201 0099" dan "ID32010099" dianggap sama.

### 2.4 Foto sebelum disembelih dan nama juru sembelih (masukan dosen)

- **Foto ante-mortem.** Saat mencatat penyembelihan, RPH wajib memotret sapi hidup di RPH. Foto ini
  tersimpan di *event* `AnteMortemPhoto` dan tampil di kartu data halal halaman konsumen, sebagai bukti
  kondisi sapi sesaat sebelum disembelih. Biayanya sekitar 1,04 juta *gas* per penyembelihan.
- **Nama juru sembelih.** Nama tidak ditulis ke *blockchain*, karena nama adalah data pribadi dan data
  *blockchain* permanen. Di *blockchain* hanya ID sertifikatnya; nama ditampilkan dari daftar terpisah
  yang bisa diperbarui atau dihapus, misalnya "Ahmad Fauzi (JULEHA-0042)".
- **Akses ponsel.** Setelah masuk, layar langsung bergulir ke form sesuai peran, foto bisa diambil
  langsung dari kamera, dan browser ponsel biasa diarahkan untuk membuka halaman di aplikasi MetaMask.

## 3. Struktur Data

| Data | Tipe on-chain | Validasi di kontrak | Validasi di aplikasi web |
|---|---|---|---|
| Ras | `uint8` (*enum*) | Wajib dipilih | Wajib dipilih |
| Jenis kelamin | `uint8` (*enum*) | Wajib dipilih | Wajib dipilih |
| Warna bulu | `uint8` (*enum*) | Wajib dipilih | Wajib dipilih |
| *Eartag* | `bytes32` | Tidak kosong, belum dipakai sapi lain | Maksimal 31 karakter, dinormalisasi |
| Foto | *event* `CattlePhoto` (`bytes`) | Maksimal 30.000 *byte* | Wajib diunggah, harus berupa gambar |
| Blok foto | `uint32` | Diisi otomatis oleh kontrak | — |

Dengan tambahan *eartag*, satu catatan sapi kini menempati 7 *slot* penyimpanan (sebelumnya 6).

## 4. Alur Pengguna

| Aktor | Sebelum | Sesudah |
|---|---|---|
| Peternak | Mengisi umur, berat, *grade*, pakan, kode peternakan | Ditambah ras, jenis kelamin, warna bulu, nomor *eartag*, dan foto. Ringkasan menampilkan pratinjau foto dan *eartag* yang sudah dinormalisasi sebelum ditandatangani |
| RPH | Memilih ID sapi lalu mengisi data penyembelihan | Muncul kotak "Cocokkan dengan sapi yang datang" berisi foto dari peternak; petugas mengetik *eartag* dari telinga sapi. Nomor yang salah ditolak sebelum MetaMask terbuka |
| Konsumen | Melihat data angka dan linimasa | Melihat foto sapi asal daging, ciri fisiknya, dan nomor *eartag*, tanpa perlu *wallet* |

Tangkapan layar yang perlu diambil untuk bagian ini:

1. Form peternak dengan pratinjau foto dan keterangan "25,8 KB, siap dicatat"
2. Ringkasan peternak yang menampilkan *eartag* dan foto
3. Kotak pencocokan di form RPH
4. Pesan penolakan "Tidak cocok dengan *eartag* sapi ini"
5. Halaman konsumen (`?trace=1`) dengan foto dan ciri fisik sapi

## 5. Biaya Transaksi

Diukur di *node* Hardhat lokal. Konversi ke POL memakai harga *gas* Polygon Amoy pada 22 November 2026,
yaitu sekitar 56 *gwei*; harga ini berubah-ubah.

| Transaksi | *Gas* terukur | Perkiraan biaya di Amoy |
|---|---|---|
| *Deploy* kontrak | 2.401.967 | sekitar 0,135 POL |
| Pendaftaran sapi dengan foto 25,8 KB | 1.047.790 | sekitar 0,059 POL |
| Pendaftaran sapi dengan foto 21 KB | sekitar 853.000 | sekitar 0,048 POL |

Foto menyumbang porsi terbesar biaya pendaftaran. Ini alasan batas 30 KB ditetapkan.

## 6. Hasil Pengujian

**Pengujian otomatis.** 67 *unit test* kontrak dan 23 *unit test* aplikasi web lulus. Kasus yang
khusus menguji fitur baru:

- *Eartag* tersimpan, wajib diisi, dan tidak boleh dipakai dua sapi
- Penyembelihan ditolak jika *eartag* tidak cocok
- Normalisasi *eartag* (spasi dan huruf kecil)
- Pengenalan jenis gambar dari *byte* awal, termasuk penolakan SVG berisi skrip

**Pengujian lewat antarmuka** (*browser* terhadap *node* lokal, akun demo):

| Kode | Skenario | Hasil |
|---|---|---|
| A1 | Pendaftaran sapi dengan foto JPG 405 KB ber-EXIF | Foto menjadi 25,8 KB WebP tanpa EXIF, tercatat sebagai HCT-C-000005 |
| A2 | Penyembelihan dengan *eartag* yang cocok | Berhasil, ringkasan menampilkan "(cocok)" |
| A6 | Halaman konsumen | Foto, ciri fisik, dan *eartag* tampil |
| B11 | Penyembelihan dengan *eartag* milik sapi lain | Ditolak sebelum transaksi dikirim |
| B12 | Pendaftaran dengan *eartag* yang sudah dipakai | Ditolak kontrak dengan pesan yang menyebut sapi pemiliknya |
| B13 | Form dikirim tanpa foto | Ditolak: "Foto sapi wajib diunggah." |
| B14 | Berkas PDF dipilih sebagai foto | Ditolak: berkas tidak bisa dibaca sebagai gambar |
| C7 | Foto dibaca ulang dari *event* di halaman konsumen | Tampil tanpa galat |

## 7. Kaitan dengan Landasan Teori

Effendy dkk. (2025) menggambarkan skenario "Kembaran Digital Halal" (hlm. 198–200), yaitu riwayat
digital yang mengikuti seekor sapi sejak lahir, ditandai identitas elektronik, sampai dagingnya
dipindai konsumen di supermarket. *Eartag* bernomor dan foto pada HalalChain Trace adalah versi
sederhana dari identitas tersebut: belum elektronik, tetapi sudah mengikat catatan *on-chain* ke
hewan fisiknya. Buku yang sama menyebut kebutuhan akan "akta kelahiran digital" per karkas
(hlm. 142). Catatan pendaftaran yang memuat foto, ciri fisik, dan *eartag* berfungsi sebagai akta
tersebut.

Effendy dkk. (2025) juga menempatkan kecerdasan buatan sebagai pemeriksa kejadian sebelum dicatat ke
*blockchain* (hlm. 196–197), karena *blockchain* hanya menjamin catatan tidak berubah setelah ditulis.
Pencocokan foto dan *eartag* oleh petugas RPH adalah bentuk manual dari pemeriksaan itu.

## 8. Keterbatasan

1. **Tidak mencegah kecurangan yang disengaja.** Data di *blockchain* bersifat publik, sehingga
   petugas RPH yang berniat curang tetap bisa menyalin nomor *eartag* dari data publik tanpa melihat
   sapinya. Fitur ini mengurangi kesalahan karena kelalaian (salah sapi, salah ketik ID), bukan
   kecurangan yang disengaja.
2. **Foto tidak membuktikan identitas.** Sapi dengan ras dan warna yang sama bisa terlihat mirip.
   Foto membantu pencocokan, tetapi bukan bukti biometrik.
3. **Kualitas foto terbatas.** Batas 30 KB membuat foto cukup untuk mengenali ras dan warna, tetapi
   tidak untuk detail seperti pola belang kecil.
4. ***Eartag* bisa dipindah.** Anting plastik dapat dilepas dan dipasang ke sapi lain. Foto
   mempersempit peluang ini, tetapi tidak menutupnya.
5. **Biaya.** Foto menaikkan biaya pendaftaran menjadi sekitar 1 juta *gas* per sapi.

## 9. Jawaban untuk Pertanyaan "Bagaimana Jika Data yang Dimasukkan Tidak Benar?"

*Blockchain* menjamin data tidak bisa diubah setelah dicatat, tetapi tidak bisa menjamin data itu
benar saat dicatat. Masalah ini dikenal sebagai masalah orakel (*oracle problem*) dan berlaku untuk
semua sistem ketertelusuran berbasis *blockchain*. HalalChain Trace mengurangi risikonya secara
berlapis:

1. **Akuntabilitas.** Setiap catatan menyimpan alamat *wallet* penginput secara permanen, sehingga
   data yang terbukti salah selalu bisa ditelusuri ke pelakunya, dan admin dapat mencabut perannya.
2. **Aturan di kontrak.** Tanggal di masa depan ditolak, penyembelihan sebelum pendaftaran ditolak,
   hanya RPH yang menyembelih yang boleh membuat kemasan, dan total berat kemasan tidak boleh
   melebihi berat hidup sapi.
3. **Pengikat fisik.** *Eartag* unik dan foto memaksa RPH mencocokkan sapi yang datang dengan
   catatannya. Kesalahan karena lalai tertangkap sebelum masuk ke *blockchain*.

Untuk kecurangan yang disengaja, solusinya ada di luar perangkat lunak dan menjadi arah
pengembangan:

- ***Eartag* RFID** yang dibaca mesin, sehingga nomor tidak lagi diketik manusia
- **Pencocokan foto dengan *computer vision***, sejalan dengan gagasan AI sebagai orakel pada
  Effendy dkk. (2025)
- **Tanda tangan ganda**, misalnya pencatatan penyembelihan harus disetujui RPH dan pengawas
  sertifikasi
- **Audit fisik** berkala oleh lembaga independen

## 10. Kredit Foto

Foto contoh di halaman depan dan data contoh berasal dari Wikimedia Commons dengan lisensi Creative
Commons. Daftar lengkap judul, pembuat, dan lisensi ada di bagian "Kredit foto" pada *footer* aplikasi
dan di `scripts/seed-photos/CREDITS.md`. Jika foto ini dipakai di laporan atau slide, cantumkan
kreditnya dengan format yang sama.

## Daftar Pustaka

Effendy, F., Taufik, Wuryanto, E., Faradian, N. S., Tampubolon, G. A. G., & Novel, M. (2025).
*Halal intelligence: Membongkar label dengan kecerdasan buatan*. PT Pustaka Saga Jawadwipa.
