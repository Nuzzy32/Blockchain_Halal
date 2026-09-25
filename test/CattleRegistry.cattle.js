import { expect } from 'chai'
import { CATTLE, CattleStatus, FeedType, Grade, ROLE, deployWithRoles, ethers, networkHelpers, registerCattle } from './helpers.js'

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
    await expect(registerCattle(registry, farmer, { age: 6 })).not.to.revert(ethers)
    await expect(registerCattle(registry, farmer, { age: 120 })).not.to.revert(ethers)
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
