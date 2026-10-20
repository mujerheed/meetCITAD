/**
 * Browser download helpers for exports and generated files.
 */

export function downloadBlob(blob, filename) {
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename)
}

export function downloadJson(data, filename) {
  downloadText(JSON.stringify(data, null, 2), filename, 'application/json;charset=utf-8')
}

function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * @param {string} filename
 * @param {{ key: string, label: string, value?: (row: any) => any }[]} columns
 * @param {any[]} rows
 */
export function downloadCsv(filename, columns, rows = []) {
  const header = columns.map((column) => escapeCsv(column.label)).join(',')
  const lines = rows.map((row) =>
    columns
      .map((column) =>
        escapeCsv(
          typeof column.value === 'function' ? column.value(row) : row[column.key]
        )
      )
      .join(',')
  )

  // A BOM keeps Excel happy with UTF-8 names.
  downloadText(`\uFEFF${[header, ...lines].join('\r\n')}`, filename, 'text/csv;charset=utf-8')
}

export function filenameTimestamp() {
  const now = new Date()
  const pad = (part) => String(part).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`
}

export function slug(value, fallback = 'export') {
  return (
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  )
}
