const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const net = require('net');
const XLSX = require('xlsx');

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '6520', 10);
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());

// Cabeceras HTTP de Seguridad Bancaria y Anti-Tampering
app.use((req, res, next) => {
    // Evitar que el dashboard sea embebido en iframes externos (Anti-Clickjacking)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevenir detección errónea de tipo MIME (Anti-MIME Sniffing)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Forzar protección contra ataques XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Control de políticas de origen
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Deshabilitar divulgación de tecnología de backend
    res.removeHeader('X-Powered-By');
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir estáticos con prevención de acceso a archivos confidenciales
app.use((req, res, next) => {
    // Bloquear intentos de acceso directo a scripts o archivos de prueba sensibles y bases de datos
    const sensitive = [/\.env/i, /\.git/i, /scratch/i, /package\.json/i, /database\.json/i, /\.ya?ml/i, /\.bat/i, /\.exe/i];
    if (sensitive.some(rx => rx.test(req.path))) {
        return res.status(403).json({ error: 'Acceso restringido por política de seguridad' });
    }
    next();
});

app.use(express.static(__dirname));

function getDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        return {
            configuracion: {
                moneda: "S/.",
                nombre_sistema: "FinControl — Dashboard Financiero",
                entidad: "Finanzas Personales y de Negocio",
                modo_privacidad_por_defecto: false,
                usuario_activo_id: "USR-01"
            },
            usuarios: [],
            catalogo: {},
            registro_efe: [],
            registro_esf: [],
            objetivos_metas: {},
            planes_accion: []
        };
    }
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error leyendo database.json:', err);
        return { error: 'Error al leer la base de datos' };
    }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ══════════════════ GESTIÓN DE PERFILES DE USUARIO (ADMIN / USUARIO) ══════════════════
app.get('/api/usuarios', (req, res) => {
    const db = getDatabase();
    res.json({
        usuarios: db.usuarios || [],
        usuario_activo_id: (db.configuracion && db.configuracion.usuario_activo_id) || 'USR-01'
    });
});

app.post('/api/usuarios', (req, res) => {
    const db = getDatabase();
    if (!db.usuarios) db.usuarios = [];
    const nuevo = req.body;
    if (!nuevo.id) {
        nuevo.id = 'USR-' + String(db.usuarios.length + 1).padStart(2, '0');
    }
    nuevo.estado = nuevo.estado || 'Activo';
    nuevo.rol = nuevo.rol === 'Administrador' ? 'Administrador' : 'Usuario';
    nuevo.ultimo_acceso = new Date().toISOString().slice(0, 16).replace('T', ' ');
    db.usuarios.push(nuevo);
    saveDatabase(db);
    res.json({ success: true, usuario: nuevo });
});

app.put('/api/usuarios/:id', (req, res) => {
    const db = getDatabase();
    if (!db.usuarios) db.usuarios = [];
    const idx = db.usuarios.findIndex(u => u.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    db.usuarios[idx] = { ...db.usuarios[idx], ...req.body, id: req.params.id };
    saveDatabase(db);
    res.json({ success: true, usuario: db.usuarios[idx] });
});

app.delete('/api/usuarios/:id', (req, res) => {
    const db = getDatabase();
    if (!db.usuarios) db.usuarios = [];
    if (db.usuarios.length <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el único usuario del sistema' });
    }
    db.usuarios = db.usuarios.filter(u => u.id !== req.params.id);
    if (db.configuracion && db.configuracion.usuario_activo_id === req.params.id) {
        db.configuracion.usuario_activo_id = db.usuarios[0].id;
    }
    saveDatabase(db);
    res.json({ success: true });
});

app.post('/api/usuarios/cambiar-activo', (req, res) => {
    const { id } = req.body;
    const db = getDatabase();
    const user = (db.usuarios || []).find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!db.configuracion) db.configuracion = {};
    db.configuracion.usuario_activo_id = id;
    user.ultimo_acceso = new Date().toISOString().slice(0, 16).replace('T', ' ');
    saveDatabase(db);
    res.json({ success: true, usuario_activo: user });
});

// ══════════════════ RUTAS DE DATOS PRINCIPALES ══════════════════
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        sistema: 'FinControl Financial Platform',
        port: req.socket.localPort,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/data', (req, res) => {
    const db = getDatabase();
    res.json(db);
});

// Actualizar Configuración
app.put('/api/config', (req, res) => {
    const db = getDatabase();
    if (!db.configuracion) db.configuracion = {};
    const allowed = ['moneda', 'nombre_sistema', 'entidad', 'modo_privacidad_por_defecto', 'tema', 'usuario_activo_id'];
    allowed.forEach(k => {
        if (req.body[k] !== undefined) db.configuracion[k] = req.body[k];
    });
    saveDatabase(db);
    res.json({ success: true, configuracion: db.configuracion });
});

// ══════════════════ CRUD REGISTRO EFE (FLUJO DE EFECTIVO) ══════════════════
app.post('/api/registro-efe', (req, res) => {
    const db = getDatabase();
    if (!db.registro_efe) db.registro_efe = [];
    const item = req.body;
    if (!item.ID) {
        item.ID = 'EFE-' + Math.floor(1000 + Math.random() * 9000);
    }
    item.Presupuesto = parseFloat(item.Presupuesto || 0);
    item.Actual = parseFloat(item.Actual || 0);
    item.Mes = parseInt(item.Mes || 1, 10);

    const idx = db.registro_efe.findIndex(r => r.ID === item.ID);
    if (idx >= 0) {
        db.registro_efe[idx] = { ...db.registro_efe[idx], ...item };
    } else {
        db.registro_efe.unshift(item);
    }
    saveDatabase(db);
    res.json({ success: true, item: item, total: db.registro_efe.length });
});

app.put('/api/registro-efe/:id', (req, res) => {
    const db = getDatabase();
    const id = req.params.id;
    if (!db.registro_efe) db.registro_efe = [];
    const idx = db.registro_efe.findIndex(r => r.ID === id);
    if (idx < 0) return res.status(404).json({ error: 'Registro EFE no encontrado' });
    
    const updated = { ...db.registro_efe[idx], ...req.body, ID: id };
    updated.Presupuesto = parseFloat(updated.Presupuesto || 0);
    updated.Actual = parseFloat(updated.Actual || 0);
    updated.Mes = parseInt(updated.Mes || 1, 10);

    db.registro_efe[idx] = updated;
    saveDatabase(db);
    res.json({ success: true, item: updated });
});

app.delete('/api/registro-efe/:id', (req, res) => {
    const db = getDatabase();
    const id = req.params.id;
    if (!db.registro_efe) db.registro_efe = [];
    const prevLen = db.registro_efe.length;
    db.registro_efe = db.registro_efe.filter(r => r.ID !== id);
    saveDatabase(db);
    res.json({ success: true, deleted: prevLen - db.registro_efe.length });
});

// ══════════════════ CRUD REGISTRO ESF (SITUACIÓN FINANCIERA) ══════════════════
app.post('/api/registro-esf', (req, res) => {
    const db = getDatabase();
    if (!db.registro_esf) db.registro_esf = [];
    const item = req.body;
    if (!item.ID) {
        item.ID = 'ESF-' + Math.floor(2000 + Math.random() * 8000);
    }
    item.Mes = parseInt(item.Mes || 1, 10);
    item.Activos_Liquidos = parseFloat(item.Activos_Liquidos || 0);
    item.Activos_Invertidos = parseFloat(item.Activos_Invertidos || 0);
    item.Activos_No_Corrientes = parseFloat(item.Activos_No_Corrientes || 0);
    item.Activos_Totales = item.Activos_Liquidos + item.Activos_Invertidos + item.Activos_No_Corrientes;
    item.Pasivos_Corto_Plazo = parseFloat(item.Pasivos_Corto_Plazo || 0);
    item.Pasivos_Largo_Plazo = parseFloat(item.Pasivos_Largo_Plazo || 0);
    item.Pasivos_Totales = item.Pasivos_Corto_Plazo + item.Pasivos_Largo_Plazo;
    item.Patrimonio_Neto = item.Activos_Totales - item.Pasivos_Totales;

    const idx = db.registro_esf.findIndex(r => r.ID === item.ID || r.Mes === item.Mes);
    if (idx >= 0) {
        db.registro_esf[idx] = { ...db.registro_esf[idx], ...item };
    } else {
        db.registro_esf.push(item);
        db.registro_esf.sort((a, b) => a.Mes - b.Mes);
    }
    saveDatabase(db);
    res.json({ success: true, item: item });
});

app.put('/api/registro-esf/:id', (req, res) => {
    const db = getDatabase();
    const id = req.params.id;
    if (!db.registro_esf) db.registro_esf = [];
    const idx = db.registro_esf.findIndex(r => r.ID === id);
    if (idx < 0) return res.status(404).json({ error: 'Registro ESF no encontrado' });

    const updated = { ...db.registro_esf[idx], ...req.body, ID: id };
    updated.Activos_Liquidos = parseFloat(updated.Activos_Liquidos || 0);
    updated.Activos_Invertidos = parseFloat(updated.Activos_Invertidos || 0);
    updated.Activos_No_Corrientes = parseFloat(updated.Activos_No_Corrientes || 0);
    updated.Activos_Totales = updated.Activos_Liquidos + updated.Activos_Invertidos + updated.Activos_No_Corrientes;
    updated.Pasivos_Corto_Plazo = parseFloat(updated.Pasivos_Corto_Plazo || 0);
    updated.Pasivos_Largo_Plazo = parseFloat(updated.Pasivos_Largo_Plazo || 0);
    updated.Pasivos_Totales = updated.Pasivos_Corto_Plazo + updated.Pasivos_Largo_Plazo;
    updated.Patrimonio_Neto = updated.Activos_Totales - updated.Pasivos_Totales;

    db.registro_esf[idx] = updated;
    saveDatabase(db);
    res.json({ success: true, item: updated });
});

// ══════════════════ OBJETIVOS Y METAS ══════════════════
app.put('/api/objetivos', (req, res) => {
    const db = getDatabase();
    db.objetivos_metas = { ...db.objetivos_metas, ...req.body };
    saveDatabase(db);
    res.json({ success: true, objetivos: db.objetivos_metas });
});

// ══════════════════ PLANES DE ACCION ══════════════════
app.post('/api/planes-accion', (req, res) => {
    const db = getDatabase();
    if (!db.planes_accion) db.planes_accion = [];
    const plan = req.body;
    if (!plan.id) plan.id = 'PLAN-' + (db.planes_accion.length + 1).toString().padStart(2, '0');
    const idx = db.planes_accion.findIndex(p => p.id === plan.id);
    if (idx >= 0) db.planes_accion[idx] = plan;
    else db.planes_accion.push(plan);
    saveDatabase(db);
    res.json({ success: true, plan: plan });
});

app.delete('/api/planes-accion/:id', (req, res) => {
    const db = getDatabase();
    if (!db.planes_accion) db.planes_accion = [];
    db.planes_accion = db.planes_accion.filter(p => p.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
});

// ══════════════════ BACKUP Y RESTORE SEGURO ══════════════════
app.get('/api/backup', (req, res) => {
    const db = getDatabase();
    res.setHeader('Content-Disposition', 'attachment; filename=FinControl_Backup_' + new Date().toISOString().slice(0, 10) + '.json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(db, null, 2));
});

app.post('/api/restore', (req, res) => {
    try {
        const payload = req.body;
        if (!payload.registro_efe || !payload.registro_esf) {
            return res.status(400).json({ error: 'Estructura de respaldo inválida. Falta registro_efe o registro_esf.' });
        }
        saveDatabase(payload);
        res.json({ success: true, message: 'Base de datos restaurada correctamente' });
    } catch (e) {
        res.status(500).json({ error: 'Error al restaurar respaldo: ' + e.message });
    }
});

// ══════════════════ DESCARGA DE EXCEL ══════════════════
app.get('/api/download-excel', (req, res) => {
    try {
        const db = getDatabase();
        const wb = XLSX.utils.book_new();

        // 1. EFE
        const efeRows = (db.registro_efe || []).map(r => ({
            'ID': r.ID,
            'Fecha': r.Fecha,
            'Mes': r.Mes,
            'Nombre Mes': r.Mes_Nombre,
            'Tipo': r.Tipo,
            'Categoría': r.Categoria,
            'Subcategoría': r.Subcategoria,
            'Presupuesto (S/.)': r.Presupuesto,
            'Monto Real (S/.)': r.Actual,
            'Variación (S/.)': r.Actual - r.Presupuesto,
            'Cumplimiento %': r.Presupuesto > 0 ? (r.Actual / r.Presupuesto) * 100 : 100,
            'Detalle': r.Detalle,
            'Método Pago': r.Metodo_Pago,
            'Estado': r.Estado
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(efeRows), 'REGISTRO_EFE');

        // 2. ESF
        const esfRows = (db.registro_esf || []).map(r => ({
            'ID': r.ID,
            'Mes': r.Mes,
            'Período': r.Periodo,
            'Fecha Corte': r.Fecha_Corte,
            'Activos Líquidos': r.Activos_Liquidos,
            'Activos Invertidos': r.Activos_Invertidos,
            'Activos No Corrientes': r.Activos_No_Corrientes,
            'Total Activos': r.Activos_Totales,
            'Pasivos Corto Plazo': r.Pasivos_Corto_Plazo,
            'Pasivos Largo Plazo': r.Pasivos_Largo_Plazo,
            'Total Pasivos': r.Pasivos_Totales,
            'Patrimonio Neto': r.Patrimonio_Neto
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(esfRows), 'BALANCE_ESF');

        // 3. Ratios
        const ratiosRows = Object.keys(db.objetivos_metas || {}).map(k => ({
            'Ratio': db.objetivos_metas[k].nombre,
            'Descripción': db.objetivos_metas[k].descripcion,
            'Meta': db.objetivos_metas[k].meta_valor,
            'Unidad': db.objetivos_metas[k].unidad
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ratiosRows), 'RATIOS_METAS');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Financiero_Integral_FinControl.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function findAvailablePort(startPort, callback) {
    const tester = net.createServer();
    tester.listen(startPort, () => {
        tester.once('close', () => callback(null, startPort));
        tester.close();
    });
    tester.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            findAvailablePort(startPort + 1, callback);
        } else {
            callback(err);
        }
    });
}

findAvailablePort(DEFAULT_PORT, (err, port) => {
    if (err) {
        console.error('Error al inicializar puerto de red:', err);
        process.exit(1);
    }
    app.listen(port, '0.0.0.0', () => {
        console.log('================================================================');
        console.log('   FINCONTROL — PLATAFORMA Y DASHBOARD FINANCIERO PROFESIONAL   ');
        console.log('   (Perfiles de Usuario, ESF, EFE, Presupuestos y Ratios)       ');
        console.log('================================================================');
        console.log(' [OK] Acceso Local:      http://localhost:' + port);
        console.log(' [OK] Acceso de Red:     http://127.0.0.1:' + port);
        console.log('================================================================');
    });
});
