# Fase 3 v1.0 — Implementasi Fungsi Rantai Pasok + Persiapan Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `CattleRegistry` punya seluruh fungsi tulis dan baca dari `docs/CONTRACTS.md` §5-6, teruji lengkap, dan siap di-deploy owner ke Polygon Amoy dengan satu perintah.

**Architecture:** Empat fungsi tulis (`registerCattle`, `recordSlaughter`, `createPackages`, `recordShipping`) dan fungsi baca ditambahkan ke `contracts/CattleRegistry.sol` yang sudah berisi kerangka data + sistem peran dari Fase 2. Setup test bersama ada di `test/helpers.js`; satu file test per tahap rantai pasok. Deploy memakai skrip ethers biasa (`scripts/deploy.js`), private key disimpan terenkripsi lewat `hardhat-keystore` dan **dijalankan owner sendiri** — agent tidak pernah memegang private key.

**Tech Stack:** Hardhat 3.18 (ESM, JS config), `@nomicfoundation/hardhat-toolbox-mocha-ethers` 4 (mocha, chai matchers, network helpers, keystore, verify), ethers v6, Solidity 0.8.28.

**Spec:** `docs/CONTRACTS.md` (§2, §5-8), `docs/DATA-MODEL.md` (§2-5), `docs/SECURITY.md` (A1, A2, A7, A11), `docs/PRD.md` §4, `docs/ROADMAP.md` Fase 3.

## Global Constraints

- Pragma `^0.8.20`; compiler dikunci `0.8.28`.
- Custom error, bukan `require` dengan string. Tidak ada blok `unchecked` (SECURITY A6).
- Setiap fungsi yang mengubah state wajib emit event; fungsi baca wajib `view`.
- Semua operasi batch maksimal 50 item; tidak ada loop tanpa batas di fungsi yang mengubah state (SECURITY A7).
- Tidak ada field data pribadi di struct mana pun (SECURITY A3).
- Output `npm test` harus bersih: semua lulus, tanpa baris WARNING.
- Commit message singkat, deskriptif, bahasa Indonesia, tanpa emoji, **tanpa baris Co-Authored-By AI** (`docs/CLAUDE.md` bagian Git).
- Testnet only. Agent tidak pernah memegang, meminta, atau menulis private key; deploy ke Amoy dijalankan owner.
- Jangan sentuh `frontend/` dan `legacy/`.

## Penyimpangan dari spec (sudah diputuskan, dicatat di dokumen spec oleh task terkait)

1. **Error baru `LengthMismatch(uint256 cutTypes, uint256 weights)`.** CONTRACTS.md mewajibkan panjang dua array `createPackages` sama, tapi tidak menyediakan error untuk itu.
2. **Batch kosong ditolak** dengan `EmptyField("cutTypes")` / `EmptyField("packageIds")`. Tanpa ini, `createPackages` dengan array kosong mengubah status sapi jadi `Packaged` padahal tidak ada kemasan.
3. **`PackageStatus.Delivered` dihapus.** Tidak ada fungsi di CONTRACTS.md §5 yang bisa mencapainya dan PRD tidak punya kebutuhan pencatatan sampai di retail. Nilai enum yang tidak pernah terpakai hanya membingungkan pembaca.
4. **`MAX_BATCH` dibuat `public constant`**, supaya frontend Fase 4 membaca batas 50 dari contract, bukan menyalin angkanya.
5. **Deploy tanpa file `.env`.** URL RPC (bukan rahasia) ditulis langsung di `hardhat.config.js`; private key disimpan terenkripsi lewat `npx hardhat keystore set AMOY_PRIVATE_KEY` di luar repo. Hardhat 3 tidak membaca `.env` otomatis, jadi `.env.example` dihapus supaya tidak menyesatkan.

## Struktur File

| File | Aksi | Tanggung jawab |
|---|---|---|
| `contracts/CattleRegistry.sol` | Ubah (Task 1-4) | Fungsi tulis + baca |
| `test/helpers.js` | Buat (Task 1), ubah (Task 2-4) | Koneksi jaringan simulasi, konstanta enum, pembuat keadaan awal |
| `test/CattleRegistry.cattle.js` | Buat (Task 1) | Registrasi sapi |
| `test/CattleRegistry.slaughter.js` | Buat (Task 2) | Pencatatan sembelih |
| `test/CattleRegistry.packages.js` | Buat (Task 3) | Pembuatan kemasan + paginasi |
| `test/CattleRegistry.shipping.js` | Buat (Task 4) | Pengiriman + jejak konsumen |
| `hardhat.config.js` | Ubah (Task 5) | Optimizer eksplisit + jaringan Amoy |
| `scripts/deploy.js` | Buat (Task 5) | Deploy + pemberian peran aktor demo |
| `docs/deployment-v1.md` | Buat (Task 5) | Runbook deploy + tabel hasil |
| `.env.example` | Hapus (Task 5) | — |
| `docs/CONTRACTS.md`, `docs/DATA-MODEL.md`, `docs/SECURITY.md`, `docs/ROADMAP.md` | Ubah | Catat penyimpangan + status |

---

### Task 1: registerCattle, getCattle, totalCattle

**Files:**
- Modify: `contracts/CattleRegistry.sol`
- Create: `test/helpers.js`, `test/CattleRegistry.cattle.js`

**Interfaces:**
- Consumes: `CattleRegistry` Fase 2 — `onlyRole(bytes32)`, `grantRole(address, bytes32)`, konstanta peran, struct `CattleRecord`, storage `cattleRecords`, `nextCattleId`, error `InvalidAge`, `InvalidWeight`, `UnspecifiedEnum`, `EmptyField`, `CattleNotFound`, event `CattleRegistered`.
- Produces:
  - `modifier cattleExists(uint64 cattleId)` — revert `CattleNotFound(cattleId)`
  - `function registerCattle(uint16 ageInMonths, uint16 liveWeightKg, Grade grade, FeedType feedType, bytes32 farmId) external returns (uint64 cattleId)` — hanya `FARMER_ROLE`
  - `function getCattle(uint64 cattleId) external view returns (CattleRecord memory)`
  - `function totalCattle() external view returns (uint64)`
  - `test/helpers.js` mengekspor: `ethers`, `networkHelpers`, `ROLE`, `Grade`, `FeedType`, `SlaughterMethod`, `CattleStatus`, `CutType`, `b32(text)`, `deployWithRoles()` → `{ registry, admin, farmer, abattoir, distributor, stranger }`, `CATTLE`, `registerCattle(registry, farmer, overrides?)`

- [ ] **Step 1: Buat `test/helpers.js`**

```js
// Setup bersama untuk test CattleRegistry: satu koneksi jaringan simulasi, konstanta enum,
// dan pembuat keadaan awal supaya tiap file test tidak mengulang langkah yang sama.
import { network } from 'hardhat'

export const { ethers, networkHelpers } = await network.create()

export const ROLE = {
  ADMIN: ethers.id('ADMIN_ROLE'),
  FARMER: ethers.id('FARMER_ROLE'),
  ABATTOIR: ethers.id('ABATTOIR_ROLE'),
  DISTRIBUTOR: ethers.id('DISTRIBUTOR_ROLE'),
}

// Urutan nilai harus sama persis dengan enum di contracts/CattleRegistry.sol.
export const Grade = { Unspecified: 0, Standard: 1, Choice: 2, Prime: 3 }
export const FeedType = { Unspecified: 0, GrassFed: 1, GrainFed: 2, Mixed: 3, Organic: 4 }
export const SlaughterMethod = { Unspecified: 0, ManualNoStunning: 1, ManualWithStunning: 2 }
export const CattleStatus = { Registered: 0, Slaughtered: 1, Packaged: 2 }
export const CutType = { Unspecified: 0, Sirloin: 1, Tenderloin: 2, Ribeye: 3, Brisket: 4, Shank: 5, Ground: 6, Other: 7 }

export const b32 = (text) => ethers.encodeBytes32String(text)

export async function deployWithRoles() {
  const [admin, farmer, abattoir, distributor, stranger] = await ethers.getSigners()
  const registry = await ethers.deployContract('CattleRegistry')
  await registry.grantRole(farmer.address, ROLE.FARMER)
  await registry.grantRole(abattoir.address, ROLE.ABATTOIR)
  await registry.grantRole(distributor.address, ROLE.DISTRIBUTOR)
  return { registry, admin, farmer, abattoir, distributor, stranger }
}

export const CATTLE = { age: 24, weight: 450, grade: Grade.Prime, feed: FeedType.GrassFed, farmId: b32('FARM-JTG-001') }

export function registerCattle(registry, farmer, overrides = {}) {
  const c = { ...CATTLE, ...overrides }
  return registry.connect(farmer).registerCattle(c.age, c.weight, c.grade, c.feed, c.farmId)
}
```

- [ ] **Step 2: Tulis test registrasi sapi**

Buat `test/CattleRegistry.cattle.js`:

```js
import { expect } from 'chai'
import { CATTLE, CattleStatus, FeedType, Grade, ROLE, deployWithRoles, networkHelpers, registerCattle } from './helpers.js'

describe('CattleRegistry — registrasi sapi', function () {
  let registry, farmer, stranger

  beforeEach(async function () {
    ;({ registry, farmer, stranger } = await deployWithRoles())
  })

  it('mengembalikan ID urut mulai dari 1', async function () {
    const c = CATTLE
    expect(await registry.connect(farmer).registerCattle.staticCall(c.age, c.weight, c.grade, c.feed, c.farmId)).to.equal(1n)
    await registerCattle(registry, farmer)
    expect(await registry.connect(farmer).registerCattle.staticCall(c.age, c.weight, c.grade, c.feed, c.farmId)).to.equal(2n)
  })

  it('menyimpan data sapi dan memancarkan CattleRegistered', async function () {
    const tx = await registerCattle(registry, farmer)
    const ts = await networkHelpers.time.latest()
    await expect(tx).to.emit(registry, 'CattleRegistered').withArgs(1, farmer.address, CATTLE.farmId, ts)

    const c = await registry.getCattle(1)
    expect(c.cattleId).to.equal(1n)
    expect(c.ageInMonths).to.equal(24n)
    expect(c.liveWeightKg).to.equal(450n)
    expect(c.grade).to.equal(BigInt(Grade.Prime))
    expect(c.feedType).to.equal(BigInt(FeedType.GrassFed))
    expect(c.status).to.equal(BigInt(CattleStatus.Registered))
    expect(c.exists).to.equal(true)
    expect(c.farmer).to.equal(farmer.address)
    expect(c.registeredAt).to.equal(BigInt(ts))
    expect(c.farmId).to.equal(CATTLE.farmId)
  })

  it('totalCattle menghitung sapi terdaftar', async function () {
    expect(await registry.totalCattle()).to.equal(0n)
    await registerCattle(registry, farmer)
    await registerCattle(registry, farmer)
    expect(await registry.totalCattle()).to.equal(2n)
  })

  it('wallet tanpa peran peternak ditolak', async function () {
    await expect(registerCattle(registry, stranger))
      .to.be.revertedWithCustomError(registry, 'Unauthorized')
      .withArgs(stranger.address, ROLE.FARMER)
  })

  it('umur di luar 6-120 bulan ditolak, batasnya diterima', async function () {
    await expect(registerCattle(registry, farmer, { age: 5 }))
      .to.be.revertedWithCustomError(registry, 'InvalidAge').withArgs(5)
    await expect(registerCattle(registry, farmer, { age: 121 }))
      .to.be.revertedWithCustomError(registry, 'InvalidAge').withArgs(121)
    await expect(registerCattle(registry, farmer, { age: 6 })).not.to.be.reverted
    await expect(registerCattle(registry, farmer, { age: 120 })).not.to.be.reverted
  })

  it('berat di luar 100-1500 kg ditolak', async function () {
    await expect(registerCattle(registry, farmer, { weight: 99 }))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(99)
    await expect(registerCattle(registry, farmer, { weight: 1501 }))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(1501)
  })

  it('grade dan jenis pakan Unspecified ditolak', async function () {
    await expect(registerCattle(registry, farmer, { grade: Grade.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('grade')
    await expect(registerCattle(registry, farmer, { feed: FeedType.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('feedType')
  })

  it('kode peternakan kosong ditolak', async function () {
    await expect(registerCattle(registry, farmer, { farmId: '0x' + '00'.repeat(32) }))
      .to.be.revertedWithCustomError(registry, 'EmptyField').withArgs('farmId')
  })

  it('membaca sapi yang tidak ada memberi CattleNotFound', async function () {
    await expect(registry.getCattle(999))
      .to.be.revertedWithCustomError(registry, 'CattleNotFound').withArgs(999)
  })
})
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npm test`
Expected: FAIL — `registerCattle is not a function` / `getCattle is not a function`; 14 test peran tetap lulus.

- [ ] **Step 4: Implementasi**

Di `contracts/CattleRegistry.sol`, tambahkan tepat di atas baris `// ---------------------------------------------------------------- Penyimpanan`:

```solidity
    // ---------------------------------------------------------------- Batas validasi (DATA-MODEL §5)

    uint16 private constant MIN_AGE_MONTHS     = 6;
    uint16 private constant MAX_AGE_MONTHS     = 120;
    uint16 private constant MIN_LIVE_WEIGHT_KG = 100;
    uint16 private constant MAX_LIVE_WEIGHT_KG = 1500;

```

Tambahkan di akhir contract (setelah fungsi `_grant`):

```solidity
    // ---------------------------------------------------------------- Peternak

    modifier cattleExists(uint64 cattleId) {
        if (!cattleRecords[cattleId].exists) revert CattleNotFound(cattleId);
        _;
    }

    function registerCattle(
        uint16 ageInMonths,
        uint16 liveWeightKg,
        Grade grade,
        FeedType feedType,
        bytes32 farmId
    ) external onlyRole(FARMER_ROLE) returns (uint64 cattleId) {
        if (ageInMonths < MIN_AGE_MONTHS || ageInMonths > MAX_AGE_MONTHS) revert InvalidAge(ageInMonths);
        if (liveWeightKg < MIN_LIVE_WEIGHT_KG || liveWeightKg > MAX_LIVE_WEIGHT_KG) revert InvalidWeight(liveWeightKg);
        if (grade == Grade.Unspecified) revert UnspecifiedEnum("grade");
        if (feedType == FeedType.Unspecified) revert UnspecifiedEnum("feedType");
        if (farmId == bytes32(0)) revert EmptyField("farmId");

        // ID dibuat contract, bukan input pengguna, supaya tidak bisa bertabrakan atau diserobot (DATA-MODEL §6).
        cattleId = nextCattleId++;
        uint64 registeredAt = uint64(block.timestamp);

        CattleRecord storage c = cattleRecords[cattleId];
        c.cattleId = cattleId;
        c.ageInMonths = ageInMonths;
        c.liveWeightKg = liveWeightKg;
        c.grade = uint8(grade);
        c.feedType = uint8(feedType);
        c.status = uint8(CattleStatus.Registered);
        c.exists = true;
        c.farmer = msg.sender;
        c.registeredAt = registeredAt;
        c.farmId = farmId;

        emit CattleRegistered(cattleId, msg.sender, farmId, registeredAt);
    }

    // ---------------------------------------------------------------- Baca publik (tanpa wallet)

    function getCattle(uint64 cattleId) external view cattleExists(cattleId) returns (CattleRecord memory) {
        return cattleRecords[cattleId];
    }

    function totalCattle() external view returns (uint64) {
        return nextCattleId - 1;
    }
```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `npm test`
Expected: PASS, 23 passing (14 peran + 9 registrasi), tanpa WARNING.

- [ ] **Step 6: Commit**

```bash
git add contracts/CattleRegistry.sol test/helpers.js test/CattleRegistry.cattle.js
git commit -m "feat: registrasi sapi oleh peternak"
```

---

### Task 2: recordSlaughter

**Files:**
- Modify: `contracts/CattleRegistry.sol`, `test/helpers.js`
- Create: `test/CattleRegistry.slaughter.js`

**Interfaces:**
- Consumes: `cattleExists`, `registerCattle`, helper Task 1 (`deployWithRoles`, `registerCattle`, `b32`, `SlaughterMethod`, `CattleStatus`, `ROLE`, `networkHelpers`).
- Produces:
  - `function recordSlaughter(uint64 cattleId, uint64 slaughteredAt, bytes32 slaughtermanId, bytes32 halalCertNo, SlaughterMethod method) external` — hanya `ABATTOIR_ROLE`
  - `test/helpers.js` tambahan: `SLAUGHTER`, `slaughterCattle(registry, abattoir, cattleId, overrides?)` (default `slaughteredAt` = timestamp blok terakhir)

- [ ] **Step 1: Tambah helper sembelih di `test/helpers.js`**

Tambahkan di akhir file:

```js
export const SLAUGHTER = { slaughtermanId: b32('JULEHA-0042'), halalCertNo: b32('ID00410000123'), method: SlaughterMethod.ManualNoStunning }

export async function slaughterCattle(registry, abattoir, cattleId, overrides = {}) {
  const s = { ...SLAUGHTER, ...overrides }
  const slaughteredAt = s.slaughteredAt ?? (await networkHelpers.time.latest())
  return registry.connect(abattoir).recordSlaughter(cattleId, slaughteredAt, s.slaughtermanId, s.halalCertNo, s.method)
}
```

- [ ] **Step 2: Tulis test sembelih**

Buat `test/CattleRegistry.slaughter.js`:

```js
import { expect } from 'chai'
import { CattleStatus, ROLE, SLAUGHTER, SlaughterMethod, deployWithRoles, networkHelpers, registerCattle, slaughterCattle } from './helpers.js'

describe('CattleRegistry — pencatatan sembelih', function () {
  let registry, farmer, abattoir

  beforeEach(async function () {
    ;({ registry, farmer, abattoir } = await deployWithRoles())
    await registerCattle(registry, farmer)
  })

  it('menyimpan data halal, mengubah status, dan memancarkan CattleSlaughtered', async function () {
    const slaughteredAt = await networkHelpers.time.latest()
    await expect(slaughterCattle(registry, abattoir, 1, { slaughteredAt }))
      .to.emit(registry, 'CattleSlaughtered')
      .withArgs(1, abattoir.address, SLAUGHTER.halalCertNo, slaughteredAt)

    const c = await registry.getCattle(1)
    expect(c.status).to.equal(BigInt(CattleStatus.Slaughtered))
    expect(c.abattoir).to.equal(abattoir.address)
    expect(c.slaughteredAt).to.equal(BigInt(slaughteredAt))
    expect(c.slaughtermanId).to.equal(SLAUGHTER.slaughtermanId)
    expect(c.halalCertNo).to.equal(SLAUGHTER.halalCertNo)
    expect(c.slaughterMethod).to.equal(BigInt(SlaughterMethod.ManualNoStunning))
  })

  it('wallet tanpa peran RPH ditolak', async function () {
    await expect(slaughterCattle(registry, farmer, 1))
      .to.be.revertedWithCustomError(registry, 'Unauthorized')
      .withArgs(farmer.address, ROLE.ABATTOIR)
  })

  it('sapi yang tidak ada ditolak', async function () {
    await expect(slaughterCattle(registry, abattoir, 999))
      .to.be.revertedWithCustomError(registry, 'CattleNotFound').withArgs(999)
  })

  it('sapi yang sudah disembelih tidak bisa disembelih ulang', async function () {
    await slaughterCattle(registry, abattoir, 1)
    await expect(slaughterCattle(registry, abattoir, 1))
      .to.be.revertedWithCustomError(registry, 'InvalidCattleStatus')
      .withArgs(1, CattleStatus.Slaughtered, CattleStatus.Registered)
  })

  it('tanggal sembelih di masa depan ditolak', async function () {
    const future = (await networkHelpers.time.latest()) + 3600
    await expect(slaughterCattle(registry, abattoir, 1, { slaughteredAt: future }))
      .to.be.revertedWithCustomError(registry, 'InvalidTimestamp').withArgs(future)
  })

  it('tanggal sembelih sebelum tanggal registrasi ditolak', async function () {
    const { registeredAt } = await registry.getCattle(1)
    await expect(slaughterCattle(registry, abattoir, 1, { slaughteredAt: registeredAt - 1n }))
      .to.be.revertedWithCustomError(registry, 'InvalidTimestamp').withArgs(registeredAt - 1n)
  })

  it('ID juru sembelih dan nomor sertifikat halal wajib diisi', async function () {
    const empty = '0x' + '00'.repeat(32)
    await expect(slaughterCattle(registry, abattoir, 1, { slaughtermanId: empty }))
      .to.be.revertedWithCustomError(registry, 'EmptyField').withArgs('slaughtermanId')
    await expect(slaughterCattle(registry, abattoir, 1, { halalCertNo: empty }))
      .to.be.revertedWithCustomError(registry, 'EmptyField').withArgs('halalCertNo')
  })

  it('metode sembelih Unspecified ditolak', async function () {
    await expect(slaughterCattle(registry, abattoir, 1, { method: SlaughterMethod.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('method')
  })
})
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npm test`
Expected: FAIL — `recordSlaughter is not a function`; 23 test lama tetap lulus.

- [ ] **Step 4: Implementasi**

Tambahkan di `contracts/CattleRegistry.sol` tepat di atas baris `// ---------------------------------------------------------------- Baca publik (tanpa wallet)`:

```solidity
    // ---------------------------------------------------------------- RPH: penyembelihan

    /// @notice Hanya bisa sekali per sapi dan tidak ada fungsi untuk mengubahnya — disengaja,
    ///         karena data halal yang bisa diedit menghilangkan seluruh nilai sistem ini.
    function recordSlaughter(
        uint64 cattleId,
        uint64 slaughteredAt,
        bytes32 slaughtermanId,
        bytes32 halalCertNo,
        SlaughterMethod method
    ) external onlyRole(ABATTOIR_ROLE) cattleExists(cattleId) {
        CattleRecord storage c = cattleRecords[cattleId];
        if (c.status != uint8(CattleStatus.Registered)) {
            revert InvalidCattleStatus(cattleId, c.status, uint8(CattleStatus.Registered));
        }
        if (slaughteredAt > block.timestamp || slaughteredAt < c.registeredAt) revert InvalidTimestamp(slaughteredAt);
        if (slaughtermanId == bytes32(0)) revert EmptyField("slaughtermanId");
        if (halalCertNo == bytes32(0)) revert EmptyField("halalCertNo");
        if (method == SlaughterMethod.Unspecified) revert UnspecifiedEnum("method");

        c.status = uint8(CattleStatus.Slaughtered);
        c.abattoir = msg.sender;
        c.slaughteredAt = slaughteredAt;
        c.slaughtermanId = slaughtermanId;
        c.halalCertNo = halalCertNo;
        c.slaughterMethod = uint8(method);

        emit CattleSlaughtered(cattleId, msg.sender, halalCertNo, slaughteredAt);
    }

```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `npm test`
Expected: PASS, 31 passing, tanpa WARNING.

- [ ] **Step 6: Commit**

```bash
git add contracts/CattleRegistry.sol test/helpers.js test/CattleRegistry.slaughter.js
git commit -m "feat: pencatatan sembelih dan data halal oleh RPH"
```

---

### Task 3: createPackages, getPackagesByCattle, totalPackages

**Files:**
- Modify: `contracts/CattleRegistry.sol`, `test/helpers.js`, `docs/CONTRACTS.md`
- Create: `test/CattleRegistry.packages.js`

**Interfaces:**
- Consumes: `cattleExists`, `recordSlaughter`; helper Task 1-2 (`deployWithRoles`, `registerCattle`, `slaughterCattle`, `CutType`, `CattleStatus`, `ROLE`).
- Produces:
  - `uint256 public constant MAX_BATCH = 50`
  - `error LengthMismatch(uint256 cutTypes, uint256 weights)`
  - `function createPackages(uint64 cattleId, CutType[] calldata cutTypes, uint32[] calldata weightsGrams) external returns (uint64[] memory packageIds)` — hanya `ABATTOIR_ROLE`
  - `function getPackagesByCattle(uint64 cattleId, uint256 offset, uint256 limit) external view returns (uint64[] memory ids, uint256 total)`
  - `function totalPackages() external view returns (uint64)`
  - `test/helpers.js` tambahan: `createSlaughteredCattle()` → konteks `deployWithRoles()` dengan sapi ID 1 sudah terdaftar dan disembelih

- [ ] **Step 1: Tambah helper di `test/helpers.js`**

Tambahkan di akhir file:

```js
export async function createSlaughteredCattle() {
  const ctx = await deployWithRoles()
  await registerCattle(ctx.registry, ctx.farmer)
  await slaughterCattle(ctx.registry, ctx.abattoir, 1)
  return ctx
}
```

- [ ] **Step 2: Tulis test kemasan**

Buat `test/CattleRegistry.packages.js`:

```js
import { expect } from 'chai'
import { CattleStatus, CutType, ROLE, createSlaughteredCattle, deployWithRoles, registerCattle } from './helpers.js'

const CUTS = [CutType.Sirloin, CutType.Brisket, CutType.Ground]
const WEIGHTS = [500, 1000, 250]

describe('CattleRegistry — pembuatan kemasan', function () {
  let registry, farmer, abattoir

  beforeEach(async function () {
    ;({ registry, farmer, abattoir } = await createSlaughteredCattle())
  })

  it('membuat beberapa kemasan sekaligus, terhubung ke sapi induk', async function () {
    const ids = await registry.connect(abattoir).createPackages.staticCall(1, CUTS, WEIGHTS)
    expect([...ids]).to.deep.equal([1n, 2n, 3n])

    await expect(registry.connect(abattoir).createPackages(1, CUTS, WEIGHTS))
      .to.emit(registry, 'PackageCreated').withArgs(1, 1, CutType.Sirloin, 500)
      .and.to.emit(registry, 'PackageCreated').withArgs(2, 1, CutType.Brisket, 1000)
      .and.to.emit(registry, 'PackageCreated').withArgs(3, 1, CutType.Ground, 250)

    expect((await registry.getCattle(1)).status).to.equal(BigInt(CattleStatus.Packaged))
    const [byCattle, total] = await registry.getPackagesByCattle(1, 0, 10)
    expect([...byCattle]).to.deep.equal([1n, 2n, 3n])
    expect(total).to.equal(3n)
    expect(await registry.totalPackages()).to.equal(3n)
  })

  it('sapi berstatus Packaged masih bisa dibuatkan kemasan tambahan', async function () {
    await registry.connect(abattoir).createPackages(1, CUTS, WEIGHTS)
    const ids = await registry.connect(abattoir).createPackages.staticCall(1, [CutType.Shank], [800])
    expect([...ids]).to.deep.equal([4n])
  })

  it('sapi yang belum disembelih ditolak', async function () {
    await registerCattle(registry, farmer) // sapi ID 2, masih Registered
    await expect(registry.connect(abattoir).createPackages(2, CUTS, WEIGHTS))
      .to.be.revertedWithCustomError(registry, 'InvalidCattleStatus')
      .withArgs(2, CattleStatus.Registered, CattleStatus.Slaughtered)
  })

  it('wallet tanpa peran RPH ditolak', async function () {
    await expect(registry.connect(farmer).createPackages(1, CUTS, WEIGHTS))
      .to.be.revertedWithCustomError(registry, 'Unauthorized')
      .withArgs(farmer.address, ROLE.ABATTOIR)
  })

  it('sapi yang tidak ada ditolak', async function () {
    await expect(registry.connect(abattoir).createPackages(999, CUTS, WEIGHTS))
      .to.be.revertedWithCustomError(registry, 'CattleNotFound').withArgs(999)
  })

  it('panjang array potongan dan berat harus sama', async function () {
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Sirloin, CutType.Ribeye], [500]))
      .to.be.revertedWithCustomError(registry, 'LengthMismatch').withArgs(2, 1)
  })

  it('batch kosong ditolak dan status sapi tidak berubah', async function () {
    await expect(registry.connect(abattoir).createPackages(1, [], []))
      .to.be.revertedWithCustomError(registry, 'EmptyField').withArgs('cutTypes')
    expect((await registry.getCattle(1)).status).to.equal(BigInt(CattleStatus.Slaughtered))
  })

  it('batch lebih dari 50 ditolak, tepat 50 diterima', async function () {
    await expect(registry.connect(abattoir).createPackages(1, Array(51).fill(CutType.Ground), Array(51).fill(250)))
      .to.be.revertedWithCustomError(registry, 'BatchTooLarge').withArgs(51, 50)
    await expect(registry.connect(abattoir).createPackages(1, Array(50).fill(CutType.Ground), Array(50).fill(250)))
      .not.to.be.reverted
    expect(await registry.MAX_BATCH()).to.equal(50n)
  })

  it('berat kemasan di luar 100-50000 gram ditolak', async function () {
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Sirloin], [99]))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(99)
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Sirloin], [50001]))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(50001)
  })

  it('jenis potongan Unspecified ditolak', async function () {
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Unspecified], [500]))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('cutType')
  })
})

describe('CattleRegistry — paginasi kemasan per sapi', function () {
  let registry

  before(async function () {
    let abattoir
    ;({ registry, abattoir } = await createSlaughteredCattle())
    await registry.connect(abattoir).createPackages(1, Array(5).fill(CutType.Ground), Array(5).fill(250))
  })

  it('mengembalikan potongan halaman sesuai offset dan limit', async function () {
    const [ids, total] = await registry.getPackagesByCattle(1, 1, 2)
    expect([...ids]).to.deep.equal([2n, 3n])
    expect(total).to.equal(5n)
  })

  it('limit melebihi sisa hanya mengembalikan sisanya, tanpa overflow', async function () {
    const [ids] = await registry.getPackagesByCattle(1, 3, 2n ** 256n - 1n)
    expect([...ids]).to.deep.equal([4n, 5n])
  })

  it('offset di luar jumlah mengembalikan daftar kosong', async function () {
    const [ids, total] = await registry.getPackagesByCattle(1, 5, 10)
    expect([...ids]).to.deep.equal([])
    expect(total).to.equal(5n)
  })

  it('sapi tanpa kemasan atau tidak ada mengembalikan daftar kosong', async function () {
    const { registry: fresh } = await deployWithRoles()
    const [ids, total] = await fresh.getPackagesByCattle(999, 0, 10)
    expect([...ids]).to.deep.equal([])
    expect(total).to.equal(0n)
  })
})
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npm test`
Expected: FAIL — `createPackages is not a function`; 31 test lama tetap lulus.

- [ ] **Step 4: Implementasi**

Di `contracts/CattleRegistry.sol`, tambahkan di blok "Batas validasi" setelah `MAX_LIVE_WEIGHT_KG`:

```solidity
    uint32 private constant MIN_PACKAGE_GRAMS  = 100;
    uint32 private constant MAX_PACKAGE_GRAMS  = 50_000;

    /// @notice Batas item per transaksi batch, supaya tidak melewati batas gas per blok (SECURITY A7).
    ///         Public supaya frontend membaca batas yang sama dari contract.
    uint256 public constant MAX_BATCH = 50;
```

Tambahkan di blok error, setelah `error LastAdmin();`:

```solidity
    error LengthMismatch(uint256 cutTypes, uint256 weights);
```

Tambahkan tepat di atas baris `// ---------------------------------------------------------------- Baca publik (tanpa wallet)`:

```solidity
    // ---------------------------------------------------------------- RPH: pengemasan

    function createPackages(
        uint64 cattleId,
        CutType[] calldata cutTypes,
        uint32[] calldata weightsGrams
    ) external onlyRole(ABATTOIR_ROLE) cattleExists(cattleId) returns (uint64[] memory packageIds) {
        CattleRecord storage c = cattleRecords[cattleId];
        // Status yang sah: Slaughtered atau Packaged (kemasan tambahan). Satu-satunya yang ditolak: Registered.
        if (c.status == uint8(CattleStatus.Registered)) {
            revert InvalidCattleStatus(cattleId, c.status, uint8(CattleStatus.Slaughtered));
        }
        uint256 count = cutTypes.length;
        if (count == 0) revert EmptyField("cutTypes");
        if (count != weightsGrams.length) revert LengthMismatch(count, weightsGrams.length);
        if (count > MAX_BATCH) revert BatchTooLarge(count, MAX_BATCH);

        uint64 packagedAt = uint64(block.timestamp);
        packageIds = new uint64[](count);

        for (uint256 i = 0; i < count; i++) {
            if (cutTypes[i] == CutType.Unspecified) revert UnspecifiedEnum("cutType");
            uint32 weight = weightsGrams[i];
            if (weight < MIN_PACKAGE_GRAMS || weight > MAX_PACKAGE_GRAMS) revert InvalidWeight(weight);

            uint64 packageId = nextPackageId++;
            PackageRecord storage p = packageRecords[packageId];
            p.packageId = packageId;
            p.cattleId = cattleId;
            p.weightGrams = weight;
            p.cutType = uint8(cutTypes[i]);
            p.status = uint8(PackageStatus.Created);
            p.exists = true;
            p.packagedAt = packagedAt;

            cattleToPackages[cattleId].push(packageId);
            packageIds[i] = packageId;
            emit PackageCreated(packageId, cattleId, uint8(cutTypes[i]), weight);
        }

        c.status = uint8(CattleStatus.Packaged);
    }

```

Tambahkan di akhir contract, setelah `totalCattle`:

```solidity
    /// @notice Paginasi: satu sapi bisa menghasilkan ratusan kemasan, jadi daftar dibaca per halaman.
    ///         Sapi yang tidak ada atau belum punya kemasan mengembalikan daftar kosong dan total 0.
    function getPackagesByCattle(uint64 cattleId, uint256 offset, uint256 limit)
        external
        view
        returns (uint64[] memory ids, uint256 total)
    {
        uint64[] storage all = cattleToPackages[cattleId];
        total = all.length;
        if (offset >= total) return (new uint64[](0), total);

        // Dibandingkan dengan sisa, bukan offset + limit, supaya limit sangat besar tidak overflow.
        uint256 end = limit > total - offset ? total : offset + limit;
        ids = new uint64[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            ids[i - offset] = all[i];
        }
    }

    function totalPackages() external view returns (uint64) {
        return nextPackageId - 1;
    }
```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `npm test`
Expected: PASS, 45 passing, tanpa WARNING. Kalau compiler memberi `Stack too deep` di `createPackages`, hapus variabel lokal `packagedAt` dan tulis `p.packagedAt = uint64(block.timestamp);` langsung di dalam loop (nilainya sama untuk seluruh kemasan dalam satu transaksi), lalu ulangi.

- [ ] **Step 6: Catat penyimpangan di `docs/CONTRACTS.md`**

Di §2, tambahkan `error LengthMismatch(uint256 cutTypes, uint256 weights);` sebagai baris terakhir blok kode error.

Di §5 `createPackages`, ganti butir validasi `- Panjang kedua array harus sama` dengan:

```markdown
- Array tidak boleh kosong, kalau kosong revert `EmptyField("cutTypes")`. Tanpa aturan ini, status sapi bisa berubah jadi `Packaged` tanpa satu pun kemasan
- Panjang kedua array harus sama, kalau tidak revert `LengthMismatch`
```

Di §5 `createPackages`, ubah butir `- Panjang array maksimal 50, kalau lebih revert \`BatchTooLarge\`` menjadi:

```markdown
- Panjang array maksimal 50 (`MAX_BATCH`, konstanta public yang bisa dibaca frontend), kalau lebih revert `BatchTooLarge`
```

Di §6 `getPackagesByCattle`, tambahkan di akhir paragrafnya:

```markdown
Sapi yang tidak ada atau belum punya kemasan mengembalikan daftar kosong dengan `total = 0`, bukan revert.
```

- [ ] **Step 7: Commit**

```bash
git add contracts/CattleRegistry.sol test/helpers.js test/CattleRegistry.packages.js docs/CONTRACTS.md
git commit -m "feat: pembuatan kemasan dari sapi dan paginasi daftar kemasan"
```

---

### Task 4: recordShipping, getPackageTrace, hapus PackageStatus.Delivered

**Files:**
- Modify: `contracts/CattleRegistry.sol`, `test/helpers.js`, `docs/CONTRACTS.md`, `docs/DATA-MODEL.md`
- Create: `test/CattleRegistry.shipping.js`

**Interfaces:**
- Consumes: `createPackages`, `MAX_BATCH`, `getCattle`; helper Task 1-3 (`createSlaughteredCattle`, `CutType`, `CattleStatus`, `SlaughterMethod`, `SLAUGHTER`, `CATTLE`, `ROLE`, `networkHelpers`).
- Produces:
  - `enum PackageStatus { Created, Shipped }`
  - `modifier packageExists(uint64 packageId)` — revert `PackageNotFound(packageId)`
  - `function recordShipping(uint64[] calldata packageIds, uint64 shippedAt) external` — hanya `DISTRIBUTOR_ROLE`
  - `function getPackageTrace(uint64 packageId) external view returns (PackageRecord memory pkg, CattleRecord memory cattle)`
  - `test/helpers.js` tambahan: `PackageStatus`, `createPackagedCattle()` → konteks dengan sapi ID 1 dan kemasan ID 1-3 (Sirloin 500 g, Brisket 1000 g, Ground 250 g)

- [ ] **Step 1: Tambah helper di `test/helpers.js`**

Tambahkan tepat di bawah baris `export const CutType = ...`:

```js
export const PackageStatus = { Created: 0, Shipped: 1 }
```

Tambahkan di akhir file:

```js
export async function createPackagedCattle() {
  const ctx = await createSlaughteredCattle()
  await ctx.registry.connect(ctx.abattoir).createPackages(1, [CutType.Sirloin, CutType.Brisket, CutType.Ground], [500, 1000, 250])
  return ctx
}
```

- [ ] **Step 2: Tulis test pengiriman dan jejak konsumen**

Buat `test/CattleRegistry.shipping.js`:

```js
import { expect } from 'chai'
import {
  CATTLE, CattleStatus, CutType, PackageStatus, ROLE, SLAUGHTER, SlaughterMethod,
  createPackagedCattle, networkHelpers,
} from './helpers.js'

describe('CattleRegistry — pengiriman dan jejak konsumen', function () {
  let registry, farmer, abattoir, distributor

  beforeEach(async function () {
    ;({ registry, farmer, abattoir, distributor } = await createPackagedCattle())
  })

  it('mencatat pengiriman beberapa kemasan dan memancarkan PackageShipped', async function () {
    const shippedAt = await networkHelpers.time.latest()
    await expect(registry.connect(distributor).recordShipping([1, 2], shippedAt))
      .to.emit(registry, 'PackageShipped').withArgs(1, distributor.address, shippedAt)
      .and.to.emit(registry, 'PackageShipped').withArgs(2, distributor.address, shippedAt)

    const [pkg1] = await registry.getPackageTrace(1)
    expect(pkg1.status).to.equal(BigInt(PackageStatus.Shipped))
    expect(pkg1.distributor).to.equal(distributor.address)
    expect(pkg1.shippedAt).to.equal(BigInt(shippedAt))

    const [pkg3] = await registry.getPackageTrace(3)
    expect(pkg3.status).to.equal(BigInt(PackageStatus.Created))
  })

  it('alur penuh: getPackageTrace mengembalikan kemasan beserta riwayat sapi induknya', async function () {
    const shippedAt = await networkHelpers.time.latest()
    await registry.connect(distributor).recordShipping([2], shippedAt)

    const [pkg, cattle] = await registry.getPackageTrace(2)
    expect(pkg.packageId).to.equal(2n)
    expect(pkg.cattleId).to.equal(1n)
    expect(pkg.cutType).to.equal(BigInt(CutType.Brisket))
    expect(pkg.weightGrams).to.equal(1000n)
    expect(pkg.status).to.equal(BigInt(PackageStatus.Shipped))
    expect(pkg.packagedAt).to.be.greaterThan(0n)
    expect(pkg.shippedAt).to.equal(BigInt(shippedAt))

    expect(cattle.cattleId).to.equal(1n)
    expect(cattle.farmer).to.equal(farmer.address)
    expect(cattle.farmId).to.equal(CATTLE.farmId)
    expect(cattle.abattoir).to.equal(abattoir.address)
    expect(cattle.halalCertNo).to.equal(SLAUGHTER.halalCertNo)
    expect(cattle.slaughtermanId).to.equal(SLAUGHTER.slaughtermanId)
    expect(cattle.slaughterMethod).to.equal(BigInt(SlaughterMethod.ManualNoStunning))
    expect(cattle.status).to.equal(BigInt(CattleStatus.Packaged))
  })

  it('membaca kemasan yang tidak ada memberi PackageNotFound', async function () {
    await expect(registry.getPackageTrace(999))
      .to.be.revertedWithCustomError(registry, 'PackageNotFound').withArgs(999)
  })

  it('wallet tanpa peran distributor ditolak', async function () {
    const shippedAt = await networkHelpers.time.latest()
    await expect(registry.connect(abattoir).recordShipping([1], shippedAt))
      .to.be.revertedWithCustomError(registry, 'Unauthorized')
      .withArgs(abattoir.address, ROLE.DISTRIBUTOR)
  })

  it('satu kemasan tidak ada membatalkan seluruh batch', async function () {
    const shippedAt = await networkHelpers.time.latest()
    await expect(registry.connect(distributor).recordShipping([1, 999], shippedAt))
      .to.be.revertedWithCustomError(registry, 'PackageNotFound').withArgs(999)
    const [pkg1] = await registry.getPackageTrace(1)
    expect(pkg1.status).to.equal(BigInt(PackageStatus.Created))
  })

  it('kemasan yang sudah dikirim tidak bisa dikirim ulang', async function () {
    const shippedAt = await networkHelpers.time.latest()
    await registry.connect(distributor).recordShipping([1], shippedAt)
    await expect(registry.connect(distributor).recordShipping([1], shippedAt))
      .to.be.revertedWithCustomError(registry, 'InvalidPackageStatus')
      .withArgs(1, PackageStatus.Shipped, PackageStatus.Created)
  })

  it('ID ganda dalam satu batch ditolak', async function () {
    const shippedAt = await networkHelpers.time.latest()
    await expect(registry.connect(distributor).recordShipping([1, 1], shippedAt))
      .to.be.revertedWithCustomError(registry, 'InvalidPackageStatus')
      .withArgs(1, PackageStatus.Shipped, PackageStatus.Created)
  })

  it('tanggal kirim di masa depan ditolak', async function () {
    const future = (await networkHelpers.time.latest()) + 3600
    await expect(registry.connect(distributor).recordShipping([1], future))
      .to.be.revertedWithCustomError(registry, 'InvalidTimestamp').withArgs(future)
  })

  it('tanggal kirim sebelum kemasan dibuat ditolak', async function () {
    const [pkg1] = await registry.getPackageTrace(1)
    await expect(registry.connect(distributor).recordShipping([1], pkg1.packagedAt - 1n))
      .to.be.revertedWithCustomError(registry, 'InvalidTimestamp').withArgs(pkg1.packagedAt - 1n)
  })

  it('batch kosong dan batch lebih dari 50 ditolak', async function () {
    const shippedAt = await networkHelpers.time.latest()
    await expect(registry.connect(distributor).recordShipping([], shippedAt))
      .to.be.revertedWithCustomError(registry, 'EmptyField').withArgs('packageIds')
    const ids = Array.from({ length: 51 }, (_, i) => i + 1)
    await expect(registry.connect(distributor).recordShipping(ids, shippedAt))
      .to.be.revertedWithCustomError(registry, 'BatchTooLarge').withArgs(51, 50)
  })
})
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npm test`
Expected: FAIL — `recordShipping is not a function` / `getPackageTrace is not a function`; 45 test lama tetap lulus.

- [ ] **Step 4: Implementasi**

Di `contracts/CattleRegistry.sol`, ganti baris enum:

```solidity
    enum PackageStatus { Created, Shipped, Delivered }
```

menjadi:

```solidity
    enum PackageStatus { Created, Shipped }
```

Tambahkan tepat di atas baris `// ---------------------------------------------------------------- Baca publik (tanpa wallet)`:

```solidity
    // ---------------------------------------------------------------- Distributor

    modifier packageExists(uint64 packageId) {
        if (!packageRecords[packageId].exists) revert PackageNotFound(packageId);
        _;
    }

    /// @notice Satu kemasan yang tidak valid membatalkan seluruh batch, supaya tidak ada pengiriman setengah tercatat.
    function recordShipping(uint64[] calldata packageIds, uint64 shippedAt) external onlyRole(DISTRIBUTOR_ROLE) {
        uint256 count = packageIds.length;
        if (count == 0) revert EmptyField("packageIds");
        if (count > MAX_BATCH) revert BatchTooLarge(count, MAX_BATCH);
        if (shippedAt > block.timestamp) revert InvalidTimestamp(shippedAt);

        for (uint256 i = 0; i < count; i++) {
            uint64 packageId = packageIds[i];
            PackageRecord storage p = packageRecords[packageId];
            if (!p.exists) revert PackageNotFound(packageId);
            if (p.status != uint8(PackageStatus.Created)) {
                revert InvalidPackageStatus(packageId, p.status, uint8(PackageStatus.Created));
            }
            if (shippedAt < p.packagedAt) revert InvalidTimestamp(shippedAt);

            p.status = uint8(PackageStatus.Shipped);
            p.shippedAt = shippedAt;
            p.distributor = msg.sender;
            emit PackageShipped(packageId, msg.sender, shippedAt);
        }
    }

```

Tambahkan di akhir contract, setelah `totalPackages`:

```solidity
    /// @notice Dipanggil halaman konsumen saat QR dipindai: kemasan + sapi induknya dalam satu pembacaan.
    function getPackageTrace(uint64 packageId)
        external
        view
        packageExists(packageId)
        returns (PackageRecord memory pkg, CattleRecord memory cattle)
    {
        pkg = packageRecords[packageId];
        cattle = cattleRecords[pkg.cattleId];
    }
```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `npm test`
Expected: PASS, 55 passing, tanpa WARNING.

- [ ] **Step 6: Catat perubahan di dokumen spec**

Di `docs/DATA-MODEL.md` §2, ganti blok `enum PackageStatus` dengan:

```solidity
enum PackageStatus {
    Created,   // 0, kemasan dibuat di RPH
    Shipped    // 1, dikirim ke distributor
}
```

dan tambahkan tepat di bawah blok kode itu:

```markdown
> Nilai `Delivered` (sampai di retail) sengaja tidak ada: tidak ada fungsi yang mencatatnya dan PRD tidak mewajibkan pencatatan sampai di retail. Kalau nanti dibutuhkan, tambahkan bersama fungsi pencatatnya.
```

Di `docs/CONTRACTS.md` §5 `recordShipping`, tambahkan di awal daftar **Validasi**:

```markdown
- Array tidak boleh kosong, kalau kosong revert `EmptyField("packageIds")`
```

dan di akhir daftar **Validasi**:

```markdown
- ID yang sama dua kali dalam satu batch ditolak dengan `InvalidPackageStatus`, karena kemasan itu sudah berstatus `Shipped` saat dicek kedua kalinya
- Satu kemasan tidak valid membatalkan seluruh batch
```

- [ ] **Step 7: Commit**

```bash
git add contracts/CattleRegistry.sol test/helpers.js test/CattleRegistry.shipping.js docs/CONTRACTS.md docs/DATA-MODEL.md
git commit -m "feat: pencatatan pengiriman dan jejak kemasan untuk konsumen"
```

---

### Task 5: Konfigurasi deploy Amoy, skrip deploy, runbook

**Files:**
- Modify: `hardhat.config.js`, `docs/SECURITY.md` (A11), `docs/ROADMAP.md`
- Create: `scripts/deploy.js`, `docs/deployment-v1.md`
- Delete: `.env.example`

**Interfaces:**
- Consumes: contract lengkap dari Task 1-4 (`grantRole`, `checkRole`, konstanta peran).
- Produces: `npx hardhat run --build-profile production scripts/deploy.js --network amoy` yang dijalankan owner; output-nya mencetak alamat contract, blok deploy, dan tx hash tiap pemberian peran.

- [ ] **Step 1: Ubah `hardhat.config.js`**

Isi akhir file:

```js
import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import { configVariable } from 'hardhat/config'

export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: '0.8.28',
    // Ditulis eksplisit supaya bytecode yang di-deploy sama dengan yang dicocokkan saat verifikasi.
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    amoy: {
      type: 'http',
      url: 'https://polygon-amoy-bor-rpc.publicnode.com',
      chainId: 80002,
      // Dibaca dari keystore terenkripsi Hardhat (npx hardhat keystore set AMOY_PRIVATE_KEY), tidak pernah ada di repo.
      accounts: [configVariable('AMOY_PRIVATE_KEY')],
    },
  },
}
```

- [ ] **Step 2: Pastikan test tetap lulus dengan optimizer**

Run: `npm test`
Expected: PASS, 55 passing, tanpa WARNING. Kalau Hardhat menolak `settings` di config versi tunggal, ubah `solidity` menjadi `{ profiles: { default: { version: '0.8.28', settings: { optimizer: { enabled: true, runs: 200 } } }, production: { version: '0.8.28', settings: { optimizer: { enabled: true, runs: 200 } } } } }` lalu ulangi.

- [ ] **Step 3: Buat `scripts/deploy.js`**

```js
// Deploy CattleRegistry lalu berikan peran ke wallet aktor demo.
//
//   Simulasi lokal:  npx hardhat run scripts/deploy.js
//   Polygon Amoy:    npx hardhat run --build-profile production scripts/deploy.js --network amoy
//
// Build profile production dipakai supaya bytecode sama dengan yang dicocokkan `hardhat verify`.
import { network } from 'hardhat'

// Wallet aktor demo yang sama dengan purwarupa v0 (docs/deployment.md). Alamat publik, bukan rahasia.
const ACTORS = [
  ['FARMER_ROLE', '0x060b8A144800DAB4b638c3e350613BE744aF8A6c'], // Peternak
  ['ABATTOIR_ROLE', '0x4cb58bd06DE17e01079441Ebcd98DCE11238b476'], // RumahPotong
  ['DISTRIBUTOR_ROLE', '0x6a9f05b6D81a5061a85ef2B3998b9dB811717e11'], // Distributor
]

const { ethers, networkName } = await network.create()
const [deployer] = await ethers.getSigners()
console.log(`Jaringan : ${networkName}`)
console.log(`Deployer : ${deployer.address}`)

const registry = await ethers.deployContract('CattleRegistry')
const deployReceipt = await registry.deploymentTransaction().wait()
const address = await registry.getAddress()
console.log(`Contract : ${address}`)
console.log(`Tx deploy: ${deployReceipt.hash}`)
console.log(`Blok     : ${deployReceipt.blockNumber}`)

for (const [roleName, account] of ACTORS) {
  const role = await registry[roleName]()
  const receipt = await (await registry.grantRole(account, role)).wait()
  if (!(await registry.checkRole(account, role))) throw new Error(`${roleName} gagal diberikan ke ${account}`)
  console.log(`${roleName.padEnd(16)} → ${account}  tx ${receipt.hash}`)
}
```

- [ ] **Step 4: Jalankan skrip di jaringan simulasi**

Run: `npx hardhat run scripts/deploy.js`
Expected: mencetak `Jaringan : default`, alamat deployer, alamat contract, tx deploy, blok, lalu tiga baris `FARMER_ROLE`, `ABATTOIR_ROLE`, `DISTRIBUTOR_ROLE` masing-masing dengan tx hash; exit 0, tanpa error. Tidak ada private key yang dibutuhkan untuk jaringan simulasi.

- [ ] **Step 5: Pastikan konfigurasi Amoy terbaca tanpa membuka private key**

Run: `npx hardhat --help`
Expected: exit 0 tanpa error konfigurasi (`configVariable` baru dibaca saat jaringan `amoy` benar-benar dipakai). **Jangan** menjalankan perintah apa pun dengan `--network amoy`.

- [ ] **Step 6: Hapus `.env.example`**

```bash
git rm .env.example
```

- [ ] **Step 7: Perbarui `docs/SECURITY.md` A11**

Ganti daftar **Mitigasi** di bagian A11 dengan:

```markdown
**Mitigasi:**
- Private key deployer disimpan terenkripsi lewat `npx hardhat keystore set AMOY_PRIVATE_KEY`, di folder konfigurasi Hardhat milik pengguna, di luar repository. Tidak ada file `.env`
- `.env` tetap masuk `.gitignore` sebagai jaga-jaga
- Wallet yang dipakai khusus testnet, tidak pernah berisi aset bernilai
- Cek `git status` sebelum setiap push
```

- [ ] **Step 8: Buat `docs/deployment-v1.md`**

```markdown
# Deployment v1.0 — CattleRegistry

Contract purwarupa v0 (`CattleTraceability`) tetap hidup di alamat lamanya dan masih dipakai situs GitHub Pages; lihat `docs/deployment.md`. Dokumen ini khusus contract v1.0.

## Compiler

| | |
|---|---|
| Solidity | `0.8.28` |
| Optimizer | enabled, 200 runs |
| Build profile | `production` |

## Cara deploy (dijalankan owner)

Private key hanya pernah diketik owner sendiri. Jangan pernah menempelkannya ke chat, file, atau commit.

1. Pastikan wallet **Owner** (`0x088Da3284A7EE0735E2B7962CE2E236f148A51db`) punya test POL dari faucet Polygon Amoy.
2. Simpan private key Owner ke keystore terenkripsi Hardhat. Perintah ini meminta password keystore baru, lalu private key (MetaMask → Account details → Show private key):

   ```bash
   npx hardhat keystore set AMOY_PRIVATE_KEY
   ```

3. Deploy dan berikan peran ke tiga wallet aktor:

   ```bash
   npx hardhat run --build-profile production scripts/deploy.js --network amoy
   ```

4. Verifikasi kode sumber di Sourcify (tanpa API key), ganti `<ALAMAT>` dengan alamat dari langkah 3:

   ```bash
   npx hardhat verify sourcify --network amoy <ALAMAT>
   ```

5. Salin seluruh output langkah 3 dan 4 ke tabel di bawah.

## Contract

| | |
|---|---|
| Network | Polygon Amoy testnet |
| chainId | `80002` |
| RPC | `https://polygon-amoy-bor-rpc.publicnode.com` |
| Explorer | `https://amoy.polygonscan.com` |
| Alamat contract | belum di-deploy |
| Tx hash deploy | belum di-deploy |
| Blok deploy | belum di-deploy |
| Tanggal deploy | belum di-deploy |
| Terverifikasi (Sourcify) | belum |

## Peran

| Peran | Label MetaMask | Alamat | Tx hash `grantRole` |
|---|---|---|---|
| `ADMIN_ROLE` (deployer) | `Owner` | `0x088Da3284A7EE0735E2B7962CE2E236f148A51db` | otomatis di constructor |
| `FARMER_ROLE` | `Peternak` | `0x060b8A144800DAB4b638c3e350613BE744aF8A6c` | belum |
| `ABATTOIR_ROLE` | `RumahPotong` | `0x4cb58bd06DE17e01079441Ebcd98DCE11238b476` | belum |
| `DISTRIBUTOR_ROLE` | `Distributor` | `0x6a9f05b6D81a5061a85ef2B3998b9dB811717e11` | belum |

> SECURITY A4 menyarankan minimal dua admin. Setelah deploy, pertimbangkan `grantRole(<wallet kedua>, ADMIN_ROLE)` dari wallet Owner, supaya contract tidak mati kalau private key Owner hilang.
```

- [ ] **Step 9: Perbarui `docs/ROADMAP.md`**

- Baris status: `Status saat ini: **Fase 3 berjalan — contract dan test selesai, menunggu deploy ke Amoy oleh owner**`
- Fase 3: `**Status:** Berjalan`. Centang (`- [x]`) tujuh item pertama: `registerCattle`, `recordSlaughter`, `createPackages`, `recordShipping`, fungsi baca, test jalur normal, test jalur penolakan. Biarkan `Deploy ke Polygon Amoy` dan `Verifikasi contract di block explorer` tidak dicentang.

- [ ] **Step 10: Jalankan test terakhir dan cek status git**

Run: `npm test` lalu `git status --short`
Expected: 55 passing tanpa WARNING; perubahan hanya `hardhat.config.js`, `scripts/deploy.js`, `docs/deployment-v1.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, dan `.env.example` terhapus. Tidak ada `cache/`, `artifacts/`, `types/`, `ignition/`.

- [ ] **Step 11: Commit**

```bash
git add hardhat.config.js scripts/deploy.js docs/deployment-v1.md docs/SECURITY.md docs/ROADMAP.md
git commit -m "chore: konfigurasi deploy Amoy lewat keystore dan skrip deploy"
```

---

## Serah terima ke owner (bukan task agent)

Setelah seluruh task selesai dan di-merge, owner menjalankan langkah "Cara deploy" di `docs/deployment-v1.md`. Output deploy dan verifikasi dikirim ke Claude untuk dicatat ke tabel `docs/deployment-v1.md`, lalu dua item terakhir Fase 3 di `docs/ROADMAP.md` dicentang.

## Di luar plan ini (Fase 4)

Frontend v1.0: halaman per peran, QR per kemasan, halaman `/trace/:packageId`, pembaruan ABI dan alamat di frontend.
