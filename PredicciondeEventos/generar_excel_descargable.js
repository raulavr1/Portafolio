const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const sectores = ['Centro', 'Norte', 'Sur', 'Oriente', 'Occidente'];
const tipos = ['Robo', 'Hurto', 'Lesiones'];
const estados = ['Investigado', 'Pendiente'];
const coordsSector = {
  'Centro': { lat: 4.6510, lng: -74.0800 },
  'Norte':  { lat: 4.6620, lng: -74.0720 },
  'Sur':    { lat: 4.6380, lng: -74.0750 },
  'Oriente':{ lat: 4.6540, lng: -74.0880 },
  'Occidente':{ lat: 4.6600, lng: -74.0860 }
};

const hoy = new Date();
const data = [];

for (let i = 1; i <= 30; i++) {
  const sector = sectores[i % sectores.length];
  const tipo = tipos[(i * 2) % tipos.length];
  const estado = estados[i % estados.length];
  const baseCoord = coordsSector[sector];
  
  const diasAtras = (i % 18);
  const d = new Date(hoy.getTime() - diasAtras * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const fechaStr = `${yyyy}-${mm}-${dd}`;
  
  const hh = String((i * 4) % 24).padStart(2, '0');
  const min = String((i * 13) % 60).padStart(2, '0');
  const horaStr = `${hh}:${min}`;
  
  const lat = Number((baseCoord.lat + (Math.sin(i * 1.5) * 0.012)).toFixed(5));
  const lng = Number((baseCoord.lng + (Math.cos(i * 1.5) * 0.012)).toFixed(5));

  data.push({
    id: i,
    fecha: fechaStr,
    hora: horaStr,
    tipo: tipo,
    sector: sector,
    lat: lat,
    lng: lng,
    descripcion: `Reporte de ${tipo.toLowerCase()} registrado en el sector ${sector}`,
    estado: estado
  });
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');

const filePath = path.join(publicDir, 'incidentes_ejemplo.xlsx');
XLSX.writeFile(wb, filePath);
console.log('EXITO: Creado public/incidentes_ejemplo.xlsx para descarga directa');
