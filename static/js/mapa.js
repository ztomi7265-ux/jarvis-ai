const mapaBtn = document.getElementById('mapaBtn');
const mapaOverlay = document.getElementById('mapaOverlay');
const cerrarMapaBtn = document.getElementById('cerrarMapaBtn');
const formBuscarLugar = document.getElementById('formBuscarLugar');
const mapaBusquedaInput = document.getElementById('mapaBusquedaInput');
const mapaResultadosLista = document.getElementById('mapaResultadosLista');
const mapaVisor = document.getElementById('mapaVisor');
const mapaIframe = document.getElementById('mapaIframe');
const mapaNombreLugar = document.getElementById('mapaNombreLugar');
const miUbicacionBtn = document.getElementById('miUbicacionBtn');

mapaBtn.addEventListener('click', () => { mapaOverlay.style.display = 'flex'; });
cerrarMapaBtn.addEventListener('click', () => { mapaOverlay.style.display = 'none'; });

function mostrarLugarEnMapa(lat, lon, nombre){
  const delta = 0.02;
  const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
  mapaIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  mapaNombreLugar.textContent = nombre || '';
  mapaVisor.style.display = 'block';
  mapaResultadosLista.innerHTML = '';
}

formBuscarLugar.addEventListener('submit', async (e) => {
  e.preventDefault();
  const consulta = mapaBusquedaInput.value.trim();
  if(!consulta) return;
  mapaResultadosLista.innerHTML = '<p class="hud-vacio">Buscando…</p>';
  mapaVisor.style.display = 'none';
  try{
    const resp = await fetch(`/api/mapa/buscar?q=${encodeURIComponent(consulta)}`);
    const resultados = await resp.json();
    if(!resultados.length){
      mapaResultadosLista.innerHTML = '<p class="hud-vacio">No encontré nada con ese nombre.</p>';
      return;
    }
    if(resultados.length === 1){
      mostrarLugarEnMapa(resultados[0].lat, resultados[0].lon, resultados[0].nombre);
      return;
    }
    mapaResultadosLista.innerHTML = '';
    resultados.forEach(r => {
      const item = document.createElement('div');
      item.className = 'chat-card';
      item.innerHTML = `<div class="chat-card-info"><h3>${escapeHtml(r.nombre)}</h3></div>`;
      item.addEventListener('click', () => mostrarLugarEnMapa(r.lat, r.lon, r.nombre));
      mapaResultadosLista.appendChild(item);
    });
  }catch(err){
    mapaResultadosLista.innerHTML = '<p class="hud-vacio">No pude buscar ese lugar.</p>';
  }
});

miUbicacionBtn.addEventListener('click', () => {
  if(!navigator.geolocation){ alert('Tu navegador no soporta ubicación.'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => mostrarLugarEnMapa(pos.coords.latitude, pos.coords.longitude, 'Mi ubicación'),
    () => alert('No pude obtener tu ubicación. Revisa los permisos del navegador.')
  );
});

window.irAMapa = function(lat, lon, nombre){
  mapaOverlay.style.display = 'flex';
  mostrarLugarEnMapa(lat, lon, nombre);
};

// ---------- Mini-mapas de las ciudades en el reloj mundial ----------
function deg2tile(lat, lon, zoom){
  const latRad = lat * Math.PI / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

const CIUDADES_MAPA = [
  { fila: 'wcMadrid',      lat: 40.4168,  lon: -3.7038 },
  { fila: 'wcParis',       lat: 48.8566,  lon: 2.3522 },
  { fila: 'wcLondres',     lat: 51.5074,  lon: -0.1278 },
  { fila: 'wcWashington',  lat: 38.9072,  lon: -77.0369 },
  { fila: 'wcCdmx',        lat: 19.4326,  lon: -99.1332 },
  { fila: 'wcBuenosAires', lat: -34.6037, lon: -58.3816 },
];

(function agregarMiniMapasCiudades(){
  const ZOOM = 4;
  CIUDADES_MAPA.forEach(c => {
    const filaEl = document.getElementById(c.fila);
    if(!filaEl) return;
    const fila = filaEl.closest('.world-clock-row');
    if(!fila || fila.querySelector('.world-clock-mini-mapa')) return;
    const { x, y } = deg2tile(c.lat, c.lon, ZOOM);
    const img = document.createElement('img');
    img.className = 'world-clock-mini-mapa';
    img.loading = 'lazy';
    img.alt = '';
    img.src = `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`;
    fila.prepend(img);
  });
})();
