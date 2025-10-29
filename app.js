// app.js - Lógica principal de la PWA mototaxi-j

let fechaActual = ''; // Fecha de Caracas del día actual (YYYY-MM-DD)
let jornadaActiva = null;

// ─── Inicialización al cargar la página ───────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Obtener fecha actual en Caracas
  const ahora = ahoraEnCaracas();
  fechaActual = ahora.fechaISO;
  document.getElementById('titulo-fecha').textContent = ahora.fechaLegible;

  // 2. Cargar jornada del día
  await cargarJornadaDelDia();

  // 3. Configurar eventos de los botones
  configurarEventos();
});

// ─── Cargar jornada del día actual ────────────────────────────────────
async function cargarJornadaDelDia() {
  jornadaActiva = await db.obtenerJornada(fechaActual);

  const panelEmpezar = document.getElementById('panel-empezar');
  const accionesDiarias = document.getElementById('acciones-diarias');

  if (!jornadaActiva) {
    // Mostrar panel para empezar jornada
    panelEmpezar.style.display = 'block';
    accionesDiarias.style.display = 'none';
    document.getElementById('lista-registros').style.display = 'none';
    document.getElementById('mensaje-vacio').style.display = 'none';
  } else {
    // Mostrar interfaz activa
    panelEmpezar.style.display = 'none';
    accionesDiarias.style.display = 'block';
    await renderizarRegistrosDelDia();
  }

  actualizarResumen();
}

// ─── Configurar todos los eventos ─────────────────────────────────────
function configurarEventos() {
  // ── Empezar jornada ──
  document.getElementById('btn-empezar').addEventListener('click', async () => {
    const montoInput = document.getElementById('monto-inicial').value;
    const monto = parseInt(montoInput);
    if (isNaN(monto) || monto <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }
    jornadaActiva = {
      fecha: fechaActual,
      montoInicial: monto,
      cerrada: false
    };
    await db.guardarJornada(jornadaActiva);
    await cargarJornadaDelDia();
  });

  // ── Nueva carrera ──
  document.getElementById('btn-nueva-carrera').addEventListener('click', () => {
    document.getElementById('monto-carrera').value = '';
    document.getElementById('nota-carrera').value = '';
    document.querySelectorAll('#metodos-carrera .metodo').forEach(el => {
      el.classList.remove('seleccionado');
    });
    document.getElementById('panel-carrera').classList.add('visible');
  });

  // ── Cerrar panel carrera ──
  document.getElementById('cerrar-carrera').addEventListener('click', () => {
    document.getElementById('panel-carrera').classList.remove('visible');
  });

  // ── Botones preestablecidos de montos ──
  document.querySelectorAll('.boton-monto').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('monto-carrera').value = btn.dataset.monto;
    });
  });

  // ── Selección de método de pago ──
  document.querySelectorAll('#metodos-carrera .metodo').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#metodos-carrera .metodo').forEach(b => b.classList.remove('seleccionado'));
      btn.classList.add('seleccionado');
    });
  });

  // ── Guardar carrera ──
  document.getElementById('guardar-carrera').addEventListener('click', async () => {
    const monto = parseInt(document.getElementById('monto-carrera').value);
    const nota = document.getElementById('nota-carrera').value.trim();
    const metodoSeleccionado = document.querySelector('#metodos-carrera .metodo.seleccionado');

    if (isNaN(monto) || monto <= 0) {
      alert('Monto inválido');
      return;
    }
    if (!metodoSeleccionado) {
      alert('Selecciona un método de pago');
      return;
    }

    const metodo = metodoSeleccionado.dataset.metodo;
    const id = 'c-' + Date.now();

    const carrera = {
      id,
      fecha: fechaActual,
      monto,
      metodoPago: metodo,
      estado: metodo === 'fiada' ? 'pendiente' : 'pagada',
      nota: nota || ''
    };

    await db.guardarCarrera(carrera);
    document.getElementById('panel-carrera').classList.remove('visible');
    await renderizarRegistrosDelDia();
    actualizarResumen();
  });

  // ── Nuevo gasto ──
  document.getElementById('btn-nuevo-gasto').addEventListener('click', () => {
    document.getElementById('monto-gasto').value = '';
    document.getElementById('nota-gasto').value = '';
    document.querySelectorAll('#categorias-gasto .metodo').forEach(el => {
      el.classList.remove('seleccionado');
    });
    document.getElementById('panel-gasto').classList.add('visible');
  });

  // ── Cerrar panel gasto ──
  document.getElementById('cerrar-gasto').addEventListener('click', () => {
    document.getElementById('panel-gasto').classList.remove('visible');
  });

  // ── Selección de categoría de gasto ──
  document.querySelectorAll('#categorias-gasto .metodo').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#categorias-gasto .metodo').forEach(b => b.classList.remove('seleccionado'));
      btn.classList.add('seleccionado');
    });
  });

  // ── Guardar gasto ──
  document.getElementById('guardar-gasto').addEventListener('click', async () => {
    const monto = parseInt(document.getElementById('monto-gasto').value);
    const nota = document.getElementById('nota-gasto').value.trim();
    const categoriaSeleccionada = document.querySelector('#categorias-gasto .metodo.seleccionado');

    if (isNaN(monto) || monto <= 0) {
      alert('Monto inválido');
      return;
    }
    if (!categoriaSeleccionada) {
      alert('Selecciona una categoría');
      return;
    }

    const id = 'g-' + Date.now();
    const gasto = {
      id,
      fecha: fechaActual,
      monto,
      categoria: categoriaSeleccionada.dataset.categoria,
      nota: nota || ''
    };

    await db.guardarGasto(gasto);
    document.getElementById('panel-gasto').classList.remove('visible');
    await renderizarRegistrosDelDia();
    actualizarResumen();
  });

  // ── Cerrar jornada ──
  document.getElementById('btn-cerrar-jornada').addEventListener('click', async () => {
    const resumenCierre = document.getElementById('resumen-cierre');
    const ahorroInput = document.getElementById('ahorro-karen');
    ahorroInput.value = '';

    // Calcular resumen para mostrar
    const carreras = await db.obtenerCarrerasPorFecha(fechaActual);
    const pagosFiadasHoy = await db.obtenerPagosDeFiadasRecibidosEn(fechaActual);
    const gastos = await db.obtenerGastosPorFecha(fechaActual);

    const ingresosReales = carreras
      .filter(c => c.metodoPago !== 'fiada')
      .reduce((sum, c) => sum + c.monto, 0);

    const pagosFiadas = pagosFiadasHoy.reduce((sum, c) => sum + c.monto, 0);
    const totalIngresos = ingresosReales + pagosFiadas;
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

    resumenCierre.innerHTML = `
      <p><strong>Resumen final</strong></p>
      <p>Inicio: ${formatoCOP(jornadaActiva.montoInicial)}</p>
      <p>Ingresos reales: ${formatoCOP(totalIngresos)}</p>
      <p>Gastos: ${formatoCOP(totalGastos)}</p>
      <p><strong>Total antes de ahorro: ${formatoCOP(jornadaActiva.montoInicial + totalIngresos - totalGastos)}</strong></p>
    `;

    document.getElementById('panel-cierre').classList.add('visible');
  });

  // ── Confirmar cierre ──
  document.getElementById('btn-confirmar-cierre').addEventListener('click', async () => {
    const ahorro = parseInt(document.getElementById('ahorro-karen').value) || 0;
    jornadaActiva.ahorroKaren = ahorro;
    jornadaActiva.cerrada = true;
    await db.guardarJornada(jornadaActiva);
    document.getElementById('panel-cierre').classList.remove('visible');
    await cargarJornadaDelDia();
  });

  document.getElementById('cerrar-cierre').addEventListener('click', () => {
    document.getElementById('panel-cierre').classList.remove('visible');
  });

  // ── Ver otro día ──
  document.getElementById('btn-ver-otro-dia').addEventListener(async () => {
    // Por ahora, solo muestra un mensaje. En una versión futura, podrías agregar un selector de fecha.
    alert('Función de historial en desarrollo. Próximamente podrás ver días anteriores.');
  });
}

// ─── Renderizar carreras y gastos del día ─────────────────────────────
async function renderizarRegistrosDelDia() {
  const contenedor = document.getElementById('lista-registros');
  const mensajeVacio = document.getElementById('mensaje-vacio');

  const carreras = await db.obtenerCarrerasPorFecha(fechaActual);
  const gastos = await db.obtenerGastosPorFecha(fechaActual);
  const pagosFiadasHoy = await db.obtenerPagosDeFiadasRecibidosEn(fechaActual);

  if (carreras.length === 0 && gastos.length === 0 && pagosFiadasHoy.length === 0) {
    contenedor.style.display = 'none';
    mensajeVacio.style.display = 'block';
    return;
  }

  mensajeVacio.style.display = 'none';
  contenedor.style.display = 'block';
  contenedor.innerHTML = '';

  // Mostrar carreras del día
  carreras.forEach(c => {
    const clase = c.metodoPago === 'fiada' ? 'pendiente' : 'pagada';
    const metodoTexto = c.metodoPago === 'efectivo' ? 'Efectivo' : c.metodoPago === 'nequi' ? 'Nequi' : 'Fiada';
    const item = document.createElement('div');
    item.className = `item ${clase}`;
    item.innerHTML = `
      <strong>${formatoCOP(c.monto)}</strong> – ${metodoTexto}
      ${c.nota ? `<br><small>${c.nota}</small>` : ''}
      ${c.metodoPago === 'fiada' && c.estado === 'pendiente' ? '<br><small>⚠️ Pendiente</small>' : ''}
    `;
    contenedor.appendChild(item);
  });

  // Mostrar pagos de fiadas recibidos HOY (de días anteriores)
  pagosFiadasHoy.forEach(c => {
    const item = document.createElement('div');
    item.className = 'item pagada';
    item.innerHTML = `
      <strong>${formatoCOP(c.monto)}</strong> – Pago de fiada (${c.fecha})
      ${c.nota ? `<br><small>${c.nota}</small>` : ''}
    `;
    contenedor.appendChild(item);
  });

  // Mostrar gastos
  gastos.forEach(g => {
    const item = document.createElement('div');
    item.className = 'item';
    const categoriaTexto = {
      gasolina: '⛽ Gasolina',
      comida: '🍔 Comida',
      reparacion: '🔧 Reparación',
      otro: '✏️ Otro'
    }[g.categoria] || g.categoria;
    item.innerHTML = `
      <strong>-${formatoCOP(g.monto)}</strong> – ${categoriaTexto}
      ${g.nota ? `<br><small>${g.nota}</small>` : ''}
    `;
    contenedor.appendChild(item);
  });
}

// ─── Actualizar resumen en tiempo real ────────────────────────────────
async function actualizarResumen() {
  const resumenEl = document.getElementById('resumen-diario');
  if (!jornadaActiva) {
    resumenEl.textContent = 'Inicia tu jornada para ver el resumen.';
    return;
  }

  const carreras = await db.obtenerCarrerasPorFecha(fechaActual);
  const pagosFiadasHoy = await db.obtenerPagosDeFiadasRecibidosEn(fechaActual);
  const gastos = await db.obtenerGastosPorFecha(fechaActual);

  const ingresosReales = carreras
    .filter(c => c.metodoPago !== 'fiada')
    .reduce((sum, c) => sum + c.monto, 0);

  const pagosFiadas = pagosFiadasHoy.reduce((sum, c) => sum + c.monto, 0);
  const totalIngresos = ingresosReales + pagosFiadas;
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

  const totalEnMano = jornadaActiva.montoInicial + totalIngresos - totalGastos;

  let texto = `
    Inicio: ${formatoCOP(jornadaActiva.montoInicial)}<br>
    Ingresos: ${formatoCOP(totalIngresos)}<br>
    Gastos: ${formatoCOP(totalGastos)}<br>
    → Total: ${formatoCOP(totalEnMano)}
  `;

  // Mostrar fiadas pendientes
  const fiadasPendientes = carreras.filter(c => c.metodoPago === 'fiada' && c.estado === 'pendiente');
  const totalFiadas = fiadasPendientes.reduce((sum, c) => sum + c.monto, 0);
  if (totalFiadas > 0) {
    texto += `<br><small>Fiadas pendientes: ${formatoCOP(totalFiadas)}</small>`;
  }

  resumenEl.innerHTML = texto;
}