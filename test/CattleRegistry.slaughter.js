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
