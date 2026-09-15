/**
 * inventario.js — Control de Inventarios Tecnológico
 * Formulario simplificado y simétrico: Cantidad de ingreso, costo unitario,
 * selección de margen en porcentaje (%) y cálculo automático de precio de venta y ganancias.
 */

// ─── Render principal ─────────────────────────────────────────────────────────
function renderInventario() {
  const prods = AppDB.productos.getAll();
  const lowStock = prods.filter(p => p.stock <= p.stock_minimo);

  document.getElementById('main-content').innerHTML = `
<div class="page-hero page-hero--inventario">
  <div class="page-hero-bg"></div>
  <div class="page-hero-content">
    <div class="page-hero-left">
      <div class="page-hero-icon" style="--hero-icon-color:#06b6d4;--hero-icon-bg:rgba(6,182,212,0.15);--hero-icon-border:rgba(6,182,212,0.3);">
        <i class="ph-fill ph-package"></i>
      </div>
      <div>
        <div class="page-hero-eyebrow">Gestión de Productos</div>
        <h1 class="page-hero-title">Inventario</h1>
        <p class="page-hero-subtitle">Productos de tecnología · <strong>${prods.length}</strong> registrados en catálogo</p>
      </div>
    </div>
    <div class="page-hero-actions">
      <button class="btn btn-hero-primary" id="btn-prod-nuevo">
        <i class="ph ph-plus-circle"></i> Nuevo Producto
      </button>
    </div>
  </div>
</div>

    <!-- Resumen rápido tarjetas -->
    <div class="summary-totals" id="inv-summary"></div>

    <!-- Filtros -->
    <div class="filter-bar">
      <input  class="form-input"  id="inv-search"    type="search"  placeholder="🔍  Buscar producto, código…" />
      <select class="form-select" id="inv-categoria">
        <option value="">Todas las categorías</option>
        ${[...new Set(prods.map(p=>p.categoria))].sort().map(c=>`<option value="${c}">${c}</option>`).join('')}
      </select>
      <select class="form-select" id="inv-stock-filter">
        <option value="">Todo el inventario</option>
        <option value="ok">Con existencia</option>
        <option value="cero">Sin existencia</option>
      </select>
      <div class="filter-spacer"></div>
      <button class="btn btn-secondary btn-sm" id="btn-inv-clear">
        <i class="ph ph-x"></i> Limpiar
      </button>
    </div>

    <!-- Tabla de productos -->
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Código</th>
          <th>Descripción</th>
          <th>Categoría</th>
          <th class="td-right">Cantidad</th>
          <th>Unidad</th>
          <th class="td-right">Costo Unit.</th>
          <th class="td-right">Precio Venta</th>
          <th class="td-right">Ganancia Est.</th>
          <th>Estado</th>
          <th style="text-align:right">Acciones</th>
        </tr></thead>
        <tbody id="inv-tbody"></tbody>
      </table>
    </div>
  `;

  buildInvSummary(prods);
  renderInvTable(prods);

  document.getElementById('btn-prod-nuevo').addEventListener('click', () => openProductoModal());
  document.getElementById('inv-search').addEventListener('input',        () => applyInvFilters());
  document.getElementById('inv-categoria').addEventListener('change',    () => applyInvFilters());
  document.getElementById('inv-stock-filter').addEventListener('change', () => applyInvFilters());
  document.getElementById('btn-inv-clear').addEventListener('click', () => {
    document.getElementById('inv-search').value       = '';
    document.getElementById('inv-categoria').value    = '';
    document.getElementById('inv-stock-filter').value = '';
    applyInvFilters();
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────
function buildInvSummary(prods) {
  const valorCostoTotal = prods.reduce((s,p) => s + (p.precio || 0) * (p.stock || 0), 0);
  const valorVentaTotal = prods.reduce((s,p) => s + (p.precio_publico || p.precio || 0) * (p.stock || 0), 0);
  const gananciaEstimada= valorVentaTotal - valorCostoTotal;
  const conStock        = prods.filter(p => p.stock > 0).length;
  const cats            = [...new Set(prods.map(p=>p.categoria))].length;

  document.getElementById('inv-summary').innerHTML = `
    <div class="summary-card" style="--summary-color:var(--neon-cyan)">
      <div class="summary-card-label">Inversión en Costo</div>
      <div class="summary-card-value">${fmtCurrency(valorCostoTotal)}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--neon-purple)">
      <div class="summary-card-label">Valor Venta Estimado</div>
      <div class="summary-card-value">${fmtCurrency(valorVentaTotal)}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--success)">
      <div class="summary-card-label">Ganancia Total Proyectada</div>
      <div class="summary-card-value">+${fmtCurrency(gananciaEstimada)}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--neon-yellow)">
      <div class="summary-card-label">Productos Disponibles</div>
      <div class="summary-card-value">${conStock}</div>
    </div>
    <div class="summary-card" style="--summary-color:var(--neon-orange)">
      <div class="summary-card-label">Categorías</div>
      <div class="summary-card-value">${cats}</div>
    </div>
  `;
}

// ── Table render ──────────────────────────────────────────────────────────────
function renderInvTable(list) {
  const tbody = document.getElementById('inv-tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="padding:48px 20px;text-align:center;">
      <i class="ph-fill ph-package" style="font-size:48px;color:var(--neon-cyan);opacity:0.6;margin-bottom:12px;"></i>
      <h3 style="font-size:16px;color:#fff;margin-bottom:6px;">No hay productos en el inventario</h3>
      <p style="font-size:13px;color:var(--text-3);margin-bottom:20px;">Agrega productos usando el botón "Nuevo Producto".</p>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .sort((a,b) => a.descripcion.localeCompare(b.descripcion))
    .map(p => {
      const cls = stockClass(p.stock, p.stock_minimo || 0);
      const precioVenta = parseFloat(p.precio_publico || p.precio || 0);
      const costoUnit = parseFloat(p.costo_unitario || p.precio || 0);
      const gananciaUnit = precioVenta - costoUnit;
      const gananciaTotal = gananciaUnit * (p.stock || 0);

      return `<tr>
        <td style="text-align:center;vertical-align:middle;" class="td-mono"><span style="font-weight:700;color:var(--text-1);">${p.codigo}</span></td>
        <td style="text-align:center;vertical-align:middle;max-width:220px;">
          <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-1);">${p.descripcion}</div>
        </td>
        <td style="text-align:center;vertical-align:middle;"><span class="badge badge-neutral">${p.categoria}</span></td>
        <td style="text-align:center;vertical-align:middle;font-weight:800;font-size:15px;color:${p.stock===0?'var(--danger)':'var(--text-1)'}">
          ${fmtNum(p.stock, 0)}
        </td>
        <td style="text-align:center;vertical-align:middle;color:var(--text-2);">${p.unidad}</td>
        <td style="text-align:center;vertical-align:middle;color:var(--text-2);">${fmtCurrency(costoUnit, p.moneda)}</td>
        <td style="text-align:center;vertical-align:middle;font-weight:700;white-space:nowrap;color:var(--neon-cyan);">${fmtCurrency(precioVenta, p.moneda)}</td>
        <td style="text-align:center;vertical-align:middle;font-weight:700;white-space:nowrap;color:var(--success);">
          ${gananciaTotal >= 0 ? '+' : ''}${fmtCurrency(gananciaTotal, p.moneda)}
        </td>
        <td style="text-align:center;vertical-align:middle;">
          <span class="badge ${p.stock>0?'badge-success':'badge-danger'}">${p.stock>0?'En stock':'Agotado'}</span>
        </td>
        <td>
          <div class="col-actions">
            <button class="btn btn-secondary btn-xs btn-icon" onclick="verHistorial('${p.id}')" title="Ver historial">
              <i class="ph ph-clock-counter-clockwise"></i></button>
            <button class="btn btn-secondary btn-xs btn-icon" onclick="openProductoModal('${p.id}')" title="Editar">
              <i class="ph ph-pencil-simple"></i></button>
            <button class="btn btn-danger btn-xs btn-icon" onclick="deleteProducto('${p.id}')" title="Eliminar">
              <i class="ph ph-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
}

// ── Filters ───────────────────────────────────────────────────────────────────
function applyInvFilters() {
  const search   = (document.getElementById('inv-search')?.value||'').toLowerCase();
  const cat      = document.getElementById('inv-categoria')?.value||'';
  const stockFil = document.getElementById('inv-stock-filter')?.value||'';
  let data = AppDB.productos.getAll();
  if (search)   data = data.filter(p => p.descripcion.toLowerCase().includes(search) || p.codigo.toLowerCase().includes(search));
  if (cat)      data = data.filter(p => p.categoria === cat);
  if (stockFil === 'cero') data = data.filter(p => p.stock === 0);
  if (stockFil === 'ok')   data = data.filter(p => p.stock > 0);
  renderInvTable(data);
}

// ─── Carrusel de imágenes ─────────────────────────────────────────────────────
window._prodImagenes = [];
window._prodImagenActual = 0;
window._prodFactura = null;

function _carruselHtml(imagenes, activo) {
  if (!imagenes || !imagenes.length) {
    return `<div id="prod-img-preview-box" style="width:100%;height:160px;border-radius:10px;border:2px dashed var(--border-accent);background:var(--bg-input);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:var(--text-3);">
      <i class="ph ph-images" style="font-size:36px;"></i>
      <span style="font-size:12px;">Sin imágenes de referencia</span>
    </div>
    <div id="prod-img-dots" style="display:none;"></div>`;
  }
  const items = imagenes.map((src, i) =>
    `<div class="prod-carousel-slide" style="display:${i===activo?'block':'none'};" data-idx="${i}">
      <img src="${src}" style="width:100%;height:160px;object-fit:cover;border-radius:10px;" />
    </div>`
  ).join('');
  const dots = imagenes.map((_, i) =>
    `<span onclick="carruselGoTo(${i})" style="width:8px;height:8px;border-radius:50%;background:${i===activo?'#00d4ff':'rgba(255,255,255,0.25)'};cursor:pointer;transition:all 0.2s;display:inline-block;${i===activo?'box-shadow:0 0 6px #00d4ff;transform:scale(1.2);':''}"></span>`
  ).join('');
  return `<div id="prod-img-preview-box" style="position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--border-accent);">
    <div id="prod-carousel-slides">${items}</div>
    ${imagenes.length > 1 ? `
    <button type="button" onclick="carruselPrev()" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(10,20,40,0.75);border:1px solid rgba(0,212,255,0.4);border-radius:50%;width:30px;height:30px;color:#00d4ff;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
      <i class="ph ph-caret-left" style="font-size:16px;"></i>
    </button>
    <button type="button" onclick="carruselNext()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(10,20,40,0.75);border:1px solid rgba(0,212,255,0.4);border-radius:50%;width:30px;height:30px;color:#00d4ff;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
      <i class="ph ph-caret-right" style="font-size:16px;"></i>
    </button>
    <button type="button" onclick="carruselDeleteCurrent()" title="Eliminar imagen actual" style="position:absolute;right:8px;top:8px;background:rgba(220,38,38,0.85);border:none;border-radius:6px;width:26px;height:26px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;">
      <i class="ph ph-trash" style="font-size:13px;"></i>
    </button>` : `
    <button type="button" onclick="carruselDeleteCurrent()" title="Eliminar imagen" style="position:absolute;right:8px;top:8px;background:rgba(220,38,38,0.85);border:none;border-radius:6px;width:26px;height:26px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;">
      <i class="ph ph-trash" style="font-size:13px;"></i>
    </button>`}
  </div>
  <div id="prod-img-dots" style="display:flex;justify-content:center;gap:6px;margin-top:8px;">${dots}</div>`;
}

window.carruselGoTo = function(idx) {
  const slides = document.querySelectorAll('.prod-carousel-slide');
  slides.forEach((s, i) => s.style.display = i === idx ? 'block' : 'none');
  window._prodImagenActual = idx;
  _actualizarDots();
};
window.carruselPrev = function() {
  const n = window._prodImagenes.length;
  if (!n) return;
  carruselGoTo((window._prodImagenActual - 1 + n) % n);
};
window.carruselNext = function() {
  const n = window._prodImagenes.length;
  if (!n) return;
  carruselGoTo((window._prodImagenActual + 1) % n);
};
window.carruselDeleteCurrent = function() {
  const idx = window._prodImagenActual;
  window._prodImagenes.splice(idx, 1);
  window._prodImagenActual = Math.max(0, idx - 1);
  _refreshCarrusel();
};
function _actualizarDots() {
  const dotsEl = document.getElementById('prod-img-dots');
  if (!dotsEl) return;
  const n = window._prodImagenes.length;
  dotsEl.innerHTML = window._prodImagenes.map((_, i) =>
    `<span onclick="carruselGoTo(${i})" style="width:8px;height:8px;border-radius:50%;background:${i===window._prodImagenActual?'#00d4ff':'rgba(255,255,255,0.25)'};cursor:pointer;transition:all 0.2s;display:inline-block;${i===window._prodImagenActual?'box-shadow:0 0 6px #00d4ff;transform:scale(1.2);':''}"></span>`
  ).join('');
}
function _refreshCarrusel() {
  const wrap = document.getElementById('prod-img-carrusel-wrap');
  if (wrap) wrap.innerHTML = _carruselHtml(window._prodImagenes, window._prodImagenActual);
}

function handleProdImageUpload(input) {
  if (!input.files || !input.files.length) return;
  const files = Array.from(input.files);
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      window._prodImagenes.push(e.target.result);
      loaded++;
      if (loaded === files.length) {
        window._prodImagenActual = window._prodImagenes.length - 1;
        _refreshCarrusel();
      }
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function handleFacturaUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    window._prodFactura = e.target.result;
    _refreshFacturaPreview();
  };
  reader.readAsDataURL(file);
}

function _refreshFacturaPreview() {
  const wrap = document.getElementById('prod-factura-preview');
  if (!wrap) return;
  const f = window._prodFactura;
  if (!f) {
    wrap.innerHTML = `<span style="font-size:12px;color:var(--text-3);">Sin documento adjunto</span>`;
    return;
  }
  const isImg = f.startsWith('data:image');
  if (isImg) {
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${f}" style="max-height:80px;border-radius:6px;border:1px solid var(--border-accent);" />
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--neon-green);margin-bottom:4px;">
            <i class="ph-fill ph-check-circle"></i> Comprobante adjuntado
          </div>
          <button type="button" onclick="window._prodFactura=null;_refreshFacturaPreview();" style="background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);border-radius:6px;color:var(--danger);cursor:pointer;padding:4px 10px;font-size:11px;">
            <i class="ph ph-trash"></i> Quitar documento
          </button>
        </div>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);display:flex;align-items:center;justify-content:center;color:var(--neon-cyan);font-size:22px;">
          <i class="ph-fill ph-file-pdf"></i>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--neon-green);margin-bottom:4px;">
            <i class="ph-fill ph-check-circle"></i> Archivo PDF adjuntado
          </div>
          <button type="button" onclick="window._prodFactura=null;_refreshFacturaPreview();" style="background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);border-radius:6px;color:var(--danger);cursor:pointer;padding:4px 10px;font-size:11px;">
            <i class="ph ph-trash"></i> Quitar documento
          </button>
        </div>
      </div>`;
  }
}

// ─── Cálculo en tiempo real de margen y ganancias ─────────────────────────────
window.updateMargenCalc = function() {
  const cant = parseFloat(document.getElementById('prod-cantidad')?.value) || 0;
  const costo = parseFloat(document.getElementById('prod-costo')?.value) || 0;
  const margen = parseFloat(document.getElementById('prod-margen')?.value) || 0;
  const moneda = document.getElementById('prod-moneda')?.value || 'PEN';
  const sym = moneda === 'USD' ? '$ ' : 'S/ ';

  const precioVenta = costo > 0 ? costo * (1 + margen / 100) : 0;
  const gananciaUnit = precioVenta - costo;
  const gananciaTotal = gananciaUnit * cant;

  const ventaEl = document.getElementById('calc-precio-venta');
  const unitEl = document.getElementById('calc-ganancia-unit');
  const totalEl = document.getElementById('calc-ganancia-total');
  const subtextEl = document.getElementById('calc-subtext-margen');

  if (ventaEl) ventaEl.textContent = sym + precioVenta.toFixed(2);
  if (unitEl) unitEl.textContent = (gananciaUnit >= 0 ? '+' : '') + sym + gananciaUnit.toFixed(2);
  if (totalEl) totalEl.textContent = (gananciaTotal >= 0 ? '+' : '') + sym + gananciaTotal.toFixed(2);
  if (subtextEl) subtextEl.textContent = `Costo ${sym}${costo.toFixed(2)} + ${margen}% margen`;

  // Marcar botón activo
  document.querySelectorAll('.margen-quick-btn').forEach(btn => {
    const val = parseFloat(btn.dataset.pct);
    if (val === margen) {
      btn.style.background = 'rgba(0,212,255,0.22)';
      btn.style.borderColor = '#00d4ff';
      btn.style.color = '#00d4ff';
      btn.style.boxShadow = '0 0 10px rgba(0,212,255,0.3)';
    } else {
      btn.style.background = 'rgba(255,255,255,0.04)';
      btn.style.borderColor = 'var(--border)';
      btn.style.color = 'var(--text-2)';
      btn.style.boxShadow = 'none';
    }
  });
};

window.selectMargenPct = function(pct) {
  const inp = document.getElementById('prod-margen');
  if (inp) {
    inp.value = pct;
    updateMargenCalc();
  }
};

// ─── Modal Producto SIMÉTRICO Y AUTOMATIZADO ─────────────────────────────────
function openProductoModal(id = null) {
  const p = id ? AppDB.productos.getById(id) : null;
  const categorias = [...new Set([
    ...AppDB.productos.getAll().map(x => x.categoria),
    'Cables','Networking','Seguridad','Energía','Infraestructura','Accesorios','Computadoras','Impresoras','Almacenamiento','Periféricos'
  ])].filter(Boolean).sort();
  const unidades = ['un','m','kg','caja','rollo','par','kit','juego'];

  // Inicializar estado de imágenes
  if (p?.imagenes && Array.isArray(p.imagenes)) {
    window._prodImagenes = [...p.imagenes];
  } else if (p?.imagen) {
    window._prodImagenes = [p.imagen];
  } else {
    window._prodImagenes = [];
  }
  window._prodImagenActual = 0;
  window._prodFactura = p?.factura_compra || null;

  // Valores iniciales
  const defaultCant = p ? (p.stock || 1) : 1;
  const defaultCosto = p ? (p.costo_unitario || p.precio || 0) : 0;
  let defaultMargen = 30;
  if (p?.margen_ganancia !== undefined) {
    defaultMargen = p.margen_ganancia;
  } else if (p && p.precio_publico && p.precio && p.precio > 0) {
    defaultMargen = Math.round(((p.precio_publico - p.precio) / p.precio) * 100);
  }

  showModal(id ? `Editar: ${p.descripcion.substr(0,30)}` : 'Nuevo Producto', `
    <!-- Header Banner -->
    <div style="background:linear-gradient(135deg, rgba(0,212,255,0.14), rgba(20,184,166,0.06));border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(0,212,255,0.2);color:#00d4ff;display:flex;align-items:center;justify-content:center;font-size:20px;">
          <i class="ph-fill ph-package"></i>
        </div>
        <div>
          <div style="font-size:14px;font-weight:800;color:#ffffff;">Ficha de Producto Tecnológico</div>
          <div style="font-size:11px;color:#00d4ff;font-family:var(--font-mono);">Ingreso de inventario con cálculo automático de rentabilidad</div>
        </div>
      </div>
      <span class="badge badge-info" style="font-size:10px;">VENTAS & STOCK</span>
    </div>

    <!-- ── SECCIÓN 1: Identificación del Producto (2 columnas) ── -->
    <div class="form-row" style="margin-bottom:14px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Código del Producto *</label>
        <input class="form-input" id="prod-codigo" placeholder="Ej: NET-SW-24P" value="${p?.codigo||''}" style="width:100%;" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Categoría *</label>
        <select class="form-select" id="prod-categoria" style="width:100%;">
          ${categorias.map(c=>`<option value="${c}" ${p?.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- ── SECCIÓN 2: Descripción y Catálogo (2 columnas simétricas) ── -->
    <div class="form-row" style="margin-bottom:14px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Nombre / Descripción del Producto *</label>
        <input class="form-input" id="prod-desc" placeholder="Ej: Switch Administrable 24P PoE Gigabit" value="${p?.descripcion||''}" style="width:100%;" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Visible en Catálogo Público</label>
        <select class="form-select" id="prod-disp-cat" style="width:100%;">
          <option value="true" ${p?.disponible_catalogo!==false?'selected':''}>Sí — Visible para clientes</option>
          <option value="false" ${p?.disponible_catalogo===false?'selected':''}>No — Solo uso interno</option>
        </select>
      </div>
    </div>

    <!-- ── SECCIÓN 3: Ingreso y Costo Unitario (2 columnas simétricas) ── -->
    <div class="form-row" style="margin-bottom:14px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Cantidad que Ingresa *</label>
        <input class="form-input" id="prod-cantidad" type="number" min="1" step="1" value="${defaultCant}" style="width:100%;font-weight:700;" oninput="updateMargenCalc()" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Unidad de Medida *</label>
        <select class="form-select" id="prod-unidad" style="width:100%;">
          ${unidades.map(u=>`<option value="${u}" ${p?.unidad===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-row" style="margin-bottom:16px;">
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Costo Unitario de Compra *</label>
        <input class="form-input" id="prod-costo" type="number" min="0" step="0.01" value="${defaultCosto}" style="width:100%;font-weight:700;" oninput="updateMargenCalc()" placeholder="0.00" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Moneda *</label>
        <select class="form-select" id="prod-moneda" style="width:100%;" onchange="updateMargenCalc()">
          <option value="PEN" ${p?.moneda==='PEN'||!p?.moneda?'selected':''}>PEN — Soles (S/)</option>
          <option value="USD" ${p?.moneda==='USD'?'selected':''}>USD — Dólares ($)</option>
        </select>
      </div>
    </div>

    <!-- ── SECCIÓN 4: Margen de Ganancia (%) Selector Rápido ── -->
    <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <label class="form-label" style="margin:0;display:flex;align-items:center;gap:6px;">
          <i class="ph-fill ph-percent" style="color:var(--neon-cyan);"></i> Margen de Ganancia Deseado
        </label>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:var(--text-3);">Personalizado:</span>
          <input class="form-input" id="prod-margen" type="number" min="0" max="1000" step="1" value="${defaultMargen}" 
                 style="width:75px;height:32px;padding:4px 8px;text-align:center;font-weight:800;color:var(--neon-cyan);font-family:var(--font-mono);" 
                 oninput="updateMargenCalc()" />
          <span style="font-weight:800;color:var(--neon-cyan);font-size:13px;">%</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${[15, 20, 25, 30, 35, 40, 50].map(pct => `
          <button type="button" class="margen-quick-btn" data-pct="${pct}" onclick="selectMargenPct(${pct})"
                  style="flex:1;min-width:48px;padding:6px 0;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text-2);font-weight:700;font-size:12px;cursor:pointer;transition:all var(--ease);font-family:var(--font-mono);">
            ${pct}%
          </button>
        `).join('')}
      </div>
    </div>

    <!-- ── SECCIÓN 5: Tarjetas de Cálculo Automático (3 columnas) ── -->
    <div style="background:linear-gradient(135deg, rgba(0,212,255,0.09) 0%, rgba(0,255,170,0.06) 100%);border:1px solid rgba(0,212,255,0.32);border-radius:12px;padding:16px;margin-bottom:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:800;color:var(--neon-cyan);text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:6px;">
          <i class="ph-fill ph-calculator"></i> Cálculo Automático de Rentabilidad
        </div>
        <span id="calc-subtext-margen" style="font-size:11px;color:var(--text-3);font-family:var(--font-mono);"></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="background:rgba(6,13,31,0.65);border:1px solid rgba(0,212,255,0.25);border-radius:10px;padding:12px 10px;text-align:center;">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;font-weight:600;">Precio de Venta</div>
          <div id="calc-precio-venta" style="font-size:21px;font-weight:800;color:#00d4ff;font-family:var(--font-mono);">S/ 0.00</div>
          <div style="font-size:10px;color:var(--text-3);margin-top:4px;">Calculado automáticamente</div>
        </div>
        <div style="background:rgba(6,13,31,0.65);border:1px solid rgba(0,255,170,0.25);border-radius:10px;padding:12px 10px;text-align:center;">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;font-weight:600;">Ganancia / Unidad</div>
          <div id="calc-ganancia-unit" style="font-size:21px;font-weight:800;color:var(--neon-green);font-family:var(--font-mono);">+S/ 0.00</div>
          <div style="font-size:10px;color:var(--text-3);margin-top:4px;">Utilidad unitaria limpia</div>
        </div>
        <div style="background:rgba(6,13,31,0.65);border:1px solid rgba(191,95,255,0.25);border-radius:10px;padding:12px 10px;text-align:center;">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;font-weight:600;">Ganancia Total Lote</div>
          <div id="calc-ganancia-total" style="font-size:21px;font-weight:800;color:var(--purple);font-family:var(--font-mono);">+S/ 0.00</div>
          <div style="font-size:10px;color:var(--text-3);margin-top:4px;">Según cantidad que ingresa</div>
        </div>
      </div>
    </div>

    <!-- ── SECCIÓN 6: Descripción técnica / Características ── -->
    <div class="form-group" style="margin-bottom:18px;">
      <label class="form-label">Descripción Técnica / Características Clave</label>
      <textarea class="form-input" id="prod-desc-larga" rows="2" placeholder="Detalles técnicos, especificaciones, garantía…" style="width:100%;resize:vertical;">${p?.descripcion_larga||''}</textarea>
    </div>

    <!-- ── SECCIÓN 7: Imágenes de Referencia (Carrusel) ── -->
    <div style="font-size:11px;font-weight:700;color:var(--neon-cyan);letter-spacing:1px;text-transform:uppercase;margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(0,212,255,0.2);display:flex;align-items:center;gap:6px;">
      <i class="ph-fill ph-images"></i> Imágenes de Referencia (Deslizable)
    </div>

    <div id="prod-img-carrusel-wrap">
      ${_carruselHtml(window._prodImagenes, window._prodImagenActual)}
    </div>

    <div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap;">
      <input type="file" id="prod-img-file" accept="image/*" multiple style="display:none;" onchange="handleProdImageUpload(this)" />
      <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('prod-img-file').click()">
        <i class="ph ph-plus"></i> Agregar imágenes
      </button>
      <span style="font-size:11px;color:var(--text-3);">Formatos: PNG, JPG, WEBP · Puedes agregar varias y desplazarte con las flechas o puntos</span>
    </div>

    <!-- ── SECCIÓN 8: Boleta / Factura de Compra ── -->
    <div style="font-size:11px;font-weight:700;color:var(--neon-cyan);letter-spacing:1px;text-transform:uppercase;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(0,212,255,0.2);display:flex;align-items:center;gap:6px;">
      <i class="ph-fill ph-receipt"></i> Boleta o Factura de Compra
    </div>

    <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;padding:14px;">
      <div id="prod-factura-preview" style="margin-bottom:10px;">
        <span style="font-size:12px;color:var(--text-3);">Sin documento adjunto</span>
      </div>
      <div>
        <input type="file" id="prod-factura-file" accept="image/*,.pdf" style="display:none;" onchange="handleFacturaUpload(this)" />
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('prod-factura-file').click()">
          <i class="ph ph-paperclip"></i> Adjuntar Boleta / Factura (Imagen o PDF)
        </button>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveProducto('${id||''}')">
      <i class="ph ph-floppy-disk"></i> ${id ? 'Actualizar Producto' : 'Guardar Producto'}
    </button>
  `);

  // Inicializar preview de factura y cálculos dinámicos
  if (window._prodFactura) _refreshFacturaPreview();
  setTimeout(updateMargenCalc, 30);
}

function saveProducto(id) {
  const codigo      = document.getElementById('prod-codigo')?.value.trim();
  const descripcion = document.getElementById('prod-desc')?.value.trim();
  const categoria   = document.getElementById('prod-categoria')?.value;
  const cantidad    = parseInt(document.getElementById('prod-cantidad')?.value) || 0;
  const unidad      = document.getElementById('prod-unidad')?.value || 'un';
  const costo       = parseFloat(document.getElementById('prod-costo')?.value) || 0;
  const margen      = parseFloat(document.getElementById('prod-margen')?.value) || 0;
  const moneda      = document.getElementById('prod-moneda')?.value || 'PEN';
  const desc_larga  = document.getElementById('prod-desc-larga')?.value.trim() || '';
  const disp_cat    = document.getElementById('prod-disp-cat')?.value === 'true';

  if (!codigo)      { showToast('Ingrese el código del producto','warning'); return; }
  if (!descripcion) { showToast('Ingrese la descripción','warning'); return; }
  if (cantidad <= 0){ showToast('Ingrese una cantidad válida que ingresa','warning'); return; }

  const precioVenta = costo > 0 ? parseFloat((costo * (1 + margen / 100)).toFixed(2)) : 0;
  const gananciaUnit = parseFloat((precioVenta - costo).toFixed(2));
  const gananciaTotal = parseFloat((gananciaUnit * cantidad).toFixed(2));

  const imagenes = window._prodImagenes || [];
  const pData = {
    id: id || null,
    codigo,
    descripcion,
    descripcion_larga: desc_larga,
    categoria,
    stock: cantidad,                 // Cantidad ingresada
    stock_minimo: 0,
    unidad,
    costo_unitario: costo,
    precio: costo,                   // Costo base
    precio_publico: precioVenta,     // Precio de venta calculado automáticamente
    margen_ganancia: margen,
    ganancia_unitaria: gananciaUnit,
    ganancia_total: gananciaTotal,
    moneda,
    disponible_catalogo: disp_cat,
    imagenes: imagenes,
    imagen: imagenes[0] || null,
    factura_compra: window._prodFactura || null
  };

  AppDB.productos.save(pData);
  closeModal();
  showToast(id ? 'Producto actualizado' : 'Producto ingresado con éxito', 'success');
  updateSidebarBadges();
  if (typeof renderInventario === 'function') renderInventario();
}

function deleteProducto(id) {
  const p = AppDB.productos.getById(id);
  showConfirm('Eliminar Producto', `¿Eliminar <strong>${p?.descripcion}</strong>?`, () => {
    AppDB.productos.delete(id);
    showToast('Producto eliminado','warning');
    updateSidebarBadges();
    renderInventario();
  });
}

// ─── Historial de movimientos ─────────────────────────────────────────────────
function verHistorial(productoId) {
  const p    = AppDB.productos.getById(productoId);
  const movs = AppDB.movimientos.getByProducto(productoId)
    .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

  showModal(`Historial — ${p?.descripcion?.substr(0,35)}`, `
    <div style="display:flex;gap:14px;margin-bottom:16px;flex-wrap:wrap">
      <div class="summary-total-item" style="flex:1">
        <div class="summary-total-label">Cantidad actual</div>
        <div class="summary-total-value">${p?.stock} ${p?.unidad}</div>
      </div>
      <div class="summary-total-item" style="flex:1">
        <div class="summary-total-label">Costo Unitario</div>
        <div class="summary-total-value" style="color:var(--text-1)">${fmtCurrency(p?.costo_unitario||p?.precio||0, p?.moneda)}</div>
      </div>
      <div class="summary-total-item" style="flex:1">
        <div class="summary-total-label">Precio de Venta</div>
        <div class="summary-total-value" style="color:var(--neon-cyan)">${fmtCurrency(p?.precio_publico||p?.precio||0, p?.moneda)}</div>
      </div>
    </div>
    ${movs.length ? `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Fecha</th><th>Tipo</th><th class="td-right">Cantidad</th>
          <th>Referencia</th><th>Notas</th>
        </tr></thead>
        <tbody>
          ${movs.map(m=>`<tr>
            <td style="color:var(--text-2)">${fmtDate(m.fecha)}</td>
            <td>${m.tipo==='entrada'
              ? '<span class="badge badge-success"><i class="ph ph-arrow-down"></i> Entrada</span>'
              : '<span class="badge badge-warning"><i class="ph ph-arrow-up"></i> Salida</span>'}</td>
            <td class="td-right" style="font-weight:700;color:${m.tipo==='entrada'?'var(--success)':'var(--warning)'}">
              ${m.tipo==='entrada'?'+':'−'}${m.cantidad}
            </td>
            <td class="td-mono">${m.referencia||'—'}</td>
            <td style="color:var(--text-3)">${m.notas||'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : `<div class="table-empty"><i class="ph ph-clock-counter-clockwise"></i>Sin movimientos adicionales registrados</div>`}
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`, 'lg');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
