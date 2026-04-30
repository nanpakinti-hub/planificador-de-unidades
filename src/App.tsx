import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Download, Clock, Truck, Database, Upload, 
  FileCheck, Loader2, CalendarDays, History, AlertTriangle, Eye, Save, Plus, Trash2
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

// --- UTILS A PRUEBA DE BALAS ---
const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());
const formatYMD = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseDateString = (str: string) => {
  if (!str) return null;
  const parts = str.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || "00:00:00";
  const dParts = datePart.split(/[\/\-]/);
  const tParts = timePart.split(':');
  if (dParts.length < 3) return null;
  
  // Soporta DD/MM/YYYY y MM/DD/YYYY dinámicamente
  let m = Number(dParts[1]);
  let d = Number(dParts[0]);
  const y = Number(dParts[2]) < 100 ? Number(dParts[2]) + 2000 : Number(dParts[2]);

  if (Number(dParts[0]) <= 12 && Number(dParts[1]) > 12) {
    m = Number(dParts[0]);
    d = Number(dParts[1]);
  }

  const hh = Number(tParts[0]) || 0;
  const mm = Number(tParts[1]) || 0;
  const ss = Number(tParts[2]) || 0;
  
  const date = new Date(y, m - 1, d, hh, mm, ss);
  return isValidDate(date) ? date : null;
};

// Determina el tipo de día considerando FERIADOS
const getTipoDia = (date: Date, feriadosSet: Set<string>) => {
  if (feriadosSet.has(formatYMD(date))) return 'Domingo'; // Feriado se trata como domingo
  const day = date.getDay();
  if (day === 0) return 'Domingo';
  if (day === 6) return 'Sabado';
  return 'Semana';
};

const timeToMins = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(':');
  return Number(h) * 60 + Number(m);
};

// --- OPTIMIZACIÓN: COMPONENTE CELDA MEMOIZADO ---
// Esto evita que React redibuje 3000 inputs al mismo tiempo.
const PlanCell = React.memo(({ unit, dc, isTM, cell, turnosDB, isTurnoUsado, updateCell, showDeviations }: any) => {
  const isModified = cell?.modificado_manualmente && showDeviations;
  const bg = isModified ? "bg-red-100" : "bg-transparent";
  const text = isModified ? "text-red-700 font-bold" : "text-slate-700";

  return (
    <td className="border border-slate-200 p-0 hover:border-blue-400">
      <div className={`relative flex items-center justify-center h-full w-full p-0.5 min-h-[24px] ${bg}`}>
        <select 
          className={`w-full bg-transparent appearance-none text-center outline-none text-[10px] font-mono cursor-pointer ${text}`}
          value={cell?.turno_actual || ""}
          onChange={(e) => updateCell(unit.unidad, dc.dateStr, isTM, e.target.value)}
          title={isModified ? `Proyectado originalmente: ${cell?.turno_proyectado || 'Ninguno'}` : ''}
        >
          <option value=""></option>
          {turnosDB.map((t: any) => {
            const usedByUnit = isTurnoUsado(dc.dateStr, t.cod_turno);
            // Regla 1: Ocultar turnos ya asignados hoy a otra unidad
            if (usedByUnit && usedByUnit !== unit.unidad) return null;
            return <option key={t.cod_turno} value={t.cod_turno}>{t.cod_turno}</option>;
          })}
        </select>
        {isModified && <AlertTriangle className="w-2.5 h-2.5 text-red-500 absolute top-0 right-0 m-0.5 pointer-events-none" />}
      </div>
    </td>
  );
});

export default function App() {
  const[activeTab, setActiveTab] = useState<0|1|2>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  
  const[turnosDB, setTurnosDB] = useState<any[]>([]);
  const[historialDB, setHistorialDB] = useState<any[]>([]);
  const [planificacionDB, setPlanificacionDB] = useState<any[]>([]);
  const [feriadosDB, setFeriadosDB] = useState<any[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const[selectedDays, setSelectedDays] = useState<number[]>([]);
  const [showDeviations, setShowDeviations] = useState(true);

  const [newFeriado, setNewFeriado] = useState({ fecha: '', descripcion: '' });

  const voyagesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    fetchTurnos(); 
    fetchFeriados();
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
    const { data } = await supabase.from('turnos').select('*').order('cod_turno');
    if (data) setTurnosDB(data);
  };

  const fetchFeriados = async () => {
    const { data } = await supabase.from('feriados').select('*').order('fecha');
    if (data) setFeriadosDB(data);
  };

  const addFeriado = async () => {
    if(!newFeriado.fecha) return;
    await supabase.from('feriados').insert([newFeriado]);
    setNewFeriado({ fecha: '', descripcion: '' });
    fetchFeriados();
  };

  const deleteFeriado = async (fecha: string) => {
    await supabase.from('feriados').delete().eq('fecha', fecha);
    fetchFeriados();
  };

  const feriadosSet = useMemo(() => new Set(feriadosDB.map(f => f.fecha)), [feriadosDB]);

  const fetchHistorial = async () => {
    setIsLoading(true);
    const start = new Date(selectedYear, selectedMonth, 1).toISOString();
    const end = new Date(selectedYear, selectedMonth + 1, 1).toISOString();
    let allData: any[] =[];
    let from = 0; const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('historial_viajes').select('*').gte('fecha_salida', start).lt('fecha_salida', end).range(from, from + step - 1);
      if (error) break;
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
    let from = 0; const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('planificacion').select('*').gte('fecha', start).lte('fecha', end).range(from, from + step - 1);
      if (error) break;
      allData = allData.concat(data);
      if (data.length < step) break;
      from += step;
    }
    setPlanificacionDB(allData);
    setIsLoading(false);
  };

  // --- CSV UPLOAD ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true); setStatusMsg("Leyendo archivo...");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const separator = content.includes(';') ? ';' : ',';
      const lines = content.trim().split(/\r?\n/);
      if (lines.length < 2) { setIsLoading(false); return; }

      const headers = lines[0].split(separator).map(h => h.replace(/"/g, '').trim().toLowerCase());
      const unidadIdx = headers.indexOf('unidad');
      const codTurnoIdx = headers.findIndex(h => h.includes('cod turno'));
      const fechaSalidaIdx = headers.findIndex(h => h.includes('fecha salida'));
      const horaSalidaIdx = headers.findIndex(h => h.includes('hora salida'));

      if (unidadIdx === -1 || codTurnoIdx === -1 || fechaSalidaIdx === -1) {
        alert("Faltan columnas (Unidad, Cod Turno, Fecha Salida).");
        setIsLoading(false); return;
      }

      setStatusMsg("Procesando datos del CSV...");
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
          if (!fechaSalida.includes(' ')) fechaSalida = `${fechaSalida} ${parts[horaSalidaIdx]}`;
        }
        const date = parseDateString(fechaSalida);
        if (!date) {
            console.warn("Fecha inválida en fila:", line);
            return;
        }
        let isTM = true;
        const hours = date.getHours();
        const timeInHours = hours + date.getMinutes() / 60 + date.getSeconds() / 3600;
        if (timeInHours >= 12 || timeInHours < 4) isTM = false;
        let operationDate = new Date(date);
        if (hours < 4) operationDate.setDate(operationDate.getDate() - 1); 

        newTurnosMap.set(codTurno, { cod_turno: codTurno });
        newTrips.push({ unidad, cod_turno: codTurno, fecha_salida: operationDate.toISOString(), is_tm: isTM, tipo_dia: getTipoDia(operationDate, feriadosSet) });
      });

      setStatusMsg("Guardando...");
      if (newTurnosMap.size > 0) await supabase.from('turnos').upsert(Array.from(newTurnosMap.values()), { onConflict: 'cod_turno', ignoreDuplicates: true });
      fetchTurnos();
      
      const chunkSize = 1000;
      for (let i = 0; i < newTrips.length; i += chunkSize) {
        await supabase.from('historial_viajes').upsert(newTrips.slice(i, i + chunkSize), { onConflict: 'unidad,cod_turno,fecha_salida', ignoreDuplicates: true });
      }
      setStatusMsg(""); setIsLoading(false);
      if (activeTab === 0) fetchHistorial();
      if (voyagesInputRef.current) voyagesInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- SOLVER DE RESTRICCIONES (DÍA A DÍA - REGLAS 1 Y 2) ---
  const applyConstraintSolver = async (preferencesData: any, isAI: boolean) => {
    setStatusMsg("Resolviendo conflictos y solapamientos...");
    const turnosMap: Record<string, any> = {};
    turnosDB.forEach(t => turnosMap[t.cod_turno] = t);

    const newPlan: any[] =[];
    const modifiedSet = new Set(planificacionDB.filter(p => p.modificado_manualmente).map(p => `${p.unidad}_${p.fecha}_${p.is_tm}`));

    for (const day of selectedDays) {
      const d = new Date(selectedYear, selectedMonth, day);
      const tipoDia = getTipoDia(d, feriadosSet);
      const fechaStr = formatYMD(d);
      
      const usedShiftsToday = new Set<string>();
      
      planificacionDB.forEach(p => {
        if (p.fecha === fechaStr && p.modificado_manualmente && p.turno_actual) {
          usedShiftsToday.add(p.turno_actual);
        }
      });

      let tmRequests: {unidad: string, options: {shift: string, prob: number}[]}[] =[];
      let ttRequests: {unidad: string, options: {shift: string, prob: number}[]}[] =[];

      INITIAL_UNITS.forEach(unit => {
        if (isAI) {
          const tmOpt = preferencesData[unit.unidad]?.[`TM_${tipoDia}`] ||[];
          const ttOpt = preferencesData[unit.unidad]?.[`TT_${tipoDia}`] ||[];
          if (tmOpt.length > 0) tmRequests.push({ unidad: unit.unidad, options: tmOpt.map((s: string, i: number) => ({shift: s, prob: 3-i})) });
          if (ttOpt.length > 0) ttRequests.push({ unidad: unit.unidad, options: ttOpt.map((s: string, i: number) => ({shift: s, prob: 3-i})) });
        } else {
          const targetTM = preferencesData[unit.unidad]?.['true']?.[tipoDia];
          if (targetTM) {
            let total = Object.values(targetTM).reduce((a: any, b: any) => a + b.count, 0) as number;
            let opts = Object.entries<any>(targetTM).map(([shift, data]) => ({ shift, prob: data.count / total }));
            opts.sort((a,b) => b.prob - a.prob);
            tmRequests.push({ unidad: unit.unidad, options: opts });
          }
          const targetTT = preferencesData[unit.unidad]?.['false']?.[tipoDia];
          if (targetTT) {
            let total = Object.values(targetTT).reduce((a: any, b: any) => a + b.count, 0) as number;
            let opts = Object.entries<any>(targetTT).map(([shift, data]) => ({ shift, prob: data.count / total }));
            opts.sort((a,b) => b.prob - a.prob);
            ttRequests.push({ unidad: unit.unidad, options: opts });
          }
        }
      });

      tmRequests.sort((a,b) => b.options[0].prob - a.options[0].prob);
      ttRequests.sort((a,b) => b.options[0].prob - a.options[0].prob);

      const unidadTMFin: Record<string, number> = {};

      tmRequests.forEach(req => {
        if (modifiedSet.has(`${req.unidad}_${fechaStr}_true`)) return;
        for (const opt of req.options) {
          if (!usedShiftsToday.has(opt.shift)) {
            usedShiftsToday.add(opt.shift);
            newPlan.push({ unidad: req.unidad, fecha: fechaStr, is_tm: true, turno_proyectado: opt.shift, turno_actual: opt.shift, modificado_manualmente: false });
            const turnoInfo = turnosMap[opt.shift];
            if (turnoInfo?.hora_fin) unidadTMFin[req.unidad] = timeToMins(turnoInfo.hora_fin);
            break;
          }
        }
      });

      ttRequests.forEach(req => {
        if (modifiedSet.has(`${req.unidad}_${fechaStr}_false`)) return; 
        for (const opt of req.options) {
          if (!usedShiftsToday.has(opt.shift)) {
            const turnoInfo = turnosMap[opt.shift];
            let isValid = true;
            if (turnoInfo?.hora_inicio && unidadTMFin[req.unidad]) {
              const ttInicio = timeToMins(turnoInfo.hora_inicio);
              // REGLA 2: HOLGURA 10 MINUTOS
              if (unidadTMFin[req.unidad] + 10 > ttInicio) {
                isValid = false; 
              }
            }
            if (isValid) {
              usedShiftsToday.add(opt.shift);
              newPlan.push({ unidad: req.unidad, fecha: fechaStr, is_tm: false, turno_proyectado: opt.shift, turno_actual: opt.shift, modificado_manualmente: false });
              break;
            }
          }
        }
      });
    }

    setStatusMsg("Guardando plan en Base de Datos...");
    const chunkSize = 1000;
    for (let i = 0; i < newPlan.length; i += chunkSize) {
      await supabase.from('planificacion').upsert(newPlan.slice(i, i + chunkSize), { onConflict: 'unidad,fecha,is_tm' });
    }

    setStatusMsg("");
    setIsLoading(false);
    fetchPlanificacion();
  };

  const generarProyeccionStats = async () => {
    if (selectedDays.length === 0) return alert("Selecciona al menos un día.");
    setIsLoading(true); setStatusMsg("Extrayendo historial...");
    const startDate = new Date(selectedYear, selectedMonth - 2, 1);
    const endDate = new Date(selectedYear, selectedMonth, 1);
    let hist: any[] =[];
    let from = 0; const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('historial_viajes').select('unidad, cod_turno, is_tm, tipo_dia, fecha_salida').gte('fecha_salida', startDate.toISOString()).lt('fecha_salida', endDate.toISOString()).range(from, from + step - 1);
      if (error) break;
      hist = hist.concat(data);
      if (data.length < step) break;
      from += step;
    }
    if (hist.length === 0) { alert("No hay historial suficiente."); setIsLoading(false); return; }

    const stats: any = {};
    hist.forEach(t => {
      if (!stats[t.unidad]) stats[t.unidad] = { true: {}, false: {} };
      if (!stats[t.unidad][t.is_tm][t.tipo_dia]) stats[t.unidad][t.is_tm][t.tipo_dia] = {};
      const target = stats[t.unidad][t.is_tm][t.tipo_dia];
      if (!target[t.cod_turno]) target[t.cod_turno] = { count: 1 };
      else target[t.cod_turno].count += 1;
    });

    applyConstraintSolver(stats, false);
  };

  const generarProyeccionIA = async () => {
    if (selectedDays.length === 0) return alert("Selecciona al menos un día.");

    setIsLoading(true); setStatusMsg("Extrayendo historial para la IA...");
    const startDate = new Date(selectedYear, selectedMonth - 2, 1);
    const endDate = new Date(selectedYear, selectedMonth, 1);
    let hist: any[] =[];
    let from = 0; const step = 1000;
    
    while (true) {
      const { data, error } = await supabase.from('historial_viajes').select('unidad, cod_turno, is_tm, tipo_dia').gte('fecha_salida', startDate.toISOString()).lt('fecha_salida', endDate.toISOString()).range(from, from + step - 1);
      if (error) break;
      hist = hist.concat(data);
      if (data.length < step) break;
      from += step;
    }
    
    if (hist.length === 0) { alert("No hay historial suficiente."); setIsLoading(false); return; }

    setStatusMsg("Comprimiendo datos para la IA...");
    
    // --- OPTIMIZACIÓN DE TOKENS: Contamos frecuencias en lugar de listar todo ---
    const resumenComprimido: Record<string, any> = {};
    
    hist.forEach(t => {
      const key = `${t.is_tm ? 'TM' : 'TT'}_${t.tipo_dia}`;
      if (!resumenComprimido[t.unidad]) resumenComprimido[t.unidad] = {};
      if (!resumenComprimido[t.unidad][key]) resumenComprimido[t.unidad][key] = {};
      
      // Contar repeticiones del turno
      const counts = resumenComprimido[t.unidad][key];
      counts[t.cod_turno] = (counts[t.cod_turno] || 0) + 1;
    });

    const prompt = `
    Eres un planificador logístico. Analiza estas FRECUENCIAS de viajes de autobuses de los últimos 2 meses.
    El formato es { "Unidad": { "Franja_TipoDia": { "CodTurno": VecesRepetido } } }.
    
    TAREA: Para cada unidad y franja, deduce el "TOP 3" de turnos con más probabilidad.
    REGLA: Devuelve ÚNICAMENTE un JSON válido (sin markdown ni texto), así:
    { "L540-001": { "TM_Semana":["5401", "5402", "5403"], "TT_Semana": ["5201"] } }
    
    DATOS DE FRECUENCIA:
    ${JSON.stringify(resumenComprimido)}
    `;

    try {
      setStatusMsg("Analizando patrones con Mistral AI...");
      const response = await fetch("/api/mistral", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);

      let aiText = result.choices[0].message.content.trim();
      if (aiText.startsWith("```json")) aiText = aiText.replace(/```json/g, "").replace(/```/g, "");
      
      const patronInteligente = JSON.parse(aiText);
      applyConstraintSolver(patronInteligente, true);

    } catch (error: any) {
      console.error(error); 
      alert("Error en Mistral AI: " + error.message); 
      setIsLoading(false);
    }
  };
  
  // Callback Memoizado para no redibujar el grid entero
  const updateCell = useCallback(async (unidad: string, fecha: string, is_tm: boolean, newVal: string) => {
    setPlanificacionDB(prev => {
      const cp = [...prev];
      const idx = cp.findIndex(p => p.unidad === unidad && p.fecha === fecha && p.is_tm === is_tm);
      if (idx !== -1) cp[idx] = { ...cp[idx], turno_actual: newVal, modificado_manualmente: true };
      else cp.push({ unidad, fecha, is_tm, turno_actual: newVal, modificado_manualmente: true, turno_proyectado: null });
      return cp;
    });
    // Operación en background
    await supabase.from('planificacion').upsert({ unidad, fecha, is_tm, turno_actual: newVal, modificado_manualmente: true }, { onConflict: 'unidad,fecha,is_tm' });
  },[]);

  const updateTurnoConfig = async (cod: string, field: string, value: string) => {
    setTurnosDB(prev => prev.map(t => t.cod_turno === cod ? { ...t, [field]: value } : t));
    await supabase.from('turnos').update({ [field]: value || null }).eq('cod_turno', cod);
  };

  // --- DATA MAPPING ---
  const historialMap = useMemo(() => {
    const map: any = {};
    historialDB.forEach(h => {
      const d = new Date(h.fecha_salida);
      const dateStr = formatYMD(d);
      if (!map[h.unidad]) map[h.unidad] = {};
      if (!map[h.unidad][dateStr]) map[h.unidad][dateStr] = { TM: [], TT:[] };
      const slot = h.is_tm ? 'TM' : 'TT';
      if (!map[h.unidad][dateStr][slot].includes(h.cod_turno)) map[h.unidad][dateStr][slot].push(h.cod_turno);
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
  }, [planificacionDB]);

  const usedShiftsPerDay = useMemo(() => {
    const map: Record<string, Map<string, string>> = {}; 
    planificacionDB.forEach(p => {
      if (p.turno_actual) {
        if (!map[p.fecha]) map[p.fecha] = new Map();
        map[p.fecha].set(p.turno_actual, p.unidad);
      }
    });
    return map;
  },[planificacionDB]);

  const isTurnoUsado = useCallback((fecha: string, turno: string) => {
    return usedShiftsPerDay[fecha]?.get(turno);
  }, [usedShiftsPerDay]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dateColumns = Array.from({length: daysInMonth}, (_, i) => {
    const d = new Date(selectedYear, selectedMonth, i + 1);
    const dayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(d);
    return { day: i + 1, dateStr: formatYMD(d), dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1).toLowerCase() };
  });

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      
      {/* HEADER & TABS */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-10">
        <div className="h-14 bg-[#4472c4] text-white flex items-center justify-between px-6">
          <div className="flex items-center space-x-3"><Truck className="w-6 h-6" /><h1 className="text-lg font-bold tracking-tight">LOGITRACE MATRIX ENGINE</h1></div>
          <div className="flex items-center text-xs font-medium space-x-4">{isLoading && <span className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {statusMsg}</span>}</div>
        </div>
        <div className="flex px-6 pt-2 gap-2 bg-slate-100">
          {[{ id: 0, label: "Historial", icon: History }, { id: 1, label: "Diagramación", icon: CalendarDays }, { id: 2, label: "Configuración", icon: Settings }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 text-sm font-semibold rounded-t-lg flex items-center gap-2 border-t border-l border-r transition-colors ${activeTab === tab.id ? 'bg-white border-slate-200 text-blue-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative bg-white">
        <AnimatePresence mode="wait">
          
          {/* TAB 0: HISTORIAL */}
          {activeTab === 0 && (
            <motion.div key="tab0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1">
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                      {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => voyagesInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 shadow-sm"><Upload className="w-4 h-4" /> Subir CSV</button>
                <input type="file" ref={voyagesInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              </div>
              <div className="flex-1 overflow-auto bg-white p-2">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: 'max-content' }}>
                  <thead className="sticky top-0 z-30 shadow-sm">
                    <tr className="bg-slate-700 text-white text-center font-bold">
                      <th className="border border-slate-600 px-4 py-2 w-16" rowSpan={3}>Cód.</th><th className="border border-slate-600 px-4 py-2 w-28" rowSpan={3}>Unidad</th>
                      {dateColumns.map(dc => <th key={dc.dateStr} className="border border-slate-600 py-1" colSpan={2}>{dc.day}</th>)}
                    </tr>
                    <tr className="bg-slate-700 text-white text-center font-bold">
                      {dateColumns.map(dc => {
                        let dayColor = "bg-slate-700"; if (dc.dayLabel === "Sáb") dayColor = "bg-slate-600"; if (dc.dayLabel === "Dom") dayColor = "bg-slate-500"; 
                        return <th key={dc.dateStr} className={`border border-slate-600 py-0.5 text-white ${dayColor}`} colSpan={2}>{dc.dayLabel}</th>
                      })}
                    </tr>
                    <tr className="text-center font-bold text-[9px]">
                      {dateColumns.map(dc => {
                        let tmBg = "bg-slate-100"; if (dc.dayLabel === "Sáb") tmBg = "bg-slate-200"; if (dc.dayLabel === "Dom") tmBg = "bg-slate-300";
                        return <React.Fragment key={dc.dateStr}><th className={`border border-slate-300 py-0.5 w-14 ${tmBg} text-slate-700`}>TM</th><th className="border border-slate-300 py-0.5 w-14 bg-white text-slate-700">TT</th></React.Fragment>
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {INITIAL_UNITS.map(unit => (
                      <tr key={unit.unidad} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="border border-slate-200 px-1 py-1 text-center text-slate-500 font-mono">{unit.codigo}</td><td className="border border-slate-200 px-2 py-1 font-bold text-slate-800 bg-slate-50/50">{unit.unidad}</td>
                        {dateColumns.map(dc => {
                          const tmCell = historialMap[unit.unidad]?.[dc.dateStr]?.['TM'];
                          const ttCell = historialMap[unit.unidad]?.[dc.dateStr]?.['TT'];
                          return (
                            <React.Fragment key={dc.dateStr}>
                              <td className="border border-slate-200 p-0 hover:bg-slate-100"><div className="flex items-center justify-center h-full w-full min-h-[24px] text-slate-700 font-mono text-[10px]">{tmCell?.join(', ') || ''}</div></td>
                              <td className="border border-slate-200 p-0 hover:bg-slate-100"><div className="flex items-center justify-center h-full w-full min-h-[24px] text-slate-700 font-mono text-[10px]">{ttCell?.join(', ') || ''}</div></td>
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
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-1">
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                      {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className="border-none bg-transparent p-1 text-sm font-bold outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={generarProyeccionStats} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 shadow-sm transition-all"><Settings className="w-4 h-4" /> Probabilidad Histórica</button>
                    <button onClick={generarProyeccionIA} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 shadow-sm transition-all"><span className="text-lg leading-none">✨</span> IA Mistral</button>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer ml-4">
                    <input type="checkbox" checked={showDeviations} onChange={e => setShowDeviations(e.target.checked)} className="w-4 h-4 text-blue-600" />
                    <Eye className="w-4 h-4" /> Resaltar Desvíos
                  </label>
                </div>
              </div>
              <div className="px-4 py-2 border-b border-slate-100 bg-white flex flex-wrap gap-1 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 w-full mb-1">Días a Proyectar:</span>
                {dateColumns.map(dc => <button key={dc.day} onClick={() => toggleDay(dc.day)} className={`text-[10px] w-7 h-7 rounded-full transition-colors flex items-center justify-center font-bold ${selectedDays.includes(dc.day) ? 'bg-[#4472c4] text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{dc.day}</button>)}
              </div>
              <div className="flex-1 overflow-auto bg-white p-2">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: 'max-content' }}>
                  <thead className="sticky top-0 z-30 shadow-sm">
                    <tr className="bg-[#4472c4] text-white text-center font-bold">
                      <th className="border border-slate-300 px-4 py-2 w-16" rowSpan={3}>Cód.</th><th className="border border-slate-300 px-4 py-2 w-28" rowSpan={3}>Unidad</th>
                      {dateColumns.map(dc => <th key={dc.dateStr} className="border border-slate-300 py-1" colSpan={2}>{dc.day}</th>)}
                    </tr>
                    <tr className="bg-[#4472c4] text-white text-center font-bold">
                      {dateColumns.map(dc => {
                        let dayColor = "bg-[#e2efda]"; if (dc.dayLabel === "Sáb") dayColor = "bg-[#ffe699]"; if (dc.dayLabel === "Dom") dayColor = "bg-[#f8cbad]"; 
                        return <th key={dc.dateStr} className={`border border-slate-300 py-0.5 text-slate-800 ${dayColor}`} colSpan={2}>{dc.dayLabel}</th>
                      })}
                    </tr>
                    <tr className="text-center font-bold text-[9px]">
                      {dateColumns.map(dc => {
                        let tmBg = "bg-[#e2efda]"; if (dc.dayLabel === "Sáb") tmBg = "bg-[#ffe699]"; if (dc.dayLabel === "Dom") tmBg = "bg-[#f8cbad]";
                        return <React.Fragment key={dc.dateStr}><th className={`border border-slate-300 py-0.5 w-14 ${tmBg} text-slate-700`}>TM</th><th className="border border-slate-300 py-0.5 w-14 bg-white text-slate-700">TT</th></React.Fragment>
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {INITIAL_UNITS.map(unit => (
                      <tr key={unit.unidad} className="hover:bg-blue-50/30">
                        <td className="border border-slate-300 px-1 py-1 text-center text-slate-500 font-mono">{unit.codigo}</td><td className="border border-slate-300 px-2 py-1 font-bold text-slate-800 bg-slate-50">{unit.unidad}</td>
                        {dateColumns.map(dc => (
                          <React.Fragment key={dc.dateStr}>
                            <PlanCell unit={unit} dc={dc} isTM={true} cell={planMap[unit.unidad]?.[dc.dateStr]?.['TM']} turnosDB={turnosDB} isTurnoUsado={isTurnoUsado} updateCell={updateCell} showDeviations={showDeviations} />
                            <PlanCell unit={unit} dc={dc} isTM={false} cell={planMap[unit.unidad]?.[dc.dateStr]?.['TT']} turnosDB={turnosDB} isTurnoUsado={isTurnoUsado} updateCell={updateCell} showDeviations={showDeviations} />
                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 2: CONFIGURACIÓN */}
          {activeTab === 2 && (
            <motion.div key="tab2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 p-6 overflow-auto bg-slate-50 flex gap-6 items-start">
              
              {/* IZQUIERDA: CATÁLOGO DE TURNOS */}
              <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800">Catálogo de Turnos</h2>
                  <p className="text-xs text-slate-500">Define Horas de Inicio y Fin para activar el rechazo automático de solapamiento (10 mins de holgura).</p>
                </div>
                <div className="p-0 overflow-auto max-h-[70vh]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm">
                      <tr>
                        <th className="p-3 border-b">Cód. Turno</th>
                        <th className="p-3 border-b">Descripción</th>
                        <th className="p-3 border-b">Tipo de Día</th>
                        <th className="p-3 border-b w-32">Hora Inicio</th>
                        <th className="p-3 border-b w-32">Hora Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turnosDB.map((t, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-700">{t.cod_turno}</td>
                          <td className="p-2"><input type="text" value={t.descripcion || ''} onChange={e => updateTurnoConfig(t.cod_turno, 'descripcion', e.target.value)} className="border border-transparent hover:border-slate-200 focus:border-blue-400 bg-transparent rounded p-1 w-full text-sm outline-none transition-all"/></td>
                          <td className="p-2">
                            <select value={t.categoria_dia || 'Hábil'} onChange={e => updateTurnoConfig(t.cod_turno, 'categoria_dia', e.target.value)} className="border border-transparent hover:border-slate-200 focus:border-blue-400 bg-transparent rounded p-1 w-full text-sm outline-none cursor-pointer">
                              <option value="Hábil">Día Hábil</option><option value="Sábado">Sábado</option><option value="Domingo">Dom/Feriado</option>
                            </select>
                          </td>
                          <td className="p-2"><input type="time" value={t.hora_inicio || ''} onChange={e => updateTurnoConfig(t.cod_turno, 'hora_inicio', e.target.value)} className="border border-slate-200 rounded p-1.5 text-xs w-full outline-none focus:border-blue-400"/></td>
                          <td className="p-2"><input type="time" value={t.hora_fin || ''} onChange={e => updateTurnoConfig(t.cod_turno, 'hora_fin', e.target.value)} className="border border-slate-200 rounded p-1.5 text-xs w-full outline-none focus:border-blue-400"/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DERECHA: FERIADOS */}
              <div className="w-80 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800">Días Feriados</h2>
                  <p className="text-xs text-slate-500">Se proyectarán como día Domingo.</p>
                </div>
                <div className="p-4 border-b border-slate-100 flex flex-col gap-2">
                  <input type="date" value={newFeriado.fecha} onChange={e => setNewFeriado({...newFeriado, fecha: e.target.value})} className="border border-slate-300 rounded p-2 text-sm w-full outline-none focus:border-blue-500"/>
                  <input type="text" placeholder="Ej: Día del Trabajador" value={newFeriado.descripcion} onChange={e => setNewFeriado({...newFeriado, descripcion: e.target.value})} className="border border-slate-300 rounded p-2 text-sm w-full outline-none focus:border-blue-500"/>
                  <button onClick={addFeriado} className="bg-[#4472c4] hover:bg-blue-700 text-white font-bold p-2 rounded text-sm flex items-center justify-center gap-2 mt-1"><Plus className="w-4 h-4"/> Agregar Feriado</button>
                </div>
                <div className="p-0 overflow-auto max-h-[50vh]">
                  {feriadosDB.length === 0 ? <p className="p-4 text-center text-slate-400 text-sm">No hay feriados cargados.</p> : (
                    <ul className="divide-y divide-slate-100">
                      {feriadosDB.map(f => (
                        <li key={f.fecha} className="p-3 flex justify-between items-center hover:bg-slate-50 group">
                          <div><div className="font-bold text-slate-700 text-sm">{formatYMD(new Date(f.fecha))}</div><div className="text-xs text-slate-500">{f.descripcion}</div></div>
                          <button onClick={() => deleteFeriado(f.fecha)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"><Trash2 className="w-4 h-4"/></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}