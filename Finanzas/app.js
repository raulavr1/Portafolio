/**
 * ============================================================================
 * Dashboard de Finanzas — Sistema Profesional EJECUTIVO (app.js)
 * Controlador Central de Vistas, Gráficos Dinámicos, Matriz y Perfiles de Usuario
 * ============================================================================
 */
"use strict";
// ══════════════════════════════════════════════════════════════════════════
// 📊 PALETA DE COLORES Y MOTOR VISUAL APEXCHARTS (TEMA CLARO CON PROFUNDIDAD)
// ══════════════════════════════════════════════════════════════════════════
const NEON = {
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  green:  '#10b981',
  amber:  '#f59e0b',
  red:    '#ef4444',
  cyan:   '#06b6d4',
  pink:   '#ec4899',
  teal:   '#14b8a6'
};

const CHART_COLORS = [
  NEON.blue, NEON.green, NEON.purple, NEON.amber, NEON.pink, NEON.cyan, NEON.red, NEON.teal
];

if (typeof window !== 'undefined') {
  window.Apex = {
    chart: {
      foreColor: '#64748b',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: 'transparent',
      toolbar: { show: false },
      dropShadow: {
        enabled: true,
        top: 3,
        left: 0,
        blur: 6,
        opacity: 0.12
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 750,
        animateGradually: { enabled: true, delay: 100 },
        dynamicAnimation: { enabled: true, speed: 350 }
      }
    },
    theme: { mode: 'light' },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    tooltip: {
      theme: 'light',
      style: { fontSize: '12px', fontFamily: "'Inter', sans-serif" }
    }
  };
}


// --- ESTADO GLOBAL ---
let dbData = {
  configuracion: {},
  usuarios: [],
  catalogo: {},
  registro_efe: [],
  registro_esf: [],
  objetivos_metas: {},
  planes_accion: []
};

let currentView = 'vista-dashboard';
let activeCharts = {};
const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// ══════════════════════════════════════════════════════════════════════════
// ⏱️ SIMULADOR DE LÍNEA TEMPORAL REALISTA (HASTA LA FECHA ACTUAL)
// ══════════════════════════════════════════════════════════════════════════
const _realNow = new Date();
const CURRENT_YEAR = _realNow.getFullYear(); // ej. 2026
const CURRENT_MONTH = _realNow.getMonth() + 1; // 1-12 (ej. 10 para Octubre)

// filterMonth inicializa en el mes actual del sistema
let filterMonth = CURRENT_MONTH.toString();
let filterType = 'all';
let filterCategory = 'all';

// Función para comprobar si un mes es futuro (después de la fecha actual)
function isFutureMonth(mesNum) {
  const m = parseInt(mesNum, 10);
  return !isNaN(m) && m > CURRENT_MONTH;
}

// Devuelve los meses cerrados y transcurridos hasta la fecha actual [1 .. CURRENT_MONTH]
function getElapsedMonths() {
  const arr = [];
  for (let m = 1; m <= CURRENT_MONTH; m++) arr.push(m);
  return arr;
}

// Reorganizado: Dashboard bajo el cómo usar, Configuración al final
const VIEW_TITLES = {
  'vista-inicio':       ['Inicio',              'Tu resumen financiero personal — simple y claro'],
  'vista-dashboard':    ['Mi Panel',            'Visualización completa de tus ingresos, gastos y ahorros'],
  'vista-registro-efe': ['Mis Movimientos',     'Aquí registras cada peso que entra o sale de tu bolsillo'],
  'vista-efe':          ['¿A dónde fue mi dinero?', 'Análisis visual de cómo se distribuyó tu dinero este mes'],
  'vista-registro-esf': ['Mis Cuentas',         'Registra tus saldos bancarios, inversiones y deudas por mes'],
  'vista-esf':          ['Mi Patrimonio',       'Todo lo que tienes vs. todo lo que debes — tu valor neto real'],
  'vista-objetivos':    ['Mis Metas',           'Monitorea tu fondo de emergencia, ahorro y control de deudas'],
  'vista-presupuesto':  ['Mi Presupuesto',      'Lo que planeas ganar y gastar — tu hoja de ruta financiera'],
  'vista-progreso':     ['Mi Salud Financiera', '6 indicadores que miden qué tan bien estás manejando tu dinero'],
  'vista-planes':       ['Mis Planes',          'Acciones concretas para mejorar tu situación financiera'],
  'vista-configuracion':['⚙️ Configuración',              'Perfiles de usuario, moneda y exportación de reportes']
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadFinancialData();
  updateUserProfileBadges();
  populateCategoryDropdown();
  updateDynamicSimulationDates();
  syncMonthPillsUI();
  navigateTo('vista-inicio');
});

// Actualiza textos de años e indicadores dinámicos en el DOM para la simulación
function updateDynamicSimulationDates() {
  // Badge de estado en el header
  const cyberStatus = document.querySelector('.cyber-status-text');
  if (cyberStatus) cyberStatus.textContent = `PANEL FINANCIERO ${CURRENT_YEAR}`;

  // Actualizar cualquier subtítulo o etiqueta de año
  document.querySelectorAll('.sim-year-label').forEach(el => {
    el.textContent = CURRENT_YEAR;
  });
}

// Variable de modo de almacenamiento: 'server' o 'autonomous'
let dataStorageMode = 'server';

function persistAutonomous() {
  if (dataStorageMode === 'autonomous') {
    try {
      localStorage.setItem('FINCONTROL_DB_V1', JSON.stringify(dbData));
    } catch (e) {
      console.warn('[FinControl] Error al guardar en localStorage:', e);
    }
  }
}

// --- CARGA DE DATOS DESDE LA API CON FALLBACK AUTÓNOMO (ESTÁTICO / VERCEL / LOCAL) ---
async function loadFinancialData() {
  let loaded = false;

  // 1. Intentar conexión a la API del servidor local si está activo
  try {
    const res = await fetch('/api/data', { cache: 'no-cache' });
    if (res.ok) {
      dbData = await res.json();
      dataStorageMode = 'server';
      loaded = true;
    }
  } catch (_) {}

  // 2. Si no hay servidor local disponible (entorno estático / Vercel / Sandbox), activar modo autónomo
  if (!loaded) {
    dataStorageMode = 'autonomous';
    let stored = null;
    try {
      stored = localStorage.getItem('FINCONTROL_DB_V1');
    } catch (_) {}

    if (stored) {
      try {
        dbData = JSON.parse(stored);
        loaded = true;
      } catch (_) {
        stored = null;
      }
    }

    // Si aún no hay datos en localStorage, inicializar desde datos precompilados seguros
    if (!loaded) {
      if (typeof INITIAL_FINCONTROL_DATA !== 'undefined' && INITIAL_FINCONTROL_DATA) {
        dbData = JSON.parse(JSON.stringify(INITIAL_FINCONTROL_DATA));
        loaded = true;
        try {
          localStorage.setItem('FINCONTROL_DB_V1', JSON.stringify(dbData));
        } catch (_) {}
      } else {
        try {
          const jsonRes = await fetch('database.json');
          if (jsonRes.ok) {
            dbData = await jsonRes.json();
            loaded = true;
            try {
              localStorage.setItem('FINCONTROL_DB_V1', JSON.stringify(dbData));
            } catch (_) {}
          }
        } catch (err) {
          console.warn('[FinControl] No se pudo cargar datos iniciales:', err);
        }
      }
    }
  }

  if (dbData.configuracion && dbData.configuracion.entidad) {
    const sub = document.getElementById('brandSubtitle');
    if (sub) sub.textContent = dbData.configuracion.entidad;
  }
  updateUserProfileBadges();
}

// --- ACTUALIZAR INDICADORES DE PERFIL DE USUARIO ---
function updateUserProfileBadges() {
  const users = dbData.usuarios || [];
  const activeId = (dbData.configuracion && dbData.configuracion.usuario_activo_id) || 'USR-01';
  const activeUser = users.find(u => u.id === activeId) || users[0] || { nombre: 'Admin', rol: 'Administrador' };

  const sideName = document.getElementById('sidebarUserName');
  const sideRole = document.getElementById('sidebarUserRole');
  const topName = document.getElementById('topbarUserName');
  const topRole = document.getElementById('topbarUserRole');

  if (sideName) sideName.textContent = activeUser.nombre;
  if (sideRole) {
    sideRole.textContent = activeUser.rol === 'Administrador' ? 'Admin' : 'Usuario';
    sideRole.className = 'user-role-badge ' + (activeUser.rol === 'Administrador' ? 'admin' : 'usuario');
  }

  if (topName) topName.textContent = activeUser.nombre;
  if (topRole) {
    topRole.textContent = activeUser.rol;
    topRole.className = 'user-role-badge ' + (activeUser.rol === 'Administrador' ? 'admin' : 'usuario');
  }
}

// --- CONTROL DEL MENÚ DESPLEGABLE (COLAPSABLE / OFF-CANVAS) ---
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isCompact = window.innerWidth <= 1024;

  if (isCompact) {
    if (sidebar) sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active', sidebar && sidebar.classList.contains('open'));
  } else {
    document.body.classList.toggle('sidebar-collapsed');
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 320);
  }
}

function closeSidebarOnMobile() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

// --- NAVEGACIÓN ENTRE LAS 11 VISTAS (SPA) ---
function navigateTo(viewId) {
  closeSidebarOnMobile();
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.menu-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
  });

  const titles = VIEW_TITLES[viewId] || [viewId, ''];
  const tEl = document.getElementById('pageTitle');
  const sEl = document.getElementById('pageSubtitle');
  if (tEl) tEl.textContent = titles[0];
  if (sEl) sEl.textContent = titles[1];

  const filtersEl = document.getElementById('dashboardFilters');
  if (filtersEl) {
    filtersEl.style.display = (viewId === 'vista-dashboard' || viewId === 'vista-planes') ? 'flex' : 'none';
    // En inicio mostramos selector de mes integrado en el banner
  }

  currentView = viewId;
  destroyAllCharts();

  switch (viewId) {
    case 'vista-inicio':
      renderHomeView();
      break;
    case 'vista-dashboard':
      renderDashboardView();
      break;
    case 'vista-progreso':
      renderProgresoRatiosView();
      break;
    case 'vista-planes':
      renderHierarchicalMatrix();
      renderPlanesAccionCards();
      break;
    case 'vista-esf':
      renderESFView();
      break;
    case 'vista-efe':
      renderEFEView();
      break;
    case 'vista-registro-efe':
      renderTablaEFE();
      break;
    case 'vista-registro-esf':
      renderTablaESF();
      break;
    case 'vista-presupuesto':
      renderTablaPresupuesto();
      break;
    case 'vista-objetivos':
      renderObjetivosView();
      break;
    case 'vista-leeme':
    case 'vista-configuracion':
      // Estas secciones fueron simplificadas — redirigir a Inicio
      navigateTo('vista-inicio');
      return;
    default:
      break;
  }
}

function destroyAllCharts() {
  Object.keys(activeCharts).forEach(key => {
    try {
      if (activeCharts[key] && typeof activeCharts[key].destroy === 'function') {
        activeCharts[key].destroy();
      }
    } catch (e) {
      console.warn('Chart destroy error:', e);
    }
  });
  activeCharts = {};
}

// --- FILTROS DE DASHBOARD (MES, TIPO, CATEGORÍA) ---
function selectMonthFilter(mes) {
  const mStr = mes.toString();
  if (mStr !== 'all' && isFutureMonth(parseInt(mStr, 10))) {
    // Si el usuario intenta seleccionar un mes futuro
    alert(`📅 Simulación en Tiempo Real: El mes de ${MESES_NOMBRES[parseInt(mStr, 10) - 1]} aún no ha transcurrido en el año ${CURRENT_YEAR}. El sistema te muestra con total realismo hasta el mes actual (${MESES_NOMBRES[CURRENT_MONTH - 1]}) y los cierres de meses anteriores.`);
    return;
  }
  filterMonth = mStr;
  syncMonthPillsUI();

  // Sincronizar el select de Inicio si existe
  const inicioSel = document.getElementById('inicio-mes-sel');
  if (inicioSel && mStr !== 'all') {
    inicioSel.value = mStr;
  }

  refreshActiveView();
}

function cambiarMesInicio(mes) {
  selectMonthFilter(mes);
}

function syncMonthPillsUI() {
  document.querySelectorAll('#monthPills .month-pill').forEach(btn => {
    const btnMes = btn.getAttribute('data-mes');
    if (btnMes !== 'all') {
      const mNum = parseInt(btnMes, 10);
      const isFut = isFutureMonth(mNum);
      const isCurr = mNum === CURRENT_MONTH;

      btn.disabled = isFut;
      btn.classList.toggle('disabled', isFut);
      btn.classList.toggle('current-month-indicator', isCurr);
      if (isFut) {
        btn.title = `Mes futuro (${MESES_NOMBRES[mNum - 1]} ${CURRENT_YEAR}) - Aún no iniciado`;
      } else if (isCurr) {
        btn.title = `Mes Actual en Curso (${MESES_NOMBRES[mNum - 1]} ${CURRENT_YEAR})`;
      } else {
        btn.title = `Mes Cerrado Auditado (${MESES_NOMBRES[mNum - 1]} ${CURRENT_YEAR})`;
      }
    }
    btn.classList.toggle('active', btnMes === filterMonth);
  });

  // También sincronizar opciones del select en Inicio
  const inicioSel = document.getElementById('inicio-mes-sel');
  if (inicioSel) {
    Array.from(inicioSel.options).forEach(opt => {
      const mNum = parseInt(opt.value, 10);
      const isFut = isFutureMonth(mNum);
      opt.disabled = isFut;
      if (isFut) {
        opt.textContent = `${MESES_NOMBRES[mNum - 1]} (Por iniciar)`;
      } else if (mNum === CURRENT_MONTH) {
        opt.textContent = `${MESES_NOMBRES[mNum - 1]} (Mes Actual)`;
      } else {
        opt.textContent = `${MESES_NOMBRES[mNum - 1]} (Cerrado)`;
      }
    });
    inicioSel.value = filterMonth !== 'all' ? filterMonth : CURRENT_MONTH.toString();
  }
}

function selectTypeFilter(tipo) {
  filterType = tipo;
  document.querySelectorAll('#typePills .type-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tipo') === filterType);
  });
  refreshActiveView();
}

function applyCategoryFilter(cat) {
  filterCategory = cat;
  refreshActiveView();
}

function resetAllFilters() {
  filterMonth = CURRENT_MONTH.toString();
  filterType = 'all';
  filterCategory = 'all';

  syncMonthPillsUI();
  document.querySelectorAll('#typePills .type-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tipo') === 'all');
  });
  const catSel = document.getElementById('categoriaFilterSelect');
  if (catSel) catSel.value = 'all';

  refreshActiveView();
}

function refreshActiveView() {
  if (currentView === 'vista-dashboard') renderDashboardView();
  else if (currentView === 'vista-inicio') renderHomeView();
  else if (currentView === 'vista-planes') { renderHierarchicalMatrix(); renderPlanesAccionCards(); }
  else if (currentView === 'vista-progreso') renderProgresoRatiosView();
  else if (currentView === 'vista-esf') renderESFView();
  else if (currentView === 'vista-efe') renderEFEView();
  else if (currentView === 'vista-registro-efe') renderTablaEFE();
  else if (currentView === 'vista-registro-esf') renderTablaESF();
  else if (currentView === 'vista-presupuesto') renderTablaPresupuesto();
}

function populateCategoryDropdown() {
  const sel = document.getElementById('categoriaFilterSelect');
  if (!sel) return;
  const cats = new Set();
  (dbData.registro_efe || []).forEach(r => {
    if (r.Categoria) cats.add(r.Categoria);
  });
  sel.innerHTML = '<option value="all">Todas las Categorías</option>';
  Array.from(cats).sort().forEach(c => {
    sel.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

function getFilteredEFERows() {
  return (dbData.registro_efe || []).filter(r => {
    const matchMes = (filterMonth === 'all') || (r.Mes.toString() === filterMonth);
    const matchTipo = (filterType === 'all') || (r.Tipo === filterType);
    const matchCat = (filterCategory === 'all') || (r.Categoria === filterCategory);
    return matchMes && matchTipo && matchCat;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. VISTA: DASHBOARD PRINCIPAL (LOS 9 GRÁFICOS - IMAGEN 1)
// ═══════════════════════════════════════════════════════════════════════════
function renderDashboardView() {
  destroyAllCharts();
  const rows = getFilteredEFERows();
  const moneda = (dbData.configuracion && dbData.configuracion.moneda) || "S/.";

  let totIngPpto = 0, totIngAct = 0;
  let totGasPpto = 0, totGasAct = 0;
  let totAhoPpto = 0, totAhoAct = 0;
  let totDeuPpto = 0, totDeuAct = 0;

  rows.forEach(r => {
    if (r.Tipo === 'Ingreso') {
      totIngPpto += r.Presupuesto || 0;
      totIngAct += r.Actual || 0;
    } else if (r.Tipo === 'Gasto') {
      totGasPpto += r.Presupuesto || 0;
      totGasAct += r.Actual || 0;
    } else if (r.Tipo === 'Ahorro e Inversión') {
      totAhoPpto += r.Presupuesto || 0;
      totAhoAct += r.Actual || 0;
    } else if (r.Tipo === 'Deuda') {
      totDeuPpto += r.Presupuesto || 0;
      totDeuAct += r.Actual || 0;
    }
  });

  setKpi('dash-kpi-ingresos', `${moneda} ${formatNumber(totIngAct)}`);
  setKpi('dash-ppto-ingresos', `${moneda} ${formatNumber(totIngPpto)}`);
  setDeltaBadge('dash-delta-ingresos', totIngPpto, totIngAct, true);

  setKpi('dash-kpi-gastos', `${moneda} ${formatNumber(totGasAct)}`);
  setKpi('dash-ppto-gastos', `${moneda} ${formatNumber(totGasPpto)}`);
  setDeltaBadge('dash-delta-gastos', totGasPpto, totGasAct, false);

  setKpi('dash-kpi-ahorro', `${moneda} ${formatNumber(totAhoAct)}`);
  setKpi('dash-ppto-ahorro', `${moneda} ${formatNumber(totAhoPpto)}`);
  setDeltaBadge('dash-delta-ahorro', totAhoPpto, totAhoAct, true);

  setKpi('dash-kpi-deuda', `${moneda} ${formatNumber(totDeuAct)}`);
  setKpi('dash-ppto-deuda', `${moneda} ${formatNumber(totDeuPpto)}`);
  setDeltaBadge('dash-delta-deuda', totDeuPpto, totDeuAct, false);

  // ════════════════════════════════════════════════════════════════════════
  // ⚡ PSICOLOGÍA DEL COLOR Y DIAGNÓSTICO REACTIVO (ALEGRE VS ALERTA)
  // ════════════════════════════════════════════════════════════════════════
  const saldoLibre = totIngAct - totGasAct - totAhoAct - totDeuAct;
  const ratioDeuda = totIngAct > 0 ? (totDeuAct / totIngAct) * 100 : 0;
  const ratioGasto = totIngAct > 0 ? (totGasAct / totIngAct) * 100 : 0;
  const ratioAhorro = totIngAct > 0 ? (totAhoAct / totIngAct) * 100 : 0;
  const esBalanceAlegre = (saldoLibre >= 0) && (ratioDeuda <= 35) && (ratioGasto <= 50);

  const bannerEl = document.getElementById('dash-balance-banner');
  const bIcon = document.getElementById('dbb-icon');
  const bTitle = document.getElementById('dbb-title');
  const bSub = document.getElementById('dbb-sub');
  const bBadge = document.getElementById('dbb-badge');

  if (bannerEl) {
    bannerEl.className = 'dynamic-balance-banner ' + (esBalanceAlegre ? 'balance-happy' : 'balance-alert');
    if (bIcon) bIcon.textContent = esBalanceAlegre ? '🌟' : '🚨';
    if (bTitle) {
      bTitle.textContent = esBalanceAlegre
        ? '¡Excelente Balance! Tus finanzas operan con superávit y disciplina'
        : '⚠️ Alerta de Flujo: Tus compromisos de gasto y deuda superan el balance recomendado';
    }
    if (bSub) {
      bSub.textContent = esBalanceAlegre
        ? `Tus ingresos (${moneda} ${formatNumber(totIngAct)}) cubren todas tus obligaciones con ${moneda} ${formatNumber(saldoLibre)} libres. Tu tasa de ahorro es del ${ratioAhorro.toFixed(1)}%.`
        : `Tus deudas absorben el ${ratioDeuda.toFixed(1)}% de lo que ganas y tus gastos el ${ratioGasto.toFixed(1)}%. Revisa las 3 sugerencias inmediatas para equilibrarte.`;
    }
    if (bBadge) {
      bBadge.textContent = esBalanceAlegre ? '✨ SALUD FINANCIERA ÓPTIMA' : '🔴 ACCIÓN REQUERIDA';
      bBadge.style.color = esBalanceAlegre ? '#15803d' : '#b91c1c';
    }
  }

  // 💡 ACTUALIZAR CENTRO DE SUGERENCIAS INTELIGENTES
  const scDeudaText = document.getElementById('sc-deuda-text');
  const scDeudaTag = document.getElementById('sc-deuda-tag');
  if (scDeudaText) {
    if (ratioDeuda > 35) {
      scDeudaText.textContent = `Tu nivel de deuda está en ${ratioDeuda.toFixed(1)}% (S/. ${formatNumber(totDeuAct)}). Sugerencia: Congela nuevas cuotas y prioriza amortizar la deuda de mayor interés.`;
      if (scDeudaTag) { scDeudaTag.className = 'sc-tag danger'; scDeudaTag.textContent = 'Alerta Crítica'; }
    } else {
      scDeudaText.textContent = `Tu ratio de deuda (${ratioDeuda.toFixed(1)}%) se encuentra dentro del rango seguro (≤25%). Excelente control de crédito.`;
      if (scDeudaTag) { scDeudaTag.className = 'sc-tag success'; scDeudaTag.textContent = 'Bajo Control'; }
    }
  }

  // Identificar mayor categoría de gasto
  let maxCatName = 'Varios', maxCatMonto = 0;
  rows.filter(r => r.Tipo === 'Gasto').forEach(r => {
    if ((r.Actual || 0) > maxCatMonto) {
      maxCatMonto = r.Actual;
      maxCatName = r.Categoria;
    }
  });

  const scGastoText = document.getElementById('sc-gasto-text');
  const scGastoTag = document.getElementById('sc-gasto-tag');
  if (scGastoText) {
    scGastoText.textContent = `Mayor gasto: '${maxCatName}' con ${moneda} ${formatNumber(maxCatMonto)}. Reducir un 10% en esta categoría liberaría ${moneda} ${formatNumber(maxCatMonto * 0.1)} al mes para tu ahorro.`;
    if (scGastoTag) { scGastoTag.className = ratioGasto > 45 ? 'sc-tag warning' : 'sc-tag success'; scGastoTag.textContent = ratioGasto > 45 ? 'Oportunidad de Ahorro' : 'Gasto Moderado'; }
  }

  const scProyText = document.getElementById('sc-proyeccion-text');
  if (scProyText) {
    const ahorroBase = totAhoAct > 0 ? totAhoAct : 500;
    const proyectado12M = (ahorroBase * 12) * 1.07;
    scProyText.textContent = `Si ahorras ${moneda} ${formatNumber(ahorroBase)} cada mes, acumularás ${moneda} ${formatNumber(proyectado12M)} en 1 año (estimando 7% de rendimiento anual compuesto).`;
  }

  const chartTheme = {
    fontFamily: 'Inter, sans-serif',
    foreColor: '#64748b',
    toolbar: { show: false }
  };

  // Gráfico 1: TIPO (Presupuesto & Real) — Barras Volumétricas con Relieve y Sombra
  const tiposLabels = ['Ingreso', 'Gasto', 'Ahorro/Inv.', 'Deuda'];
  const pptoTipos = [totIngPpto, totGasPpto, totAhoPpto, totDeuPpto];
  const actTipos = [totIngAct, totGasAct, totAhoAct, totDeuAct];

  // Gráfico 1: TIPO con relieve 3D, sombras de proyección y colores dinámicos
  const colorActual = esBalanceAlegre ? '#10b981' : '#f59e0b';
  const colorActualGrad = esBalanceAlegre ? '#34d399' : '#fbbf24';

  activeCharts['chart-tipo-ppto-real'] = new ApexCharts(document.getElementById('chart-tipo-ppto-real'), {
    chart: {
      type: 'bar',
      height: 270,
      toolbar: { show: false },
      dropShadow: { enabled: true, top: 4, left: 1, blur: 5, color: '#000000', opacity: 0.15 }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 8,
        borderRadiusApplication: 'end',
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -16,
      style: { fontSize: '10px', fontWeight: '800', colors: ['#1e40af', '#047857'] },
      formatter: (v) => `${moneda} ${formatNumber(v)}`
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    series: [
      { name: 'Presupuesto Planeado', data: pptoTipos },
      { name: 'Ejecutado Real', data: actTipos }
    ],
    colors: ['#3b82f6', colorActual],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.45,
        gradientToColors: ['#60a5fa', colorActualGrad],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.85,
        stops: [0, 90, 100]
      }
    },
    xaxis: { categories: tiposLabels, labels: { style: { fontWeight: 600 } } },
    yaxis: { max: max => Math.round(max * 1.15), labels: { formatter: (v) => `${moneda} ${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}` } },
    tooltip: { y: { formatter: (val) => `${moneda} ${formatNumber(val)}` } }
  });
  activeCharts['chart-tipo-ppto-real'].render();

  // Gráfico 2: CATEGORÍA (Presupuesto & Real) — Barras Horizontales con Relieve
  const catMap = {};
  rows.forEach(r => {
    if (!catMap[r.Categoria]) catMap[r.Categoria] = { ppto: 0, act: 0 };
    catMap[r.Categoria].ppto += r.Presupuesto || 0;
    catMap[r.Categoria].act += r.Actual || 0;
  });

  const catNames = Object.keys(catMap);
  const catPpto = catNames.map(c => catMap[c].ppto);
  const catAct = catNames.map(c => catMap[c].act);

  activeCharts['chart-cat-ppto-real'] = new ApexCharts(document.getElementById('chart-cat-ppto-real'), {
    chart: { type: 'bar', height: 260, toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '62%',
        borderRadius: 6,
        borderRadiusApplication: 'end'
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    series: [
      { name: 'Actual', data: catAct },
      { name: 'Presupuesto', data: catPpto }
    ],
    colors: ['#0284c7', '#93c5fd'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'horizontal',
        shadeIntensity: 0.3,
        gradientToColors: ['#38bdf8', '#bfdbfe'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.9,
        stops: [0, 100]
      }
    },
    xaxis: { categories: catNames, labels: { formatter: (v) => `${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}` } },
    tooltip: { y: { formatter: (val) => `${moneda} ${formatNumber(val)}` } }
  });
  activeCharts['chart-cat-ppto-real'].render();

  // Gráfico 3: SUBCATEGORÍA (Presupuesto & Real)
  const subMap = {};
  rows.forEach(r => {
    if (!subMap[r.Subcategoria]) subMap[r.Subcategoria] = { ppto: 0, act: 0 };
    subMap[r.Subcategoria].ppto += r.Presupuesto || 0;
    subMap[r.Subcategoria].act += r.Actual || 0;
  });
  const subNames = Object.keys(subMap).slice(0, 6);
  const subPpto = subNames.map(s => subMap[s].ppto);
  const subAct = subNames.map(s => subMap[s].act);

  activeCharts['chart-subcat-ppto-real'] = new ApexCharts(document.getElementById('chart-subcat-ppto-real'), {
    chart: { type: 'bar', height: 260, toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '58%',
        borderRadius: 6,
        borderRadiusApplication: 'end'
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    series: [
      { name: 'Actual', data: subAct },
      { name: 'Presupuesto', data: subPpto }
    ],
    colors: ['#0d9488', '#99f6e4'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'horizontal',
        gradientToColors: ['#14b8a6', '#ccfbf1'],
        stops: [0, 100]
      }
    },
    xaxis: { categories: subNames },
    tooltip: { y: { formatter: (val) => `${moneda} ${formatNumber(val)}` } }
  });
  activeCharts['chart-subcat-ppto-real'].render();

  // Gráfico 4: TIPO (Mensual - Área Spline con Doble Flujo Gradiente y Puntos Flotantes)
  const mesesArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const pptoMensual = mesesArr.map(m => {
    return (dbData.registro_efe || [])
      .filter(r => r.Mes === m && (filterType === 'all' ? true : r.Tipo === filterType))
      .reduce((acc, x) => acc + (x.Presupuesto || 0), 0);
  });
  const actMensual = mesesArr.map(m => {
    if (isFutureMonth(m)) return null; // Meses futuros aún no transcurridos no tienen ejecución real
    return (dbData.registro_efe || [])
      .filter(r => r.Mes === m && (filterType === 'all' ? true : r.Tipo === filterType))
      .reduce((acc, x) => acc + (x.Actual || 0), 0);
  });

  // Gráfico 4: Evolución Spline limpia SIN badges amontonados y con sombra de profundidad
  activeCharts['chart-tipo-mensual'] = new ApexCharts(document.getElementById('chart-tipo-mensual'), {
    chart: {
      type: 'area',
      height: 270,
      toolbar: { show: false },
      dropShadow: { enabled: true, top: 4, left: 1, blur: 6, color: '#2563eb', opacity: 0.18 }
    },
    dataLabels: { enabled: false }, // Desactivado para eliminar etiquetas amontonadas
    stroke: { curve: 'smooth', width: [2.5, 3.5] },
    markers: {
      size: 5,
      strokeColors: '#ffffff',
      strokeWidth: 2.5,
      hover: { size: 8 }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.45,
        gradientToColors: ['#93c5fd', '#6ee7b7'],
        opacityFrom: 0.55,
        opacityTo: 0.04,
        stops: [0, 85, 100]
      }
    },
    series: [
      { name: 'Presupuesto Planificado', data: pptoMensual },
      { name: 'Ejecución Real', data: actMensual }
    ],
    colors: ['#3b82f6', '#10b981'],
    xaxis: { categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'] },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (val) => `${moneda} ${formatNumber(val)}` }
    }
  });
  activeCharts['chart-tipo-mensual'].render();

  // Gráfico 5: CATEGORÍA (Presupuesto) [Donut Volumétrico con HUD Central]
  const catDonutNames = Object.keys(catMap).slice(0, 6);
  const catDonutPpto = catDonutNames.map(c => catMap[c].ppto);

  activeCharts['chart-cat-presupuesto-donut'] = new ApexCharts(document.getElementById('chart-cat-presupuesto-donut'), {
    chart: {
      type: 'donut',
      height: 290,
      toolbar: { show: false },
      dropShadow: { enabled: true, top: 4, left: 0, blur: 8, color: '#000', opacity: 0.15 }
    },
    labels: catDonutNames,
    series: catDonutPpto.length ? catDonutPpto : [1],
    colors: ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'],
    stroke: { width: 2.5, colors: ['#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (val) => val >= 6 ? val.toFixed(1) + '%' : '',
      style: { fontSize: '11px', fontWeight: '800', colors: ['#ffffff'] },
      dropShadow: { enabled: true, top: 1, blur: 2, opacity: 0.6 }
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      fontWeight: 600,
      formatter: function(seriesName, opts) {
        const val = opts.w.globals.series[opts.seriesIndex];
        const tot = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
        return seriesName + ': ' + pct + '% (' + moneda + ' ' + formatNumber(val) + ')';
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '64%',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px', fontWeight: 600, color: '#64748b', offsetY: -4 },
            value: {
              show: true,
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              offsetY: 4,
              formatter: val => `${moneda} ${formatNumber(val)}`
            },
            total: {
              show: true,
              label: 'TOTAL PPTO',
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              formatter: w => `${moneda} ${formatNumber(w.globals.seriesTotals.reduce((a, b) => a + b, 0))}`
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const tot = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
          return `${moneda} ${formatNumber(val)} (${pct}%)`;
        }
      }
    }
  });
  activeCharts['chart-cat-presupuesto-donut'].render();

  // Gráfico 6: SUBCATEGORÍA (Presupuesto) [Donut con HUD Central]
  const subDonutNames = Object.keys(subMap).slice(0, 5);
  const subDonutPpto = subDonutNames.map(s => subMap[s].ppto);

  activeCharts['chart-subcat-presupuesto-donut'] = new ApexCharts(document.getElementById('chart-subcat-presupuesto-donut'), {
    chart: {
      type: 'donut',
      height: 290,
      toolbar: { show: false },
      dropShadow: { enabled: true, top: 4, left: 0, blur: 8, color: '#000', opacity: 0.15 }
    },
    labels: subDonutNames,
    series: subDonutPpto.length ? subDonutPpto : [1],
    colors: ['#1d4ed8', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'],
    stroke: { width: 2.5, colors: ['#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (val) => val >= 6 ? val.toFixed(1) + '%' : '',
      style: { fontSize: '11px', fontWeight: '800', colors: ['#ffffff'] },
      dropShadow: { enabled: true, top: 1, blur: 2, opacity: 0.6 }
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      fontWeight: 600,
      formatter: function(seriesName, opts) {
        const val = opts.w.globals.series[opts.seriesIndex];
        const tot = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
        return seriesName + ': ' + pct + '% (' + moneda + ' ' + formatNumber(val) + ')';
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '64%',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px', fontWeight: 600, color: '#64748b', offsetY: -4 },
            value: {
              show: true,
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              offsetY: 4,
              formatter: val => `${moneda} ${formatNumber(val)}`
            },
            total: {
              show: true,
              label: 'TOTAL',
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              formatter: w => `${moneda} ${formatNumber(w.globals.seriesTotals.reduce((a, b) => a + b, 0))}`
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const tot = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
          return `${moneda} ${formatNumber(val)} (${pct}%)`;
        }
      }
    }
  });
  activeCharts['chart-subcat-presupuesto-donut'].render();

  // Gráfico 7: TIPO ACUMULADO (Mensual) — Flujo Acumulado con Gradiente Volumétrico
  let acumPpto = 0, acumAct = 0;
  const pptoAcumArr = pptoMensual.map(v => acumPpto += (v || 0));
  const actAcumArr = actMensual.map((v, idx) => {
    const m = mesesArr[idx];
    if (isFutureMonth(m)) return null;
    acumAct += (v || 0);
    return acumAct;
  });

  activeCharts['chart-tipo-acumulado'] = new ApexCharts(document.getElementById('chart-tipo-acumulado'), {
    chart: { type: 'area', height: 260, toolbar: { show: false } },
    stroke: { curve: 'smooth', width: [2.5, 3.5] },
    markers: { size: 4, strokeColors: '#ffffff', strokeWidth: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#cbd5e1', '#60a5fa'],
        opacityFrom: 0.5,
        opacityTo: 0.04,
        stops: [0, 85, 100]
      }
    },
    series: [
      { name: 'Presupuesto Acum.', data: pptoAcumArr },
      { name: 'Actual Acum.', data: actAcumArr }
    ],
    colors: ['#94a3b8', '#2563eb'],
    xaxis: { categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'] },
    tooltip: { y: { formatter: (val) => `${moneda} ${formatNumber(val)}` } }
  });
  activeCharts['chart-tipo-acumulado'].render();

  // Gráfico 8: CATEGORÍA (Real) [Donut Volumétrico con HUD Central]
  const catDonutAct = catDonutNames.map(c => catMap[c].act);
  activeCharts['chart-cat-real-donut'] = new ApexCharts(document.getElementById('chart-cat-real-donut'), {
    chart: {
      type: 'donut',
      height: 290,
      toolbar: { show: false },
      dropShadow: { enabled: true, top: 4, left: 0, blur: 8, color: '#000', opacity: 0.15 }
    },
    labels: catDonutNames,
    series: catDonutAct.length ? catDonutAct : [1],
    colors: ['#0284c7', '#d97706', '#059669', '#dc2626', '#7c3aed', '#0891b2'],
    stroke: { width: 2.5, colors: ['#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (val) => val >= 6 ? val.toFixed(1) + '%' : '',
      style: { fontSize: '11px', fontWeight: '800', colors: ['#ffffff'] },
      dropShadow: { enabled: true, top: 1, blur: 2, opacity: 0.6 }
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      fontWeight: 600,
      formatter: function(seriesName, opts) {
        const val = opts.w.globals.series[opts.seriesIndex];
        const tot = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
        return seriesName + ': ' + pct + '% (' + moneda + ' ' + formatNumber(val) + ')';
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '64%',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px', fontWeight: 600, color: '#64748b', offsetY: -4 },
            value: {
              show: true,
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              offsetY: 4,
              formatter: val => `${moneda} ${formatNumber(val)}`
            },
            total: {
              show: true,
              label: 'TOTAL REAL',
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              formatter: w => `${moneda} ${formatNumber(w.globals.seriesTotals.reduce((a, b) => a + b, 0))}`
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const tot = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
          return `${moneda} ${formatNumber(val)} (${pct}%)`;
        }
      }
    }
  });
  activeCharts['chart-cat-real-donut'].render();

  // Gráfico 9: SUBCATEGORÍA (Actual) [Donut Volumétrico con HUD Central]
  const subDonutAct = subDonutNames.map(s => subMap[s].act);
  activeCharts['chart-subcat-real-donut'] = new ApexCharts(document.getElementById('chart-subcat-real-donut'), {
    chart: {
      type: 'donut',
      height: 290,
      toolbar: { show: false },
      dropShadow: { enabled: true, top: 4, left: 0, blur: 8, color: '#000', opacity: 0.15 }
    },
    labels: subDonutNames,
    series: subDonutAct.length ? subDonutAct : [1],
    colors: ['#0369a1', '#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd'],
    stroke: { width: 2.5, colors: ['#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (val) => val >= 6 ? val.toFixed(1) + '%' : '',
      style: { fontSize: '11px', fontWeight: '800', colors: ['#ffffff'] },
      dropShadow: { enabled: true, top: 1, blur: 2, opacity: 0.6 }
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      fontWeight: 600,
      formatter: function(seriesName, opts) {
        const val = opts.w.globals.series[opts.seriesIndex];
        const tot = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
        return seriesName + ': ' + pct + '% (' + moneda + ' ' + formatNumber(val) + ')';
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '64%',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px', fontWeight: 600, color: '#64748b', offsetY: -4 },
            value: {
              show: true,
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              offsetY: 4,
              formatter: val => `${moneda} ${formatNumber(val)}`
            },
            total: {
              show: true,
              label: 'TOTAL REAL',
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              formatter: w => `${moneda} ${formatNumber(w.globals.seriesTotals.reduce((a, b) => a + b, 0))}`
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const tot = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
          return `${moneda} ${formatNumber(val)} (${pct}%)`;
        }
      }
    }
  });
  activeCharts['chart-subcat-real-donut'].render();

}

// ═══════════════════════════════════════════════════════════════════════════
// 9. VISTA: PROGRESO (SCORE HISTÓRICO Y 4 PILARES INDEPENDIENTES)
function renderProgresoRatiosView() {
  destroyAllCharts();

  const db = dbData;
  const mesesArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const mesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  const efeData = db.registro_efe || [];
  const esfData = db.registro_esf || [];

  // Datos mensuales reales (null para meses futuros no transcurridos)
  const dataGasto = mesesArr.map(m => {
    if (isFutureMonth(m)) return null;
    const rows = efeData.filter(r => r.Mes === m);
    const ing = rows.filter(r => r.Tipo === 'Ingreso').reduce((a, r) => a + (r.Actual || 0), 0);
    const gas = rows.filter(r => r.Tipo === 'Gasto').reduce((a, r) => a + (r.Actual || 0), 0);
    return ing > 0 ? parseFloat(((gas / ing) * 100).toFixed(1)) : 63.6;
  });

  const dataAhorro = mesesArr.map(m => {
    if (isFutureMonth(m)) return null;
    const rows = efeData.filter(r => r.Mes === m);
    const ing = rows.filter(r => r.Tipo === 'Ingreso').reduce((a, r) => a + (r.Actual || 0), 0);
    const aho = rows.filter(r => r.Tipo === 'Ahorro e Inversión').reduce((a, r) => a + (r.Actual || 0), 0);
    return ing > 0 ? parseFloat(((aho / ing) * 100).toFixed(1)) : 19.5;
  });

  const dataDeuda = mesesArr.map(m => {
    if (isFutureMonth(m)) return null;
    const rows = efeData.filter(r => r.Mes === m);
    const ing = rows.filter(r => r.Tipo === 'Ingreso').reduce((a, r) => a + (r.Actual || 0), 0);
    const deu = rows.filter(r => r.Tipo === 'Deuda').reduce((a, r) => a + (r.Actual || 0), 0);
    return ing > 0 ? parseFloat(((deu / ing) * 100).toFixed(1)) : 16.6;
  });

  const dataLiquidez = mesesArr.map(m => {
    if (isFutureMonth(m)) return null;
    const rows = efeData.filter(r => r.Mes === m);
    const gas = rows.filter(r => r.Tipo === 'Gasto').reduce((a, r) => a + (r.Actual || 0), 0);
    const esf = esfData.find(e => e.Mes === m);
    const actLiq = esf ? (esf.Activos_Liquidos || 0) : 0;
    return gas > 0 ? parseFloat((actLiq / gas).toFixed(1)) : 8.0;
  });

  // Cálculo del Score de Salud Financiera (0 a 100 pts) mes a mes
  const scoreHistory = mesesArr.map(m => {
    if (isFutureMonth(m)) return null; // sin dato para meses futuros
    const g = dataGasto[m - 1];
    const a = dataAhorro[m - 1];
    const d = dataDeuda[m - 1];
    const l = dataLiquidez[m - 1];

    let pts = 0;
    // Liquidez (max 25 pts)
    if (l >= 6) pts += 25;
    else pts += Math.round((l / 6) * 25);

    // Gasto (max 25 pts)
    if (g <= 60) pts += 25;
    else if (g <= 65) pts += 20;
    else pts += 10;

    // Ahorro (max 25 pts)
    if (a >= 20) pts += 25;
    else pts += Math.round((a / 20) * 25);

    // Deuda (max 25 pts)
    if (d <= 20) pts += 25;
    else if (d <= 25) pts += 20;
    else pts += 10;

    return pts;
  });

  // ── 1. GRÁFICA MAESTRA: EVOLUCIÓN HISTÓRICA DEL SCORE (0 A 100 PTS) ─────────
  const elScore = document.getElementById('chart-health-score-history');
  if (elScore) {
    activeCharts['chart-health-score-history'] = new ApexCharts(elScore, {
      chart: {
        type: 'area',
        height: 290,
        toolbar: { show: false },
        dropShadow: { enabled: true, top: 4, left: 1, blur: 8, opacity: 0.15 }
      },
      stroke: { curve: 'smooth', width: 3.5 },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          opacityFrom: 0.5,
          opacityTo: 0.05,
          stops: [0, 85, 100]
        }
      },
      colors: ['#02c076'],
      series: [{ name: 'Score de Salud FICO', data: scoreHistory }],
      xaxis: {
        categories: mesLabels,
        labels: { style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' } }
      },
      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: { formatter: v => v + ' pts' }
      },
      markers: {
        size: 5,
        strokeWidth: 2,
        strokeColors: '#ffffff',
        hover: { size: 8 }
      },
      annotations: {
        yaxis: [
          {
            y: 80,
            borderColor: '#02c076',
            strokeDashArray: 4,
            label: {
              text: 'Nivel Óptimo (80 pts)',
              style: { color: '#ffffff', background: '#02c076', fontSize: '10px', fontWeight: 700 }
            }
          },
          {
            y: 60,
            borderColor: '#3b82f6',
            strokeDashArray: 4,
            label: {
              text: 'Nivel Saludable (60 pts)',
              style: { color: '#ffffff', background: '#3b82f6', fontSize: '10px', fontWeight: 700 }
            }
          }
        ]
      },
      tooltip: {
        y: { formatter: v => v + ' Puntos FICO (Saludable)' }
      }
    });
    activeCharts['chart-health-score-history'].render();
  }

  // Helper para crear micro-gráficas limpias sin colisiones
  function buildCleanSparkline(elId, dataSeries, metaValue, color, isPercent, unit, isMaxCeiling) {
    const el = document.getElementById(elId);
    if (!el) return;

    activeCharts[elId] = new ApexCharts(el, {
      chart: {
        type: 'area',
        height: 140,
        toolbar: { show: false },
        sparkline: { enabled: false },
        dropShadow: { enabled: true, top: 2, blur: 4, opacity: 0.1 }
      },
      stroke: { curve: 'smooth', width: 2.5 },
      fill: {
        type: 'gradient',
        gradient: { opacityFrom: 0.4, opacityTo: 0.05 }
      },
      colors: [color],
      series: [{ name: 'Valor', data: dataSeries }],
      xaxis: {
        categories: mesLabels,
        labels: { style: { fontSize: '9px', fontWeight: 600, colors: '#94a3b8' } }
      },
      yaxis: {
        labels: { formatter: v => v.toFixed(0) + (isPercent ? '%' : unit) }
      },
      annotations: {
        yaxis: [{
          y: metaValue,
          borderColor: isMaxCeiling ? '#ef4444' : '#02c076',
          strokeDashArray: 4,
          label: {
            text: (isMaxCeiling ? 'Tope: ' : 'Meta: ') + metaValue + (isPercent ? '%' : unit),
            style: {
              color: '#ffffff',
              background: isMaxCeiling ? '#ef4444' : '#02c076',
              fontSize: '9px',
              fontWeight: 700
            }
          }
        }]
      },
      tooltip: {
        y: { formatter: v => v.toFixed(1) + (isPercent ? '%' : unit) }
      }
    });
    activeCharts[elId].render();
  }

  // ── 2. LOS 4 PILARES EN SUS LIENZOS LIMPIOS INDIVIDUALES ──────────────────
  buildCleanSparkline('chart-spark-liq', dataLiquidez, 6.0,  '#2563eb', false, 'm', false);
  buildCleanSparkline('chart-spark-gas', dataGasto,    65.0, '#ef4444', true,  '%', true);
  buildCleanSparkline('chart-spark-aho', dataAhorro,   20.0, '#10b981', true,  '%', false);
  buildCleanSparkline('chart-spark-deu', dataDeuda,    25.0, '#f59e0b', true,  '%', true);
}

// 10. MATRIZ JERÁRQUICA P&L (IMAGEN 3) & PLANES DE ACCIÓN
// ═══════════════════════════════════════════════════════════════════════════
function renderHierarchicalMatrix() {
  const tbody = document.getElementById('hierarchicalMatrixBody');
  if (!tbody) return;

  const rows = getFilteredEFERows();
  const tiposOrder = ['Ingreso', 'Gasto', 'Ahorro e Inversión', 'Deuda'];

  const tree = {};
  tiposOrder.forEach(t => {
    tree[t] = { ppto: 0, act: 0, subcategories: {} };
  });

  rows.forEach(r => {
    const t = r.Tipo;
    if (!tree[t]) tree[t] = { ppto: 0, act: 0, subcategories: {} };

    tree[t].ppto += r.Presupuesto || 0;
    tree[t].act += r.Actual || 0;

    const sub = r.Subcategoria || r.Categoria;
    if (!tree[t].subcategories[sub]) {
      tree[t].subcategories[sub] = { ppto: 0, act: 0 };
    }
    tree[t].subcategories[sub].ppto += r.Presupuesto || 0;
    tree[t].subcategories[sub].act += r.Actual || 0;
  });

  const totalIngresoPpto = tree['Ingreso']?.ppto || 1;
  const totalIngresoAct = tree['Ingreso']?.act || 1;

  let html = '';

  tiposOrder.forEach((tipoKey, idx) => {
    const node = tree[tipoKey];
    if (!node) return;

    const varAbs = node.act - node.ppto;
    const varPct = node.ppto > 0 ? ((node.act / node.ppto) * 100) : 0;
    const pctPpto = (node.ppto / totalIngresoPpto) * 100;
    const pctAct = (node.act / totalIngresoAct) * 100;

    const isNegative = tipoKey === 'Ingreso' ? (varAbs < 0) : (varAbs > 0);
    const isNeutral = Math.abs(varAbs) < 1;
    const tArrow = isNeutral ? '►' : (isNegative ? '▼' : '▲');
    const tCss   = isNeutral ? 'color:#94a3b8;font-weight:800;' : (isNegative ? 'color:#f6465d;font-weight:800;' : 'color:#02c076;font-weight:800;');
    const formattedVarAbs = varAbs < 0 ? `(${formatNumber(Math.abs(varAbs))})` : formatNumber(varAbs);

    html += `
      <tr class="matrix-row-tipo" data-parent-id="tipo-${idx}">
        <td>
          <div class="matrix-td-tree">
            <button class="tree-toggle-btn" onclick="toggleTreeRow('tipo-${idx}', this)">-</button>
            <span>${tipoKey}</span>
          </div>
        </td>
        <td>${formatNumber(node.ppto)}</td>
        <td>${formatNumber(node.act)}</td>
        <td><span style="${tCss} font-size:0.9rem;">${tArrow}</span> <span style="${tCss}">${formattedVarAbs}</span></td>
        <td>${varPct.toFixed(2)}%</td>
        <td>${pctPpto.toFixed(2)}%</td>
        <td>${pctAct.toFixed(2)}%</td>
      </tr>
    `;

    Object.keys(node.subcategories).forEach(subKey => {
      const sub = node.subcategories[subKey];
      const sVarAbs = sub.act - sub.ppto;
      const sVarPct = sub.ppto > 0 ? ((sub.act / sub.ppto) * 100) : 0;
      const sPctPpto = (sub.ppto / totalIngresoPpto) * 100;
      const sPctAct = (sub.act / totalIngresoAct) * 100;

      const sIsNeg = tipoKey === 'Ingreso' ? (sVarAbs < 0) : (sVarAbs > 0);
      const sIsNeutral = Math.abs(sVarAbs) < 1;
      const sArrow = sIsNeutral ? '►' : (sIsNeg ? '▼' : '▲');
      const sCss   = sIsNeutral ? 'color:#94a3b8;font-weight:700;' : (sIsNeg ? 'color:#f6465d;font-weight:700;' : 'color:#02c076;font-weight:700;');
      const sFormattedVarAbs = sVarAbs < 0 ? `(${formatNumber(Math.abs(sVarAbs))})` : formatNumber(sVarAbs);

      html += `
        <tr class="matrix-row-sub child-of-tipo-${idx}">
          <td>
            <div class="matrix-td-tree">
              <span class="tree-indent"></span>
              <span style="font-size: 0.7rem; color: #94a3b8;">+</span>
              <span>${subKey}</span>
            </div>
          </td>
          <td>${formatNumber(sub.ppto)}</td>
          <td>${formatNumber(sub.act)}</td>
          <td><span style="${sCss} font-size:0.85rem;">${sArrow}</span> <span style="${sCss}">${sFormattedVarAbs}</span></td>
          <td>${sVarPct.toFixed(2)}%</td>
          <td>${sPctPpto.toFixed(2)}%</td>
          <td>${sPctAct.toFixed(2)}%</td>
        </tr>
      `;
    });
  });

  tbody.innerHTML = html;
}

function toggleTreeRow(parentId, btn) {
  const children = document.querySelectorAll(`.child-of-${parentId}`);
  const isExpanded = btn.textContent === '-';
  children.forEach(c => c.style.display = isExpanded ? 'none' : 'table-row');
  btn.textContent = isExpanded ? '+' : '-';
}

function expandAllTree() {
  document.querySelectorAll('.matrix-row-sub').forEach(r => r.style.display = 'table-row');
  document.querySelectorAll('.tree-toggle-btn').forEach(b => b.textContent = '-');
}

function collapseAllTree() {
  document.querySelectorAll('.matrix-row-sub').forEach(r => r.style.display = 'none');
  document.querySelectorAll('.tree-toggle-btn').forEach(b => b.textContent = '+');
}

function renderPlanesAccionCards() {
  const container = document.getElementById('planesAccionContainer');
  if (!container) return;

  const planes = dbData.planes_accion || [];
  if (!planes.length) {
    container.innerHTML = '<p style="color: #64748b;">No hay planes registrados.</p>';
    return;
  }

  container.innerHTML = planes.map(p => {
    const priorClass = p.prioridad === 'Alta' ? 'negative' : 'neutral';
    return `
      <div class="table-card" style="padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h4 style="font-size: 0.95rem; color: #0f172a; font-weight: 700;">${p.titulo}</h4>
          <span class="delta-badge ${priorClass}">${p.prioridad}</span>
        </div>
        <p style="font-size: 0.82rem; color: #475569; margin-bottom: 0.75rem; line-height: 1.5;">${p.descripcion}</p>
        <div style="font-size: 0.75rem; background: #f8fafc; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 0.75rem;">
          <strong>Impacto:</strong> ${p.impacto}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #64748b;">
          <span>Estado: <strong>${p.estado}</strong></span>
          <span>Límite: ${p.fecha_limite}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. VISTA: ESTADO DE SITUACIÓN FINANCIERA (ESF)
// ═══════════════════════════════════════════════════════════════════════════
function renderESFView() {
  destroyAllCharts();
  const esfList = dbData.registro_esf || [];
  const moneda = (dbData.configuracion && dbData.configuracion.moneda) || "S/.";

  if (!esfList.length) return;

  const mesNum = filterMonth === 'all' ? 8 : parseInt(filterMonth, 10);
  const currentESF = esfList.find(e => e.Mes === mesNum) || esfList[esfList.length - 1];

  setKpi('esf-kpi-activos', `${moneda} ${formatNumber(currentESF.Activos_Totales)}`);
  setKpi('esf-kpi-pasivos', `${moneda} ${formatNumber(currentESF.Pasivos_Totales)}`);
  setKpi('esf-kpi-patrimonio', `${moneda} ${formatNumber(currentESF.Patrimonio_Neto)}`);
  const solv = currentESF.Pasivos_Totales > 0 ? (currentESF.Activos_Totales / currentESF.Pasivos_Totales).toFixed(2) : 'N/A';
  setKpi('esf-kpi-solvencia', `${solv}x`);

  const chartTheme = {
    fontFamily: 'Inter, sans-serif',
    foreColor: '#64748b',
    toolbar: { show: false }
  };

  const esfListVisible = esfList.filter(e => !isFutureMonth(e.Mes));
  const mesesCat = esfListVisible.map(e => e.Mes_Nombre.slice(0, 3));
  const seriesPatrimonio = esfListVisible.map(e => e.Patrimonio_Neto);
  const seriesActivos = esfListVisible.map(e => e.Activos_Totales);
  const seriesPasivos = esfListVisible.map(e => e.Pasivos_Totales);

  // Categorías históricas extendidas con Proyección a Futuro (+6M y +12M)
  const mesesCatExtendidos = [...mesesCat, 'Proy +6M', 'Proy +12M'];
  const ultimoPatrimonio = seriesPatrimonio[seriesPatrimonio.length - 1] || 178000;
  const proy6M = Math.round(ultimoPatrimonio + (1200 * 6 * 1.035));
  const proy12M = Math.round(ultimoPatrimonio + (1200 * 12 * 1.07));

  // Serie de proyección (valores null en meses pasados para que arranque desde el último mes real)
  const seriesProyeccion = seriesPatrimonio.map((v, idx) => (idx === seriesPatrimonio.length - 1 ? v : null));
  seriesProyeccion.push(proy6M, proy12M);

  const seriesActivosExt = [...seriesActivos, null, null];
  const seriesPatrimonioExt = [...seriesPatrimonio, null, null];
  const seriesPasivosExt = [...seriesPasivos, null, null];

      // Serie comparativa de patrimonio sin dashboard (método manual protocolario)
    const auditDesglose = (dbData.auditoria_eficiencia && dbData.auditoria_eficiencia.desglose_mensual) || [];
    const seriesSinDash = auditDesglose.slice(0, seriesPatrimonio.length).map(d => d.patrimonio_sin_dash);
    const seriesSinDashExt = [...seriesSinDash, null, null];

    activeCharts['chart-esf-evolucion'] = new ApexCharts(document.getElementById('chart-esf-evolucion'), {
      chart: {
        type: 'area',
        height: 280,
        toolbar: { show: false },
        dropShadow: { enabled: true, top: 4, left: 1, blur: 6, opacity: 0.15 }
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: [2.5, 3.5, 2, 2.5, 3],
        dashArray: [0, 0, 4, 0, 5]
      },
      markers: {
        size: [4, 5, 3, 4, 6],
        strokeColors: '#ffffff',
        strokeWidth: 2,
        hover: { size: 8 }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.45,
          opacityFrom: 0.55,
          opacityTo: 0.04,
          stops: [0, 85, 100]
        }
      },
      series: [
        { name: 'Total Activos', data: seriesActivosExt },
        { name: 'Patrimonio Real (Con Dashboard de Finanzas)', data: seriesPatrimonioExt },
        { name: 'Patrimonio sin Dashboard (Método Manual)', data: seriesSinDashExt },
        { name: 'Total Pasivos (Deudas)', data: seriesPasivosExt },
        { name: 'Proyección Disciplinada', data: seriesProyeccion }
      ],
      colors: ['#2563eb', '#10b981', '#94a3b8', '#ef4444', '#f59e0b'],
      xaxis: { categories: mesesCatExtendidos },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (val) => val ? `${moneda} ${formatNumber(val)}` : 'N/A' }
      }
    });
    activeCharts['chart-esf-evolucion'].render();

  activeCharts['chart-esf-composicion'] = new ApexCharts(document.getElementById('chart-esf-composicion'), {
    chart: { type: 'donut', height: 280, ...chartTheme, dropShadow: { enabled: true, top: 4, left: 0, blur: 8, opacity: 0.15 } },
    labels: ['Activos Líquidos', 'Activos Invertidos', 'Activos No Corrientes'],
    series: [currentESF.Activos_Liquidos, currentESF.Activos_Invertidos, currentESF.Activos_No_Corrientes],
    colors: ['#06b6d4', '#8b5cf6', '#3b82f6'],
    stroke: { width: 2.5, colors: ['#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (val) => val >= 6 ? val.toFixed(1) + '%' : '',
      style: { fontSize: '11px', fontWeight: '800', colors: ['#ffffff'] },
      dropShadow: { enabled: true, top: 1, blur: 2, opacity: 0.6 }
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      fontWeight: 600,
      formatter: function(seriesName, opts) {
        const val = opts.w.globals.series[opts.seriesIndex];
        const tot = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
        return seriesName + ': ' + pct + '% (' + moneda + ' ' + formatNumber(val) + ')';
      }
    },
    plotOptions: { pie: { donut: { size: '64%', background: 'transparent' } } },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const tot = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
          return `${moneda} ${formatNumber(val)} (${pct}%)`;
        }
      }
    }
  });
  activeCharts['chart-esf-composicion'].render();
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. VISTA: ESTADO DE FLUJO DE EFECTIVO (EFE)
// ═══════════════════════════════════════════════════════════════════════════
function renderEFEView() {
  destroyAllCharts();
  const moneda = (dbData.configuracion && dbData.configuracion.moneda) || "S/.";
  const rows = getFilteredEFERows();

  let fco = 0, fci = 0, fcf = 0;

  rows.forEach(r => {
    if (r.Tipo === 'Ingreso') fco += r.Actual || 0;
    else if (r.Tipo === 'Gasto') fco -= r.Actual || 0;
    else if (r.Tipo === 'Ahorro e Inversión') fci -= r.Actual || 0;
    else if (r.Tipo === 'Deuda') fcf -= r.Actual || 0;
  });

  const neto = fco + fci + fcf;

  setKpi('efe-kpi-fco', `${moneda} ${formatNumber(fco)}`);
  setKpi('efe-kpi-fci', `${moneda} ${formatNumber(fci)}`);
  setKpi('efe-kpi-fcf', `${moneda} ${formatNumber(fcf)}`);
  setKpi('efe-kpi-neto', `${moneda} ${formatNumber(neto)}`);

  const chartTheme = {
    fontFamily: 'Inter, sans-serif',
    foreColor: '#64748b',
    toolbar: { show: false }
  };

  const mesesArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const efeEvolucion = mesesArr.map(m => {
    if (isFutureMonth(m)) return { ing: null, gas: null, neto: null };
    const mRows = (dbData.registro_efe || []).filter(r => r.Mes === m);
    let ing = 0, gas = 0;
    mRows.forEach(r => {
      if (r.Tipo === 'Ingreso') ing += r.Actual || 0;
      if (r.Tipo === 'Gasto') gas += r.Actual || 0;
    });
    return { ing, gas, neto: ing - gas };
  });

  activeCharts['chart-efe-evolucion'] = new ApexCharts(document.getElementById('chart-efe-evolucion'), {
    chart: { type: 'bar', height: 280, ...chartTheme },
    series: [
      { name: 'Ingresos', data: efeEvolucion.map(x => x.ing) },
      { name: 'Gastos', data: efeEvolucion.map(x => x.gas) }
    ],
    colors: ['#10b981', '#ef4444'],
    plotOptions: {
      bar: {
        columnWidth: '55%',
        borderRadius: 4,
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -16,
      style: {
        fontSize: '9px',
        fontWeight: '800',
        colors: ['#047857', '#b91c1c']
      },
      formatter: (val) => `${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`
    },
    xaxis: { categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'] },
    yaxis: {
      max: (maxVal) => Math.round(maxVal * 1.18),
      labels: { formatter: (v) => `${moneda} ${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}` }
    },
    tooltip: { y: { formatter: (val) => `${moneda} ${formatNumber(val)}` } }
  });
  activeCharts['chart-efe-evolucion'].render();

  let sumGas = 0, sumInv = 0, sumDeu = 0;
  rows.forEach(r => {
    if (r.Tipo === 'Gasto') sumGas += r.Actual || 0;
    if (r.Tipo === 'Ahorro e Inversión') sumInv += r.Actual || 0;
    if (r.Tipo === 'Deuda') sumDeu += r.Actual || 0;
  });

  activeCharts['chart-efe-distribucion'] = new ApexCharts(document.getElementById('chart-efe-distribucion'), {
    chart: { type: 'donut', height: 280, dropShadow: { enabled: true, top: 4, blur: 8, opacity: 0.15 }, ...chartTheme },
    labels: ['Gastos Corrientes', 'Ahorro e Inversión', 'Servicio de Deuda'],
    series: [sumGas, sumInv, sumDeu],
    colors: ['#ef4444', '#8b5cf6', '#f59e0b'],
    stroke: { width: 2.5, colors: ['#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (val) => val.toFixed(1) + '%',
      style: { fontSize: '12px', fontWeight: '800', colors: ['#ffffff'] },
      dropShadow: { enabled: true, top: 1, blur: 3, opacity: 0.8 }
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      fontWeight: 700,
      formatter: function(seriesName, opts) {
        const val = opts.w.globals.series[opts.seriesIndex];
        const tot = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
        return seriesName + ': ' + pct + '% (' + moneda + ' ' + formatNumber(val) + ')';
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '64%',
          background: 'transparent',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px', fontWeight: 600, color: '#64748b', offsetY: -4 },
            value: {
              show: true,
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              offsetY: 4,
              formatter: val => `${moneda} ${formatNumber(val)}`
            },
            total: {
              show: true,
              label: 'TOTAL SALIDAS',
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              formatter: w => `${moneda} ${formatNumber(w.globals.seriesTotals.reduce((a, b) => a + b, 0))}`
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const tot = opts.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';
          return `${moneda} ${formatNumber(val)} (${pct}%)`;
        }
      }
    }
  });
  activeCharts['chart-efe-distribucion'].render();
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLAS: REGISTRO EFE, REGISTRO ESF, PRESUPUESTO
// ═══════════════════════════════════════════════════════════════════════════
let _efeCurrentPage = 1;
const _efePorPagina  = 20;

function renderTablaEFE() {
  const tbody   = document.getElementById('tablaEFEBody');
  const countEl = document.getElementById('contadorEFE');
  if (!tbody) return;

  const rows = dbData.registro_efe || [];
  const total = rows.length;
  const totalPages = Math.ceil(total / _efePorPagina);
  if (_efeCurrentPage > totalPages) _efeCurrentPage = totalPages || 1;

  const start   = (_efeCurrentPage - 1) * _efePorPagina;
  const pageRows = rows.slice(start, start + _efePorPagina);

  if (countEl) countEl.textContent = `Mostrando ${start + 1}–${Math.min(start + _efePorPagina, total)} de ${total} movimientos`;

  tbody.innerHTML = pageRows.map(r => {
    const varAbs = (r.Actual || 0) - (r.Presupuesto || 0);

    // Para Ingreso: positivo (ganamos más de lo esperado) = BUENO ▲ verde
    // Para Gasto/Deuda: positivo (gastamos más de lo esperado) = MALO ▼ rojo
    const isGoodVariation = (r.Tipo === 'Ingreso' || r.Tipo === 'Ahorro e Inversión')
      ? varAbs >= 0
      : varAbs <= 0;

    const isNeutral = Math.abs(varAbs) < 1;
    const arrow    = isNeutral ? '►' : (isGoodVariation ? '▲' : '▼');
    const arrowCss = isNeutral
      ? 'color: #94a3b8; font-weight: 800;'
      : (isGoodVariation
          ? 'color: #02c076; font-weight: 800;'
          : 'color: #f6465d; font-weight: 800;');

    const varDisplay = varAbs < 0
      ? '(' + formatNumber(Math.abs(varAbs)) + ')'
      : formatNumber(varAbs);

    // Chip de tipo con color semáforo fintech
    const tipoBg = {
      'Ingreso':            'background: rgba(2,192,118,0.15); color: #02c076;',
      'Gasto':              'background: rgba(246,70,93,0.15); color: #f6465d;',
      'Ahorro e Inversión': 'background: rgba(37,99,235,0.15); color: #2563eb;',
      'Deuda':              'background: rgba(245,158,11,0.15); color: #b45309;'
    }[r.Tipo] || 'background: #f1f5f9; color: #64748b;';

    return `
      <tr>
        <td style="font-weight: 600; color: #1e40af; font-size: 0.8rem;">${r.ID}</td>
        <td style="color: #64748b; font-size: 0.8rem;">${r.Fecha}</td>
        <td style="font-size: 0.8rem;">${r.Mes_Nombre || r.Mes}</td>
        <td><span style="display:inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.72rem; font-weight: 700; ${tipoBg}">${r.Tipo}</span></td>
        <td style="font-size: 0.8rem;">${r.Categoria}</td>
        <td style="font-size: 0.8rem; color: #64748b;">${r.Subcategoria}</td>
        <td style="text-align: right; color: #64748b;">${formatNumber(r.Presupuesto)}</td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatNumber(r.Actual)}</td>
        <td style="text-align: right;">
          <span style="${arrowCss} font-size: 0.9rem;">${arrow}</span>
          <span style="${arrowCss}">${varDisplay}</span>
        </td>
        <td style="font-size: 0.78rem; color: #64748b;">${r.Metodo_Pago || '-'}</td>
        <td><span style="display:inline-block; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.72rem; font-weight: 700; background: rgba(2,192,118,0.15); color: #02c076;">${r.Estado}</span></td>
      </tr>
    `;
  }).join('');

  // Renderizar controles de paginación debajo del tbody
  _renderEFEPagination(totalPages, total);
}

function _renderEFEPagination(totalPages, total) {
  // Buscar o crear el contenedor de paginación
  let pagEl = document.getElementById('efe-pagination');
  if (!pagEl) {
    const wrap = document.getElementById('tablaEFE');
    if (!wrap) return;
    pagEl = document.createElement('div');
    pagEl.id = 'efe-pagination';
    pagEl.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.9rem 0 0.3rem;flex-wrap:wrap;';
    wrap.parentElement.parentElement.appendChild(pagEl);
  }

  if (totalPages <= 1) { pagEl.innerHTML = ''; return; }

  const btnStyle = (active) =>
    `style="padding: 0.3rem 0.7rem; border-radius: 6px; border: 1px solid ${active ? '#2563eb' : '#e2e8f0'}; background: ${active ? '#2563eb' : '#fff'}; color: ${active ? '#fff' : '#64748b'}; font-size: 0.78rem; font-weight: ${active ? '700' : '500'}; cursor: ${active ? 'default' : 'pointer'};"`;

  let html = `<button ${btnStyle(false)} onclick="efeGoPage(${_efeCurrentPage - 1})" ${_efeCurrentPage === 1 ? 'disabled' : ''}>&#8592; Anterior</button>`;

  // Mostrar máximo 7 botones de página
  const range = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) range.push(i);
  } else {
    range.push(1);
    if (_efeCurrentPage > 3) range.push('...');
    for (let i = Math.max(2, _efeCurrentPage - 1); i <= Math.min(totalPages - 1, _efeCurrentPage + 1); i++) range.push(i);
    if (_efeCurrentPage < totalPages - 2) range.push('...');
    range.push(totalPages);
  }

  range.forEach(p => {
    if (p === '...') {
      html += `<span style="color:#94a3b8;padding:0.3rem 0.2rem;">…</span>`;
    } else {
      html += `<button ${btnStyle(p === _efeCurrentPage)} onclick="efeGoPage(${p})">${p}</button>`;
    }
  });

  html += `<button ${btnStyle(false)} onclick="efeGoPage(${_efeCurrentPage + 1})" ${_efeCurrentPage === totalPages ? 'disabled' : ''}>Siguiente &#8594;</button>`;
  html += `<span style="font-size:0.75rem;color:#94a3b8;margin-left:0.5rem;">Página ${_efeCurrentPage} de ${totalPages}</span>`;

  pagEl.innerHTML = html;
}

function efeGoPage(page) {
  const rows = dbData.registro_efe || [];
  const totalPages = Math.ceil(rows.length / _efePorPagina);
  if (page < 1 || page > totalPages) return;
  _efeCurrentPage = page;
  renderTablaEFE();
  // Scroll al inicio de la tabla
  const el = document.getElementById('vista-registro-efe');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function renderTablaESF() {
  const tbody = document.getElementById('tablaESFBody');
  if (!tbody) return;

  const rawList = dbData.registro_esf || [];
  const list = rawList.filter(e => !isFutureMonth(e.Mes));
  tbody.innerHTML = list.map((e, idx) => {
    const solv = e.Pasivos_Totales > 0 ? (e.Activos_Totales / e.Pasivos_Totales).toFixed(2) : '-';
    const prev = list[idx - 1];

    // Flecha de tendencia del Patrimonio Neto vs mes anterior
    let patArrow = '►'; let patCss = 'color: #94a3b8; font-weight: 800;';
    if (prev) {
      const diff = e.Patrimonio_Neto - prev.Patrimonio_Neto;
      if (diff > 100) { patArrow = '▲'; patCss = 'color: #02c076; font-weight: 800;'; }
      else if (diff < -100) { patArrow = '▼'; patCss = 'color: #f6465d; font-weight: 800;'; }
    }

    // Flecha de tendencia de Activos Totales
    let actArrow = '►'; let actCss = 'color: #94a3b8; font-weight: 700;';
    if (prev) {
      const diff = e.Activos_Totales - prev.Activos_Totales;
      if (diff > 100) { actArrow = '▲'; actCss = 'color: #02c076; font-weight: 700;'; }
      else if (diff < -100) { actArrow = '▼'; actCss = 'color: #f6465d; font-weight: 700;'; }
    }

    // Flecha de tendencia de Pasivos Totales (más pasivos = malo, menos pasivos = bueno)
    let pasArrow = '►'; let pasCss = 'color: #94a3b8; font-weight: 700;';
    if (prev) {
      const diff = e.Pasivos_Totales - prev.Pasivos_Totales;
      if (diff < -100) { pasArrow = '▲'; pasCss = 'color: #02c076; font-weight: 700;'; } // deuda baja = bueno
      else if (diff > 100) { pasArrow = '▼'; pasCss = 'color: #f6465d; font-weight: 700;'; } // deuda sube = malo
    }

    const solvNum = parseFloat(solv);
    const solvCss = solvNum >= 3 ? 'background: rgba(2,192,118,0.15); color: #02c076;'
      : solvNum >= 1.5 ? 'background: rgba(245,158,11,0.15); color: #b45309;'
      : 'background: rgba(246,70,93,0.15); color: #f6465d;';

    return `
      <tr>
        <td style="font-weight: 700; color: #0f172a;">${e.Mes_Nombre || 'Mes ' + e.Mes} ${e.Periodo || ''}</td>
        <td style="color: #64748b; font-size: 0.8rem;">${e.Fecha_Corte || '-'}</td>
        <td>${formatNumber(e.Activos_Liquidos)}</td>
        <td>${formatNumber(e.Activos_Invertidos)}</td>
        <td>${formatNumber(e.Activos_No_Corrientes)}</td>
        <td>
          <span style="${actCss} font-size: 0.85rem; margin-right: 2px;">${actArrow}</span>
          <strong style="color: #047857;">${formatNumber(e.Activos_Totales)}</strong>
        </td>
        <td>${formatNumber(e.Pasivos_Corto_Plazo)}</td>
        <td>${formatNumber(e.Pasivos_Largo_Plazo)}</td>
        <td>
          <span style="${pasCss} font-size: 0.85rem; margin-right: 2px;">${pasArrow}</span>
          <strong style="color: #b91c1c;">${formatNumber(e.Pasivos_Totales)}</strong>
        </td>
        <td>
          <span style="${patCss} font-size: 0.95rem; margin-right: 2px;">${patArrow}</span>
          <strong style="color: #1e3a8a; font-size: 1rem;">${formatNumber(e.Patrimonio_Neto)}</strong>
        </td>
        <td><span style="display:inline-block; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; ${solvCss}">${solv}x</span></td>
      </tr>
    `;
  }).join('');
}

let currentPptoFilter = 'all';

function filtrarPresupuestoTipo(tipo, btn) {
  currentPptoFilter = tipo;
  document.querySelectorAll('.ppto-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTablaPresupuesto();
}

function renderTablaPresupuesto() {
  const tbody = document.getElementById('tablaPresupuestoBody');
  if (!tbody) return;

  const moneda = (dbData.configuracion && dbData.configuracion.moneda) || 'S/.';
  const efe = dbData.registro_efe || [];
  const map = {};

  let totIng = 0, totGas = 0, totAho = 0, totDeu = 0;

  efe.forEach(r => {
    const key = `${r.Tipo}|${r.Categoria}|${r.Subcategoria}`;
    if (!map[key]) map[key] = { tipo: r.Tipo, cat: r.Categoria, sub: r.Subcategoria, sumPpto: 0, count: 0 };
    map[key].sumPpto += r.Presupuesto || 0;
    map[key].count++;

    if (r.Tipo === 'Ingreso') totIng += r.Presupuesto || 0;
    else if (r.Tipo === 'Gasto') totGas += r.Presupuesto || 0;
    else if (r.Tipo === 'Ahorro e Inversión') totAho += r.Presupuesto || 0;
    else if (r.Tipo === 'Deuda') totDeu += r.Presupuesto || 0;
  });

  // Actualizar tarjetas de resumen del presupuesto si existen
  const elIng = document.getElementById('ppto-card-ing');
  const elGas = document.getElementById('ppto-card-gas');
  const elAho = document.getElementById('ppto-card-aho');
  const elDeu = document.getElementById('ppto-card-deu');

  if (elIng) elIng.textContent = `${moneda} ${formatNumber(totIng)}`;
  if (elGas) elGas.textContent = `${moneda} ${formatNumber(totGas)}`;
  if (elAho) elAho.textContent = `${moneda} ${formatNumber(totAho)}`;
  if (elDeu) elDeu.textContent = `${moneda} ${formatNumber(totDeu)}`;

  const totAnual = Object.values(map).reduce((acc, x) => acc + x.sumPpto, 0);

  // Filtrar si hay filtro activo
  let items = Object.values(map);
  if (currentPptoFilter !== 'all') {
    items = items.filter(x => x.tipo === currentPptoFilter);
  }

  // Ordenar de mayor a menor presupuesto
  items.sort((a, b) => b.sumPpto - a.sumPpto);

  const tipoColors = {
    'Ingreso':            { bg: 'rgba(2,192,118,0.12)', color: '#02c076', bar: '#10b981' },
    'Gasto':              { bg: 'rgba(246,70,93,0.12)', color: '#f6465d', bar: '#ef4444' },
    'Ahorro e Inversión': { bg: 'rgba(37,99,235,0.12)', color: '#2563eb', bar: '#3b82f6' },
    'Deuda':              { bg: 'rgba(245,158,11,0.12)', color: '#b45309', bar: '#f59e0b' }
  };

  tbody.innerHTML = items.map(item => {
    const mensualProm = item.count > 0 ? item.sumPpto / item.count : 0;
    const pct = totAnual > 0 ? (item.sumPpto / totAnual) * 100 : 0;
    const styleObj = tipoColors[item.tipo] || { bg: '#f1f5f9', color: '#64748b', bar: '#94a3b8' };

    // Barra de participación visual
    const barWidth = Math.min(100, Math.max(3, pct * 4)); // Escala proporcional visual

    return `
      <tr>
        <td>
          <span style="display:inline-block; padding: 0.25rem 0.65rem; border-radius: 6px; font-size: 0.74rem; font-weight: 700; background: ${styleObj.bg}; color: ${styleObj.color};">
            ${item.tipo}
          </span>
        </td>
        <td style="font-weight: 700; color: #0f172a;">${item.cat}</td>
        <td style="color: #64748b; font-size: 0.82rem;">${item.sub}</td>
        <td style="text-align: right; color: #475569; font-weight: 600;">
          ${moneda} ${formatNumber(mensualProm)}
        </td>
        <td style="text-align: right; font-weight: 800; color: #0f172a;">
          ${moneda} ${formatNumber(item.sumPpto)}
        </td>
        <td style="text-align: right;">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem;">
            <div style="width: 75px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);">
              <div style="width: ${barWidth}%; height: 100%; background: ${styleObj.bar}; border-radius: 4px;"></div>
            </div>
            <span style="font-weight: 800; color: #0f172a; font-size: 0.8rem; min-width: 45px; text-align: right;">${pct.toFixed(2)}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
function renderObjetivosView() {}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD TRANSACCIONES
// ═══════════════════════════════════════════════════════════════════════════
function openNewRecordModal() {
  document.getElementById('efe-id').value = '';
  document.getElementById('formEFE').reset();
  document.getElementById('efe-fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('modalEFETitle').textContent = 'Registrar Movimiento Financiero (EFE)';
  handleTipoChange('Gasto');
  document.getElementById('modalEFE').classList.add('open');
}

function closeModalEFE(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modalEFE').classList.remove('open');
}

function handleTipoChange(tipo) {
  const catSel = document.getElementById('efe-categoria');
  if (!catSel) return;
  const cats = (dbData.catalogo && dbData.catalogo[tipo]) || [];
  catSel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if (cats.length) handleCategoriaChange(cats[0]);
}

function handleCategoriaChange(cat) {
  const subInput = document.getElementById('efe-subcategoria');
  if (subInput) subInput.value = cat;
}

async function saveRecordEFE(e) {
  e.preventDefault();
  const id = document.getElementById('efe-id').value;
  const item = {
    ID: id || undefined,
    Tipo: document.getElementById('efe-tipo').value,
    Mes: parseInt(document.getElementById('efe-mes').value, 10),
    Mes_Nombre: MESES_NOMBRES[parseInt(document.getElementById('efe-mes').value, 10) - 1],
    Categoria: document.getElementById('efe-categoria').value,
    Subcategoria: document.getElementById('efe-subcategoria').value,
    Presupuesto: parseFloat(document.getElementById('efe-ppto').value || 0),
    Actual: parseFloat(document.getElementById('efe-act').value || 0),
    Fecha: document.getElementById('efe-fecha').value,
    Metodo_Pago: document.getElementById('efe-metodo').value,
    Detalle: document.getElementById('efe-detalle').value,
    Estado: 'Ejecutado'
  };

  try {
    if (dataStorageMode === 'server') {
      const res = await fetch('/api/registro-efe' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error('API no disponible');
      await loadFinancialData();
    } else {
      throw new Error('autonomous');
    }
  } catch (_) {
    // Fallback autónomo en memoria / localStorage
    if (!dbData.registro_efe) dbData.registro_efe = [];
    if (id) {
      const idx = dbData.registro_efe.findIndex(r => String(r.ID) === String(id));
      if (idx !== -1) dbData.registro_efe[idx] = { ...dbData.registro_efe[idx], ...item };
    } else {
      item.ID = 'EFE-' + String(dbData.registro_efe.length + 1).padStart(3, '0');
      dbData.registro_efe.push(item);
    }
    persistAutonomous();
  }

  closeModalEFE(null);
  navigateTo(currentView);
}

async function deleteRecordEFE(id) {
  if (!confirm('¿Desea eliminar la transacción ' + id + '?')) return;
  try {
    if (dataStorageMode === 'server') {
      const res = await fetch('/api/registro-efe/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('API no disponible');
      await loadFinancialData();
    } else {
      throw new Error('autonomous');
    }
  } catch (_) {
    if (dbData.registro_efe) {
      dbData.registro_efe = dbData.registro_efe.filter(r => String(r.ID) !== String(id));
      persistAutonomous();
    }
  }
  renderTablaEFE();
}

// Modal ESF
function openModalESF() {
  document.getElementById('formESF').reset();
  document.getElementById('esf-id').value = '';
  document.getElementById('esf-fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('modalESF').classList.add('open');
}

function closeModalESF(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modalESF').classList.remove('open');
}

async function saveRecordESF(e) {
  e.preventDefault();
  const id = document.getElementById('esf-id').value;
  const item = {
    ID: id || undefined,
    Mes: parseInt(document.getElementById('esf-mes').value, 10),
    Mes_Nombre: MESES_NOMBRES[parseInt(document.getElementById('esf-mes').value, 10) - 1],
    Periodo: `${CURRENT_YEAR}-${document.getElementById('esf-mes').value.padStart(2, '0')}`,
    Fecha_Corte: document.getElementById('esf-fecha').value,
    Activos_Liquidos: parseFloat(document.getElementById('esf-act-liq').value || 0),
    Activos_Invertidos: parseFloat(document.getElementById('esf-act-inv').value || 0),
    Activos_No_Corrientes: parseFloat(document.getElementById('esf-act-fijo').value || 0),
    Pasivos_Corto_Plazo: parseFloat(document.getElementById('esf-pas-corto').value || 0),
    Pasivos_Largo_Plazo: parseFloat(document.getElementById('esf-pas-largo').value || 0)
  };

  try {
    if (dataStorageMode === 'server') {
      const res = await fetch('/api/registro-esf' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error('API no disponible');
      await loadFinancialData();
    } else {
      throw new Error('autonomous');
    }
  } catch (_) {
    if (!dbData.registro_esf) dbData.registro_esf = [];
    if (id) {
      const idx = dbData.registro_esf.findIndex(r => String(r.ID) === String(id));
      if (idx !== -1) dbData.registro_esf[idx] = { ...dbData.registro_esf[idx], ...item };
    } else {
      item.ID = 'ESF-' + String(dbData.registro_esf.length + 1).padStart(3, '0');
      dbData.registro_esf.push(item);
    }
    persistAutonomous();
  }

  closeModalESF(null);
  navigateTo(currentView);
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. GESTIÓN DE PERFILES DE USUARIO (ADMINISTRADOR / USUARIO)
// ═══════════════════════════════════════════════════════════════════════════
function renderUsuariosList() {
  const tbody = document.getElementById('tablaUsuariosBody');
  const selActivo = document.getElementById('selectPerfilActivo');
  if (!tbody) return;

  const users = dbData.usuarios || [];
  const activeId = (dbData.configuracion && dbData.configuracion.usuario_activo_id) || 'USR-01';

  // Llenar selector de usuario activo
  if (selActivo) {
    selActivo.innerHTML = users.map(u => {
      const isSel = u.id === activeId ? 'selected' : '';
      return `<option value="${u.id}" ${isSel}>${u.nombre} (${u.rol})</option>`;
    }).join('');
  }

  // Llenar tabla
  tbody.innerHTML = users.map(u => {
    const isActive = u.id === activeId;
    const roleBadge = u.rol === 'Administrador' 
      ? '<span class="user-role-badge admin">Administrador</span>' 
      : '<span class="user-role-badge usuario">Usuario</span>';
    const statusBadge = '<span class="delta-badge positive">' + (u.estado || 'Activo') + '</span>';
    const activeIndicator = isActive ? '<strong style="color: #2563eb;"> • (Sesión Actual)</strong>' : '';

    return `
      <tr class="${isActive ? 'user-card-item active-user' : ''}">
        <td><strong>${u.nombre}</strong> ${activeIndicator}</td>
        <td>${u.usuario}</td>
        <td>${u.email}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td style="font-size: 0.78rem; color: #64748b;">${u.ultimo_acceso || '-'}</td>
        <td>
          <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="editUser('${u.id}')">✏️</button>
          ${users.length > 1 ? `<button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="deleteUser('${u.id}')">🗑️</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

async function handleSwitchActiveUser(userId) {
  try {
    if (dataStorageMode === 'server') {
      const res = await fetch('/api/usuarios/cambiar-activo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
      });
      if (!res.ok) throw new Error('API no disponible');
      await loadFinancialData();
    } else {
      throw new Error('autonomous');
    }
  } catch (_) {
    if (!dbData.configuracion) dbData.configuracion = {};
    dbData.configuracion.usuario_activo_id = userId;
    persistAutonomous();
    updateUserProfileBadges();
  }
  renderUsuariosList();
}

function openUserModal() {
  document.getElementById('formUsuario').reset();
  document.getElementById('usr-id').value = '';
  document.getElementById('modalUsuarioTitle').textContent = 'Crear Perfil de Usuario';
  document.getElementById('modalUsuario').classList.add('open');
}

function closeUserModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modalUsuario').classList.remove('open');
}

function editUser(id) {
  const user = (dbData.usuarios || []).find(u => u.id === id);
  if (!user) return;
  document.getElementById('usr-id').value = user.id;
  document.getElementById('usr-nombre').value = user.nombre;
  document.getElementById('usr-usuario').value = user.usuario;
  document.getElementById('usr-email').value = user.email;
  document.getElementById('usr-rol').value = user.rol;
  document.getElementById('modalUsuarioTitle').textContent = 'Editar Perfil de Usuario';
  document.getElementById('modalUsuario').classList.add('open');
}

async function saveUserRecord(e) {
  e.preventDefault();
  const id = document.getElementById('usr-id').value;
  const payload = {
    nombre: document.getElementById('usr-nombre').value,
    usuario: document.getElementById('usr-usuario').value,
    email: document.getElementById('usr-email').value,
    rol: document.getElementById('usr-rol').value,
    estado: 'Activo',
    ultimo_acceso: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };

  try {
    if (dataStorageMode === 'server') {
      const res = await fetch('/api/usuarios' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('API no disponible');
      await loadFinancialData();
    } else {
      throw new Error('autonomous');
    }
  } catch (_) {
    if (!dbData.usuarios) dbData.usuarios = [];
    if (id) {
      const idx = dbData.usuarios.findIndex(u => u.id === id);
      if (idx !== -1) dbData.usuarios[idx] = { ...dbData.usuarios[idx], ...payload };
    } else {
      payload.id = 'USR-' + String(dbData.usuarios.length + 1).padStart(2, '0');
      dbData.usuarios.push(payload);
    }
    persistAutonomous();
    updateUserProfileBadges();
  }

  closeUserModal(null);
  renderUsuariosList();
}

async function deleteUser(id) {
  if (!confirm('¿Desea eliminar este usuario?')) return;
  try {
    if (dataStorageMode === 'server') {
      const res = await fetch('/api/usuarios/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('API no disponible');
      await loadFinancialData();
    } else {
      throw new Error('autonomous');
    }
  } catch (_) {
    if (dbData.usuarios) {
      dbData.usuarios = dbData.usuarios.filter(u => u.id !== id);
      persistAutonomous();
    }
  }
  renderUsuariosList();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN, RESPALDOS Y CONFIGURACIÓN GENERAL
// ═══════════════════════════════════════════════════════════════════════════
function downloadFinancialExcel() {
  try {
    if (typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();
      const wsEFE = XLSX.utils.json_to_sheet(dbData.registro_efe || []);
      XLSX.utils.book_append_sheet(wb, wsEFE, 'Flujo de Efectivo EFE');
      const wsESF = XLSX.utils.json_to_sheet(dbData.registro_esf || []);
      XLSX.utils.book_append_sheet(wb, wsESF, 'Balance Patrimonial ESF');
      if (dbData.usuarios) {
        const wsUsr = XLSX.utils.json_to_sheet(dbData.usuarios);
        XLSX.utils.book_append_sheet(wb, wsUsr, 'Usuarios');
      }
      XLSX.writeFile(wb, 'FinControl_Reporte_' + new Date().toISOString().slice(0, 10) + '.xlsx');
      return;
    }
  } catch (_) {}
  window.location.href = '/api/download-excel';
}

function backupDatabaseJson() {
  try {
    const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FinControl_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (_) {
    window.location.href = '/api/backup';
  }
}

async function handleRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target.result);
      if (dataStorageMode === 'server') {
        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Fallo en servidor');
      }
      dbData = json;
      persistAutonomous();
      alert('Copia de seguridad restaurada correctamente.');
      await loadFinancialData();
      navigateTo(currentView);
    } catch (err) {
      alert('Error restaurando copia: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function loadConfigForm() {
  const cfg = dbData.configuracion || {};
  const mon = document.getElementById('cfg-moneda');
  const ent = document.getElementById('cfg-entidad');
  if (mon) mon.value = cfg.moneda || 'S/.';
  if (ent) ent.value = cfg.entidad || '';
  renderUsuariosList();
}

async function saveGeneralConfig() {
  const payload = {
    moneda: document.getElementById('cfg-moneda').value,
    entidad: document.getElementById('cfg-entidad').value
  };

  try {
    if (dataStorageMode === 'server') {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('API no disponible');
    }
  } catch (_) {}

  if (!dbData.configuracion) dbData.configuracion = {};
  dbData.configuracion.moneda = payload.moneda;
  dbData.configuracion.entidad = payload.entidad;
  persistAutonomous();

  const sub = document.getElementById('brandSubtitle');
  if (sub) sub.textContent = payload.entidad;
  alert('Configuración guardada exitosamente.');
}

// --- UTILIDADES DE FORMATO ---
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('en-US');
}

function setKpi(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setDeltaBadge(id, ppto, act, positiveIsGood) {
  const el = document.getElementById(id);
  if (!el) return;
  if (ppto === 0) {
    el.innerHTML = '<span class="ticker-arrow">►</span> 0%';
    el.className = 'delta-badge ticker-neutral';
    return;
  }
  const pct = ((act / ppto) * 100);
  const diff = pct - 100;
  const isGood = positiveIsGood ? diff >= 0 : diff <= 0;
  const isNeutral = Math.abs(diff) < 1;
  let arrow, cls;
  if (isNeutral) {
    arrow = '►'; cls = 'ticker-neutral';
  } else if (diff > 0) {
    arrow = '▲'; cls = isGood ? 'ticker-up' : 'ticker-down';
  } else {
    arrow = '▼'; cls = isGood ? 'ticker-up' : 'ticker-down';
  }
  el.innerHTML = `<span class="ticker-arrow">${arrow}</span> ${pct.toFixed(1)}%`;
  el.className = 'delta-badge ' + cls;
}

// ══════════════════════════════════════════════════════════════════════════
// 🏠 VISTA INICIO — Salud Financiera, Acciones Rápidas, Consejos
// ══════════════════════════════════════════════════════════════════════════

function renderHomeView() {
  destroyAllCharts();
  
  // Nombre del usuario activo
  const users = dbData.usuarios || [];
  const activeId = (dbData.configuracion && dbData.configuracion.usuario_activo_id) || 'USR-01';
  const activeUser = users.find(u => u.id === activeId) || { nombre: 'Admin' };
  const greetUser = document.getElementById('greeting-user');
  if (greetUser) greetUser.textContent = activeUser.nombre;

  // Actualizar select de mes
  const mesSel = document.getElementById('inicio-mes-sel');
  if (mesSel) mesSel.value = filterMonth;

  // Calcular y renderizar todo
  const scoreData = calcularSaludFinanciera();
  renderSemaforoSalud(scoreData);
  renderGamifiedCockpit(scoreData);
  renderResumenMes(scoreData);
  renderConsejos(scoreData);
  renderAutoevaluacionFinanciera();
}

// ── 🏆 MOTOR DE GAMIFICACIÓN FINANCIERA (COMPITIENDO CONSIGO MISMO) ─────────
function renderGamifiedCockpit(d) {
  // Diagnóstico ejecutivo profesional dinámico
  const lvlBadge = document.getElementById('gmc-level-badge');
  if (lvlBadge) {
    lvlBadge.textContent = d.score >= 70 ? 'Salud Financiera Óptima' : (d.score >= 40 ? 'En Control / Supervisión' : 'Atención Requerida');
    lvlBadge.style.color = d.score >= 70 ? '#02c076' : (d.score >= 40 ? '#f0b90b' : '#ef4444');
  }

  const streakBadge = document.getElementById('gmc-streak-badge');
  if (streakBadge) {
    streakBadge.textContent = 'Presupuesto Cuadrado al 100%';
  }

  const execMsg = document.getElementById('exec-diagnostic-msg');
  if (execMsg) {
    execMsg.textContent = 'Consolidado ejecutivo de la posición financiera global, estructura patrimonial y flujo de caja neto del período auditado. Control integral en tiempo real sin desviaciones operativas.';
  }
}
function calcularSaludFinanciera() {
  const mes = parseInt(filterMonth) || 8;
  const rows = (dbData.registro_efe || []).filter(r => r.Mes === mes);

  let ingPpto = 0, ingAct = 0;
  let gasPpto = 0, gasAct = 0;
  let ahoPpto = 0, ahoAct = 0;
  let deuPpto = 0, deuAct = 0;

  rows.forEach(r => {
    const ppto = r.Presupuesto || 0;
    const act  = r.Actual     || 0;
    if (r.Tipo === 'Ingreso')            { ingPpto += ppto; ingAct += act; }
    else if (r.Tipo === 'Gasto')         { gasPpto += ppto; gasAct += act; }
    else if (r.Tipo === 'Ahorro e Inversión') { ahoPpto += ppto; ahoAct += act; }
    else if (r.Tipo === 'Deuda')         { deuPpto += ppto; deuAct += act; }
  });

  const base = ingAct > 0 ? ingAct : 1;
  const ratioGasto  = (gasAct / base) * 100;
  const ratioAhorro = (ahoAct / base) * 100;
  const ratioDeuda  = (deuAct / base) * 100;
  const saldo       = ingAct - gasAct - ahoAct - deuAct;

  // Puntaje de 0-100
  let score = 0;
  // Gasto (máx 34 pts): < 45% = 34, < 55% = 17, else 0
  if (ratioGasto <= 45)      score += 34;
  else if (ratioGasto <= 55) score += 17;

  // Ahorro (máx 33 pts): >= 20% = 33, >= 10% = 16, else 0
  if (ratioAhorro >= 20)      score += 33;
  else if (ratioAhorro >= 10) score += 16;

  // Deuda (máx 33 pts): <= 25% = 33, <= 35% = 16, else 0
  if (ratioDeuda <= 25)      score += 33;
  else if (ratioDeuda <= 35) score += 16;

  const mesNombre = MESES_NOMBRES[(mes - 1)] || 'el mes';
  const moneda    = (dbData.configuracion && dbData.configuracion.moneda) || 'S/.';

  return {
    score, ratioGasto, ratioAhorro, ratioDeuda,
    ingPpto, ingAct, gasPpto, gasAct,
    ahoPpto, ahoAct, deuPpto, deuAct,
    saldo, mesNombre, moneda, mes
  };
}

function renderSemaforoSalud(d) {
  const card  = document.getElementById('healthScoreCard');
  const emoji = document.getElementById('health-emoji');
  const title = document.getElementById('health-title');
  const sub   = document.getElementById('health-subtitle');

  let colorClass, emojiChar, titleText, subText, gaugeColor, gradientToColor;

  if (d.score >= 70) {
    colorClass = 'green'; emojiChar = '🟢';
    titleText  = '¡Tus finanzas están en buen camino!';
    subText    = 'Estás manejando bien tu dinero este mes. ¡Sigue así!';
    gaugeColor = '#10b981'; gradientToColor = '#06b6d4';
  } else if (d.score >= 40) {
    colorClass = 'yellow'; emojiChar = '🟡';
    titleText  = 'Hay cosas que puedes mejorar';
    subText    = 'Vas bien en algunos aspectos, pero tienes oportunidades de mejora.';
    gaugeColor = '#f59e0b'; gradientToColor = '#f97316';
  } else {
    colorClass = 'red'; emojiChar = '🔴';
    titleText  = 'Atención: tus finanzas necesitan cuidado';
    subText    = 'Revisa los consejos abajo para mejorar tu situación rápidamente.';
    gaugeColor = '#ef4444'; gradientToColor = '#f43f5e';
  }

  if (card) {
    card.classList.remove('health-green', 'health-yellow', 'health-red');
    card.classList.add('health-' + colorClass);
  }
  if (emoji) emoji.textContent = emojiChar;
  if (title) title.textContent = titleText;
  if (sub)   sub.textContent   = subText;

  // Renderizar o actualizar el gauge radial semi-circular biométrico
  const gaugeEl = document.getElementById('health-gauge-chart');
  if (gaugeEl) {
    if (activeCharts['health-gauge']) {
      activeCharts['health-gauge'].destroy();
    }
    activeCharts['health-gauge'] = new ApexCharts(gaugeEl, {
      chart: {
        type: 'radialBar',
        height: 140,
        sparkline: { enabled: true }
      },
      plotOptions: {
        radialBar: {
          startAngle: -125,
          endAngle: 125,
          hollow: { size: '68%' },
          track: {
            background: '#e2e8f0',
            strokeWidth: '100%',
            dropShadow: { enabled: false }
          },
          dataLabels: {
            name: {
              show: true,
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748b',
              offsetY: 20
            },
            value: {
              offsetY: -10,
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              formatter: val => val + ' pts'
            }
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: [gradientToColor],
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 100]
        }
      },
      stroke: { lineCap: 'round' },
      colors: [gaugeColor],
      series: [d.score],
      labels: ['SALUD']
    });
    activeCharts['health-gauge'].render();
  }

  // Detalles
  function setHDI(id, val, okThreshold, isMax) {
    const el  = document.getElementById(id);
    const valEl = document.getElementById(id.replace('hdi-','hd-') + '-val');
    if (!el || !valEl) return;
    valEl.textContent = val.toFixed(1) + '%';
    el.classList.remove('hdi-ok', 'hdi-warn', 'hdi-bad');
    const isOk = isMax ? val <= okThreshold : val >= okThreshold;
    el.classList.add(isOk ? 'hdi-ok' : (Math.abs(val - okThreshold) <= 10 ? 'hdi-warn' : 'hdi-bad'));
  }
  setHDI('hdi-gastos', d.ratioGasto,  45, true);
  setHDI('hdi-ahorro', d.ratioAhorro, 20, false);
  setHDI('hdi-deuda',  d.ratioDeuda,  25, true);
}

function renderResumenMes(d) {
  const mesNombreEl = document.getElementById('inicio-mes-nombre');
  if (mesNombreEl) mesNombreEl.textContent = d.mesNombre + ' ' + CURRENT_YEAR;

  function setCard(idVal, idMeta, idPct, act, ppto, isIngreso) {
    const valEl  = document.getElementById(idVal);
    const metaEl = document.getElementById(idMeta);
    const pctEl  = document.getElementById(idPct);
    if (!valEl) return;
    valEl.textContent  = d.moneda + ' ' + formatNumber(act);
    if (metaEl) metaEl.textContent = d.moneda + ' ' + formatNumber(ppto);
    if (pctEl && ppto > 0) {
      const pct = (act / ppto) * 100;
      pctEl.textContent = pct.toFixed(0) + '%';
    }
  }

  setCard('smc-ingresos', 'smc-meta-ingresos', 'smc-pct-ingresos', d.ingAct,  d.ingPpto,  true);
  setCard('smc-gastos',   'smc-meta-gastos',   'smc-pct-gastos',   d.gasAct,  d.gasPpto,  false);
  setCard('smc-ahorro',   'smc-meta-ahorro',   'smc-pct-ahorro',   d.ahoAct,  d.ahoPpto,  true);
  setCard('smc-deudas',   'smc-meta-deudas',   'smc-pct-deudas',   d.deuAct,  d.deuPpto,  false);

  // Excedente Líquido Dinámico y Desglose Paso a Paso
  const libreEl = document.getElementById('balance-libre');
  const badgeEl = document.getElementById('badge-liquidez-status');
  const tipEl   = document.getElementById('daily-survival-tip');

  const eqIng = document.getElementById('eq-ing-val');
  const eqGas = document.getElementById('eq-gas-val');
  const eqAho = document.getElementById('eq-aho-val');
  const eqDeu = document.getElementById('eq-deu-val');
  const eqNet = document.getElementById('eq-net-val');

  if (eqIng) eqIng.textContent = d.moneda + ' ' + formatNumber(d.ingAct);
  if (eqGas) eqGas.textContent = d.moneda + ' ' + formatNumber(d.gasAct);
  if (eqAho) eqAho.textContent = d.moneda + ' ' + formatNumber(d.ahoAct);
  if (eqDeu) eqDeu.textContent = d.moneda + ' ' + formatNumber(d.deuAct);

  if (libreEl) {
    if (d.saldo >= 0) {
      libreEl.textContent = '+' + d.moneda + ' ' + formatNumber(d.saldo);
      libreEl.style.color = '#02c076';
      if (eqNet) { eqNet.textContent = '+' + d.moneda + ' ' + formatNumber(d.saldo); eqNet.style.color = '#02c076'; }
      if (badgeEl) {
        badgeEl.textContent = 'Presupuesto Equilibrado (Sin Déficit)';
        badgeEl.style.background = 'rgba(2, 192, 118, 0.12)';
        badgeEl.style.color = '#047857';
      }
      if (tipEl) {
        tipEl.innerHTML = '<strong>Diagnóstico de Flujo de Caja:</strong> Tus ingresos cubren el 100% de tus gastos indispensables, el ahorro planificado del 20% y las cuotas de deuda. Los <strong>+' + d.moneda + ' ' + formatNumber(d.saldo) + '</strong> representan tu excedente neto libre en cuenta sin compromisos pendientes.';
        tipEl.style.background = 'rgba(2, 192, 118, 0.06)';
        tipEl.style.borderColor = 'rgba(2, 192, 118, 0.25)';
        tipEl.style.color = '#065f46';
      }
    } else {
      const deficitMonto = Math.abs(d.saldo);
      libreEl.textContent = '-' + d.moneda + ' ' + formatNumber(deficitMonto);
      libreEl.style.color = '#ef4444';
      if (eqNet) { eqNet.textContent = '-' + d.moneda + ' ' + formatNumber(deficitMonto); eqNet.style.color = '#ef4444'; }
      if (badgeEl) {
        badgeEl.textContent = 'Diferencia Menor: ' + d.moneda + ' ' + formatNumber(deficitMonto);
        badgeEl.style.background = 'rgba(245, 158, 11, 0.15)';
        badgeEl.style.color = '#b45309';
      }
      if (tipEl) {
        tipEl.innerHTML = '<strong>Ajuste Presupuestario Leve:</strong> Se registra un desvío puntual de solo <strong>' + d.moneda + ' ' + formatNumber(deficitMonto) + '</strong> en el mes (cubierto fácilmente por compras variables o fondo de reserva). No representa una alerta crítica de insolvencia.';
        tipEl.style.background = 'rgba(245, 158, 11, 0.08)';
        tipEl.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        tipEl.style.color = '#92400e';
      }
    }
  }
}

function renderConsejos(d) {
  const container = document.getElementById('tipsContainer');
  if (!container) return;

  const tips = generarConsejos(d);
  if (!tips.length) {
    container.innerHTML = '<div class="tip-card tip-success"><span class="tip-icon">✅</span><div class="tip-text"><p>¡Todo en orden este mes! Sigue registrando tus movimientos.</p></div></div>';
    return;
  }

  container.innerHTML = tips.map((t, i) => `
    <div class="tip-card tip-${t.tipo}" style="animation-delay: ${i * 0.08}s">
      <span class="tip-icon">${t.icono}</span>
      <div class="tip-text">
        <strong>${t.titulo}</strong>
        <p>${t.mensaje}</p>
      </div>
    </div>
  `).join('');
}

function generarConsejos(d) {
  const tips = [];
  const moneda = d.moneda;
  const efe = dbData.registro_efe || [];
  const curM = parseInt(filterMonth, 10) || 8;
  const prevM = curM > 1 ? curM - 1 : 12;

  // Construir mapa de categorías actual y anterior (solo Gastos)
  const curRows  = efe.filter(r => r.Mes === curM  && r.Tipo === 'Gasto');
  const prevRows = efe.filter(r => r.Mes === prevM && r.Tipo === 'Gasto');
  const catCur = {}, catPrev = {};
  curRows.forEach(r  => { catCur[r.Categoria]  = (catCur[r.Categoria]  || 0) + (r.Actual || 0); });
  prevRows.forEach(r => { catPrev[r.Categoria] = (catPrev[r.Categoria] || 0) + (r.Actual || 0); });

  const inevitables = ['Vivienda', 'Alimentación', 'Transporte', 'Salud e Higiene', 'Educación'];
  const eventuales  = ['Vestimenta', 'Tecnología'];
  const totalEventual = eventuales.reduce((s, c) => s + (catCur[c] || 0), 0);

  // --- 1. SALDO REAL CON SOLUCIÓN EXACTA ---
  if (d.saldo < 0) {
    const excess = Math.abs(d.saldo);
    const topDisc = Object.entries(catCur)
      .filter(([k]) => !inevitables.includes(k) && !eventuales.includes(k))
      .sort((a, b) => b[1] - a[1]);
    const topCat = topDisc[0];
    tips.push({
      tipo: 'danger', icono: '⚡',
      titulo: 'Déficit de ' + moneda + ' ' + formatNumber(excess) + ' este mes',
      mensaje: topCat
        ? 'Tu gasto en "' + topCat[0] + '" (' + moneda + ' ' + formatNumber(topCat[1]) + ') es la variable de ajuste disponible. Reducir un 30% allí rescata ' + moneda + ' ' + formatNumber(Math.round(topCat[1] * 0.3)) + ' sin afectar gastos de vida esenciales.'
        : 'Tus compromisos superan tus ingresos. Revisa si algún gasto de esta semana era aplazable.'
    });
  } else if (d.saldo > 0 && d.ingAct > 0) {
    const pctSaldo = ((d.saldo / d.ingAct) * 100).toFixed(1);
    tips.push({
      tipo: 'success', icono: '▲',
      titulo: 'Excedente real: ' + moneda + ' ' + formatNumber(d.saldo) + ' (' + pctSaldo + '% de ingresos)',
      mensaje: 'Destina el 70% (' + moneda + ' ' + formatNumber(Math.round(d.saldo * 0.7)) + ') a amortización de deuda y el 30% (' + moneda + ' ' + formatNumber(Math.round(d.saldo * 0.3)) + ') a tu portafolio. Eso acelera tu ruta a Guardián Financiero en 45 días.'
    });
  }

  // --- 2. GASTOS QUE SUBIERON VS MES ANTERIOR (SOLO DISCRECIONALES) ---
  let biggestIncrease = null, biggestGrowth = 0;
  Object.entries(catCur).forEach(([cat, curVal]) => {
    if (inevitables.includes(cat)) return;
    const prev = catPrev[cat] || 0;
    if (prev > 0 && curVal > prev) {
      const growth = curVal - prev;
      if (growth > biggestGrowth) { biggestGrowth = growth; biggestIncrease = { cat, curVal, prev, growth }; }
    }
  });
  if (biggestIncrease) {
    const pct = ((biggestIncrease.growth / biggestIncrease.prev) * 100).toFixed(0);
    const prevNombre = MESES_NOMBRES[prevM - 1].substring(0, 3);
    tips.push({
      tipo: 'warning', icono: '▼',
      titulo: biggestIncrease.cat + ': subió ' + pct + '% frente al mes anterior',
      mensaje: 'En ' + prevNombre + ' gastaste ' + moneda + ' ' + formatNumber(biggestIncrease.prev) + ', este mes ' + moneda + ' ' + formatNumber(biggestIncrease.curVal) + ' (+' + moneda + ' ' + formatNumber(biggestIncrease.growth) + '). Si este exceso no era necesario, aplazarlo el próximo mes lo convierte en ahorro inmediato.'
    });
  }

  // --- 3. BIENES DE VIDA ÚTIL YA CUBIERTOS ---
  if (totalEventual > 0) {
    tips.push({
      tipo: 'info', icono: '►',
      titulo: moneda + ' ' + formatNumber(totalEventual) + ' en bienes ya adquiridos (no repetir próximo mes)',
      mensaje: 'Vestimenta y Tecnología tienen vida útil de 6-18 meses. Ya están en uso. Si no repites ese gasto el próximo mes, liberas ' + moneda + ' ' + formatNumber(totalEventual) + ' para deuda o ahorro sin sacrificar bienestar.'
    });
  }

  // --- 4. DEUDA CON PLAN EXACTO ---
  if (d.ratioDeuda > 40) {
    const metaMonto = Math.round(d.ingAct * 0.25);
    const exceso = d.deuAct - metaMonto;
    tips.push({
      tipo: 'danger', icono: '▼',
      titulo: 'Deuda en ' + d.ratioDeuda.toFixed(0) + '% — reducir ' + moneda + ' ' + formatNumber(exceso) + '/mes',
      mensaje: 'Meta segura: máximo ' + moneda + ' ' + formatNumber(metaMonto) + '/mes. Refinanciar la cuota de mayor interés a plazo extendido puede reducir el pago mensual hasta ' + moneda + ' ' + formatNumber(Math.round(exceso * 0.6)) + ' sin aumentar el saldo total.'
    });
  } else if (d.ratioDeuda > 25) {
    const extraAmo = Math.round(d.ingAct * 0.05);
    tips.push({
      tipo: 'warning', icono: '►',
      titulo: 'Deuda en ' + d.ratioDeuda.toFixed(0) + '% — a pasos de la zona segura',
      mensaje: 'Agregar apenas ' + moneda + ' ' + formatNumber(extraAmo) + '/mes extra (5% de ingresos) a la amortización te pone en zona segura en menos de 5 meses sin sentir el esfuerzo.'
    });
  } else if (d.deuAct > 0) {
    tips.push({
      tipo: 'success', icono: '▲',
      titulo: 'Deuda bajo control (' + d.ratioDeuda.toFixed(0) + '%) — aplica avalancha',
      mensaje: 'Estás dentro del límite. Pagar cuota mínima a todo y el excedente a la de mayor tasa liquida tu deuda antes y te ahorra ' + moneda + ' ' + formatNumber(Math.round(d.deuAct * 0.08)) + ' en intereses acumulados.'
    });
  }

  // --- 5. AHORRO PERSONALIZADO ---
  if (d.ratioAhorro < 5 && d.ingAct > 0) {
    const targetAho = Math.round(d.ingAct * 0.2);
    const mitad = Math.round((targetAho - d.ahoAct) / 2);
    tips.push({
      tipo: 'danger', icono: '▼',
      titulo: 'Ahorro al ' + d.ratioAhorro.toFixed(0) + '% — faltan ' + moneda + ' ' + formatNumber(targetAho - d.ahoAct),
      mensaje: 'Programa una transferencia automática de ' + moneda + ' ' + formatNumber(mitad) + ' el primer día del mes a una cuenta separada. No lo percibes como renuncia, pero en 12 meses acumularás ' + moneda + ' ' + formatNumber(mitad * 12) + '.'
    });
  } else if (d.ratioAhorro < 20 && d.ingAct > 0) {
    const faltaAho = Math.round(d.ingAct * 0.2 - d.ahoAct);
    tips.push({
      tipo: 'warning', icono: '►',
      titulo: 'Ahorro al ' + d.ratioAhorro.toFixed(0) + '% — faltan ' + moneda + ' ' + formatNumber(faltaAho),
      mensaje: 'Los ' + moneda + ' ' + formatNumber(totalEventual) + ' de bienes de vida útil ya cubiertos que no deberías gastar el próximo mes te cruzarían el 20% sin ningún sacrificio adicional de estilo de vida.'
    });
  } else if (d.ratioAhorro >= 20) {
    const excAho = Math.round(d.ahoAct - d.ingAct * 0.2);
    tips.push({
      tipo: 'success', icono: '▲',
      titulo: 'Ahorro al ' + d.ratioAhorro.toFixed(0) + '% — superas la meta',
      mensaje: excAho > 0
        ? 'Considera migrar el excedente de ' + moneda + ' ' + formatNumber(excAho) + ' a un ETF indexado o renta fija al 6-8% anual en lugar de dejarlo en depósito sin rendimiento.'
        : 'Excelente disciplina. Mantén el hábito y en 12 meses habrás acumulado ' + moneda + ' ' + formatNumber(d.ahoAct * 12) + ' en tu portafolio.'
    });
  }

  // Sin ingresos
  if (d.ingAct === 0) {
    tips.push({
      tipo: 'info', icono: '►',
      titulo: 'No hay ingresos registrados este mes',
      mensaje: 'Empieza registrando tus ingresos usando el botón de acceso rápido. El sistema calculará automáticamente tus ratios reales.'
    });
  }

  return tips.slice(0, 5);
}

// Acción rápida: abre el modal EFE pre-llenado con el tipo seleccionado
function quickAdd(tipo) {
  // Abrir el modal
  openNewRecordModal();

  // Pre-seleccionar el tipo
  const tipoSel = document.getElementById('efe-tipo');
  if (tipoSel) {
    tipoSel.value = tipo;
    handleTipoChange(tipo);
  }

  // Actualizar el título del modal para ser amigable
  const modalTitle = document.getElementById('modalEFETitle');
  const labels = {
    'Ingreso':          '💰 Registrar ingreso de dinero',
    'Gasto':            '🛒 Registrar un gasto',
    'Ahorro e Inversión': '🌱 Registrar ahorro o inversión',
    'Deuda':            '💳 Registrar pago de deuda'
  };
  if (modalTitle) modalTitle.textContent = labels[tipo] || '📝 Agregar movimiento';

  // También poner el mes actual seleccionado
  const mesSel = document.getElementById('efe-mes');
  if (mesSel && filterMonth !== 'all') {
    mesSel.value = filterMonth;
  }
}


// ── PESTAÑAS EN MI PANEL (ORGANIZACIÓN Y CLARIDAD) ────────────────────────
function switchDashTab(tabId) {
  document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('tab-btn-' + tabId);
  if (activeBtn) activeBtn.classList.add('active');

  const secCat = document.getElementById('dash-sec-categorias');
  const secSub = document.getElementById('dash-sec-subcategorias');
  const secAcum = document.getElementById('dash-sec-acumulado');
  const secImp = document.getElementById('dash-sec-impacto');

  if (secCat) secCat.style.display = (tabId === 'cat') ? 'grid' : 'none';
  if (secSub) secSub.style.display = (tabId === 'sub') ? 'grid' : 'none';
  if (secAcum) secAcum.style.display = (tabId === 'acum') ? 'grid' : 'none';
  if (secImp) {
    secImp.style.display = (tabId === 'impacto') ? 'grid' : 'none';
    if (tabId === 'impacto') renderTrayectoriaComparativaChart();
  }
}

// ── GRÁFICO DE TRAYECTORIA Y DIFERENCIAL ECONÓMICO (ANTES VS DESPUÉS) ──────
function renderTrayectoriaComparativaChart() {
  const el = document.getElementById('chart-trayectoria-comparativa');
  if (!el) return;

  if (activeCharts['chart-trayectoria-comparativa']) {
    activeCharts['chart-trayectoria-comparativa'].destroy();
  }

  const db = dbData;
  const audit = db.auditoria_eficiencia || {};
  const desglose = audit.desglose_mensual || [];
  const moneda = (db.configuracion && db.configuracion.moneda) || 'S/.';
  const mesesCat = desglose.map(d => d.nombre);

  const costoManual = desglose.map(d => d.costo_tradicional);
  const costoDash   = desglose.map(d => d.costo_con_dashboard);
  
  // Acumular la diferencia económica neta mes a mes
  let acum = 0;
  const ahorroAcum = desglose.map(d => {
    acum += d.ahorro_neto;
    return acum;
  });

  activeCharts['chart-trayectoria-comparativa'] = new ApexCharts(el, {
    chart: {
      type: 'line',
      height: 320,
      toolbar: { show: false },
      dropShadow: { enabled: true, top: 4, blur: 8, opacity: 0.12 }
    },
    stroke: {
      width: [0, 0, 3.5],
      curve: 'smooth'
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 5
      }
    },
    series: [
      { name: 'Costo Ineficiente (Método Manual Protocolario)', type: 'column', data: costoManual },
      { name: 'Costo Optimizado (Con Dashboard de Finanzas)', type: 'column', data: costoDash },
      { name: 'Diferencial Económico Neto Acumulado (A tu favor)', type: 'line', data: ahorroAcum }
    ],
    colors: ['#f87171', '#34d399', '#02c076'],
    xaxis: { categories: mesesCat, labels: { style: { fontSize: '11px', fontWeight: 600 } } },
    yaxis: [
      {
        title: { text: 'Costo Operativo Mensual (Soles)', style: { fontSize: '11px', color: '#64748b' } },
        labels: { formatter: v => `${moneda} ${formatNumber(v)}` }
      },
      {
        opposite: true,
        title: { text: 'Beneficio Acumulado (Soles)', style: { fontSize: '11px', color: '#02c076' } },
        labels: { formatter: v => `${moneda} ${formatNumber(v)}` }
      }
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: v => `${moneda} ${formatNumber(v)}` }
    },
    legend: { position: 'top', fontSize: '11px', fontWeight: 600 }
  });

  activeCharts['chart-trayectoria-comparativa'].render();
}

// ══════════════════════════════════════════════════════════════════════════
// 🧭 MOTOR DE AUTOEVALUACIÓN FINANCIERA & SUPERACIÓN PERSONAL
// Comparativa real mes a mes, discriminando naturaleza de gasto
// ══════════════════════════════════════════════════════════════════════════
function renderAutoevaluacionFinanciera() {
  const efe = dbData.registro_efe || [];
  const esf = dbData.registro_esf || [];
  const moneda = (dbData.configuracion && dbData.configuracion.moneda) || 'S/.';

  let curM = parseInt(filterMonth, 10);
  if (isNaN(curM) || curM < 1) curM = 8;
  const prevM = curM > 1 ? curM - 1 : 12;

  const curRows = efe.filter(r => r.Mes === curM);
  const prevRows = efe.filter(r => r.Mes === prevM);

  const curESF = esf.find(e => e.Mes === curM) || {};
  const prevESF = esf.find(e => e.Mes === prevM) || {};

  let curIng = 0, prevIng = 0;
  let curGas = 0, prevGas = 0;
  let curAho = 0, prevAho = 0;
  let curDeu = 0, prevDeu = 0;

  curRows.forEach(r => {
    if (r.Tipo === 'Ingreso') curIng += r.Actual || 0;
    else if (r.Tipo === 'Gasto') curGas += r.Actual || 0;
    else if (r.Tipo === 'Ahorro e Inversión') curAho += r.Actual || 0;
    else if (r.Tipo === 'Deuda') curDeu += r.Actual || 0;
  });

  prevRows.forEach(r => {
    if (r.Tipo === 'Ingreso') prevIng += r.Actual || 0;
    else if (r.Tipo === 'Gasto') prevGas += r.Actual || 0;
    else if (r.Tipo === 'Ahorro e Inversión') prevAho += r.Actual || 0;
    else if (r.Tipo === 'Deuda') prevDeu += r.Actual || 0;
  });

  const curPat = curESF.Patrimonio_Neto || 0;
  const prevPat = prevESF.Patrimonio_Neto || 0;

  const curAhoPct = curIng > 0 ? (curAho / curIng) * 100 : 0;
  const prevAhoPct = prevIng > 0 ? (prevAho / prevIng) * 100 : 0;

  function calcScore(gas, aho, deu, ing) {
    if (ing <= 0) return 0;
    let s = 0;
    const rg = (gas / ing) * 100;
    const ra = (aho / ing) * 100;
    const rd = (deu / ing) * 100;
    if (rg <= 45) s += 34; else if (rg <= 55) s += 17;
    if (ra >= 20) s += 33; else if (ra >= 10) s += 16;
    if (rd <= 25) s += 33; else if (rd <= 35) s += 16;
    return s;
  }

  const curScore = calcScore(curGas, curAho, curDeu, curIng);
  const prevScore = calcScore(prevGas, prevAho, prevDeu, prevIng);

  let inevSum = 0, evenSum = 0, discSum = 0;
  curRows.forEach(r => {
    if (r.Tipo === 'Gasto') {
      const cat = r.Categoria;
      if (['Vivienda', 'Alimentación', 'Transporte', 'Salud e Higiene', 'Educación'].includes(cat)) {
        inevSum += r.Actual || 0;
      } else if (['Vestimenta', 'Tecnología'].includes(cat)) {
        evenSum += r.Actual || 0;
      } else {
        discSum += r.Actual || 0;
      }
    }
  });

  const prevNombre = MESES_NOMBRES[prevM - 1].substring(0, 3);

  // 1. Ingresos
  const elPrevIng = document.getElementById('aev-prev-ing');
  const elCurIng = document.getElementById('aev-cur-ing');
  const elDiffIng = document.getElementById('aev-diff-ing');
  if (elPrevIng) elPrevIng.textContent = `${prevNombre}: ${moneda} ${formatNumber(prevIng)}`;
  if (elCurIng) elCurIng.textContent = `${moneda} ${formatNumber(curIng)}`;
  if (elDiffIng) {
    const diff = curIng - prevIng;
    const pct = prevIng > 0 ? ((diff / prevIng) * 100).toFixed(1) : 0;
    const isGood = diff >= 0;
    elDiffIng.className = 'avb-delta ' + (isGood ? 'good' : 'bad');
    elDiffIng.innerHTML = `${isGood ? '▲ +' : '▼ -'}${moneda} ${formatNumber(Math.abs(diff))} (${pct}%)`;
  }

  // 2. Patrimonio
  const elPrevPat = document.getElementById('aev-prev-pat');
  const elCurPat = document.getElementById('aev-cur-pat');
  const elDiffPat = document.getElementById('aev-diff-pat');
  if (elPrevPat) elPrevPat.textContent = `${prevNombre}: ${moneda} ${formatNumber(prevPat)}`;
  if (elCurPat) elCurPat.textContent = `${moneda} ${formatNumber(curPat)}`;
  if (elDiffPat) {
    const diff = curPat - prevPat;
    const pct = prevPat > 0 ? ((diff / prevPat) * 100).toFixed(1) : 0;
    const isGood = diff >= 0;
    elDiffPat.className = 'avb-delta ' + (isGood ? 'good' : 'bad');
    elDiffPat.innerHTML = `${isGood ? '▲ +' : '▼ -'}${moneda} ${formatNumber(Math.abs(diff))} (${pct}%)`;
  }

  // 3. Ahorro
  const elPrevAho = document.getElementById('aev-prev-aho');
  const elCurAho = document.getElementById('aev-cur-aho');
  const elDiffAho = document.getElementById('aev-diff-aho');
  if (elPrevAho) elPrevAho.textContent = `${prevNombre}: ${prevAhoPct.toFixed(1)}%`;
  if (elCurAho) elCurAho.textContent = `${curAhoPct.toFixed(1)}%`;
  if (elDiffAho) {
    const diffPct = curAhoPct - prevAhoPct;
    const isGood = diffPct >= 0;
    elDiffAho.className = 'avb-delta ' + (isGood ? 'good' : 'bad');
    elDiffAho.innerHTML = `${isGood ? '▲ +' : '▼ -'}${diffPct.toFixed(1)}% (${moneda} ${formatNumber(curAho)})`;
  }

  // 4. Score FICO
  const elPrevScore = document.getElementById('aev-prev-score');
  const elCurScore = document.getElementById('aev-cur-score');
  const elDiffScore = document.getElementById('aev-diff-score');
  if (elPrevScore) elPrevScore.textContent = `${prevNombre}: ${prevScore} pts`;
  if (elCurScore) elCurScore.textContent = `${curScore} pts`;
  if (elDiffScore) {
    const diff = curScore - prevScore;
    const proyScore = Math.min(100, curScore + 15);
    const isGood = diff >= 0;
    elDiffScore.className = 'avb-delta ' + (isGood ? 'good' : 'bad');
    elDiffScore.innerHTML = `${isGood ? '▲ +' : '▼ -'}${Math.abs(diff)} pts | Proy: ${proyScore} pts`;
  }

  // Montos de naturaleza de gasto
  const elInev = document.getElementById('enc-amount-inev');
  const elEven = document.getElementById('enc-amount-even');
  const elDisc = document.getElementById('enc-amount-disc');
  if (elInev) elInev.textContent = `${moneda} ${formatNumber(inevSum)} / mes`;
  if (elEven) elEven.textContent = `${moneda} ${formatNumber(evenSum)} / mes`;
  if (elDisc) elDisc.textContent = `${moneda} ${formatNumber(discSum)} / mes`;

  // Total liberado y hoja de ruta táctica
  const ahorroDisc = Math.round(discSum * 0.2);
  const totalLiberado = evenSum + ahorroDisc;
  const elLib = document.getElementById('tsc-liberated-sum');
  if (elLib) elLib.textContent = `+${moneda} ${formatNumber(totalLiberado)} / mes`;

  const elRoadDeu = document.getElementById('tsc-road-deuda');
  if (elRoadDeu) {
    const montoDeu = Math.round(totalLiberado * 0.7);
    elRoadDeu.textContent = `Destinar ${moneda} ${formatNumber(montoDeu)} del flujo liberado a la deuda de mayor tasa reduce tu carga y te saca de la zona roja en 60 días.`;
  }
}
