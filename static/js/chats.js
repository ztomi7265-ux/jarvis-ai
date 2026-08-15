const chatsBtn = document.getElementById('chatsBtn');
const chatsOverlay = document.getElementById('chatsOverlay');
const cerrarChatsBtn = document.getElementById('cerrarChatsBtn');
const listaChats = document.getElementById('listaChats');
const nuevoChatDesdeListaBtn = document.getElementById('nuevoChatDesdeListaBtn');
const chatsCount = document.getElementById('chatsCount');

async function actualizarContadorChats(){
  try{
    const resp = await fetch('/api/chats');
    const chats = await resp.json();
    if(chatsCount) chatsCount.textContent = chats.length;
    return chats;
  }catch(err){ return []; }
}
window.actualizarContadorChats = actualizarContadorChats;
actualizarContadorChats();

chatsBtn.addEventListener('click', () => {
  chatsOverlay.style.display = 'flex';
  cargarListaChats();
});
cerrarChatsBtn.addEventListener('click', () => { chatsOverlay.style.display = 'none'; });

nuevoChatDesdeListaBtn.addEventListener('click', () => {
  empezarChatNuevo();
  chatsOverlay.style.display = 'none';
});

async function cargarListaChats(){
  listaChats.innerHTML = '<p class="hud-vacio">Cargando…</p>';
  try{
    const chats = await actualizarContadorChats();
    if(!chats.length){
      listaChats.innerHTML = '<p class="hud-vacio">Todavía no tienes chats guardados. Escríbele algo a Jarvis para empezar uno.</p>';
      return;
    }
    listaChats.innerHTML = '';
    chats.forEach(c => {
      const card = document.createElement('div');
      card.className = 'chat-card' + (c.id === chatActualId ? ' activo' : '');
      const fecha = c.creado ? new Date(c.creado).toLocaleDateString('es-CR', { day:'2-digit', month:'short' }) : '';
      card.innerHTML = `
        <div class="chat-card-info">
          <h3>${escapeHtml(c.titulo)}</h3>
          <span>${fecha} · ${c.cantidad_mensajes} mensajes</span>
        </div>
        <button class="chat-card-borrar" title="Borrar chat">🗑</button>
      `;
      card.querySelector('.chat-card-info').addEventListener('click', () => abrirChat(c.id));
      card.querySelector('.chat-card-borrar').addEventListener('click', async (e) => {
        e.stopPropagation();
        if(!confirm('¿Borrar este chat para siempre?')) return;
        await fetch(`/api/chats/${c.id}`, { method: 'DELETE' });
        if(c.id === chatActualId) empezarChatNuevo();
        cargarListaChats();
      });
      listaChats.appendChild(card);
    });
  }catch(err){
    listaChats.innerHTML = '<p class="hud-vacio">No pude cargar tus chats.</p>';
  }
}

async function abrirChat(id){
  try{
    const resp = await fetch(`/api/chats/${id}`);
    const chat = await resp.json();
    if(chat.error) return;
    chatActualId = chat.id;
    chatActivoTitulo.textContent = (chat.titulo || 'Nueva conversación').toUpperCase();
    log.innerHTML = '';
    if(!chat.historial.length){
      agregarMensaje('Este chat está vacío por ahora.', 'jarvis');
    } else {
      chat.historial.forEach(m => {
        agregarMensaje(m.content, m.role === 'user' ? 'user' : 'jarvis');
      });
    }
    chatsOverlay.style.display = 'none';
  }catch(err){
    alert('No pude abrir ese chat.');
  }
}
