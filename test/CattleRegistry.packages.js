import { expect } from 'chai'
import { CattleStatus, CutType, ROLE, createSlaughteredCattle, deployWithRoles, ethers, registerCattle } from './helpers.js'

const CUTS = [CutType.Sirloin, CutType.Brisket, CutType.Ground]
const WEIGHTS = [500, 1000, 250]

describe('CattleRegistry — pembuatan kemasan', function () {
  let registry, farmer, abattoir, stranger

  beforeEach(async function () {
    ;({ registry, farmer, abattoir, stranger } = await createSlaughteredCattle())
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
      .not.to.revert(ethers)
    expect(await registry.MAX_BATCH()).to.equal(50n)
  })

  it('berat kemasan di luar 100-50000 gram ditolak, batasnya diterima', async function () {
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Sirloin], [99]))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(99)
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Sirloin], [50001]))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(50001)
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Sirloin], [100]))
      .not.to.revert(ethers)
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Sirloin], [50_000]))
      .not.to.revert(ethers)
  })

  it('jenis potongan Unspecified ditolak', async function () {
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Unspecified], [500]))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('cutType')
  })

  it('RPH lain yang bukan pencatat sembelih tidak bisa membuat kemasan', async function () {
    await registry.grantRole(stranger.address, ROLE.ABATTOIR)
    await expect(registry.connect(stranger).createPackages(1, CUTS, WEIGHTS))
      .to.be.revertedWithCustomError(registry, 'WrongAbattoir')
      .withArgs(1, abattoir.address)
  })

  it('total berat kemasan sapi terekam di packagedGrams', async function () {
    await registry.connect(abattoir).createPackages(1, CUTS, WEIGHTS)
    expect((await registry.getCattle(1)).packagedGrams).to.equal(1750n)
  })

  it('total berat kemasan melebihi berat hidup dalam satu batch ditolak', async function () {
    await expect(registry.connect(abattoir).createPackages(1, Array(10).fill(CutType.Ground), Array(10).fill(50_000)))
      .to.be.revertedWithCustomError(registry, 'PackageWeightExceeded')
      .withArgs(1, 500_000, 450_000)
  })

  it('total berat kemasan melebihi berat hidup lintas batch ditolak', async function () {
    await expect(registry.connect(abattoir).createPackages(1, Array(9).fill(CutType.Ground), Array(9).fill(50_000)))
      .not.to.revert(ethers)
    await expect(registry.connect(abattoir).createPackages(1, [CutType.Ground], [100]))
      .to.be.revertedWithCustomError(registry, 'PackageWeightExceeded')
      .withArgs(1, 450_100, 450_000)
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
