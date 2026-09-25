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
})
