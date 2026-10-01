(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const make=(id,title)=>{
    const dialog=document.createElement('dialog');dialog.id=id;dialog.className='qtime-feature-dialog';
    const head=document.createElement('header');const h=document.createElement('h2');h.textContent=title;
    const close=document.createElement('button');close.type='button';close.textContent='닫기';close.onclick=()=>dialog.close();
    head.append(h,close);dialog.append(head);document.body.append(dialog);return dialog;
  };
  const ranking=make('ranking-dialog','랭킹');
  const tabs=document.createElement('div');tabs.className='tabs';
  const list=document.createElement('div');list.className='rank-list';ranking.append(tabs,list);
  async function showRanking(metric){
    tabs.replaceChildren();for(const [key,label] of [['level','레벨'],['wins','승리 횟수']]){
      const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-selected',String(key===metric));button.onclick=()=>showRanking(key);tabs.append(button);
    }
    list.textContent='랭킹을 불러오는 중…';if(!ranking.open)ranking.showModal();
    const client=window.qtimeAuthClient;if(!client){list.textContent='로그인 후 확인할 수 있습니다.';return}
    const {data,error}=await client.rpc('qtime_rankings',{p_metric:metric});
    if(error){list.textContent='랭킹 연결 실패: '+error.message;return}
    list.replaceChildren();for(const [i,entry] of (data||[]).entries()){
      const row=document.createElement('div');row.className='rank-row';
      const num=document.createElement('b');num.textContent=(i+1)+'위';
      const icon=document.createElement('span');window.qtimeProfileIcon?.set(icon,entry.profile_icon);
      const name=document.createElement('strong');name.textContent=entry.nickname||'도전자';
      const value=document.createElement('span');value.textContent=metric==='level'?`LV.${entry.level} · EXP ${entry.exp}`:`${entry.wins}승`;
      row.append(num,icon,name,value);list.append(row);
    }
    if(!(data||[]).length)list.textContent='아직 랭킹 기록이 없습니다.';
  }
  document.querySelector('[data-pending="랭킹"]').onclick=()=>showRanking('level');
  const settings=make('settings-dialog','설정');
  settings.insertAdjacentHTML('beforeend',`<div class="setting-row"><label for="sound-toggle">효과음</label><input id="sound-toggle" type="checkbox" checked></div><div class="setting-row"><span>배경음</span><span>음원 선정 후 추가</span></div><h3>게임 방법</h3><p>방장은 참가자가 모두 준비하면 게임을 시작합니다. 답은 숫자 1~4 또는 클릭으로 선택하고, 7초 안에는 바꿀 수 있습니다. 미선택 시 무작위 답으로 처리하며 정답이면 점수의 절반을 받습니다.</p><p>방 채팅은 해당 방 참가자에게만 표시됩니다. 귓속말은 상대 프로필이나 /w 닉네임 메시지로 보냅니다.</p>`);
  for(const [id,key] of [['sound-toggle','sound']]){
    const el=$(id);el.checked=localStorage.getItem('qtime-'+key)!=='off';
    el.onchange=()=>{localStorage.setItem('qtime-'+key,el.checked?'on':'off');window.dispatchEvent(new CustomEvent('qtime:audio-setting',{detail:{key,enabled:el.checked}}))};
  }
  document.querySelector('[data-pending="설정"]').onclick=()=>settings.showModal();
  const obsoleteHelp=settings.querySelector('h3');if(obsoleteHelp?.textContent==='게임 방법'){const first=obsoleteHelp.nextElementSibling,second=first?.nextElementSibling;obsoleteHelp.remove();first?.remove();second?.remove()}
  settings.insertAdjacentHTML('beforeend',`<div class="setting-row"><label for="sound-volume">효과음 음량</label><input id="sound-volume" type="range" min="0" max="100" value="70"></div><div class="setting-row"><label for="invite-toggle">방 초대 받기</label><input id="invite-toggle" type="checkbox"></div><div class="settings-actions"><button type="button" id="settings-reset">초기화</button><button type="button" id="settings-save">저장</button></div><p id="settings-status" role="status"></p>`);
  settings.querySelector('.help-item')?.remove();
  const loadSettings=()=>{$('sound-toggle').checked=localStorage.getItem('qtime-sound')!=='off';$('sound-volume').value=localStorage.getItem('qtime-sound-volume')||'70';$('invite-toggle').checked=localStorage.getItem('qtime-invites')!=='off'};
  $('settings-save').onclick=async()=>{localStorage.setItem('qtime-sound',$('sound-toggle').checked?'on':'off');localStorage.setItem('qtime-sound-volume',$('sound-volume').value);localStorage.setItem('qtime-invites',$('invite-toggle').checked?'on':'off');window.dispatchEvent(new CustomEvent('qtime:audio-setting',{detail:{key:'sound',enabled:$('sound-toggle').checked,volume:Number($('sound-volume').value)/100}}));const client=window.qtimeAuthClient;if(client){const {error}=await client.rpc('qtime_invite_setting',{p_accept:$('invite-toggle').checked});if(error){$('settings-status').textContent='저장 실패: '+error.message;return}}$('settings-status').textContent='설정을 저장했습니다.'};
  $('settings-reset').onclick=()=>{localStorage.removeItem('qtime-sound');localStorage.removeItem('qtime-sound-volume');localStorage.removeItem('qtime-invites');loadSettings()};
  document.querySelector('[data-pending="설정"]').onclick=()=>{loadSettings();$('settings-status').textContent='';settings.showModal()};
  const friends=make('friends-dialog','친구');
  const friendList=document.createElement('div');friendList.className='rank-list';friends.append(friendList);
  async function showFriends(){
    friends.showModal();friendList.textContent='친구 목록을 불러오는 중…';
    const client=window.qtimeAuthClient;
    if(!client){friendList.textContent='로그인이 필요합니다.';return}
    const {data,error}=await client.rpc('qtime_friend_list',{});
    if(error){friendList.textContent='친구 연결 실패: '+error.message;return}
    friendList.replaceChildren();
    for(const entry of data||[]){
      const row=document.createElement('div');row.className='rank-row';
      const icon=document.createElement('span');window.qtimeProfileIcon?.set(icon,entry.profile_icon);
      const label=document.createElement('strong');label.textContent=`${entry.nickname||'도전자'} · LV.${entry.level||1}`;
      row.append(icon,label);
      const state=document.createElement('span');state.textContent=entry.status==='accepted'?'친구':entry.incoming?'신청 도착':'수락 대기';row.append(state);
      if(entry.status==='pending'&&entry.incoming){
        const accept=document.createElement('button');accept.textContent='수락';accept.onclick=()=>act(entry.id,'accept');row.append(accept);
      }
      const remove=document.createElement('button');remove.textContent=entry.status==='accepted'?'친구 삭제':'거절/취소';remove.onclick=async()=>{if(await window.qtimeDialog.confirm(`${entry.nickname||'이 이용자'}님의 ${entry.status==='accepted'?'친구 관계를 삭제':'신청을 거절 또는 취소'}할까요?`,{title:'친구 관리',type:'danger',okText:'처리'}))act(entry.id,'remove')};row.append(remove);
      friendList.append(row);
    }
    if(!(data||[]).length)friendList.textContent='등록된 친구가 없습니다. 접속자 프로필에서 친구를 신청하세요.';
  }
  async function act(id,action){
    const {error}=await window.qtimeAuthClient.rpc('qtime_friend_action',{p_id:id,p_action:action});
    if(error)alert(error.message);else{friends.close();showFriends()}
  }
  document.querySelector('[data-pending="친구"]').onclick=showFriends;
  async function refreshFriendBadge(){const client=window.qtimeAuthClient;if(!client)return;const {data}=await client.rpc('qtime_friend_list',{});const pending=(data||[]).filter(entry=>entry.status==='pending'&&entry.incoming).length;const button=document.querySelector('[data-pending="친구"]');if(button)button.textContent=pending?`친구 (${pending})`:'친구'}
  const admin=make('admin-notice-dialog','최고 관리자 센터');
  admin.classList.add('admin-center');
  admin.insertAdjacentHTML('beforeend',`<nav class="admin-tabs" aria-label="관리자 메뉴"><button type="button" class="active" data-admin-tab="notice">공지 관리</button><button type="button" data-admin-tab="users">이용자 관리</button><button type="button" data-admin-tab="delete">아이디 삭제</button></nav><section class="admin-pane active" data-admin-pane="notice"><label for="admin-notice-text">전체 이용자에게 보일 공지</label><textarea id="admin-notice-text" maxlength="180" rows="4"></textarea><button type="button" id="admin-notice-submit">공지 등록</button></section><section class="admin-pane" data-admin-pane="users"><div class="admin-search"><input id="admin-user-query" placeholder="아이디 또는 닉네임"><button type="button" id="admin-user-search">검색</button></div><div id="admin-user-list" class="admin-user-list"></div><div id="admin-user-result" class="admin-selected">이용자를 선택하세요.</div><div class="admin-adjust-row"><select id="admin-action"><option value="coins">보유 포인트</option><option value="exp">경험치</option><option value="level">레벨</option><option value="wins">승리 횟수</option></select><input id="admin-value" type="number" min="0" placeholder="변경할 값"><input id="admin-reason" maxlength="120" placeholder="변경 사유(필수)"><button type="button" id="admin-adjust">조정 적용</button></div><div class="admin-ban-actions"><button type="button" id="admin-ban">이용 정지</button><button type="button" id="admin-unban">정지 해제</button></div></section><section class="admin-pane" data-admin-pane="delete"><p class="admin-warning">삭제한 아이디와 게임 기록은 복구할 수 없습니다.</p><div class="admin-search"><input id="admin-delete-query" placeholder="삭제할 아이디 또는 닉네임"><button type="button" id="admin-delete-search">검색</button></div><div id="admin-delete-list" class="admin-user-list"></div><input id="admin-delete-reason" maxlength="120" placeholder="삭제 사유(필수)"><button type="button" id="admin-delete-user" class="danger">선택한 아이디 삭제</button></section><p id="admin-notice-status" role="status"></p>`);
  $('open-admin-notice').onclick=()=>admin.showModal();
  async function refreshNotice(){
    const client=window.qtimeAuthClient;if(!client)return;
    const {data}=await client.rpc('qtime_notice_current',{});
    if(data?.message)document.querySelector('.notice-text').textContent=data.message;
  }
  $('admin-notice-submit').onclick=async()=>{
    const {error}=await window.qtimeAuthClient.rpc('qtime_notice_save',{p_message:$('admin-notice-text').value});
    $('admin-notice-status').textContent=error?'등록 실패: '+error.message:'공지가 등록되었습니다.';
    if(!error){$('admin-notice-text').value='';refreshNotice()}
  };
  let adminTarget=null;
  let adminDeleteTarget=null;
  function selectAdminUser(entry,mode='adjust'){
    if(mode==='delete'){adminDeleteTarget=entry;document.querySelectorAll('#admin-delete-list .admin-user-row').forEach(row=>row.classList.toggle('selected',row.dataset.id===String(entry.id)));return}
    adminTarget=entry;document.querySelectorAll('#admin-user-list .admin-user-row').forEach(row=>row.classList.toggle('selected',row.dataset.id===String(entry.id)));$('admin-user-result').textContent=`${entry.login_id||'아이디 미등록'} · ${entry.nickname} · LV.${entry.level} · ${entry.coins} P · ${entry.banned?'이용 정지':'정상'}`;
  }
  async function loadAdminUsers(query='',mode='adjust'){
    const target=mode==='delete'?$('admin-delete-list'):$('admin-user-list');target.textContent='이용자 목록을 불러오는 중…';
    const {data,error}=await window.qtimeAuthClient.rpc('qtime_admin_user_list',{p_query:query||'',p_offset:0,p_limit:200});
    if(error){target.textContent='목록 불러오기 실패: '+error.message;return}
    target.replaceChildren();for(const entry of data||[]){const row=document.createElement('button');row.type='button';row.className='admin-user-row';row.dataset.id=entry.id;row.innerHTML='<span></span><strong></strong><small></small>';row.querySelector('span').textContent=entry.login_id||'아이디 미등록';row.querySelector('strong').textContent=entry.nickname||'닉네임 없음';row.querySelector('small').textContent=`${Number(entry.coins||0).toLocaleString()} P · LV.${entry.level||1}${entry.banned?' · 이용 정지':''}`;row.onclick=()=>selectAdminUser(entry,mode);target.append(row)}
    if(!(data||[]).length)target.textContent='검색 결과가 없습니다.';
  }
  admin.querySelectorAll('[data-admin-tab]').forEach(button=>button.onclick=()=>{admin.querySelectorAll('[data-admin-tab]').forEach(item=>item.classList.toggle('active',item===button));admin.querySelectorAll('[data-admin-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.adminPane===button.dataset.adminTab));if(button.dataset.adminTab==='users')loadAdminUsers();if(button.dataset.adminTab==='delete')loadAdminUsers('', 'delete')});
  $('admin-user-search').onclick=()=>loadAdminUsers($('admin-user-query').value.trim());
  $('admin-delete-search').onclick=()=>loadAdminUsers($('admin-delete-query').value.trim(),'delete');
  $('admin-adjust').onclick=async()=>{if(!adminTarget){alert('먼저 이용자를 검색하세요.');return}if(!$('admin-reason').value.trim()){alert('변경 사유를 입력하세요.');return}const {error}=await window.qtimeAuthClient.rpc('qtime_admin_adjust',{p_target:adminTarget.id,p_field:$('admin-action').value,p_value:Number($('admin-value').value),p_reason:$('admin-reason').value.trim()});$('admin-notice-status').textContent=error?'조정 실패: '+error.message:'조정했습니다. 감사 기록에 저장됩니다.';if(!error)$('admin-user-search').click()};
  async function setBan(value){if(!adminTarget){await window.qtimeDialog.alert('먼저 이용자를 선택하세요.',{title:'이용자 관리'});return}const reason=$('admin-reason').value.trim();if(!reason){await window.qtimeDialog.alert('변경 사유를 입력하세요.',{title:'이용자 관리'});return}const {error}=await window.qtimeAuthClient.rpc('qtime_admin_set_ban',{p_target:adminTarget.id,p_banned:value,p_reason:reason});$('admin-notice-status').textContent=error?'처리 실패: '+error.message:value?'이용 정지 처리했습니다.':'이용 정지를 해제했습니다.';if(!error)loadAdminUsers($('admin-user-query').value.trim())}
  $('admin-ban').onclick=()=>setBan(true);$('admin-unban').onclick=()=>setBan(false);
  $('admin-delete-user').onclick=async()=>{if(!adminDeleteTarget){await window.qtimeDialog.alert('삭제할 이용자를 선택하세요.',{title:'아이디 삭제'});return}const reason=$('admin-delete-reason').value.trim();if(!reason){await window.qtimeDialog.alert('삭제 사유를 입력하세요.',{title:'아이디 삭제'});return}if(!await window.qtimeDialog.confirm(`${adminDeleteTarget.login_id||adminDeleteTarget.nickname} 아이디를 영구 삭제할까요?\n이 작업은 복구할 수 없습니다.`,{title:'아이디 삭제',type:'danger',okText:'영구 삭제'}))return;const {error}=await window.qtimeAuthClient.rpc('qtime_admin_delete_user',{p_target:adminDeleteTarget.id,p_reason:reason});$('admin-notice-status').textContent=error?'삭제 실패: '+error.message:'아이디를 삭제했습니다.';if(!error){adminDeleteTarget=null;loadAdminUsers($('admin-delete-query').value.trim(),'delete')}};
  window.addEventListener('qtime:signed-in',()=>{refreshNotice();refreshFriendBadge()});
  setInterval(()=>{refreshNotice();refreshFriendBadge()},5000);
  $('save-profile-note').onclick=async()=>{
    const client=window.qtimeAuthClient;if(!client){alert('로그인이 필요합니다.');return}
    const {error}=await client.rpc('qtime_profile_save_note',{p_note:$('profile-note').value});
    if(error)alert('자기소개 저장 실패: '+error.message);else alert('자기소개를 저장했습니다.');
  };
  $('open-profile').addEventListener('click',async()=>{
    const client=window.qtimeAuthClient,user=window.qtimeAuthUser;if(!client||!user)return;
    const [{data,error},{data:shop}]=await Promise.all([client.rpc('qtime_public_profile',{p_user_id:user.id}),client.rpc('qtime_shop_list',{})]);if(error)return;
    $('profile-note').value=data.profile_note||'';$('my-win-count').textContent=`승리 ${data.wins||0}회`;
    const owned=new Set((shop?.products||[]).filter(item=>Number(item.quantity)>0).map(item=>item.icon));document.querySelectorAll('#profile-icon-grid button').forEach(button=>{const free=button.dataset.free==='true',has=free||owned.has(button.dataset.icon),active=button.getAttribute('aria-pressed')==='true';button.dataset.owned=String(has);button.classList.toggle('locked',!has);const item=button.querySelector('small');if(item)item.textContent=active?'사용 중':free?'무료':has?'사용 가능':'구입 필요'});
  });
})();
