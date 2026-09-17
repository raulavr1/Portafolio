/**
 * portal.js — Controlador del Portal Maestro y Visor Sandbox Interactivo
 */

// Configuración de proyectos
const PROJECTS = {
  ventas: {
    id: 'ventas',
    title: 'VentasPro — Dashboard Tecnológico de Área de Ventas',
    shortName: 'VentasPro Suite',
    category: 'Business Intelligence & Ventas',
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

// Modal de Solicitud de Prototipo Gratuito / Plan
function openPrototipoModal(selectedPlan = 'Dashboard Compartido (S/. 440)') {
  if (!modalContent || !modalOverlay) return;

  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-badge">Fase 1: Diagnóstico &amp; Prototipo</div>
      <h2 class="modal-title">Solicitar Prototipo Gratuito de Dashboard</h2>
    </div>

    <p style="color:var(--text-secondary); margin-bottom:1.5rem; line-height:1.6;">
      Inicie la transformación digital de sus datos sin compromiso financiero. Evaluamos sus KPIs esenciales y construimos un prototipo interactivo adaptado a sus planillas Excel (.xlsx, .csv) o Google Sheets.
    </p>

    <div class="guarantee-strip" style="margin-top:0; margin-bottom:1.5rem;">
      <i class="ph-bold ph-shield-check guarantee-icon"></i>
      <div class="guarantee-text">
        <strong>Confidencialidad Garantizada:</strong> Sus datos están 100% protegidos bajo acuerdo estricto de privacidad empresarial.
      </div>
    </div>

    <form class="proto-form" onsubmit="submitPrototipoForm(event)">
      <div class="form-group">
        <label>Nombre de la Empresa o Proyecto</label>
        <input type="text" id="protoEmpresa" class="form-control" placeholder="Ej. Corporación Comercial SAC" required />
      </div>

      <div class="form-group">
        <label>Plan de Interés</label>
        <select id="protoPlan" class="form-control">
          <option value="Dashboard Local (S/. 220)" ${selectedPlan.includes('220') ? 'selected' : ''}>Dashboard Local — S/. 220 (Despliegue en PC, 1 Clic)</option>
          <option value="Dashboard Compartido (S/. 440)" ${selectedPlan.includes('440') ? 'selected' : ''}>Dashboard Compartido — S/. 440 (Red Local + Responsive)</option>
          <option value="Dashboard Profesional (S/. 880)" ${selectedPlan.includes('880') ? 'selected' : ''}>Dashboard Profesional — S/. 880 (Cloud 24/7 + Roles)</option>
        </select>
      </div>

      <div class="form-group">
        <label>Teléfono / WhatsApp de Contacto</label>
        <input type="text" id="protoTelefono" class="form-control" placeholder="Ej. +51 999 888 777" required />
      </div>

      <div class="form-group">
        <label>Correo Electrónico para Permisos y Enlace Temporal</label>
        <input type="email" id="protoCorreo" class="form-control" placeholder="gerencia@empresa.com" required />
      </div>

      <div style="margin-top:1.5rem; display:flex; gap:1rem; flex-wrap:wrap;">
        <button type="submit" class="btn btn-primary" style="flex:2;">
          <i class="ph-bold ph-paper-plane-tilt"></i> Enviar Solicitud de Prototipo Gratuito
        </button>
        <button type="button" class="btn btn-secondary" onclick="closeTechModal()" style="flex:1;">
          Cerrar
        </button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('open');
}

function submitPrototipoForm(e) {
  e.preventDefault();
  const empresa = document.getElementById('protoEmpresa').value;
  const plan = document.getElementById('protoPlan').value;
  const tel = document.getElementById('protoTelefono').value;
  const email = document.getElementById('protoCorreo').value;

  const msg = encodeURIComponent(`Hola! Deseo solicitar el Diagnóstico y Prototipo Gratuito para mi empresa "${empresa}".\nPlan de interés: ${plan}.\nContacto: ${tel} | ${email}`);
  
  modalContent.innerHTML = `
    <div style="text-align:center; padding:2rem 1rem;">
      <div style="font-size:3.5rem; color:#34d399; margin-bottom:1rem;">
        <i class="ph-fill ph-check-circle"></i>
      </div>
      <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:0.75rem;">¡Solicitud Registrada con Éxito!</h2>
      <p style="color:var(--text-secondary); max-width:520px; margin:0 auto 1.5rem; line-height:1.6;">
        Nos pondremos en contacto a la brevedad para coordinar la sesión de diagnóstico inicial vía Google Meet o llamada. También puedes contactar directamente a través del enlace inferior:
      </p>

      <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
        <a href="https://api.whatsapp.com/send?text=${msg}" target="_blank" class="btn btn-primary" style="padding:0.75rem 1.5rem;">
          <i class="ph-bold ph-whatsapp-logo"></i> Confirmar vía WhatsApp
        </a>
        <button class="btn btn-secondary" onclick="closeTechModal()">
          Volver al Portal
        </button>
      </div>
    </div>
  `;
}


// Modal de Ficha Técnica
function openTechModal(projectId) {
  const project = PROJECTS[projectId];
  if (!project || !modalContent || !modalOverlay) return;

  let metricsHtml = Object.entries(project.metrics)
    .map(([key, val]) => `
      <div class="spec-box">
        <div class="spec-label">${key}</div>
        <div class="spec-value">${val}</div>
      </div>
    `).join('');

  let chipsHtml = project.techStack
    .map(t => `<span class="chip">${t}</span>`).join(' ');

  let bulletsHtml = project.keyFeatures
    .map(f => `<li><i class="ph-fill ph-check-circle"></i> <span>${f}</span></li>`).join('');

  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-badge">${project.category}</div>
      <h2 class="modal-title">${project.title}</h2>
    </div>

    <p style="color:var(--text-secondary); margin-bottom:1.5rem; line-height:1.6;">
      ${project.description}
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

    <div style="margin-top:2rem; display:flex; gap:1rem; flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="closeTechModal(); selectProject('${project.id}', true);">
        <i class="ph ph-play-circle"></i> Interactuar en Vivo
      </button>
      <button class="btn btn-secondary" onclick="window.open('${project.directUrl}', '_blank')">
        <i class="ph ph-arrow-square-out"></i> Abrir en Pestaña Independiente
      </button>
    </div>
  `;

  modalOverlay.classList.add('open');
}

function closeTechModal() {
  if (modalOverlay) modalOverlay.classList.remove('open');
}

// Cerrar modal al hacer clic en el backdrop
window.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeTechModal();
  }
});
