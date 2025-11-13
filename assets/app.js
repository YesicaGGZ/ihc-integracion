


// === Config ===
const API_BASE = "http://127.0.0.1:5000/api"; // Ajusta según tu backend

// Catálogo local
const CATALOGO = {
  1: "Adelante",
  2: "Atrás",
  3: "Detener",
  4: "Vuelta adelante derecha",
  5: "Vuelta adelante izquierda",
  6: "Vuelta atrás derecha",
  7: "Vuelta atrás izquierda",
  8: "Giro 90° derecha",
  9: "Giro 90° izquierda",
  10: "Giro 360° derecha",
  11: "Giro 360° izquierda",
};

// === UI ===
const statusEl = document.getElementById("status");
const tsEl = document.getElementById("timestamp");
const toastEl = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const toast = new bootstrap.Toast(toastEl, { delay: 2000 });

// Timers
let limpiezaTimer = null;
let limpiezaMonitorTimer = null;
const TIEMPO_LIMPIEZA = 2000;

// Variables globales
let movimientosLocales = [];
let contadorLocal = 1;

// === Utilidades UI ===
function showToast(msg, isError = false) {
  toastMsg.textContent = msg;
  toastEl.classList.toggle('text-bg-danger', isError);
  toastEl.classList.toggle('text-bg-dark', !isError);
  toast.show();
}

function setStatus(texto, fecha = null) {
  statusEl.textContent = (texto || "—").toUpperCase();
  tsEl.textContent = fecha ? new Date(fecha).toLocaleString() : "";
}

function programarLimpiezaEstatus() {
  clearTimeout(limpiezaTimer);
  limpiezaTimer = setTimeout(() => {
    setStatus("En espera");
    showToast("Estado reiniciado - listo para nuevo movimiento");
  }, TIEMPO_LIMPIEZA);
}

function programarLimpiezaMonitor() {
  clearTimeout(limpiezaMonitorTimer);
  limpiezaMonitorTimer = setTimeout(() => {
    limpiarTablaMovimientos();
    showToast("Monitoreo limpiado automáticamente");
  }, TIEMPO_LIMPIEZA);
}

function limpiarTablaMovimientos() {
  const tbody = document.getElementById("tabla-movs");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Sin movimientos recientes</td></tr>`;
  const foot = document.getElementById("monitor-foot");
  if (foot) foot.textContent = `Limpio: ${new Date().toLocaleTimeString()}`;
  movimientosLocales = [];
  contadorLocal = 1;
}

// === API ===
async function postMovimiento(id_movimiento) {
  const url = `${API_BASE}/movimientos`;
  const body = { id_movimiento };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    return res.json();
  } catch {
    console.warn("No se pudo conectar con el backend. Modo local.");
    return { success: true };
  }
}

async function getUltimosMovimientos(n = 5) {
  try {
    const res = await fetch(`${API_BASE}/movimientos/ultimos?n=${n}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data ?? data;
  } catch {
    return [];
  }
}

// === Control de movimientos ===
// asegúrate de que agregarMovimientoLocal esté definida antes de usarla
function agregarMovimientoLocal(idMov) {
  movimientosLocales.push({
    id_movimiento: idMov,
    movimiento: CATALOGO[idMov],
    fecha_hora: new Date().toISOString(),
    esLocal: true
  });
  if (movimientosLocales.length > 10)
    movimientosLocales = movimientosLocales.slice(-10);
}

async function enviarMovimiento(idMov) {
  const texto = CATALOGO[idMov] || `Movimiento ${idMov}`;
  setStatus(texto);
  programarLimpiezaEstatus();

  // agregar local inmediatamente (UX)
  agregarMovimientoLocal(idMov);

  // enviar al backend y esperar respuesta
  try {
    const res = await postMovimiento(idMov); // postMovimiento ya hace JSON.stringify
    // postMovimiento devuelve { success: true } en modo local o respuesta real del backend
    if (res && (res.success === true || res.status === 201)) {
      showToast(`Enviado: ${texto}`);
    } else {
      // si backend devolvió error, mostrar mensaje
      const msg = res?.message || (res?.data && res.data.message) || "Error al enviar";
      showToast(msg, true);
      console.warn("postMovimiento result:", res);
    }
  } catch (err) {
    console.error("Error en enviarMovimiento:", err);
    showToast("Error al enviar movimiento", true);
  }

  if (document.getElementById("monitor").style.display !== "none") {
    actualizarTablaConMovimientosLocales();
    programarLimpiezaMonitor();
  }
}

function obtenerMovimientosLocales(n = 5) {
  return movimientosLocales.slice(-n).reverse();
}

function renderTablaMovs(rows) {
  const tbody = document.getElementById("tabla-movs");
  if (!tbody) return;
  if (!rows.length)
    return tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Sin movimientos recientes</td></tr>`;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="fw-bold">${r.id_movimiento}</td>
      <td>${r.movimiento}${r.esLocal ? ' <span class="badge bg-warning text-dark">Local</span>' : ''}</td>
      <td>${new Date(r.fecha_hora).toLocaleString()}</td>
    </tr>`).join("");
}

function actualizarTablaConMovimientosLocales() {
  renderTablaMovs(obtenerMovimientosLocales());
  const foot = document.getElementById("monitor-foot");
  if (foot) foot.textContent = `Actualizado: ${new Date().toLocaleTimeString()}`;
}

// === Monitoreo ===
let monitorTimer = null;
function startMonitor() {
  if (monitorTimer) return;
  monitorTimer = setInterval(() => {
    actualizarTablaConMovimientosLocales();
    programarLimpiezaMonitor();
  }, 2000);
  document.getElementById("btn-monitor-toggle").innerHTML =
    '<i class="bi bi-pause-circle"></i> Auto (2s)';
}

function stopMonitor() {
  clearInterval(monitorTimer);
  monitorTimer = null;
  document.getElementById("btn-monitor-toggle").innerHTML =
    '<i class="bi bi-play-circle"></i> Auto (2s)';
}

function toggleMonitorPanel() {
  const monitor = document.getElementById("monitor");
  const btn = document.getElementById("toggle-monitor-btn");
  if (monitor.style.display === "none") {
    monitor.style.display = "block";
    btn.innerHTML = '<i class="bi bi-graph-down"></i> Ocultar Monitoreo';
    limpiarTablaMovimientos();
  } else {
    monitor.style.display = "none";
    btn.innerHTML = '<i class="bi bi-graph-up"></i> Mostrar Monitoreo';
    stopMonitor();
  }
}

// === Eventos de control ===
document.querySelectorAll("[data-mov]").forEach(btn =>
  btn.addEventListener("click", () => enviarMovimiento(Number(btn.dataset.mov)))
);

document.getElementById("toggle-monitor-btn")?.addEventListener("click", toggleMonitorPanel);
document.getElementById("btn-monitor-toggle")?.addEventListener("click", e => {
  const active = monitorTimer !== null;
  if (active) stopMonitor(); else startMonitor();
});

setStatus("En espera");

// ========================================================================
// 🔊 INTEGRACIÓN DE CONTROL POR VOZ
// ========================================================================

// Diccionario de acciones por voz -> movimiento
const vozAId = {
  "ADELANTE": 1,
  "ATRAS": 2,
  "DETENER": 3,
  "V_ADE_DER": 4,
  "V_ADE_IZQ": 5,
  "V_ATR_DER": 6,
  "V_ATR_IZQ": 7,
  "G_90_DER": 8,
  "G_90_IZQ": 9,
  "G_360_DER": 10,
  "G_360_IZQ": 11,
};

// Reutiliza funciones del script original (simplificado)
let mediaRecorder, audioChunks = [];

async function obtenerApiKey() {
  try {
    const res = await fetch("https://68e538648e116898997ee4ed.mockapi.io/apikey");
    const data = await res.json();
    return data[0].api_key;
  } catch {
    showToast("No se pudo obtener API Key", true);
    return null;
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.start();
    setStatus("Grabando voz...");
  } catch {
    showToast("No se pudo acceder al micrófono", true);
  }
}

async function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const api_key = await obtenerApiKey();
    if (!api_key) return;

    setStatus("Procesando audio...");
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");

    try {
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${api_key}` },
        body: formData
      });
      const data = await res.json();
      const texto = data.text || "";
      const accion = detectarAccion(texto);
      if (accion === "NINGUNA") {
        showToast("No se detectó una acción válida", true);
        setStatus("Sin comando válido");
      } else {
        const idMov = vozAId[accion];
        enviarMovimiento(idMov);
        showToast(`Comando detectado: ${CATALOGO[idMov]}`);
      }
    } catch {
      showToast("Error al procesar audio", true);
    }
  };
  mediaRecorder.stop();
}

// Detección básica (idéntica a tu script original)
function detectarAccion(textoOriginal) {
  if (!textoOriginal) return "NINGUNA";
  const texto = textoOriginal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!texto.includes("mandarina")) return "NINGUNA";

  if (texto.includes("360") && texto.includes("derecha")) return "G_360_DER";
  if (texto.includes("360") && texto.includes("izquierda")) return "G_360_IZQ";
  if (texto.includes("90") && texto.includes("derecha")) return "G_90_DER";
  if (texto.includes("90") && texto.includes("izquierda")) return "G_90_IZQ";
  if (texto.includes("adelante") && texto.includes("derecha")) return "V_ADE_DER";
  if (texto.includes("adelante") && texto.includes("izquierda")) return "V_ADE_IZQ";
  if (texto.includes("atras") && texto.includes("derecha")) return "V_ATR_DER";
  if (texto.includes("atras") && texto.includes("izquierda")) return "V_ATR_IZQ";
  if (texto.includes("adelante")) return "ADELANTE";
  if (texto.includes("atras")) return "ATRAS";
  if (texto.includes("deten")) return "DETENER";
  return "NINGUNA";
}

// Botón de activación — versión encapsulada para evitar colisiones de nombres
(function () {
  const btn = document.getElementById("toggle-voz-btn");
  if (!btn) return; // si no existe el botón, salimos

  // variable local al closure (no conflictúa con otras llamadas)
  let grabandoLocal = false;

  btn.addEventListener("click", async () => {
    if (!grabandoLocal) {
      grabandoLocal = true;
      btn.classList.replace("btn-warning", "btn-danger");
      btn.innerHTML = '<i class="bi bi-stop-circle"></i> Detener voz';
      try {
        await startRecording();
      } catch (err) {
        console.error("Error startRecording:", err);
      }
    } else {
      grabandoLocal = false;
      btn.classList.replace("btn-danger", "btn-warning");
      btn.innerHTML = '<i class="bi bi-mic"></i> Probar por voz';
      try {
        await stopRecording();
      } catch (err) {
        console.error("Error stopRecording:", err);
      }
    }
  });
})();
