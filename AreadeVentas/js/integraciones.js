/* ============================================================
   INTEGRACIONES — Panel central de Excel, Google Sheets y Compartir
   ============================================================ */
'use strict';

(function () {

  /* ── HTML principal ─────────────────────────────────────────── */
  function buildHTML() {
    return `
<div class="page-header">
  <div>
    <h1 class="page-title">Integraciones & Datos</h1>
    <p class="page-subtitle">Excel · Google Sheets · Usuarios · Compartir</p>
  </div>
</div>

<div class="tabs" id="integ-tabs">
  <button class="tab-btn active" data-tab="excel">
    <i class="ph-fill ph-file-xls" style="color:var(--neon-green)"></i> Excel
  </button>
  <button class="tab-btn" data-tab="gsheets">
    <i class="ph-fill ph-google-logo" style="color:#4285f4"></i> Google Sheets
  </button>
  <button class="tab-btn" data-tab="users">
    <i class="ph-fill ph-users" style="color:var(--neon-purple)"></i> Usuarios
  </button>
  <button class="tab-btn" data-tab="share">
    <i class="ph-fill ph-share-network" style="color:var(--neon-orange)"></i> Compartir
  </button>
</div>

<!-- ══════ TAB: EXCEL ══════ -->
<div class="tab-panel active" id="tab-excel">
  <div class="grid-2" style="margin-bottom:20px;">

    <!-- Importar -->
    <div class="integration-card">
      <div class="integration-header">
        <div class="integration-icon" style="background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.25);color:var(--neon-green);">
          <i class="ph-fill ph-upload-simple"></i>
        </div>
        <div>
          <div class="integration-title">Importar desde Excel</div>
          <div class="integration-desc">.xlsx · .xls · .csv</div>
        </div>
      </div>

      <div class="drop-zone" id="excel-drop-zone" onclick="document.getElementById('excel-file-input').click()">
        <i class="ph-fill ph-file-xls drop-zone-icon" style="color:var(--neon-green);"></i>
        <div class="drop-zone-text">Arrastra tu archivo aquí</div>
        <div class="drop-zone-sub">o haz clic para seleccionar</div>
      </div>
      <input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv" style="display:none" />

      <div style="margin-top:12px;">
        <label class="form-label">Importar datos como</label>
        <select class="form-select" id="excel-import-entity">
          <option value="facturas">Facturas</option>
          <option value="proformas">Proformas</option>
          <option value="inventario">Inventario</option>
        </select>
      </div>
    </div>

    <!-- Exportar -->
    <div class="integration-card">
      <div class="integration-header">
        <div class="integration-icon" style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);color:var(--neon-cyan);">
          <i class="ph-fill ph-download-simple"></i>
        </div>
        <div>
          <div class="integration-title">Exportar a Excel</div>
          <div class="integration-desc">Descarga tus datos en formato .xlsx</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-secondary" onclick="excelExport('facturas')">
          <i class="ph-fill ph-receipt"></i> Exportar Facturas
        </button>
        <button class="btn btn-secondary" onclick="excelExport('proformas')">
          <i class="ph-fill ph-file-text"></i> Exportar Proformas
        </button>
        <button class="btn btn-secondary" onclick="excelExport('inventario')">
          <i class="ph-fill ph-package"></i> Exportar Inventario
        </button>
        <div class="divider"></div>
        <button class="btn btn-success" onclick="excelExportAll()">
          <i class="ph-fill ph-export"></i> Exportar TODO (multi-hoja)
        </button>
      </div>
    </div>
  </div>

  <!-- Info de uso -->
  <div class="card" style="border-color:rgba(0,255,136,0.15);background:rgba(0,255,136,0.03);">
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <i class="ph-fill ph-info" style="font-size:20px;color:var(--neon-green);flex-shrink:0;margin-top:2px;"></i>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:6px;">Formato de importación</div>
        <p style="font-size:12px;color:var(--text-2);line-height:1.7;font-family:var(--font-mono);">
          El sistema detecta automáticamente las columnas. Para <b style="color:var(--neon-cyan)">Facturas</b>: 
          NUMERO, CLIENTE, FECHA, ESTADO, MONEDA, TOTAL. Para <b style="color:var(--neon-cyan)">Inventario</b>: 
          CODIGO, NOMBRE, CATEGORIA, STOCK, PRECIO_VENTA. Puedes exportar primero para ver el formato exacto.
        </p>
      </div>
    </div>
  </div>
</div>

<!-- ══════ TAB: GOOGLE SHEETS ══════ -->
<div class="tab-panel" id="tab-gsheets">
  <div class="integration-card" style="margin-bottom:20px;">
    <div class="integration-header">
      <div class="integration-icon" style="background:rgba(66,133,244,0.1);border:1px solid rgba(66,133,244,0.25);color:#4285f4;">
        <i class="ph-fill ph-google-logo"></i>
      </div>
      <div>
        <div class="integration-title">Google Sheets</div>
        <div class="integration-desc">Sincronización bidireccional con Google Sheets API v4</div>
      </div>
    </div>

    <div id="gs-status-panel"></div>
  </div>

  <div class="card" style="border-color:rgba(66,133,244,0.15);background:rgba(66,133,244,0.03);">
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <i class="ph-fill ph-info" style="font-size:20px;color:#4285f4;flex-shrink:0;margin-top:2px;"></i>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:6px;">Cómo configurar Google Sheets</div>
        <ol style="font-size:12px;color:var(--text-2);line-height:1.9;font-family:var(--font-mono);padding-left:16px;">
          <li>Visita <a href="https://console.cloud.google.com" target="_blank" style="color:var(--neon-cyan)">console.cloud.google.com</a></li>
          <li>Crea un proyecto nuevo → Habilita <b style="color:var(--neon-cyan)">Google Sheets API</b></li>
          <li>Credenciales → Crear → <b>ID de cliente OAuth 2.0</b> → Tipo: App Web</li>
          <li>URI autorizado: <span style="color:var(--neon-yellow)">http://localhost:4800</span></li>
          <li>Haz clic en "Conectar con Google" e ingresa tu Client ID</li>
        </ol>
      </div>
    </div>
  </div>
</div>

<!-- ══════ TAB: USUARIOS ══════ -->
<div class="tab-panel" id="tab-users">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
    <div>
      <div style="font-size:15px;font-weight:700;color:var(--text-1);">Perfiles de Usuario</div>
      <div class="mono-text" style="font-size:11px;color:var(--text-3);margin-top:2px;">Máximo 10 perfiles con PIN opcional</div>
    </div>
  </div>
  <div id="users-panel"></div>
</div>

<!-- ══════ TAB: COMPARTIR ══════ -->
<div class="tab-panel" id="tab-share">
  <div class="grid-2">

    <!-- Backup archivo -->
    <div class="integration-card">
      <div class="integration-header">
        <div class="integration-icon" style="background:rgba(255,107,43,0.1);border:1px solid rgba(255,107,43,0.25);color:var(--neon-orange);">
          <i class="ph-fill ph-file-arrow-down"></i>
        </div>
        <div>
          <div class="integration-title">Backup / Restore</div>
          <div class="integration-desc">Exportar e importar snapshot completo</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-warning" onclick="shareExportFile()">
          <i class="ph-fill ph-file-arrow-down"></i> Exportar backup (.vpdata)
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('vpdata-input').click()">
          <i class="ph-fill ph-file-arrow-up"></i> Importar backup (.vpdata)
        </button>
        <input type="file" id="vpdata-input" accept=".vpdata,.json" style="display:none" />
      </div>
    </div>

    <!-- Compartir enlace -->
    <div class="integration-card">
      <div class="integration-header">
        <div class="integration-icon" style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.25);color:var(--neon-purple);">
          <i class="ph-fill ph-share-network"></i>
        </div>
        <div>
          <div class="integration-title">Compartir por Enlace</div>
          <div class="integration-desc">Genera un enlace de acceso (ngrok requerido)</div>
        </div>
      </div>

      <button class="btn btn-purple" onclick="shareGenerateLink()">
        <i class="ph-fill ph-link"></i> Generar enlace
      </button>
      <div id="share-link-display" style="margin-top:14px;"></div>
    </div>
  </div>
</div>
`;
  }

  /* ── Init tabs ──────────────────────────────────────────────── */
  function initTabs(container) {
    const buttons = container.querySelectorAll('.tab-btn');
    const panels  = container.querySelectorAll('.tab-panel');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById(`tab-${btn.dataset.tab}`);
        if (panel) panel.classList.add('active');
        /* Render dinámico según tab */
        if (btn.dataset.tab === 'gsheets')  renderGSheetsStatus();
        if (btn.dataset.tab === 'users')    renderUsersPanel();
      });
    });
  }

  /* ── Init drag & drop Excel ─────────────────────────────────── */
  function initExcelDrop() {
    const zone  = document.getElementById('excel-drop-zone');
    const input = document.getElementById('excel-file-input');
    if (!zone || !input) return;

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) processExcelFile(file);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) processExcelFile(input.files[0]);
    });
  }

  function processExcelFile(file) {
    const entitySel = document.getElementById('excel-import-entity');
    const entity    = entitySel ? entitySel.value : 'facturas';
    const zone      = document.getElementById('excel-drop-zone');
    if (zone) zone.innerHTML = `<div class="tech-spinner" style="width:28px;height:28px;border-width:2px;"></div><div style="margin-top:12px;font-size:12px;color:var(--neon-cyan);font-family:var(--font-mono);">Leyendo ${file.name}…</div>`;
    excelImport(file, entity, (rows, sheetNames) => {
      showExcelPreviewModal(rows, sheetNames, entity);
      /* Restaurar drop zone */
      if (zone) zone.innerHTML = `<i class="ph-fill ph-file-xls drop-zone-icon" style="color:var(--neon-green);font-size:36px;display:block;margin-bottom:12px;"></i><div class="drop-zone-text">${file.name}</div><div class="drop-zone-sub">${rows.length} filas encontradas</div>`;
    });
  }

  /* ── Init vpdata import ─────────────────────────────────────── */
  function initVpDataImport() {
    const input = document.getElementById('vpdata-input');
    if (!input) return;
    input.addEventListener('change', () => {
      if (input.files[0]) shareImportFile(input.files[0]);
    });
  }

  /* ── Render ─────────────────────────────────────────────────── */
  window.renderIntegraciones = function () {
    const mc = document.getElementById('main-content');
    if (!mc) return;
    mc.innerHTML = buildHTML();
    initTabs(mc);
    initExcelDrop();
    initVpDataImport();
    /* Render estado inicial de Google Sheets */
    if (typeof renderGSheetsStatus === 'function') renderGSheetsStatus();
    /* Render usuarios */
    if (typeof renderUsersPanel === 'function') renderUsersPanel();
  };

})();
