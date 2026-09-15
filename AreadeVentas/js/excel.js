/* ============================================================
   EXCEL — Import / Export con SheetJS (Detección Automática & Desduplicación)
   ============================================================ */
'use strict';

(function () {

  /* ── Mapeo de columnas y sinónimos por entidad ───────────── */
  const SCHEMAS = {
    inventario: {
      label   : 'Inventario',
      columns : [
        { key:'codigo',              label:'Código',            synonyms:['codigo','cod','sku','id_producto'] },
        { key:'descripcion',         label:'Producto',          synonyms:['producto','nombre','descripcion','item','detalle'] },
        { key:'categoria',           label:'Categoría',         synonyms:['categoria','cat','familia','rubro'] },
        { key:'stock',               label:'Stock',             synonyms:['stock','cantidad','existencias'] },
        { key:'stock_minimo',        label:'Stock Mínimo',      synonyms:['stock_minimo','stockminimo','minimo'] },
        { key:'unidad',              label:'Unidad',            synonyms:['unidad','medida','unid'] },
        { key:'precio',              label:'Precio Compra',     synonyms:['precio_compra','costo','pcompra'] },
        { key:'precio_publico',      label:'Precio Venta',      synonyms:['precio_venta','precio_publico','precioventa','pventa','pvp','precio_soles'] },
        { key:'imagen',              label:'Imagen Referencial',synonyms:['imagen_referencial','imagen','url_imagen','foto','img'] },
        { key:'descripcion_larga',   label:'Descripción Larga', synonyms:['descripcion_larga','desclarga','detalles','especificaciones'] },
        { key:'ubicacion',           label:'Ubicación',         synonyms:['ubicacion','almacen','estante'] },
      ]
    },
    proformas: {
      label   : 'Proformas',
      columns : [
        { key:'numero',              label:'N° Proforma',       synonyms:['numero_proforma','numero','proforma','n_proforma'] },
        { key:'cliente',             label:'Cliente',           synonyms:['cliente','razon_social','comprador','empresa'] },
        { key:'fecha',               label:'Fecha',             synonyms:['fecha','emision','fecha_emision'] },
        { key:'vencimiento',         label:'Vencimiento',       synonyms:['vencimiento','validez','fecha_vencimiento'] },
        { key:'estado',              label:'Estado',            synonyms:['estado','status','condicion'] },
        { key:'moneda',              label:'Moneda',            synonyms:['moneda','currency'] },
        { key:'subtotal',            label:'Subtotal',          synonyms:['subtotal','sub_total','base'] },
        { key:'impuesto',            label:'IGV',               synonyms:['igv','impuesto','tax'] },
        { key:'total',               label:'Total',             synonyms:['total','monto_total','importe'] },
        { key:'notas',               label:'Observación',       synonyms:['observacion','notas','nota','comentario'] },
      ]
    },
    facturas: {
      label   : 'Facturas',
      columns : [
        { key:'numero',              label:'N° Factura',        synonyms:['numero_factura','numero','factura','n_factura','comprobante'] },
        { key:'cliente',             label:'Cliente',           synonyms:['cliente','razon_social','comprador','empresa'] },
        { key:'fecha',               label:'Fecha',             synonyms:['fecha','emision','fecha_emision'] },
        { key:'vencimiento_pago',    label:'Vencimiento Pago',  synonyms:['vencimiento_pago','vencimiento','fecha_vencimiento'] },
        { key:'estado_pago',         label:'Estado Pago',       synonyms:['estado_pago','estado','status'] },
        { key:'moneda',              label:'Moneda',            synonyms:['moneda','currency'] },
        { key:'subtotal',            label:'Subtotal',          synonyms:['subtotal','sub_total','base'] },
        { key:'impuesto',            label:'IGV',               synonyms:['igv','impuesto','tax'] },
        { key:'total',               label:'Total',             synonyms:['total','monto_total','importe'] },
        { key:'monto_cobrado',       label:'Monto Cobrado',     synonyms:['monto_cobrado','cobrado','pagado','abono'] },
      ]
    }
  };

  /* ── Imágenes por defecto según categoría ─────────────────── */
  const DEFAULT_CAT_IMAGES = {
    'Cables'          : 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=80',
    'Networking'      : 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=600&auto=format&fit=crop&q=80',
    'Seguridad'       : 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80',
    'Energía'         : 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?w=600&auto=format&fit=crop&q=80',
    'Infraestructura' : 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
    'Accesorios'      : 'https://images.unsplash.com/photo-1609429019995-8c40f49535a5?w=600&auto=format&fit=crop&q=80',
    'Electrónica'     : 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80',
    'Impresión'       : 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80',
    'Almacenamiento'  : 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80',
    'Audio'           : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'
  };

  /* ── Extraer valor de fila con Mapeo Exacto ──────────────── */
  function extractValue(row, colDef) {
    const rowKeys = Object.keys(row);
    const targets = [colDef.label, colDef.key, ...(colDef.synonyms || [])];

    // 1. Coincidencia EXACTA normalizada
    for (const t of targets) {
      const normTarget = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      for (const k of rowKeys) {
        const normKey = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (normKey === normTarget) {
          const val = row[k];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return val;
          }
        }
      }
    }

    // 2. Coincidencia por prefijo si es de 4+ caracteres
    for (const t of targets) {
      const normTarget = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      if (normTarget.length < 4) continue;
      for (const k of rowKeys) {
        const normKey = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (normKey.startsWith(normTarget) || normTarget.startsWith(normKey)) {
          const val = row[k];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return val;
          }
        }
      }
    }

    return undefined;
  }

  /* ── Detección Inteligente de Entidad por Hoja o Columnas ──── */
  function detectSheetEntity(sheetName, rows) {
    const sName = sheetName.toLowerCase();
    if (/inventario|producto|stock|item/i.test(sName)) return 'inventario';
    if (/proforma|cotiza|presupuesto/i.test(sName)) return 'proformas';
    if (/factura|venta|comprobante/i.test(sName)) return 'facturas';

    if (rows && rows.length > 0) {
      const keys = Object.keys(rows[0]).map(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      if (keys.some(k => k.includes('codigo') || k.includes('producto') || k.includes('stock') || k.includes('precio'))) {
        return 'inventario';
      }
      if (keys.some(k => k.includes('proforma') || k.includes('cotizacion'))) {
        return 'proformas';
      }
      if (keys.some(k => k.includes('factura') || k.includes('monto_cobrado') || k.includes('vencimiento_pago'))) {
        return 'facturas';
      }
    }
    return 'inventario';
  }

  /* ── Exportar entidad individual a Excel ──────────────────── */
  window.excelExport = function (entity) {
    if (!window.XLSX) { showToast('SheetJS no disponible', 'error'); return; }
    const schema  = SCHEMAS[entity];
    if (!schema)  { showToast('Entidad no encontrada', 'error'); return; }

    const records = AppDB.getAll(entity);
    if (!records.length) { showToast('No hay datos para exportar', 'warning'); return; }

    const rows = records.map(r => {
      const obj = {};
      schema.columns.forEach(col => { obj[col.label] = r[col.key] !== undefined ? r[col.key] : ''; });
      return obj;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = schema.columns.map(col => ({
      wch: Math.max(col.label.length, ...rows.map(r => String(r[col.label] || '').length)) + 3
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, schema.label);
    const fname = `VentasPro_${schema.label}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    showToast(`✅ ${schema.label} exportado como ${fname}`, 'success');
  };

  /* ── Exportar TODO (multi-hoja) ───────────────────────────── */
  window.excelExportAll = function () {
    if (!window.XLSX) { showToast('SheetJS no disponible', 'error'); return; }
    const wb = XLSX.utils.book_new();
    let hasData = false;

    Object.entries(SCHEMAS).forEach(([entity, schema]) => {
      const records = AppDB.getAll(entity);
      if (!records.length) return;
      hasData = true;

      const rows = records.map(r => {
        const obj = {};
        schema.columns.forEach(col => { obj[col.label] = r[col.key] !== undefined ? r[col.key] : ''; });
        return obj;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = schema.columns.map(col => ({ wch: Math.max(col.label.length, ...rows.map(r => String(r[col.label] || '').length)) + 3 }));
      XLSX.utils.book_append_sheet(wb, ws, schema.label);
    });

    if (!hasData) { showToast('No hay datos para exportar', 'warning'); return; }
    const fname = `VentasPro_Completo_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    showToast(`✅ Exportado completo como ${fname}`, 'success');
  };

  /* ── Importar desde archivo (Lectura Multi-Hoja) ──────────── */
  window.excelImport = function (file, defaultEntity, onPreview) {
    if (!window.XLSX) { showToast('SheetJS no disponible', 'error'); return; }
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const wb = XLSX.read(e.target.result, { type:'array', cellDates:true });
        const sheetsData = {};

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { defval:'' });
          if (rows && rows.length > 0) {
            sheetsData[sheetName] = rows;
          }
        });

        if (Object.keys(sheetsData).length === 0) {
          showToast('El archivo Excel está vacío', 'warning');
          return;
        }

        showExcelPreviewModal(sheetsData, defaultEntity);
      } catch(err) {
        console.error('Excel import error:', err);
        showToast('Error al leer el archivo: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  /* ── Confirmar Importación con Desduplicación (Upsert) ─────── */
  window.excelConfirmImport = function (rows, entity) {
    if (!rows || !rows.length) return 0;
    const schema = SCHEMAS[entity];
    if (!schema) { showToast('Entidad inválida', 'error'); return 0; }

    let processedCount = 0;
    const nowStr = new Date().toISOString().slice(0,10);
    const existingList = AppDB.getAll(entity);

    rows.forEach((row, idx) => {
      const record = {};

      schema.columns.forEach(col => {
        const val = extractValue(row, col);
        if (val !== undefined) {
          if (['total','subtotal','impuesto','monto_cobrado','precio','precio_compra','precio_publico','precio_venta','stock','stock_minimo'].includes(col.key)) {
            const num = parseFloat(String(val).replace(/[^0-9.-]/g,''));
            record[col.key] = isNaN(num) ? 0 : num;
          } else {
            record[col.key] = String(val).trim();
          }
        }
      });

      /* Reglas especiales & desduplicación según entidad */
      if (entity === 'inventario') {
        if (!record.codigo) record.codigo = 'PROD-' + String(idx + 1).padStart(3, '0');
        if (!record.descripcion) {
          record.descripcion = extractValue(row, { label:'Producto', key:'nombre', synonyms:['producto','nombre','descripcion','item','detalle'] }) || ('Producto ' + (idx + 1));
        }
        if (!record.categoria) record.categoria = 'General';
        if (!record.unidad) record.unidad = 'un';
        if (!record.precio) record.precio = 0;
        if (!record.precio_publico) record.precio_publico = record.precio || 0;
        if (record.stock === undefined) record.stock = 0;
        if (record.stock_minimo === undefined) record.stock_minimo = 5;
        record.disponible_catalogo = true;
        if (!record.imagen) {
          record.imagen = DEFAULT_CAT_IMAGES[record.categoria] || DEFAULT_CAT_IMAGES['Electrónica'];
        }
        if (!record.ubicacion) record.ubicacion = 'Almacén Principal';
        record.moneda = 'PEN';

        const existing = existingList.find(p =>
          (p.codigo && record.codigo && p.codigo.trim().toLowerCase() === record.codigo.trim().toLowerCase()) ||
          (p.descripcion && record.descripcion && p.descripcion.trim().toLowerCase() === record.descripcion.trim().toLowerCase())
        );

        if (existing) {
          record.id = existing.id;
        } else {
          record.id = 'PROD-XL-' + Date.now() + '-' + idx;
        }
      }
      else if (entity === 'proformas') {
        if (!record.numero) record.numero = 'PRO-' + String(Date.now()).slice(-4) + '-' + (idx + 1);
        if (!record.cliente) record.cliente = 'Cliente General';
        if (!record.fecha) record.fecha = nowStr;
        if (!record.vencimiento) record.vencimiento = nowStr;
        if (!record.estado) record.estado = 'pendiente';
        record.estado = record.estado.toLowerCase();
        record.moneda = 'PEN';
        if (!record.total && record.subtotal) {
          record.impuesto = record.impuesto || (record.subtotal * 0.18);
          record.total = record.subtotal + record.impuesto;
        }

        const existing = existingList.find(p =>
          p.numero && record.numero && p.numero.trim().toLowerCase() === record.numero.trim().toLowerCase()
        );

        if (existing) {
          record.id = existing.id;
        } else {
          record.id = 'PRO-XL-' + Date.now() + '-' + idx;
        }
      }
      else if (entity === 'facturas') {
        if (!record.numero) record.numero = 'FAC-' + String(Date.now()).slice(-4) + '-' + (idx + 1);
        if (!record.cliente) record.cliente = 'Cliente General';
        if (!record.fecha) record.fecha = nowStr;
        if (!record.vencimiento_pago) record.vencimiento_pago = nowStr;
        if (!record.estado_pago) record.estado_pago = 'pendiente';
        record.estado_pago = record.estado_pago.toLowerCase();
        record.moneda = 'PEN';
        if (!record.total && record.subtotal) {
          record.impuesto = record.impuesto || (record.subtotal * 0.18);
          record.total = record.subtotal + record.impuesto;
        }
        if (record.monto_cobrado === undefined) {
          record.monto_cobrado = record.estado_pago === 'cobrada' ? (record.total || 0) : 0;
        }

        const existing = existingList.find(f =>
          f.numero && record.numero && f.numero.trim().toLowerCase() === record.numero.trim().toLowerCase()
        );

        if (existing) {
          record.id = existing.id;
        } else {
          record.id = 'FAC-XL-' + Date.now() + '-' + idx;
        }
      }

      AppDB.save(entity, record);
      processedCount++;
    });

    return processedCount;
  };

  /* ── Modal de Previsualización e Importación Inteligente ───── */
  window.showExcelPreviewModal = function (sheetsData, defaultEntity) {
    const sheetNames = Object.keys(sheetsData);
    let selectedSheet = sheetNames[0];

    function processAllSheets() {
      let totalImported = 0;
      Object.entries(sheetsData).forEach(([sName, rows]) => {
        const targetEntity = detectSheetEntity(sName, rows);
        totalImported += excelConfirmImport(rows, targetEntity);
      });

      closeModal();
      showToast(`✅ ¡Importación completa! Se procesaron ${totalImported} registros en Inventario, Proformas y Facturas.`, 'success');
      if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
      setTimeout(() => {
        if (typeof Router !== 'undefined') Router.navigate(defaultEntity || 'inventario');
      }, 300);
    }
    window.appImportAllExcelSheets = processAllSheets;

    function renderModalContent(activeSheet) {
      selectedSheet = activeSheet;
      const rows = sheetsData[activeSheet] || [];
      const cols = Object.keys(rows[0] || {});
      const preview = rows.slice(0, 5);

      const tableHeader = cols.map(c => `<th style="padding:8px 10px;font-size:11px;font-family:var(--font-mono);color:var(--neon-cyan);text-align:left;white-space:nowrap;">${c}</th>`).join('');
      const tableBody = preview.map(r =>
        `<tr>${cols.map(c => `<td style="padding:6px 10px;font-size:11px;color:var(--text-1);border-bottom:1px solid var(--border);font-family:var(--font-mono);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r[c] !== undefined ? r[c] : ''}</td>`).join('')}</tr>`
      ).join('');

      const sheetTabs = sheetNames.map(s => `
        <button class="cat-pill ${s === activeSheet ? 'active' : ''}" onclick="switchExcelPreviewSheet('${s}')" style="margin-right:6px;">
          <i class="ph-fill ph-file-text"></i> ${s} (${sheetsData[s].length})
        </button>
      `).join('');

      const autoDetected = detectSheetEntity(activeSheet, rows);
      const entityOpts = Object.entries(SCHEMAS).map(([k, v]) => `
        <option value="${k}" ${k === autoDetected ? 'selected' : ''}>${v.label}</option>
      `).join('');

      return `
        <div style="margin-bottom:16px;">
          <div style="background:linear-gradient(135deg, rgba(0,255,170,0.12), rgba(0,220,255,0.08));border:1px solid rgba(0,255,170,0.35);border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
            <div>
              <div style="font-size:13.5px;font-weight:700;color:var(--neon-green);">
                <i class="ph-fill ph-lightning"></i> Carga Automática Multi-Módulo
              </div>
              <div style="font-size:12px;color:var(--text-2);margin-top:2px;">Procesará todas las hojas (${sheetNames.join(', ')}) hacia Inventario, Proformas y Facturación de un solo clic.</div>
            </div>
            <button class="btn btn-success" onclick="appImportAllExcelSheets()" style="font-weight:800;">
              <i class="ph-fill ph-cloud-arrow-up"></i> Importar TODO (${sheetNames.length} Hojas)
            </button>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;overflow-x:auto;">
              ${sheetTabs}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;color:var(--text-3);">Destino manual:</span>
              <select class="form-select" id="import-entity-sel" style="padding:6px 12px;font-size:12px;">${entityOpts}</select>
            </div>
          </div>
        </div>

        <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;max-height:220px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:rgba(0,220,255,0.06);">${tableHeader}</tr></thead>
            <tbody>${tableBody}</tbody>
          </table>
        </div>
        ${rows.length > 5 ? `<p style="font-size:11px;color:var(--text-3);margin-top:8px;font-family:var(--font-mono);">… mostrando 5 de ${rows.length} filas en "${activeSheet}"</p>` : ''}
      `;
    }

    window.switchExcelPreviewSheet = function(sheetName) {
      const box = document.getElementById('modal-body');
      if (box) box.innerHTML = renderModalContent(sheetName);
    };

    openModal(
      `<i class="ph-fill ph-file-xls" style="color:var(--neon-green)"></i> Importar Excel · Previsualización`,
      renderModalContent(sheetNames[0]),
      [
        { label: 'Cancelar', cls: 'btn-secondary', action: closeModal },
        {
          label: '⚡ Importar TODO el Archivo (Todas las Hojas)', cls: 'btn-success', action: processAllSheets
        },
        {
          label: 'Importar Solo Hoja Actual', cls: 'btn-primary', action: () => {
            const sel = document.getElementById('import-entity-sel');
            const ent = sel ? sel.value : detectSheetEntity(selectedSheet, sheetsData[selectedSheet]);
            const rows = sheetsData[selectedSheet] || [];
            const count = excelConfirmImport(rows, ent);
            closeModal();
            showToast(`✅ Se procesaron ${count} registros en ${SCHEMAS[ent]?.label || ent}`, 'success');
            if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
            setTimeout(() => {
              if (typeof Router !== 'undefined') Router.navigate(ent === 'inventario' ? 'inventario' : ent === 'proformas' ? 'proformas' : 'facturacion');
            }, 300);
          }
        }
      ]
    );
  };

  /* ── Helper Global para Disparar Selector de Archivos ───────── */
  window.triggerExcelImport = function (entity) {
    let fileInput = document.getElementById('global-excel-file-input');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.id = 'global-excel-file-input';
      fileInput.type = 'file';
      fileInput.accept = '.xlsx, .xls, .csv';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }
    fileInput.onchange = function (e) {
      const file = e.target.files[0];
      if (file) {
        excelImport(file, entity || 'inventario');
      }
      fileInput.value = '';
    };
    fileInput.click();
  };

  /* ── Modal Unificado de Importación de Datos (Excel / CSV / Google Sheets) ── */
  window.openUnifiedImportModal = function (defaultEntity = 'inventario') {
    openModal(
      `<i class="ph-fill ph-file-arrow-up" style="color:var(--neon-cyan)"></i> Cargar Datos (Excel / Google Sheets)`,
      `
        <div style="margin-bottom:16px;">
          <!-- Tabs selector de método -->
          <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:10px;">
            <button class="cat-pill active" id="import-tab-file-btn" onclick="switchUnifiedImportTab('file')">
              <i class="ph-fill ph-file-xls"></i> 1. Archivo Excel / CSV
            </button>
            <button class="cat-pill" id="import-tab-gsheets-btn" onclick="switchUnifiedImportTab('gsheets')">
              <i class="ph-fill ph-google-logo"></i> 2. Google Sheets (URL)
            </button>
          </div>

          <!-- Contenido Pestaña 1: Archivo Excel / CSV -->
          <div id="import-tab-file-content">
            <div style="background:rgba(0,220,255,0.06);border:1px solid rgba(0,220,255,0.25);border-radius:12px;padding:12px 16px;margin-bottom:14px;">
              <div style="font-size:13px;font-weight:700;color:var(--neon-cyan);margin-bottom:4px;">
                <i class="ph-fill ph-info"></i> ¿Cómo cargar un archivo Excel?
              </div>
              <ul style="font-size:12px;color:var(--text-2);padding-left:18px;line-height:1.8;">
                <li>Soporta archivos <code>.xlsx</code> y <code>.csv</code> con una o múltiples hojas (<code>Inventario</code>, <code>Proformas</code>, <code>Facturas</code>).</li>
                <li>Si tu archivo tiene varias pestañas, el sistema las detectará e importará todas en 1 solo clic.</li>
                <li>Los datos de Inventario activan automáticamente la vista comercial en el <strong>Catálogo Público</strong>.</li>
              </ul>
            </div>

            <div style="border:2px dashed rgba(0,220,255,0.35);border-radius:16px;padding:26px 20px;text-align:center;background:rgba(0,220,255,0.03);cursor:pointer;transition:all var(--ease);"
                 onclick="triggerExcelImport('${defaultEntity}')"
                 onmouseover="this.style.borderColor='var(--neon-cyan)';this.style.background='rgba(0,220,255,0.08)'"
                 onmouseout="this.style.borderColor='rgba(0,220,255,0.35)';this.style.background='rgba(0,220,255,0.03)'">
              <i class="ph-fill ph-cloud-arrow-up" style="font-size:42px;color:var(--neon-cyan);margin-bottom:8px;display:block;"></i>
              <div style="font-size:14.5px;font-weight:700;color:#fff;margin-bottom:4px;">Haz clic aquí para seleccionar tu archivo Excel (.xlsx)</div>
              <div style="font-size:12px;color:var(--text-3);">Explora tus carpetas y selecciona tu documento de trabajo</div>
            </div>

            <div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:10px;border:1px solid var(--border);">
              <span style="font-size:12px;color:var(--text-2);"><i class="ph-fill ph-file-text" style="color:var(--neon-green)"></i> ¿No tienes un Excel listo? Descarga nuestro archivo de ejemplo con 15 productos e imágenes.</span>
              <a href="generar_excel_demo.html" target="_blank" class="btn btn-secondary btn-xs">
                <i class="ph-fill ph-download"></i> Descargar Excel Demo
              </a>
            </div>
          </div>

          <!-- Contenido Pestaña 2: Google Sheets -->
          <div id="import-tab-gsheets-content" style="display:none;">
            <div style="background:rgba(0,255,170,0.06);border:1px solid rgba(0,255,170,0.25);border-radius:12px;padding:12px 16px;margin-bottom:14px;">
              <div style="font-size:13px;font-weight:700;color:var(--neon-green);margin-bottom:4px;">
                <i class="ph-fill ph-info"></i> ¿Cómo conectar tu hoja de Google Sheets?
              </div>
              <ol style="font-size:12px;color:var(--text-2);padding-left:18px;line-height:1.8;">
                <li>En tu Google Sheet ve a: <strong>Archivo &rarr; Compartir &rarr; Publicar en la web</strong>.</li>
                <li>Selecciona el formato <strong>CSV</strong> y haz clic en <strong>Publicar</strong>.</li>
                <li>Copia la URL que aparece, pégala en el campo de abajo y presiona <strong>Importar desde Google Sheets</strong>.</li>
              </ol>
            </div>

            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label">URL de tu Google Sheet</label>
              <input class="form-input" id="u-gsheets-url" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" style="width:100%;" />
            </div>

            <div class="form-row" style="margin-bottom:0;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Módulo Destino</label>
                <select class="form-select" id="u-gsheets-entity" style="width:100%;">
                  <option value="inventario" ${defaultEntity==='inventario'?'selected':''}>Inventario (y Catálogo Público)</option>
                  <option value="proformas" ${defaultEntity==='proformas'?'selected':''}>Proformas</option>
                  <option value="facturas" ${defaultEntity==='facturas'?'selected':''}>Facturas</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Estado de conexión</label>
                <div id="u-gsheets-status" style="padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);font-size:12px;color:var(--text-3);font-family:var(--font-mono);height:38px;display:flex;align-items:center;">
                  Esperando enlace…
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      [
        { label: 'Cerrar', cls: 'btn-secondary', action: closeModal },
        {
          label: '<i class="ph-fill ph-google-logo"></i> Importar desde Google Sheets',
          cls: 'btn-success',
          action: () => {
            const rawUrl = (document.getElementById('u-gsheets-url')?.value || '').trim();
            const entity = document.getElementById('u-gsheets-entity')?.value || defaultEntity;
            const statusEl = document.getElementById('u-gsheets-status');

            if (!rawUrl) {
              if (statusEl) { statusEl.textContent = 'Ingresa una URL'; statusEl.style.color = 'var(--neon-yellow)'; }
              return;
            }

            if (typeof gSheetsUrlToCsvUrl !== 'function') {
              showToast('Módulo Google Sheets no cargado', 'error');
              return;
            }

            const csvUrl = gSheetsUrlToCsvUrl(rawUrl);
            if (!csvUrl) {
              if (statusEl) { statusEl.textContent = 'URL de GSheets inválida'; statusEl.style.color = 'var(--neon-pink)'; }
              return;
            }

            if (statusEl) { statusEl.textContent = 'Conectando…'; statusEl.style.color = 'var(--neon-cyan)'; }
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(csvUrl)}`;

            fetch(proxyUrl)
              .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
              })
              .then(csvText => {
                const rows = parseCSV(csvText);
                if (!rows || !rows.length) {
                  if (statusEl) { statusEl.textContent = 'Hoja vacía'; statusEl.style.color = 'var(--neon-yellow)'; }
                  return;
                }
                const count = excelConfirmImport(rows, entity);
                closeModal();
                showToast(`✅ ${count} registros importados desde Google Sheets`, 'success');
                if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
                setTimeout(() => {
                  if (typeof Router !== 'undefined') Router.navigate(entity === 'inventario' ? 'inventario' : entity === 'proformas' ? 'proformas' : 'facturacion');
                }, 300);
              })
              .catch(err => {
                console.error(err);
                if (statusEl) { statusEl.textContent = 'Error al conectar'; statusEl.style.color = 'var(--neon-pink)'; }
                showToast('Verifica que el Google Sheet sea público', 'error');
              });
          }
        }
      ]
    );

    window.switchUnifiedImportTab = function (tab) {
      const fileContent = document.getElementById('import-tab-file-content');
      const gsheetsContent = document.getElementById('import-tab-gsheets-content');
      const fileBtn = document.getElementById('import-tab-file-btn');
      const gsheetsBtn = document.getElementById('import-tab-gsheets-btn');

      if (tab === 'file') {
        if (fileContent) fileContent.style.display = 'block';
        if (gsheetsContent) gsheetsContent.style.display = 'none';
        if (fileBtn) fileBtn.classList.add('active');
        if (gsheetsBtn) gsheetsBtn.classList.remove('active');
      } else {
        if (fileContent) fileContent.style.display = 'none';
        if (gsheetsContent) gsheetsContent.style.display = 'block';
        if (fileBtn) fileBtn.classList.remove('active');
        if (gsheetsBtn) gsheetsBtn.classList.add('active');
      }
    };
  };

})();
