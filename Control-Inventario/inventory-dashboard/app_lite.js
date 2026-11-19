
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

/* =====================================================
   INVENTARIO MÓVIL LITE – APP_LITE.JS
   Edición Gratuita / Portable: Escáner y Generación de Actas
   (Sin persistencia de movimientos ni módulos de gestión)
   ===================================================== */

'use strict';

const STATE = {
  inventory: [],
  filtered: [],
  sources: [],
  activeSection: 'escanear',
  scanMode: 'ocr',
  currentLiteDevice: null,
  currentDocType: 'asignacion', // 'asignacion' | 'devolucion'
  lastGeneratedDoc: null,
  html5QrCode: null,
  isScanning: false,
  tesseractWorker: null,
  currentPage: 1,
  pageSize: 15,
  sortCol: '',
  sortDir: 'asc'
};

let SCAN_WIZARD = {
  step: 1, // 1: Producto/Código, 2: IMEI 1, 3: IMEI 2
  idCode: '',
  imei1: '',
  imei2: '',
  foundDevice: null,
  lastScanTime: 0
};

// Tipo de dispositivo que el usuario seleccionó antes de escanear
// 'telefono' = buscar IMEI, 'pc' = buscar S/N, 'auto' = detección automática
let SCAN_DEVICE_TYPE = 'telefono';

function setScanDeviceType(type) {
  SCAN_DEVICE_TYPE = type;
  const btnPhone = document.getElementById('btnDevicePhone');
  const btnPC = document.getElementById('btnDevicePC');
  const hint = document.getElementById('deviceTypeHint');

  const activeStyle = 'padding:10px 8px;border-radius:10px;border:2px solid #2563eb;background:#2563eb;color:#fff;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s';
  const inactiveStyle = 'padding:10px 8px;border-radius:10px;border:2px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s';

  if (type === 'telefono') {
    if (btnPhone) btnPhone.style.cssText = activeStyle;
    if (btnPC) btnPC.style.cssText = inactiveStyle;
    if (hint) { hint.textContent = '📱 Modo: Teléfono — Buscará IMEI'; hint.style.color = '#2563eb'; hint.style.background = '#eff6ff'; }
    // Ajustar instrucción de pasos
    const stepInstr = document.getElementById('scanStepInstruction');
    if (stepInstr) stepInstr.innerHTML = '<span style="font-size:18px">1️⃣</span><span><strong>PASO 1:</strong> Escanea el código de barras o toma foto de la etiqueta del teléfono o caja.</span>';
  } else {
    if (btnPC) btnPC.style.cssText = activeStyle;
    if (btnPhone) btnPhone.style.cssText = inactiveStyle;
    if (hint) { hint.textContent = '💻 Modo: PC / Laptop — Buscará S/N o Código de Barras'; hint.style.color = '#7c3aed'; hint.style.background = '#ede9fe'; }
    const stepInstr = document.getElementById('scanStepInstruction');
    if (stepInstr) stepInstr.innerHTML = '<span style="font-size:18px">1️⃣</span><span><strong>PASO 1:</strong> Escanea el código de barras de la etiqueta trasera de la PC o Laptop.</span>';
  }
}
window.setScanDeviceType = setScanDeviceType;

function resetScanWizard() {
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

function playScanBeep(success = true) {
  try {
    if (navigator.vibrate) navigator.vibrate(success ? [80, 40, 80] : [200]);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = success ? 880 : 330;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

function statusBadge(estado) {
  const norm = String(estado || '').trim().toLowerCase();
  if (norm.includes('stock')) return `<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;padding:2px 8px;border-radius:6px">Stock</span>`;
  if (norm.includes('asig')) return `<span class="badge" style="background:#eff6ff;color:#1d4ed8;font-weight:700;padding:2px 8px;border-radius:6px">Asignado</span>`;
  if (norm.includes('brok') || norm.includes('baja') || norm.includes('dañ')) return `<span class="badge" style="background:#fee2e2;color:#b91c1c;font-weight:700;padding:2px 8px;border-radius:6px">Broken / Baja</span>`;
  return `<span class="badge" style="background:#f1f5f9;color:#475569;font-weight:700;padding:2px 8px;border-radius:6px">${esc(estado || 'Stock')}</span>`;
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

function updateScanWizardUI() {
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
    if (instruction) instruction.innerHTML = `<span style="font-size:18px">1️⃣</span><span><strong>PASO 1:</strong> Escanea el código del <strong>producto / modelo</strong> (o toma foto a la etiqueta).</span>`;
    if (dot1) dot1.style.background = 'var(--primary)';
    if (dot2) dot2.style.background = '#cbd5e1';
    if (dot3) dot3.style.background = '#cbd5e1';
  } else if (SCAN_WIZARD.step === 2) {
    badge.textContent = 'Paso 2: IMEI 1 (teléfono)';
    badge.style.background = '#dcfce7';
    badge.style.color = '#15803d';
    if (instruction) instruction.innerHTML = '<span style="font-size:18px">2⃣</span><span><strong>PASO 2:</strong> Escanea el código <strong>IMEI 1</strong> del teléfono.</span>';
    if (dot1) dot1.style.background = '#16a34a';
    if (dot2) dot2.style.background = 'var(--primary)';
    if (dot3) dot3.style.background = '#cbd5e1';
  } else if (SCAN_WIZARD.step === 3) {
    badge.textContent = 'Paso 3: IMEI 2 (teléfono)';
    badge.style.background = '#fef3c7';
    badge.style.color = '#b45309';
    if (instruction) instruction.innerHTML = '<span style="font-size:18px">3⃣</span><span><strong>PASO 3:</strong> Escanea el código <strong>IMEI 2</strong> del teléfono.</span>';
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

let CURRENT_INVENTORY_CATEGORY = 'Computadoras';
let CURRENT_INVENTORY_VIEW = 'cuadriculas';
let CURRENT_INVENTORY_OFFICE = '';
let INVENTORY_CARD_QUERY = '';
const SEGMENT_PAGES = { Asignados: 1, Stock: 1, Broken: 1 };
const SEGMENT_PAGE_SIZE = 8;

/* =====================================================
   INICIALIZACIÓN
   ===================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupDNIEnter();
  setupDateDefault();

  // Cargar inventario desde el servidor local o initial_data
  await loadInventoryFromServer();

  // Iniciar el escáner por defecto
  setScanMode('ocr');

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

function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-section');
      if (target) navigateTo(target);
    });
  });

  const toggleBtn = document.getElementById('sidebarToggle');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const overlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
  }
  if (mobileBtn && sidebar && overlay) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
}

function navigateToSection(sectionId) {
  navigateTo(sectionId);
}
window.navigateToSection = navigateToSection;
window.navigateTo = navigateTo;

function navigateTo(sectionId) {
  STATE.activeSection = sectionId;

  // Actualizar body classes
  document.body.className = `section-${sectionId}-active`;

  // Actualizar nav items
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-section') === sectionId);
  });
  document.querySelectorAll('.mob-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });

  // Actualizar secciones
  document.querySelectorAll('main .section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${sectionId}`);
  });

  // Título de la página
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    if (sectionId === 'escanear') pageTitle.textContent = 'Escanear Equipo';
    else if (sectionId === 'inventario') pageTitle.textContent = 'Inventario de Equipos';
    else if (sectionId === 'importar') pageTitle.textContent = 'Cargar Archivo y Fuentes';
  }

  if (sectionId === 'inventario') {
    renderInventoryViews();
  }

  // Cerrar menú móvil y desbloquear scroll
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function setupDateDefault() {
  const dateInput = document.getElementById('lite_colab_fecha');
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

/* =====================================================
   CARGA DE BASE DE DATOS
   ===================================================== */
async function loadInventoryFromServer() {
  try {
    const res = await fetch('/api/inventory');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data && data.data.isClearedByUser === true) {
          STATE.inventory = [];
          STATE.sources = [];
          renderLoadedSourcesTable();
          renderInventoryViews();
          showToast('Base de datos vacía', 'info');
          return;
        }
        if (data && data.success && data.data && Array.isArray(data.data.inventory) && data.data.inventory.length > 0) {
        STATE.inventory = data.data.inventory;
        if (data.data.sources && Array.isArray(data.data.sources) && data.data.sources.length > 0) {
          STATE.sources = data.data.sources;
        } else {
          STATE.sources = [{
            nombre: 'Base Consolidada de Equipos',
            tipo: 'Archivo Interno',
            fecha: new Date().toLocaleDateString('es-PE'),
            total: STATE.inventory.length
          }];
        }
        renderLoadedSourcesTable();
        renderInventoryViews();
        showToast(`✅ Base cargada: ${STATE.inventory.length} equipos disponibles`, 'success');
        return;
      }
    }
  } catch (e) {
    console.warn('Servidor local no respondió para /api/inventory, usando fallback local.', e);
  }

  // Fallback a los datos oficiales de initial_data.js
  const officialData = (typeof window !== 'undefined' && window.OFFICIAL_INVENTORY_DATA && Array.isArray(window.OFFICIAL_INVENTORY_DATA))
    ? window.OFFICIAL_INVENTORY_DATA
    : ((typeof INITIAL_INVENTORY !== 'undefined' && Array.isArray(INITIAL_INVENTORY)) ? INITIAL_INVENTORY : []);

  if (officialData.length > 0) {
    STATE.inventory = officialData.slice();
    STATE.sources = [{
      nombre: 'Base Oficial de Equipos (808 Registros)',
      tipo: 'Archivo Base Oficial',
      fecha: new Date().toLocaleDateString('es-PE'),
      total: STATE.inventory.length
    }];
    renderLoadedSourcesTable();
    renderInventoryViews();
    showToast(`✅ Base oficial cargada: ${STATE.inventory.length} equipos activos`, 'success');
  }
}

function renderLoadedSourcesTable() {
  const tbody = document.getElementById('loadedSourcesTableBody');
  const badge = document.getElementById('badgeTotalFuentes');
  if (badge) badge.textContent = `${STATE.sources.length} Fuente(s) Activa(s)`;
  if (!tbody) return;

  if (STATE.sources.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:16px">No hay fuentes cargadas actualmente. Carga un archivo Excel o sincroniza Google Sheets abajo.</td></tr>`;
    return;
  }

  tbody.innerHTML = STATE.sources.map((s, idx) => `
    <tr>
      <td><strong>${esc(s.nombre)}</strong></td>
      <td><span class="badge" style="background:#f1f5f9;color:#475569">${esc(s.tipo || 'Excel')}</span></td>
      <td>${esc(s.fecha || '—')}</td>
      <td><strong style="color:#2563eb">${s.total || STATE.inventory.length}</strong></td>
      <td><span class="badge" style="background:#dcfce7;color:#166534">Activa</span></td>
      <td>
        <button class="btn btn-sm btn-outline" style="background:#fee2e2;color:#991b1b;border:none;font-weight:700;padding:4px 8px;font-size:11px" onclick="deleteSource(${idx})" title="Eliminar esta fuente">
          🗑️ Eliminar
        </button>
      </td>
    </tr>
  `).join('');
}

function deleteSource(sourceIdx) {
  if (sourceIdx < 0 || sourceIdx >= STATE.sources.length) return;
  const src = STATE.sources[sourceIdx];
  if (!confirm(`¿Eliminar la fuente "${src.nombre}"?\n\nSi era la única fuente, el inventario se vaciará para que puedas cargar la nueva base fresca.`)) return;

  if (STATE.sources.length <= 1) {
    STATE.inventory = [];
    STATE.filtered = [];
    STATE.sources = [];
  } else {
    STATE.sources.splice(sourceIdx, 1);
  }
  persistDataLite();
  renderLoadedSourcesTable();
  renderInventoryViews();
  showToast(`Fuente "${src.nombre}" eliminada`, 'info');
}

function confirmResetAllInventory() {
  if (!confirm('🧹 ¿Deseas limpiar todos los registros del inventario para subir un archivo Excel más actualizado?\n\nEsta acción quitará todos los registros actuales para que puedas cargar tu nuevo archivo sin mezclar datos.')) return;

  STATE.inventory = [];
  STATE.filtered = [];
  STATE.sources = [];
  persistDataLite();
  renderLoadedSourcesTable();
  renderInventoryViews();
  showToast('🧹 Base de datos limpiada. Ya puedes subir tu archivo actualizado.', 'success');
  navigateTo('importar');
}

function persistDataLite() {
  try {
    fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inventory: STATE.inventory,
        sources: STATE.sources
      })
    }).catch(e => console.warn('Error sincronizando backend lite:', e));
  } catch (e) {}
}

/* =====================================================
   BÚSQUEDA Y DETECCIÓN DE EQUIPOS
   ===================================================== */

// =====================================================
// CATÁLOGO Y PARSER UNIVERSAL DE ACTIVOS DE CÓMPUTO
// =====================================================
const PC_MODEL_CATALOG = {
  // Lenovo MTM & Familias corporativas
  '10EY': 'ThinkCentre M700z',
  'M700Z': 'ThinkCentre M700z',
  'M700': 'ThinkCentre M700z',
  '10UL': 'ThinkCentre M720q',
  'F0EU': 'IdeaCentre AIO 3',
  '10BC': 'ThinkCentre E73',
  '10AF': 'ThinkCentre M93p',
  '10Q1': 'ThinkCentre M710q',
  '20FM': 'ThinkPad T460',
  '82YU': 'Lenovo V15 G4 AMN',
  '82NB': 'Lenovo V15 G2 ITL',
  '82TT': 'Lenovo V15 G3 IAP',
  'V330': 'Lenovo V330 All-in-One',
  'V310': 'Lenovo V310z All-in-One',
  '3554': 'ThinkCentre Edge 72',
  'M92P': 'ThinkCentre M92p',
  'M82': 'ThinkCentre M82',
  'T460': 'ThinkPad T460',
  
  // Dell
  'OPTIPLEX 9030': 'Dell OptiPlex 9030 AIO',
  'OPTIPLEX 7440': 'Dell OptiPlex 7440 AIO',
  'OPTIPLEX 9020': 'Dell OptiPlex 9020 AIO',
  'OPTIPLEX 9010': 'Dell OptiPlex 9010 AIO',
  'OPTIPLEX 3030': 'Dell OptiPlex 3030 AIO',
  'OPTIPLEX 330': 'Dell OptiPlex 330 AIO',
  '9030': 'Dell OptiPlex 9030 AIO',
  '7440': 'Dell OptiPlex 7440 AIO',

  // HP
  'ELITEONE 800 G1': 'HP EliteOne 800 G1 AiO',
  'ELITEONE 800 G2': 'HP EliteOne 800 G2 AiO',
  'ELITEONE 800': 'HP EliteOne 800 AiO',
  'PROBOOK': 'HP ProBook',
  'ELITEBOOK': 'HP EliteBook'
};

function resolveComputerModel(item) {
  if (!item) return 'ThinkCentre M700z';
  const mod = String(item.modelo || '').trim();
  const ser = String(item.nSerie || item.serie || item.serial || '').trim().toUpperCase();
  const cod = String(item.codigo || item.productCode || '').trim().toUpperCase();
  const obs = String(item.observaciones || '').trim();
  const full = (mod + ' ' + ser + ' ' + cod + ' ' + obs).toUpperCase();

  // 1. Coincidencia por catálogo de prefijos y familias conocidas
  for (const [key, name] of Object.entries(PC_MODEL_CATALOG)) {
    if (full.includes(key)) return name;
  }

  // 2. Coincidencia por prefijo de serie física
  if (ser.startsWith('MJ05') || ser.startsWith('MJ0')) return 'ThinkCentre M700z';
  if (ser.startsWith('MP21') || ser.startsWith('MP29')) return 'IdeaCentre AIO 3';
  if (ser.startsWith('S1H0')) return 'ThinkCentre M720q';
  if (ser.startsWith('MXL')) return 'HP EliteOne 800 AiO';

  // 3. Familias reconocidas directamente en texto
  const mFam = (mod + ' ' + obs).match(/(ThinkCentre(?:\s+[A-Za-z0-9\-_]+)?|ThinkPad(?:\s+[A-Za-z0-9\-_]+)?|IdeaCentre(?:\s+[A-Za-z0-9\-_]+)?|OptiPlex(?:\s+[A-Za-z0-9\-_]+)?|EliteOne(?:\s+[A-Za-z0-9\-_]+)?|Latitude(?:\s+[A-Za-z0-9\-_]+)?|ProBook(?:\s+[A-Za-z0-9\-_]+)?)/i);
  if (mFam && mFam[0].trim()) return mFam[0].trim();

  // 4. Si el modelo actual es un nombre comercial legible (no un código crudo tipo MTM de 10 caracteres)
  if (mod && mod !== '-' && !/^(EQUIPO|PC|DESKTOP|LAPTOP)/i.test(mod) && !/^[A-Z0-9]{10}$/.test(mod)) {
    return mod;
  }

  return 'ThinkCentre M700z';
}
window.resolveComputerModel = resolveComputerModel;
window.PC_MODEL_CATALOG = PC_MODEL_CATALOG;

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
  const mModel = raw.match(/(ThinkCentre(?:\s+[A-Za-z0-9\-_]+)?|ThinkPad(?:\s+[A-Za-z0-9\-_]+)?|IdeaPad(?:\s+[A-Za-z0-9\-_]+)?|IdeaCentre(?:\s+[A-Za-z0-9\-_]+)?|OptiPlex(?:\s+[A-Za-z0-9\-_]+)?|Latitude(?:\s+[A-Za-z0-9\-_]+)?|ProBook(?:\s+[A-Za-z0-9\-_]+)?|EliteBook(?:\s+[A-Za-z0-9\-_]+)?|EliteOne(?:\s+[A-Za-z0-9\-_]+)?|All\s*In\s*One)/i);
  if (mModel) {
    modelo = mModel[1].trim();
    isHardware = true;
  }

  // Machine Type / Model Number / Product ID de computadoras
  const mMtm = raw.match(/(?:Machine Type|Model Number|Product ID|Model)\s*[:\s]*([A-Z0-9\-_]+)/i);
  if (mMtm) {
    if (!productCode) productCode = mMtm[1].trim();
    isHardware = true;
  }

  // Extracción de Serial S/N explícito de etiqueta
  const mSn = raw.match(/(?:S[\\/\\.]?N|SERIAL(?:\s*NO)?|SERIE)\s*[:\s#]*([A-Z0-9\-_]{6,20})/i);
  if (mSn) {
    serial = mSn[1].trim();
    isHardware = true;
  }

  // Formato serial de computadoras Lenovo (MJ..., MP..., PF..., PC...)
  if (!serial) {
    const mLen = upper.match(/\b(M[JP][0-9A-Z]{6}|P[FC][0-9A-Z]{6})\b/);
    if (mLen) {
      marca = marca || 'LENOVO';
      serial = mLen[1];
      isHardware = true;
    }
  }

  // Dell Service Tag (7 caracteres alfanuméricos con letras y números) solo si menciona Dell
  if (!serial && /DELL/i.test(upper)) {
    const mDell = upper.match(/\b([A-Z0-9]{7})\b/);
    if (mDell && /[A-Z]/.test(mDell[1]) && /[0-9]/.test(mDell[1])) {
      marca = 'DELL';
      serial = mDell[1];
      isHardware = true;
    }
  }

  // HP Serial (MXL...)
  if (!serial && /HP|HEWLETT/i.test(upper)) {
    const mHp = upper.match(/\b(MXL[0-9A-Z]{7})\b/);
    if (mHp) {
      marca = 'HP';
      serial = mHp[1];
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

  // Si no se detectó marca pero es hardware, inferir por modelo o serial
  if (isHardware && !marca) {
    if (serial.startsWith('MJ') || serial.startsWith('MP') || serial.startsWith('S1H') || /THINK|IDEA/i.test(modelo)) {
      marca = 'LENOVO';
    } else if (serial.startsWith('MXL') || /ELITE|PROBOOK/i.test(modelo)) {
      marca = 'HP';
    } else if (/OPTIPLEX|LATITUDE/i.test(modelo)) {
      marca = 'DELL';
    }
  }

  // Resolver nombre comercial exacto mediante catálogo y patrones
  const finalModelo = resolveComputerModel({
    modelo: modelo || productCode,
    nSerie: serial,
    productCode: productCode,
    observaciones: raw
  });

  return {
    isHardware,
    marca: marca || (isHardware ? 'LENOVO' : ''),
    modelo: finalModelo,
    serial: serial || upper,
    productCode
  };
}
window.parseHardwareAsset = parseHardwareAsset;

function registerScannedAsset(device) {
  if (!device) return;
  const existing = STATE.inventory.find(i => (i.nSerie && i.nSerie === device.nSerie) || (i.codigo && i.codigo === device.codigo));
  if (!existing) {
    device.isNew = false;
    device.id = device.id || ('PC-' + Date.now().toString().slice(-5));
    STATE.inventory.unshift(device);
    if (typeof persistDataLite === 'function') persistDataLite();
    if (typeof persistData === 'function') persistData();
    if (typeof renderKpis === 'function') renderKpis();
    if (typeof renderChart === 'function') renderChart();
    if (typeof renderTable === 'function') renderTable();
    showToast('✅ ' + (device.categoria || 'Equipo') + ' (' + (device.nSerie || device.codigo) + ') registrado en inventario.', 'success');
  } else {
    showToast('ℹ️ Este equipo ya se encuentra registrado.', 'info');
  }
  closeScanModal();
}
window.registerScannedAsset = registerScannedAsset;

function findInventoryDevice(query) {
  if (!query) return null;
  const raw = String(query).trim();
  if (!raw || raw === '-') return null;

  const q = raw.toLowerCase();
  const numOnly = raw.replace(/\D/g, '');
  const upper = raw.toUpperCase();

  // 1. Coincidencia exacta por Serie, Código o ID (Case Insensitive)
  let match = STATE.inventory.find(item => {
    const s = String(item.nSerie || item.serie || '').trim().toUpperCase();
    const c = String(item.codigo || '').trim().toUpperCase();
    const id = String(item.id || '').trim().toUpperCase();
    return (s && s === upper) || (c && c === upper) || (id && id === upper);
  });
  if (match) return match;

  // 1.1 Si el código es un barcode Lenovo 1S (ej. 1S10EYA05U00MJ05BWEL)
  if (upper.startsWith('1S') && upper.length >= 16) {
    const lenovoSerial = upper.slice(-8);
    match = STATE.inventory.find(item => {
      const s = String(item.nSerie || item.serie || '').trim().toUpperCase();
      const c = String(item.codigo || '').trim().toUpperCase();
      return (s && s === lenovoSerial) || (c && c.includes(lenovoSerial)) || (c && c === upper);
    });
    if (match) return match;
  }

  // 1.2 Búsqueda cruzada de seriales de computadoras dentro de códigos largos
  if (upper.length >= 6) {
    match = STATE.inventory.find(item => {
      const s = String(item.nSerie || item.serie || '').trim().toUpperCase();
      if (!s || s.length < 5) return false;
      return upper.includes(s) || s.includes(upper);
    });
    if (match) return match;
  }

  // 2. Coincidencia exacta por IMEI (solo si es numérico)
  if (numOnly.length >= 10) {
    match = STATE.inventory.find(item => {
      const im1 = String(item.imei1 || '').replace(/\D/g, '');
      const im2 = String(item.imei2 || '').replace(/\D/g, '');
      if (im1 && (im1 === numOnly || (numOnly.length >= 14 && im1.includes(numOnly)))) return true;
      if (im2 && (im2 === numOnly || (numOnly.length >= 14 && im2.includes(numOnly)))) return true;
      return false;
    });
    if (match) return match;

    if (numOnly.length >= 14) {
      match = STATE.inventory.find(item => {
        const obs = String(item.observaciones || '');
        return obs.includes(numOnly);
      });
      if (match) {
        if (!match.imei1) {
          const m1 = (match.observaciones || '').match(/IMEI\s*1\s*:\s*([0-9]{14,16})/i);
          if (m1) match.imei1 = m1[1];
        }
        if (!match.imei2) {
          const m2 = (match.observaciones || '').match(/IMEI\s*2\s*:\s*([0-9]{14,16})/i);
          if (m2) match.imei2 = m2[1];
        }
        return match;
      }
    }
  }

  // 3. Coincidencia exacta por IMEI 1 o 2 en texto
  match = STATE.inventory.find(item => {
    const i1 = String(item.imei1 || '').trim().toLowerCase();
    const i2 = String(item.imei2 || '').trim().toLowerCase();
    return (i1 && i1 === q) || (i2 && i2 === q);
  });
  if (match) return match;

  return null;
}

// Búsqueda inteligente de sugerencias similares si hubo error de OCR o de tipeo
function findSimilarInventoryDevices(query, limit = 3) {
  if (!query) return [];
  const rawDigits = String(query).replace(/\D/g, '');
  if (rawDigits.length < 8) return [];

  const results = [];
  for (const item of STATE.inventory) {
    const im1 = String(item.imei1 || '').replace(/\D/g, '');
    const im2 = String(item.imei2 || '').replace(/\D/g, '');
    
    // Comparar coincidencia posicional
    let bestMatch = 0;
    let matchedImei = '';
    [im1, im2].forEach(im => {
      if (!im || im.length < 8) return;
      let count = 0;
      for (let i = 0; i < Math.min(rawDigits.length, im.length); i++) {
        if (rawDigits[i] === im[i]) count++;
      }
      if (count > bestMatch) {
        bestMatch = count;
        matchedImei = im;
      }
    });

    if (bestMatch >= 10 || (rawDigits.length >= 14 && bestMatch >= rawDigits.length - 3)) {
      results.push({ item, matchChars: bestMatch, matchedImei });
    }
  }

  results.sort((a, b) => b.matchChars - a.matchChars);
  return results.slice(0, limit);
}

function showScanResult(row, code) {
  stopCamera();
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

  // Si aún no hay IMEIs, consultar OFFICIAL_INVENTORY_DATA
  if (!displayImei1 && typeof window !== 'undefined' && Array.isArray(window.OFFICIAL_INVENTORY_DATA)) {
    const officialMatch = window.OFFICIAL_INVENTORY_DATA.find(x =>
      (x.nSerie && x.nSerie === row.nSerie) || (x.codigo && x.codigo === row.codigo)
    );
    if (officialMatch) {
      if (officialMatch.imei1) displayImei1 = officialMatch.imei1;
      if (officialMatch.imei2) displayImei2 = officialMatch.imei2;
      if (!row.color || row.color === '-' || row.color === '—') row.color = officialMatch.color;
      if (!row.modelo || /^Color:\s*/i.test(row.modelo)) row.modelo = officialMatch.modelo;
    }
  }

  // Limpieza de modelo si contiene "Color: ..."
  let displayModelo = row.modelo || '';
  if (/^Color:\s*/i.test(displayModelo) || !displayModelo || displayModelo === '-') {
    displayModelo = (row.marca && row.marca !== 'GENÉRICO') ? row.marca : 'SMARTPHONE CORPORATIVO';
    if (displayImei1) {
      const tac = displayImei1.slice(0, 8);
      if (typeof TAC_CATALOG !== 'undefined' && TAC_CATALOG[tac] && TAC_CATALOG[tac].modelo) {
        displayModelo = TAC_CATALOG[tac].modelo;
      }
    }
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

  // Sincronizar en el objeto row
  row.imei1 = displayImei1;
  row.imei2 = displayImei2;
  row.modelo = displayModelo;
  row.color = displayColor;

  const isComputer = (row.categoria === 'Computadoras' || /laptop|pc|desktop|thinkcentre|thinkpad|all in one/i.test((row.categoria || '') + ' ' + (row.modelo || '') + ' ' + (row.tipo || '')));
  const isPhone = !isComputer && (row.categoria === 'Teléfonos móviles' || (displayImei1 && displayImei1 !== '-'));

  if (isComputer) {
    displayModelo = resolveComputerModel(row);
    row.modelo = displayModelo;
  }

  const isNewDevice = !!row.isNew;

  // Detección rigurosa de si el equipo está asignado a un colaborador o si es Stock/Broken
  const respUpper = String(row.responsable || '').trim().toUpperCase();
  const dniUpper = String(row.dni || '').trim().toUpperCase();
  const estUpper = String(row.estado || '').trim().toUpperCase();

  const isNonPerson = ['STOCK', 'BROKEN', '-', 'NO ASIGNADO', 'VACIO', '', '—'].includes(respUpper) ||
                      ['STOCK', 'BROKEN', '-', '', '—'].includes(dniUpper);
  const isAssigned = !isNewDevice && (estUpper === 'ASIGNADO' || estUpper === 'OPERATIVO') && !isNonPerson && row.responsable && row.responsable !== '-';
  const isBroken = !isNewDevice && (estUpper === 'BROKEN' || respUpper === 'BROKEN' || dniUpper === 'BROKEN');
  const isStock = !isNewDevice && !isAssigned && !isBroken;

  // Badge superior
  let topBadgeHtml = '';
  if (isNewDevice) {
    topBadgeHtml = `<div class="scan-resp-badge" style="background:#f59e0b;color:#fff;font-weight:700">🟡 EQUIPO NUEVO / NO REGISTRADO EN INVENTARIO</div>`;
  } else if (isAssigned) {
    topBadgeHtml = `<div class="scan-resp-badge" style="background:#2563eb;color:#fff;font-weight:700">🔵 EQUIPO ASIGNADO A COLABORADOR</div>`;
  } else if (isStock) {
    topBadgeHtml = `<div class="scan-resp-badge" style="background:#059669;color:#fff;font-weight:700">🟢 DISPONIBLE EN STOCK (NO ASIGNADO)</div>`;
  } else {
    topBadgeHtml = `<div class="scan-resp-badge" style="background:#dc2626;color:#fff;font-weight:700">🔴 EQUIPO AVERIADO / BROKEN</div>`;
  }

  // Sección de Colaborador / Estado
  let colabBoxHtml = '';
  if (isNewDevice) {
    colabBoxHtml = `
      <div class="scan-resp-box" style="border-left: 4px solid #f59e0b; background: #fffbeb; border: 1px solid #fde68a; border-left-width: 4px;">
        <h4 class="scan-resp-title" style="color: #b45309; font-weight: 700; margin-bottom: 6px;">ℹ️ ESTADO: PENDIENTE DE REGISTRO EN EL SISTEMA</h4>
        <div style="font-size:13px; color:#92400e; line-height: 1.5; margin-bottom: 6px;">
          Este equipo fue identificado mediante el código de fabricante (TAC) y lectura de etiqueta, pero <strong>aún no está registrado en la base de datos oficial</strong> de la empresa.
        </div>
        <div style="font-size:12px; color:#b45309;">
          📍 Custodia: <strong>ALMACÉN CENTRAL</strong> | Disponibilidad: <strong>SIN REGISTRAR</strong>
        </div>
      </div>
    `;
  } else if (isAssigned) {
    colabBoxHtml = `
      <div class="scan-resp-box" style="border-left: 4px solid #2563eb; background: #f8fafc; border: 1px solid #cbd5e1; border-left-width: 4px;">
        <h4 class="scan-resp-title" style="color: #1e40af; font-weight: 700; margin-bottom: 8px;">👤 DATOS DEL COLABORADOR ASIGNADO</h4>
        <div class="scan-resp-grid" style="color: #334155;">
          <div><label style="color:#64748b;font-weight:600">Colaborador / Titular:</label> <span style="font-size:15px; font-weight:800; color:#1d4ed8;">${esc(row.responsable)}</span></div>
          <div><label style="color:#64748b;font-weight:600">DNI:</label> <span style="font-size:15px; font-weight:800; color:#0f172a;">${esc(row.dni || '—')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Área / Ubicación:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.area || row.ubicacion || '—')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Supervisor:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.supervisor || '—')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Puesto / Cargo:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.puesto || (isPhone ? 'ASESOR / COLABORADOR' : 'OPERACIONES'))}</span></div>
          <div><label style="color:#64748b;font-weight:600">Fecha Registro:</label> <span style="font-weight:700; color:#1e293b;">${esc(row.fechaCompra || new Date().toISOString().slice(0, 10))}</span></div>
        </div>
      </div>
    `;
  } else if (isStock) {
    colabBoxHtml = `
      <div class="scan-resp-box" style="border-left: 4px solid #059669; background: #f0fdf4; border: 1px solid #bbf7d0; border-left-width: 4px;">
        <h4 class="scan-resp-title" style="color: #047857; font-weight: 700; margin-bottom: 6px;">📦 ESTADO: DISPONIBLE EN STOCK (SIN ASIGNAR)</h4>
        <div style="font-size:13px; color:#334155; line-height: 1.5; margin-bottom: 8px;">
          Este equipo se encuentra en almacén o custodia técnica y <strong>no está asignado a ningún colaborador</strong> actualmente.
        </div>
        <div class="scan-resp-grid" style="color: #334155;">
          <div><label style="color:#64748b;font-weight:600">Ubicación / Custodia:</label> <span style="font-weight:800; color:#0f172a;">${esc(row.ubicacion || 'ALMACÉN CENTRAL')}</span></div>
          <div><label style="color:#64748b;font-weight:600">Disponibilidad:</label> <span style="color:#059669; font-weight:800;">OPERATIVO / LISTO PARA ENTREGA</span></div>
        </div>
      </div>
    `;
  } else {
    colabBoxHtml = `
      <div class="scan-resp-box" style="border-left: 4px solid #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-left-width: 4px;">
        <h4 class="scan-resp-title" style="color: #b91c1c; font-weight: 700; margin-bottom: 6px;">⚠️ ESTADO: INOPERATIVO / BROKEN</h4>
        <div style="font-size:13px; color:#475569; line-蹤: 1.5;">
          Este equipo está reportado como dañado o dado de baja técnica en: <strong style="color:#0f172a;">${esc(row.ubicacion || 'ALMACÉN')}</strong>.
        </div>
      </div>
    `;
  }

  // Barra de acciones contextual según si está Asignado o en Stock
  // IMPORTANTE: Si el equipo es isNew (no registrado en inventario), la Lite NO muestra botones de acción
  let actionsBarHtml = '';
  if (isNewDevice) {
    // Equipo no registrado: solo alerta profesional + cerrar (versión Lite no puede registrar)
    actionsBarHtml = `
      <div class="scan-actions-bar" style="display:flex;gap:10px;flex-direction:column;width:100%;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:14px">
        <div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:8px;padding:12px;font-size:13px;color:#92400e;line-height:1.5">
          <strong>⚠️ Equipo no registrado en la base de datos oficial.</strong><br>
          Los datos mostrados (marca, modelo, color) provienen del código del fabricante (TAC) y lectura OCR. Para asignarlo a un colaborador o imprimir actas, primero debe ser registrado formalmente en la versión completa por el administrador.
        </div>
        <button class="btn btn-outline" style="width:100%;padding:12px" onclick="closeScanModal()">
          Cerrar
        </button>
      </div>
    `;
  } else if (isAssigned) {
    actionsBarHtml = `
      <div class="scan-actions-bar" style="display:flex;gap:10px;flex-direction:column;width:100%;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:14px">
        <button class="btn btn-primary" style="width:100%;padding:12px;font-size:14px;font-weight:700" onclick='closeScanModal();openLiteDocModal(${JSON.stringify(row).replace(/'/g, "&#39;")}, "asignacion")'>
          🔄 Reasignar a Personal (Acta Oficial PDF)
        </button>
        <button class="btn btn-warning" style="width:100%;padding:12px;font-size:14px;font-weight:700" onclick='closeScanModal();openLiteDocModal(${JSON.stringify(row).replace(/'/g, "&#39;")}, "devolucion")'>
          ↩️ Registrar Devolución (PDF)
        </button>
        <button class="btn btn-outline" style="width:100%;padding:12px" onclick="closeScanModal()">
          Cerrar
        </button>
      </div>
    `;
  } else if (isStock) {
    actionsBarHtml = `
      <div class="scan-actions-bar" style="display:flex;gap:10px;flex-direction:column;width:100%;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:14px">
        <button class="btn btn-success" style="width:100%;padding:12px;font-size:14px;font-weight:700;background:#059669;border-color:#059669;color:#fff" onclick='closeScanModal();openLiteDocModal(${JSON.stringify(row).replace(/'/g, "&#39;")}, "asignacion")'>
          📝 Asignar a Colaborador (Acta Oficial)
        </button>
        <button class="btn btn-outline" style="width:100%;padding:12px" onclick="closeScanModal()">
          Cerrar
        </button>
      </div>
    `;
  } else {
    actionsBarHtml = `
      <div class="scan-actions-bar" style="display:flex;gap:10px;flex-direction:column;width:100%;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:14px">
        <button class="btn btn-outline" style="width:100%;padding:12px" onclick="closeScanModal()">
          Cerrar Ficha
        </button>
      </div>
    `;
  }

  if (modal) {
    const scanModalBody = document.getElementById('scanModalBody');
    if (scanModalBody) {
      scanModalBody.innerHTML = `
        <!-- Cabecera de la ficha -->
        <div class="scan-responsiva-header">
          ${topBadgeHtml}
          <h3 style="margin:6px 0 2px;font-size:18px;color:#ffffff">${esc(row.marca || '')} ${esc(displayModelo)}</h3>
          <div style="font-size:12px;color:#cbd5e1">Estado: <strong style="color:#fff;">${isNewDevice ? 'NO REGISTRADO EN EL SISTEMA' : esc(row.estado)}</strong> | Ubicación: <strong style="color:#fff;">${esc(row.ubicacion || 'Almacén')}</strong></div>
        </div>

        <!-- Secciones idénticas al formato oficial -->
        <div class="scan-resp-sections">
          <!-- 1. INFORMACIÓN DEL COLABORADOR / ESTADO -->
          ${colabBoxHtml}

          <!-- 2. INFORMACIÓN Y CARACTERÍSTICAS TÉCNICAS DEL EQUIPO -->
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
              <div><label style="color:#64748b;font-weight:600">Accesorios / Cargador:</label> <span style="font-weight:700; color:#0f172a;">${esc(row.accesorios || (row.cargador === 'SI' ? 'CARGADOR INCLUIDO' : 'EQUIPO SOLO'))}</span></div>
              <div><label style="color:#64748b;font-weight:600">Ubicación / Oficina:</label> <span style="font-weight:700; color:#0f172a;">${esc(row.ubicacion || 'ALMACÉN')}</span></div>
            </div>
          </div>
        </div>

        ${actionsBarHtml}
      `;
    }
    modal.style.display = 'flex';
  }

  // Actualizar también la tarjeta lateral de resultado con formato inteligente y botones 100% responsivos
  const resultBody = document.getElementById('scanResultBody');
  const resultTitle = document.getElementById('scanResultTitle');
  if (resultTitle) resultTitle.textContent = isNewDevice ? '⚠️ No Registrado' : (isAssigned ? '✅ Equipo Asignado' : (isStock ? '📦 Equipo en Stock' : '⚠️ Equipo Broken'));
  if (resultBody) {
    const badgeColor = isNewDevice ? '#f59e0b' : (isAssigned ? '#2563eb' : (isStock ? '#059669' : '#dc2626'));
    const badgeText = isNewDevice ? '🟡 NO REGISTRADO' : (isAssigned ? '🔵 ASIGNADO' : (isStock ? '🟢 EN STOCK' : '🔴 BROKEN'));
    
    resultBody.innerHTML = `
      <div style="background:#eff6ff;border:1.5px solid ${badgeColor};border-radius:12px;padding:16px;box-sizing:border-box;width:100%">
        <!-- Estado y Ubicación -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <span class="badge" style="background:${badgeColor};color:#fff;font-weight:700;padding:4px 10px;border-radius:6px;font-size:12px">${badgeText}</span>
          <span style="font-size:12px;font-weight:700;color:#1e40af;background:#dbeafe;padding:3px 8px;border-radius:6px;word-break:break-word">📍 ${esc(row.ubicacion || 'ALMACÉN CENTRAL')}</span>
        </div>

        <!-- Título del Equipo -->
        <h4 style="margin:0 0 10px;color:#0f172a;font-size:16px;line-height:1.3;word-break:break-word">
          ${isComputer ? '💻' : '📱'} ${esc(row.marca)} ${esc(displayModelo)}
        </h4>

        <!-- Bloque de Identificación Técnica (solo lo esencial) -->
        <div style="background:#0f172a;border:1.5px solid #38bdf8;border-radius:8px;padding:10px 12px;margin-bottom:12px">
          ${isComputer ? `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span style="font-size:12px;font-weight:700;color:#94a3b8">💻 S/N:</span>
              <strong style="font-family:monospace;font-size:13px;color:#38bdf8;word-break:break-all">${esc(row.nSerie || row.serie || '—')}</strong>
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:6px">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <span style="font-size:12px;font-weight:700;color:#94a3b8">📶 IMEI 1:</span>
                <strong style="font-family:monospace;font-size:13px;color:#38bdf8;word-break:break-all">${esc(displayImei1 || '—')}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid #1e293b;padding-top:4px">
                <span style="font-size:12px;font-weight:700;color:#94a3b8">📶 IMEI 2:</span>
                <strong style="font-family:monospace;font-size:13px;color:#38bdf8;word-break:break-all">${esc(displayImei2 || '—')}</strong>
              </div>
            </div>
          `}
        </div>

        ${isNewDevice ? `
        <!-- Aviso: No registrado en inventario -->
        <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:6px;padding:10px;margin-bottom:12px;font-size:12px;color:#92400e;line-height:1.4">
          <strong>⚠️ No registrado en el inventario oficial.</strong><br>
          Identificado mediante código de fabricante (TAC). En versión Lite no se pueden dar de alta nuevos equipos.
        </div>
        ` : `
        <!-- Atributos Detallados -->
        <div style="font-size:12px;color:#334155;display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #e2e8f0;padding-bottom:4px">
            <span style="color:#64748b;font-weight:600">Estado Técnico:</span>
            <span>${statusBadge(row.estado)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #e2e8f0;padding-bottom:4px">
            <span style="color:#64748b;font-weight:600">Color:</span>
            <span style="font-weight:700;color:#0f172a">${esc(displayColor)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #e2e8f0;padding-bottom:4px">
            <span style="color:#64748b;font-weight:600">Responsable:</span>
            <span style="font-weight:700;color:${isAssigned ? '#1d4ed8' : '#059669'};text-align:right;max-width:65%;word-break:break-word">
              ${esc(isAssigned ? row.responsable : 'NO ASIGNADO (EN STOCK)')}
            </span>
          </div>
          ${isAssigned && row.dni && row.dni !== '-' ? `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:#64748b;font-weight:600">DNI:</span>
            <span style="font-weight:700;font-family:monospace;color:#0f172a">${esc(row.dni)}</span>
          </div>
          ` : ''}
        </div>
        `}

        <!-- Botones de Acción: solo para equipos registrados -->
        <div class="scan-result-card-actions" style="display:flex;flex-direction:column;gap:8px;width:100%">
          ${isNewDevice ? `
          <button class="btn btn-outline" style="width:100%;font-size:13px;padding:10px 12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;background:#ffffff" onclick="closeScanModal()">
            Cerrar
          </button>
          ` : `
          <button class="btn btn-primary" style="width:100%;font-size:13px;padding:11px 12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box" onclick='openLiteDocModal(${JSON.stringify(row).replace(/'/g, "&#39;")})'>
            📄 Generar Acta Oficial PDF
          </button>
          <button class="btn btn-outline" style="width:100%;font-size:13px;padding:10px 12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;background:#ffffff" onclick='showScanResult(${JSON.stringify(row).replace(/'/g, "&#39;")})'>
            📋 Ver Ficha Completa
          </button>
          `}
        </div>
      </div>
    `;
  }
}

function closeScanModal() {
  const modal = document.getElementById('scanModal');
  if (modal) modal.style.display = 'none';
  unlockBodyScroll();
}


/* =====================================================
   MODAL DE AVISO PROFESIONAL: MODO INCORRECTO (MISMATCH)
   ===================================================== */
let PENDING_MISMATCH_ACTION = null;

function showModeMismatchModal(mismatchType, data, rawCode) {
  stopCamera();
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
    const pcModelo = resolveComputerModel(data);
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
      btnSwitch.innerHTML = '💻 Cambiar a modo PC / Laptop y Procesar';
      btnSwitch.onclick = () => {
        closeModeMismatchModal();
        setScanDeviceType('pc');
        if (data && data.isHardware) {
          processHardwareAssetDetected(data, rawCode || pcSerial);
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
      btnSwitch.innerHTML = '📱 Cambiar a modo Teléfono y Procesar';
      btnSwitch.onclick = () => {
        closeModeMismatchModal();
        setScanDeviceType('telefono');
        if (data && data.imei1) {
          processPhoneAssetDetected(data, rawCode || phoneImei);
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

function processHardwareAssetDetected(hw, rawCode) {
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
    modelo: resolveComputerModel(hw),
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

function processPhoneAssetDetected(data, rawCode) {
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

function processScannedCode(code) {
  if (!code) return;
  const cleanCode = String(code).trim();
  if (!cleanCode) return;

  const now = Date.now();
  if (SCAN_WIZARD.lastScanTime && (now - SCAN_WIZARD.lastScanTime < 800)) {
    return;
  }
  SCAN_WIZARD.lastScanTime = now;

  const currentMode = (typeof SCAN_DEVICE_TYPE !== 'undefined') ? SCAN_DEVICE_TYPE : 'telefono';
  const cleanDigits = cleanCode.replace(/\D/g, '');
  const isImeiDigits = cleanDigits.length === 15 || cleanDigits.length === 14 || cleanDigits.length === 16;

  // 1. ANÁLISIS DE ACTIVO DE HARDWARE (PC / LAPTOP)
  const hw = parseHardwareAsset(cleanCode);
  const isHardwareAsset = hw && hw.isHardware;

  // 2. VERIFICACIÓN DE INCONSISTENCIA DE MODO (MISMATCH)
  if (currentMode === 'telefono' && isHardwareAsset) {
    // El usuario está en modo Teléfono pero escaneó un código de PC / Laptop
    playScanBeep(false);
    showModeMismatchModal('pc_detected_in_phone_mode', hw, cleanCode);
    return;
  }

  if (currentMode === 'pc' && isImeiDigits && !isHardwareAsset) {
    // El usuario está en modo PC pero escaneó un código IMEI de teléfono
    playScanBeep(false);
    showModeMismatchModal('phone_detected_in_pc_mode', { imei1: cleanDigits, marca: 'Teléfono', modelo: 'Celular' }, cleanCode);
    return;
  }

  // 3. COINCIDENCIA DIRECTA EN LA BASE DE DATOS
  const directMatch = findInventoryDevice(cleanCode);
  if (directMatch) {
    const isDirectComp = (directMatch.categoria === 'Computadoras' || /laptop|pc|desktop|thinkcentre/i.test((directMatch.categoria||'')+' '+(directMatch.modelo||'')));
    if (currentMode === 'telefono' && isDirectComp) {
      playScanBeep(false);
      showModeMismatchModal('pc_detected_in_phone_mode', directMatch, cleanCode);
      return;
    }
    if (currentMode === 'pc' && !isDirectComp) {
      playScanBeep(false);
      showModeMismatchModal('phone_detected_in_pc_mode', directMatch, cleanCode);
      return;
    }

    playScanBeep(true);
    showToast('🎯 ' + (directMatch.categoria || 'Equipo') + ' reconocido: ' + (directMatch.marca || '') + ' ' + (directMatch.modelo || '') + ' (' + (directMatch.nSerie || directMatch.codigo) + ')', 'success');
    showScanResult(directMatch, cleanCode);
    resetScanWizard();
    return;
  }

  // 4. SI EL MODO ES PC / LAPTOP:
  if (currentMode === 'pc') {
    if (isHardwareAsset) {
      processHardwareAssetDetected(hw, cleanCode);
      return;
    }
    // Si no se reconoció el código de PC
    playScanBeep(true);
    const customPC = {
      nSerie: cleanCode,
      codigo: cleanCode,
      serie: cleanCode,
      marca: 'LENOVO',
      modelo: 'ThinkCentre M700z',
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
      observaciones: 'Código escaneado: ' + cleanCode,
      isNew: true
    };
    showScanResult(customPC, cleanCode);
    resetScanWizard();
    return;
  }

  // 5. SI EL MODO ES TELÉFONO:
  if (currentMode === 'telefono') {
    if (isImeiDigits) {
      // Es un IMEI directo
      playScanBeep(true);
      let autoMarca = 'BMOBILE';
      let autoModelo = 'ROCKET A1';
      let autoColor = 'CELESTE';
      let autoCosto = 'S/. 197.00';

      const tac = cleanDigits.slice(0, 8);
      if (typeof TAC_CATALOG !== 'undefined' && TAC_CATALOG[tac]) {
        autoMarca = TAC_CATALOG[tac].marca || autoMarca;
        autoModelo = TAC_CATALOG[tac].modelo || autoModelo;
        autoColor = TAC_CATALOG[tac].color || autoColor;
        autoCosto = TAC_CATALOG[tac].costo || autoCosto;
      }

      const customPhone = {
        nSerie: cleanDigits,
        imei1: cleanDigits,
        imei2: '',
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

      showToast('📱 Teléfono identificado por IMEI (' + cleanDigits + ')', 'success');
      showScanResult(customPhone, cleanDigits);
      resetScanWizard();
      return;
    }

    // Código UPC/EAN de la caja (ej. 817342010075 de 12 o 13 dígitos)
    // NO saltar a paso 2 ni bloquear el dashboard: orientar al usuario claramente
    playScanBeep(false);
    showToast('ℹ️ Código de caja detectado (' + cleanCode + '). Enfoca el código de barras del IMEI (15 dígitos) o toma foto completa con "Foto OCR".', 'info');
    return;
  }
}

/* =====================================================
   MODAL DE DOCUMENTO OFICIAL LITE (PREVIEW + PRINT)
   ===================================================== */
function openLiteDocModal(device) {
  STATE.currentLiteDevice = Object.assign({}, device);

  // Ficha técnica
  const titleEl = document.getElementById('lite_eq_title');
  const serieEl = document.getElementById('lite_eq_serie');
  const imei1El = document.getElementById('lite_eq_imei1');
  const imei2El = document.getElementById('lite_eq_imei2');
  const colorEl = document.getElementById('lite_eq_color');
  const ubEl = document.getElementById('lite_eq_ubicacion');

  const isComp = (device.categoria === 'Computadoras' || /laptop|pc|desktop|thinkcentre|thinkpad|all in one/i.test((device.categoria||'')+' '+(device.modelo||'')+' '+(device.tipo||'')));
  if (titleEl) titleEl.textContent = ((device.marca || '') + ' ' + (device.modelo || '')).trim() || 'EQUIPO';
  if (serieEl) serieEl.textContent = device.nSerie || device.serie || device.imei1 || '—';
  if (imei1El) imei1El.textContent = isComp ? (device.nSerie || device.serie || '—') : (device.imei1 || '—');
  if (imei2El) imei2El.textContent = isComp ? (device.codigo || device.nSerie || '—') : (device.imei2 || '—');
  if (colorEl) colorEl.textContent = (device.color && device.color !== '-') ? device.color : '—';
  if (ubEl) ubEl.textContent = device.ubicacion || 'ALMACÉN CENTRAL';

  // Llenar campos de colaborador
  const nombreInput = document.getElementById('lite_colab_nombre');
  const dniInput = document.getElementById('lite_colab_dni');
  const puestoInput = document.getElementById('lite_colab_puesto');
  const areaInput = document.getElementById('lite_colab_area');
  const superInput = document.getElementById('lite_colab_supervisor');
  const fechaInput = document.getElementById('lite_colab_fecha');

  if (nombreInput) nombreInput.value = device.responsable && device.responsable !== 'NO ASIGNADO' ? device.responsable : '';
  if (dniInput) dniInput.value = device.dni && device.dni !== '—' ? device.dni : '';
  if (puestoInput) puestoInput.value = device.puesto || (device.categoria === 'Teléfonos móviles' ? 'ASESOR / COLABORADOR' : 'OPERACIONES');
  if (areaInput) areaInput.value = device.area || device.ubicacion || 'OPERACIONES';
  if (superInput) superInput.value = device.supervisor || 'SUPERVISOR DIRECTO';
  if (fechaInput && !fechaInput.value) fechaInput.value = new Date().toISOString().slice(0, 10);
  const colorSelect = document.getElementById('lite_colab_color');
  if (colorSelect && device.color && device.color !== '-') {
    colorSelect.value = device.color.toUpperCase();
  }

  // Determinar tipo inicial de documento
  // Si ya tiene un responsable asignado, sugerir devolución o asignación
  if (device.responsable && device.responsable !== 'NO ASIGNADO' && device.responsable !== '-') {
    setLiteDocType('devolucion', false);
  } else {
    setLiteDocType('asignacion', false);
  }

  // En móviles, iniciar por defecto en la pestaña de Formulario para facilitar edición
  setLiteDocTab('form');

  // Mostrar modal
  const modal = document.getElementById('liteDocModal');
  if (modal) {
    modal.style.display = 'flex';
    lockBodyScroll();
  }
  // Generar y renderizar vista previa PDF en vivo
  updateLitePdfPreview();
}

function setLiteDocTab(tab) {
  const modal = document.getElementById('liteDocModal');
  const tabForm = document.getElementById('tabDocForm');
  const tabPreview = document.getElementById('tabDocPreview');

  if (modal) {
    modal.classList.remove('modal-show-form', 'modal-show-preview');
    modal.classList.add(tab === 'preview' ? 'modal-show-preview' : 'modal-show-form');
  }

  if (tabForm && tabPreview) {
    if (tab === 'preview') {
      tabPreview.style.background = '#2563eb';
      tabPreview.style.color = '#fff';
      tabForm.style.background = 'transparent';
      tabForm.style.color = '#94a3b8';
      // Forzar regeneración si se pasó a vista previa
      updateLitePdfPreview();
    } else {
      tabForm.style.background = '#2563eb';
      tabForm.style.color = '#fff';
      tabPreview.style.background = 'transparent';
      tabPreview.style.color = '#94a3b8';
    }
  }
}

function closeLiteDocModal() {
  const modal = document.getElementById('liteDocModal');
  if (modal) modal.style.display = 'none';
  unlockBodyScroll();
  const iframe = document.getElementById('litePdfPreviewFrame');
  if (iframe) iframe.src = 'about:blank';
}

function setLiteDocType(type, shouldUpdate = true) {
  STATE.currentDocType = type;
  const btnAsignar = document.getElementById('btnDocTypeAsignar');
  const btnDevolver = document.getElementById('btnDocTypeDevolver');
  const rowSupervisor = document.getElementById('lite_row_supervisor');
  const rowMotivo = document.getElementById('lite_row_motivo');

  if (type === 'asignacion') {
    if (btnAsignar) {
      btnAsignar.style.background = '#2563eb';
      btnAsignar.style.color = '#ffffff';
    }
    if (btnDevolver) {
      btnDevolver.style.background = '#e2e8f0';
      btnDevolver.style.color = '#334155';
    }
    if (rowSupervisor) rowSupervisor.style.display = 'block';
    if (rowMotivo) rowMotivo.style.display = 'none';
  } else {
    if (btnDevolver) {
      btnDevolver.style.background = '#d97706';
      btnDevolver.style.color = '#ffffff';
    }
    if (btnAsignar) {
      btnAsignar.style.background = '#e2e8f0';
      btnAsignar.style.color = '#334155';
    }
    if (rowSupervisor) rowSupervisor.style.display = 'none';
    if (rowMotivo) rowMotivo.style.display = 'block';
  }

  if (shouldUpdate) {
    updateLitePdfPreview();
  }
}

/* =====================================================
   GENERACIÓN Y VISUALIZACIÓN DEL PDF EN VIVO
   ===================================================== */
function buildCurrentPdfDocument() {
  if (!STATE.currentLiteDevice) return null;
  const item = STATE.currentLiteDevice;

  const nombre = (document.getElementById('lite_colab_nombre')?.value || item.responsable || 'NO ASIGNADO').trim();
  const dni = (document.getElementById('lite_colab_dni')?.value || item.dni || '—').trim();
  const puesto = (document.getElementById('lite_colab_puesto')?.value || item.puesto || 'ASESOR / COLABORADOR').trim();
  const area = (document.getElementById('lite_colab_area')?.value || item.area || item.ubicacion || 'OPERACIONES').trim();
  const fecha = document.getElementById('lite_colab_fecha')?.value || new Date().toISOString().slice(0, 10);
  const supervisor = (document.getElementById('lite_colab_supervisor')?.value || item.supervisor || 'SUPERVISOR DIRECTO').trim();
  const motivo = (document.getElementById('lite_colab_motivo')?.value || 'CAMBIO DE EQUIPO').trim();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  if (STATE.currentDocType === 'asignacion') {
    // FORMATO OFICIAL: ACTA DE ASIGNACIÓN / RESPONSIVA
    const isPhone = (item.categoria === 'Teléfonos móviles' || !!item.imei1);
    const primaryTitle = isPhone ? 'ACTA DE ENTREGA DE EQUIPO TELEFÓNICO CORPORATIVO' : 'ACTA DE ENTREGA Y ASIGNACIÓN DE EQUIPO';
    const serieOrImei = item.imei1 || item.nSerie || '—';
    const imei2 = item.imei2 || '—';
    const marca = item.marca || '—';
    const modelo = item.modelo || '—';
    const costo = item.costo || 'S/. 197.00';
    const accesorios = item.accesorios || (item.cargador === 'SI' ? 'CARGADOR Y PROTECTOR' : 'EQUIPO COMPLETO');
    const color = (item.color && item.color !== '-') ? item.color : '—';

    // Header Corporativo
    doc.setFillColor(15, 23, 42); // Slate dark 900
    doc.rect(0, 0, 210, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(primaryTitle, 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`CONTROL PATRIMONIAL Y ASIGNACIÓN 2026  |  CÓDIGO: ${item.nSerie || serieOrImei}`, 14, 17);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE')}`, 160, 17);

    let y = 28;

    // Sección 1: DATOS DEL COLABORADOR RECEPTOR
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
          { content: nombre, styles: { fontStyle: 'bold', width: 65 } },
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

    // Sección 2: INFORMACIÓN Y CARACTERÍSTICAS DEL EQUIPO
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
          { content: 'IMEI 1:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: item.imei1 || serieOrImei, styles: { fontStyle: 'bold' } },
          { content: 'IMEI 2:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: imei2 },
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

    // Sección 3: DECLARACIÓN DE RESPONSABILIDAD
    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, 182, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DECLARACIÓN DE RESPONSABILIDAD Y POLÍTICAS DE USO:', 16, y + 4);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);

    const clausulas = [
      '1. El colaborador asume la custodia, conservación y uso exclusivamente laboral de los activos asignados.',
      '2. En caso de pérdida, sustracción o daño por negligencia, el colaborador comunicará formalmente a TI en menos de 24 horas.',
      '3. El equipo deberá ser restituido de forma inmediata al término del vínculo contractual o requerimiento de la empresa.'
    ];

    clausulas.forEach(c => {
      doc.text(c, 14, y);
      y += 4;
    });

    const signY = Math.max(y + 8, 252);

    // Firmas Oficiales
    doc.setDrawColor(100, 116, 139);
    doc.line(16, signY, 68, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('FIRMA DEL RECEPTOR', 25, signY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(nombre.substring(0, 32), 16, signY + 8);
    doc.text(`DNI: ${dni}`, 16, signY + 11.5);

    doc.line(78, signY, 130, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CONFORMIDAD TI / SUPERVISOR', 83, signY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(supervisor.substring(0, 32), 78, signY + 8);
    doc.text('Sello y V°B°', 78, signY + 11.5);

    doc.line(140, signY, 192, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ÁREA LOGÍSTICA / RRHH', 148, signY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('Control y Entrega de Activo', 140, signY + 8);
    doc.text(`Fecha: ${fecha}`, 140, signY + 11.5);

  } else {
    // FORMATO OFICIAL: ACTA DE DEVOLUCIÓN DE CORPORATIVO
    const isPhone = (item.categoria === 'Teléfonos móviles' || !!item.imei1);
    const primaryTitle = 'DEVOLUCIÓN DE CORPORATIVO';
    const serieOrImei = item.imei1 || item.nSerie || '—';
    const imei2 = item.imei2 || '—';
    const marca = item.marca || '—';
    const modelo = item.modelo || '—';
    const color = (item.color && item.color !== '-') ? item.color : '—';

    doc.setFillColor(180, 83, 9); // Amber / Naranja oscuro
    doc.rect(0, 0, 210, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(primaryTitle, 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(254, 243, 199);
    doc.text(`ACTA OFICIAL DE RECEPCIÓN Y VERIFICACIÓN TÉCNICA 2026`, 14, 17);
    doc.text(`Fecha: ${fecha}`, 160, 17);

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
          { content: nombre, styles: { fontStyle: 'bold', width: 65 } },
          { content: 'CARGO:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199], width: 35 } },
          { content: puesto || '—', styles: { width: 47 } }
        ],
        [
          { content: 'DNI:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: dni, styles: { fontStyle: 'bold' } },
          { content: 'ÁREA:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: area || '—' }
        ],
        [
          { content: 'MOTIVO:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: motivo, styles: { fontStyle: 'bold' } },
          { content: 'FECHA DEVOLUCIÓN:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: fecha, styles: { fontStyle: 'bold' } }
        ]
      ]
    });

    y = doc.lastAutoTable.finalY + 4;

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
          { content: marca, styles: { width: 45 } },
          { content: 'MODELO:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199], width: 35 } },
          { content: modelo, styles: { width: 67 } }
        ],
        [
          { content: 'IMEI 1:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: item.imei1 || serieOrImei, styles: { fontStyle: 'bold' } },
          { content: 'ESTADO TÉCNICO:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: item.estado || 'OPERATIVO' }
        ],
        [
          { content: 'IMEI 2:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: imei2 || '—' },
          { content: 'COLOR:', styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
          { content: color }
        ]
      ]
    });

    y = doc.lastAutoTable.finalY + 4;

    // Sección 3: OBSERVACIONES Y CHECKLIST
    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, 182, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('OBSERVACIONES Y ESTADO DE RECEPCIÓN:', 16, y + 4);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`[✓] Equipo enciende correctamente.  [✓] Pantalla y carcasa en buen estado.  [✓] Sin cuentas bloqueadas.`, 14, y);

    const signY = Math.max(y + 12, 252);

    doc.setDrawColor(100, 116, 139);
    doc.line(16, signY, 68, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('FIRMA DEL COLABORADOR', 22, signY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(nombre.substring(0, 32), 16, signY + 8);
    doc.text(`DNI: ${dni}`, 16, signY + 11.5);

    doc.line(78, signY, 130, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('REVISIÓN TÉCNICA (TI)', 88, signY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('Área de Sistemas / Soporte', 78, signY + 8);
    doc.text('Conforme sin observaciones', 78, signY + 11.5);

    doc.line(140, signY, 192, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ÁREA LOGÍSTICA / ALMACÉN', 146, signY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('Recepción y Custodia de Activo', 140, signY + 8);
    doc.text(`Fecha: ${fecha}`, 140, signY + 11.5);
  }

  STATE.lastGeneratedDoc = doc;
  return doc;
}

function updateLitePdfPreview() {
  try {
    const item = STATE.currentLiteDevice || {};
    const nombre = (document.getElementById('lite_colab_nombre')?.value || item.responsable || 'NO ASIGNADO').trim();
    const dni = (document.getElementById('lite_colab_dni')?.value || item.dni || '—').trim();
    const puesto = (document.getElementById('lite_colab_puesto')?.value || item.puesto || 'ASESOR / OPERACIONES').trim();
    const area = (document.getElementById('lite_colab_area')?.value || item.area || item.ubicacion || 'OFICINA').trim();
    const fecha = document.getElementById('lite_colab_fecha')?.value || new Date().toISOString().slice(0, 10);
    const supervisor = (document.getElementById('lite_colab_supervisor')?.value || item.supervisor || 'SUPERVISOR DIRECTO').trim();
    const motivo = (document.getElementById('lite_colab_motivo')?.value || 'DEVOLUCIÓN').trim();
    const isAsig = (STATE.currentDocType === 'asignacion');

    const htmlContainer = document.getElementById('liteDocHtmlPreview');
    if (htmlContainer) {
      const headerColor = isAsig ? '#1e3a8a' : '#b45309';
      const subHeaderColor = isAsig ? '#2563eb' : '#d97706';
      const titleText = isAsig ? 'ENTREGA DE EQUIPO / ASIGNACIÓN' : 'DEVOLUCIÓN DE CORPORATIVO';
      const subText = isAsig ? 'ACTA OFICIAL DE RESPONSABILIDAD Y ASIGNACIÓN 2026' : 'ACTA OFICIAL DE RECEPCIÓN Y VERIFICACIÓN TÉCNICA 2026';

      htmlContainer.innerHTML = `
        <div style="border-bottom:3px solid ${headerColor};padding-bottom:12px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-size:18px;font-weight:900;color:${headerColor};letter-spacing:.5px">${titleText}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">${subText}</div>
          </div>
          <div style="text-align:right">
            <span style="background:#eff6ff;color:#1e40af;padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px;display:inline-block">Fecha: ${esc(fecha)}</span>
          </div>
        </div>

        <!-- Sección 1: Datos del Colaborador -->
        <div style="background:${headerColor};color:#fff;padding:6px 12px;font-weight:800;font-size:12px;border-radius:4px;letter-spacing:.3px;margin-bottom:8px">
          1. DATOS DEL COLABORADOR
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:14px">
          <div><strong style="color:#64748b">Nombre:</strong> <span style="font-weight:700;color:#0f172a">${esc(nombre)}</span></div>
          <div><strong style="color:#64748b">DNI:</strong> <span style="font-weight:700;color:#0f172a;font-family:monospace">${esc(dni)}</span></div>
          <div><strong style="color:#64748b">Puesto / Cargo:</strong> <span style="color:#0f172a">${esc(puesto)}</span></div>
          <div><strong style="color:#64748b">Área / Sede:</strong> <span style="color:#0f172a">${esc(area)}</span></div>
          ${isAsig ? `<div><strong style="color:#64748b">Supervisor:</strong> <span style="color:#0f172a">${esc(supervisor)}</span></div>` : `<div><strong style="color:#64748b">Motivo:</strong> <span style="color:#b45309;font-weight:700">${esc(motivo)}</span></div>`}
        </div>

        <!-- Sección 2: Ficha Técnica del Equipo -->
        <div style="background:${headerColor};color:#fff;padding:6px 12px;font-weight:800;font-size:12px;border-radius:4px;letter-spacing:.3px;margin-bottom:8px">
          2. DESCRIPCIÓN Y ESPECIFICACIONES DEL EQUIPO
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;background:#fffbeb;border:1px solid #fef3c7;border-radius:6px;padding:10px;margin-bottom:14px">
          <div><strong style="color:#64748b">Marca:</strong> <span style="font-weight:700;color:#0f172a">${esc(item.marca || 'EQUIPO')}</span></div>
          <div><strong style="color:#64748b">Modelo:</strong> <span style="font-weight:700;color:#0f172a">${esc(item.modelo || 'CORPORATIVO')}</span></div>
          ${(item.categoria === 'Computadoras' || /laptop|pc|desktop|thinkcentre|thinkpad|all in one/i.test((item.categoria||'')+' '+(item.modelo||'')+' '+(item.tipo||'')))
            ? '<div><strong style="color:#64748b">N\u00b0 Serie (S/N):</strong> <span style="font-weight:700;color:#0f172a;font-family:monospace">' + esc(item.nSerie || item.serie || '—') + '</span></div><div><strong style="color:#64748b">C\u00f3digo / Activo:</strong> <span style="font-weight:700;color:#0f172a;font-family:monospace">' + esc(item.codigo || item.nSerie || '—') + '</span></div>'
            : '<div><strong style="color:#64748b">IMEI 1:</strong> <span style="font-weight:700;color:#0f172a;font-family:monospace">' + esc(item.imei1 || '—') + '</span></div><div><strong style="color:#64748b">IMEI 2:</strong> <span style="font-weight:700;color:#0f172a;font-family:monospace">' + esc(item.imei2 || '—') + '</span></div>'
          }
          <div><strong style="color:#64748b">Color:</strong> <span style="color:#0f172a">${esc((item.color && item.color !== '-') ? item.color : '—')}</span></div>
          <div><strong style="color:#64748b">Estado:</strong> <span style="color:#15803d;font-weight:700">${esc(item.estado || 'OPERATIVO')}</span></div>
        </div>

        <!-- Sección 3: Checklist / Conformidad -->
        <div style="background:#0f172a;color:#fff;padding:5px 12px;font-weight:800;font-size:11px;border-radius:4px;margin-bottom:8px">
          3. DECLARACIÓN Y CONFORMIDAD
        </div>
        <div style="font-size:11.5px;color:#475569;line-height:1.5;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:16px">
          ${isAsig 
            ? `[✓] El colaborador declara recibir el activo corporativo en perfecto estado de funcionamiento, comprometiéndose a su custodia y uso exclusivo para fines laborales.`
            : `[✓] Se certifica la entrega y recepción técnica del activo corporativo. Pantalla y carcasa verificadas sin bloqueos de cuenta.`}
        </div>

        <!-- Firmas Oficiales -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;padding-top:12px">
          <div style="border-top:1.5px solid #64748b;text-align:center;padding-top:6px">
            <div style="font-weight:800;font-size:11.5px;color:#0f172a">${isAsig ? 'FIRMA DEL COLABORADOR' : 'ENTREGA (COLABORADOR)'}</div>
            <div style="font-size:11px;color:#334155">${esc(nombre)}</div>
            <div style="font-size:10.5px;color:#64748b;font-family:monospace">DNI: ${esc(dni)}</div>
          </div>
          <div style="border-top:1.5px solid #64748b;text-align:center;padding-top:6px">
            <div style="font-weight:800;font-size:11.5px;color:#0f172a">REVISIÓN TÉCNICA / CONTROL TI</div>
            <div style="font-size:11px;color:#334155">Área de Sistemas & Logística</div>
            <div style="font-size:10.5px;color:#16a34a;font-weight:700">Conforme sin observaciones</div>
          </div>
        </div>
      `;
    }

    // Generar también el jsPDF para tener listo el documento a imprimir o descargar
    const doc = buildCurrentPdfDocument();
    STATE.lastGeneratedDoc = doc;
  } catch (err) {
    console.error('Error generando vista previa de PDF:', err);
  }
}

function applyLiteDocToInventory() {
  if (!STATE.currentLiteDevice) return;
  const item = STATE.currentLiteDevice;
  const nombre = (document.getElementById('lite_colab_nombre')?.value || item.responsable || '').trim();
  const dni = (document.getElementById('lite_colab_dni')?.value || item.dni || '').trim();
  const puesto = (document.getElementById('lite_colab_puesto')?.value || item.puesto || '').trim();
  const area = (document.getElementById('lite_colab_area')?.value || item.area || item.ubicacion || '').trim();
  const fecha = document.getElementById('lite_colab_fecha')?.value || new Date().toISOString().slice(0, 10);
  const motivo = (document.getElementById('lite_colab_motivo')?.value || 'DEVOLUCIÓN').trim();
  const supervisor = (document.getElementById('lite_colab_supervisor')?.value || item.supervisor || '').trim();

  // Buscar equipo en STATE.inventory
  let idx = STATE.inventory.findIndex(r =>
    (item.nSerie && r.nSerie && r.nSerie.toUpperCase() === item.nSerie.toUpperCase()) ||
    (item.imei1 && r.imei1 && r.imei1 === item.imei1)
  );

  if (STATE.currentDocType === 'devolucion') {
    const isBroken = motivo.toUpperCase().includes('FALLA') || motivo.toUpperCase().includes('DAÑADO') || motivo.toUpperCase().includes('BROKEN');
    const newEstado = isBroken ? 'Broken' : 'Stock';
    if (idx >= 0) {
      STATE.inventory[idx].estado = newEstado;
      STATE.inventory[idx].responsable = '';
      STATE.inventory[idx].dni = '';
      STATE.inventory[idx]._lastAction = newEstado;
      STATE.inventory[idx]._lastActionDate = fecha;
      STATE.inventory[idx]._isModified = true;
      STATE.inventory[idx].observaciones = `Devuelto por ${nombre} (${motivo}) el ${fecha}`;
    }
  } else {
    // Asignación / Reasignación
    const hadPreviousOwner = (idx >= 0 && STATE.inventory[idx].responsable && STATE.inventory[idx].responsable.trim().length > 0);
    const accionTipo = hadPreviousOwner ? 'Reasignación' : 'Asignación';

    // 1. Si el colaborador tenía un teléfono asignado previamente, retornarlo a Stock
    if (dni || nombre) {
      STATE.inventory.forEach(r => {
        const isSame = (item.nSerie && r.nSerie && r.nSerie.toUpperCase() === item.nSerie.toUpperCase()) ||
                       (item.imei1 && r.imei1 && r.imei1 === item.imei1);
        if (!isSame) {
          const matchDni = dni && r.dni && r.dni.trim() === dni.trim();
          const matchResp = nombre && r.responsable && r.responsable.trim().toUpperCase() === nombre.toUpperCase();
          if ((matchDni || matchResp) && normalizeEstado(r.estado, r) === 'Asignado') {
            r.estado = 'Stock';
            r.responsable = '';
            r.dni = '';
            r._lastAction = 'Stock';
            r._lastActionDate = fecha;
            r._isModified = true;
            r.observaciones = (r.observaciones ? r.observaciones + ' | ' : '') + `Liberado a Stock por reasignación a ${nombre} (${fecha})`;
          }
        }
      });
    }

    // 2. Asignar el equipo actual
    if (idx >= 0) {
      STATE.inventory[idx].estado = 'Asignado';
      STATE.inventory[idx].responsable = nombre;
      STATE.inventory[idx].dni = dni;
      STATE.inventory[idx].puesto = puesto;
      STATE.inventory[idx].area = area;
      STATE.inventory[idx].supervisor = supervisor;
      STATE.inventory[idx]._lastAction = accionTipo;
      STATE.inventory[idx]._lastActionDate = fecha;
      STATE.inventory[idx]._isModified = true;
    }
  }

  // Persistir en backend
  fetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inventory: STATE.inventory, sources: STATE.sources })
  }).catch(e => console.error('Error guardando inventario lite:', e));

  renderInventoryViews();
}

function printLitePdfDirectly() {
  try {
    const doc = buildCurrentPdfDocument();
    if (!doc) return;

    applyLiteDocToInventory();

    // Abrir ventana con el blob para impresión directa
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
    showToast('🖨️ Documento enviado a impresión e inventario actualizado', 'success');
  } catch (e) {
    console.error('Error al imprimir:', e);
    showToast('Error al preparar impresión: ' + e.message, 'danger');
  }
}

function downloadLitePdf() {
  try {
    const doc = buildCurrentPdfDocument();
    if (!doc) return;

    applyLiteDocToInventory();

    const item = STATE.currentLiteDevice || {};
    const nombre = (document.getElementById('lite_colab_nombre')?.value || item.responsable || 'Colaborador').trim();
    const serie = item.imei1 || item.nSerie || 'Equipo';
    const tipo = STATE.currentDocType === 'asignacion' ? 'Acta_Asignacion' : 'Acta_Devolucion';
    const cleanName = nombre.replace(/[^A-Za-z0-9]/g, '_').substring(0, 20);
    const filename = `${tipo}_${cleanName}_${serie}.pdf`;

    doc.save(filename);
    showToast(`📄 Guardado: ${filename} (Inventario actualizado)`, 'success');
  } catch (e) {
    showToast('Error al descargar: ' + e.message, 'danger');
  }
}

/* =====================================================
   MÉTODOS DEL ESCÁNER (CÁMARA / OCR / BARRAS)
   ===================================================== */
function setScanMode(mode) {
  STATE.scanMode = mode;
  const btnOCR = document.getElementById('btnModeOCR');
  const btnBarcode = document.getElementById('btnModeBarcode');
  const btnQR = document.getElementById('btnModeQR');
  const placeholder = document.getElementById('scannerPlaceholder');
  const reader = document.getElementById('reader');

  [btnOCR, btnBarcode, btnQR].forEach(btn => {
    if (btn) {
      btn.style.background = 'transparent';
      btn.style.color = '#64748b';
      btn.style.boxShadow = 'none';
    }
  });

  const activeBtn = mode === 'ocr' ? btnOCR : mode === 'barcode' ? btnBarcode : btnQR;
  if (activeBtn) {
    activeBtn.style.background = '#2563eb';
    activeBtn.style.color = '#ffffff';
    activeBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
  }

  // Detener cámara si estaba activa
  stopCamera();

  if (mode === 'ocr') {
    if (placeholder) placeholder.style.display = 'block';
    if (reader) reader.style.display = 'none';
  } else {
    if (placeholder) placeholder.style.display = 'none';
    if (reader) reader.style.display = 'block';
    startLiveCamera(mode);
  }
}

function startLiveCamera(mode) {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('Biblioteca de escaneo no disponible', 'danger');
    return;
  }

  try {
    const F = (typeof Html5QrcodeSupportedFormats !== 'undefined') ? Html5QrcodeSupportedFormats : null;
    let formats = undefined;
    if (F) {
      if (mode === 'qr') {
        formats = [F.QR_CODE, F.DATA_MATRIX].filter(Boolean);
      } else if (mode === 'barcode') {
        // Formatos completos soportados en computadoras, laptops y accesorios:
        formats = [
          F.CODE_128,
          F.CODE_39,
          F.CODE_93,
          F.EAN_13,
          F.EAN_8,
          F.UPC_A,
          F.UPC_E,
          F.ITF,
          F.CODABAR,
          F.DATA_MATRIX
        ].filter(Boolean);
      }
    }

    STATE.html5QrCode = new Html5Qrcode('reader', {
      formatsToSupport: formats,
      verbose: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    });

    // Ventana panorámica para barras delgadas
    const qrboxFn = (vw, vh) => {
      if (mode === 'barcode') {
        const w = Math.min(Math.round(vw * 0.92), 520);
        const h = Math.min(Math.round(vh * 0.40), 220);
        return { width: w, height: h };
      }
      const size = Math.min(Math.round(vw * 0.80), Math.round(vh * 0.80), 340);
      return { width: size, height: size };
    };

    const ctrlBox = document.getElementById('liveCameraControls');
    const laserLine = document.getElementById('scannerLaserLine');

    // Restricciones de alta resolución Full-HD para captar barras diminutas de laptops
    const scanConfig = {
      fps: 25,
      qrbox: qrboxFn,
      videoConstraints: {
        facingMode: 'environment',
        width: { min: 1280, ideal: 1920, max: 3840 },
        height: { min: 720, ideal: 1080, max: 2160 },
        focusMode: 'continuous'
      }
    };

    STATE.html5QrCode.start(
      { facingMode: 'environment' },
      scanConfig,
      (decodedText) => {
        stopCamera();
        playScanBeep(true);
        processScannedCode(decodedText);
      },
      () => {}
    ).then(() => {
      STATE.isScanning = true;
      if (ctrlBox) ctrlBox.style.display = 'flex';
      if (laserLine) laserLine.style.display = 'block';

      try {
        const video = document.querySelector('#reader video');
        if (video && video.srcObject) {
          const tracks = video.srcObject.getVideoTracks();
          if (tracks && tracks.length > 0) CURRENT_CAMERA_TRACK = tracks[0];
        }
      } catch (e) {}
    }).catch(err => {
      console.warn('Error iniciando cámara HD, reintentando con configuración básica:', err);
      STATE.html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 20, qrbox: qrboxFn },
        (decodedText) => {
          stopCamera();
          playScanBeep(true);
          processScannedCode(decodedText);
        },
        () => {}
      ).then(() => {
        STATE.isScanning = true;
        if (ctrlBox) ctrlBox.style.display = 'flex';
        if (laserLine) laserLine.style.display = 'block';
      }).catch(err2 => {
        showToast('No se pudo acceder a la cámara: ' + err2, 'warning');
        setScanMode('ocr');
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function stopCamera() {
  const ctrlBox = document.getElementById('liveCameraControls');
  const laserLine = document.getElementById('scannerLaserLine');
  if (ctrlBox) ctrlBox.style.display = 'none';
  if (laserLine) laserLine.style.display = 'none';
  CURRENT_CAMERA_TRACK = null;
  CURRENT_ZOOM_LEVEL = 1.0;
  IS_TORCH_ACTIVE = false;

  if (STATE.html5QrCode && STATE.isScanning) {
    STATE.html5QrCode.stop().then(() => {
      STATE.isScanning = false;
    }).catch(() => {});
  }
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

// Pipeline de ZXing con filtros de visión artificial para barras delgadas
function runZXingPhotoPipeline(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;

          // Etapa 1: Imagen ajustada a 1800px max (mantiene densidad de barras sin saturar memoria)
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

          // Intento 1: Decodificación directa
          let code = decodeCanvasWithZXing(canvas);
          if (code) return resolve({ code, engine: 'ZXing-Direct' });

          // Intento 2: Convolución Sharpening (realza bordes de barras finas que se desenfocan)
          applyBarSharpening(ctx, sw, sh);
          code = decodeCanvasWithZXing(canvas);
          if (code) return resolve({ code, engine: 'ZXing-Sharpened' });

          // Intento 3: Zoom digital central al 200% (recorta el centro de la foto donde está la etiqueta)
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

          // Intento 4: Rotación de 90° (por si la etiqueta del PC está vertical)
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

// Decodificador ZXing sobre canvas con formatos universales de PC y telefonía
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

    // Intento con HybridBinarizer
    try {
      const lum = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
      const bin = new ZXing.HybridBinarizer(lum);
      const bitmap = new ZXing.BinaryBitmap(bin);
      const res = reader.decode(bitmap);
      if (res && res.getText()) return res.getText().trim();
    } catch (e1) {}

    // Intento con GlobalHistogramBinarizer (para fondos metálicos/plateados de PC)
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

// Filtro de convolución para afilar barras delgadas (Sharpening Kernel)
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

// 2. Control de Zoom y Linterna para Cámara en Vivo
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

  // Fallback: Zoom óptico digital por CSS en el video de la cámara
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

// Preprocesamiento en Canvas: optimiza resolución a maxDim 1600, elimina moiré de pantallas y resalta texto
function preprocessImageForOCR(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxDim = 1800; // Alta resolución para etiquetas y códigos de PC
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

        const isPC = (typeof SCAN_DEVICE_TYPE !== 'undefined' && SCAN_DEVICE_TYPE === 'pc');
        if (isPC) {
          let totalLum = 0;
          let samples = 0;
          for (let i = 0; i < data.length; i += 4 * 8) {
            totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            samples++;
          }
          const avgLum = totalLum / samples;
          const isDarkBackground = avgLum < 105;

          const contrast = 1.35;
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
        } else {
          // Teléfonos: Preservar nitidez nativa para no dañar caracteres pequeños de IMEI
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleLabelPhoto(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  resetScanWizard();

  const ocrBox = document.getElementById('ocrStatusBox');
  const ocrText = document.getElementById('ocrStatusText');
  const ocrProgress = document.getElementById('ocrProgressBar');

  if (ocrBox) ocrBox.style.display = 'block';
  if (ocrProgress) ocrProgress.style.width = '25%';

  const currentMode = (typeof SCAN_DEVICE_TYPE !== 'undefined') ? SCAN_DEVICE_TYPE : 'telefono';

  try {
    // 1. SI ES PC / LAPTOP: Analizar primero código de barras con pipeline de alta precisión
    if (currentMode === 'pc') {
      if (ocrText) ocrText.textContent = '🔍 Decodificando código de barras (PC / Laptop)...';
      if (ocrProgress) ocrProgress.style.width = '45%';

      const barcodeResult = await detectBarcodeFromPhoto(file);
      if (barcodeResult && barcodeResult.code) {
        if (ocrProgress) ocrProgress.style.width = '100%';
        if (ocrBox) ocrBox.style.display = 'none';
        playScanBeep(true);
        showToast(`🎯 Código de barras detectado: ${barcodeResult.code}`, 'success');
        processScannedCode(barcodeResult.code);
        return;
      }
    }

    // 2. PARA TELÉFONOS (Y PC SI NO HUBO BARCODE): EJECUTAR OCR COMPLETO
    if (ocrText) ocrText.textContent = currentMode === 'telefono' 
      ? '📸 Leyendo etiqueta completa del teléfono (IMEI, Modelo, Color)...' 
      : '📸 Leyendo datos de la etiqueta (OCR)...';
    if (ocrProgress) ocrProgress.style.width = '60%';

    const processedDataUrl = await preprocessImageForOCR(file);
    if (ocrProgress) ocrProgress.style.width = '80%';

    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(processedDataUrl);
    await worker.terminate();

    if (ocrProgress) ocrProgress.style.width = '100%';
    const text = ret.data.text || '';
    if (ocrBox) ocrBox.style.display = 'none';

    extractDataFromOcrText(text);
  } catch (err) {
    if (ocrBox) ocrBox.style.display = 'none';
    console.error('[OCR Error]:', err);
    document.getElementById('ocrFailureModal').style.display = 'flex'; lockBodyScroll();
  } finally {
    event.target.value = '';
  }
}

function extractDataFromOcrText(rawText) {
  if (!rawText) {
    document.getElementById('ocrFailureModal').style.display = 'flex'; lockBodyScroll();
    return;
  }

  // Normalizar texto
  let text = String(rawText)
    .replace(/\r/g, '\n')
    .replace(/[;]/g, ':')
    .replace(/IME[I1l|]\s*(?:N[°º\.]?|NO\.?|NUM\.?|#)?\s*([1l|])\s*[:\-\s]/gi, 'IMEI1:')
    .replace(/IME[I1l|]\s*(?:N[°º\.]?|NO\.?|NUM\.?|#)?\s*2\s*[:\-\s]/gi, 'IMEI2:');

  const currentMode = (typeof SCAN_DEVICE_TYPE !== 'undefined') ? SCAN_DEVICE_TYPE : 'telefono';

  // 1. Análisis de hardware (PC / Laptop)
  const hw = parseHardwareAsset(text);
  const isHardwareAsset = hw && hw.isHardware;

  // 2. Análisis de teléfono
  const isPhoneAsset = /IMEI|\b\d{15}\b|2G|3G|4G|5G|BMOBILE|REDMI|XIAOMI|SMARTPHONE|CELULAR|ROCKET/i.test(text);

  // 3. DETECCIÓN DE BOTÓN EQUIVOCADO (MISMATCH)
  if (currentMode === 'telefono' && isHardwareAsset && !isPhoneAsset) {
    showModeMismatchModal('pc_detected_in_phone_mode', hw, hw.serial);
    return;
  }

  if (currentMode === 'pc' && isPhoneAsset && !isHardwareAsset) {
    const mImeiMatch = text.match(/(?:IMEI1|IMEI\s*(?:N[°º\.]?|NO\.?|NUM\.?|#)?\s*1)\s*[:\-\s]*([0-9\s\-]{14,24})/i) ||
                       text.match(/IMEI\s*[:\-\s]*([0-9\s\-]{14,24})/i) ||
                       text.match(/\b\d{15}\b/);
    const foundImei = mImeiMatch ? mImeiMatch[0].replace(/\D/g, '') : '';
    showModeMismatchModal('phone_detected_in_pc_mode', { imei1: foundImei, marca: 'Teléfono', modelo: 'Celular' }, foundImei);
    return;
  }

  // 4. SI EL MODO ES PC / LAPTOP:
  if (currentMode === 'pc') {
    if (isHardwareAsset) {
      processHardwareAssetDetected(hw, hw.serial);
      return;
    }
    // Si no se reconocieron datos de PC
    document.getElementById('ocrFailureModal').style.display = 'flex'; lockBodyScroll();
    return;
  }

  // Continuar con extracción de teléfonos (IMEI 1 / IMEI 2)
  let detectedImei1 = '';
  let detectedImei2 = '';

  // Búsqueda explícita con prefijos IMEI
  const imei1Match = text.match(/(?:IMEI1|IMEI\s*(?:N[°º\.]?|NO\.?|NUM\.?|#)?\s*1)\s*[:\-\s]*([0-9\s\-]{14,24})/i) ||
                     text.match(/IMEI\s*[:\-\s]*([0-9\s\-]{14,24})/i);
  if (imei1Match) {
    const d1 = imei1Match[1].replace(/\D/g, '');
    if (d1.length >= 14) detectedImei1 = d1.slice(0, 15);
  }

  const imei2Match = text.match(/(?:IMEI2|IMEI\s*(?:N[°º\.]?|NO\.?|NUM\.?|#)?\s*2)\s*[:\-\s]*([0-9\s\-]{14,24})/i);
  if (imei2Match) {
    const d2 = imei2Match[1].replace(/\D/g, '');
    if (d2.length >= 14) detectedImei2 = d2.slice(0, 15);
  }

  // Búsqueda en todo el texto de secuencias de 14 a 16 dígitos
  const rawClean = text.replace(/[oO](?=\d)/g, '0').replace(/(?<=\d)[lI\|](?=\d)/g, '1');
  const found15 = [];
  for (const line of rawClean.split('\n')) {
    const m = line.match(/\b\d{14,16}\b/g) || [];
    for (const num of m) {
      const cleanNum = num.slice(0, 15);
      if (!found15.includes(cleanNum)) found15.push(cleanNum);
    }
  }

  // Fallback desde found15 evitando asignar el mismo número a ambos IMEIs
  if (!detectedImei1 && found15.length > 0) {
    // Preferir un número que no esté ya en detectedImei2
    detectedImei1 = found15.find(n => n !== detectedImei2) || found15[0];
  }
  if (!detectedImei2 && found15.length > 1) {
    // Preferir un número distinto al de imei1
    detectedImei2 = found15.find(n => n !== detectedImei1) || '';
  }

  // Guardia final: si ambos IMEIs resultaron iguales, limpiar IMEI2 para no mostrar duplicado
  if (detectedImei2 && detectedImei2 === detectedImei1) detectedImei2 = '';

  let found = (detectedImei1 && findInventoryDevice(detectedImei1)) ||
              (detectedImei2 && findInventoryDevice(detectedImei2));

  if (found) {
    playScanBeep(true);
    showToast('🎯 Reconocido: ' + (found.marca || '') + ' ' + (found.modelo || '') + ' (' + (found.ubicacion || '') + ')', 'success');
    showScanResult(found, detectedImei1 || detectedImei2 || found.imei1);
    resetScanWizard();
    return;
  }

  if (detectedImei1) {
    playScanBeep(true);
    SCAN_WIZARD.imei1 = detectedImei1;
    if (detectedImei2) SCAN_WIZARD.imei2 = detectedImei2;
    updateScanWizardUI();

    let autoMarca = 'BMOBILE';
    let autoModelo = 'ROCKET A1';
    let autoColor = 'CELESTE';
    let autoCosto = 'S/. 197.00';

    if (/[bléèê][\s\-_]?mobile|bbmobile/i.test(text)) autoMarca = 'BMOBILE';
    else if (/zte/i.test(text)) autoMarca = 'ZTE';
    else if (/redmi|xiaomi/i.test(text)) autoMarca = 'REDMI';
    else if (/honor/i.test(text)) autoMarca = 'HONOR';
    else if (/nokia/i.test(text)) autoMarca = 'NOKIA';

    const mModLite = text.match(/Modelo\s*[:\-\s]*([^\n\r—\-]+)/i);
    if (mModLite) autoModelo = mModLite[1].trim().replace(/\s*A[tlI]$/i, ' A1');
    if (!mModLite && /ROCKET\s*A[1ltI]/i.test(text)) autoModelo = 'ROCKET A1';

    const mColLite = text.match(/Color\s*[:\-\s]*([A-Za-zÁÉÍÓÚáéíóú]+)/i);
    if (mColLite) autoColor = mColLite[1].trim().toUpperCase();

    const tac = detectedImei1.slice(0, 8);
    if (typeof TAC_CATALOG !== 'undefined' && TAC_CATALOG[tac]) {
      autoMarca = TAC_CATALOG[tac].marca || autoMarca;
      autoModelo = TAC_CATALOG[tac].modelo || autoModelo;
      autoColor = TAC_CATALOG[tac].color || autoColor;
      autoCosto = TAC_CATALOG[tac].costo || autoCosto;
    }

    const customDevice = {
      nSerie: detectedImei1,
      imei1: detectedImei1,
      imei2: detectedImei2 || '',
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

    showScanResult(customDevice, detectedImei1);
    resetScanWizard();
    return;
  }

  // Fallback: buscar palabras clave en inventario general
  const stopWords = new Set(['OPERACIONES', 'COBRANZAS', 'RESPONSABLE', 'OBSERVACIONES', 'CARGADOR', 'CATEGORIA', 'TELEFONOS', 'COMPUTADORAS', 'ADMINISTRACION', 'CALIDAD']);
  const serieMatches = (text.match(/\b[A-Za-z0-9\-_]{6,22}\b/g) || []).filter(m => !stopWords.has(m.toUpperCase()) && /\d/.test(m));
  for (const match of serieMatches) {
    const dev = findInventoryDevice(match);
    if (dev) {
      playScanBeep(true);
      showScanResult(dev, match);
      resetScanWizard();
      return;
    }
  }

  // Si realmente no hubo datos legibles
  document.getElementById('ocrFailureModal').style.display = 'flex'; lockBodyScroll();
}

function closeOcrFailureModal(manual) {
  document.getElementById('ocrFailureModal').style.display = 'none';
  unlockBodyScroll();
  if (manual) {
    const input = document.getElementById('manualScanInput');
    if (input) input.focus();
  }
}

/* =====================================================
   CONSULTA DE DNI
   ===================================================== */
function setupDNIEnter() {
  const dniInput = document.getElementById('dniInput');
  if (dniInput) {
    dniInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') lookupDNI();
    });
  }
}

async function lookupDNI() {
  const input = document.getElementById('dniInput');
  const resDiv = document.getElementById('dniResult');
  if (!input || !resDiv) return;

  const dni = input.value.trim();
  if (dni.length !== 8) {
    resDiv.innerHTML = '<span style="color:#dc2626;font-size:12px">El DNI debe tener 8 dígitos.</span>';
    return;
  }

  resDiv.innerHTML = '<span style="color:#2563eb;font-size:12px">Consultando RENIEC...</span>';

  try {
    const resp = await fetch(`/api/dni?numero=${dni}`);
    if (!resp.ok) throw new Error('Servicio no disponible');
    const data = await resp.json();

    if (data && (data.nombre || data.nombres)) {
      const full = `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim() || data.nombre;
      resDiv.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px 12px;margin-top:8px">
          <div style="font-size:11px;font-weight:700;color:#166534">PERSONA IDENTIFICADA:</div>
          <strong style="color:#15803d;font-size:13px">${esc(full)}</strong>
          <div style="margin-top:6px">
            <button type="button" class="btn btn-outline btn-sm" onclick="copyDniToLiteModal('${esc(dni)}', '${esc(full)}')">
              📋 Usar en Documento Actual
            </button>
          </div>
        </div>
      `;
    } else {
      resDiv.innerHTML = '<span style="color:#d97706;font-size:12px">DNI no encontrado o servicio temporalmente saturado.</span>';
    }
  } catch (e) {
    resDiv.innerHTML = `<span style="color:#dc2626;font-size:12px">Error en consulta: ${esc(e.message)}</span>`;
  }
}

function copyDniToLiteModal(dni, nombre) {
  const dniEl = document.getElementById('lite_colab_dni');
  const nomEl = document.getElementById('lite_colab_nombre');
  if (dniEl) dniEl.value = dni;
  if (nomEl) nomEl.value = nombre;
  updateLitePdfPreview();
  showToast('📋 Datos aplicados al documento', 'success');
}

/* =====================================================
   CARGA DE ARCHIVOS EXCEL Y GOOGLE SHEETS
   ===================================================== */
function onDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
}
function onDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
}
function onDrop(e, slot) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) parseExcelFile(file, slot);
}
function loadFile(e, slot) {
  const file = e.target.files && e.target.files[0];
  if (file) parseExcelFile(file, slot);
}

function parseExcelFile(file, slot) {
  const statusEl = document.getElementById(`status${slot}`);
  if (statusEl) statusEl.innerHTML = `<span style="color:#2563eb">Procesando ${esc(file.name)}...</span>`;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      let allParsed = [];
      const cleanVal = (v) => (v === null || v === undefined) ? '' : String(v).trim();

      workbook.SheetNames.forEach(sheetName => {
        const ws = workbook.Sheets[sheetName];
        if (!ws) return;
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length) return;

        const sNorm = sheetName.toUpperCase();
        if (sNorm.includes('COOPORATIVO') || sNorm.includes('TELEFONO') || sNorm.includes('CELULAR')) {
          rows.forEach((r, idx) => {
            const codigo = cleanVal(r['CODIGO'] || r['Código'] || r['Codigo']);
            const area = cleanVal(r['AREA'] || r['Area'] || 'OFICINA');
            const oficina = cleanVal(r['OFICINA'] || r['Oficina'] || '111');
            const marca = cleanVal(r['MARCA'] || r['Marca']);
            const color = cleanVal(r['COLOR'] || r['Color'] || 'NEGRO');
            const imei1 = cleanVal(r['IMEI 1'] || r['IMEI1'] || r['IMEI']);
            const imei2 = cleanVal(r['IMEI 2'] || r['IMEI2']);
            const cargador = cleanVal(r['CARGADOR'] || r['Cargador'] || 'NO');
            const usuario = cleanVal(r['APELLIDOS Y NOMBRES (usuario)'] || r['APELLIDOS Y NOMBRES'] || r['RESPONSABLE'] || '');
            const dni = cleanVal(r['DNI'] || r['Dni'] || '');
            const supervisor = cleanVal(r['SUPERVISOR'] || r['Supervisor'] || '');
            const rawEstado = cleanVal(r['ESTADO'] || r['Estado'] || 'USADO');
            const fCompra = cleanVal(r['FECHA DE COMPRA'] || '');
            const costo = cleanVal(r['COSTO'] || '');

            let normEstado = 'Asignado';
            if (area.toUpperCase().includes('STOCK') || rawEstado.toUpperCase().includes('STOCK') || usuario.toUpperCase().includes('STOCK')) {
              normEstado = 'Stock';
            } else if (area.toUpperCase().includes('BROKEN') || rawEstado.toUpperCase().includes('BROKEN') || rawEstado.toUpperCase().includes('MALO') || usuario.toUpperCase().includes('BROKEN')) {
              normEstado = 'Broken';
            } else if (!usuario || usuario.toUpperCase() === 'NO ASIGNADO' || usuario.toUpperCase() === 'DISPONIBLE') {
              normEstado = 'Stock';
            }

            allParsed.push({
              id: 'TLF-' + String(allParsed.length + 1).padStart(5, '0'),
              codigo: codigo || imei1,
              nSerie: codigo || imei1,
              serie: codigo || imei1,
              area: area,
              oficina: oficina,
              ubicacion: 'Oficina ' + oficina + (area ? ' - ' + area : ''),
              marca: marca,
              modelo: marca,
              color: color,
              tipo: 'Smartphone Corporativo',
              categoria: 'Teléfonos / Corporativos',
              responsable: normEstado === 'Stock' ? 'STOCK' : (normEstado === 'Broken' ? 'BROKEN' : (usuario || 'NO ASIGNADO')),
              dni: (normEstado === 'Stock' || normEstado === 'Broken') ? '—' : (dni || '—'),
              supervisor: (normEstado === 'Stock' || normEstado === 'Broken') ? '—' : supervisor,
              estado: normEstado,
              estadoOrigen: rawEstado,
              fechaCompra: fCompra,
              costo: costo,
              imei1: imei1,
              imei2: imei2,
              cargador: cargador,
              observaciones: 'IMEI 1: ' + imei1 + ' | IMEI 2: ' + imei2 + ' | Cargador: ' + cargador + (supervisor ? ' | Sup: ' + supervisor : '')
            });
          });
        } else if (sNorm.includes('COMPUTADORA') || sNorm === 'PC' || sNorm.includes('LAPTOP')) {
          rows.forEach((r, idx) => {
            const codigo = cleanVal(r['Código'] || r['CODIGO'] || r['Codigo']);
            const serie = cleanVal(r['SERIE'] || r['Serie'] || codigo);
            const area = cleanVal(r['AREA'] || r['Area'] || 'OFICINA');
            const oficina = cleanVal(r['OFICINA'] || r['Oficina'] || '301');
            const marca = cleanVal(r['MARCA'] || r['Marca']);
            const modelo = cleanVal(r['MODELO'] || r['Modelo']);
            const tipo = cleanVal(r['TIPO'] || r['Tipo'] || 'Computadora');
            const situacion = cleanVal(r['SITUACION'] || r['Situacion'] || '');
            const usuario = cleanVal(r['APELLIDOS Y NOMBRES (usuario)'] || r['APELLIDOS Y NOMBRES'] || r['RESPONSABLE'] || '');
            const dni = cleanVal(r['DNI'] || r['Dni'] || '');
            const supervisor = cleanVal(r['SUPERVISOR'] || r['Supervisor'] || '');
            const rawEstado = cleanVal(r['ESTADO'] || r['Estado'] || 'BUENO');
            const fCompra = cleanVal(r['FECHA DE COMPRA'] || r['FECHA'] || '');
            const costo = cleanVal(r['COSTO'] || '');
            const obs = cleanVal(r['OBSERVACION 1'] || r['OBSERVACION 2'] || r['OBSERVACION 3'] || '');

            let normEstado = 'Asignado';
            if (situacion.toUpperCase().includes('STOCK') || rawEstado.toUpperCase().includes('STOCK') || area.toUpperCase().includes('STOCK') || usuario.toUpperCase().includes('STOCK')) {
              normEstado = 'Stock';
            } else if (situacion.toUpperCase().includes('BROKEN') || rawEstado.toUpperCase().includes('BROKEN') || rawEstado.toUpperCase().includes('MALO') || rawEstado.toUpperCase().includes('BAJA') || area.toUpperCase().includes('BROKEN')) {
              normEstado = 'Broken';
            } else if (!usuario || usuario.toUpperCase() === 'NO ASIGNADO' || usuario.toUpperCase() === 'DISPONIBLE') {
              normEstado = 'Stock';
            }

            allParsed.push({
              id: 'PC-' + String(allParsed.length + 1).padStart(5, '0'),
              codigo: codigo || serie,
              nSerie: serie,
              serie: serie,
              area: area,
              oficina: oficina,
              ubicacion: 'Oficina ' + oficina + (area ? ' - ' + area : ''),
              marca: marca,
              modelo: modelo,
              color: 'NEGRO',
              tipo: tipo,
              categoria: 'Computadoras',
              responsable: normEstado === 'Stock' ? 'STOCK' : (normEstado === 'Broken' ? 'BROKEN' : (usuario || 'NO ASIGNADO')),
              dni: dni || '—',
              supervisor: supervisor,
              estado: normEstado,
              estadoOrigen: rawEstado,
              fechaCompra: fCompra,
              costo: costo ? ('S/. ' + costo) : '',
              imei1: '',
              imei2: '',
              cargador: 'NO',
              observaciones: obs || ('Tipo: ' + tipo + (supervisor ? ' | Sup: ' + supervisor : ''))
            });
          });
        } else if (sNorm.includes('ELECTRO') || sNorm.includes('INMUEBLE')) {
          rows.forEach((r, idx) => {
            const oficina = cleanVal(r['OFICINA'] || r['Oficina'] || 'SEDE');
            const cantidad = cleanVal(r['CANTIDAD'] || r['Cantidad'] || '1');
            const articulo = cleanVal(r['ARTICULO'] || r['Articulo'] || 'ELECTRODOMESTICO');
            const marca = cleanVal(r['MARCA'] || r['Marca'] || 'GENERICO');
            const modelo = cleanVal(r['MODELO'] || r['Modelo'] || '');
            const rawEstado = cleanVal(r['ESTADO'] || r['Estado'] || 'OPERATIVO');

            let normEstado = 'Stock';
            if (rawEstado.toUpperCase().includes('BROKEN') || rawEstado.toUpperCase().includes('MALO') || rawEstado.toUpperCase().includes('BAJA')) {
              normEstado = 'Broken';
            } else {
              normEstado = 'Asignado';
            }

            allParsed.push({
              id: 'ELC-' + String(allParsed.length + 1).padStart(5, '0'),
              codigo: 'ELEC-' + String(allParsed.length + 1).padStart(4, '0'),
              nSerie: 'ELEC-' + String(allParsed.length + 1).padStart(4, '0'),
              serie: '',
              area: 'OFICINA ' + oficina,
              oficina: oficina,
              ubicacion: 'Oficina ' + oficina,
              marca: marca,
              modelo: modelo,
              cantidad: cantidad,
              articulo: articulo,
              color: '—',
              tipo: articulo,
              categoria: 'Inmuebles y Electrodomésticos',
              responsable: 'OFICINA ' + oficina,
              dni: '—',
              supervisor: '',
              estado: normEstado,
              estadoOrigen: rawEstado,
              fechaCompra: '',
              costo: '',
              imei1: '',
              imei2: '',
              cargador: 'NO',
              observaciones: 'Cantidad: ' + cantidad + ' | ' + articulo
            });
          });
        } else {
          // Hoja genérica
          const normGeneric = normalizeRows(rows);
          allParsed = allParsed.concat(normGeneric);
        }
      });

      if (allParsed.length === 0) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626">El archivo no contiene registros legibles.</span>';
        return;
      }

      integrateNewRecords(allParsed, file.name);

      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#16a34a">✅ Cargados ${allParsed.length} equipos desde ${esc(file.name)}</span>`;
      }
      showToast(`✅ Se cargaron ${allParsed.length} equipos de ${file.name}`, 'success');
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626">Error: ${esc(err.message)}</span>`;
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function normalizeRows(rows) {
  return rows.map((r, i) => {
    const keys = Object.keys(r);
    const getVal = (patterns) => {
      for (const k of keys) {
        for (const p of patterns) {
          if (new RegExp(p, 'i').test(k)) return String(r[k]).trim();
        }
      }
      return '';
    };

    let imei1 = getVal(['^imei\\s*1$', 'imei1', '^imei$']);
    let imei2 = getVal(['^imei\\s*2$', 'imei2']);
    const obs = getVal(['observaciones', 'obs', 'comentarios']);
    const rawSerie = getVal(['serie', 'serial', 'n_serie', 'c[oó]digo', 'placa']);
    let marca = getVal(['marca', 'brand']) || 'GENÉRICO';
    let modelo = getVal(['modelo', 'model']) || 'CORPORATIVO';
    let color = getVal(['color']);

    // Si imei1 o imei2 están vacíos pero están en observaciones
    if (obs) {
      if (!imei1) {
        const m1 = obs.match(/IMEI\s*1\s*:\s*([0-9]{14,16})/i);
        if (m1) imei1 = m1[1];
      }
      if (!imei2) {
        const m2 = obs.match(/IMEI\s*2\s*:\s*([0-9]{14,16})/i);
        if (m2) imei2 = m2[1];
      }
      if (!color || color === '-') {
        const mc = obs.match(/Color\s*:\s*([A-Za-zÁÉÍÓÚáéíóú]+)/i);
        if (mc) color = mc[1].toUpperCase();
      }
    }

    if (!imei1 && /^\d{15}$/.test(rawSerie)) {
      imei1 = rawSerie;
    }

    if (/^Color:\s*([A-Za-z]+)/i.test(modelo)) {
      const mc2 = modelo.match(/^Color:\s*([A-Za-z]+)/i);
      if (mc2 && (!color || color === '-')) color = mc2[1].toUpperCase();
      modelo = marca;
    }

    const serie = rawSerie || imei1 || `AUTO-${i + 1}`;
    const estado = getVal(['estado', 'status']) || 'OPERATIVO';
    const ubicacion = getVal(['ubicaci[oó]n', 'oficina', 'sede', 'lugar']) || 'ALMACÉN CENTRAL';
    const resp = getVal(['responsable', 'colaborador', 'usuario', 'asignado']) || 'NO ASIGNADO';
    const dni = getVal(['dni', 'documento', 'c[eé]dula']) || '—';
    const puesto = getVal(['cargo', 'puesto']) || '';
    const area = getVal(['[aá]rea', 'departamento']) || ubicacion;
    const supervisor = getVal(['supervisor', 'lider']) || '';

    return {
      codigo: rawSerie || serie,
      nSerie: serie,
      serie: serie,
      imei1: imei1 || '',
      imei2: imei2 || '',
      marca: marca,
      modelo: modelo,
      color: (color && color !== '-') ? color : '—',
      estado: estado,
      ubicacion: ubicacion,
      oficina: getNormalizedOffice(ubicacion),
      responsable: resp,
      dni: dni,
      puesto: puesto,
      area: area,
      supervisor: supervisor,
      categoria: (imei1 || /celular|m[oó]vil|tel[eé]fono/i.test(modelo + marca)) ? 'Teléfonos / Corporativos' : 'Computadoras'
    };
  });
}

function integrateNewRecords(records, sourceName) {
  // Reemplazar la base con la nueva base completa cargada
  STATE.inventory = records;

  STATE.sources = [{
    nombre: sourceName,
    tipo: 'Excel / CSV',
    fecha: new Date().toLocaleDateString('es-PE'),
    total: records.length
  }];

  renderLoadedSourcesTable();
  renderInventoryViews();

  // Guardar en backend local silenciosamente para persistencia del catálogo
  persistDataLite();
}

async function syncGoogleSheets() {
  const urlInput = document.getElementById('sheetMainUrl');
  const resBox = document.getElementById('sheetSyncResultBox');
  if (!urlInput) return;

  const url = urlInput.value.trim();
  if (!url) {
    showToast('Ingresa un enlace de Google Sheets válido', 'warning');
    return;
  }

  if (resBox) {
    resBox.style.display = 'block';
    resBox.innerHTML = '<span style="color:#2563eb">Descargando y sincronizando con Google Sheets...</span>';
  }

  try {
    const resp = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(url)}`);
    if (!resp.ok) throw new Error('Error al descargar la hoja');
    const data = await resp.json();

    if (data && data.success && Array.isArray(data.rows)) {
      const normalized = normalizeRows(data.rows);
      integrateNewRecords(normalized, 'Google Sheets (Sync)');
      if (resBox) {
        resBox.innerHTML = `
          <div style="color:#16a34a;font-weight:700">✅ Sincronización exitosa</div>
          <div style="font-size:12px;color:#334155;margin-top:4px">Se incorporaron ${normalized.length} registros desde Google Sheets. Total actual en catálogo: ${STATE.inventory.length} equipos.</div>
        `;
      }
      showToast(`✅ Sincronizados ${normalized.length} equipos`, 'success');
    } else {
      throw new Error(data.error || 'Respuesta inválida');
    }
  } catch (err) {
    if (resBox) {
      resBox.innerHTML = `<span style="color:#dc2626">Error: ${esc(err.message)}</span>`;
    }
  }
}

function exportToExcel() {
  const dataToExport = (STATE.filtered && STATE.filtered.length > 0) ? STATE.filtered : STATE.inventory;
  if (dataToExport.length === 0) {
    showToast('No hay datos para exportar', 'warning');
    return;
  }
  const mapped = dataToExport.map(row => ({
    'Código': row.codigo || row.nSerie || row.imei1 || '',
    'Área': row.area || '',
    'Oficina': row.oficina || '',
    'Marca': row.marca || '',
    'Modelo': row.modelo || '',
    'N° de Serie': row.serie || row.nSerie || '',
    'Color': row.color || '',
    'IMEI 1': row.imei1 || '',
    'IMEI 2': row.imei2 || '',
    'Categoría': row.categoria || '',
    'Estado': normalizeEstado(row.estado, row),
    'Ubicación': row.ubicacion || '',
    'DNI': row.dni || '',
    'Responsable': row.responsable || '',
    'Supervisor': row.supervisor || '',
    'Fecha Compra': row.fechaCompra || '',
    'Observaciones': row.observaciones || ''
  }));
  const ws = XLSX.utils.json_to_sheet(mapped);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast(`📥 Descargados ${mapped.length} registros en Excel`, 'success');
}

/* =====================================================
   MÓDULO INVENTARIO: VISTAS, FILTROS Y CUADRÍCULAS
   ===================================================== */
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

  if (str.includes('broken') || str.includes('dañado') || str.includes('dañada') || 
      str.includes('averiado') || str.includes('baja') || str.includes('no operativo') || 
      str.includes('failure') || respUpper.includes('BROKEN') || ubi.includes('BROKEN') || 
      dniUpper.includes('BROKEN')) {
    return 'Broken';
  }

  if (respUpper === 'STOCK' || respUpper.includes('ALMACEN') || ubi.includes('STOCK') || 
      dniUpper === 'STOCK' || str === 'stock' || str.includes('en stock')) {
    if (respUpper !== 'STOCK' && !respUpper.includes('ALMACEN') && /^[0-9]{7,12}$/.test(dni)) {
      return 'Asignado';
    }
    return 'Stock';
  }

  if (resp && resp !== '-' && respUpper !== 'STOCK' && respUpper !== 'BROKEN' && 
      respUpper !== 'SIN ASIGNAR' && respUpper !== 'DISPONIBLE' && respUpper !== 'LIBRE') {
    return 'Asignado';
  }

  if (dni && /^[0-9]{7,12}$/.test(dni)) {
    return 'Asignado';
  }

  if (str.includes('asignado') || str.includes('asignada') || str.includes('en uso')) {
    return 'Asignado';
  }

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
  const c = cat || CURRENT_INVENTORY_CATEGORY || 'Computadoras';
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

function getOfficeList() {
  const set = new Set();
  STATE.inventory.forEach(r => { const o = getNormalizedOffice(r.ubicacion); if (o) set.add(o); });
  return [...set].sort();
}

function setInventoryCategory(cat) {
  CURRENT_INVENTORY_CATEGORY = cat;
  SEGMENT_PAGES.Asignados = 1;
  SEGMENT_PAGES.Stock = 1;
  SEGMENT_PAGES.Broken = 1;
  document.querySelectorAll('#inventoryCategoryPills .cat-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${cat}'`));
  });
  renderInventoryViews();
}
window.setInventoryCategory = setInventoryCategory;

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
window.setInventoryViewMode = setInventoryViewMode;

function handleInventoryCardSearch(val) {
  if (val !== undefined) INVENTORY_CARD_QUERY = val.trim().toLowerCase();
  SEGMENT_PAGES.Asignados = 1;
  SEGMENT_PAGES.Stock = 1;
  SEGMENT_PAGES.Broken = 1;
  renderInventoryViews();
}
window.handleInventoryCardSearch = handleInventoryCardSearch;

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

function renderInventoryViews() {
  const sel = document.getElementById('invFilterOffice');
  if (sel) {
    const offices = getOfficeList();
    const cur = CURRENT_INVENTORY_OFFICE || sel.value || '';
    sel.innerHTML = '<option value="">Todas las Oficinas</option>' +
      offices.map(o => `<option value="${esc(o)}" ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('');
    CURRENT_INVENTORY_OFFICE = sel.value;
  }

  let inv = getInventoryForCategory(CURRENT_INVENTORY_CATEGORY);

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

  const estCard = document.getElementById('invFilterEstadoCard')?.value || '';
  if (estCard) {
    inv = inv.filter(r => normalizeEstado(r.estado, r) === estCard);
  }

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
    matchBadge.textContent = (INVENTORY_CARD_QUERY || estCard || office) ? `Coincidencias: ${inv.length} equipos` : '';
  }

  const asignados = inv.filter(r => normalizeEstado(r.estado, r) === 'Asignado');
  const stock     = inv.filter(r => normalizeEstado(r.estado, r) === 'Stock');
  const broken    = inv.filter(r => normalizeEstado(r.estado, r) === 'Broken');

  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setId('invKpiTotal', inv.length);
  setId('invKpiAsignados', asignados.length);
  setId('invKpiStock', stock.length);
  setId('invKpiBroken', broken.length);
  setId('invKpiOficinas', getOfficeList().length);
  setId('badgeCountAsignados', asignados.length);
  setId('badgeCountStock', stock.length);
  setId('badgeCountBroken', broken.length);

  // Vista única: Tabla completa
  STATE.filtered = inv;
  STATE.currentPage = 1;
  renderTable();
  updateLiteCharts();
}

function renderTable() {
  const tbody = document.getElementById('mainTableBody');
  const thead = document.getElementById('mainTableHead');
  if (!tbody) return;
  const total = STATE.filtered.length;
  const pages = Math.ceil(total / STATE.pageSize) || 1;
  STATE.currentPage = Math.min(STATE.currentPage, pages);
  const start = (STATE.currentPage - 1) * STATE.pageSize;
  const slice = STATE.filtered.slice(start, start + STATE.pageSize);
  
  const countEl = document.getElementById('filterCount');
  if (countEl) countEl.textContent = `${total} registros`;

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
    tbody.innerHTML = `<tr><td colspan="${colSpan}"><div class="empty-state"><div class="empty-icon">🔎</div><h4>Sin resultados</h4><p>Ajusta los filtros para visualizar registros.</p></div></td></tr>`;
    renderPagination(0, 1);
    return;
  }

  tbody.innerHTML = slice.map(row => {
    const colorTag = (row.color && row.color !== '-' && row.color !== '—') 
      ? `<span class="badge-color-tag dot-${esc(row.color.toLowerCase())}"><span class="color-dot"></span>${esc(row.color)}</span>`
      : '<span style="color:#94a3b8">—</span>';
    const normEst = normalizeEstado(row.estado, row);
    const estBadge = normEst === 'Stock'
      ? `<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700">Stock</span>`
      : normEst === 'Asignado'
      ? `<span class="badge" style="background:#eff6ff;color:#1d4ed8;font-weight:700">Asignado</span>`
      : `<span class="badge" style="background:#fee2e2;color:#b91c1c;font-weight:700">Broken</span>`;

    const actBtn = `<button class="btn btn-sm btn-outline" onclick='openLiteDocModal(${JSON.stringify(row).replace(/'/g, "&#39;")})' title="Generar acta / imprimir">📄 Acta</button>`;
    const dniTag = (row.dni && row.dni !== '-' && row.dni !== '—') ? ` <span class="dni-tag">DNI: ${esc(row.dni)}</span>` : '';
    const oficinaVal = esc(row.oficina || getNormalizedOffice(row.ubicacion) || '—');

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
        <td>${estBadge}</td>
        <td>${actBtn}</td>
      </tr>`;
    } else if (isElectro) {
      return `<tr>
        <td><strong>${oficinaVal}</strong></td>
        <td><span class="badge" style="background:#f1f5f9;color:#334155;font-weight:700">${esc(row.cantidad || '1')}</span></td>
        <td><strong>${esc(row.articulo || row.tipo || row.modelo || '—')}</strong></td>
        <td>${esc(row.marca || '—')}</td>
        <td>${esc(row.modelo || '—')}</td>
        <td>${estBadge}</td>
        <td>${actBtn}</td>
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
        <td>${estBadge}</td>
        <td>${actBtn}</td>
      </tr>`;
    }
  }).join('');

  renderPagination(total, pages);
  document.querySelectorAll('.sortable-table th[data-col]').forEach(th => {
    th.onclick = () => sortTable(th.dataset.col);
  });
}

function renderPagination(total, pages) {
  const pg = document.getElementById('pagination');
  if (!pg) return;
  if (pages <= 1) { pg.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="goPage(${STATE.currentPage - 1})" ${STATE.currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - STATE.currentPage) > 1) {
      if (i === 3 || i === pages - 2) html += `<span class="page-btn" style="border:none;cursor:default">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === STATE.currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${STATE.currentPage + 1})" ${STATE.currentPage === pages ? 'disabled' : ''}>›</button>`;
  pg.innerHTML = html;
}

function goPage(n) {
  STATE.currentPage = n;
  renderTable();
}

function sortTable(col) {
  if (STATE.sortCol === col) STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
  else { STATE.sortCol = col; STATE.sortDir = 'asc'; }
  STATE.filtered.sort((a, b) => {
    const va = (a[col] || '').toString().toLowerCase();
    const vb = (b[col] || '').toString().toLowerCase();
    return STATE.sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  STATE.currentPage = 1;
  renderTable();
}

function applyFilters() {
  const est = document.getElementById('filterEstado')?.value || '';
  const ubi = document.getElementById('filterUbicacion')?.value || '';
  const resp = (document.getElementById('filterResponsable')?.value || '').toLowerCase();

  let list = getInventoryForCategory(CURRENT_INVENTORY_CATEGORY);
  if (est) list = list.filter(r => normalizeEstado(r.estado, r) === est);
  if (ubi) list = list.filter(r => r.ubicacion === ubi);
  if (resp) {
    list = list.filter(r => ((r.responsable || '') + ' ' + (r.dni || '')).toLowerCase().includes(resp));
  }

  STATE.filtered = list;
  STATE.currentPage = 1;
  renderTable();
}

function clearFilters() {
  const estEl = document.getElementById('filterEstado'); if (estEl) estEl.value = '';
  const ubiEl = document.getElementById('filterUbicacion'); if (ubiEl) ubiEl.value = '';
  const respEl = document.getElementById('filterResponsable'); if (respEl) respEl.value = '';
  STATE.filtered = getInventoryForCategory(CURRENT_INVENTORY_CATEGORY);
  STATE.currentPage = 1;
  renderTable();
}

/* =====================================================
   COMPARTIR ENLACE NGROK (MODAL LITE)
   ===================================================== */
async function openShareModal() {
  const modal = document.getElementById('shareModal');
  if (!modal) return;
  modal.style.display = 'flex';
  lockBodyScroll();

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
  unlockBodyScroll();
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

  if (loading) loading.style.display = 'none';
  if (errDiv) errDiv.style.display = 'none';
  if (ready) ready.style.display = 'block';

  if (input) input.value = url;
  if (openLink) openLink.href = url;
}

async function startNgrokFromUI() {
  const loading = document.getElementById('shareLoadingState');
  const ready = document.getElementById('shareReadyState');
  const errDiv = document.getElementById('shareErrorState');
  const errMsg = document.getElementById('shareErrorMsg');

  if (loading) loading.style.display = 'block';
  if (ready) ready.style.display = 'none';
  if (errDiv) errDiv.style.display = 'none';

  try {
    const res = await fetch('/api/ngrok-start');
    const data = await res.json();
    if (data.url) {
      showShareReady(data.url);
      showToast('Enlace de ngrok generado con éxito', 'success');
    } else {
      if (loading) loading.style.display = 'none';
      if (errDiv) errDiv.style.display = 'block';
      if (errMsg) errMsg.textContent = data.error || 'No se pudo generar el túnel';
    }
  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (errDiv) errDiv.style.display = 'block';
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
    showToast('Error al detener túnel', 'danger');
  }
}

function copyShareUrl() {
  const input = document.getElementById('shareUrlInput');
  const btn = document.getElementById('btnCopyShareUrl');
  if (!input || !input.value) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value).then(() => {
      if (btn) btn.textContent = '✅ Copiado!';
      setTimeout(() => { if (btn) btn.textContent = '📋 Copiar'; }, 2500);
      showToast('Enlace copiado al portapapeles', 'success');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('Enlace copiado al portapapeles', 'success');
    });
  } else {
    input.select();
    document.execCommand('copy');
    showToast('Enlace copiado al portapapeles', 'success');
  }
}

/* =====================================================
   UTILIDADES
   ===================================================== */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


/* =====================================================
   GRÁFICAS FUTURISTAS LITE (Dashboard de Estados)
   ===================================================== */
let chartLiteEstados = null;
let chartLiteCategorias = null;

function updateLiteCharts() {
  if (typeof Chart === 'undefined') return;
  const inv = STATE.inventory || [];
  if (!inv.length) return;

  const total = inv.length;
  const asignados = inv.filter(r => (r.estado || '').toLowerCase() === 'asignado').length;
  const stock = inv.filter(r => (r.estado || '').toLowerCase() === 'stock').length;
  const broken = inv.filter(r => (r.estado || '').toLowerCase() === 'broken').length;

  const computadoras = inv.filter(r => {
    const c = (r.categoria || '').toLowerCase();
    return c.includes('computadora') || c.includes('pc') || c.includes('laptop');
  }).length;
  const telefonos = inv.filter(r => {
    const c = (r.categoria || '').toLowerCase();
    return c.includes('telefono') || c.includes('corporativo') || c.includes('celular');
  }).length;
  const electro = inv.filter(r => {
    const c = (r.categoria || '').toLowerCase();
    return c.includes('electro') || c.includes('inmueble');
  }).length;

  const pctAsig = total > 0 ? Math.round((asignados / total) * 100) : 0;
  const pctOperativo = total > 0 ? ((asignados + stock) / total * 100).toFixed(1) : '100';

  const pctEl = document.getElementById('liteDonutPct');
  if (pctEl) pctEl.textContent = `${pctAsig}%`;
  const badgeEl = document.getElementById('liteBadgeHealth');
  if (badgeEl) badgeEl.textContent = `${pctOperativo}% Operatividad`;

  // Gráfica 1: Dona Futurista de Estados
  const canvasEstados = document.getElementById('chartLiteEstados');
  if (canvasEstados) {
    const ctx = canvasEstados.getContext('2d');
    if (chartLiteEstados) { chartLiteEstados.destroy(); chartLiteEstados = null; }
    chartLiteEstados = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Asignados', 'En Stock', 'Broken / Bajas'],
        datasets: [{
          data: [asignados, stock, broken],
          backgroundColor: ['#10b981', '#0ea5e9', '#f43f5e'],
          borderWidth: 2.5,
          borderColor: '#ffffff',
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 10.5 }, padding: 8 }
          }
        }
      }
    });
  }

  // Gráfica 2: Barras Luminosas de Categorías
  const canvasCat = document.getElementById('chartLiteCategorias');
  if (canvasCat) {
    const ctx2 = canvasCat.getContext('2d');
    if (chartLiteCategorias) { chartLiteCategorias.destroy(); chartLiteCategorias = null; }
    chartLiteCategorias = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Computadoras', 'Teléfonos', 'Electro.'],
        datasets: [{
          label: 'Total',
          data: [computadoras, telefonos, electro],
          backgroundColor: ['#0284c7', '#8b5cf6', '#14b8a6'],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10.5, weight: '600' } } },
          y: { beginAtZero: true, grid: { color: 'rgba(241, 245, 249, 0.9)' }, ticks: { precision: 0, font: { size: 10 } } }
        }
      }
    });
  }
}
