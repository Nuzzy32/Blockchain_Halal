import { expect } from 'chai'
import {
  Breed, CATTLE, CattleStatus, CoatColor, FeedType, Grade, PHOTO, ROLE, Sex, cattleArgs, deployWithRoles, ethers, networkHelpers,
  registerCattle,
} from './helpers.js'

describe('CattleRegistry — registrasi sapi', function () {
  let registry, farmer, stranger

  beforeEach(async function () {
    ;({ registry, farmer, stranger } = await deployWithRoles())
  })

  it('mengembalikan ID urut mulai dari 1', async function () {
    expect(await registry.connect(farmer).registerCattle.staticCall(...cattleArgs())).to.equal(1n)
    await registerCattle(registry, farmer)
    expect(await registry.connect(farmer).registerCattle.staticCall(...cattleArgs())).to.equal(2n)
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
    expect(c.breed).to.equal(BigInt(Breed.Bali))
    expect(c.sex).to.equal(BigInt(Sex.Male))
    expect(c.coatColor).to.equal(BigInt(CoatColor.RedBrown))
  })

  it('foto dipancarkan lewat CattlePhoto dan bloknya dicatat', async function () {
    const tx = await registerCattle(registry, farmer)
    await expect(tx).to.emit(registry, 'CattlePhoto').withArgs(1, PHOTO)
    const { blockNumber } = await tx.wait()
    expect((await registry.getCattle(1)).photoBlock).to.equal(BigInt(blockNumber))
    // Halaman konsumen membaca log tepat di blok itu.
    const [log] = await registry.queryFilter(registry.filters.CattlePhoto(1), blockNumber, blockNumber)
    expect(log.args.photo).to.equal(PHOTO)
  })

  it('tanpa foto: tidak ada event CattlePhoto dan photoBlock 0', async function () {
    await expect(registerCattle(registry, farmer, { photo: '0x' })).not.to.emit(registry, 'CattlePhoto')
    expect((await registry.getCattle(1)).photoBlock).to.equal(0n)
  })

  it('foto di atas MAX_PHOTO_BYTES ditolak, tepat batasnya diterima', async function () {
    const max = Number(await registry.MAX_PHOTO_BYTES())
    await expect(registerCattle(registry, farmer, { photo: '0x' + 'ff'.repeat(max + 1) }))
      .to.be.revertedWithCustomError(registry, 'PhotoTooLarge').withArgs(max + 1, max)
    await expect(registerCattle(registry, farmer, { photo: '0x' + 'ff'.repeat(max) })).not.to.revert(ethers)
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
    await expect(registerCattle(registry, farmer, { age: 6 })).not.to.revert(ethers)
    await expect(registerCattle(registry, farmer, { age: 120 })).not.to.revert(ethers)
  })

  it('berat di luar 100-1500 kg ditolak, batasnya diterima', async function () {
    await expect(registerCattle(registry, farmer, { weight: 99 }))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(99)
    await expect(registerCattle(registry, farmer, { weight: 1501 }))
      .to.be.revertedWithCustomError(registry, 'InvalidWeight').withArgs(1501)
    await expect(registerCattle(registry, farmer, { weight: 100 })).not.to.revert(ethers)
    await expect(registerCattle(registry, farmer, { weight: 1500 })).not.to.revert(ethers)
  })

  it('grade dan jenis pakan Unspecified ditolak', async function () {
    await expect(registerCattle(registry, farmer, { grade: Grade.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('grade')
    await expect(registerCattle(registry, farmer, { feed: FeedType.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('feedType')
  })

  it('ras, jenis kelamin, dan warna bulu Unspecified ditolak', async function () {
    await expect(registerCattle(registry, farmer, { breed: Breed.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('breed')
    await expect(registerCattle(registry, farmer, { sex: Sex.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('sex')
    await expect(registerCattle(registry, farmer, { coatColor: CoatColor.Unspecified }))
      .to.be.revertedWithCustomError(registry, 'UnspecifiedEnum').withArgs('coatColor')
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
