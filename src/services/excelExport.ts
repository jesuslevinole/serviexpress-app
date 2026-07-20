

export interface ExcelColumn {
  header: string;
  values: string[];
}

/**
 * Exporta un reporte profesional a Excel:
 * título, encabezados con fondo morado, autofiltro, bordes y anchos automáticos.
 * Recibe los valores YA resueltos (nombres, nunca IDs).
 */
export async function exportToExcel(title: string, columns: ExcelColumn[]): Promise<void> {
  // Carga diferida: ExcelJS solo se descarga cuando el usuario exporta.
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
  ]);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));

  const colCount = columns.length;
  const rowCount = columns[0]?.values.length ?? 0;

  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF443BA3' } };
  sheet.mergeCells(1, 1, 1, Math.max(colCount, 1));

  const dateRow = sheet.getRow(2);
  dateRow.getCell(1).value = `Generado: ${new Date().toLocaleString('es-MX')}`;
  dateRow.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6F6D7C' } };
  sheet.mergeCells(2, 1, 2, Math.max(colCount, 1));

  const headerRowIndex = 4;
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5A4FCF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  for (let r = 0; r < rowCount; r += 1) {
    const row = sheet.getRow(headerRowIndex + 1 + r);
    columns.forEach((col, c) => {
      const cell = row.getCell(c + 1);
      cell.value = col.values[r] ?? '';
      cell.font = { name: 'Arial', size: 10 };
    });
  }

  columns.forEach((col, i) => {
    const maxLen = Math.max(col.header.length, ...col.values.map((v) => v.length), 10);
    sheet.getColumn(i + 1).width = Math.min(maxLen + 3, 42);
  });

  if (rowCount > 0) {
    sheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: colCount },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fileName);
}
