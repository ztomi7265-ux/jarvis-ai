const notasBtn = document.getElementById('notasBtn');
const notasOverlay = document.getElementById('notasOverlay');
const cerrarNotasBtn = document.getElementById('cerrarNotasBtn');
const notasCount = document.getElementById('notasCount');

const notasVistaLista = document.getElementById('notasVistaLista');
const notasVistaNueva = document.getElementById('notasVistaNueva');
const notasVistaDetalle = document.getElementById('notasVistaDetalle');

const listaNotas = document.getElementById('listaNotas');
const nuevaNotaBtn = document.getElementById('nuevaNotaBtn');
const volverDeNuevaNotaBtn = document.getElementById('volverDeNuevaNotaBtn');
const formNuevaNota = document.getElementById('formNuevaNota');
const nuevaNotaTitulo = document.getElementById('nuevaNotaTitulo');
const nuevaNotaContenido = document.getElementById('nuevaNotaContenido');

const volverDeNotaBtn = document.getElementById('volverDeNotaBtn');
const borrarNotaBtn = document.getElementById('borrarNotaBtn');
const notaDetalleTitulo = document.getElementById('notaDetalleTitulo');
const notaDetalleFecha = document.getElementById('notaDetalleFecha');
const notaDetalleContenido = document.getElementById('notaDetalleContenido');
const notaEditContenido = document.getElementById('notaEditContenido');
const editarNotaBtn = document.getElementById('editarNotaBtn');
const guardarNotaBtn = document.getElementById('guardarNotaBtn');

let notaActualId = null;

async function actualizarContadorNotas(){
  try{
    const resp = await fetch('/api/notas');
    const notas = await resp.json();
    if(notasCount) notasCount.textContent = notas.length;
    return notas;
  }catch(err){ return []; }
}
window.actualizarContadorNotas = actualizarContadorNotas;
actualizarContadorNotas();

function mostrarVistaNota(vista){
  [notasVistaLista, notasVistaNueva, notasVistaDetalle].forEach(v => v.style.display = 'none');
  vista.style.display = 'block';
}

notasBtn.addEventListener('click', () => {
  notasOverlay.style.display = 'flex';
  mostrarVistaNota(notasVistaLista);
  cargarListaNotas();
});
cerrarNotasBtn.addEventListener('click', () => { notasOverlay.style.display = 'none'; });

nuevaNotaBtn.addEventListener('click', () => {
  nuevaNotaTitulo.value = '';
  nuevaNotaContenido.value = '';
  mostrarVistaNota(notasVistaNueva);
});
volverDeNuevaNotaBtn.addEventListener('click', () => { mostrarVistaNota(notasVistaLista); cargarListaNotas(); });
volverDeNotaBtn.addEventListener('click', () => { mostrarVistaNota(notasVistaLista); cargarListaNotas(); });

async function cargarListaNotas(){
  listaNotas.innerHTML = '<p class="hud-vacio">Cargando…</p>';
  try{
    const notas = await actualizarContadorNotas();
    if(!notas.length){
      listaNotas.innerHTML = '<p class="hud-vacio">Todavía no tienes notas. Créala aquí o dile a Jarvis "anota que…" mientras hablas con él.</p>';
      return;
    }
    listaNotas.innerHTML = '';
    notas.forEach(n => {
      const card = document.createElement('div');
      card.className = 'nota-card';
      const fecha = n.creado ? new Date(n.creado).toLocaleDateString('es-CR', { day:'2-digit', month:'short' }) : '';
      card.innerHTML = `
        <div class="nota-card-info">
          <h3>${escapeHtml(n.titulo)}</h3>
          <span>${fecha}</span>
          <p>${escapeHtml(n.resumen || '')}</p>
        </div>
        <button class="nota-card-borrar" title="Borrar nota">🗑</button>
      `;
      card.querySelector('.nota-card-info').addEventListener('click', () => abrirNota(n.id));
      card.querySelector('.nota-card-borrar').addEventListener('click', async (e) => {
        e.stopPropagation();
        if(!confirm('¿Borrar esta nota para siempre?')) return;
        await fetch(`/api/notas/${n.id}`, { method: 'DELETE' });
        cargarListaNotas();
      });
      listaNotas.appendChild(card);
    });
  }catch(err){
    listaNotas.innerHTML = '<p class="hud-vacio">No pude cargar tus notas.</p>';
  }
}

formNuevaNota.addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo = nuevaNotaTitulo.value.trim();
  const contenido = nuevaNotaContenido.value.trim();
  if(!titulo || !contenido) return;
  try{
    const resp = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, contenido })
    });
    const nota = await resp.json();
    if(nota.error){ alert(nota.error); return; }
    actualizarContadorNotas();
    abrirNota(nota.id);
  }catch(err){
    alert('No pude guardar la nota.');
  }
});

async function abrirNota(id){
  try{
    const resp = await fetch(`/api/notas/${id}`);
    const nota = await resp.json();
    if(nota.error) return;
    notaActualId = nota.id;
    notaDetalleTitulo.textContent = nota.titulo;
    const fecha = nota.creado ? new Date(nota.creado).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' }) : '';
    notaDetalleFecha.textContent = `// ${fecha}`;
    notaDetalleContenido.textContent = nota.contenido;
    notaEditContenido.value = nota.contenido;
    notaDetalleContenido.style.display = 'block';
    notaEditContenido.style.display = 'none';
    editarNotaBtn.style.display = 'block';
    guardarNotaBtn.style.display = 'none';
    mostrarVistaNota(notasVistaDetalle);
  }catch(err){
    alert('No pude abrir esa nota.');
  }
}
window.irANota = abrirNota;
window.notasBtnAbrirDesdeChat = function(id){
  notasOverlay.style.display = 'flex';
  abrirNota(id);
};

editarNotaBtn.addEventListener('click', () => {
  notaDetalleContenido.style.display = 'none';
  notaEditContenido.style.display = 'block';
  editarNotaBtn.style.display = 'none';
  guardarNotaBtn.style.display = 'block';
  notaEditContenido.focus();
});

guardarNotaBtn.addEventListener('click', async () => {
  if(!notaActualId) return;
  const nuevoContenido = notaEditContenido.value.trim();
  try{
    const resp = await fetch(`/api/notas/${notaActualId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido: nuevoContenido })
    });
    const nota = await resp.json();
    if(nota.error){ alert(nota.error); return; }
    notaDetalleContenido.textContent = nota.contenido;
    notaDetalleContenido.style.display = 'block';
    notaEditContenido.style.display = 'none';
    editarNotaBtn.style.display = 'block';
    guardarNotaBtn.style.display = 'none';
  }catch(err){
    alert('No pude guardar los cambios.');
  }
});

borrarNotaBtn.addEventListener('click', async () => {
  if(!notaActualId) return;
  if(!confirm('¿Borrar esta nota para siempre?')) return;
  await fetch(`/api/notas/${notaActualId}`, { method: 'DELETE' });
  mostrarVistaNota(notasVistaLista);
  cargarListaNotas();
});
