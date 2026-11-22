// Foto sapi: dikecilkan di browser sebelum dikirim, lalu dibaca balik dari event CattlePhoto.
// Tanpa library — <canvas> bawaan browser sudah cukup, dan menggambar ulang lewat canvas
// sekaligus membuang metadata EXIF (termasuk lokasi GPS peternak).

/** Sama dengan MAX_PHOTO_BYTES di contracts/CattleRegistry.sol. */
export const MAX_PHOTO_BYTES = 30_000

/** Jenis gambar dari byte awalnya. Selain WebP/JPEG/PNG -> null, tidak ditampilkan. */
export function imageMime(b) {
  if (!b || b.length < 12) return null
  const at = (i, ...xs) => xs.every((x, j) => b[i + j] === x)
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp' // RIFF....WEBP
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'image/png'
  return null
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

/** File dari <input type="file"> -> Uint8Array gambar <= MAX_PHOTO_BYTES. */
export async function compressPhoto(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file) // ikut orientasi EXIF, jadi foto ponsel tidak miring
  } catch {
    throw new Error('File ini tidak bisa dibaca sebagai gambar. Pilih foto JPG, PNG, atau WebP.')
  }
  const canvas = document.createElement('canvas')
  try {
    for (let side = 640; side >= 200; side = Math.round(side * 0.8)) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const q of [0.8, 0.65, 0.5]) {
        let blob = await toBlob(canvas, 'image/webp', q)
        // Safari lama tidak bisa menulis WebP dan diam-diam memberi PNG; pakai JPEG saja.
        if (blob?.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q)
        if (blob && blob.size <= MAX_PHOTO_BYTES) return new Uint8Array(await blob.arrayBuffer())
      }
    }
  } finally {
    bitmap.close()
  }
  throw new Error('Foto tidak bisa dikecilkan sampai 30 KB. Coba foto lain.')
}
