/**
 * AppDB — Capa de datos para el Dashboard de Ventas
 * Persistencia en localStorage + datos demo pre-cargados
 */
const AppDB = (function () {
  const KEYS = {
    PRODUCTOS   : 'vp_productos',
    PROFORMAS   : 'vp_proformas',
    FACTURAS    : 'vp_facturas',
    MOVIMIENTOS : 'vp_movimientos',
    INITIALIZED : 'vp_initialized'
  };
  // Catalog config key lives in CatalogoConfig module (vp_catalogo_config)

  // ─── Helpers (Session Storage Aislado por Pestaña / Multi-Usuario) ───────
  function load(key) {
    try { 
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : []; 
    }
    catch { return []; }
  }

  function persist(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  function nextNumero(all, prefix, digits = 4) {
    let max = 0;
    all.forEach(item => {
      const n = parseInt((item.numero || '').replace(/\D/g, '')) || 0;
      if (n > max) max = n;
    });
    return `${prefix}-${String(max + 1).padStart(digits, '0')}`;
  }

  // ─── Demo Data ────────────────────────────────────────────────────────────
  const DEMO_PRODUCTOS = [
    // CABLES — Cat6
    { id:'PROD-001', codigo:'CAB-CAT6-GR',  descripcion:'Cable Ethernet Cat6 Gris (por metro)',  categoria:'Cables',
      stock:850, stock_minimo:200, unidad:'m', peso_unitario:0.045, precio:3.20, moneda:'PEN', precio_publico:3.50,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Cable de red Cat6 FTP de alto rendimiento. Velocidad 10/100/1000 Mbps, longitud a medida. Chaqueta gris LSZH ignifuga. Ideal para instalaciones estructuradas.' },

    // NETWORKING — Router
    { id:'PROD-002', codigo:'NET-RTR-WF6',  descripcion:'Router WiFi 6 AX3000 Doble Banda',      categoria:'Networking',
      stock:32, stock_minimo:10, unidad:'un', peso_unitario:0.82, precio:340.00, moneda:'PEN', precio_publico:360.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Router inalámbrico WiFi 6 (802.11ax) con velocidad combinada 3000 Mbps. Soporta hasta 64 dispositivos, 4 antenas de alto ganancia, puertos Gigabit y OFDMA.' },

    // NETWORKING — Switch
    { id:'PROD-003', codigo:'NET-SW-24P',   descripcion:'Switch Administrable 24P PoE Gigabit',   categoria:'Networking',
      stock:8, stock_minimo:5, unidad:'un', peso_unitario:2.60, precio:1280.00, moneda:'PEN', precio_publico:1350.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Switch gestionable Layer 2 de 24 puertos Gigabit PoE+ 802.3at. Potencia total PoE 370W, 4 puertos SFP uplink. Gestión web, VLAN, QoS y redundancia de enlace.' },

    // SEGURIDAD — Cámara Domo
    { id:'PROD-004', codigo:'SEG-CAM-2MP',  descripcion:'Cámara IP Domo 2MP IR 30m',             categoria:'Seguridad',
      stock:24, stock_minimo:10, unidad:'un', peso_unitario:0.38, precio:215.00, moneda:'PEN', precio_publico:225.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Cámara IP tipo domo 2 megapíxeles con visión nocturna IR hasta 30m. Full HD 1080p, lente varifocal 2.8-12mm. IP67, apta para exteriores. H.265+.' },

    // ENERGÍA — UPS
    { id:'PROD-005', codigo:'ENE-UPS-1KVA', descripcion:'UPS 1000VA / 600W Senoidal',            categoria:'Energía',
      stock:5, stock_minimo:5, unidad:'un', peso_unitario:5.40, precio:625.00, moneda:'PEN', precio_publico:650.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'UPS 1000VA/600W con salida senoidal pura. 6 tomas protegidas, batería 12V/9Ah. Tiempo de respaldo ~15 min a carga completa. Ideal para equipos críticos.' },

    // CABLES — HDMI
    { id:'PROD-006', codigo:'CAB-HDMI-2M',  descripcion:'Cable HDMI 4K 2 metros',                categoria:'Cables',
      stock:120, stock_minimo:30, unidad:'un', peso_unitario:0.18, precio:35.00, moneda:'PEN', precio_publico:38.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Cable HDMI 2.0 de alta velocidad compatible con 4K UHD 60Hz, HDR, ARC y Ethernet. Conectores bañados en oro, blindaje triple, longitud 2m.' },

    // INFRAESTRUCTURA — Rack
    { id:'PROD-007', codigo:'INF-RACK-12U', descripcion:'Rack Pared Abierto 12U 550mm',          categoria:'Infraestructura',
      stock:4, stock_minimo:3, unidad:'un', peso_unitario:14.20, precio:720.00, moneda:'PEN', precio_publico:760.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Rack de pared abierto 12U, profundidad 550mm. Acero galvanizado, capacidad 60kg. Incluye accesorios de montaje y 4 ventiladores laterales.' },

    // INFRAESTRUCTURA — Panel de Parcheo
    { id:'PROD-008', codigo:'INF-PP-24',    descripcion:'Panel de Parcheo Cat6 24 Puertos',      categoria:'Infraestructura',
      stock:18, stock_minimo:5, unidad:'un', peso_unitario:1.35, precio:195.00, moneda:'PEN', precio_publico:210.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Panel de parcheo 24 puertos Cat6, montaje en rack 1U. Conectores Cat6 con etiqueta de identificación. Incluye herramienta de impacto.' },

    // ACCESORIOS — RJ45
    { id:'PROD-009', codigo:'ACC-RJ45-C6',  descripcion:'Conector RJ45 Cat6 (caja x100)',        categoria:'Accesorios',
      stock:28, stock_minimo:10, unidad:'caja', peso_unitario:0.25, precio:32.00, moneda:'PEN', precio_publico:35.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Caja 100 unidades de conectores RJ45 Cat6 para cable UTP/FTP. Contactos bañados en oro 50μm. Compatible con crimpadoras estándar.' },

    // CABLES — Fibra Óptica
    { id:'PROD-010', codigo:'CAB-FO-SM500', descripcion:'Cable Fibra Óptica SM G.652D 500m',     categoria:'Cables',
      stock:3, stock_minimo:2, unidad:'rollo', peso_unitario:22.00, precio:1840.00, moneda:'PEN', precio_publico:1920.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Cable fibra óptica monomodo G.652D 500m, 12 fibras OS2, chaqueta LSZH. Pérdida <0.4dB/km. Ideal para enlaces de larga distancia y alta velocidad.' },

    // NETWORKING — SFP Transceiver
    { id:'PROD-011', codigo:'NET-SFP-MM',   descripcion:'Transceiver SFP 1G Multimodo 550m',     categoria:'Networking',
      stock:16, stock_minimo:8, unidad:'un', peso_unitario:0.04, precio:145.00, moneda:'PEN', precio_publico:155.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Módulo SFP 1000BASE-SX fibra óptica multimodo. Alcance 550m en OM2, longitud de onda 850nm. Compatible con equipos Cisco, Mikrotik, HP y más.' },

    // NETWORKING — Access Point
    { id:'PROD-012', codigo:'NET-AP-WF6',   descripcion:'Access Point WiFi 6 Techo Dual Band',   categoria:'Networking',
      stock:14, stock_minimo:5, unidad:'un', peso_unitario:0.55, precio:498.00, moneda:'PEN', precio_publico:520.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Access Point montaje en techo WiFi 6 (AX3000). 2.4GHz + 5GHz simultáneas, 200+ clientes, PoE 802.3at, gestión en la nube.' },

    // CABLES — UTP Cat5e
    { id:'PROD-013', codigo:'CAB-UTP-305',  descripcion:'Cable UTP Cat5e 305m (caja)',           categoria:'Cables',
      stock:10, stock_minimo:4, unidad:'caja', peso_unitario:6.50, precio:285.00, moneda:'PEN', precio_publico:300.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Caja 305m cable UTP Cat5e 24AWG certificado EIA/TIA 568B. Ideal para instalaciones residenciales y pequeñas empresas. Disponible en gris y azul.' },

    // SEGURIDAD — DVR
    { id:'PROD-014', codigo:'SEG-DVR-8CH',  descripcion:'DVR Turbo HD 8 Canales 5MP',           categoria:'Seguridad',
      stock:6, stock_minimo:3, unidad:'un', peso_unitario:1.90, precio:780.00, moneda:'PEN', precio_publico:820.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Grabador DVR 8 canales TurboHD resolución hasta 5MP Lite. 1 bahía HDD hasta 8TB, H.265+, acceso remoto vía app. Compatible con HD-TVI/AHD/CVBS.' },

    // INFRAESTRUCTURA — Canaleta PVC
    { id:'PROD-015', codigo:'INF-CAN-6040', descripcion:'Canaleta PVC 60x40mm 2m c/tapa',       categoria:'Infraestructura',
      stock:38, stock_minimo:20, unidad:'un', peso_unitario:0.95, precio:54.00, moneda:'PEN', precio_publico:58.00,
      disponible_catalogo:true,
      imagen:'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&auto=format&fit=crop&q=80',
      descripcion_larga:'Canaleta organizadora de cables PVC blanco 60x40mm, longitud 2m con tapa. Autoextinguible, ignifuga clase B1. Accesorios disponibles por separado.' }
  ];

  const DEMO_PROFORMAS = [
    {
      id:'PRO-001', numero:'PRO-0001',
      cliente:'Cliente Demo - Soluciones Tech S.A.C.', fecha:'2026-07-05', vencimiento:'2026-08-04',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-002', descripcion:'Router WiFi 6 AX3000 Doble Banda',   cantidad:5,  precio:340.00, descuento:5,  subtotal:1615.00 },
        { producto_id:'PROD-011', descripcion:'Transceiver SFP 1G Multimodo 550m',  cantidad:8,  precio:145.00, descuento:5,  subtotal:1102.00 }
      ],
      subtotal:2717.00, impuesto:489.06, total:3206.06,
      estado:'aprobada', notas:'Equipamiento de conectividad inalámbrica'
    },
    {
      id:'PRO-002', numero:'PRO-0002',
      cliente:'Cliente Demo - Empresa Alfa', fecha:'2026-07-12', vencimiento:'2026-08-11',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-001', descripcion:'Cable Ethernet Cat6 Gris (por metro)', cantidad:500,precio:3.20,  descuento:10, subtotal:1440.00 },
        { producto_id:'PROD-009', descripcion:'Conector RJ45 Cat6 (caja x100)',       cantidad:10, precio:32.00, descuento:0,  subtotal:320.00 },
        { producto_id:'PROD-015', descripcion:'Canaleta PVC 60x40mm 2m c/tapa',      cantidad:40, precio:54.00, descuento:0,  subtotal:2160.00 }
      ],
      subtotal:3920.00, impuesto:705.60, total:4625.60,
      estado:'pendiente', notas:'Materiales para cableado estructurado'
    },
    {
      id:'PRO-003', numero:'PRO-0003',
      cliente:'Cliente Demo - Corporación Norte', fecha:'2026-06-20', vencimiento:'2026-07-20',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-004', descripcion:'Cámara IP Domo 2MP IR 30m',   cantidad:16, precio:215.00,descuento:8, subtotal:3164.80 },
        { producto_id:'PROD-014', descripcion:'DVR Turbo HD 8 Canales 5MP',  cantidad:2,  precio:780.00,descuento:5, subtotal:1482.00 }
      ],
      subtotal:4646.80, impuesto:836.42, total:5483.22,
      estado:'aprobada', notas:'Sistema de videovigilancia y seguridad'
    },
    {
      id:'PRO-004', numero:'PRO-0004',
      cliente:'Cliente Demo - Institución Beta', fecha:'2026-06-01', vencimiento:'2026-07-01',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-010', descripcion:'Cable Fibra Óptica SM G.652D 500m', cantidad:2, precio:1840.00,descuento:0, subtotal:3680.00 },
        { producto_id:'PROD-005', descripcion:'UPS 1000VA / 600W Senoidal',        cantidad:3, precio:625.00, descuento:5, subtotal:1781.25 }
      ],
      subtotal:5461.25, impuesto:983.03, total:6444.28,
      estado:'vencida', notas:'Bobinas de fibra óptica y respaldo UPS'
    },
    {
      id:'PRO-005', numero:'PRO-0005',
      cliente:'Cliente Demo - Telecom Delta', fecha:'2026-07-28', vencimiento:'2026-08-27',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-007', descripcion:'Rack Pared Abierto 12U 550mm',    cantidad:4, precio:720.00,descuento:0, subtotal:2880.00 },
        { producto_id:'PROD-013', descripcion:'Cable UTP Cat5e 305m (caja)',     cantidad:4, precio:285.00,descuento:0, subtotal:1140.00 }
      ],
      subtotal:4020.00, impuesto:723.60, total:4743.60,
      estado:'pendiente', notas:'Despacho para centro de datos'
    },
    {
      id:'PRO-006', numero:'PRO-0006',
      cliente:'Cliente Demo - Soluciones Tech S.A.C.', fecha:'2026-08-01', vencimiento:'2026-08-31',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-003', descripcion:'Switch Administrable 24P PoE Gigabit', cantidad:2,precio:1280.00,descuento:10, subtotal:2304.00 },
        { producto_id:'PROD-012', descripcion:'Access Point WiFi 6 Techo Dual Band',  cantidad:6,precio:498.00, descuento:8,  subtotal:2748.96 }
      ],
      subtotal:5052.96, impuesto:909.53, total:5962.49,
      estado:'pendiente', notas:'Switches y puntos de acceso para oficinas'
    },
    {
      id:'PRO-007', numero:'PRO-0007',
      cliente:'Cliente Demo - Empresa Alfa', fecha:'2026-05-15', vencimiento:'2026-06-14',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-001', descripcion:'Cable Ethernet Cat6 Gris (por metro)', cantidad:300,precio:3.20,descuento:0, subtotal:960.00 }
      ],
      subtotal:960.00, impuesto:172.80, total:1132.80,
      estado:'rechazada', notas:'Cotización expirada no concretada'
    },
    {
      id:'PRO-008', numero:'PRO-0008',
      cliente:'Cliente Demo - Corporación Norte', fecha:'2026-08-03', vencimiento:'2026-09-02',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-003', descripcion:'Switch Administrable 24P PoE Gigabit', cantidad:2,precio:1280.00,descuento:5, subtotal:2432.00 },
        { producto_id:'PROD-004', descripcion:'Cámara IP Domo 2MP IR 30m',            cantidad:8,precio:215.00, descuento:0, subtotal:1720.00 }
      ],
      subtotal:4152.00, impuesto:747.36, total:4899.36,
      estado:'aprobada', notas:'Lote de switches y cámaras de red'
    }
  ];

  const DEMO_FACTURAS = [
    {
      id:'FAC-001', numero:'FAC-0001', proforma_id:'PRO-003',
      cliente:'Cliente Demo - Corporación Norte', fecha:'2026-06-25', vencimiento_pago:'2026-07-25',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-004', descripcion:'Cámara IP Domo 2MP IR 30m',   cantidad:16,precio:215.00,descuento:8, subtotal:3164.80 },
        { producto_id:'PROD-014', descripcion:'DVR Turbo HD 8 Canales 5MP',  cantidad:2, precio:780.00,descuento:5, subtotal:1482.00 }
      ],
      subtotal:4646.80, impuesto:836.42, total:5483.22,
      estado_pago:'cobrada', monto_cobrado:5483.22
    },
    {
      id:'FAC-002', numero:'FAC-0002', proforma_id:null,
      cliente:'Cliente Demo - Soluciones Tech S.A.C.', fecha:'2026-05-10', vencimiento_pago:'2026-06-09',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-002', descripcion:'Router WiFi 6 AX3000 Doble Banda',    cantidad:3, precio:340.00,descuento:0,  subtotal:1020.00 },
        { producto_id:'PROD-011', descripcion:'Transceiver SFP 1G Multimodo 550m',   cantidad:5, precio:145.00,descuento:0,  subtotal:725.00 }
      ],
      subtotal:1745.00, impuesto:314.10, total:2059.10,
      estado_pago:'cobrada', monto_cobrado:2059.10
    },
    {
      id:'FAC-003', numero:'FAC-0003', proforma_id:null,
      cliente:'Cliente Demo - Institución Beta', fecha:'2026-04-18', vencimiento_pago:'2026-05-18',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-010', descripcion:'Cable Fibra Óptica SM G.652D 500m',    cantidad:1, precio:1840.00,descuento:0, subtotal:1840.00 },
        { producto_id:'PROD-005', descripcion:'UPS 1000VA / 600W Senoidal',          cantidad:2, precio:625.00, descuento:5, subtotal:1187.50 }
      ],
      subtotal:3027.50, impuesto:544.95, total:3572.45,
      estado_pago:'vencida', monto_cobrado:0
    },
    {
      id:'FAC-004', numero:'FAC-0004', proforma_id:null,
      cliente:'Cliente Demo - Empresa Alfa', fecha:'2026-06-05', vencimiento_pago:'2026-07-05',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-001', descripcion:'Cable Ethernet Cat6 Gris (por metro)', cantidad:400,precio:3.20,  descuento:10, subtotal:1152.00 },
        { producto_id:'PROD-015', descripcion:'Canaleta PVC 60x40mm 2m c/tapa',      cantidad:30, precio:54.00, descuento:0,  subtotal:1620.00 },
        { producto_id:'PROD-008', descripcion:'Panel de Parcheo Cat6 24 Puertos',     cantidad:2,  precio:195.00,descuento:0,  subtotal:390.00 }
      ],
      subtotal:3162.00, impuesto:569.16, total:3731.16,
      estado_pago:'cobrada', monto_cobrado:3731.16
    },
    {
      id:'FAC-005', numero:'FAC-0005', proforma_id:null,
      cliente:'Cliente Demo - Telecom Delta', fecha:'2026-07-14', vencimiento_pago:'2026-08-13',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-013', descripcion:'Cable UTP Cat5e 305m (caja)',           cantidad:4,precio:285.00,descuento:0, subtotal:1140.00 },
        { producto_id:'PROD-007', descripcion:'Rack Pared Abierto 12U 550mm',          cantidad:2,precio:720.00,descuento:0, subtotal:1440.00 }
      ],
      subtotal:2580.00, impuesto:464.40, total:3044.40,
      estado_pago:'parcial', monto_cobrado:1522.20
    },
    {
      id:'FAC-006', numero:'FAC-0006', proforma_id:null,
      cliente:'Cliente Demo - Soluciones Tech S.A.C.', fecha:'2026-03-22', vencimiento_pago:'2026-04-21',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-002', descripcion:'Router WiFi 6 AX3000 Doble Banda', cantidad:5, precio:340.00,descuento:5, subtotal:1615.00 },
        { producto_id:'PROD-011', descripcion:'Transceiver SFP 1G Multimodo 550m',   cantidad:4, precio:145.00, descuento:0, subtotal:580.00 }
      ],
      subtotal:2195.00, impuesto:395.10, total:2590.10,
      estado_pago:'cobrada', monto_cobrado:2590.10
    },
    {
      id:'FAC-007', numero:'FAC-0007', proforma_id:null,
      cliente:'Cliente Demo - Corporación Norte', fecha:'2026-02-14', vencimiento_pago:'2026-03-15',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-003', descripcion:'Switch Administrable 24P PoE Gigabit', cantidad:2, precio:1280.00,descuento:0, subtotal:2560.00 },
        { producto_id:'PROD-012', descripcion:'Access Point WiFi 6 Techo Dual Band',  cantidad:4, precio:498.00, descuento:5, subtotal:1892.40 }
      ],
      subtotal:4452.40, impuesto:801.43, total:5253.83,
      estado_pago:'cobrada', monto_cobrado:5253.83
    },
    {
      id:'FAC-008', numero:'FAC-0008', proforma_id:null,
      cliente:'Cliente Demo - Institución Beta', fecha:'2026-08-01', vencimiento_pago:'2026-08-31',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-014', descripcion:'DVR Turbo HD 8 Canales 5MP',           cantidad:1,precio:780.00,descuento:0, subtotal:780.00 },
        { producto_id:'PROD-004', descripcion:'Cámara IP Domo 2MP IR 30m',            cantidad:6,precio:215.00,descuento:0, subtotal:1290.00 }
      ],
      subtotal:2070.00, impuesto:372.60, total:2442.60,
      estado_pago:'pendiente', monto_cobrado:0
    },
    {
      id:'FAC-009', numero:'FAC-0009', proforma_id:null,
      cliente:'Cliente Demo - Soluciones Tech S.A.C.', fecha:'2026-01-20', vencimiento_pago:'2026-02-19',
      moneda:'PEN',
      items:[
        { producto_id:'PROD-007', descripcion:'Rack Pared Abierto 12U 550mm',   cantidad:2, precio:720.00,descuento:8, subtotal:1324.80 },
        { producto_id:'PROD-013', descripcion:'Cable UTP Cat5e 305m (caja)',     cantidad:5, precio:285.00,descuento:0, subtotal:1425.00 }
      ],
      subtotal:2749.80, impuesto:494.96, total:3244.76,
      estado_pago:'cobrada', monto_cobrado:3244.76
    }
  ];

  const DEMO_MOVIMIENTOS = [
    { id:'MOV-001', producto_id:'PROD-001', tipo:'entrada',  cantidad:1000, fecha:'2026-01-10', referencia:'OC-0021', notas:'Compra proveedor' },
    { id:'MOV-002', producto_id:'PROD-002', tipo:'entrada',  cantidad:50,   fecha:'2026-01-12', referencia:'OC-0022', notas:'Stock inicial' },
    { id:'MOV-003', producto_id:'PROD-004', tipo:'entrada',  cantidad:40,   fecha:'2026-02-05', referencia:'OC-0023', notas:'Compra mensual' },
    { id:'MOV-004', producto_id:'PROD-004', tipo:'salida',   cantidad:16,   fecha:'2026-06-25', referencia:'FAC-0001', notas:'Factura FAC-0001' },
    { id:'MOV-005', producto_id:'PROD-014', tipo:'salida',   cantidad:2,    fecha:'2026-06-25', referencia:'FAC-0001', notas:'Factura FAC-0001' },
    { id:'MOV-006', producto_id:'PROD-002', tipo:'salida',   cantidad:3,    fecha:'2026-05-10', referencia:'FAC-0002', notas:'Factura FAC-0002' },
    { id:'MOV-007', producto_id:'PROD-010', tipo:'entrada',  cantidad:5,    fecha:'2026-03-20', referencia:'OC-0024', notas:'Stock fibra óptica' },
    { id:'MOV-008', producto_id:'PROD-010', tipo:'salida',   cantidad:2,    fecha:'2026-04-18', referencia:'FAC-0003', notas:'Factura FAC-0003' },
    { id:'MOV-009', producto_id:'PROD-005', tipo:'entrada',  cantidad:10,   fecha:'2026-04-01', referencia:'OC-0025', notas:'Reposición UPS' },
    { id:'MOV-010', producto_id:'PROD-005', tipo:'salida',   cantidad:4,    fecha:'2026-02-14', referencia:'FAC-0007', notas:'Factura FAC-0007' },
    { id:'MOV-011', producto_id:'PROD-012', tipo:'salida',   cantidad:5,    fecha:'2026-03-22', referencia:'FAC-0006', notas:'Factura FAC-0006' },
    { id:'MOV-012', producto_id:'PROD-001', tipo:'salida',   cantidad:400,  fecha:'2026-06-05', referencia:'FAC-0004', notas:'Factura FAC-0004' },
    { id:'MOV-013', producto_id:'PROD-003', tipo:'entrada',  cantidad:15,   fecha:'2026-05-15', referencia:'OC-0026', notas:'Reposición switches' },
    { id:'MOV-014', producto_id:'PROD-003', tipo:'salida',   cantidad:3,    fecha:'2026-07-01', referencia:'FAC-0003', notas:'Complemento factura' },
    { id:'MOV-015', producto_id:'PROD-009', tipo:'entrada',  cantidad:50,   fecha:'2026-06-10', referencia:'OC-0027', notas:'Cajas conectores' }
  ];

  // ─── Init (carga datos demo para la sesión del visitante) ───
  function init() {
    const initialized = sessionStorage.getItem(KEYS.INITIALIZED);
    if (!initialized) {
      persist(KEYS.PRODUCTOS,   DEMO_PRODUCTOS);
      persist(KEYS.PROFORMAS,   DEMO_PROFORMAS);
      persist(KEYS.FACTURAS,    DEMO_FACTURAS);
      persist(KEYS.MOVIMIENTOS, DEMO_MOVIMIENTOS);
      sessionStorage.setItem(KEYS.INITIALIZED, 'true');
    }
  }

  function clearAllData() {
    persist(KEYS.PRODUCTOS,   []);
    persist(KEYS.PROFORMAS,   []);
    persist(KEYS.FACTURAS,    []);
    persist(KEYS.MOVIMIENTOS, []);
  }

  function resetDemo() {
    Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
    init();
  }

  // ─── PROFORMAS ────────────────────────────────────────────────────────────
  const proformas = {
    getAll()         { return load(KEYS.PROFORMAS); },
    getById(id)      { return load(KEYS.PROFORMAS).find(p => p.id === id) || null; },
    save(data) {
      const all = load(KEYS.PROFORMAS);
      if (!data.id) {
        data.id     = uid('PRO');
        data.numero = nextNumero(all, 'PRO');
        all.push(data);
      } else {
        const idx = all.findIndex(p => p.id === data.id);
        if (idx >= 0) all[idx] = data; else all.push(data);
      }
      persist(KEYS.PROFORMAS, all);
      return data;
    },
    delete(id) {
      persist(KEYS.PROFORMAS, load(KEYS.PROFORMAS).filter(p => p.id !== id));
    }
  };

  // ─── FACTURAS ─────────────────────────────────────────────────────────────
  const facturas = {
    getAll()         { return load(KEYS.FACTURAS); },
    getById(id)      { return load(KEYS.FACTURAS).find(f => f.id === id) || null; },
    save(data) {
      const all = load(KEYS.FACTURAS);
      if (!data.id) {
        data.id     = uid('FAC');
        data.numero = nextNumero(all, 'FAC');
        all.push(data);
      } else {
        const idx = all.findIndex(f => f.id === data.id);
        if (idx >= 0) all[idx] = data; else all.push(data);
      }
      persist(KEYS.FACTURAS, all);
      return data;
    },
    delete(id) {
      persist(KEYS.FACTURAS, load(KEYS.FACTURAS).filter(f => f.id !== id));
    }
  };

  // ─── PRODUCTOS ────────────────────────────────────────────────────────────
  const productos = {
    getAll()         { return load(KEYS.PRODUCTOS); },
    getById(id)      { return load(KEYS.PRODUCTOS).find(p => p.id === id) || null; },
    save(data) {
      const all = load(KEYS.PRODUCTOS);
      if (!data.id) {
        data.id = uid('PROD');
        all.push(data);
      } else {
        const idx = all.findIndex(p => p.id === data.id);
        if (idx >= 0) all[idx] = data; else all.push(data);
      }
      persist(KEYS.PRODUCTOS, all);
      return data;
    },
    delete(id) {
      persist(KEYS.PRODUCTOS, load(KEYS.PRODUCTOS).filter(p => p.id !== id));
    }
  };

  // ─── MOVIMIENTOS ─────────────────────────────────────────────────────────
  const movimientos = {
    getAll()              { return load(KEYS.MOVIMIENTOS); },
    getByProducto(prodId) { return load(KEYS.MOVIMIENTOS).filter(m => m.producto_id === prodId); },
    save(data) {
      const all = load(KEYS.MOVIMIENTOS);
      data.id = uid('MOV');
      all.push(data);
      persist(KEYS.MOVIMIENTOS, all);
      // Actualizar stock del producto
      const prods = load(KEYS.PRODUCTOS);
      const idx   = prods.findIndex(p => p.id === data.producto_id);
      if (idx >= 0) {
        const delta = data.tipo === 'entrada' ? +data.cantidad : -data.cantidad;
        prods[idx].stock = Math.max(0, prods[idx].stock + delta);
        persist(KEYS.PRODUCTOS, prods);
      }
      return data;
    }
  };

  // ─── STATS ────────────────────────────────────────────────────────────────
  const stats = {
    getKPIs() {
      const pros  = load(KEYS.PROFORMAS);
      const facs  = load(KEYS.FACTURAS);
      const prods = load(KEYS.PRODUCTOS);
      const now   = new Date();

      const proformasActivas   = pros.filter(p => ['pendiente','aprobada'].includes(p.estado)).length;
      const facsPendientes     = facs.filter(f => ['pendiente','parcial'].includes(f.estado_pago));
      const totalPorCobrar     = facsPendientes.reduce((s,f) => s + (f.total - (f.monto_cobrado||0)), 0);
      const valorInventario    = prods.reduce((s,p) => s + (p.precio * p.stock), 0);
      const stockBajo          = prods.filter(p => p.stock <= p.stock_minimo);

      // Ventas del mes actual (facturas cobradas o parciales)
      const mesActual = facs.filter(f => {
        const d = new Date(f.fecha + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const ventasMes = mesActual.reduce((s,f) => s + f.total, 0);

      return { proformasActivas, facsPendientes: facsPendientes.length, totalPorCobrar, valorInventario, ventasMes, stockBajo };
    },

    getVentasPorProducto() {
      const facs = load(KEYS.FACTURAS);
      const map  = {};
      facs.forEach(f => {
        f.items.forEach(item => {
          if (!map[item.descripcion]) map[item.descripcion] = 0;
          map[item.descripcion] += item.subtotal;
        });
      });
      return Object.entries(map)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    },

    getVentasPorMoneda() {
      const facs = load(KEYS.FACTURAS);
      const map  = {};
      facs.forEach(f => {
        if (!map[f.moneda]) map[f.moneda] = 0;
        map[f.moneda] += f.total;
      });
      return Object.entries(map).map(([moneda, total]) => ({ moneda, total }));
    },

    getVentasPorPeso() {
      const facs  = load(KEYS.FACTURAS);
      const prods = load(KEYS.PRODUCTOS);
      const map   = {};
      facs.forEach(f => {
        f.items.forEach(item => {
          const prod = prods.find(p => p.id === item.producto_id);
          if (!map[item.descripcion]) map[item.descripcion] = { ventas: 0, peso: 0 };
          map[item.descripcion].ventas += item.subtotal;
          if (prod) map[item.descripcion].peso += item.cantidad * (prod.peso_unitario || 0);
        });
      });
      return Object.entries(map)
        .map(([name, d]) => ({ name, ventas: d.ventas, peso: d.peso }))
        .filter(d => d.peso > 0)
        .sort((a, b) => b.peso - a.peso)
        .slice(0, 10);
    },

    getTendenciaMensual(year) {
      const facs    = load(KEYS.FACTURAS);
      const meses   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const anio    = year || new Date().getFullYear();
      const ventas  = new Array(12).fill(0);
      const factNum = new Array(12).fill(0);
      facs.forEach(f => {
        const d = new Date(f.fecha + 'T00:00:00');
        if (d.getFullYear() === anio) {
          ventas[d.getMonth()] += f.total;
          factNum[d.getMonth()]++;
        }
      });
      return { labels: meses, ventas, facturas: factNum };
    },

    getVentasPorCliente() {
      const facs = load(KEYS.FACTURAS);
      const map  = {};
      facs.forEach(f => {
        if (!map[f.cliente]) map[f.cliente] = 0;
        map[f.cliente] += f.total;
      });
      return Object.entries(map)
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((a, b) => b.total - a.total);
    }
  };

  // ─── Generic Accessors ───────────────────────────────────────────────────
  function getAll(entity) {
    if (entity === 'proformas') return proformas.getAll();
    if (entity === 'facturas')  return facturas.getAll();
    if (entity === 'inventario' || entity === 'productos') return productos.getAll();
    if (entity === 'movimientos') return movimientos.getAll();
    return [];
  }

  function save(entity, data) {
    if (entity === 'proformas') return proformas.save(data);
    if (entity === 'facturas')  return facturas.save(data);
    if (entity === 'inventario' || entity === 'productos') return productos.save(data);
    if (entity === 'movimientos') return movimientos.save(data);
    return data;
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return { init, resetDemo, clearAllData, proformas, facturas, productos, movimientos, stats, getAll, save };
})();

