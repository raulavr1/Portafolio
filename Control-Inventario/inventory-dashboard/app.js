
let SCAN_DEVICE_TYPE = 'telefono';
function setScanDeviceType(type) {
  SCAN_DEVICE_TYPE = type;
  const btnPhone = document.getElementById('btnDevicePhone');
  const btnPC = document.getElementById('btnDevicePC');
  const hint = document.getElementById('deviceTypeHint');

  const activeStyle = 'padding:10px 8px;border-radius:10px;border:2px solid #2563eb;background:#2563eb;color:#fff;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px';
  const inactiveStyle = 'padding:10px 8px;border-radius:10px;border:2px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px';

  if (type === 'telefono') {
    if (btnPhone) btnPhone.style.cssText = activeStyle;
    if (btnPC) btnPC.style.cssText = inactiveStyle;
    if (hint) { hint.textContent = '📱 Modo: Teléfono — Buscará IMEI'; hint.style.color = '#2563eb'; hint.style.background = '#eff6ff'; }
  } else {
    if (btnPC) btnPC.style.cssText = activeStyle;
    if (btnPhone) btnPhone.style.cssText = inactiveStyle;
    if (hint) { hint.textContent = '💻 Modo: PC / Laptop — Buscará S/N o Código de Barras'; hint.style.color = '#7c3aed'; hint.style.background = '#ede9fe'; }
  }
}
window.setScanDeviceType = setScanDeviceType;

/* =====================================================
   PREVENCIÓN RIGUROSA DE SCROLL EN DASHBOARD AL ABRIR MODALES
   ===================================================== */
let _scrollLockCount = 0;
let _scrollLockY = 0;

function lockBodyScroll() {
  _scrollLockCount++;
  if (_scrollLockCount === 1) {
    _scrollLockY = window.scrollY || window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
    if (document.documentElement) document.documentElement.classList.add('modal-locked');
    document.body.classList.add('modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + _scrollLockY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
}

function unlockBodyScroll() {
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if (_scrollLockCount === 0) {
    if (document.documentElement) document.documentElement.classList.remove('modal-locked');
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, _scrollLockY);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('touchmove', function(e) {
    if (document.body.classList.contains('modal-open')) {
      if (e.target && e.target.classList && (e.target.classList.contains('modal-overlay') || e.target.classList.contains('sidebar-overlay'))) {
        e.preventDefault();
      }
    }
  }, { passive: false });
}

function formatDisplayDate(val) {
  if (!val || val === 'Sin fecha') return 'Sin fecha';
  const num = Number(val);
  if (!isNaN(num) && num > 25000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === 'string' && val.includes('-') && val.length >= 10) {
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return String(val);
}

'use strict';

/* =====================================================
   STATE
   ===================================================== */
const STATE = {
  inventory: [], filtered: [],
    loadedSources: [], raw1: [], raw2: [],
  headers1: [], headers2: [], mappingSource: 0, pendingMapping: null,
  duplicatesRemoved: 0, sortCol: '', sortDir: 'asc',
  currentPage: 1, pageSize: 15, activeCategory: 'all', editIndex: -1,
  actasAsignacion: [], actasDevolucion: [], movements: [],
};

const FIELDS = [
  { key: 'nSerie',       label: 'N° de Serie',    required: true  },
  { key: 'marca',        label: 'Marca',           required: false },
  { key: 'modelo',       label: 'Modelo',          required: false },
  { key: 'categoria',    label: 'Categoría',       required: false },
  { key: 'estado',       label: 'Estado',          required: false },
  { key: 'ubicacion',    label: 'Ubicación',       required: false },
  { key: 'responsable',  label: 'Responsable',     required: false },
  { key: 'dni',          label: 'DNI',             required: false },
  { key: 'fechaCompra',  label: 'Fecha de Compra', required: false },
  { key: 'observaciones',label: 'Observaciones',   required: false },
];

const CATEGORY_ICONS = {
  'Laptops':'💻','Computadoras de escritorio':'🖥️','Tablets':'📲','Monitores':'🖵','Servidores':'🗄️',
  'Impresoras':'🖨️','Escáneres':'🔎','Multifuncionales':'🖨️',
  'Switches/Routers':'🌐','Access Points':'📡','UPS':'🔋',
  'Teléfonos fijos':'☎️','Teléfonos móviles':'📱','Teléfonos IP':'📞','Radios/Walkie-Talkie':'📻',
  'Cámaras de seguridad':'📹','Cámaras fotográficas':'📷','DVR/NVR':'🎞️','Sistemas de alarma':'🚨',
  'Televisores':'📺','Proyectores':'📽️','Equipos de sonido':'🔊','Videoconferencia':'🎦',
  'Refrigeradoras':'🧊','Microondas':'〽️','Cafeteras':'☕','Aires acondicionados':'❄️',
  'Ventiladores':'🌀','Dispensadores de agua':'💧',
  'Teclados y mouse':'⌨️','Auriculares/Headsets':'🎧','Webcams':'📸','Memorias/Discos externos':'💾',
  'Escritorios':'🪑','Sillas':'🪑','Archivadores/Estantes':'🗃️','Pizarras/Pantallas':'🖼️',
  'Planta eléctrica/Generador':'⚡','Otros':'📦',
};

let chartCategorias = null, chartEstados = null, chartMarcas = null, chartRotacionTendencia = null;
let html5QrScanner  = null;
let CURRENT_DASHBOARD_CATEGORY = 'Computadoras';
let CURRENT_SCANNER_OPERATION = 'asignar';
let CURRENT_INVENTORY_VIEW = 'cuadriculas';
let CURRENT_INVENTORY_CATEGORY = 'Computadoras';
let CURRENT_INVENTORY_OFFICE = '';

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');

  const sbToggle = document.getElementById('sidebarToggle');
  if (sbToggle && sidebar) {
    sbToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      const isOpen = sidebar.classList.contains('mobile-open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.section);
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('mobile-open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
  const gs = document.getElementById('globalSearch'); if (gs) gs.addEventListener('input', e => applyFilters(e.target.value.trim().toLowerCase()));

  // Startup: mostrar algo rápido desde localStorage mientras carga del servidor
  const saved = localStorage.getItem('invcontrol_data');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.inventory && p.inventory.length > 0) {
        STATE.inventory = p.inventory;
        STATE.inventory.forEach(item => { item.estado = normalizeEstado(item.estado, item); });
        STATE.duplicatesRemoved = p.duplicatesRemoved || 0;
        STATE.actasAsignacion = p.actasAsignacion || [];
        STATE.actasDevolucion = p.actasDevolucion || [];
        STATE.movements = p.movements || [];
        STATE.loadedSources = p.loadedSources || [];
        STATE.isClearedByUser = false;
        STATE.filtered = [...STATE.inventory];
        if ((!STATE.actasDevolucion || STATE.actasDevolucion.length === 0) && window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.actasDevolucion) {
          STATE.actasDevolucion = [...window.DEMO_INVENTORY_FULL.actasDevolucion];
        }
        if ((!STATE.actasAsignacion || STATE.actasAsignacion.length === 0) && window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.actasAsignacion) {
          STATE.actasAsignacion = [...window.DEMO_INVENTORY_FULL.actasAsignacion];
        }
        if ((!STATE.movements || STATE.movements.length === 0) && window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.movements) {
          STATE.movements = [...window.DEMO_INVENTORY_FULL.movements];
        }
        initLoadedSources();
        renderLoadedSourcesTable();
        refreshAll(false);
      }
    } catch(e) {}
  } else {
    // Si no hay datos guardados localmente, inicializar desde la base demo oficial
    if (window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.inventory) {
      STATE.inventory = deduplicateInventory([...window.DEMO_INVENTORY_FULL.inventory]);
      STATE.actasAsignacion = [...(window.DEMO_INVENTORY_FULL.actasAsignacion || [])];
      STATE.actasDevolucion = [...(window.DEMO_INVENTORY_FULL.actasDevolucion || [])];
      STATE.movements = [...(window.DEMO_INVENTORY_FULL.movements || [])];
      STATE.loadedSources = [...(window.DEMO_INVENTORY_FULL.loadedSources || [])];
      STATE.filtered = [...STATE.inventory];
      initLoadedSources();
      renderLoadedSourcesTable();
      refreshAll(false);
    }
  }

  // El servidor es siempre la fuente de verdad — cargar y sobreescribir lo local
  syncWithServer();

  // Pre-cargar túnel ngrok y red local de inmediato en segundo plano
  fetch('/api/network-info').then(r => r.json()).then(data => {
    const localInput = document.getElementById('shareLocalUrlInput');
    if (localInput && data.localUrl) localInput.value = data.localUrl;
  }).catch(() => {});

  fetch('/api/ngrok-start').then(r => r.json()).then(data => {
    if (data && data.url) {
      const input = document.getElementById('shareUrlInput');
      const openLink = document.getElementById('shareOpenDirectLink');
      if (input) input.value = data.url;
      if (openLink) openLink.href = data.url;
    }
  }).catch(() => {});
});

async function syncWithServer() {
  try {
    const res = await fetch('/api/inventory');
    if (!res.ok) return;
    const json = await res.json();
    if (!json || !json.success || !json.data) return;

    const srv = json.data;
    if (srv.isClearedByUser === true) {
      STATE.inventory = [];
      STATE.filtered = [];
      STATE.loadedSources = [];
      STATE.isClearedByUser = true;
      initLoadedSources();
      renderLoadedSourcesTable();
      refreshAll(false);
      return;
    }
    if (!srv.inventory || srv.inventory.length === 0) return;

    STATE.inventory = deduplicateInventory(srv.inventory);
    STATE.inventory.forEach(item => { item.estado = normalizeEstado(item.estado, item); });
    STATE.duplicatesRemoved = srv.duplicatesRemoved || 0;
    STATE.actasAsignacion = (srv.actasAsignacion && srv.actasAsignacion.length > 0) ? srv.actasAsignacion : ((window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.actasAsignacion) || []);
    STATE.actasDevolucion = (srv.actasDevolucion && srv.actasDevolucion.length > 0) ? srv.actasDevolucion : ((window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.actasDevolucion) || []);
    STATE.movements = (srv.movements && srv.movements.length > 0) ? srv.movements : ((window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.movements) || []);
    STATE.loadedSources = srv.loadedSources || [];
    STATE.isClearedByUser = false;
    STATE.filtered = [...STATE.inventory];

    // Actualizar localStorage con la versión fresca del servidor
    try {
      localStorage.setItem('invcontrol_data', JSON.stringify({
        inventory: STATE.inventory,
        duplicatesRemoved: STATE.duplicatesRemoved,
        actasAsignacion: STATE.actasAsignacion,
        actasDevolucion: STATE.actasDevolucion,
        movements: STATE.movements,
        loadedSources: STATE.loadedSources,
        isClearedByUser: false,
        schemaVersion: 4
      }));
    } catch(e) {}

    initLoadedSources();
    renderLoadedSourcesTable();
    refreshAll(false);
  } catch(e) {
    console.warn('Sync de servidor omitido:', e);
  }
}

function loadOfficialData() {
  if (window.OFFICIAL_INVENTORY_DATA && window.OFFICIAL_INVENTORY_DATA.length) {
    STATE.inventory = deduplicateInventory([...window.OFFICIAL_INVENTORY_DATA]);
    STATE.duplicatesRemoved = 4;
    STATE.activeCategory = 'all';
    refreshAll();
    showToast(`✅ ${STATE.inventory.length} equipos únicos cargados`, 'success');
    navigateTo('dashboard');
  } else {
    showToast('⚠️ No se encontraron los datos oficiales pre-procesados', 'warning');
  }
}

/* Strict deduplication: phones by CODIGO/IMEI, PCs by SERIE, others by unique import ID */
function deduplicateInventory(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    item.estado = normalizeEstado(item.estado, item);
    // Cada registro oficial importado cuenta con su id propio o posición física única
    const key = item.id || (item.nSerie && item.nSerie !== '-' ? (item.nSerie + '_' + (item.imei1 || '') + '_' + i) : ('ROW_' + i));
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/* =====================================================
   NAVIGATION
   ===================================================== */
function navigateTo(section) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll(`.nav-item[data-section="${section}"]`).forEach(el => el.classList.add('active'));
  const secEl = document.getElementById(`section-${section}`);
  if (secEl) secEl.classList.add('active');
  const titles = {
    dashboard: 'Panel General',
    escanear: 'Lector & Escáner de Equipos',
    asignacion: 'Asignaciones de Equipos (Actas PDF)',
    devoluciones: 'Devoluciones y Retiros (Actas PDF)',
    inventario: 'Inventario Maestro de Equipos',
    'etiquetas-qr': 'Etiquetas QR – Generador e Impresión A4',
    importar: 'Cargar y Sincronizar Inventario'
  };
  document.getElementById('pageTitle').textContent = titles[section] || section;
  document.body.classList.toggle('section-dashboard-active', section === 'dashboard');

  // Sincronizar barra móvil
  document.querySelectorAll('.mob-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  if (section === 'dashboard') {
    renderOfficeCards();
    updateRotationTrendChart();
    updateSaludOperativaChart();
  }
  if (section === 'inventario') {
    renderInventoryViews();
  }
  if (section === 'asignacion') {
    renderActasAsignacionTable();
  }
  if (section === 'devoluciones') {
    renderActasDevolucionTable();
  }
  if (section === 'etiquetas-qr') {
    renderQRLabelsView();
  }
  if (section !== 'escanear') stopScanner();
}
window.navigateTo = navigateTo;
window.navigateToSection = navigateTo;

/* =====================================================
   REFRESH
   ===================================================== */
function updateActiveDocumentBanner() {
  const nameEl = document.getElementById('dashActiveDocName');
  const badgeEl = document.getElementById('dashActiveDocBadge');
  const detailsEl = document.getElementById('dashActiveDocDetails');
  if (!nameEl) return;

  const total = (STATE.inventory || []).length;
  if (total > 0) {
    nameEl.textContent = 'Inventario de Oficinas';
    if (badgeEl) {
      badgeEl.textContent = `🟢 ${total} Equipos Activos`;
      badgeEl.style.background = '#dcfce7';
      badgeEl.style.color = '#15803d';
      badgeEl.style.border = '1px solid #bbf7d0';
    }
    if (detailsEl) {
      detailsEl.textContent = `Base consolidada activa (${total} registros): Inventario de Oficinas`;
    }
  } else {
    nameEl.textContent = 'Sin Base de Datos Cargada';
    if (badgeEl) {
      badgeEl.textContent = 'Sin Datos';
      badgeEl.style.background = '#f1f5f9';
      badgeEl.style.color = '#64748b';
      badgeEl.style.border = '1px solid #cbd5e1';
    }
    if (detailsEl) {
      detailsEl.textContent = 'No hay equipos cargados. Sube un archivo Excel para comenzar.';
    }
  }
}

function refreshAll(syncServer = true) {
  try { updateKPIs(); } catch(e) { console.warn('updateKPIs err:', e); }
  try { updateActiveDocumentBanner(); } catch(e) {}
  try { renderOfficeCards(); } catch(e) { console.warn('renderOfficeCards err:', e); }
  try { updateRotationTrendChart(); } catch(e) { console.warn('rotChart err:', e); }
  try { updateSaludOperativaChart(); } catch(e) { console.warn('saludChart err:', e); }
  try { renderInventoryViews(); } catch(e) { console.warn('renderInventoryViews err:', e); }
  try { renderActasAsignacionTable(); } catch(e) {}
  try { renderActasDevolucionTable(); } catch(e) {}
  try { updateStockDatalist(); } catch(e) {}
  try { updateAssignedDatalist(); } catch(e) {}
  try { persistData(syncServer); } catch(e) {}
}

/* =====================================================
   KPIs (3 Estados: Stock, Asignado, Broken | 2 Enfoques)
   ===================================================== */
function updateKPIs() {
  const inv = STATE.inventory || [];
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const asignados = inv.filter(r => normalizeEstado(r.estado, r) === 'Asignado').length;
  const stock = inv.filter(r => normalizeEstado(r.estado, r) === 'Stock').length;
  const broken = inv.filter(r => normalizeEstado(r.estado, r) === 'Broken').length;
  const offices = (typeof getOfficeList === 'function') ? getOfficeList().length : 0;

  // Actual dashboard & inventory KPIs
  setEl('invKpiTotal', inv.length);
  setEl('invKpiAsignados', asignados);
  setEl('invKpiStock', stock);
  setEl('invKpiBroken', broken);
  setEl('invKpiOficinas', offices);

  // Legacy IDs (safe updates)
  setEl('kpiTotal', inv.length);
  setEl('kpiStock', stock);
  setEl('kpiAsignado', asignados);
  setEl('kpiBroken', broken);
  setEl('kpiComputadoras', inv.filter(r => {
    const catNorm = (r.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return catNorm.includes('computadora') || catNorm.includes('laptop') || catNorm.includes('pc');
  }).length);
  setEl('kpiCorporativos', inv.filter(r => {
    const catNorm = (r.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return catNorm.includes('telefono') || catNorm.includes('corporativo') || catNorm.includes('celular');
  }).length);

  try { updatePillCounts(); } catch(e) {}
}

function updatePillCounts() {
  const inv = STATE.inventory;
  const elAll = document.getElementById('pillCountAll');
  const elPC  = document.getElementById('pillCountPC');
  const elTlf = document.getElementById('pillCountTlf');
  const elInm = document.getElementById('pillCountInmuebles');
  if (elAll) elAll.textContent = inv.length;
  if (elPC)  elPC.textContent  = inv.filter(r => (r.categoria || '').includes('Computadoras')).length;
  if (elTlf) elTlf.textContent = inv.filter(r => (r.categoria || '').includes('Teléfonos') || (r.categoria || '').includes('Corporativos')).length;
  if (elInm) elInm.textContent = inv.filter(r => (r.categoria || '').includes('Inmuebles')).length;
}

function normalizeEstado(s, item) {
  if (typeof s === 'object' && s !== null) {
    item = s;
    s = item.estado;
  }

  const str = (s || (item && item.estado) || '').toString().toLowerCase().trim();
  const resp = (item && (item.responsable || item['APELLIDOS Y NOMBRES (usuario)'] || item['USUARIO'] || item['RESPONSABLE']) || '').toString().trim();
  const respUpper = resp.toUpperCase();
  const ubi = (item && (item.ubicacion || item['AREA'] || item['OFICINA']) || '').toString().trim().toUpperCase();
  const dni = (item && (item.dni || item['DNI']) || '').toString().trim();
  const dniUpper = dni.toUpperCase();

  // 1. Broken / Bajas (Prioridad máxima)
  if (str.includes('broken') || str.includes('dañado') || str.includes('dañada') || 
      str.includes('averiado') || str.includes('baja') || str.includes('no operativo') || 
      str.includes('failure') || respUpper.includes('BROKEN') || ubi.includes('BROKEN') || 
      dniUpper.includes('BROKEN')) {
    return 'Broken';
  }

  // 2. Stock explícito en responsable, área o DNI
  if (respUpper === 'STOCK' || respUpper.includes('ALMACEN') || ubi.includes('STOCK') || 
      dniUpper === 'STOCK' || str === 'stock' || str.includes('en stock')) {
    // Si tiene un nombre real de colaborador y DNI válido, se considera asignado
    if (respUpper !== 'STOCK' && !respUpper.includes('ALMACEN') && /^[0-9]{7,12}$/.test(dni)) {
      return 'Asignado';
    }
    return 'Stock';
  }

  // 3. Posee colaborador / responsable asignado válido
  if (resp && resp !== '-' && respUpper !== 'STOCK' && respUpper !== 'BROKEN' && 
      respUpper !== 'SIN ASIGNAR' && respUpper !== 'DISPONIBLE' && respUpper !== 'LIBRE') {
    return 'Asignado';
  }

  // 4. Posee DNI numérico asignado
  if (dni && /^[0-9]{7,12}$/.test(dni)) {
    return 'Asignado';
  }

  // 5. Criterios de texto en el estado
  if (str.includes('asignado') || str.includes('asignada') || str.includes('en uso')) {
    return 'Asignado';
  }

  // 6. Por defecto sin asignación
  return 'Stock';
}

function normalizeCategoria(c) {
  if (!c) return 'Computadoras';
  const str = c.toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (str.includes('COMPUTADORA') || str.includes('LAPTOP') || str.includes('MONITOR') || str.includes('PC') || str.includes('ALL IN ONE')) {
    return 'Computadoras';
  }
  if (str.includes('TELEFONO') || str.includes('CORPORATIVO') || str.includes('CELULAR') || str.includes('SMARTPHONE')) {
    return 'Teléfonos / Corporativos';
  }
  return 'Inmuebles y Electrodomésticos';
}

/* =====================================================
   CHARTS
   ===================================================== */
function updateCharts() {
  buildChartEstados();
  buildChartCategorias();
  buildChartMarcas();
}

function buildChartEstados() {
  const estados = ['Stock', 'Asignado', 'Broken'];
  const labels = ['🟢 Stock (Disponible)', '👤 Asignado (En uso)', '🔴 Broken (Dañado/Baja)'];
  const colors = ['#16a34a', '#7c3aed', '#dc2626'];
  const data = estados.map(e => STATE.inventory.filter(r => normalizeEstado(r.estado) === e).length);

  const ctx = document.getElementById('chartEstados').getContext('2d');
  if (chartEstados) chartEstados.destroy();
  chartEstados = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } } }
    }
  });
}

function buildChartCategorias() {
  const cats = ['Computadoras', 'Teléfonos / Corporativos', 'Inmuebles y Electrodomésticos'];
  const colors = ['#2563eb', '#f97316', '#0d9488'];
  const data = cats.map(c => STATE.inventory.filter(r => normalizeCategoria(r.categoria) === c).length);

  const ctx = document.getElementById('chartCategorias').getContext('2d');
  if (chartCategorias) chartCategorias.destroy();
  chartCategorias = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } } }
    }
  });
}

function buildChartMarcas() {
  const counts={};
  STATE.inventory.forEach(r=>{ const m=(r.marca||'Sin marca').trim(); counts[m]=(counts[m]||0)+1; });
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const ctx=document.getElementById('chartMarcas').getContext('2d');
  if (chartMarcas) chartMarcas.destroy();
  chartMarcas = new Chart(ctx,{type:'bar',data:{labels:sorted.map(x=>x[0]),datasets:[{label:'Equipos',data:sorted.map(x=>x[1]),backgroundColor:'#2563eb',borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'#f1f5f9'}},y:{grid:{display:false}}}}});
}

function generateColors(n) {
  const p=['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0d9488','#ec4899','#f97316','#0ea5e9','#84cc16'];
  return Array.from({length:n},(_,i)=>p[i%p.length]);
}

/* =====================================================
   RECENT TABLE
   ===================================================== */
function renderRecentTable() {
  const tbody=document.getElementById('recentTableBody');
  if (!tbody) return;
  const last10=[...STATE.inventory].slice(-10).reverse();
  if (!last10.length) { tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><h4>Sin datos</h4><p>Importa un archivo o agrega equipos</p></div></td></tr>`; return; }
  tbody.innerHTML=last10.map(row=>`<tr>
    <td><strong>${esc(row.nSerie)}</strong></td><td>${esc(row.marca)}</td><td>${esc(row.modelo)}</td>
    <td><span class="badge" style="background:#eff6ff;color:#2563eb">${esc(row.categoria)}</span></td>
    <td>${statusBadge(row.estado)}</td><td>${esc(row.ubicacion)}</td><td>${esc(row.responsable)}</td>
  </tr>`).join('');
}

/* =====================================================
   MAIN TABLE
   ===================================================== */
function renderTable() {
  const tbody = document.getElementById('mainTableBody');
  const thead = document.getElementById('mainTableHead');
  if (!tbody) return;
  const total = STATE.filtered.length;
  const pages = Math.ceil(total / STATE.pageSize) || 1;
  STATE.currentPage = Math.min(STATE.currentPage, pages);
  const start = (STATE.currentPage - 1) * STATE.pageSize;
  const slice = STATE.filtered.slice(start, start + STATE.pageSize);
  const filterCountEl = document.getElementById('filterCount');
  if (filterCountEl) filterCountEl.textContent = `${total} registros`;

  const isPhone = CURRENT_INVENTORY_CATEGORY === 'Teléfonos / Corporativos';
  const isElectro = CURRENT_INVENTORY_CATEGORY === 'Inmuebles y Electrodomésticos';

  if (thead) {
    if (isPhone) {
      thead.innerHTML = `<tr>
        <th data-col="codigo">CÓDIGO ⇅</th>
        <th data-col="area">ÁREA ⇅</th>
        <th data-col="oficina">OFICINA ⇅</th>
        <th data-col="marca">MARCA ⇅</th>
        <th data-col="color">COLOR ⇅</th>
        <th data-col="imei1">IMEI 1 ⇅</th>
        <th data-col="imei2">IMEI 2 ⇅</th>
        <th data-col="responsable">RESPONSABLE / USUARIO (DNI) ⇅</th>
        <th data-col="supervisor">SUPERVISOR ⇅</th>
        <th data-col="estado">ESTADO ⇅</th>
        <th>ACCIONES</th>
      </tr>`;
    } else if (isElectro) {
      thead.innerHTML = `<tr>
        <th data-col="oficina">OFICINA ⇅</th>
        <th data-col="cantidad">CANTIDAD ⇅</th>
        <th data-col="articulo">ARTÍCULO / TIPO ⇅</th>
        <th data-col="marca">MARCA ⇅</th>
        <th data-col="modelo">MODELO ⇅</th>
        <th data-col="estado">ESTADO ⇅</th>
        <th>ACCIONES</th>
      </tr>`;
    } else {
      // Computadoras / PC
      thead.innerHTML = `<tr>
        <th data-col="codigo">CÓDIGO ⇅</th>
        <th data-col="area">ÁREA ⇅</th>
        <th data-col="oficina">OFICINA ⇅</th>
        <th data-col="marca">MARCA ⇅</th>
        <th data-col="modelo">MODELO ⇅</th>
        <th data-col="serie">SERIE ⇅</th>
        <th data-col="responsable">RESPONSABLE / USUARIO (DNI) ⇅</th>
        <th data-col="supervisor">SUPERVISOR ⇅</th>
        <th data-col="estado">ESTADO ⇅</th>
        <th>ACCIONES</th>
      </tr>`;
    }
  }

  const colSpan = isElectro ? 7 : (isPhone ? 11 : 10);
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}"><div class="empty-state"><div class="empty-icon">🔍</div><h4>Sin resultados</h4><p>Ajusta los filtros o importa datos.</p></div></td></tr>`;
    renderPagination(0, 1);
    return;
  }

  tbody.innerHTML = slice.map(row => {
    const realIdx = STATE.inventory.indexOf(row);
    const colorTag = (row.color && row.color !== '-' && row.color !== '—') 
      ? `<span class="badge-color-tag dot-${esc(row.color.toLowerCase())}"><span class="color-dot"></span>${esc(row.color)}</span>`
      : '<span style="color:#94a3b8">—</span>';
    const dniTag = (row.dni && row.dni !== '-' && row.dni !== '—') ? ` <span class="dni-tag">DNI: ${esc(row.dni)}</span>` : '';
    const oficinaVal = esc(row.oficina || getNormalizedOffice(row.ubicacion) || '—');

    const actionsHtml = `<td><div class="action-btns">
      <button class="btn-icon btn-pdf" onclick="printResponsivaPDF(STATE.inventory[${realIdx}])" title="📄 Imprimir Acta / Responsiva Oficial PDF">📄</button>
      <button class="btn-icon btn-edit" onclick="openEdit(${realIdx})" title="Editar">✏️</button>
      <button class="btn-icon btn-delete" onclick="deleteItem(${realIdx})" title="Eliminar">🗑️</button>
    </div></td>`;

    if (isPhone) {
      return `<tr>
        <td><strong>${esc(row.codigo || row.nSerie || '—')}</strong></td>
        <td>${esc(row.area || '—')}</td>
        <td>${oficinaVal}</td>
        <td><strong>${esc(row.marca || '—')}</strong></td>
        <td>${colorTag}</td>
        <td><span style="font-family:monospace;font-weight:600;font-size:12.5px">${esc(row.imei1 || '—')}</span></td>
        <td><span style="font-family:monospace;font-weight:600;font-size:12.5px">${esc(row.imei2 || '—')}</span></td>
        <td>${esc(row.responsable || 'NO ASIGNADO')}${dniTag}</td>
        <td><strong>${esc(row.supervisor || '—')}</strong></td>
        <td>${statusBadge(row.estado)}</td>
        ${actionsHtml}
      </tr>`;
    } else if (isElectro) {
      return `<tr>
        <td><strong>${oficinaVal}</strong></td>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;font-weight:700">${esc(row.cantidad || '1')}</span></td>
        <td><strong>${esc(row.articulo || row.tipo || row.modelo || '—')}</strong></td>
        <td>${esc(row.marca || '—')}</td>
        <td>${esc(row.modelo || '—')}</td>
        <td>${statusBadge(row.estado)}</td>
        ${actionsHtml}
      </tr>`;
    } else {
      // Computadoras / PC
      return `<tr>
        <td><strong>${esc(row.codigo || row.nSerie || '—')}</strong></td>
        <td>${esc(row.area || '—')}</td>
        <td>${oficinaVal}</td>
        <td><strong>${esc(row.marca || '—')}</strong></td>
        <td>${esc(row.modelo || '—')}</td>
        <td><span style="font-family:monospace;font-weight:600;font-size:12.5px">${esc(row.serie || row.nSerie || '—')}</span></td>
        <td>${esc(row.responsable || 'NO ASIGNADO')}${dniTag}</td>
        <td><strong>${esc(row.supervisor || '—')}</strong></td>
        <td>${statusBadge(row.estado)}</td>
        ${actionsHtml}
      </tr>`;
    }
  }).join('');
  renderPagination(total, pages);
  document.querySelectorAll('.sortable-table th[data-col]').forEach(th => { th.onclick = () => sortTable(th.dataset.col); });
}

function renderPagination(total,pages) {
  const pg=document.getElementById('pagination');
  if (!pg) return;
  if (pages<=1){pg.innerHTML='';return;}
  let html=`<button class="page-btn" onclick="goPage(${STATE.currentPage-1})" ${STATE.currentPage===1?'disabled':''}>‹</button>`;
  for(let i=1;i<=pages;i++){
    if(pages>7&&i>2&&i<pages-1&&Math.abs(i-STATE.currentPage)>1){if(i===3||i===pages-2)html+=`<span class="page-btn" style="border:none;cursor:default">…</span>`;continue;}
    html+=`<button class="page-btn ${i===STATE.currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html+=`<button class="page-btn" onclick="goPage(${STATE.currentPage+1})" ${STATE.currentPage===pages?'disabled':''}>›</button>`;
  pg.innerHTML=html;
}

function goPage(n){STATE.currentPage=n;renderTable();}

/* =====================================================
   SORTING
   ===================================================== */
function sortTable(col){
  if(STATE.sortCol===col) STATE.sortDir=STATE.sortDir==='asc'?'desc':'asc';
  else{STATE.sortCol=col;STATE.sortDir='asc';}
  STATE.filtered.sort((a,b)=>{
    const va=(a[col]||'').toString().toLowerCase(), vb=(b[col]||'').toString().toLowerCase();
    return STATE.sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
  });
  STATE.currentPage=1; renderTable();
}

/* =====================================================
   FILTERS
   ===================================================== */
/* =====================================================
   CATEGORY PILLS & FILTERS
   ===================================================== */
function setCategoryFilter(cat) {
  STATE.activeCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.remove('active');
    if (cat === 'all' && btn.getAttribute('onclick')?.includes("'all'")) btn.classList.add('active');
    else if (cat !== 'all' && btn.getAttribute('onclick')?.includes(`'${cat}'`)) btn.classList.add('active');
  });
  applyFilters();
}

function applyFilters(globalQuery) {
  const cat = STATE.activeCategory || 'all';
  const est = document.getElementById('filterEstado')?.value || '';
  const ubi = document.getElementById('filterUbicacion')?.value || '';
  const resp = (document.getElementById('filterResponsable')?.value || '').toLowerCase();
  const q = globalQuery !== undefined ? globalQuery : (document.getElementById('globalSearch')?.value || '').toLowerCase();

  STATE.filtered = STATE.inventory.filter(row => {
    // 1. Categoría oficial
    if (cat !== 'all') {
      if (normalizeCategoria(row.categoria) !== normalizeCategoria(cat)) return false;
    }
    // 2. Estado oficial (Stock, Asignado, Broken)
    if (est) {
      if (normalizeEstado(row.estado) !== est) return false;
    }
    // 3. Ubicación
    if (ubi && row.ubicacion !== ubi) return false;
    // 4. Responsable o DNI
    if (resp) {
      const hay = ((row.responsable || '') + ' ' + (row.dni || '')).toLowerCase();
      if (!hay.includes(resp)) return false;
    }
    // 5. Búsqueda global
    if (q) {
      const allText = Object.values(row).join(' ').toLowerCase();
      if (!allText.includes(q)) return false;
    }
    return true;
  });

  STATE.currentPage = 1;
  renderTable();
}

function clearFilters() {
  STATE.activeCategory = 'all';
  document.querySelectorAll('.cat-pill').forEach(btn => btn.classList.remove('active'));
  document.querySelector(".cat-pill[onclick*='all']")?.classList.add('active');

  const estEl = document.getElementById('filterEstado'); if (estEl) estEl.value = '';
  const ubiEl = document.getElementById('filterUbicacion'); if (ubiEl) ubiEl.value = '';
  const respEl = document.getElementById('filterResponsable'); if (respEl) respEl.value = '';
  const qEl = document.getElementById('globalSearch'); if (qEl) qEl.value = '';

  STATE.filtered = [...STATE.inventory];
  STATE.currentPage = 1;
  renderTable();
}

function populateFilterSelects(){
  const cats=[...new Set(STATE.inventory.map(r=>r.categoria).filter(Boolean))].sort();
  const ubis=[...new Set(STATE.inventory.map(r=>r.ubicacion).filter(Boolean))].sort();
  const catSel=document.getElementById('filterCategoria');
  if(catSel) catSel.innerHTML=`<option value="">Todas las categorías</option>`+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const ubiSel=document.getElementById('filterUbicacion');
  if(ubiSel) ubiSel.innerHTML=`<option value="">Todas las ubicaciones</option>`+ubis.map(u=>`<option value="${esc(u)}">${esc(u)}</option>`).join('');
}

/* =====================================================
   CATEGORIES VIEW + DELETE CATEGORY
   ===================================================== */
/* =====================================================
   MÓDULO ASIGNACIÓN (Computadoras y Corporativos)
   ===================================================== */
function initModuleAsignacion() {
  const fFecha = document.getElementById('asig_fecha');
  if (fFecha && !fFecha.value) fFecha.value = new Date().toISOString().slice(0, 10);
  const fTipo = document.getElementById('asig_tipo');
  updateStockDatalist(fTipo ? fTipo.value : 'Teléfonos / Corporativos');
}

function filterStockEquipmentByType(tipo) {
  updateStockDatalist(tipo);
  // Auto-ajustar accesorios por defecto
  const accEl = document.getElementById('asig_accesorios');
  if (accEl) {
    if (tipo.includes('Computadoras')) accEl.value = 'TECLADO, MOUSE Y CARGADOR';
    else if (tipo.includes('Teléfonos')) accEl.value = 'CARGADOR Y PROTECTOR';
    else accEl.value = 'EQUIPO COMPLETO';
  }
}

function updateStockDatalist(tipoFilter) {
  const datalist = document.getElementById('stockList');
  if (!datalist) return;
  const stockItems = STATE.inventory.filter(r => {
    if (normalizeEstado(r.estado) !== 'Stock') return false;
    if (tipoFilter && normalizeCategoria(r.categoria) !== normalizeCategoria(tipoFilter)) return false;
    return true;
  });
  datalist.innerHTML = stockItems.map(r =>
    `<option value="${esc(r.nSerie)}">${esc(r.marca)} ${esc(r.modelo)} [${esc(r.categoria)}] - Color: ${esc(r.color || 'N/A')}</option>`
  ).join('');
}

async function handleAssignDNI(dni, force = false) {
  const clean = dni.replace(/\D/g, '');
  document.getElementById('asig_dni').value = clean;
  const statusEl = document.getElementById('asig_dniStatus');
  if (!statusEl) return;

  if (clean.length !== 8 && !force) {
    statusEl.innerHTML = clean.length > 0 ? `Ingresando DNI (${clean.length}/8 dígitos)...` : 'Al tipear 8 dígitos, se consultará automáticamente.';
    statusEl.style.color = 'var(--text-muted)';
    return;
  }
  if (clean.length !== 8 && force) {
    showToast('⚠️ El DNI debe tener 8 dígitos', 'warning');
    return;
  }

  // 1. Buscar en base interna
  const match = STATE.inventory.find(r => r.dni && r.dni.toString().trim() === clean && r.responsable);
  if (match) {
    document.getElementById('asig_nombre').value = match.responsable;
    if (match.area) document.getElementById('asig_area').value = match.area;
    if (match.supervisor) document.getElementById('asig_supervisor').value = match.supervisor;
    if (match.puesto) document.getElementById('asig_puesto').value = match.puesto;
    statusEl.innerHTML = `✅ <strong>${esc(match.responsable)}</strong> (Colaborador reconocido en base interna)`;
    statusEl.style.color = '#16a34a';
    showToast(`✅ Colaborador reconocido: ${match.responsable}`, 'success');
    return;
  }

  // 2. Consultar en RENIEC en línea
  statusEl.innerHTML = '⏳ Consultando RENIEC en línea...';
  statusEl.style.color = '#2563eb';
  const data = await fetchDNI(clean);
  if (data && (data.nombres || data.nombre)) {
    const fullName = (data.nombre || `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`).trim();
    document.getElementById('asig_nombre').value = fullName;
    statusEl.innerHTML = `✅ <strong>${esc(fullName)}</strong> (Datos oficiales RENIEC)`;
    statusEl.style.color = '#16a34a';
    showToast(`✅ DNI validado: ${fullName}`, 'success');
  } else {
    statusEl.innerHTML = '⚠️ No encontrado en RENIEC. Por favor ingresa el nombre manualmente.';
    statusEl.style.color = '#d97706';
  }
}

function handleAssignEquipmentSelect(value) {
  if (!value || !value.trim()) return;
  const val = value.trim().toUpperCase();
  const found = STATE.inventory.find(r =>
    (r.nSerie && r.nSerie.toUpperCase() === val) ||
    (r.imei1 && r.imei1.toString().trim() === val) ||
    (r.imei2 && r.imei2.toString().trim() === val)
  );

  const statusEl = document.getElementById('asig_equipStatus');
  if (found) {
    if (found.categoria) document.getElementById('asig_tipo').value = normalizeCategoria(found.categoria);
    if (found.marca) document.getElementById('asig_marca').value = found.marca;
    if (found.modelo) document.getElementById('asig_modelo').value = found.modelo;
    if (found.color) document.getElementById('asig_color').value = found.color;
    if (found.costo) document.getElementById('asig_costo').value = found.costo;
    if (found.accesorios) document.getElementById('asig_accesorios').value = found.accesorios;
    if (found.ubicacion) document.getElementById('asig_ubicacion').value = found.ubicacion;

    if (statusEl) {
      statusEl.innerHTML = `✅ <strong>${esc(found.marca)} ${esc(found.modelo)}</strong> detectado [Estado actual: ${found.estado}].`;
      statusEl.style.color = '#16a34a';
    }
  } else {
    if (statusEl) {
      statusEl.innerHTML = `✨ Equipo no registrado previamente. Completa los datos para registrarlo e inventariarlo.`;
      statusEl.style.color = '#2563eb';
    }
  }
}

function startScannerForAssign() {
  navigateTo('escanear');
  showToast('📷 Escanea el código o serie para asignación rápida', 'info');
}

function processModuleAssign(e) {
  e.preventDefault();

  const dni = document.getElementById('asig_dni').value.trim();
  const nombre = document.getElementById('asig_nombre').value.trim();
  const area = document.getElementById('asig_area').value.trim();
  const puesto = document.getElementById('asig_puesto').value.trim();
  const supervisor = document.getElementById('asig_supervisor').value.trim();
  const fecha = document.getElementById('asig_fecha').value || new Date().toISOString().slice(0, 10);

  const tipo = document.getElementById('asig_tipo').value;
  const nSerie = document.getElementById('asig_nSerie').value.trim();
  const marca = document.getElementById('asig_marca').value.trim();
  const modelo = document.getElementById('asig_modelo').value.trim();
  const color = document.getElementById('asig_color').value.trim();
  const costo = document.getElementById('asig_costo').value.trim() || 'S/. 197.00';
  const accesorios = document.getElementById('asig_accesorios').value.trim();
  const ubicacion = document.getElementById('asig_ubicacion').value.trim() || (area ? `Área ${area}` : 'Oficinas');

  // Buscar si el equipo ya existe en el inventario
  const existingIdx = STATE.inventory.findIndex(r => r.nSerie && r.nSerie.toUpperCase() === nSerie.toUpperCase());

  const assignedItem = {
    nSerie,
    marca,
    modelo,
    categoria: normalizeCategoria(tipo),
    estado: 'Asignado',
    ubicacion,
    responsable: nombre,
    dni,
    supervisor,
    area,
    puesto,
    imei1: nSerie,
    imei2: '',
    color,
    costo,
    cargador: accesorios.toUpperCase().includes('CARGADOR') ? 'SI' : 'NO',
    accesorios,
    fechaCompra: fecha,
    observaciones: `Asignado a ${nombre} (DNI ${dni}) | Sup: ${supervisor || '—'}`
  };

  // Si el colaborador ya contaba con un equipo asignado previamente, liberarlo a Stock
  if (dni || nombre) {
    STATE.inventory.forEach(item => {
      const isSameDevice = item.nSerie && item.nSerie.toUpperCase() === nSerie.toUpperCase();
      if (!isSameDevice) {
        const matchDni = dni && item.dni && item.dni.trim() === dni.trim();
        const matchResp = nombre && item.responsable && item.responsable.trim().toUpperCase() === nombre.toUpperCase();
        if ((matchDni || matchResp) && normalizeEstado(item.estado, item) === 'Asignado') {
          item.estado = 'Stock';
          item.responsable = '';
          item.dni = '';
          item._lastAction = 'Stock';
          item._lastActionDate = fecha;
          item._isModified = true;
          item.observaciones = (item.observaciones ? item.observaciones + ' | ' : '') + `Liberado a Stock por nueva asignación a ${nombre} (${fecha})`;
        }
      }
    });
  }

  if (existingIdx >= 0) {
    STATE.inventory[existingIdx] = { ...STATE.inventory[existingIdx], ...assignedItem };
    STATE.inventory[existingIdx]._lastAction = 'Asignación';
    STATE.inventory[existingIdx]._lastActionDate = fecha;
    STATE.inventory[existingIdx]._isModified = true;
  } else {
    assignedItem._lastAction = 'Asignación';
    assignedItem._lastActionDate = fecha;
    assignedItem._isModified = true;
    STATE.inventory.unshift(assignedItem);
  }

  // Archive acta de asignación
  STATE.actasAsignacion.unshift({
    id: Date.now(),
    tipo: 'Asignación',
    fecha,
    colaborador: nombre,
    dni,
    equipo: `${marca} ${modelo}`,
    nSerie,
    imei1: nSerie,
    imei2: '',
    oficina: ubicacion,
    supervisor: supervisor || '—',
  });
  STATE.movements.unshift({ fecha, operacion: 'Asignación', equipo: `${marca} ${modelo}`, nSerie, responsable: nombre, oficina: ubicacion, estado: 'Asignado' });
  if (STATE.movements.length > 300) STATE.movements = STATE.movements.slice(0, 300);

  refreshAll();
  showToast(`✅ Equipo ${nSerie} asignado a ${nombre}`, 'success');

  // Emitir PDF de responsiva
  setTimeout(() => {
    printResponsivaPDF(assignedItem);
  }, 400);

  resetAssignForm();
}

function resetAssignForm() {
  document.getElementById('moduleAssignForm')?.reset();
  const fFecha = document.getElementById('asig_fecha');
  if (fFecha) fFecha.value = new Date().toISOString().slice(0, 10);
  const statusEl = document.getElementById('asig_dniStatus');
  if (statusEl) {
    statusEl.innerHTML = 'Al tipear 8 dígitos, se consultará automáticamente.';
    statusEl.style.color = 'var(--text-muted)';
  }
}

/* =====================================================
   MÓDULO DEVOLUCIONES (DEVOLUCIÓN CORPORATIVO)
   ===================================================== */
function initModuleDevolucion() {
  const fDev = document.getElementById('dev_fechaDevolucion');
  if (fDev && !fDev.value) fDev.value = new Date().toISOString().slice(0, 10);
  updateAssignedDatalist();
}

function updateAssignedDatalist() {
  const datalist = document.getElementById('assignedList');
  if (!datalist) return;
  const assigned = STATE.inventory.filter(r => normalizeEstado(r.estado) === 'Asignado');
  datalist.innerHTML = assigned.map(r =>
    `<option value="${esc(r.nSerie)}">${esc(r.responsable)} (DNI: ${esc(r.dni)}) | ${esc(r.marca)} ${esc(r.modelo)}</option>`
  ).join('');
}

function handleDevolucionSearch(value) {
  if (!value || !value.trim()) return;
  const q = value.trim().toLowerCase();
  const found = STATE.inventory.find(r =>
    (normalizeEstado(r.estado) === 'Asignado') && (
      (r.nSerie && r.nSerie.toLowerCase() === q) ||
      (r.imei1 && r.imei1.toString().toLowerCase() === q) ||
      (r.dni && r.dni.toString().toLowerCase() === q) ||
      (r.responsable && r.responsable.toLowerCase().includes(q))
    )
  );

  const badge = document.getElementById('dev_foundBadge');
  if (found) {
    document.getElementById('dev_nombre').value = found.responsable || '';
    document.getElementById('dev_dni').value = found.dni || '';
    document.getElementById('dev_cargo').value = found.puesto || found.area || 'COLABORADOR';
    document.getElementById('dev_area').value = found.area || found.ubicacion || '';
    document.getElementById('dev_equipoDesc').value = `${found.marca || ''} ${found.modelo || ''} - ${found.color || ''}`.trim();
    document.getElementById('dev_nSerie').value = found.nSerie || found.imei1 || '';
    document.getElementById('dev_imei2').value = found.imei2 || '';

    if (badge) {
      badge.style.display = 'inline-block';
      badge.className = 'badge badge-operativo';
      badge.textContent = `✅ ${found.nSerie} - ${found.marca}`;
    }
  } else {
    if (badge) badge.style.display = 'none';
  }
}

function startScannerForDevolucion() {
  navigateTo('escanear');
  showToast('📷 Escanea el equipo a devolver', 'info');
}

function handleDevolucionEstadoChange(val) {
  const destEl = document.getElementById('dev_destino');
  if (!destEl) return;
  if (val === 'Stock') destEl.value = 'Almacén Central / Stock (Operativo)';
  else if (val === 'Broken') destEl.value = 'Área Técnica / Reparación (Broken)';
  else if (val === 'Broken-Obs') destEl.value = 'Almacén Bajas / Obsoleto';
}

function processModuleDevolucion(e) {
  e.preventDefault();

  const nSerie = document.getElementById('dev_nSerie').value.trim();
  const nombre = document.getElementById('dev_nombre').value.trim();
  const dni = document.getElementById('dev_dni').value.trim();
  const cargo = document.getElementById('dev_cargo').value.trim();
  const area = document.getElementById('dev_area').value.trim();
  const fechaCese = document.getElementById('dev_fechaCese').value;
  const fechaDev = document.getElementById('dev_fechaDevolucion').value || new Date().toISOString().slice(0, 10);
  const equipoDesc = document.getElementById('dev_equipoDesc').value;
  const imei2 = document.getElementById('dev_imei2').value;

  const motivo = document.getElementById('dev_motivo').value;
  const estadoTecnico = document.getElementById('dev_estadoTecnico').value;
  const estetica = document.getElementById('dev_estetica').value;
  const destino = document.getElementById('dev_destino').value.trim() || 'Almacén';
  const obs = document.getElementById('dev_observaciones').value.trim();

  const accProtector = document.getElementById('dev_accProtector').checked;
  const accCargador = document.getElementById('dev_accCargador').checked;
  const accAguja = document.getElementById('dev_accAguja').checked;

  const accList = [];
  if (accProtector) accList.push('PROTECTOR');
  if (accCargador) accList.push('CARGADOR');
  if (accAguja) accList.push('AGUJA');

  // Encontrar el equipo en inventario y actualizar su estado a Stock o Broken
  const itemIdx = STATE.inventory.findIndex(r => r.nSerie && r.nSerie.toUpperCase() === nSerie.toUpperCase());
  const newEstado = (estadoTecnico === 'Stock') ? 'Stock' : 'Broken';

  if (itemIdx >= 0) {
    STATE.inventory[itemIdx].estado = newEstado;
    STATE.inventory[itemIdx].responsable = ''; // Se libera del colaborador
    STATE.inventory[itemIdx].dni = '';
    STATE.inventory[itemIdx].ubicacion = destino;
    STATE.inventory[itemIdx].observaciones = `Devuelto por ${nombre} (${motivo}) el ${fechaDev} | Estética: ${estetica} | Estado: ${newEstado}`;
    STATE.inventory[itemIdx]._lastAction = newEstado === 'Broken' ? 'Broken' : 'Devolución';
    STATE.inventory[itemIdx]._lastActionDate = fechaDev;
    STATE.inventory[itemIdx]._isModified = true;
  }

  const devData = {
    nombre, dni, cargo, area, fechaCese, fechaDevolucion: fechaDev,
    equipoDesc, nSerie, imei2,
    marca: (itemIdx >= 0 ? STATE.inventory[itemIdx].marca : 'ZTE'),
    modelo: (itemIdx >= 0 ? STATE.inventory[itemIdx].modelo : equipoDesc),
    motivo, estadoTecnico, estetica,
    accProtector, accCargador, accAguja,
    accesoriosStr: accList.join(', ') || 'NINGUNO',
    observaciones: obs
  };

  // Archive acta de devolución
  STATE.actasDevolucion.unshift({
    id: Date.now(),
    fecha: fechaDev,
    colaborador: nombre,
    dni,
    cargo,
    equipo: `${devData.marca} ${devData.modelo}`,
    nSerie,
    motivo,
    estadoFinal: newEstado,
    destino,
  });
  STATE.movements.unshift({ fecha: fechaDev, operacion: 'Devolución', equipo: `${devData.marca} ${devData.modelo}`, nSerie, responsable: nombre, oficina: destino, estado: newEstado });
  if (STATE.movements.length > 300) STATE.movements = STATE.movements.slice(0, 300);

  refreshAll();
  showToast(`✅ Devolución procesada. El equipo ahora está en ${newEstado}.`, 'success');

  // Generar Acta PDF Oficial de Devolución
  setTimeout(() => {
    printDevolucionPDF(devData);
  }, 400);

  resetDevolucionForm();
}

function resetDevolucionForm() {
  document.getElementById('moduleDevForm')?.reset();
  const fDev = document.getElementById('dev_fechaDevolucion');
  if (fDev) fDev.value = new Date().toISOString().slice(0, 10);
  const badge = document.getElementById('dev_foundBadge');
  if (badge) badge.style.display = 'none';
  const searchEl = document.getElementById('dev_search');
  if (searchEl) searchEl.value = '';
}

/* =====================================================
   PRINT DEVOLUCION PDF (Formato Oficial DEVOLUCION CORPORATIVO.xlsx)
   ===================================================== */
function printDevolucionPDF(dev) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Corporativo
  doc.setFillColor(180, 83, 9); // Amber / Naranja oscuro
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DEVOLUCIÓN DE CORPORATIVO', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(254, 243, 199);
  doc.text(`ACTA OFICIAL DE RECEPCIÓN Y VERIFICACIÓN TÉCNICA 2026`, 14, 17);
  doc.text(`Fecha: ${dev.fechaDevolucion}`, 160, 17);

  let y = 28;

  // Sección 1: DATOS DEL COLABORADOR
  doc.setFillColor(217, 119, 6);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS DEL COLABORADOR', 16, y + 4.5);

  y += 6;
  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    body: [
      [
        { content: 'NOMBRE:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199], width: 35 } },
        { content: dev.nombre, styles: { fontStyle: 'bold', width: 65 } },
        { content: 'CARGO:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199], width: 35 } },
        { content: dev.cargo || '—', styles: { width: 47 } }
      ],
      [
        { content: 'DNI:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.dni, styles: { fontStyle: 'bold' } },
        { content: 'ÁREA:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.area || '—' }
      ],
      [
        { content: 'FECHA DE CESE:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.fechaCese || 'NO APLICA' },
        { content: 'FECHA DEVOLUCIÓN:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.fechaDevolucion, styles: { fontStyle: 'bold' } }
      ]
    ]
  });

  y = doc.lastAutoTable.finalY + 4;

  // Frase oficial de la plantilla
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Por medio de la presente se hace devolución del siguiente corporativo:', 14, y + 3);
  y += 6;

  // Sección 2: DESCRIPCIÓN DE EQUIPO
  doc.setFillColor(217, 119, 6);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPCIÓN DE EQUIPO', 16, y + 4.5);

  y += 6;
  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    body: [
      [
        { content: 'MARCA:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199], width: 35 } },
        { content: dev.marca, styles: { width: 45 } },
        { content: 'MODELO:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199], width: 35 } },
        { content: dev.modelo, styles: { width: 67 } }
      ],
      [
        { content: 'IMEI 1 / SERIE:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.nSerie, styles: { fontStyle: 'bold' } },
        { content: 'ESTÉTICA:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.estetica }
      ],
      [
        { content: 'IMEI 2:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.imei2 || '—' },
        { content: 'ACCESORIOS:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
        { content: dev.accesoriosStr }
      ]
    ]
  });

  y = doc.lastAutoTable.finalY + 4;

  // Sección 3: OBSERVACIONES Y CHECKLIST TÉCNICO
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OBSERVACIONES Y ESTADO DE RECEPCIÓN:', 16, y + 4);

  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Motivo de devolución: ${dev.motivo}`, 14, y);
  y += 5;

  doc.text('Estado del equipo al momento de devolución:', 14, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const isOk = (dev.estadoTecnico === 'Stock');
  const isDanado = (dev.estadoTecnico === 'Broken');
  const isObs = (dev.estadoTecnico === 'Broken-Obs');

  doc.text(`[ ${isOk ? 'X' : '  '} ] Funcionando correctamente (Pasa a Stock disponible)`, 18, y);
  y += 4;
  doc.text(`[ ${isDanado ? 'X' : '  '} ] Dañado (Pasa a Broken / Reparación técnica)`, 18, y);
  y += 4;
  doc.text(`[ ${isObs ? 'X' : '  '} ] Obsoleto (Baja patrimonial)`, 18, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Accesorios incluidos devueltos:', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`[ ${dev.accProtector ? 'X' : '  '} ] Protector`, 18, y);
  doc.text(`[ ${dev.accCargador ? 'X' : '  '} ] Cargador`, 65, y);
  doc.text(`[ ${dev.accAguja ? 'X' : '  '} ] Aguja de bandeja`, 115, y);
  y += 5;

  if (dev.observaciones) {
    doc.text(`Otros / Detalle: ${dev.observaciones}`, 14, y);
    y += 5;
  }

  // Sección 4: FIRMAS OFICIALES (Idéntico a DEVOLUCION CORPORATIVO.xlsx)
  const signY = 248;

  // Firma 1: ENTREGA (COLABORADOR)
  doc.setDrawColor(100, 116, 139);
  doc.line(16, signY, 68, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ENTREGA (COLABORADOR)', 22, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(dev.nombre.substring(0, 32), 16, signY + 8);
  doc.text(`DNI: ${dev.dni}`, 16, signY + 11.5);
  doc.text(`Fecha: ${dev.fechaDevolucion}`, 16, signY + 15);

  // Firma 2: SUPERVISOR
  doc.line(78, signY, 130, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SUPERVISOR', 94, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Conformidad de Entrega', 78, signY + 8);
  doc.text('Firma y Sello', 78, signY + 11.5);

  // Firma 3: RECIBE (CONFORMIDAD TI)
  doc.line(140, signY, 192, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('RECIBE / CONFORMIDAD TI', 145, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Control Técnico y Recepción', 140, signY + 8);
  doc.text(`Destino: ${dev.estadoTecnico === 'Stock' ? 'STOCK' : 'BROKEN'}`, 140, signY + 11.5);

  const filename = `Devolucion_${(dev.nombre.replace(/[^A-Za-z0-9]/g, '_').substring(0, 20))}_${dev.nSerie}.pdf`;
  doc.save(filename);
  showToast(`📄 Acta de Devolución generada: ${filename}`, 'success');
}

/* =====================================================
   CLEAR ALL DATA
   ===================================================== */
function clearAllData() {
  showConfirm(
    'Vaciar Todo el Inventario',
    '¿Estás seguro de eliminar TODOS los datos del inventario? Esta acción borrará todos los equipos y fuentes registradas.',
    () => {
      clearAllInventoryData(true);
      showToast('Inventario vaciado por completo', 'info');
    }
  );
}

/* =====================================================
   CONFIRM MODAL
   ===================================================== */
function showConfirm(title, msg, onOk) {
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmTitle');
  const msgEl = document.getElementById('confirmMsg');
  const okBtn = document.getElementById('confirmOkBtn');

  if (titleEl) titleEl.innerHTML = title;
  if (msgEl) msgEl.innerHTML = msg;
  if (okBtn) {
    okBtn.onclick = () => {
      closeConfirm();
      if (typeof onOk === 'function') onOk();
    };
  }
  if (modal) {
    modal.style.zIndex = '100000';
    modal.style.display = 'flex';
  } else if (typeof onOk === 'function') {
    // Fallback if modal DOM is missing
    const cleanMsg = msg.replace(/<[^>]*>/g, ' ');
    if (confirm(`${title}\n\n${cleanMsg}`)) {
      onOk();
    }
  }
}
function closeConfirm(){ document.getElementById('confirmModal').style.display='none'; }

/* =====================================================
   SCANNER (html5-qrcode)
   ===================================================== */
let CURRENT_SCAN_MODE = 'ocr'; // 'ocr' | 'barcode' | 'qr'

function setScanMode(mode){
  if (CURRENT_SCAN_MODE === 'ocr' && mode === 'ocr') {
    // Si ya está en modo OCR y vuelve a pulsar el botón, abrir la cámara directamente
    const photoInput = document.getElementById('cameraPhotoInput');
    if (photoInput) photoInput.click();
    return;
  }

  CURRENT_SCAN_MODE = mode;
  const btnOCR = document.getElementById('btnModeOCR');
  const btnBarcode = document.getElementById('btnModeBarcode');
  const btnQR = document.getElementById('btnModeQR');
  const instrEl = document.getElementById('scanStepInstruction');

  if(btnOCR) {
    btnOCR.style.background = mode === 'ocr' ? '#2563eb' : 'transparent';
    btnOCR.style.color = mode === 'ocr' ? '#ffffff' : '#64748b';
    btnOCR.style.boxShadow = mode === 'ocr' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none';
  }
  if(btnBarcode) {
    btnBarcode.style.background = mode === 'barcode' ? '#2563eb' : 'transparent';
    btnBarcode.style.color = mode === 'barcode' ? '#ffffff' : '#64748b';
    btnBarcode.style.boxShadow = mode === 'barcode' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none';
  }
  if(btnQR) {
    btnQR.style.background = mode === 'qr' ? '#2563eb' : 'transparent';
    btnQR.style.color = mode === 'qr' ? '#ffffff' : '#64748b';
    btnQR.style.boxShadow = mode === 'qr' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none';
  }

  if (mode === 'ocr') {
    stopScanner();
    if (instrEl) {
      instrEl.innerHTML = `<span style="font-size:18px">📸</span><span><strong>MODO FOTO:</strong> Tome una foto clara a la etiqueta trasera o a la pantalla (<code style="background:#f1f5f9;padding:1px 4px;border-radius:4px">*#06#</code>).</span>`;
    }
    showToast('📸 Modo Foto OCR activo. Toque el botón para tomar la foto.', 'info');
  } else {
    stopScanner();
    if (instrEl) {
      instrEl.innerHTML = `<span style="font-size:18px">${mode==='qr'?'⬛':'📊'}</span><span><strong>MODO EN VIVO:</strong> Apunte la cámara al código ${mode==='qr'?'QR':'de barras'} del equipo.</span>`;
    }
    showToast(`🎯 Modo Video en Vivo: ${mode === 'barcode' ? 'Código de Barras' : 'Código QR'}`, 'info');
    setTimeout(() => startScanner(), 200);
  }
}

/* =====================================================
   MOTOR OCR: PREPROCESAMIENTO DE IMAGEN & RECONOCIMIENTO
   ===================================================== */

// Preprocesamiento en Canvas: optimiza resolución, elimina moiré de pantallas y resalta texto
function preprocessImageForOCR(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxDim = 1800;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Calcular brillo para invertir placas negras con texto blanco
        let totalLum = 0;
        let samples = 0;
        for (let i = 0; i < data.length; i += 4 * 8) {
          totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          samples++;
        }
        const avgLum = totalLum / samples;
        const isDarkBackground = avgLum < 115;

        const contrast = 1.45;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < data.length; i += 4) {
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (isDarkBackground) {
            gray = 255 - gray;
          }
          gray = factor * (gray - 128) + 128;
          if (gray < 0) gray = 0;
          if (gray > 255) gray = 255;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Buscador maestro de equipos en inventario por Serie, Código, ID o IMEI (con soporte para espacios y formatos)

// =====================================================
// PARSER UNIVERSAL DE ACTIVOS DE CÓMPUTO (SOLO PC / LAPTOPS)
// =====================================================
function parseHardwareAsset(codeOrText) {
  if (!codeOrText) return null;
  const raw = String(codeOrText).trim();
  const upper = raw.toUpperCase();

  // REGLA FUNDAMENTAL: Si contiene IMEI, frecuencias móviles o marcas de celular -> NUNCA ES PC
  if (/IMEI|\b\d{15}\b|2G|3G|4G|5G|BMOBILE|REDMI|XIAOMI|SMARTPHONE|CELULAR|TELEFONO/i.test(raw)) {
    return { isHardware: false };
  }

  let marca = '';
  let modelo = '';
  let serial = '';
  let productCode = '';
  let isHardware = false;

  // 1. Lenovo Barcode 1S (ej. 1S10EYA05U00MJ05BWEL)
  if (upper.startsWith('1S') && upper.length >= 16) {
    marca = 'LENOVO';
    productCode = upper.slice(2, -8);
    serial = upper.slice(-8);
    isHardware = true;
  }

  // 2. Familias de cómputo explícitas (ThinkCentre, ThinkPad, Latitude, etc.)
  const mModel = raw.match(/(ThinkCentre\s*[A-Z0-9\-_]+|ThinkPad\s*[A-Z0-9\-_]+|IdeaPad\s*[A-Z0-9\-_]+|OptiPlex\s*[A-Z0-9\-_]+|Latitude\s*[A-Z0-9\-_]+|ProBook\s*[A-Z0-9\-_]+|EliteBook\s*[A-Z0-9\-_]+|All\s*In\s*One)/i);
  if (mModel) {
    modelo = mModel[1];
    isHardware = true;
  }

  // Machine Type / Product ID de computadoras
  const mMtm = raw.match(/(?:Machine Type|Model Number|Product ID)\s*[:\s]*([A-Z0-9\-_]+)/i);
  if (mMtm) {
    productCode = mMtm[1];
    isHardware = true;
  }

  // Formato serial de computadoras Lenovo (MJ..., MP..., PF..., PC...)
  const mLen = upper.match(/\b(M[JP][0-9A-Z]{6}|P[FC][0-9A-Z]{6})\b/);
  if (mLen) {
    marca = marca || 'LENOVO';
    serial = mLen[1];
    isHardware = true;
  }

  // Dell Service Tag (7 caracteres alfanuméricos con letras y números) solo si menciona Dell
  if (/DELL/i.test(upper)) {
    const mDell = upper.match(/\b([A-Z0-9]{7})\b/);
    if (mDell && /[A-Z]/.test(mDell[1]) && /[0-9]/.test(mDell[1])) {
      marca = 'DELL';
      serial = mDell[1];
      isHardware = true;
    }
  }

  if (isHardware) {
    if (/LENOVO/i.test(upper)) marca = 'LENOVO';
    else if (/DELL/i.test(upper)) marca = 'DELL';
    else if (/HP|HEWLETT/i.test(upper)) marca = 'HP';
    else if (/ASUS/i.test(upper)) marca = 'ASUS';
    else if (/ACER/i.test(upper)) marca = 'ACER';
  }

  return {
    isHardware,
    marca: marca || (isHardware ? 'COMPUTADORA' : ''),
    modelo: modelo || productCode || (isHardware ? 'EQUIPO DE CÓMPUTO' : ''),
    serial: serial || upper,
    productCode
  };
}
window.parseHardwareAsset = parseHardwareAsset;

function findInventoryDevice(query) {
  if (!query) return null;
  const raw = String(query).trim();
  if (!raw || raw === '-') return null;

  const numOnly = raw.replace(/\D/g, '');
  const upper = raw.toUpperCase();

  // 1. Coincidencia exacta por Serie, Código o ID
  let match = STATE.inventory.find(r => 
    (r.nSerie && r.nSerie.toUpperCase() === upper) ||
    (r.codigo && r.codigo.toUpperCase() === upper) ||
    (r.id && r.id.toUpperCase() === upper)
  );
  if (match) return match;

  // 1.1 Si el código es un barcode Lenovo 1S (ej. 1S10EYA05U00MJ05BWEL)
  if (upper.startsWith('1S') && upper.length >= 16) {
    const lenovoSerial = upper.slice(-8);
    match = STATE.inventory.find(r => {
      const s = String(r.nSerie || r.serie || '').trim().toUpperCase();
      const c = String(r.codigo || '').trim().toUpperCase();
      return (s && s === lenovoSerial) || (c && c.includes(lenovoSerial)) || (c && c === upper);
    });
    if (match) return match;
  }

  // 1.2 Búsqueda cruzada de seriales de computadoras dentro de códigos largos
  if (upper.length >= 6) {
    match = STATE.inventory.find(r => {
      const s = String(r.nSerie || r.serie || '').trim().toUpperCase();
      if (!s || s.length < 5) return false;
      return upper.includes(s) || s.includes(upper);
    });
    if (match) return match;
  }

  // 2. Coincidencia por IMEI (dígitos limpios)
  if (numOnly.length >= 10) {
    match = STATE.inventory.find(r => {
      const im1 = String(r.imei1 || '').replace(/\D/g, '');
      const im2 = String(r.imei2 || '').replace(/\D/g, '');
      if (im1 && (im1 === numOnly || (numOnly.length >= 14 && im1.includes(numOnly)))) return true;
      if (im2 && (im2 === numOnly || (numOnly.length >= 14 && im2.includes(numOnly)))) return true;
      return false;
    });
    if (match) return match;
  }

  // 3. Coincidencia en campo observaciones
  if (numOnly.length >= 12) {
    match = STATE.inventory.find(r => r.observaciones && r.observaciones.includes(numOnly));
    if (match) return match;
  }

  // 4. Búsqueda literal en imei1 o imei2
  match = STATE.inventory.find(r => 
    (r.imei1 && String(r.imei1).trim().toUpperCase() === upper) ||
    (r.imei2 && String(r.imei2).trim().toUpperCase() === upper)
  );

  return match || null;
}


/* ==========================================================================
   MOTOR AVANZADO DE LECTURA DE CÓDIGOS DE BARRA (ESPECIAL PARA PC Y LAPTOPS)
   Optimizador de alta resolución, enfoque por convolución y multi-decodificador
   ========================================================================== */

let CURRENT_CAMERA_TRACK = null;
let CURRENT_ZOOM_LEVEL = 1.0;
let IS_TORCH_ACTIVE = false;

// 1. Detección de código de barras en foto con pipeline multi-etapa
async function detectBarcodeFromPhoto(file) {
  // A. Intentar BarcodeDetector Nativo (Acelerado por Hardware en Android / Chromium)
  if ('BarcodeDetector' in window) {
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      const formatsToUse = supported && supported.length > 0 
        ? supported 
        : ['code_128', 'code_39', 'code_93', 'ean_13', 'upc_a', 'itf', 'data_matrix', 'qr_code', 'codabar'];
      
      const detector = new BarcodeDetector({ formats: formatsToUse });
      const imgBitmap = await createImageBitmap(file);
      const results = await detector.detect(imgBitmap);
      if (results && results.length > 0 && results[0].rawValue) {
        console.log('[BarcodeDetector Nativo]: Éxito ->', results[0].rawValue, 'Formato:', results[0].format);
        return {
          code: results[0].rawValue.trim(),
          format: results[0].format,
          engine: 'BarcodeDetector-Hardware'
        };
      }
    } catch (e) {
      console.warn('[BarcodeDetector] Intento nativo falló o no soportado:', e.message);
    }
  }

  // B. Pipeline Óptico con ZXing Multi-Filtro (Original, Sharpening de Barras y Zoom 2x)
  if (typeof ZXing !== 'undefined') {
    const zxingRes = await runZXingPhotoPipeline(file);
    if (zxingRes) return zxingRes;
  }

  return null;
}

function runZXingPhotoPipeline(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;

          const maxDim = 1800;
          let scale = 1;
          if (w > maxDim || h > maxDim) {
            scale = maxDim / Math.max(w, h);
          }
          const sw = Math.round(w * scale);
          const sh = Math.round(h * scale);

          const canvas = document.createElement('canvas');
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, sw, sh);

          let code = decodeCanvasWithZXing(canvas);
          if (code) return resolve({ code, engine: 'ZXing-Direct' });

          applyBarSharpening(ctx, sw, sh);
          code = decodeCanvasWithZXing(canvas);
          if (code) return resolve({ code, engine: 'ZXing-Sharpened' });

          const cropW = Math.round(sw * 0.55);
          const cropH = Math.round(sh * 0.55);
          const cropX = Math.round((sw - cropW) / 2);
          const cropY = Math.round((sh - cropH) / 2);

          const zoomCanvas = document.createElement('canvas');
          zoomCanvas.width = cropW * 2;
          zoomCanvas.height = cropH * 2;
          const zctx = zoomCanvas.getContext('2d', { willReadFrequently: true });
          zctx.imageSmoothingEnabled = true;
          zctx.imageSmoothingQuality = 'high';
          zctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW * 2, cropH * 2);

          code = decodeCanvasWithZXing(zoomCanvas);
          if (code) return resolve({ code, engine: 'ZXing-ZoomMacro2x' });

          const rotCanvas = document.createElement('canvas');
          rotCanvas.width = sh;
          rotCanvas.height = sw;
          const rctx = rotCanvas.getContext('2d', { willReadFrequently: true });
          rctx.translate(sh / 2, sw / 2);
          rctx.rotate(90 * Math.PI / 180);
          rctx.drawImage(canvas, -sw / 2, -sh / 2);

          code = decodeCanvasWithZXing(rotCanvas);
          if (code) return resolve({ code, engine: 'ZXing-Rotated90' });

          resolve(null);
        } catch (err) {
          console.warn('[ZXing Pipeline error]:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function decodeCanvasWithZXing(canvas) {
  if (typeof ZXing === 'undefined') return null;
  try {
    const formats = [
      ZXing.BarcodeFormat.CODE_128,
      ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.CODE_93,
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.ITF,
      ZXing.BarcodeFormat.CODABAR,
      ZXing.BarcodeFormat.DATA_MATRIX,
      ZXing.BarcodeFormat.QR_CODE
    ];
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    const reader = new ZXing.MultiFormatReader();
    reader.setHints(hints);

    try {
      const lum = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
      const bin = new ZXing.HybridBinarizer(lum);
      const bitmap = new ZXing.BinaryBitmap(bin);
      const res = reader.decode(bitmap);
      if (res && res.getText()) return res.getText().trim();
    } catch (e1) {}

    try {
      const lum = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
      const bin = new ZXing.GlobalHistogramBinarizer(lum);
      const bitmap = new ZXing.BinaryBitmap(bin);
      const res = reader.decode(bitmap);
      if (res && res.getText()) return res.getText().trim();
    } catch (e2) {}

  } catch (e) {}
  return null;
}

function applyBarSharpening(ctx, w, h) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const copy = new Uint8ClampedArray(d);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const val = 5 * copy[idx + c]
            - copy[((y - 1) * w + x) * 4 + c]
            - copy[((y + 1) * w + x) * 4 + c]
            - copy[(y * w + (x - 1)) * 4 + c]
            - copy[(y * w + (x + 1)) * 4 + c];
          d[idx + c] = Math.min(255, Math.max(0, val));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {}
}

async function cycleLiveZoom() {
  const btn = document.getElementById('btnLiveZoom');
  const levels = [1.0, 1.5, 2.0, 2.5];
  let nextIdx = (levels.indexOf(CURRENT_ZOOM_LEVEL) + 1) % levels.length;
  CURRENT_ZOOM_LEVEL = levels[nextIdx];

  if (btn) btn.textContent = `🔍 Zoom ${CURRENT_ZOOM_LEVEL}x`;

  if (CURRENT_CAMERA_TRACK && typeof CURRENT_CAMERA_TRACK.applyConstraints === 'function') {
    try {
      const capabilities = CURRENT_CAMERA_TRACK.getCapabilities ? CURRENT_CAMERA_TRACK.getCapabilities() : {};
      if (capabilities.zoom) {
        const targetZoom = Math.min(Math.max(CURRENT_ZOOM_LEVEL, capabilities.zoom.min || 1), capabilities.zoom.max || 3);
        await CURRENT_CAMERA_TRACK.applyConstraints({ advanced: [{ zoom: targetZoom }] });
        return;
      }
    } catch (e) {
      console.warn('Zoom de hardware no soportado:', e);
    }
  }

  const videoEl = document.querySelector('#reader video');
  if (videoEl) {
    videoEl.style.transform = CURRENT_ZOOM_LEVEL === 1.0 ? 'none' : `scale(${CURRENT_ZOOM_LEVEL})`;
    videoEl.style.transformOrigin = 'center center';
    videoEl.style.transition = 'transform 0.2s ease';
  }
}
window.cycleLiveZoom = cycleLiveZoom;

async function toggleLiveTorch() {
  const btn = document.getElementById('btnLiveTorch');
  IS_TORCH_ACTIVE = !IS_TORCH_ACTIVE;

  if (CURRENT_CAMERA_TRACK && typeof CURRENT_CAMERA_TRACK.applyConstraints === 'function') {
    try {
      await CURRENT_CAMERA_TRACK.applyConstraints({
        advanced: [{ torch: IS_TORCH_ACTIVE }]
      });
      if (btn) {
        btn.textContent = IS_TORCH_ACTIVE ? '💡 Luz: ON' : '💡 Linterna';
        btn.style.background = IS_TORCH_ACTIVE ? '#eab308' : '#334155';
        btn.style.color = IS_TORCH_ACTIVE ? '#000' : '#fff';
      }
      return;
    } catch (e) {
      console.warn('Linterna no soportada:', e);
    }
  }
  showToast('Linterna no soportada en este dispositivo o cámara', 'warning');
}
window.toggleLiveTorch = toggleLiveTorch;

async function handleLabelPhoto(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;

  const statusBox = document.getElementById('ocrStatusBox');
  const statusText = document.getElementById('ocrStatusText');
  const progressBar = document.getElementById('ocrProgressBar');

  if(statusBox) statusBox.style.display = 'block';
  if(statusText) statusText.textContent = '📸 Optimizando foto en alta definición...';
  if(progressBar) progressBar.style.width = '25%';

  const currentMode = (typeof SCAN_DEVICE_TYPE !== 'undefined') ? SCAN_DEVICE_TYPE : 'telefono';

  try {
    // 1. Decodificar código de barras SOLO si el modo es PC/Laptop
    if (currentMode === 'pc') {
      if(statusText) statusText.textContent = '🔍 Decodificando código de barras (PC / Laptop)...';
      if(progressBar) progressBar.style.width = '45%';

      const barcodeRes = await detectBarcodeFromPhoto(file);
      if(barcodeRes && barcodeRes.code) {
        if(progressBar) progressBar.style.width = '100%';
        if(statusBox) statusBox.style.display = 'none';
        playScanBeep(true);
        showToast(`🎯 Código de barras detectado: ${barcodeRes.code}`, 'success');
        processScannedCode(barcodeRes.code);
        return;
      }
    }

    // 2. Ejecutar OCR con Tesseract
    if(statusText) statusText.textContent = currentMode === 'telefono'
      ? '📸 Leyendo etiqueta completa del teléfono (IMEI, Modelo, Color)...'
      : '🔍 Leyendo texto de etiqueta o pantalla (OCR)...';
    if(progressBar) progressBar.style.width = '65%';

    const processedDataUrl = await preprocessImageForOCR(file);
    if(progressBar) progressBar.style.width = '75%';

    if(typeof Tesseract === 'undefined'){
      if(statusText) statusText.textContent = 'Iniciando motor de lectura OCR...';
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    }

    const worker = await Tesseract.createWorker('eng');
    if(progressBar) progressBar.style.width = '85%';

    const ret = await worker.recognize(processedDataUrl);
    await worker.terminate();

    if(progressBar) progressBar.style.width = '100%';
    const text = ret.data.text || '';
    console.log('[OCR Reconocido]:', text);

    const hw = parseHardwareAsset(text);
    const isHardwareAsset = hw && hw.isHardware;

    const parsed = extractPhoneDataFromText(text);
    const isPhoneDetected = !!(parsed.imei1 || parsed.imei2 || /IMEI|\b\d{15}\b|2G|3G|4G|5G|BMOBILE|REDMI|XIAOMI|CELULAR|SMARTPHONE|ROCKET/i.test(text));

    // Detección de inconsistencia en modo (mismatch)
    if (currentMode === 'telefono' && isHardwareAsset && !isPhoneDetected) {
      if(statusBox) statusBox.style.display = 'none';
      playScanBeep(false);
      showModeMismatchModal('pc_detected_in_phone_mode', hw, hw.serial);
      return;
    }

    if (currentMode === 'pc' && isPhoneDetected && !isHardwareAsset) {
      if(statusBox) statusBox.style.display = 'none';
      playScanBeep(false);
      showModeMismatchModal('phone_detected_in_pc_mode', parsed, parsed.imei1);
      return;
    }

    if (currentMode !== 'pc') {
      if (isPhoneDetected || currentMode === 'telefono') {
        if (parsed.imei1 || parsed.imei2) {
          if(statusBox) statusBox.style.display = 'none';
          const found = (parsed.imei1 && findInventoryDevice(parsed.imei1)) || 
                        (parsed.imei2 && findInventoryDevice(parsed.imei2)) || 
                        (parsed.nSerie && findInventoryDevice(parsed.nSerie));

          let autoMarca = (found && found.marca) || parsed.marca || '';
          let autoModelo = (found && found.modelo) || parsed.modelo || '';
          let autoColor = (found && found.color && found.color !== '-') ? found.color : (parsed.color || '');
          let autoCosto = (found && found.costo && found.costo !== '-') ? found.costo : '';

          if (!found && parsed.imei1 && parsed.imei1.length >= 8) {
            const tac = parsed.imei1.slice(0, 8);
            if (typeof TAC_CATALOG !== 'undefined' && TAC_CATALOG[tac]) {
              const cat = TAC_CATALOG[tac];
              if (!autoMarca) autoMarca = cat.marca;
              if (!autoModelo) autoModelo = cat.modelo;
              if (!autoColor) autoColor = cat.color;
              if (!autoCosto) autoCosto = cat.costo;
            }
          }

          playScanBeep(true);
          if (found) {
            showToast('🎯 Teléfono identificado: ' + (found.marca || '') + ' ' + (found.modelo || ''), 'success');
          } else {
            showToast('📱 Etiqueta de Teléfono leída: ' + (autoMarca || 'BMOBILE') + ' ' + (autoModelo || 'ROCKET A1'), 'info');
          }

          openPostScanModal({
            code: parsed.nSerie || parsed.imei1 || 'TLF-AUTO',
            nSerie: (found && found.nSerie) || parsed.nSerie || parsed.imei1,
            imei1: (found && found.imei1 && found.imei1 !== '-') ? found.imei1 : (parsed.imei1 || ''),
            imei2: (found && found.imei2 && found.imei2 !== '-') ? found.imei2 : (parsed.imei2 || ''),
            marca: autoMarca || 'BMOBILE',
            modelo: autoModelo || 'ROCKET A1',
            color: autoColor || 'CELESTE',
            costo: autoCosto || 'S/. 197.00',
            categoria: 'Teléfonos móviles',
            tipo: 'SMARTPHONE',
            found: found
          });
          return;
        }
      }
    }

    // 2.2 Si NO es teléfono, verificar si es Activo de Cómputo (PC / Laptop)
    if (hw && hw.isHardware) {
      if(statusBox) statusBox.style.display = 'none';
      const foundPC = (hw.serial && findInventoryDevice(hw.serial)) ||
                      (hw.productCode && findInventoryDevice(hw.productCode)) ||
                      findInventoryDevice(text);
      if (foundPC) {
        playScanBeep(true);
        showToast('🎯 Computadora identificada: ' + (foundPC.marca || '') + ' ' + (foundPC.modelo || '') + ' (' + (foundPC.nSerie || '') + ')', 'success');
        showScanResult(foundPC, hw.serial || foundPC.nSerie);
        resetScanWizard();
        return;
      }

      playScanBeep(true);
      showToast('💻 Etiqueta de Computadora detectada: ' + hw.marca + ' ' + hw.modelo + ' (S/N: ' + hw.serial + ')', 'success');
      const detectedPC = {
        nSerie: hw.serial || ('PC-' + Date.now().toString().slice(-6)),
        codigo: hw.productCode || hw.serial || 'PC-AUTO',
        serie: hw.serial || '—',
        marca: hw.marca || 'LENOVO',
        modelo: hw.modelo || hw.productCode || 'ThinkCentre M700z',
        tipo: 'ALL IN ONE',
        categoria: 'Computadoras',
        color: 'NEGRO',
        ubicacion: 'ALMACÉN CENTRAL',
        responsable: 'STOCK',
        dni: '—',
        supervisor: '',
        area: 'OPERACIONES',
        estado: 'Stock',
        costo: 'S/. 1500',
        imei1: '',
        imei2: '',
        cargador: 'NO',
        observaciones: 'Detectado por lectura OCR de etiqueta',
        isNew: true
      };
      showScanResult(detectedPC, hw.serial);
      resetScanWizard();
      return;
    }

    if(statusBox) statusBox.style.display = 'none';

    // SI NO SE DETECTARON DATOS: Mostrar mensaje profesional de aviso y NO inventar datos
    if(!parsed.imei1 && !parsed.imei2 && !parsed.nSerie) {
      showOcrFailureAlert();
      return;
    }

    playScanBeep(true);
    showToast(`✅ Leído con éxito: IMEI 1: ${parsed.imei1 || '—'} | IMEI 2: ${parsed.imei2 || '—'}`, 'success');

    // 4. Buscar si el equipo ya está en inventario con buscador maestro
    const found = findInventoryDevice(parsed.imei1) || findInventoryDevice(parsed.imei2) || findInventoryDevice(parsed.nSerie);

    // 5. Usar los datos oficiales de la base cargada
    let autoMarca = (found && found.marca) || parsed.marca || '';
    let autoModelo = (found && found.modelo) || parsed.modelo || '';
    let autoColor = (found && found.color && found.color !== '-') ? found.color : '';
    let autoCosto = (found && found.costo && found.costo !== '-') ? found.costo : '';

    // Solo si el equipo NO existe en la base, consultar TAC como sugerencia secundaria
    if (!found && parsed.imei1 && parsed.imei1.length >= 8) {
      const tac = parsed.imei1.slice(0, 8);
      if (TAC_CATALOG[tac]) {
        const cat = TAC_CATALOG[tac];
        if (!autoMarca) autoMarca = cat.marca;
        if (!autoModelo) autoModelo = cat.modelo;
        if (!autoColor) autoColor = cat.color;
        if (!autoCosto) autoCosto = cat.costo;
      }
    }

    // 6. Abrir ventana de confirmación / asignación con datos limpios
    openPostScanModal({
      code: parsed.nSerie || parsed.imei1,
      nSerie: (found && found.nSerie) || parsed.nSerie || parsed.imei1,
      imei1: (found && found.imei1 && found.imei1 !== '-') ? found.imei1 : (parsed.imei1 || ''),
      imei2: (found && found.imei2 && found.imei2 !== '-') ? found.imei2 : (parsed.imei2 || ''),
      marca: autoMarca || 'ZTE',
      modelo: autoModelo || 'BLADE A35',
      color: autoColor,
      categoria: 'Teléfonos / Corporativos',
      found: found
    });

    if (parsed.nSerie && document.getElementById('qa_nSerie')) {
      document.getElementById('qa_nSerie').value = (found && found.nSerie) || parsed.nSerie;
    }
    if (autoMarca && document.getElementById('qa_marca')) {
      document.getElementById('qa_marca').value = autoMarca;
      handleQuickMarcaChange(autoMarca);
    }
    if (autoModelo && document.getElementById('qa_modelo')) {
      document.getElementById('qa_modelo').value = autoModelo;
    }
    if (autoColor && document.getElementById('qa_color')) {
      document.getElementById('qa_color').value = autoColor;
    }
    if (autoCosto && document.getElementById('qa_costo')) {
      document.getElementById('qa_costo').value = autoCosto;
    }

  } catch(err) {
    if(statusBox) statusBox.style.display = 'none';
    console.error('[OCR Error]:', err);
    showOcrFailureAlert();
  } finally {
    e.target.value = ''; // Limpiar input para permitir nueva selección
  }
}

// Ventana de aviso profesional si la foto no fue legible
function showOcrFailureAlert() {
  const modal = document.getElementById('ocrFailureModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } else {
    showToast('⚠️ No se pudo percibir la información en la etiqueta o pantalla. Por favor reintente con mejor iluminación.', 'warning');
  }
}

function closeOcrFailureModal(focusManual = false) {
  const modal = document.getElementById('ocrFailureModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  if (focusManual) {
    const input = document.getElementById('manualScanInput');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  }
}

function retryOcrPhoto() {
  closeOcrFailureModal(false);
  const input = document.getElementById('cameraPhotoInput');
  if (input) input.click();
}

// Analizador de texto de alta precisión: reconoce etiquetas de cajas y pantallas de teléfonos (*#06#)
function extractPhoneDataFromText(rawText){
  const res = { imei1: '', imei2: '', nSerie: '', marca: '', modelo: '', color: '', code: '' };
  if (!rawText) return res;

  // Normalizar separadores y corregir variaciones comunes de etiquetas (ej. IMEI N°1, IMEI No. 1, IMEI #1)
  let text = String(rawText)
    .replace(/\r/g, '\n')
    .replace(/[;]/g, ':')
    .replace(/IME[I1l|]\s*(?:N[°º\.]?|NO\.?|NUM\.?|#)?\s*([1l|])\s*[:\-\s]/gi, 'IMEI1:')
    .replace(/IME[I1l|]\s*(?:N[°º\.]?|NO\.?|NUM\.?|#)?\s*2\s*[:\-\s]/gi, 'IMEI2:');

  // 1. Patrón explícito IMEI 1 / IMEI 2
  const imei1LabelMatch = text.match(/IMEI1:\s*([0-9\s\-]{15,22})/i) || 
                          text.match(/IMEI\s*[:\-\s]\s*([0-9\s\-]{15,22})/i);
  if (imei1LabelMatch) {
    const digits = imei1LabelMatch[1].replace(/\D/g, '');
    if (digits.length >= 15) res.imei1 = digits.slice(0, 15);
  }

  const imei2LabelMatch = text.match(/IMEI2:\s*([0-9\s\-]{15,22})/i);
  if (imei2LabelMatch) {
    const digits = imei2LabelMatch[1].replace(/\D/g, '');
    if (digits.length >= 15) res.imei2 = digits.slice(0, 15);
  }

  // 2. Extraer secuencias globales de 15 dígitos
  const lines = text.split('\n');
  const found15 = [];
  for (const line of lines) {
    const matches = line.match(/\b\d{15}\b/g) || [];
    for (const m of matches) {
      if (!found15.includes(m)) found15.push(m);
    }
    const digitsOnly = line.replace(/[^\d]/g, '');
    if (digitsOnly.length === 15 && !found15.includes(digitsOnly)) {
      found15.push(digitsOnly);
    }
  }

  if (!res.imei1 && found15.length > 0) res.imei1 = found15[0];
  if (!res.imei2 && found15.length > 1) res.imei2 = found15[1];

  // 3. Marca
  if (/[bléèê][\s\-_]?mobile|bbmobile/i.test(text)) res.marca = 'BMOBILE';
  else if (/zte/i.test(text)) res.marca = 'ZTE';
  else if (/redmi|xiaomi/i.test(text)) res.marca = 'REDMI';
  else if (/honor/i.test(text)) res.marca = 'HONOR';
  else if (/nokia/i.test(text)) res.marca = 'NOKIA';
  else if (/samsung/i.test(text)) res.marca = 'SAMSUNG';
  else if (/motorola|moto/i.test(text)) res.marca = 'MOTOROLA';
  else if (/lenovo/i.test(text)) res.marca = 'LENOVO';
  else if (/dell/i.test(text)) res.marca = 'DELL';
  else if (/hp|hewlett/i.test(text)) res.marca = 'HP';

  // 4. Modelo de teléfono (ej. ROCKET A1)
  const mMod = text.match(/Modelo\s*[:\-\s]*([^\n\r—\-]+)/i);
  if (mMod) {
    res.modelo = mMod[1].trim().replace(/\s*A[tlI]$/i, ' A1');
  }
  if (!res.modelo && /ROCKET\s*A[1ltI]/i.test(text)) res.modelo = 'ROCKET A1';

  // 5. Color oficial
  const mCol = text.match(/Color\s*[:\-\s]*([A-Za-zÁÉÍÓÚáéíóú]+)/i);
  if (mCol) res.color = mCol[1].trim().toUpperCase();

  // 6. Número de Serie (SN / S/N)
  const snMatch = text.match(/(?:S[\/\.]?N|SERIAL(?:\s*NO)?|SERIE)\s*[:\s#]*([A-Z0-9\-_]{6,25})/i);
  if (snMatch) {
    res.nSerie = snMatch[1].trim().toUpperCase();
  }

  return res;
}

function loadScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* =====================================================
   SCANNER (html5-qrcode)
   ===================================================== */
function startScanner(){
  const readerEl     = document.getElementById('reader');
  const placeholder  = document.getElementById('scannerPlaceholder');
  readerEl.style.display   = 'block';
  placeholder.style.display = 'none';
  document.getElementById('btnStartScan').style.display = 'none';
  document.getElementById('btnStopScan').style.display  = '';

  const F = Html5QrcodeSupportedFormats;
  let selectedFormats = [];

  if (CURRENT_SCAN_MODE === 'qr') {
    selectedFormats = [F.QR_CODE, F.DATA_MATRIX].filter(Boolean);
  } else if (CURRENT_SCAN_MODE === 'barcode') {
    // Solo Code 128 (usado universalmente en IMEI y cajas de teléfonos) y EAN-13 (producto)
    // Desactivamos formatos sin suma de control como Codabar o Code 39 que leen basura en desenfoque
    selectedFormats = [
      F.CODE_128,
      F.EAN_13,
      F.UPC_A
    ].filter(Boolean);
  } else {
    selectedFormats = [
      F.QR_CODE,
      F.CODE_128,
      F.EAN_13,
      F.DATA_MATRIX
    ].filter(Boolean);
  }

  html5QrScanner = new Html5Qrcode('reader', {
    formatsToSupport: selectedFormats,
    verbose: false
  });

  // Ventana de escaneo amplia de campo completo (para enfocar con soltura sin ranuras angostas)
  const qrboxFn = (vw, vh) => {
    const w = Math.min(Math.round(vw * 0.90), 450);
    const h = Math.min(Math.round(vh * 0.65), 320); // Ventana amplia completa
    return { width: w, height: h };
  };

  html5QrScanner.start(
    { facingMode: 'environment' },
    {
      fps: 15,
      qrbox: qrboxFn,
      videoConstraints: {
        facingMode: 'environment'
      }
    },
    (decodedText, decodedResult) => {
      const fmt = (decodedResult && decodedResult.result && decodedResult.result.format)
        ? decodedResult.result.format.formatName
        : '';
      processScannedCode(decodedText, fmt);
    },
    () => {}   // errores de frame ignorados (normal mientras enfoca)
  ).catch(err => {
    showToast('⚠️ No se pudo acceder a la cámara: ' + err, 'error');
    stopScanner();
  });
}

// Sonido y vibración para confirmar lectura inequívoca
function playScanBeep(success = true){
  try {
    if (navigator.vibrate) {
      navigator.vibrate(success ? [100, 50, 100] : [200]);
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = success ? 880 : 330;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch(e){}
}

function stopScanner(){
  const ctrlBox = document.getElementById('liveCameraControls');
  const laserLine = document.getElementById('scannerLaserLine');
  if (ctrlBox) ctrlBox.style.display = 'none';
  if (laserLine) laserLine.style.display = 'none';
  CURRENT_CAMERA_TRACK = null;
  CURRENT_ZOOM_LEVEL = 1.0;
  IS_TORCH_ACTIVE = false;

  if (html5QrScanner) {
    html5QrScanner.stop().catch(()=>{}).finally(()=>{
      html5QrScanner=null;
      resetScannerUI();
    });
  } else {
    resetScannerUI();
  }
}

function resetScannerUI(){
  const readerEl=document.getElementById('reader');
  const placeholder=document.getElementById('scannerPlaceholder');
  const btnStart=document.getElementById('btnStartScan');
  const btnStop=document.getElementById('btnStopScan');
  if(readerEl)   { readerEl.style.display='none'; readerEl.innerHTML=''; }
  if(placeholder){ placeholder.style.display='flex'; }
  if(btnStart)   btnStart.style.display='';
  if(btnStop)    btnStop.style.display='none';
  if(typeof resetScanWizard === 'function') resetScanWizard();
}

/* =====================================================
   ESTADO DEL ESCÁNER DE 3 FASES (IDENTIFICAR + IMEI 1 + IMEI 2)
   ===================================================== */
let SCAN_WIZARD = {
  step: 1, // 1: Identificación/EAN o IMEI1, 2: IMEI 1, 3: IMEI 2
  idCode: '',
  imei1: '',
  imei2: '',
  foundDevice: null,
  lastScanTime: 0
};

function resetScanWizard(){
  SCAN_WIZARD = {
    step: 1,
    idCode: '',
    imei1: '',
    imei2: '',
    foundDevice: null,
    lastScanTime: 0
  };
  updateScanWizardUI();
}

function updateScanWizardUI(){
  const badge = document.getElementById('scanStepBadge');
  const instruction = document.getElementById('scanStepInstruction');
  const dot1 = document.getElementById('stepDot1');
  const dot2 = document.getElementById('stepDot2');
  const dot3 = document.getElementById('stepDot3');
  const tagCode = document.getElementById('tagCode');
  const tagImei1 = document.getElementById('tagImei1');
  const tagImei2 = document.getElementById('tagImei2');
  const accum = document.getElementById('scanAccumulated');

  if (!badge) return;

  if (accum) accum.style.display = 'flex';

  if (SCAN_WIZARD.step === 1) {
    badge.textContent = 'Paso 1 de 3: Identificar';
    badge.style.background = '#dbeafe';
    badge.style.color = '#1e40af';
    instruction.innerHTML = `<span style="font-size:18px">1️⃣</span><span><strong>PASO 1:</strong> Escanea el código de barras del <strong>producto / modelo</strong> (en la caja o etiqueta).</span>`;
    if (dot1) dot1.style.background = 'var(--primary)';
    if (dot2) dot2.style.background = '#cbd5e1';
    if (dot3) dot3.style.background = '#cbd5e1';
  } else if (SCAN_WIZARD.step === 2) {
    badge.textContent = 'Paso 2: IMEI 1 (teléfono)';
    badge.style.background = '#dcfce7';
    badge.style.color = '#15803d';
    instruction.innerHTML = `<span style="font-size:18px">2️⃣</span><span><strong>PASO 2:</strong> Ahora escanea la barra marcada como <strong>IMEI 1</strong>.</span>`;
    if (dot1) dot1.style.background = '#16a34a';
    if (dot2) dot2.style.background = 'var(--primary)';
    if (dot3) dot3.style.background = '#cbd5e1';
  } else if (SCAN_WIZARD.step === 3) {
    badge.textContent = 'Paso 3: IMEI 2 (teléfono)';
    badge.style.background = '#fef3c7';
    badge.style.color = '#b45309';
    instruction.innerHTML = `<span style="font-size:18px">3️⃣</span><span><strong>PASO 3:</strong> Ahora escanea la barra marcada como <strong>IMEI 2</strong>.</span>`;
    if (dot1) dot1.style.background = '#16a34a';
    if (dot2) dot2.style.background = '#16a34a';
    if (dot3) dot3.style.background = 'var(--primary)';
  }

  if (tagCode) {
    if (SCAN_WIZARD.idCode) {
      tagCode.style.display = 'inline-block';
      tagCode.textContent = `📱 Código: ${SCAN_WIZARD.idCode}`;
    } else {
      tagCode.style.display = 'none';
    }
  }
  if (tagImei1) {
    if (SCAN_WIZARD.imei1) {
      tagImei1.style.display = 'inline-block';
      tagImei1.textContent = `📶 IMEI 1: ${SCAN_WIZARD.imei1}`;
    } else {
      tagImei1.style.display = 'none';
    }
  }
  if (tagImei2) {
    if (SCAN_WIZARD.imei2) {
      tagImei2.style.display = 'inline-block';
      tagImei2.textContent = `📶 IMEI 2: ${SCAN_WIZARD.imei2}`;
    } else {
      tagImei2.style.display = 'none';
    }
  }
}


/* =====================================================
   MODAL DE AVISO PROFESIONAL: MODO INCORRECTO (MISMATCH)
   ===================================================== */
function showModeMismatchModal(mismatchType, data, rawCode) {
  stopScanner();
  lockBodyScroll();
  const modal = document.getElementById('modeMismatchModal');
  if (!modal) return;

  const iconEl = document.getElementById('mmmIcon');
  const titleEl = document.getElementById('mmmTitle');
  const bodyEl = document.getElementById('mmmBody');
  const btnSwitch = document.getElementById('mmmBtnSwitch');

  if (mismatchType === 'pc_detected_in_phone_mode') {
    if (iconEl) iconEl.textContent = '💻';
    if (titleEl) titleEl.textContent = 'Equipo de Cómputo Detectado';
    const pcMarca = (data && data.marca) || 'LENOVO';
    const pcModelo = (data && (data.modelo || data.productCode)) || 'ThinkCentre M700z';
    const pcSerial = (data && (data.serial || data.nSerie || data.serie)) || rawCode || '—';

    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#1e40af;font-weight:700;margin-bottom:8px">
          <span>⚠️ Modo actual activo:</span> <span style="background:#dbeafe;padding:2px 8px;border-radius:4px">📱 Teléfono</span>
        </div>
        <div style="font-size:13px;color:#334155;margin-bottom:8px">
          La etiqueta o código que acabas de escanear corresponde a una <strong>Computadora / Laptop</strong>:
        </div>
        <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-bottom:10px">
          <div style="font-size:14px;font-weight:800;color:#0f172a">${esc(pcMarca)} ${esc(pcModelo)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">
            Número de Serie (S/N): <strong style="font-family:monospace;color:#2563eb;font-size:13px">${esc(pcSerial)}</strong>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;line-height:1.4">
          ℹ️ Las computadoras se identifican por <strong>Número de Serie</strong> y no utilizan código IMEI. Para continuar, pulsa el botón a continuación para cambiar al modo correspondiente:
        </div>
      `;
    }

    if (btnSwitch) {
      btnSwitch.style.background = '#7c3aed';
      btnSwitch.style.borderColor = '#7c3aed';
      btnSwitch.innerHTML = '💻 Cambiar a modo PC / Laptop y Analizar';
      btnSwitch.onclick = () => {
        closeModeMismatchModal();
        setScanDeviceType('pc');
        if (data && data.isHardware) {
          processHardwareAssetDetectedFull(data, rawCode || pcSerial);
        } else {
          showToast('Modo cambiado a 💻 PC / Laptop. Listo para escanear.', 'info');
        }
      };
    }
  } else if (mismatchType === 'phone_detected_in_pc_mode') {
    if (iconEl) iconEl.textContent = '📱';
    if (titleEl) titleEl.textContent = 'Teléfono Móvil Detectado';
    const phoneMarca = (data && data.marca) || 'BMOBILE';
    const phoneModelo = (data && data.modelo) || 'ROCKET A1';
    const phoneImei = (data && (data.imei1 || data.imei2)) || rawCode || '—';

    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#7c3aed;font-weight:700;margin-bottom:8px">
          <span>⚠️ Modo actual activo:</span> <span style="background:#ede9fe;padding:2px 8px;border-radius:4px">💻 PC / Laptop</span>
        </div>
        <div style="font-size:13px;color:#334155;margin-bottom:8px">
          La etiqueta o código que acabas de escanear corresponde a un <strong>Teléfono Celular</strong>:
        </div>
        <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-bottom:10px">
          <div style="font-size:14px;font-weight:800;color:#0f172a">${esc(phoneMarca)} ${esc(phoneModelo)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">
            Código IMEI (15 dígitos): <strong style="font-family:monospace;color:#16a34a;font-size:13px">${esc(phoneImei)}</strong>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;line-height:1.4">
          ℹ️ Los teléfonos móviles se registran por código <strong>IMEI</strong>. Para continuar, pulsa el botón a continuación para cambiar al modo correspondiente:
        </div>
      `;
    }

    if (btnSwitch) {
      btnSwitch.style.background = '#2563eb';
      btnSwitch.style.borderColor = '#2563eb';
      btnSwitch.innerHTML = '📱 Cambiar a modo Teléfono y Analizar';
      btnSwitch.onclick = () => {
        closeModeMismatchModal();
        setScanDeviceType('telefono');
        if (data && data.imei1) {
          processPhoneAssetDetectedFull(data, rawCode || phoneImei);
        } else {
          showToast('Modo cambiado a 📱 Teléfono. Listo para escanear.', 'info');
        }
      };
    }
  }

  modal.style.display = 'flex';
}

function closeModeMismatchModal() {
  const modal = document.getElementById('modeMismatchModal');
  if (modal) modal.style.display = 'none';
  unlockBodyScroll();
}
window.closeModeMismatchModal = closeModeMismatchModal;
window.showModeMismatchModal = showModeMismatchModal;

function processHardwareAssetDetectedFull(hw, rawCode) {
  let foundPC = (hw.serial && findInventoryDevice(hw.serial)) || 
                (hw.productCode && findInventoryDevice(hw.productCode)) ||
                (rawCode && findInventoryDevice(rawCode));
  if (foundPC) {
    playScanBeep(true);
    showToast('🎯 Computadora identificada: ' + (foundPC.marca || '') + ' ' + (foundPC.modelo || '') + ' (' + (foundPC.nSerie || '') + ')', 'success');
    showScanResult(foundPC, hw.serial || foundPC.nSerie);
    resetScanWizard();
    return;
  }

  playScanBeep(true);
  showToast('💻 Etiqueta de Computadora detectada: ' + (hw.marca || 'PC') + ' (S/N: ' + (hw.serial || rawCode) + ')', 'success');

  const detectedPC = {
    nSerie: hw.serial || rawCode || ('PC-' + Date.now().toString().slice(-6)),
    codigo: hw.productCode || hw.serial || rawCode || 'PC-AUTO',
    serie: hw.serial || rawCode || '—',
    marca: hw.marca || 'LENOVO',
    modelo: hw.modelo || hw.productCode || 'ThinkCentre M700z',
    tipo: 'ALL IN ONE',
    categoria: 'Computadoras',
    color: 'NEGRO',
    ubicacion: 'ALMACÉN CENTRAL',
    responsable: 'STOCK',
    dni: '—',
    supervisor: '',
    area: 'OPERACIONES',
    estado: 'Stock',
    costo: 'S/. 1500',
    imei1: '',
    imei2: '',
    cargador: 'NO',
    observaciones: 'Detectado automáticamente por lectura de hardware',
    isNew: true
  };

  showScanResult(detectedPC, hw.serial || rawCode);
  resetScanWizard();
}

function processPhoneAssetDetectedFull(data, rawCode) {
  const imei = data.imei1 || rawCode;
  const found = (imei && findInventoryDevice(imei)) || (data.imei2 && findInventoryDevice(data.imei2));
  if (found) {
    playScanBeep(true);
    showToast('🎯 Teléfono identificado: ' + (found.marca || '') + ' ' + (found.modelo || ''), 'success');
    showScanResult(found, imei);
    resetScanWizard();
    return;
  }

  playScanBeep(true);
  showToast('📱 Teléfono detectado (IMEI: ' + imei + ')', 'info');
  showScanResult(data, imei);
  resetScanWizard();
}

function processScannedCode(code, fmt){
  if(!code || !code.trim()) return;
  code = code.trim();

  const qaModal = document.getElementById('quickAssignModal');
  const scModal = document.getElementById('scanModal');
  if ((qaModal && qaModal.style.display !== 'none') || (scModal && scModal.style.display !== 'none')) {
    return;
  }

  const now = Date.now();
  if (SCAN_WIZARD.lastScanTime && (now - SCAN_WIZARD.lastScanTime < 1000)) {
    return;
  }
  SCAN_WIZARD.lastScanTime = now;

  if (typeof window._pendingScanTarget === 'function') {
    const cb = window._pendingScanTarget;
    window._pendingScanTarget = null;
    cb(code);
    return;
  }

  // 1. Buscar si ya existe en inventario
  const found = findInventoryDevice(code);
  if (found) {
    playScanBeep(true);
    SCAN_WIZARD.foundDevice = found;
    SCAN_WIZARD.imei1 = (found.imei1 && found.imei1 !== '-') ? found.imei1 : '';
    SCAN_WIZARD.imei2 = (found.imei2 && found.imei2 !== '-') ? found.imei2 : '';
    showToast('🎯 ' + (found.categoria || 'Equipo') + ' identificado: ' + (found.marca || '') + ' ' + (found.modelo || '') + ' (' + (found.nSerie || found.codigo) + ')', 'success');
    updateScanWizardUI();
    showScanResult(found, code);
    resetScanWizard();
    return;
  }

  // 2. Análisis inteligente de Activo de Hardware (PC, Laptop, Monitor - NO TIENE IMEI)
  const hw = parseHardwareAsset(code);
  if (hw && hw.isHardware) {
    playScanBeep(true);

    if (hw.serial && hw.serial !== code) {
      const matchBySerial = findInventoryDevice(hw.serial);
      if (matchBySerial) {
        showToast('🎯 Computadora reconocida: ' + matchBySerial.marca + ' ' + matchBySerial.modelo + ' (S/N: ' + matchBySerial.nSerie + ')', 'success');
        showScanResult(matchBySerial, code);
        resetScanWizard();
        return;
      }
    }

    showToast('💻 Código de Computadora / Laptop detectado (' + (hw.serial || code) + ')', 'success');

    let defaultModelo = hw.modelo || hw.productCode || 'ThinkCentre M700z';
    if (hw.productCode && !hw.modelo) defaultModelo = 'PC (' + hw.productCode + ')';

    const customPC = {
      nSerie: hw.serial || code,
      codigo: code,
      serie: hw.serial || code,
      marca: hw.marca || 'LENOVO',
      modelo: defaultModelo,
      tipo: 'ALL IN ONE / DESKTOP / LAPTOP',
      categoria: 'Computadoras',
      color: 'NEGRO',
      ubicacion: 'ALMACÉN CENTRAL',
      responsable: 'STOCK',
      dni: '—',
      supervisor: '',
      area: 'OPERACIONES',
      estado: 'Stock',
      costo: 'S/. 1500',
      imei1: '',
      imei2: '',
      cargador: 'NO',
      observaciones: 'Código escaneado: ' + code,
      isNew: true
    };

    showScanResult(customPC, code);
    resetScanWizard();
    return;
  }

  // 3. Flujo telefónico para celulares (IMEI)
  if (SCAN_WIZARD.step === 1) {
    SCAN_WIZARD.idCode = code;
    playScanBeep(true);

    if (/^\d{15}$/.test(code)) {
      SCAN_WIZARD.imei1 = code;
      SCAN_WIZARD.step = 3;
      showToast('🎯 PASO 1 COMPLETO: IMEI 1 reconocido (' + code + '). Ahora apunta al IMEI 2.', 'success');
      updateScanWizardUI();
      return;
    }

    SCAN_WIZARD.step = 2;
    showToast('🎯 Teléfono: Código detectado (' + code + '). Apunta al código IMEI 1.', 'success');
    updateScanWizardUI();
    return;
  }

  if (SCAN_WIZARD.step === 2) {
    if (code === SCAN_WIZARD.idCode) {
      playScanBeep(false);
      showToast('⚠️ Estás enfocando de nuevo el código del Paso 1. Apunta al código IMEI 1.', 'warning');
      return;
    }
    if (!/^\d{15}$/.test(code)) {
      showToast('⚠️ Lectura parcial (' + code + '). Para teléfonos se requiere el IMEI (15 dígitos).', 'warning');
      return;
    }
    playScanBeep(true);
    SCAN_WIZARD.imei1 = code;

    const pairMatch = findInventoryDevice(code);
    if (pairMatch) {
      showToast('🎯 Equipo reconocido: ' + (pairMatch.marca || '') + ' (' + (pairMatch.ubicacion || '') + ')', 'success');
      updateScanWizardUI();
      showScanResult(pairMatch, code);
      resetScanWizard();
      return;
    }

    SCAN_WIZARD.step = 3;
    showToast('🎯 PASO 2 COMPLETO: IMEI 1 guardado (' + code + '). Ahora apunta al IMEI 2.', 'success');
    updateScanWizardUI();
    return;
  }

  if (SCAN_WIZARD.step === 3) {
    if (code === SCAN_WIZARD.imei1) {
      playScanBeep(false);
      showToast('⚠️ Estás enfocando el IMEI 1 repetido. Apunta la mira al código IMEI 2.', 'warning');
      return;
    }
    if (!/^\d{15}$/.test(code)) {
      showToast('⚠️ Lectura parcial (' + code + '). El IMEI 2 debe tener 15 dígitos.', 'warning');
      return;
    }
    playScanBeep(true);
    SCAN_WIZARD.imei2 = code;
    updateScanWizardUI();

    const finalMatch = findInventoryDevice(code) || findInventoryDevice(SCAN_WIZARD.imei1);
    if (finalMatch) {
      showToast('🎉 ¡Equipo identificado: ' + (finalMatch.marca || ''), 'success');
      showScanResult(finalMatch, code);
      resetScanWizard();
      return;
    }

    showToast('🎉 Teléfono nuevo listo para registrar.', 'success');
    let autoMarca = 'ZTE';
    let autoModelo = 'BLADE A35';
    let autoColor = 'NEGRO';
    let autoCosto = 'S/. 197.00';
    const tac = SCAN_WIZARD.imei1 ? SCAN_WIZARD.imei1.slice(0, 8) : '';
    if (tac && TAC_CATALOG[tac]) {
      autoMarca = TAC_CATALOG[tac].marca || autoMarca;
      autoModelo = TAC_CATALOG[tac].modelo || autoModelo;
      autoColor = TAC_CATALOG[tac].color || autoColor;
      autoCosto = TAC_CATALOG[tac].costo || autoCosto;
    }
    const customDevice = {
      nSerie: SCAN_WIZARD.idCode || SCAN_WIZARD.imei1,
      imei1: SCAN_WIZARD.imei1,
      imei2: SCAN_WIZARD.imei2,
      marca: autoMarca,
      modelo: autoModelo,
      color: autoColor,
      costo: autoCosto,
      ubicacion: 'ALMACÉN CENTRAL',
      categoria: 'Teléfonos móviles',
      responsable: 'NO ASIGNADO',
      dni: '—',
      puesto: 'ASESOR / COLABORADOR',
      area: 'OPERACIONES',
      estado: 'Stock',
      isNew: true
    };
    showScanResult(customDevice, SCAN_WIZARD.imei1);
    resetScanWizard();
    return;
  }
}

function showScanResult(row, code){
  stopScanner();
  lockBodyScroll();
  const modal = document.getElementById('scanModal');

  // Salvaguardas de datos del equipo
  let displayImei1 = row.imei1 || '';
  let displayImei2 = row.imei2 || '';
  if ((!displayImei1 || displayImei1 === '-') && row.observaciones) {
    const m1 = String(row.observaciones).match(/IMEI\s*1\s*:\s*([0-9]{14,16})/i);
    if (m1) displayImei1 = m1[1];
  }
  if ((!displayImei2 || displayImei2 === '-') && row.observaciones) {
    const m2 = String(row.observaciones).match(/IMEI\s*2\s*:\s*([0-9]{14,16})/i);
    if (m2) displayImei2 = m2[1];
  }
  if (!displayImei1 && /^\d{15}$/.test(String(row.nSerie || ''))) {
    displayImei1 = String(row.nSerie);
  }

  // Limpieza de modelo si contiene "Color: ..."
  let displayModelo = row.modelo || '';
  if (/^Color:\s*/i.test(displayModelo) || !displayModelo || displayModelo === '-') {
    displayModelo = (row.marca && row.marca !== 'GENÉRICO') ? row.marca : 'SMARTPHONE CORPORATIVO';
  }

  // Limpieza y validación rigurosa de color
  const VALID_COLORS = ['NEGRO', 'AZUL', 'PLOMO', 'CELESTE', 'GRIS', 'BLANCO', 'ROJO', 'VERDE', 'DORADO', 'PLATEADO'];
  let displayColor = (row.color && row.color !== '-' && row.color !== '—') ? String(row.color).trim().toUpperCase() : '';
  if (!VALID_COLORS.includes(displayColor)) {
    if (row.observaciones) {
      const mc = String(row.observaciones).match(/Color\s*:\s*([A-Za-zÁÉÍÓÚáéíóú]+)/i);
      if (mc && VALID_COLORS.includes(mc[1].toUpperCase())) {
        displayColor = mc[1].toUpperCase();
      }
    }
    if (!VALID_COLORS.includes(displayColor)) {
      displayColor = 'NEGRO';
    }
  }

  row.imei1 = displayImei1;
  row.imei2 = displayImei2;
  row.modelo = displayModelo;
  row.color = displayColor;

  const isComputer = (row.categoria === 'Computadoras' || /laptop|pc|desktop|thinkcentre|thinkpad|all in one/i.test((row.categoria || '') + ' ' + (row.modelo || '') + ' ' + (row.tipo || '')));
  const isPhone = !isComputer && (row.categoria === 'Teléfonos móviles' || (displayImei1 && displayImei1 !== '-'));

  // Detección rigurosa de si el equipo está asignado a un colaborador o si es Stock/Broken
  const respUpper = String(row.responsable || '').trim().toUpperCase();
  const dniUpper = String(row.dni || '').trim().toUpperCase();
  const estUpper = String(row.estado || '').trim().toUpperCase();

  const isNonPerson = ['STOCK', 'BROKEN', '-', 'NO ASIGNADO', 'VACIO', '', '—'].includes(respUpper) ||
                      ['STOCK', 'BROKEN', '-', '', '—'].includes(dniUpper);
  const isAssigned = (estUpper === 'ASIGNADO' || estUpper === 'OPERATIVO') && !isNonPerson && row.responsable && row.responsable !== '-';
  const isBroken = estUpper === 'BROKEN' || respUpper === 'BROKEN' || dniUpper === 'BROKEN';
  const isStock = !isAssigned && !isBroken;

  let topBadgeHtml = '';
  if (isAssigned) {
    topBadgeHtml = `<div class="scan-resp-badge" style="background:#2563eb;color:#fff;font-weight:700">🔵 EQUIPO ASIGNADO A COLABORADOR</div>`;
  } else if (isStock) {
    topBadgeHtml = `<div class="scan-resp-badge" style="background:#059669;color:#fff;font-weight:700">🟢 DISPONIBLE EN STOCK (NO ASIGNADO)</div>`;
  } else {
    topBadgeHtml = `<div class="scan-resp-badge" style="background:#dc2626;color:#fff;font-weight:700">🔴 EQUIPO AVERIADO / BROKEN</div>`;
  }

  let colabBoxHtml = '';
  if (isAssigned) {
    colabBoxHtml = `
      <div class="scan-resp-box" style="border-left: 4px solid #2563eb; background: #f8fafc; border: 1px solid #cbd5e1; border-left-width: 4px;">
        <h4 class="scan-resp-title" style="color: #1e40af; font-weight: 700;">👤 DATOS DEL COLABORADOR ASIGNADO</h4>
        <div class="scan-resp-grid" style="color: #334155;">
          <div><label style="color:#64748b;font-weight:600">Nombre:</label> <span style="font-size:15px; font-weight:800; color:#1d4ed8;">${esc(row.responsable)}</span></div>
          <div><label style="color:#64748b;font-weight:600">DNI:</label> <span style="font-size:15px; font-weight:800; color:#0f172a;">${esc(row.dni || '—')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Supervisor:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.supervisor || '—')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Área:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.area || row.ubicacion || '—')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Puesto:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.puesto || (isPhone ? 'ASESOR / COLABORADOR' : 'OPERACIONES'))}</span></div>
          <div><label style="color:#64748b;font-weight:600">Fecha Entrega:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.fechaCompra || new Date().toISOString().slice(0,10))}</span></div>
        </div>
      </div>
    `;
  } else if (isStock) {
    colabBoxHtml = `
      <div class="scan-resp-box" style="border-left: 4px solid #059669; background: #f0fdf4; border: 1px solid #bbf7d0; border-left-width: 4px;">
        <h4 class="scan-resp-title" style="color: #047857; font-weight: 700;">📦 ESTADO: DISPONIBLE EN STOCK (SIN ASIGNAR)</h4>
        <div style="font-size:13px; color:#334155; line-height: 1.5; margin-bottom: 8px;">
          Este equipo se encuentra en almacén o custodia técnica y <strong>no está asignado a ningún colaborador</strong> actualmente.
        </div>
        <div class="scan-resp-grid" style="color: #334155;">
          <div><label style="color:#64748b;font-weight:600">Custodia / Sede:</label> <span style="font-weight:800; color:#0f172a;">${esc(row.ubicacion || 'ALMACÉN')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Estado Técnico:</label> <span style="color:#059669; font-weight:800;">OPERATIVO</span></div>
        </div>
      </div>
    `;
  } else {
    colabBoxHtml = `
      <div class="scan-resp-box" style="border-left: 4px solid #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-left-width: 4px;">
        <h4 class="scan-resp-title" style="color: #b91c1c; font-weight: 700;">⚠️ ESTADO: INOPERATIVO / BROKEN</h4>
        <div style="font-size:13px; color:#475569; line-height: 1.5;">
          Reportado como dañado o dado de baja técnica en: <strong style="color:#0f172a;">${esc(row.ubicacion || 'ALMACÉN')}</strong>.
        </div>
      </div>
    `;
  }

  document.getElementById('scanModalBody').innerHTML = `
    <!-- Cabecera de la ficha -->
    <div class="scan-responsiva-header">
      ${topBadgeHtml}
      <h3 style="margin:6px 0 2px;font-size:18px;color:#ffffff">${esc(row.marca)} ${esc(displayModelo)}</h3>
      <div style="font-size:12px;color:#cbd5e1">Estado: <strong style="color:#fff;">${esc(row.estado)}</strong> | Ubicación: <strong style="color:#fff;">${esc(row.ubicacion || 'Oficinas')}</strong></div>
    </div>

    <!-- Secciones idénticas al formato RESP.CELULAR 2026 PRINCIPAL -->
    <div class="scan-resp-sections">
      <!-- 1. DATOS DEL COLABORADOR / ESTADO -->
      ${colabBoxHtml}

      <!-- 2. INFORMACIÓN Y CARACTERÍSTICAS DEL EQUIPO -->
      <div class="scan-resp-box" style="background:#f8fafc; border: 1px solid #cbd5e1;">
        <h4 class="scan-resp-title" style="color: #1e293b; font-weight: 700;">📱 CARACTERÍSTICAS DEL EQUIPO</h4>
        <div class="scan-resp-grid" style="color: #334155;">
          <div><label style="color:#64748b;font-weight:600">Marca:</label> <span style="font-weight:800; font-size:15px; color:#0f172a;">${esc(row.marca || '—')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Modelo:</label> <span style="font-weight:800; font-size:15px; color:#0f172a;">${esc(displayModelo)}</span></div>
          
          ${isComputer ? `
          <div style="grid-column: 1 / -1; background: #0f172a; padding: 14px; border-radius: 8px; border: 1.5px solid #38bdf8; margin: 4px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px">
              <span style="color:#94a3b8; font-size:13px; font-weight:700;">💻 S/N (Número de Serie):</span>
              <strong style="font-family:monospace; font-size:17px; color:#38bdf8; letter-spacing:1px; word-break:break-all">${esc(row.nSerie || row.serie || '—')}</strong>
            </div>
          </div>
` : `
          <div style="grid-column: 1 / -1; background: #0f172a; padding: 12px 14px; border-radius: 8px; border: 1.5px solid #38bdf8; margin: 4px 0; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px">
              <span style="color:#94a3b8; font-size:13px; font-weight:700;">📶 IMEI 1:</span>
              <strong style="font-family:monospace; font-size:16px; color:#38bdf8; letter-spacing:1px; word-break:break-all">${esc(displayImei1 || '—')}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; border-top: 1px solid #1e293b; padding-top: 6px;">
              <span style="color:#94a3b8; font-size:13px; font-weight:700;">📶 IMEI 2:</span>
              <strong style="font-family:monospace; font-size:16px; color:#38bdf8; letter-spacing:1px; word-break:break-all">${esc(displayImei2 || '—')}</strong>
            </div>
          </div>
`}

          <div><label style="color:#64748b;font-weight:600">Color:</label> <span style="font-weight:800; font-size:14px; color:#0f172a;">${esc(displayColor)}</span></div>
          <div><label style="color:#64748b;font-weight:600">Costo Estimado:</label> <span style="font-weight:700; color:#0f172a;">${esc(row.costo || 'S/. 197.00')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Accesorios:</label> <span style="font-weight:700; color:#0f172a;">${esc(row.accesorios || (row.cargador === 'SI' ? 'CARGADOR' : 'EQUIPO COMPLETO'))}</span></div>
          <div><label style="color:#64748b;font-weight:600">Ubicación:</label> <span style="font-weight:700; color:#0f172a;">${esc(row.ubicacion || 'Oficinas')}</span></div>
        </div>
      </div>
    </div>

    <!-- Botón de acción principal: Imprimir Acta Oficial PDF -->
    <div class="scan-actions-bar">
      <button class="btn btn-primary btn-lg" style="flex:1" onclick="printResponsivaPDF(STATE.inventory[${STATE.inventory.indexOf(row)}])">
        📄 Imprimir Acta / Responsiva PDF (Para Firma)
      </button>
      <button class="btn btn-outline" onclick="closeScanModal();openEdit(${STATE.inventory.indexOf(row)})">
        ✏️ Editar Datos
      </button>
      <button class="btn btn-outline" onclick="closeScanModal()">
        Cerrar
      </button>
    </div>
  `;
  modal.style.display = 'flex';

  // Also update side panel in scanner section
  document.getElementById('scanResultTitle').textContent = isAssigned ? '✅ Equipo Asignado' : (isStock ? '📦 Equipo en Stock' : '⚠️ Equipo Broken');
  const badgeColor = isAssigned ? '#2563eb' : (isStock ? '#059669' : '#dc2626');
  const badgeText = isAssigned ? '🔵 ASIGNADO' : (isStock ? '🟢 EN STOCK' : '🔴 BROKEN');
  document.getElementById('scanResultBody').innerHTML = `
    <div class="scan-found-mini">
      <p class="scan-badge-found" style="background:${badgeColor};color:#fff;font-weight:700">${badgeText}</p>
      <div class="scan-found-row"><span class="scan-found-label">Equipo</span><span class="scan-found-val"><strong>${esc(row.marca)} ${esc(displayModelo)}</strong></span></div>
      ${isComputer
        ? '<div class="scan-found-row"><span class="scan-found-label">S/N</span><span class="scan-found-val"><strong style="font-family:monospace;color:#2563eb">' + esc(row.nSerie || row.serie || '—') + '</strong></span></div>'
        : '<div class="scan-found-row"><span class="scan-found-label">IMEI 1</span><span class="scan-found-val"><strong style="font-family:monospace;color:#2563eb">' + esc(displayImei1 || '—') + '</strong></span></div><div class="scan-found-row"><span class="scan-found-label">IMEI 2</span><span class="scan-found-val"><strong style="font-family:monospace;color:#2563eb">' + esc(displayImei2 || '—') + '</strong></span></div>'
      }
      <div class="scan-found-row"><span class="scan-found-label">Color</span><span class="scan-found-val">${esc(displayColor)}</span></div>
      <div class="scan-found-row"><span class="scan-found-label">Responsable</span><span class="scan-found-val">${esc(isAssigned ? row.responsable : 'NO ASIGNADO')}</span></div>
      <div class="scan-found-row"><span class="scan-found-label">DNI</span><span class="scan-found-val">${esc(isAssigned ? row.dni : '—')}</span></div>
      <button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="printResponsivaPDF(STATE.inventory[${STATE.inventory.indexOf(row)}])">
        📄 Generar Responsiva PDF
      </button>
    </div>`;
}

function closeScanModal(){
  document.getElementById('scanModal').style.display = 'none';
  unlockBodyScroll();
}

const TAC_CATALOG = {
  '35333521': { marca: 'BMOBILE', modelo: 'ROCKET A1', color: 'CELESTE', costo: 'S/. 197.00' },
  '35333501': { marca: 'BMOBILE', modelo: 'ROCKET A1', color: 'CELESTE', costo: 'S/. 197.00' },
  '353335': { marca: 'BMOBILE', modelo: 'ROCKET A1', color: 'CELESTE', costo: 'S/. 197.00' },
  '35072696': { marca: 'ZTE', modelo: 'ZTE (PLOMO)', color: 'PLOMO', costo: 'S/.197.00' },
  '35338109': { marca: 'NOKIA', modelo: 'NOKIA (NEGRO)', color: 'NEGRO', costo: 'S/.197.00' },
  '86117390': { marca: 'ZTE', modelo: 'ZTE (CELESTE)', color: 'CELESTE', costo: 'S/.197.00' },
  '86134507': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86135075': { marca: 'REDMI', modelo: 'REDMI (PLOMO)', color: 'PLOMO', costo: 'S/.269.00' },
  '86152406': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86152506': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86173907': { marca: 'ZTE', modelo: 'ZTE (PLOMO)', color: 'PLOMO', costo: 'S/.197.00' },
  '86323407': { marca: 'REDMI', modelo: 'REDMI (PLOMO)', color: 'PLOMO', costo: 'S/.269.00' },
  '86364804': { marca: 'ZTE', modelo: 'ZTE (AZUL)', color: 'AZUL', costo: 'S/.197.00' },
  '86374804': { marca: 'ZTE', modelo: 'ZTE (NEGRO)', color: 'NEGRO', costo: 'S/.197.00' },
  '86394106': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86433406': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86533806': { marca: 'REDMI', modelo: 'REDMI (AZUL)', color: 'AZUL', costo: 'S/.269.00' },
  '86557308': { marca: 'HONOR PLAY', modelo: 'HONOR PLAY (NEGRO)', color: 'NEGRO', costo: 'S/.260.00' },
  '86615607': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86617506': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86637805': { marca: 'HONOR PLAY', modelo: 'HONOR PLAY (NEGRO)', color: 'NEGRO', costo: 'S/.260.00' },
  '86764406': { marca: 'ZTE', modelo: 'ZTE (CELESTE)', color: 'CELESTE', costo: 'S/.197.00' },
  '86871707': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
  '86882008': { marca: 'REDMI', modelo: 'REDMI (PLOMO)', color: 'PLOMO', costo: 'S/.269.00' },
  '88871707': { marca: 'REDMI', modelo: 'REDMI (PLOMO)', color: 'PLOMO', costo: 'S/.269.00' },
  '96272906': { marca: 'REDMI', modelo: 'REDMI (NEGRO)', color: 'NEGRO', costo: 'S/.269.00' },
};

function handleQuickMarcaChange(marcaVal) {
  const modelList = document.getElementById('qa_modelo_list');
  if (!modelList) return;
  const brand = (marcaVal || '').toUpperCase().trim();
  const models = STATE.inventory
    .filter(r => (r.marca || '').toUpperCase().trim() === brand && r.modelo)
    .map(r => r.modelo);
  const uniqueModels = [...new Set(models)];
  if (uniqueModels.length > 0) {
    modelList.innerHTML = uniqueModels.map(m => `<option value="${esc(m)}"></option>`).join('');
  }
}

/* =====================================================
   QUICK ASSIGN MODAL (Unregistered scanned equipment)
   ===================================================== */
function openQuickAssignModal(code, found = null, explicitImei1 = '', explicitImei2 = ''){
  // DETENER cámara de inmediato para congelar los datos y evitar que siga escaneando de fondo
  stopScanner();
  document.body.style.overflow = 'hidden';

  const modal = document.getElementById('quickAssignModal');

  // Limpiar campos previos
  document.getElementById('qa_marca').value = '';
  document.getElementById('qa_modelo').value = '';
  document.getElementById('qa_color').value = '';
  document.getElementById('qa_costo').value = '';
  if (document.getElementById('qa_imei1')) document.getElementById('qa_imei1').value = '';
  document.getElementById('qa_imei2').value = '';
  document.getElementById('qa_nSerie').value = '';
  document.getElementById('qa_dni').value = '';
  document.getElementById('qa_responsable').value = '';
  document.getElementById('qa_area').value = '';
  document.getElementById('qa_supervisor').value = '';
  document.getElementById('qa_puesto').value = '';

  // Determinar los IMEIs que irán en el formulario
  let finalImei1 = explicitImei1 || '';
  let finalImei2 = explicitImei2 || '';
  let finalSerie = '';

  // Buscar en el inventario con el buscador maestro
  if (!found) {
    found = findInventoryDevice(code) || findInventoryDevice(explicitImei1) || findInventoryDevice(explicitImei2);
  }

  // Si encontramos el equipo en la base técnica, usamos su información técnica y par de IMEIs
  if (found) {
    finalImei1 = (found.imei1 && found.imei1 !== '-') ? found.imei1 : finalImei1;
    finalImei2 = (found.imei2 && found.imei2 !== '-') ? found.imei2 : finalImei2;
    finalSerie = found.nSerie || code;
    document.getElementById('qa_marca').value  = found.marca || '';
    document.getElementById('qa_modelo').value = found.modelo || '';
    document.getElementById('qa_color').value  = (found.color && found.color !== '-') ? found.color : '';
    document.getElementById('qa_costo').value  = (found.costo && found.costo !== '-') ? found.costo : '';
    if (found.ubicacion && found.ubicacion !== '-') {
      document.getElementById('qa_area').value = found.ubicacion;
    }
    document.getElementById('qa_categoria').value = 'Teléfonos / Corporativos';
  } else {
    const dev = CURRENT_SCANNED_DEVICE || {};
    if (dev.marca) document.getElementById('qa_marca').value = dev.marca;
    if (dev.modelo) document.getElementById('qa_modelo').value = dev.modelo;
    if (dev.color && dev.color !== '-') document.getElementById('qa_color').value = dev.color;
    if (dev.costo) document.getElementById('qa_costo').value = dev.costo;
    if (dev.nSerie) finalSerie = dev.nSerie;
    if (dev.imei1) finalImei1 = dev.imei1;
    if (dev.imei2) finalImei2 = dev.imei2;
    document.getElementById('qa_categoria').value = dev.categoria || ((finalImei1 || finalImei2) ? 'Teléfonos / Corporativos' : 'Computadoras');
    if (!finalImei1 && /^\d{15}$/.test(code)) finalImei1 = code;
    if (!finalSerie && code) finalSerie = code;
  }

  // Si no hay número de serie asignado aún, sugerir un código estándar o dejar que el usuario asigne
  if (!finalSerie) {
    if (code && !/^\d{15}$/.test(code)) {
      finalSerie = code;
    } else {
      const count = STATE.inventory.filter(r => r.categoria && r.categoria.includes('Teléfono')).length + 1;
      finalSerie = `TLF-${String(count).padStart(5, '0')}`;
    }
  }

  // Mostrar el NÚMERO DE SERIE en el banner superior (no el IMEI para evitar confusión)
  document.getElementById('qa_displayCode').textContent = finalSerie;

  // Asignar a los inputs de la vista
  if (document.getElementById('qa_imei1')) document.getElementById('qa_imei1').value = finalImei1;
  document.getElementById('qa_imei2').value = finalImei2;
  document.getElementById('qa_nSerie').value = finalSerie;

  // Detección de tipo
  const isIMEI = /^\d{15}$/.test(finalImei1 || code);
  const isPCSerie = /^[A-Z0-9]{4,20}$/i.test(code) && /[A-Za-z]/.test(code) && /\d/.test(code);

  const catSelect = document.getElementById('qa_categoria');
  if (!found) {
    if (isIMEI || /TLF|CEL|MOV|PHONE|IMEI/i.test(code) || /^\d{8,16}$/.test(code)) {
      catSelect.value = 'Teléfonos / Corporativos';
    } else if (isPCSerie) {
      catSelect.value = 'Computadoras';
    }
  }

  // Auto-completar marca/modelo por TAC (solo si no viene de found)
  if (!found && !document.getElementById('qa_marca').value && finalImei1) {
    const tac = finalImei1.substring(0, 8);
    if (TAC_CATALOG[tac]) {
      const match = TAC_CATALOG[tac];
      document.getElementById('qa_marca').value = match.marca || '';
      document.getElementById('qa_modelo').value = match.modelo || '';
      document.getElementById('qa_color').value = match.color || '';
      document.getElementById('qa_costo').value = match.costo || 'S/. 197.00';
    } else {
      const prefix = finalImei1.substring(0, 6);
      const similar = STATE.inventory.find(r => r.imei1 && r.imei1.startsWith(prefix) && r.marca);
      if (similar) {
        document.getElementById('qa_marca').value = similar.marca || '';
        document.getElementById('qa_modelo').value = similar.modelo || '';
        document.getElementById('qa_color').value = similar.color || '';
        document.getElementById('qa_costo').value = similar.costo || '';
      }
    }
  }

  document.getElementById('qa_accesorios').value = 'CARGADOR Y PROTECTOR';
  document.getElementById('qa_fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('qa_dniStatus').innerHTML = 'Ingresa el DNI del personal (8 dígitos) para auto-completar sus datos.';
  document.getElementById('qa_dniStatus').style.color = 'var(--text-muted)';

  modal.style.display = 'flex';
  lockBodyScroll();
  setTimeout(() => document.getElementById('qa_dni').focus(), 150);

  // Update side panel in scanner
  document.getElementById('scanResultTitle').textContent = '⚡ Equipo no registrado';
  document.getElementById('scanResultBody').innerHTML = `
    <div class="scan-not-found">
      <div style="font-size:36px;text-align:center;margin-bottom:8px">⚡</div>
      <p style="text-align:center;color:var(--text-muted);font-size:13px;margin-bottom:12px">Código <strong>${esc(code)}</strong> listo para asignación rápida.</p>
      <button class="btn btn-primary" style="width:100%" onclick="openQuickAssignModal('${code.replace(/'/g,"\\'")}')">
        ➕ Asignar y Emitir Responsiva
      </button>
    </div>`;
}

function closeQuickAssignModal(){
  document.getElementById('quickAssignModal').style.display = 'none';
  unlockBodyScroll();
}

/* Manejo inteligente de IMEI 1: si se escribe o escanea, auto-calcula o busca IMEI 2 si existe */
function handleIMEI1Input(val){
  const clean = (val || '').trim();
  const imei2El = document.getElementById('qa_imei2');
  if(!imei2El) return;

  // Si existe en el inventario histórico, auto-completar el IMEI 2 correspondiente y datos técnicos
  const found = findInventoryDevice(clean);
  if(found){
    if(found.imei2 && found.imei2 !== '-' && !imei2El.value) imei2El.value = found.imei2;
    if(found.marca && !document.getElementById('qa_marca').value) document.getElementById('qa_marca').value = found.marca;
    if(found.modelo && !document.getElementById('qa_modelo').value) document.getElementById('qa_modelo').value = found.modelo;
    if(found.color && found.color !== '-' && !document.getElementById('qa_color').value) document.getElementById('qa_color').value = found.color;
    if(found.costo && found.costo !== '-' && !document.getElementById('qa_costo').value) document.getElementById('qa_costo').value = found.costo;
    if(found.ubicacion && found.ubicacion !== '-' && !document.getElementById('qa_area').value) document.getElementById('qa_area').value = found.ubicacion;
    return;
  }

  // Si es un IMEI estándar de 15 dígitos y no tenemos marca, buscar por TAC
  if(/^\d{15}$/.test(clean)){
    const tac = clean.substring(0, 8);
    if(TAC_CATALOG[tac] && !document.getElementById('qa_marca').value){
      const m = TAC_CATALOG[tac];
      document.getElementById('qa_marca').value = m.marca || '';
      document.getElementById('qa_modelo').value = m.modelo || '';
      document.getElementById('qa_color').value = m.color || '';
      document.getElementById('qa_costo').value = m.costo || 'S/. 197.00';
    }
  }
}

/* Escanear segundo IMEI con la cámara sin cerrar el formulario */
function scanSecondIMEI(targetInputId = 'qa_imei2'){
  // Ocultar modal momentáneamente y activar cámara
  const modal = document.getElementById('quickAssignModal');
  modal.style.display = 'none';
  navigateTo('escanear');
  showToast('📷 Escanea ahora el segundo código de barras (IMEI 2)', 'info');

  // Guardar callback temporal para que el próximo escaneo caiga en targetInputId
  window._pendingScanTarget = (scannedCode) => {
    modal.style.display = 'flex';
    const targetEl = document.getElementById(targetInputId);
    if(targetEl) {
      targetEl.value = scannedCode.trim();
      showToast(`✅ IMEI 2 capturado: ${scannedCode}`, 'success');
    }
    window._pendingScanTarget = null;
  };
}

/* Instant DNI lookup for quick assign */
async function handleQuickDNIInput(dni, force = false){
  const clean = dni.replace(/\D/g, '');
  document.getElementById('qa_dni').value = clean;
  const statusEl = document.getElementById('qa_dniStatus');

  if (clean.length !== 8 && !force) {
    statusEl.innerHTML = clean.length > 0 ? `Ingresando DNI (${clean.length}/8 dígitos)...` : 'Escribe el DNI y los datos se llenarán automáticamente.';
    statusEl.style.color = 'var(--text-muted)';
    return;
  }

  if (clean.length !== 8 && force) {
    showToast('⚠️ El DNI debe tener 8 dígitos', 'warning');
    return;
  }

  // 1. Check local inventory cache first!
  const localMatch = STATE.inventory.find(r => r.dni && r.dni.toString().trim() === clean && r.responsable);
  if (localMatch) {
    document.getElementById('qa_responsable').value = localMatch.responsable;
    if (localMatch.area) document.getElementById('qa_area').value = localMatch.area;
    if (localMatch.supervisor) document.getElementById('qa_supervisor').value = localMatch.supervisor;
    if (localMatch.puesto) document.getElementById('qa_puesto').value = localMatch.puesto;
    statusEl.innerHTML = `✅ <strong>${esc(localMatch.responsable)}</strong> (Encontrado en base interna)`;
    statusEl.style.color = '#16a34a';
    showToast(`✅ Colaborador reconocido: ${localMatch.responsable}`, 'success');
    return;
  }

  // 2. Query public RENIEC API
  statusEl.innerHTML = '⏳ Consultando RENIEC en línea...';
  statusEl.style.color = '#2563eb';

  const data = await fetchDNI(clean);
  if (data && (data.nombre || data.nombres)) {
    const fullName = (data.nombre || `${data.nombres||''} ${data.apellidoPaterno||''} ${data.apellidoMaterno||''}`).trim();
    document.getElementById('qa_responsable').value = fullName;
    statusEl.innerHTML = `✅ <strong>${esc(fullName)}</strong> (Datos oficiales RENIEC)`;
    statusEl.style.color = '#16a34a';
    showToast(`✅ DNI validado: ${fullName}`, 'success');
  } else {
    statusEl.innerHTML = '⚠️ No se encontró en RENIEC en línea. Por favor ingresa el nombre manualmente.';
    statusEl.style.color = '#d97706';
  }
}

function saveQuickAssignAndPrint(e){
  e.preventDefault();

  const imei1El = document.getElementById('qa_imei1');
  const imei1 = (imei1El ? imei1El.value : document.getElementById('qa_nSerie').value).trim();
  const nSerie = document.getElementById('qa_nSerie').value.trim() || imei1;
  const resp = document.getElementById('qa_responsable').value.trim();
  const dni = document.getElementById('qa_dni').value.trim();
  const cat = document.getElementById('qa_categoria').value;
  const marca = document.getElementById('qa_marca').value.trim();
  const modelo = document.getElementById('qa_modelo').value.trim();
  const color = document.getElementById('qa_color').value.trim();
  const accesorios = document.getElementById('qa_accesorios').value.trim();
  const costo = document.getElementById('qa_costo').value.trim();
  const supervisor = document.getElementById('qa_supervisor').value.trim();
  const area = document.getElementById('qa_area').value.trim();
  const puesto = document.getElementById('qa_puesto').value.trim();
  const ubicacion = document.getElementById('qa_ubicacion').value.trim() || (area ? `Área ${area}` : 'Oficinas');
  const estado = document.getElementById('qa_estado').value;
  const fecha = document.getElementById('qa_fecha').value || new Date().toISOString().slice(0, 10);
  const imei2 = document.getElementById('qa_imei2').value.trim();

  // Create new item with BOTH IMEIs properly registered
  const newItem = {
    nSerie,
    marca,
    modelo,
    categoria: cat,
    estado,
    ubicacion,
    responsable: resp,
    dni,
    supervisor,
    area,
    puesto,
    imei1,
    imei2: imei2 || '',
    color,
    costo: costo || 'S/. 197.00',
    cargador: accesorios.toUpperCase().includes('CARGADOR') ? 'SI' : 'NO',
    accesorios: accesorios || 'CARGADOR Y PROTECTOR',
    fechaCompra: fecha,
    observaciones: `IMEI 1: ${imei1}${imei2 ? ' | IMEI 2: ' + imei2 : ''} | Resp: ${resp} (DNI ${dni}) | Sup: ${supervisor || '—'} | Accesorios: ${accesorios}`
  };

  const actaOp = CURRENT_SCANNER_OPERATION || 'asignar';
  const accionTipo = (actaOp === 'reasignar') ? 'Reasignación' : 'Asignación';
  newItem._lastAction = accionTipo;
  newItem._lastActionDate = fecha;
  newItem._isModified = true;

  // Si es reasignación o si el colaborador ya tenía otro equipo asignado, retornarlo automáticamente a Stock
  if (dni || resp) {
    STATE.inventory.forEach(item => {
      const isSameDevice = (item.nSerie && item.nSerie.toUpperCase() === nSerie.toUpperCase()) ||
                           (imei1 && item.imei1 && item.imei1 === imei1);
      if (!isSameDevice) {
        const matchDni = dni && item.dni && item.dni.trim() === dni.trim();
        const matchResp = resp && item.responsable && item.responsable.trim().toUpperCase() === resp.trim().toUpperCase();
        if ((matchDni || matchResp) && normalizeEstado(item.estado, item) === 'Asignado') {
          item.estado = 'Stock';
          item.responsable = '';
          item.dni = '';
          item._lastAction = 'Stock';
          item._lastActionDate = fecha;
          item._isModified = true;
          item.observaciones = (item.observaciones ? item.observaciones + ' | ' : '') + `Liberado a Stock por ${accionTipo.toLowerCase()} de nuevo equipo a ${resp} (${fecha})`;
        }
      }
    });
  }

  // Add to inventory (replace if exists by nSerie or IMEI 1 or IMEI 2)
  const existingIdx = STATE.inventory.findIndex(r =>
    (r.nSerie && r.nSerie.toUpperCase() === nSerie.toUpperCase()) ||
    (imei1 && r.imei1 && r.imei1 === imei1) ||
    (imei2 && r.imei2 && r.imei2 === imei2)
  );
  if (existingIdx >= 0) {
    STATE.inventory[existingIdx] = newItem;
  } else {
    STATE.inventory.unshift(newItem);
  }

  // Archive acta and record movement
  const acta = {
    id: Date.now(),
    tipo: accionTipo,
    fecha: newItem.fechaCompra || new Date().toISOString().slice(0, 10),
    colaborador: resp,
    dni,
    equipo: `${marca} ${modelo}`,
    nSerie,
    imei1,
    imei2: imei2 || '',
    oficina: newItem.ubicacion || '—',
    supervisor: supervisor || '—',
  };
  STATE.actasAsignacion.unshift(acta);
  STATE.movements.unshift({
    fecha: acta.fecha,
    operacion: acta.tipo,
    equipo: acta.equipo,
    nSerie,
    responsable: resp,
    oficina: acta.oficina,
    estado: 'Asignado',
  });
  if (STATE.movements.length > 300) STATE.movements = STATE.movements.slice(0, 300);

  refreshAll();
  closeQuickAssignModal();
  showToast(`✅ Equipo ${nSerie} registrado para ${resp}`, 'success');

  // Trigger PDF generation automatically!
  setTimeout(() => {
    printResponsivaPDF(newItem);
  }, 400);
}

/* =====================================================
   VALIDACIÓN DE IDENTIFICACIÓN (ID / CÉDULA)
   ===================================================== */
async function lookupDNI(){
  const dni=document.getElementById('dniInput').value.trim();
  const resultEl=document.getElementById('dniResult');
  if(dni.length!==8){ showToast('⚠️ El DNI debe tener 8 dígitos','warning'); return; }
  resultEl.innerHTML='<div class="dni-loading">⏳ Consultando Registro de Identidad...</div>';
  const data=await fetchDNI(dni);
  if(!data){ resultEl.innerHTML='<div class="dni-error">❌ No se encontraron datos. Verifica el DNI o ingrésalo manualmente.</div>'; return; }
  resultEl.innerHTML=`
    <div class="dni-card-result">
      <div class="dni-avatar">${data.nombres?data.nombres[0]:'?'}</div>
      <div class="dni-details">
        <div class="dni-name">${data.nombres||''} ${data.apellidoPaterno||''} ${data.apellidoMaterno||''}</div>
        <div class="dni-meta">DNI: <strong>${dni}</strong></div>
        ${data.direccion?`<div class="dni-meta">Dirección: ${data.direccion}</div>`:''}
      </div>
      <button class="btn btn-primary btn-sm" onclick="applyDNIToForm('${(data.nombres+' '+data.apellidoPaterno+' '+data.apellidoMaterno).trim().replace(/'/g,"\\'")}','${dni}')">
        ➕ Usar en formulario
      </button>
    </div>`;
}

async function lookupDNIForm(){
  const dni=document.getElementById('f_dni').value.trim();
  if(dni.length!==8){ showToast('⚠️ El DNI debe tener 8 dígitos','warning'); return; }
  showToast('⏳ Consultando DNI...','');
  const data=await fetchDNI(dni);
  if(!data){ showToast('❌ DNI no encontrado. Ingresa el nombre manualmente.','error'); return; }
  const nombre=`${data.nombres||''} ${data.apellidoPaterno||''} ${data.apellidoMaterno||''}`.trim();
  document.getElementById('f_responsable').value=nombre;
  showToast(`✅ ${nombre}`,'success');
}

async function lookupDNIEdit(){
  const dni=document.getElementById('e_dni').value.trim();
  if(dni.length!==8){ showToast('⚠️ El DNI debe tener 8 dígitos','warning'); return; }
  showToast('⏳ Consultando DNI...','');
  const data=await fetchDNI(dni);
  if(!data){ showToast('❌ DNI no encontrado. Ingresa el nombre manualmente.','error'); return; }
  const nombre=`${data.nombres||''} ${data.apellidoPaterno||''} ${data.apellidoMaterno||''}`.trim();
  document.getElementById('e_responsable').value=nombre;
  showToast(`✅ ${nombre}`,'success');
}

async function fetchDNI(dni){
  const endpoints = [
    `/api/dni?numero=${dni}`,
    `/api/id?numero=${dni}`,
  ];
  for(const url of endpoints){
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
      if(res.ok){
        const json = await res.json();
        return {
          nombre:          json.nombre          || '',
          nombres:         json.nombres         || json.name       || '',
          apellidoPaterno: json.apellidoPaterno || json.paternal   || '',
          apellidoMaterno: json.apellidoMaterno || json.maternal   || '',
          direccion:       json.direccion       || json.address    || '',
        };
      }
    } catch(e){ /* continuar con siguiente */ }
  }
  return null;
}

function applyDNIToForm(nombre, dni){
  document.getElementById('f_responsable').value=nombre;
  document.getElementById('f_dni').value=dni;
  navigateTo('agregar');
  showToast('✅ Datos del DNI aplicados al formulario','success');
}

/* =====================================================
   ADD ITEM
   ===================================================== */
function addItem(e){
  e.preventDefault();
  const nSerie=document.getElementById('f_nSerie').value.trim();
  if(STATE.inventory.some(r=>r.nSerie.toUpperCase()===nSerie.toUpperCase())){
    showToast('⚠️ Ya existe un equipo con ese N° de Serie','warning'); return;
  }
  const estVal = document.getElementById('f_estado').value;
  const isAssigned = estVal === 'Asignado';
  const accion = isAssigned ? 'Asignación' : (estVal === 'Broken' ? 'Broken' : 'Stock');
  const fechaHoy = new Date().toISOString().slice(0, 10);

  STATE.inventory.push({
    nSerie, marca:document.getElementById('f_marca').value.trim(),
    modelo:document.getElementById('f_modelo').value.trim(),
    categoria:document.getElementById('f_categoria').value,
    estado:estVal,
    ubicacion:document.getElementById('f_ubicacion').value.trim(),
    dni:document.getElementById('f_dni').value.trim(),
    responsable:document.getElementById('f_responsable').value.trim(),
    fechaCompra:document.getElementById('f_fechaCompra').value || fechaHoy,
    observaciones:document.getElementById('f_observaciones').value.trim(),
    _lastAction: accion,
    _lastActionDate: fechaHoy,
    _isModified: true
  });
  refreshAll(); resetForm();
  showToast('✅ Equipo agregado exitosamente','success');
  navigateTo('inventario');
}

function resetForm(){ document.getElementById('addItemForm').reset(); }

/* =====================================================
   EDIT ITEM
   ===================================================== */
function openEdit(idx){
  const row=STATE.inventory[idx]; if(!row) return;
  STATE.editIndex=idx;
  document.getElementById('e_nSerie').value      =row.nSerie||'';
  document.getElementById('e_marca').value       =row.marca||'';
  document.getElementById('e_modelo').value      =row.modelo||'';
  document.getElementById('e_categoria').value   =row.categoria||'';
  document.getElementById('e_estado').value      =row.estado||'';
  document.getElementById('e_ubicacion').value   =row.ubicacion||'';
  document.getElementById('e_dni').value         =row.dni||'';
  document.getElementById('e_responsable').value =row.responsable||'';
  document.getElementById('e_fechaCompra').value =row.fechaCompra||'';
  document.getElementById('e_observaciones').value=row.observaciones||'';
  document.getElementById('editModal').style.display='flex';
}

function saveEdit(e){
  e.preventDefault(); if(STATE.editIndex<0) return;
  const oldItem = STATE.inventory[STATE.editIndex] || {};
  const estVal = document.getElementById('e_estado').value;
  let accion = oldItem._lastAction || 'Stock';
  if (estVal === 'Asignado' && oldItem.estado !== 'Asignado') accion = 'Asignación';
  else if (estVal === 'Broken') accion = 'Broken';
  else if (estVal === 'Stock') accion = 'Stock';

  STATE.inventory[STATE.editIndex]={
    ...oldItem,
    nSerie:STATE.inventory[STATE.editIndex].nSerie,
    marca:document.getElementById('e_marca').value.trim(),
    modelo:document.getElementById('e_modelo').value.trim(),
    categoria:document.getElementById('e_categoria').value,
    estado:estVal,
    ubicacion:document.getElementById('e_ubicacion').value.trim(),
    dni:document.getElementById('e_dni').value.trim(),
    responsable:document.getElementById('e_responsable').value.trim(),
    fechaCompra:document.getElementById('e_fechaCompra').value,
    observaciones:document.getElementById('e_observaciones').value.trim(),
    _lastAction: accion,
    _lastActionDate: new Date().toISOString().slice(0, 10),
    _isModified: true
  };
  closeModal(); refreshAll(); showToast('✅ Equipo actualizado','success');
}

function deleteItem(idx){
  showConfirm('🗑️ Eliminar equipo',
    `¿Eliminar el equipo <strong>${STATE.inventory[idx]?.nSerie}</strong>?`,
    ()=>{ STATE.inventory.splice(idx,1); refreshAll(); showToast('🗑️ Equipo eliminado','warning'); }
  );
}

function closeModal(){ document.getElementById('editModal').style.display='none'; STATE.editIndex=-1; }
document.addEventListener('click',e=>{ if(e.target.id==='editModal') closeModal(); if(e.target.id==='confirmModal') closeConfirm(); if(e.target.id==='scanModal') closeScanModal(); if(e.target.id==='quickAssignModal') closeQuickAssignModal(); });

/* =====================================================
   FILE IMPORT
   ===================================================== */
function onDragOver(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function onDragLeave(e){e.currentTarget.classList.remove('drag-over');}
function onDrop(e,source){e.preventDefault();e.currentTarget.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)processFile(f,source);}
function loadFile(e,source){const f=e.target.files[0];if(f)processFile(f,source);}

function processFile(file, source) {
  STATE.lastUploadedFileName = file.name;
  const ext = file.name.split('.').pop().toLowerCase();
  const statusEl = document.getElementById(`status${source}`);
  const dropZone = document.getElementById(`dropZone${source}`);

  // Show loading state
  statusEl.innerHTML = `<span class="status-ok" style="display:flex;align-items:center;gap:8px">
    <span style="display:inline-block;width:14px;height:14px;border:2px solid #2563eb;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></span>
    Leyendo <strong>${file.name}</strong>...
  </span>`;
  if (dropZone) dropZone.style.opacity = '0.6';

  const reader = new FileReader();
  reader.onload = e => {
    if (dropZone) dropZone.style.opacity = '1';
    try {
      // ── CSV: single sheet ──────────────────────────────
      if (ext === 'csv') {
        const p = parseCSV(new TextDecoder('utf-8').decode(e.target.result));
        const rows = p.rows.filter(r => Object.values(r).some(v => v !== '' && v != null));
        if (source === 1) { STATE.raw1 = rows; STATE.headers1 = p.headers; }
        else              { STATE.raw2 = rows; STATE.headers2 = p.headers; }
        statusEl.innerHTML = `<span class="status-ok">Archivo listo: <strong>${file.name}</strong> — ${rows.length} registros. Revisa el mapeo de columnas abajo.</span>`;
        showToast(`${rows.length} registros cargados de "${file.name}"`, 'success');
        showMapping(source, p.headers, rows);
        return;
      }

      // ── Excel: puede tener MÚLTIPLES hojas ────────────
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheetNames = wb.SheetNames;

      if (sheetNames.length === 0) throw new Error('El archivo no contiene hojas.');

      // Parse every sheet and count rows
      const sheetsData = sheetNames.map(name => {
        const ws   = wb.Sheets[name];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data || data.length < 2) return { name, headers: [], rows: [], count: 0 };
        const headers = data[0].map(h => String(h).trim()).filter(Boolean);
        if (!headers.length) return { name, headers: [], rows: [], count: 0 };
        const rows = data.slice(1)
          .map(row => { const o = {}; headers.forEach((h, i) => { o[h] = row[i] !== undefined ? String(row[i]).trim() : ''; }); return o; })
          .filter(r => Object.values(r).some(v => v !== '' && v != null));
        return { name, headers, rows, count: rows.length };
      });

      const nonEmpty = sheetsData.filter(s => s.count > 0);
      if (!nonEmpty.length) throw new Error('El archivo está vacío o no tiene datos válidos.');

      const totalRows = nonEmpty.reduce((acc, s) => acc + s.count, 0);
      statusEl.innerHTML = `<span class="status-ok">Archivo listo: <strong>${file.name}</strong> — ${nonEmpty.length} hoja(s), ${totalRows} filas en total</span>`;

      // If only 1 sheet → load directly without selector
      if (nonEmpty.length === 1) {
        const s = nonEmpty[0];
        if (source === 1) { STATE.raw1 = s.rows; STATE.headers1 = s.headers; }
        else              { STATE.raw2 = s.rows; STATE.headers2 = s.headers; }
        showToast(`${s.count} registros de la hoja "${s.name}" — revisa el mapeo abajo`, 'success');
        showMapping(source, s.headers, s.rows);
        return;
      }

      // Multiple sheets → show sheet selector
      showSheetSelector(source, nonEmpty, statusEl);

    } catch (err) {
      if (dropZone) dropZone.style.opacity = '1';
      statusEl.innerHTML = `<span class="status-error">Error al leer el archivo: ${err.message}</span>`;
      showToast('No se pudo leer el archivo: ' + err.message, 'danger');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ── Sheet selector UI ──────────────────────────────── */
function showSheetSelector(source, sheetsData, statusEl) {
  // Remove any existing selector
  const existingId = `sheetSelector${source}`;
  const old = document.getElementById(existingId);
  if (old) old.remove();

  const wrapper = document.createElement('div');
  wrapper.id = existingId;
  wrapper.className = 'sheet-selector-card';
  wrapper.innerHTML = `
    <div class="sheet-selector-header">
      <span class="sheet-selector-title">📑 Selecciona las hojas a importar (Fuente ${source})</span>
      <div class="sheet-selector-actions">
        <button class="btn btn-outline btn-sm" onclick="toggleAllSheets(${source}, true)">Seleccionar todo</button>
        <button class="btn btn-outline btn-sm" onclick="toggleAllSheets(${source}, false)">Ninguna</button>
      </div>
    </div>
    <div class="sheet-list" id="sheetList${source}">
      ${sheetsData.map((s, i) => `
        <label class="sheet-item">
          <input type="checkbox" class="sheet-cb-${source}" data-idx="${i}" checked />
          <span class="sheet-name">${esc(s.name)}</span>
          <span class="sheet-count">${s.count} filas</span>
        </label>`).join('')}
    </div>
    <button class="btn btn-primary" style="margin:12px 0 4px" onclick="confirmSheetSelection(${source})">
      ✅ Importar hojas seleccionadas
    </button>`;

  // Store sheets data on the element for later retrieval
  wrapper._sheetsData = sheetsData;

  // Insert after the status element
  statusEl.parentNode.insertBefore(wrapper, statusEl.nextSibling);

  // Scroll into view
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleAllSheets(source, check) {
  document.querySelectorAll(`.sheet-cb-${source}`).forEach(cb => cb.checked = check);
}

function confirmSheetSelection(source) {
  const wrapper = document.getElementById(`sheetSelector${source}`);
  if (!wrapper) return;
  const sheetsData = wrapper._sheetsData;

  const checked = [...document.querySelectorAll(`.sheet-cb-${source}`)].filter(cb => cb.checked);
  if (!checked.length) { showToast('⚠️ Selecciona al menos una hoja', 'warning'); return; }

  // Merge rows from all selected sheets
  // Collect all unique headers across selected sheets
  const selectedSheets = checked.map(cb => sheetsData[parseInt(cb.dataset.idx)]);
  const allHeaders = [...new Set(selectedSheets.flatMap(s => s.headers))];

  // Combine all rows from selected sheets
  const allRows = selectedSheets.flatMap(s => {
    return s.rows.map(row => {
      const merged = {};
      allHeaders.forEach(h => { merged[h] = row[h] !== undefined ? row[h] : ''; });
      merged['__sheet__'] = s.name;
      return merged;
    });
  }).filter(r => Object.values(r).some(v => v !== '' && v != null && v !== r['__sheet__']));

  const statusEl = document.getElementById(`status${source}`);
  const selectedNames = selectedSheets.map(s => s.name).join(', ');
  if (statusEl) statusEl.innerHTML = `<span class="status-ok">✅ ${allRows.length} registros de: <em>${selectedNames}</em></span>`;
  showToast(`Fuente ${source}: ${allRows.length} registros de ${selectedSheets.length} hojas`, 'success');

  // Check if we can parse intelligently (has corporate/phones, pcs, appliances, etc.)
  const hasKnownSheets = selectedSheets.some(s => {
    const n = (s.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return n.includes('CORPORATIVO') || n.includes('COOPORATIVO') || n.includes('TELEFONO') || 
           n.includes('CELULAR') || n.includes('MOVIL') || n.includes('ELECTRODOMESTICO') || 
           n.includes('MOBILIARIO') || n.includes('PC') || n.includes('LAPTOP') || 
           n.includes('COMPUTADOR') || (s.rows && s.rows.some(r => r['N° de Serie'] || r['Serie']));
  });

  if (hasKnownSheets) {
    const intelligentItems = parseSelectedSheetsIntelligently(selectedSheets);
    if (intelligentItems.length > 0) {
      if (source === 1) STATE.raw1 = intelligentItems;
      else              STATE.raw2 = intelligentItems;

      wrapper.remove();
      const statusEl = document.getElementById(`status${source}`);
      statusEl.innerHTML = `<span class="status-ok">${intelligentItems.length} equipos clasificados de: <em>${selectedNames}</em> — cargando al dashboard...</span>`;
      showToast(`${intelligentItems.length} equipos procesados con éxito`, 'success');

      const t1 = STATE.raw1.length, t2 = STATE.raw2.length;
      if (t1 > 0 && t2 > 0) showMergePreview();
      else {
        finalizeData(t2 > 0 ? STATE.raw2 : STATE.raw1);
      }
      return;
    }
  }

  wrapper.remove();
  showMapping(source, allHeaders, allRows);
}

function parseSelectedSheetsIntelligently(selectedSheets) {
  const allItems = [];

  selectedSheets.forEach(s => {
    const cleanName = s.name.trim();
    const normName = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (normName.includes('TABLA DINAMICA') || normName === 'RESUMEN') return;

    s.rows.forEach((row, idx) => {
      const hasContent = Object.values(row).some(v => v !== '' && v != null && v !== s.name);
      if (!hasContent) return;

      let item = null;

      // 0. FORMATO PRE-ESTRUCTURADO (EXPORTACIONES O HOJAS NORMALIZADAS)
      if (row['N° de Serie'] && (row['Marca'] || row['Modelo'] || row['Categoría'])) {
        const nSerie = String(row['N° de Serie']).trim();
        if (nSerie && nSerie !== 'N/A') {
          const resp = String(row['Responsable'] || '').trim();
          const dni = String(row['DNI'] || '').trim();
          const ubi = String(row['Ubicación'] || '').trim();
          const est = String(row['Estado'] || '').trim();
          item = {
            nSerie,
            marca: String(row['Marca'] || '-').trim(),
            modelo: String(row['Modelo'] || '-').trim(),
            categoria: String(row['Categoría'] || cleanName).trim(),
            estado: normalizeEstado(est, { responsable: resp, dni, ubicacion: ubi }),
            ubicacion: ubi || '-',
            responsable: resp || '-',
            dni: dni || '-',
            fechaCompra: formatDateStr(row['Fecha de Compra'] || '') || '-',
            observaciones: String(row['Observaciones'] || '-').trim()
          };
          allItems.push(item);
          return;
        }
      }

      // 1. CORPORATIVOS (TELEFONOS / CELULARES)
      if (normName.includes('CORPORATIVO') || normName.includes('COOPORATIVO') || normName.includes('TELEFONO') || normName.includes('CELULAR') || normName.includes('MOVIL')) {
        if (row['CODIGO'] === 'CODIGO' || row['MARCA'] === 'MARCA') return;
        const nSerie = String(row['CODIGO'] || row['IMEI 1'] || row['IMEI 2'] || row['SERIE'] || `TLF-${String(idx+1).padStart(4,'0')}`).trim();
        if (!nSerie || nSerie === '-') return;

        const marca = String(row['MARCA'] || '').trim();
        const color = String(row['COLOR'] || '').trim();
        const modelo = String(row['MODELO'] || (color ? `Color: ${color}` : '') || 'Teléfono Móvil').trim();
        const resp = String(row['APELLIDOS Y NOMBRES (usuario)'] || row['RESPONSIVA'] || row['USUARIO'] || '').trim();
        const dni = String(row['DNI'] || '').trim();
        const area = String(row['AREA'] || '').trim();
        const oficina = String(row['OFICINA'] || '').trim();
        const estadoRaw = String(row['ESTADO'] || row['SITUACION'] || 'Operativo').trim();
        const fecha = String(row['FECHA DE COMPRA'] || '').trim();
        const imei1 = row['IMEI 1'] ? `IMEI 1: ${row['IMEI 1']}` : '';
        const imei2 = row['IMEI 2'] ? `IMEI 2: ${row['IMEI 2']}` : '';
        const cargador = row['CARGADOR'] ? `Cargador: ${row['CARGADOR']}` : '';
        const obs = [imei1, imei2, cargador, row['SUPERVISOR'] ? `Sup: ${row['SUPERVISOR']}` : '', row['COSTO'] ? `Costo: ${row['COSTO']}` : ''].filter(Boolean).join(' | ');

        item = {
          nSerie,
          marca: marca || '-',
          modelo: modelo || '-',
          categoria: 'Teléfonos móviles',
          estado: normalizeEstado(estadoRaw, { responsable: resp, dni: dni, area: area, oficina: oficina }),
          ubicacion: oficina ? `Oficina ${oficina}${area ? ` - ${area}` : ''}` : (area || '-'),
          responsable: resp || '-',
          dni: dni || '-',
          fechaCompra: formatDateStr(fecha) || '-',
          observaciones: obs || '-'
        };
      }

      // 2. ELECTRODOMESTICOS
      else if (normName.includes('ELECTRODOMESTICO')) {
        const art = String(row['ARTICULO'] || row['DESCRIPCION'] || '').trim();
        if (!art || art.toUpperCase() === 'ARTICULO') return;

        let cat = 'Electrodomésticos';
        const artUpper = art.toUpperCase();
        if (artUpper.includes('MICROONDA')) cat = 'Microondas';
        else if (artUpper.includes('HERVIDOR') || artUpper.includes('CAFETERA')) cat = 'Cafeteras';
        else if (artUpper.includes('REFRIGERADOR') || artUpper.includes('FRIGIDAR')) cat = 'Refrigeradoras';
        else if (artUpper.includes('AIRE') || artUpper.includes('VENTILADOR')) cat = 'Aires acondicionados';
        else if (artUpper.includes('DISPENSADOR')) cat = 'Dispensadores de agua';

        const ofi = String(row['OFICINA'] || '').trim();
        const nSerie = String(row['SERIE'] || row['CODIGO'] || `ELEC-${ofi || '111'}-${String(idx+1).padStart(3,'0')}`).trim();
        const marca = String(row['MARCA'] || '').trim();
        const modelo = String(row['MODELO'] || art).trim();
        const estadoRaw = String(row['ESTADO'] || 'Operativo').trim();

        item = {
          nSerie,
          marca: marca || 'Sin marca',
          modelo: modelo || art,
          categoria: cat,
          estado: normalizeEstado(estadoRaw),
          ubicacion: ofi ? `Oficina ${ofi}` : 'Oficina General',
          responsable: '',
          dni: '',
          fechaCompra: '',
          observaciones: `Artículo: ${art}${row['CANTIDAD'] ? ` | Cant: ${row['CANTIDAD']}` : ''}`
        };
      }

      // 3. MOBILIARIO
      else if (normName.includes('MOBILIARIO') || normName.includes('MUEBLE')) {
        const desc = String(row['DESCRIPCION'] || row['ARTICULO'] || '').trim();
        if (!desc || desc.toUpperCase() === 'DESCRIPCION') return;

        let cat = 'Muebles y Equipamiento';
        const descUpper = desc.toUpperCase();
        if (descUpper.includes('SILLA')) cat = 'Sillas';
        else if (descUpper.includes('ESCRITORIO') || descUpper.includes('MESA')) cat = 'Escritorios';
        else if (descUpper.includes('ARCHIVADOR') || descUpper.includes('ESTANTE')) cat = 'Archivadores/Estantes';
        else if (descUpper.includes('PIZARRA')) cat = 'Pizarras/Pantallas';

        const ofi = String(row['OFICINA'] || '').trim();
        const area = String(row['AREA'] || '').trim();
        const nSerie = String(row['SERIE'] || row['CODIGO'] || `MOB-${ofi || '111'}-${String(idx+1).padStart(3,'0')}`).trim();

        item = {
          nSerie,
          marca: 'Mobiliario',
          modelo: desc,
          categoria: cat,
          estado: 'Operativo',
          ubicacion: ofi ? `Oficina ${ofi}${area ? ` - ${area}` : ''}` : (area || 'Almacén'),
          responsable: '',
          dni: '',
          fechaCompra: formatDateStr(row['FECHA DE REVISION']),
          observaciones: `Cant: ${row['CANTIDAD'] || 1}${row['OBSERVACION'] ? ` | Obs: ${row['OBSERVACION']}` : ''}`
        };
      }

      // 4. COMPUTADORAS, LAPTOPS, ALMACEN PC
      else if (normName.includes('PC') || normName.includes('LAPTOP') || normName.includes('COMPUTADOR')) {
        const marca = String(row['MARCA'] || '').trim();
        const modelo = String(row['MODELO'] || '').trim();
        const serieRaw = String(row['SERIE'] || row['CODIGO'] || '').trim();
        if (serieRaw.toUpperCase() === 'SERIE' || marca.toUpperCase() === 'MARCA') return;
        if (!marca && !modelo && (!serieRaw || serieRaw === '-')) return;

        const nSerie = (serieRaw && serieRaw !== '-') ? serieRaw : `PC-${String(idx+1).padStart(4,'0')}`;
        let tipo = String(row['TIPO'] || '').trim().toUpperCase();
        let cat = 'Computadoras de escritorio';
        if (tipo.includes('LAPTOP')) cat = 'Laptops';
        else if (tipo.includes('ALL IN ONE') || tipo.includes('AIO') || tipo.includes('DESKTOP')) cat = 'Computadoras de escritorio';
        else if (tipo.includes('MONITOR')) cat = 'Monitores';
        else if (normName.includes('LAPTOP')) cat = 'Laptops';

        const resp = String(row['APELLIDOS Y NOMBRES (usuario)'] || row['USUARIO'] || row['RESPONSABLE'] || '').trim();
        const dni = String(row['DNI'] || '').trim();
        const area = String(row['AREA'] || '').trim();
        const ofi = String(row['OFICINA'] || '').trim();
        const estadoRaw = String(row['ESTADO'] || row['SITUACION'] || 'Operativo').trim();

        const obsList = [
          row['OBSERVACION 1'], row['OBSERVACION 2'], row['OBSERVACION 3'],
          row['SUPERVISOR'] ? `Sup: ${row['SUPERVISOR']}` : '',
          row['COSTO '] || row['COSTO'] ? `Costo: ${row['COSTO '] || row['COSTO']}` : '',
          tipo ? `Tipo: ${tipo}` : ''
        ].filter(v => v && String(v).trim());

        item = {
          nSerie,
          marca: (marca && marca !== '-') ? marca : '-',
          modelo: (modelo && modelo !== '-') ? modelo : '-',
          categoria: cat,
          estado: normalizeEstado(estadoRaw, { responsable: resp, dni: dni, area: area, ofi: ofi }),
          ubicacion: ofi ? `Oficina ${ofi}${area ? ` - ${area}` : ''}` : (area || '-'),
          responsable: resp || '-',
          dni: dni || '-',
          fechaCompra: formatDateStr(row['W'] || row['FECHA'] || row['FECHA DE COMPRA']) || '-',
          observaciones: obsList.join(' | ') || '-'
        };
      }

      // 5. CUALQUIER OTRA HOJA
      else {
        const nSerie = String(row['CODIGO'] || row['SERIE'] || row['ID'] || `EQ-${cleanName.substring(0,4)}-${idx+1}`).trim();
        const marca = String(row['MARCA'] || '').trim();
        const modelo = String(row['MODELO'] || row['DESCRIPCION'] || row['ARTICULO'] || '').trim();
        if (!marca && !modelo) return;

        const respOther = String(row['APELLIDOS Y NOMBRES (usuario)'] || row['RESPONSABLE'] || row['USUARIO'] || '').trim();
        const dniOther = String(row['DNI'] || '').trim();
        const ubiOther = String(row['OFICINA'] || row['UBICACION'] || row['AREA'] || '').trim();
        const estOther = String(row['ESTADO'] || '').trim();

        item = {
          nSerie,
          marca: marca || 'Genérica',
          modelo: modelo || cleanName,
          categoria: cleanName,
          estado: normalizeEstado(estOther, { responsable: respOther, dni: dniOther, ubicacion: ubiOther }),
          ubicacion: ubiOther,
          responsable: respOther,
          dni: dniOther,
          fechaCompra: '',
          observaciones: `Hoja: ${cleanName}`
        };
      }

      if (item) allItems.push(item);
    });
  });

  return allItems;
}

function formatDateStr(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const p0 = parts[0].padStart(2, '0');
      const p1 = parts[1].padStart(2, '0');
      const p2 = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${p2}-${p1}-${p0}`;
    }
  }
  return str;
}

function parseCSV(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  const delim=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
  const headers=splitCSVLine(lines[0],delim);
  const rows=lines.slice(1).map(line=>{const v=splitCSVLine(line,delim);const o={};headers.forEach((h,i)=>{o[h]=(v[i]||'').trim();});return o;});
  return{headers,rows};
}

function splitCSVLine(line,delim){
  const result=[];let current='',inQ=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"')inQ=!inQ;else if(ch===delim&&!inQ){result.push(current);current='';}else current+=ch;}
  result.push(current);return result;
}

/* =====================================================
   COLUMN MAPPING
   ===================================================== */
function showMapping(source, headers, rows) {
  STATE.mappingSource = source;
  STATE.pendingMapping = { source, headers, rows };
  const card = document.getElementById('mappingCard');
  const grid = document.getElementById('mappingGrid');
  const mergeCard = document.getElementById('mergeCard');
  card.style.display = 'block';
  mergeCard.style.display = 'none';

  // If rows have __sheet__, add it as a selectable header (labelled clearly)
  const hasSheetTag = rows.some(r => r['__sheet__']);
  const displayHeaders = hasSheetTag
    ? ['__sheet__ → Nombre de la Hoja (usar como Categoría)', ...headers]
    : headers;
  const internalHeaders = hasSheetTag
    ? ['__sheet__', ...headers]
    : headers;

  const autoMap = {};
  FIELDS.forEach(f => {
    const match = internalHeaders.find(h => {
      const hl = h.toLowerCase().replace(/[°\s_\-]/g, '');
      const fk = f.key.toLowerCase();
      const fl = f.label.toLowerCase().replace(/[°\s_\-]/g, '');
      return hl === fl || hl === fk || hl.includes(fk) || fk.includes(hl) ||
        (f.key === 'nSerie'        && (hl.includes('serie') || hl.includes('serial') || hl.includes('codigo'))) ||
        (f.key === 'marca'         && (hl === 'marca' || hl === 'brand')) ||
        (f.key === 'modelo'        && (hl === 'modelo' || hl === 'model')) ||
        (f.key === 'categoria'     && (hl.includes('categ') || hl.includes('tipo') || hl.includes('sheet'))) ||
        (f.key === 'estado'        && (hl === 'estado' || hl === 'status' || hl.includes('condicion') || hl.includes('situacion'))) ||
        (f.key === 'ubicacion'     && (hl.includes('ubica') || hl.includes('sede') || hl.includes('oficina') || hl.includes('lugar'))) ||
        (f.key === 'responsable'   && (hl.includes('respons') || hl.includes('usuario') || hl.includes('asignado') || hl.includes('persona'))) ||
        (f.key === 'dni'           && (hl === 'dni' || hl.includes('documento') || hl.includes('cedula'))) ||
        (f.key === 'fechaCompra'   && (hl.includes('fecha') || hl.includes('compra') || hl.includes('adqui') || hl.includes('ingreso'))) ||
        (f.key === 'observaciones' && (hl.includes('observ') || hl.includes('nota') || hl.includes('comment') || hl.includes('detalle')));
    });
    autoMap[f.key] = match || '';
  });

  // Auto-assign sheet name to Categoría if no category column was found
  if (!autoMap['categoria'] && hasSheetTag) {
    autoMap['categoria'] = '__sheet__';
  }

  grid.innerHTML = FIELDS.map(f => `
    <div class="mapping-item">
      <label>${f.required ? '* ' : ''}${f.label}</label>
      <select id="map_${f.key}">
        <option value="">— No mapear —</option>
        ${internalHeaders.map((h, i) => {
          const label = displayHeaders[i];
          const sel = autoMap[f.key] === h ? 'selected' : '';
          return `<option value="${esc(h)}" ${sel}>${esc(label)}</option>`;
        }).join('')}
      </select>
    </div>`).join('');

  // Show a hint if sheet name is being used as category
  if (hasSheetTag) {
    const hint = document.createElement('div');
    hint.className = 'mapping-hint';
    hint.innerHTML = `💡 <strong>Truco:</strong> El campo <em>"Nombre de la Hoja"</em> está asignado a <strong>Categoría</strong> automáticamente. Cada hoja del Excel (Teléfonos, Electrodomésticos, Cámaras…) se convertirá en una categoría. Puedes cambiarlo si prefieres.`;
    grid.prepend(hint);
  }
}

function applyMapping(){
  if(!STATE.pendingMapping) return;
  const { source, rows } = STATE.pendingMapping;

  // Collect selected column mappings
  const mapping = {};
  FIELDS.forEach(f => {
    const sel = document.getElementById(`map_${f.key}`);
    if (sel) mapping[f.key] = sel.value;
  });

  // Track counts per sheet for the summary
  const sheetCounts = {};
  let autoSerieCount = 0;

  const normalized = rows.map((row, idx) => {
    const obj = {};
    FIELDS.forEach(f => {
      obj[f.key] = mapping[f.key] ? (row[mapping[f.key]] || '').toString().trim() : '';
    });

    // ── Auto-generate N° Serie if missing ─────────────
    // This is the KEY fix: phones/appliances/furniture often don't
    // have a serial number column, so we generate one automatically.
    if (!obj.nSerie) {
      const sheetTag = (row['__sheet__'] || 'EQ')
        .substring(0, 10)
        .replace(/\s+/g, '-')
        .replace(/[^A-Za-z0-9\-áéíóúÁÉÍÓÚñÑ]/g, '')
        .toUpperCase() || 'EQ';
      obj.nSerie = `${sheetTag}-${String(idx + 1).padStart(4, '0')}`;
      autoSerieCount++;
    }

    // ── Auto-fill Categoría from sheet name if blank ──
    if (!obj.categoria && row['__sheet__']) {
      obj.categoria = row['__sheet__'];
    }

    // ── Estado Inteligente ────────────────────────────
    obj.estado = normalizeEstado(obj.estado || '', obj);

    // Track per-sheet
    const sheet = row['__sheet__'] || obj.categoria || 'General';
    sheetCounts[sheet] = (sheetCounts[sheet] || 0) + 1;

    return obj;
  });

  // Only skip rows that are completely empty (no data at all)
  const valid = normalized.filter(r =>
    r.nSerie && Object.entries(r).some(([k, v]) => k !== 'nSerie' && v !== '')
  );

  if (source === 1) STATE.raw1 = valid;
  else              STATE.raw2 = valid;

  document.getElementById('mappingCard').style.display = 'none';

  // Show import summary
  const summaryLines = Object.entries(sheetCounts)
    .map(([sheet, count]) => `<span class="sheet-summary-item"><strong>${count}</strong> ${esc(sheet)}</span>`)
    .join('');

  const summaryEl = document.getElementById(`status${source}`);
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="import-summary">
        <span class="import-summary-total">${valid.length} equipos procesados${autoSerieCount > 0 ? ` (${autoSerieCount} con serie auto-generada)` : ''} — cargando al dashboard...</span>
        <div class="import-summary-sheets">${summaryLines}</div>
      </div>`;
  }

  if (autoSerieCount > 0) {
    showToast(`${valid.length} equipos cargados — ${autoSerieCount} con N° Serie auto-generado`, 'success');
  } else {
    showToast(`${valid.length} equipos procesados correctamente`, 'success');
  }

  const t1 = STATE.raw1.length, t2 = STATE.raw2.length;
  if (t1 > 0 && t2 > 0) showMergePreview();
  else {
    const data = t2 > 0 ? STATE.raw2 : STATE.raw1;
    finalizeData(data);
  }
}

function showMergePreview(){
  const{unique,dupes}=mergeData(STATE.raw1,STATE.raw2);
  document.getElementById('mergeTotal1').textContent=STATE.raw1.length;
  document.getElementById('mergeTotal2').textContent=STATE.raw2.length;
  document.getElementById('mergeFinal').textContent=unique.length;
  document.getElementById('mergeDupes').textContent=dupes;
  document.getElementById('mergeCard').style.display='block';
}

function mergeAndLoad(){
  const{unique,dupes}=mergeData(STATE.raw1,STATE.raw2);
  STATE.duplicatesRemoved=dupes;
  document.getElementById('mergeCard').style.display='none';
  if (dupes > 0) showToast(`${unique.length} registros únicos — ${dupes} duplicados eliminados`, 'info');
  finalizeData(unique);
}

function mergeData(raw1,raw2){
  const map=new Map(); let dupes=0;
  raw1.forEach(row=>{if(row.nSerie) map.set(row.nSerie.toUpperCase(),row);});
  raw2.forEach(row=>{if(row.nSerie){if(map.has(row.nSerie.toUpperCase())) dupes++;map.set(row.nSerie.toUpperCase(),row);}});
  return{unique:[...map.values()],dupes};
}

function finalizeData(data){
  data.forEach(item => {
    item.estado = normalizeEstado(item.estado, item);
  });
  const newSourceId = 'src-file-' + Date.now();
  data.forEach(item => { item._sourceId = newSourceId; });

  STATE.inventory = data;
  STATE.filtered = [...data];
  STATE.isClearedByUser = false;
  const srcName = STATE.lastUploadedFileName || 'Archivo Excel Cargado';

  STATE.loadedSources = [{
    id: newSourceId,
    name: srcName,
    type: 'Archivo Excel',
    date: new Date().toLocaleDateString('es-PE'),
    count: data.length,
    isDefault: false
  }];

  renderLoadedSourcesTable();
  refreshAll();
  showToast(`${data.length} equipos cargados correctamente desde "${srcName}". Revisando Panel General...`, 'success');
  setTimeout(() => navigateTo('dashboard'), 800);
}

/* =====================================================
   EXPORT EXCEL
   ===================================================== */
function exportToExcel(){
  if(!STATE.filtered.length){showToast('No hay datos','warning');return;}
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(STATE.filtered.map(mapForExport)),'Inventario Completo');
  const cats=[...new Set(STATE.inventory.map(r=>r.categoria).filter(Boolean))];
  cats.forEach(cat=>{
    const d=STATE.inventory.filter(r=>r.categoria===cat).map(mapForExport);
    if(d.length) XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(d),cat.substring(0,31));
  });
  XLSX.writeFile(wb,`Inventario_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('✅ Excel exportado','success');
}

function exportCategoryExcel(){
  const catData=STATE.activeCategory==='all'?STATE.inventory:STATE.inventory.filter(r=>r.categoria===STATE.activeCategory);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(catData.map(mapForExport)),STATE.activeCategory||'Inventario');
  XLSX.writeFile(wb,`Inventario_${(STATE.activeCategory||'todos').replace(/\//g,'-')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('✅ Excel exportado','success');
}

function mapForExport(row){
  return {
    'N° de Serie': row.nSerie || row.imei1 || '',
    'IMEI 1': row.imei1 || '',
    'IMEI 2': row.imei2 || '',
    'Marca': row.marca || '',
    'Modelo': row.modelo || '',
    'Categoría': row.categoria || '',
    'Estado': row.estado || '',
    'Ubicación': row.ubicacion || '',
    'DNI': row.dni || '',
    'Responsable': row.responsable || '',
    'Fecha de Compra': row.fechaCompra || '',
    'Tipo de Acción': row._lastAction || '',
    'Registro': row._isModified ? 'NUEVO' : '',
    'Fecha Acción': row._lastActionDate || '',
    'Observaciones': row.observaciones || ''
  };
}

/* =====================================================
   EXPORT PDF
   ===================================================== */
function exportToPDF(){
  if(!STATE.filtered.length){showToast('No hay datos','warning');return;}
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  doc.setFillColor(37,99,235); doc.rect(0,0,297,20,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text('INVENTARIO DE EQUIPOS – InvControl',14,13);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}  |  Total: ${STATE.filtered.length} registros`,160,13);
  doc.autoTable({
    startY:24,
    head:[['N° Serie','Marca','Modelo','Categoría','Estado','Ubicación','Responsable','DNI','F. Compra']],
    body:STATE.filtered.map(r=>[r.nSerie,r.marca,r.modelo,r.categoria,r.estado,r.ubicacion,r.responsable,r.dni,r.fechaCompra]),
    styles:{fontSize:7.5,cellPadding:2},
    headStyles:{fillColor:[15,23,42],textColor:255,fontStyle:'bold'},
    alternateRowStyles:{fillColor:[239,246,255]},
    didDrawPage:h=>{doc.setFontSize(8);doc.setTextColor(150);doc.text(`Pág. ${h.pageNumber}`,14,doc.internal.pageSize.height-6);}
  });
  doc.save(`Inventario_${new Date().toISOString().slice(0,10)}.pdf`);
  showToast('✅ PDF generado','success');
}

function exportCategoryPDF(){
  const tmp=STATE.filtered;
  STATE.filtered=STATE.activeCategory==='all'?STATE.inventory:STATE.inventory.filter(r=>r.categoria===STATE.activeCategory);
  exportToPDF(); STATE.filtered=tmp;
}

/* =====================================================
   PRINT RESPONSIVA PDF (Formato Oficial RESP.CELULAR 2026)
   ===================================================== */
function printResponsivaPDF(item) {
  if (!item) { showToast('⚠️ Equipo no seleccionado', 'warning'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const isPhone = (item.categoria === 'Teléfonos móviles');
  const primaryTitle = isPhone ? 'ACTA DE ENTREGA DE EQUIPO TELEFÓNICO CORPORATIVO' : 'ACTA DE ENTREGA Y ASIGNACIÓN DE EQUIPO';
  const serieOrImei = item.imei1 || item.nSerie || '—';
  const imei2 = item.imei2 || '—';
  const resp = item.responsable || 'NO ASIGNADO';
  const dni = item.dni || '—';
  const area = item.area || item.ubicacion || 'OPERACIONES';
  const supervisor = item.supervisor || 'SUPERVISOR DIRECTO';
  const puesto = item.puesto || (isPhone ? 'ASESOR / COLABORADOR' : 'ASIST. OPERACIONES');
  const fecha = item.fechaCompra || new Date().toISOString().slice(0, 10);
  const marca = item.marca || '—';
  const modelo = item.modelo || '—';
  const costo = item.costo || 'S/. 197.00';
  const accesorios = item.accesorios || (item.cargador === 'SI' ? 'CARGADOR Y PROTECTOR' : 'EQUIPO COMPLETO');
  const color = (item.color && item.color !== '-') ? item.color : '—';

  // ── Header Corporativo ───────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate dark 900
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(primaryTitle, 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`CONTROL PATRIMONIAL Y ASIGNACIÓN 2026  |  CÓDIGO: ${item.nSerie}`, 14, 17);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE')}`, 160, 17);

  let y = 28;

  // ── Sección 1: DATOS DEL COLABORADOR RECEPTOR ──────
  doc.setFillColor(37, 99, 235);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS DEL COLABORADOR RECEPTOR:', 16, y + 4.5);

  y += 6;
  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    head: [],
    body: [
      [
        { content: 'NOMBRE:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 35 } },
        { content: resp, styles: { fontStyle: 'bold', width: 65 } },
        { content: 'SUPERVISOR:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 35 } },
        { content: supervisor, styles: { width: 47 } }
      ],
      [
        { content: 'DNI:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: dni, styles: { fontStyle: 'bold' } },
        { content: 'PUESTO:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: puesto }
      ],
      [
        { content: 'ÁREA:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: area },
        { content: 'FECHA ENTREGA:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: fecha }
      ]
    ]
  });

  y = doc.lastAutoTable.finalY + 4;

  // ── Sección 2: INFORMACIÓN Y CARACTERÍSTICAS DEL EQUIPO ──
  doc.setFillColor(37, 99, 235);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INFORMACIÓN Y CARACTERÍSTICAS DEL EQUIPO ASIGNADO:', 16, y + 4.5);

  y += 6;
  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    head: [],
    body: [
      [
        { content: 'MARCA:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 35 } },
        { content: marca, styles: { width: 40 } },
        { content: 'MODELO:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 30 } },
        { content: modelo, styles: { width: 42 } },
        { content: 'COSTO:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 20 } },
        { content: costo, styles: { width: 15 } }
      ],
      [
        { content: isPhone ? 'IMEI 1:' : 'N° DE SERIE:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: serieOrImei, styles: { fontStyle: 'bold' } },
        { content: isPhone ? 'IMEI 2:' : 'COLOR:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: isPhone ? imei2 : color },
        { content: 'ESTADO:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: item.estado || 'OPERATIVO' }
      ],
      [
        { content: 'ACCESORIOS:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: accesorios, colSpan: 3 },
        { content: 'COLOR:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: color }
      ]
    ]
  });

  y = doc.lastAutoTable.finalY + 4;

  // ── Sección 3: DECLARACIÓN DE RESPONSABILIDAD ──────
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DECLARACIÓN DE RESPONSABILIDAD Y POLÍTICAS DE USO:', 16, y + 4);

  y += 7.5;
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const declText = 'Por medio de la presente, declaro haber recibido a conformidad el equipo detallado en este documento, comprometiéndome a darle un uso adecuado y exclusivamente para fines laborales. Asimismo, asumo plena responsabilidad sobre la custodia y conservación del mismo, aceptando que, en caso de pérdida, daño o extravío por causas imputables a mi persona, me someto a las acciones correctivas y/o penalidades establecidas por la empresa según sus políticas internas.';
  const splitDecl = doc.splitTextToSize(declText, 182);
  doc.text(splitDecl, 14, y);
  y += splitDecl.length * 3.4 + 2;

  // Políticas Oficiales de RESP.CELULAR 2026 PRINCIPAL
  const clausulas = [
    '1. Queda estrictamente prohibido el acceso a páginas o aplicaciones de ocio que consuman ancho de banda y no estén relacionadas con funciones laborales (redes sociales, música, juegos, streaming).',
    '2. En caso de daño, pérdida o extravío del equipo, notificar de inmediato a RRHH o Administración. El costo será asumido por el responsable y podrá aplicarse el descuento correspondiente vía nómina.',
    '3. En situaciones de asalto o robo, notificar de inmediato a Administración o RRHH y presentar la denuncia ante las autoridades policiales.',
    '4. Queda prohibida la extracción, copia o transferencia no autorizada de información confidencial del equipo asignado.',
    '5. Únicamente para el área de Reclutamiento o autorizadas, se permite el uso del equipo en el domicilio del colaborador bajo su total custodia.',
    '6. Todo incidente con el equipo debe ser reportado a Tecnologías de la Información (TI). El equipo es propiedad exclusiva de la empresa.',
    '7. Queda prohibido configurar contraseñas personales o bloquear el equipo sin autorización, para garantizar el control técnico.',
    '8. Plazo de entrega al cese laboral: Máximo 24 horas para la devolución total de los equipos, cargadores y accesorios asignados.'
  ];

  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  clausulas.forEach(c => {
    const lines = doc.splitTextToSize(c, 182);
    doc.text(lines, 14, y);
    y += lines.length * 3.1 + 0.8;
  });

  if (item.observaciones) {
    y += 1;
    doc.setFont('helvetica', 'italic');
    doc.text(`Observaciones adicionales: ${item.observaciones.substring(0, 140)}`, 14, y);
    y += 4;
  }

  // ── Sección 4: FIRMAS DE CONFORMIDAD ──────────────
  const signY = Math.max(y + 8, 252);

  // Firma 1: RECEPTOR
  doc.setDrawColor(100, 116, 139);
  doc.line(16, signY, 68, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('FIRMA DEL RECEPTOR', 25, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(resp.substring(0, 32), 16, signY + 8);
  doc.text(`DNI: ${dni}`, 16, signY + 11.5);

  // Firma 2: CONFORMIDAD TI / SUPERVISOR
  doc.line(78, signY, 130, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CONFORMIDAD TI / SUPERVISOR', 83, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(supervisor.substring(0, 32), 78, signY + 8);
  doc.text('Sello y V°B°', 78, signY + 11.5);

  // Firma 3: ÁREA LOGÍSTICA
  doc.line(140, signY, 192, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ÁREA LOGÍSTICA / RRHH', 148, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Control y Entrega de Activo', 140, signY + 8);
  doc.text(`Fecha: ${fecha}`, 140, signY + 11.5);

  // Guardar / Descargar PDF
  const filename = `Responsiva_${(resp.replace(/[^A-Za-z0-9]/g, '_').substring(0, 20))}_${serieOrImei}.pdf`;
  doc.save(filename);
  showToast(`📄 Acta generada: ${filename}`, 'success');
}


/* =====================================================
   PANEL GENERAL — OFFICE CARDS
   ===================================================== */
function getNormalizedOffice(ubicacion) {
  if (!ubicacion || ubicacion === '-') return 'General';
  const u = String(ubicacion).trim();
  const m = u.match(/Oficina\s*(\d+)/i) || u.match(/\b(\d{3,4})\b/);
  if (m) return 'Oficina ' + m[1];
  if (/almac[eé]n/i.test(u)) return 'Almacén Central';
  const part = u.split('-')[0].trim();
  return part || 'General';
}

function getInventoryForCategory(cat) {
  const c = cat || CURRENT_DASHBOARD_CATEGORY || 'Computadoras';
  return STATE.inventory.filter(r => {
    const catNorm = (r.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (c === 'Computadoras') {
      return catNorm.includes('computadora') || catNorm.includes('laptop') || catNorm.includes('pc') || catNorm.includes('monitor');
    }
    if (c === 'Teléfonos / Corporativos') {
      return catNorm.includes('telefono') || catNorm.includes('corporativo') || catNorm.includes('celular') || catNorm.includes('smartphone');
    }
    if (c === 'Inmuebles y Electrodomésticos') {
      return catNorm.includes('inmueble') || catNorm.includes('electrodomestico') || catNorm.includes('mueble') || 
             catNorm.includes('mobiliario') || catNorm.includes('microonda') || catNorm.includes('cafetera') || 
             catNorm.includes('refrigerador') || catNorm.includes('aire') || catNorm.includes('ventilador') || 
             catNorm.includes('dispensador');
    }
    return catNorm.includes('computadora') || catNorm.includes('laptop') || catNorm.includes('pc');
  });
}

/* =====================================================
   ESTADÍSTICAS DE TARJETAS DE CATEGORÍA (v5.0)
   ===================================================== */
function updateCategoryCardStats() {
  const inv = STATE.inventory || [];

  // 1. Computadoras
  const pcs = inv.filter(r => {
    const catNorm = (r.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return catNorm.includes('computadora') || catNorm.includes('laptop') || catNorm.includes('pc') || catNorm.includes('monitor');
  });
  const pcTotal = pcs.length;
  const pcAsig = pcs.filter(r => normalizeEstado(r.estado, r) === 'Asignado').length;
  const pcStock = pcs.filter(r => normalizeEstado(r.estado, r) === 'Stock').length;
  const pcBroken = pcs.filter(r => normalizeEstado(r.estado, r) === 'Broken').length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('catTotalPC', pcTotal);
  setEl('catAsigPC', pcAsig);
  setEl('catStockPC', pcStock);
  setEl('catBrokenPC', pcBroken);

  // 2. Teléfonos Corporativos
  const tlfs = inv.filter(r => {
    const catNorm = (r.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return catNorm.includes('telefono') || catNorm.includes('corporativo') || catNorm.includes('celular') || catNorm.includes('smartphone');
  });
  const tlfTotal = tlfs.length;
  const tlfAsig = tlfs.filter(r => normalizeEstado(r.estado, r) === 'Asignado').length;
  const tlfStock = tlfs.filter(r => normalizeEstado(r.estado, r) === 'Stock').length;
  const tlfBroken = tlfs.filter(r => normalizeEstado(r.estado, r) === 'Broken').length;

  setEl('catTotalTlf', tlfTotal);
  setEl('catAsigTlf', tlfAsig);
  setEl('catStockTlf', tlfStock);
  setEl('catBrokenTlf', tlfBroken);

  // 3. Electrodomésticos y Mobiliario
  const inms = inv.filter(r => {
    const catNorm = (r.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return catNorm.includes('inmueble') || catNorm.includes('electrodomestico') || catNorm.includes('mueble') || 
           catNorm.includes('mobiliario') || catNorm.includes('microonda') || catNorm.includes('cafetera') || 
           catNorm.includes('refrigerador') || catNorm.includes('aire') || catNorm.includes('ventilador') || 
           catNorm.includes('dispensador');
  });
  const inmTotal = inms.length;
  const inmStock = inms.filter(r => normalizeEstado(r.estado, r) === 'Stock').length;

  setEl('catTotalInm', inmTotal);
  setEl('catStockInm', inmStock);
}

function setDashboardCategory(cat) {
  CURRENT_DASHBOARD_CATEGORY = cat;
  const cardPC  = document.getElementById('dashCatCardPC');
  const cardTlf = document.getElementById('dashCatCardTlf');
  const cardInm = document.getElementById('dashCatCardInm');
  if (cardPC)  cardPC.classList.toggle('active', cat === 'Computadoras');
  if (cardTlf) cardTlf.classList.toggle('active', cat === 'Teléfonos / Corporativos');
  if (cardInm) cardInm.classList.toggle('active', cat === 'Inmuebles y Electrodomésticos');
  renderOfficeCards();
}

function cleanBrandName(raw) {
  if (!raw) return 'OTRAS';
  let s = String(raw).toUpperCase().trim();
  if (s.includes('LENOVO') || s.includes('THINK')) return 'LENOVO';
  if (s.includes('HEWLETT') || s.includes('HP')) return 'HP';
  if (s.includes('DELL')) return 'DELL';
  if (s.includes('SAMSUNG')) return 'SAMSUNG';
  if (s.includes('APPLE') || s.includes('MAC')) return 'APPLE';
  if (s.includes('ASUS')) return 'ASUS';
  if (s.includes('ACER')) return 'ACER';
  if (s.includes('LG')) return 'LG';
  if (s.includes('HUAWEI')) return 'HUAWEI';
  if (s.includes('ZTE')) return 'ZTE';
  if (s.includes('REDMI') || s.includes('XIAOMI')) return 'XIAOMI / REDMI';
  if (s.includes('HONOR')) return 'HONOR';
  if (s.includes('MOTOROLA') || s.includes('MOTO')) return 'MOTOROLA';
  if (s === '-' || s === 'S/M' || s === 'SIN MARCA') return 'OTRAS';
  return s;
}

function renderCategoryBanner(currentCat) {
  const banner = document.getElementById('dashboardCategoryDetailsBanner');
  if (banner) {
    banner.innerHTML = '';
    banner.style.display = 'none';
  }
}

function renderOfficeCards() {
  const grid = document.getElementById('officeCardsGrid');
  if (!grid) return;

  const currentCat = CURRENT_DASHBOARD_CATEGORY || 'Computadoras';
  const inv = getInventoryForCategory(currentCat);

  updateCategoryCardStats();
  renderCategoryBanner(currentCat);

    const titleEl = document.getElementById('dashboardOfficeTitle');
  const railControls = document.getElementById('officeRailControls');
  if (titleEl) {
    if (currentCat === 'Computadoras') titleEl.textContent = 'Computadoras y Laptops por Oficina (Total Físico Real)';
    else if (currentCat === 'Teléfonos / Corporativos') titleEl.textContent = 'Teléfonos Corporativos por Oficina (Total Físico Real)';
    else titleEl.textContent = 'Electrodomésticos y Mobiliario por Sede';
  }

  // Si no hay datos en esta categoría, mostrar estado vacío limpio y amigable
  if (!inv || inv.length === 0) {
    if (railControls) railControls.style.display = 'none';
    grid.innerHTML = `
      <div style="width:100%;padding:32px 20px;text-align:center;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:14px;color:#64748b">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-weight:800;font-size:15px;color:#1e293b;margin-bottom:4px">No hay equipos registrados en esta categoría</div>
        <div style="font-size:12.5px;max-width:520px;margin:0 auto 16px;color:#64748b;line-height:1.5">
          La base de datos se encuentra limpia. Puedes subir tu archivo Excel o activar la base genérica de demostración para presentar el sistema al público sin información confidencial.
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="loadDemoGenericData()" style="font-weight:700;padding:8px 18px;box-shadow:0 4px 12px rgba(37,99,235,0.25)">
            ✨ Cargar Datos Demo (Público)
          </button>
          <button class="btn btn-outline btn-sm" onclick="navigateTo('importar')" style="font-weight:700;padding:8px 18px">
            📥 Cargar Archivo Excel
          </button>
        </div>
      </div>`;
    return;
  }

  if (railControls) railControls.style.display = 'flex';

  const grouped = {};
  let totalStockGlobal = 0;
  let totalBrokenGlobal = 0;

  inv.forEach(item => {
    const est = normalizeEstado(item.estado, item);
    const u = String(item.ubicacion || '').trim();

    if (est === 'Stock') totalStockGlobal++;
    if (est === 'Broken') totalBrokenGlobal++;

    // Extraer número de oficina física (ej. Oficina 1603, Oficina 301, Oficina 111, etc.)
    const m = u.match(/Oficina\s*(\d+)/i) || u.match(/\b(\d{3,4})\b/);
    const target = m ? ('Oficina ' + m[1]) : (u.split('-')[0].trim() || 'General');

    if (!grouped[target]) {
      grouped[target] = { total: 0, asignados: 0, stock: 0, broken: 0 };
    }
    grouped[target].total++;
    if (est === 'Asignado') grouped[target].asignados++;
    else if (est === 'Broken') grouped[target].broken++;
    else grouped[target].stock++;
  });

  // Oficinas físicas ordenadas de mayor a menor según cantidad real total
  const physicalOffices = Object.entries(grouped)
    .filter(([name]) => !name.includes('Almacén') && !name.includes('Broken') && !name.includes('Taller'))
    .sort((a, b) => b[1].total - a[1].total);

  // Tarjetas globales de Almacén y Bajas
  const warehouse = ['Almacén Central (Stock)', { total: totalStockGlobal, stock: totalStockGlobal, asignados: 0, broken: 0 }];
  const brokenGroup = ['Taller / Bajas (Broken)', { total: totalBrokenGlobal, broken: totalBrokenGlobal, asignados: 0, stock: 0 }];

  const orderedCards = [...physicalOffices, warehouse, brokenGroup];

  const OFFICE_COLORS = ['#2563eb','#16a34a','#d97706','#7c3aed','#0d9488','#4f46e5','#e11d48'];

  grid.innerHTML = orderedCards.map(([name, stats], i) => {
    const isWarehouse = name.includes('Almacén');
    const isBroken = name.includes('Broken') || name.includes('Taller');
    const color = isWarehouse ? '#16a34a' : isBroken ? '#dc2626' : OFFICE_COLORS[i % OFFICE_COLORS.length];
    const pct = stats.total > 0 ? Math.round((stats.asignados / stats.total) * 100) : 0;

    if (isWarehouse) {
      return `
        <div class="office-card" onclick="filterInventoryByOffice('Almacén Central (Stock)')" style="border-top:4px solid #16a34a" title="Ver stock disponible">
          <div class="office-card-top">
            <div>
              <div class="office-name-clean">📦 Almacén Central (Stock)</div>
              <div class="office-sede-label">Reserva Central · Sede Principal</div>
            </div>
            <div class="office-stat-badge" style="background:#dcfce7;border:1px solid #bbf7d0">
              <span class="office-stat-num" style="color:#166534">${stats.stock}</span>
              <span class="office-stat-label">DISP.</span>
            </div>
          </div>

          <div class="office-metrics-grid">
            <div class="office-metric-box metric-green">
              <span class="metric-num">${stats.stock}</span>
              <span class="metric-lbl">Disponibles</span>
            </div>
            <div class="office-metric-box metric-blue">
              <span class="metric-num">0</span>
              <span class="metric-lbl">En Tránsito</span>
            </div>
            <div class="office-metric-box metric-green">
              <span class="metric-num">100%</span>
              <span class="metric-lbl">Operatividad</span>
            </div>
          </div>

          <div class="office-occupancy-wrap">
            <div class="occupancy-info">
              <span>Disponibilidad inmediata:</span>
              <strong style="color:#16a34a">${stats.stock} unidades en stock</strong>
            </div>
            <div class="office-progress-bar">
              <div style="width:100%;background:#16a34a;height:100%;border-radius:4px"></div>
            </div>
          </div>

          <div class="office-card-click-hint" style="color:#166534">
            <span>Ver equipos listos para asignación</span>
            <span class="arrow-icon">→</span>
          </div>
        </div>`;
    }

    if (isBroken) {
      return `
        <div class="office-card" onclick="filterInventoryByOffice('Taller / Bajas (Broken)')" style="border-top:4px solid #dc2626" title="Ver equipos averiados">
          <div class="office-card-top">
            <div>
              <div class="office-name-clean">🛠️ Taller / Bajas (Broken)</div>
              <div class="office-sede-label">Averías Técnicas · En Reparación / Descarte</div>
            </div>
            <div class="office-stat-badge" style="background:#fee2e2;border:1px solid #fecaca">
              <span class="office-stat-num" style="color:#991b1b">${stats.broken}</span>
              <span class="office-stat-label">BAJAS</span>
            </div>
          </div>

          <div class="office-metrics-grid">
            <div class="office-metric-box metric-red">
              <span class="metric-num">${stats.broken}</span>
              <span class="metric-lbl">Averiados</span>
            </div>
            <div class="office-metric-box metric-blue">
              <span class="metric-num">0</span>
              <span class="metric-lbl">Asignados</span>
            </div>
            <div class="office-metric-box metric-green">
              <span class="metric-num">0</span>
              <span class="metric-lbl">Operativos</span>
            </div>
          </div>

          <div class="office-occupancy-wrap">
            <div class="occupancy-info">
              <span>Equipos fuera de servicio:</span>
              <strong style="color:#dc2626">${stats.broken} unidades reportadas</strong>
            </div>
            <div class="office-progress-bar">
              <div style="width:100%;background:#dc2626;height:100%;border-radius:4px"></div>
            </div>
          </div>

          <div class="office-card-click-hint" style="color:#dc2626">
            <span>Ver reporte de averías y bajas</span>
            <span class="arrow-icon">→</span>
          </div>
        </div>`;
    }

    return `
      <div class="office-card" onclick="filterInventoryByOffice('${esc(name)}')" style="border-top:4px solid ${color}" title="Ver equipos de ${esc(name)}">
        <div class="office-card-top">
          <div>
            <div class="office-name-clean">🏢 ${esc(name)}</div>
            <div class="office-sede-label">Sede Central · Oficinas Corporativas</div>
          </div>
          <div class="office-stat-badge" style="background:${color}12;border:1px solid ${color}35">
            <span class="office-stat-num" style="color:${color}">${stats.total}</span>
            <span class="office-stat-label">TOTAL</span>
          </div>
        </div>

        <div class="office-metrics-grid">
          <div class="office-metric-box metric-blue">
            <span class="metric-num">${stats.asignados}</span>
            <span class="metric-lbl">En Uso</span>
          </div>
          <div class="office-metric-box metric-green">
            <span class="metric-num">${stats.stock}</span>
            <span class="metric-lbl">Disponibles</span>
          </div>
          <div class="office-metric-box metric-red">
            <span class="metric-num">${stats.broken}</span>
            <span class="metric-lbl">Taller / Baja</span>
          </div>
        </div>

        <div class="office-occupancy-wrap">
          <div class="occupancy-info">
            <span>Ocupación de Equipos:</span>
            <strong style="color:${color}">${pct}% (${stats.asignados} de ${stats.total})</strong>
          </div>
          <div class="office-progress-bar">
            <div style="width:${pct}%;background:${color};height:100%;border-radius:4px"></div>
          </div>
        </div>

        <div class="office-card-click-hint" style="color:${color}">
          <span>Ver ${stats.total} equipos de ${esc(name)}</span>
          <span class="arrow-icon">→</span>
        </div>
      </div>`;
  }).join('');

  if (orderedCards.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px">No hay equipos registrados para esta categoría.</p>';
  }

  updateRotationTrendChart();
}

/* =====================================================
   PANEL GENERAL — GRÁFICAS FUTURISTAS
   ===================================================== */
let chartSaludOperativa = null;

function updateSaludOperativaChart() {
  const canvas = document.getElementById('chartSaludOperativa');
  if (!canvas || typeof Chart === 'undefined') return;

  const inv = STATE.inventory || [];
  const total = inv.length;
  const asignados = inv.filter(r => normalizeEstado(r.estado, r) === 'Asignado').length;
  const stock = inv.filter(r => normalizeEstado(r.estado, r) === 'Stock').length;
  const broken = inv.filter(r => normalizeEstado(r.estado, r) === 'Broken').length;

  const isZero = total === 0 || (asignados === 0 && stock === 0 && broken === 0);
  const pctOperativo = !isZero ? ((asignados + stock) / total * 100).toFixed(1) : '0';

  const pctEl = document.getElementById('donutCenterPct');
  const lblEl = document.querySelector('.donut-center-lbl');
  if (pctEl) pctEl.textContent = isZero ? '0%' : `${pctOperativo}%`;
  if (lblEl) lblEl.textContent = isZero ? 'Sin Datos' : 'OPERATIVO';

  const badgeEl = document.getElementById('badgeOperatividad');
  if (badgeEl) {
    if (isZero) {
      badgeEl.textContent = 'Sin Datos';
      badgeEl.style.background = '#f1f5f9';
      badgeEl.style.color = '#64748b';
      badgeEl.style.border = '1px solid #cbd5e1';
    } else {
      badgeEl.textContent = `${pctOperativo}% Operativo`;
      badgeEl.style.background = '#ecfdf5';
      badgeEl.style.color = '#065f46';
      badgeEl.style.border = '1px solid #a7f3d0';
    }
  }

  const asigValEl = document.getElementById('donutAsigVal');
  if (asigValEl) asigValEl.textContent = asignados;
  const stockValEl = document.getElementById('donutStockVal');
  if (stockValEl) stockValEl.textContent = stock;
  const brokenValEl = document.getElementById('donutBrokenVal');
  if (brokenValEl) brokenValEl.textContent = broken;

  const ctx = canvas.getContext('2d');
  if (chartSaludOperativa) { chartSaludOperativa.destroy(); chartSaludOperativa = null; }

  const chartData = isZero ? [1] : [asignados, stock, broken];
  const chartColors = isZero ? ['#e2e8f0'] : ['#10b981', '#0ea5e9', '#ef4444'];

  chartSaludOperativa = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: isZero ? ['Sin Datos'] : ['Asignados', 'En Stock', 'Broken / Bajas'],
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: isZero ? 0 : 3,
        borderColor: '#ffffff',
        hoverOffset: isZero ? 0 : 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '74%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 800
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: !isZero,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 10,
          cornerRadius: 8
        }
      }
    }
  });
}

function updateRotationTrendChart() {
  const canvas = document.getElementById('chartRotacionTendencia');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  if (chartRotacionTendencia) { chartRotacionTendencia.destroy(); chartRotacionTendencia = null; }

  const cat = CURRENT_DASHBOARD_CATEGORY || 'Computadoras';
  let movements = STATE.movements || [];

  movements = movements.filter(m => {
    const eq = (m.equipo || '').toLowerCase();
    if (cat === 'Computadoras') {
      return eq.includes('dell') || eq.includes('lenovo') || eq.includes('hp') || eq.includes('pc') || eq.includes('laptop') || eq.includes('optiplex') || eq.includes('thinkcentre');
    }
    if (cat === 'Teléfonos / Corporativos') {
      return eq.includes('zte') || eq.includes('redmi') || eq.includes('samsung') || eq.includes('celular') || eq.includes('tlf') || eq.includes('nokia') || eq.includes('honor');
    }
    return !eq.includes('zte') && !eq.includes('dell') && !eq.includes('lenovo');
  });

  const badgeEl = document.getElementById('badgeTotalMovimientos');
  if (badgeEl) badgeEl.textContent = `${movements.length} Movimientos (${cat.split('/')[0].trim()})`;

  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
  }

  const asignaciones = months.map(m => movements.filter(mv => mv.fecha && mv.fecha.startsWith(m.key) && mv.operacion === 'Asignación').length);
  const reasignaciones = months.map(m => movements.filter(mv => mv.fecha && mv.fecha.startsWith(m.key) && mv.operacion === 'Reasignación').length);
  const devoluciones = months.map(m => movements.filter(mv => mv.fecha && mv.fecha.startsWith(m.key) && mv.operacion === 'Devolución').length);

  // Degradados futuristas luminosos
  const gradBlue = ctx.createLinearGradient(0, 0, 0, 180);
  gradBlue.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
  gradBlue.addColorStop(1, 'rgba(14, 165, 233, 0.01)');

  const gradPurple = ctx.createLinearGradient(0, 0, 0, 180);
  gradPurple.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
  gradPurple.addColorStop(1, 'rgba(139, 92, 246, 0.01)');

  const gradAmber = ctx.createLinearGradient(0, 0, 0, 180);
  gradAmber.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
  gradAmber.addColorStop(1, 'rgba(245, 158, 11, 0.01)');

  chartRotacionTendencia = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Asignaciones',
          data: asignaciones,
          borderColor: '#0284c7',
          backgroundColor: gradBlue,
          tension: 0.42,
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#0284c7',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Reasignaciones',
          data: reasignaciones,
          borderColor: '#8b5cf6',
          backgroundColor: gradPurple,
          tension: 0.42,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#8b5cf6',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Devoluciones',
          data: devoluciones,
          borderColor: '#f59e0b',
          backgroundColor: gradAmber,
          tension: 0.42,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#f59e0b',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11, weight: '600' }, boxWidth: 10, padding: 12, usePointStyle: true }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
        y: { beginAtZero: true, suggestedMin: 0, suggestedMax: 5, grid: { color: 'rgba(241, 245, 249, 0.9)' }, ticks: { stepSize: 1, precision: 0, font: { size: 10.5 } } }
      }
    }
  });

  renderRecentMovementsTable(movements);
}

function renderRecentMovementsTable(filteredMovements) {
  const tbody = document.getElementById('recentMovementsTableBody');
  if (!tbody) return;

  const movements = filteredMovements || STATE.movements || [];
  const recent = movements.slice(0, 15);
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">Sin movimientos registrados para esta categoría.</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(mv => `
    <tr>
      <td>${esc(mv.fecha || '—')}</td>
      <td><span class="badge" style="${mv.operacion === 'Asignación' ? 'background:#dbeafe;color:#1e40af' : mv.operacion === 'Reasignación' ? 'background:#f3e8ff;color:#7e22ce' : 'background:#fef3c7;color:#b45309'}">${esc(mv.operacion)}</span></td>
      <td><strong>${esc(mv.equipo || '—')}</strong> <small style="color:var(--text-muted)">${esc(mv.nSerie || '')}</small></td>
      <td>${esc(mv.responsable || '—')}</td>
      <td>${esc(mv.oficina || '—')}</td>
      <td>${statusBadge(mv.estado)}</td>
    </tr>`).join('');
}

/* =====================================================
   ESCANEAR — SCANNER OPERATION
   ===================================================== */
function setScannerOperation(op) {
  CURRENT_SCANNER_OPERATION = op;
  document.querySelectorAll('#scannerOpGrid .scanner-op-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.op === op);
  });

  // Update quick assign modal title if open
  const qModal = document.getElementById('quickAssignModal');
  if (qModal && qModal.style.display !== 'none') {
    const titleEl = qModal.querySelector('h3');
    if (titleEl) {
      const opLabels = { asignar: 'Asignación', reasignar: 'Reasignación', devolver: 'Devolución', stock: 'Mover a Stock', broken: 'Marcar como Broken' };
      titleEl.textContent = `⚡ ${opLabels[op] || 'Asignación'} Rápida de Equipo`;
    }
    const estadoSel = document.getElementById('qa_estado');
    if (estadoSel) {
      if (op === 'broken') estadoSel.value = 'Broken';
      else if (op === 'stock' || op === 'devolver') estadoSel.value = 'Stock';
      else estadoSel.value = 'Asignado';
    }
  }
  showToast(`⚙️ Operación preparada: ${op.charAt(0).toUpperCase() + op.slice(1)}`, 'info');
}

/* =====================================================
   ASIGNACIONES — ACTAS TABLE
   ===================================================== */
function renderActasAsignacionTable() {
  const tbody = document.getElementById('tableActasAsigBody');
  const countEl = document.getElementById('countActasAsig');
  if (!tbody) return;

  const searchEl = document.getElementById('searchActasAsig');
  const q = (searchEl ? searchEl.value : '').toLowerCase();

  let actas = STATE.actasAsignacion || [];
  if (q) {
    actas = actas.filter(a =>
      (a.colaborador || '').toLowerCase().includes(q) ||
      (a.dni || '').toLowerCase().includes(q) ||
      (a.nSerie || '').toLowerCase().includes(q) ||
      (a.imei1 || '').toLowerCase().includes(q) ||
      (a.equipo || '').toLowerCase().includes(q)
    );
  }

  if (countEl) countEl.textContent = STATE.actasAsignacion.length;

  if (actas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px">
      ${q ? 'No se encontraron actas con ese criterio.' : 'No hay actas registradas aún. Las actas se generan automáticamente al asignar o reasignar un equipo desde el Escáner o el Formulario de Entrega.'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = actas.map((a, i) => {
    const colab = a.colaborador || a.nombre || a.responsable || '—';
    const tipo = a.tipo || a.operacion || 'Asignación';
    const eq = a.equipo || (a.marca ? `${a.marca} ${a.modelo || ''}`.trim() : a.modelo) || '—';
    const ofi = a.oficina || a.ubicacion || '—';
    const doc = a.dni || a.documento || a.id || '—';
    return `
    <tr>
      <td><strong>#${String(actas.length - i).padStart(4, '0')}</strong></td>
      <td>${esc(a.fecha || '—')}</td>
      <td><span class="badge" style="background:${tipo === 'Reasignación' ? '#f3e8ff;color:#7e22ce' : '#dbeafe;color:#1e40af'}">${esc(tipo)}</span></td>
      <td><strong>${esc(colab)}</strong></td>
      <td>${esc(doc)}</td>
      <td>${esc(eq)}</td>
      <td><code style="font-size:11px;background:#f8fafc;padding:2px 5px;border-radius:4px">${esc(a.nSerie || a.imei1 || '—')}</code></td>
      <td>${esc(ofi)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="reimprimirActaAsig(${i})" title="Reimprimir PDF">🖨️ PDF</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarActaAsig(${i})" title="Eliminar acta" style="background:#fee2e2;color:#b91c1c;border:none;margin-left:4px">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function reimprimirActaAsig(idx) {
  const actas = STATE.actasAsignacion || [];
  const a = actas[idx];
  if (!a) return;
  const fakeItem = {
    nSerie: a.nSerie || a.imei1 || '',
    imei1: a.imei1 || a.nSerie || '',
    imei2: a.imei2 || '',
    marca: (a.equipo || '').split(' ')[0] || '—',
    modelo: (a.equipo || '').split(' ').slice(1).join(' ') || '—',
    responsable: a.colaborador,
    dni: a.dni,
    supervisor: a.supervisor || '—',
    ubicacion: a.oficina,
    fechaCompra: a.fecha,
    accesorios: 'CARGADOR Y PROTECTOR',
    costo: 'S/. 197.00',
    categoria: 'Teléfonos / Corporativos',
  };
  printResponsivaPDF(fakeItem);
}

function eliminarActaAsig(idx) {
  if (!confirm('¿Eliminar esta acta del historial? Esta acción no afecta el inventario.')) return;
  STATE.actasAsignacion.splice(idx, 1);
  persistData();
  renderActasAsignacionTable();
}

function switchAsignacionView(view) {
  const actas = document.getElementById('viewAsigActas');
  const form = document.getElementById('viewAsigForm');
  const btnActas = document.getElementById('btnTabAsigActas');
  const btnForm = document.getElementById('btnTabAsigForm');
  if (actas) actas.style.display = view === 'actas' ? '' : 'none';
  if (form) form.style.display = view === 'form' ? '' : 'none';
  if (btnActas) { btnActas.style.background = view === 'actas' ? '#2563eb' : 'transparent'; btnActas.style.color = view === 'actas' ? '#fff' : '#64748b'; }
  if (btnForm)  { btnForm.style.background  = view === 'form'  ? '#2563eb' : 'transparent'; btnForm.style.color  = view === 'form'  ? '#fff' : '#64748b'; }
}

/* =====================================================
   DEVOLUCIONES — ACTAS TABLE
   ===================================================== */
function renderActasDevolucionTable() {
  const tbody = document.getElementById('tableActasDevBody');
  const countEl = document.getElementById('countActasDev');
  if (!tbody) return;

  const searchEl = document.getElementById('searchActasDev');
  const q = (searchEl ? searchEl.value : '').toLowerCase();

  let actas = STATE.actasDevolucion || [];
  if (q) {
    actas = actas.filter(a =>
      (a.colaborador || '').toLowerCase().includes(q) ||
      (a.dni || '').toLowerCase().includes(q) ||
      (a.nSerie || '').toLowerCase().includes(q) ||
      (a.equipo || '').toLowerCase().includes(q) ||
      (a.motivo || '').toLowerCase().includes(q) ||
      (a.destino || '').toLowerCase().includes(q)
    );
  }

  if (countEl) countEl.textContent = (STATE.actasDevolucion || []).length;

  if (actas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px">
      ${q ? 'No se encontraron actas con ese criterio.' : 'No hay actas de devolución aún. Se generan al procesar una devolución en el Formulario o desde el Escáner con operación "Devolver".'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = actas.map((a, i) => {
    const colab = a.colaborador || a.nombre || '—';
    const doc = a.dni || a.documento || '—';
    const eq = a.equipo || `${a.marca || ''} ${a.modelo || ''}`.trim() || '—';
    const mot = a.motivo || 'Cese de labores';
    const estFinal = a.estadoFinal || a.estado || 'Stock';
    const dest = a.destino || 'Almacén Central / Stock';
    return `
    <tr>
      <td><strong>#DEV-${String(actas.length - i).padStart(4, '0')}</strong></td>
      <td>${esc(a.fecha || '—')}</td>
      <td><strong>${esc(colab)}</strong></td>
      <td>${esc(doc)}</td>
      <td><span class="badge" style="background:#fef3c7;color:#92400e;font-weight:700">${esc(mot)}</span></td>
      <td>${statusBadge(estFinal)}</td>
      <td><strong>${esc(eq)}</strong><br><code style="font-size:11px;background:#f8fafc;padding:2px 5px;border-radius:4px">${esc(a.nSerie || a.imei1 || '—')}</code></td>
      <td>${esc(dest)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="reimprimirActaDev(${i})" title="Descargar / Imprimir Acta PDF" style="font-weight:700">🖨️ PDF</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarActaDev(${i})" title="Eliminar acta" style="background:#fee2e2;color:#b91c1c;border:none;margin-left:4px">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function reimprimirActaDev(idx) {
  const actas = STATE.actasDevolucion || [];
  const a = actas[idx];
  if (!a) return;
  const devData = {
    nombre: a.colaborador || a.nombre || '—',
    dni: a.dni || '—',
    cargo: a.cargo || 'Colaborador',
    area: a.area || a.oficina || '—',
    fechaDevolucion: a.fecha || new Date().toISOString().slice(0, 10),
    equipoDesc: a.equipo || `${a.marca || ''} ${a.modelo || ''}`.trim() || 'Equipo Corporativo',
    nSerie: a.nSerie || '—',
    imei2: a.imei2 || '',
    marca: a.marca || ((a.equipo || '').split(' ')[0]) || '—',
    motivo: a.motivo || 'Cese de labores',
    estadoTecnico: a.estadoTecnico || 'Operativo',
    estetica: a.estetica || 'Buen estado',
    destino: a.destino || 'Almacén Central / Stock',
    observaciones: a.observaciones || 'Acta oficial de devolución emitida por sistema.'
  };
  printDevolucionPDF(devData);
}
window.reimprimirActaDev = reimprimirActaDev;

function eliminarActaDev(idx) {
  if (!confirm('¿Eliminar esta acta del historial? Esta acción no afecta el inventario.')) return;
  STATE.actasDevolucion.splice(idx, 1);
  persistData();
  renderActasDevolucionTable();
}

function switchDevolucionView(view) {
  const actas = document.getElementById('viewDevActas');
  const form = document.getElementById('viewDevForm');
  const btnActas = document.getElementById('btnTabDevActas');
  const btnForm = document.getElementById('btnTabDevForm');
  if (actas) actas.style.display = view === 'actas' ? '' : 'none';
  if (form) form.style.display = view === 'form' ? '' : 'none';
  if (btnActas) { btnActas.style.background = view === 'actas' ? '#d97706' : 'transparent'; btnActas.style.color = view === 'actas' ? '#fff' : '#64748b'; }
  if (btnForm)  { btnForm.style.background  = view === 'form'  ? '#d97706' : 'transparent'; btnForm.style.color  = view === 'form'  ? '#fff' : '#64748b'; }
}

/* =====================================================
   INVENTARIO — CUADRÍCULAS & TABLA
   ===================================================== */
function getOfficeList() {
  const set = new Set();
  STATE.inventory.forEach(r => { const o = getNormalizedOffice(r.ubicacion); if (o) set.add(o); });
  return [...set].sort();
}

function setInventoryCategory(cat) {
  CURRENT_INVENTORY_CATEGORY = cat;
  if (typeof SEGMENT_PAGES !== 'undefined') {
    SEGMENT_PAGES.Asignados = 1;
    SEGMENT_PAGES.Stock = 1;
    SEGMENT_PAGES.Broken = 1;
  }
  document.querySelectorAll('#inventoryCategoryPills .cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`));
  });
  renderInventoryViews();
}

function setInventoryViewMode(mode) {
  CURRENT_INVENTORY_VIEW = mode;
  const cuadContainer = document.getElementById('invCuadriculasContainer');
  const tabContainer  = document.getElementById('invTablaContainer');
  const btnCuad = document.getElementById('btnViewCuadriculas');
  const btnTab  = document.getElementById('btnViewTabla');
  if (cuadContainer) cuadContainer.style.display = mode === 'cuadriculas' ? '' : 'none';
  if (tabContainer)  tabContainer.style.display  = mode === 'tabla' ? '' : 'none';
  if (btnCuad) { btnCuad.style.background = mode === 'cuadriculas' ? '#2563eb' : 'transparent'; btnCuad.style.color = mode === 'cuadriculas' ? '#fff' : '#64748b'; }
  if (btnTab)  { btnTab.style.background  = mode === 'tabla' ? '#2563eb' : 'transparent'; btnTab.style.color  = mode === 'tabla' ? '#fff' : '#64748b'; }
  renderInventoryViews();
}

function renderInventoryViews() {
  // Populate office dropdown
  const sel = document.getElementById('invFilterOffice');
  if (sel) {
    const offices = getOfficeList();
    const cur = CURRENT_INVENTORY_OFFICE || sel.value || '';
    sel.innerHTML = '<option value="">Todas las Oficinas</option>' +
      offices.map(o => `<option value="${esc(o)}" ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('');
    CURRENT_INVENTORY_OFFICE = sel.value;
  }

  // Filter inventory by category
  let inv = getInventoryForCategory(CURRENT_INVENTORY_CATEGORY);

  // Filter by office
  const office = (sel ? sel.value : '') || CURRENT_INVENTORY_OFFICE;
  if (office) {
    if (office.includes('Almacén')) {
      inv = inv.filter(r => normalizeEstado(r.estado, r) === 'Stock');
    } else if (office.includes('Broken') || office.includes('Taller')) {
      inv = inv.filter(r => normalizeEstado(r.estado, r) === 'Broken');
    } else {
      inv = inv.filter(r => getNormalizedOffice(r.ubicacion) === office);
    }
  }

  // Filter by Estado dropdown in card search bar
  const estCard = document.getElementById('invFilterEstadoCard')?.value || '';
  if (estCard) {
    inv = inv.filter(r => normalizeEstado(r.estado, r) === estCard);
  }

  // Filter by search text query in card search bar
  if (INVENTORY_CARD_QUERY) {
    const q = INVENTORY_CARD_QUERY;
    inv = inv.filter(r => {
      const match = (r.nSerie || '') + ' ' + (r.imei1 || '') + ' ' + (r.imei2 || '') + ' ' +
                    (r.marca || '') + ' ' + (r.modelo || '') + ' ' + (r.responsable || '') + ' ' +
                    (r.dni || '') + ' ' + (r.ubicacion || '');
      return match.toLowerCase().includes(q);
    });
  }

  const matchBadge = document.getElementById('invSearchMatchBadge');
  if (matchBadge) {
    if (office) {
      matchBadge.innerHTML = `<span style="background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:6px;border:1px solid #bfdbfe">Filtrando por: <strong>${esc(office)}</strong> (${inv.length} equipos)</span>`;
    } else if (INVENTORY_CARD_QUERY || estCard) {
      matchBadge.textContent = `Coincidencias: ${inv.length} equipos`;
    } else {
      matchBadge.textContent = '';
    }
  }

  const asignados = inv.filter(r => normalizeEstado(r.estado, r) === 'Asignado');
  const stock     = inv.filter(r => normalizeEstado(r.estado, r) === 'Stock');
  const broken    = inv.filter(r => normalizeEstado(r.estado, r) === 'Broken');

  // Update KPI cards
  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setId('invKpiTotal', inv.length);
  setId('invKpiAsignados', asignados.length);
  setId('invKpiStock', stock.length);
  setId('invKpiBroken', broken.length);
  setId('invKpiOficinas', getOfficeList().length);
  setId('badgeCountAsignados', asignados.length);
  setId('badgeCountStock', stock.length);
  setId('badgeCountBroken', broken.length);

  if (CURRENT_INVENTORY_VIEW === 'cuadriculas') {
    renderSegmentGrid('gridAsignadosContainer', asignados);
    renderSegmentGrid('gridStockContainer', stock);
    renderSegmentGrid('gridBrokenContainer', broken);
  } else {
    STATE.filtered = inv;
    STATE.currentPage = 1;
    renderTable();
  }
}

const SEGMENT_PAGES = { Asignados: 1, Stock: 1, Broken: 1 };
const SEGMENT_PAGE_SIZE = 8;

window.changeSegmentPage = function(seg, delta) {
  if (!SEGMENT_PAGES[seg]) SEGMENT_PAGES[seg] = 1;
  SEGMENT_PAGES[seg] += delta;
  if (SEGMENT_PAGES[seg] < 1) SEGMENT_PAGES[seg] = 1;
  renderInventoryViews();
};

function renderSegmentGrid(containerId, items) {
  const container = document.getElementById(containerId);
  const pagEl = document.getElementById(containerId.replace('Container', 'Pagination'));
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;grid-column:1/-1">Sin equipos en esta sección con los filtros actuales.</p>';
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  const seg = containerId.includes('Asignados') ? 'Asignados' : containerId.includes('Stock') ? 'Stock' : 'Broken';

  // Ordenar SIEMPRE por fecha de forma descendente (la fecha más actual primero, las más antiguas al final)
  const sorted = [...items].sort((a, b) => {
    const da = a.fechaCompra || '1970-01-01';
    const db = b.fechaCompra || '1970-01-01';
    return db.localeCompare(da);
  });

  const total = sorted.length;
  const totalPages = Math.ceil(total / SEGMENT_PAGE_SIZE) || 1;
  if (!SEGMENT_PAGES[seg] || SEGMENT_PAGES[seg] > totalPages) SEGMENT_PAGES[seg] = 1;
  const curPage = SEGMENT_PAGES[seg];
  const start = (curPage - 1) * SEGMENT_PAGE_SIZE;
  const slice = sorted.slice(start, start + SEGMENT_PAGE_SIZE);

  const isAsignados = seg === 'Asignados';
  const isStock = seg === 'Stock';
  const catIcon = { 'Teléfonos / Corporativos': '📱', 'Computadoras': '💻', 'Inmuebles y Electrodomésticos': '🔌' };

  container.innerHTML = slice.map(item => {
    const cat = normalizeCategoria(item.categoria);
    const officeLabel = getNormalizedOffice(item.ubicacion);
    const stateColor = isStock ? '#16a34a' : isAsignados ? '#2563eb' : '#dc2626';
    const displayDate = formatDisplayDate(item.fechaCompra);
    const isPhone = (item.categoria || '').includes('Teléfono') || (item.tipo || '').includes('Smartphone');
    const colorPill = (item.color && item.color !== '-') 
      ? `<span class="badge-color-tag dot-${esc(item.color.toLowerCase())}"><span class="color-dot"></span>${esc(item.color)}</span>` 
      : '';
    const tipoLabel = (item.tipo && item.tipo !== '-') ? item.tipo : (item.categoria || 'Equipo');

    return `
      <div class="inv-card" style="border-left:4px solid ${stateColor};cursor:pointer" onclick="openItemDetail('${esc(item.nSerie || '')}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span class="inv-card-office" style="font-size:11px;font-weight:700;color:#1e40af;background:#eff6ff;padding:2px 6px;border-radius:4px">${esc(officeLabel)}</span>
          <div style="display:flex;align-items:center;gap:6px">
            ${colorPill}
            <span style="font-size:11px;font-weight:600;color:#64748b">${esc(displayDate)}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
          <div style="flex:1;overflow:hidden">
            <div style="font-weight:700;font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${isPhone ? '📱 ' : '💻 '}<strong>${esc(item.marca || '—')}</strong> ${esc(item.modelo && item.modelo !== '-' && item.modelo !== item.marca ? item.modelo : '')}
              <span style="font-size:11px;font-weight:500;color:#64748b">(${esc(tipoLabel)})</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">
              Cód/Serie: <strong>${esc(item.nSerie || item.imei1 || '—')}</strong>
              ${item.imei1 && item.imei1 !== '-' ? ` · IMEI 1: <strong>${esc(item.imei1)}</strong>` : ''}
              ${item.imei2 && item.imei2 !== '-' ? ` · IMEI 2: ${esc(item.imei2)}` : ''}
              ${item.cargador && item.cargador !== '-' ? ` · Cargador: <strong>${esc(item.cargador)}</strong>` : ''}
            </div>
          </div>
          <span style="font-size:10px;background:${stateColor}18;color:${stateColor};padding:2px 7px;border-radius:10px;font-weight:700">${esc(normalizeEstado(item.estado))}</span>
        </div>
        ${item.responsable && item.responsable !== '-' ? `
          <div class="inv-card-resp-box">
            <span class="resp-name">Responsable: <strong>${esc(item.responsable)}</strong></span>
            ${item.dni && item.dni !== '-' ? `<span class="resp-dni">DNI: ${esc(item.dni)}</span>` : ''}
          </div>
        ` : ''}
      </div>`;
  }).join('');

  if (pagEl) {
    if (totalPages <= 1) {
      pagEl.innerHTML = `<span class="segment-page-info">Mostrando ${total} equipos (${seg})</span>`;
    } else {
      pagEl.innerHTML = `
        <button type="button" class="segment-page-btn" onclick="changeSegmentPage('${seg}', -1)" ${curPage <= 1 ? 'disabled' : ''}>◀ Anterior</button>
        <span class="segment-page-info">Página <strong>${curPage}</strong> de <strong>${totalPages}</strong> (Equipos ${start + 1}-${Math.min(start + SEGMENT_PAGE_SIZE, total)} de ${total})</span>
        <button type="button" class="segment-page-btn" onclick="changeSegmentPage('${seg}', 1)" ${curPage >= totalPages ? 'disabled' : ''}>Siguiente ▶</button>
      `;
    }
  }
}

function openItemDetail(nSerie) {
  if (!nSerie) return;
  const item = STATE.inventory.find(r => r.nSerie && r.nSerie.toUpperCase() === nSerie.toUpperCase());
  if (item) openEdit(STATE.inventory.indexOf(item));
}

function filterInventoryByOffice(office) {
  navigateTo('inventario');
  CURRENT_INVENTORY_OFFICE = office;
  SEGMENT_PAGES.Asignados = 1;
  SEGMENT_PAGES.Stock = 1;
  SEGMENT_PAGES.Broken = 1;

  setTimeout(() => {
    const sel = document.getElementById('invFilterOffice');
    if (sel) {
      if (office.includes('Almacén') || office.includes('Broken')) {
        sel.value = '';
      } else {
        sel.value = office;
      }
      renderInventoryViews();
    }
  }, 80);
}

/* =====================================================
   HELPERS
   ===================================================== */
function esc(val){
  if(!val) return '';
  return String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function statusBadge(estado){
  const norm = normalizeEstado(estado || '');
  if (norm === 'Stock') return `<span class="badge badge-operativo" style="background:#dcfce7;color:#15803d;font-weight:700;letter-spacing:0.3px">Stock</span>`;
  if (norm === 'Asignado') return `<span class="badge" style="background:#eff6ff;color:#1d4ed8;font-weight:700;letter-spacing:0.3px">Asignado</span>`;
  return `<span class="badge badge-danado" style="background:#fee2e2;color:#b91c1c;font-weight:700;letter-spacing:0.3px">Broken / Baja</span>`;
}

function showToast(msg, type = 'info') {
  try {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 3500);
  } catch(e) {
    console.warn('[showToast] Error:', e.message);
  }
}

let _saveServerTimeout = null;
function saveToServer(forceReset = false) {
  if (_saveServerTimeout) clearTimeout(_saveServerTimeout);
  _saveServerTimeout = setTimeout(async () => {
    try {
      const isCleared = forceReset || !!STATE.isClearedByUser || (!STATE.inventory || STATE.inventory.length === 0);
      const payload = {
        inventory: isCleared ? [] : (STATE.inventory || []),
        duplicatesRemoved: isCleared ? 0 : (STATE.duplicatesRemoved || 0),
        actasAsignacion: STATE.actasAsignacion || [],
        actasDevolucion: STATE.actasDevolucion || [],
        movements: isCleared ? [] : (STATE.movements || []),
        loadedSources: isCleared ? [] : (STATE.loadedSources || []),
        isClearedByUser: isCleared,
        forceReset: isCleared,
        schemaVersion: 4
      };
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        console.log(`[Servidor] ${result.count || 0} equipos guardados. (Limpio: ${isCleared})`);
      }
    } catch(e) {
      console.warn('Persistencia en servidor omitida:', e);
    }
  }, forceReset ? 50 : 600);
}

function persistData(syncServer = true) {
  try {
    localStorage.setItem('invcontrol_data', JSON.stringify({
      inventory: STATE.inventory,
      duplicatesRemoved: STATE.duplicatesRemoved,
      actasAsignacion: STATE.actasAsignacion,
      actasDevolucion: STATE.actasDevolucion,
      movements: STATE.movements,
      loadedSources: STATE.loadedSources,
      isClearedByUser: !!STATE.isClearedByUser,
      schemaVersion: 4
    }));
  } catch(e) {}

  if (syncServer) {
    saveToServer(!!STATE.isClearedByUser || !STATE.inventory || STATE.inventory.length === 0);
  }
}

function clearAllInventoryData(forceServerReset = true) {
  STATE.inventory = [];
  STATE.filtered = [];
  STATE.raw1 = [];
  STATE.raw2 = [];
  STATE.loadedSources = [];
  STATE.movements = [];
  STATE.duplicatesRemoved = 0;
  STATE.isClearedByUser = true;

  try {
    localStorage.setItem('invcontrol_data', JSON.stringify({
      inventory: [],
      duplicatesRemoved: 0,
      actasAsignacion: STATE.actasAsignacion || [],
      actasDevolucion: STATE.actasDevolucion || [],
      movements: [],
      loadedSources: [],
      isClearedByUser: true,
      schemaVersion: 4
    }));
  } catch(e) {}

  if (forceServerReset) {
    saveToServer(true);
  }

  renderLoadedSourcesTable();
  refreshAll(false);
}


/* =====================================================
   POST-SCAN DECISION MODAL & SCANNER FLOW
   ===================================================== */
let CURRENT_SCANNED_DEVICE = null;


function registerUnlistedDeviceDirect(action) {
  const dev = CURRENT_SCANNED_DEVICE;
  if (!dev) return;

  if (action === 'Asignar') {
    closePostScanModal();
    // Abrir modal de asignación rápida pasando los datos del nuevo equipo
    openQuickAssignModal(dev.code || dev.nSerie, null, dev.imei1, dev.imei2);
    return;
  }

  // Cargar directo a Stock o Broken
  const isBroken = (action === 'Broken');
  const newId = 'EQ-' + Date.now().toString().slice(-6);
  const newRow = {
    id: newId,
    codigo: dev.nSerie || dev.imei1 || newId,
    nSerie: dev.nSerie || dev.imei1 || newId,
    serie: dev.nSerie || dev.imei1 || newId,
    imei1: dev.imei1 || '',
    imei2: dev.imei2 || '',
    marca: dev.marca || 'GENÉRICO',
    modelo: dev.modelo || 'SMARTPHONE',
    color: (dev.color && dev.color !== '-') ? dev.color : 'NEGRO',
    tipo: (dev.categoria && dev.categoria.includes('Computad')) ? 'ALL IN ONE' : 'SMARTPHONE',
    categoria: dev.categoria || ((dev.imei1 || dev.imei2) ? 'Teléfonos móviles' : 'Computadoras'),
    ubicacion: isBroken ? 'ALMACÉN (BAJA / BROKEN)' : 'ALMACÉN CENTRAL',
    responsable: isBroken ? 'BROKEN' : 'STOCK',
    dni: '—',
    supervisor: '',
    puesto: 'OPERACIONES',
    area: 'OPERACIONES',
    estado: isBroken ? 'Broken' : 'Stock',
    estadoOrigen: isBroken ? 'DAÑADO' : 'BUENO',
    costo: dev.costo || 'S/. 197.00',
    cargador: 'SI',
    observaciones: 'Cargado directamente como ' + (isBroken ? 'Broken' : 'Stock') + ' desde escáner'
  };

  STATE.inventory.unshift(newRow);
  if (typeof persistData === 'function') persistData();
  if (typeof renderKpis === 'function') renderKpis();
  if (typeof renderChart === 'function') renderChart();
  if (typeof renderTable === 'function') renderTable();
  closePostScanModal();
  playScanBeep(true);
  showToast(isBroken ? '⚠️ Equipo ' + newRow.marca + ' ' + newRow.modelo + ' cargado como BROKEN' : '✅ Equipo ' + newRow.marca + ' ' + newRow.modelo + ' cargado a STOCK exitosamente', isBroken ? 'warning' : 'success');
}
window.registerUnlistedDeviceDirect = registerUnlistedDeviceDirect;

function openPostScanModal(deviceData) {
  stopScanner();
  lockBodyScroll();
  CURRENT_SCANNED_DEVICE = deviceData;

  const modal = document.getElementById('postScanModal');
  if (!modal) return;

  // Si no venía found previamente, buscarlo con el buscador maestro
  const found = deviceData.found || findInventoryDevice(deviceData.code || deviceData.nSerie || deviceData.imei1 || deviceData.imei2);
  deviceData.found = found;

  const isPhone = (deviceData.categoria || '').includes('Teléfono') || (deviceData.categoria || '').includes('Corporativo') || (found && (found.categoria || '').includes('Teléfono'));
  const iconEl = document.getElementById('psm_icon');
  if (iconEl) iconEl.textContent = isPhone ? '📱' : '💻';

  const brand = (found && found.marca) || deviceData.marca || 'Equipo';
  const model = (found && found.modelo && found.modelo !== found.marca ? found.modelo : '') || (deviceData.modelo && deviceData.modelo !== deviceData.marca ? deviceData.modelo : '');
  const titleEl = document.getElementById('psm_title');
  if (titleEl) titleEl.textContent = `${brand} ${model}`.trim();

  const serieEl = document.getElementById('psm_serie');
  if (serieEl) serieEl.textContent = (found && found.nSerie) || deviceData.nSerie || deviceData.code || '---';

  const imeiRow = document.getElementById('psm_imeiRow');
  const imeisEl = document.getElementById('psm_imeis');
  const finalImei1 = (found && found.imei1 && found.imei1 !== '-') ? found.imei1 : (deviceData.imei1 || '');
  const finalImei2 = (found && found.imei2 && found.imei2 !== '-') ? found.imei2 : (deviceData.imei2 || '');
  if (finalImei1) {
    if (imeiRow) imeiRow.style.display = 'flex';
    if (imeisEl) imeisEl.textContent = finalImei1 + (finalImei2 ? ' / ' + finalImei2 : '');
  } else {
    if (imeiRow) imeiRow.style.display = 'none';
  }

  // COLOR OFICIAL
  const colorRow = document.getElementById('psm_colorRow');
  const colorValEl = document.getElementById('psm_colorVal');
  const colorTagEl = document.getElementById('psm_color');
  const finalColor = (found && found.color && found.color !== '-') ? found.color : (deviceData.color || '');
  if (finalColor && finalColor !== '-') {
    if (colorRow) colorRow.style.display = 'flex';
    if (colorValEl) colorValEl.textContent = finalColor;
    if (colorTagEl) colorTagEl.className = `badge-color-tag dot-${finalColor.toLowerCase()}`;
  } else {
    if (colorRow) colorRow.style.display = 'none';
  }

  // UBICACIÓN FÍSICA REAL Y MANEJO DE NO REGISTRADO (EXCLUSIVO VERSIÓN COMPLETA)
  const ubiEl = document.getElementById('psm_ubicacion');
  const unregAlert = document.getElementById('psm_unregisteredAlert');
  const unregActions = document.getElementById('psm_unregisteredActions');
  const normalActions = document.getElementById('psm_normalActionsGroup');

  if (ubiEl) {
    if (found && found.ubicacion && found.ubicacion !== '-') {
      ubiEl.textContent = found.ubicacion;
      ubiEl.style.color = '#1e40af';
    } else {
      ubiEl.textContent = '⚠️ No registrado en inventario';
      ubiEl.style.color = '#dc2626';
    }
  }

  if (!found) {
    if (unregAlert) unregAlert.style.display = 'block';
    if (unregActions) unregActions.style.display = 'flex';
    if (normalActions) normalActions.style.display = 'none';
  } else {
    if (unregAlert) unregAlert.style.display = 'none';
    if (unregActions) unregActions.style.display = 'none';
    if (normalActions) normalActions.style.display = 'block';
  }

  const badgeEl = document.getElementById('psm_estadoBadge');
  const curEstado = (found && found.estado) || 'Stock';
  if (badgeEl) badgeEl.innerHTML = statusBadge(curEstado);

  const respRow = document.getElementById('psm_responsableRow');
  const respEl = document.getElementById('psm_responsable');
  const btnAsignarTitle = document.getElementById('psm_btnAsignarTitle');
  const isAlreadyAssigned = found && found.responsable && found.responsable !== '-' && !found.responsable.toUpperCase().includes('STOCK');

  if (isAlreadyAssigned) {
    if (respRow) respRow.style.display = 'block';
    if (respEl) respEl.textContent = `${found.responsable} ${found.dni && found.dni !== '-' ? '(DNI: ' + found.dni + ')' : ''}`;
    if (btnAsignarTitle) btnAsignarTitle.textContent = '🔄 Reasignar a Personal';
  } else {
    if (respRow) respRow.style.display = 'none';
    if (btnAsignarTitle) btnAsignarTitle.textContent = '📝 Asignar a Personal';
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePostScanModal() {
  const modal = document.getElementById('postScanModal');
  if (modal) modal.style.display = 'none';
  unlockBodyScroll();
}

function onPostScanSelectAction(action) {
  closePostScanModal();
  const dev = CURRENT_SCANNED_DEVICE;
  if (!dev) return;

  if (action === 'asignar') {
    // Abrir ventana de datos del colaborador receptor
    openQuickAssignModal(dev.code || dev.nSerie, dev.found, dev.imei1, dev.imei2);
  } else if (action === 'devolver') {
    // Abrir ventana de devolución técnica
    openQuickDevolucionModal(dev);
  } else if (action === 'stock') {
    applyScanDirectStatus(dev, 'Stock');
  } else if (action === 'broken') {
    applyScanDirectStatus(dev, 'Broken');
  }
}

function openQuickDevolucionModal(dev) {
  const modal = document.getElementById('quickDevolucionModal');
  if (!modal) return;

  const item = dev.found || STATE.inventory.find(r =>
    (r.nSerie && r.nSerie.toUpperCase() === (dev.nSerie || dev.code || '').toUpperCase()) ||
    (r.imei1 && r.imei1 === dev.imei1)
  );

  const desc = (item && `${item.marca || ''} ${item.modelo || ''}`) || `${dev.marca || ''} ${dev.modelo || ''}` || 'Equipo';
  const serie = (item && item.nSerie) || dev.nSerie || dev.code || '';

  document.getElementById('qd_equipoDesc').textContent = desc.trim();
  document.getElementById('qd_nSerie').textContent = serie;

  // Pre-llenar si ya tenía un responsable
  if (item && item.responsable) {
    document.getElementById('qd_nombre').value = item.responsable;
    document.getElementById('qd_dni').value = item.dni || '';
    document.getElementById('qd_cargo').value = item.puesto || '';
    document.getElementById('qd_area').value = item.area || item.ubicacion || '';
  } else {
    document.getElementById('qd_nombre').value = '';
    document.getElementById('qd_dni').value = '';
    document.getElementById('qd_cargo').value = '';
    document.getElementById('qd_area').value = '';
  }

  document.getElementById('qd_fechaDevolucion').value = new Date().toISOString().slice(0, 10);
  document.getElementById('qd_observaciones').value = '';

  modal.style.display = 'flex';
  lockBodyScroll();
}

function closeQuickDevolucionModal() {
  const modal = document.getElementById('quickDevolucionModal');
  if (modal) modal.style.display = 'none';
  unlockBodyScroll();
}

function saveQuickDevolucionAndPrint(e) {
  e.preventDefault();
  const dev = CURRENT_SCANNED_DEVICE;
  const nSerie = document.getElementById('qd_nSerie').textContent.trim();
  const nombre = document.getElementById('qd_nombre').value.trim();
  const dni = document.getElementById('qd_dni').value.trim();
  const cargo = document.getElementById('qd_cargo').value.trim();
  const area = document.getElementById('qd_area').value.trim();
  const fechaDev = document.getElementById('qd_fechaDevolucion').value || new Date().toISOString().slice(0, 10);
  const motivo = document.getElementById('qd_motivo').value;
  const estadoTecnico = document.getElementById('qd_estadoTecnico').value;
  const estetica = document.getElementById('qd_estetica').value;
  const destino = document.getElementById('qd_destino').value.trim() || 'Almacén Central / Stock';
  const obs = document.getElementById('qd_observaciones').value.trim();

  const accProtector = document.getElementById('qd_accProtector').checked;
  const accCargador = document.getElementById('qd_accCargador').checked;
  const accAguja = document.getElementById('qd_accAguja').checked;

  const accList = [];
  if (accProtector) accList.push('PROTECTOR');
  if (accCargador) accList.push('CARGADOR');
  if (accAguja) accList.push('AGUJA');

  const newEstado = (estadoTecnico === 'Stock') ? 'Stock' : 'Broken';

  // Actualizar equipo en inventario
  let itemIdx = STATE.inventory.findIndex(r => r.nSerie && r.nSerie.toUpperCase() === nSerie.toUpperCase());
  if (itemIdx >= 0) {
    STATE.inventory[itemIdx].estado = newEstado;
    STATE.inventory[itemIdx].responsable = '';
    STATE.inventory[itemIdx].dni = '';
    STATE.inventory[itemIdx].ubicacion = destino;
    STATE.inventory[itemIdx].observaciones = `Devuelto por ${nombre} (${motivo}) el ${fechaDev} | Estética: ${estetica} | ${obs}`;
    STATE.inventory[itemIdx]._lastAction = newEstado === 'Broken' ? 'Broken' : 'Stock';
    STATE.inventory[itemIdx]._lastActionDate = fechaDev;
    STATE.inventory[itemIdx]._isModified = true;
  }

  const devData = {
    nombre, dni, cargo, area, fechaDevolucion: fechaDev,
    equipoDesc: document.getElementById('qd_equipoDesc').textContent,
    nSerie,
    imei2: (dev && dev.imei2) || '',
    marca: (itemIdx >= 0 ? STATE.inventory[itemIdx].marca : (dev && dev.marca) || 'ZTE'),
    modelo: (itemIdx >= 0 ? STATE.inventory[itemIdx].modelo : (dev && dev.modelo) || 'BLADE A35'),
    motivo, estadoTecnico: newEstado, estetica,
    accProtector, accCargador, accAguja,
    accesoriosStr: accList.join(', ') || 'NINGUNO',
    observaciones: obs
  };

  // Archivar acta de devolución en Módulo 4
  STATE.actasDevolucion.unshift({
    id: Date.now(),
    fecha: fechaDev,
    colaborador: nombre,
    dni,
    cargo,
    equipo: `${devData.marca} ${devData.modelo}`,
    nSerie,
    motivo,
    estadoFinal: newEstado,
    destino
  });

  // Registrar movimiento
  STATE.movements.unshift({
    fecha: fechaDev,
    operacion: 'Devolución',
    equipo: `${devData.marca} ${devData.modelo}`,
    nSerie,
    responsable: nombre,
    oficina: destino,
    estado: newEstado
  });

  persistData();
  refreshAll();
  closeQuickDevolucionModal();
  showToast(`✅ Devolución registrada: ${nSerie} pasó a ${newEstado}`, 'success');

  // Descargar Acta PDF Oficial
  setTimeout(() => {
    printDevolucionPDF(devData);
  }, 400);
}


/* =====================================================
   GESTIÓN DE FUENTES / DOCUMENTACIÓN CARGADA & GOOGLE SHEETS SYNC (v6.0)
   ===================================================== */
function initLoadedSources() {
  if (STATE.isClearedByUser) {
    STATE.loadedSources = [];
    return;
  }
  if (!STATE.loadedSources || STATE.loadedSources.length === 0) {
    if (STATE.inventory && STATE.inventory.length > 0) {
      STATE.loadedSources = [
        {
          id: 'src-oficial-1',
          name: 'Inventario de Oficinas',
          type: 'Archivo Excel Maestro',
          date: 'Base Oficial',
          count: STATE.inventory.length,
          isDefault: true
        }
      ];
    } else {
      STATE.loadedSources = [];
    }
  }
}

function renderLoadedSourcesTable() {
  initLoadedSources();
  const tbody = document.getElementById('loadedSourcesTableBody');
  const badgeEl = document.getElementById('badgeTotalFuentes');
  if (badgeEl) badgeEl.textContent = `${STATE.loadedSources.length} Fuente(s) Activa(s)`;
  if (!tbody) return;

  if (STATE.loadedSources.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No hay fuentes cargadas actualmente. Puedes sincronizar con Google Sheets o cargar archivos Excel.</td></tr>';
    return;
  }

  tbody.innerHTML = STATE.loadedSources.map(src => `
    <tr>
      <td><strong>${esc(src.name)}</strong></td>
      <td><span class="badge" style="background:#eff6ff;color:#2563eb;font-weight:600">${esc(src.type)}</span></td>
      <td>${esc(src.date)}</td>
      <td><strong>${src.count}</strong> equipos</td>
      <td><span class="badge" style="background:#dcfce7;color:#166534;font-weight:700">Activo</span></td>
      <td>
        <button class="btn btn-sm btn-outline" style="background:#fee2e2;color:#991b1b;border:none;font-weight:700" onclick="deleteSource('${src.id}')" title="Eliminar esta documentación">
          Eliminar
        </button>
      </td>
    </tr>
  `).join('');
}

function deleteSource(sourceId) {
  const src = (STATE.loadedSources || []).find(s => s.id === sourceId);
  const srcName = src ? src.name : 'Documentación Activa';
  const srcCount = src ? src.count : (STATE.inventory || []).length;

  showConfirm(
    'Eliminar Documentación',
    `¿Estás seguro de eliminar "<strong>${esc(srcName)}</strong>"?<br><br>Se removerán <strong>${srcCount} equipos</strong> asociados de la base de datos para que puedas cargar tu archivo actualizado.`,
    () => {
      clearAllInventoryData(true);
      showToast(`Documentación "${srcName}" eliminada correctamente. La base está lista para nuevos datos.`, 'info');
    }
  );
}

function confirmResetAllInventory() {
  showConfirm(
    '🧹 Vaciar Base de Datos',
    '¿Deseas <strong>limpiar todos los datos del inventario</strong> para subir un archivo Excel más actualizado?<br><br>Esta acción dejará la base limpia en blanco para que subas tu nuevo archivo sin mezclar datos anteriores.',
    () => {
      clearAllInventoryData(true);
      showToast('🧹 Base de datos limpiada. Ya puedes subir tu archivo actualizado.', 'success');
      navigateTo('importar');
    }
  );
}

// ---- Google Sheets Multiple Links UI ----
let secondarySheetCounter = 0;

function addSecondarySheetInput() {
  secondarySheetCounter++;
  const container = document.getElementById('secondarySheetsContainer');
  if (!container) return;

  const div = document.createElement('div');
  div.id = `secSheetRow_${secondarySheetCounter}`;
  div.style.cssText = 'display:flex;gap:8px;align-items:center';
  div.innerHTML = `
    <input type="url" class="search-input secondary-sheet-input" style="flex:1;font-size:13px" placeholder="https://docs.google.com/spreadsheets/d/OTRA_HOJA/edit..." />
    <button type="button" class="btn btn-sm btn-outline" style="color:#dc2626;border-color:#fca5a5" onclick="removeSecondarySheetInput('${div.id}')" title="Quitar este enlace">✕</button>
  `;
  container.appendChild(div);
}

function removeSecondarySheetInput(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ---- Google Sheets Sync & Deduplication Engine ----
async function fetchSheetCSVViaProxy(url) {
  const cleanUrl = url.trim();
  const resp = await fetch(`/api/sync-sheet?url=${encodeURIComponent(cleanUrl)}`);
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Error al consultar enlace (${resp.status})`);
  }
  const data = await resp.json();
  if (!data.success || !data.csv) {
    throw new Error('No se recibió contenido CSV de la hoja');
  }
  return data.csv;
}

function mapCSVRowsToInventory(rows, sourceName, sourceId) {
  return rows.map((r, i) => {
    const keys = Object.keys(r);
    const findVal = (patterns) => {
      for (const k of keys) {
        const cleanK = k.toUpperCase().trim();
        for (const p of patterns) {
          if (cleanK.includes(p)) return (r[k] || '').trim();
        }
      }
      return '';
    };

    const imei1 = findVal(['IMEI 1', 'IMEI1', 'IMEI']);
    const imei2 = findVal(['IMEI 2', 'IMEI2']);
    const nSerie = findVal(['SERIE', 'CODIGO', 'SN', 'NRO SERIE']) || imei1 || `SN-GS-${String(i+1).padStart(4, '0')}`;
    const marca = findVal(['MARCA', 'BRAND']) || 'Generico';
    const modelo = findVal(['MODELO', 'MODEL', 'DESCRIPCION']) || 'Equipo';
    const categoriaRaw = findVal(['CATEGORIA', 'TIPO', 'RUBRO']);
    const estadoRaw = findVal(['ESTADO', 'STATUS', 'CONDICION']) || 'Stock';
    const ubicacion = findVal(['UBICACION', 'OFICINA', 'SEDE', 'PISO']) || 'Almacén Central';
    const responsable = findVal(['RESPONSABLE', 'USUARIO', 'COLABORADOR', 'ASIGNADO']) || '';
    const dni = findVal(['DNI', 'DOCUMENTO']) || '';
    const fechaCompra = findVal(['FECHA', 'COMPRA', 'ENTREGA']) || '';
    const observaciones = findVal(['OBSERVACION', 'OBS', 'NOTA', 'OBSERVACIONES']) || '';

    // Deducir categoría
    let categoria = normalizeCategoria(categoriaRaw);
    if (!categoriaRaw) {
      if (imei1 || nSerie.includes('TLF') || marca.toUpperCase().includes('REDMI') || marca.toUpperCase().includes('ZTE') || marca.toUpperCase().includes('HONOR')) {
        categoria = 'Teléfonos / Corporativos';
      } else if (marca.toUpperCase().includes('DELL') || marca.toUpperCase().includes('HP') || marca.toUpperCase().includes('LENOVO')) {
        categoria = 'Computadoras';
      }
    }

    return {
      nSerie,
      marca,
      modelo,
      categoria,
      estado: normalizeEstado(estadoRaw),
      ubicacion,
      responsable,
      dni,
      imei1,
      imei2,
      fechaCompra,
      observaciones,
      _sourceName: sourceName,
      _sourceId: sourceId
    };
  }).filter(item => item.nSerie && item.nSerie !== '-');
}

async function syncGoogleSheets() {
  const mainInput = document.getElementById('sheetMainUrl');
  const mainUrl = mainInput ? mainInput.value.trim() : '';
  if (!mainUrl) {
    showToast('Por favor ingresa el Enlace Principal de Google Sheets', 'warning');
    if (mainInput) mainInput.focus();
    return;
  }

  const secondaryInputs = Array.from(document.querySelectorAll('.secondary-sheet-input'))
    .map(inp => inp.value.trim())
    .filter(Boolean);

  const btn = document.getElementById('btnSyncGoogleSheets');
  const resultBox = document.getElementById('sheetSyncResultBox');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sincronizando y contrastando datos...';
  }

  try {
    // 1. Descargar y parsear Enlace Principal (Prioridad 1)
    const mainCSV = await fetchSheetCSVViaProxy(mainUrl);
    const parsedMain = parseCSV(mainCSV);
    const mainItems = mapCSVRowsToInventory(parsedMain.rows, 'Google Sheet Principal', 'src-gsheet-main');

    // 2. Descargar y parsear Enlaces Secundarios
    const secondaryItemsLists = [];
    for (let i = 0; i < secondaryInputs.length; i++) {
      try {
        const secCSV = await fetchSheetCSVViaProxy(secondaryInputs[i]);
        const parsedSec = parseCSV(secCSV);
        const secItems = mapCSVRowsToInventory(parsedSec.rows, `Enlace Secundario ${i+1}`, `src-gsheet-sec-${i+1}`);
        secondaryItemsLists.push({ name: `Enlace Secundario ${i+1}`, id: `src-gsheet-sec-${i+1}`, items: secItems });
      } catch (secErr) {
        console.warn(`Error al sincronizar enlace secundario ${i+1}:`, secErr);
        showToast(`Advertencia: Enlace secundario ${i+1} no pudo leerse (${secErr.message})`, 'warning');
      }
    }

    // 3. Fusión y Deduplicación Estricta
    const consolidated = [];
    const seenMap = new Map();
    let duplicatesCount = 0;
    let secondaryAddedCount = 0;

    function buildKey(item) {
      if (item.nSerie && !item.nSerie.startsWith('SN-GS-')) {
        return 'S:' + item.nSerie.trim().toUpperCase();
      }
      if (item.imei1) {
        return 'I:' + item.imei1.trim();
      }
      return 'M:' + (item.marca||'').trim().toUpperCase() + '|' + (item.modelo||'').trim().toUpperCase() + '|' + (item.ubicacion||'').trim().toUpperCase();
    }

    // A) Procesar primero el enlace Principal (Prevalece siempre)
    mainItems.forEach(item => {
      const key = buildKey(item);
      if (!seenMap.has(key)) {
        seenMap.set(key, item);
        consolidated.push(item);
      } else {
        duplicatesCount++;
      }
    });

    // B) Incorporar registros no duplicados de las hojas secundarias
    secondaryItemsLists.forEach(secGroup => {
      let groupAdded = 0;
      secGroup.items.forEach(item => {
        const key = buildKey(item);
        if (seenMap.has(key)) {
          // Ya existe en la Principal o en otra previa: descartar como duplicado
          duplicatesCount++;
        } else {
          seenMap.set(key, item);
          consolidated.push(item);
          secondaryAddedCount++;
          groupAdded++;
        }
      });
      secGroup.contributed = groupAdded;
    });

    // 4. Actualizar Estado Global
    STATE.inventory = consolidated;
    STATE.filtered = [...consolidated];
    STATE.isClearedByUser = false;

    // Actualizar registro de fuentes activas
    STATE.loadedSources = [
      {
        id: 'src-gsheet-main',
        name: 'Google Sheet Principal (Base Maestra)',
        type: 'Google Sheets Oficial',
        date: new Date().toLocaleDateString('es-PE'),
        count: mainItems.length,
        isDefault: false
      }
    ];

    secondaryItemsLists.forEach(sec => {
      if (sec.contributed > 0) {
        STATE.loadedSources.push({
          id: sec.id,
          name: `${sec.name} (Alimentación Histórica)`,
          type: 'Google Sheets Secundario',
          date: new Date().toLocaleDateString('es-PE'),
          count: sec.contributed,
          isDefault: false
        });
      }
    });

    refreshAll();

    // 5. Mostrar informe en caja de resultados
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <strong style="color:#166534;font-size:14px">Sincronización y Comparación Completada con Éxito</strong>
          <span class="badge" style="background:#dcfce7;color:#166534;font-weight:700">Actualizado</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:10px">
          <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #cbd5e1">
            <span style="font-size:11px;color:var(--text-muted);display:block">Enlace Principal:</span>
            <strong style="font-size:18px;color:#2563eb">${mainItems.length}</strong> <span style="font-size:11px">equipos</span>
          </div>
          <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #cbd5e1">
            <span style="font-size:11px;color:var(--text-muted);display:block">Incorporados de Secundarios:</span>
            <strong style="font-size:18px;color:#16a34a">${secondaryAddedCount}</strong> <span style="font-size:11px">equipos nuevos</span>
          </div>
          <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #cbd5e1">
            <span style="font-size:11px;color:var(--text-muted);display:block">Duplicados Descartados:</span>
            <strong style="font-size:18px;color:#dc2626">${duplicatesCount}</strong> <span style="font-size:11px">repetidos</span>
          </div>
          <div style="background:#fff;padding:10px;border-radius:6px;border:1.5px solid #2563eb">
            <span style="font-size:11px;color:#2563eb;font-weight:700;display:block">Data Total Real Consolidada:</span>
            <strong style="font-size:20px;color:#1e40af">${consolidated.length}</strong> <span style="font-size:11px">equipos únicos</span>
          </div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin:0">
          Los registros del enlace principal se mantuvieron intactos como base oficial. El panel general y las oficinas reflejan ahora la data exacta deduplicada.
        </p>
      `;
    }

    showToast(`Sincronización completada: ${consolidated.length} equipos reales consolidados`, 'success');
    setTimeout(() => navigateTo('dashboard'), 1200);
  } catch (err) {
    console.error('Error en syncGoogleSheets:', err);
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <div style="color:#b91c1c;font-size:13px;font-weight:600;margin-bottom:8px">Error durante la sincronización</div>
        <div style="font-size:12px;color:#374151;line-height:1.6">${esc(err.message)}</div>
      `;
    }
    showToast(`Error al sincronizar: ${err.message}`, 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sincronizar y Comparar Hojas de Google';
    }
  }
}


/* =====================================================
   FILTROS RÁPIDOS Y BÚSQUEDA DE INVENTARIO (v7.0)
   ===================================================== */
let INVENTORY_CARD_QUERY = '';

function handleInventoryCardSearch(val) {
  if (val !== undefined) INVENTORY_CARD_QUERY = val.trim().toLowerCase();
  SEGMENT_PAGES.Asignados = 1;
  SEGMENT_PAGES.Stock = 1;
  SEGMENT_PAGES.Broken = 1;
  renderInventoryViews();
}

function clearInventoryCardSearch() {
  INVENTORY_CARD_QUERY = '';
  const input = document.getElementById('invCardSearch');
  if (input) input.value = '';
  const estSelect = document.getElementById('invFilterEstadoCard');
  if (estSelect) estSelect.value = '';
  const offSelect = document.getElementById('invFilterOffice');
  if (offSelect) offSelect.value = '';
  CURRENT_INVENTORY_OFFICE = '';
  SEGMENT_PAGES.Asignados = 1;
  SEGMENT_PAGES.Stock = 1;
  SEGMENT_PAGES.Broken = 1;
  renderInventoryViews();
}

/* =====================================================
   COMPARTIR ENLACE NGROK (SILENCIOSO SIN VENTANAS NEGRAS)
   ===================================================== */
async function openShareModal() {
  const modal = document.getElementById('shareModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const loading = document.getElementById('shareLoadingState');
  const ready = document.getElementById('shareReadyState');
  const errDiv = document.getElementById('shareErrorState');

  if (loading) loading.style.display = 'none';
  if (ready) ready.style.display = 'none';
  if (errDiv) errDiv.style.display = 'none';

  // 1. Cargar dirección de Red Local de inmediato
  try {
    const netRes = await fetch('/api/network-info');
    const netData = await netRes.json();
    const localInput = document.getElementById('shareLocalUrlInput');
    if (localInput && netData.localUrl) {
      localInput.value = netData.localUrl;
    }
  } catch (e) {
    const localInput = document.getElementById('shareLocalUrlInput');
    if (localInput) localInput.value = window.location.origin;
  }

  // 2. Verificar estado de túnel ngrok
  try {
    const res = await fetch('/api/ngrok-status');
    const data = await res.json();
    if (data && data.running && data.url) {
      showShareReady(data.url);
      return;
    }
  } catch (e) {}

  startNgrokFromUI();
}

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (modal) modal.style.display = 'none';
}

function copyShareLocalUrl() {
  const input = document.getElementById('shareLocalUrlInput');
  const btn = document.getElementById('btnCopyLocalUrl');
  if (!input || !input.value) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value).then(() => {
      if (btn) btn.textContent = '✅ Copiado!';
      setTimeout(() => { if (btn) btn.textContent = '📋 Copiar'; }, 2500);
      showToast('Enlace de red local copiado al portapapeles', 'success');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('Enlace de red local copiado', 'success');
    });
  } else {
    input.select();
    document.execCommand('copy');
    showToast('Enlace de red local copiado', 'success');
  }
}

function showShareReady(url) {
  const loading = document.getElementById('shareLoadingState');
  const ready = document.getElementById('shareReadyState');
  const errDiv = document.getElementById('shareErrorState');
  const input = document.getElementById('shareUrlInput');
  const openLink = document.getElementById('shareOpenDirectLink');

  loading.style.display = 'none';
  errDiv.style.display = 'none';
  ready.style.display = 'block';

  if (input) input.value = url;
  if (openLink) openLink.href = url;
}

async function startNgrokFromUI() {
  const loading = document.getElementById('shareLoadingState');
  const ready = document.getElementById('shareReadyState');
  const errDiv = document.getElementById('shareErrorState');
  const errMsg = document.getElementById('shareErrorMsg');

  loading.style.display = 'block';
  ready.style.display = 'none';
  errDiv.style.display = 'none';

  try {
    const res = await fetch('/api/ngrok-start');
    const data = await res.json();
    if (data.url) {
      showShareReady(data.url);
      showToast('Enlace de ngrok generado con éxito', 'success');
    } else {
      loading.style.display = 'none';
      errDiv.style.display = 'block';
      if (errMsg) errMsg.textContent = data.error || 'No se pudo generar el túnel';
    }
  } catch (err) {
    loading.style.display = 'none';
    errDiv.style.display = 'block';
    if (errMsg) errMsg.textContent = 'Error de conexión con el servidor: ' + err.message;
  }
}

async function stopNgrokFromUI() {
  try {
    await fetch('/api/ngrok-stop');
    const ready = document.getElementById('shareReadyState');
    if (ready) ready.style.display = 'none';
    closeShareModal();
    showToast('Túnel de ngrok detenido', 'info');
  } catch (e) {
    showToast('Error al detener túnel', 'error');
  }
}

function copyShareUrl() {
  const input = document.getElementById('shareUrlInput');
  const btn = document.getElementById('btnCopyShareUrl');
  if (!input || !input.value) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value).then(() => {
      btn.textContent = '✅ Copiado!';
      setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2500);
      showToast('Enlace copiado al portapapeles', 'success');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      btn.textContent = '✅ Copiado!';
      setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2500);
      showToast('Enlace copiado', 'success');
    });
  } else {
    input.select();
    document.execCommand('copy');
    btn.textContent = '✅ Copiado!';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2500);
    showToast('Enlace copiado', 'success');
  }
}


/* =====================================================
   ETIQUETAS QR – Generador e Impresión en Masa
   ===================================================== */

// Set of currently selected QR label IDs
const _qrSelected = new Set();

/**
 * Genera un SVG de código QR offline usando ZXing (zxing.min.js).
 * @param {string} text  Contenido del QR
 * @param {number} size  Dimensión en píxeles del SVG (default 80)
 * @returns {string} SVG HTML string, o cadena vacía si falla
 */
function generateQRCodeSVG(text, size = 80) {
  try {
    if (typeof ZXing !== 'undefined' && ZXing.QRCodeWriter) {
      const writer = new ZXing.QRCodeWriter();
      const matrix = writer.encode(text, ZXing.BarcodeFormat.QR_CODE, size, size, new Map());
      const w = matrix.getWidth(), h = matrix.getHeight();
      let p = '';
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (matrix.get(x, y)) p += `M${x},${y}h1v1h-1z `;
        }
      }
      return `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${size}" shape-rendering="crispEdges" style="display:block"><rect width="${w}" height="${h}" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;
    }
  } catch (e) {
    console.error('QR generation error:', e);
  }
  // Fallback: placeholder box
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block"><rect width="${size}" height="${size}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#6b7280">QR</text></svg>`;
}

/**
 * Determina el tipo de dispositivo de una fila del inventario.
 * Retorna 'phone', 'pc' o 'other'.
 */
function _qrDeviceType(row) {
  const cat = (row.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (cat.includes('telefono') || cat.includes('corporativo') || cat.includes('celular') || cat.includes('movil')) return 'phone';
  if (cat.includes('computadora') || cat.includes('laptop') || cat.includes('pc')) return 'pc';
  return 'other';
}

/**
 * Paginación y estado del generador de etiquetas QR A4
 */
let _qrCurrentPage = 1;
const QR_PER_PAGE = 24;

/**
 * Puebla el <select> de oficinas en el panel QR con las oficinas reales del inventario.
 */
function populateQROfficeFilter() {
  const sel = document.getElementById('qrFilterOficina');
  if (!sel) return;
  const offices = [...new Set(
    STATE.inventory.map(r => (r.oficina || r.area || '').trim()).filter(Boolean)
  )].sort();
  const current = sel.value;
  const existingValues = Array.from(sel.options).map(o => o.value).filter(Boolean);
  if (existingValues.length === offices.length && existingValues.every((v, i) => v === offices[i])) {
    return;
  }
  sel.innerHTML = '<option value="">Todas las oficinas</option>' +
    offices.map(o => `<option value="${o}"${o === current ? ' selected' : ''}>${o}</option>`).join('');
}

/**
 * Puente entre el <select> visible de Categoría (qrCatSelect) y el hidden qrFilterCategoria.
 */
function setQRCatFilterFromSelect(selEl) {
  _qrCurrentPage = 1;
  const val = selEl ? selEl.value : '';
  const hidden = document.getElementById('qrFilterCategoria');
  if (hidden) hidden.value = val === 'all' ? '' : val;
  updateQRPillCountBadge(val);
  renderQRLabelsView();
}
window.setQRCatFilterFromSelect = setQRCatFilterFromSelect;

function updateQRPillCountBadge(catVal) {
  const badge = document.getElementById('pillCountBadge');
  if (!badge) return;
  const v = (catVal === undefined || catVal === null) ? (document.getElementById('qrCatSelect')?.value || 'all') : catVal;
  const count = STATE.inventory.filter(row => {
    if (!v || v === 'all') return true;
    const cat = (row.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (v === 'telefono') return cat.includes('telefono') || cat.includes('corporativo') || cat.includes('celular');
    if (v === 'computadora') return cat.includes('computadora') || cat.includes('laptop') || cat.includes('pc');
    if (v === 'electrodomestico') return cat.includes('electrodomestico') || cat.includes('inmueble') || cat.includes('mobiliario');
    return true;
  }).length;
  badge.textContent = count;
}

/** Cambia de hoja en la vista previa de etiquetas QR */
function qrChangePage(delta) {
  _qrCurrentPage += delta;
  renderQRLabelsView();
}
window.qrChangePage = qrChangePage;

/** Obtiene la lista filtrada de equipos para etiquetas QR */
function _getFilteredQREquipos() {
  const catFilter    = (document.getElementById('qrFilterCategoria')?.value || '').toLowerCase();
  const estadoFilter = document.getElementById('qrFilterEstado')?.value || '';
  const oficinaFilter = (document.getElementById('qrFilterOficina')?.value || '').trim();
  const searchVal    = (document.getElementById('qrFilterSearch')?.value || '').toLowerCase().trim();

  return STATE.inventory.filter(row => {
    const cat = (row.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (catFilter && catFilter !== 'all') {
      if (catFilter === 'telefono' && !cat.includes('telefono') && !cat.includes('corporativo') && !cat.includes('celular')) return false;
      if (catFilter === 'computadora' && !cat.includes('computadora') && !cat.includes('laptop') && !cat.includes('pc')) return false;
      if (catFilter === 'electrodomestico' && !cat.includes('electrodomestico') && !cat.includes('inmueble') && !cat.includes('mobiliario')) return false;
    }
    if (estadoFilter) {
      const st = normalizeEstado(row.estado, row);
      if (st !== estadoFilter) return false;
    }
    if (oficinaFilter) {
      const rowOficina = (row.oficina || row.area || '').trim();
      if (rowOficina !== oficinaFilter) return false;
    }
    if (searchVal) {
      const hay = [row.codigo, row.nSerie, row.imei1, row.imei2, row.marca, row.modelo, row.responsable, row.dni]
        .map(v => (v || '').toLowerCase()).join(' ');
      if (!hay.includes(searchVal)) return false;
    }
    return true;
  });
}

function _renderQRCardHtml(row, sizePreset) {
  const id = row.codigo || row.nSerie || row.imei1 || (Math.random().toString(36).slice(2));
  const devType = sizePreset === 'auto' ? _qrDeviceType(row) : sizePreset;
  const isPhone = devType === 'phone';
  const qrSize  = isPhone ? 72 : 88;
  const labelClass = isPhone ? 'qr-label-phone' : 'qr-label-pc';
  const qrContent = row.codigo || row.nSerie || row.imei1 || id;
  const svgHtml   = generateQRCodeSVG(qrContent, qrSize);
  const isSelected = !_qrSelected.size || _qrSelected.has(id);

  const catTag = isPhone ? '📱 Teléfono' : (devType === 'pc' ? '💻 Computadora' : '📦 Equipo');
  const estado = normalizeEstado(row.estado, row);
  const estadoColor = estado === 'Asignado' ? '#16a34a' : (estado === 'Stock' ? '#2563eb' : '#dc2626');

  return `
<div class="qr-label-card ${labelClass} ${isSelected ? '' : 'qr-unselected'}"
     id="qrlabel-${id}"
     onclick="toggleQRSelect('${id}', this)"
     title="Clic para seleccionar/deseleccionar">
  <div class="qr-label-qr">${svgHtml}</div>
  <div class="qr-label-info">
    <div class="qr-label-code">${qrContent}</div>
    <div class="qr-label-type">${catTag}</div>
    <div class="qr-label-line">${[row.marca, row.modelo].filter(Boolean).join(' ') || '—'}</div>
    ${row.imei1 ? `<div class="qr-label-line" style="font-size:9px">IMEI1: ${row.imei1}</div>` : ''}
    ${row.imei2 ? `<div class="qr-label-line" style="font-size:9px">IMEI2: ${row.imei2}</div>` : ''}
    ${row.nSerie && !isPhone ? `<div class="qr-label-line" style="font-size:9px">S/N: ${row.nSerie}</div>` : ''}
    <div class="qr-label-sep"></div>
    <div class="qr-label-person">${row.responsable || 'Sin Asignar'}</div>
    ${row.dni ? `<div class="qr-label-line" style="font-size:9px">DNI: ${row.dni}</div>` : ''}
    ${row.oficina || row.area ? `<div class="qr-label-line" style="font-size:9px">${row.oficina || row.area}</div>` : ''}
    <div class="qr-label-status" style="color:${estadoColor};font-weight:700;font-size:9px;margin-top:2px">${estado}</div>
  </div>
</div>`;
}

/**
 * Renderiza el grid de etiquetas QR aplicando los filtros del panel y paginación.
 */
function renderQRLabelsView() {
  const container = document.getElementById('qrPrintContainer');
  if (!container) return;

  // Sincronizar select visible de categoría → hidden
  const catSelectEl = document.getElementById('qrCatSelect');
  const catHiddenEl = document.getElementById('qrFilterCategoria');
  if (catSelectEl && catHiddenEl && !catHiddenEl._manualSet) {
    const v = catSelectEl.value;
    catHiddenEl.value = v === 'all' ? '' : v;
  }

  // Actualizar opciones de oficina y conteo de badge
  populateQROfficeFilter();
  updateQRPillCountBadge();

  const items = _getFilteredQREquipos();
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / QR_PER_PAGE));
  if (_qrCurrentPage > totalPages) _qrCurrentPage = totalPages;
  if (_qrCurrentPage < 1) _qrCurrentPage = 1;

  // Conteo total en barra
  const countBadge = document.getElementById('qrCountBadge');
  if (countBadge) countBadge.textContent = `${totalItems} etiqueta${totalItems !== 1 ? 's' : ''}`;

  // Actualizar estimación de páginas A4 y selección
  _updateQRSelectedCount(totalItems);

  // Actualizar paginadores de texto y botones
  const pageText = `Hoja ${_qrCurrentPage} / ${totalPages}${totalItems > 0 ? ` (${totalItems} equipos)` : ''}`;
  const pTop = document.getElementById('qrPageInfo');
  const pBottom = document.getElementById('qrPageInfoBottom');
  if (pTop) pTop.textContent = pageText;
  if (pBottom) pBottom.textContent = `Hoja ${_qrCurrentPage} / ${totalPages}`;

  const btnPrev = document.getElementById('qrBtnPrev');
  const btnNext = document.getElementById('qrBtnNext');
  if (btnPrev) btnPrev.disabled = _qrCurrentPage <= 1;
  if (btnNext) btnNext.disabled = _qrCurrentPage >= totalPages;

  if (!totalItems) {
    container.innerHTML = '<div class="empty-state" style="padding:60px 20px"><div class="empty-icon">🏷️</div><h4>Sin equipos para mostrar</h4><p>Ajusta los filtros o carga un archivo de inventario.</p></div>';
    return;
  }

  const sizePreset = document.getElementById('qrSizePreset')?.value || 'auto';
  const startIdx = (_qrCurrentPage - 1) * QR_PER_PAGE;
  const pageItems = items.slice(startIdx, startIdx + QR_PER_PAGE);

  container.innerHTML = pageItems.map(row => _renderQRCardHtml(row, sizePreset)).join('');
}

/** Selecciona / deselecciona todas las etiquetas visibles */
function selectAllQRLabels(select) {
  _qrSelected.clear();
  if (select) {
    document.querySelectorAll('.qr-label-card').forEach(el => {
      const id = el.id.replace('qrlabel-', '');
      _qrSelected.add(id);
      el.classList.remove('qr-unselected');
    });
  } else {
    document.querySelectorAll('.qr-label-card').forEach(el => {
      el.classList.add('qr-unselected');
    });
  }
  _updateQRSelectedCount();
}
window.selectAllQRLabels = selectAllQRLabels;
window.populateQROfficeFilter = populateQROfficeFilter;
window.renderQRLabelsView = renderQRLabelsView;

/** Alterna la selección de una etiqueta individual */
function toggleQRSelect(id, elOrEvent) {
  const el = (elOrEvent instanceof HTMLElement) ? elOrEvent : document.getElementById(`qrlabel-${id}`);
  if (!el) return;
  if (_qrSelected.has(id)) {
    _qrSelected.delete(id);
    el.classList.add('qr-unselected');
  } else {
    _qrSelected.add(id);
    el.classList.remove('qr-unselected');
  }
  _updateQRSelectedCount();
}

function _updateQRSelectedCount() {
  const el = document.getElementById('qrSelectedCount');
  const items = _getFilteredQREquipos();
  const total = items.length;
  const sel = _qrSelected.size ? _qrSelected.size : total;
  if (el) el.textContent = `${sel} seleccionado${sel !== 1 ? 's' : ''}`;

  const pagesEl = document.getElementById('qrPagesEstimate');
  const pages = Math.ceil(sel / QR_PER_PAGE);
  if (pagesEl) pagesEl.textContent = `${pages} hoja${pages !== 1 ? 's' : ''}`;
}

/** Imprime las etiquetas seleccionadas (o todas si ninguna marcada) en hojas A4 */
function printQRLabels() {
  const items = _getFilteredQREquipos();
  const selectedItems = items.filter(row => {
    const id = row.codigo || row.nSerie || row.imei1;
    return !_qrSelected.size || _qrSelected.has(id);
  });
  if (!selectedItems.length) { showToast('No hay etiquetas para imprimir.', 'warning'); return; }

  const container = document.getElementById('qrPrintContainer');
  const sizePreset = document.getElementById('qrSizePreset')?.value || 'auto';

  // Renderizar TODAS las etiquetas seleccionadas temporalmente para el diálogo de impresión
  container.innerHTML = selectedItems.map(row => _renderQRCardHtml(row, sizePreset)).join('');

  window.print();

  // Restaurar la vista paginada tras el diálogo de impresión
  setTimeout(() => {
    renderQRLabelsView();
  }, 1500);
}

/** Descarga las etiquetas como PDF usando jsPDF con formato A4 */
function downloadQRLabelsPDF() {
  const items = _getFilteredQREquipos();
  const selectedItems = items.filter(row => {
    const id = row.codigo || row.nSerie || row.imei1;
    return !_qrSelected.size || _qrSelected.has(id);
  });

  if (!selectedItems.length) { showToast('No hay etiquetas seleccionadas.', 'warning'); return; }

  if (typeof window.jspdf === 'undefined') {
    showToast('jsPDF no disponible. Usa el botón Imprimir y selecciona "Guardar como PDF".', 'info');
    printQRLabels();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297;
  const margin = 10, gap = 4;
  const colW = (pageW - 2 * margin - 2 * gap) / 3; // 3 columnas
  const rowH = 32;
  let col = 0, row = 0;

  selectedItems.forEach((item) => {
    const x = margin + col * (colW + gap);
    const y = margin + row * (rowH + gap);
    if (y + rowH > pageH - margin) { doc.addPage(); row = 0; col = 0; }

    doc.setDrawColor(180); doc.setLineWidth(0.3);
    doc.rect(x, margin + row * (rowH + gap), colW, rowH);

    const code = item.codigo || item.nSerie || item.imei1 || '';
    const desc = [item.marca, item.modelo].filter(Boolean).join(' ') || item.categoria || '';
    const person = item.responsable || 'Sin Asignar';
    const est = normalizeEstado(item.estado, item);

    const ty = margin + row * (rowH + gap);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text(code, x + colW / 2, ty + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text(desc, x + colW / 2, ty + 11, { align: 'center' });
    doc.text(person, x + colW / 2, ty + 16, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(est, x + colW / 2, ty + 21, { align: 'center' });

    col++;
    if (col >= 3) { col = 0; row++; }
  });

  doc.save('etiquetas-qr-inventario.pdf');
  showToast(`PDF generado con ${selectedItems.length} etiquetas.`, 'success');
}


/* ================================================================
   SCROLL SUAVE DEL RIEL DE OFICINAS
   ================================================================ */
function scrollOfficeRail(delta) {
  const el = document.getElementById('officeCardsGrid');
  if (el) {
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }
}
window.scrollOfficeRail = scrollOfficeRail;


/* =====================================================
   CARGA DE DATOS GENÉRICOS DE DEMOSTRACIÓN PÚBLICA
   ===================================================== */
function loadDemoGenericData() {
  const loadPayload = (demo) => {
    STATE.inventory = deduplicateInventory([...demo.inventory]);
    STATE.inventory.forEach(item => { item.estado = normalizeEstado(item.estado, item); });
    STATE.duplicatesRemoved = 0;
    STATE.actasAsignacion = [...(demo.actasAsignacion || [])];
    STATE.actasDevolucion = [...(demo.actasDevolucion || [])];
    STATE.movements = [...(demo.movements || [])];
    STATE.loadedSources = [...(demo.loadedSources || [{
      id: 'src-demo-oficial',
      name: 'Inventario Corporativo Demo (Datos Genéricos)',
      type: 'Base Oficial de Demostración',
      date: new Date().toLocaleDateString('es-PE'),
      count: STATE.inventory.length,
      isDefault: true
    }])];
    STATE.isClearedByUser = false;
    STATE.filtered = [...STATE.inventory];
    STATE.isDemoData = true;

    initLoadedSources();
    renderLoadedSourcesTable();
    refreshAll(true);
    showToast('✨ Base de demostración cargada (75 equipos genéricos listos para mostrar al público)', 'success');
    navigateTo('dashboard');
  };

  if (window.DEMO_INVENTORY_FULL && window.DEMO_INVENTORY_FULL.inventory && window.DEMO_INVENTORY_FULL.inventory.length > 0) {
    loadPayload(window.DEMO_INVENTORY_FULL);
  } else if (window.OFFICIAL_INVENTORY_DATA && window.OFFICIAL_INVENTORY_DATA.length > 0) {
    loadPayload({ inventory: window.OFFICIAL_INVENTORY_DATA });
  } else {
    fetch('/initial_data.json')
      .then(r => r.json())
      .then(data => {
        if (data && data.inventory && data.inventory.length > 0) {
          loadPayload(data);
        } else {
          showToast('No se encontró archivo de datos demo', 'warning');
        }
      })
      .catch(e => {
        showToast('Error cargando demo: ' + e.message, 'danger');
      });
  }
}
window.loadDemoGenericData = loadDemoGenericData;
