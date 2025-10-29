// app.js - Lógica principal de la PWA mototaxi-j (versión con nuevas funciones)

let fechaActual = '';
let jornadaActiva = null;
let filtroActual = 'todo'; // 'todo', 'pagos', 'gastos', 'pendientes'

document.addEventListener('DOMContentLoaded', async () => {
  const ahora = ahoraEnCaracas();
  fechaActual = ahora.fechaISO;
  document.getElementById('titulo-fecha').textContent = ahora.fechaLegible;

  await cargarJornadaDelDia();
  configurarEventos();
});

// ─── Cargar jornada del día actual ────────────────────────────────────
async function cargarJornadaDelDia() {
  jornadaActiva = await db.obtenerJornada(fechaActual);

  const panelEmpezar = document.getElementById('panel-empezar');
  const accionesDiarias = document.getElementById('acciones-diarias');

  if (!jornadaActiva) {
    panelEmpezar.style.display = 'block';
    accionesDiarias.style.display = 'none';
    document.getElementById('lista-registros').style.display = 'none';
    document.getElementById('mensaje-vacio').style.display = 'none';
  } else {
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
    const monto = parseInt(document.getElementById('monto-inicial').value);
    if (isNaN(monto) || monto <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }
    jornadaActiva = { fecha: fechaActual, montoInicial: monto, cerrada: false };
    await db.guardarJornada(jornadaActiva);
    await cargarJornadaDelDia();
  });

  // ── Nueva carrera ──
  document.getElementById('btn-nueva-carrera').addEventListener('click', () => {
    resetearPanelCarrera();
    document.getElementById('panel-carrera').classList.add('visible');
  });

  // ── Cerrar y cancelar carrera ──
  document.getElementById('cerrar-carrera').addEventListener('click', () => {
    document.getElementById('panel-carrera').classList.remove('visible');
  });
  document.getElementById('cancelar-carrera').addEventListener('click', () => {
    document.getElementById('panel-carrera').classList.remove('visible');
  });

  // ── Montos preestablecidos ──
  document.querySelectorAll('.boton-monto').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('monto-carrera').value = btn.dataset.monto;
    });
  });

  // ── Método de pago ──
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
    const metodoEl = document.querySelector('#metodos-carrera .metodo.seleccionado');

    if (isNaN(monto) || monto <= 0 || !metodoEl) {
      alert('Completa todos los campos.');
      return;
    }

    const metodo = metodoEl.dataset.metodo;
    const hora = ahoraEnCaracas().hora12h;

    const carrera = {
      id: 'c-' + Date.now(),
      fecha: fechaActual,
      monto,
      metodoPago: metodo,
      estado: metodo === 'fiada' ? 'pendiente' : 'pagada',
      nota: nota || '',
      hora // ⬅️ Hora de registro
    };

    await db.guardarCarrera(carrera);
    document.getElementById('panel-carrera').classList.remove('visible');
    await renderizarRegistrosDelDia();
    actualizarResumen();
  });

  // ── Nuevo gasto ──
  document.getElementById('btn-nuevo-gasto').addEventListener('click', () => {
    resetearPanelGasto();
    document.getElementById('panel-gasto').classList.add('visible');
  });

  document.getElementById('cerrar-gasto').addEventListener('click', () => {
    document.getElementById('panel-gasto').classList.remove('visible');
  });
  document.getElementById('cancelar-gasto').addEventListener('click', () => {
    document.getElementById('panel-gasto').classList.remove('visible');
  });

  document.querySelectorAll('#categorias-gasto .metodo').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#categorias-gasto .metodo').forEach(b => b.classList.remove('seleccionado'));
      btn.classList.add('seleccionado');
    });
  });

  document.getElementById('guardar-gasto').addEventListener('click', async () => {
    const monto = parseInt(document.getElementById('monto-gasto').value);
    const nota = document.getElementById('nota-gasto').value.trim();
    const categoriaEl = document.querySelector('#categorias-gasto .metodo.seleccionado');

    if (isNaN(monto) || monto <= 0 || !categoriaEl) {
      alert('Completa todos los campos.');
      return;
    }

    const gasto = {
      id: 'g-' + Date.now(),
      fecha: fechaActual,
      monto,
      categoria: categoriaEl.dataset.categoria,
      nota: nota || '',
      hora: ahoraEnCaracas().hora12h // ⬅️ Hora de registro
    };

    await db.guardarGasto(gasto);
    document.getElementById('panel-gasto').classList.remove('visible');
    await renderizarRegistrosDelDia();
    actualizarResumen();
  });

  // ── Pago de deuda ──
  document.getElementById('btn-pago-deuda').addEventListener('click', async () => {
    await cargarDeudasPendientes();
    document.getElementById('panel-pago-deuda').classList.add('visible');
  });

  document.getElementById('cerrar-pago-deuda').addEventListener('click', () => {
    document.getElementById('panel-pago-deuda').classList.remove('visible');
  });

  // ── Cerrar jornada ──
  document.getElementById('btn-cerrar-jornada').addEventListener(async () => {
    const resumenCierre = document.getElementById('resumen-cierre');
    const ahorroInput = document.getElementById('ahorro-karen');
    ahorroInput.value = '';

    const carreras = await db.obtenerCarrerasPorFecha(fechaActual);
    const pagosFiadasHoy = await db.obtenerPagosDeFiadasRecibidosEn(fechaActual);
    const gastos = await db.obtenerGastosPorFecha(fechaActual);

    const ingresosReales = carreras.filter(c => c.metodoPago !== 'fiada').reduce((sum, c) => sum + c.monto, 0);
    const pagosFiadas = pagosFiadasHoy.reduce((sum, c) => sum + c.monto, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

    resumenCierre.innerHTML = `
      <p><strong>Resumen final</strong></p>
      <p>Inicio: ${formatoCOP(jornadaActiva.montoInicial)}</p>
      <p>Ingresos reales: ${formatoCOP(ingresosReales + pagosFiadas)}</p>
      <p>Gastos: ${formatoCOP(totalGastos)}</p>
      <p><strong>Total antes de ahorro: ${formatoCOP(jornadaActiva.montoInicial + ingresosReales + pagosFiadas - totalGastos)}</strong></p>
    `;

    document.getElementById('panel-cierre').classList.add('visible');
  });

  document.getElementById('cerrar-cierre').addEventListener('click', () => {
    document.getElementById('panel-cierre').classList.remove('visible');
  });
  document.getElementById('cancelar-cierre').addEventListener('click', () => {
    document.getElementById('panel-cierre').classList.remove('visible');
  });

  document.getElementById('btn-confirmar-cierre').addEventListener('click', async () => {
    const ahorro = parseInt(document.getElementById('ahorro-karen').value) || 0;
    jornadaActiva.ahorroKaren = ahorro;
    jornadaActiva.cerrada = true;
    await db.guardarJornada(jornadaActiva);
    document.getElementById('panel-cierre').classList.remove('visible');
    await cargarJornadaDelDia();
  });

  // ─── Filtros ───────────────────────────────────────────────────────
  document.querySelectorAll('.filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      filtroActual = btn.dataset.filtro;
      renderizarRegistrosDelDia();
    });
  });

  // ─── Calculadora ───────────────────────────────────────────────────
  document.getElementById('btn-calculadora').addEventListener('click', () => {
    document.getElementById('panel-calculadora').classList.add('visible');
    inicializarCalculadora();
  });

  document.getElementById('cerrar-calculadora').addEventListener('click', () => {
    document.getElementById('panel-calculadora').classList.remove('visible');
  });
  document.getElementById('cancelar-calculadora').addEventListener('click', () => {
    document.getElementById('panel-calculadora').classList.remove('visible');
  });

  // ─── Ver otro día (placeholder) ────────────────────────────────────
  document.getElementById('btn-ver-otro-dia').addEventListener(() => {
    alert('Función de historial en desarrollo.');
  });
}

// ─── Cargar deudas pendientes ────────────────────────────────────────
async function cargarDeudasPendientes() {
  const lista = document.getElementById('lista-deudas-pendientes');
  const mensajeVacio = document.getElementById('mensaje-sin-deudas');

  const deudas = await db.obtenerTodasLasFiadasPendientes();

  if (deudas.length === 0) {
    lista.style.display = 'none';
    mensajeVacio.style.display = 'block';
    return;
  }

  mensajeVacio.style.display = 'none';
  lista.style.display = 'block';
  lista.innerHTML = '';

  deudas.forEach(carrera => {
    const item = document.createElement('div');
    item.className = 'item pendiente';
    item.innerHTML = `
      <strong>${formatoCOP(carrera.monto)}</strong> – ${carrera.nota || 'Sin nota'}<br>
      <small>Día: ${carrera.fecha}</small>
    `;
    item.addEventListener('click', () => marcarComoPagada(carrera));
    lista.appendChild(item);
  });
}

// ─── Marcar carrera como pagada ──────────────────────────────────────
async function marcarComoPagada(carrera) {
  if (!confirm(`¿Marcar como pagada esta deuda de ${formatoCOP(carrera.monto)}?`)) return;

  // Actualizar carrera original
  carrera.estado = 'pagada';
  carrera.pagadoEnFecha = fechaActual;
  await db.guardarCarrera(carrera);

  // Cerrar panel
  document.getElementById('panel-pago-deuda').classList.remove('visible');
  await renderizarRegistrosDelDia();
  actualizarResumen();
}

// ─── Renderizar registros con filtro ─────────────────────────────────
async function renderizarRegistrosDelDia() {
  const contenedor = document.getElementById('lista-registros');
  const mensajeVacio = document.getElementById('mensaje-vacio');

  const carreras = await db.obtenerCarrerasPorFecha(fechaActual);
  const gastos = await db.obtenerGastosPorFecha(fechaActual);
  const pagosFiadasHoy = await db.obtenerPagosDeFiadasRecibidosEn(fechaActual);

  let registros = [];

  // Agregar carreras del día (solo si coinciden con el filtro)
  carreras.forEach(c => {
    if (filtroActual === 'todo' || 
        (filtroActual === 'pagos' && c.metodoPago !== 'fiada') ||
        (filtroActual === 'pendientes' && c.metodoPago === 'fiada' && c.estado === 'pendiente')) {
      registros.push({ tipo: 'carrera',  c });
    }
  });

  // Agregar pagos de fiadas recibidos HOY
  pagosFiadasHoy.forEach(c => {
    if (filtroActual === 'todo' || filtroActual === 'pagos') {
      registros.push({ tipo: 'pago-fiada', data: c });
    }
  });

  // Agregar gastos
  gastos.forEach(g => {
    if (filtroActual === 'todo' || filtroActual === 'gastos') {
      registros.push({ tipo: 'gasto',  g });
    }
  });

  if (registros.length === 0) {
    contenedor.style.display = 'none';
    mensajeVacio.style.display = 'block';
    return;
  }

  mensajeVacio.style.display = 'none';
  contenedor.style.display = 'block';
  contenedor.innerHTML = '';

  registros.forEach(r => {
    const item = document.createElement('div');
    if (r.tipo === 'carrera') {
      const c = r.data;
      const metodoTexto = c.metodoPago === 'efectivo' ? 'Efectivo' : c.metodoPago === 'nequi' ? 'Nequi' : 'Fiada';
      const esPagada = c.metodoPago !== 'fiada' || c.estado === 'pagada';
      item.className = `item ${esPagada ? 'pagada' : 'pendiente'}`;
      item.innerHTML = `
        <strong>${formatoCOP(c.monto)}</strong> – ${metodoTexto}
        ${c.nota ? `<br><small>${c.nota}</small>` : ''}
        <span class="detalle-metodo">${metodoTexto} – ${c.hora || ''}</span>
      `;
    } else if (r.tipo === 'pago-fiada') {
      const c = r.data;
      item.className = 'item pagada';
      item.innerHTML = `
        <strong>${formatoCOP(c.monto)}</strong> – Pago de fiada (${c.fecha})
        ${c.nota ? `<br><small>${c.nota}</small>` : ''}
        <span class="detalle-metodo">Pago recibido – ${c.hora || ''}</span>
      `;
    } else if (r.tipo === 'gasto') {
      const g = r.data;
      const categoriaTexto = {
        gasolina: '⛽ Gasolina',
        comida: '🍔 Comida',
        reparacion: '🔧 Reparación',
        otro: '✏️ Otro'
      }[g.categoria] || g.categoria;
      item.className = 'item gasto';
      item.innerHTML = `
        <strong>-${formatoCOP(g.monto)}</strong> – ${categoriaTexto}
        ${g.nota ? `<br><small>${g.nota}</small>` : ''}
        <span class="detalle-metodo">${categoriaTexto} – ${g.hora || ''}</span>
      `;
    }
    contenedor.appendChild(item);
  });
}

// ─── Actualizar resumen ──────────────────────────────────────────────
async function actualizarResumen() {
  if (!jornadaActiva) return;

  const carreras = await db.obtenerCarrerasPorFecha(fechaActual);
  const pagosFiadasHoy = await db.obtenerPagosDeFiadasRecibidosEn(fechaActual);
  const gastos = await db.obtenerGastosPorFecha(fechaActual);

  const ingresosReales = carreras.filter(c => c.metodoPago !== 'fiada').reduce((sum, c) => sum + c.monto, 0);
  const pagosFiadas = pagosFiadasHoy.reduce((sum, c) => sum + c.monto, 0);
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
  const totalEnMano = jornadaActiva.montoInicial + ingresosReales + pagosFiadas - totalGastos;

  let texto = `
    Inicio: ${formatoCOP(jornadaActiva.montoInicial)}<br>
    Ingresos: ${formatoCOP(ingresosReales + pagosFiadas)}<br>
    Gastos: ${formatoCOP(totalGastos)}<br>
    → Total: ${formatoCOP(totalEnMano)}
  `;

  const fiadasPendientes = carreras.filter(c => c.metodoPago === 'fiada' && c.estado === 'pendiente');
  const totalFiadas = fiadasPendientes.reduce((sum, c) => sum + c.monto, 0);
  if (totalFiadas > 0) {
    texto += `<br><small>Fiadas pendientes: ${formatoCOP(totalFiadas)}</small>`;
  }

  document.getElementById('resumen-diario').innerHTML = texto;
}

// ─── Calculadora ─────────────────────────────────────────────────────
let calc = {
  pantalla: '0',
  operacion: '',
  esperandoNumero: false,
  resultado: 0
};

function inicializarCalculadora() {
  calc = { pantalla: '0', operacion: '', esperandoNumero: false, resultado: 0 };
  actualizarPantallaCalculadora();
  document.getElementById('usar-resultado').style.display = 'none';

  document.querySelectorAll('#teclado-calculadora button').forEach(btn => {
    btn.removeEventListener('click', manejarClickCalculadora);
    btn.addEventListener('click', manejarClickCalculadora);
  });
}

function manejarClickCalculadora(e) {
  const valor = e.target.dataset.valor;

  if (!isNaN(valor) || valor === '.') {
    ingresarNumero(valor);
  } else if (['+', '-', '*', '/'].includes(valor)) {
    ingresarOperador(valor);
  } else if (valor === '=') {
    calcularResultado();
  } else if (valor === 'C') {
    limpiarCalculadora();
  }

  actualizarPantallaCalculadora();
}

function ingresarNumero(num) {
  if (calc.esperandoNumero) {
    calc.pantalla = num === '.' ? '0.' : num;
    calc.esperandoNumero = false;
  } else {
    if (num === '.' && calc.pantalla.includes('.')) return;
    calc.pantalla = calc.pantalla === '0' && num !== '.' ? num : calc.pantalla + num;
  }
}

function ingresarOperador(op) {
  if (calc.operacion && !calc.esperandoNumero) {
    calcularResultado();
  }
  calc.operacion = calc.pantalla + ' ' + (op === '*' ? '×' : op) + ' ';
  calc.esperandoNumero = true;
}

function calcularResultado() {
  if (!calc.operacion) return;
  try {
    const expr = calc.operacion.split(' ')[0];
    const op = calc.operacion.split(' ')[1];
    const simbolo = op === '×' ? '*' : op;
    const resultado = eval(expr + simbolo + calc.pantalla);
    calc.pantalla = Math.round(resultado).toString();
    calc.operacion = '';
    calc.esperandoNumero = true;
    document.getElementById('usar-resultado').style.display = 'block';
  } catch (e) {
    calc.pantalla = 'Error';
    calc.operacion = '';
  }
}

function limpiarCalculadora() {
  calc.pantalla = '0';
  calc.operacion = '';
  calc.esperandoNumero = false;
}

function actualizarPantallaCalculadora() {
  document.getElementById('pantalla-calculadora').textContent = calc.pantalla;
  document.getElementById('operacion-calculadora').textContent = calc.operacion;
}

// ─── Funciones auxiliares ────────────────────────────────────────────
function resetearPanelCarrera() {
  document.getElementById('monto-carrera').value = '';
  document.getElementById('nota-carrera').value = '';
  document.querySelectorAll('#metodos-carrera .metodo').forEach(el => el.classList.remove('seleccionado'));
}

function resetearPanelGasto() {
  document.getElementById('monto-gasto').value = '';
  document.getElementById('nota-gasto').value = '';
  document.querySelectorAll('#categorias-gasto .metodo').forEach(el => el.classList.remove('seleccionado'));
}