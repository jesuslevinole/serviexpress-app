

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
  titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF2E6FDD' } };
  sheet.mergeCells(1, 1, 1, Math.max(colCount, 1));

  const dateRow = sheet.getRow(2);
  dateRow.getCell(1).value = `Generated: ${new Date().toLocaleString('en-US')}`;
  dateRow.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6F6D7C' } };
  sheet.mergeCells(2, 1, 2, Math.max(colCount, 1));

  const headerRowIndex = 4;
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E8BFF' } };
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

/** Letra de columna de Excel (1 -> A, 27 -> AA). */
function columnLetter(index: number): string {
  let n = index;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export interface TemplateField {
  label: string;
  required: boolean;
  type: string;
  /** Valores para lista desplegable (enums, SI/NO o nombres de catálogo). */
  options?: string[];
  /** Texto de ayuda para la hoja Guía. */
  hint: string;
}

const TEMPLATE_ROWS = 1000;

/**
 * Plantilla de captura en Excel: hoja "Plantilla" con encabezados de marca,
 * listas desplegables (enums, SI/NO y catálogos con sus nombres reales),
 * hoja "Guía" con el formato de cada columna y hoja "Listas" con los valores.
 */
export async function downloadExcelTemplate(
  title: string,
  fields: TemplateField[],
): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
  ]);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');
  const listsSheet = workbook.addWorksheet('Lists');
  const guideSheet = workbook.addWorksheet('Guide');

  // ===== Encabezados =====
  const headerRow = sheet.getRow(1);
  fields.forEach((field, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = field.required ? `${field.label} *` : field.label;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E8BFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getColumn(i + 1).width = Math.max(field.label.length + 4, 16);
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ===== Listas desplegables =====
  let listColumn = 0;
  fields.forEach((field, i) => {
    if (!field.options || field.options.length === 0) return;
    listColumn += 1;
    const letter = columnLetter(listColumn);
    listsSheet.getCell(`${letter}1`).value = field.label;
    listsSheet.getCell(`${letter}1`).font = { name: 'Arial', size: 10, bold: true };
    field.options.forEach((option, j) => {
      listsSheet.getCell(`${letter}${j + 2}`).value = option;
    });
    listsSheet.getColumn(listColumn).width = 26;

    const targetLetter = columnLetter(i + 1);
    const range = `Listas!$${letter}$2:$${letter}$${field.options.length + 1}`;
    for (let row = 2; row <= TEMPLATE_ROWS; row += 1) {
      sheet.getCell(`${targetLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: !field.required,
        formulae: [range],
        showErrorMessage: true,
        errorTitle: 'Invalid value',
        error: `Pick a value from the "${field.label}" list`,
      };
    }
  });

  // ===== Guía =====
  const guideHeader = guideSheet.getRow(1);
  ['Column', 'Required', 'Format / values'].forEach((label, i) => {
    const cell = guideHeader.getCell(i + 1);
    cell.value = label;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E6FDD' } };
  });
  fields.forEach((field, i) => {
    const row = guideSheet.getRow(i + 2);
    row.getCell(1).value = field.label;
    row.getCell(2).value = field.required ? 'Yes' : 'No';
    row.getCell(3).value = field.hint;
    [1, 2, 3].forEach((c) => {
      row.getCell(c).font = { name: 'Arial', size: 10 };
    });
  });
  guideSheet.getColumn(1).width = 30;
  guideSheet.getColumn(2).width = 12;
  guideSheet.getColumn(3).width = 70;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Plantilla_${title.replace(/\s+/g, '_')}.xlsx`);
}
