// Isi contoh data di node Hardhat lokal, setelah scripts/deploy.js --network localhost.
//
//   npx hardhat run scripts/seed.js --network localhost
//
// Hanya untuk localhost: skrip ini menandatangani sebagai peternak, RPH, dan distributor
// sekaligus, dan itu hanya mungkin dengan akun tes Hardhat yang kuncinya publik.
import { network } from 'hardhat'

const ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' // deploy pertama akun #0 di node baru

const { ethers, networkName } = await network.create()
if (networkName !== 'localhost') {
  throw new Error(`seed.js hanya untuk --network localhost (sekarang: ${networkName})`)
}

const [, farmer, abattoir, distributor] = await ethers.getSigners()
const registry = await ethers.getContractAt('CattleRegistry', ADDRESS)
const b32 = ethers.encodeBytes32String
const latest = async () => (await ethers.provider.getBlock('latest')).timestamp
const send = async (txPromise) => (await txPromise).wait()

// Enum sesuai contracts/CattleRegistry.sol
const Grade = { Standard: 1, Choice: 2, Prime: 3 }
const Feed = { GrassFed: 1, GrainFed: 2, Mixed: 3, Organic: 4 }
const Method = { NoStunning: 1, WithStunning: 2 }
const Cut = { Sirloin: 1, Tenderloin: 2, Ribeye: 3, Brisket: 4, Shank: 5, Ground: 6 }

async function register(age, weightKg, grade, feed, farmId) {
  await send(registry.connect(farmer).registerCattle(age, weightKg, grade, feed, b32(farmId)))
}
async function slaughter(cattleId, method) {
  await send(registry.connect(abattoir).recordSlaughter(cattleId, await latest(), b32('JULEHA-0042'), b32('ID00410000123'), method))
}

// Sapi 1: sampai dikirim. Sapi 2: dikemas, belum dikirim. Sapi 3: disembelih. Sapi 4: terdaftar.
await register(30, 480, Grade.Prime, Feed.GrassFed, 'FARM-JTG-001')
await register(26, 420, Grade.Choice, Feed.Mixed, 'FARM-JTG-001')
await register(24, 390, Grade.Standard, Feed.GrainFed, 'FARM-BYL-007')
await register(34, 510, Grade.Prime, Feed.Organic, 'FARM-BYL-007')

await slaughter(1, Method.NoStunning)
await slaughter(2, Method.WithStunning)
await slaughter(3, Method.NoStunning)

await send(registry.connect(abattoir).createPackages(1, [Cut.Sirloin, Cut.Tenderloin, Cut.Brisket], [500, 400, 1000])) // kemasan 1-3
await send(registry.connect(abattoir).createPackages(2, [Cut.Ribeye, Cut.Ground], [450, 250])) // kemasan 4-5

await send(registry.connect(distributor).recordShipping([1, 2], await latest()))

console.log(`Sapi: ${await registry.totalCattle()} · Kemasan: ${await registry.totalPackages()}`)
console.log('Coba halaman konsumen: http://localhost:5175/Blockchain_Halal/?trace=1 (dikirim), ?trace=4 (belum dikirim)')
