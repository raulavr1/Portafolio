import React, { useState, useMemo, memo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Pill, AlertTriangle, ArrowDownLeft, ShieldAlert,
  Activity, Building2, TrendingDown,
  Thermometer, Award, ArrowUpRight, ShoppingCart
} from 'lucide-react';

// ── Constants (outside component — never re-created) ──────────────────────────
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const RANK_COLORS = [
  '#0284c7','#059669','#d97706','#7c3aed','#e11d48',
  '#0891b2','#10b981','#f59e0b','#8b5cf6','#f43f5e'
];
const POLAR_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4'];
const PERIOD_LABELS = { dia:'Últimos 7 Días', semana:'Últimas 8 Semanas', mes:'Últimos 12 Meses', anio:'Últimos 5 Años' };

const OUT_OF_STOCK_ITEMS = [
  { id:'OUT-101', name:'Remifentanilo 2mg Polvo Liofilizado',  area:'UCI / Quirófanos',       reason:'Descontinuado por baja demanda previa',     requestsCount:18, recommendation:'Recomendado Stock Semanal' },
  { id:'OUT-102', name:'Sugammadex 200mg/2ml Vial',            area:'Anestesia / Cirugía',    reason:'Sin stock en inventario central (0 u.)',    requestsCount:15, recommendation:'Solicitado por Médicos' },
  { id:'OUT-103', name:'Dexmedetomidina 200mcg/2ml',           area:'Cuidados Intensivos',    reason:'Agotado — Compras pausadas',                requestsCount:12, recommendation:'Evaluar Recompra Mensual' },
  { id:'OUT-104', name:'Tenecteplasa 50mg (10.000 UI)',         area:'Urgencias / Cardiología',reason:'Alto costo — Sin stock físico',              requestsCount:9,  recommendation:'Reserva Emergencias' },
  { id:'OUT-105', name:'Vecuronio Bromuro 10mg Inyectable',    area:'Quirófano / Reanimación',reason:'Sin compras recientes (0 u.)',               requestsCount:7,  recommendation:'Sugerido Stock Mínimo' },
];

const PURCHASE_STAGES = [
  { key:'PENDIENTE_APROBACION', label:'Pendiente',  color:'#d97706', bg:'bg-amber-100 dark:bg-amber-950/60',   border:'border-amber-300 dark:border-amber-700' },
  { key:'APROBADO_GERENCIA',    label:'Aprobado',   color:'#0284c7', bg:'bg-sky-100 dark:bg-sky-950/60',       border:'border-sky-300 dark:border-sky-700' },
  { key:'COMPRAS_ORDEN',        label:'En Compra',  color:'#7c3aed', bg:'bg-purple-100 dark:bg-purple-950/60', border:'border-purple-300 dark:border-purple-700' },
  { key:'RECIBIDO',             label:'Recibido',   color:'#059669', bg:'bg-emerald-100 dark:bg-emerald-950/60',border:'border-emerald-300 dark:border-emerald-700' },
];

// ── Pure helper ───────────────────────────────────────────────────────────────
function buildHistoricalData(exits, period) {
  const now  = new Date();
  const seed = (base, i) => Math.max(1, Math.floor(base + Math.sin(i * 2.7) * base * 0.4 + base * 0.5));

  if (period === 'dia') {
    return Array.from({ length: 7 }, (_, i) => {
      const d   = new Date(now); d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const real = exits.filter(m => m.timestamp.startsWith(key)).reduce((s, m) => s + m.quantity, 0);
      return { periodo: d.toLocaleDateString('es-ES', { weekday:'short', day:'2-digit' }), unidades: real || seed(18, i) };
    });
  }
  if (period === 'semana') {
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (7 - i) * 7);
      return { periodo: `${d.getDate()}/${d.getMonth()+1}`, unidades: seed(95, i) };
    });
  }
  if (period === 'mes') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { periodo: MONTH_NAMES[d.getMonth()], unidades: seed(290, i) };
    });
  }
  return Array.from({ length: 5 }, (_, i) => ({
    periodo: String(now.getFullYear() - (4 - i)),
    unidades: seed(1500, i)
  }));
}

// ── GaugeCard (memoized) ──────────────────────────────────────────────────────
const GaugeCard = memo(function GaugeCard({ label, stock, min }) {
  const total  = stock + min;
  const pct    = Math.min(100, Math.round((stock / Math.max(total, 1)) * 100));
  const radius = 46;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const color  = pct > 60 ? '#059669' : pct > 30 ? '#d97706' : '#e11d48';

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-lg transition-all">
      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={radius} fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="12"/>
          <circle cx="56" cy="56" r={radius} fill="none"
            stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition:'stroke-dashoffset 0.9s ease, stroke 0.4s ease' }}
          />
        </svg>
        <div className="text-center z-10">
          <div className="text-xl font-black font-outfit leading-none" style={{ color }}>{pct}%</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">{stock} u.</div>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight font-outfit">{label}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Mín: <span className="font-bold text-slate-800 dark:text-slate-200">{min} u.</span></div>
        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, backgroundColor: color }}/>
        </div>
      </div>
    </div>
  );
});

// ── Responsive Polar Area Chart (SVG scales with container) ──────────────────
const PolarAreaChart = memo(function PolarAreaChart({ data }) {
  // Use a fixed viewBox; the SVG will scale to fill whatever container it gets.
  const VB   = 260;   // viewBox square size
  const CX   = VB / 2;
  const CY   = VB / 2;
  const maxR = 115;
  const minR = 24;

  const totalVal    = useMemo(() => data.reduce((s, d) => s + d.value, 0) || 1, [data]);
  const maxVal      = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const sliceAngle  = (2 * Math.PI) / (data.length || 1);
  const gridRings   = [0.33, 0.66, 1.0];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* SVG centered — max width so it doesn't fill the entire card */}
      <div className="w-full max-w-[260px] drop-shadow-md">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="w-full h-auto"
          aria-label="Distribución polar de suministro por área"
        >
          {gridRings.map((rPct, i) => (
            <circle
              key={i}
              cx={CX} cy={CY}
              r={minR + rPct * (maxR - minR)}
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          ))}

          {data.map((item, i) => {
            const startAngle = i * sliceAngle - Math.PI / 2;
            const endAngle   = (i + 1) * sliceAngle - Math.PI / 2;
            const r          = minR + (item.value / maxVal) * (maxR - minR);
            const x1 = CX + r * Math.cos(startAngle);
            const y1 = CY + r * Math.sin(startAngle);
            const x2 = CX + r * Math.cos(endAngle);
            const y2 = CY + r * Math.sin(endAngle);
            const large = sliceAngle > Math.PI ? 1 : 0;

            return (
              <g key={i} className="group cursor-pointer">
                <path
                  d={`M ${CX} ${CY} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                  fill={item.color}
                  fillOpacity="0.85"
                  className="stroke-white dark:stroke-slate-900 transition-all duration-300"
                  strokeWidth="2.5"
                />
                <title>{`${item.name}: ${item.value} u. (${Math.round((item.value/totalVal)*100)}%)`}</title>
              </g>
            );
          })}

          <circle cx={CX} cy={CY} r={minR - 3}
            className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Legend — 2-column grid below chart, full width, names never truncate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {data.map((item) => {
          const pct = Math.round((item.value / totalVal) * 100);
          return (
            <div key={item.name} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}/>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-outfit">{item.name}</span>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{item.value} u.</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── Purchase Request Tracker (memoized) ───────────────────────────────────────
const RequestStatusTracker = memo(function RequestStatusTracker({ requests }) {
  const stageCounts = useMemo(() =>
    PURCHASE_STAGES.map(s => ({ ...s, count: requests.filter(r => r.status === s.key).length })),
    [requests]
  );
  const recent = useMemo(() => requests.slice(0, 5), [requests]);

  return (
    <div className="space-y-4 sm:space-y-5 w-full min-w-0">
      <div className="flex items-center justify-between gap-1 sm:gap-2 w-full min-w-0 px-0.5">
        {stageCounts.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-sm sm:text-xl font-outfit border-2 shadow-sm ${s.bg} ${s.border}`}
                style={{ color: s.color }}>
                {s.count}
              </div>
              <span className="text-[10px] sm:text-xs font-extrabold text-center leading-tight truncate w-full" style={{ color: s.color }}>{s.label}</span>
            </div>
            {i < stageCounts.length - 1 && (
              <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-1 min-w-[6px] sm:min-w-[16px] mt-[-14px] sm:mt-[-18px]"/>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {recent.map(req => {
          const stage = PURCHASE_STAGES.find(s => s.key === req.status) || PURCHASE_STAGES[0];
          const totalVal = Number(req.totalEstimated) || 0;
          return (
            <div key={req.id} className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] sm:text-xs font-mono font-extrabold text-teal-600 dark:text-teal-400">{req.id}</span>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{req.requester}</div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span className="text-xs sm:text-sm font-mono font-extrabold text-slate-800 dark:text-slate-200">S/ {totalVal.toFixed(2)}</span>
                <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold border ${stage.bg} ${stage.border}`}
                  style={{ color: stage.color }}>{stage.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── Extended Med Ranking (memoized) ───────────────────────────────────────────
const ExtendedMedRanking = memo(function ExtendedMedRanking({ inventory, movements }) {
  const ranked = useMemo(() => {
    const medMap = {};
    movements.filter(m => m.type === 'SALIDA').forEach(m => {
      medMap[m.medicationName] = (medMap[m.medicationName] || 0) + m.quantity;
    });
    inventory.forEach(item => {
      if (!medMap[item.name]) medMap[item.name] = Math.floor(2 + (item.id.charCodeAt(item.id.length - 1) % 15));
    });
    return Object.keys(medMap)
      .map(name => ({ name, total: medMap[name] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [inventory, movements]);

  const maxVal = ranked[0]?.total || 1;

  return (
    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
      {ranked.map((item, i) => (
        <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-600 transition-all">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0"
            style={{ backgroundColor: RANK_COLORS[i] }}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate pr-2 font-outfit">{item.name}</span>
              <span className="text-sm font-mono font-black shrink-0" style={{ color: RANK_COLORS[i] }}>{item.total} u.</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${(item.total / maxVal) * 100}%`, backgroundColor: RANK_COLORS[i] }}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// ── Discontinued / Out-of-Stock List (static data — no memo needed) ───────────
const DiscontinuedList = memo(function DiscontinuedList() {
  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {OUT_OF_STOCK_ITEMS.map(item => (
        <div key={item.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600 transition-all space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-mono font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                  Stock: 0 u.
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.area}</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-outfit leading-snug">{item.name}</h4>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold text-xs shrink-0 border border-amber-200 dark:border-amber-800 text-right leading-tight">
              {item.recommendation}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              <span className="font-bold text-slate-700 dark:text-slate-300">Motivo:</span> {item.reason}
            </span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
              {item.requestsCount} solicitudes este mes
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function DashboardOverview({ inventory, movements, requests, shiftAudits }) {
  const [histPeriod, setHistPeriod] = useState('mes');

  // ── Memoized heavy computations ───────────────────────────────────────────
  const exits = useMemo(() => movements.filter(m => m.type === 'SALIDA'), [movements]);

  const kpiData = useMemo(() => {
    const todayStr   = new Date().toISOString().split('T')[0];
    const todayMovs  = movements.filter(m => m && m.timestamp && typeof m.timestamp === 'string' && m.timestamp.startsWith(todayStr));
    const todayExits = todayMovs.filter(m => m.type === 'SALIDA').reduce((s, m) => s + (Number(m.quantity) || 0), 0);
    return {
      totalItems:    inventory.length,
      lowStock:      inventory.filter(i => i.stock <= i.minStock).length,
      critical:      inventory.filter(i => i.stock <= Math.ceil(i.minStock * 0.5)).length,
      todayExits,
      todayMovCount: todayMovs.length,
      irregularities: shiftAudits.filter(a => a && a.hasIrregularity).length,
    };
  }, [inventory, movements, shiftAudits]);

  const histData = useMemo(() => buildHistoricalData(exits, histPeriod), [exits, histPeriod]);
  const totalHistUnits = useMemo(() => histData.reduce((s, d) => s + (Number(d.unidades) || 0), 0), [histData]);

  const allCategories = useMemo(() => {
    const catMap = {};
    inventory.forEach(item => {
      const cat = item.category || 'Otros';
      if (!catMap[cat]) catMap[cat] = { stock: 0, min: 0 };
      catMap[cat].stock += (Number(item.stock) || 0);
      catMap[cat].min   += (Number(item.minStock) || 0);
    });
    return Object.entries(catMap).map(([cat, vals]) => ({ cat, ...vals }));
  }, [inventory]);

  const polarData = useMemo(() => {
    const map = { UCI:0, Quirófanos:0, Urgencias:0, Hospitalización:0, Pediatría:0 };
    exits.forEach(m => {
      const a = (m && m.area && typeof m.area === 'string' ? m.area : '').toLowerCase();
      const qty = Number(m.quantity) || 0;
      if      (a.includes('uci') || a.includes('intensivos'))            map.UCI             += qty;
      else if (a.includes('quiróf') || a.includes('cirugía'))            map.Quirófanos      += qty;
      else if (a.includes('urgencia') || a.includes('trauma'))           map.Urgencias       += qty;
      else if (a.includes('hospitalización') || a.includes('piso'))      map.Hospitalización += qty;
      else if (a.includes('pediatría'))                                   map.Pediatría       += qty;
      else                                                               map.UCI             += qty;
    });
    return [
      { name:'UCI',             value: map.UCI             || 28, color: POLAR_COLORS[0] },
      { name:'Quirófanos',      value: map.Quirófanos      || 30, color: POLAR_COLORS[1] },
      { name:'Urgencias',       value: map.Urgencias       || 16, color: POLAR_COLORS[2] },
      { name:'Hospitalización', value: map.Hospitalización || 12, color: POLAR_COLORS[3] },
      { name:'Pediatría',       value: map.Pediatría       || 22, color: POLAR_COLORS[4] },
    ];
  }, [exits]);

  const kpiConfigs = useMemo(() => [
    { label:'Total Productos',    val: kpiData.totalItems,         sub:`${kpiData.totalItems} en inventario central`,           Icon:Pill,          boxStyle:'bg-teal-50 dark:bg-teal-950/80 border-teal-100 dark:border-teal-800/80 text-teal-600 dark:text-teal-300',   valStyle:'text-slate-900 dark:text-white' },
    { label:'Alertas Bajo Stock', val: kpiData.lowStock,           sub:`${kpiData.critical} críticos · requieren orden`,         Icon:AlertTriangle, boxStyle:'bg-amber-50 dark:bg-amber-950/80 border-amber-100 dark:border-amber-800/80 text-amber-600 dark:text-amber-400', valStyle:'text-amber-600 dark:text-amber-400' },
    { label:'Suministrado Hoy',   val:`${kpiData.todayExits} u.`, sub:`${kpiData.todayMovCount} despachos a unidades`,          Icon:ArrowDownLeft, boxStyle:'bg-sky-50 dark:bg-sky-950/80 border-sky-100 dark:border-sky-800/80 text-sky-600 dark:text-sky-400',           valStyle:'text-sky-700 dark:text-sky-400' },
    { label:'Irregularidades',    val: kpiData.irregularities,     sub:'100% justificadas en auditoría',                        Icon:ShieldAlert,   boxStyle:'bg-rose-50 dark:bg-rose-950/80 border-rose-100 dark:border-rose-800/80 text-rose-600 dark:text-rose-400',     valStyle:'text-rose-600 dark:text-rose-400' },
  ], [kpiData]);

  return (
    <div className="space-y-6 w-full min-w-0">

      {/* ── Banner ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-950 dark:via-teal-900 dark:to-slate-900 p-4 sm:p-6 lg:p-8 rounded-2xl text-white shadow-xl shadow-teal-600/15 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5 w-full min-w-0">
        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/20 text-white text-[11px] sm:text-xs font-bold tracking-wide">
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse text-teal-200 shrink-0" />
            Consolidado General de Suministros Clínicos
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-outfit text-white">Panel de Control Farmacéutico</h2>
          <p className="text-teal-50 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
            Inventario central, monitoreo de abastecimiento a unidades médicas y trazabilidad de guardias.
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 bg-white/10 dark:bg-slate-800/60 px-3.5 py-2 sm:px-5 sm:py-3 rounded-xl border border-white/20 dark:border-slate-700/60 shrink-0">
          <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-teal-200 shrink-0" />
          <div>
            <div className="font-extrabold text-white text-xs sm:text-sm font-outfit">Abastecimiento Activo</div>
            <div className="text-teal-100 dark:text-slate-300 text-[10px] sm:text-xs font-semibold">5 Unidades Médicas Conectadas</div>
          </div>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0">
        {kpiConfigs.map(({ label, val, sub, Icon, boxStyle, valStyle }) => (
          <div key={label} className="clinical-card p-3 sm:p-5 rounded-2xl w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight sm:tracking-wider leading-tight truncate">{label}</span>
              <div className={`p-1.5 sm:p-2.5 rounded-xl border shrink-0 ${boxStyle}`}>
                <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className={`text-xl sm:text-3xl lg:text-4xl font-black font-outfit truncate ${valStyle}`}>{val}</div>
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 leading-tight truncate">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Histórico de Salidas ─────────────────────────────────────────────── */}
      <div className="clinical-panel p-6 rounded-2xl space-y-5 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-outfit flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
              Histórico de Salida de Medicamentos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              <span className="font-bold text-teal-700 dark:text-teal-400">{PERIOD_LABELS[histPeriod]}</span>
              {' · '}<span className="font-extrabold text-slate-800 dark:text-slate-200">{totalHistUnits.toLocaleString()} unidades</span>
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            {[{key:'dia',label:'Día'},{key:'semana',label:'Sem.'},{key:'mes',label:'Mes'},{key:'anio',label:'Año'}].map(opt => (
              <button key={opt.key} onClick={() => setHistPeriod(opt.key)}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${histPeriod===opt.key ? 'bg-teal-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={histData} margin={{ top:8, right:16, left:-10, bottom:0 }}>
              <defs>
                <linearGradient id="gradSalidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.28}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false}/>
              <XAxis dataKey="periodo" stroke="currentColor" className="text-slate-600 dark:text-slate-400" tick={{ fontSize:12, fontWeight:700 }} axisLine={false} tickLine={false}/>
              <YAxis stroke="currentColor" className="text-slate-600 dark:text-slate-400" tick={{ fontSize:12, fontWeight:600 }} axisLine={false} tickLine={false} width={40}/>
              <Tooltip
                formatter={v => [`${v} unidades`, 'Salidas']}
                contentStyle={{ backgroundColor:'#ffffff', borderColor:'#e2e8f0', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,.12)', fontSize:'13px', fontWeight:600 }}
              />
              <Area type="monotone" dataKey="unidades" stroke="#0284c7" strokeWidth={3}
                fill="url(#gradSalidas)" dot={{ fill:'#0284c7', r:4 }} activeDot={{ r:7, fill:'#0ea5e9' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Gauges de Categorías ─────────────────────────────────────────────── */}
      <div className="clinical-panel p-6 rounded-2xl space-y-5 w-full min-w-0">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-outfit flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Nivel de Stock por Categoría Médica
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Inventario disponible vs. mínimo requerido por categoría farmacéutica</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
          {allCategories.map(({ cat, stock, min }) => (
            <GaugeCard key={cat} label={cat} stock={stock} min={min} />
          ))}
        </div>
      </div>

      {/* ── Fila 3: Polar + Top 10 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">

        <div className="clinical-panel p-6 rounded-2xl flex flex-col gap-5 w-full min-w-0">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-outfit">Distribución de Suministro por Área</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Distribución radial de insumos provistos a unidades hospitalarias</p>
          </div>
          <PolarAreaChart data={polarData} />
        </div>

        <div className="clinical-panel p-6 rounded-2xl flex flex-col gap-5 w-full min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-outfit flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                Top 10 Productos Despachados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mayor rotación desde Farmacia Central</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-extrabold text-xs border border-sky-200 dark:border-sky-800 shrink-0">
              Alta Rotación
            </span>
          </div>
          <ExtendedMedRanking inventory={inventory} movements={movements} />
        </div>

      </div>

      {/* ── Fila 4: Solicitudes + Sin Stock ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">

        <div className="clinical-panel p-6 rounded-2xl flex flex-col gap-5 w-full min-w-0">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-outfit flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
              Estado de Solicitudes de Compra
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Flujo de aprobación y compras para reabastecimiento</p>
          </div>
          <RequestStatusTracker requests={requests} />
        </div>

        <div className="clinical-panel p-6 rounded-2xl flex flex-col gap-5 w-full min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-outfit flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                Medicamentos Sin Stock (Evaluación de Recompra)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Descontinuados o sin inventario con solicitudes activas</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold text-xs border border-rose-200 dark:border-rose-800 shrink-0">
              Recompra
            </span>
          </div>
          <DiscontinuedList />
        </div>

      </div>

    </div>
  );
}
