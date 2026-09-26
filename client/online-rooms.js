(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const channels = {'자유채널':1,'초보채널':2};
  let client=null,user=null,profile=null,channel='자유채널',roomId=null,room=null,match=null;
  let roomPoll=null,lobbyPoll=null,refreshing=false,roomRefreshing=false,channelRefreshing=false,epoch=0;
  const errorText = error => String(error?.message || error || '알 수 없는 오류');
  const frame = () => $('feature-frame')?.contentWindow;
  function status(value){$('shop-status').textContent=value;}
  async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data}
  function listMessage(value){$('room-list').replaceChildren();const p=document.createElement('p');p.className='empty';p.textContent=value;$('room-list').append(p)}
  async function refreshRooms(){
    if(!client||!user||refreshing)return;
    refreshing=true;const current=epoch;
    try{
      const rows=await rpc('qtime_room_list',{p_channel:channels[channel]});
      if(current!==epoch)return;
      $('room-list').replaceChildren();
      if(!rows?.length){listMessage('현재 생성된 일반 대전 방이 없습니다.');return}
      for(const entry of rows){
        const row=document.createElement('div');row.className='room-item';
        const label=document.createElement('strong');label.textContent=entry.title||'퀴즈방';
        const detail=document.createElement('span');detail.textContent=` ${entry.status==='playing'?'게임 중':'대기 중'} · ${entry.count}/${entry.max_players}명`;
        const button=document.createElement('button');button.type='button';button.textContent='입장';
        button.disabled=entry.status!=='waiting'||entry.count>=entry.max_players;
        button.onclick=()=>join(entry);
        row.append(label,detail,button);$('room-list').append(row);
      }
    }catch(error){if(current===epoch)listMessage('방 목록 연결 실패: '+errorText(error))}
    finally{refreshing=false}
  }
  async function refreshChannel(){
    if(!client||!user||channelRefreshing)return;
    channelRefreshing=true;const current=epoch,selected=channel;
    try{
      const state=await rpc('qtime_channel_state',{p_channel:channels[selected]});
      if(current!==epoch)return;
      const log=$('chat-log');log.replaceChildren();
      for(const entry of state.messages||[]){
        const line=document.createElement('p');line.className='chat-line';
        const name=document.createElement('b');name.textContent=entry.nickname+': ';
        line.append(name,document.createTextNode(entry.message));log.append(line);
      }
      if(!(state.messages||[]).length)log.textContent='이 채널의 첫 메시지를 보내보세요.';
      log.scrollTop=log.scrollHeight;
      const users=$('online-user-list');users.replaceChildren();
      for(const entry of state.users||[]){
        const card=document.createElement('div');card.className='user-card';
        const icon=document.createElement('div');icon.className='avatar profile-symbol';icon.textContent=entry.profile_icon||'🙂';
        const info=document.createElement('div');info.className='user-info';
        const name=document.createElement('strong');name.textContent=entry.nickname+(entry.user_id===user.id?' (나)':'');
        const detail=document.createElement('span');detail.textContent=`Lv.${entry.level||1} · 접속 중`;
        info.append(name,detail);card.append(icon,info);users.append(card);
      }
      $('online-user-count').textContent=`(${String((state.users||[]).length).padStart(2,'0')})`;
    }catch(error){if(current===epoch)$('chat-log').textContent='채널 연결 오류: '+errorText(error)}
    finally{channelRefreshing=false}
  }
  function displayRoom(state){
    room=state;window.qtimeRoomTitle=state.title;window.qtimeRoom=state;
    if(frame()?.qtimeRoomBridge)frame().qtimeRoomBridge.update(state,user.id);
  }
  function displayMatch(state){
    match=state;
    frame()?.qtimeRoomBridge?.matchUpdate(state);
  }
  async function refreshRoom(){
    if(!roomId||roomRefreshing)return;
    roomRefreshing=true;const selected=roomId;
    try{
      const state=await rpc('qtime_room_state',{p_room_id:selected});
      if(roomId!==selected)return;
      displayRoom(state);
      const currentMatch=await rpc('qtime_match_state_v2',{p_room_id:selected});
      if(roomId===selected)displayMatch(currentMatch);
    }catch(error){
      if(roomId===selected){
        status('방 연결 오류: '+errorText(error));
        if(errorText(error).includes('Not in room'))await closeRoom(false);
        else frame()?.document?.getElementById('ready-hint')?.replaceChildren(document.createTextNode('서버 연결 오류 · 재시도 중'));
      }
    }
    finally{roomRefreshing=false}
  }
  async function openRoom(id){
    roomId=id;
    window.qtimeShowFeature('./waiting-game.html','온라인 게임 대기실');
    await refreshRoom();
    clearInterval(roomPoll);roomPoll=setInterval(refreshRoom,650);
  }
  async function create(event){
    event.preventDefault();if(!client)return;
    const title=$('room-title').value.trim()||'퀴즈방';
    const difficulty={'쉬움':1,'보통':2,'어려움':3,'넌센스':4}[$('room-difficulty').value]||2;
    const maxPlayers=Number.parseInt($('room-capacity').value,10)||10;
    try{
      const id=await rpc('qtime_room_create',{p_channel:channels[channel],p_title:title,p_difficulty:difficulty,p_max_players:maxPlayers});
      $('room-dialog').close();$('room-title').value='';await refreshRooms();await openRoom(id);
    }catch(error){alert('방 생성 실패: '+errorText(error))}
  }
  async function join(entry){
    try{await rpc('qtime_room_join',{p_room_id:entry.id});await openRoom(entry.id)}
    catch(error){alert('방 입장 실패: '+errorText(error));await refreshRooms()}
  }
  async function closeRoom(leave=true){
    const id=roomId;roomId=null;room=match=null;clearInterval(roomPoll);roomPoll=null;
    if(leave&&id&&client){try{await rpc('qtime_room_leave',{p_room_id:id})}catch(error){alert('방 나가기 실패: '+errorText(error));roomId=id;roomPoll=setInterval(refreshRoom,650);return}}
    window.qtimeCloseFeature();await refreshRooms();
  }
  async function setReady(value){
    if(!roomId)return;
    try{await rpc('qtime_room_ready',{p_room_id:roomId,p_ready:value});await refreshRoom()}
    catch(error){alert('준비 변경 실패: '+errorText(error))}
  }
  async function sendRoomMessage(text){
    if(!roomId)return;
    try{await rpc('qtime_room_send',{p_room_id:roomId,p_message:text.slice(0,80)});await refreshRoom()}
    catch(error){alert('방 채팅 실패: '+errorText(error))}
  }
  async function start(){
    if(!roomId)return;
    try{await rpc('qtime_match_start_v2',{p_room_id:roomId});await refreshRoom()}
    catch(error){alert('게임 시작 실패: '+errorText(error))}
  }
  async function answer(data){
    if(!roomId)return;
    await rpc('qtime_match_answer_v2',{p_room_id:roomId,p_round:data.round,p_choice:data.choice});
  }
  function switchChannel(next){
    if(!channels[next]||roomId)return;
    epoch++;channel=next;$('channel-title').textContent=next;
    document.querySelectorAll('[data-channel]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.channel===next)));
    refreshRooms();refreshChannel();
  }
  function reset(){epoch++;clearInterval(roomPoll);clearInterval(lobbyPoll);roomPoll=lobbyPoll=null;roomId=room=match=null;client=user=profile=null;window.qtimeCloseFeature?.();listMessage('로그인 후 방 목록을 불러옵니다.')}
  document.querySelectorAll('[data-channel]').forEach(tab=>tab.onclick=()=>switchChannel(tab.dataset.channel));
  $('create').onclick=()=>{$('room-dialog').showModal()};
  $('cancel').onclick=()=>{$('room-dialog').close()};
  $('room-form').addEventListener('submit',create);
  $('chat-form').onsubmit=async event=>{
    event.preventDefault();const input=$('chat-input'),value=input.value.trim();if(!value||!client)return;
    try{await rpc('qtime_channel_send',{p_channel:channels[channel],p_message:value});input.value='';await refreshChannel()}
    catch(error){alert('채널 채팅 실패: '+errorText(error))}
  };
  // The iframe is same-origin. Do not leave a room by merely closing its dialog.
  $('feature-close').onclick=()=>roomId?closeRoom(true):window.qtimeCloseFeature();
  $('feature-overlay').addEventListener('cancel',event=>{
    if(roomId){event.preventDefault();closeRoom(true)}
  });
  $('feature-frame').addEventListener('load',()=>{
    if(room&&user)displayRoom(room);
    if(match)displayMatch(match);
  });
  window.qtimeRoomServer={closeRoom,setReady,sendRoomMessage,start,answer};
  window.addEventListener('qtime:signed-in',event=>{
    reset();({client,user,profile}=event.detail);
    refreshRooms();refreshChannel();lobbyPoll=setInterval(()=>{refreshRooms();refreshChannel()},4000);
    rpc('qtime_my_room').then(id=>{if(id&&user&&!roomId)openRoom(id)})
      .catch(error=>status('기존 방 확인 실패: '+errorText(error)));
  });
  window.addEventListener('qtime:signed-out',reset);
})();
