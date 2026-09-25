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
