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
