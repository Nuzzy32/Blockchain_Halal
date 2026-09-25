# Spesifikasi Smart Contract

**Contract:** `CattleRegistry.sol`
**Solidity:** ^0.8.20
**Jaringan:** Polygon Amoy testnet

## 1. Peran

```solidity
bytes32 public constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");
bytes32 public constant FARMER_ROLE      = keccak256("FARMER_ROLE");
bytes32 public constant ABATTOIR_ROLE    = keccak256("ABATTOIR_ROLE");
bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
```

Alamat yang melakukan deploy otomatis mendapat `ADMIN_ROLE`.

Prototype ini memakai implementasi peran sendiri yang sederhana, bukan `AccessControl` dari OpenZeppelin. Alasannya supaya kode lebih mudah dibaca dan dijelaskan saat presentasi. Untuk kebutuhan production, memakai OpenZeppelin lebih tepat karena sudah teraudit.

## 2. Custom Error

```solidity
error Unauthorized(address caller, bytes32 requiredRole);
error CattleNotFound(uint64 cattleId);
error PackageNotFound(uint64 packageId);
error InvalidCattleStatus(uint64 cattleId, uint8 current, uint8 expected);
error InvalidPackageStatus(uint64 packageId, uint8 current, uint8 expected);
error InvalidAge(uint16 given);
error InvalidWeight(uint32 given);
error InvalidTimestamp(uint64 given);
error EmptyField(string field);
error UnspecifiedEnum(string field);
error BatchTooLarge(uint256 given, uint256 max);
error ZeroAddress();
error LastAdmin();
error LengthMismatch(uint256 cutTypes, uint256 weights);
```

Custom error lebih hemat gas dibanding `require` dengan pesan string, dan frontend bisa menangkap tipe error spesifiknya untuk menampilkan pesan yang tepat.

## 3. Modifier

```solidity
modifier onlyRole(bytes32 role) {
    if (!hasRole[msg.sender][role]) revert Unauthorized(msg.sender, role);
    _;
}

modifier cattleExists(uint64 cattleId) {
    if (!cattleRecords[cattleId].exists) revert CattleNotFound(cattleId);
    _;
}

modifier packageExists(uint64 packageId) {
    if (!packageRecords[packageId].exists) revert PackageNotFound(packageId);
    _;
}
```

## 4. Fungsi Manajemen Peran

### grantRole

```solidity
function grantRole(address account, bytes32 role)
    external
    onlyRole(ADMIN_ROLE)
```

Memberikan peran ke sebuah alamat. Menolak alamat nol. Memancarkan `RoleGranted`. Kalau alamat sudah memiliki peran itu, tidak terjadi apa-apa dan tidak ada event, supaya hitungan admin tetap akurat.

### revokeRole

```solidity
function revokeRole(address account, bytes32 role)
    external
    onlyRole(ADMIN_ROLE)
```

Mencabut peran. Memancarkan `RoleRevoked`. Mencabut peran yang tidak dimiliki tidak terjadi apa-apa. Pencabutan `ADMIN_ROLE` ditolak dengan `LastAdmin` kalau hanya tersisa satu admin, karena contract akan terkunci selamanya tanpa admin.

### checkRole

```solidity
function checkRole(address account, bytes32 role)
    external view returns (bool)
```

Fungsi baca yang dipakai frontend untuk menentukan form mana yang boleh dibuka. Mapping peran sendiri bersifat private, jadi ini satu-satunya jalur baca peran.

## 5. Fungsi Rantai Pasok

### registerCattle

```solidity
function registerCattle(
    uint16 ageInMonths,
    uint16 liveWeightKg,
    Grade grade,
    FeedType feedType,
    bytes32 farmId
) external onlyRole(FARMER_ROLE) returns (uint64 cattleId)
```

**Pemanggil:** Peternak

**Validasi:**
- `ageInMonths` antara 6 dan 120, kalau tidak revert `InvalidAge`
- `liveWeightKg` antara 100 dan 1500, kalau tidak revert `InvalidWeight`
- `grade` bukan `Unspecified`, kalau tidak revert `UnspecifiedEnum`
- `feedType` bukan `Unspecified`, kalau tidak revert `UnspecifiedEnum`
- `farmId` bukan bytes32 kosong, kalau tidak revert `EmptyField`

**Efek:**
- Membuat `cattleId` baru dari counter
- Menyimpan record dengan status `Registered`, `farmer = msg.sender`, `registeredAt = block.timestamp`
- Memancarkan `CattleRegistered`

**Mengembalikan:** `cattleId` yang baru dibuat

---

### recordSlaughter

```solidity
function recordSlaughter(
    uint64 cattleId,
    uint64 slaughteredAt,
    bytes32 slaughtermanId,
    bytes32 halalCertNo,
    SlaughterMethod method
) external onlyRole(ABATTOIR_ROLE) cattleExists(cattleId)
```

**Pemanggil:** RPH

**Validasi:**
- Status sapi harus `Registered`, kalau tidak revert `InvalidCattleStatus`
- `slaughteredAt` tidak boleh lebih besar dari `block.timestamp`, tidak boleh lebih kecil dari `registeredAt`
- `slaughtermanId` dan `halalCertNo` tidak boleh kosong
- `method` bukan `Unspecified`

**Efek:**
- Mengubah status sapi menjadi `Slaughtered`
- Menyimpan `abattoir = msg.sender` dan data halal
- Memancarkan `CattleSlaughtered`

**Catatan desain:** fungsi ini hanya bisa dipanggil sekali per sapi. Tidak ada fungsi untuk mengubah data sembelih setelah tercatat. Ini disengaja, karena kemampuan mengubah data akan menghilangkan seluruh nilai sistem ini.

---

### createPackages

```solidity
function createPackages(
    uint64 cattleId,
    CutType[] calldata cutTypes,
    uint32[] calldata weightsGrams
) external onlyRole(ABATTOIR_ROLE) cattleExists(cattleId)
  returns (uint64[] memory packageIds)
```

**Pemanggil:** RPH

**Validasi:**
- Status sapi harus `Slaughtered` atau `Packaged`
- Array tidak boleh kosong, kalau kosong revert `EmptyField("cutTypes")`. Tanpa aturan ini, status sapi bisa berubah jadi `Packaged` tanpa satu pun kemasan
- Panjang kedua array harus sama, kalau tidak revert `LengthMismatch`
- Panjang array maksimal 50 (`MAX_BATCH`, konstanta public yang bisa dibaca frontend), kalau lebih revert `BatchTooLarge`
- Tiap `weightsGrams` antara 100 dan 50000
- Tiap `cutTypes` bukan `Unspecified`

**Efek:**
- Membuat beberapa kemasan sekaligus dalam satu transaksi
- Menghubungkan tiap kemasan ke `cattleId` induknya
- Mengubah status sapi menjadi `Packaged`
- Memancarkan `PackageCreated` untuk tiap kemasan

**Alasan dibatasi 50:** memproses array panjang dalam satu transaksi berisiko melebihi batas gas per block, dan transaksi akan gagal setelah membakar gas. Membatasi ukuran batch membuat kegagalan itu tidak terjadi.

---

### recordShipping

```solidity
function recordShipping(
    uint64[] calldata packageIds,
    uint64 shippedAt
) external onlyRole(DISTRIBUTOR_ROLE)
```

**Pemanggil:** Distributor

**Validasi:**
- Array tidak boleh kosong, kalau kosong revert `EmptyField("packageIds")`
- Panjang array maksimal 50
- Tiap kemasan harus ada dan berstatus `Created`
- `shippedAt` tidak boleh di masa depan, tidak boleh sebelum `packagedAt` kemasan tersebut
- ID yang sama dua kali dalam satu batch ditolak dengan `InvalidPackageStatus`, karena kemasan itu sudah berstatus `Shipped` saat dicek kedua kalinya
- Satu kemasan tidak valid membatalkan seluruh batch

**Efek:**
- Mengubah status kemasan menjadi `Shipped`
- Menyimpan `distributor = msg.sender` dan `shippedAt`
- Memancarkan `PackageShipped` untuk tiap kemasan

## 6. Fungsi Baca Publik

Semua fungsi di bawah bersifat `view`, gratis dipanggil, dan tidak butuh wallet. Ini yang dipakai halaman konsumen.

### getPackageTrace

```solidity
function getPackageTrace(uint64 packageId)
    external view
    returns (
        PackageRecord memory pkg,
        CattleRecord memory cattle
    )
```

Fungsi utama yang dipanggil saat QR dipindai. Mengembalikan data kemasan beserta data sapi induknya dalam satu panggilan, supaya halaman konsumen cukup melakukan satu kali pembacaan.

Kalau `packageId` tidak ditemukan, revert `PackageNotFound`. Frontend menangkap ini dan menampilkan halaman "kemasan tidak ditemukan" yang ramah, bukan error mentah.

### getCattle

```solidity
function getCattle(uint64 cattleId)
    external view cattleExists(cattleId)
    returns (CattleRecord memory)
```

### getPackagesByCattle

```solidity
function getPackagesByCattle(uint64 cattleId, uint256 offset, uint256 limit)
    external view
    returns (uint64[] memory ids, uint256 total)
```

Memakai paginasi. Satu ekor sapi bisa menghasilkan ratusan kemasan, jadi mengembalikan seluruh array sekaligus berisiko gagal karena batas ukuran respons.

Sapi yang tidak ada atau belum punya kemasan mengembalikan daftar kosong dengan `total = 0`, bukan revert.

### totalCattle dan totalPackages

```solidity
function totalCattle()   external view returns (uint64);
function totalPackages() external view returns (uint64);
```

Untuk dashboard statistik sederhana.

## 7. Cakupan Test yang Wajib Ada

Unit test harus mencakup minimal:

**Jalur normal**
- Peternak mendaftarkan sapi, ID bertambah dengan benar
- RPH mencatat penyembelihan, status berubah
- RPH membuat beberapa kemasan, semua terhubung ke sapi yang benar
- Distributor mencatat pengiriman
- `getPackageTrace` mengembalikan data gabungan yang benar

**Jalur penolakan**
- Wallet tanpa peran ditolak di setiap fungsi tulis
- Sapi yang sudah disembelih tidak bisa disembelih ulang
- Membuat kemasan dari sapi yang belum disembelih ditolak
- Umur di luar rentang ditolak
- Timestamp di masa depan ditolak
- Batch lebih dari 50 ditolak
- Membaca ID yang tidak ada memberi error yang sesuai

**Manajemen peran**
- Admin bisa memberi dan mencabut peran
- Non-admin tidak bisa memberi peran
- Peran yang dicabut benar-benar kehilangan akses

## 8. Urutan Deploy

```
1. Deploy CattleRegistry
2. Deployer otomatis jadi ADMIN_ROLE
3. Admin memberikan FARMER_ROLE ke wallet peternak demo
4. Admin memberikan ABATTOIR_ROLE ke wallet RPH demo
5. Admin memberikan DISTRIBUTOR_ROLE ke wallet distributor demo
6. Catat alamat contract ke frontend/.env
7. Verifikasi contract di block explorer supaya kode sumbernya bisa dibaca publik
```

Verifikasi contract di block explorer penting untuk demo. Kalau kode sumber terlihat publik, dosen dan penguji bisa membaca sendiri logikanya, dan itu memperkuat klaim transparansi sistem.
