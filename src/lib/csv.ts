// CSV for Slovak Excel: UTF-8 with BOM, ';' separator, decimal comma in amounts.

export type CsvCell = string | number | null | undefined

function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return ''
  const value = String(cell)
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

/** 1050 -> "10,50" (no currency sign, so Excel treats it as a number). */
export function csvAmount(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
