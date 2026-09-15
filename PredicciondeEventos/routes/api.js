const express = require('express');
const router = express.Router();
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'db.json');
const excelPath = path.join(dataDir, 'incidentes.xlsx');

// ─────────────────────────────────────────────
// Helper: Normalizador de registros en Backend
// ─────────────────────────────────────────────
function normalizarRegistroBackend(inc, index) {
  const hoy = new Date();
  const yearActual = hoy.getFullYear();

  let rawFecha = inc.fecha || inc.Fecha || inc.FECHA || inc.date || inc.Date;
  let fechaStr = '';

  if (rawFecha !== undefined && rawFecha !== null) {
    if (typeof rawFecha === 'number') {
      const dateObj = new Date(Math.round((rawFecha - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        fechaStr = `${yearActual}-${mm}-${dd}`;
      }
    } else {
      const d = new Date(rawFecha);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        fechaStr = `${yearActual}-${mm}-${dd}`;
      } else {
        const partes = String(rawFecha).trim().split(/[-/]/);
        if (partes.length === 3) {
          const m = String(partes[1]).padStart(2, '0');
          const d = String(partes[2]).padStart(2, '0');
          fechaStr = `${yearActual}-${m}-${d}`;
        }
      }
    }
  }

  if (!fechaStr) {
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaStr = `${yearActual}-${mm}-${dd}`;
  }

  let rawTipo = inc.tipo || inc.Tipo || inc.TIPO || inc['Tipo de Delito'] || inc['TIPO DE DELITO'] || 'Robo';
  let tipoStr = String(rawTipo).trim();
  const tipoLower = tipoStr.toLowerCase();
  if (tipoLower.includes('robo')) tipoStr = 'Robo';
  else if (tipoLower.includes('hurto')) tipoStr = 'Hurto';
  else if (tipoLower.includes('lesion')) tipoStr = 'Lesiones';
  else if (tipoStr.length > 0) tipoStr = tipoStr.charAt(0).toUpperCase() + tipoStr.slice(1);
  else tipoStr = 'Robo';

  let rawSector = inc.sector || inc.Sector || inc.SECTOR || inc.zona || inc.Zona || 'Centro';
  let sectorStr = String(rawSector).trim() || 'Centro';

  let rawHora = inc.hora || inc.Hora || inc.HORA || '12:00';
  let horaStr = '12:00';
  if (typeof rawHora === 'number') {
    const totalMin = Math.round(rawHora * 24 * 60);
    const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const min = String(totalMin % 60).padStart(2, '0');
    horaStr = `${hh}:${min}`;
  } else if (rawHora) {
    horaStr = String(rawHora).trim();
  }

  let lat = parseFloat(inc.lat || inc.Lat || inc.LAT || inc.latitud || inc.Latitud || 4.6510);
  let lng = parseFloat(inc.lng || inc.Lng || inc.LNG || inc.longitud || inc.Longitud || -74.0800);
  if (isNaN(lat)) lat = 4.6510;
  if (isNaN(lng)) lng = -74.0800;

  let estadoStr = String(inc.estado || inc.Estado || inc.ESTADO || 'Investigado').trim();
  let descStr = String(inc.descripcion || inc.Descripcion || inc.DESCRIPCION || `Incidente de ${tipoStr} en sector ${sectorStr}`).trim();

  return {
    id: inc.id || inc.Id || (index + 1),
    fecha: fechaStr,
    hora: horaStr,
    tipo: tipoStr,
    sector: sectorStr,
    lat: lat,
    lng: lng,
    descripcion: descStr,
    estado: estadoStr
  };
}

// ─────────────────────────────────────────────
// Generador de datos genéricos iniciales
// ─────────────────────────────────────────────
function generarDatosBase() {
  // Distribución realista ponderada
  const configSectores = [
    { nombre: 'Oriente',   peso: 12, lat: 4.6540, lng: -74.0880 }, // Foco crítico
    { nombre: 'Centro',    peso: 8,  lat: 4.6510, lng: -74.0800 }, // Moderado
    { nombre: 'Norte',     peso: 5,  lat: 4.6620, lng: -74.0720 }, // Moderado
    { nombre: 'Sur',       peso: 3,  lat: 4.6380, lng: -74.0750 }, // Bajo
    { nombre: 'Occidente', peso: 2,  lat: 4.6600, lng: -74.0860 }  // Bajo
  ];

  const tiposPonderados = ['Robo', 'Robo', 'Robo', 'Hurto', 'Hurto', 'Lesiones'];
  const horasPonderadas = ['19:45', '21:30', '18:15', '22:00', '20:10', '15:20', '16:50', '11:10', '02:30'];

  const hoy = new Date();
  const yearActual = hoy.getFullYear();
  const data = [];
  let idContador = 1;

  configSectores.forEach(sec => {
    for (let j = 0; j < sec.peso; j++) {
      const tipo = tiposPonderados[(idContador + j) % tiposPonderados.length];
      const hora = horasPonderadas[(idContador * 2 + j) % horasPonderadas.length];
      const diasAtras = (j * 2 + idContador % 5) % 20;

      const d = new Date(hoy.getTime() - diasAtras * 86400000);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const fechaStr = `${yearActual}-${mm}-${dd}`;

      const angle = (j * 1.25) + idContador;
      const dist = 0.003 + (j * 0.0015);
      const lat = Number((sec.lat + Math.sin(angle) * dist).toFixed(5));
      const lng = Number((sec.lng + Math.cos(angle) * dist).toFixed(5));

      data.push({
        id: idContador,
        fecha: fechaStr,
        hora: hora,
        tipo: tipo,
        sector: sec.nombre,
        lat: lat,
        lng: lng,
        descripcion: `Reporte de ${tipo.toLowerCase()} registrado en el sector ${sec.nombre}`,
        estado: (j % 2 === 0) ? 'Investigado' : 'Pendiente'
      });

      idContador++;
    }
  });

  return data;
}

// ─────────────────────────────────────────────
// Guardar y Leer de la Base de Datos Persistente
// ─────────────────────────────────────────────
function guardarEnBD(incidentes) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(incidentes, null, 2), 'utf-8');
    
    // También guardar en Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(incidentes);
    XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');
    XLSX.writeFile(wb, excelPath);

    console.log(`[Base de Datos] Guardados ${incidentes.length} registros en db.json y Excel.`);
  } catch (e) {
    console.error('Error escribiendo en BD:', e);
  }
}

function leerBD() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }

    if (fs.existsSync(excelPath)) {
      const workbook = XLSX.readFile(excelPath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      if (Array.isArray(rows) && rows.length > 0) {
        const norm = rows.map((r, i) => normalizarRegistroBackend(r, i));
        guardarEnBD(norm);
        return norm;
      }
    }

    // Si no hay datos, inicializar la base de datos de muestra
    const muestra = generarDatosBase();
    guardarEnBD(muestra);
    return muestra;
  } catch (e) {
    console.error('Error leyendo BD, reseteando a muestra base:', e);
    const muestra = generarDatosBase();
    guardarEnBD(muestra);
    return muestra;
  }
}

// ─────────────────────────────────────────────
// RUTAS DE LA BASE DE DATOS
// ─────────────────────────────────────────────

// GET /api/incidentes → Obtener registros de la Base de Datos
router.get('/incidentes', (req, res) => {
  const incidentes = leerBD();
  res.json({ success: true, total: incidentes.length, data: incidentes });
});

// POST /api/incidentes → Guardar registros directamente en la BD
router.post('/incidentes', (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Datos de incidentes no válidos' });
    }

    const norm = data.map((item, idx) => normalizarRegistroBackend(item, idx));
    guardarEnBD(norm);

    res.json({ success: true, total: norm.length, message: 'Base de datos actualizada correctamente' });
  } catch (e) {
    console.error('Error guardando incidentes:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/upload → Subir y guardar Excel en la Base de Datos
router.post('/upload', (req, res) => {
  try {
    const { base64, name } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, message: 'No se envió información base64' });
    }

    const cleanBase64 = base64.replace(/^data:.*;base64,/, "");
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    // Parsear el archivo Excel recibido
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'El archivo Excel no contiene registros válidos' });
    }

    const norm = rawRows.map((r, i) => normalizarRegistroBackend(r, i));
    guardarEnBD(norm);

    console.log(`[Backend] Archivo "${name}" guardado permanentemente en la Base de Datos (${norm.length} registros)`);
    res.json({ success: true, total: norm.length, message: 'Archivo procesado y guardado en la base de datos' });
  } catch (e) {
    console.error('Error guardando el excel:', e);
    res.status(500).json({ success: false, message: 'Error en servidor: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// Cálculos estadísticos para análisis
// ─────────────────────────────────────────────
function calcularMeanCenter(incidentes) {
  const n = incidentes.length;
  if (n === 0) return { lat: 0, lng: 0 };
  const sumLat = incidentes.reduce((s, i) => s + parseFloat(i.lat), 0);
  const sumLng = incidentes.reduce((s, i) => s + parseFloat(i.lng), 0);
  return { lat: sumLat / n, lng: sumLng / n };
}

function calcularDesviacion(incidentes, center) {
  const n = incidentes.length;
  if (n === 0) return 0;
  const sumD2 = incidentes.reduce((s, i) => {
    const dLat = parseFloat(i.lat) - center.lat;
    const dLng = parseFloat(i.lng) - center.lng;
    return s + dLat * dLat + dLng * dLng;
  }, 0);
  return Math.sqrt(sumD2 / n) * 111320;
}

function calcularSpiderMean(incidentes, center) {
  const rutas = incidentes.slice(0, 5).map(i => ({
    lat: parseFloat(i.lat),
    lng: parseFloat(i.lng),
    tipo: i.tipo
  }));

  const distancias = incidentes.map(i => {
    const dLat = (parseFloat(i.lat) - center.lat) * 111320;
    const dLng = (parseFloat(i.lng) - center.lng) * 111320;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  });
  const dispersion = distancias.reduce((a, b) => a + b, 0) / (distancias.length || 1);
  const zonaConfort = Math.round(dispersion * 0.6);

  return {
    puntoAnclaje: center,
    rutas,
    dispersion: Math.round(dispersion),
    zonaConfort
  };
}

function calcularMSD(incidentes) {
  const ordenados = [...incidentes].sort((a, b) =>
    new Date(a.fecha + ' ' + a.hora) - new Date(b.fecha + ' ' + b.hora)
  );

  const ultimos = ordenados.slice(-4);
  let predLat = 0, predLng = 0;
  if (ultimos.length >= 2) {
    const n = ultimos.length;
    const dLat = parseFloat(ultimos[n - 1].lat) - parseFloat(ultimos[n - 2].lat);
    const dLng = parseFloat(ultimos[n - 1].lng) - parseFloat(ultimos[n - 2].lng);
    predLat = parseFloat(ultimos[n - 1].lat) + dLat * 0.5;
    predLng = parseFloat(ultimos[n - 1].lng) + dLng * 0.5;
  }

  const horas = incidentes.map(i => parseInt((i.hora || '12:00').split(':')[0]));
  const freqHoras = {};
  horas.forEach(h => freqHoras[h] = (freqHoras[h] || 0) + 1);
  const horaPico = parseInt(Object.entries(freqHoras).sort((a, b) => b[1] - a[1])[0]?.[0] || 12);

  return {
    trayectoria: ultimos.map(i => ({ lat: parseFloat(i.lat), lng: parseFloat(i.lng), fecha: i.fecha, hora: i.hora })),
    prediccion: {
      lat: predLat.toFixed(4),
      lng: predLng.toFixed(4),
      ventanaInicio: `${horaPico.toString().padStart(2,'0')}:00`,
      ventanaFin: `${((horaPico + 2) % 24).toString().padStart(2,'0')}:00`
    }
  };
}

function calcularNivelRiesgo(incidentes) {
  const ahora = new Date();
  const recientes = incidentes.filter(i => {
    const d = new Date(i.fecha);
    return Math.abs((ahora - d) / (1000 * 60 * 60 * 24)) <= 30;
  });
  if (recientes.length >= 8) return { nivel: 'ALTO', score: 85 };
  if (recientes.length >= 4) return { nivel: 'MEDIO', score: 55 };
  return { nivel: 'BAJO', score: 25 };
}

function generarRecomendaciones(incidentes, riesgo, msd) {
  const horas = incidentes.map(i => parseInt((i.hora || '12:00').split(':')[0]));
  const freqHoras = {};
  horas.forEach(h => freqHoras[h] = (freqHoras[h] || 0) + 1);
  const horaPico = parseInt(Object.entries(freqHoras).sort((a, b) => b[1] - a[1])[0]?.[0] || 12);

  const tipos = incidentes.map(i => i.tipo);
  const freqTipos = {};
  tipos.forEach(t => freqTipos[t] = (freqTipos[t] || 0) + 1);
  const tipoPrincipal = Object.entries(freqTipos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Robo';

  return [
    `Priorizar patrullaje en zona 1σ y 2σ del punto de anclaje (${msd.prediccion.lat}, ${msd.prediccion.lng})`,
    `Reforzar presencia en horario crítico: ${horaPico.toString().padStart(2,'0')}:00 – ${((horaPico + 3) % 24).toString().padStart(2,'0')}:00`,
    `Focalizar vigilancia en tipo de delito predominante: ${tipoPrincipal}`,
    `Nivel de riesgo ${riesgo.nivel}: activar protocolo de respuesta rápida`,
    `Implementar controles en rutas de aproximación identificadas por Spider Mean`,
    `Monitorear zonas con alta recurrencia mediante cámaras o patrullas móviles`
  ];
}

// GET /api/analisis → Análisis estadístico completo
router.get('/analisis', (req, res) => {
  const incidentes = leerBD();

  if (incidentes.length === 0) {
    return res.json({ success: false, message: 'No hay datos de incidentes' });
  }

  const meanCenter = calcularMeanCenter(incidentes);
  const desviacion = calcularDesviacion(incidentes, meanCenter);
  const spider = calcularSpiderMean(incidentes, meanCenter);
  const msd = calcularMSD(incidentes);
  const riesgo = calcularNivelRiesgo(incidentes);
  const recomendaciones = generarRecomendaciones(incidentes, riesgo, msd);

  const horas = incidentes.map(i => parseInt((i.hora || '12:00').split(':')[0]));
  const nocturno = horas.filter(h => h >= 20 || h <= 4).length > horas.length / 2;
  const tipos = incidentes.map(i => i.tipo);
  const freqTipos = {};
  tipos.forEach(t => freqTipos[t] = (freqTipos[t] || 0) + 1);
  const tipoPrincipal = Object.entries(freqTipos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Robo';

  res.json({
    success: true,
    gottlieb: {
      meanCenter,
      sigma1: desviacion * 1,
      sigma2: desviacion * 2,
      sigma3: desviacion * 3
    },
    spiderMean: spider,
    msd,
    riesgo,
    perfil: {
      patron: nocturno ? 'Nocturno (20:00 – 04:00)' : 'Diurno (08:00 – 18:00)',
      tipoPrincipal,
      zonaConfort: `${spider.zonaConfort} – ${spider.zonaConfort + 500} m`,
      movilidad: 'A pie / Transporte público',
      objetivo: 'Bienes de fácil acceso',
      nivelPlanificacion: riesgo.nivel === 'ALTO' ? 'Alto' : 'Medio',
      puntoAnclaje: `${meanCenter.lat.toFixed(4)}, ${meanCenter.lng.toFixed(4)}`
    },
    recomendaciones,
    heatmapData: incidentes.map(i => [parseFloat(i.lat), parseFloat(i.lng), 0.8])
  });
});

module.exports = router;
