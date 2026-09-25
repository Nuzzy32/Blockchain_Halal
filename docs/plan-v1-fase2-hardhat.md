# Fase 2 v1.0 — Setup Hardhat + Kerangka Contract + Sistem Peran

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Project Hardhat 3 di root repo dengan `contracts/CattleRegistry.sol` berisi seluruh deklarasi data v1.0 (enum, struct, mapping, error, event) dan sistem peran yang teruji.

**Architecture:** Hardhat dipasang di root repo (bukan subfolder) sesuai struktur di `docs/CLAUDE.md`: `/contracts`, `/test`, `/scripts`. Contract Remix v0 dipindah ke `legacy/v0-remix/` supaya tidak ikut dikompilasi Hardhat, tapi tetap tersimpan karena masih live di Amoy dan dipakai situs GitHub Pages. Sistem peran ditulis sendiri (bukan OpenZeppelin `AccessControl`) sesuai `docs/CONTRACTS.md` §1.

**Tech Stack:** Hardhat 3 (ESM, config JavaScript), `@nomicfoundation/hardhat-toolbox-mocha-ethers`, ethers v6, mocha + chai, Solidity 0.8.28.

**Spec:** `docs/CONTRACTS.md`, `docs/DATA-MODEL.md`, `docs/SECURITY.md` (A4, A11), `docs/ROADMAP.md` Fase 2.

## Global Constraints

- Pragma `^0.8.20`; compiler dikunci `0.8.28`.
- Custom error, bukan `require` dengan string (`docs/CLAUDE.md` Aturan Kode).
- Setiap fungsi yang mengubah state wajib emit event; fungsi baca wajib `view`.
- Tidak ada blok `unchecked` (SECURITY A6).
- Tidak ada field data pribadi di struct mana pun (SECURITY A3).
- `.env` masuk `.gitignore` sebelum ada rahasia apa pun (SECURITY A11).
- Commit message singkat, deskriptif, tanpa emoji, **tanpa baris Co-Authored-By AI** (`docs/CLAUDE.md` bagian Git).
- Testnet only. Fase ini tidak deploy apa pun.
- Jangan sentuh `frontend/` — situs v0 harus tetap jalan.

## Penyimpangan dari spec (sudah diputuskan, catat di dokumen spec)

1. **Error baru `LastAdmin()`.** SECURITY A4 mewajibkan contract menolak pencabutan admin terakhir, tapi daftar error di CONTRACTS.md §2 tidak punya error yang cocok.
2. **`slaughterMethod` pindah ke slot 1 `CattleRecord`.** DATA-MODEL menaruhnya sendirian di slot 7, padahal slot 1 baru terisi 16 dari 32 byte. Pindah = 6 slot, bukan 7, sesuai aturan packing di `docs/CLAUDE.md`.
3. **`grantRole`/`revokeRole` idempoten.** Memberi peran yang sudah dimiliki atau mencabut peran yang tidak dimiliki = no-op tanpa event. Tanpa ini, `adminCount` bisa menggelembung dan guard `LastAdmin` bisa dilewati.
4. **`hasRole` dibuat `private`.** Satu-satunya jalur baca untuk frontend adalah `checkRole` (CONTRACTS.md §4), supaya tidak ada dua getter untuk hal yang sama.

## Struktur File

| File | Aksi | Tanggung jawab |
|---|---|---|
| `legacy/v0-remix/*.sol` | Pindah (git mv) dari `contracts/` | Arsip contract v0 yang live di Amoy |
| `package.json` (root) | Buat | Dependency Hardhat + skrip `compile`/`test` |
| `hardhat.config.js` | Buat | Plugin toolbox + versi compiler |
| `.gitignore` | Ubah | Tambah `.env`, `cache/`, `artifacts/`, `types/` |
| `.env.example` | Buat | Daftar variabel untuk Fase 3 (deploy), tanpa nilai rahasia |
| `contracts/CattleRegistry.sol` | Buat | Seluruh deklarasi data + sistem peran |
| `test/CattleRegistry.roles.js` | Buat | Unit test manajemen peran |
| `docs/deployment.md:66-67` | Ubah | Path contract v0 yang baru |
| `docs/CONTRACTS.md`, `docs/DATA-MODEL.md` | Ubah | Catat penyimpangan 1-4 |
| `docs/ROADMAP.md` | Ubah | Status Fase 1-2 |

---

### Task 1: Setup Hardhat dan kerangka data contract

**Files:**
- Move: `contracts/Actor.sol`, `contracts/CattleTraceability.sol`, `contracts/CattleTraceability_test.sol` → `legacy/v0-remix/`
- Create: `package.json`, `hardhat.config.js`, `.env.example`, `contracts/CattleRegistry.sol`
- Modify: `.gitignore`, `docs/deployment.md:66-67`, `docs/DATA-MODEL.md` (struct CattleRecord)

**Interfaces:**
- Produces: contract `CattleRegistry` dengan konstanta `ADMIN_ROLE`, `FARMER_ROLE`, `ABATTOIR_ROLE`, `DISTRIBUTOR_ROLE` (bytes32 public constant), seluruh enum/struct/error/event dari DATA-MODEL dan CONTRACTS.md §2, storage `cattleRecords`, `packageRecords`, `cattleToPackages`, `nextCattleId`, `nextPackageId`. Belum ada fungsi.

- [ ] **Step 1: Pindahkan contract v0 keluar dari `contracts/`**

`CattleTraceability_test.sol` meng-import `remix_tests.sol` yang hanya ada di Remix, jadi Hardhat akan gagal kompilasi kalau file itu tetap di `contracts/`.

```bash
mkdir -p legacy/v0-remix
git mv contracts/Actor.sol contracts/CattleTraceability.sol contracts/CattleTraceability_test.sol legacy/v0-remix/
```

- [ ] **Step 2: Perbarui path di `docs/deployment.md`**

Ganti baris 66-67:

```markdown
3. Remix → paste `legacy/v0-remix/CattleTraceability.sol` → compile `0.8.24`, optimizer on / 200 runs.
4. Tab **Solidity Unit Testing** → jalankan `legacy/v0-remix/CattleTraceability_test.sol`.
```

- [ ] **Step 3: Tambah entri `.gitignore` sebelum membuat file apa pun**

Isi akhir `.gitignore`:

```gitignore
node_modules/
dist/
.DS_Store

# Hardhat
cache/
artifacts/
types/

# Rahasia — jangan pernah di-commit (SECURITY A11)
.env
```

- [ ] **Step 4: Buat `.env.example`**

```bash
# Salin jadi .env lalu isi. File .env tidak pernah di-commit.
# Dipakai mulai Fase 3 (deploy ke Amoy). Pakai wallet khusus testnet.
AMOY_RPC_URL=https://polygon-amoy-bor-rpc.publicnode.com
AMOY_PRIVATE_KEY=
```

RPC resmi `rpc-amoy.polygon.technology` sudah mati DNS-nya per 2026-09-05; publicnode yang dipakai frontend v0.

- [ ] **Step 5: Buat `package.json` root dan pasang dependency**

```json
{
  "name": "halalchain-trace",
  "private": true,
  "type": "module",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test mocha"
  }
}
```

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox-mocha-ethers ethers chai mocha
```

Expected: selesai tanpa `ERESOLVE`. npm memasang sendiri peer dependency toolbox lainnya (hardhat-ethers, chai-matchers, network-helpers, verify, ignition, keystore).

- [ ] **Step 6: Buat `hardhat.config.js`**

```js
import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers'

export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: '0.8.28',
  },
}
```

Jaringan Amoy sengaja belum ditambahkan — itu pekerjaan Fase 3 bersama skrip deploy.

- [ ] **Step 7: Buat `contracts/CattleRegistry.sol` berisi kerangka data**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title  CattleRegistry — HalalChain Trace v1.0
/// @notice Ketertelusuran daging sapi dua tingkat: sapi (cattleId) dan kemasan (packageId).
///         Spesifikasi lengkap: docs/CONTRACTS.md dan docs/DATA-MODEL.md.
contract CattleRegistry {
    // ---------------------------------------------------------------- Peran

    bytes32 public constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");
    bytes32 public constant FARMER_ROLE      = keccak256("FARMER_ROLE");
    bytes32 public constant ABATTOIR_ROLE    = keccak256("ABATTOIR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // ---------------------------------------------------------------- Enum
    // Nilai 0 = Unspecified supaya input yang lupa diisi tertolak, bukan diam-diam jadi opsi pertama.

    enum Grade { Unspecified, Standard, Choice, Prime }
    enum FeedType { Unspecified, GrassFed, GrainFed, Mixed, Organic }
    enum SlaughterMethod { Unspecified, ManualNoStunning, ManualWithStunning }
    enum CattleStatus { Registered, Slaughtered, Packaged }
    enum PackageStatus { Created, Shipped, Delivered }
    enum CutType { Unspecified, Sirloin, Tenderloin, Ribeye, Brisket, Shank, Ground, Other }

    // ---------------------------------------------------------------- Struct
    // Urutan field disusun supaya muat sesedikit mungkin slot 32 byte.

    struct CattleRecord {
        // slot 1 (17 byte)
        uint64  cattleId;
        uint16  ageInMonths;
        uint16  liveWeightKg;
        uint8   grade;           // Grade
        uint8   feedType;        // FeedType
        uint8   status;          // CattleStatus
        uint8   slaughterMethod; // SlaughterMethod
        bool    exists;
        // slot 2
        address farmer;
        uint64  registeredAt;
        // slot 3
        address abattoir;
        uint64  slaughteredAt;
        // slot 4-6
        bytes32 farmId;          // kode peternakan, bukan nama orang
        bytes32 slaughtermanId;  // ID sertifikat juru sembelih
        bytes32 halalCertNo;     // nomor sertifikat halal
    }

    struct PackageRecord {
        // slot 1
        uint64  packageId;
        uint64  cattleId;        // menunjuk ke sapi induk
        uint32  weightGrams;
        uint8   cutType;         // CutType
        uint8   status;          // PackageStatus
        bool    exists;
        // slot 2
        uint64  packagedAt;
        uint64  shippedAt;
        // slot 3
        address distributor;
    }

    // ---------------------------------------------------------------- Penyimpanan

    mapping(uint64 => CattleRecord)  private cattleRecords;
    mapping(uint64 => PackageRecord) private packageRecords;
    mapping(uint64 => uint64[])      private cattleToPackages;

    uint64 private nextCattleId  = 1;
    uint64 private nextPackageId = 1;

    // ---------------------------------------------------------------- Error

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

    // ---------------------------------------------------------------- Event

    event CattleRegistered(uint64 indexed cattleId, address indexed farmer, bytes32 farmId, uint64 timestamp);
    event CattleSlaughtered(uint64 indexed cattleId, address indexed abattoir, bytes32 halalCertNo, uint64 slaughteredAt);
    event PackageCreated(uint64 indexed packageId, uint64 indexed cattleId, uint8 cutType, uint32 weightGrams);
    event PackageShipped(uint64 indexed packageId, address indexed distributor, uint64 shippedAt);
    event RoleGranted(address indexed account, bytes32 indexed role);
    event RoleRevoked(address indexed account, bytes32 indexed role);
}
```

- [ ] **Step 8: Kompilasi**

Run: `npm run compile`
Expected: `Compiled 1 Solidity file with solc 0.8.28` (kalimat persis boleh beda antarversi Hardhat), tanpa error. Kalau Hardhat menolak `hardhat.config.js`, ganti nama jadi `hardhat.config.ts` dengan isi sama, lalu ulangi.

- [ ] **Step 9: Catat penyimpangan packing di `docs/DATA-MODEL.md`**

Ganti blok `struct CattleRecord` di §3 dengan struct dari Step 7 (salin persis), lalu tambahkan tepat di bawah blok kode:

```markdown
> `slaughterMethod` sengaja ditaruh di slot 1 (bukan slot terpisah di akhir) karena slot 1 baru terisi 16 dari 32 byte. Hasilnya 6 slot per sapi, bukan 7.
```

- [ ] **Step 10: Pastikan tidak ada yang tidak sengaja ikut commit**

Run: `git status --short`
Expected: hanya `.gitignore`, `.env.example`, `package.json`, `package-lock.json`, `hardhat.config.js`, `contracts/CattleRegistry.sol`, `docs/deployment.md`, `docs/DATA-MODEL.md`, dan tiga file rename ke `legacy/v0-remix/`. **Tidak boleh** ada `cache/`, `artifacts/`, `types/`, `node_modules/`, atau `.env`.

- [ ] **Step 11: Commit**

```bash
git add .gitignore .env.example package.json package-lock.json hardhat.config.js contracts/CattleRegistry.sol legacy docs/deployment.md docs/DATA-MODEL.md
git commit -m "chore: setup Hardhat dan kerangka data CattleRegistry v1.0"
```

---

### Task 2: Sistem peran (grant, revoke, check, guard admin terakhir)

**Files:**
- Modify: `contracts/CattleRegistry.sol`
- Create: `test/CattleRegistry.roles.js`
- Modify: `docs/CONTRACTS.md` §2 dan §4, `docs/ROADMAP.md`

**Interfaces:**
- Consumes: `CattleRegistry` dan konstanta peran dari Task 1.
- Produces (dipakai Fase 3 dan frontend):
  - `modifier onlyRole(bytes32 role)` — revert `Unauthorized(msg.sender, role)`
  - `function grantRole(address account, bytes32 role) external` — hanya `ADMIN_ROLE`
  - `function revokeRole(address account, bytes32 role) external` — hanya `ADMIN_ROLE`
  - `function checkRole(address account, bytes32 role) external view returns (bool)`
  - `error LastAdmin()`

- [ ] **Step 1: Tulis test pemberian peran dan kontrol akses**

Buat `test/CattleRegistry.roles.js`:

```js
import { expect } from 'chai'
import { network } from 'hardhat'

const { ethers } = await network.create()

const ADMIN_ROLE = ethers.id('ADMIN_ROLE')
const FARMER_ROLE = ethers.id('FARMER_ROLE')

describe('CattleRegistry — manajemen peran', function () {
  let registry, admin, alice, bob

  beforeEach(async function () {
    ;[admin, alice, bob] = await ethers.getSigners()
    registry = await ethers.deployContract('CattleRegistry')
  })

  it('konstanta peran sama dengan keccak256 nama perannya', async function () {
    expect(await registry.ADMIN_ROLE()).to.equal(ADMIN_ROLE)
    expect(await registry.FARMER_ROLE()).to.equal(FARMER_ROLE)
  })

  it('deployer otomatis jadi admin dan tercatat lewat event', async function () {
    expect(await registry.checkRole(admin.address, ADMIN_ROLE)).to.equal(true)
    await expect(registry.deploymentTransaction())
      .to.emit(registry, 'RoleGranted')
      .withArgs(admin.address, ADMIN_ROLE)
  })

  it('admin bisa memberi peran', async function () {
    await expect(registry.grantRole(alice.address, FARMER_ROLE))
      .to.emit(registry, 'RoleGranted')
      .withArgs(alice.address, FARMER_ROLE)
    expect(await registry.checkRole(alice.address, FARMER_ROLE)).to.equal(true)
  })

  it('non-admin tidak bisa memberi peran', async function () {
    await expect(registry.connect(alice).grantRole(alice.address, FARMER_ROLE))
      .to.be.revertedWithCustomError(registry, 'Unauthorized')
      .withArgs(alice.address, ADMIN_ROLE)
  })

  it('memberi peran ke alamat nol ditolak', async function () {
    await expect(registry.grantRole(ethers.ZeroAddress, FARMER_ROLE))
      .to.be.revertedWithCustomError(registry, 'ZeroAddress')
  })

  it('memberi peran yang sudah dimiliki tidak memancarkan event lagi', async function () {
    await registry.grantRole(alice.address, FARMER_ROLE)
    await expect(registry.grantRole(alice.address, FARMER_ROLE))
      .not.to.emit(registry, 'RoleGranted')
  })
})
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm test`
Expected: FAIL — `registry.checkRole is not a function` / `registry.grantRole is not a function` (test konstanta peran sudah lulus).

- [ ] **Step 3: Implementasi grant + check + onlyRole**

Di `contracts/CattleRegistry.sol`, tambahkan di bawah `uint64 private nextPackageId = 1;`:

```solidity
    // private: frontend membaca lewat checkRole, satu jalur baca saja.
    mapping(address => mapping(bytes32 => bool)) private hasRole;
    uint256 private adminCount;
```

Tambahkan di akhir contract, setelah blok event:

```solidity
    // ---------------------------------------------------------------- Manajemen peran

    constructor() {
        _grant(msg.sender, ADMIN_ROLE);
    }

    modifier onlyRole(bytes32 role) {
        if (!hasRole[msg.sender][role]) revert Unauthorized(msg.sender, role);
        _;
    }

    function grantRole(address account, bytes32 role) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grant(account, role);
    }

    function checkRole(address account, bytes32 role) external view returns (bool) {
        return hasRole[account][role];
    }

    /// @dev Idempoten: peran yang sudah dimiliki tidak dihitung dua kali, supaya adminCount akurat.
    function _grant(address account, bytes32 role) private {
        if (hasRole[account][role]) return;
        hasRole[account][role] = true;
        if (role == ADMIN_ROLE) adminCount++;
        emit RoleGranted(account, role);
    }
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm test`
Expected: PASS, 6 passing.

- [ ] **Step 5: Tambah test pencabutan peran**

Tambahkan di dalam blok `describe` yang sama, setelah test terakhir:

```js
  it('admin bisa mencabut peran', async function () {
    await registry.grantRole(alice.address, FARMER_ROLE)
    await expect(registry.revokeRole(alice.address, FARMER_ROLE))
      .to.emit(registry, 'RoleRevoked')
      .withArgs(alice.address, FARMER_ROLE)
    expect(await registry.checkRole(alice.address, FARMER_ROLE)).to.equal(false)
  })

  it('non-admin tidak bisa mencabut peran', async function () {
    await registry.grantRole(bob.address, FARMER_ROLE)
    await expect(registry.connect(alice).revokeRole(bob.address, FARMER_ROLE))
      .to.be.revertedWithCustomError(registry, 'Unauthorized')
      .withArgs(alice.address, ADMIN_ROLE)
  })

  it('peran yang dicabut benar-benar kehilangan akses', async function () {
    await registry.grantRole(alice.address, ADMIN_ROLE)
    await registry.revokeRole(alice.address, ADMIN_ROLE)
    await expect(registry.connect(alice).grantRole(bob.address, FARMER_ROLE))
      .to.be.revertedWithCustomError(registry, 'Unauthorized')
      .withArgs(alice.address, ADMIN_ROLE)
  })

  it('mencabut peran yang tidak dimiliki tidak memancarkan event', async function () {
    await expect(registry.revokeRole(alice.address, FARMER_ROLE))
      .not.to.emit(registry, 'RoleRevoked')
  })

  it('admin satu-satunya tidak bisa mencabut perannya sendiri', async function () {
    await expect(registry.revokeRole(admin.address, ADMIN_ROLE))
      .to.be.revertedWithCustomError(registry, 'LastAdmin')
    expect(await registry.checkRole(admin.address, ADMIN_ROLE)).to.equal(true)
  })

  it('dengan dua admin, satu boleh mundur, tapi yang tersisa tidak', async function () {
    await registry.grantRole(alice.address, ADMIN_ROLE)
    await registry.revokeRole(admin.address, ADMIN_ROLE)
    await expect(registry.connect(alice).revokeRole(alice.address, ADMIN_ROLE))
      .to.be.revertedWithCustomError(registry, 'LastAdmin')
  })

  it('memberi admin dua kali tidak menggelembungkan hitungan admin', async function () {
    // Kalau hitungan menggelembung jadi 3, alice bisa mencabut dirinya dan contract terkunci tanpa admin.
    await registry.grantRole(alice.address, ADMIN_ROLE)
    await registry.grantRole(alice.address, ADMIN_ROLE)
    await registry.revokeRole(admin.address, ADMIN_ROLE)
    await expect(registry.connect(alice).revokeRole(alice.address, ADMIN_ROLE))
      .to.be.revertedWithCustomError(registry, 'LastAdmin')
  })
```

- [ ] **Step 6: Jalankan test, pastikan gagal**

Run: `npm test`
Expected: FAIL — `registry.revokeRole is not a function`; 6 test lama tetap lulus.

- [ ] **Step 7: Implementasi revokeRole + LastAdmin**

Tambahkan di blok error, setelah `error ZeroAddress();`:

```solidity
    error LastAdmin();
```

Tambahkan setelah fungsi `grantRole`:

```solidity
    /// @dev Menolak mencabut admin terakhir: tanpa admin, peran tidak bisa diberikan lagi
    ///      dan contract terkunci selamanya (SECURITY A4).
    function revokeRole(address account, bytes32 role) external onlyRole(ADMIN_ROLE) {
        if (!hasRole[account][role]) return;
        if (role == ADMIN_ROLE) {
            if (adminCount == 1) revert LastAdmin();
            adminCount--;
        }
        hasRole[account][role] = false;
        emit RoleRevoked(account, role);
    }
```

- [ ] **Step 8: Jalankan test, pastikan lulus semua**

Run: `npm test`
Expected: PASS, 13 passing, 0 failing, tanpa warning compiler.

- [ ] **Step 9: Catat penyimpangan di `docs/CONTRACTS.md`**

Di §2, tambahkan `error LastAdmin();` sebagai baris terakhir blok kode error.

Di §4, ganti paragraf deskripsi `grantRole` dengan:

```markdown
Memberikan peran ke sebuah alamat. Menolak alamat nol. Memancarkan `RoleGranted`. Kalau alamat sudah memiliki peran itu, tidak terjadi apa-apa dan tidak ada event, supaya hitungan admin tetap akurat.
```

Ganti paragraf deskripsi `revokeRole` dengan:

```markdown
Mencabut peran. Memancarkan `RoleRevoked`. Mencabut peran yang tidak dimiliki tidak terjadi apa-apa. Pencabutan `ADMIN_ROLE` ditolak dengan `LastAdmin` kalau hanya tersisa satu admin, karena contract akan terkunci selamanya tanpa admin.
```

Di §4 `checkRole`, tambahkan kalimat: `Mapping peran sendiri bersifat private, jadi ini satu-satunya jalur baca peran.`

- [ ] **Step 10: Perbarui `docs/ROADMAP.md`**

- Baris status: `Status saat ini: **Fase 2 selesai, masuk Fase 3**`
- Fase 1: `**Status:** Selesai (dikuasai lewat purwarupa v0: deploy Remix ke Amoy, transaksi nyata tercatat di docs/deployment.md)`, centang semua item.
- Fase 2: `**Status:** Selesai`, centang semua item.

- [ ] **Step 11: Commit**

```bash
git status --short
git add contracts/CattleRegistry.sol test/CattleRegistry.roles.js docs/CONTRACTS.md docs/ROADMAP.md
git commit -m "feat: sistem peran CattleRegistry dengan guard admin terakhir"
```

---

## Di luar plan ini (Fase 3)

`registerCattle`, `recordSlaughter`, `createPackages`, `recordShipping`, fungsi baca, modifier `cattleExists`/`packageExists`, konfigurasi jaringan Amoy, skrip deploy, verifikasi contract.
