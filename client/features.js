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
  const settings=make('settings-dialog','설정 · 도움말');
  settings.insertAdjacentHTML('beforeend',`<div class="setting-row"><label for="sound-toggle">효과음</label><input id="sound-toggle" type="checkbox" checked></div><div class="setting-row"><span>배경음</span><span>음원 선정 후 추가</span></div><h3>게임 방법</h3><p>방장은 참가자가 모두 준비하면 게임을 시작합니다. 답은 숫자 1~4 또는 클릭으로 선택하고, 7초 안에는 바꿀 수 있습니다. 미선택 시 무작위 답으로 처리하며 정답이면 점수의 절반을 받습니다.</p><p>방 채팅은 해당 방 참가자에게만 표시됩니다. 귓속말은 상대 프로필이나 /w 닉네임 메시지로 보냅니다.</p>`);
  for(const [id,key] of [['sound-toggle','sound']]){
    const el=$(id);el.checked=localStorage.getItem('qtime-'+key)!=='off';
    el.onchange=()=>{localStorage.setItem('qtime-'+key,el.checked?'on':'off');window.dispatchEvent(new CustomEvent('qtime:audio-setting',{detail:{key,enabled:el.checked}}))};
  }
  document.querySelector('[data-pending="설정"]').onclick=()=>settings.showModal();
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
      const remove=document.createElement('button');remove.textContent=entry.status==='accepted'?'친구 삭제':'거절/취소';remove.onclick=()=>act(entry.id,'remove');row.append(remove);
      friendList.append(row);
    }
    if(!(data||[]).length)friendList.textContent='등록된 친구가 없습니다. 접속자 프로필에서 친구를 신청하세요.';
  }
  async function act(id,action){
    const {error}=await window.qtimeAuthClient.rpc('qtime_friend_action',{p_id:id,p_action:action});
    if(error)alert(error.message);else{friends.close();showFriends()}
  }
  document.querySelector('[data-pending="친구"]').onclick=showFriends;
  const admin=make('admin-notice-dialog','공지사항 등록');
  admin.insertAdjacentHTML('beforeend',`<label for="admin-notice-text">전체 이용자에게 보일 공지</label><textarea id="admin-notice-text" maxlength="180" rows="4" style="width:100%;resize:none;padding:10px;background:#10283c;color:white;border:1px solid #6ca0b6;border-radius:8px"></textarea><button type="button" id="admin-notice-submit">공지 등록</button><p id="admin-notice-status" role="status"></p>`);
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
  window.addEventListener('qtime:signed-in',refreshNotice);
  setInterval(refreshNotice,5000);
  $('save-profile-note').onclick=async()=>{
    const client=window.qtimeAuthClient;if(!client){alert('로그인이 필요합니다.');return}
    const {error}=await client.rpc('qtime_profile_save_note',{p_note:$('profile-note').value});
    if(error)alert('자기소개 저장 실패: '+error.message);else alert('자기소개를 저장했습니다.');
  };
  $('open-profile').addEventListener('click',async()=>{
    const client=window.qtimeAuthClient,user=window.qtimeAuthUser;if(!client||!user)return;
    const {data,error}=await client.rpc('qtime_public_profile',{p_user_id:user.id});if(error)return;
    $('profile-note').value=data.profile_note||'';$('my-win-count').textContent=`승리 ${data.wins||0}회`;
  });
})();
