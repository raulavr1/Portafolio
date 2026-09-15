/* ═══════════════════════════════════════════════════════════════
   main.js – Dashboard de Control v4
   Mapa de Calor Continuo + Visualización Standalone de Cliente
═══════════════════════════════════════════════════════════════ */

// ── Estado ──
let allRawIncidentes = [];
let filteredIncidentes = [];
let selectedIncidenteId = null;

// Capas del mapa
let mapa = null;
let markerGroup = null;
let sectorGroup = null;
let predictionGroup = null;
let heatLayer = null;

// Capas base de mapa
let currentBaseLayer = null;
let tileLayerTactical = null;
let tileLayerSatellite = null;
let tileLayerOsm = null;

// Filtro de Franja Horaria en Mapa
let filtroMapaFranja = 'todos';
let puntoPredichoCoords = null;
let prediccionMapaActual = null;
let bannerPrediccionVisible = true;
let filtroNivelActivo = 'todos';
let cuadranteSeleccionadoActivo = null;
let filtroTextoZona = '';

// Modo de visualización del mapa: 'sectores' (Círculos y áreas bien definidas), 'heat' (Mapa de Calor), 'both' (Combinado)
let mapMode = 'sectores';

// Sectores dinámicos generados a partir de los datos cargados
let sectoresDinamicos = {};

// Coordenadas base tácticas (Referencia base georreferenciada)
let centroBase = [-12.0464, -77.0428];

// Gráficos Chart.js
let chartDonut = null;
let chartBar = null;

// Vista / Pestaña activa actual
let activeTab = 'general';

// Filtro temporal interactivo (Matriz Día x Franja Horaria)
let filtroDiaHora = null;

// Simulador What-If Operativo Multi-Recurso
let simPatrullas = 3;
let simMotos = 4;
let simOficialesPie = 6;
let simReten = true;
let simCamaras = true;

// Centro de Guardia y Despacho Táctico Horario
let modoHoraReal = true;
let horaGuardiaSeleccionada = new Date().getHours();
let recomendacionActual = {
  patrullas: 3,
  motos: 4,
  pie: 6,
  reten: true,
  cuadrante: 'Oriente',
  delito: 'Robo'
};

// Estado y orden de la tabla
let ordenColumna = 'id';
let ordenAsc = false;
let filtroEstadoTabla = 'todos';

// ── Inicialización ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const elemFecha = document.getElementById('fechaActual');
  if (elemFecha) elemFecha.textContent = formatearFecha(new Date());
  iniciarReloj();
  iniciarRadarTactico();
  inicializarMapa();
  setupDragAndDrop();
  cargarDatos();
});

// ── Cambiar Pestañas (Modo Rueda / Rotativo) ─────────────────
const TABS_WHEEL_LIST = ['general', 'mapa', 'data'];

function switchTab(tabId) {
  activeTab = tabId;

  TABS_WHEEL_LIST.forEach(id => {
    const btn = document.getElementById(`tab-btn-${id}`);
    if (btn) btn.classList.toggle('active', id === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  const tabTarget = document.getElementById(`tab-${tabId}`);
  if (tabTarget) tabTarget.classList.add('active');

  // Centrar pestaña activa en el carrusel de rueda
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  const tabsBar = document.getElementById('navTabsBar');
  if (activeBtn && tabsBar) {
    const scrollTarget = activeBtn.offsetLeft - (tabsBar.clientWidth / 2) + (activeBtn.clientWidth / 2);
    tabsBar.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
  }

  if (tabId === 'mapa' && mapa) {
    setTimeout(() => {
      mapa.invalidateSize();
      if (filteredIncidentes.length > 0) {
        const coords = filteredIncidentes
          .map(i => [parseFloat(i.lat), parseFloat(i.lng)])
          .filter(([lt, lg]) => !isNaN(lt) && !isNaN(lg));
        if (coords.length > 0) {
          mapa.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
        }
      }
    }, 100);
  } else if (tabId === 'general' && window._simMiniMapInstance) {
    setTimeout(() => {
      window._simMiniMapInstance.invalidateSize();
      actualizarMiniMapaSector();
    }, 150);
  }
}

// Navegación en Rueda Continua (Next / Prev)
function scrollTabsWheel(direction) {
  let currentIndex = TABS_WHEEL_LIST.indexOf(activeTab);
  if (currentIndex === -1) currentIndex = 0;
  let nextIndex = currentIndex + direction;
  // Comportamiento rotativo circular continuo
  if (nextIndex < 0) nextIndex = TABS_WHEEL_LIST.length - 1;
  if (nextIndex >= TABS_WHEEL_LIST.length) nextIndex = 0;
  switchTab(TABS_WHEEL_LIST[nextIndex]);
}

// Función utilitaria para navegación horizontal con arrastre, rueda y gestos táctiles
function habilitarScrollHorizontalSuave(el) {
  if (!el) return;
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  el.addEventListener('mousedown', (e) => {
    isDown = true;
    el.classList.add('is-dragging');
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      el.classList.remove('is-dragging');
    }
  });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeft - walk;
  });

  // Desplazamiento horizontal con rueda del ratón
  el.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Gestos táctiles nativos para teléfonos
  let touchStartX = 0;
  let touchScrollLeft = 0;

  el.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = el.scrollLeft;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX;
    const walk = (x - touchStartX) * 1.3;
    el.scrollLeft = touchScrollLeft - walk;
  }, { passive: true });
}

// Inicializar Drag-to-Scroll y rueda en carrusel de pestañas y barras de chips
document.addEventListener('DOMContentLoaded', () => {
  habilitarScrollHorizontalSuave(document.getElementById('navTabsBar'));
  document.querySelectorAll('.preset-chips, .mch-chips').forEach(habilitarScrollHorizontalSuave);
});

function formatearFecha(d) {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()} · ${padZ(d.getHours())}:${padZ(d.getMinutes())}`;
}
function padZ(n) { return n.toString().padStart(2,'0'); }

// ── Telemetría: Reloj Táctico en Vivo & Despacho Horario ──────
function iniciarReloj() {
  function tick() {
    const now = new Date();
    const clock = document.getElementById('liveClock');
    if (clock) clock.textContent = `${padZ(now.getHours())}:${padZ(now.getMinutes())}:${padZ(now.getSeconds())}`;

    if (modoHoraReal) {
      const currentHour = now.getHours();
      if (currentHour !== horaGuardiaSeleccionada) {
        horaGuardiaSeleccionada = currentHour;
        const slider = document.getElementById('sliderHoraGuardia');
        if (slider) slider.value = currentHour;
        actualizarAlertaDespacho(currentHour);
      }
    }
  }
  tick();
  setInterval(tick, 1000);
}

// ── Controles de Modo de Tiempo de Guardia ──────────────────
function activarModoHoraReal() {
  modoHoraReal = true;
  const btnReal = document.getElementById('btnHoraReal');
  const btnManual = document.getElementById('btnHoraManual');
  const badgeModo = document.getElementById('badgeModoHora');
  if (btnReal) btnReal.classList.add('active');
  if (btnManual) btnManual.classList.remove('active');
  if (badgeModo) badgeModo.textContent = '🕒 MODO TIEMPO REAL';

  horaGuardiaSeleccionada = new Date().getHours();
  const slider = document.getElementById('sliderHoraGuardia');
  if (slider) slider.value = horaGuardiaSeleccionada;
  actualizarAlertaDespacho(horaGuardiaSeleccionada);
  mostrarToast('Sincronizado con Hora de Guardia en Tiempo Real', 'info');
}

function activarModoSimularHora() {
  modoHoraReal = false;
  const btnReal = document.getElementById('btnHoraReal');
  const btnManual = document.getElementById('btnHoraManual');
  const badgeModo = document.getElementById('badgeModoHora');
  if (btnReal) btnReal.classList.remove('active');
  if (btnManual) btnManual.classList.add('active');
  if (badgeModo) badgeModo.textContent = '🎛️ MODO SIMULACIÓN HORARIA';
}

function cambiarHoraGuardia(hora) {
  horaGuardiaSeleccionada = parseInt(hora);
  if (modoHoraReal) {
    activarModoSimularHora();
  }
  // Actualizar presets activos
  document.querySelectorAll('.t-preset-btn').forEach(b => b.classList.remove('active'));
  actualizarAlertaDespacho(horaGuardiaSeleccionada);
}

function seleccionarHoraRapida(hora) {
  const slider = document.getElementById('sliderHoraGuardia');
  if (slider) slider.value = hora;
  cambiarHoraGuardia(hora);
  // Resaltar botón seleccionado
  document.querySelectorAll('.t-preset-btn').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`(${hora})`)) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

// ── Micro-interacción: Animación de Conteo Numérico (CountUp) ──
function animarContador(elementId, valorFinal, duration = 650) {
  const elem = document.getElementById(elementId);
  if (!elem) return;
  const startVal = parseInt(elem.textContent) || 0;
  if (isNaN(valorFinal)) {
    elem.textContent = valorFinal;
    return;
  }
  if (startVal === valorFinal) return;

  const startTime = performance.now();
  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(startVal + (valorFinal - startVal) * easeProgress);
    elem.textContent = currentVal;
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      elem.textContent = valorFinal;
    }
  }
  requestAnimationFrame(updateNumber);
}

// ── Notificaciones Toast Tácticas ───────────────────────────
function mostrarToast(mensaje, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  const icon = tipo === 'success' ? '✅' : tipo === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${mensaje}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px) scale(0.95)';
    setTimeout(() => toast.remove(), 320);
  }, 3200);
}

// ── Exportación / Impresión Deshabilitada ─────────────────────
function imprimirReporte() {
  mostrarToast('Función de descarga deshabilitada.', 'info');
}

// ── Inicializar el Mapa Táctico ──────────────────────────────
function inicializarMapa() {
  mapa = L.map('mapaInteractivo', { zoomControl: true, attributionControl: false })
          .setView(centroBase, 13);

  // Capa 1: Esri World Light Gray Base (Cartografía táctica limpia oficial, neutralizada sin etiquetas de ciudades)
  const esriGrayBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  });
  tileLayerTactical = L.layerGroup([esriGrayBase]);

  // Capa 2: Esri World Imagery (Satelital de Operaciones)
  tileLayerSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18
  });

  // Capa 3: OpenStreetMap estándar
  tileLayerOsm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: ['a', 'b', 'c']
  });

  // Por defecto usar Capa Táctica Limpia
  currentBaseLayer = tileLayerTactical;
  currentBaseLayer.addTo(mapa);

  sectorGroup = L.layerGroup().addTo(mapa);
  markerGroup = L.layerGroup().addTo(mapa);
  predictionGroup = L.layerGroup().addTo(mapa);
}

// ── Cambiar Capa Base de Mapa (Táctico / Satelital / Calles) ──
function cambiarCapaMapa(capa) {
  if (!mapa) return;
  if (currentBaseLayer) mapa.removeLayer(currentBaseLayer);

  ['Tactical', 'Sat', 'Osm'].forEach(c => {
    const btn = document.getElementById(`tileBtn${c}`);
    if (btn) btn.classList.remove('active');
  });

  if (capa === 'satellite') {
    currentBaseLayer = tileLayerSatellite;
    const btn = document.getElementById('tileBtnSat');
    if (btn) btn.classList.add('active');
    mostrarToast('Capa Satelital de Operaciones activada', 'info');
  } else if (capa === 'osm') {
    currentBaseLayer = tileLayerOsm;
    const btn = document.getElementById('tileBtnOsm');
    if (btn) btn.classList.add('active');
    mostrarToast('Capa Callejero Estándar activada', 'info');
  } else {
    currentBaseLayer = tileLayerTactical;
    const btn = document.getElementById('tileBtnTactical');
    if (btn) btn.classList.add('active');
    mostrarToast('Cartografía Táctica de Despacho activada', 'info');
  }

  currentBaseLayer.addTo(mapa);
}

// ── Filtrar Mapa por Horas Críticas ──────────────────────────
function filtrarMapaFranja(franja) {
  filtroMapaFranja = franja;

  ['todos', 'noche', 'madrugada', 'tarde', 'manana'].forEach(f => {
    const chip = document.getElementById(`mch-${f}`);
    if (chip) chip.classList.toggle('active', f === franja);
  });

  const labelElem = document.getElementById('mapFranjaActivaTexto');
  const labels = {
    'todos': 'Todas las 24 Horas',
    'noche': 'Franja Crítica Nocturna (18:00 - 02:00h)',
    'madrugada': 'Madrugada de Riesgo (00:00 - 06:00h)',
    'tarde': 'Tarde Comercial (12:00 - 18:00h)',
    'manana': 'Mañana Operativa (06:00 - 12:00h)'
  };
  if (labelElem) labelElem.textContent = labels[franja] || 'Franja Personalizada';

  const subBar = document.getElementById('barSubtitleFranja');
  if (subBar) subBar.textContent = `Partes registrados en: ${labels[franja] || 'Franja activa'}`;

  const sectorCount = {};
  filteredIncidentes.forEach(i => {
    if (i.sector) sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1;
  });

  actualizarMapaColoresYSectores(sectorCount);
  mostrarToast(`Filtrando mapa por: ${labels[franja]}`, 'info');
}

// ── Enfocar Predicción Táctica en el Mapa ───────────────────
function enfocarPrediccionMapa() {
  if (!mapa || !puntoPredichoCoords) {
    mostrarToast('No hay una zona de predicción activa para enfocar.', 'warning');
    return;
  }
  mapa.flyTo(puntoPredichoCoords, 15, { animate: true, duration: 1.2 });
  if (predictionGroup) {
    predictionGroup.eachLayer(layer => {
      if (layer.openPopup) layer.openPopup();
    });
  }
  mostrarToast('Cámara centrada en la Zona de Predicción Inminente 🎯', 'success');
}

// ── Despachar Unidades al Foco Previsto ───────────────────────
function ejecutarRespuestaAnticipada() {
  if (!prediccionMapaActual) return;

  sectorSimuladorActivo = prediccionMapaActual.sector || 'Oriente';
  const selTarget = document.getElementById('simSectorTarget');
  if (selTarget) selTarget.value = sectorSimuladorActivo;

  simPatrullas = prediccionMapaActual.sugPatrullas || 3;
  simMotos = prediccionMapaActual.sugMotos || 4;
  simOficialesPie = 6;
  simReten = true;

  const sliderP = document.getElementById('simPatrullas');
  const sliderM = document.getElementById('simMotos');
  const sliderPie = document.getElementById('simOficialesPie');
  const btnReten = document.getElementById('simBtnReten');

  if (sliderP) sliderP.value = simPatrullas;
  if (sliderM) sliderM.value = simMotos;
  if (sliderPie) sliderPie.value = simOficialesPie;
  if (btnReten) btnReten.classList.add('active');

  actualizarSimulacionMulti();
  actualizarUnidadesEnMapa();
  enfocarPrediccionMapa();
  mostrarToast(`🚨 Plan de Contención Activado: Despachados ${simPatrullas} móviles y ${simMotos} motos a Cuadrante ${sectorSimuladorActivo}`, 'success');
}

// ── Cambiar Modo de Mapa (Heatmap / Sectores / Combinado) ───
function setMapMode(mode) {
  mapMode = mode;

  ['Sectores', 'Heat', 'Both'].forEach(m => {
    const btn = document.getElementById(`btnMode${m}`);
    if (btn) btn.classList.toggle('active', m.toLowerCase() === mode);
  });

  const sectorCount = {};
  filteredIncidentes.forEach(i => {
    if (i.sector) sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1;
  });

  actualizarMapaColoresYSectores(sectorCount);
}

// ── Controlador de Ventana Emergente de Carga de Archivo ──────
function abrirModalUpload() {
  const modal = document.getElementById('modalUploadBackdrop');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }
}

function cerrarModalUpload(e) {
  if (e && e.target && e.target.id !== 'modalUploadBackdrop' && !e.target.classList.contains('modal-close-btn')) {
    return;
  }
  const modal = document.getElementById('modalUploadBackdrop');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }
}

// ── Controlador de Ventana Emergente: Aviso de Datos de Prueba ──
function abrirModalDatosPrueba() {
  const modal = document.getElementById('modalDemoDataBackdrop');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }
}

function cerrarModalDatosPrueba(e) {
  if (e && e.target && e.target.id !== 'modalDemoDataBackdrop' && !e.target.classList.contains('modal-close-btn')) {
    return;
  }
  const modal = document.getElementById('modalDemoDataBackdrop');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }
}

function ejecutarRecargaDatosPrueba() {
  cargarDatosPrueba();
  cerrarModalDatosPrueba();
  mostrarToast('🔄 Entorno de datos de muestra recargado correctamente.', 'success');
}

// Cerrar modales al presionar la tecla Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModalUpload();
    cerrarModalDatosPrueba();
  }
});

function procesarArchivoModal(file) {
  if (!file) return;

  const nameLower = file.name.toLowerCase();
  const validExts = ['.xlsx', '.xls', '.csv'];
  const isValid = validExts.some(ext => nameLower.endsWith(ext));

  if (!isValid) {
    mostrarToast('Formato no compatible. Selecciona un archivo .xlsx, .xls o .csv', 'warning');
    return;
  }

  cerrarModalUpload();
  subirExcel(file);
}

// ── Drag & Drop General y en Modal ───────────────────────────
function setupDragAndDrop() {
  const dropzones = [
    document.getElementById('dropzone'),
    document.getElementById('modalDropzone')
  ].filter(Boolean);

  dropzones.forEach(dz => {
    ['dragenter', 'dragover'].forEach(eventName => {
      dz.addEventListener(eventName, (e) => {
        e.preventDefault();
        dz.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dz.addEventListener(eventName, (e) => {
        e.preventDefault();
        dz.classList.remove('dragover');
      }, false);
    });

    dz.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) {
        if (dz.id === 'modalDropzone') {
          procesarArchivoModal(file);
        } else {
          subirExcel(file);
        }
      }
    }, false);
  });
}

// ── Cargar Datos de Prueba Genéricos para Demostración e Interacción ──
function cargarDatosPrueba() {
  try {
    localStorage.removeItem('cached_incidentes');
  } catch (e) {}

  allRawIncidentes = [];
  filteredIncidentes = [];

  const fTipo = document.getElementById('filterTipo');
  if (fTipo) fTipo.value = 'todos';
  const fSector = document.getElementById('filterSector');
  if (fSector) fSector.value = 'todos';
  const fPeriodo = document.getElementById('filterPeriodo');
  if (fPeriodo) fPeriodo.value = '0';
  const fSearch = document.getElementById('filterSearch');
  if (fSearch) fSearch.value = '';

  filtroDiaHora = null;
  filtroEstadoTabla = 'todos';
  filtroNivelActivo = 'todos';
  cuadranteSeleccionadoActivo = null;

  cerrarModalUpload();

  // Recargar datos genéricos sintéticos
  allRawIncidentes = obtenerDatosGenericos().map((item, idx) => normalizarRegistro(item, idx));
  poblarSectoresDropdown(allRawIncidentes);
  aplicarFiltros();

  mostrarToast('📊 Datos de prueba genéricos cargados exitosamente para evaluar el dashboard.', 'success');
}

// ── Eliminar Información Cargada / Restablecer Dashboard ────────
function limpiarDatosCargados() {
  const confirmar = confirm('¿Deseas eliminar los datos cargados del dashboard? Se restablecerá el sistema al estado inicial de demostración con partes anonimizados.');
  if (!confirmar) return;

  cargarDatosPrueba();
  mostrarToast('🗑️ Información anterior eliminada. Dashboard restablecido al entorno de prueba.', 'info');
}

// ── Descarga de Plantilla Deshabilitada ───────────────────────
function descargarPlantillaDemo() {
  mostrarToast('Descarga deshabilitada en esta plataforma.', 'info');
}

// ── Normalizador hiper-resiliente de registros Excel ────────
function normalizarRegistro(inc, index) {
  const hoy = new Date();
  const yearCliente = hoy.getFullYear();

  // 1. Extraer Fecha (Soporta múltiples alias y formatos DD/MM/YYYY, YYYY-MM-DD, Excel Serial, Date)
  let rawFecha = inc.fecha || inc.Fecha || inc.FECHA || inc.date || inc.Date ||
                 inc.FECHA_HECHO || inc.F_OCURRENCIA || inc.Fecha_Hecho || inc.fecha_hecho;
  let fechaStr = '';

  if (rawFecha !== undefined && rawFecha !== null) {
    if (rawFecha instanceof Date && !isNaN(rawFecha.getTime())) {
      const mm = String(rawFecha.getMonth() + 1).padStart(2, '0');
      const dd = String(rawFecha.getDate()).padStart(2, '0');
      fechaStr = `${yearCliente}-${mm}-${dd}`;
    } else if (typeof rawFecha === 'number') {
      const dateObj = new Date(Math.round((rawFecha - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        fechaStr = `${yearCliente}-${mm}-${dd}`;
      }
    } else {
      const str = String(rawFecha).trim();
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        fechaStr = `${yearCliente}-${mm}-${dd}`;
      } else {
        const partes = str.split(/[-/.]/);
        if (partes.length === 3) {
          let m, d;
          if (partes[0].length === 4) { // YYYY-MM-DD
            m = partes[1]; d = partes[2];
          } else if (partes[2].length === 4) { // DD-MM-YYYY
            d = partes[0]; m = partes[1];
          } else {
            d = partes[0]; m = partes[1];
          }
          if (m && d) {
            const mm = String(m).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            fechaStr = `${yearCliente}-${mm}-${dd}`;
          }
        }
      }
    }
  }

  if (!fechaStr) {
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaStr = `${yearCliente}-${mm}-${dd}`;
  }

  // 2. Extraer Tipo de Delito (Múltiples alias)
  let rawTipo = inc.tipo || inc.Tipo || inc.TIPO || inc['Tipo de Delito'] || inc['TIPO DE DELITO'] ||
                inc.Delito || inc.DELITO || inc.delito || inc.MODALIDAD || inc.Modalidad || 'Robo';
  let tipoStr = String(rawTipo).trim();
  const tipoLower = tipoStr.toLowerCase();
  if (tipoLower.includes('robo')) tipoStr = 'Robo';
  else if (tipoLower.includes('hurto')) tipoStr = 'Hurto';
  else if (tipoLower.includes('lesion')) tipoStr = 'Lesiones';
  else if (tipoStr.length > 0) tipoStr = tipoStr.charAt(0).toUpperCase() + tipoStr.slice(1);
  else tipoStr = 'Robo';

  // 3. Extraer Sector (Múltiples alias)
  let rawSector = inc.sector || inc.Sector || inc.SECTOR || inc.zona || inc.Zona || inc.ZONA ||
                  inc.barrio || inc.Barrio || inc.BARRIO || inc.Lugar || inc.LUGAR || 'Centro';
  let sectorStr = String(rawSector).trim() || 'Centro';

  // 4. Extraer Hora
  let rawHora = inc.hora || inc.Hora || inc.HORA || inc.Time || inc.HORA_HECHO || inc.H_OCURRENCIA || '12:00';
  let horaStr = '12:00';
  if (typeof rawHora === 'number') {
    const totalMin = Math.round(rawHora * 24 * 60);
    const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const min = String(totalMin % 60).padStart(2, '0');
    horaStr = `${hh}:${min}`;
  } else if (rawHora) {
    horaStr = String(rawHora).trim();
  }

  // 5. Coordenadas lat/lng
  let lat = parseFloat(inc.lat || inc.Lat || inc.LAT || inc.latitud || inc.Latitud || inc.LATITUD || inc.y || inc.Y || 4.6510);
  let lng = parseFloat(inc.lng || inc.Lng || inc.LNG || inc.longitud || inc.Longitud || inc.LONGITUD || inc.x || inc.X || -74.0800);
  if (isNaN(lat)) lat = 4.6510;
  if (isNaN(lng)) lng = -74.0800;

  // 6. Estado y Descripción
  let estadoStr = String(inc.estado || inc.Estado || inc.ESTADO || inc.Status || 'Investigado').trim();
  let descStr = String(inc.descripcion || inc.Descripcion || inc.DESCRIPCION || inc.Detalle || inc.DETALLE || `Incidente de ${tipoStr} en sector ${sectorStr}`).trim();

  return {
    id: inc.id || inc.Id || (index + 1),
    fecha: fechaStr,
    hora: horaStr,
    tipo: tipoStr,
    sector: sectorStr,
    lat: lat,
    lng: lng,
    descripcion: descStr,
    estado: estadoStr
  };
}

// ── Subir Archivo (Soporta .xlsx, .xls, .csv con Procesamiento Instantáneo) ──
function subirExcel(file) {
  if (!file) return;

  const nameLower = file.name.toLowerCase();
  const validExts = ['.xlsx', '.xls', '.csv'];
  const isValid = validExts.some(ext => nameLower.endsWith(ext));

  if (!isValid) {
    mostrarToast('Por favor, selecciona un archivo válido con extensión .xlsx, .xls o .csv', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onload = async (e) => {
    try {
      const arrayBuffer = e.target.result;
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

      if (!Array.isArray(rawJson) || rawJson.length === 0) {
        mostrarToast('El archivo cargado está vacío o no contiene filas de datos válidas.', 'warning');
        return;
      }

      // Normalizar cada registro del archivo subido
      allRawIncidentes = rawJson.map((item, idx) => normalizarRegistro(item, idx));

      // Resetear controles de filtro a por defecto para mostrar el 100% de los datos subidos
      const fTipo = document.getElementById('filterTipo');
      if (fTipo) fTipo.value = 'todos';
      const fSector = document.getElementById('filterSector');
      if (fSector) fSector.value = 'todos';
      const fPeriodo = document.getElementById('filterPeriodo');
      if (fPeriodo) fPeriodo.value = '0';
      const fSearch = document.getElementById('filterSearch');
      if (fSearch) fSearch.value = '';

      // Guardar en el almacenamiento local del navegador
      try {
        localStorage.setItem('cached_incidentes', JSON.stringify(allRawIncidentes));
      } catch (errLS) {}

      poblarSectoresDropdown(allRawIncidentes);
      aplicarFiltros();

      // Enviar copia en segundo plano a la BD del servidor
      try {
        await fetch('/api/incidentes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: allRawIncidentes })
        });
      } catch (errNoServer) {}

      mostrarToast(`✅ ¡Carga exitosa! Se procesaron y mostraron ${allRawIncidentes.length} partes desde "${file.name}".`, 'success');

    } catch (err) {
      console.error('Error al procesar el archivo:', err);
      mostrarToast('Ocurrió un error al leer el archivo. Verifica que las columnas coincidan.', 'danger');
    }
  };
}

// ── Datos Realistas Generadores (Distribución Variada y Heterogénea) ───────
function obtenerDatosGenericos() {
  // Distribución realista ponderada calculada a partir del centroBase activo
  const baseLat = (Array.isArray(centroBase) && !isNaN(centroBase[0])) ? centroBase[0] : -12.0464;
  const baseLng = (Array.isArray(centroBase) && !isNaN(centroBase[1])) ? centroBase[1] : -77.0428;

  const configSectores = [
    { nombre: 'Oriente',   peso: 12, lat: baseLat + 0.0040, lng: baseLng - 0.0080 }, // Foco crítico
    { nombre: 'Centro',    peso: 8,  lat: baseLat + 0.0010, lng: baseLng + 0.0000 }, // Moderado
    { nombre: 'Norte',     peso: 5,  lat: baseLat + 0.0120, lng: baseLng + 0.0080 }, // Moderado
    { nombre: 'Sur',       peso: 3,  lat: baseLat - 0.0120, lng: baseLng - 0.0050 }, // Bajo
    { nombre: 'Occidente', peso: 2,  lat: baseLat + 0.0100, lng: baseLng - 0.0060 }  // Bajo
  ];

  const tiposPonderados = ['Robo', 'Robo', 'Robo', 'Hurto', 'Hurto', 'Lesiones'];
  const horasPonderadas = ['19:40', '21:15', '18:30', '22:10', '20:05', '14:20', '16:45', '10:15', '03:30'];

  const hoy = new Date();
  const yearActual = hoy.getFullYear();
  const data = [];
  let idContador = 1;

  configSectores.forEach(sec => {
    for (let j = 0; j < sec.peso; j++) {
      const tipo = tiposPonderados[(idContador + j) % tiposPonderados.length];
      const hora = horasPonderadas[(idContador * 2 + j) % horasPonderadas.length];
      const diasAtras = (j * 2 + idContador % 5) % 20;
      
      const d = new Date(hoy.getTime() - diasAtras * 86400000);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const fechaStr = `${yearActual}-${mm}-${dd}`;

      // Desplazamiento geográfico natural alrededor del centro del sector
      const angle = (j * 1.25) + idContador;
      const dist = 0.003 + (j * 0.0015);
      const lat = Number((sec.lat + Math.sin(angle) * dist).toFixed(5));
      const lng = Number((sec.lng + Math.cos(angle) * dist).toFixed(5));

      data.push({
        id: idContador,
        fecha: fechaStr,
        hora: hora,
        tipo: tipo,
        sector: sec.nombre,
        lat: lat,
        lng: lng,
        descripcion: `Incidente registrado de ${tipo.toLowerCase()} en sector ${sec.nombre}`,
        estado: (j % 2 === 0) ? 'Investigado' : 'Pendiente'
      });

      idContador++;
    }
  });

  return data;
}

// ── Cargar Datos (Independiente del Servidor) ───────────────
async function cargarDatos() {
  const btn = document.getElementById('btnRefresh');
  if (btn) {
    btn.textContent = 'Cargando...';
    btn.disabled = true;
  }

  try {
    // 1. Verificar localStorage del navegador (descartar si es el dataset antiguo homogéneo donde todos los sectores eran iguales)
    const cached = localStorage.getItem('cached_incidentes');
    if (cached) {
      const parsed = JSON.parse(cached);
      const esAntiguoUniforme = Array.isArray(parsed) && (
        (parsed.length === 30 && parsed.filter(p=>p.sector==='Oriente').length === 6 && parsed.filter(p=>p.sector==='Norte').length === 6) ||
        (parsed.length === 25 && parsed.filter(p=>p.sector==='Oriente').length === 5 && parsed.filter(p=>p.sector==='Norte').length === 5)
      );
      if (Array.isArray(parsed) && parsed.length > 0 && !esAntiguoUniforme) {
        allRawIncidentes = parsed.map((item, idx) => normalizarRegistro(item, idx));
        poblarSectoresDropdown(allRawIncidentes);
        aplicarFiltros();
        return;
      } else if (esAntiguoUniforme) {
        localStorage.removeItem('cached_incidentes');
      }
    }

    // 2. Cargar datos de muestra integrados si no hay cache
    allRawIncidentes = obtenerDatosGenericos().map((item, idx) => normalizarRegistro(item, idx));
    poblarSectoresDropdown(allRawIncidentes);
    aplicarFiltros();

    // 3. Consultar silenciosamente al servidor si estuviera corriendo
    try {
      const resp = await fetch('/api/incidentes');
      if (resp.ok) {
        const result = await resp.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          allRawIncidentes = result.data.map((item, idx) => normalizarRegistro(item, idx));
          poblarSectoresDropdown(allRawIncidentes);
          aplicarFiltros();
        }
      }
    } catch (errNoServer) {}

  } catch (errCargar) {
    console.error('Error en cargarDatos:', errCargar);
  } finally {
    if (btn) {
      btn.textContent = 'Actualizar Datos';
      btn.disabled = false;
    }
  }
}

// ── Poblar Dropdown de Sectores ──────────────────────────────
function poblarSectoresDropdown(data) {
  const select = document.getElementById('filterSector');
  if (!select) return;
  select.innerHTML = '<option value="todos">Todos los sectores</option>';

  const sectores = [...new Set(data.map(i => i.sector).filter(Boolean))].sort();
  sectores.forEach(sec => {
    const opt = document.createElement('option');
    opt.value = sec;
    opt.textContent = sec;
    select.appendChild(opt);
  });
}

// ── Calcular Sectores Dinámicamente desde el Excel ───────────
function calcularSectoresDinamicos(incidentes) {
  const grupos = {};

  incidentes.forEach(inc => {
    const secName = inc.sector || 'General';
    const lat = parseFloat(inc.lat);
    const lng = parseFloat(inc.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    if (!grupos[secName]) {
      grupos[secName] = { lats: [], lngs: [] };
    }
    grupos[secName].lats.push(lat);
    grupos[secName].lngs.push(lng);
  });

  const geoDinamica = {};
  Object.keys(grupos).forEach(secName => {
    const gr = grupos[secName];
    const n = gr.lats.length;
    const avgLat = gr.lats.reduce((a,b)=>a+b, 0) / n;
    const avgLng = gr.lngs.reduce((a,b)=>a+b, 0) / n;

    let sumDist = 0;
    for (let i = 0; i < n; i++) {
      const dLat = (gr.lats[i] - avgLat) * 111320;
      const dLng = (gr.lngs[i] - avgLng) * 111320;
      sumDist += Math.sqrt(dLat * dLat + dLng * dLng);
    }
    const dispersion = sumDist / n;
    const radius = Math.max(700, Math.min(3000, dispersion || 1200));

    geoDinamica[secName] = {
      center: [avgLat, avgLng],
      radius: radius
    };
  });

  return geoDinamica;
}

// ── Aplicar Filtros (Reactivo) ───────────────────────────────
function aplicarFiltros() {
  const fTipoElem = document.getElementById('filterTipo');
  const fSectorElem = document.getElementById('filterSector');
  const fPeriodoElem = document.getElementById('filterPeriodo');
  const fSearchElem = document.getElementById('filterSearch');

  const fTipo = fTipoElem ? fTipoElem.value : 'todos';
  const fSector = fSectorElem ? fSectorElem.value : 'todos';
  const fPeriodo = fPeriodoElem ? parseInt(fPeriodoElem.value) : 0;
  const fSearch = fSearchElem ? fSearchElem.value.toLowerCase().trim() : '';

  const hoy = new Date();

  let tempFiltered = allRawIncidentes.filter(inc => {
    if (fTipo !== 'todos' && inc.tipo !== fTipo) return false;
    if (fSector !== 'todos' && inc.sector !== fSector) return false;
    if (fPeriodo > 0) {
      const fecha = new Date(inc.fecha);
      const diff = Math.abs((hoy - fecha) / 86400000);
      if (diff > fPeriodo) return false;
    }
    if (fSearch) {
      const desc = (inc.descripcion || '').toLowerCase();
      const sector = (inc.sector || '').toLowerCase();
      const tipo = (inc.tipo || '').toLowerCase();
      if (!desc.includes(fSearch) && !sector.includes(fSearch) && !tipo.includes(fSearch)) return false;
    }

    // Filtro interactivo de Matriz Temporal (Día y Franja Horaria)
    if (filtroDiaHora) {
      if (filtroDiaHora.dia && filtroDiaHora.dia !== 'Todos') {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const dayIdx = new Date(inc.fecha).getDay();
        const diaNombre = dias[(dayIdx + 6) % 7];
        if (diaNombre !== filtroDiaHora.dia) return false;
      }
      if (filtroDiaHora.franja) {
        const hora = parseInt((inc.hora || '12:00').split(':')[0]);
        let fKey = '18-24';
        if (hora < 6) fKey = '00-06';
        else if (hora < 12) fKey = '06-12';
        else if (hora < 18) fKey = '12-18';
        if (fKey !== filtroDiaHora.franja) return false;
      }
    }

    return true;
  });

  if (tempFiltered.length === 0 && allRawIncidentes.length > 0 && fTipo === 'todos' && fSector === 'todos' && !fSearch && !filtroDiaHora) {
    filteredIncidentes = [...allRawIncidentes];
  } else {
    filteredIncidentes = tempFiltered;
  }

  filteredIncidentes.sort((a,b) => new Date(b.fecha+' '+b.hora) - new Date(a.fecha+' '+a.hora));

  actualizarDashboard();
}

// ── Actualizar Dashboard (Arquitectura Aislada Inquebrantable) ───
function actualizarDashboard() {
  // 1. Render KPIs con animación fluida CountUp
  try {
    animarContador('kpiTotal', filteredIncidentes.length);

    const elemCount = document.getElementById('tableCount');
    if (elemCount) elemCount.textContent = `${filteredIncidentes.length} registros`;

    const robos = filteredIncidentes.filter(i => i.tipo === 'Robo').length;
    animarContador('kpiRobos', robos);

    const hurtos = filteredIncidentes.filter(i => i.tipo === 'Hurto').length;
    animarContador('kpiHurtos', hurtos);
  } catch (eKPI) {}

  const sectorCount = {};
  filteredIncidentes.forEach(i => {
    if (i.sector) sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1;
  });
  const sortedSectores = Object.entries(sectorCount).sort((a,b)=>b[1]-a[1]);
  const maxSectorName = (sortedSectores.length > 0 && sortedSectores[0]) ? sortedSectores[0][0] : '—';

  const elemSectorCritico = document.getElementById('kpiSectorCritico');
  if (elemSectorCritico) elemSectorCritico.textContent = maxSectorName;

  let delitoPpal = 'Robo';
  try {
    const countsTipos = filteredIncidentes.reduce((acc, i) => {
      const t = i.tipo || 'Robo';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const sortedTipos = Object.entries(countsTipos).sort((a,b)=>b[1]-a[1]);
    if (sortedTipos.length > 0 && sortedTipos[0] && sortedTipos[0][0]) {
      delitoPpal = sortedTipos[0][0];
    }
  } catch (eTip) {}

  const count30d = filteredIncidentes.filter(i => {
    const diff = (new Date() - new Date(i.fecha)) / 86400000;
    return diff <= 30;
  }).length;
  let nivelRiesgo = count30d >= 8 ? 'ALTO' : count30d >= 4 ? 'MEDIO' : 'BAJO';

  if (filteredIncidentes.length === 0) {
    mostrarEstadoVacio();
    return;
  }

  // 2. Render Tabla de Incidentes
  try { renderTabla(); } catch (eT) { console.error('Error renderTabla:', eT); }

  // 3. Render Predicción Táctica
  try { renderPrediccion(delitoPpal, maxSectorName); } catch (eP) { console.error('Error renderPrediccion:', eP); }

  // 4. Render Gráficas (Donuts & Barras)
  try { renderGraficas(); } catch (eG) { console.error('Error renderGraficas:', eG); }

  // 5. Render Recomendaciones
  try { renderRecomendaciones(delitoPpal, maxSectorName, nivelRiesgo); } catch (eR) { console.error('Error renderRecomendaciones:', eR); }

  // 6. Render Conclusiones
  try { renderConclusiones(nivelRiesgo, filteredIncidentes); } catch (eC) { console.error('Error renderConclusiones:', eC); }

  // 7. Render Mapa y Estadísticas del Mapa
  try {
    sectoresDinamicos = calcularSectoresDinamicos(filteredIncidentes);
    actualizarMapaColoresYSectores(sectorCount);
    renderMapStats(sectorCount, nivelRiesgo);
    if (window._simMiniMapInstance) {
      actualizarMiniMapaSector();
    }
  } catch (eM) { console.error('Error Mapa:', eM); }

  // 8. Render Matriz Temporal Semanal
  try { renderMatrizTemporal(allRawIncidentes); } catch (eMT) { console.error('Error Matriz Temporal:', eMT); }

  // 8b. Sync tabla de zona con la selección activa (o toda la jurisdicción)
  try {
    if (cuadranteSeleccionadoActivo) {
      actualizarTablaZona(cuadranteSeleccionadoActivo);
    } else {
      actualizarTablaZona(null);
    }
  } catch (eZT) { console.error('Error Tabla Zona:', eZT); }

  // 9. Render Alerta Temprana de Despacho de Guardia & Simulador Multi-Recurso
  try { actualizarAlertaDespacho(horaGuardiaSeleccionada); } catch (eAD) { console.error('Error Alerta Despacho:', eAD); }
  try { actualizarSimulacionMulti(); } catch (eSM) { console.error('Error Simulador Multi:', eSM); }
}

function mostrarEstadoVacio() {
  const tbody = document.getElementById('tbodyIncidentes');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-state">No hay registros cargados. Usa "Cargar Excel" para subir datos.</td></tr>`;
  }
  const predBody = document.getElementById('predictionBody');
  if (predBody) {
    predBody.innerHTML = `<div class="pred-block"><span class="pred-title">Prediccion Temporal</span><span class="pred-val" style="color:var(--text-muted); font-size:14px;">Cargue un Excel para calcular estimaciones.</span></div>`;
  }
  if (markerGroup) markerGroup.clearLayers();
  if (sectorGroup) sectorGroup.clearLayers();
  if (heatLayer && mapa) {
    try { mapa.removeLayer(heatLayer); } catch(e){}
    heatLayer = null;
  }
  if (chartDonut) chartDonut.destroy();
  if (chartBar) chartBar.destroy();
}

// ── Render: Tabla de Incidentes ──────────────────────────────
function renderTabla() {
  const tbody = document.getElementById('tbodyIncidentes');
  if (!tbody) return;
  tbody.innerHTML = '';

  const lista = filtroEstadoTabla === 'todos'
    ? filteredIncidentes
    : filteredIncidentes.filter(i => i.estado === filtroEstadoTabla);

  const elemCount = document.getElementById('tableCount');
  if (elemCount) elemCount.textContent = `${lista.length} registros`;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-state">No se encontraron incidentes con el filtro de estado seleccionado (${filtroEstadoTabla}).</td></tr>`;
    return;
  }

  lista.forEach(inc => {
    const tr = document.createElement('tr');
    if (selectedIncidenteId === inc.id) tr.classList.add('selected');
    tr.addEventListener('click', () => abrirDrawer(inc));

    tr.innerHTML = `
      <td>${String(inc.id).padStart(2,'0')}</td>
      <td>${inc.fecha}</td>
      <td class="mono">${inc.hora}</td>
      <td><span class="badge-delito ${inc.tipo}">${inc.tipo}</span></td>
      <td>${inc.sector || '–'}</td>
      <td><span class="badge-estado ${inc.estado}">${inc.estado}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── MAPA: Renderizar Mapa de Calor / Sectores / Combinado ─────
function actualizarMapaColoresYSectores(sectorCount) {
  if (!mapa) return;
  if (markerGroup) markerGroup.clearLayers();
  if (sectorGroup) sectorGroup.clearLayers();
  if (predictionGroup) predictionGroup.clearLayers();
  if (heatLayer && mapa) {
    try { mapa.removeLayer(heatLayer); } catch(e){}
    heatLayer = null;
  }

  // Filtrar incidentes según la franja horaria crítica seleccionada en el mapa
  let incidentesMapa = filteredIncidentes;
  if (filtroMapaFranja !== 'todos') {
    incidentesMapa = filteredIncidentes.filter(inc => {
      if (!inc.hora) return false;
      const h = parseInt(inc.hora.split(':')[0]);
      if (isNaN(h)) return false;
      if (filtroMapaFranja === 'noche') return h >= 18 || h <= 2;
      if (filtroMapaFranja === 'madrugada') return h >= 0 && h < 6;
      if (filtroMapaFranja === 'tarde') return h >= 12 && h < 18;
      if (filtroMapaFranja === 'manana') return h >= 6 && h < 12;
      return true;
    });
  }

  // Recalcular conteo por sector para la franja activa
  const sectorCountMapa = {};
  incidentesMapa.forEach(i => {
    if (i.sector) sectorCountMapa[i.sector] = (sectorCountMapa[i.sector] || 0) + 1;
  });

  const heatLegend = document.getElementById('heatScaleLegend');
  const sectorsLegend = document.getElementById('sectorsLegend');

  // 1. MODO MAPA DE CALOR (HEATMAP CONTINUO DE DENSIDAD)
  if (mapMode === 'heat' || mapMode === 'both') {
    if (heatLegend) { heatLegend.style.display = 'flex'; heatLegend.style.opacity = '1'; }
    if (sectorsLegend) {
      sectorsLegend.style.display = 'flex';
      sectorsLegend.style.opacity = mapMode === 'both' ? '1' : '0';
      sectorsLegend.style.pointerEvents = mapMode === 'both' ? '' : 'none';
    }

    // Generar puntos de calor de la franja activa
    const heatPoints = incidentesMapa
      .map(i => [parseFloat(i.lat), parseFloat(i.lng), 0.85])
      .filter(([lt, lg]) => !isNaN(lt) && !isNaN(lg));

    if (heatPoints.length > 0 && typeof L.heatLayer === 'function') {
      heatLayer = L.heatLayer(heatPoints, {
        radius: 40,
        blur: 26,
        maxZoom: 16,
        gradient: {
          0.15: '#10b981',
          0.45: '#f59e0b',
          0.80: '#ef4444'
        }
      }).addTo(mapa);
    }
  } else {
    if (heatLegend) { heatLegend.style.display = 'none'; }
    if (sectorsLegend) {
      sectorsLegend.style.display = 'flex';
      sectorsLegend.style.opacity = '1';
      sectorsLegend.style.pointerEvents = '';
    }
  }

  // 2. MODO SECTORES Y MARCADORES
  if (mapMode === 'sectores' || mapMode === 'both') {
    Object.keys(sectoresDinamicos).forEach(sectorName => {
      const secData = sectoresDinamicos[sectorName];
      const count = sectorCountMapa[sectorName] || 0;
      
      let color = '#06b86f';
      let strokeColor = '#048a52';
      let nivel = 'Bajo';
      if (count >= 6) {
        color = '#ef4444';
        strokeColor = '#b91c1c';
        nivel = 'Crítico';
      } else if (count >= 3) {
        color = '#f59e0b';
        strokeColor = '#b45309';
        nivel = 'Alerta';
      }

      const circulo = L.circle(secData.center, {
        radius: secData.radius,
        weight: 2.5,
        color: strokeColor,
        fillColor: color,
        fillOpacity: mapMode === 'both' ? 0.18 : 0.28
      }).addTo(sectorGroup);

      circulo.bindTooltip(`
        <div style="text-align:center; font-family:'Outfit',sans-serif;">
          <div style="font-size:14px; font-weight:800; color:#0d1b35;">Cuadrante ${sectorName}</div>
          <div style="font-size:12px; font-weight:700; color:${strokeColor}; margin: 3px 0;">${count} incidentes en esta franja · Nivel ${nivel}</div>
          <div style="font-size:11px; color:#4a6080;">Clic para ver los partes registrados en este cuadrante</div>
        </div>
      `, {
        sticky: true,
        direction: 'top',
        className: 'sector-map-tooltip'
      });

      circulo.on('mouseover', function () {
        this.setStyle({ fillOpacity: 0.52, weight: 4 });
        this.bringToFront();
      });

      circulo.on('mouseout', function () {
        this.setStyle({ fillOpacity: mapMode === 'both' ? 0.18 : 0.28, weight: 2.5 });
      });

      circulo.on('click', () => {
        seleccionarCuadrante(sectorName);
      });
    });
  }

  // Marcadores de incidentes de la franja horaria activa
  const lats = [];
  const lngs = [];

  incidentesMapa.forEach(inc => {
    const lat = parseFloat(inc.lat);
    const lng = parseFloat(inc.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    lats.push(lat);
    lngs.push(lng);

    if (mapMode === 'sectores' || mapMode === 'both') {
      const color = inc.tipo === 'Robo' ? '#ef4444' : inc.tipo === 'Hurto' ? '#f59e0b' : '#8b5cf6';
      const marker = L.circleMarker([lat, lng], {
        radius: 6.5,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95
      }).addTo(markerGroup);

      marker.bindTooltip(`
        <div style="font-family:'Outfit',sans-serif; font-size:12px; text-align:left;">
          <strong style="color:${color}; font-size:13px;">${inc.tipo} (#${inc.id})</strong><br>
          <span style="color:#0d1b35; font-weight:700;">${inc.sector}</span> &middot; ${inc.fecha} ${inc.hora} hs<br>
          <span style="font-size:11px; color:#4a6080;">Situación: ${inc.estado}</span>
        </div>
      `, {
        sticky: true,
        direction: 'top',
        className: 'incident-map-tooltip'
      });

      marker.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; font-size:13px; padding: 2px;">
          <strong style="color:${color}; font-size:14px;">${inc.tipo} (#${inc.id})</strong><br>
          <b>Cuadrante:</b> ${inc.sector}<br>
          <b>Fecha y Hora:</b> ${inc.fecha} ${inc.hora} hs<br>
          <b>Situación Judicial:</b> <span style="font-weight:700;">${inc.estado}</span>
        </div>
      `);
    }
  });

  // 3. Generar y dibujar Predicción Táctica Geoespacial con Baliza Pulsante
  actualizarPrediccionMapa(incidentesMapa);

  // 4. Actualizar Gráfica de Barras de la franja horaria activa
  renderBarraSectores(incidentesMapa);
}

// ── Render: Predicción Geoespacial & Baliza Pulsante en el Mapa ──
function actualizarPrediccionMapa(incidentesPool) {
  if (!mapa) return;
  if (predictionGroup) predictionGroup.clearLayers();

  const pool = (incidentesPool && incidentesPool.length > 0) ? incidentesPool : filteredIncidentes;
  if (!pool || pool.length === 0) return;

  // Encontrar cuadrante con mayor concentración en la franja
  const secCount = {};
  const crimeCount = {};
  pool.forEach(i => {
    const s = i.sector || 'Oriente';
    const t = i.tipo || 'Robo';
    secCount[s] = (secCount[s] || 0) + 1;
    crimeCount[t] = (crimeCount[t] || 0) + 1;
  });

  const sortedSec = Object.entries(secCount).sort((a,b)=>b[1]-a[1]);
  const sortedCrime = Object.entries(crimeCount).sort((a,b)=>b[1]-a[1]);

  const topSector = sortedSec[0] ? sortedSec[0][0] : 'Oriente';
  const topCasos = sortedSec[0] ? sortedSec[0][1] : 1;
  const topCrime = sortedCrime[0] ? sortedCrime[0][0] : 'Robo';

  // Obtener centro geográfico del sector predicho
  const geoSec = sectoresDinamicos[topSector];
  let centerCoords = geoSec ? geoSec.center : centroBase;

  const incidentesSector = pool.filter(i => i.sector === topSector);
  if (incidentesSector.length > 0) {
    const lts = incidentesSector.map(i => parseFloat(i.lat)).filter(l => !isNaN(l));
    const lgs = incidentesSector.map(i => parseFloat(i.lng)).filter(l => !isNaN(l));
    if (lts.length > 0) {
      centerCoords = [lts.reduce((a,b)=>a+b,0)/lts.length, lgs.reduce((a,b)=>a+b,0)/lgs.length];
    }
  }

  puntoPredichoCoords = centerCoords;

  // Probabilidad estadística
  const total = pool.length;
  const prob = Math.min(95, Math.max(54, Math.round((topCasos / Math.max(1, total)) * 140 + 40)));

  // Franja texto
  const labelsFranja = {
    'todos': 'Próximas 12 - 24 horas',
    'noche': '18:00 – 02:00h (Nocturna)',
    'madrugada': '00:00 – 06:00h (Madrugada)',
    'tarde': '12:00 – 18:00h (Vespertina)',
    'manana': '06:00 – 12:00h (Matutina)'
  };
  const franjaTxt = labelsFranja[filtroMapaFranja] || 'Horario Crítico';

  prediccionMapaActual = {
    sector: topSector,
    delito: topCrime,
    prob: prob,
    coords: centerCoords,
    sugPatrullas: prob >= 75 ? 3 : 2,
    sugMotos: prob >= 75 ? 4 : 2
  };

  // 1. Dibujar baliza pulsante en Leaflet
  const beaconIcon = L.divIcon({
    className: 'pulsing-predict-marker',
    html: `
      <div class="predict-beacon-wrapper" title="Zona de Predicción Inminente">
        <div class="predict-ripple"></div>
        <div class="predict-ripple delay"></div>
        <div class="predict-core-dot">🎯</div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
  });

  const marker = L.marker(centerCoords, { icon: beaconIcon }).addTo(predictionGroup);

  // Zona de alerta predictiva (círculo con halo punteado)
  L.circle(centerCoords, {
    radius: (geoSec ? geoSec.radius : 1200) * 0.75,
    color: '#dc2626',
    dashArray: '6, 8',
    weight: 2.2,
    fillColor: '#dc2626',
    fillOpacity: 0.14
  }).addTo(predictionGroup);

  marker.bindPopup(`
    <div style="font-family:'Outfit',sans-serif; padding:4px; max-width:260px;">
      <div style="font-size:10.5px; font-weight:800; color:#dc2626; letter-spacing:0.04em;">🎯 ZONA DE PREDICCIÓN TÁCTICA</div>
      <div style="font-size:14.5px; font-weight:800; color:#0f172a; margin:3px 0;">Cuadrante ${topSector}</div>
      <div style="font-size:12px; color:#334155; margin-bottom:6px;">
        <strong>Incidencia Proyectada:</strong> ${topCrime} (${prob}% Certeza)<br>
        <strong>Ventana Crítica:</strong> ${franjaTxt}
      </div>
      <div style="font-size:11.5px; background:#f0fdf4; border:1px solid #bbf7d0; padding:6px 8px; border-radius:6px; color:#166534; line-height:1.35;">
        <strong>Respuesta Sugerida:</strong> Desplegar 2 patrullas y 3 motos para disuadir antes del pico delictivo.
      </div>
    </div>
  `);

  // 2. Actualizar Banner Flotante en el Mapa
  const mpbProb = document.getElementById('mpbProbBadge');
  const mpbCuadrante = document.getElementById('mpbCuadrante');
  const mpbDelito = document.getElementById('mpbDelito');
  const mpbAccion = document.getElementById('mpbAccion');

  if (mpbProb) mpbProb.textContent = `PREDICCIÓN INMINENTE · ${prob}% PROB.`;
  if (mpbCuadrante) mpbCuadrante.textContent = `Cuadrante ${topSector}`;
  if (mpbDelito) mpbDelito.textContent = `Posible Incidencia: ${topCrime} en Vía Pública`;
  if (mpbAccion) {
    mpbAccion.innerHTML = `⚡ <strong>Respuesta Anticipada:</strong> Saturar intersecciones clave en <strong>${topSector}</strong> con 2 patrullas y 3 motos durante <strong>${franjaTxt}</strong>.`;
  }

  // 3. Actualizar Tarjeta de Inteligencia Geoespacial en Columna Derecha
  const cardProb = document.getElementById('mapCardProbBadge');
  const predDelito = document.getElementById('mapPredDelito');
  const predCuadrante = document.getElementById('mapPredCuadrante');
  const predHorario = document.getElementById('mapPredHorario');
  const predRiesgo = document.getElementById('mapPredRiesgo');
  const predEfectivos = document.getElementById('mapPredEfectivos');
  const predDirectiva = document.getElementById('mapPredDirectiva');

  if (cardProb) cardProb.textContent = `${prob}% Certeza`;
  if (predDelito) predDelito.textContent = `${topCrime} (${topCasos} partes históricos)`;
  if (predCuadrante) predCuadrante.innerHTML = `Foco de intervención en <strong>Cuadrante ${topSector}</strong>`;
  if (predHorario) predHorario.textContent = franjaTxt;
  if (predRiesgo) {
    predRiesgo.textContent = prob >= 75 ? 'CÓDIGO ROJO' : prob >= 60 ? 'CÓDIGO ÁMBAR' : 'CÓDIGO VERDE';
    predRiesgo.className = `mpm-val ${prob >= 75 ? 'text-danger' : prob >= 60 ? 'text-warning' : 'text-success'}`;
  }
  if (predEfectivos) {
    predEfectivos.textContent = prob >= 75 ? '3 Móviles + 4 Motos' : '2 Móviles + 2 Motos';
  }
  if (predDirectiva) {
    predDirectiva.innerHTML = `
      Establecer anillo disuasivo en <strong>Cuadrante ${topSector}</strong> antes de <strong>${franjaTxt}</strong>. Coordinar binomios motorizados para cerrar vías de escape ante potenciales hechos de <strong>${topCrime}</strong>.
    `;
  }
}

// ── Render: Gráfica de Barras por Cuadrante (Reactiva a Franja) ──
function renderBarraSectores(incidentesPool) {
  const ctxBar = document.getElementById('canvasBar');
  if (!ctxBar) return;

  const pool = (incidentesPool && incidentesPool.length > 0) ? incidentesPool : filteredIncidentes;
  const sectorCount = {};
  pool.forEach(i => {
    if (i.sector) sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1;
  });

  const labels   = Object.keys(sectorCount).sort((a,b)=>sectorCount[b]-sectorCount[a]);
  const dataVals = labels.map(k => sectorCount[k]);
  const maxVal   = Math.max(...dataVals, 1);

  const barGradients = labels.map((sec, idx) => {
    const val = dataVals[idx];
    const ctx = ctxBar.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 280);

    if (val >= 6) {
      grad.addColorStop(0, '#f87171');
      grad.addColorStop(0.4, '#ef4444');
      grad.addColorStop(1, '#b91c1c');
    } else if (val >= 3) {
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(0.4, '#f59e0b');
      grad.addColorStop(1, '#b45309');
    } else {
      grad.addColorStop(0, '#60a5fa');
      grad.addColorStop(0.4, '#3b82f6');
      grad.addColorStop(1, '#1d4ed8');
    }
    return grad;
  });

  if (chartBar) chartBar.destroy();
  chartBar = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Incidentes Registrados',
        data: dataVals,
        backgroundColor: barGradients,
        borderColor: 'rgba(255,255,255,0.85)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24, right: 10, left: 10, bottom: 5 } },
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1,
          titleFont: { family: 'Outfit', size: 13, weight: '800' },
          bodyFont: { family: 'JetBrains Mono', size: 12, weight: '600' },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} partes (${Math.round((ctx.parsed.y / Math.max(1, pool.length))*100)}% del total)`
          }
        },
        datalabels: {
          anchor: 'end',
          align: 'top',
          offset: 4,
          color: '#0f172a',
          font: { family: 'JetBrains Mono', weight: '800', size: 12 },
          formatter: (val) => `${val}`
        }
      },
      scales: {
        x: {
          ticks: { color: '#0f172a', font: { family: 'Outfit', weight: '800', size: 13 } },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: '#64748b',
            precision: 0,
            font: { family: 'JetBrains Mono', size: 11, weight: '600' },
            stepSize: 2
          },
          grid: { color: 'rgba(194, 209, 230, 0.45)' },
          beginAtZero: true,
          suggestedMax: maxVal + 3
        }
      }
    }
  });
}

// ── Utilidad: calcular ventana horaria de mayor riesgo ───────
function calcularVentanaHoraria(incidentes) {
  const franjas = { '00-06': 0, '06-12': 0, '12-18': 0, '18-24': 0 };
  incidentes.forEach(i => {
    const h = parseInt((i.hora || '12:00').split(':')[0]);
    if (h < 6) franjas['00-06']++;
    else if (h < 12) franjas['06-12']++;
    else if (h < 18) franjas['12-18']++;
    else franjas['18-24']++;
  });
  const max = Object.entries(franjas).sort((a,b)=>b[1]-a[1])[0];
  const labels = { '00-06': '00:00 – 06:00', '06-12': '06:00 – 12:00', '12-18': '12:00 – 18:00', '18-24': '18:00 – 00:00' };
  return { franja: labels[max[0]], count: max[1] };
}

// ── Render: Predicción Táctica (Análisis Estadístico) ──────
function renderPrediccion(delitoPpal, sectorCritico) {
  const container = document.getElementById('predictionBody');
  if (!container) return;

  const total = filteredIncidentes.length || 1;

  // Calcular distribución real por tipo
  const countTipos = {};
  filteredIncidentes.forEach(i => { const t = i.tipo||'Robo'; countTipos[t]=(countTipos[t]||0)+1; });
  const tiposSorted = Object.entries(countTipos).sort((a,b)=>b[1]-a[1]);

  // Calcular distribución real por sector
  const countSectores = {};
  filteredIncidentes.forEach(i => { if(i.sector) countSectores[i.sector]=(countSectores[i.sector]||0)+1; });
  const sectorTop = Object.entries(countSectores).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // Ventana horaria calculada
  const ventana = calcularVentanaHoraria(filteredIncidentes);

  // Nivel de confianza basado en cantidad de registros
  const confianza = Math.min(99, Math.round(55 + (total / 100) * 35 + (tiposSorted.length * 2)));

  // Fecha estimada = mañana
  const manana = new Date(Date.now() + 86400000);
  const fechaEst = `${manana.getFullYear()}-${String(manana.getMonth()+1).padStart(2,'0')}-${String(manana.getDate()).padStart(2,'0')}`;

  // Nivel de riesgo
  const count30d = filteredIncidentes.filter(i=>(new Date()-new Date(i.fecha))/86400000<=30).length;
  const riesgo = count30d>=8?'ALTO':count30d>=4?'MEDIO':'BAJO';
  const riesgoColor = riesgo==='ALTO'?'#ef4444':riesgo==='MEDIO'?'#f59e0b':'#10b981';
  const riesgoGlow  = riesgo==='ALTO'?'rgba(239,68,68,0.35)':riesgo==='MEDIO'?'rgba(245,158,11,0.35)':'rgba(16,185,129,0.35)';

  // Score del medidor (0-100)
  const scoreRiesgo = riesgo === 'ALTO' ? Math.min(98, Math.max(76, 68 + Math.round(total * 0.7))) :
                      riesgo === 'MEDIO' ? 56 : 24;

  // Barras de probabilidad por tipo (top 3)
  const barrasTipos = tiposSorted.slice(0,3).map(([tipo, cnt]) => {
    const pct = Math.round((cnt/total)*100);
    const col = tipo==='Robo'?'#ef4444':tipo==='Hurto'?'#f59e0b':'#8b5cf6';
    return `
      <div class="pred-prob-row">
        <div class="pred-prob-header">
          <span class="pred-prob-label">${tipo}</span>
          <span class="pred-prob-pct" style="color:${col};">${pct}%</span>
        </div>
        <div class="pred-prob-bar-wrap">
          <div class="pred-prob-bar" style="width:${pct}%;background:${col};box-shadow:0 0 8px ${col}44;"></div>
        </div>
      </div>`;
  }).join('');

  // Sectores Críticos con Priorización Táctica Operativa (sin medallas)
  const priorityLabels = ['P1', 'P2', 'P3'];
  const priorityClasses = ['pred-priority-p1', 'pred-priority-p2', 'pred-priority-p3'];

  const sectoresHTML = sectorTop.map(([sec, cnt], idx) => {
    const pTag = priorityLabels[idx] || `P${idx+1}`;
    const pClass = priorityClasses[idx] || 'pred-priority-p3';
    const pct = Math.round((cnt/total)*100);
    return `
      <div class="pred-sector-row">
        <span class="pred-priority-badge ${pClass}">[${pTag}]</span>
        <span class="pred-sec-name">${sec}</span>
        <span class="pred-sec-badge">${cnt} casos · ${pct}%</span>
      </div>`;
  }).join('');

  // Gauge SVG circumference
  const circum = 314.16;
  const gaugeOffset = circum - (circum * Math.min(100, Math.max(0, scoreRiesgo)) / 100);

  container.innerHTML = `
    <!-- ① HERO DE AMENAZA: gauge integrado a la izquierda -->
    <div class="pred-threat-hero" style="border-color:${riesgoColor}33;box-shadow:0 0 20px ${riesgoGlow};">
      <div class="threat-hero-left">
        <!-- Mini Medidor Radial -->
        <div class="gauge-box gauge-box-mini">
          <svg class="radial-gauge radial-gauge-mini" viewBox="0 0 110 110">
            <circle class="gauge-track" cx="55" cy="55" r="50"/>
            <circle class="gauge-bar" cx="55" cy="55" r="50"
              style="stroke:${riesgoColor};stroke-dashoffset:${gaugeOffset};"
              stroke-dasharray="${circum}"/>
          </svg>
          <div class="gauge-content">
            <span class="gauge-number" id="gaugeScore">${scoreRiesgo}</span>
            <span class="gauge-title">RIESGO</span>
          </div>
        </div>
        <!-- Info de amenaza -->
        <div class="threat-hero-details">
          <div class="threat-badge-row">
            <span class="threat-badge" style="color:${riesgoColor};">● NIVEL DE ALERTA OPERATIVA</span>
          </div>
          <p class="threat-title" style="color:${riesgoColor};" id="gaugeLevelTitle">RIESGO ${riesgo}</p>
          <p class="threat-desc">
            Foco principal: <strong>${delitoPpal}</strong> &nbsp;·&nbsp;
            Zona crítica: <strong>${sectorCritico}</strong>
          </p>
        </div>
      </div>
      <!-- Confianza Estadística -->
      <div class="threat-hero-right">
        <div class="threat-conf-box">
          <span class="threat-conf-label">Confiabilidad Estadística</span>
          <span class="threat-conf-val">${confianza}%</span>
          <div class="pred-prob-bar-wrap" style="margin-top:6px;">
            <div class="pred-conf-bar" style="width:${confianza}%;"></div>
          </div>
          <span class="threat-conf-sub">Proyección: ${fechaEst}</span>
        </div>
      </div>
    </div>

    <!-- ② GRID DE 4 MÉTRICAS CLAVE -->
    <div class="pred-metrics-grid">
      <div class="pred-metric-card pred-metric-danger">
        <span class="pred-m-icon">⚠️</span>
        <div class="pred-m-info">
          <span class="pred-m-label">Delito Estimado</span>
          <span class="pred-m-value">${delitoPpal}</span>
        </div>
      </div>
      <div class="pred-metric-card pred-metric-primary">
        <span class="pred-m-icon">📍</span>
        <div class="pred-m-info">
          <span class="pred-m-label">Sector Crítico</span>
          <span class="pred-m-value">${sectorCritico}</span>
        </div>
      </div>
      <div class="pred-metric-card pred-metric-warning">
        <span class="pred-m-icon">🕐</span>
        <div class="pred-m-info">
          <span class="pred-m-label">Ventana de Riesgo</span>
          <span class="pred-m-value" style="font-size:13px;">${ventana.franja}</span>
        </div>
      </div>
      <div class="pred-metric-card pred-metric-neutral">
        <span class="pred-m-icon">📊</span>
        <div class="pred-m-info">
          <span class="pred-m-label">Casos Totales</span>
          <span class="pred-m-value">${total} casos</span>
        </div>
      </div>
    </div>

    <!-- ③ DISTRIBUCIÓN EN 2 COLUMNAS BALANCEADAS -->
    <div class="pred-distribution-grid">
      <!-- Columna izquierda: probabilidades por tipo -->
      <div class="pred-dist-card">
        <span class="pred-section-title">📊 Probabilidad por Tipo de Delito</span>
        <div class="pred-probs-list">
          ${barrasTipos || '<span style="color:#64748b;font-size:13px;">Sin datos suficientes</span>'}
        </div>
      </div>
      <!-- Columna derecha: sectores de mayor concentración -->
      <div class="pred-dist-card">
        <span class="pred-section-title">🗺️ Prioridad Territorial de Vigilancia</span>
        <div class="pred-sectors-column">
          ${sectoresHTML || '<span style="color:#64748b;font-size:13px;">Sin sectores identificados</span>'}
        </div>
      </div>
    </div>
  `;

  // Animar barras con un micro-delay para activar transition
  setTimeout(() => {
    document.querySelectorAll('.pred-prob-bar').forEach(b => {
      b.style.transition = 'width 0.8s cubic-bezier(0.4,0,0.2,1)';
    });
    document.querySelectorAll('.pred-conf-bar').forEach(b => {
      b.style.transition = 'width 1s cubic-bezier(0.4,0,0.2,1)';
    });
  }, 50);

  actualizarSimulacion();
}


// ── Render: Gráficas Tácticas Operativas (Light Gradient Theme) ─
function renderGraficas() {
  const ctxDonut   = document.getElementById('canvasDonut');
  const ctxBar     = document.getElementById('canvasBar');
  const detailsCol = document.getElementById('donutDetailsCol');
  const badgeTotal = document.getElementById('badgeTotalDelitos');

  const total = filteredIncidentes.length || 1;

  if (badgeTotal) {
    badgeTotal.textContent = `Total: ${total} casos`;
  }

  // Registrar datalabels si está disponible
  if (window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
  }

  // 1. Conteo por Tipos de Delito
  const countTipos = {};
  filteredIncidentes.forEach(i => {
    const t = i.tipo || 'Otro';
    countTipos[t] = (countTipos[t] || 0) + 1;
  });
  const tipoLabels = Object.keys(countTipos);
  const tipoVals   = Object.values(countTipos);

  // Paleta de alta severidad táctica en fondo claro
  const tipoColorsMap = {
    'Robo':      '#ef4444', // Rojo Alerta
    'Hurto':     '#f59e0b', // Ámbar Precaución
    'Lesiones':  '#8b5cf6', // Púrpura Táctico
    'Homicidio': '#dc2626', // Rojo Sangre Crítico
    'Extorsión': '#ec4899'  // Rosa / Magenta
  };
  const tipoColors = tipoLabels.map(t => tipoColorsMap[t] || '#2563eb');

  // Plugin de centro táctico (muestra métricas en el núcleo del donut)
  const donutCenterPlugin = {
    id: 'donutCenterHub',
    beforeDraw(chart) {
      if (chart.config.type !== 'doughnut') return;
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const { width, height, top, left } = chartArea;
      ctx.save();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      // Subtítulo superior
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 9px Outfit';
      ctx.fillStyle = '#64748b';
      ctx.fillText('TOTAL CASOS', centerX, centerY - 14);

      // Cifra central
      ctx.font = '900 22px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(total, centerX, centerY + 3);

      // Etiqueta inferior
      ctx.font = '800 8px Outfit';
      ctx.fillStyle = '#2563eb';
      ctx.fillText('MONITOREO ACTIVO', centerX, centerY + 19);
      ctx.restore();
    }
  };

  // ── DONUT TÁCTICO ──
  if (ctxDonut) {
    if (chartDonut) chartDonut.destroy();

    chartDonut = new Chart(ctxDonut, {
      type: 'doughnut',
      plugins: [donutCenterPlugin],
      data: {
        labels: tipoLabels,
        datasets: [{
          data: tipoVals,
          backgroundColor: tipoColors,
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverBorderColor: '#0f172a',
          hoverOffset: 6,
          borderRadius: 4,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 6
        },
        animation: { animateRotate: true, duration: 800 },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1,
            titleFont: { family: 'Outfit', size: 13, weight: '800' },
            bodyFont: { family: 'JetBrains Mono', size: 12, weight: '600' },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} incidentes (${Math.round((ctx.parsed/total)*100)}%)`
            }
          },
          datalabels: {
            color: '#ffffff',
            font: { family: 'JetBrains Mono', weight: '800', size: 11 },
            formatter: (val) => {
              const pct = Math.round((val / total) * 100);
              return pct >= 12 ? `${pct}%` : '';
            },
            textShadowColor: 'rgba(0,0,0,0.4)',
            textShadowBlur: 4
          }
        },
        cutout: '68%'
      }
    });
  }

  // ── GENERACIÓN DE INFORMACIÓN DETALLADA POR TIPO DE DELITO (LLENA EL ESPACIO VACÍO) ──
  if (detailsCol) {
    const sortedTipos = Object.entries(countTipos).sort((a, b) => b[1] - a[1]);
    detailsCol.innerHTML = sortedTipos.map(([tipo, cnt]) => {
      const pct = Math.round((cnt / total) * 100);
      const col = tipoColorsMap[tipo] || '#2563eb';

      // Filtrar incidentes de este tipo
      const crimesOfType = filteredIncidentes.filter(i => (i.tipo || 'Otro') === tipo);
      const invCount  = crimesOfType.filter(i => (i.estado || '').toLowerCase().includes('inves')).length;
      const pendCount = crimesOfType.length - invCount;

      // Calcular ventana horaria pico para este delito específico
      const ventanaTipo = calcularVentanaHoraria(crimesOfType);

      return `
        <div class="crime-detail-row">
          <div class="crime-detail-left">
            <div class="crime-color-pill" style="background:${col};box-shadow:0 0 8px ${col}44;"></div>
            <div class="crime-detail-info">
              <div class="crime-detail-name-row">
                <span class="crime-detail-name">${tipo}</span>
                <span class="badge-status-pill badge-status-inv" title="Casos investigados">${invCount} inv.</span>
                <span class="badge-status-pill badge-status-pend" title="Casos pendientes">${pendCount} pend.</span>
              </div>
              <div class="crime-detail-sub">
                <span>🕒 Horario crítico: <strong>${ventanaTipo.franja}</strong> (${ventanaTipo.count} casos)</span>
              </div>
            </div>
          </div>
          <div class="crime-detail-right">
            <span class="crime-detail-count" style="color:${col};">${cnt} <span style="font-size:11px;color:#64748b;font-weight:600;">(${pct}%)</span></span>
            <div class="crime-detail-bar-wrap">
              <div class="crime-detail-bar" style="width:${pct}%;background:${col};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── BARRAS DE SECTORES EN MODO GRADIENTE CLARO ──
  if (ctxBar) {
    const sectorCount = {};
    filteredIncidentes.forEach(i => {
      if (i.sector) sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1;
    });
    const labels   = Object.keys(sectorCount).sort((a,b)=>sectorCount[b]-sectorCount[a]);
    const dataVals = labels.map(k => sectorCount[k]);
    const maxVal   = Math.max(...dataVals, 1);

    // Gradientes con efecto 3D vibrante sobre fondo claro
    const barGradients = labels.map((sec, idx) => {
      const val = dataVals[idx];
      const ctx = ctxBar.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 280);

      if (val >= 9) {
        // Crítico: Rojo vibrante
        grad.addColorStop(0, '#f87171');
        grad.addColorStop(0.4, '#ef4444');
        grad.addColorStop(1, '#b91c1c');
      } else if (val >= 5) {
        // Alerta: Ámbar intenso
        grad.addColorStop(0, '#fbbf24');
        grad.addColorStop(0.4, '#f59e0b');
        grad.addColorStop(1, '#b45309');
      } else {
        // Vigilancia: Azul cobalto
        grad.addColorStop(0, '#60a5fa');
        grad.addColorStop(0.4, '#3b82f6');
        grad.addColorStop(1, '#1d4ed8');
      }
      return grad;
    });

    if (chartBar) chartBar.destroy();
    chartBar = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Incidentes Registrados',
          data: dataVals,
          backgroundColor: barGradients,
          borderColor: 'rgba(255,255,255,0.85)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.55
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 24, right: 10, left: 10, bottom: 5 }
        },
        animation: { duration: 750 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1,
            titleFont: { family: 'Outfit', size: 13, weight: '800' },
            bodyFont: { family: 'JetBrains Mono', size: 12, weight: '600' },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} incidentes (${Math.round((ctx.parsed.y/total)*100)}% del total)`
            }
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            offset: 4,
            color: '#0f172a',
            font: { family: 'JetBrains Mono', weight: '800', size: 12 },
            formatter: (val) => `${val}`
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#0f172a',
              font: { family: 'Outfit', weight: '800', size: 13 }
            },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: '#64748b',
              precision: 0,
              font: { family: 'JetBrains Mono', size: 11, weight: '600' },
              stepSize: 2
            },
            grid: { color: 'rgba(194, 209, 230, 0.45)' },
            beginAtZero: true,
            suggestedMax: maxVal + 3
          }
        }
      }
    });
  }
}

// ── Render: Directivas Operativas Policiales ──────────
function renderRecomendaciones(delitoPpal, sectorCritico, nivelRiesgo) {
  const container = document.getElementById('recsList');
  if (!container) return;

  // Calcular ventana de riesgo real
  const ventana = calcularVentanaHoraria(filteredIncidentes);
  const total = filteredIncidentes.length;

  // Directivas tácticas policiales generadas según evidencia operativa real
  const recs = [
    {
      icon: '🚔',
      color: '#ef4444',
      title: `ORDEN DE OPERACIONES: Patrullaje Reforzado – Cuadrante ${sectorCritico}`,
      desc: `Disponer refuerzo inmediato de patrullas y binomios policiales en el <strong>Cuadrante ${sectorCritico}</strong>. Franja horaria de máxima incidencia detectada: <strong>${ventana.franja}</strong> (${ventana.count} partes registrados en dicho horario).`
    },
    {
      icon: '🎯',
      color: '#f59e0b',
      title: `DIRECTIVA TÁCTICA: Plan de Contención contra ${delitoPpal}`,
      desc: `La tipificación delictiva predominante corresponde a <strong>${delitoPpal}</strong>. Ejecutar requisas preventivas en paraderos, fiscalización de vehículos y presencia disuasiva en accesos del cuadrante.`
    },
    {
      icon: nivelRiesgo==='ALTO'?'🚨':nivelRiesgo==='MEDIO'?'⚠️':'🛡️',
      color: nivelRiesgo==='ALTO'?'#ef4444':nivelRiesgo==='MEDIO'?'#f59e0b':'#1a3a6b',
      title: `ESTADO DE ALERTA POLICIAL: Nivel ${nivelRiesgo}`,
      desc: `Bajo análisis de <strong>${total} partes delictivos</strong> vigentes, la jurisdicción opera en alerta <strong>${nivelRiesgo}</strong>. ${nivelRiesgo==='ALTO'?'Se ordena activar personal franco retenido, puestos fijos de control y respuesta inmediata (código rojo).':nivelRiesgo==='MEDIO'?'Mantener patrullaje focalizado en horas pico y reforzar relevos de guardia.':'Continuar con el régimen ordinario de vigilancia por cuadrantes.'}`
    },
    {
      icon: '📡',
      color: '#3b82f6',
      title: 'INTELIGENCIA DE ENLACE: Coordinación Inter-Cuadrantes',
      desc: `Articular canal de radiofrecuencia directo con las unidades asignadas a los cuadrantes adyacentes a <strong>${sectorCritico}</strong> para cerrar rutas de escape y anticipar el desplazamiento criminal.`
    }
  ];

  container.innerHTML = recs.map(r => `
    <li class="rec-item">
      <div class="rec-icon-badge" style="background:${r.color}18; border: 1.5px solid ${r.color}44;">${r.icon}</div>
      <div class="rec-content">
        <div class="rec-title">${r.title}</div>
        <div class="rec-desc">${r.desc}</div>
      </div>
    </li>
  `).join('');
}

// ── Render: Apreciación de Inteligencia Criminal ──────────────
function renderConclusiones(nivelRiesgo, data) {
  const container = document.getElementById('conclusionsText');
  if (!container) return;

  const total = data.length;
  const ahora = new Date();

  // 1. Tendencia
  const ult7 = data.filter(i => (ahora - new Date(i.fecha)) / 86400000 <= 7).length;
  const ant7 = data.filter(i => { const d = (ahora - new Date(i.fecha)) / 86400000; return d > 7 && d <= 14; }).length;
  let tendenciaIco, tendenciaLabel, tendenciaCls;
  if (ult7 > ant7 && ant7 > 0) {
    tendenciaIco = '📈'; tendenciaLabel = 'Al Alza'; tendenciaCls = 'alza';
  } else if (ult7 < ant7 && ant7 > 0) {
    tendenciaIco = '📉'; tendenciaLabel = 'En Baja'; tendenciaCls = 'baja';
  } else {
    tendenciaIco = '⚖️'; tendenciaLabel = 'Estable'; tendenciaCls = 'estable';
  }

  // 2. Conteo por sector y delito predominante
  const sCount = {}; const sDelito = {};
  data.forEach(i => {
    if (!i.sector) return;
    sCount[i.sector] = (sCount[i.sector] || 0) + 1;
    if (!sDelito[i.sector]) sDelito[i.sector] = {};
    const t = i.tipo || 'Sin clasificar';
    sDelito[i.sector][t] = (sDelito[i.sector][t] || 0) + 1;
  });
  const sectoresOrden = Object.entries(sCount).sort((a, b) => b[1] - a[1]);
  const maxSec = sectoresOrden.length > 0 ? sectoresOrden[0][1] : 1;

  function nivelSecCard(cnt) {
    if (cnt >= 6) return { cls: 'nivel-rojo', label: 'CRÍTICO', color: '#ef4444' };
    if (cnt >= 3) return { cls: 'nivel-ambar', label: 'ALERTA', color: '#f59e0b' };
    return { cls: 'nivel-verde', label: 'BAJO', color: '#06b86f' };
  }

  function delitoTop(sec) {
    if (!sDelito[sec]) return '—';
    return Object.entries(sDelito[sec]).sort((a, b) => b[1] - a[1])[0][0];
  }

  const secCardsHTML = sectoresOrden.map(([sec, cnt]) => {
    const n = nivelSecCard(cnt);
    const pct = Math.round(cnt / Math.max(total, 1) * 100);
    const barW = Math.round(cnt / Math.max(maxSec, 1) * 100);
    const delito = delitoTop(sec);
    return `
      <div class="intel-sec-card ${n.cls}">
        <div class="isc-header">
          <span class="isc-name">📍 ${sec}</span>
          <span class="isc-badge" style="background:${n.color};">${n.label}</span>
        </div>
        <div class="isc-bar-wrap"><div class="isc-bar-fill" style="width:${barW}%;background:${n.color};"></div></div>
        <div class="isc-stats">
          <span class="isc-partes"><strong>${cnt}</strong> (${pct}%)</span>
          <span class="isc-delito" title="${delito}">⚠️ ${delito}</span>
        </div>
      </div>`;
  }).join('');

  // 3. Ventanas horarias (Etiquetas concisas para evitar truncamiento)
  const horarios = { noche: 0, madrugada: 0, manana: 0, tarde: 0 };
  data.forEach(i => {
    const h = parseInt((i.hora || '12:00').split(':')[0]);
    if (h >= 18 || h < 2) horarios.noche++;
    else if (h < 6) horarios.madrugada++;
    else if (h < 12) horarios.manana++;
    else horarios.tarde++;
  });
  const maxH = Math.max(...Object.values(horarios), 1);

  function renderBarRow(label, val, max, color) {
    const pct = Math.round(val / Math.max(total, 1) * 100);
    const barW = Math.round(val / max * 100);
    return `
      <div class="intel-bar-row">
        <span class="ibr-label">${label}</span>
        <div class="ibr-track"><div class="ibr-fill" style="width:${barW}%;background:${color};"></div></div>
        <span class="ibr-val">${val} <small>(${pct}%)</small></span>
      </div>`;
  }

  // 4. Tasa judicial
  const investigados = data.filter(i => i.estado === 'Investigado' || i.estado === 'investigado').length;
  const pendientes = total - investigados;
  const pctInv = total > 0 ? Math.round(investigados / total * 100) : 0;
  const pctPend = 100 - pctInv;

  // 5. Directiva táctica
  let nivelColor, nivelBg, alertaIcono;
  if (nivelRiesgo === 'ALTO') {
    nivelColor = '#ef4444'; nivelBg = 'rgba(239,68,68,0.06)'; alertaIcono = '🔴';
  } else if (nivelRiesgo === 'MEDIO') {
    nivelColor = '#f59e0b'; nivelBg = 'rgba(245,158,11,0.06)'; alertaIcono = '🟡';
  } else {
    nivelColor = '#06b86f'; nivelBg = 'rgba(6,184,111,0.06)'; alertaIcono = '🟢';
  }

  const topSec = sectoresOrden[0];
  const horaTopKey = Object.entries(horarios).sort((a, b) => b[1] - a[1])[0][0];
  const horaTopLabel = { noche: 'Nocturna (18–02h)', madrugada: 'Madrugada (02–06h)', manana: 'Mañana (06–12h)', tarde: 'Tarde (12–18h)' }[horaTopKey];
  const dirRecomen = topSec
    ? `Reforzar <strong>Cuadrante ${topSec[0]}</strong> con patrullas durante la franja <strong>${horaTopLabel}</strong>. Activar patrullaje preventivo enfocado en <strong>${delitoTop(topSec[0])}</strong>.`
    : `Mantener régimen estándar de vigilancia preventiva en todos los cuadrantes.`;

  container.innerHTML = `
    <!-- Bloque Superior: Situación Táctica -->
    <div class="intel-situation-box" style="border-left-color:${nivelColor};background:${nivelBg};">
      <div class="isb-left">
        <span class="isb-icon">${alertaIcono}</span>
        <div>
          <div class="isb-title">SITUACIÓN TÁCTICA DE JURISDICCIÓN</div>
          <div class="isb-nivel" style="color:${nivelColor};">ALERTA ${nivelRiesgo}</div>
        </div>
      </div>
      <div class="isb-right">
        <div class="isb-stat"><span class="isb-stat-num">${total}</span><span class="isb-stat-lbl">Partes</span></div>
        <div class="isb-stat"><span class="isb-stat-num">${ult7}</span><span class="isb-stat-lbl">Últ. 7d</span></div>
        <div class="isb-stat isb-tend-${tendenciaCls}"><span class="isb-stat-num">${tendenciaIco}</span><span class="isb-stat-lbl">${tendenciaLabel}</span></div>
      </div>
    </div>

    <!-- Bloque Cuadrantes: 5 columnas exactas sin desbordes -->
    <div class="intel-block">
      <div class="intel-section-title">📍 Concentración Delictiva por Cuadrante</div>
      <div class="intel-grid-sectores">
        ${secCardsHTML || '<p style="color:#64748b;font-size:0.85rem;padding:8px 0;">Sin datos por sector disponibles.</p>'}
      </div>
    </div>

    <!-- Bloque Medio: 2 Columnas Simétricas Sin Truncamiento -->
    <div class="intel-two-col-grid">
      <!-- Col 1: Ventanas Horarias -->
      <div class="intel-subcard">
        <div class="intel-subcard-header">
          <span class="ish-icon">🕐</span>
          <span class="ish-title">Ventanas Horarias de Riesgo</span>
        </div>
        <div class="intel-bars-list">
          ${renderBarRow('🌙 Noche (18–02h)', horarios.noche, maxH, '#ef4444')}
          ${renderBarRow('🌑 Madrugada (02–06h)', horarios.madrugada, maxH, '#f59e0b')}
          ${renderBarRow('☀️ Mañana (06–12h)', horarios.manana, maxH, '#3b82f6')}
          ${renderBarRow('🌆 Tarde (12–18h)', horarios.tarde, maxH, '#8b5cf6')}
        </div>
      </div>

      <!-- Col 2: Control y Resolutividad Judicial -->
      <div class="intel-subcard">
        <div class="intel-subcard-header">
          <span class="ish-icon">⚖️</span>
          <span class="ish-title">Control y Diligencias Judiciales</span>
        </div>
        <div class="intel-bars-list">
          ${renderBarRow('✅ Investigados', investigados, total, '#10b981')}
          ${renderBarRow('⏳ Pendientes', pendientes, total, '#f59e0b')}
        </div>
        <div class="intel-judicial-kpis">
          <div class="ijk-item">
            <span class="ijk-val" style="color:#10b981;">${pctInv}%</span>
            <span class="ijk-lbl">Eficacia</span>
          </div>
          <div class="ijk-item">
            <span class="ijk-val" style="color:#1a3a6b;">${investigados} / ${total}</span>
            <span class="ijk-lbl">Diligenciados</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bloque Inferior: Directiva de Mando -->
    <div class="intel-directive-box">
      <span class="idb-icon">🎯</span>
      <div class="idb-content">
        <span class="idb-title">DIRECTIVA DE MANDO OPERACIONAL</span>
        <p>${dirRecomen}</p>
      </div>
    </div>
  `;
}

// ── Exportación Deshabilitada ─────────────────────────────────
function exportarCSV() {
  mostrarToast('La función de exportación está deshabilitada en esta plataforma.', 'info');
}

// ── Drawer de Detalle de Incidente ───────────────────────────
function abrirDrawer(inc) {
  selectedIncidenteId = inc.id;
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('incidentDrawer');
  const content = document.getElementById('drawerContent');

  if (content) {
    content.innerHTML = `
      <div class="drawer-detail-group">
        <label>ID del Registro</label>
        <span>#${inc.id}</span>
      </div>
      <div class="drawer-detail-group">
        <label>Tipo de Delito</label>
        <span class="badge-delito ${inc.tipo}">${inc.tipo}</span>
      </div>
      <div class="drawer-detail-group">
        <label>Fecha y Hora</label>
        <span>${inc.fecha} a las ${inc.hora} hs</span>
      </div>
      <div class="drawer-detail-group">
        <label>Sector</label>
        <span>${inc.sector}</span>
      </div>
      <div class="drawer-detail-group">
        <label>Ubicación GPS</label>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px;">
          <span class="mono">${inc.lat}, ${inc.lng}</span>
          <button type="button" class="btn-zip-locate" onclick="enfocarDesdeTablaZona(${parseFloat(inc.lat)}, ${parseFloat(inc.lng)}, '${(inc.tipo||'').replace(/'/g,'')}', '#${inc.id}'); cerrarDrawer();" title="Ver en el mapa">📍 Localizar</button>
        </div>
      </div>
      <div class="drawer-detail-group">
        <label>Estado del Caso</label>
        <span class="badge-estado ${inc.estado}">${inc.estado}</span>
      </div>
      <div class="drawer-detail-group">
        <label>Descripción</label>
        <p style="color:var(--text-main); font-size:13px; line-height:1.5;">${inc.descripcion}</p>
      </div>
    `;
  }

  if (overlay) overlay.style.display = 'block';
  if (drawer) drawer.classList.add('open');
  renderTabla();
}

function cerrarDrawer() {
  selectedIncidenteId = null;
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('incidentDrawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer) drawer.classList.remove('open');
  renderTabla();
}

// ── Medidor Radial de Riesgo (SVG Radial Gauge) ──────────────
function actualizarRadialGauge(riesgo, score) {
  const bar = document.getElementById('gaugeBar');
  const numElem = document.getElementById('gaugeScore');
  const titleElem = document.getElementById('gaugeLevelTitle');
  if (!bar || !numElem) return;

  const circum = 314.16;
  const offset = circum - (circum * Math.min(100, Math.max(0, score)) / 100);
  bar.style.strokeDashoffset = offset;

  if (riesgo === 'ALTO') {
    bar.style.stroke = '#ef4444';
  } else if (riesgo === 'MEDIO') {
    bar.style.stroke = '#f59e0b';
  } else {
    bar.style.stroke = '#10b981';
  }

  animarContador('gaugeScore', score, 700);
  if (titleElem) titleElem.textContent = `RIESGO ${riesgo}`;
}

// ── Motor de Inferencia: Alerta Temprana & Despacho Horario ──
function actualizarAlertaDespacho(hora) {
  const h = parseInt(hora) || 0;
  
  // 1. Etiqueta de la franja horaria
  let turnoTexto = '';
  if (h >= 0 && h < 6) {
    turnoTexto = `${padZ(h)}:00h · Guardia Madrugada (00:00 - 06:00)`;
  } else if (h >= 6 && h < 12) {
    turnoTexto = `${padZ(h)}:00h · Guardia Matutina (06:00 - 12:00)`;
  } else if (h >= 12 && h < 18) {
    turnoTexto = `${padZ(h)}:00h · Guardia Vespertina (12:00 - 18:00)`;
  } else {
    turnoTexto = `${padZ(h)}:00h · Guardia Nocturna (18:00 - 00:00 · Pico Operativo)`;
  }

  const badgeHora = document.getElementById('badgeHoraTexto');
  if (badgeHora) badgeHora.textContent = turnoTexto;

  const slider = document.getElementById('sliderHoraGuardia');
  if (slider && parseInt(slider.value) !== h) slider.value = h;

  // 2. Analizar incidentes en ventana alrededor de esa hora (hora - 1 a hora + 1)
  const pool = (filteredIncidentes && filteredIncidentes.length > 0) ? filteredIncidentes : allRawIncidentes;
  if (!pool || pool.length === 0) return;

  // Filtrar por ventana horaria
  const incidentesVentana = pool.filter(i => {
    if (!i.hora) return false;
    const hInc = parseInt(i.hora.split(':')[0]);
    if (isNaN(hInc)) return false;
    const diff = Math.abs(hInc - h);
    return diff <= 1 || diff === 23; // Circularidad 23 -> 0
  });

  const totalVentana = incidentesVentana.length;
  
  // Cuadrante y Delito más frecuentes en esa ventana
  const cuadrantesCount = {};
  const delitosCount = {};

  (totalVentana > 0 ? incidentesVentana : pool).forEach(i => {
    const s = i.sector || 'Oriente';
    const d = i.tipo || 'Robo';
    cuadrantesCount[s] = (cuadrantesCount[s] || 0) + 1;
    delitosCount[d] = (delitosCount[d] || 0) + 1;
  });

  const cuadranteFoco = Object.entries(cuadrantesCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Oriente';
  const delitoFoco = Object.entries(delitosCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Robo';
  const casosEnFoco = cuadrantesCount[cuadranteFoco] || 1;

  // Calcular probabilidad estadística
  const baseFreq = totalVentana / Math.max(pool.length, 1);
  let probabilidad = Math.min(94, Math.max(48, Math.round((baseFreq * 160) + (casosEnFoco * 4) + (h >= 19 || h <= 3 ? 18 : 6))));

  // Definir Código de Alerta
  const elemBadgeCodigo = document.getElementById('dispatchCodigoBadge');
  const elemProbBadge = document.getElementById('dispatchProbBadge');
  const elemDelito = document.getElementById('dispatchDelitoPronosticado');
  const elemCuadrante = document.getElementById('dispatchCuadranteFoco');
  const elemVentana = document.getElementById('dispatchVentanaCritica');
  const elemHistorial = document.getElementById('dispatchHistorialCasos');
  const elemAccion = document.getElementById('dispatchAccionTexto');

  let codigo = 'ROJO';
  let badgeClass = 'badge-code-red';
  let badgeText = '🚨 CÓDIGO ROJO · ALERTA INMINENTE';

  if (probabilidad >= 75) {
    codigo = 'ROJO';
    badgeClass = 'badge-code-red';
    badgeText = '🚨 CÓDIGO ROJO · ALERTA INMINENTE';
  } else if (probabilidad >= 60) {
    codigo = 'ÁMBAR';
    badgeClass = 'badge-code-amber';
    badgeText = '⚠️ CÓDIGO ÁMBAR · ALERTA PREVENTIVA';
  } else {
    codigo = 'VERDE';
    badgeClass = 'badge-code-green';
    badgeText = '🛡️ CÓDIGO VERDE · PATRULLAJE ORDINARIO';
  }

  if (elemBadgeCodigo) {
    elemBadgeCodigo.className = `dispatch-code-badge ${badgeClass}`;
    elemBadgeCodigo.textContent = badgeText;
  }
  if (elemProbBadge) elemProbBadge.textContent = `Probabilidad: ${probabilidad}%`;
  if (elemDelito) elemDelito.textContent = `Posible Incidencia: ${delitoFoco} en Vía Pública`;
  if (elemCuadrante) elemCuadrante.textContent = cuadranteFoco;
  if (elemVentana) elemVentana.textContent = `${padZ((h - 1 + 24) % 24)}:00 – ${padZ((h + 2) % 24)}:00h`;
  if (elemHistorial) elemHistorial.textContent = `${totalVentana} partes en esta franja (${casosEnFoco} en ${cuadranteFoco})`;

  // Configurar recomendación operativa específica
  let sugPatrullas = 3;
  let sugMotos = 4;
  let sugPie = 6;
  let sugReten = (h >= 20 || h <= 3);

  if (codigo === 'ROJO') {
    sugPatrullas = Math.min(6, Math.max(4, Math.round(casosEnFoco * 0.7)));
    sugMotos = Math.min(8, Math.max(5, Math.round(casosEnFoco * 0.9)));
    sugPie = 8;
  } else if (codigo === 'ÁMBAR') {
    sugPatrullas = 3;
    sugMotos = 4;
    sugPie = 6;
  } else {
    sugPatrullas = 2;
    sugMotos = 2;
    sugPie = 4;
  }

  recomendacionActual = {
    patrullas: sugPatrullas,
    motos: sugMotos,
    pie: sugPie,
    reten: sugReten,
    cuadrante: cuadranteFoco,
    delito: delitoFoco
  };

  if (elemAccion) {
    elemAccion.innerHTML = `
      Disponer el despacho táctico preventivo de <strong>${sugPatrullas} patrullas móviles</strong> y <strong>${sugMotos} unidades motorizadas</strong> en corredores críticos del <strong>Cuadrante ${cuadranteFoco}</strong> para disuadir la reiteración de <strong>${delitoFoco}</strong> entre las <strong>${padZ((h - 1 + 24) % 24)}:00h</strong> y <strong>${padZ((h + 2) % 24)}:00h</strong>${sugReten ? ', activando <strong>Retén Nocturno</strong> en accesos viales' : ''}.
    `;
  }
}

function aplicarDespachoRecomendado() {
  simPatrullas = recomendacionActual.patrullas;
  simMotos = recomendacionActual.motos;
  simOficialesPie = recomendacionActual.pie;
  simReten = recomendacionActual.reten;

  const sliderP = document.getElementById('simPatrullas');
  const sliderM = document.getElementById('simMotos');
  const sliderPie = document.getElementById('simOficialesPie');
  const btnReten = document.getElementById('simBtnReten');

  if (sliderP) sliderP.value = simPatrullas;
  if (sliderM) sliderM.value = simMotos;
  if (sliderPie) sliderPie.value = simOficialesPie;
  if (btnReten) btnReten.classList.toggle('active', simReten);

  actualizarSimulacionMulti();
  mostrarToast(`⚡ Recursos despachados: ${simPatrullas} patrullas, ${simMotos} motos, ${simOficialesPie} infantería a Cuadrante ${recomendacionActual.cuadrante}`, 'success');

  // Desplazarse suavemente al simulador si es visible
  const simPanel = document.querySelector('.simulator-panel');
  if (simPanel) simPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Simulador Multi-Recurso Policial (What-If Avanzado) ──────
function actualizarSimulacionMulti() {
  const sliderP = document.getElementById('simPatrullas');
  const sliderM = document.getElementById('simMotos');
  const sliderPie = document.getElementById('simOficialesPie');

  if (sliderP) simPatrullas = parseInt(sliderP.value) || 0;
  if (sliderM) simMotos = parseInt(sliderM.value) || 0;
  if (sliderPie) simOficialesPie = parseInt(sliderPie.value) || 0;

  // Actualizar badges
  const bP = document.getElementById('badgePatrullas');
  const bM = document.getElementById('badgeMotos');
  const bPie = document.getElementById('badgeOficialesPie');

  if (bP) bP.textContent = `${simPatrullas} ${simPatrullas === 1 ? 'móvil' : 'móviles'}`;
  if (bM) bM.textContent = `${simMotos} ${simMotos === 1 ? 'moto' : 'motos'}`;
  if (bPie) bPie.textContent = `${simOficialesPie} oficiales`;

  // Total efectivos: patrulla = 2 oficiales, moto = 1 oficial, pie = 1 oficial
  const totalEfectivos = (simPatrullas * 2) + simMotos + simOficialesPie;
  const elemTotEfectivos = document.getElementById('simTotalEfectivos');
  if (elemTotEfectivos) elemTotEfectivos.textContent = `${totalEfectivos} Oficiales`;

  const elemDist = document.getElementById('simDistribucionEfectivos');
  if (elemDist) {
    elemDist.textContent = `${simPatrullas * 2} patrulleros · ${simMotos} motorizados · ${simOficialesPie} a pie`;
  }

  // 1. Tiempo Estimado de Respuesta (Base 14.5 min)
  // Las motos son las más rápidas (-0.75 min), luego patrullas (-0.65 min), a pie (-0.15 min), cámaras (-0.6 min), retén (-0.3 min)
  const reduccionTiempo = (simMotos * 0.75) + (simPatrullas * 0.65) + (simOficialesPie * 0.15) + (simCamaras ? 0.6 : 0) + (simReten ? 0.3 : 0);
  const tiempoEstimado = Math.max(2.4, 14.5 - reduccionTiempo).toFixed(1);
  const elemTiempo = document.getElementById('simTiempoRespuesta');
  if (elemTiempo) elemTiempo.textContent = `${tiempoEstimado} min`;

  const pctTiempo = Math.min(100, Math.round(((14.5 - parseFloat(tiempoEstimado)) / 12.1) * 100));
  const progTiempo = document.getElementById('simProgresoRespuesta');
  if (progTiempo) progTiempo.style.width = `${pctTiempo}%`;

  // 2. Cobertura Territorial de Cuadrante (Base 15%)
  const cobertura = Math.min(98, Math.round(15 + (simPatrullas * 5.5) + (simMotos * 3.8) + (simOficialesPie * 1.6) + (simReten ? 10 : 0) + (simCamaras ? 12 : 0)));
  const elemCob = document.getElementById('simCoberturaPct');
  if (elemCob) elemCob.textContent = `${cobertura}%`;
  const progCob = document.getElementById('simProgresoCobertura');
  if (progCob) progCob.style.width = `${cobertura}%`;

  // 3. Mitigación del Índice Delictivo
  const mitigacion = Math.min(78, Math.round((simPatrullas * 4.4) + (simMotos * 3.6) + (simOficialesPie * 1.5) + (simReten ? 14 : 0) + (simCamaras ? 10 : 0)));
  const elemMit = document.getElementById('simMitigacionVal');
  if (elemMit) elemMit.textContent = `-${mitigacion}% de Riesgo`;

  // 4. Delitos Prevenidos Proyectados
  const total = (filteredIncidentes && filteredIncidentes.length > 0) ? filteredIncidentes.length : 20;
  const casosMin = Math.max(1, Math.round(total * (mitigacion / 100) * 0.38));
  const casosMax = Math.max(casosMin + 1, Math.round(total * (mitigacion / 100) * 0.58));
  const elemCasos = document.getElementById('simCasosEvitadosVal');
  if (elemCasos) elemCasos.textContent = `${casosMin} a ${casosMax} delitos prevenidos / período`;

  // 5. Actualizar Resumen de Monitor y Unidades Georreferenciadas en Mapa
  actualizarResumenMonitor();
  actualizarUnidadesEnMapa();
}

function toggleSimAction(action) {
  if (action === 'reten') {
    simReten = !simReten;
    const btn = document.getElementById('simBtnReten');
    if (btn) btn.classList.toggle('active', simReten);
    mostrarToast(simReten ? '🛑 Puntos de Control y Retenes Nocturnos ACTIVADOS' : 'Puntos de Control Nocturnos DESACTIVADOS', simReten ? 'success' : 'warning');
  } else if (action === 'camaras') {
    simCamaras = !simCamaras;
    const btn = document.getElementById('simBtnCamaras');
    if (btn) btn.classList.toggle('active', simCamaras);
    mostrarToast(simCamaras ? '📡 Vigilancia Electrónica / Drones ACTIVADOS' : 'Vigilancia Electrónica DESACTIVADA', simCamaras ? 'success' : 'warning');
  }
  actualizarSimulacionMulti();
}

// ── Monitor Táctico de Cuadrante (Esquema Claro de Despliegue) ──
let sectorSimuladorActivo = 'Oriente';
let unitsDeploymentGroup = null;
let monitorAnimAngle = 0;
let radarAnimationId = null;

function cambiarSectorSimulador(sectorName) {
  sectorSimuladorActivo = sectorName;
  const title = document.getElementById('monTitle');
  if (title) title.textContent = `DISTRIBUCIÓN TÁCTICA: CUADRANTE ${sectorName.toUpperCase()}`;

  const selTarget = document.getElementById('simSectorTarget');
  if (selTarget && selTarget.value !== sectorName) selTarget.value = sectorName;

  if (window._simMiniMapInstance) {
    actualizarMiniMapaSector();
  } else {
    iniciarRadarTactico();
  }

  actualizarResumenMonitor();
  actualizarUnidadesEnMapa();
  mostrarToast(`Sector objetivo del planificador: Cuadrante ${sectorName}`, 'info');
}

function actualizarResumenMonitor() {
  const sumText = document.getElementById('monSummaryText');
  const legPat = document.getElementById('monLegPatrullas');
  const legMot = document.getElementById('monLegMotos');
  const legPie = document.getElementById('monLegPie');

  if (legPat) legPat.textContent = simPatrullas;
  if (legMot) legMot.textContent = simMotos;
  if (legPie) legPie.textContent = simOficialesPie;

  if (sumText) {
    sumText.textContent = `🚔 ${simPatrullas} Móviles · 🏍️ ${simMotos} Motos · 👮 ${simOficialesPie} Infantería en Cuadrante ${sectorSimuladorActivo}`;
  }

  actualizarMiniMapaSector();
}

function enfocarSectorDesdeSimulador() {
  switchTab('mapa');
  if (!mapa) return;

  const secData = sectoresDinamicos[sectorSimuladorActivo];
  if (secData) {
    mapa.flyTo(secData.center, 15, { animate: true, duration: 1.2 });
    mostrarToast(`Visualizando despliegue de Cuadrante ${sectorSimuladorActivo} en la cartografía`, 'info');
  }
  actualizarUnidadesEnMapa();
}

function actualizarUnidadesEnMapa() {
  if (!mapa) return;
  if (!unitsDeploymentGroup) {
    unitsDeploymentGroup = L.layerGroup().addTo(mapa);
  }
  unitsDeploymentGroup.clearLayers();

  const secData = sectoresDinamicos[sectorSimuladorActivo];
  if (!secData) return;

  const [cLat, cLng] = secData.center;
  const radDeg = (secData.radius || 1000) / 111000;

  // 1. Patrullas Móviles (azul marino)
  for (let i = 0; i < simPatrullas; i++) {
    const angle = (i * (Math.PI * 2 / Math.max(1, simPatrullas))) + 0.35;
    const r = radDeg * 0.72;
    const uLat = cLat + Math.cos(angle) * r;
    const uLng = cLng + Math.sin(angle) * r;

    const unitIcon = L.divIcon({
      className: 'deployed-unit-marker',
      html: `<div style="background:#1a3a6b; color:#ffffff; border:2px solid #ffffff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 3px 8px rgba(0,0,0,0.35);" title="Patrulla P-${i+1}">🚔</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([uLat, uLng], { icon: unitIcon })
      .bindTooltip(`<strong>🚔 Patrulla P-${i+1}</strong><br>Cuadrante ${sectorSimuladorActivo} &middot; Patrullaje perimetral`)
      .addTo(unitsDeploymentGroup);
  }

  // 2. Unidades Motorizadas (ámbar)
  for (let i = 0; i < simMotos; i++) {
    const angle = (i * (Math.PI * 2 / Math.max(1, simMotos))) + 1.15;
    const r = radDeg * 0.45;
    const uLat = cLat + Math.cos(angle) * r;
    const uLng = cLng + Math.sin(angle) * r;

    const unitIcon = L.divIcon({
      className: 'deployed-unit-marker',
      html: `<div style="background:#f59e0b; color:#ffffff; border:2px solid #ffffff; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:13px; box-shadow:0 3px 8px rgba(0,0,0,0.3);" title="Águila M-${i+1}">🏍️</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    L.marker([uLat, uLng], { icon: unitIcon })
      .bindTooltip(`<strong>🏍️ Unidad Águila M-${i+1}</strong><br>Cuadrante ${sectorSimuladorActivo} &middot; Intercepción rápida`)
      .addTo(unitsDeploymentGroup);
  }

  // 3. Binomios de Infantería (verde)
  const binomios = Math.max(1, Math.floor(simOficialesPie / 2));
  for (let i = 0; i < binomios; i++) {
    const angle = (i * (Math.PI * 2 / binomios)) + 2.0;
    const r = radDeg * 0.22;
    const uLat = cLat + Math.cos(angle) * r;
    const uLng = cLng + Math.sin(angle) * r;

    const unitIcon = L.divIcon({
      className: 'deployed-unit-marker',
      html: `<div style="background:#10b981; color:#ffffff; border:2px solid #ffffff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 3px 8px rgba(0,0,0,0.25);" title="Binomio I-${i+1}">👮</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([uLat, uLng], { icon: unitIcon })
      .bindTooltip(`<strong>👮 Binomio Infantería I-${i+1}</strong><br>Cuadrante ${sectorSimuladorActivo} &middot; Disuasión a pie`)
      .addTo(unitsDeploymentGroup);
  }
}

function iniciarRadarTactico() {
  const container = document.getElementById('simMiniMap');
  if (!container) return;

  if (!window._simMiniMapInstance) {
    const secData = sectoresDinamicos && sectoresDinamicos[sectorSimuladorActivo];
    const center = secData ? secData.center : centroBase;

    const miniMap = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      keyboard: false
    }).setView(center, 15);

    // Light gray base (sin etiquetas de nombres de ciudades para mantener neutralidad jurídica)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18, attribution: ''
    }).addTo(miniMap);

    window._simMiniMapInstance = miniMap;
    window._simMiniMapSectorGroup = L.layerGroup().addTo(miniMap);
    window._simMiniMapUnitsGroup = L.layerGroup().addTo(miniMap);
  }

  actualizarMiniMapaSector();
}

function actualizarMiniMapaSector() {
  if (!window._simMiniMapInstance) return;
  const secData = sectoresDinamicos && sectoresDinamicos[sectorSimuladorActivo];
  const center = secData ? secData.center : centroBase;
  const radius = (secData && secData.radius) ? Math.min(secData.radius, 1200) : 750;

  window._simMiniMapInstance.invalidateSize();

  if (window._simMiniMapSectorGroup) {
    window._simMiniMapSectorGroup.clearLayers();

    const circle = L.circle(center, {
      radius: radius,
      color: '#1a3a6b',
      fillColor: 'rgba(26,58,107,0.09)',
      fillOpacity: 1,
      weight: 2,
      dashArray: '5,5'
    }).addTo(window._simMiniMapSectorGroup);

    L.marker(center, {
      icon: L.divIcon({
        className: 'sim-sector-badge-icon',
        html: `<div style="background:#1a3a6b;color:#fff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);pointer-events:none;">📍 ${sectorSimuladorActivo}</div>`,
        iconAnchor: [38, 12]
      })
    }).addTo(window._simMiniMapSectorGroup);

    try {
      window._simMiniMapInstance.fitBounds(circle.getBounds().pad(0.18), { animate: false });
    } catch (e) {
      window._simMiniMapInstance.setView(center, 15);
    }
  }

  actualizarMiniMapaUnidades();
}

function actualizarMiniMapaUnidades() {
  if (!window._simMiniMapInstance || !window._simMiniMapUnitsGroup) return;
  window._simMiniMapUnitsGroup.clearLayers();

  const secData = sectoresDinamicos && sectoresDinamicos[sectorSimuladorActivo];
  const [cLat, cLng] = secData ? secData.center : centroBase;
  const radius = (secData && secData.radius) ? Math.min(secData.radius, 1200) : 750;
  const radDeg = radius / 111000;

  // Patrullas Móviles — anillo exterior azul marino
  for (let i = 0; i < simPatrullas; i++) {
    const angle = (i * (Math.PI * 2 / Math.max(1, simPatrullas))) + 0.35;
    const r = radDeg * 0.72;
    const lat = cLat + Math.cos(angle) * r;
    const lng = cLng + Math.sin(angle) * r;
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'sim-unit-div-icon',
        html: `<div style="background:#1a3a6b;color:#fff;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer;" title="Patrulla Móvil P-${i+1}">🚔</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    }).bindTooltip(`<strong>🚔 Patrulla P-${i+1}</strong><br>Patrullaje perimetral`).addTo(window._simMiniMapUnitsGroup);
  }

  // Unidades Motorizadas — anillo medio ámbar
  for (let i = 0; i < simMotos; i++) {
    const angle = (i * (Math.PI * 2 / Math.max(1, simMotos))) + 1.15;
    const r = radDeg * 0.46;
    const lat = cLat + Math.cos(angle) * r;
    const lng = cLng + Math.sin(angle) * r;
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'sim-unit-div-icon',
        html: `<div style="background:#f59e0b;color:#fff;border:2px solid #fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;" title="Unidad Motorizada M-${i+1}">🏍️</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13]
      })
    }).bindTooltip(`<strong>🏍️ Águila M-${i+1}</strong><br>Intercepción rápida`).addTo(window._simMiniMapUnitsGroup);
  }

  // Infantería a Pie — anillo interior verde
  const binomios = Math.max(1, Math.floor(simOficialesPie / 2));
  for (let i = 0; i < binomios; i++) {
    const angle = (i * (Math.PI * 2 / binomios)) + 2.0;
    const r = radDeg * 0.24;
    const lat = cLat + Math.cos(angle) * r;
    const lng = cLng + Math.sin(angle) * r;
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'sim-unit-div-icon',
        html: `<div style="background:#10b981;color:#fff;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;" title="Binomio de Infantería I-${i+1}">👮</div>`,
        iconSize: [24, 24], iconAnchor: [12, 12]
      })
    }).bindTooltip(`<strong>👮 Binomio I-${i+1}</strong><br>Disuasión a pie`).addTo(window._simMiniMapUnitsGroup);
  }

  // Retén si activo
  if (simReten) {
    L.marker([cLat + radDeg * 0.55, cLng + radDeg * 0.55], {
      icon: L.divIcon({ className: 'sim-unit-div-icon', html: `<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));" title="Retén Nocturno">🛑</div>`, iconSize: [24, 24], iconAnchor: [12, 12] })
    }).bindTooltip('Retén Fijo Activo').addTo(window._simMiniMapUnitsGroup);
  }

  // Cámaras si activas
  if (simCamaras) {
    L.marker([cLat - radDeg * 0.55, cLng - radDeg * 0.55], {
      icon: L.divIcon({ className: 'sim-unit-div-icon', html: `<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));" title="Vigilancia Electrónica / Drones">📡</div>`, iconSize: [24, 24], iconAnchor: [12, 12] })
    }).bindTooltip('Vigilancia Electrónica Activa').addTo(window._simMiniMapUnitsGroup);
  }
}

// ── Preset Chips Tácticos de 1 Clic ─────────────────────────
function aplicarPreset(preset) {
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
  const targetChip = document.getElementById(`chip-${preset}`);
  if (targetChip) targetChip.classList.add('active');

  const fTipo = document.getElementById('filterTipo');
  const fSector = document.getElementById('filterSector');
  const fPeriodo = document.getElementById('filterPeriodo');
  const fSearch = document.getElementById('filterSearch');

  if (preset === 'todos') {
    if (fTipo) fTipo.value = 'todos';
    if (fSector) fSector.value = 'todos';
    if (fPeriodo) fPeriodo.value = '0';
    if (fSearch) fSearch.value = '';
    filtroDiaHora = null;
    filtroEstadoTabla = 'todos';
    mostrarToast('Filtros restablecidos');
  } else if (preset === 'critico') {
    if (fSector) fSector.value = 'Oriente';
    mostrarToast('Focalizando en Foco Crítico: Oriente', 'warning');
  } else if (preset === 'noche') {
    if (fSearch) fSearch.value = '';
    filtroDiaHora = { dia: 'Todos', franja: '18-24' };
    mostrarToast('Focalizando en Franja Nocturna (18:00 - 00:00)', 'warning');
  } else if (preset === 'robos') {
    if (fTipo) fTipo.value = 'Robo';
    mostrarToast('Filtro táctico: Solo Delitos de Robo', 'info');
  } else if (preset === 'pendientes') {
    filtrarTablaEstado('Pendiente');
    switchTab('data');
    mostrarToast('Visualizando casos en estado Pendiente', 'info');
    return;
  }

  aplicarFiltros();
}

// ── Controles de Cámara y Navegación del Mapa ───────────────
function enfocarFocoCritico() {
  const topSec = Object.entries(sectoresDinamicos).sort((a,b) => {
    const cA = filteredIncidentes.filter(i => i.sector === a[0]).length;
    const cB = filteredIncidentes.filter(i => i.sector === b[0]).length;
    return cB - cA;
  })[0];

  if (topSec && topSec[1] && mapa) {
    mapa.flyTo(topSec[1].center, 15, { animate: true, duration: 1.2 });
    mostrarToast(`🎯 Cámara centrada en Foco Crítico: ${topSec[0]}`, 'info');
  } else if (mapa) {
    mapa.setView(centroBase, 13);
  }
}

function ajustarVistaMapa() {
  if (mapa && markerGroup) {
    const b = markerGroup.getBounds();
    if (b.isValid()) {
      mapa.fitBounds(b.pad(0.18), { animate: true, duration: 1 });
      mostrarToast('Vista general del mapa ajustada');
    }
  }
}

// ── Filtrar por Nivel de Riesgo (Botones de Leyenda del Mapa) ──
function filtrarPorNivel(nivel) {
  filtroNivelActivo = nivel;

  // Actualizar estado visual de los botones de leyenda
  ['todos', 'alto', 'medio', 'bajo'].forEach(n => {
    const btn = document.getElementById(`btnNivel-${n}`);
    if (btn) btn.classList.toggle('active', n === nivel);
  });

  if (nivel === 'todos') {
    // Restablecer: quitar filtro de sector del selector y regenerar mapa completo
    cuadranteSeleccionadoActivo = null;
    const select = document.getElementById('filterSector');
    if (select && select.value !== 'todos') {
      select.value = 'todos';
      aplicarFiltros();
    } else {
      actualizarMapaColoresYSectores({});
    }
    actualizarTablaZona(null);
    mostrarToast('Mostrando todos los cuadrantes y niveles de amenaza', 'info');
    return;
  }

  // Determinar cuadrantes que pertenecen a ese nivel según el conteo actual
  const sectorCount = {};
  const pool = filtroMapaFranja !== 'todos'
    ? filteredIncidentes.filter(inc => {
        const h = parseInt((inc.hora || '12:00').split(':')[0]);
        if (filtroMapaFranja === 'noche') return h >= 18 || h <= 2;
        if (filtroMapaFranja === 'madrugada') return h >= 0 && h < 6;
        if (filtroMapaFranja === 'tarde') return h >= 12 && h < 18;
        if (filtroMapaFranja === 'manana') return h >= 6 && h < 12;
        return true;
      })
    : filteredIncidentes;

  pool.forEach(i => {
    if (i.sector) sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1;
  });

  // Filtrar cuadrantes dentro del nivel solicitado
  const cuadrantesDelNivel = Object.entries(sectorCount).filter(([, count]) => {
    if (nivel === 'alto') return count >= 6;
    if (nivel === 'medio') return count >= 3 && count < 6;
    if (nivel === 'bajo') return count < 3;
    return true;
  }).map(([name]) => name);

  if (cuadrantesDelNivel.length === 0) {
    const labels = { alto: 'Crítico', medio: 'Alerta', bajo: 'Bajo Riesgo' };
    mostrarToast(`No hay cuadrantes en nivel ${labels[nivel]} para la franja activa`, 'warning');
    return;
  }

  // Si solo hay un cuadrante en ese nivel, seleccionarlo directamente
  if (cuadrantesDelNivel.length === 1) {
    seleccionarCuadrante(cuadrantesDelNivel[0]);
  } else {
    // Mostrar todos los cuadrantes del nivel seleccionado y actualizar tabla con todos ellos
    cuadranteSeleccionadoActivo = cuadrantesDelNivel;
    actualizarTablaZona(cuadrantesDelNivel);
    const labels = { alto: '🔴 Crítico', medio: '🟠 Alerta', bajo: '🟢 Bajo Riesgo' };
    mostrarToast(`Mostrando ${cuadrantesDelNivel.length} cuadrantes de nivel ${labels[nivel]}`, 'info');
  }
}

// ── Seleccionar un cuadrante del mapa y mostrar sus partes ──
function seleccionarCuadrante(sectorName) {
  cuadranteSeleccionadoActivo = [sectorName];

  // Determinar nivel de amenaza para el color del banner/predicción
  const pool = filtroMapaFranja !== 'todos'
    ? filteredIncidentes.filter(inc => {
        const h = parseInt((inc.hora || '12:00').split(':')[0]);
        if (filtroMapaFranja === 'noche') return h >= 18 || h <= 2;
        if (filtroMapaFranja === 'madrugada') return h >= 0 && h < 6;
        if (filtroMapaFranja === 'tarde') return h >= 12 && h < 18;
        if (filtroMapaFranja === 'manana') return h >= 6 && h < 12;
        return true;
      })
    : filteredIncidentes;

  const sectorCount = {};
  pool.forEach(i => { if (i.sector) sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1; });
  const count = sectorCount[sectorName] || 0;

  let nivel, labelNivel, accionLabel;
  if (count >= 6) {
    nivel = 'rojo';
    labelNivel = '🔴 AMENAZA CRÍTICA';
    accionLabel = `Refuerzo inmediato. Sector ${sectorName} supera el umbral crítico con ${count} partes registrados. Desplegar cerco perimetral.`;
  } else if (count >= 3) {
    nivel = 'amber';
    labelNivel = '🟠 EN OBSERVACIÓN';
    accionLabel = `Vigilancia intensiva. ${count} partes en ${sectorName}. Si la cifra aumenta puede escalar a Código Rojo. Reforzar patrullaje preventivo.`;
  } else {
    nivel = 'verde';
    labelNivel = count === 0
      ? '🟢 ZONA TRANQUILA (0 PARTES)'
      : `🟢 BAJO RIESGO (${count} ${count === 1 ? 'parte' : 'partes'})`;
    accionLabel = count === 0
      ? `No se registran incidentes en ${sectorName} en la franja activa. Mantener patrullaje de rutina y vigilancia preventiva.`
      : `Solo ${count} ${count === 1 ? 'parte registrado' : 'partes registrados'} en ${sectorName}. El cuadrante está controlado, pero toda zona requiere atención. Si se agregan más reportes puede escalar.`;
  }

  // Actualizar la tarjeta de inteligencia para reflejar la zona seleccionada
  const predLabelTag = document.getElementById('mapPredLabelTag');
  const predDelito = document.getElementById('mapPredDelito');
  const predCuadrante = document.getElementById('mapPredCuadrante');
  const predRiesgo = document.getElementById('mapPredRiesgo');
  const predEfectivos = document.getElementById('mapPredEfectivos');
  const predDirectiva = document.getElementById('mapPredDirectiva');
  const predActionTitle = document.getElementById('mapPredActionTitle');
  const predActionBox = document.getElementById('mapPredActionBox');
  const cardBadge = document.getElementById('mapCardProbBadge');

  if (predLabelTag) predLabelTag.textContent = `Zona Seleccionada: Cuadrante ${sectorName}`;
  if (predDelito) predDelito.textContent = `${count} ${count === 1 ? 'parte policial registrado' : 'partes policiales registrados'}`;
  if (predCuadrante) predCuadrante.innerHTML = `Análisis de <strong>Cuadrante ${sectorName}</strong> · ${labelNivel}`;
  if (predRiesgo) {
    predRiesgo.textContent = nivel === 'rojo' ? 'CÓDIGO ROJO' : nivel === 'amber' ? 'CÓDIGO ÁMBAR' : 'CÓDIGO VERDE';
    predRiesgo.className = `mpm-val ${nivel === 'rojo' ? 'text-danger' : nivel === 'amber' ? 'text-warning' : 'text-success'}`;
  }
  if (predEfectivos) {
    predEfectivos.textContent = nivel === 'rojo' ? '3 Móviles + 4 Motos' : nivel === 'amber' ? '2 Móviles + 2 Motos' : '1 Móvil + 1 Moto (rutina)';
  }
  if (predDirectiva) predDirectiva.textContent = accionLabel;
  if (predActionTitle) predActionTitle.textContent = nivel === 'verde'
    ? '🟢 Estado del Cuadrante: Vigilancia Preventiva'
    : '🚨 Recomendación Táctica:';
  if (predActionBox) {
    predActionBox.style.background = nivel === 'rojo' ? '#fef2f2' : nivel === 'amber' ? '#fffbeb' : '#f0fdf4';
    predActionBox.style.borderColor = nivel === 'rojo' ? 'rgba(220,38,38,0.25)' : nivel === 'amber' ? 'rgba(245,158,11,0.25)' : 'rgba(22,163,74,0.25)';
  }
  if (cardBadge) cardBadge.textContent = nivel === 'rojo' ? 'CÓDIGO ROJO' : nivel === 'amber' ? 'EN OBSERVACIÓN' : 'ZONA CONTROLADA';

  // Actualizar banner de predicción con color acorde al nivel
  actualizarPrediccionBannerThreat(nivel, sectorName, count, labelNivel);

  // Actualizar la tabla de partes de la zona
  actualizarTablaZona([sectorName]);

  // Mostrar botón "Ver toda la jurisdicción"
  const btnReset = document.getElementById('btnResetZoneMatrix');
  if (btnReset) btnReset.style.display = '';
  const pillZone = document.getElementById('zoneActivePill');
  if (pillZone) pillZone.textContent = `📍 Zona: Cuadrante ${sectorName}`;

  mostrarToast(`Cuadrante ${sectorName} seleccionado · ${labelNivel}`, nivel === 'rojo' ? 'danger' : 'info');
}

// ── Actualizar color del banner de predicción según nivel ──
function actualizarPrediccionBannerThreat(nivel, sectorName, count, labelNivel) {
  const banner = document.getElementById('mapPredictionBanner');
  if (!banner) return;
  banner.classList.remove('threat-green', 'threat-amber', 'threat-red');
  if (nivel === 'verde') banner.classList.add('threat-green');
  else if (nivel === 'amber') banner.classList.add('threat-amber');
  else banner.classList.add('threat-red');

  const mpbBadge = document.getElementById('mpbProbBadge');
  const mpbCuadrante = document.getElementById('mpbCuadrante');
  const mpbDelito = document.getElementById('mpbDelito');
  const mpbAccion = document.getElementById('mpbAccion');
  const miniProb = document.getElementById('mpbMiniProb');

  if (mpbBadge) mpbBadge.textContent = nivel === 'rojo' ? `⚠️ ${labelNivel}` : nivel === 'amber' ? `🔍 ${labelNivel}` : `✅ ${labelNivel}`;
  if (mpbCuadrante) mpbCuadrante.textContent = `Cuadrante ${sectorName}`;
  if (mpbDelito) mpbDelito.textContent = count === 0
    ? 'Sin partes registrados en la franja activa'
    : `${count} ${count === 1 ? 'parte policial registrado' : 'partes policiales registrados'}`;
  if (mpbAccion) {
    const advice = nivel === 'rojo'
      ? 'Desplegar cerco perimetral y unidades de respuesta rápida. Alta concentración delictiva.'
      : nivel === 'amber'
        ? 'Reforzar patrullaje preventivo. Tendencia a incremento si no se interviene.'
        : count === 0
          ? 'Zona sin incidentes activos. Mantener patrullaje de rutina y presencia disuasiva.'
          : 'Cifra controlada. Monitorear para evitar escalada. Zona de bajo riesgo actual.';
    mpbAccion.innerHTML = `${nivel === 'rojo' ? '🚨' : nivel === 'amber' ? '⚠️' : '✅'} <strong>Directiva:</strong> ${advice}`;
  }
  if (miniProb) miniProb.textContent = nivel === 'rojo' ? 'ROJO' : nivel === 'amber' ? 'ÁMBAR' : 'VERDE';
}

// ── Mostrar/Ocultar Banner de Predicción ──
function toggleBannerPrediccion() {
  bannerPrediccionVisible = !bannerPrediccionVisible;
  const banner = document.getElementById('mapPredictionBanner');
  const pill = document.getElementById('mpbMiniPill');
  const btnToggle = document.getElementById('btnToggleBannerMap');

  if (banner) {
    if (bannerPrediccionVisible) {
      banner.style.display = 'flex';
      banner.classList.remove('is-hidden');
      if (pill) pill.style.display = 'none';
      if (btnToggle) btnToggle.innerHTML = '👁️ Ocultar Predicción';
      mostrarToast('Panel de predicción táctica visible', 'info');
    } else {
      banner.classList.add('is-hidden');
      banner.style.display = 'none';
      if (pill) pill.style.display = 'flex';
      if (btnToggle) btnToggle.innerHTML = '👁️ Mostrar Predicción';
      mostrarToast('Panel ocultado. Haz clic en la mini-píldora 🎯 para restaurarlo.', 'info');
    }
  }
}

// ── Actualizar Tabla de Incidentes de la Zona Seleccionada ──
let allZoneIncidents = [];

function actualizarTablaZona(sectoresList) {
  const heading = document.getElementById('zipHeadingTitle');
  const sub = document.getElementById('zipHeadingSub');
  const badge = document.getElementById('zipBadgeCount');
  const resetBtn = document.getElementById('btnResetZoneMatrix');
  const pill = document.getElementById('zoneActivePill');

  // Determinar pool de incidentes según la franja activa del mapa
  const pool = filtroMapaFranja !== 'todos'
    ? filteredIncidentes.filter(inc => {
        const h = parseInt((inc.hora || '12:00').split(':')[0]);
        if (filtroMapaFranja === 'noche') return h >= 18 || h <= 2;
        if (filtroMapaFranja === 'madrugada') return h >= 0 && h < 6;
        if (filtroMapaFranja === 'tarde') return h >= 12 && h < 18;
        if (filtroMapaFranja === 'manana') return h >= 6 && h < 12;
        return true;
      })
    : filteredIncidentes;

  if (!sectoresList) {
    // Toda la jurisdicción
    allZoneIncidents = [...pool].sort((a, b) => new Date(b.fecha + ' ' + b.hora) - new Date(a.fecha + ' ' + a.hora));
    if (heading) heading.textContent = 'Partes Policiales Registrados en: Toda la Jurisdicción';
    if (sub) sub.textContent = 'Vista global de denuncias. Selecciona un cuadrante del mapa para filtrar por zona.';
    if (pill) pill.textContent = '📍 Zona: Toda la Jurisdicción';
    if (resetBtn) resetBtn.style.display = 'none';
  } else {
    allZoneIncidents = pool
      .filter(i => sectoresList.includes(i.sector))
      .sort((a, b) => new Date(b.fecha + ' ' + b.hora) - new Date(a.fecha + ' ' + a.hora));

    const label = sectoresList.length === 1
      ? `Cuadrante ${sectoresList[0]}`
      : `${sectoresList.length} cuadrantes seleccionados`;
    if (heading) heading.textContent = `Partes Policiales Registrados en: ${label}`;
    if (sub) sub.textContent = `Reportes policiales registrados correspondientes a ${label}.`;
    if (pill) pill.textContent = `📍 Zona: ${label}`;
    if (resetBtn) resetBtn.style.display = '';
  }

  if (badge) badge.textContent = `${allZoneIncidents.length} ${allZoneIncidents.length === 1 ? 'parte' : 'partes'}`;

  // Reset search
  filtroTextoZona = '';
  const searchInput = document.getElementById('zipSearchInput');
  if (searchInput) searchInput.value = '';

  renderTablaZona(allZoneIncidents);
}

function renderTablaZona(incidents) {
  const tbody = document.getElementById('zipTableBody');
  if (!tbody) return;

  if (!incidents || incidents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-state">✅ No se registran partes en esta zona para la franja activa. Zona bajo control.</td></tr>`;
    return;
  }

  tbody.innerHTML = incidents.map(inc => {
    const estadoBadge = inc.estado === 'Investigado'
      ? `<span class="badge-status-inv">Con Diligencias</span>`
      : `<span class="badge-status-pend">Sin Diligencias</span>`;

    const colorTipo = inc.tipo === 'Robo' ? '#ef4444' : inc.tipo === 'Hurto' ? '#f59e0b' : '#8b5cf6';

    return `<tr>
      <td style="font-weight:800; color:#1a3a6b;">#${inc.id}</td>
      <td>${inc.fecha || '—'}</td>
      <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${inc.hora || '—'}</td>
      <td><span style="font-weight:800; color:${colorTipo};">${inc.tipo || '—'}</span></td>
      <td style="font-weight:700;">${inc.sector || '—'}</td>
      <td>${estadoBadge}</td>
      <td style="text-align:center;">
        <button class="btn-zip-locate" onclick="enfocarDesdeTablaZona(${parseFloat(inc.lat)}, ${parseFloat(inc.lng)}, '${(inc.tipo || '').replace(/'/g, '')}', '#${inc.id}')" title="Ver en el mapa">📍 Localizar</button>
      </td>
    </tr>`;
  }).join('');
}

function filtrarTablaZona(texto) {
  filtroTextoZona = (texto || '').toLowerCase().trim();
  if (!filtroTextoZona) {
    renderTablaZona(allZoneIncidents);
    return;
  }
  const filtered = allZoneIncidents.filter(inc =>
    (inc.tipo || '').toLowerCase().includes(filtroTextoZona) ||
    (inc.id + '').toLowerCase().includes(filtroTextoZona) ||
    (inc.fecha || '').toLowerCase().includes(filtroTextoZona) ||
    (inc.sector || '').toLowerCase().includes(filtroTextoZona) ||
    (inc.estado || '').toLowerCase().includes(filtroTextoZona)
  );
  const badge = document.getElementById('zipBadgeCount');
  if (badge) badge.textContent = `${filtered.length} ${filtered.length === 1 ? 'parte' : 'partes'}`;
  renderTablaZona(filtered);
}

function limpiarSeleccionZona() {
  cuadranteSeleccionadoActivo = null;
  filtroNivelActivo = 'todos';

  // Resetear botones de leyenda
  ['todos', 'alto', 'medio', 'bajo'].forEach(n => {
    const btn = document.getElementById(`btnNivel-${n}`);
    if (btn) btn.classList.toggle('active', n === 'todos');
  });

  // Restaurar selector de sector si estaba filtrado
  const select = document.getElementById('filterSector');
  if (select && select.value !== 'todos') {
    select.value = 'todos';
    aplicarFiltros();
  }

  // Restaurar predicción normal
  if (prediccionMapaActual) {
    actualizarPrediccionBannerThreat('rojo', prediccionMapaActual.sector, prediccionMapaActual.prob, 'PREDICCIÓN TÁCTICA');
    const banner = document.getElementById('mapPredictionBanner');
    if (banner) banner.classList.remove('threat-green', 'threat-amber', 'threat-red');
  }

  actualizarTablaZona(null);
  mostrarToast('Vista de jurisdicción completa restablecida', 'info');
}

let locateBeaconLayer = null;

function enfocarDesdeTablaZona(lat, lng, tipo, id) {
  if (isNaN(lat) || isNaN(lng)) {
    mostrarToast('Coordenadas no disponibles para este parte.', 'warning');
    return;
  }

  // 1. Cambiar a la pestaña de mapa
  switchTab('mapa');

  // 2. Desplazar la pantalla con suavidad hacia el mapa
  setTimeout(() => {
    const mapContainer = document.getElementById('mapaInteractivo') || document.querySelector('.map-card');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 50);

  if (!mapa) return;

  // 3. Forzar refresco de Leaflet tras el cambio de pestaña
  setTimeout(() => {
    if (mapa) mapa.invalidateSize();
  }, 120);

  // 4. Si el mapa está en modo calor, activar vista combinada para mostrar los puntos
  if (mapMode === 'heat') {
    setMapMode('both');
  }

  // 5. Volar con animación de zoom táctico sobre el punto
  mapa.flyTo([lat, lng], 17, { animate: true, duration: 1.1 });

  // 6. Colocar baliza táctica pulsante de alta visibilidad sobre el punto
  if (locateBeaconLayer && mapa.hasLayer(locateBeaconLayer)) {
    mapa.removeLayer(locateBeaconLayer);
    locateBeaconLayer = null;
  }

  const beaconIcon = L.divIcon({
    html: `
      <div class="locate-target-pin">
        <div class="locate-target-ring"></div>
        <div class="locate-target-dot"></div>
      </div>
    `,
    className: 'locate-target-container',
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });

  locateBeaconLayer = L.marker([lat, lng], {
    icon: beaconIcon,
    zIndexOffset: 3000,
    interactive: false
  }).addTo(mapa);

  // Retirar la baliza tras 8 segundos
  setTimeout(() => {
    if (locateBeaconLayer && mapa.hasLayer(locateBeaconLayer)) {
      mapa.removeLayer(locateBeaconLayer);
      locateBeaconLayer = null;
    }
  }, 8000);

  // 7. Abrir popup con los datos del parte en el mapa
  setTimeout(() => {
    let matchedLayer = null;
    if (markerGroup) {
      markerGroup.eachLayer(layer => {
        if (typeof layer.getLatLng === 'function') {
          const ll = layer.getLatLng();
          if (Math.abs(ll.lat - lat) < 0.0003 && Math.abs(ll.lng - lng) < 0.0003) {
            matchedLayer = layer;
          }
        }
      });
    }

    if (matchedLayer) {
      matchedLayer.openPopup();
    } else {
      L.popup({ offset: [0, -12], closeButton: true })
        .setLatLng([lat, lng])
        .setContent(`
          <div style="font-family:'Outfit',sans-serif; font-size:13px; padding:4px;">
            <strong style="color:#ef4444; font-size:14px;">📍 ${tipo} (${id})</strong><br>
            <span style="color:#0f172a; font-weight:700;">Parte Policial Localizado</span><br>
            <span style="font-size:11px; color:#64748b;">Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          </div>
        `)
        .openOn(mapa);
    }
  }, 1150);

  mostrarToast(`📍 Mostrando parte ${id} en la cartografía táctica...`, 'info');
}


// ── Matriz Temporal de Concentración (Día x Hora) ───────────
function renderMatrizTemporal(data) {
  const container = document.getElementById('temporalMatrix');
  if (!container) return;

  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const franjas = [
    { key: '00-06', label: 'Madrugada (00-06h)' },
    { key: '06-12', label: 'Mañana (06-12h)' },
    { key: '12-18', label: 'Tarde (12-18h)' },
    { key: '18-24', label: 'Noche (18-24h)' }
  ];

  const matriz = {};
  dias.forEach(d => {
    matriz[d] = { '00-06': 0, '06-12': 0, '12-18': 0, '18-24': 0 };
  });

  data.forEach(inc => {
    const d = new Date(inc.fecha);
    const dayIdx = d.getDay();
    const diaNombre = dias[(dayIdx + 6) % 7];
    const hora = parseInt((inc.hora || '12:00').split(':')[0]);
    let franjaKey = '18-24';
    if (hora < 6) franjaKey = '00-06';
    else if (hora < 12) franjaKey = '06-12';
    else if (hora < 18) franjaKey = '12-18';

    if (matriz[diaNombre]) {
      matriz[diaNombre][franjaKey]++;
    }
  });

  let html = `<div class="temporal-grid">`;
  html += `<div class="t-header-cell">Día / Franja</div>`;
  franjas.forEach(f => {
    html += `<div class="t-header-cell">${f.label}</div>`;
  });

  dias.forEach(dia => {
    html += `<div class="t-day-cell">📅 ${dia}</div>`;
    franjas.forEach(f => {
      const count = matriz[dia][f.key];
      const isActive = filtroDiaHora && filtroDiaHora.dia === dia && filtroDiaHora.franja === f.key;

      let bg = '#f8fafc';
      let textColor = '#4a6080';
      let borderCol = 'rgba(79,142,247,0.12)';
      if (count >= 3) {
        bg = 'rgba(239, 68, 68, 0.16)';
        textColor = '#dc2626';
        borderCol = 'rgba(239, 68, 68, 0.35)';
      } else if (count >= 1) {
        bg = 'rgba(245, 158, 11, 0.12)';
        textColor = '#d97706';
        borderCol = 'rgba(245, 158, 11, 0.3)';
      }

      html += `
        <div class="t-slot-cell ${isActive ? 'active-filter' : ''}"
             style="background:${bg}; border-color:${borderCol};"
             onclick="toggleFiltroTemporal('${dia}', '${f.key}')"
             title="${dia} - ${f.label}: ${count} incidentes">
          <span class="t-slot-count" style="color:${textColor};">${count}</span>
          <span class="t-slot-label" style="color:${textColor};">${count === 1 ? 'caso' : 'casos'}</span>
        </div>
      `;
    });
  });

  html += `</div>`;
  container.innerHTML = html;
}

function toggleFiltroTemporal(dia, franja) {
  if (filtroDiaHora && filtroDiaHora.dia === dia && filtroDiaHora.franja === franja) {
    filtroDiaHora = null;
    mostrarToast('Filtro temporal desactivado');
  } else {
    filtroDiaHora = { dia, franja };
    mostrarToast(`Filtro temporal activo: ${dia} (${franja}h)`);
  }
  aplicarFiltros();
}

function limpiarFiltroTemporal() {
  filtroDiaHora = null;
  mostrarToast('Matriz temporal restablecida');
  aplicarFiltros();
}

// ── Ordenamiento y Filtrado de Tabla ────────────────────────
function ordenarPor(col) {
  if (ordenColumna === col) {
    ordenAsc = !ordenAsc;
  } else {
    ordenColumna = col;
    ordenAsc = true;
  }

  ['id', 'fecha', 'hora', 'tipo', 'sector', 'estado'].forEach(c => {
    const icon = document.getElementById(`sort-${c}`);
    if (icon) icon.textContent = c === ordenColumna ? (ordenAsc ? '▲' : '▼') : '⇅';
  });

  filteredIncidentes.sort((a, b) => {
    let vA = a[col];
    let vB = b[col];
    if (typeof vA === 'string') {
      return ordenAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return ordenAsc ? vA - vB : vB - vA;
  });

  renderTabla();
  mostrarToast(`Ordenado por ${col.toUpperCase()} (${ordenAsc ? 'Ascendente' : 'Descendente'})`);
}

function filtrarTablaEstado(estado) {
  filtroEstadoTabla = estado;
  ['todos', 'investigados', 'pendientes'].forEach(id => {
    const btn = document.getElementById(`ttab-${id}`);
    if (btn) {
      btn.classList.toggle('active', (id === 'todos' && estado === 'todos') || (id === 'investigados' && estado === 'Investigado') || (id === 'pendientes' && estado === 'Pendiente'));
    }
  });
  renderTabla();
}
