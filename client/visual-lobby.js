(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const rooms = {'자유채널': [], '초보채널': []};
  let channel = '자유채널', ready = false, color = '#ffcf56';
  const shoutQueue = []; let showing = false;
  function renderRooms() {
    const list = $('room-list'); list.replaceChildren();
    if (!rooms[channel].length) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = '현재 생성된 일반 대전 방이 없습니다.'; list.append(empty); return;
    }
    for (const title of rooms[channel]) {
      const row = document.createElement('div'); row.className = 'room-item';
      const label = document.createElement('strong'); label.textContent = title + ' · 1/10명';
      const join = document.createElement('button'); join.type = 'button'; join.textContent = '입장';
      join.onclick = () => showWaiting(title); row.append(label, join); list.append(row);
    }
  }
  function showWaiting(title) {
    $('waiting-title').textContent = title;
    $('waiting-members').textContent = '나 · 대기 중';
    $('waiting-status').textContent = '방 화면 미리보기입니다. 다른 사용자와 연결되지 않았습니다.';
    ready = false; $('toggle-ready').textContent = '준비하기'; $('waiting-room').showModal();
  }
  document.querySelectorAll('[data-channel]').forEach(tab => tab.onclick = () => {
    channel = tab.dataset.channel; $('channel-title').textContent = channel;
    document.querySelectorAll('[data-channel]').forEach(item => item.setAttribute('aria-selected', String(item === tab)));
    renderRooms(); $('chat-log').textContent = channel + ' 채팅 미리보기 · 다른 사용자와 연결되지 않았습니다.';
  });
  $('create').onclick = () => $('room-dialog').showModal();
  $('cancel').onclick = () => $('room-dialog').close();
  $('room-form').onsubmit = event => {
    event.preventDefault(); const title = $('room-title').value.trim(); if (!title) return;
    rooms[channel].push(title); renderRooms(); $('room-title').value = '';
    $('room-dialog').close(); showWaiting(title);
  };
  $('leave-room').onclick = () => $('waiting-room').close();
  $('toggle-ready').onclick = () => {
    ready = !ready; $('toggle-ready').textContent = ready ? '준비 취소' : '준비하기';
    $('waiting-members').textContent = '나 · ' + (ready ? '준비 완료' : '대기 중');
  };
  $('chat-form').onsubmit = event => {
    event.preventDefault(); const input = $('chat-input'), value = input.value.trim(); if (!value) return;
    const line = document.createElement('p'); line.className = 'chat-line';
    const name = document.createElement('b'); name.textContent = '나: ';
    line.append(name, document.createTextNode(value)); $('chat-log').append(line);
    $('chat-log').scrollTop = $('chat-log').scrollHeight; input.value = '';
  };
  $('close-shop').onclick = () => $('shop-dialog').close();
  document.querySelector('[data-pending="상점"]').onclick = () => $('shop-dialog').showModal();
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
