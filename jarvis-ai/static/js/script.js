const log = document.getElementById('log');
const form = document.getElementById('composer');
const input = document.getElementById('textInput');
const micBtn = document.getElementById('micBtn');
const micHint = document.getElementById('micHint');
const webToggle = document.getElementById('webToggle');
const forgetBtn = document.getElementById('forgetBtn');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const attachBtn = document.getElementById('attachBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewImg = document.getElementById('imagePreviewImg');
const removeImageBtn = document.getElementById('removeImageBtn');
const chatActivoTitulo = document.getElementById('chatActivoTitulo');
const nuevoChatBtn = document.getElementById('nuevoChatBtn');

let imagenActual = null; // data URL de la imagen adjunta, o null
let chatActualId = null; // id del chat guardado que está abierto (null = todavía no se ha guardado)

attachBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', () => {
  const archivo = imageInput.files[0];
  if(!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    imagenActual = lector.result;
    imagePreviewImg.src = imagenActual;
    imagePreview.style.display = 'inline-flex';
  };
  lector.readAsDataURL(archivo);
});

removeImageBtn.addEventListener('click', () => {
  imagenActual = null;
  imageInput.value = '';
  imagePreview.style.display = 'none';
});

function setEstado(estado){
  // estado: idle | listening | thinking | speaking
  document.body.className = estado === 'idle' ? '' : `state-${estado}`;
  statusDot.className = 'dot' + (estado === 'idle' ? '' : ' ' + estado);
  const etiquetas = {
    idle: 'EN ESPERA',
    listening: 'ESCUCHANDO',
    thinking: 'PROCESANDO',
    speaking: 'RESPONDIENDO'
  };
  statusText.textContent = etiquetas[estado] || 'EN ESPERA';
}

function agregarMensaje(texto, quien, imagenUrl, spotify, notaCreada){
  const div = document.createElement('div');
  div.className = `msg ${quien}`;
  const etiqueta = quien === 'user' ? 'TÚ' : 'JARVIS';
  div.innerHTML = `<span class="who">${etiqueta}</span>${escapeHtml(texto)}`;
  if(imagenUrl){
    const img = document.createElement('img');
    img.src = imagenUrl;
    img.className = 'msg-image';
    div.appendChild(img);
  }
  if(spotify){
    const link = document.createElement('a');
    link.href = spotify.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'spotify-link';
    link.textContent = `🎵 Abrir «${spotify.nombre}» en Spotify`;
    div.appendChild(link);
  }
  if(notaCreada){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nota-link';
    btn.textContent = `📝 Ver nota «${notaCreada.titulo}»`;
    btn.addEventListener('click', () => {
      if(window.notasBtnAbrirDesdeChat) window.notasBtnAbrirDesdeChat(notaCreada.id);
    });
    div.appendChild(btn);
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function abrirEnSpotify(spotify){
  // Intenta abrir la app de Spotify directamente (funciona si está instalada).
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = spotify.uri;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 2500);
}

// ---------- Empezar un chat nuevo (vacío) ----------
function empezarChatNuevo(){
  chatActualId = null;
  log.innerHTML = '';
  chatActivoTitulo.textContent = 'NUEVA CONVERSACIÓN';
  agregarMensaje('Sistemas en línea. Toca el círculo para hablar conmigo.', 'jarvis');
}
nuevoChatBtn.addEventListener('click', empezarChatNuevo);

async function enviarMensaje(texto){
  const imagenParaEnviar = imagenActual;
  if(!texto.trim() && !imagenParaEnviar) return;

  agregarMensaje(texto || '(imagen)', 'user', imagenParaEnviar);
  input.value = '';
  imagenActual = null;
  imageInput.value = '';
  imagePreview.style.display = 'none';
  setEstado('thinking');

  try{
    const resp = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        mensaje: texto,
        buscar_internet: webToggle.checked,
        imagen: imagenParaEnviar,
        chat_id: chatActualId,
      })
    });
    const data = await resp.json();
    if(data.chat_id){
      const esChatNuevo = chatActualId === null;
      chatActualId = data.chat_id;
      if(data.titulo) chatActivoTitulo.textContent = data.titulo.toUpperCase();
      if(esChatNuevo && window.actualizarContadorChats) window.actualizarContadorChats();
    }
    agregarMensaje(data.respuesta, 'jarvis', null, data.spotify, data.nota_creada);
    if(data.spotify) abrirEnSpotify(data.spotify);
    if(data.nota_creada && window.actualizarContadorNotas) window.actualizarContadorNotas();
    if(data.nota_abrir && window.notasBtnAbrirDesdeChat) window.notasBtnAbrirDesdeChat(data.nota_abrir.id);
    hablar(data.respuesta);
  }catch(err){
    agregarMensaje('No pude conectar con el servidor. ¿Está corriendo app.py?', 'jarvis');
    setEstado(micActivo ? 'listening' : 'idle');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  enviarMensaje(input.value);
});

forgetBtn.addEventListener('click', async () => {
  if(!chatActualId){
    log.innerHTML = '';
    agregarMensaje('Ya estaba en blanco este chat.', 'jarvis');
    return;
  }
  await fetch('/api/olvidar', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: chatActualId })
  });
  log.innerHTML = '';
  agregarMensaje('Borré el historial de este chat. Empezamos de nuevo.', 'jarvis');
});

// ---------- Reconocimiento de voz (voz -> texto), modo continuo ----------
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconocimiento = null;
let micActivo = false;          // el usuario quiere que el micrófono esté encendido
let reconociendoAhora = false;  // el motor de voz está corriendo en este momento
let pausadoPorHabla = false;    // pausado momentáneamente mientras Jarvis habla

if(SpeechRecognitionAPI){
  reconocimiento = new SpeechRecognitionAPI();
  reconocimiento.lang = 'es-ES';
  // Nota: continuous=true tiene un bug conocido en Safari/iOS donde nunca
  // entrega el resultado hasta que apagas el micrófono a mano. Usamos
  // continuous=false y lo reiniciamos solo (abajo) para simular el mismo
  // efecto de "escucha continua" sin ese bug.
  reconocimiento.continuous = false;
  reconocimiento.interimResults = false;

  reconocimiento.onstart = () => {
    reconociendoAhora = true;
    if(!pausadoPorHabla) setEstado('listening');
  };

  reconocimiento.onend = () => {
    reconociendoAhora = false;
    // El navegador corta la sesión de vez en cuando aunque sea "continuo".
    // Si el usuario no la apagó, la reiniciamos sola.
    if(micActivo && !pausadoPorHabla){
      setTimeout(() => { if(micActivo && !reconociendoAhora) reconocimiento.start(); }, 250);
    } else if(!micActivo){
      setEstado('idle');
    }
  };

  reconocimiento.onerror = (e) => {
    console.error('Error de voz:', e.error);
    // 'no-speech' y 'aborted' son normales en modo continuo; no apagamos el mic por eso.
    if(e.error === 'not-allowed' || e.error === 'service-not-allowed'){
      micActivo = false;
      micBtn.classList.remove('on');
      micHint.textContent = 'Toca el círculo para activar el micrófono';
      setEstado('idle');
    }
  };

  reconocimiento.onresult = (event) => {
    for(let i = event.resultIndex; i < event.results.length; i++){
      if(event.results[i].isFinal){
        enviarMensaje(event.results[i][0].transcript);
      }
    }
  };
} else {
  micBtn.title = 'Tu navegador no soporta el reconocimiento de voz (usa Chrome o Edge)';
  micHint.textContent = 'Reconocimiento de voz no disponible en este navegador';
}

micBtn.addEventListener('click', () => {
  if(!reconocimiento) return;
  if(micActivo){
    // Apagar
    micActivo = false;
    micBtn.classList.remove('on');
    reconocimiento.stop();
    setEstado('idle');
    micHint.textContent = 'Toca el círculo para activar el micrófono';
  } else {
    // Encender: se queda escuchando hasta que lo vuelvas a apagar
    micActivo = true;
    micBtn.classList.add('on');
    speechSynthesis.cancel();
    reconocimiento.start();
    micHint.textContent = 'Micrófono activo — toca para apagarlo';
  }
});

// ---------- Síntesis de voz (texto -> voz) ----------

// iOS solo deja reproducir audio "a la fuerza" (por código) si ya se
// desbloqueó antes con un toque real del usuario. Preparamos un elemento
// reutilizable y lo desbloqueamos en el primer toque en cualquier parte.
const ttsAudioEl = new Audio();
let audioDesbloqueado = false;
function desbloquearAudioUnaVez(){
  if(audioDesbloqueado) return;
  audioDesbloqueado = true;
  ttsAudioEl.play().catch(() => {});
  ttsAudioEl.pause();
  if('speechSynthesis' in window){
    try{ speechSynthesis.speak(new SpeechSynthesisUtterance('')); }catch(e){}
  }
}
document.addEventListener('click', desbloquearAudioUnaVez, { once: true });
document.addEventListener('touchend', desbloquearAudioUnaVez, { once: true });

function pausarMicParaHablar(){
  if(reconocimiento && reconociendoAhora){
    pausadoPorHabla = true;
    reconocimiento.stop();
  }
}

function reanudarMicTrasHablar(){
  pausadoPorHabla = false;
  if(micActivo && reconocimiento){
    setEstado('listening');
    setTimeout(() => { if(micActivo && !reconociendoAhora) reconocimiento.start(); }, 200);
  } else {
    setEstado('idle');
  }
}

// Respaldo: voz del navegador (por si ElevenLabs falla o no hay clave configurada)
function hablarConNavegador(texto){
  if(!('speechSynthesis' in window)){ reanudarMicTrasHablar(); return; }
  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = 'es-ES';
  const voces = speechSynthesis.getVoices();
  const vozEs = voces.find(v => v.lang && v.lang.startsWith('es'));
  if(vozEs) utter.voice = vozEs;
  utter.onstart = () => setEstado('speaking');
  utter.onend = reanudarMicTrasHablar;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

async function hablar(texto){
  pausarMicParaHablar();
  try{
    const resp = await fetch('/api/hablar', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ texto })
    });
    if(!resp.ok) throw new Error('elevenlabs no disponible');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    ttsAudioEl.src = url;
    ttsAudioEl.onplay = () => setEstado('speaking');
    ttsAudioEl.onended = () => { URL.revokeObjectURL(url); reanudarMicTrasHablar(); };
    ttsAudioEl.onerror = () => { URL.revokeObjectURL(url); hablarConNavegador(texto); };
    await ttsAudioEl.play();
  }catch(err){
    // Si falla ElevenLabs (sin clave, sin crédito, sin red), usamos la voz del navegador.
    hablarConNavegador(texto);
  }
}

// ---------- Reloj ----------
const clockTime = document.getElementById('clockTime');
const clockDate = document.getElementById('clockDate');
function actualizarReloj(){
  const ahora = new Date();
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const ss = String(ahora.getSeconds()).padStart(2, '0');
  if(clockTime) clockTime.textContent = `${hh}:${mm}:${ss}`;
  if(clockDate){
    const fecha = ahora.toLocaleDateString('es-CR', { weekday:'long', day:'2-digit', month:'short' });
    clockDate.textContent = fecha.toUpperCase();
  }
}
actualizarReloj();
setInterval(actualizarReloj, 1000);

// ---------- Campo de estrellas (decorativo) ----------
const starsContainer = document.getElementById('stars');
if(starsContainer){
  const total = 140;
  for(let i = 0; i < total; i++){
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2 + 0.6;
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.top = Math.random() * 100 + '%';
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDuration = (2 + Math.random() * 4) + 's';
    s.style.animationDelay = (Math.random() * 4) + 's';
    starsContainer.appendChild(s);
  }
}

// ---------- Marcas tipo dial alrededor del círculo (decorativo) ----------
const ticksGroup = document.getElementById('ticks');
if(ticksGroup){
  const total = 60;
  const cx = 200, cy = 200, rIn = 196, rOutMinor = 202, rOutMajor = 208;
  for(let i = 0; i < total; i++){
    const mayor = i % 5 === 0;
    const ang = (i / total) * Math.PI * 2 - Math.PI / 2;
    const rOut = mayor ? rOutMajor : rOutMinor;
    const x1 = cx + rIn * Math.cos(ang), y1 = cy + rIn * Math.sin(ang);
    const x2 = cx + rOut * Math.cos(ang), y2 = cy + rOut * Math.sin(ang);
    const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    linea.setAttribute('x1', x1); linea.setAttribute('y1', y1);
    linea.setAttribute('x2', x2); linea.setAttribute('y2', y2);
    linea.setAttribute('class', 'tick' + (mayor ? ' major' : ''));
    ticksGroup.appendChild(linea);
  }
}

// ---------- Partículas orbitando el círculo (decorativo) ----------
const particlesGroup = document.getElementById('particles');
if(particlesGroup){
  const radios = [198, 178];
  const colores = ['#8bfff0', '#9b7bff', '#4fe3d0'];
  for(let i = 0; i < 6; i++){
    const r = radios[i % radios.length];
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', 1.4 + Math.random() * 1.2);
    dot.setAttribute('class', 'particle');
    dot.setAttribute('fill', colores[i % colores.length]);
    dot.style.color = colores[i % colores.length];
    particlesGroup.appendChild(dot);
    const duracion = 14 + i * 4;
    const inicio = performance.now() - Math.random() * 6000;
    const sentido = i % 2 === 0 ? 1 : -1;
    const anguloBase = Math.random() * Math.PI * 2;
    (function animar(){
      function paso(t){
        const ang = anguloBase + sentido * ((t - inicio) / (duracion * 1000)) * Math.PI * 2;
        dot.setAttribute('cx', 200 + r * Math.cos(ang));
        dot.setAttribute('cy', 200 + r * Math.sin(ang));
        requestAnimationFrame(paso);
      }
      requestAnimationFrame(paso);
    })();
  }
}

agregarMensaje('Sistemas en línea. Toca el círculo para hablar conmigo.', 'jarvis');
