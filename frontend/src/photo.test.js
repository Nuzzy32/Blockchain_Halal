import assert from 'node:assert/strict'
import { test } from 'node:test'
import { imageMime } from './photo.js'

const bytes = (...xs) => Uint8Array.from([...xs, ...Array(12).fill(0)])

test('jenis gambar dikenali dari byte awal', () => {
  assert.equal(imageMime(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0])), 'image/webp')
  assert.equal(imageMime(bytes(0xff, 0xd8, 0xff)), 'image/jpeg')
  assert.equal(imageMime(bytes(0x89, 0x50, 0x4e, 0x47)), 'image/png')
})

test('bukan gambar, terlalu pendek, atau kosong -> null', () => {
  assert.equal(imageMime(new TextEncoder().encode('<svg onload=alert(1)></svg>')), null)
  assert.equal(imageMime(Uint8Array.from([0xff, 0xd8, 0xff])), null)
  assert.equal(imageMime(null), null)
})
