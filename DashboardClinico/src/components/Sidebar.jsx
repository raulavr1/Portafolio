import React, { useRef, useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  ArrowLeftRight, 
  FileCheck2, 
  ClipboardCheck, 
  ShieldCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, lowStockCount, irregularityCount }) {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const hasDragged = useRef(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollByAmount = (amount) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

  const handleWheel = (e) => {
    if (e.deltaY !== 0 && scrollContainerRef.current) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollStartX.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDragged.current = true;
    }
    scrollContainerRef.current.scrollLeft = scrollStartX.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const menuItems = [
    {
      id: 'overview',
      label: 'Resumen General',
      subtitle: 'KPIs & Gráficas Dinámicas',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'inventory',
      label: 'Gestión de Inventario',
      subtitle: 'Carga, Lotes & Límites',
      icon: Pill,
      badge: null
    },
    {
      id: 'movements',
      label: 'Asignación & Movimientos',
      subtitle: 'Entradas, Salidas & Descuento',
      icon: ArrowLeftRight,
      badge: null
    },
    {
      id: 'requests',
      label: 'Alertas & Compras',
      subtitle: 'Módulo Gerencia & Comprobantes',
      icon: FileCheck2,
      badge: lowStockCount > 0 ? { count: lowStockCount, color: 'bg-rose-600 text-white' } : null
    },
    {
      id: 'shiftAudit',
      label: 'Control de Guardia',
      subtitle: 'Histórico & Irregularidades',
      icon: ClipboardCheck,
      badge: irregularityCount > 0 ? { count: irregularityCount, color: 'bg-amber-500 text-slate-950 font-bold' } : null
    }
  ];

  return (
    <>
      {/* ── DESKTOP SIDEBAR (Ancho robusto 80-96 con tipografía grande y clara) ─────── */}
      <aside className="hidden md:flex md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 lg:p-7 flex-col justify-between shrink-0 shadow-sm min-h-[calc(100vh-65px)]">
        <div className="space-y-8">
          <div>
            <h2 className="px-3 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Módulos Principales
            </h2>
            <nav className="mt-4 space-y-2.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4.5 py-4 rounded-2xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-100/50 dark:from-teal-950/60 dark:to-cyan-950/40 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700/50 shadow-md shadow-teal-500/10 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-4 text-left">
                      <div className={`p-3 rounded-2xl ${isActive ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold leading-tight font-outfit text-slate-900 dark:text-white">{item.label}</div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{item.subtitle}</div>
                      </div>
                    </div>
                    
                    {item.badge ? (
                      <span className={`px-3 py-1 text-xs font-black rounded-full shadow-sm ${item.badge.color}`}>
                        {item.badge.count}
                      </span>
                    ) : isActive ? (
                      <ChevronRight className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Shift Status Card */}
          <div className="p-5 rounded-2xl bg-teal-50/80 dark:bg-slate-800/80 border border-teal-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2.5 text-teal-900 dark:text-teal-300 font-extrabold text-sm font-outfit">
              <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Auditoría & Trazabilidad</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs font-semibold">
              Todo descuento de stock queda enlazado con la fecha, turno y firma digital del personal asistencial de guardia.
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
          Sistema Farmacéutico de Clínica <br />
          <span className="font-extrabold text-slate-700 dark:text-slate-300">&copy; 2026 Registro Integrado Estéril</span>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAVIGATION RAIL CON DESPLAZADOR COMPLETO ──────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-1.5 sm:p-2 shadow-2xl">
        <div className="flex items-center gap-1.5 w-full">
          {/* Botón desplazador izquierdo */}
          {canScrollLeft && (
            <button
              onClick={() => scrollByAmount(-180)}
              className="shrink-0 w-8 h-8 rounded-full bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-slate-700 shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              title="Desplazar a la izquierda"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Riel desplazable: con rueda de ratón, clic y arrastre y scroll táctil */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`flex-1 min-w-0 overflow-x-auto select-none py-1 custom-scrollbar-thin ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
          >
            <div className="flex items-center gap-2 min-w-max px-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!hasDragged.current) {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all shrink-0 border select-none ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/30 ring-2 ring-teal-400/20'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`ml-1 px-2 py-0.5 text-[10px] font-black rounded-full ${item.badge.color}`}>
                        {item.badge.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botón desplazador derecho */}
          {canScrollRight && (
            <button
              onClick={() => scrollByAmount(180)}
              className="shrink-0 w-8 h-8 rounded-full bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-slate-700 shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              title="Desplazar a la derecha"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
