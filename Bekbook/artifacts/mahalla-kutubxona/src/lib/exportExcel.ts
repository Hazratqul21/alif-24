import * as XLSX from "xlsx";

export function exportExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, string | number | null | undefined>[] }[]
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    if (!sheet.rows.length) continue;
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    // Auto column widths
    const cols = Object.keys(sheet.rows[0]).map(k => ({
      wch: Math.max(k.length, ...sheet.rows.map(r => String(r[k] ?? "").length)) + 2,
    }));
    ws["!cols"] = cols;
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : filename + ".xlsx");
}

export function exportExcelSimple(
  filename: string,
  rows: Record<string, string | number | null | undefined>[],
  sheetName = "Ma'lumotlar"
) {
  exportExcel(filename, [{ name: sheetName, rows }]);
}
