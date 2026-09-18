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
  // Inicializar en VentasPro
  selectProject('ventas', false);

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
});

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

  // Actualizar display de URL
  if (urlDisplay) {
    urlDisplay.textContent = targetUrl;
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
      <div class="modal-badge">Desarrollo Profesional &amp; Consultoría</div>
      <h2 class="modal-title">Solicitar Diagnóstico de Datos y Cotización a Medida</h2>
    </div>

    <p style="color:var(--text-secondary); margin-bottom:1.5rem; line-height:1.6;">
      Inicie la optimización de sus operaciones sin compromiso financiero previo. Evaluamos sus flujos de trabajo actuales, planillas Excel o Google Sheets, identificamos cuántas horas semanales puede ahorrar su equipo y le entregamos una propuesta personalizada.
    </p>

    <div class="guarantee-strip" style="margin-top:0; margin-bottom:1.5rem;">
      <i class="ph-bold ph-shield-check guarantee-icon"></i>
      <div class="guarantee-text">
        <strong>Datos 100% Temporales &amp; Confidenciales:</strong> La información ingresada en este formulario no se almacena en ningún servidor, cookie ni base de datos de esta web. Se procesa de forma efímera en su navegador y se transfiere de inmediato a su conversación privada de WhatsApp.
      </div>
    </div>

    <form class="proto-form" id="cotiForm" autocomplete="off" onsubmit="submitCotizacionForm(event)">
      <div class="form-group">
        <label>Nombre de su Empresa o Negocio</label>
        <input type="text" id="cotiEmpresa" class="form-control" placeholder="Ej. Inversiones &amp; Retail del Norte SAC" autocomplete="off" spellcheck="false" required />
      </div>

      <div class="form-group">
        <label>Tipo de Solución / Alcance Estimado</label>
        <select id="cotiAlcance" class="form-control">
          <option value="Consultoría y Diagnóstico de Flujo de Datos" ${selectedScope.includes('Diagnóstico') || selectedScope.includes('Consultoría') ? 'selected' : ''}>Consultoría y Diagnóstico de Flujo de Datos</option>
          <option value="Desarrollo de Dashboard Local" ${selectedScope.includes('Local') ? 'selected' : ''}>Desarrollo de Dashboard Operativo Local (Monousuario en PC)</option>
          <option value="Suite Analítica para Red Interna" ${selectedScope.includes('Multiusuario') || selectedScope.includes('Red') || selectedScope.includes('Compartido') ? 'selected' : ''}>Suite Analítica para Red Interna (Equipos &amp; Sucursales)</option>
          <option value="Desarrollo de Sistema Analítico a Medida" ${selectedScope.includes('Medida') || selectedScope.includes('Sistema') || selectedScope.includes('Profesional') ? 'selected' : ''}>Desarrollo de Sistema Analítico a Medida (Módulos &amp; Roles)</option>
        </select>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
        <div class="form-group">
          <label>Herramientas que usan hoy</label>
          <select id="cotiHerramientas" class="form-control">
            <option value="Excel manual / Hojas de cálculo">Excel manual / Hojas de cálculo</option>
            <option value="Google Sheets compartido">Google Sheets compartido</option>
            <option value="ERP básico / Sistema cerrado">ERP básico / Sistema cerrado</option>
            <option value="Cuadernos / Múltiples formatos">Múltiples formatos dispersos</option>
          </select>
        </div>

        <div class="form-group">
          <label>Meta Principal</label>
          <select id="cotiMeta" class="form-control">
            <option value="Ahorrar horas de trabajo manual">Ahorrar horas de trabajo manual</option>
            <option value="Evitar errores en stock y facturación">Evitar errores en stock y facturación</option>
            <option value="Monitorear ventas y metas en tiempo real">Monitorear ventas y metas en tiempo real</option>
            <option value="Reportes ejecutivos para gerencia">Reportes ejecutivos para gerencia</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Teléfono / WhatsApp de Contacto</label>
        <input type="text" id="cotiTelefono" class="form-control" placeholder="Ej. +51 999 888 777" autocomplete="off" spellcheck="false" required />
      </div>

      <div class="form-group">
        <label>Correo Electrónico de Contacto</label>
        <input type="email" id="cotiCorreo" class="form-control" placeholder="gerencia@empresa.com" autocomplete="off" spellcheck="false" required />
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
  const empresaInput = document.getElementById('cotiEmpresa');
  const alcanceInput = document.getElementById('cotiAlcance');
  const herramientasInput = document.getElementById('cotiHerramientas');
  const metaInput = document.getElementById('cotiMeta');
  const telInput = document.getElementById('cotiTelefono');
  const emailInput = document.getElementById('cotiCorreo');

  const empresa = empresaInput ? empresaInput.value.trim() : '';
  const alcance = alcanceInput ? alcanceInput.value : '';
  const herramientas = herramientasInput ? herramientasInput.value : '';
  const meta = metaInput ? metaInput.value : '';
  const tel = telInput ? telInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';

  // Purga inmediata de campos del formulario en el DOM
  const form = document.getElementById('cotiForm');
  if (form) form.reset();

  const msgText = `¡Hola! Deseo solicitar un Diagnóstico de Datos y Cotización para mi negocio:
• Empresa: ${empresa}
• Alcance de interés: ${alcance}
• Sistema actual: ${herramientas}
• Objetivo principal: ${meta}
• Contacto: ${tel} | ${email}`;

  const msg = encodeURIComponent(msgText);
  const safeEmpresa = escapeHtml(empresa);
  
  modalContent.innerHTML = `
    <div style="text-align:center; padding:2rem 1rem;">
      <div style="font-size:3.5rem; color:#34d399; margin-bottom:1rem;">
        <i class="ph-fill ph-check-circle"></i>
      </div>
      <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:0.75rem;">¡Solicitud de Diagnóstico Registrada!</h2>
      <p style="color:var(--text-secondary); max-width:520px; margin:0 auto 1.5rem; line-height:1.6;">
        Hemos preparado los datos de su consulta para <strong>${safeEmpresa}</strong>. Por motivos de seguridad y privacidad, <strong>ningún dato se guarda en esta web</strong>: presione el botón inferior para enviarlos directamente a su conversación en WhatsApp:
      </p>

      <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
        <a href="https://api.whatsapp.com/send?text=${msg}" target="_blank" onclick="wipeAndCloseModal()" class="btn btn-primary" style="background:#25D366; border-color:#25D366; padding:0.85rem 1.75rem; font-size:1rem; box-shadow: 0 4px 15px rgba(37,211,102,0.35);">
          <i class="ph-bold ph-whatsapp-logo"></i> Abrir Chat en WhatsApp Ahora
        </a>
        <button class="btn btn-secondary" onclick="closeTechModal()">
          Volver al Portal
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
      <div class="modal-badge">${escapeHtml(project.category)}</div>
      <h2 class="modal-title">${escapeHtml(project.title)}</h2>
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
