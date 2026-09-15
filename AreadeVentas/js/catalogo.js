/**
 * catalogo.js — Catálogo Visual de Productos de Tecnología
 * Con carrito accesible permanentemente en el lado inferior izquierdo (sidebar),
 * formulario para que el cliente ingrese sus datos de contacto y carga directa a Pedidos.
 */
'use strict';

/* ── Configuración predeterminada del catálogo ─────────────────────────────── */
const CatalogoConfig = {
  KEY: 'vp_catalogo_config',

  getDefaults() {
    return {
      nombre_empresa    : 'VentasPro',
      lema              : 'Soluciones Tecnológicas de Alta Calidad',
      telefono_ventas   : '+51 999 888 777',
      whatsapp          : '51999888777',
      email_ventas      : 'ventas@ventaspro.com',
      mensaje_bienvenida: '¡Hola! Me comunico desde el Catálogo Digital de VentasPro. Solicito información y cotización del siguiente artículo:',
      mostrar_precios   : true,
      mostrar_stock     : false, // Solo info relevante para el cliente
    };
  },

  get() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(this.KEY));
      return Object.assign({}, this.getDefaults(), stored || {});
    } catch { return this.getDefaults(); }
  }
};

/* ── Estado del módulo ───────────────────────────────────────────────────────── */
let _catFiltroCategoria = '';
let _catFiltroTexto     = '';
let _catFiltroPrecio    = '';

/* ── Íconos y colores por categoría ─────────────────────────────────────────── */
const CAT_ICONS = {
  'Cables'          : 'ph-fill ph-plug',
  'Networking'      : 'ph-fill ph-wifi-high',
  'Seguridad'       : 'ph-fill ph-shield-check',
  'Energía'         : 'ph-fill ph-lightning',
  'Infraestructura' : 'ph-fill ph-hard-drives',
  'Accesorios'      : 'ph-fill ph-wrench',
  'Computadoras'    : 'ph-fill ph-desktop',
  'Impresoras'      : 'ph-fill ph-printer'
};

const CAT_COLORS = {
  'Cables'          : { bg:'rgba(0,240,255,0.18)',  border:'rgba(0,240,255,0.5)',  icon:'#00f0ff' },
  'Networking'      : { bg:'rgba(0,255,157,0.18)',  border:'rgba(0,255,157,0.5)',  icon:'#00ff9d' },
  'Seguridad'       : { bg:'rgba(192,66,255,0.18)', border:'rgba(192,66,255,0.5)', icon:'#c042ff' },
  'Energía'         : { bg:'rgba(255,214,0,0.18)',  border:'rgba(255,214,0,0.5)',  icon:'#ffd600' },
  'Infraestructura' : { bg:'rgba(255,112,67,0.18)', border:'rgba(255,112,67,0.5)', icon:'#ff7043' },
  'Accesorios'      : { bg:'rgba(59,130,246,0.18)', border:'rgba(59,130,246,0.5)', icon:'#3b82f6' },
  'Computadoras'    : { bg:'rgba(0,240,255,0.18)',  border:'rgba(0,240,255,0.5)',  icon:'#00f0ff' },
  'Impresoras'      : { bg:'rgba(0,255,157,0.18)',  border:'rgba(0,255,157,0.5)',  icon:'#00ff9d' }
};

function getCatColor(cat) {
  return CAT_COLORS[cat] || { bg:'rgba(0,212,255,0.08)', border:'rgba(0,212,255,0.2)', icon:'#00d4ff' };
}

/* ── Fallback seguro de imágenes ─────────────────────────────────────────────── */
window.handleCatImgError = function(img, cat) {
  img.onerror = null;
  const col = getCatColor(cat);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='100%' height='100%' fill='#081226'/><circle cx='200' cy='120' r='60' fill='${col.bg}' stroke='${col.border}' stroke-width='2'/><text x='200' y='128' font-family='sans-serif' font-size='36' fill='${col.icon}' text-anchor='middle'>⚡</text><text x='200' y='210' font-family='sans-serif' font-size='14' font-weight='bold' fill='#00d4ff' text-anchor='middle'>${cat || 'PRODUCTO'}</text></svg>`;
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

/* ─── GESTOR DE CARRITO DE PEDIDOS (+) ───────────────────────────────────────── */
window.CatalogoCart = {
  KEY: 'vp_catalogo_cart',
  CLIENT_KEY: 'vp_catalogo_client_info',

  getItems() {
    try {
      return JSON.parse(sessionStorage.getItem(this.KEY)) || [];
    } catch { return []; }
  },

  saveItems(items) {
    sessionStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBar();
  },

  getClientInfo() {
    try {
      return JSON.parse(sessionStorage.getItem(this.CLIENT_KEY)) || {};
    } catch { return {}; }
  },

  saveClientInfo(info) {
    sessionStorage.setItem(this.CLIENT_KEY, JSON.stringify(info));
  },

  add(productId, qty = 1) {
    const p = AppDB.productos.getById(productId);
    if (!p) return;
    const items = this.getItems();
    const existing = items.find(i => i.id === productId);
    if (existing) {
      existing.cantidad += qty;
    } else {
      items.push({
        id: p.id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        precio: parseFloat(p.precio_publico || p.precio || 0),
        moneda: p.moneda || 'PEN',
        unidad: p.unidad || 'un',
        imagen: p.imagen || null,
        categoria: p.categoria || 'Tecnología',
        cantidad: qty
      });
    }
    this.saveItems(items);
    showToast(`✓ Agregado al pedido: ${p.descripcion.substring(0, 26)}...`, 'success');
  },

  updateQty(productId, delta) {
    let items = this.getItems();
    const item = items.find(i => i.id === productId);
    if (item) {
      item.cantidad += delta;
      if (item.cantidad <= 0) {
        items = items.filter(i => i.id !== productId);
      }
    }
    this.saveItems(items);
    this.renderCartModal();
  },

  remove(productId) {
    let items = this.getItems().filter(i => i.id !== productId);
    this.saveItems(items);
    this.renderCartModal();
  },

  clear(rerender = true) {
    this.saveItems([]);
    if (rerender) this.renderCartModal();
  },

  count() {
    return this.getItems().reduce((sum, item) => sum + item.cantidad, 0);
  },

  total() {
    return this.getItems().reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  },

  /* Actualiza permanentemente el widget en el lado inferior izquierdo (sidebar) */
  updateBar() {
    const totalCount = this.count();
    const totalMonto = this.total();

    const sideBadge = document.getElementById('sidebar-cart-badge');
    const sideCount = document.getElementById('sidebar-cart-count-txt');
    const sideTotal = document.getElementById('sidebar-cart-total-txt');
    const sideWidget= document.getElementById('sidebar-cart-widget');
    const topBadge  = document.getElementById('cat-cart-badge');

    if (topBadge) {
      topBadge.textContent = totalCount;
      topBadge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    }

    if (sideBadge) sideBadge.textContent = totalCount;
    if (sideCount) sideCount.textContent = `${totalCount} ${totalCount === 1 ? 'producto' : 'productos'}`;
    if (sideTotal) sideTotal.textContent = `S/ ${totalMonto.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

    if (sideWidget) {
      if (totalCount > 0) {
        sideWidget.style.borderColor = '#00d4ff';
        sideWidget.style.boxShadow = '0 0 16px rgba(0,212,255,0.3)';
        if (sideBadge) sideBadge.style.background = '#00ff9d';
      } else {
        sideWidget.style.borderColor = 'rgba(0,212,255,0.25)';
        sideWidget.style.boxShadow = 'none';
        if (sideBadge) sideBadge.style.background = '#00d4ff';
      }
    }
  },

  openModal() {
    this.renderCartModal();
  },

  renderCartModal() {
    const items = this.getItems();
    const total = this.total();
    const sym = { PEN: 'S/ ', USD: '$ ' };
    const client = this.getClientInfo();

    let content = '';
    if (!items.length) {
      content = `
        <div style="text-align:center;padding:36px 16px;">
          <div style="width:64px;height:64px;border-radius:16px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--neon-cyan);font-size:32px;">
            <i class="ph-fill ph-shopping-bag"></i>
          </div>
          <h3 style="font-size:16px;color:#fff;margin-bottom:6px;">Tu lista de pedido está vacía</h3>
          <p style="font-size:13px;color:var(--text-3);max-width:340px;margin:0 auto 20px;">
            Presiona el botón <strong>(+)</strong> en los productos que deseas cotizar o comprar.
          </p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">Explorar catálogo</button>
        </div>
      `;
    } else {
      content = `
        <!-- Lista de productos en pedido -->
        <div style="display:flex;flex-direction:column;gap:8px;max-height:240px;overflow-y:auto;padding-right:4px;">
          ${items.map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:9px 12px;gap:12px;">
              <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;background:rgba(0,212,255,0.1);flex-shrink:0;border:1px solid rgba(0,212,255,0.2);display:flex;align-items:center;justify-content:center;">
                ${item.imagen
                  ? `<img src="${item.imagen}" style="width:100%;height:100%;object-fit:cover;" onerror="handleCatImgError(this, '${item.categoria}')" />`
                  : `<i class="ph ph-package" style="color:var(--neon-cyan);font-size:20px;"></i>`}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.descripcion}</div>
                <div style="font-size:11px;color:var(--text-3);font-family:var(--font-mono);">${item.codigo} · ${sym[item.moneda] || 'S/ '}${item.precio.toFixed(2)} / ${item.unidad}</div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <button type="button" onclick="CatalogoCart.updateQty('${item.id}', -1)" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;">−</button>
                <span style="font-size:12.5px;font-weight:800;font-family:var(--font-mono);min-width:20px;text-align:center;color:#00d4ff;">${item.cantidad}</span>
                <button type="button" onclick="CatalogoCart.updateQty('${item.id}', 1)" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;">+</button>
              </div>
              <div style="font-size:13px;font-weight:800;color:var(--neon-cyan);font-family:var(--font-mono);min-width:75px;text-align:right;">
                ${sym[item.moneda] || 'S/ '}${(item.precio * item.cantidad).toFixed(2)}
              </div>
              <button type="button" onclick="CatalogoCart.remove('${item.id}')" title="Quitar del pedido" style="background:transparent;border:none;color:var(--danger);cursor:pointer;padding:4px;font-size:14px;">
                <i class="ph ph-trash"></i>
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Total de la cotización -->
        <div style="background:linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,255,170,0.06));border:1px solid rgba(0,212,255,0.25);border-radius:10px;padding:10px 16px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:12px;color:var(--text-2);font-weight:600;">Total del Pedido (${items.length} artículos):</div>
          <div style="font-size:20px;font-weight:800;color:#00d4ff;font-family:var(--font-mono);">S/ ${total.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>

        <!-- DATOS DEL CLIENTE PARA QUE EL AGENTE LO CONTACTE -->
        <div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.22);border-radius:12px;padding:14px 16px;margin-bottom:10px;">
          <div style="font-size:11.5px;font-weight:800;color:var(--neon-cyan);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <i class="ph-fill ph-user-circle"></i> Datos de Contacto para el Agente Comercial
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:4px;display:block;">Nombre completo o Empresa *</label>
              <input class="form-input" id="cart-cliente-nombre" placeholder="Ej: Carlos Mendoza / Inversiones SAC" style="width:100%;height:34px;font-size:12px;" value="${client.nombre||''}" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:4px;display:block;">Teléfono o Celular de Contacto *</label>
              <input class="form-input" id="cart-cliente-telefono" placeholder="Ej: +51 987 654 321" style="width:100%;height:34px;font-size:12px;" value="${client.telefono||''}" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:4px;display:block;">Correo electrónico (opcional)</label>
              <input class="form-input" id="cart-cliente-email" type="email" placeholder="contacto@cliente.com" style="width:100%;height:34px;font-size:12px;" value="${client.email||''}" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:4px;display:block;">Dirección de Entrega / Observaciones</label>
              <input class="form-input" id="cart-cliente-notas" placeholder="Ej: Despacho a Miraflores / Factura con RUC" style="width:100%;height:34px;font-size:12px;" value="${client.notas||''}" />
            </div>
          </div>
        </div>
      `;
    }

    showModal(
      `<div style="display:flex;align-items:center;gap:8px;"><i class="ph-fill ph-shopping-bag" style="color:var(--neon-cyan)"></i> Solicitud de Pedido (${items.length} productos)</div>`,
      content,
      items.length ? `
        <button type="button" class="btn btn-ghost btn-sm" onclick="CatalogoCart.clear()" style="color:var(--danger);">Vaciar</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Seguir viendo</button>
        <button type="button" class="btn btn-success" onclick="CatalogoCart.consultarWhatsApp()">
          <i class="ph-fill ph-whatsapp-logo"></i> Consultar WhatsApp
        </button>
        <button type="button" class="btn btn-primary" onclick="CatalogoCart.cargarPedido()">
          <i class="ph-fill ph-check-circle"></i> Cargar Pedido
        </button>
      ` : `<button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`,
      'lg'
    );
  },

  /* Obtiene y valida los datos de contacto del cliente */
  getFormData() {
    const nombre   = (document.getElementById('cart-cliente-nombre')?.value || '').trim();
    const telefono = (document.getElementById('cart-cliente-telefono')?.value || '').trim();
    const email    = (document.getElementById('cart-cliente-email')?.value || '').trim();
    const notas    = (document.getElementById('cart-cliente-notas')?.value || '').trim();

    if (!nombre) {
      showToast('Por favor ingrese su nombre o empresa para registrar el pedido', 'warning');
      document.getElementById('cart-cliente-nombre')?.focus();
      return null;
    }
    if (!telefono) {
      showToast('Por favor ingrese un número de teléfono o celular de contacto', 'warning');
      document.getElementById('cart-cliente-telefono')?.focus();
      return null;
    }

    const info = { nombre, telefono, email, notas };
    this.saveClientInfo(info);
    return info;
  },

  /* Carga el pedido directamente en el sistema comercial con estado 'en_espera' */
  cargarPedido() {
    const items = this.getItems();
    if (!items.length) return;

    const cliente = this.getFormData();
    if (!cliente) return;

    const subtotal = items.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const impuesto = subtotal * 0.18;
    const total = subtotal + impuesto;

    // Genera código tipo PED-0001
    const allPros = AppDB.proformas.getAll();
    let max = 0;
    allPros.forEach(item => {
      const n = parseInt((item.numero || '').replace(/\D/g, '')) || 0;
      if (n > max) max = n;
    });
    const nextCode = `PED-${String(max + 1).padStart(4, '0')}`;

    const nuevoPedido = {
      id: AppDB.uid ? AppDB.uid('PED') : `PED-${Date.now()}`,
      numero: nextCode,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email || '',
      direccion: cliente.notas || '',
      origen: 'catalogo',
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      vencimiento: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      moneda: 'PEN',
      items: items.map(i => ({
        producto_id: i.id,
        codigo: i.codigo,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        unidad: i.unidad,
        precio: i.precio,
        descuento: 0,
        subtotal: i.precio * i.cantidad
      })),
      subtotal: subtotal,
      impuesto: impuesto,
      total: total,
      estado: 'en_espera', // Activa la alerta visual de pedido en espera
      notas: cliente.notas || 'Pedido originado desde el Catálogo Digital'
    };

    AppDB.proformas.save(nuevoPedido);
    this.clear(false);
    closeModal();
    updateSidebarBadges();
    showToast(`✓ ¡Pedido ${nuevoPedido.numero} cargado con éxito! Se notificó al agente comercial.`, 'success');
    Router.navigate('proformas');
  },

  /* Prepara mensaje y abre el modal de WhatsApp con los datos del cliente */
  consultarWhatsApp() {
    const cliente = this.getFormData();
    if (!cliente) return;
    openDemoWhatsAppModal(null, true, cliente);
  }
};

/* ─── MODAL EXPLICATIVO DEMO DE WHATSAPP ─────────────────────────────────────── */
window.openDemoWhatsAppModal = function(productId = null, isCart = false, clientData = null) {
  const cfg = CatalogoConfig.get();
  let itemInfo = '';

  if (isCart) {
    const items = CatalogoCart.getItems();
    const total = CatalogoCart.total();
    const c = clientData || CatalogoCart.getClientInfo();

    itemInfo = [
      `👤 *DATOS DEL CLIENTE:*`,
      `• *Contacto:* ${c.nombre || 'Cliente interesado'}`,
      `• *Teléfono:* ${c.telefono || 'No especificado'}`,
      c.email ? `• *Email:* ${c.email}` : '',
      c.notas ? `• *Dirección / Notas:* ${c.notas}` : '',
      '',
      `📦 *DETALLE DEL PEDIDO (${items.length} artículos):*`,
      ...items.map(i => `• ${i.descripcion} [x${i.cantidad} ${i.unidad}] — S/ ${(i.precio * i.cantidad).toFixed(2)}`),
      '',
      `💰 *Total Estimado:* S/ ${total.toFixed(2)}`
    ].filter(line => line !== false).join('\n');
  } else if (productId) {
    const p = AppDB.productos.getById(productId);
    if (p) {
      const precio = parseFloat(p.precio_publico || p.precio || 0);
      itemInfo = `*Producto:* ${p.descripcion}\n*Código:* ${p.codigo}\n*Precio:* S/ ${precio.toFixed(2)} / ${p.unidad}`;
    }
  } else {
    itemInfo = 'Solicitud de información sobre artículos y cotización corporativa.';
  }

  const sampleMsg = `${cfg.mensaje_bienvenida}\n\n${itemInfo}`;

  showModal(
    '<div style="display:flex;align-items:center;gap:8px;"><i class="ph-fill ph-whatsapp-logo" style="color:#25d366;"></i> Canal Oficial de WhatsApp (Demostración)</div>',
    `
      <div style="text-align:center;padding:8px 0 16px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#25d366;font-size:30px;">
          <i class="ph-fill ph-whatsapp-logo"></i>
        </div>
        <h3 style="font-size:16px;color:#fff;margin-bottom:6px;font-weight:800;">Enlace a WhatsApp del Agente Comercial</h3>
        <p style="font-size:12.5px;color:var(--text-2);line-height:1.5;max-width:420px;margin:0 auto 14px;">
          En el entorno de producción, este botón abre de inmediato el chat de WhatsApp con el asesor (<strong style="color:#25d366;">${cfg.telefono_ventas}</strong>), transmitiendo la lista completa del pedido y los datos de contacto del cliente.
        </p>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--neon-cyan);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
          <i class="ph-fill ph-chat-circle-dots"></i> Mensaje redactado automáticamente para el agente:
        </div>
        <div style="background:rgba(6,12,25,0.7);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:10px;font-family:var(--font-mono);font-size:11px;color:var(--text-2);line-height:1.5;max-height:180px;overflow-y:auto;white-space:pre-wrap;">${sampleMsg}</div>
      </div>

      <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
        <i class="ph-fill ph-info" style="font-size:16px;color:#00d4ff;flex-shrink:0;"></i>
        <div style="font-size:11px;color:var(--text-3);line-height:1.4;">
          <strong>Nota de Demostración:</strong> La redirección externa está pausada en esta maqueta interactiva para que puedas seguir evaluando el panel comercial sin salir de la plataforma.
        </div>
      </div>
    `,
    `
      <button type="button" class="btn btn-primary" onclick="closeModal()">Entendido</button>
    `,
    'md'
  );
};

/* ─── RENDER PRINCIPAL DEL CATÁLOGO ─────────────────────────────────────────── */
function renderCatalogo() {
  const cfg   = CatalogoConfig.get();
  const prods = AppDB.productos.getAll().filter(p => p.disponible_catalogo !== false);
  const cats  = [...new Set(prods.map(p => p.categoria))].sort();

  document.getElementById('main-content').innerHTML = `
<!-- ═══════════════════════════════════════════
     HERO DEL CATÁLOGO
══════════════════════════════════════════════ -->
<div class="cat-hero">
  <div class="cat-hero-bg"></div>
  <div class="cat-hero-content">
    <div class="cat-hero-badge">
      <i class="ph-fill ph-storefront"></i>
      Catálogo Oficial de Productos
    </div>
    <h1 class="cat-hero-title">${cfg.nombre_empresa}</h1>
    <p class="cat-hero-subtitle">${cfg.lema}</p>

    <!-- Mensaje profesional de contacto -->
    <div style="background:rgba(0,212,255,0.09);border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:12px 18px;margin:14px 0 18px;max-width:740px;display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;border-radius:8px;background:rgba(0,212,255,0.18);display:flex;align-items:center;justify-content:center;color:#00d4ff;font-size:18px;flex-shrink:0;">
        <i class="ph-fill ph-headset"></i>
      </div>
      <div style="font-size:12.5px;color:var(--text-1);line-height:1.5;">
        Para más información sobre nuestros artículos, disponibilidad técnica o cotizaciones corporativas, comunícate con nuestros asesores comerciales a través de los siguientes contactos oficiales:
      </div>
    </div>

    <!-- Barra de contactos comerciales -->
    <div class="cat-contact-bar">
      <button type="button" class="cat-contact-btn cat-contact-phone" onclick="showToast('Línea de atención comercial: ${cfg.telefono_ventas}', 'info')">
        <i class="ph-fill ph-phone"></i>
        <span>${cfg.telefono_ventas}</span>
      </button>
      <button type="button" class="cat-contact-btn cat-contact-wa" onclick="openDemoWhatsAppModal()">
        <i class="ph-fill ph-whatsapp-logo"></i>
        <span>WhatsApp Comercial</span>
      </button>
      <button type="button" class="cat-contact-btn cat-contact-email" onclick="showToast('Correo comercial oficial: ${cfg.email_ventas}', 'info')">
        <i class="ph-fill ph-envelope"></i>
        <span>${cfg.email_ventas}</span>
      </button>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     FILTROS Y BUSCADOR
══════════════════════════════════════════════ -->
<div class="cat-filters">
  <div class="cat-search-wrap">
    <i class="ph ph-magnifying-glass cat-search-icon"></i>
    <input
      type="search"
      id="cat-search"
      class="cat-search-input"
      placeholder="Buscar artículo por código o descripción…"
      oninput="catFilter()"
    />
  </div>
  <div class="cat-category-pills" id="cat-pills">
    <button type="button" class="cat-pill active" data-cat="" onclick="catSetCat(this, '')">Todos</button>
    ${cats.map(c => `<button type="button" class="cat-pill" data-cat="${c}" onclick="catSetCat(this,'${c}')">${c}</button>`).join('')}
  </div>
  <div class="cat-filter-right">
    <select class="cat-price-select" id="cat-price-filter" onchange="catFilter()">
      <option value="">Todos los precios</option>
      <option value="0-100">Hasta S/ 100</option>
      <option value="100-500">S/ 100 – 500</option>
      <option value="500-1000">S/ 500 – 1,000</option>
      <option value="1000+">Más de S/ 1,000</option>
    </select>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     GRID DE PRODUCTOS
══════════════════════════════════════════════ -->
<div class="cat-grid" id="cat-grid"></div>
`;

  catRenderGrid(prods, cfg);
  CatalogoCart.updateBar();
}

/* ── Filtrar productos ──────────────────────────────────────────────────────── */
function catFilter() {
  _catFiltroTexto  = (document.getElementById('cat-search')?.value || '').toLowerCase();
  _catFiltroPrecio = document.getElementById('cat-price-filter')?.value || '';

  let prods = AppDB.productos.getAll().filter(p => p.disponible_catalogo !== false);

  if (_catFiltroCategoria) {
    prods = prods.filter(p => p.categoria === _catFiltroCategoria);
  }

  if (_catFiltroTexto) {
    prods = prods.filter(p =>
      p.descripcion.toLowerCase().includes(_catFiltroTexto) ||
      p.codigo.toLowerCase().includes(_catFiltroTexto) ||
      (p.descripcion_larga && p.descripcion_larga.toLowerCase().includes(_catFiltroTexto))
    );
  }

  if (_catFiltroPrecio) {
    prods = prods.filter(p => {
      const pr = parseFloat(p.precio_publico || p.precio || 0);
      if (_catFiltroPrecio === '0-100')    return pr <= 100;
      if (_catFiltroPrecio === '100-500')  return pr > 100 && pr <= 500;
      if (_catFiltroPrecio === '500-1000') return pr > 500 && pr <= 1000;
      if (_catFiltroPrecio === '1000+')    return pr > 1000;
      return true;
    });
  }

  catRenderGrid(prods, CatalogoConfig.get());
}

function catSetCat(btn, cat) {
  _catFiltroCategoria = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  catFilter();
}

/* ── Renderizar Grid de Tarjetas ────────────────────────────────────────────── */
function catRenderGrid(prods, cfg) {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;

  if (!prods.length) {
    grid.innerHTML = `
      <div class="cat-empty" style="padding:60px 20px;">
        <i class="ph-fill ph-storefront" style="font-size:56px;color:var(--neon-cyan);opacity:0.7;margin-bottom:12px;"></i>
        <h3 style="font-size:18px;color:#fff;margin-bottom:6px;">No se encontraron artículos</h3>
        <p style="font-size:13.5px;color:var(--text-3);margin-bottom:20px;max-width:480px;">Prueba seleccionando otra categoría o limpiando los filtros.</p>
        <button type="button" class="btn btn-secondary btn-sm" onclick="catClearFilters()">
          <i class="ph ph-arrow-counter-clockwise"></i> Restablecer Filtros
        </button>
      </div>
    `;
    return;
  }

  const sym = { PEN:'S/ ', USD:'$ ', EUR:'€ ' };

  grid.innerHTML = prods.map(p => {
    const color    = getCatColor(p.categoria);
    const icon     = CAT_ICONS[p.categoria] || 'ph-fill ph-cube';
    const imagen   = p.imagen || (p.imagenes && p.imagenes[0]) || null;
    const precio   = parseFloat(p.precio_publico || p.precio || 0);
    const moneda   = p.moneda || 'PEN';
    const precioFmt= (sym[moneda] || 'S/ ') + precio.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
    const descCorta= (p.descripcion_larga || p.descripcion || '').substring(0, 105);

    return `
<div class="cat-card" onclick="openCatProducto('${p.id}')">
  <!-- Imagen -->
  <div class="cat-card-img-wrap" style="background:${color.bg};border-bottom:1px solid ${color.border};">
    ${imagen
      ? `<img src="${imagen}" alt="${p.descripcion}" class="cat-card-img" loading="lazy" onerror="handleCatImgError(this, '${p.categoria}')" />`
      : `<div class="cat-card-icon-ph" style="color:${color.icon}"><i class="${icon}"></i></div>`
    }
    <div class="cat-card-category-tag" style="background:${color.bg};border-color:${color.border};color:${color.icon};">${p.categoria}</div>
    <span class="cat-stock-badge cat-stock-ok">Disponible</span>
  </div>
  <!-- Info -->
  <div class="cat-card-body">
    <div class="cat-card-code">${p.codigo}</div>
    <h3 class="cat-card-name">${p.descripcion}</h3>
    <p class="cat-card-desc">${descCorta}</p>
    <div class="cat-card-footer">
      ${cfg.mostrar_precios
        ? `<div class="cat-card-price">${precioFmt}<span class="cat-card-unit"> / ${p.unidad}</span></div>`
        : `<div class="cat-card-price" style="font-size:13px;color:var(--text-3);">Consultar precio</div>`
      }
      
      <!-- Acciones: Botón (+) para pedido y WhatsApp demostrativo -->
      <div class="cat-card-actions">
        <button type="button" class="cat-card-add-btn" title="Agregar al pedido (+)"
          onclick="event.stopPropagation(); CatalogoCart.add('${p.id}')">
          <i class="ph-bold ph-plus"></i>
        </button>
        <button type="button" class="cat-card-wa-btn" title="Consultar por WhatsApp (Demostración)"
          onclick="event.stopPropagation(); openDemoWhatsAppModal('${p.id}')">
          <i class="ph-fill ph-whatsapp-logo"></i>
        </button>
      </div>
    </div>
  </div>
</div>`;
  }).join('');
}

/* ── Modal Detalle de Producto ──────────────────────────────────────────────── */
function openCatProducto(id) {
  const p = AppDB.productos.getById(id);
  if (!p) return;

  const cfg     = CatalogoConfig.get();
  const color   = getCatColor(p.categoria);
  const icon    = CAT_ICONS[p.categoria] || 'ph-fill ph-cube';
  const sym     = { PEN:'S/ ', USD:'$ ', EUR:'€ ' };
  const precio  = parseFloat(p.precio_publico || p.precio || 0);
  const moneda  = p.moneda || 'PEN';
  const precFmt = (sym[moneda] || 'S/ ') + precio.toLocaleString('es-PE', {minimumFractionDigits:2,maximumFractionDigits:2});
  const imagen  = p.imagen || (p.imagenes && p.imagenes[0]) || null;

  const body = `
<div class="cat-detail-wrap">
  <!-- Imagen grande -->
  <div class="cat-detail-img-wrap" style="background:${color.bg};">
    ${imagen
      ? `<img src="${imagen}" alt="${p.descripcion}" class="cat-detail-img" onerror="handleCatImgError(this, '${p.categoria}')" />`
      : `<div class="cat-detail-icon-ph" style="color:${color.icon}"><i class="${icon}"></i></div>`
    }
  </div>

  <!-- Info relevante para el cliente -->
  <div class="cat-detail-info">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span class="cat-card-category-tag" style="background:${color.bg};border-color:${color.border};color:${color.icon};position:relative;top:0;">${p.categoria}</span>
      <span class="cat-stock-badge cat-stock-ok">✓ Disponible para entrega</span>
    </div>
    <h2 class="cat-detail-title">${p.descripcion}</h2>
    <div class="cat-detail-code">Código del producto: <strong>${p.codigo}</strong></div>
    <p class="cat-detail-desc">${p.descripcion_larga || p.descripcion}</p>

    ${cfg.mostrar_precios ? `
    <div class="cat-detail-price-box">
      <div class="cat-detail-price">${precFmt}</div>
      <div class="cat-detail-unit">por ${p.unidad} (con garantía comercial)</div>
    </div>` : `
    <div class="cat-detail-price-box">
      <div class="cat-detail-price" style="font-size:18px;color:var(--text-3)">Precio a consultar</div>
    </div>`}

    <!-- Botones de contacto y pedido -->
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" onclick="CatalogoCart.add('${p.id}'); closeModal();" style="flex:1;min-width:160px;justify-content:center;padding:10px 16px;">
        <i class="ph-bold ph-plus"></i> Agregar al Pedido
      </button>
      <button type="button" class="btn btn-success" onclick="openDemoWhatsAppModal('${p.id}')" style="flex:1;min-width:160px;justify-content:center;padding:10px 16px;">
        <i class="ph-fill ph-whatsapp-logo"></i> Consultar WhatsApp
      </button>
    </div>

    <!-- Especificaciones de interés para el cliente -->
    <div class="cat-detail-specs" style="margin-top:18px;">
      <div class="cat-detail-spec-title">Ficha Informativa</div>
      <div class="cat-detail-spec-grid">
        <div class="cat-spec-item"><span class="cat-spec-key">Código</span><span class="cat-spec-val">${p.codigo}</span></div>
        <div class="cat-spec-item"><span class="cat-spec-key">Categoría</span><span class="cat-spec-val">${p.categoria}</span></div>
        <div class="cat-spec-item"><span class="cat-spec-key">Presentación</span><span class="cat-spec-val">Por ${p.unidad}</span></div>
        <div class="cat-spec-item"><span class="cat-spec-key">Garantía</span><span class="cat-spec-val">12 meses oficial</span></div>
      </div>
    </div>
  </div>
</div>`;

  showModal(p.descripcion, body, `
    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    <button type="button" class="btn btn-primary" onclick="CatalogoCart.add('${p.id}'); closeModal();">
      <i class="ph-bold ph-plus"></i> Agregar al Pedido
    </button>
  `, 'xl');
}

/* ── Limpiar filtros ────────────────────────────────────────────────────────── */
function catClearFilters() {
  _catFiltroCategoria = '';
  _catFiltroTexto     = '';
  _catFiltroPrecio    = '';
  const search = document.getElementById('cat-search');
  const price  = document.getElementById('cat-price-filter');
  if (search) search.value = '';
  if (price)  price.value  = '';
  document.querySelectorAll('.cat-pill').forEach((b, i) => {
    if (i === 0) b.classList.add('active');
    else b.classList.remove('active');
  });
  catFilter();
}
