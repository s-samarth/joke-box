/** Build a CSV file in the browser and download it (works offline too). */

function cell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\n')
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  // The BOM makes Excel read Hindi and other non-ASCII text correctly.
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  URL.revokeObjectURL(url)
}
