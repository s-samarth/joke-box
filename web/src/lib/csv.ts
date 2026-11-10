/** Build a CSV file in the browser and download it (works offline too). */

/** A spreadsheet runs text that starts with one of these as a formula: "- so I said" opens as #NAME?. */
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value: string | number): string {
  // An apostrophe in front tells the spreadsheet it's text. Numbers are left alone, minus sign and all.
  const text = typeof value === 'string' && FORMULA_START.test(value) ? `'${value}` : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
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
