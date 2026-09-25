# Keamanan

Dokumen ini berisi model ancaman, mitigasi yang diterapkan, dan keterbatasan yang diakui secara terbuka.

## 1. Prinsip Dasar

1. **Blockchain menjamin integritas, bukan kebenaran.** Data yang masuk tidak bisa diubah, tapi tidak ada jaminan data itu benar sejak awal.
2. **Segala sesuatu di on-chain bersifat publik.** Tidak ada yang namanya data rahasia di blockchain publik, bahkan variabel `private` di Solidity tetap bisa dibaca langsung dari storage.
3. **Frontend tidak bisa dipercaya untuk validasi.** Siapa pun bisa memanggil contract langsung tanpa lewat frontend. Semua aturan harus ditegakkan di contract.
4. **Jangan pernah menyentuh private key pengguna.** Semua penandatanganan lewat MetaMask.

## 2. Model Ancaman

### A1. Pihak tidak berwenang menulis data

**Ancaman:** Orang asing memanggil `recordSlaughter` dan memalsukan sertifikat halal.

**Dampak:** Tinggi. Merusak seluruh kredibilitas sistem.

**Mitigasi:** Kontrol akses berbasis peran di level contract. Setiap fungsi tulis dilindungi modifier `onlyRole`. Frontend hanya menyembunyikan tombol, contract yang benar-benar menolak.

**Status:** Tertangani

---

### A2. Input palsu dari pihak yang berwenang

**Ancaman:** Petugas RPH yang punya peran sah menginput grade palsu atau tanggal sembelih yang dimundurkan.

**Dampak:** Tinggi. Ini kelemahan mendasar semua sistem traceability blockchain, sering disebut sebagai masalah oracle.

**Mitigasi parsial:**
- Alamat wallet penginput tercatat permanen, jadi ada akuntabilitas personal
- Timestamp di masa depan ditolak contract
- Timestamp sebelum tanggal registrasi ditolak
- Admin bisa mencabut peran wallet yang terbukti curang

**Status:** Tidak sepenuhnya bisa diselesaikan oleh teknologi

Penyelesaian sebenarnya butuh lapisan di luar sistem: audit fisik oleh lembaga independen, sensor IoT yang menulis data langsung tanpa campur tangan manusia, atau tanda tangan ganda dari dua pihak berbeda. Ketiganya di luar scope prototype ini, tapi layak disebut di laporan sebagai arah pengembangan.

---

### A3. Data pribadi bocor permanen

**Ancaman:** Nama, NIK, atau alamat peternak tersimpan on-chain dan tidak bisa dihapus selamanya.

**Dampak:** Tinggi. Melanggar prinsip perlindungan data pribadi, dan tidak ada cara memperbaikinya setelah terjadi.

**Mitigasi:** Tidak ada field data pribadi di struct mana pun. Identitas diwakili alamat wallet, kode peternakan, dan nomor sertifikat. Aturan ini juga dicantumkan di `CLAUDE.md` supaya tidak dilanggar tanpa sengaja saat pengembangan.

**Status:** Tertangani lewat desain

---

### A4. Contract terkunci tanpa admin

**Ancaman:** Admin satu-satunya mencabut perannya sendiri atau kehilangan private key. Tidak ada lagi yang bisa memberikan peran, sistem mati permanen.

**Dampak:** Tinggi. Tidak bisa diperbaiki karena contract tidak bisa diubah.

**Mitigasi:**
- Contract menolak pencabutan `ADMIN_ROLE` kalau hanya tersisa satu admin
- Disarankan menunjuk minimal dua alamat admin saat deploy

**Status:** Tertangani

---

### A5. Serangan reentrancy

**Ancaman:** Contract memanggil alamat eksternal yang balik memanggil contract sebelum state selesai diperbarui.

**Dampak:** Rendah untuk sistem ini.

**Mitigasi:** Contract tidak mengirim ether, tidak memanggil contract eksternal, dan tidak menangani aset apa pun. Permukaan serangannya tidak ada. Pola checks-effects-interactions tetap diikuti sebagai kebiasaan baik.

**Status:** Tidak relevan berdasarkan desain

---

### A6. Integer overflow

**Ancaman:** Nilai melewati batas tipe data dan berputar ke nilai salah.

**Dampak:** Sedang.

**Mitigasi:** Solidity 0.8 ke atas sudah otomatis revert saat overflow. Tidak memakai blok `unchecked` di mana pun.

**Status:** Tertangani oleh compiler

---

### A7. Kehabisan gas pada operasi array

**Ancaman:** Fungsi yang melakukan iterasi atas array tanpa batas gagal karena melewati batas gas per block, dan tidak akan pernah bisa berhasil.

**Dampak:** Sedang. Bisa mengunci fungsi tertentu selamanya.

**Mitigasi:**
- Semua operasi batch dibatasi maksimal 50 item
- Fungsi baca yang mengembalikan daftar memakai paginasi
- Tidak ada loop tanpa batas di fungsi yang mengubah state

**Status:** Tertangani

---

### A8. Manipulasi timestamp oleh validator

**Ancaman:** `block.timestamp` bisa digeser beberapa detik oleh validator.

**Dampak:** Sangat rendah. Data sistem ini berskala hari, pergeseran beberapa detik tidak berarti.

**Mitigasi:** Tidak memakai `block.timestamp` sebagai sumber acak atau untuk logika bernilai tinggi.

**Status:** Diterima sebagai risiko yang tidak berdampak

---

### A9. QR code palsu

**Ancaman:** Pihak nakal mencetak QR yang mengarah ke situs palsu berisi data karangan.

**Dampak:** Sedang. Konsumen tertipu meski data asli di blockchain baik-baik saja.

**Mitigasi parsial:**
- Halaman hasil scan menampilkan tautan ke block explorer, sehingga konsumen bisa memverifikasi sendiri ke sumber aslinya
- QR berisi URL ke domain resmi, bukan data mentah

**Keterbatasan:** Sistem tidak bisa mencegah orang mencetak stiker palsu. Ini masalah keamanan fisik kemasan, bukan masalah yang bisa diselesaikan software. Solusi nyatanya berupa segel kemasan anti-rusak atau label hologram.

**Status:** Mitigasi parsial, keterbatasan diakui

---

### A10. Cross-site scripting di halaman konsumen

**Ancaman:** Data dari blockchain berisi skrip berbahaya yang dieksekusi di browser konsumen.

**Dampak:** Sedang.

**Mitigasi:**
- React secara default melakukan escape pada nilai yang dirender
- Tidak pernah memakai `dangerouslySetInnerHTML`
- Data dari `bytes32` dikonversi ke teks dan dibersihkan sebelum ditampilkan
- Semua nilai enum dipetakan lewat tabel tetap di frontend, bukan ditampilkan mentah

**Status:** Tertangani

---

### A11. Rahasia bocor di repository

**Ancaman:** Private key atau mnemonic ikut ter-commit ke Git.

**Dampak:** Tinggi kalau wallet-nya berisi aset nyata.

**Mitigasi:**
- Private key deployer disimpan terenkripsi lewat `npx hardhat keystore set AMOY_PRIVATE_KEY`, di folder konfigurasi Hardhat milik pengguna, di luar repository. Tidak ada file `.env`
- `.env` tetap masuk `.gitignore` sebagai jaga-jaga
- Wallet yang dipakai khusus testnet, tidak pernah berisi aset bernilai
- Cek `git status` sebelum setiap push

**Status:** Tertangani lewat proses

---

### A12. Phishing lewat permintaan tanda tangan

**Ancaman:** Pengguna dibiasakan menekan tombol konfirmasi tanpa membaca, lalu tertipu di tempat lain.

**Dampak:** Sedang, di luar sistem ini.

**Mitigasi:** Frontend selalu menampilkan ringkasan isi transaksi sebelum memunculkan MetaMask, sehingga pengguna terbiasa memeriksa.

**Status:** Mitigasi lewat desain antarmuka

## 3. Daftar Periksa Sebelum Deploy

- [ ] Tidak ada private key atau mnemonic di seluruh kode sumber
- [ ] `.env` ada di `.gitignore` dan tidak pernah ter-commit
- [ ] Semua fungsi tulis punya modifier peran
- [ ] Semua input divalidasi di contract, bukan hanya di frontend
- [ ] Tidak ada loop tanpa batas di fungsi yang mengubah state
- [ ] Semua operasi batch punya batas maksimal
- [ ] Tidak ada field data pribadi di struct mana pun
- [ ] Unit test mencakup kasus penolakan akses, bukan hanya jalur sukses
- [ ] Contract diverifikasi di block explorer
- [ ] Hanya deploy ke testnet

## 4. Keterbatasan yang Diakui

Bagian ini sengaja ditulis terbuka. Mengakui batas sistem lebih baik daripada mengklaim hal yang tidak bisa dipenuhi.

1. **Sistem tidak bisa memverifikasi kebenaran fisik.** Blockchain tidak bisa melihat apakah sapi benar disembelih sesuai syariat. Yang bisa dilakukan hanya mencatat siapa yang mengklaim, kapan, dan memastikan klaim itu tidak bisa diubah belakangan.

2. **Sistem tidak menggantikan lembaga sertifikasi halal.** Nomor sertifikat yang dicatat tetap berasal dari otoritas resmi. Sistem ini hanya menyimpan referensinya secara permanen.

3. **Prototype berjalan di testnet.** Data testnet bisa hilang kalau jaringan direset. Tidak cocok untuk penggunaan nyata.

4. **Contract tidak bisa diperbarui.** Kalau ditemukan bug setelah deploy, contract harus di-deploy ulang dan data lama tidak ikut pindah. Pola upgradeable proxy tidak dipakai karena menambah kompleksitas yang tidak sepadan untuk skala tugas ini.

5. **Belum ada audit keamanan profesional.** Contract ini karya mahasiswa, bukan kode yang sudah diaudit firma keamanan.
