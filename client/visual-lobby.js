(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let color = '#ffcf56';
  const shoutQueue = []; let showing = false;
  $('close-shop').onclick = () => $('shop-dialog').close();
  document.querySelector('[data-pending="상점"]').onclick = () => window.qtimeShowFeature('./shop.html','Q-TIME 상점');
  $('buy-shout').onclick = () => { $('shop-status').textContent = '구매는 다음 서버 연결 패치에서 사용할 수 있습니다.'; };
  document.querySelectorAll('.swatches button').forEach(button => button.onclick = () => {
    color = button.dataset.color;
    document.querySelectorAll('.swatches button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('shout-palette').open = false;
  });
  function nextShout() {
    if (showing || !shoutQueue.length) return;
    showing = true; const {message, selectedColor} = shoutQueue.shift();
    const notice = document.createElement('div'); notice.className = 'shout-notice';
    notice.setAttribute('role','status'); notice.style.setProperty('--shout-color', selectedColor);
    const title = document.createElement('small'); title.textContent = '📣 확성기 · 화면 미리보기';
    const body = document.createElement('span'); body.className = 'message'; body.textContent = message;
    notice.append(title, body); document.body.append(notice);
    setTimeout(() => { notice.remove(); showing = false; nextShout(); }, 3000);
  }
  $('shout-form').onsubmit = event => {
    event.preventDefault(); const input = $('shout-input'), message = input.value.trim(); if (!message) return;
    shoutQueue.push({message, selectedColor:color}); input.value = ''; nextShout();
  };
})();
