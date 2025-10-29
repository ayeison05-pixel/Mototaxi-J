// utils.js - Funciones útiles para la PWA mototaxi-j

/**
 * Devuelve la fecha y hora actual en la zona horaria de Caracas, Venezuela (UTC-4)
 * @returns {Object} { fechaISO: "YYYY-MM-DD", hora12h: "h:mm AM/PM", fechaLegible: "Día, DD de Mes" }
 */
function ahoraEnCaracas() {
  const opcionesFecha = {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const opcionesHora = {
    timeZone: 'America/Caracas',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  const opcionesLegibles = {
    timeZone: 'America/Caracas',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    locale: 'es-ES'
  };

  const ahora = new Date();
  const fechaISO = ahora.toLocaleDateString('sv-SE', opcionesFecha); // Formato ISO: YYYY-MM-DD
  const hora12h = ahora.toLocaleTimeString('es-ES', opcionesHora).replace(/:\d{2}\s/, ' '); // Quita segundos
  const fechaLegible = ahora.toLocaleDateString('es-ES', opcionesLegibles);

  return {
    fechaISO,
    hora12h,
    fechaLegible
  };
}

/**
 * Formatea un número entero como valor en pesos colombianos (COP)
 * Ej: 4000 → "$4.000"
 * @param {number} valor - Número entero (sin decimales)
 * @returns {string} Valor formateado como "$X.XXX"
 */
function formatoCOP(valor) {
  if (typeof valor !== 'number' || isNaN(valor)) return '$0';
  // Aseguramos que sea entero
  const entero = Math.abs(Math.round(valor));
  // Formateamos con separador de miles (punto) y símbolo $
  return '$' + entero.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Convierte una hora en formato 24h a 12h con AM/PM (para mostrar en interfaz)
 * Ej: "14:30" → "2:30 PM"
 * @param {string} hora24 - Ej: "14:30"
 * @returns {string} Ej: "2:30 PM"
 */
function hora24a12(hora24) {
  if (!hora24 || !hora24.includes(':')) return '';
  const [horas, minutos] = hora24.split(':').map(Number);
  const ampm = horas >= 12 ? 'PM' : 'AM';
  const horas12 = horas % 12 || 12;
  return `${horas12}:${minutos.toString().padStart(2, '0')} ${ampm}`;
}

// Exportar para uso en otros archivos (en entorno moderno o con window)
if (typeof window !== 'undefined') {
  window.ahoraEnCaracas = ahoraEnCaracas;
  window.formatoCOP = formatoCOP;
  window.hora24a12 = hora24a12;
}