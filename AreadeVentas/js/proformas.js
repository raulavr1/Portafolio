/**
 * proformas.js — Módulo de Gestión de Pedidos y Cotizaciones
 * Organizado por secciones claras:
 * 1. Alerta y Bandeja de Pedidos en Espera (atención inmediata del asesor comercial)
 * 2. Historial y Archivo General de Pedidos con filtros y búsqueda
 */
'use strict';

let proformaEditId = null;
let proformaItems  = [];

/* ── Estado de Vista (Módulos vs Tabla) ────────────────────────────────────────── */
let currentProView = 'modules';

window.setProView = function(view) {
  currentProView = view;
  const modView = document.getElementById('pro-modules-view');
  const tabView = document.getElementById('pro-table-view');
  const btnMod  = document.getElementById('btn-view-modules');
  const btnTab  = document.getElementById('btn-view-table');

  if (view === 'modules') {
    if (modView) modView.style.display = 'grid';
    if (tabView) tabView.style.display = 'none';
    if (btnMod)  btnMod.classList.add('active');
    if (btnTab)  btnTab.classList.remove('active');
  } else {
    if (modView) modView.style.display = 'none';
    if (tabView) tabView.style.display = 'block';
    if (btnMod)  btnMod.classList.remove('active');
    if (btnTab)  btnTab.classList.add('active');
  }
};

/* ── Render Principal ────────────────────────────────────────────────────────── */
function renderProformas() {
  const all = AppDB.proformas.getAll();
  const enEsperaList = all.filter(p => p.estado === 'en_espera' || p.estado === 'pendiente');

  document.getElementById('main-content').innerHTML = `
<!-- ═══════════════════════════════════════════
     HERO: GESTIÓN DE PEDIDOS
══════════════════════════════════════════════ -->
<div class="page-hero page-hero--proformas">
  <div class="page-hero-bg"></div>
  <div class="page-hero-content">
    <div class="page-hero-left">
      <div class="page-hero-icon" style="--hero-icon-color:#00d4ff;--hero-icon-bg:rgba(0,212,255,0.15);--hero-icon-border:rgba(0,212,255,0.35);">
        <i class="ph-fill ph-shopping-bag"></i>
      </div>
      <div>
        <div class="page-hero-eyebrow">Área Comercial · Asesores de Ventas</div>
        <h1 class="page-hero-title">Gestión de Pedidos</h1>
        <p class="page-hero-subtitle">
          Atención de solicitudes del catálogo en línea y cierre de ventas directas · <strong>${all.length}</strong> registros en sistema
        </p>
      </div>
    </div>
    <div class="page-hero-actions">
      <button type="button" class="btn btn-hero-primary" id="btn-nueva-proforma">
        <i class="ph ph-plus-circle"></i> Registrar Pedido Manual
      </button>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     TARJETAS RESUMEN / KPIS DE PEDIDOS
══════════════════════════════════════════════ -->
<div class="summary-totals" id="pro-summary"></div>

<!-- ═══════════════════════════════════════════
     ALERTA DE PEDIDOS EN ESPERA DE ATENCIÓN
══════════════════════════════════════════════ -->
${enEsperaList.length > 0 ? `
<div style="background:linear-gradient(135deg, rgba(255,180,0,0.16) 0%, rgba(255,42,133,0.12) 100%);border:1px solid rgba(255,180,0,0.5);border-radius:14px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 0 24px rgba(255,180,0,0.2);flex-wrap:wrap;">
  <div style="display:flex;align-items:center;gap:14px;">
    <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,180,0,0.2);color:#ffd600;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">
      <i class="ph-fill ph-bell-ringing"></i>
    </div>
    <div>
      <div style="font-size:15px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span>ALERTA COMERCIAL: ${enEsperaList.length} Pedido(s) en Espera de Atención</span>
        <span style="background:#ff2a85;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;letter-spacing:0.5px;">REQUIERE CONTACTO</span>
      </div>
      <div style="font-size:12.5px;color:#fde68a;margin-top:2px;">
        Hay solicitudes de clientes del catálogo listas para ser contactadas, verificar inventario y concretar la venta con factura electrónica.
      </div>
    </div>
  </div>
  <button type="button" class="btn btn-warning btn-sm" onclick="filtrarEnEspera()" style="font-weight:800;">
    <i class="ph ph-funnel"></i> Ver Sólo en Espera
  </button>
</div>
` : ''}

<!-- ═══════════════════════════════════════════
     BARRA DE FILTROS Y SELECTOR DE VISTA
══════════════════════════════════════════════ -->
<div class="filter-bar" style="margin-bottom:20px;">
  <input class="form-input" id="pro-search" type="search" placeholder="🔍  Buscar por cliente, teléfono, producto o número…" />
  <select class="form-select" id="pro-estado">
    <option value="">Todos los estados</option>
    <option value="en_espera">🟡 Pendiente / En Espera</option>
    <option value="concretada">🟢 Concretada</option>
    <option value="vencida">🟠 Vencida</option>
    <option value="rechazada">🔴 Rechazada</option>
  </select>
  <select class="form-select" id="pro-moneda">
    <option value="">Todas las monedas</option>
    <option value="PEN">PEN — Soles (S/)</option>
    <option value="USD">USD — Dólares ($)</option>
  </select>
  
  <!-- Switch de Vista -->
  <div class="view-mode-toggle">
    <button type="button" class="view-mode-btn ${currentProView === 'modules' ? 'active' : ''}" id="btn-view-modules" onclick="setProView('modules')" title="Ver en tarjetas modulares completas">
      <i class="ph-fill ph-squares-four"></i> Módulos
    </button>
    <button type="button" class="view-mode-btn ${currentProView === 'table' ? 'active' : ''}" id="btn-view-table" onclick="setProView('table')" title="Ver en tabla compacta">
      <i class="ph-fill ph-list"></i> Tabla
    </button>
  </div>

  <div class="filter-spacer"></div>
  <button type="button" class="btn btn-secondary btn-sm" id="btn-pro-clear">
    <i class="ph ph-x"></i> Limpiar
  </button>
</div>

<!-- ═══════════════════════════════════════════
     CONTENEDORES DE VISUALIZACIÓN
══════════════════════════════════════════════ -->
<!-- 1. VISTA MODULAR (MÓDULOS DE PEDIDO POR DEFECTO) -->
<div id="pro-modules-view" class="pedido-modules-grid" style="display:${currentProView === 'modules' ? 'grid' : 'none'};"></div>

<!-- 2. VISTA TABLA -->
<div id="pro-table-view" class="table-wrap" style="display:${currentProView === 'table' ? 'block' : 'none'};">
  <table class="data-table" id="pro-table">
    <thead>
      <tr>
        <th>Número</th>
        <th>Cliente y Teléfono</th>
        <th>Canal / Origen</th>
        <th>Fecha</th>
        <th>Vencimiento</th>
        <th class="td-right">Total</th>
        <th>Estado</th>
        <th style="text-align:right">Acciones</th>
      </tr>
    </thead>
    <tbody id="pro-tbody"></tbody>
  </table>
</div>
`;

  buildProSummary(all);
  applyProFilters();

  // Event Listeners
  document.getElementById('btn-nueva-proforma')?.addEventListener('click', () => openProformaModal());
  document.getElementById('pro-search')?.addEventListener('input', () => applyProFilters());
  document.getElementById('pro-estado')?.addEventListener('change', () => applyProFilters());
  document.getElementById('pro-moneda')?.addEventListener('change', () => applyProFilters());
  document.getElementById('btn-pro-clear')?.addEventListener('click', () => {
    document.getElementById('pro-search').value = '';
    document.getElementById('pro-estado').value = '';
    document.getElementById('pro-moneda').value = '';
    applyProFilters();
  });
}

/* ── Acceso rápido a filtro en espera ────────────────────────────────────────── */
window.filtrarEnEspera = function() {
  const sel = document.getElementById('pro-estado');
  if (sel) {
    sel.value = 'en_espera';
    applyProFilters();
  }
};

/* ── Summary KPI Cards (Diseño Modular Elegante) ──────────────────────────────── */
function buildProSummary(all) {
  const el = document.getElementById('pro-summary');
  if (!el) return;

  const enEspera   = all.filter(p => p.estado === 'en_espera' || p.estado === 'pendiente').length;
  const concretadas= all.filter(p => p.estado === 'aprobada' || p.estado === 'convertida').length;
  const vencidas   = all.filter(p => p.estado === 'vencida').length;
  const rechazadas = all.filter(p => p.estado === 'rechazada').length;
  const totalMonto = all.reduce((s, p) => s + (parseFloat(p.total) || 0), 0);

  el.innerHTML = `
    <div class="summary-card" style="--summary-color:var(--neon-cyan)">
      <div class="summary-card-label">Total Pedidos</div>
      <div class="summary-card-value">${all.length}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--warning)">
      <div class="summary-card-label">🟡 En Espera</div>
      <div class="summary-card-value">${enEspera}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--success)">
      <div class="summary-card-label">🟢 Concretadas</div>
      <div class="summary-card-value">${concretadas}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--neon-orange)">
      <div class="summary-card-label">🟠 Vencidas</div>
      <div class="summary-card-value">${vencidas}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--neon-purple)">
      <div class="summary-card-label">Monto Solicitado</div>
      <div class="summary-card-value">${fmtCurrency(totalMonto)}</div>
    </div>
  `;
}

/* ── Render de Módulos de Pedidos (Tarjetas Completas) ───────────────────────── */
function renderProModules(list) {
  const container = document.getElementById('pro-modules-view');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:50px 20px;background:rgba(255,255,255,0.02);border:1px dashed var(--border);border-radius:16px;">
        <i class="ph ph-shopping-bag" style="font-size:42px;color:var(--text-3);margin-bottom:10px;display:block;"></i>
        <h3 style="font-size:16px;color:#fff;margin-bottom:6px;">No se encontraron pedidos</h3>
        <p style="font-size:13px;color:var(--text-3);margin:0;">No hay solicitudes que coincidan con los filtros de búsqueda actuales.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(p => {
    const sym = p.moneda === 'USD' ? '$ ' : 'S/ ';
    const subtotal = parseFloat(p.subtotal || 0);
    const impuesto = parseFloat(p.impuesto || (subtotal * 0.18));
    const total = parseFloat(p.total || (subtotal + impuesto));
    const totalFmt = sym + total.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});

    const esConcretada = p.estado === 'aprobada' || p.estado === 'convertida';
    const esPendiente  = p.estado === 'en_espera' || p.estado === 'pendiente';
    const esVencida    = p.estado === 'vencida';
    const esRechazada  = p.estado === 'rechazada';

    let cardClass = '';
    let badgeEstado = '';
    if (esConcretada) {
      cardClass = 'is-concretada';
      badgeEstado = '<span class="badge" style="background:rgba(0,255,170,0.15);border:1px solid rgba(0,255,170,0.45);color:#00ffaa;font-weight:800;font-size:11.5px;padding:4px 12px;letter-spacing:0.3px;"><i class="ph-fill ph-check-circle"></i> Concretada</span>';
    } else if (esPendiente) {
      cardClass = 'is-espera';
      badgeEstado = '<span class="badge" style="background:rgba(255,214,0,0.16);border:1px solid rgba(255,214,0,0.45);color:#ffd600;font-weight:800;font-size:11.5px;padding:4px 12px;letter-spacing:0.3px;"><i class="ph-fill ph-clock"></i> 🟡 En Espera</span>';
    } else if (esVencida) {
      badgeEstado = '<span class="badge" style="background:rgba(255,115,64,0.15);border:1px solid rgba(255,115,64,0.45);color:#ff7340;font-weight:800;font-size:11.5px;padding:4px 12px;letter-spacing:0.3px;"><i class="ph-fill ph-warning"></i> 🟠 Vencida</span>';
    } else if (esRechazada) {
      badgeEstado = '<span class="badge" style="background:rgba(255,45,120,0.15);border:1px solid rgba(255,45,120,0.45);color:#ff2d78;font-weight:800;font-size:11.5px;padding:4px 12px;letter-spacing:0.3px;"><i class="ph-fill ph-x-circle"></i> 🔴 Rechazada</span>';
    }

    const items = p.items || [];
    const origenLabel = p.origen === 'catalogo'
      ? '<span class="pedido-channel-tag" style="color:#00d4ff;border-color:rgba(0,212,255,0.3);background:rgba(0,212,255,0.08);"><i class="ph-fill ph-storefront"></i> Catálogo Web</span>'
      : '<span class="pedido-channel-tag"><i class="ph-fill ph-briefcase"></i> Venta Directa</span>';

    // Botones de acción según la regla estricta:
    let actionBtn = '';
    if (esConcretada) {
      actionBtn = `
        <button type="button" class="btn btn-success-soft btn-sm" onclick="verFacturaElectronicaPedido('${p.id}')" title="Ver Factura Emitida y Baucher adjunto" style="font-weight:800;gap:6px;">
          <i class="ph-fill ph-receipt"></i> Ver Factura
        </button>`;
    } else if (esPendiente) {
      actionBtn = `
        <button type="button" class="btn btn-hero-primary btn-sm" onclick="verFacturaElectronicaPedido('${p.id}')" title="Facturar y Concretar Venta" style="font-weight:800;gap:6px;">
          <i class="ph-fill ph-receipt"></i> Factura y Concretar Venta
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-icon" onclick="rechazarPedido('${p.id}')" title="Rechazar pedido" style="color:var(--danger);">
          <i class="ph ph-x"></i>
        </button>`;
    } else {
      actionBtn = `<span style="font-size:11px;color:var(--text-3);font-family:var(--font-mono);font-style:italic;background:rgba(255,255,255,0.03);padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);">Sin factura (No concretado)</span>`;
    }

    return `
      <div class="pedido-module-card ${cardClass}" id="card-pedido-${p.id}">
        <!-- Cabecera del Módulo -->
        <div class="pedido-mod-header">
          <div class="pedido-mod-tags">
            <span class="pedido-code-badge">${p.numero}</span>
            ${origenLabel}
            <span class="pedido-date-tag"><i class="ph ph-calendar"></i> ${p.fecha}${p.hora ? ' · ' + p.hora : ''}</span>
          </div>
          <div>${badgeEstado}</div>
        </div>

        <!-- Módulo 1: Identificación de la Persona / Cliente -->
        <div class="pedido-mod-client">
          <div class="pedido-mod-section-lbl">
            <i class="ph-fill ph-user-circle"></i> Persona / Cliente Solicitante
          </div>
          <div class="pedido-client-title">${p.cliente}</div>
          <div class="pedido-client-contacts">
            <div class="pedido-phone-row">
              <span class="pedido-phone-txt">
                <i class="ph-fill ph-phone-call" style="color:#00ff9d;"></i>
                ${p.telefono || 'Sin teléfono registrado'}
              </span>
              <div class="pedido-contact-btns">
                ${p.telefono ? `
                  <button type="button" class="btn btn-success-soft btn-xs" onclick="contactarPedidoWA('${p.id}')" title="Chatear con el cliente">
                    <i class="ph-fill ph-whatsapp-logo"></i> WhatsApp
                  </button>
                  <a class="btn btn-secondary btn-xs" href="tel:${p.telefono}" title="Llamar directamente">
                    <i class="ph-fill ph-phone"></i> Llamar
                  </a>
                ` : ''}
              </div>
            </div>
            ${p.email ? `<div style="font-size:11.5px;color:var(--text-2);"><i class="ph ph-envelope"></i> ${p.email}</div>` : ''}
            ${(p.direccion || p.notas) ? `
              <div class="pedido-address-row">
                <strong>📍 Entrega:</strong> ${p.direccion || p.notas}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Módulo 2: Artículos Solicitados ("¿Qué pidió?") -->
        <div class="pedido-mod-items">
          <div class="pedido-mod-section-lbl" style="justify-content:space-between;">
            <span><i class="ph-fill ph-package"></i> Artículos Solicitados (${items.length})</span>
            <span style="font-size:10px;color:var(--text-3);text-transform:none;">Cant. x Precio Unitario</span>
          </div>
          <div class="pedido-items-rows">
            ${items.map(it => `
              <div class="pedido-item-row">
                <div class="pedido-item-name-wrap">
                  <span class="pedido-item-cant">${it.cantidad}x</span>
                  <span class="pedido-item-desc" title="${it.descripcion}">${it.descripcion}</span>
                </div>
                <div class="pedido-item-pricing">
                  <span class="pedido-item-unit">${sym}${parseFloat(it.precio || 0).toFixed(2)}</span>
                  <span class="pedido-item-subtot">${sym}${parseFloat(it.subtotal || 0).toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Pie del Módulo: Resumen Económico y Cierre de Venta -->
        <div class="pedido-mod-footer">
          <div class="pedido-tot-box">
            <span class="pedido-tot-breakdown">Subtotal: ${sym}${subtotal.toFixed(2)} · IGV 18%: ${sym}${impuesto.toFixed(2)}</span>
            <span class="pedido-tot-amount">${totalFmt}</span>
          </div>
          <div class="pedido-actions-wrap">
            <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="viewProforma('${p.id}')" title="Ver ficha técnica">
              <i class="ph ph-eye"></i>
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="openProformaModal('${p.id}')" title="Editar pedido">
              <i class="ph ph-pencil-simple"></i>
            </button>
            ${actionBtn}
            <button type="button" class="btn btn-danger btn-sm btn-icon" onclick="deleteProforma('${p.id}')" title="Eliminar pedido">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

/* ── Render de Tabla Histórica (Vista Alternativa) ───────────────────────────── */
function renderProTable(list) {
  const tbody = document.getElementById('pro-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="td-empty">No se encontraron pedidos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const sym = p.moneda === 'USD' ? '$ ' : 'S/ ';
    const totalFmt = sym + parseFloat(p.total).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
    const esCat = p.origen === 'catalogo';

    const esConcretada = p.estado === 'aprobada' || p.estado === 'convertida';
    const esPendiente  = p.estado === 'en_espera' || p.estado === 'pendiente';
    const esVencida    = p.estado === 'vencida';
    const esRechazada  = p.estado === 'rechazada';

    let badgeEstado = '';
    if (esConcretada) {
      badgeEstado = '<span class="badge" style="background:rgba(0,255,170,0.14);border:1px solid rgba(0,255,170,0.45);color:#00ffaa;font-weight:800;letter-spacing:0.3px;"><i class="ph-fill ph-check-circle"></i> Concretada</span>';
    } else if (esPendiente) {
      badgeEstado = '<span class="badge" style="background:rgba(255,214,0,0.14);border:1px solid rgba(255,214,0,0.45);color:#ffd600;font-weight:800;letter-spacing:0.3px;"><i class="ph-fill ph-clock"></i> Pendiente</span>';
    } else if (esVencida) {
      badgeEstado = '<span class="badge" style="background:rgba(255,115,64,0.14);border:1px solid rgba(255,115,64,0.45);color:#ff7340;font-weight:800;letter-spacing:0.3px;"><i class="ph-fill ph-warning"></i> Vencida</span>';
    } else if (esRechazada) {
      badgeEstado = '<span class="badge" style="background:rgba(255,45,120,0.14);border:1px solid rgba(255,45,120,0.45);color:#ff2d78;font-weight:800;letter-spacing:0.3px;"><i class="ph-fill ph-x-circle"></i> Rechazada</span>';
    } else {
      badgeEstado = `<span class="badge badge-neutral">${p.estado}</span>`;
    }

    let btnAccion = '';
    if (esConcretada) {
      btnAccion = `
        <button type="button" class="btn btn-xs btn-success-soft" onclick="verFacturaElectronicaPedido('${p.id}')" style="gap:4px;font-weight:700;" title="Ver Factura Emitida">
          <i class="ph-fill ph-receipt"></i> Ver Factura
        </button>
      `;
    } else if (esPendiente) {
      btnAccion = `
        <button type="button" class="btn btn-xs btn-primary" onclick="verFacturaElectronicaPedido('${p.id}')" style="gap:4px;font-weight:700;" title="Concretar y Facturar este Pedido">
          <i class="ph-fill ph-check-circle"></i> Concretar Venta
        </button>
      `;
    } else {
      btnAccion = `
        <span style="font-size:11px;color:var(--text-3);padding:2px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.06);font-style:italic;">
          Sin factura
        </span>
      `;
    }

    return `
      <tr>
        <td class="td-code" style="cursor:pointer;" onclick="verFacturaElectronicaPedido('${p.id}')">
          <strong style="color:var(--neon-cyan);">${p.numero}</strong>
        </td>
        <td>
          <div style="font-weight:700;color:#fff;">${p.cliente}</div>
          ${p.telefono ? `<div style="font-size:11px;color:#00ff9d;font-family:var(--font-mono);"><i class="ph ph-phone"></i> ${p.telefono}</div>` : ''}
        </td>
        <td>
          ${esCat
            ? `<span class="badge badge-info" style="font-size:10px;"><i class="ph-fill ph-storefront"></i> Catálogo Web</span>`
            : `<span class="badge badge-neutral" style="font-size:10px;">Venta Directa</span>`
          }
        </td>
        <td>${p.fecha}</td>
        <td>${p.vencimiento || '—'}</td>
        <td class="td-right" style="font-weight:800;color:#00d4ff;font-family:var(--font-mono);">${totalFmt}</td>
        <td>${badgeEstado}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex;align-items:center;gap:4px;">
            ${p.telefono ? `
              <button type="button" class="btn btn-xs btn-success-soft btn-icon" onclick="contactarPedidoWA('${p.id}')" title="WhatsApp con el cliente">
                <i class="ph-fill ph-whatsapp-logo"></i>
              </button>
            ` : ''}
            ${btnAccion}
            <button type="button" class="btn btn-xs btn-ghost btn-icon" onclick="deleteProforma('${p.id}')" title="Eliminar" style="color:var(--danger)">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ── Filtros ─────────────────────────────────────────────────────────────────── */
function applyProFilters() {
  const txt = (document.getElementById('pro-search')?.value || '').toLowerCase();
  const est = document.getElementById('pro-estado')?.value || '';
  const mon = document.getElementById('pro-moneda')?.value || '';

  let list = AppDB.proformas.getAll();

  if (txt) {
    list = list.filter(p =>
      p.numero.toLowerCase().includes(txt) ||
      p.cliente.toLowerCase().includes(txt) ||
      (p.telefono && p.telefono.toLowerCase().includes(txt)) ||
      (p.items && p.items.some(i => i.descripcion.toLowerCase().includes(txt)))
    );
  }

  if (est) {
    if (est === 'en_espera' || est === 'pendiente') {
      list = list.filter(p => p.estado === 'en_espera' || p.estado === 'pendiente');
    } else if (est === 'concretada') {
      list = list.filter(p => p.estado === 'aprobada' || p.estado === 'convertida');
    } else {
      list = list.filter(p => p.estado === est);
    }
  }

  if (mon) {
    list = list.filter(p => p.moneda === mon);
  }

  renderProModules(list);
  renderProTable(list);
}

/* ── Gestión de Baucher de Pago ─────────────────────────────────────────────── */
window._tempVoucher = null;

window.handleVoucherUpload = function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    window._tempVoucher = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: e.target.result,
      date: new Date().toISOString().slice(0, 10)
    };
    _refreshVoucherPreview();
  };
  reader.readAsDataURL(file);
};

window.removeVoucher = function() {
  window._tempVoucher = null;
  _refreshVoucherPreview();
};

function _refreshVoucherPreview() {
  const wrap = document.getElementById('fac-voucher-preview-wrap');
  if (!wrap) return;
  const v = window._tempVoucher;
  if (!v) {
    wrap.innerHTML = `
      <div style="padding:12px 14px;border:1px dashed rgba(255,214,0,0.5);border-radius:10px;background:rgba(255,214,0,0.05);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#ffd600;">
          <i class="ph-fill ph-warning-circle" style="font-size:18px;"></i>
          <span><strong>Obligatorio:</strong> Adjuntar baucher o constancia para justificar el pago</span>
        </div>
        <label class="btn btn-warning btn-xs" style="cursor:pointer;margin:0;gap:6px;font-weight:700;">
          <i class="ph-fill ph-upload-simple"></i> Seleccionar Baucher
          <input type="file" style="display:none" accept="image/*,.pdf" onchange="handleVoucherUpload(this)" />
        </label>
      </div>`;
    return;
  }

  const isImg = v.type && v.type.startsWith('image/');
  wrap.innerHTML = `
    <div style="background:rgba(0,255,170,0.08);border:1px solid rgba(0,255,170,0.4);border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
        ${isImg ? `
          <a href="${v.data}" target="_blank" title="Abrir imagen completa" style="display:block;width:54px;height:54px;border-radius:8px;overflow:hidden;border:1px solid rgba(0,255,170,0.5);flex-shrink:0;">
            <img src="${v.data}" style="width:100%;height:100%;object-fit:cover;" />
          </a>
        ` : `
          <div style="width:54px;height:54px;border-radius:8px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);display:flex;align-items:center;justify-content:center;color:#00d4ff;font-size:26px;flex-shrink:0;">
            <i class="ph-fill ph-file-pdf"></i>
          </div>
        `}
        <div style="min-width:0;">
          <div style="font-size:12.5px;font-weight:800;color:#00ffaa;display:flex;align-items:center;gap:6px;">
            <i class="ph-fill ph-check-circle"></i> Baucher de Pago Adjuntado
          </div>
          <div style="font-size:12px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;margin-top:2px;">
            ${v.name}
          </div>
          <div style="font-size:10.5px;color:var(--text-3);font-family:var(--font-mono);margin-top:2px;">
            ${(v.size / 1024).toFixed(1)} KB · Respaldado formalmente
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <a class="btn btn-secondary btn-xs" href="${v.data}" target="_blank" download="${v.name}">
          <i class="ph ph-download-simple"></i> Descargar
        </a>
        <button type="button" class="btn btn-danger btn-xs" onclick="removeVoucher()" title="Quitar baucher">
          <i class="ph ph-trash"></i> Quitar
        </button>
      </div>
    </div>`;
}

window.onMetodoPagoChange = function(metodo) {
  const label = document.getElementById('fac-voucher-label');
  if (metodo === 'Tarjeta') {
    if (label) label.textContent = 'Baucher / Voucher de POS (Opcional):';
  } else {
    if (label) label.textContent = 'Baucher o Constancia de Transferencia / Efectivo (Obligatorio como Justificativo):';
  }
};

/* ── Ver Factura Electrónica del Pedido y Cierre de Venta ──────────────────── */
window.verFacturaElectronicaPedido = function(id) {
  const p = AppDB.proformas.getById(id);
  if (!p) return;

  // Restaurar baucher si ya existía
  window._tempVoucher = p.comprobante || null;

  const sym = p.moneda === 'USD' ? '$ ' : 'S/ ';
  const subtotal = parseFloat(p.subtotal || 0);
  const impuesto = parseFloat(p.impuesto || (subtotal * 0.18));
  const total = parseFloat(p.total || (subtotal + impuesto));

  // Generar correlativo oficial para la factura
  const allFacs = AppDB.facturas ? AppDB.facturas.getAll() : [];
  let maxFac = 0;
  allFacs.forEach(f => {
    const n = parseInt((f.numero || '').replace(/\D/g, '')) || 0;
    if (n > maxFac) maxFac = n;
  });
  const facSerie = `F001-${String(maxFac + 1).padStart(6, '0')}`;
  const rucEmpresa = '20000000001';

  const rucCliente = p.ruc || (p.cliente && p.cliente.length > 12 ? '20' + Math.floor(100000000 + Math.random()*900000000) : '10' + Math.floor(10000000 + Math.random()*90000000));
  const yaConcretado = p.estado === 'aprobada' || p.estado === 'convertida';

  const bodyHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;max-height:76vh;overflow-y:auto;padding-right:4px;">

      <!-- ═══════════════════════════════════════════════
           REPRESENTACIÓN IMPRESA DE FACTURA ELECTRÓNICA
      ════════════════════════════════════════════════ -->
      <div style="background:#0a1324;border:1px solid rgba(0,212,255,0.3);border-radius:14px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        
        <!-- Cabecera Empresa vs Recuadro SUNAT -->
        <div style="display:grid;grid-template-columns:1fr 260px;gap:20px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:16px;margin-bottom:16px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#00d4ff,#a855f7);display:flex;align-items:center;justify-content:center;color:#060a17;font-size:20px;font-weight:900;">⚡</div>
              <div>
                <div style="font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.3px;">VENTASPRO DEMO S.A.C.</div>
                <div style="font-size:10px;color:#00d4ff;font-weight:700;letter-spacing:0.8px;">ENTORNO DE DEMOSTRACIÓN COMERCIAL</div>
              </div>
            </div>
            <div style="font-size:11px;color:var(--text-2);line-height:1.5;">
              Av. Comercial 100, Módulo Demo, Lima - Perú<br>
              Central Telefónica: +51 900 000 000 · contacto@demoventaspro.com<br>
              Web: www.demoventaspro.com
            </div>
          </div>

          <!-- Recuadro Oficial de Factura -->
          <div style="border:2px solid #00d4ff;border-radius:10px;padding:12px 14px;text-align:center;background:rgba(0,212,255,0.04);display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:12px;font-weight:800;color:#cbd5e1;letter-spacing:1px;font-family:var(--font-mono);">R.U.C. ${rucEmpresa}</div>
            <div style="font-size:14px;font-weight:900;color:#fff;background:rgba(0,212,255,0.2);padding:4px 6px;border-radius:6px;margin:6px 0;letter-spacing:0.5px;">
              FACTURA ELECTRÓNICA
            </div>
            <div style="font-size:15px;font-weight:800;color:#00d4ff;font-family:var(--font-mono);">${facSerie}</div>
            <div style="font-size:10px;color:var(--text-3);margin-top:4px;">Asociada a: <strong style="color:#ffd600;">${p.numero}</strong></div>
          </div>
        </div>

        <!-- Datos del Cliente / Adquiriente -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 14px;margin-bottom:16px;">
          <div>
            <div style="font-size:10.5px;color:var(--text-3);font-weight:700;text-transform:uppercase;">Señor(es) / Razón Social:</div>
            <div style="font-size:13.5px;font-weight:800;color:#fff;margin-top:2px;">${p.cliente}</div>
            <div style="margin-top:8px;">
              <span style="font-size:10.5px;color:var(--text-3);font-weight:700;">R.U.C. / D.N.I.:</span>
              <input class="form-input" id="fac-ruc-cliente" value="${rucCliente}" style="height:28px;font-size:11.5px;font-family:var(--font-mono);width:160px;display:inline-block;margin-left:6px;" ${yaConcretado ? 'disabled' : ''} />
            </div>
          </div>
          <div>
            <div style="font-size:10.5px;color:var(--text-3);font-weight:700;text-transform:uppercase;">Dirección Fiscal:</div>
            <input class="form-input" id="fac-dir-cliente" value="${p.direccion || p.notas || 'Av. Principal 123, Lima'}" style="height:28px;font-size:11.5px;width:100%;margin-top:2px;" ${yaConcretado ? 'disabled' : ''} />
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text-2);">
              <span><strong>Emisión:</strong> ${p.fecha}</span>
              <span><strong>Moneda:</strong> ${p.moneda || 'PEN'} (Soles)</span>
            </div>
          </div>
        </div>

        <!-- Tabla Detallada de Bienes y Servicios -->
        <div style="margin-bottom:16px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
            <thead>
              <tr style="background:rgba(0,212,255,0.12);color:#00d4ff;border-bottom:1px solid rgba(0,212,255,0.25);text-align:left;">
                <th style="padding:8px 10px;width:50px;">Item</th>
                <th style="padding:8px 10px;width:90px;">Código</th>
                <th style="padding:8px 10px;">Descripción del Producto</th>
                <th style="padding:8px 10px;text-align:center;width:60px;">Cant.</th>
                <th style="padding:8px 10px;text-align:right;width:95px;">P. Unitario</th>
                <th style="padding:8px 10px;text-align:right;width:100px;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${(p.items || []).map((it, idx) => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'};">
                  <td style="padding:7px 10px;color:var(--text-3);font-family:var(--font-mono);">${idx + 1}</td>
                  <td style="padding:7px 10px;font-family:var(--font-mono);color:#cbd5e1;">${it.codigo || 'PRD'}</td>
                  <td style="padding:7px 10px;color:#fff;font-weight:600;">${it.descripcion}</td>
                  <td style="padding:7px 10px;text-align:center;font-weight:700;color:#00d4ff;font-family:var(--font-mono);">${it.cantidad} ${it.unidad || 'un'}</td>
                  <td style="padding:7px 10px;text-align:right;font-family:var(--font-mono);color:var(--text-2);">${sym}${parseFloat(it.precio || 0).toFixed(2)}</td>
                  <td style="padding:7px 10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:#fff;">${sym}${parseFloat(it.subtotal || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Resumen de Impuestos y Total de la Factura -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;">
          <div style="font-size:11px;color:var(--text-3);max-width:320px;line-height:1.5;">
            Autorizado mediante Resolución de Superintendencia SUNAT.<br>
            Comprobante de Pago Electrónico generado por el Sistema de Emisión Electrónica.
          </div>
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 18px;min-width:260px;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-2);">
              <span>Op. Gravada (Subtotal):</span>
              <span style="font-family:var(--font-mono);">${sym}${subtotal.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-2);">
              <span>I.G.V. (18.00%):</span>
              <span style="font-family:var(--font-mono);">${sym}${impuesto.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#00d4ff;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);">
              <span>TOTAL A PAGAR:</span>
              <span style="font-family:var(--font-mono);">${sym}${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ═══════════════════════════════════════════════
           SECCIÓN DE MÉTODO DE PAGO Y SUBIDA DE BAUCHER
      ════════════════════════════════════════════════ -->
      <div id="fac-voucher-section" style="background:linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(0,255,170,0.05) 100%);border:1px solid rgba(0,212,255,0.35);border-radius:14px;padding:18px;">
        <div style="font-size:12px;font-weight:800;color:#00d4ff;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
          <i class="ph-fill ph-credit-card"></i> Registro de Pago y Justificativo de Venta
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:4px;display:block;">Método de Pago *</label>
            <select class="form-select" id="fac-metodo-pago" onchange="onMetodoPagoChange(this.value)" style="width:100%;height:36px;font-size:12px;" ${yaConcretado ? 'disabled' : ''}>
              <option value="Transferencia Bancaria" ${p.metodo_pago === 'Transferencia Bancaria' ? 'selected' : ''}>Transferencia Bancaria (BCP / BBVA / Interbank)</option>
              <option value="Efectivo" ${p.metodo_pago === 'Efectivo' ? 'selected' : ''}>Efectivo (Caja / Contra entrega)</option>
              <option value="Yape / Plin" ${p.metodo_pago === 'Yape / Plin' ? 'selected' : ''}>Billetera Digital (Yape / Plin)</option>
              <option value="Tarjeta" ${p.metodo_pago === 'Tarjeta' ? 'selected' : ''}>Tarjeta de Crédito / Débito (POS)</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:4px;display:block;">N° de Operación / Referencia</label>
            <input class="form-input" id="fac-nro-op" placeholder="Ej: Op. 849201 BCP / Recibo #12" value="${p.nro_operacion || ''}" style="width:100%;height:36px;font-size:12px;" ${yaConcretado ? 'disabled' : ''} />
          </div>
        </div>

        <!-- Carga del Baucher de Pago -->
        <div>
          <label id="fac-voucher-label" style="font-size:11px;font-weight:700;color:#fde68a;margin-bottom:6px;display:block;">
            Baucher o Constancia de Transferencia / Efectivo (Obligatorio como Justificativo):
          </label>
          <div id="fac-voucher-preview-wrap"></div>
        </div>
      </div>

    </div>
  `;

  const footerHTML = `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    ${!yaConcretado ? `
      <button type="button" class="btn btn-hero-primary" onclick="concretarYFacturarPedido('${p.id}')">
        <i class="ph-fill ph-check-circle"></i> Concretar Pedido y Pasar a Facturación
      </button>
    ` : `
      <button type="button" class="btn btn-primary" onclick="closeModal(); Router.navigate('facturacion');">
        <i class="ph-fill ph-receipt"></i> Ver en Facturación
      </button>
    `}
  `;

  showModal(
    `<div style="display:flex;align-items:center;gap:8px;"><i class="ph-fill ph-file-text" style="color:#00d4ff;"></i> Factura Electrónica — Pedido ${p.numero}</div>`,
    bodyHTML,
    footerHTML,
    'xl'
  );

  setTimeout(() => {
    _refreshVoucherPreview();
  }, 40);
};

/* ── Concretar Venta, Generar Factura con Baucher y Pasar a Facturación ─────── */
window.concretarYFacturarPedido = function(id) {
  const p = AppDB.proformas.getById(id);
  if (!p) return;

  const metodo = document.getElementById('fac-metodo-pago')?.value || 'Transferencia Bancaria';
  const nroOp = (document.getElementById('fac-nro-op')?.value || '').trim();
  const ruc = (document.getElementById('fac-ruc-cliente')?.value || '').trim();
  const dir = (document.getElementById('fac-dir-cliente')?.value || '').trim();

  // Validar baucher obligatorio para Transferencia, Efectivo o Yape
  if ((metodo === 'Transferencia Bancaria' || metodo === 'Efectivo' || metodo === 'Yape / Plin') && !window._tempVoucher) {
    showToast('Debe adjuntar el baucher o comprobante de pago como justificativo antes de concretar la venta.', 'warning');
    return;
  }

  const allFacs = AppDB.facturas ? AppDB.facturas.getAll() : [];
  let maxFac = 0;
  allFacs.forEach(f => {
    const n = parseInt((f.numero || '').replace(/\D/g, '')) || 0;
    if (n > maxFac) maxFac = n;
  });
  const nextFacCode = `FAC-${String(maxFac + 1).padStart(4, '0')}`;
  const nextSerie   = `F001-${String(maxFac + 1).padStart(6, '0')}`;

  const subtotal = parseFloat(p.subtotal || 0);
  const impuesto = parseFloat(p.impuesto || (subtotal * 0.18));
  const total = parseFloat(p.total || (subtotal + impuesto));

  const nuevaFactura = {
    id              : AppDB.uid ? AppDB.uid('FAC') : `FAC-${Date.now()}`,
    numero          : nextFacCode,
    serie_factura   : nextSerie,
    proforma_id     : p.id,
    pedido_numero   : p.numero,
    cliente         : p.cliente,
    ruc             : ruc || '20601928371',
    direccion       : dir || p.direccion || '',
    telefono        : p.telefono || '',
    email           : p.email || '',
    fecha           : new Date().toISOString().slice(0, 10),
    vencimiento_pago: new Date().toISOString().slice(0, 10),
    moneda          : p.moneda || 'PEN',
    items           : (p.items || []).map(i => ({ ...i })),
    subtotal        : subtotal,
    impuesto        : impuesto,
    total           : total,
    monto_cobrado   : total,
    estado_pago     : 'cobrada', // Pagada y justificada con el baucher
    metodo_pago     : metodo,
    nro_operacion   : nroOp,
    comprobante     : window._tempVoucher || null,
    notas           : `Venta concretada desde Pedido ${p.numero}. Pago mediante ${metodo}`
  };

  AppDB.facturas.save(nuevaFactura);

  // Actualizar pedido a aprobado y vincularlo con la factura
  p.estado = 'aprobada';
  p.factura_id = nuevaFactura.id;
  p.factura_numero = nuevaFactura.numero;
  p.fecha_concretada = new Date().toISOString().slice(0, 10);
  p.metodo_pago = metodo;
  p.nro_operacion = nroOp;
  p.comprobante = window._tempVoucher || null;
  AppDB.proformas.save(p);

  closeModal();
  updateSidebarBadges();
  showToast(`✓ ¡Pedido ${p.numero} concretado! Factura ${nuevaFactura.numero} generada con baucher adjunto.`, 'success');
  Router.navigate('facturacion');
};

/* Compatibilidad directa: Cualquier acción abre la Factura Electrónica y Cierre */
window.marcarPedidoConcretado = function(id) {
  verFacturaElectronicaPedido(id);
};

window.convertirProforma = function(id) {
  verFacturaElectronicaPedido(id);
};

window.verDetallePedido = function(id) {
  verFacturaElectronicaPedido(id);
};

window.rechazarPedido = function(id) {
  const p = AppDB.proformas.getById(id);
  if (!p) return;

  showConfirm('Cancelar Pedido', `¿Estás seguro de cancelar o rechazar el pedido <strong>${p.numero}</strong> de ${p.cliente}?`, () => {
    p.estado = 'rechazada';
    AppDB.proformas.save(p);
    showToast(`Pedido ${p.numero} marcado como rechazado`, 'info');
    updateSidebarBadges();
    renderProformas();
  }, true);
};

window.contactarPedidoWA = function(id) {
  const p = AppDB.proformas.getById(id);
  if (!p) return;

  const msg = `¡Hola ${p.cliente}! Le saluda el asesor comercial de VentasPro respecto a su solicitud de pedido ${p.numero} por S/ ${parseFloat(p.total).toFixed(2)}. Estamos listos para coordinar el despacho de sus productos. ¿Podemos confirmar sus datos de entrega?`;

  showModal(
    '<div style="display:flex;align-items:center;gap:8px;"><i class="ph-fill ph-whatsapp-logo" style="color:#25d366;"></i> Contactar al Cliente por WhatsApp</div>',
    `
      <div style="text-align:center;padding:10px 0 16px;">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#25d366;font-size:28px;">
          <i class="ph-fill ph-whatsapp-logo"></i>
        </div>
        <h3 style="font-size:16px;color:#fff;margin-bottom:4px;">Canal de WhatsApp con el Cliente</h3>
        <p style="font-size:12.5px;color:var(--text-2);margin:0 auto 14px;max-width:380px;">
          Número registrado del cliente: <strong style="color:#00ff9d;">${p.telefono || 'Sin número'}</strong>
        </p>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--neon-cyan);text-transform:uppercase;margin-bottom:6px;">
          Mensaje de confirmación preparado:
        </div>
        <div style="background:rgba(6,12,25,0.7);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:10px;font-family:var(--font-mono);font-size:11.5px;color:var(--text-2);line-height:1.5;white-space:pre-wrap;">${msg}</div>
      </div>

      <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:10px;display:flex;align-items:center;gap:10px;">
        <i class="ph-fill ph-info" style="color:#00d4ff;font-size:16px;flex-shrink:0;"></i>
        <div style="font-size:11px;color:var(--text-3);line-height:1.4;">
          En producción este botón abre directamente la conversación con el cliente para confirmar la transacción de forma inmediata.
        </div>
      </div>
    `,
    `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
      <button type="button" class="btn btn-success" onclick="closeModal(); showToast('Simulando apertura de chat con ' + '${p.cliente}', 'success');">
        <i class="ph-fill ph-chat-circle"></i> Abrir Chat
      </button>
    `,
    'md'
  );
};


/* ── Eliminar Pedido ─────────────────────────────────────────────────────────── */
window.deleteProforma = function(id) {
  const p = AppDB.proformas.getById(id);
  if (!p) return;

  showConfirm('Eliminar Pedido', `¿Eliminar el pedido <strong>${p.numero}</strong> del registro?`, () => {
    AppDB.proformas.delete(id);
    showToast('Pedido eliminado del registro', 'info');
    updateSidebarBadges();
    renderProformas();
  }, true);
};

/* ── Modal de Registro Manual de Pedido ──────────────────────────────────────── */
function openProformaModal(id = null) {
  proformaEditId = id;
  const p = id ? AppDB.proformas.getById(id) : null;
  const prods = AppDB.productos.getAll();

  proformaItems = p ? JSON.parse(JSON.stringify(p.items || [])) : [
    { producto_id: prods[0]?.id || '', descripcion: prods[0]?.descripcion || '', cantidad: 1, precio: prods[0]?.precio || 0, descuento: 0, subtotal: prods[0]?.precio || 0 }
  ];

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Cliente / Razón Social *</label>
        <input class="form-input" id="pf-cliente" value="${p?.cliente || ''}" placeholder="Ej: TechCorp Perú S.A." />
      </div>
      <div class="form-group">
        <label class="form-label">Teléfono de Contacto</label>
        <input class="form-input" id="pf-telefono" value="${p?.telefono || ''}" placeholder="+51 987 654 321" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha del Pedido</label>
        <input class="form-input" id="pf-fecha" type="date" value="${p?.fecha || new Date().toISOString().slice(0, 10)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Moneda</label>
        <select class="form-select" id="pf-moneda" onchange="calcProformaTotals()">
          <option value="PEN" ${p?.moneda === 'PEN' ? 'selected' : ''}>PEN — Soles (S/)</option>
          <option value="USD" ${p?.moneda === 'USD' ? 'selected' : ''}>USD — Dólares ($)</option>
        </select>
      </div>
    </div>

    <!-- Artículos -->
    <div style="margin:16px 0 10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:700;font-size:13px;color:#fff;">Artículos del Pedido</span>
        <button type="button" class="btn btn-secondary btn-xs" onclick="addProformaItem()">
          <i class="ph ph-plus"></i> Agregar Artículo
        </button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th style="width:90px;">Cant.</th>
              <th style="width:120px;">Precio Unit.</th>
              <th style="width:110px;" class="td-right">Subtotal</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody id="pf-items-tbody"></tbody>
        </table>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:12px;">
      <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.25);border-radius:10px;padding:12px 18px;min-width:240px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span>Subtotal:</span>
          <span id="pf-s-sub" style="font-family:var(--font-mono);">S/ 0.00</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
          <span>IGV (18%):</span>
          <span id="pf-s-iva" style="font-family:var(--font-mono);">S/ 0.00</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;color:#00d4ff;border-top:1px solid rgba(0,212,255,0.2);padding-top:6px;">
          <span>Total:</span>
          <span id="pf-s-total" style="font-family:var(--font-mono);">S/ 0.00</span>
        </div>
      </div>
    </div>
  `;

  showModal(
    p ? `Editar Pedido ${p.numero}` : 'Registrar Nuevo Pedido',
    body,
    `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button type="button" class="btn btn-primary" onclick="saveProformaManual()">
        <i class="ph ph-floppy-disk"></i> Guardar Pedido
      </button>
    `,
    'xl'
  );

  renderProformaItems();
}

function renderProformaItems() {
  const tbody = document.getElementById('pf-items-tbody');
  if (!tbody) return;

  const prods = AppDB.productos.getAll();

  tbody.innerHTML = proformaItems.map((item, i) => `
    <tr>
      <td>
        <select class="form-select" onchange="onProformaProductChange(${i}, this)" style="width:100%;">
          ${prods.map(pr => `<option value="${pr.id}" data-nombre="${pr.descripcion}" data-precio="${pr.precio_publico || pr.precio}" ${pr.id === item.producto_id ? 'selected' : ''}>${pr.codigo} — ${pr.descripcion}</option>`).join('')}
        </select>
      </td>
      <td>
        <input class="form-input" type="number" min="1" value="${item.cantidad}" oninput="updateProformaItem(${i}, 'cantidad', this.value)" style="width:80px;text-align:center;" />
      </td>
      <td>
        <input class="form-input" type="number" step="0.01" value="${item.precio}" oninput="updateProformaItem(${i}, 'precio', this.value)" style="width:100px;text-align:right;" />
      </td>
      <td class="td-right" style="font-family:var(--font-mono);font-weight:700;color:#00d4ff;" id="pf-item-sub-${i}">
        S/ ${(item.cantidad * item.precio).toFixed(2)}
      </td>
      <td>
        <button type="button" class="btn btn-danger btn-xs btn-icon" onclick="removeProformaItem(${i})">
          <i class="ph ph-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  calcProformaTotals();
}

window.addProformaItem = function() {
  const prods = AppDB.productos.getAll();
  const pr = prods[0] || {};
  proformaItems.push({
    producto_id: pr.id || '',
    descripcion: pr.descripcion || '',
    cantidad: 1,
    precio: pr.precio_publico || pr.precio || 0,
    subtotal: pr.precio_publico || pr.precio || 0
  });
  renderProformaItems();
};

window.removeProformaItem = function(idx) {
  proformaItems.splice(idx, 1);
  renderProformaItems();
};

window.onProformaProductChange = function(idx, sel) {
  const opt = sel.options[sel.selectedIndex];
  proformaItems[idx].producto_id = sel.value;
  proformaItems[idx].descripcion = opt.dataset.nombre || '';
  proformaItems[idx].precio = parseFloat(opt.dataset.precio || 0);
  proformaItems[idx].subtotal = proformaItems[idx].cantidad * proformaItems[idx].precio;
  renderProformaItems();
};

window.updateProformaItem = function(idx, field, val) {
  proformaItems[idx][field] = parseFloat(val) || 0;
  proformaItems[idx].subtotal = proformaItems[idx].cantidad * proformaItems[idx].precio;
  renderProformaItems();
};

function calcProformaTotals() {
  const mon = document.getElementById('pf-moneda')?.value || 'PEN';
  const sym = mon === 'USD' ? '$ ' : 'S/ ';
  const sub = proformaItems.reduce((s, i) => s + (i.cantidad * i.precio), 0);
  const iva = sub * 0.18;
  const total = sub + iva;

  const elSub = document.getElementById('pf-s-sub');
  const elIva = document.getElementById('pf-s-iva');
  const elTot = document.getElementById('pf-s-total');

  if (elSub) elSub.textContent = sym + sub.toFixed(2);
  if (elIva) elIva.textContent = sym + iva.toFixed(2);
  if (elTot) elTot.textContent = sym + total.toFixed(2);
}

function saveProformaManual() {
  const cliente = document.getElementById('pf-cliente')?.value.trim();
  const telefono= document.getElementById('pf-telefono')?.value.trim();
  const fecha   = document.getElementById('pf-fecha')?.value;
  const moneda  = document.getElementById('pf-moneda')?.value;

  if (!cliente) { showToast('Ingrese el nombre del cliente', 'warning'); return; }
  if (!proformaItems.length) { showToast('Agregue al menos un producto', 'warning'); return; }

  const subtotal = proformaItems.reduce((s, i) => s + (i.cantidad * i.precio), 0);
  const impuesto = subtotal * 0.18;
  const total = subtotal + impuesto;

  const allPros = AppDB.proformas.getAll();
  let max = 0;
  allPros.forEach(item => {
    const n = parseInt((item.numero || '').replace(/\D/g, '')) || 0;
    if (n > max) max = n;
  });

  const data = {
    id: proformaEditId || (AppDB.uid ? AppDB.uid('PED') : `PED-${Date.now()}`),
    numero: proformaEditId ? (AppDB.proformas.getById(proformaEditId)?.numero) : `PED-${String(max + 1).padStart(4, '0')}`,
    cliente,
    telefono,
    origen: 'directo',
    fecha: fecha || new Date().toISOString().slice(0, 10),
    moneda: moneda || 'PEN',
    items: proformaItems.map(i => ({ ...i })),
    subtotal,
    impuesto,
    total,
    estado: 'aprobada'
  };

  AppDB.proformas.save(data);
  closeModal();
  showToast('✓ Pedido guardado exitosamente', 'success');
  updateSidebarBadges();
  renderProformas();
}
