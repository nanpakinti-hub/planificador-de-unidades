import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Settings, 
  Download, 
  Clock, 
  CheckCircle2, 
  Truck,
  Database,
  Upload,
  FileCheck,
  Loader2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- INITIAL DATA (From Image) ---
const INITIAL_UNITS = [
  { codigo: "1", unidad: "L540-001", tipo: "Urbano" },
  { codigo: "2", unidad: "L540-002", tipo: "Urbano" },
  { codigo: "3", unidad: "L540-003", tipo: "Medianos" },
  { codigo: "4", unidad: "L540-004", tipo: "Urbano" },
  { codigo: "5", unidad: "L540-005", tipo: "Urbano" },
  { codigo: "6", unidad: "L540-006", tipo: "Medianos" },
  { codigo: "7", unidad: "L540-007", tipo: "Urbano" },
  { codigo: "8", unidad: "L540-008", tipo: "Urbano" },
  { codigo: "10", unidad: "L540-010", tipo: "Urbano" },
  { codigo: "11", unidad: "L540-011", tipo: "Urbano" },
  { codigo: "12", unidad: "L540-012", tipo: "Medianos" },
  { codigo: "13", unidad: "L540-013", tipo: "Urbano" },
  { codigo: "14", unidad: "L540-014", tipo: "Urbano" },
  { codigo: "115", unidad: "L540-015", tipo: "Urbano" },
  { codigo: "16", unidad: "L540-016", tipo: "Urbano" },
  { codigo: "17", unidad: "L540-017", tipo: "Urbano" },
  { codigo: "18", unidad: "L540-018", tipo: "Urbano" },
  { codigo: "119", unidad: "L540-019", tipo: "Urbano" },
  { codigo: "120", unidad: "L540-020", tipo: "Urbano" },
  { codigo: "121", unidad: "L540-021", tipo: "Medianos" },
  { codigo: "22", unidad: "L540-022", tipo: "Urbano" },
  { codigo: "23", unidad: "L540-023", tipo: "Medianos" },
  { codigo: "25", unidad: "L540-025", tipo: "Medianos" },
  { codigo: "26", unidad: "L540-026", tipo: "Medianos" },
  { codigo: "27", unidad: "L540-027", tipo: "Medianos" },
  { codigo: "32", unidad: "L540-032", tipo: "Urbano" },
  { codigo: "33", unidad: "L540-033", tipo: "Urbano" },
  { codigo: "35", unidad: "L540-035", tipo: "Medianos" },
  { codigo: "15", unidad: "L570-015", tipo: "Doble Piso" },
  { codigo: "19", unidad: "L570-019", tipo: "Doble Piso" },
  { codigo: "20", unidad: "L570-020", tipo: "Doble Piso" },
  { codigo: "21", unidad: "L570-021", tipo: "Doble Piso" },
  { codigo: "24", unidad: "L570-024", tipo: "Doble Piso" },
  { codigo: "28", unidad: "L570-028", tipo: "Urbano" },
  { codigo: "29", unidad: "L570-029", tipo: "Doble Piso" },
  { codigo: "30", unidad: "L570-030", tipo: "Doble Piso" },
  { codigo: "70", unidad: "L570-070", tipo: "Doble Piso" },
  { codigo: "71", unidad: "L570-071", tipo: "Urbano" },
  { codigo: "72", unidad: "L570-072", tipo: "Urbano" },
  { codigo: "73", unidad: "L570-073", tipo: "Urbano" },
  { codigo: "74", unidad: "L570-074", tipo: "Urbano" },
  { codigo: "75", unidad: "L570-075", tipo: "Urbano" },
  { codigo: "76", unidad: "L570-076", tipo: "Urbano" },
  { codigo: "77", unidad: "L570-077", tipo: "Urbano" },
  { codigo: "78", unidad: "L570-078", tipo: "Urbano" },
  { codigo: "79", unidad: "L570-079", tipo: "Urbano" },
  { codigo: "80", unidad: "L570-080", tipo: "Urbano" },
];

// --- UTILS ---

const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

const parseDateString = (str: string) => {
  if (!str) return null;
  const parts = str.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || "00:00:00";
  
  const dParts = datePart.split('/');
  const tParts = timePart.split(':');
  
  if (dParts.length < 3) return null;

  // Asumimos MM/DD/YYYY por defecto (formato de los reportes).
  let m = Number(dParts[0]);
  let d = Number(dParts[1]);
  const y = Number(dParts[2]);

  // Si el mes es mayor a 12, sabemos que en realidad es DD/MM/YYYY.
  if (m > 12) {
    d = Number(dParts[0]);
    m = Number(dParts[1]);
  }
  
  const hh = Number(tParts[0]) || 0;
  const mm = Number(tParts[1]) || 0;
  const ss = Number(tParts[2]) || 0;
  
  const date = new Date(y, m - 1, d, hh, mm, ss);
  return isValidDate(date) ? date : null;
};

const formatDateToMapKey = (date: Date) => {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const getMode = (arr: string[]) => {
  if (arr.length === 0) return "";
  const counts: Record<string, number> = {};
  let maxCount = 0;
  arr.forEach(val => {
    if (!val) return;
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > maxCount) maxCount = counts[val];
  });
  
  const modes = Object.entries(counts)
    .filter(([_, count]) => count === maxCount)
    .map(([val]) => val)
    .sort();
    
  return modes.join(',');
};

const getDayName = (dateStr: string) => {
  const parts = dateStr.split('/');
  if (parts.length < 3) return "";
  const [d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  if (!isValidDate(date)) return "";
  
  try {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
    const name = new Intl.DateTimeFormat('es-ES', options).format(date);
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  } catch (e) {
    return "";
  }
};

interface MatrixRow {
  codigo: string;
  unidad: string;
  codTurnoGlobal: string;
  tipo: string;
  cells: Record<string, { TM: string[]; TT: string[] }>;
}

export default function App() {
  const [viajesCsv, setViajesCsv] = useState<string>("");
  const [viajesFileName, setViajesFileName] = useState<string | null>(null);
  
  // Matrix State
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [selectedMonth, setSelectedMonth] = useState(1); // Feb
  const [selectedYear, setSelectedYear] = useState(2026);
  
  // UI State
  const [isExporting, setIsExporting] = useState(false);
  const [newUnit, setNewUnit] = useState({ codigo: "", unidad: "", tipo: "" });

  const voyagesInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setViajesCsv(content);
      setViajesFileName(file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addUnit = () => {
    if (!newUnit.codigo || !newUnit.unidad) return;
    setUnits([...units, { ...newUnit }]);
    setNewUnit({ codigo: "", unidad: "", tipo: "" });
  };

  const { trips: parsedTrips, availablePeriods } = useMemo(() => {
    if (!viajesCsv) return { trips: [], availablePeriods: [] };
    
    const separator = viajesCsv.includes(';') ? ';' : ',';
    const tripLines = viajesCsv.trim().split(/\r?\n/).slice(1);
    const trips: any[] = [];
    const periodsSet = new Set<string>();
    
    tripLines.forEach(line => {
      const parts = line.split(separator);
      if (parts.length < 4) return;
      const unidad = parts[0].trim();
      const codTurno = parts[1].trim();
      const fechaSalida = parts[3]?.trim();
      
      if (!fechaSalida) return;

      try {
        const date = parseDateString(fechaSalida);
        if (!date) return;
        let isTM = true;
        const hours = date.getHours();
        const timeInHours = hours + date.getMinutes() / 60 + date.getSeconds() / 3600;
        
        // TM: 04:00 - 12:00
        if (timeInHours > 12 || timeInHours < 4) {
          isTM = false;
        }

        // Si es antes de las 4 AM, pertenece al Turno Tarde/Noche del día anterior
        let operationDate = new Date(date);
        if (hours < 4) {
          operationDate.setDate(operationDate.getDate() - 1);
        }

        const dateKey = formatDateToMapKey(operationDate);
        const month = operationDate.getMonth();
        const year = operationDate.getFullYear();
        
        periodsSet.add(`${year}-${month}`);

        trips.push({ 
          unidad, 
          codTurno, 
          dateKey, 
          isTM, 
          operationMonth: month, 
          operationYear: year 
        });
      } catch (e) {}
    });
    
    const periods = Array.from(periodsSet).map(p => {
       const [y, m] = p.split('-');
       return { year: Number(y), month: Number(m) };
    }).sort((a, b) => {
       if (a.year !== b.year) return a.year - b.year;
       return a.month - b.month;
    });

    return { trips, availablePeriods: periods };
  }, [viajesCsv]);

  useEffect(() => {
    if (availablePeriods.length > 0) {
      const latest = availablePeriods[availablePeriods.length - 1];
      setSelectedMonth(latest.month);
      setSelectedYear(latest.year);
    }
  }, [availablePeriods]);

  const processedMatrix = useMemo(() => {
    // Generate dates for the selected month/year
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dateColumns: { key: string; dayLabel: string }[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${d}/${selectedMonth + 1}/${selectedYear}`;
      dateColumns.push({ 
        key: dateStr, 
        dayLabel: getDayName(dateStr)
      });
    }

    if (parsedTrips.length === 0) {
      return { 
        rows: units.map(u => ({ ...u, codTurnoGlobal: "", cells: {} as Record<string, { TM: string[]; TT: string[] }> })), 
        dateColumns 
      };
    }

    // Filter trips for the specific month/year
    const filteredTrips = parsedTrips.filter(t => t.operationMonth === selectedMonth && t.operationYear === selectedYear);

    const tripsByUnit: Record<string, any[]> = {};
    filteredTrips.forEach(t => {
      if (!tripsByUnit[t.unidad]) tripsByUnit[t.unidad] = [];
      tripsByUnit[t.unidad].push(t);
    });

    const resultRows: MatrixRow[] = units.map(unit => {
      const unitTrips = tripsByUnit[unit.unidad] || [];
      const allCodes = unitTrips.map(t => t.codTurno);
      const codTurnoGlobal = getMode(allCodes);

      const cells: Record<string, { TM: string[]; TT: string[] }> = {};
      dateColumns.forEach(dc => {
        const dayTrips = unitTrips.filter(t => t.dateKey === dc.key);
        cells[dc.key] = {
          TM: [...new Set(dayTrips.filter(t => t.isTM).map(t => t.codTurno))],
          TT: [...new Set(dayTrips.filter(t => !t.isTM).map(t => t.codTurno))]
        };
      });

      return { ...unit, codTurnoGlobal, cells };
    });

    return { rows: resultRows, dateColumns };
  }, [parsedTrips, units, selectedMonth, selectedYear]);

  const exportToExcel = async () => {
    if (processedMatrix.rows.length === 0) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Matriz de Síntesis');

      // Styles
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      const whiteFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
      const borderStyle = { 
        top: { style: 'thin' }, 
        left: { style: 'thin' }, 
        bottom: { style: 'thin' }, 
        right: { style: 'thin' } 
      };

      // Header Row 1: Fixed Titles and Dates
      const row1Data = ['Código', 'Unidad', 'Turno Recurrente', 'Tipo'];
      processedMatrix.dateColumns.forEach(dc => {
        row1Data.push(dc.key, ''); // One for TM, one empty for merge
      });
      const row1 = worksheet.addRow(row1Data);
      row1.eachCell((cell, colNumber) => {
        cell.fill = headerFill as any;
        cell.font = whiteFont as any;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderStyle as any;
      });

      // Header Row 2: Weekdays
      const row2Data = ['', '', '', ''];
      processedMatrix.dateColumns.forEach(dc => {
        row2Data.push(dc.dayLabel, '');
      });
      const row2 = worksheet.addRow(row2Data);
      row2.eachCell((cell, colNumber) => {
        if (colNumber > 4) {
          const dcIdx = Math.floor((colNumber - 5) / 2);
          const dc = processedMatrix.dateColumns[dcIdx];
          
          let dayColor = 'FFE2EFDA'; // Greenish
          if (dc.dayLabel === "Sáb") dayColor = 'FFFFE699'; // Yellow
          if (dc.dayLabel === "Dom") dayColor = 'FFF8CBAD'; // Orange
          
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dayColor } } as any;
          cell.font = { bold: true, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = borderStyle as any;
        } else {
          cell.fill = headerFill as any;
          cell.border = borderStyle as any;
        }
      });

      // Merge Fixed Headers in rows 1 and 2
      worksheet.mergeCells(1, 1, 2, 1); // Código
      worksheet.mergeCells(1, 2, 2, 2); // Unidad
      worksheet.mergeCells(1, 3, 2, 3); // Turno Recurrente
      worksheet.mergeCells(1, 4, 2, 4); // Tipo

      // Merge Dates and Weekdays
      processedMatrix.dateColumns.forEach((_, idx) => {
        const colStart = 5 + idx * 2;
        worksheet.mergeCells(1, colStart, 1, colStart + 1); // Merge Date
        worksheet.mergeCells(2, colStart, 2, colStart + 1); // Merge Day
      });

      // Header Row 3: TM / TT
      const row3Data = ['', '', '', ''];
      processedMatrix.dateColumns.forEach(_ => {
        row3Data.push('TM', 'TT');
      });
      const row3 = worksheet.addRow(row3Data);
      row3.eachCell((cell, colNumber) => {
        if (colNumber > 4) {
          const dcIdx = Math.floor((colNumber - 5) / 2);
          const dc = processedMatrix.dateColumns[dcIdx];
          const isTM = (colNumber - 5) % 2 === 0;
          
          let bgColor = 'FFFFFFFF'; // White
          if (isTM) {
            if (dc.dayLabel === 'Sáb') bgColor = 'FFFFE699';
            else if (dc.dayLabel === 'Dom') bgColor = 'FFF8CBAD';
            else bgColor = 'FFE2EFDA';
          }
          
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as any;
          cell.font = { bold: true, size: 9 };
          cell.alignment = { horizontal: 'center' };
          cell.border = borderStyle as any;
        } else {
          cell.border = borderStyle as any;
        }
      });

      // Data Rows
      processedMatrix.rows.forEach(rowData => {
        const rowValues = [rowData.codigo, rowData.unidad, rowData.codTurnoGlobal, rowData.tipo];
        processedMatrix.dateColumns.forEach(dc => {
          rowValues.push(rowData.cells[dc.key].TM.join(','), rowData.cells[dc.key].TT.join(','));
        });
        const row = worksheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.border = borderStyle as any;
          cell.alignment = { horizontal: colNumber <= 4 ? 'left' : 'center', vertical: 'middle' };
          cell.font = { size: 9 };
          if (colNumber === 3) {
            cell.font = { bold: true, color: { argb: 'FF4472C4' } };
            cell.alignment = { horizontal: 'center' };
          }
          if (colNumber > 4 && cell.value && String(cell.value).trim() !== '') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } as any;
          }
        });
      });

      // Column Widths
      worksheet.getColumn(1).width = 8;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 12;
      processedMatrix.dateColumns.forEach((_, idx) => {
        worksheet.getColumn(5 + idx * 2).width = 5;
        worksheet.getColumn(6 + idx * 2).width = 5;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Matriz_Sintesis_${selectedMonth+1}_${selectedYear}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-screen bg-white text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="h-14 bg-[#4472c4] text-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <Truck className="w-6 h-6" />
          <h1 className="text-lg font-bold tracking-tight">Sistema Organizador de Planificación de Unidades</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            disabled={processedMatrix.rows.length === 0 || isExporting}
            className={`px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 border border-white/30 ${processedMatrix.rows.length === 0 || isExporting ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30 text-white cursor-pointer'}`}
            onClick={exportToExcel}
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? 'Exportando...' : 'Exportar Excel (.xlsx)'}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex overflow-hidden">
        {/* SIDEBAR UPLOAD & CONFIG */}
        <div className="w-72 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
          {/* UPLOAD BOX */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />
              Entrada de Datos
            </h2>
            <div 
              onClick={() => voyagesInputRef.current?.click()}
              className={`p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 ${viajesFileName ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-400'}`}
            >
              <input 
                type="file" 
                ref={voyagesInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileUpload} 
              />
              {viajesFileName ? (
                <>
                  <FileCheck className="w-8 h-8 text-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-700 truncate w-full px-2">{viajesFileName}</span>
                </>
              ) : (
                <>
                  <Database className="w-8 h-8 text-slate-300" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Cargar Informe de Viajes</span>
                  <span className="text-[9px] text-slate-400">CSV con Unidad, Cod Turno, etc.</span>
                </>
              )}
            </div>
          </div>

          {/* PERIOD SELECTOR */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Periodo de Análisis
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <select 
                className="bg-white border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select 
                className="bg-white border border-slate-200 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {Array.from({ length: 15 }, (_, i) => 2020 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {availablePeriods.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Meses en el archivo:</span>
                <div className="flex flex-wrap gap-1">
                  {availablePeriods.map((p, i) => {
                    const isSelected = p.month === selectedMonth && p.year === selectedYear;
                    return (
                      <button 
                        key={i}
                        onClick={() => {
                          setSelectedMonth(p.month);
                          setSelectedYear(p.year);
                        }}
                        className={`text-[9px] px-2 py-1 rounded transition-colors ${isSelected ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {String(p.month + 1).padStart(2, '0')}/{p.year}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ADD UNIT FORM */}
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Gestión de Unidades
            </h2>
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-sm">
              <input 
                placeholder="Código (ej. 81)" 
                className="w-full border border-slate-100 rounded bg-slate-50/50 p-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-300"
                value={newUnit.codigo}
                onChange={e => setNewUnit({...newUnit, codigo: e.target.value})}
              />
              <input 
                placeholder="Unidad (ej. L540-081)" 
                className="w-full border border-slate-100 rounded bg-slate-50/50 p-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-300"
                value={newUnit.unidad}
                onChange={e => setNewUnit({...newUnit, unidad: e.target.value})}
              />
              <select 
                className="w-full border border-slate-100 rounded bg-slate-50/50 p-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-300"
                value={newUnit.tipo}
                onChange={e => setNewUnit({...newUnit, tipo: e.target.value})}
              >
                <option value="">Seleccionar Tipo</option>
                <option value="Urbano">Urbano</option>
                <option value="Medianos">Medianos</option>
                <option value="Doble Piso">Doble Piso</option>
              </select>
              <button 
                onClick={addUnit}
                className="w-full bg-[#4472c4] text-white font-bold py-2 rounded text-xs hover:bg-[#365ba0] transition-colors"
              >
                Agregar Unidad
              </button>
            </div>
          </div>
        </div>

        {/* RESULTS GRID */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-1 bg-white">
            <table className="w-full text-[11px] border-collapse" style={{ minWidth: 'max-content' }}>
              <thead className="sticky top-0 z-30">
                {/* Row 1: Fixed Headers and Dates */}
                <tr className="bg-[#4472c4] text-white text-center font-bold">
                  <th className="border border-slate-300 px-4 py-2 w-20">Código</th>
                  <th className="border border-slate-300 px-4 py-2 w-32">Unidad</th>
                  <th className="border border-slate-300 px-4 py-2 w-32">Turno Recurrente</th>
                  <th className="border border-slate-300 px-4 py-2 w-32">Tipo</th>
                  {processedMatrix.dateColumns.map((dc) => (
                    <th key={dc.key} className="border border-slate-300 py-1" colSpan={2}>
                      {dc.key}
                    </th>
                  ))}
                </tr>
                {/* Row 2: Weekday Labels */}
                <tr className="bg-[#4472c4] text-white text-center font-bold">
                  <th className="border border-slate-300"></th>
                  <th className="border border-slate-300"></th>
                  <th className="border border-slate-300"></th>
                  <th className="border border-slate-300"></th>
                  {processedMatrix.dateColumns.map((dc) => {
                    let bgColor = "bg-[#4472c4]"; // Header background
                    let dayColor = "bg-[#e2efda]"; // Greenish weekday
                    if (dc.dayLabel === "Sáb") dayColor = "bg-[#ffe699]"; // Yellow
                    if (dc.dayLabel === "Dom") dayColor = "bg-[#f8cbad]"; // Orange
                    
                    return (
                      <th key={dc.key} className={`border border-slate-300 py-1 text-slate-800 ${dayColor}`} colSpan={2}>
                        {dc.dayLabel}
                      </th>
                    );
                  })}
                </tr>
                {/* Row 3: Shift Headers */}
                <tr className="text-center font-bold text-[9px]">
                  <th className="border border-slate-300 bg-white"></th>
                  <th className="border border-slate-300 bg-white"></th>
                  <th className="border border-slate-300 bg-white"></th>
                  <th className="border border-slate-300 bg-white"></th>
                  {processedMatrix.dateColumns.map((dc) => {
                    let tmBg = "bg-[#e2efda]"; 
                    if (dc.dayLabel === "Sáb") tmBg = "bg-[#ffe699]";
                    if (dc.dayLabel === "Dom") tmBg = "bg-[#f8cbad]";
                    
                    return (
                      <React.Fragment key={dc.key}>
                        <th className={`border border-slate-300 py-0.5 w-10 ${tmBg}`}>TM</th>
                        <th className="border border-slate-300 py-0.5 w-10 bg-white">TT</th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {processedMatrix.rows.map((row, idx) => (
                    <tr key={row.unidad + idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="border border-slate-300 px-2 py-0.5 text-center font-mono">{row.codigo}</td>
                      <td className="border border-slate-300 px-2 py-0.5 font-bold">{row.unidad}</td>
                      <td className="border border-slate-300 px-2 py-0.5 text-center font-bold text-blue-700 bg-blue-50/20">{row.codTurnoGlobal}</td>
                      <td className="border border-slate-300 px-2 py-0.5">{row.tipo}</td>
                      {processedMatrix.dateColumns.map((dc) => {
                        const cellData = row.cells[dc.key];
                        const tmVal = cellData?.TM.join(',') || "";
                        const ttVal = cellData?.TT.join(',') || "";
                        
                        return (
                          <React.Fragment key={dc.key}>
                            <td className={`border border-slate-300 p-0 text-center font-mono text-[10px] ${tmVal ? 'bg-slate-200' : ''}`}>
                              {tmVal || ""}
                            </td>
                            <td className={`border border-slate-300 p-0 text-center font-mono text-[10px] ${ttVal ? 'bg-slate-200' : ''}`}>
                              {ttVal || ""}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      <footer className="h-8 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest">
        <span>Sistema de Planificación de Unidades v.4.2</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full bg-emerald-500 ${processedMatrix.rows.length > 0 ? 'animate-pulse' : ''}`}></div>
            Motor de Síntesis {processedMatrix.rows.length > 0 ? 'Activo' : 'Inactivo'}
          </div>
          <span>Ref: {new Date().toLocaleDateString('es-ES')}</span>
        </div>
      </footer>
    </div>
  );
}
