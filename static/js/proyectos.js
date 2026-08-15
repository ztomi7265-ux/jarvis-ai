// ---------- Elementos ----------
const proyectosBtn = document.getElementById('proyectosBtn');
const proyectosOverlay = document.getElementById('proyectosOverlay');
const cerrarProyectosBtn = document.getElementById('cerrarProyectosBtn');

const vistaLista = document.getElementById('vistaLista');
const vistaNuevo = document.getElementById('vistaNuevo');
const vistaDetalle = document.getElementById('vistaDetalle');

const listaProyectos = document.getElementById('listaProyectos');
const nuevoProyectoBtn = document.getElementById('nuevoProyectoBtn');
const volverDeNuevoBtn = document.getElementById('volverDeNuevoBtn');
const formNuevoProyecto = document.getElementById('formNuevoProyecto');
const nuevoNombre = document.getElementById('nuevoNombre');
const nuevoTema = document.getElementById('nuevoTema');
const cargandoProyecto = document.getElementById('cargandoProyecto');

const volverDeDetalleBtn = document.getElementById('volverDeDetalleBtn');
const borrarProyectoBtn = document.getElementById('borrarProyectoBtn');
const detalleNombre = document.getElementById('detalleNombre');
const detalleResumen = document.getElementById('detalleResumen');
const detalleCostoTotal = document.getElementById('detalleCostoTotal');
const tablaMaterialesBody = document.getElementById('tablaMaterialesBody');
const listaPasos = document.getElementById('listaPasos');
const generarModelo3dBtn = document.getElementById('generarModelo3dBtn');
const modelo3dCargando = document.getElementById('modelo3dCargando');
const modelo3dCanvasWrap = document.getElementById('modelo3dCanvasWrap');
const modelo3dNotas = document.getElementById('modelo3dNotas');
const copilotoLog = document.getElementById('copilotoLog');
const copilotoForm = document.getElementById('copilotoForm');
const copilotoInput = document.getElementById('copilotoInput');

let proyectoActualId = null;
const proyectosCount = document.getElementById('proyectosCount');

async function actualizarContadorProyectos(){
  try{
    const resp = await fetch('/api/proyectos');
    const proyectos = await resp.json();
    if(proyectosCount) proyectosCount.textContent = proyectos.length;
    return proyectos;
  }catch(err){ return []; }
}
window.actualizarContadorProyectos = actualizarContadorProyectos;
actualizarContadorProyectos();

// ---------- Navegación entre vistas ----------
function mostrarVista(vista){
  [vistaLista, vistaNuevo, vistaDetalle].forEach(v => v.style.display = 'none');
  vista.style.display = 'block';
}

proyectosBtn.addEventListener('click', () => {
  proyectosOverlay.style.display = 'flex';
  cargarListaProyectos();
  mostrarVista(vistaLista);
});
cerrarProyectosBtn.addEventListener('click', () => { proyectosOverlay.style.display = 'none'; });

nuevoProyectoBtn.addEventListener('click', () => {
  nuevoNombre.value = '';
  nuevoTema.value = '';
  formNuevoProyecto.style.display = 'flex';
  cargandoProyecto.style.display = 'none';
  mostrarVista(vistaNuevo);
});
volverDeNuevoBtn.addEventListener('click', () => { mostrarVista(vistaLista); cargarListaProyectos(); });
volverDeDetalleBtn.addEventListener('click', () => { mostrarVista(vistaLista); cargarListaProyectos(); });

// ---------- Lista de proyectos ----------
async function cargarListaProyectos(){
  listaProyectos.innerHTML = '<p class="proyectos-vacio">Cargando…</p>';
  try{
    const resp = await fetch('/api/proyectos');
    const proyectos = await resp.json();
    if(proyectosCount) proyectosCount.textContent = proyectos.length;
    if(!proyectos.length){
      listaProyectos.innerHTML = '<p class="proyectos-vacio">Todavía no tienes proyectos. Crea el primero abajo.</p>';
      return;
    }
    listaProyectos.innerHTML = '';
    proyectos.forEach(p => {
      const card = document.createElement('div');
      card.className = 'proyecto-card';
      card.innerHTML = `
        <h3>${escapeHtml(p.nombre)}</h3>
        <p>${escapeHtml(p.resumen || '')}</p>
        <span class="costo">💰 ~$${Number(p.costo_total_estimado_usd || 0).toLocaleString()}</span>
      `;
      card.addEventListener('click', () => abrirProyecto(p.id));
      listaProyectos.appendChild(card);
    });
  }catch(err){
    listaProyectos.innerHTML = '<p class="proyectos-vacio">No pude cargar tus proyectos.</p>';
  }
}

// ---------- Crear proyecto (investigación a fondo) ----------
formNuevoProyecto.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = nuevoNombre.value.trim();
  const tema = nuevoTema.value.trim();
  if(!nombre || !tema) return;

  formNuevoProyecto.style.display = 'none';
  cargandoProyecto.style.display = 'flex';

  try{
    const resp = await fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, tema })
    });
    const proyecto = await resp.json();
    if(proyecto.error){
      alert('Hubo un problema: ' + proyecto.error);
      mostrarVista(vistaLista);
      cargarListaProyectos();
      return;
    }
    mostrarProyectoEnDetalle(proyecto);
    mostrarVista(vistaDetalle);
  }catch(err){
    alert('No pude conectar con el servidor para crear el proyecto.');
    mostrarVista(vistaLista);
  }
  actualizarContadorProyectos();
});

// ---------- Detalle de proyecto ----------
async function abrirProyecto(id){
  proyectosOverlay.style.display = 'flex';
  try{
    const resp = await fetch(`/api/proyectos/${id}`);
    const proyecto = await resp.json();
    mostrarProyectoEnDetalle(proyecto);
    mostrarVista(vistaDetalle);
  }catch(err){
    alert('No pude abrir ese proyecto.');
  }
}
window.irAProyecto = abrirProyecto;

function mostrarProyectoEnDetalle(proyecto){
  proyectoActualId = proyecto.id;
  detalleNombre.textContent = proyecto.nombre;
  detalleResumen.textContent = proyecto.resumen || '(sin resumen)';
  detalleCostoTotal.textContent = '$' + Number(proyecto.costo_total_estimado_usd || 0).toLocaleString();

  tablaMaterialesBody.innerHTML = '';
  (proyecto.materiales || []).forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(m.item||'')}</td><td>${escapeHtml(m.cantidad||'')}</td><td>$${Number(m.costo_estimado_usd||0).toLocaleString()}</td>`;
    tablaMaterialesBody.appendChild(tr);
  });

  listaPasos.innerHTML = '';
  (proyecto.pasos || []).forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${escapeHtml(p.titulo||'')}</b><span>${escapeHtml(p.descripcion||'')}</span>`;
    listaPasos.appendChild(li);
  });

  copilotoLog.innerHTML = '';
  (proyecto.chat || []).forEach(m => {
    agregarMensajeCopiloto(m.content, m.role === 'user' ? 'user' : 'jarvis');
  });
  if(!(proyecto.chat || []).length){
    agregarMensajeCopiloto('Soy tu copiloto para este proyecto. Pregúntame lo que necesites mientras lo ejecutas.', 'jarvis');
  }

  // Modelo 3D
  modelo3dCanvasWrap.style.display = 'none';
  generarModelo3dBtn.style.display = 'block';
  if(proyecto.modelo3d){
    renderizarModelo3d(proyecto.modelo3d);
  }

  cambiarTab('resumen');
}

borrarProyectoBtn.addEventListener('click', async () => {
  if(!proyectoActualId) return;
  if(!confirm('¿Borrar este proyecto para siempre?')) return;
  await fetch(`/api/proyectos/${proyectoActualId}`, { method: 'DELETE' });
  mostrarVista(vistaLista);
  cargarListaProyectos();
  actualizarContadorProyectos();
});

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => cambiarTab(btn.dataset.tab));
});
function cambiarTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.style.display = (p.dataset.panel === tab) ? 'block' : 'none';
  });
}

// ---------- Modelo 3D (Three.js) ----------
generarModelo3dBtn.addEventListener('click', async () => {
  if(!proyectoActualId) return;
  generarModelo3dBtn.style.display = 'none';
  modelo3dCargando.style.display = 'flex';
  try{
    const resp = await fetch(`/api/proyectos/${proyectoActualId}/modelo3d`, { method: 'POST' });
    const modelo = await resp.json();
    modelo3dCargando.style.display = 'none';
    if(modelo.error){
      alert('No se pudo generar el modelo 3D: ' + modelo.error);
      generarModelo3dBtn.style.display = 'block';
      return;
    }
    renderizarModelo3d(modelo);
  }catch(err){
    modelo3dCargando.style.display = 'none';
    generarModelo3dBtn.style.display = 'block';
    alert('No pude conectar con el servidor para generar el modelo.');
  }
});

function renderizarModelo3d(modelo){
  modelo3dCanvasWrap.style.display = 'flex';
  modelo3dNotas.textContent = modelo.notas || '';
  const contenedor = document.getElementById('modelo3dCanvas');
  contenedor.innerHTML = '';

  const ancho = contenedor.clientWidth || 600;
  const alto = contenedor.clientHeight || 380;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x070c14);

  const camara = new THREE.PerspectiveCamera(50, ancho / alto, 0.1, 1000);
  camara.position.set(10, 8, 12);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(ancho, alto);
  contenedor.appendChild(renderer.domElement);

  const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
  escena.add(luzAmbiente);
  const luzDireccional = new THREE.DirectionalLight(0x9be8ff, 0.9);
  luzDireccional.position.set(8, 12, 6);
  escena.add(luzDireccional);

  const grupo = new THREE.Group();
  (modelo.piezas || []).forEach(pieza => {
    let geometria;
    if(pieza.tipo === 'cilindro'){
      const radio = (pieza.ancho || 1) / 2;
      geometria = new THREE.CylinderGeometry(radio, radio, pieza.alto || 1, 24);
    } else {
      geometria = new THREE.BoxGeometry(pieza.ancho || 1, pieza.alto || 1, pieza.profundo || 1);
    }
    const material = new THREE.MeshStandardMaterial({
      color: pieza.color || '#8899aa',
      transparent: true,
      opacity: 0.92,
    });
    const malla = new THREE.Mesh(geometria, material);
    malla.position.set(pieza.x || 0, pieza.y || 0, pieza.z || 0);
    grupo.add(malla);

    const bordes = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometria),
      new THREE.LineBasicMaterial({ color: 0x4fe3d0, transparent: true, opacity: 0.35 })
    );
    bordes.position.copy(malla.position);
    grupo.add(bordes);
  });
  escena.add(grupo);

  // Suelo de referencia
  const suelo = new THREE.GridHelper(24, 24, 0x1e3140, 0x16233a);
  escena.add(suelo);

  camara.lookAt(0, 1, 0);

  // Rotación simple con el mouse/touch (arrastrar)
  let arrastrando = false, ultimoX = 0, ultimoY = 0, rotY = 0.5, rotX = 0.35;
  function actualizarCamara(){
    const radio = 16;
    camara.position.x = radio * Math.sin(rotY) * Math.cos(rotX);
    camara.position.z = radio * Math.cos(rotY) * Math.cos(rotX);
    camara.position.y = radio * Math.sin(rotX) + 4;
    camara.lookAt(0, 1, 0);
  }
  actualizarCamara();

  function inicioArrastre(x, y){ arrastrando = true; ultimoX = x; ultimoY = y; }
  function moverArrastre(x, y){
    if(!arrastrando) return;
    rotY += (x - ultimoX) * 0.008;
    rotX = Math.max(-0.6, Math.min(0.8, rotX + (y - ultimoY) * 0.006));
    ultimoX = x; ultimoY = y;
    actualizarCamara();
  }
  function finArrastre(){ arrastrando = false; }

  renderer.domElement.addEventListener('mousedown', e => inicioArrastre(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => moverArrastre(e.clientX, e.clientY));
  window.addEventListener('mouseup', finArrastre);
  renderer.domElement.addEventListener('touchstart', e => { const t = e.touches[0]; inicioArrastre(t.clientX, t.clientY); });
  renderer.domElement.addEventListener('touchmove', e => { const t = e.touches[0]; moverArrastre(t.clientX, t.clientY); });
  renderer.domElement.addEventListener('touchend', finArrastre);

  function animar(){
    requestAnimationFrame(animar);
    renderer.render(escena, camara);
  }
  animar();
}

// ---------- Copiloto ----------
function agregarMensajeCopiloto(texto, quien){
  const div = document.createElement('div');
  div.className = `msg ${quien}`;
  const etiqueta = quien === 'user' ? 'TÚ' : 'COPILOTO';
  div.innerHTML = `<span class="who">${etiqueta}</span>${escapeHtml(texto)}`;
  copilotoLog.appendChild(div);
  copilotoLog.scrollTop = copilotoLog.scrollHeight;
}

copilotoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = copilotoInput.value.trim();
  if(!texto || !proyectoActualId) return;
  agregarMensajeCopiloto(texto, 'user');
  copilotoInput.value = '';
  try{
    const resp = await fetch(`/api/proyectos/${proyectoActualId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto })
    });
    const data = await resp.json();
    agregarMensajeCopiloto(data.respuesta, 'jarvis');
  }catch(err){
    agregarMensajeCopiloto('No pude conectar con el servidor.', 'jarvis');
  }
});

// escapeHtml ya existe en script.js (se carga antes que este archivo)
