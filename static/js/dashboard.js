// ---------- Clima (Open-Meteo, gratis, sin clave) ----------
const weatherBox = document.getElementById('weatherBox');
const weatherIcon = document.getElementById('weatherIcon');
const weatherTemp = document.getElementById('weatherTemp');
const weatherLugar = document.getElementById('weatherLugar');

function iconoClima(codigo){
  if(codigo === 0) return '☀️';
  if([1,2].includes(codigo)) return '🌤️';
  if(codigo === 3) return '☁️';
  if([45,48].includes(codigo)) return '🌫️';
  if([51,53,55,56,57].includes(codigo)) return '🌦️';
  if([61,63,65,66,67,80,81,82].includes(codigo)) return '🌧️';
  if([71,73,75,77,85,86].includes(codigo)) return '🌨️';
  if([95,96,99].includes(codigo)) return '⛈️';
  return '🌡️';
}

async function cargarClima(lat, lon, lugar){
  try{
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
    const datos = await resp.json();
    const actual = datos.current;
    weatherTemp.textContent = Math.round(actual.temperature_2m) + '°';
    weatherIcon.textContent = iconoClima(actual.weather_code);
    weatherLugar.textContent = lugar;
    weatherBox.style.display = 'flex';
  }catch(err){
    // Sin drama si falla: simplemente no se muestra el clima.
  }
}

async function nombreDeCoordenadas(lat, lon){
  try{
    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`, {
      headers: { 'Accept-Language': 'es' }
    });
    const datos = await resp.json();
    const dir = datos.address || {};
    return dir.city || dir.town || dir.village || dir.state || 'Tu ubicación';
  }catch(err){
    return 'Tu ubicación';
  }
}

if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      const lugar = await nombreDeCoordenadas(lat, lon);
      cargarClima(lat, lon, lugar);
    },
    () => { cargarClima(9.9281, -84.0907, 'San José'); } // respaldo si no da permiso
  );
} else {
  cargarClima(9.9281, -84.0907, 'San José');
}

// ---------- Telemetría en vivo (esquinas) ----------
const telChats = document.getElementById('telChats');
const telNotas = document.getElementById('telNotas');
const telSesion = document.getElementById('telSesion');
const telNucleo = document.getElementById('telNucleo');
const telRed = document.getElementById('telRed');
const telLatencia = document.getElementById('telLatencia');

const inicioSesion = Date.now();

function actualizarTelemetria(){
  const seg = Math.floor((Date.now() - inicioSesion) / 1000);
  const mm = String(Math.floor(seg / 60)).padStart(2, '0');
  const ss = String(seg % 60).padStart(2, '0');
  if(telSesion) telSesion.textContent = `${mm}:${ss}`;
  if(telNucleo) telNucleo.textContent = (94 + Math.round(Math.random() * 5)) + '%';
  if(telLatencia) telLatencia.textContent = (18 + Math.round(Math.random() * 24)) + 'ms';

  if(telChats && window.actualizarContadorChats){
    window.actualizarContadorChats().then(chats => { if(chats) telChats.textContent = chats.length; });
  }
  if(telNotas && window.actualizarContadorNotas){
    window.actualizarContadorNotas().then(notas => { if(notas) telNotas.textContent = notas.length; });
  }
}
actualizarTelemetria();
setInterval(actualizarTelemetria, 4000);

// ---------- Ticker de actividad ----------
const tickerTrack = document.getElementById('tickerTrack');
const FRASES_TICKER = [
  'JARVIS EN LÍNEA',
  'MODELO NEURAL: GROQ / GPT-OSS-120B',
  'ENLACE DE VOZ: ACTIVO',
  'MEMORIA DISTRIBUIDA: FIREBASE',
  'DI "PON [CANCIÓN]" PARA REPRODUCIR MÚSICA',
  'DI "ANOTA QUE..." PARA GUARDAR UNA NOTA',
  'DI "ABRE EL MAPA DE..." PARA VER UN LUGAR',
  'TOCA EL RELOJ PARA VER LA HORA MUNDIAL',
  'SISTEMAS NOMINALES',
];

function construirTicker(){
  if(!tickerTrack) return;
  tickerTrack.innerHTML = '';
  FRASES_TICKER.forEach(frase => {
    const span = document.createElement('span');
    span.textContent = frase;
    const bullet = document.createElement('span');
    bullet.textContent = '◆';
    bullet.style.opacity = '.4';
    tickerTrack.appendChild(bullet);
    tickerTrack.appendChild(span);
  });
}
construirTicker();
