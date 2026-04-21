import ExcelJS from 'exceljs';
import { buildAdminUsersPdfBlob } from '@/lib/admin-users-report-pdf';

type ExportSummaryItem = {
  label: string;
  value: string | number;
};

type ExcelExportOptions = {
  title?: string;
  subtitle?: string;
  generatedAt?: string;
  orderedColumns?: string[];
  summary?: ExportSummaryItem[];
};

type PDFExportOptions = {
  subtitle?: string;
  generatedAt?: string;
  orientation?: 'portrait' | 'landscape';
  summary?: ExportSummaryItem[];
  logoPath?: string;
};

const SENSITIVE_EXPORT_COLUMN_PATTERN = /correo|email|e-?mail|mail/i;

const toDisplayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'N/D';
  return value;
};

const safeCellText = (value: unknown) => String(toDisplayValue(value));

const resolveColumns = (data: Array<Record<string, unknown>>, orderedColumns?: string[]) => {
  if (orderedColumns && orderedColumns.length > 0) return orderedColumns;
  const first = data[0] || {};
  return Object.keys(first);
};

const sanitizeExportColumns = (columns: string[]) => {
  const filtered = columns.filter((column) => !SENSITIVE_EXPORT_COLUMN_PATTERN.test(column));
  return filtered.length > 0 ? filtered : columns;
};

const computeExcelColumnWidths = (headers: string[], rows: Array<Record<string, unknown>>) => {
  return headers.map((header) => {
    const dataMax = rows.reduce((max, row) => Math.max(max, safeCellText(row[header]).length), 0);
    const width = Math.max(header.length, dataMax) + 2;
    return Math.max(12, Math.min(40, width));
  });
};

const downloadBlobFile = (blob: Blob, fileName: string) => {
  if (typeof document === 'undefined') {
    throw new Error('La exportación XLSX solo está disponible en el navegador.');
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};

const buildAndDownloadExcel = async (
  data: Array<Record<string, unknown>>,
  fileName: string,
  sheetName: string,
  options?: ExcelExportOptions
) => {
  const normalizedData = Array.isArray(data) ? data : [];
  const headers = sanitizeExportColumns(resolveColumns(normalizedData, options?.orderedColumns));
  const generatedAt = options?.generatedAt || new Date().toLocaleString('es-PA');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  workbook.creator = 'Parkeando Edicion Universitaria';
  workbook.lastModifiedBy = 'Parkeando Edicion Universitaria';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = options?.title || sheetName;
  workbook.subject = options?.subtitle || 'Reporte exportado desde Parkeando';

  if (options?.title) {
    worksheet.addRow([options.title]);
  }

  if (options?.subtitle) {
    worksheet.addRow([options.subtitle]);
  }

  worksheet.addRow([`Generado el: ${generatedAt}`]);

  for (const item of options?.summary || []) {
    worksheet.addRow([`${item.label}: ${item.value}`]);
  }

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0055A4' },
    };
  });

  for (const row of normalizedData) {
    worksheet.addRow(headers.map((header) => toDisplayValue(row[header]) as string | number));
  }

  const columnWidths = computeExcelColumnWidths(headers, normalizedData);
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  if (headers.length > 0) {
    worksheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: headers.length },
    };
  }

  const workbookBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([workbookBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlobFile(blob, `${fileName}.xlsx`);
};

export const exportToExcel = (
  data: Array<Record<string, unknown>>,
  fileName: string,
  sheetName: string = 'Datos',
  options?: ExcelExportOptions
) => {
  void buildAndDownloadExcel(data, fileName, sheetName, options).catch((error) => {
    console.error('[ExportExcel] Error al exportar archivo:', error);
  });
};

export const exportToPDF = async (
  title: string,
  columns: string[],
  data: any[][],
  fileName: string,
  options?: PDFExportOptions
) => {
  const generatedAt = options?.generatedAt || new Date().toLocaleString('es-PA');

  const pdfColumns = columns.filter((column) => !SENSITIVE_EXPORT_COLUMN_PATTERN.test(column));
  const effectiveColumns = pdfColumns.length > 0 ? pdfColumns : columns;
  const sourceIndexes = effectiveColumns.map((column) => columns.findIndex((original) => original === column));

  const rowRecords = data.map((row) => {
    const normalized: Record<string, string | number> = {};
    effectiveColumns.forEach((column, index) => {
      const sourceIndex = sourceIndexes[index];
      const rawValue = sourceIndex >= 0 ? row[sourceIndex] : undefined;
      normalized[column] = toDisplayValue(rawValue) as string | number;
    });
    return normalized;
  });

  const blob = await buildAdminUsersPdfBlob({
    title,
    subtitle: options?.subtitle,
    generatedAt,
    columns: effectiveColumns,
    rows: rowRecords,
    summary: options?.summary,
    orientation: options?.orientation || 'landscape',
    logoPath: options?.logoPath,
  });

  downloadBlobFile(blob, `${fileName}.pdf`);
};
