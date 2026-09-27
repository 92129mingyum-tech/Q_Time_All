(() => {
  'use strict';
  let activeResolve = null;

  function ensureDialog() {
    let dialog = document.getElementById('qtime-system-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'qtime-system-dialog';
    dialog.className = 'qtime-system-dialog';
    dialog.innerHTML = `
      <form method="dialog" class="qtime-system-card">
        <header><span class="qtime-system-icon">Q</span><div><small>Q-TIME</small><h2 id="qtime-system-title">알림</h2></div></header>
        <p id="qtime-system-message"></p>
        <input id="qtime-system-input" hidden autocomplete="off">
        <menu>
          <button type="button" id="qtime-system-cancel">취소</button>
          <button type="submit" id="qtime-system-ok">확인</button>
        </menu>
      </form>`;
    document.body.append(dialog);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      finish(null);
    });
    dialog.querySelector('#qtime-system-cancel').onclick = () => finish(null);
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const input = dialog.querySelector('#qtime-system-input');
      finish(input.hidden ? true : input.value);
    };
    return dialog;
  }

  function finish(value) {
    const dialog = document.getElementById('qtime-system-dialog');
    if (dialog?.open) dialog.close();
    const resolve = activeResolve;
    activeResolve = null;
    resolve?.(value);
  }

  function open(options = {}) {
    const dialog = ensureDialog();
    if (activeResolve) finish(null);
    const type = options.type || 'info';
    dialog.dataset.type = type;
    dialog.querySelector('#qtime-system-title').textContent = options.title || ({success:'완료',error:'오류',warning:'확인',danger:'주의',input:'입력'}[type] || '알림');
    dialog.querySelector('#qtime-system-message').textContent = String(options.message || '');
    const input = dialog.querySelector('#qtime-system-input');
    input.hidden = !options.input;
    input.value = options.value || '';
    input.placeholder = options.placeholder || '';
    input.type = options.inputType || 'text';
    input.inputMode = options.inputMode || '';
    input.maxLength = options.maxLength || 524288;
    const cancel = dialog.querySelector('#qtime-system-cancel');
    cancel.hidden = !options.cancel;
    const ok = dialog.querySelector('#qtime-system-ok');
    ok.textContent = options.okText || '확인';
    ok.classList.toggle('danger', type === 'danger');
    dialog.showModal();
    setTimeout(() => (options.input ? input : ok).focus(), 0);
    return new Promise(resolve => { activeResolve = resolve; });
  }

  window.qtimeDialog = {
    alert(message, options = {}) { return open({...options, message, cancel:false}); },
    confirm(message, options = {}) { return open({...options, message, cancel:true}); },
    prompt(message, options = {}) { return open({...options, message, cancel:true, input:true, type:options.type || 'input'}); }
  };
  // 기존 알림 호출도 브라우저 기본창 대신 Q-TIME UI를 사용합니다.
  window.alert = message => { window.qtimeDialog.alert(message); };
})();
