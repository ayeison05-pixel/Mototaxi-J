// db.js - Gestión de la base de datos local (IndexedDB) para mototaxi-j
// Versión actualizada: ahora guarda la hora de registro (Caracas, 12h)

const DB_NAME = 'mototaxi-j-db';
const DB_VERSION = 2; // ⬅️ Incrementado para activar onupgradeneeded

let dbInstance = null;

/**
 * Abre o crea la base de datos
 */
function abrirDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Almacén de jornadas
      if (!db.objectStoreNames.contains('jornadas')) {
        const jornadasStore = db.createObjectStore('jornadas', { keyPath: 'fecha' });
        jornadasStore.createIndex('fecha', 'fecha', { unique: true });
      }

      // Almacén de carreras
      if (!db.objectStoreNames.contains('carreras')) {
        const carrerasStore = db.createObjectStore('carreras', { keyPath: 'id' });
        carrerasStore.createIndex('fecha', 'fecha', { unique: false });
        carrerasStore.createIndex('pagadoEnFecha', 'pagadoEnFecha', { unique: false });
      } else {
        // Si ya existe, aseguramos que no hay cambios estructurales necesarios
        // (IndexedDB no requiere alterar campos existentes)
      }

      // Almacén de gastos
      if (!db.objectStoreNames.contains('gastos')) {
        const gastosStore = db.createObjectStore('gastos', { keyPath: 'id' });
        gastosStore.createIndex('fecha', 'fecha', { unique: false });
      }
    };
  });
}

// ─── JORNADAS ───────────────────────────────────────

async function guardarJornada(jornada) {
  const db = await abrirDB();
  const tx = db.transaction('jornadas', 'readwrite');
  const store = tx.objectStore('jornadas');
  await store.put(jornada);
  await tx.done;
}

async function obtenerJornada(fecha) {
  const db = await abrirDB();
  const tx = db.transaction('jornadas', 'readonly');
  const store = tx.objectStore('jornadas');
  const request = store.get(fecha);
  return new Promise(resolve => {
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function obtenerTodasLasFechasConDatos() {
  const db = await abrirDB();
  const tx = db.transaction('jornadas', 'readonly');
  const store = tx.objectStore('jornadas');
  const request = store.getAllKeys();
  return new Promise(resolve => {
    request.onsuccess = () => resolve(request.result || []);
  });
}

// ─── CARRERAS ───────────────────────────────────────

async function guardarCarrera(carrera) {
  const db = await abrirDB();
  const tx = db.transaction('carreras', 'readwrite');
  const store = tx.objectStore('carreras');
  await store.put(carrera);
  await tx.done;
}

async function obtenerCarrerasPorFecha(fecha) {
  const db = await abrirDB();
  const tx = db.transaction('carreras', 'readonly');
  const store = tx.objectStore('carreras');
  const index = store.index('fecha');
  const request = index.getAll(fecha);
  return new Promise(resolve => {
    request.onsuccess = () => resolve(request.result || []);
  });
}

// NUEVO: Obtener TODAS las carreras fiadas pendientes (de cualquier día)
async function obtenerTodasLasFiadasPendientes() {
  const db = await abrirDB();
  const tx = db.transaction('carreras', 'readonly');
  const store = tx.objectStore('carreras');
  const request = store.openCursor();
  const pendientes = [];
  return new Promise(resolve => {
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const carrera = cursor.value;
        if (carrera.metodoPago === 'fiada' && carrera.estado === 'pendiente') {
          pendientes.push(carrera);
        }
        cursor.continue();
      } else {
        resolve(pendientes);
      }
    };
  });
}

async function obtenerPagosDeFiadasRecibidosEn(fecha) {
  const db = await abrirDB();
  const tx = db.transaction('carreras', 'readonly');
  const store = tx.objectStore('carreras');
  const index = store.index('pagadoEnFecha');
  const request = index.getAll(fecha);
  return new Promise(resolve => {
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function obtenerCarreraPorId(id) {
  const db = await abrirDB();
  const tx = db.transaction('carreras', 'readonly');
  const store = tx.objectStore('carreras');
  const request = store.get(id);
  return new Promise(resolve => {
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ─── GASTOS ─────────────────────────────────────────

async function guardarGasto(gasto) {
  const db = await abrirDB();
  const tx = db.transaction('gastos', 'readwrite');
  const store = tx.objectStore('gastos');
  await store.put(gasto);
  await tx.done;
}

async function obtenerGastosPorFecha(fecha) {
  const db = await abrirDB();
  const tx = db.transaction('gastos', 'readonly');
  const store = tx.objectStore('gastos');
  const index = store.index('fecha');
  const request = index.getAll(fecha);
  return new Promise(resolve => {
    request.onsuccess = () => resolve(request.result || []);
  });
}

// ─── Exportar funciones ─────────────────────────────

if (typeof window !== 'undefined') {
  window.db = {
    guardarJornada,
    obtenerJornada,
    obtenerTodasLasFechasConDatos,
    guardarCarrera,
    obtenerCarrerasPorFecha,
    obtenerTodasLasFiadasPendientes, // ⬅️ NUEVA función
    obtenerPagosDeFiadasRecibidosEn,
    obtenerCarreraPorId,
    guardarGasto,
    obtenerGastosPorFecha
  };
}