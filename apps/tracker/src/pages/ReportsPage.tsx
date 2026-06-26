import { useState } from 'react';
import { Button, Card, Select, DatePicker } from '@kodan-apps/ui-core';
import { trackerApi } from '../api/client';
import { FileSpreadsheet, Download } from 'lucide-react';

const REPORT_TYPES = [
  { value: 'by-project', label: 'Horas por Proyecto', desc: 'Detalle de horas y costos agrupado por proyecto' },
  { value: 'by-user', label: 'Horas por Usuario', desc: 'Resumen de horas y costos por usuario' },
  { value: 'by-client', label: 'Horas por Cliente', desc: 'Horas totales agrupadas por cliente' },
  { value: 'weekly-summary', label: 'Resumen Semanal', desc: 'Reporte detallado con totales del período' },
];

export function ReportsPage() {
  const [reportType, setReportType] = useState('by-project');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const handleDownload = () => {
    const url = trackerApi.getReportUrl(reportType, { from: dateFrom, to: dateTo });
    window.open(url, '_blank');
  };

  const currentReport = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <FileSpreadsheet size={22} /> Reportes
      </h1>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Tipo de reporte</label>
              <Select options={REPORT_TYPES} value={reportType} onChange={setReportType} />
            </div>
          </div>

          {currentReport && (
            <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>{currentReport.desc}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Fecha desde</label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--sys-text-muted)' }}>Fecha hasta</label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>

          <div className="pt-2">
            <Button variant="primary" onClick={handleDownload}>
              <Download size={16} className="mr-1" /> Descargar Excel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
