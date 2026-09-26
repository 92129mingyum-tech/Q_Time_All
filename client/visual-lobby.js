(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let color = '#ffcf56';
  $('close-shop').onclick = () => $('shop-dialog').close();
  document.querySelector('[data-pending="상점"]').onclick = () => window.qtimeShowFeature('./shop.html','Q-TIME 상점');
  $('buy-shout').onclick = () => { $('shop-status').textContent = '구매는 다음 서버 연결 패치에서 사용할 수 있습니다.'; };
  document.querySelectorAll('.swatches button').forEach(button => button.onclick = () => {
    color = button.dataset.color;
    document.querySelectorAll('.swatches button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('shout-palette').open = false;
  });
  $('shout-form').onsubmit = async event => {
    event.preventDefault();const input=$('shout-input'),message=input.value.trim();
    if(!message)return;
    if(!window.qtimeShoutSend){alert('로그인 후 확성기를 사용할 수 있습니다.');return}
    try{await window.qtimeShoutSend(message,color);input.value=''}
    catch(error){alert('확성기 전송 실패: '+String(error.message||error))}
  };
})();
