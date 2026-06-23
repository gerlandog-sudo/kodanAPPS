export async function exportToExcel<T>({
  data,
  columns,
  filename,
  sheetName = 'Datos'
}: {
  data: T[];
  columns: { header: string; key: string; width?: number; numFmt?: string; align?: 'left' | 'right' | 'center' }[];
  filename: string;
  sheetName?: string;
}) {
  // Importar exceljs de forma dinámica para optimizar el bundle
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Configurar las columnas de la hoja
  worksheet.columns = columns.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width || 20
  }));

  // Aplicar estilos a la fila de encabezado (Slate 800 Premium)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  // Agregar filas de datos
  data.forEach((item: any) => {
    const row = worksheet.addRow(item);
    row.height = 20;
    row.font = { name: 'Segoe UI', size: 10 };

    // Configurar bordes, alineación y formatos numéricos por celda
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      const colDef = columns[colNumber - 1];
      if (colDef) {
        if (colDef.align) {
          cell.alignment = { horizontal: colDef.align, vertical: 'middle' };
        } else {
          cell.alignment = { vertical: 'middle' };
        }
        if (colDef.numFmt) {
          cell.numFmt = colDef.numFmt;
        }
      }
    });
  });

  // Ajustar automáticamente el ancho de las columnas según su longitud máxima de contenido
  worksheet.columns.forEach(column => {
    let maxLen = column.header ? column.header.toString().length : 10;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const val = cell.value;
      if (val !== null && val !== undefined) {
        const valLen = val.toString().length;
        if (valLen > maxLen) {
          maxLen = valLen;
        }
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 40);
  });

  // Guardar archivo y disparar descarga en el navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
