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

let imagenActual = null; // data URL de la imagen adjunta, o null

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

function agregarMensaje(texto, quien, imagenUrl, spotify){
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
      body: JSON.stringify({ mensaje: texto, buscar_internet: webToggle.checked, imagen: imagenParaEnviar })
    });
    const data = await resp.json();
    agregarMensaje(data.respuesta, 'jarvis', null, data.spotify);
    if(data.spotify) abrirEnSpotify(data.spotify);
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
  await fetch('/api/olvidar', { method:'POST' });
  log.innerHTML = '';
  agregarMensaje('Memoria borrada. Empezamos de nuevo.', 'jarvis');
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
  reconocimiento.continuous = true;
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
        const texto = event.results[i][0].transcript;
        enviarMensaje(texto);
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
    const audio = new Audio(url);
    audio.onplay = () => setEstado('speaking');
    audio.onended = () => { URL.revokeObjectURL(url); reanudarMicTrasHablar(); };
    audio.onerror = () => { URL.revokeObjectURL(url); hablarConNavegador(texto); };
    await audio.play();
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
