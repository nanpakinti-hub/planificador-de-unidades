import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Download, Clock, Truck, Database, Upload, 
  FileCheck, Loader2, CalendarDays, History, AlertTriangle, Eye 
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';

// --- INITIAL DATA ---
const INITIAL_UNITS =[
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
  
  const dParts = datePart.split(/[\/\-]/);
  const tParts = timePart.split(':');
  if (dParts.length < 3) return null;

  let m = Number(dParts[0]);
  let d = Number(dParts[1]);
  const y = Number(dParts[2]);

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

const getTipoDia = (date: Date) => {
  const day = date.getDay(); // 0 = Dom, 6 = Sáb
  if (day === 0) return 'Domingo';
  if (day === 6) return 'Sabado';
  return 'Semana';
};

const formatYMD = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function App() {
  // --- TABS & UI STATE ---
  const[activeTab, setActiveTab] = useState<0|1|2>(0);
  const [isLoading, setIsLoading] = useState(false);
  const[statusMsg, setStatusMsg] = useState("");
  
  // --- DATA STATES ---
  const[turnosDB, setTurnosDB] = useState<any[]>([]);
  const [historialDB, setHistorialDB] = useState<any[]>([]);
  const [planificacionDB, setPlanificacionDB] = useState<any[]>([]);
  
  // --- FILTERS STATE ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const[selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showDeviations, setShowDeviations] = useState(true);

  const voyagesInputRef = useRef<HTMLInputElement>(null);

  // --- EFECTOS INICIALES ---
  useEffect(() => {
    fetchTurnos();
  },[]);

  useEffect(() => {
    if (activeTab === 0) fetchHistorial();
    if (activeTab === 1) {
      fetchPlanificacion();
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      setSelectedDays(Array.from({length: daysInMonth}, (_, i) => i + 1));
    }
  },[activeTab, selectedMonth, selectedYear]);

  // --- DB FETCHING ---
  const fetchTurnos = async () => {
    const { data, error } = await supabase.from('turnos').select('*').order('cod_turno');
    if (!error && data) setTurnosDB(data);
  };

  const fetchHistorial = async () => {
    setIsLoading(true);
    const start = new Date(selectedYear, selectedMonth, 1).toISOString();
    const end = new Date(selectedYear, selectedMonth + 1, 1).toISOString();
    
    let allData: any[] =[];
    let from = 0;
    const step = 1000;
    
    // Bucle para romper el límite de 1000 filas de Supabase
    while (true) {
      const { data, error } = await supabase.from('historial_viajes')
        .select('*')
        .gte('fecha_salida', start)
        .lt('fecha_salida', end)
        .range(from, from + step - 1);
      
      if (error) {
        console.error(error);
        break;
      }
      allData = allData.concat(data);
      if (data.length < step) break;
      from += step;
    }
    
    setHistorialDB(allData);
    setIsLoading(false);
  };

  const fetchPlanificacion = async () => {
    setIsLoading(true);
    const start = formatYMD(new Date(selectedYear, selectedMonth, 1));
    const end = formatYMD(new Date(selectedYear, selectedMonth + 1, 0));
    
    let allData: any[] =[];
    let from = 0;
    const step = 1000;

    // Bucle de paginación
    while (true) {
      const { data, error } = await supabase.from('planificacion')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)
        .range(from, from + step - 1);
        
      if (error) {
        console.error(error);
        break;
      }
      allData = allData.concat(data);
      if (data.length < step) break;
      from += step;
    }
    
    setPlanificacionDB(allData);
    setIsLoading(false);
  };

  // --- TAB 0/1: CSV UPLOAD & PROCESAMIENTO ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setStatusMsg("Leyendo archivo...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const separator = content.includes(';') ? ';' : ',';
      const lines = content.trim().split(/\r?\n/);
      if (lines.length < 2) {
        setIsLoading(false);
        return;
      }

      const headers = lines[0].split(separator).map(h => h.replace(/"/g, '').trim().toLowerCase());
      const unidadIdx = headers.indexOf('unidad');
      const codTurnoIdx = headers.findIndex(h => h.includes('cod turno'));
      const fechaSalidaIdx = headers.findIndex(h => h.includes('fecha salida'));
      const horaSalidaIdx = headers.findIndex(h => h.includes('hora salida'));

      if (unidadIdx === -1 || codTurnoIdx === -1 || fechaSalidaIdx === -1) {
        alert("El archivo no tiene las columnas requeridas (Unidad, Cod Turno, Fecha Salida).");
        setIsLoading(false);
        return;
      }

      setStatusMsg("Procesando datos...");
      const newTurnosMap = new Map();
      const newTrips: any[] =[];

      lines.slice(1).forEach(line => {
        const parts = line.split(separator).map(p => p.replace(/"/g, '').trim());
        if (parts.length <= fechaSalidaIdx) return;

        const unidad = parts[unidadIdx];
        const codTurno = parts[codTurnoIdx];
        let fechaSalida = parts[fechaSalidaIdx];
        
        if (!unidad || !codTurno || !fechaSalida) return;

        if (horaSalidaIdx !== -1 && parts[horaSalidaIdx]) {
          if (!fechaSalida.includes(' ')) {
            fechaSalida = `${fechaSalida} ${parts[horaSalidaIdx]}`;
          }
        }

        const date = parseDateString(fechaSalida);
        if (!date) return;

        let isTM = true;
        const hours = date.getHours();
        const timeInHours = hours + date.getMinutes() / 60 + date.getSeconds() / 3600;
        
        if (timeInHours >= 12 || timeInHours < 4) isTM = false;

        let operationDate = new Date(date);
        if (hours < 4) operationDate.setDate(operationDate.getDate() - 1); 

        newTurnosMap.set(codTurno, { cod_turno: codTurno });
        
        newTrips.push({
          unidad,
          cod_turno: codTurno,
          fecha_salida: operationDate.toISOString(),
          is_tm: isTM,
          tipo_dia: getTipoDia(operationDate)
        });
      });

      setStatusMsg("Guardando Turnos...");
      if (newTurnosMap.size > 0) {
        await supabase.from('turnos').upsert(Array.from(newTurnosMap.values()), { onConflict: 'cod_turno', ignoreDuplicates: true });
        fetchTurnos();
      }

      setStatusMsg("Guardando Historial...");
      const chunkSize = 1000;
      for (let i = 0; i < newTrips.length; i += chunkSize) {
        const chunk = newTrips.slice(i, i + chunkSize);
        await supabase.from('historial_viajes').upsert(chunk, { onConflict: 'unidad,cod_turno,fecha_salida', ignoreDuplicates: true });
      }

      setStatusMsg("");
      setIsLoading(false);
      if (activeTab === 0) fetchHistorial();
      if (voyagesInputRef.current) voyagesInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- TAB 1: PREDICCIÓN ESTADÍSTICA ---
  const toggleDay = (d: number) => {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const generarProyeccion = async () => {
    if (selectedDays.length === 0) return alert("Selecciona al menos un día.");
    setIsLoading(true);
    setStatusMsg("Calculando proyecciones (2 meses previos)...");

    const startDate = new Date(selectedYear, selectedMonth - 2, 1);
    const endDate = new Date(selectedYear, selectedMonth, 1);

    let hist: any[] =[];
    let from = 0;
    const step = 1000;

    // Bucle para extraer TODO el historial de los dos meses anteriores sin truncar a 1000
    while (true) {
      const { data, error } = await supabase.from('historial_viajes')
        .select('unidad, cod_turno, is_tm, tipo_dia, fecha_salida')
        .gte('fecha_salida', startDate.toISOString())
        .lt('fecha_salida', endDate.toISOString())
        .range(from, from + step - 1);
      
      if (error) {
        console.error(error);
        break;
      }
      hist = hist.concat(data);
      if (data.length < step) break;
      from += step;
    }

    if (hist.length === 0) {
      alert("No hay historial suficiente en los 2 meses anteriores para proyectar.");
      setIsLoading(false);
      return;
    }

    const stats: any = {};
    hist.forEach(t => {
      if (!stats[t.unidad]) stats[t.unidad] = { true: {}, false: {} };
      if (!stats[t.unidad][t.is_tm][t.tipo_dia]) stats[t.unidad][t.is_tm][t.tipo_dia] = {};
      
      const target = stats[t.unidad][t.is_tm][t.tipo_dia];
      const tTime = new Date(t.fecha_salida).getTime();
      
      if (!target[t.cod_turno]) {
        target[t.cod_turno] = { count: 1, lastDate: tTime };
      } else {
        target[t.cod_turno].count += 1;
        if (tTime > target[t.cod_turno].lastDate) target[t.cod_turno].lastDate = tTime;
      }
    });

    const getWinner = (unidad: string, isTM: boolean, tipoDia: string) => {
      const target = stats[unidad]?.[String(isTM)]?.[tipoDia];
      if (!target) return null;
      
      let winnerCode = null;
      let maxCount = -1;
      let maxDate = -1;

      for (const [code, data] of Object.entries<any>(target)) {
        if (data.count > maxCount) {
          maxCount = data.count;
          winnerCode = code;
          maxDate = data.lastDate;
        } else if (data.count === maxCount) {
          if (data.lastDate > maxDate) {
            winnerCode = code;
            maxDate = data.lastDate;
          }
        }
      }
      return winnerCode;
    };

    setStatusMsg("Guardando diagrama...");
    const newPlan: any[] =[];

    INITIAL_UNITS.forEach(unit => {
      selectedDays.forEach(day => {
        const d = new Date(selectedYear, selectedMonth, day);
        const tipoDia = getTipoDia(d);
        const fStr = formatYMD(d);

        const projTM = getWinner(unit.unidad, true, tipoDia);
        if (projTM) {
          newPlan.push({
            unidad: unit.unidad,
            fecha: fStr,
            is_tm: true,
            turno_proyectado: projTM,
            turno_actual: projTM,
            modificado_manualmente: false
          });
        }
        const projTT = getWinner(unit.unidad, false, tipoDia);
        if (projTT) {
          newPlan.push({
            unidad: unit.unidad,
            fecha: fStr,
            is_tm: false,
            turno_proyectado: projTT,
            turno_actual: projTT,
            modificado_manualmente: false
          });
        }
      });
    });

    const modofiedSet = new Set(planificacionDB.filter(p => p.modificado_manualmente).map(p => `${p.unidad}_${p.fecha}_${p.is_tm}`));
    const finalPlanToUpsert = newPlan.filter(p => !modofiedSet.has(`${p.unidad}_${p.fecha}_${p.is_tm}`));

    const chunkSize = 1000;
    for (let i = 0; i < finalPlanToUpsert.length; i += chunkSize) {
      const chunk = finalPlanToUpsert.slice(i, i + chunkSize);
      await supabase.from('planificacion').upsert(chunk, { onConflict: 'unidad,fecha,is_tm' });
    }

    setStatusMsg("");
    setIsLoading(false);
    fetchPlanificacion();
  };

  const updateCell = async (unidad: string, fecha: string, is_tm: boolean, newVal: string) => {
    setPlanificacionDB(prev => {
      const cp = [...prev];
      const idx = cp.findIndex(p => p.unidad === unidad && p.fecha === fecha && p.is_tm === is_tm);
      if (idx !== -1) {
        cp[idx] = { ...cp[idx], turno_actual: newVal, modificado_manualmente: true };
      } else {
        cp.push({ unidad, fecha, is_tm, turno_actual: newVal, modificado_manualmente: true, turno_proyectado: null });
      }
      return cp;
    });

    await supabase.from('planificacion').upsert({
      unidad, fecha, is_tm, turno_actual: newVal, modificado_manualmente: true
    }, { onConflict: 'unidad,fecha,is_tm' });
  };

  // --- ESTRUCTURAS DE MAPEO VISUAL ---
  const historialMap = useMemo(() => {
    const map: any = {};
    historialDB.forEach(h => {
      // Ajuste de zona horaria local al renderizar
      const d = new Date(h.fecha_salida);
      const dateStr = formatYMD(d);
      if (!map[h.unidad]) map[h.unidad] = {};
      if (!map[h.unidad][dateStr]) map[h.unidad][dateStr] = { TM: [], TT:[] };
      
      const slot = h.is_tm ? 'TM' : 'TT';
      if (!map[h.unidad][dateStr][slot].includes(h.cod_turno)) {
        map[h.unidad][dateStr][slot].push(h.cod_turno);
      }
    });
    return map;
  },[historialDB]);

  const planMap = useMemo(() => {
    const map: any = {};
    planificacionDB.forEach(p => {
      if (!map[p.unidad]) map[p.unidad] = {};
      if (!map[p.unidad][p.fecha]) map[p.unidad][p.fecha] = {};
      map[p.unidad][p.fecha][p.is_tm ? 'TM' : 'TT'] = p;
    });
    return map;
  },[planificacionDB]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dateColumns = Array.from({length: daysInMonth}, (_, i) => {
    const d = new Date(selectedYear, selectedMonth, i + 1);
    const dayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(d);
    return { 
      day: i + 1, 
      dateStr: formatYMD(d),
      dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1).toLowerCase()
    };
  });

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      
      {/* HEADER & TABS */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-10">
        <div className="h-14 bg-[#4472c4] text-white flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <Truck className="w-6 h-6" />
            <h1 className="text-lg font-bold tracking-tight">LOGITRACE MATRIX ENGINE</h1>
          </div>
          <div className="flex items-center text-xs font-medium space-x-4">
            {isLoading && <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {statusMsg}</span>}
          </div>
        </div>
        <div className="flex px-6 pt-2 gap-2 bg-slate-100">
          {[
            { id: 0, label: "Planificación Pasada", icon: History },
            { id: 1, label: "Diagramación Mensual", icon: CalendarDays },
            { id: 2, label: "Configuración", icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg flex items-center gap-2 border-t border-l border-r transition-colors ${activeTab === tab.id ? 'bg-white border-slate-200 text-blue-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden relative bg-white">
        <AnimatePresence mode="wait">
          
          {/* TAB 0: HISTORIAL */}
          {activeTab === 0 && (
            <motion.div key="tab0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1">
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                      {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                
                <button onClick={() => voyagesInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Subir CSV de Historial
                </button>
                <input type="file" ref={voyagesInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              </div>

              {/* Matrix de Historial */}
              <div className="flex-1 overflow-auto bg-white p-2">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: 'max-content' }}>
                  <thead className="sticky top-0 z-30 shadow-sm">
                    <tr className="bg-slate-700 text-white text-center font-bold">
                      <th className="border border-slate-600 px-4 py-2 w-16" rowSpan={3}>Cód.</th>
                      <th className="border border-slate-600 px-4 py-2 w-28" rowSpan={3}>Unidad</th>
                      {dateColumns.map(dc => (
                        <th key={dc.dateStr} className="border border-slate-600 py-1" colSpan={2}>{dc.day}</th>
                      ))}
                    </tr>
                    <tr className="bg-slate-700 text-white text-center font-bold">
                      {dateColumns.map(dc => {
                        let dayColor = "bg-slate-700"; 
                        if (dc.dayLabel === "Sáb") dayColor = "bg-slate-600"; 
                        if (dc.dayLabel === "Dom") dayColor = "bg-slate-500"; 
                        return <th key={dc.dateStr} className={`border border-slate-600 py-0.5 text-white ${dayColor}`} colSpan={2}>{dc.dayLabel}</th>
                      })}
                    </tr>
                    <tr className="text-center font-bold text-[9px]">
                      {dateColumns.map(dc => {
                        let tmBg = "bg-slate-100"; 
                        if (dc.dayLabel === "Sáb") tmBg = "bg-slate-200";
                        if (dc.dayLabel === "Dom") tmBg = "bg-slate-300";
                        return (
                          <React.Fragment key={dc.dateStr}>
                            <th className={`border border-slate-300 py-0.5 w-14 ${tmBg} text-slate-700`}>TM</th>
                            <th className="border border-slate-300 py-0.5 w-14 bg-white text-slate-700">TT</th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {INITIAL_UNITS.map((unit) => (
                      <tr key={unit.unidad} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="border border-slate-200 px-1 py-1 text-center text-slate-500 font-mono">{unit.codigo}</td>
                        <td className="border border-slate-200 px-2 py-1 font-bold text-slate-800 bg-slate-50/50">{unit.unidad}</td>
                        {dateColumns.map(dc => {
                          const tmCell = historialMap[unit.unidad]?.[dc.dateStr]?.['TM'];
                          const ttCell = historialMap[unit.unidad]?.[dc.dateStr]?.['TT'];

                          return (
                            <React.Fragment key={dc.dateStr}>
                              <td className="border border-slate-200 p-0 hover:bg-slate-100">
                                <div className="flex items-center justify-center h-full w-full min-h-[24px] text-slate-700 font-mono text-[10px]">
                                  {tmCell?.join(', ') || ''}
                                </div>
                              </td>
                              <td className="border border-slate-200 p-0 hover:bg-slate-100">
                                <div className="flex items-center justify-center h-full w-full min-h-[24px] text-slate-700 font-mono text-[10px]">
                                  {ttCell?.join(', ') || ''}
                                </div>
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 1: DIAGRAMACIÓN MENSUAL */}
          {activeTab === 1 && (
            <motion.div key="tab1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
              {/* Toolbar */}
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1">
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                      {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  
                  <button onClick={generarProyeccion} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 shadow-sm">
                    <Settings className="w-4 h-4" /> Generar Proyección
                  </button>
                  
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer ml-4">
                    <input type="checkbox" checked={showDeviations} onChange={e => setShowDeviations(e.target.checked)} className="w-4 h-4 text-blue-600" />
                    <Eye className="w-4 h-4" /> Resaltar Desvíos Manuales
                  </label>
                </div>
              </div>

              {/* Day Selector */}
              <div className="px-4 py-2 border-b border-slate-100 bg-white flex flex-wrap gap-1 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 w-full mb-1">Días a Proyectar:</span>
                {dateColumns.map(dc => (
                  <button
                    key={dc.day}
                    onClick={() => toggleDay(dc.day)}
                    className={`text-[10px] w-7 h-7 rounded-full transition-colors flex items-center justify-center font-bold ${selectedDays.includes(dc.day) ? 'bg-[#4472c4] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {dc.day}
                  </button>
                ))}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-auto bg-white p-2">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: 'max-content' }}>
                  <thead className="sticky top-0 z-30 shadow-sm">
                    <tr className="bg-[#4472c4] text-white text-center font-bold">
                      <th className="border border-slate-300 px-4 py-2 w-16" rowSpan={3}>Cód.</th>
                      <th className="border border-slate-300 px-4 py-2 w-28" rowSpan={3}>Unidad</th>
                      {dateColumns.map(dc => (
                        <th key={dc.dateStr} className="border border-slate-300 py-1" colSpan={2}>{dc.day}</th>
                      ))}
                    </tr>
                    <tr className="bg-[#4472c4] text-white text-center font-bold">
                      {dateColumns.map(dc => {
                        let dayColor = "bg-[#e2efda]"; 
                        if (dc.dayLabel === "Sáb") dayColor = "bg-[#ffe699]"; 
                        if (dc.dayLabel === "Dom") dayColor = "bg-[#f8cbad]"; 
                        return <th key={dc.dateStr} className={`border border-slate-300 py-0.5 text-slate-800 ${dayColor}`} colSpan={2}>{dc.dayLabel}</th>
                      })}
                    </tr>
                    <tr className="text-center font-bold text-[9px]">
                      {dateColumns.map(dc => {
                        let tmBg = "bg-[#e2efda]"; 
                        if (dc.dayLabel === "Sáb") tmBg = "bg-[#ffe699]";
                        if (dc.dayLabel === "Dom") tmBg = "bg-[#f8cbad]";
                        return (
                          <React.Fragment key={dc.dateStr}>
                            <th className={`border border-slate-300 py-0.5 w-14 ${tmBg} text-slate-700`}>TM</th>
                            <th className="border border-slate-300 py-0.5 w-14 bg-white text-slate-700">TT</th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {INITIAL_UNITS.map((unit) => (
                      <tr key={unit.unidad} className="hover:bg-blue-50/30">
                        <td className="border border-slate-300 px-1 py-1 text-center text-slate-500 font-mono">{unit.codigo}</td>
                        <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800 bg-slate-50">{unit.unidad}</td>
                        {dateColumns.map(dc => {
                          const tmCell = planMap[unit.unidad]?.[dc.dateStr]?.['TM'];
                          const ttCell = planMap[unit.unidad]?.[dc.dateStr]?.['TT'];

                          const renderSelect = (cell: any, isTM: boolean) => {
                            const isModified = cell?.modificado_manualmente && showDeviations;
                            let bg = "bg-transparent";
                            let text = "text-slate-700";
                            
                            if (isModified) {
                              bg = "bg-red-100";
                              text = "text-red-700 font-bold";
                            }

                            return (
                              <div className={`relative flex items-center justify-center h-full w-full p-0.5 min-h-[24px] ${bg}`}>
                                <select 
                                  className={`w-full bg-transparent appearance-none text-center outline-none text-[10px] font-mono cursor-pointer ${text}`}
                                  value={cell?.turno_actual || ""}
                                  onChange={(e) => updateCell(unit.unidad, dc.dateStr, isTM, e.target.value)}
                                  title={isModified ? `Proyectado originalmente: ${cell?.turno_proyectado || 'Ninguno'}` : ''}
                                >
                                  <option value=""></option>
                                  {turnosDB.map(t => (
                                    <option key={t.cod_turno} value={t.cod_turno}>{t.cod_turno}</option>
                                  ))}
                                </select>
                                {isModified && <AlertTriangle className="w-2.5 h-2.5 text-red-500 absolute top-0 right-0 m-0.5" />}
                              </div>
                            );
                          };

                          return (
                            <React.Fragment key={dc.dateStr}>
                              <td className="border border-slate-200 p-0 hover:border-blue-400">
                                {renderSelect(tmCell, true)}
                              </td>
                              <td className="border border-slate-200 p-0 hover:border-blue-400">
                                {renderSelect(ttCell, false)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 2: CONFIGURACIÓN */}
          {activeTab === 2 && (
            <motion.div key="tab2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 p-6 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Catálogo de Turnos</h2>
                      <p className="text-xs text-slate-500">Lista predeterminada para asignación manual. (Se nutre automáticamente de los CSV).</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <table className="w-full text-sm text-left border border-slate-200">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-2 border-b">Cód. Turno</th>
                          <th className="p-2 border-b">Descripción (Opcional)</th>
                          <th className="p-2 border-b">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turnosDB.map((t, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-blue-700">{t.cod_turno}</td>
                            <td className="p-2 text-slate-600">{t.descripcion}</td>
                            <td className="p-2 text-slate-500">{t.tipo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}