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
export const PackageStatus = { Created: 0, Shipped: 1 }
export const Breed = { Unspecified: 0, Bali: 1, Madura: 2, PeranakanOngole: 3, Limousin: 4, Simmental: 5, Brahman: 6, Other: 7 }
export const Sex = { Unspecified: 0, Male: 1, Female: 2 }
export const CoatColor = { Unspecified: 0, White: 1, Grey: 2, Cream: 3, RedBrown: 4, Black: 5, Mixed: 6 }

export const b32 = (text) => ethers.encodeBytes32String(text)

export async function deployWithRoles() {
  const [admin, farmer, abattoir, distributor, stranger] = await ethers.getSigners()
  const registry = await ethers.deployContract('CattleRegistry')
  await registry.grantRole(farmer.address, ROLE.FARMER)
  await registry.grantRole(abattoir.address, ROLE.ABATTOIR)
  await registry.grantRole(distributor.address, ROLE.DISTRIBUTOR)
  return { registry, admin, farmer, abattoir, distributor, stranger }
}

// Foto tiruan: isi tidak diperiksa contract, hanya ukurannya.
export const PHOTO = '0x' + 'ab'.repeat(64)

export const CATTLE = {
  age: 24, weight: 450, grade: Grade.Prime, feed: FeedType.GrassFed,
  breed: Breed.Bali, sex: Sex.Male, coatColor: CoatColor.RedBrown, farmId: b32('FARM-JTG-001'), photo: PHOTO,
}

// Eartag harus unik, jadi tiap panggilan mendapat nomor baru kecuali ditentukan.
let tagSeq = 0
export const nextEartag = () => b32(`ID-TAG-${++tagSeq}`)

export const cattleArgs = (overrides = {}) => {
  const c = { ...CATTLE, eartag: nextEartag(), ...overrides }
  return [c.age, c.weight, c.grade, c.feed, c.breed, c.sex, c.coatColor, c.farmId, c.eartag, c.photo]
}

export function registerCattle(registry, farmer, overrides = {}) {
  return registry.connect(farmer).registerCattle(...cattleArgs(overrides))
}

export const SLAUGHTER = { slaughtermanId: b32('JULEHA-0042'), halalCertNo: b32('ID00410000123'), method: SlaughterMethod.ManualNoStunning }

export async function slaughterCattle(registry, abattoir, cattleId, overrides = {}) {
  const s = { ...SLAUGHTER, ...overrides }
  const slaughteredAt = s.slaughteredAt ?? (await networkHelpers.time.latest())
  // Default: eartag yang benar dari catatan sapi (sapi tak terdaftar -> nol, biar CattleNotFound yang muncul).
  const eartag = s.eartag ?? (await registry.getCattle(cattleId).then((c) => c.eartag, () => ethers.ZeroHash))
  return registry.connect(abattoir).recordSlaughter(cattleId, eartag, slaughteredAt, s.slaughtermanId, s.halalCertNo, s.method)
}

export async function createSlaughteredCattle() {
  const ctx = await deployWithRoles()
  await registerCattle(ctx.registry, ctx.farmer)
  await slaughterCattle(ctx.registry, ctx.abattoir, 1)
  return ctx
}

export async function createPackagedCattle() {
  const ctx = await createSlaughteredCattle()
  await ctx.registry.connect(ctx.abattoir).createPackages(1, [CutType.Sirloin, CutType.Brisket, CutType.Ground], [500, 1000, 250])
  return ctx
}
