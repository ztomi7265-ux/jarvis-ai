(function(){
  const CORRECTO = '2008';
  const lock = document.getElementById('pinLock');
  const input = document.getElementById('pinInput');
  const btn = document.getElementById('pinSubmit');
  const err = document.getElementById('pinError');
  const box = lock ? lock.querySelector('.pin-box') : null;

  if(!lock || !input || !btn) return;

  if(sessionStorage.getItem('jarvis_desbloqueado') === '1'){
    lock.style.display = 'none';
  } else {
    setTimeout(() => input.focus(), 300);
  }

  function intentar(){
    if(input.value.trim() === CORRECTO){
      sessionStorage.setItem('jarvis_desbloqueado', '1');
      err.style.display = 'none';
      lock.classList.add('pin-lock-out');
      setTimeout(() => { lock.style.display = 'none'; }, 500);
    } else {
      err.style.display = 'block';
      if(box){
        box.classList.remove('shake');
        void box.offsetWidth; // reinicia la animación si se repite
        box.classList.add('shake');
      }
      input.value = '';
      input.focus();
    }
  }

  btn.addEventListener('click', intentar);
  input.addEventListener('keydown', (e) => { if(e.key === 'Enter') intentar(); });
})();
