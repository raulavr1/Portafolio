import React, { useState, useMemo } from 'react';
import { CLINICAL_AREAS } from '../data/initialData';
import { BookOpen, HelpCircle, Info, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, ArrowLeftRight, RotateCcw } from 'lucide-react';
import ClinicalProtocolsGuide from './ClinicalProtocolsGuide';

// ── Delivery type config ───────────────────────────────────────────────────────
const DELIVERY_TYPES = [
  {
    key: 'PACIENTE',
    label: 'Entrega a Paciente',
    desc: 'Despacho de medicamentos asignados a un paciente específico con receta médica',
    color: 'rose',
    accentBg: 'bg-rose-600',
    activeBorder: 'border-rose-500 dark:border-rose-500',
    activeBg: 'bg-rose-50/90 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    shadow: 'shadow-rose-600/10',
    movType: 'SALIDA',
  },
  {
    key: 'SERVICIOS',
    label: 'Servicios Médicos (Stock)',
    desc: 'Abastecimiento o reposición de stock a áreas y servicios médicos de la clínica',
    color: 'sky',
    accentBg: 'bg-sky-600',
    activeBorder: 'border-sky-500 dark:border-sky-500',
    activeBg: 'bg-sky-50/90 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    shadow: 'shadow-sky-600/10',
    movType: 'SALIDA',
  },
  {
    key: 'DEVOLUCION',
    label: 'Devolución / Reposición',
    desc: 'Devolución por paciente o servicio que reingresan medicamentos al stock',
    color: 'emerald',
    accentBg: 'bg-emerald-600',
    activeBorder: 'border-emerald-500 dark:border-emerald-500',
    activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    shadow: 'shadow-emerald-600/10',
    movType: 'ENTRADA',
  },
];

// ── Entorno Demostrativo: Funciones de descarga / impresión física deshabilitadas ──
const printDeliveryNote = () => {};
// ── Main Component ─────────────────────────────────────────────────────────────
export default function StockMovementManager({ inventory, movements, onAddMovement, activeShift, showToast }) {

  // Mode: PACIENTE | SERVICIOS | DEVOLUCION
  const [deliveryType, setDeliveryType] = useState('PACIENTE');

  // Form Header fields
  const [header, setHeader] = useState({
    patientName: '', patientCode: '', doctor: '', area: CLINICAL_AREAS[0] || '',
    receiverName: '', reason: '', returnSource: 'PACIENTE', invoiceFile: null,
  });

  // Cart
  const [cart, setCart] = useState([]);

  // Item input
  const [selectedMedId, setSelectedMedId] = useState(inventory[0]?.id || '');
  const [qty, setQty]                     = useState(1);
  const [itemObs, setItemObs]             = useState('');
  const [medSearch, setMedSearch]         = useState('');

  // History filter
  const [searchHistory, setSearchHistory] = useState('');
  const [filterTypeHistory, setFilterTypeHistory] = useState('TODOS');

  // Notifications
  const [successMsg, setSuccessMsg]       = useState('');
  const [lastNote, setLastNote]           = useState(null);
  const [showProtocolsGuide, setShowProtocolsGuide] = useState(false);
  const [showInstructionsCard, setShowInstructionsCard] = useState(true);

  const movType = DELIVERY_TYPES.find(t => t.key === deliveryType)?.movType || 'SALIDA';

  // Filtered inventory catalog
  const filteredMeds = useMemo(() => {
    if (!medSearch.trim()) return inventory;
    const q = medSearch.toLowerCase();
    return inventory.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q)
    );
  }, [inventory, medSearch]);

  // Make sure selectedMed matches the filtered search results
  const selectedMed = filteredMeds.find(i => i.id === selectedMedId) || filteredMeds[0] || inventory[0];

  const addToCart = () => {
    if (!selectedMed) return;
    const qtyNum = Number(qty);
    if (qtyNum < 1) return;

    if (movType === 'SALIDA') {
      const alreadyInCart = cart
        .filter(c => c.med.id === selectedMed.id)
        .reduce((s, c) => s + Number(c.qty), 0);
      if (alreadyInCart + qtyNum > selectedMed.stock) {
        showToast(`Stock insuficiente. Solo hay ${selectedMed.stock} unidades disponibles de "${selectedMed.name}".`, 'error');
        return;
      }
    }

    setCart(prev => [...prev, { id: Date.now(), med: selectedMed, qty: qtyNum, obs: itemObs }]);
    setItemObs('');
    setQty(1);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.id !== id));

  // Extract unique recent patients from movements history for quick selection
  const recentPatients = useMemo(() => {
    const map = new Map();
    movements.forEach(m => {
      if (m.patientName && m.patientName.trim()) {
        const key = m.patientName.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            name: m.patientName.trim(),
            code: m.patientCode || '',
            area: m.area?.split('—')[0]?.trim() || CLINICAL_AREAS[0]
          });
        }
      }
    });
    return Array.from(map.values());
  }, [movements]);

  const selectRecentPatient = (patientName) => {
    if (!patientName) return;
    const found = recentPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
    if (found) {
      setHeader(h => ({
        ...h,
        patientName: found.name,
        patientCode: found.code || h.patientCode,
        area: CLINICAL_AREAS.includes(found.area) ? found.area : h.area
      }));
    } else {
      setHeader(h => ({ ...h, patientName }));
    }
  };

  const confirmDelivery = () => {
    if (cart.length === 0) { showToast('Debe agregar al menos un medicamento al carrito antes de confirmar.', 'warning'); return; }
    if (deliveryType === 'PACIENTE' && !header.patientName.trim()) {
      showToast('Ingrese el nombre del paciente antes de confirmar el despacho.', 'warning'); return;
    }
    if (deliveryType === 'DEVOLUCION' && header.returnSource === 'PACIENTE' && !header.patientName.trim() && !header.patientCode.trim()) {
      showToast('Ingrese el nombre del paciente o seleccione uno del historial para continuar.', 'warning'); return;
    }

    const now = new Date();
    const timestampStr = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const noteId = `NE-${Date.now().toString().slice(-6)}`;

    let areaLabel = '';
    if (deliveryType === 'PACIENTE') {
      areaLabel = `${header.area} — Paciente: ${header.patientName} [HC: ${header.patientCode || 'S/C'}]`;
    } else if (deliveryType === 'SERVICIOS') {
      areaLabel = `${header.area}${header.receiverName ? ` — Recibe: ${header.receiverName}` : ''}`;
    } else {
      // DEVOLUCION
      if (header.returnSource === 'PACIENTE') {
        areaLabel = `↩ Dev. Paciente: ${header.patientName} ${header.patientCode ? `[HC: ${header.patientCode}]` : ''}`;
      } else {
        areaLabel = `↩ Dev. Servicio: ${header.area} — Stock repuesto`;
      }
    }

    cart.forEach(item => {
      const obs = item.obs ||
        (deliveryType === 'PACIENTE'  ? `Entrega a paciente ${header.patientName} ${header.patientCode ? `[HC: ${header.patientCode}]` : ''}` :
         deliveryType === 'SERVICIOS' ? `Abastecimiento servicio ${header.area} — ${header.reason || 'Sin observación'}` :
         header.returnSource === 'PACIENTE'
           ? `Devolución paciente ${header.patientName} — ${header.reason || 'Devolución de medicamento al stock'}`
           : `Devolución de servicio ${header.area} — ${header.reason || 'Stock devuelto a farmacia'}`);
      const newMov = {
        id: `MOV-${Date.now()}-${item.id}`,
        timestamp: timestampStr,
        type: movType,
        medicationCode: item.med.code,
        medicationName: item.med.name,
        quantity: item.qty,
        area: areaLabel,
        responsible: activeShift?.staffName || 'Personal Asistencial',
        shift: activeShift?.shiftName?.split(' ')[0] || 'Guardia',
        observations: obs,
        deliveryNoteId: noteId,
        deliveryType,
        patientName: header.patientName || '',
        patientCode: header.patientCode || '',
        originalNoteId: header.originalNoteId || '',
      };
      onAddMovement(newMov, item.med.id, item.qty, movType);
    });

    const savedNote = { deliveryType, header: { ...header }, cart: [...cart], activeShift, noteId, timestamp: timestampStr };
    setLastNote(savedNote);
    setSuccessMsg(`✅ ${deliveryType === 'DEVOLUCION' ? 'Devolución y reintegro procesado' : 'Despacho registrado'} — Comprobante ${noteId} (${cart.length} ítems).`);
    setTimeout(() => setSuccessMsg(''), 6000);

    setCart([]);
    setHeader({ patientName:'', patientCode:'', bed:'', doctor:'', area: CLINICAL_AREAS[0] || '', receiverName:'', reason:'', returnedBy:'', originalNoteId:'', invoiceFile: null });
  };

  // Group history by deliveryNoteId & filter cleanly
  const groupedMovements = useMemo(() => {
    let filtered = movements;

    if (filterTypeHistory !== 'TODOS') {
      filtered = filtered.filter(m => m.deliveryType === filterTypeHistory || (filterTypeHistory === 'DEVOLUCION' && m.type === 'ENTRADA'));
    }

    if (searchHistory.trim()) {
      const q = searchHistory.toLowerCase();
      filtered = filtered.filter(m =>
        (m.patientName && m.patientName.toLowerCase().includes(q)) ||
        (m.patientCode && m.patientCode.toLowerCase().includes(q)) ||
        (m.deliveryNoteId && m.deliveryNoteId.toLowerCase().includes(q)) ||
        (m.originalNoteId && m.originalNoteId.toLowerCase().includes(q)) ||
        (m.area && m.area.toLowerCase().includes(q)) ||
        (m.medicationName && m.medicationName.toLowerCase().includes(q)) ||
        (m.medicationCode && m.medicationCode.toLowerCase().includes(q)) ||
        (m.responsible && m.responsible.toLowerCase().includes(q))
      );
    }

    const groupsMap = new Map();
    filtered.forEach(mov => {
      const key = mov.deliveryNoteId || mov.id;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          noteId: mov.deliveryNoteId || 'INDIVIDUAL',
          timestamp: mov.timestamp,
          deliveryType: mov.deliveryType || (mov.type === 'ENTRADA' ? 'DEVOLUCION' : 'PACIENTE'),
          area: mov.area,
          patientName: mov.patientName,
          patientCode: mov.patientCode || '',
          returnSource: mov.returnSource || 'PACIENTE',
          responsible: mov.responsible,
          shift: mov.shift,
          items: []
        });
      }
      groupsMap.get(key).items.push(mov);
    });

    return Array.from(groupsMap.values());
  }, [movements, searchHistory, filterTypeHistory]);

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:border-teal-500 focus:outline-none transition-all';
  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide';

  return (
    <div className="space-y-6 w-full">

      {/* ── Header with Prominent Staff Badge & Protocols Button ── */}
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-xl">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-outfit">
            Despacho & Movimientos de Farmacia
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Módulo asistencial para auxiliares — Despacho a pacientes, stock de servicios médicos y devoluciones de insumos.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 sm:gap-3 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowProtocolsGuide(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-300 font-extrabold text-xs border border-teal-300 dark:border-teal-700/60 shadow-sm transition-all whitespace-nowrap"
            title="Ver Instrucciones y Protocolos Clínicos de Uso"
          >
            <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Protocolos Clínicos</span>
          </button>

          {/* PROMINENT HIGH-CONTRAST STAFF BADGE */}
          <div className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900 text-white shadow-lg border border-slate-800 shrink-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <div className="text-[9px] sm:text-[10px] text-teal-300 font-extrabold uppercase tracking-widest leading-none">Guardia Activa</div>
              <div className="text-xs sm:text-sm font-extrabold text-white font-outfit mt-0.5 whitespace-nowrap">
                {activeShift?.staffName || 'Operador FAR-02'}
                <span className="text-[10px] sm:text-xs text-slate-400 font-normal ml-1.5">({activeShift?.shiftName || 'Día'})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Instructional Banner for Correct Operation ── */}
      {showInstructionsCard && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/60 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-teal-900 dark:text-teal-300 font-extrabold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              Instrucciones Operativas de Uso en Demostración
            </div>
            <button
              type="button"
              onClick={() => setShowInstructionsCard(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold"
            >
              Ocultar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black text-[10px] uppercase shrink-0 mt-0.5">
                Asignaciones
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Al confirmar un despacho, el stock se descuenta <strong>inmediatamente en tiempo real</strong>. Ingrese el paciente con su código HC o el servicio receptor para emitir la constancia oficial.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-[10px] uppercase shrink-0 mt-0.5">
                Devoluciones
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Al registrar una devolución, el stock <strong>aumenta automáticamente</strong> en el catálogo. Verifique integridad del empaque estéril y cadena de frío antes de reincorporar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Guía de Protocolos Clínicos */}
      <ClinicalProtocolsGuide
        isOpen={showProtocolsGuide}
        onClose={() => setShowProtocolsGuide(false)}
      />

      {/* ── Success Banner ─────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold animate-in fade-in">
          <span>{successMsg}</span>
          {lastNote && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0 select-none">
              ✔ Comprobante Registrado · Entorno Demostrativo
            </span>
          )}
        </div>
      )}

      {/* ── Enhanced Delivery Mode Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DELIVERY_TYPES.map(t => {
          const active = deliveryType === t.key;
          const colMap = {
            rose:    { activeBorder: 'border-rose-500 dark:border-rose-500', activeBg: 'bg-rose-50/90 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', accent: 'bg-rose-600' },
            sky:     { activeBorder: 'border-sky-500 dark:border-sky-500',   activeBg: 'bg-sky-50/90 dark:bg-sky-950/40',     text: 'text-sky-700 dark:text-sky-300',   accent: 'bg-sky-600' },
            emerald: { activeBorder: 'border-emerald-500 dark:border-emerald-500', activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', accent: 'bg-emerald-600' },
          };
          const col = colMap[t.color];
          return (
            <button key={t.key} type="button" onClick={() => { setDeliveryType(t.key); setCart([]); }}
              className={`relative p-5 rounded-2xl border text-left transition-all overflow-hidden ${
                active
                  ? `${col.activeBg} ${col.activeBorder} shadow-md`
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
              }`}>
              {/* Top Accent Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${active ? col.accent : 'bg-slate-200 dark:bg-slate-800'}`} />

              <div className="flex items-center justify-between mb-1">
                <div className={`text-sm font-extrabold font-outfit ${active ? col.text : 'text-slate-900 dark:text-slate-100'}`}>{t.label}</div>
                {active && (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${col.accent}`}>
                    Activo
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{t.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── Main Form Grid: 3/5 Left Form + 2/5 Right Carrito ────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch">

        {/* LEFT FORM (3/5) */}
        <div className="xl:col-span-3 flex flex-col gap-5">

          {/* Form Header */}
          <div className="clinical-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-outfit">
              {deliveryType === 'PACIENTE'  ? 'Datos del Paciente' :
               deliveryType === 'SERVICIOS' ? 'Datos del Servicio Médico Receptor' :
                                              'Datos de Devolución / Reintegro'}
            </h3>

            {deliveryType === 'PACIENTE' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Cód. Historia Clínica (HC)</label>
                    <input className={inputCls + ' font-mono font-bold'} placeholder="Ej. HC-2026-00451"
                      value={header.patientCode} onChange={e => setHeader({...header, patientCode: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Nombre del Paciente *</label>
                    <input className={inputCls} placeholder="Ej. Paciente Demo 05"
                      value={header.patientName} onChange={e => setHeader({...header, patientName: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Médico Tratante</label>
                    <input className={inputCls} placeholder="Ej. Médico Especialista Demo"
                      value={header.doctor} onChange={e => setHeader({...header, doctor: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>Servicio / Área</label>
                    <select className={inputCls} value={header.area} onChange={e => setHeader({...header, area: e.target.value})}>
                      {CLINICAL_AREAS.map((a, i) => <option key={i} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {deliveryType === 'SERVICIOS' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Servicio Médico / Área *</label>
                    <select className={inputCls} value={header.area} onChange={e => setHeader({...header, area: e.target.value})}>
                      {CLINICAL_AREAS.map((a, i) => <option key={i} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Responsable Receptor</label>
                    <input className={inputCls} placeholder="Nombre del profesional que recibe"
                      value={header.receiverName} onChange={e => setHeader({...header, receiverName: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Motivo de Abastecimiento</label>
                  <input className={inputCls} placeholder="Ej. Reposición de stock semanal en botiquín UCI"
                    value={header.reason} onChange={e => setHeader({...header, reason: e.target.value})} />
                </div>
              </>
            )}

            {/* DEVOLUCIÓN MODE — Paciente o Servicio Médico */}
            {deliveryType === 'DEVOLUCION' && (
              <div className="space-y-4">

                {/* Selector de origen */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'PACIENTE', label: 'Devolución por Paciente', sub: 'Medicamentos asignados a su HC' },
                    { key: 'AREA',     label: 'Devolución por Servicio', sub: 'Stock de área / botiquín' }
                  ].map(opt => (
                    <button key={opt.key} type="button"
                      onClick={() => setHeader(h => ({ ...h, returnSource: opt.key, patientName: '', patientCode: '', area: CLINICAL_AREAS[0] }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        header.returnSource === opt.key
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}>
                      <div className={`text-xs font-extrabold font-outfit ${header.returnSource === opt.key ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>

                {/* PACIENTE sub-form */}
                {header.returnSource === 'PACIENTE' && (
                  <div className="space-y-3">
                    {recentPatients.length > 0 && (
                      <div>
                        <label className={labelCls}>⚡ Seleccionar de Pacientes Atendidos Recientemente</label>
                        <select
                          className={inputCls + ' border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-bold'}
                          value={header.patientName}
                          onChange={e => selectRecentPatient(e.target.value)}>
                          <option value="">-- O selecciona un paciente del registro anterior --</option>
                          {recentPatients.map((p, idx) => (
                            <option key={idx} value={p.name}>
                              👤 {p.name} {p.code ? `[HC: ${p.code}]` : ''} — ({p.area})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Nombre del Paciente *</label>
                        <input
                          className={inputCls}
                          placeholder="Ej. miguel"
                          value={header.patientName}
                          onChange={e => setHeader(h => ({...h, patientName: e.target.value}))}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Cód. Historia Clínica (Opcional)</label>
                        <input
                          className={inputCls + ' font-mono'}
                          placeholder="Ej. HC-2026-00451 (o déjalo en blanco)"
                          value={header.patientCode}
                          onChange={e => setHeader(h => ({...h, patientCode: e.target.value}))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Servicio / Área</label>
                        <select className={inputCls} value={header.area} onChange={e => setHeader(h => ({...h, area: e.target.value}))}>
                          {CLINICAL_AREAS.map((a, i) => <option key={i} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Motivo de Devolución</label>
                        <input className={inputCls} placeholder="Alta médica, no administrado..."
                          value={header.reason} onChange={e => setHeader(h => ({...h, reason: e.target.value}))} />
                      </div>
                    </div>
                  </div>
                )}

                {/* SERVICIO sub-form */}
                {header.returnSource === 'AREA' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Servicio Médico / Área *</label>
                      <select className={inputCls} value={header.area} onChange={e => setHeader(h => ({...h, area: e.target.value}))}>
                        {CLINICAL_AREAS.map((a, i) => <option key={i} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Motivo de Devolución</label>
                      <input className={inputCls} placeholder="Sobrante de botiquín, vencimiento próximo..."
                        value={header.reason} onChange={e => setHeader(h => ({...h, reason: e.target.value}))} />
                    </div>
                  </div>
                )}

                {/* Info footer */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <span>↩</span>
                  <span>El stock se repone automáticamente. El descuento queda vinculado al {header.returnSource === 'PACIENTE' ? 'paciente y su historia clínica' : 'servicio médico correspondiente'}.</span>
                </div>
              </div>
            )}

          </div>

          {/* Add Item Selector */}
          <div className="clinical-panel p-6 rounded-2xl space-y-4 flex-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-outfit">
              Agregar Medicamentos al Carrito
            </h3>

            <input type="text" placeholder="Buscar por nombre, código o categoría..."
              value={medSearch} onChange={e => setMedSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-teal-500" />

            <div>
              <label className={labelCls}>Seleccionar Medicamento</label>
              <select value={selectedMed?.id || ''} onChange={e => setSelectedMedId(e.target.value)} className={inputCls}>
                {filteredMeds.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.code}] {item.name} — Lote: {item.batch} (Stock: {item.stock} {item.unit || 'u.'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="flex flex-col">
                <label className={`${labelCls} min-h-[1.75rem] flex items-end`}>Cantidad</label>
                <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                  className={inputCls + ' font-black text-lg text-teal-700 dark:text-teal-400'} />
              </div>
              <div className="flex flex-col">
                <label className={`${labelCls} min-h-[1.75rem] flex items-end truncate`} title="Observación por Ítem (opcional)">
                  Observación (opcional)
                </label>
                <input type="text" placeholder="Ej. Dosis no administrada"
                  value={itemObs} onChange={e => setItemObs(e.target.value)} className={inputCls} />
              </div>
            </div>

            <button type="button" onClick={addToCart}
              className="w-full py-3 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all shadow-md shadow-teal-600/20">
              + Agregar al Carrito
            </button>
          </div>

        </div>

        {/* RIGHT CARRITO (2/5) — Perfectly Aligned Top to Bottom */}
        <div className="xl:col-span-2 clinical-panel p-6 rounded-2xl flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm min-h-[420px]">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-outfit">
              Carrito de Despacho
            </h3>
            <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white text-xs font-black">
              {cart.length} ítem{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Cart Item List — Aligned Top */}
          <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium text-center py-12">
                Ningún medicamento en el carrito.
                <br />Selecciona un producto a la izquierda.
              </div>
            ) : (
              cart.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{item.med.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{item.med.code} · Lote: {item.med.batch}</div>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="font-black text-sm text-teal-700 dark:text-teal-400">{item.qty} u.</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-rose-500 text-xs font-bold">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Total unidades del pedido:</span>
              <span className="text-base font-black text-teal-700 dark:text-teal-400">
                {cart.reduce((s, i) => s + Number(i.qty), 0)} u.
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={confirmDelivery} disabled={cart.length === 0}
                className={`flex-1 py-3 rounded-xl font-extrabold text-xs text-white uppercase tracking-wider transition-all ${
                  cart.length === 0 ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500' :
                  movType === 'SALIDA'
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-600/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20'
                }`}>
                Confirmar {movType === 'SALIDA' ? 'Despacho' : 'Devolución'}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ── History Table Section ────────────────────────────────────────────── */}
      <div className="clinical-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-4 p-6">
        
        {/* Header & Side-by-Side Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-outfit">
              Historial de Despachos por Pedido y Paciente
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registros agrupados con indicación clara de inicio y fin de pedido.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <input
              type="text"
              placeholder="Filtrar por Paciente, Nota, Área..."
              value={searchHistory}
              onChange={e => setSearchHistory(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
            <select
              value={filterTypeHistory}
              onChange={e => setFilterTypeHistory(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shrink-0"
            >
              <option value="TODOS">Todos los Despachos</option>
              <option value="PACIENTE">Entrega a Paciente</option>
              <option value="SERVICIOS">Servicios Médicos (Stock)</option>
              <option value="DEVOLUCION">Devolución / Reposición</option>
            </select>
          </div>
        </div>

        {/* Grouped History List */}
        <div className="space-y-4">
          {groupedMovements.length > 0 ? (
            groupedMovements.map((group) => {
              const isPaciente   = group.deliveryType === 'PACIENTE';
              const isServicios  = group.deliveryType === 'SERVICIOS';
              const isDevolucion = group.deliveryType === 'DEVOLUCION';

              const borderCol    = isPaciente ? 'border-l-rose-500' : isServicios ? 'border-l-sky-500' : 'border-l-emerald-500';
              const badgeBg      = isPaciente ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                   isServicios? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                                                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';

              return (
                <div key={group.noteId} className={`rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 ${borderCol} overflow-hidden bg-white dark:bg-slate-900/90 shadow-sm`}>
                  
                  {/* Order Group Header Boundary */}
                  <div className="bg-slate-50/90 dark:bg-slate-950/80 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${badgeBg}`}>
                          {group.noteId}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white font-outfit">
                          {isPaciente   ? `Paciente: ${group.patientName || 'No especificado'}` :
                           isServicios  ? `Servicio Médico: ${group.area}` :
                           group.returnSource === 'AREA'
                                        ? `↩ Devolución de Servicio: ${group.area}`
                                        : `↩ Devolución Paciente: ${group.patientName || 'No especificado'}`}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {group.timestamp}
                        </span>
                      </div>

                      {/* Badges for DEVOLUCION */}
                      {isDevolucion && (
                        <div className="flex flex-wrap items-center gap-2 pl-1">
                          {group.returnSource === 'PACIENTE' && group.patientCode && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[11px]">
                              <span className="opacity-60">HC:</span> {group.patientCode}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wide">
                            {group.returnSource === 'PACIENTE' ? '↩ Devolución Paciente' : '↩ Devolución Servicio'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                      <span>Auxiliar: <strong>{group.responsible}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">{group.items.length} producto(s)</span>
                      
                      <span
                        className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 font-extrabold text-[11px] flex items-center gap-1.5 shrink-0 ml-2 select-none"
                        title="Nota de entrega registrada en el sistema — Entorno demostrativo"
                      >
                        ✔ Nota Registrada
                      </span>
                    </div>
                  </div>

                  {/* Items inside this order */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100/50 dark:bg-slate-950/40 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-5">Código</th>
                          <th className="py-2.5 px-5">Medicamento</th>
                          <th className="py-2.5 px-5 text-center">Cantidad</th>
                          <th className="py-2.5 px-5">Ubicación / Detalle</th>
                          <th className="py-2.5 px-5">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {group.items.map(item => (
                          <tr key={item.id} className="hover:bg-teal-50/20 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-5 font-mono font-bold text-teal-700 dark:text-teal-400">{item.medicationCode}</td>
                            <td className="py-2.5 px-5 font-semibold text-slate-900 dark:text-white">{item.medicationName}</td>
                            <td className="py-2.5 px-5 text-center font-black text-slate-900 dark:text-white">{item.quantity} u.</td>
                            <td className="py-2.5 px-5 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={item.area}>{item.area}</td>
                            <td className="py-2.5 px-5 text-slate-500 dark:text-slate-400 max-w-[240px] truncate" title={item.observations}>{item.observations || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Order End Boundary Footer */}
                  <div className="bg-slate-100/40 dark:bg-slate-950/40 px-5 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Fin del pedido {group.noteId} — Total: {group.items.reduce((s, i) => s + Number(i.quantity), 0)} unidades</span>
                    {isDevolucion && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ↩ Stock repuesto {group.items.reduce((s, i) => s + Number(i.quantity), 0)} u. — Reintegro aplicado
                      </span>
                    )}
                  </div>

                </div>
              );
            })
          ) : (
            <div className="py-14 text-center text-slate-400 text-sm font-medium">
              No se encontraron registros de pedidos que coincidan con la búsqueda.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
