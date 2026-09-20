# Data Model

Seluruh data disimpan on-chain di smart contract. Dokumen ini mendefinisikan struktur data, tipe, dan aturan validasinya.

## 1. Prinsip Desain Data

1. **Tidak ada data pribadi on-chain.** Blockchain bersifat publik dan permanen. Nama lengkap, NIK, alamat rumah, nomor telepon tidak pernah disimpan. Identitas diwakili alamat wallet dan nomor sertifikat.
2. **Nilai berkategori memakai enum.** Grade dan jenis pakan punya opsi terbatas, jadi disimpan sebagai angka, bukan string.
3. **Tipe data sekecil mungkin.** Umur sapi tidak perlu `uint256`. Timestamp cukup `uint64`.
4. **Struct disusun untuk packing.** Variabel kecil dikelompokkan supaya muat dalam satu slot 32 byte.

## 2. Enum

### Grade
```solidity
enum Grade {
    Unspecified,  // 0, nilai default
    Standard,     // 1
    Choice,       // 2
    Prime         // 3
}
```

### FeedType
```solidity
enum FeedType {
    Unspecified,  // 0
    GrassFed,     // 1, rumput
    GrainFed,     // 2, konsentrat biji-bijian
    Mixed,        // 3, campuran
    Organic       // 4, pakan organik bersertifikat
}
```

### SlaughterMethod
```solidity
enum SlaughterMethod {
    Unspecified,      // 0
    ManualNoStunning, // 1, manual tanpa pemingsanan
    ManualWithStunning// 2, manual dengan pemingsanan reversible
}
```

> Catatan: pemingsanan reversible masih diperdebatkan di kalangan otoritas halal. Sistem ini hanya mencatat apa yang dilakukan, tidak memberi penilaian sah atau tidaknya. Penilaian itu wewenang lembaga sertifikasi, bukan sistem ini.

### CattleStatus
```solidity
enum CattleStatus {
    Registered,   // 0, terdaftar di peternakan
    Slaughtered,  // 1, sudah disembelih
    Packaged      // 2, sudah dibuat kemasan
}
```

### PackageStatus
```solidity
enum PackageStatus {
    Created,   // 0, kemasan dibuat di RPH
    Shipped,   // 1, dikirim ke distributor
    Delivered  // 2, sampai di retail
}
```

## 3. Struct

### CattleRecord

```solidity
struct CattleRecord {
    // slot 1
    uint64  cattleId;
    uint16  ageInMonths;
    uint16  liveWeightKg;
    uint8   grade;          // Grade
    uint8   feedType;       // FeedType
    uint8   status;         // CattleStatus
    bool    exists;
    // slot 2
    address farmer;         // wallet peternak
    uint64  registeredAt;
    // slot 3
    address abattoir;       // wallet RPH
    uint64  slaughteredAt;
    // slot 4
    bytes32 farmId;         // kode peternakan, bukan nama orang
    // slot 5
    bytes32 slaughtermanId; // ID sertifikat juru sembelih
    // slot 6
    bytes32 halalCertNo;    // nomor sertifikat halal
    // slot 7
    uint8   slaughterMethod;// SlaughterMethod
}
```

Kenapa `bytes32` dan bukan `string`: `bytes32` berukuran tetap dan jauh lebih murah dari sisi gas. Nomor sertifikat dan kode peternakan panjangnya terbatas, jadi cukup ditampung. Konversi ke teks dilakukan di frontend.

### PackageRecord

```solidity
struct PackageRecord {
    // slot 1
    uint64  packageId;
    uint64  cattleId;       // menunjuk ke sapi induk
    uint32  weightGrams;
    uint8   cutType;        // CutType
    uint8   status;         // PackageStatus
    bool    exists;
    // slot 2
    uint64  packagedAt;
    uint64  shippedAt;
    // slot 3
    address distributor;
}
```

### CutType

```solidity
enum CutType {
    Unspecified, // 0
    Sirloin,     // 1
    Tenderloin,  // 2
    Ribeye,      // 3
    Brisket,     // 4, sandung lamur
    Shank,       // 5, sengkel
    Ground,      // 6, daging giling
    Other        // 7
}
```

## 4. Penyimpanan

```solidity
mapping(uint64 => CattleRecord)  private cattleRecords;
mapping(uint64 => PackageRecord) private packageRecords;
mapping(uint64 => uint64[])      private cattleToPackages;

uint64 private nextCattleId  = 1;
uint64 private nextPackageId = 1;
```

`cattleToPackages` menyimpan daftar kemasan dari tiap sapi. Berguna untuk menampilkan di dashboard RPH berapa kemasan yang sudah dibuat dari satu ekor.

> Perhatian: array ini bisa tumbuh panjang. Jangan pernah melakukan iterasi penuh atas array ini di dalam fungsi yang mengubah state, karena bisa kehabisan gas. Untuk fungsi view, pembacaan dengan paginasi lebih aman.

## 5. Aturan Validasi

### Registrasi sapi
| Field | Aturan |
|---|---|
| `ageInMonths` | Antara 6 dan 120. Di bawah 6 bulan bukan sapi potong, di atas 120 tidak masuk akal secara komersial |
| `liveWeightKg` | Antara 100 dan 1500 |
| `grade` | Tidak boleh `Unspecified` |
| `feedType` | Tidak boleh `Unspecified` |
| `farmId` | Tidak boleh kosong |

### Pencatatan penyembelihan
| Field | Aturan |
|---|---|
| Status sapi | Harus `Registered`. Sapi yang sudah disembelih tidak bisa dicatat dua kali |
| `slaughteredAt` | Tidak boleh di masa depan, tidak boleh sebelum `registeredAt` |
| `slaughtermanId` | Tidak boleh kosong |
| `halalCertNo` | Tidak boleh kosong |
| `slaughterMethod` | Tidak boleh `Unspecified` |

### Pembuatan kemasan
| Field | Aturan |
|---|---|
| Status sapi | Harus `Slaughtered` atau `Packaged` |
| `weightGrams` | Antara 100 dan 50000 |
| `cutType` | Tidak boleh `Unspecified` |
| Jumlah kemasan per panggilan | Maksimal 50, untuk mencegah kehabisan gas |

### Pencatatan pengiriman
| Field | Aturan |
|---|---|
| Status kemasan | Harus `Created` |
| `shippedAt` | Tidak boleh sebelum `packagedAt`, tidak boleh di masa depan |

## 6. Format ID

`cattleId` dan `packageId` berupa angka urut yang dibuat otomatis oleh contract. Tidak memakai input dari pengguna.

Alasan: kalau ID ditentukan pengguna, ada risiko tabrakan ID dan pengguna bisa menebak atau menyerobot ID milik orang lain. Angka urut dari contract menghilangkan masalah itu.

Untuk tampilan di label kemasan, angka diformat dengan awalan supaya lebih mudah dibaca manusia:

```
Sapi    : HCT-C-000042
Kemasan : HCT-P-001337
```

Format ini hanya untuk tampilan. Yang disimpan di contract tetap angka murni.

## 7. Event

Setiap perubahan state memancarkan event. Event lebih murah dari storage dan bisa dibaca frontend untuk menampilkan riwayat.

```solidity
event CattleRegistered(
    uint64 indexed cattleId,
    address indexed farmer,
    bytes32 farmId,
    uint64 timestamp
);

event CattleSlaughtered(
    uint64 indexed cattleId,
    address indexed abattoir,
    bytes32 halalCertNo,
    uint64 slaughteredAt
);

event PackageCreated(
    uint64 indexed packageId,
    uint64 indexed cattleId,
    uint8 cutType,
    uint32 weightGrams
);

event PackageShipped(
    uint64 indexed packageId,
    address indexed distributor,
    uint64 shippedAt
);

event RoleGranted(address indexed account, bytes32 indexed role);
event RoleRevoked(address indexed account, bytes32 indexed role);
```

## 8. Data yang Sengaja Tidak Disimpan

| Data | Alasan |
|---|---|
| Nama peternak | Data pribadi, cukup alamat wallet dan kode peternakan |
| Nama juru sembelih | Data pribadi, cukup ID sertifikatnya |
| Alamat dan nomor telepon | Data pribadi, tidak relevan untuk ketertelusuran |
| Harga jual | Informasi komersial sensitif, tidak perlu publik |
| Foto hewan | Ukuran besar, butuh penyimpanan eksternal, di luar scope |
| Koordinat GPS peternakan | Berpotensi mengungkap lokasi properti pribadi |
