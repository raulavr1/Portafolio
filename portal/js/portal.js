/**
 * portal.js — Controlador del Portal Maestro y Visor Sandbox Interactivo
 */

// Configuración de proyectos
const PROJECTS = {
  ventas: {
    id: 'ventas',
    title: 'VentasPro — Dashboard Tecnológico de Área de Ventas',
    shortName: 'VentasPro Suite',
    category: 'Desarrollo Analítico & Gestión Comercial',
    icon: 'ph-chart-line-up',
    badge: '100% Autónomo',
    directUrl: 'AreadeVentas/index.html',
    serverUrl: 'http://localhost:4800',
    currentMode: 'direct', // 'direct' o 'server'
    port: 4800,
    requiresServer: false,
    description: 'Solución integral de analítica comercial y gestión operativa con proyección de metas, control de stock en tiempo real, catálogos interactivos, proformas y emisión de facturación con exportación profesional a Excel.',
    techStack: ['Gráficas interactivas en tiempo real', 'Exportación profesional a Excel', 'Acceso por roles y perfiles', 'Facturación y cotizaciones', 'Control de inventario automático', 'Análisis de KPIs de ventas'],
    metrics: {
      'Visión del negocio': 'KPIs en tiempo real',
      'Gestión de productos': 'Stock con alertas',
      'Documentos': 'Facturas y proformas',
      'Acceso seguro': 'Perfiles personalizados'
    },
    keyFeatures: [
      'Sus datos de ventas se convierten en gráficas dinámicas e interactivas que actualizan automáticamente al registrar nuevas operaciones.',
      'El inventario se controla de forma visual con alertas cuando un producto alcanza stock mínimo, sin necesidad de revisar manualmente.',
      'Genera facturas y cotizaciones profesionales con un clic y las exporta a Excel con formato enriquecido listo para imprimir o enviar.',
      'Cada usuario accede con su perfil personalizado, viendo solo la información y herramientas que corresponden a su rol.'
    ]
  },
  prediccion: {
    id: 'prediccion',
    title: 'ACTG — Sistema Táctico de Predicción de Incidentes & Geo-Analítica',
    shortName: 'Predicción Criminal ACTG',
    category: 'Seguridad & Big Data Geoespacial',
    icon: 'ph-shield-warning',
    badge: 'IA & Geodatos',
    directUrl: 'PredicciondeEventos/public/index.html',
    serverUrl: 'http://localhost:3500',
    currentMode: 'direct', // cambiará a 'server' si el servidor local está activo
    port: 3500,
    requiresServer: false,
    description: 'Plataforma táctica de inteligencia policial y análisis de riesgo con mapas de calor interactivos, sectorización de cuadrantes, algoritmos de predicción de delitos por ventanas horarias y persistencia en base de datos JSON/Excel.',
    techStack: ['Mapas interactivos de calor por zona', 'Alertas predictivas por turno y sector', 'Planificación táctica visual', 'Análisis por franja horaria', 'Carga masiva desde Excel/CSV', 'Conectividad y sincronización en tiempo real'],
    metrics: {
      'Cobertura táctica': 'Mapas por cuadrante',
      'Predicción': 'Por turno y tipo de evento',
      'Gestión de datos': 'Carga masiva Excel/CSV',
      'Visualización': 'Mapas de calor dinámicos'
    },
    keyFeatures: [
      'Transforma su información operativa en mapas de calor interactivos que muestran visualmente dónde y cuándo se concentran los incidentes.',
      'El sistema predice zonas de mayor riesgo por turno y tipo de evento, permitiendo planificar el despliegue táctico con anticipación.',
      'Filtre, analice y exporte incidentes por zona, fecha y tipo desde un panel centralizado sin necesidad de conocimientos técnicos.',
      'Carga sus propios datos desde Excel o CSV y el sistema los organiza automáticamente en el mapa y los paneles analíticos.'
    ]
  },
  clinico: {
    id: 'clinico',
    title: 'Farmacia Clínica — Dashboard de Control & Gestión Farmacéutica Hospitalaria',
    shortName: 'Farmacia Clínica',
    category: 'Salud & Gestión Hospitalaria',
    icon: 'ph-first-aid',
    badge: '100% Autónomo',
    directUrl: 'DashboardClinico/dist/index.html',
    serverUrl: 'http://localhost:5188',
    currentMode: 'direct',
    port: 5188,
    requiresServer: false,
    description: 'Sistema integral de gestión farmacéutica y abastecimiento hospitalario con monitoreo de stock crítico en tiempo real, trazabilidad de lotes con semáforo de vencimiento, registro de salidas por áreas asistenciales (UCI, Quirófano, Emergencia) y auditorías sistemáticas de relevo de guardia.',
    techStack: ['Monitoreo de stock crítico en tiempo real', 'Semáforo de vencimiento de lotes', 'Trazabilidad de salidas por área médica', 'Auditorías de turnos y relevo de guardia', 'Gestión de solicitudes de reposición', 'Exportación de reportes analíticos'],
    metrics: {
      'Seguridad asistencial': 'Alertas de stock crítico',
      'Trazabilidad': 'Lotes y fechas de caducidad',
      'Despacho médico': 'UCI, Emergencias, Quirófano',
      'Control operativo': 'Auditorías de guardia'
    },
    keyFeatures: [
      'Monitorea el inventario de medicamentos e insumos médicos con alertas visuales inmediatas cuando un producto llega a su umbral crítico.',
      'Control riguroso de fechas de caducidad y números de lote para evitar pérdidas y garantizar la seguridad farmacológica de los pacientes.',
      'Registro instantáneo de movimientos y salidas vinculados al área médica de destino (UCI, Quirófano, Consultorios) y responsable de turno.',
      'Auditoría y cierre de relevo de guardia sistematizado para un traspaso de turno transparente y sin discrepancias en stock.'
    ]
  },
  finanzas: {
    id: 'finanzas',
    title: 'FinControl — Dashboard Financiero Profesional & Gestión Patrimonial',
    shortName: 'FinControl Finanzas',
    category: 'Finanzas & Analítica Patrimonial',
    icon: 'ph-currency-dollar',
    badge: '100% Autónomo',
    directUrl: 'Finanzas/index.html',
    serverUrl: 'http://localhost:6520',
    currentMode: 'direct',
    port: 6520,
    requiresServer: false,
    description: 'Sistema integral de analítica financiera y control patrimonial con cálculo automático del Estado de Situación Financiera (ESF), Estado de Flujo de Efectivo (EFE), 9 indicadores ejecutivos en tiempo real, matriz de presupuesto vs. real con semáforos, 6 ratios de salud financiera y exportación oficial a Excel multihoja.',
    techStack: ['Visualizaciones dinámicas ApexCharts', 'Exportación oficial multihoja a Excel', 'Balances ESF (Activos vs. Pasivos)', 'Flujo de Efectivo EFE transaccional', '6 Ratios de salud financiera', 'Matriz presupuestaria con semáforos de variación'],
    metrics: {
      'Control Patrimonial': 'ESF & Valor Neto Real',
      'Flujo de Caja': 'EFE Transaccional',
      'Salud Financiera': '6 Ratios con Metas',
      'Presupuesto': 'Variaciones vs. Real'
    },
    keyFeatures: [
      'Consolida en tiempo real todo lo que posee vs. todo lo que debe, calculando automáticamente su valor neto patrimonial.',
      'Registro y categorización ágil de cada ingreso y egreso con impacto inmediato en el Estado de Flujo de Efectivo.',
      'Monitoreo gráfico de 6 ratios esenciales de liquidez, apalancamiento y ahorro con alertas automáticas de desviación.',
      'Matriz desplegable [+] / [-] que compara presupuesto vs. ejecución real mensual para tomar decisiones correctivas oportunas.'
    ]
  }
};

let currentProject = 'ventas';
let currentDevice = 'desktop';

// Elementos DOM
const iframe = document.getElementById('sandboxFrame');
const sandboxWrapper = document.getElementById('sandboxWrapper');
const urlDisplay = document.getElementById('urlDisplay');
const serverAlert = document.getElementById('serverAlert');
const serverAlertText = document.getElementById('serverAlertText');
const loadingIndicator = document.getElementById('loadingIndicator');
const modalOverlay = document.getElementById('techModal');
const modalContent = document.getElementById('modalDetails');

let loadingTimer = null;

function hideLoading() {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  if (loadingIndicator) {
    loadingIndicator.style.opacity = '0';
    setTimeout(() => {
      if (loadingIndicator.style.opacity === '0') {
        loadingIndicator.style.display = 'none';
      }
    }, 300);
  }
}

function showLoading() {
  if (loadingTimer) clearTimeout(loadingTimer);
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
    requestAnimationFrame(() => {
      loadingIndicator.style.opacity = '1';
    });
  }
  // Garantía de seguridad: nunca dejar la pantalla bloqueada más de 1.2s
  loadingTimer = setTimeout(hideLoading, 1200);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar en VentasPro si existe el visor sandbox
  if (iframe) {
    selectProject('ventas', false);
  }

  // Escuchar fin de carga de iframe
  if (iframe) {
    iframe.addEventListener('load', () => {
      hideLoading();
    });
    try {
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        hideLoading();
      }
    } catch (e) {
      hideLoading();
    }
  }

  // Verificar estado del servidor de predicción
  checkPredictionServer();

  // Inicializar ScrollSpy en barra de navegación
  initNavScrollSpy();
});

// ScrollSpy e indicador activo en la barra de navegación
function initNavScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = Array.from(navLinks).map(link => {
    const id = link.getAttribute('href').substring(1);
    return document.getElementById(id);
  }).filter(Boolean);

  function setActiveLink(targetId) {
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isMatch = href === '#' + targetId;
      link.classList.toggle('active', isMatch);
    });
  }

  // Clic suave y activación inmediata
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
        setActiveLink(targetId);
      }
    });
  });

  // Detección automática al desplazarse
  function onScroll() {
    const scrollPos = window.scrollY + 200;
    let currentId = '';

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = sec.id;
        break;
      }
    }

    // Si el usuario llega al final de la página, activar el último elemento (Contacto)
    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 80)) {
      if (sections.length > 0) {
        currentId = sections[sections.length - 1].id;
      }
    }

    if (currentId) {
      setActiveLink(currentId);
    } else if (window.scrollY < 200) {
      navLinks.forEach(link => link.classList.remove('active'));
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Selección y cambio de proyecto
function selectProject(projectId, scrollIntoView = true) {
  if (!PROJECTS[projectId]) return;
  currentProject = projectId;
  const project = PROJECTS[projectId];

  // Actualizar pestañas activas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.project === projectId);
  });

  // Determinar URL de carga
  let targetUrl = project.directUrl;
  if (projectId === 'prediccion' && project.currentMode === 'server') {
    targetUrl = project.serverUrl;
  }

  // Mostrar indicador de carga con protección anti-bloqueo
  showLoading();

  // Asignar URL al iframe
  if (iframe) {
    iframe.src = targetUrl;
  }

  // Actualizar display de URL con protocolo seguro, dominio y clave dinámica al costado derecho
  if (urlDisplay) {
    const origin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
      ? window.location.origin
      : 'https://portafoliodev-alpha.vercel.app';
    const hashSeed = (projectId.length * 7919 + 104729).toString(16);
    const dynamicKey = `sec_${hashSeed}_${projectId}`;
    urlDisplay.innerHTML = `<span style="color:#cbd5e1;">${origin}/${targetUrl}</span><span style="color:#38bdf8;font-weight:600;">?auth_key=${dynamicKey}&amp;ssl=1</span>`;
  }

  // Ajustar alerta de servidor
  updateServerStatusIndicator();

  if (scrollIntoView) {
    const sandboxSection = document.getElementById('sandbox');
    if (sandboxSection) {
      sandboxSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// En modo nube (Vercel) ACTG se sirve directamente como HTML estático
// No se intenta conexión a localhost — siempre modo directo
function checkPredictionServer() {
  PROJECTS.prediccion.currentMode = 'direct';
  updateServerStatusIndicator();
}

function updateServerStatusIndicator() {
  if (!serverAlert || !serverAlertText) return;

  if (currentProject === 'prediccion') {
    if (PROJECTS.prediccion.currentMode === 'server') {
      serverAlert.className = 'server-alert visible';
      serverAlert.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      serverAlert.style.background = 'rgba(16, 185, 129, 0.15)';
      serverAlert.style.color = '#34d399';
      serverAlertText.innerHTML = '⚡ Servidor Node/Express (Puerto 3500) Conectado y Operativo';
    } else {
      serverAlert.className = 'server-alert visible';
      serverAlert.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      serverAlert.style.background = 'rgba(245, 158, 11, 0.15)';
      serverAlert.style.color = '#fbbf24';
      serverAlertText.innerHTML = 'ℹ️ Modo Vista Directa Activo — Acceso completo sin servidor local requerido';
    }
  } else {
    serverAlert.className = 'server-alert visible';
    serverAlert.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    serverAlert.style.background = 'rgba(59, 130, 246, 0.15)';
    serverAlert.style.color = '#60a5fa';
    serverAlertText.innerHTML = '✓ Frontend Autónomo Reactivo — Ejecución Instantánea en Navegador';
  }
}

let isLandscape = false;

// Selector de vista de dispositivo (Desktop, Laptop, Tablet, Mobile)
function setDeviceMode(mode) {
  currentDevice = mode;
  isLandscape = false;
  document.querySelectorAll('.device-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.device === mode);
  });

  if (sandboxWrapper) {
    sandboxWrapper.className = `sandbox-viewport-wrapper ${mode}`;
  }

  updateResolutionBadge();
}

// Alternar orientación vertical / horizontal en modo móvil o tablet
function toggleOrientation() {
  if (currentDevice !== 'mobile' && currentDevice !== 'tablet') return;
  isLandscape = !isLandscape;

  if (sandboxWrapper) {
    sandboxWrapper.classList.toggle('landscape', isLandscape);
  }

  updateResolutionBadge();
}

function updateResolutionBadge() {
  const badge = document.getElementById('resolutionBadge');
  if (!badge) return;

  const resMap = {
    desktop: '100% (Fluido)',
    laptop: '1280 × 800 px',
    tablet: isLandscape ? '1024 × 768 px (Horiz.)' : '768 × 1024 px (Vert.)',
    mobile: isLandscape ? '844 × 390 px (Horiz.)' : '390 × 844 px (Vert.)'
  };

  badge.textContent = resMap[currentDevice] || 'Auto';
}

// Recargar el iframe
function reloadSandbox() {
  if (iframe) {
    showLoading();
    iframe.src = iframe.src;
  }
}

// Abrir en pestaña nueva independiente
function openInNewTab() {
  const project = PROJECTS[currentProject];
  let targetUrl = project.directUrl;
  if (currentProject === 'prediccion' && project.currentMode === 'server') {
    targetUrl = project.serverUrl;
  }
  window.open(targetUrl, '_blank');
}

// Pantalla completa en el visor
function toggleFullscreen() {
  const container = document.getElementById('sandboxContainer');
  if (!container) return;

  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      console.warn(`Error al intentar pantalla completa: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

// Sanitizador para evitar inyecciones y XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Modal de Solicitud de Cotización & Diagnóstico de Datos (Efecto Consultor)
function openCotizacionModal(selectedScope = 'Consultoría y Diagnóstico de Flujo de Datos') {
  if (!modalContent || !modalOverlay) return;

  // Limpieza previa de memoria de sesión
  try { sessionStorage.clear(); } catch (_) {}

  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-badge"><i class="ph-bold ph-chats-circle"></i> Diagnóstico &amp; Cotización</div>
      <h2 class="modal-title">Cuéntenos sobre su Proyecto</h2>
    </div>

    <p style="color:var(--text-secondary); margin-bottom:1.5rem; line-height:1.6; font-size:0.92rem;">
      Indíquenos brevemente cómo maneja sus datos hoy y qué área le gustaría visualizar. Le responderemos directamente con una propuesta técnica clara y su cotización a medida.
    </p>

    <form class="proto-form" id="cotiForm" autocomplete="off" onsubmit="submitCotizacionForm(event)">
      <div class="form-group">
        <label>Su Nombre o Negocio</label>
        <input type="text" id="cotiNombre" class="form-control" placeholder="Ej. Carlos M. / Mi Negocio" autocomplete="off" spellcheck="false" required />
      </div>

      <div class="form-group">
        <label>Modalidad de Dashboard de Interés</label>
        <select id="cotiAlcance" class="form-control">
          <option value="Dashboard Versión Nube (Servidor 24/7 &amp; Base de Datos)" ${selectedScope.includes('Nube') || selectedScope.includes('Empresarial') || selectedScope.includes('Servidor') ? 'selected' : ''}>Dashboard Versión Nube (Servidor 24/7 &amp; Base de Datos)</option>
          <option value="Dashboard Versión Local (PC / Red Interna con Instalador)" ${selectedScope.includes('Local') ? 'selected' : ''}>Dashboard Versión Local (PC con Instalador)</option>
          <option value="Deseo orientación sobre cuál modalidad me conviene" ${selectedScope.includes('Diagnóstico') || selectedScope.includes('Estratégico') ? 'selected' : ''}>Deseo orientación sobre cuál modalidad me conviene</option>
        </select>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
        <div class="form-group">
          <label>¿Cómo maneja sus datos hoy?</label>
          <select id="cotiDatos" class="form-control">
            <option value="Planillas en Excel o archivos CSV">Planillas en Excel o CSV</option>
            <option value="Google Sheets compartido">Google Sheets compartido</option>
            <option value="Inicio desde cero (organizar nuevo sistema)">Inicio desde cero (organizar datos)</option>
            <option value="Base de datos propia">Base de datos propia</option>
          </select>
        </div>

        <div class="form-group">
          <label>Área o Flujo a Supervisar</label>
          <select id="cotiArea" class="form-control">
            <option value="Ventas, Pedidos y Facturación">Ventas, Pedidos y Facturación</option>
            <option value="Inventario y Control de Stock">Inventario y Control de Stock</option>
            <option value="Finanzas, Caja y Cobranzas">Finanzas, Caja y Cobranzas</option>
            <option value="Operaciones y Rendimiento del Negocio">Operaciones y Rendimiento</option>
            <option value="Otro flujo / A definir en la asesoría">Otro flujo / A definir en la asesoría</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>WhatsApp o Teléfono de Contacto</label>
        <input type="text" id="cotiTelefono" class="form-control" placeholder="Ej. +51 999 888 777" autocomplete="off" spellcheck="false" required />
        <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:0.35rem;">
          <i class="ph-bold ph-shield-check" style="color:#34d399;"></i> Solo lo usaremos para responder a su consulta y coordinar la propuesta.
        </span>
      </div>

      <div class="form-group">
        <label>Detalle o requerimiento especial (Opcional)</label>
        <input type="text" id="cotiDetalle" class="form-control" placeholder="Ej. Requiero ver alertas de stock bajo y exportar a Excel semanalmente" autocomplete="off" spellcheck="false" />
      </div>

      <div style="margin-top:1.5rem; display:flex; gap:1rem; flex-wrap:wrap;">
        <button type="submit" class="btn btn-primary" style="flex:2;">
          <i class="ph-bold ph-paper-plane-tilt"></i> Solicitar Diagnóstico y Cotización
        </button>
        <button type="button" class="btn btn-secondary" onclick="closeTechModal()" style="flex:1;">
          Cerrar
        </button>
      </div>
    </form>
  `;

  _openModal();
}

// Alias de retrocompatibilidad
window.openPrototipoModal = openCotizacionModal;
window.openCotizacionModal = openCotizacionModal;

function submitCotizacionForm(e) {
  e.preventDefault();
  const nombreInput = document.getElementById('cotiNombre');
  const alcanceInput = document.getElementById('cotiAlcance');
  const datosInput = document.getElementById('cotiDatos');
  const areaInput = document.getElementById('cotiArea');
  const telInput = document.getElementById('cotiTelefono');
  const detalleInput = document.getElementById('cotiDetalle');

  const nombre = nombreInput ? nombreInput.value.trim() : 'Cliente';
  const alcance = alcanceInput ? alcanceInput.value : '';
  const datos = datosInput ? datosInput.value : '';
  const area = areaInput ? areaInput.value : '';
  const tel = telInput ? telInput.value.trim() : '';
  const detalle = detalleInput ? detalleInput.value.trim() : '';

  // Purga inmediata de campos del formulario en el DOM
  const form = document.getElementById('cotiForm');
  if (form) form.reset();

  let msgText = `¡Hola! Me comunico desde su portafolio para solicitar un Diagnóstico y Cotización:
• Nombre / Negocio: ${nombre}
• Modalidad de interés: ${alcance}
• Origen de datos: ${datos}
• Área a supervisar: ${area}`;

  if (tel) msgText += `\n• WhatsApp / Teléfono: ${tel}`;
  if (detalle) msgText += `\n• Requerimiento especial: ${detalle}`;

  const msg = encodeURIComponent(msgText);
  const safeNombre = escapeHtml(nombre);
  
  modalContent.innerHTML = `
    <div style="text-align:center; padding:2rem 1rem;">
      <div style="font-size:3.5rem; color:#34d399; margin-bottom:1rem;">
        <i class="ph-fill ph-check-circle"></i>
      </div>
      <h2 style="font-size:1.5rem; font-weight:800; margin-bottom:0.75rem;">¡Listo, ${safeNombre}!</h2>
      <p style="color:var(--text-secondary); max-width:520px; margin:0 auto 1.5rem; line-height:1.6; font-size:0.95rem;">
        Hemos preparado el resumen de su solicitud. Haga clic en el botón inferior para abrir la conversación en WhatsApp y coordinar su propuesta:
      </p>

      <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
        <a href="https://api.whatsapp.com/send?text=${msg}" target="_blank" onclick="wipeAndCloseModal()" class="btn btn-primary" style="background:#25D366; border-color:#25D366; padding:0.85rem 1.75rem; font-size:1rem; box-shadow: 0 4px 15px rgba(37,211,102,0.35);">
          <i class="ph-bold ph-whatsapp-logo"></i> Abrir Chat en WhatsApp Ahora
        </a>
        <button class="btn btn-secondary" onclick="closeTechModal()">
          Cerrar
        </button>
      </div>
    </div>
  `;
}

// Limpiar y purgar memoria al pulsar WhatsApp
function wipeAndCloseModal() {
  setTimeout(() => {
    closeTechModal();
  }, 400);
}

// Alias de retrocompatibilidad para formularios antiguos
function submitPrototipoForm(e) {
  submitCotizacionForm(e);
}

// Modal de Ficha Técnica
function openTechModal(projectId) {
  const project = PROJECTS[projectId];
  if (!project || !modalContent || !modalOverlay) return;

  let metricsHtml = Object.entries(project.metrics)
    .map(([key, val]) => `
      <div class="spec-box">
        <div class="spec-label">${escapeHtml(key)}</div>
        <div class="spec-value">${escapeHtml(val)}</div>
      </div>
    `).join('');

  let chipsHtml = project.techStack
    .map(t => `<span class="chip">${escapeHtml(t)}</span>`).join(' ');

  let bulletsHtml = project.keyFeatures
    .map(f => `<li><i class="ph-fill ph-check-circle"></i> <span>${escapeHtml(f)}</span></li>`).join('');

  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-badge">${escapeHtml(project.category)} &middot; Versión Demo de Prueba</div>
      <h2 class="modal-title">${escapeHtml(project.title)}</h2>
    </div>

    <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:0.6rem 0.9rem; margin-bottom:1.25rem; font-size:0.85rem; color:#94a3b8; display:flex; align-items:center; gap:0.5rem;">
      <i class="ph-bold ph-info" style="color:#38bdf8; font-size:1.1rem; flex-shrink:0;"></i>
      <span><strong>Versión de Prueba:</strong> Al interactuar con este dashboard demo, estará operando una versión de prueba con datos simulados para auditar fluidez, diseño y filtros en tiempo real.</span>
    </div>

    <p style="color:var(--text-secondary); margin-bottom:1.5rem; line-height:1.6;">
      ${escapeHtml(project.description)}
    </p>

    <h4 style="font-size:0.95rem; margin-bottom:0.75rem; color:#38bdf8;">✅ Lo que obtendrá con este sistema</h4>
    <div class="spec-grid">
      ${metricsHtml}
    </div>

    <h4 style="font-size:0.95rem; margin-top:1.5rem; margin-bottom:0.75rem; color:#38bdf8;">📊 Herramientas disponibles para su equipo</h4>
    <div class="feature-chips" style="margin-bottom:1.5rem;">
      ${chipsHtml}
    </div>

    <h4 style="font-size:0.95rem; margin-top:1.5rem; margin-bottom:0.75rem; color:#38bdf8;">🎯 ¿Cómo transforma su información?</h4>
    <ul class="spec-bullets">
      ${bulletsHtml}
    </ul>

    <div style="margin-top:2rem; display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
      <button class="btn btn-primary" onclick="closeTechModal(); selectProject('${project.id}', true);">
        <i class="ph ph-play-circle"></i> Interactuar en Vivo
      </button>
      <button class="btn btn-secondary" onclick="window.open('${project.directUrl}', '_blank')">
        <i class="ph ph-arrow-square-out"></i> Abrir en Pestaña Independiente
      </button>
      <button class="btn" onclick="closeTechModal(); openCotizacionModal('${project.title}');" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.35);">
        <i class="ph-bold ph-chats-circle"></i> Cotizar un Sistema Similar
      </button>
    </div>
  `;

  _openModal();
}

function closeTechModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove('open');
    // Purgar inmediatamente el contenido del DOM para que no persista nada en memoria
    if (modalContent) {
      modalContent.innerHTML = '';
    }
  }
  // Purgar cualquier dato residual en sessionStorage
  try { sessionStorage.clear(); } catch (_) {}

  // Unlock body scroll without layout shift
  document.documentElement.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('padding-right');
  if (sandboxWrapper) sandboxWrapper.style.removeProperty('padding-right');
}

// Helper to open overlay with scroll lock
function _openModal() {
  // Measure scrollbar before locking to prevent layout shift
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    document.documentElement.style.paddingRight = scrollbarWidth + 'px';
    // Also compensate the sandbox wrapper if visible
    if (sandboxWrapper) sandboxWrapper.style.paddingRight = scrollbarWidth + 'px';
  }
  modalOverlay.classList.add('open');
}

// Cerrar modal al hacer clic en el backdrop
window.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeTechModal();
  }
});
