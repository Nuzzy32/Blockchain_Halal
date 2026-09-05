/**
 * Agregasi data sapi untuk dashboard.
 *
 * Murni: tanpa jaringan, tanpa React, tanpa bigint bocor ke luar. Dipisah dari
 * pengambilan data supaya bisa diuji cepat dengan node (scripts/check-stats.mjs).
 */

export const STAGE = { REGISTERED: 0, SLAUGHTERED: 1, SHIPPED: 2 }

/** Tahap terjauh yang sudah dicapai satu sapi. Tanggal 0 berarti tahap belum terjadi. */
export function stageOf(rec) {
  if (rec.shippedDate !== 0n) return STAGE.SHIPPED
  if (rec.slaughterDate !== 0n) return STAGE.SLAUGHTERED
  return STAGE.REGISTERED
}

const average = (xs) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null

/** Semua angka yang dibutuhkan dashboard, dihitung sekali dari daftar record. */
export function summarize(records) {
  const funnel = { registered: 0, slaughtered: 0, shipped: 0 }
  const gradeCount = new Map()
  const toSlaughter = []
  const toShip = []

  for (const rec of records) {
    const stage = stageOf(rec)

    // Kumulatif: sapi yang sudah dikirim juga terhitung sudah disembelih & terdaftar,
    // sehingga corongnya selalu menurun dan mudah dibaca.
    funnel.registered += 1
    if (stage >= STAGE.SLAUGHTERED) funnel.slaughtered += 1
    if (stage >= STAGE.SHIPPED) funnel.shipped += 1

    const grade = rec.grade || '—'
    gradeCount.set(grade, (gradeCount.get(grade) ?? 0) + 1)

    if (rec.slaughterDate !== 0n) {
      toSlaughter.push(Number(rec.slaughterDate - rec.registeredDate))
    }
    if (rec.shippedDate !== 0n) {
      toShip.push(Number(rec.shippedDate - rec.slaughterDate))
    }
  }

  const grades = [...gradeCount]
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count || a.grade.localeCompare(b.grade))

  const recent = [...records].sort((a, b) =>
    Number(b.registeredDate - a.registeredDate),
  )

  return {
    total: records.length,
    funnel,
    grades,
    avgToSlaughter: average(toSlaughter),
    avgToShip: average(toShip),
    recent,
  }
}

/** Detik -> teks Indonesia yang mudah dibaca. null kalau memang tidak ada datanya. */
export function formatDuration(seconds) {
  if (seconds == null) return null

  const s = Math.round(seconds)
  if (s < 60) return `${s} detik`

  const totalMinutes = Math.round(s / 60)
  if (totalMinutes < 60) return `${totalMinutes} menit`

  const totalHours = Math.floor(s / 3600)
  if (totalHours < 24) {
    const minutes = Math.round((s % 3600) / 60)
    return minutes ? `${totalHours} jam ${minutes} menit` : `${totalHours} jam`
  }

  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return hours ? `${days} hari ${hours} jam` : `${days} hari`
}
