/* ============================================================
   GOOGLE SHEETS — Importación directa desde URL publicada
   ============================================================
   Flujo:
   1. Usuario pega el link de Google Sheets (compartido o publicado)
   2. El sistema convierte la URL al formato de descarga CSV
   3. Se descarga el CSV y se parsea con lógica propia
   4. Se mapean columnas al módulo destino (igual que Excel)
   5. Se guardan con excelConfirmImport (con desduplicación)
   ============================================================ */
'use strict';

/* ── Convertir cualquier URL de Google Sheets → CSV de descarga ── */
function gSheetsUrlToCsvUrl(rawUrl) {
  const url = rawUrl.trim();
  if (url.includes('/export?') && url.includes('format=csv')) return url;
  if (url.includes('/pub?')    && url.includes('output=csv'))  return url;

  const matchId  = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!matchId) return null;
  const sheetId = matchId[1];

  const matchGid = url.match(/[#&?]gid=([0-9]+)/);
  const gid = matchGid ? matchGid[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

/* ── Parsear CSV (maneja comillas y comas dentro de campos) ── */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  function parseLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.every(v => v === '')) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] !== undefined ? values[idx] : ''; });
    rows.push(obj);
  }
  return rows;
}

/* ── Abrir Modal de Conexión a Google Sheets ── */
window.openGSheetsModal = function () {
  openModal(
    `<i class="ph-fill ph-google-logo" style="color:#00ffaa"></i> Conectar Google Sheets`,
    `
      <div style="margin-bottom:18px;">
        <div style="background:rgba(0,255,170,0.08);border:1px solid rgba(0,255,170,0.3);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:var(--neon-green);margin-bottom:6px;">
            <i class="ph-fill ph-info"></i> ¿Cómo conectar tu Google Sheets?
          </div>
          <ol style="font-size:12.5px;color:var(--text-2);padding-left:18px;line-height:2.2;">
            <li>Abre tu Google Sheets &rarr; <strong>Archivo &rarr; Compartir &rarr; Publicar en la web</strong></li>
            <li>Selecciona la hoja y el formato <strong>CSV</strong> &rarr; clic en <strong>Publicar</strong></li>
            <li>Copia la URL que aparece y pégala abajo</li>
          </ol>
          <div style="margin-top:8px;font-size:12px;color:var(--text-3);">
            <i class="ph ph-check-circle" style="color:var(--neon-green)"></i>
            También puedes pegar el link normal de "Compartir" con permisos públicos y el sistema lo convierte automáticamente.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">URL de Google Sheets</label>
          <input class="form-input" id="gsheets-url" type="url"
            placeholder="https://docs.google.com/spreadsheets/d/…"
            style="width:100%;" />
        </div>

        <div class="form-row" style="margin-bottom:0;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Módulo Destino</label>
            <select class="form-select" id="gsheets-entity" style="width:100%;">
              <option value="inventario">Inventario (y Catálogo)</option>
              <option value="proformas">Proformas</option>
              <option value="facturas">Facturas</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Estado</label>
            <div id="gsheets-status" style="padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);font-size:12px;color:var(--text-3);font-family:var(--font-mono);height:38px;display:flex;align-items:center;">
              Esperando URL…
            </div>
          </div>
        </div>
      </div>
    `,
    [
      { label: 'Cancelar', cls: 'btn-secondary', action: closeModal },
      {
        label: 'Importar desde Google Sheets',
        cls:   'btn-success',
        action: () => {
          const rawUrl  = (document.getElementById('gsheets-url')?.value || '').trim();
          const entity  = document.getElementById('gsheets-entity')?.value || 'inventario';
          const statusEl = document.getElementById('gsheets-status');

          if (!rawUrl) {
            statusEl.textContent = 'Ingresa una URL valida';
            statusEl.style.color = 'var(--neon-yellow)';
            return;
          }

          const csvUrl = gSheetsUrlToCsvUrl(rawUrl);
          if (!csvUrl) {
            statusEl.textContent = 'URL no reconocida como Google Sheets';
            statusEl.style.color = 'var(--neon-pink)';
            return;
          }

          statusEl.textContent = 'Conectando…';
          statusEl.style.color = 'var(--neon-cyan)';

          // Usar proxy CORS libre para evitar bloqueos
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(csvUrl)}`;

          fetch(proxyUrl)
            .then(res => {
              if (!res.ok) throw new Error('Error HTTP ' + res.status);
              return res.text();
            })
            .then(csvText => {
              const rows = parseCSV(csvText);
              if (!rows || rows.length === 0) {
                statusEl.textContent = 'La hoja esta vacia o no tiene datos';
                statusEl.style.color = 'var(--neon-yellow)';
                return;
              }
              statusEl.textContent = rows.length + ' filas detectadas — importando…';
              statusEl.style.color = 'var(--neon-green)';

              setTimeout(() => {
                const count = excelConfirmImport(rows, entity);
                closeModal();
                const label = { inventario:'Inventario', proformas:'Proformas', facturas:'Facturas' }[entity] || entity;
                showToast('Se importaron ' + count + ' registros de Google Sheets a ' + label, 'success');
                if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
                setTimeout(() => {
                  if (typeof Router !== 'undefined') {
                    Router.navigate(entity === 'inventario' ? 'inventario' : entity === 'proformas' ? 'proformas' : 'facturacion');
                  }
                }, 300);
              }, 500);
            })
            .catch(err => {
              console.error('GSheets error:', err);
              statusEl.textContent = 'Error: ' + err.message;
              statusEl.style.color = 'var(--neon-pink)';
              showToast('No se pudo conectar: verifica que el sheet sea publico', 'error');
            });
        }
      }
    ]
  );

  // Detectar URL mientras escribe
  setTimeout(() => {
    const urlInput = document.getElementById('gsheets-url');
    if (!urlInput) return;
    urlInput.addEventListener('input', () => {
      const statusEl = document.getElementById('gsheets-status');
      const url = urlInput.value.trim();
      if (url.includes('docs.google.com/spreadsheets')) {
        statusEl.textContent = 'URL de Google Sheets detectada';
        statusEl.style.color = 'var(--neon-green)';
      } else if (url.length > 0) {
        statusEl.textContent = 'No parece ser un link de Google Sheets';
        statusEl.style.color = 'var(--neon-yellow)';
      } else {
        statusEl.textContent = 'Esperando URL…';
        statusEl.style.color = 'var(--text-3)';
      }
    });
  }, 100);
};
