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

for (let i = 1; i <= 25; i++) {
  const sector = sectores[Math.floor(Math.random() * sectores.length)];
  const tipo = tipos[Math.floor(Math.random() * tipos.length)];
  const estado = estados[Math.floor(Math.random() * estados.length)];
  const baseCoord = coordsSector[sector];
  
  const diasAtras = Math.floor(Math.random() * 20);
  const d = new Date(hoy.getTime() - diasAtras * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const fechaStr = `${yyyy}-${mm}-${dd}`;
  
  const hh = String(Math.floor(Math.random() * 24)).padStart(2, '0');
  const min = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  const horaStr = `${hh}:${min}`;
  
  const lat = Number((baseCoord.lat + (Math.random() - 0.5) * 0.015).toFixed(5));
  const lng = Number((baseCoord.lng + (Math.random() - 0.5) * 0.015).toFixed(5));

  data.push({
    id: i,
    fecha: fechaStr,
    hora: horaStr,
    tipo: tipo,
    sector: sector,
    lat: lat,
    lng: lng,
    descripcion: `Reporte de ${tipo.toLowerCase()} en el sector ${sector}`,
    estado: estado
  });
}

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');

const filePath = path.join(dataDir, 'incidentes.xlsx');
XLSX.writeFile(wb, filePath);
console.log('EXITO: Guardado incidentes.xlsx con 25 registros actualizados');
