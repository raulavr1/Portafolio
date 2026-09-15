/**
 * facturacion.js — Control de Facturación (CRUD + registro de pagos)
 */

let facturaItems   = [];
let facturaEditId  = null;

// ─── Render principal ─────────────────────────────────────────────────────────
function renderFacturacion() {
  const all = AppDB.facturas.getAll();

  document.getElementById('main-content').innerHTML = `
<div class="page-hero page-hero--facturacion">
  <div class="page-hero-bg"></div>
  <div class="page-hero-content">
    <div class="page-hero-left">
      <div class="page-hero-icon" style="--hero-icon-color:#8b5cf6;--hero-icon-bg:rgba(139,92,246,0.15);--hero-icon-border:rgba(139,92,246,0.3);">
        <i class="ph-fill ph-receipt"></i>
      </div>
      <div>
        <div class="page-hero-eyebrow">Cuentas por Cobrar</div>
        <h1 class="page-hero-title">Facturación</h1>
        <p class="page-hero-subtitle">Control de facturas y pagos · <strong>${all.length}</strong> facturas registradas</p>
      </div>
    </div>
    <div class="page-hero-actions">
      <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.3);color:#00d4ff;padding:8px 16px;border-radius:24px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:8px;box-shadow:0 0 15px rgba(0,212,255,0.1);">
        <i class="ph-fill ph-lightning" style="font-size:16px;"></i>
        <span>Emisión Automática desde Cierre de Pedidos</span>
      </div>
    </div>
  </div>
</div>


    <!-- Resumen cuentas por cobrar tarjetas -->
    <div class="summary-totals" id="fac-summary"></div>

    <!-- Filtros -->
    <div class="filter-bar">
      <input  class="form-input"  id="fac-search"  type="search" placeholder="🔍  Buscar cliente, número…" />
      <select class="form-select" id="fac-estado">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="parcial">Pago Parcial</option>
        <option value="cobrada">Cobrada</option>
        <option value="vencida">Vencida</option>
      </select>
      <select class="form-select" id="fac-moneda">
        <option value="">Todas las monedas</option>
        <option value="PEN">PEN — Soles (S/)</option>
        <option value="USD">USD — Dólares ($)</option>
        <option value="EUR">EUR — Euros (€)</option>
      </select>
      <div class="filter-spacer"></div>
      <button class="btn btn-secondary btn-sm" id="btn-fac-clear">
        <i class="ph ph-x"></i> Limpiar
      </button>
    </div>

    <!-- Módulos de Facturas -->
    <div class="factura-modules-grid" id="fac-modules-grid"></div>
  `;

  buildFacSummary(all);
  renderFacModules(all);

  document.getElementById('fac-search').addEventListener('input',  () => applyFacFilters());
  document.getElementById('fac-estado').addEventListener('change', () => applyFacFilters());
  document.getElementById('fac-moneda').addEventListener('change', () => applyFacFilters());
  document.getElementById('btn-fac-clear').addEventListener('click', () => {
    document.getElementById('fac-search').value = '';
    document.getElementById('fac-estado').value = '';
    document.getElementById('fac-moneda').value = '';
    applyFacFilters();
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────
function buildFacSummary(all) {
  const totalFacturado  = all.reduce((s,f) => s + f.total, 0);
  const totalCobrado    = all.reduce((s,f) => s + (f.monto_cobrado||0), 0);
  const porCobrar       = totalFacturado - totalCobrado;
  const cobradas        = all.filter(f=>f.estado_pago==='cobrada').length;
  const pendientes      = all.filter(f=>f.estado_pago==='pendiente').length;
  const vencidas        = all.filter(f=>f.estado_pago==='vencida').length;

  document.getElementById('fac-summary').innerHTML = `
    <div class="summary-card" style="--summary-color:var(--neon-cyan)">
      <div class="summary-card-label">Total Facturado</div>
      <div class="summary-card-value">${fmtCurrency(totalFacturado)}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--success)">
      <div class="summary-card-label">Total Cobrado</div>
      <div class="summary-card-value">${fmtCurrency(totalCobrado)}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--warning)">
      <div class="summary-card-label">Por Cobrar</div>
      <div class="summary-card-value">${fmtCurrency(porCobrar)}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--success)">
      <div class="summary-card-label">Cobradas</div>
      <div class="summary-card-value">${cobradas}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--warning)">
      <div class="summary-card-label">Pendientes</div>
      <div class="summary-card-value">${pendientes}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--danger)">
      <div class="summary-card-label">Vencidas</div>
      <div class="summary-card-value">${vencidas}</div>
    </div>
  `;
}

// ── Table ──────────────────────────────────────────────────────────────────────
// ─── Visualizar / Gestionar Comprobante Adjunto ────────────────────────────────
function previewComprobante(id) {
  const f = AppDB.facturas.getById(id);
  if (!f || !f.comprobante) { showToast('No hay comprobante adjunto', 'warning'); return; }
  const c = f.comprobante;
  const isImg = c.type && c.type.startsWith('image/');

  let contentHTML = '';
  if (isImg) {
    contentHTML = `<div style="text-align:center;margin-bottom:16px;">
      <img src="${c.data}" alt="${c.name}" style="max-width:100%;max-height:450px;border-radius:10px;border:1px solid var(--border);box-shadow:var(--shadow-md);" />
    </div>`;
  } else if (c.type === 'application/pdf') {
    contentHTML = `<div style="height:450px;margin-bottom:16px;">
      <iframe src="${c.data}" style="width:100%;height:100%;border:none;border-radius:10px;"></iframe>
    </div>`;
  } else {
    contentHTML = `<div style="text-align:center;padding:30px;background:var(--bg-input);border-radius:10px;margin-bottom:16px;border:1px solid var(--border);">
      <i class="ph-fill ph-file-text" style="font-size:48px;color:var(--neon-cyan);display:block;margin-bottom:10px;"></i>
      <div style="font-size:14px;font-weight:700;color:var(--text-1);">${c.name}</div>
      <div style="font-size:11px;color:var(--text-3);font-family:var(--font-mono);margin-top:4px;">${c.type || 'Archivo'} · ${(c.size ? (c.size/1024).toFixed(1)+' KB' : '')}</div>
    </div>`;
  }

  openModal(
    `<i class="ph-fill ph-paperclip" style="color:var(--neon-cyan)"></i> Comprobante: ${f.numero}`,
    `
      <div style="margin-bottom:14px;font-size:13px;color:var(--text-2);background:rgba(0,212,255,0.04);padding:10px 14px;border-radius:8px;border:1px solid var(--border);">
        <b>Cliente:</b> ${f.cliente} &nbsp;·&nbsp; <b>Monto Factura:</b> ${fmtCurrency(f.total, f.moneda)} &nbsp;·&nbsp; <b>Fecha:</b> ${c.date || fmtDate(f.fecha)}
      </div>
      ${contentHTML}
    `,
    [
      { label: '<i class="ph ph-download-simple"></i> Descargar', cls: 'btn-primary', action: () => {
        const a = document.createElement('a');
        a.href = c.data;
        a.download = c.name || `Comprobante_${f.numero}`;
        a.click();
      }},
      { label: 'Cerrar', cls: 'btn-secondary', action: closeModal }
    ],
    'lg'
  );
}

function attachComprobanteToFile(id, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const f = AppDB.facturas.getById(id);
    if (!f) return;
    f.comprobante = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: e.target.result,
      date: new Date().toISOString().slice(0, 10)
    };
    AppDB.facturas.save(f);
    showToast('Comprobante adjuntado con éxito', 'success');
    closeModal();
    renderFacturacion();
    setTimeout(() => viewFactura(id), 300);
  };
  reader.readAsDataURL(file);
}

function removeComprobante(id) {
  const f = AppDB.facturas.getById(id);
  if (!f) return;
  delete f.comprobante;
  AppDB.facturas.save(f);
  showToast('Comprobante eliminado', 'info');
  closeModal();
  renderFacturacion();
  setTimeout(() => viewFactura(id), 300);
}

// ── Módulos de Facturas ────────────────────────────────────────────────────────
function renderFacModules(list) {
  const grid = document.getElementById('fac-modules-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="fac-empty-state">
        <i class="ph ph-receipt" style="font-size:48px;color:var(--text-3);display:block;margin-bottom:12px;"></i>
        <div style="font-size:15px;color:var(--text-3);font-weight:600;">No se encontraron facturas</div>
        <div style="font-size:12px;color:var(--text-4);margin-top:6px;">Las facturas se generan automáticamente al concretar pedidos del catálogo</div>
      </div>`;
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  grid.innerHTML = sorted.map(f => {
    const cobrado  = f.monto_cobrado || 0;
    const pendAmt  = f.total - cobrado;
    const isExp    = isExpired(f.vencimiento_pago) && f.estado_pago !== 'cobrada';
    const proRef   = f.proforma_id
      ? AppDB.proformas.getById(f.proforma_id)?.numero || 'PRO'
      : null;

    // Estado CSS class
    const stateClass = {
      cobrada:  'is-cobrada',
      pendiente:'is-pendiente',
      parcial:  'is-parcial',
      vencida:  'is-vencida'
    }[f.estado_pago] || '';

    // Items rows
    const items = Array.isArray(f.items) ? f.items : [];
    const itemsHTML = items.length
      ? items.map(it => {
          const cant  = it.cantidad || 0;
          const desc  = it.descripcion || it.nombre || 'Producto';
          const unit  = it.precio || 0;
          const sub   = it.subtotal ?? (cant * unit);
          const disc  = it.descuento || 0;
          return `
          <div class="fac-item-row">
            <span class="fac-item-cant">${cant}</span>
            <span class="fac-item-x">×</span>
            <span class="fac-item-desc">${desc}${disc > 0 ? `<em class="fac-item-disc"> −${disc}%</em>` : ''}</span>
            <span class="fac-item-unit">${fmtCurrency(unit, f.moneda)} / u</span>
            <span class="fac-item-subtot">${fmtCurrency(sub, f.moneda)}</span>
          </div>`;
        }).join('')
      : `<div style="padding:10px 0;color:var(--text-4);font-size:12px;text-align:center;">Sin productos registrados</div>`;

    // Comprobante badge
    const compBadge = f.comprobante
      ? `<button class="btn btn-secondary btn-xs fac-comp-btn" onclick="previewComprobante('${f.id}')" title="${f.comprobante.name}">
           <i class="ph-fill ph-paperclip"></i> Comprobante
         </button>`
      : '';

    // Acción cobrar
    const cobrarBtn = f.estado_pago !== 'cobrada'
      ? `<button class="btn btn-success btn-sm" onclick="openPagoModal('${f.id}')">
           <i class="ph ph-money"></i> Registrar Cobro
         </button>`
      : `<div class="fac-cobrada-tag"><i class="ph-fill ph-check-circle"></i> Totalmente Cobrada</div>`;

    // Fecha vencimiento color
    const vencColor = isExp ? 'var(--danger)' : 'var(--text-3)';

    return `
    <div class="factura-module-card ${stateClass}">

      <!-- HEADER -->
      <div class="fac-mod-header">
        <div class="fac-mod-left">
          <span class="fac-num-badge">${f.numero}</span>
          ${proRef ? `<span class="fac-pro-ref"><i class="ph ph-link-simple"></i> ${proRef}</span>` : ''}
          <span class="fac-moneda-tag">${f.moneda}</span>
        </div>
        <div class="fac-mod-right">
          ${facturaBadge(f.estado_pago)}
          ${isExp ? `<span class="fac-venc-alert"><i class="ph-fill ph-warning"></i> Vencida</span>` : ''}
        </div>
      </div>

      <!-- CLIENTE -->
      <div class="fac-mod-section fac-mod-client">
        <div class="fac-mod-section-lbl"><i class="ph ph-user-circle"></i> Cliente</div>
        <div class="fac-client-name">${f.cliente}</div>
        <div class="fac-dates-row">
          <span class="fac-date-pill"><i class="ph ph-calendar"></i> Emitida: <b>${fmtDate(f.fecha)}</b></span>
          <span class="fac-date-pill" style="color:${vencColor}">
            <i class="ph ph-calendar-x"></i> Vence: <b>${fmtDate(f.vencimiento_pago)}</b>
            ${isExp ? '<i class="ph-fill ph-warning" style="color:var(--danger);font-size:11px;"></i>' : ''}
          </span>
        </div>
      </div>

      <!-- PRODUCTOS -->
      <div class="fac-mod-section fac-mod-items">
        <div class="fac-mod-section-lbl"><i class="ph ph-package"></i> Productos Solicitados</div>
        <div class="fac-items-list">
          ${itemsHTML}
        </div>
      </div>

      <!-- TOTALES -->
      <div class="fac-mod-section fac-mod-totals">
        <div class="fac-totals-grid">
          <div class="fac-tot-row">
            <span class="fac-tot-label">Subtotal</span>
            <span class="fac-tot-val">${fmtCurrency(f.subtotal ?? f.total, f.moneda)}</span>
          </div>
          <div class="fac-tot-row">
            <span class="fac-tot-label">IGV (18%)</span>
            <span class="fac-tot-val">${fmtCurrency(f.impuesto || 0, f.moneda)}</span>
          </div>
          <div class="fac-tot-row fac-tot-total">
            <span class="fac-tot-label">TOTAL</span>
            <span class="fac-tot-val">${fmtCurrency(f.total, f.moneda)}</span>
          </div>
          <div class="fac-tot-divider"></div>
          <div class="fac-tot-row">
            <span class="fac-tot-label" style="color:var(--success)">Cobrado</span>
            <span class="fac-tot-val" style="color:var(--success)">${fmtCurrency(cobrado, f.moneda)}</span>
          </div>
          ${pendAmt > 0 ? `
          <div class="fac-tot-row">
            <span class="fac-tot-label" style="color:var(--warning)">Pendiente</span>
            <span class="fac-tot-val" style="color:var(--warning);font-weight:800;">${fmtCurrency(pendAmt, f.moneda)}</span>
          </div>` : ''}
        </div>
      </div>

      <!-- ACCIONES -->
      <div class="fac-mod-actions">
        ${compBadge}
        <div style="flex:1"></div>
        <button class="btn btn-secondary btn-sm" onclick="viewFactura('${f.id}')">
          <i class="ph ph-eye"></i> Ver Detalle
        </button>
        ${cobrarBtn}
        <button class="btn btn-danger btn-xs btn-icon" title="Eliminar factura" onclick="deleteFactura('${f.id}')">
          <i class="ph ph-trash"></i>
        </button>
      </div>

    </div>`;
  }).join('');
}



function applyFacFilters() {
  const search = (document.getElementById('fac-search')?.value||'').toLowerCase();
  const estado = document.getElementById('fac-estado')?.value||'';
  const moneda = document.getElementById('fac-moneda')?.value||'';
  let data = AppDB.facturas.getAll();
  if (search) data = data.filter(f =>
    f.numero.toLowerCase().includes(search) || f.cliente.toLowerCase().includes(search));
  if (estado) data = data.filter(f => f.estado_pago === estado);
  if (moneda) data = data.filter(f => f.moneda === moneda);
  renderFacModules(data);
}

/// ─── Ver detalle — Factura Electrónica ────────────────────────────────────────
function viewFactura(id) {
  const f = AppDB.facturas.getById(id);
  if (!f) return;

  const cobrado  = f.monto_cobrado || 0;
  const saldo    = f.total - cobrado;
  const isExp    = isExpired(f.vencimiento_pago) && f.estado_pago !== 'cobrada';
  const proRef   = f.proforma_id
    ? AppDB.proformas.getById(f.proforma_id)?.numero || f.proforma_id
    : null;

  // ── Items table rows ──
  const itemsRows = (f.items || []).map((it, idx) => {
    const cant  = it.cantidad || 0;
    const desc  = it.descripcion || it.nombre || 'Producto';
    const unit  = it.precio || 0;
    const disc  = it.descuento || 0;
    const base  = cant * unit;
    const sub   = it.subtotal ?? (disc > 0 ? base * (1 - disc / 100) : base);
    return `
    <tr class="fac-detail-item-row ${idx % 2 === 1 ? 'fac-row-alt' : ''}">
      <td class="fac-detail-num">${idx + 1}</td>
      <td class="fac-detail-desc">${desc}</td>
      <td class="fac-detail-cant">${cant}</td>
      <td class="fac-detail-price">${fmtCurrency(unit, f.moneda)}</td>
      <td class="fac-detail-disc">${disc > 0 ? disc + '%' : '—'}</td>
      <td class="fac-detail-sub">${fmtCurrency(sub, f.moneda)}</td>
    </tr>`;
  }).join('');

  // ── Comprobante section ──
  const compHTML = f.comprobante
    ? `<div class="fac-detail-comp fac-detail-comp--attached">
        <i class="ph-fill ph-paperclip"></i>
        <div>
          <div style="font-weight:700;font-size:13px;color:var(--text-1)">${f.comprobante.name}</div>
          <div style="font-size:11px;color:var(--neon-cyan)">Comprobante adjunto · ${f.comprobante.date || fmtDate(f.fecha)}</div>
        </div>
        <div style="display:flex;gap:6px;margin-left:auto">
          <button class="btn btn-primary btn-xs" onclick="previewComprobante('${f.id}')"><i class="ph ph-eye"></i> Ver</button>
          <button class="btn btn-danger btn-xs btn-icon" onclick="removeComprobante('${f.id}')"><i class="ph ph-trash"></i></button>
        </div>
      </div>`
    : `<div class="fac-detail-comp">
        <i class="ph ph-paperclip" style="opacity:.5"></i>
        <span style="font-size:12px;color:var(--text-3)">Sin comprobante de pago adjunto</span>
        <label class="btn btn-secondary btn-xs" style="cursor:pointer;margin-left:auto">
          <i class="ph ph-upload-simple"></i> Adjuntar
          <input type="file" style="display:none" accept="image/*,.pdf" onchange="attachComprobanteToFile('${f.id}', this.files[0])" />
        </label>
      </div>`;

  // ── Estado badge color ──
  const estadoColors = {
    cobrada:  { bg: 'rgba(0,255,136,0.12)', border: 'rgba(0,255,136,0.4)', color: '#00ff88', label: '✓ COBRADA' },
    pendiente:{ bg: 'rgba(255,214,0,0.12)', border: 'rgba(255,214,0,0.4)', color: '#ffd600', label: '⏳ PENDIENTE' },
    parcial:  { bg: 'rgba(0,212,255,0.12)', border: 'rgba(0,212,255,0.4)', color: '#00d4ff', label: '◑ PAGO PARCIAL' },
    vencida:  { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', color: '#ef4444', label: '✗ VENCIDA' },
  };
  const ec = estadoColors[f.estado_pago] || estadoColors.pendiente;

  const modalBody = `
  <div class="fac-invoice-doc">

    <!-- ══ CABECERA EMPRESA ══ -->
    <div class="fac-invoice-header">
      <div class="fac-invoice-emitter">
        <div class="fac-emitter-logo"><i class="ph-fill ph-briefcase"></i></div>
        <div>
          <div class="fac-emitter-name">VENTASPRO DEMO S.A.C.</div>
          <div class="fac-emitter-detail">RUC: 20000000001</div>
          <div class="fac-emitter-detail">Área de Ventas — Sistema de Gestión Comercial</div>
        </div>
      </div>
      <div class="fac-invoice-id-block">
        <div class="fac-invoice-type">FACTURA ELECTRÓNICA</div>
        <div class="fac-invoice-number">${f.numero}</div>
        ${proRef ? `<div class="fac-invoice-proref"><i class="ph ph-link-simple"></i> Pedido origen: ${proRef}</div>` : ''}
        <div class="fac-invoice-estado" style="background:${ec.bg};border:1px solid ${ec.border};color:${ec.color}">
          ${ec.label}
        </div>
      </div>
    </div>

    <!-- ══ DATOS CLIENTE + FECHAS ══ -->
    <div class="fac-invoice-meta">
      <div class="fac-invoice-meta-block">
        <div class="fac-meta-label">Cliente / Receptor</div>
        <div class="fac-meta-value fac-meta-value--lg">${f.cliente}</div>
        <div class="fac-meta-label" style="margin-top:8px">Moneda</div>
        <div class="fac-meta-value">${f.moneda === 'PEN' ? 'Soles Peruanos (S/)' : f.moneda === 'USD' ? 'Dólares Americanos ($)' : 'Euros (€)'}</div>
      </div>
      <div class="fac-invoice-dates">
        <div class="fac-date-block">
          <div class="fac-meta-label"><i class="ph ph-calendar"></i> Fecha Emisión</div>
          <div class="fac-meta-value">${fmtDate(f.fecha)}</div>
        </div>
        <div class="fac-date-block">
          <div class="fac-meta-label" style="color:${isExp ? '#ef4444' : 'inherit'}">
            <i class="ph ph-calendar-x"></i> Fecha Vencimiento
          </div>
          <div class="fac-meta-value" style="color:${isExp ? '#ef4444' : 'inherit'}">
            ${fmtDate(f.vencimiento_pago)}
            ${isExp ? '<span style="font-size:11px;background:rgba(239,68,68,0.15);color:#ef4444;padding:2px 6px;border-radius:4px;margin-left:6px">VENCIDA</span>' : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- ══ TABLA DE ITEMS ══ -->
    <div class="fac-invoice-items">
      <div class="fac-items-section-title"><i class="ph ph-package"></i> Detalle de Productos y Servicios</div>
      <table class="fac-items-table">
        <thead>
          <tr>
            <th class="fac-th-num">#</th>
            <th class="fac-th-desc">Descripción</th>
            <th class="fac-th-cant">Cant.</th>
            <th class="fac-th-price">P. Unit.</th>
            <th class="fac-th-disc">Desc.</th>
            <th class="fac-th-sub">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsRows || '<tr><td colspan="6" style="text-align:center;color:var(--text-4);padding:16px">Sin productos</td></tr>'}</tbody>
      </table>
    </div>

    <!-- ══ TOTALES ══ -->
    <div class="fac-invoice-totals">
      <div style="flex:1"></div>
      <div class="fac-totals-panel">
        <div class="fac-total-line">
          <span>Subtotal (sin impuesto)</span>
          <span>${fmtCurrency(f.subtotal ?? f.total, f.moneda)}</span>
        </div>
        <div class="fac-total-line">
          <span>IGV 18%</span>
          <span>${fmtCurrency(f.impuesto || 0, f.moneda)}</span>
        </div>
        <div class="fac-total-line fac-total-grand">
          <span>TOTAL A PAGAR</span>
          <span>${fmtCurrency(f.total, f.moneda)}</span>
        </div>
        <div class="fac-total-divider"></div>
        <div class="fac-total-line" style="color:var(--success)">
          <span><i class="ph-fill ph-check-circle"></i> Monto Cobrado</span>
          <span style="font-weight:700">${fmtCurrency(cobrado, f.moneda)}</span>
        </div>
        ${saldo > 0 ? `
        <div class="fac-total-line" style="color:var(--warning)">
          <span><i class="ph-fill ph-clock"></i> Saldo Pendiente</span>
          <span style="font-weight:800">${fmtCurrency(saldo, f.moneda)}</span>
        </div>` : `
        <div class="fac-total-line" style="color:var(--success)">
          <span><i class="ph-fill ph-check-circle"></i> Saldo</span>
          <span style="font-weight:700">S/ 0.00 — Pagado</span>
        </div>`}
      </div>
    </div>

    <!-- ══ COMPROBANTE ADJUNTO ══ -->
    ${compHTML}

    <!-- ══ NOTA LEGAL ══ -->
    <div class="fac-invoice-legal">
      <i class="ph ph-info"></i>
      Este documento es generado por <strong>VentasPro</strong> como comprobante interno de gestión comercial.
      En producción, la factura electrónica sería emitida ante SUNAT con firma digital y código QR oficial.
    </div>

    <!-- ══ ACCIONES DE ENVÍO ══ -->
    <div class="fac-invoice-share">
      <div class="fac-share-label"><i class="ph ph-share-network"></i> Compartir Factura</div>
      <div class="fac-share-btns">
        <button class="btn fac-share-btn fac-share-download" onclick="demoBtnFactura('download','${f.numero}')">
          <i class="ph ph-download-simple"></i>
          <span>Descargar PDF</span>
        </button>
        <button class="btn fac-share-btn fac-share-whatsapp" onclick="demoBtnFactura('whatsapp','${f.numero}')">
          <i class="ph ph-whatsapp-logo"></i>
          <span>Enviar WhatsApp</span>
        </button>
        <button class="btn fac-share-btn fac-share-email" onclick="demoBtnFactura('email','${f.numero}')">
          <i class="ph ph-envelope-simple"></i>
          <span>Enviar por Correo</span>
        </button>
      </div>
    </div>

  </div>`;

  showModal(`<i class="ph-fill ph-receipt" style="color:#a855f7;margin-right:6px"></i> Factura Electrónica · ${f.numero}`, modalBody, `
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    ${f.estado_pago !== 'cobrada'
      ? `<button class="btn btn-success" onclick="closeModal();openPagoModal('${f.id}')">
           <i class="ph ph-money"></i> Registrar Cobro
         </button>`
      : ''}
  `, 'xl');
}

// ── Demo info para botones de factura ─────────────────────────────────────────
function demoBtnFactura(tipo, numero) {
  const msgs = {
    download: {
      icon: 'ph-fill ph-download-simple',
      color: '#a855f7',
      title: 'Descarga de Factura PDF',
      body: `
        <p style="color:var(--text-2);font-size:14px;line-height:1.65;margin-bottom:12px">
          En la <strong>versión de producción</strong> de VentasPro, este botón generaría y descargaría
          automáticamente un <strong>PDF de la factura electrónica ${numero}</strong> con:
        </p>
        <ul style="color:var(--text-3);font-size:13px;line-height:2;padding-left:20px;margin-bottom:14px">
          <li>Logotipo y datos fiscales de la empresa emisora</li>
          <li>Código QR de validación ante SUNAT</li>
          <li>Firma digital del comprobante electrónico</li>
          <li>Desglose completo de productos, impuestos y totales</li>
          <li>Condiciones de pago y datos del receptor</li>
        </ul>
        <div style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.3);border-radius:10px;padding:12px 16px;font-size:12px;color:#a855f7">
          <i class="ph-fill ph-info-circle" style="margin-right:6px"></i>
          <strong>Modo Demo:</strong> Esta funcionalidad estará disponible al conectar VentasPro con un servicio de emisión electrónica certificado (Facturación-Sunat, SIRE, o similar).
        </div>`
    },
    whatsapp: {
      icon: 'ph-fill ph-whatsapp-logo',
      color: '#25d366',
      title: 'Envío por WhatsApp',
      body: `
        <p style="color:var(--text-2);font-size:14px;line-height:1.65;margin-bottom:12px">
          En la <strong>versión de producción</strong>, este botón enviaría automáticamente la
          <strong>factura ${numero}</strong> al WhatsApp registrado del cliente, con un mensaje como:
        </p>
        <div style="background:rgba(37,211,102,0.07);border:1px solid rgba(37,211,102,0.25);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:14px;font-family:var(--font-mono)">
          📋 <em>Estimado cliente,</em><br><br>
          Adjuntamos su <strong>Factura Electrónica ${numero}</strong> correspondiente a su pedido reciente.<br><br>
          📌 Total: <strong>${numero.includes('0') ? 'S/ [monto]' : 'Ver detalle'}</strong><br>
          📅 Fecha: <em>[fecha emisión]</em><br><br>
          Puede realizar su pago mediante transferencia bancaria o depósito en efectivo.<br><br>
          Ante cualquier consulta, estamos a su disposición. ¡Gracias por su preferencia! 🙏<br><br>
          <em>— Equipo VentasPro</em>
        </div>
        <div style="background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.3);border-radius:10px;padding:12px 16px;font-size:12px;color:#25d366">
          <i class="ph-fill ph-info-circle" style="margin-right:6px"></i>
          <strong>Modo Demo:</strong> Requiere integración con la API de WhatsApp Business para envío automatizado al número del cliente.
        </div>`
    },
    email: {
      icon: 'ph-fill ph-envelope-simple',
      color: '#00d4ff',
      title: 'Envío por Correo Electrónico',
      body: `
        <p style="color:var(--text-2);font-size:14px;line-height:1.65;margin-bottom:12px">
          En la <strong>versión de producción</strong>, este botón enviaría un correo profesional al cliente
          con la <strong>factura ${numero}</strong> adjunta como PDF, con el siguiente formato:
        </p>
        <div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.22);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:14px">
          <div style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;margin-bottom:8px;font-size:11px;color:var(--text-4)">
            <strong>Para:</strong> cliente@empresa.com &nbsp;|&nbsp;
            <strong>Asunto:</strong> Factura Electrónica ${numero} — VentasPro Demo S.A.C.
          </div>
          Estimado(a) cliente,<br><br>
          Nos complace remitirle su <strong>Comprobante de Pago Electrónico N° ${numero}</strong>.<br><br>
          Adjunto encontrará el documento en formato PDF con todos los detalles de su adquisición,
          incluyendo los montos, IGV aplicado y condiciones de pago.<br><br>
          Para cualquier consulta o aclaración sobre este documento, no dude en contactarnos
          respondiendo este correo o llamando a nuestros canales de atención.<br><br>
          Agradecemos su confianza y preferencia.<br><br>
          <em>Atentamente,<br>Área de Facturación — VentasPro Demo S.A.C.</em>
        </div>
        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.3);border-radius:10px;padding:12px 16px;font-size:12px;color:#00d4ff">
          <i class="ph-fill ph-info-circle" style="margin-right:6px"></i>
          <strong>Modo Demo:</strong> Requiere integración con un servicio SMTP o API de correo (Gmail API, SendGrid, etc.) para envío automatizado.
        </div>`
    }
  };

  const m = msgs[tipo];
  showModal(
    `<i class="${m.icon}" style="color:${m.color};margin-right:8px"></i>${m.title}`,
    m.body,
    `<button class="btn btn-secondary" onclick="closeModal()">Entendido</button>`,
    'md'
  );
}



// ─── Modal Crear/Editar Factura ────────────────────────────────────────────────
let tempFacturaFile = null;

function onFacturaFileSelected(input) {
  const file = input?.files?.[0];
  const nameEl = document.getElementById('fc-file-name');
  if (file && nameEl) {
    nameEl.innerHTML = `<span style="color:var(--neon-green)">✓ ${file.name}</span> <span style="color:var(--text-3);font-size:11px;">(${(file.size/1024).toFixed(1)} KB)</span>`;
  }
}

function openFacturaModal(id = null, fromProformaId = null) {
  facturaEditId = id;
  tempFacturaFile = null;
  const f = id ? AppDB.facturas.getById(id) : null;
  const pf = fromProformaId ? AppDB.proformas.getById(fromProformaId) : null;
  const src = f || pf;

  facturaItems = src ? src.items.map(i => ({ ...i })) : [];

  const productos = AppDB.productos.getAll();
  const prodOpts  = productos.map(pr =>
    `<option value="${pr.id}" data-precio="${pr.precio}" data-nombre="${pr.descripcion.replace(/"/g,'&quot;')}">${pr.descripcion}</option>`
  ).join('');

  const body = `
    <!-- Header Banner Fiscal -->
    <div style="background:linear-gradient(135deg, rgba(139,92,246,0.18), rgba(0,212,255,0.06));border:1px solid rgba(139,92,246,0.3);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(139,92,246,0.25);color:#a855f7;display:flex;align-items:center;justify-content:center;font-size:20px;">
          <i class="ph-fill ph-receipt"></i>
        </div>
        <div>
          <div style="font-size:14px;font-weight:800;color:#ffffff;">Factura Fiscal de Venta</div>
          <div style="font-size:11px;color:#a855f7;font-family:var(--font-mono);">Documento de cobro definitivo con registro fiscal y comprobante</div>
        </div>
      </div>
      <span class="badge badge-purple" style="font-size:10px;">DOCUMENTO FISCAL</span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Cliente *</label>
        <input class="form-input" id="fc-cliente" placeholder="Nombre o Razón Social del cliente" value="${src?.cliente||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Moneda *</label>
        <select class="form-select" id="fc-moneda">
          <option value="PEN" ${src?.moneda==='PEN'||!src?.moneda?'selected':''}>PEN — Soles (S/)</option>
          <option value="USD" ${src?.moneda==='USD'?'selected':''}>USD — Dólares ($)</option>
          <option value="EUR" ${src?.moneda==='EUR'?'selected':''}>EUR — Euros (€)</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha emisión *</label>
        <input class="form-input" id="fc-fecha" type="date" value="${f?.fecha||todayStr()}" />
      </div>
      <div class="form-group">
        <label class="form-label">Fecha vence pago *</label>
        <input class="form-input" id="fc-vencimiento" type="date" value="${f?.vencimiento_pago||offsetDate(30)}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Estado de cobro</label>
        <select class="form-select" id="fc-estado">
          <option value="pendiente" ${(f?.estado_pago||'pendiente')==='pendiente'?'selected':''}>Pendiente de Cobro</option>
          <option value="parcial"   ${f?.estado_pago==='parcial'?'selected':''}>Pago Parcial</option>
          <option value="cobrada"   ${f?.estado_pago==='cobrada'?'selected':''}>Cobrada Total</option>
          <option value="vencida"   ${f?.estado_pago==='vencida'?'selected':''}>Vencida</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Método de cobro</label>
        <select class="form-select" id="fc-metodo">
          <option value="Transferencia BCP/BBVA">Transferencia Bancaria</option>
          <option value="Yape / Plin">Yape / Plin</option>
          <option value="Efectivo">Efectivo Contado</option>
          <option value="Tarjeta de Crédito/Débito">Tarjeta Crédito / Débito</option>
          <option value="Cheque">Cheque Comercial</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Monto cobrado inicial</label>
        <input class="form-input" id="fc-cobrado" type="number" min="0" step="0.01"
          value="${f?.monto_cobrado||0}" placeholder="0.00" />
      </div>
      <div class="form-group"></div>
    </div>

    <!-- Zona de Carga de Comprobante / Voucher -->
    <div class="form-group" style="margin-top:14px;">
      <label class="form-label" style="display:flex;align-items:center;gap:6px;">
        <i class="ph-fill ph-paperclip" style="color:var(--neon-cyan)"></i> Adjuntar Comprobante de Pago (Voucher / Recibo / Transferencia)
      </label>
      <div class="drop-zone-compact" onclick="document.getElementById('fc-form-file').click()">
        <i class="ph-fill ph-cloud-arrow-up" style="font-size:26px;color:var(--neon-cyan);display:block;margin-bottom:4px;"></i>
        <div style="font-size:12px;font-weight:700;color:var(--text-1);" id="fc-file-name">
          ${src?.comprobante ? `📎 ${src.comprobante.name}` : 'Haz clic aquí para seleccionar una foto de voucher o PDF'}
        </div>
        <div style="font-size:10px;color:var(--text-3);font-family:var(--font-mono);margin-top:2px;">Admite imágenes (JPG, PNG) o PDF de transferencia</div>
      </div>
      <input type="file" id="fc-form-file" accept="image/*,.pdf,.doc,.docx" style="display:none" onchange="onFacturaFileSelected(this)" />
    </div>

    <hr class="form-divider">
    <div class="form-section-title">Detalle de Productos / Servicios Fiscales</div>
    <div style="margin-bottom:10px">
      <button class="btn btn-secondary btn-sm" onclick="addFacturaItem()" type="button">
        <i class="ph ph-plus"></i> Agregar producto
      </button>
    </div>
    <div class="items-table-wrap">
      <table class="items-table">
        <thead><tr>
          <th style="min-width:180px">Producto</th>
          <th style="width:70px">Cant.</th>
          <th style="width:90px">Precio</th>
          <th style="width:70px">Desc%</th>
          <th style="width:100px;text-align:right">Subtotal</th>
          <th style="width:36px"></th>
        </tr></thead>
        <tbody id="fc-items-tbody"></tbody>
      </table>
    </div>
    <select id="fc-prod-template" style="display:none">${prodOpts}</select>
    <div class="items-summary" id="fc-summary">
      <div class="items-summary-row"><span>Subtotal</span><span id="fc-s-sub">$0.00</span></div>
      <div class="items-summary-row"><span>IVA 12%</span><span id="fc-s-iva">$0.00</span></div>
      <div class="items-summary-row total"><span>TOTAL FISCAL</span><span id="fc-s-total">$0.00</span></div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveFactura()">
      <i class="ph ph-floppy-disk"></i> ${id ? 'Actualizar' : 'Guardar Factura'}
    </button>
  `;

  showModal(id ? `Editar ${f.numero}` : 'Nueva Factura', body, footer, 'lg');
  renderFacturaItems();
  if (!facturaItems.length) addFacturaItem();
}

// ── Factura items ──────────────────────────────────────────────────────────────
function addFacturaItem() {
  facturaItems.push({ producto_id:'', descripcion:'', cantidad:1, precio:0, descuento:0, subtotal:0 });
  renderFacturaItems();
}
function removeFacturaItem(idx) {
  facturaItems.splice(idx, 1);
  renderFacturaItems();
}
function renderFacturaItems() {
  const tbody  = document.getElementById('fc-items-tbody');
  const prodTpl= document.getElementById('fc-prod-template');
  if (!tbody) return;
  tbody.innerHTML = facturaItems.map((item, i) => `
    <tr>
      <td>
        <select class="form-select" onchange="onFacturaProductChange(${i},this)">
          <option value="">— Seleccionar —</option>
          ${Array.from(prodTpl?.options||[]).map(o =>
            `<option value="${o.value}" data-precio="${o.dataset.precio}" data-nombre="${o.dataset.nombre}"
              ${o.value===item.producto_id?'selected':''}>${o.text}</option>`
          ).join('')}
        </select>
      </td>
      <td><input class="form-input" type="number" min="0.01" step="0.01" value="${item.cantidad}"
        onchange="updateFacturaItem(${i},'cantidad',this.value)" /></td>
      <td><input class="form-input" type="number" min="0" step="0.01" value="${item.precio}"
        onchange="updateFacturaItem(${i},'precio',this.value)" /></td>
      <td><input class="form-input" type="number" min="0" max="100" step="0.5" value="${item.descuento||0}"
        onchange="updateFacturaItem(${i},'descuento',this.value)" /></td>
      <td class="subtotal-cell">${fmtCurrency(item.subtotal)}</td>
      <td><button class="btn btn-danger btn-xs btn-icon" onclick="removeFacturaItem(${i})" type="button">
        <i class="ph ph-trash"></i></button></td>
    </tr>
  `).join('');
  calcFacturaTotals();
}
function onFacturaProductChange(idx, sel) {
  const opt = sel.options[sel.selectedIndex];
  facturaItems[idx].producto_id = sel.value;
  facturaItems[idx].descripcion = opt.dataset.nombre || '';
  facturaItems[idx].precio = parseFloat(opt.dataset.precio || 0);
  calcFacItemSubtotal(idx);
  renderFacturaItems();
}
function updateFacturaItem(idx, field, val) {
  facturaItems[idx][field] = parseFloat(val)||0;
  calcFacItemSubtotal(idx);
  calcFacturaTotals();
  const cells = document.querySelectorAll('#fc-items-tbody .subtotal-cell');
  if (cells[idx]) cells[idx].textContent = fmtCurrency(facturaItems[idx].subtotal);
}
function calcFacItemSubtotal(idx) {
  const it = facturaItems[idx];
  it.subtotal = parseFloat(((it.cantidad * it.precio) * (1-(it.descuento||0)/100)).toFixed(2));
}
function calcFacturaTotals() {
  const sub   = facturaItems.reduce((s,i) => s+(i.subtotal||0), 0);
  const iva   = sub * 0.12;
  const total = sub + iva;
  const mon   = document.getElementById('fc-moneda')?.value || 'USD';
  const el = id => document.getElementById(id);
  if (el('fc-s-sub'))   el('fc-s-sub').textContent   = fmtCurrency(sub, mon);
  if (el('fc-s-iva'))   el('fc-s-iva').textContent   = fmtCurrency(iva, mon);
  if (el('fc-s-total')) el('fc-s-total').textContent = fmtCurrency(total, mon);
}

// ─── Guardar Factura ──────────────────────────────────────────────────────────
function saveFactura() {
  const cliente         = document.getElementById('fc-cliente')?.value.trim();
  const moneda          = document.getElementById('fc-moneda')?.value;
  const fecha           = document.getElementById('fc-fecha')?.value;
  const vencimiento_pago= document.getElementById('fc-vencimiento')?.value;
  const estado_pago     = document.getElementById('fc-estado')?.value;
  const monto_cobrado   = parseFloat(document.getElementById('fc-cobrado')?.value||0);

  if (!cliente)                 { showToast('Ingrese el nombre del cliente','warning'); return; }
  if (!fecha||!vencimiento_pago){ showToast('Ingrese las fechas','warning'); return; }
  const validItems = facturaItems.filter(i => i.producto_id && i.cantidad > 0);
  if (!validItems.length)       { showToast('Agregue al menos un producto','warning'); return; }

  const sub   = validItems.reduce((s,i) => s+i.subtotal, 0);
  const iva   = parseFloat((sub*0.12).toFixed(2));
  const total = parseFloat((sub+iva).toFixed(2));

  const existente = facturaEditId ? AppDB.facturas.getById(facturaEditId) : null;
  const data = {
    id           : facturaEditId || null,
    proforma_id  : existente?.proforma_id || null,
    cliente, moneda, fecha, vencimiento_pago, estado_pago,
    monto_cobrado: Math.min(monto_cobrado, total),
    items        : validItems,
    subtotal     : parseFloat(sub.toFixed(2)),
    impuesto     : iva,
    total
  };

  AppDB.facturas.save(data);
  closeModal();
  showToast(facturaEditId ? 'Factura actualizada' : 'Factura creada correctamente', 'success');
  updateSidebarBadges();
  renderFacturacion();
}

// ─── Registrar Pago ───────────────────────────────────────────────────────────
function openPagoModal(id) {
  const f = AppDB.facturas.getById(id);
  if (!f) return;
  const saldo = f.total - (f.monto_cobrado || 0);

  showModal('Registrar Cobro', `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md);padding:14px 16px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
        <span style="color:var(--text-2)">Total factura</span>
        <span style="font-weight:700">${fmtCurrency(f.total, f.moneda)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
        <span style="color:var(--success)">Ya cobrado</span>
        <span style="font-weight:700;color:var(--success)">${fmtCurrency(f.monto_cobrado||0, f.moneda)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
        <span style="color:var(--warning)">Saldo pendiente</span>
        <span style="color:var(--warning)">${fmtCurrency(saldo, f.moneda)}</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Monto a cobrar *</label>
      <input class="form-input" id="pago-monto" type="number" min="0.01" step="0.01"
        max="${saldo}" value="${saldo.toFixed(2)}" placeholder="0.00" />
      <span class="form-hint">Máximo: ${fmtCurrency(saldo, f.moneda)}</span>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha de cobro</label>
      <input class="form-input" id="pago-fecha" type="date" value="${todayStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label">Observación</label>
      <input class="form-input" id="pago-obs" placeholder="Transferencia, efectivo, cheque…" />
    </div>
    <div class="form-group" style="margin-top:12px;">
      <label class="form-label"><i class="ph ph-paperclip" style="color:var(--neon-cyan)"></i> Adjuntar Comprobante de Pago</label>
      <input class="form-input" id="pago-comprobante-file" type="file" accept="image/*,.pdf,.doc,.docx" />
      <small style="color:var(--text-3);font-size:11px;margin-top:4px;display:block;">Sube una foto o PDF de la transferencia, voucher o depósito (Opcional)</small>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-success" onclick="registrarPago('${id}',${saldo},${f.total})">
      <i class="ph ph-check-circle"></i> Registrar Cobro
    </button>
  `);
}

function registrarPago(id, saldo, total) {
  const monto = parseFloat(document.getElementById('pago-monto')?.value || 0);
  if (!monto || monto <= 0) { showToast('Ingrese el monto a cobrar', 'warning'); return; }
  if (monto > saldo + 0.01) { showToast('El monto supera el saldo pendiente', 'warning'); return; }

  const fileInput = document.getElementById('pago-comprobante-file');
  const file = fileInput?.files?.[0];

  const processPayment = (compData) => {
    const f = AppDB.facturas.getById(id);
    if (!f) return;
    const nuevoCobrado = (f.monto_cobrado || 0) + monto;
    const nuevoEstado  = nuevoCobrado >= f.total - 0.01 ? 'cobrada' : 'parcial';
    const updated = {
      ...f,
      monto_cobrado: parseFloat(nuevoCobrado.toFixed(2)),
      estado_pago: nuevoEstado
    };
    if (compData) {
      updated.comprobante = compData;
    }
    AppDB.facturas.save(updated);
    closeModal();
    showToast(`Cobro de ${fmtCurrency(monto, f.moneda)} registrado ${compData ? 'con comprobante' : ''}`, 'success');
    updateSidebarBadges();
    renderFacturacion();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      processPayment({
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result,
        date: new Date().toISOString().slice(0, 10)
      });
    };
    reader.readAsDataURL(file);
  } else {
    processPayment(null);
  }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────
function deleteFactura(id) {
  const f = AppDB.facturas.getById(id);
  if (!f) return;
  showConfirm('Eliminar Factura', `¿Eliminar <strong>${f.numero}</strong>? Esta acción no se puede deshacer.`, () => {
    AppDB.facturas.delete(id);
    showToast('Factura eliminada', 'warning');
    updateSidebarBadges();
    renderFacturacion();
  });
}
