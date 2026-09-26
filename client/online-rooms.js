(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const channels = {'자유채널':1,'초보채널':2};
  const randomRoomTitles=['퀴즈 우리 함께 풀어요!','오늘도 퀴즈 한 판!','다 같이 정답을 찾아봐요','가볍게 즐기는 퀴즈 대결','퀴즈 고수 모두 모여요!','함께 도전하는 퀴즈방'];
  let client=null,user=null,profile=null,channel='자유채널',roomId=null,room=null,match=null;
  let roomPoll=null,lobbyPoll=null,shoutPoll=null,refreshing=false,roomRefreshing=false,channelRefreshing=false,shoutRefreshing=false,epoch=0;
  let channelUsers=[],lastShout=0,shoutInitialized=false,shoutQueue=[],showingShout=false,selectedProfile=null;
  const channelBaseline=new Map();
  const roomBaseline=new Map();
  const whisperBaseline=new Map();
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
        button.disabled=entry.status==='waiting'&&entry.count>=entry.max_players;
        button.textContent=entry.status==='playing'?'게임 중':button.disabled?'인원 마감':'입장';
        button.onclick=()=>entry.status==='playing'?alert('게임이 진행 중입니다. 종료 후 입장해 주세요.'):join(entry);
        row.append(label,detail,button);$('room-list').append(row);
      }
    }catch(error){if(current===epoch)listMessage('방 목록 연결 실패: '+errorText(error))}
    finally{refreshing=false}
  }
  async function refreshChannel(){
    if(!client||!user||channelRefreshing)return;
    channelRefreshing=true;const current=epoch,selected=channel;
    try{
      const [state,counts,whispers]=await Promise.all([
        rpc('qtime_channel_state',{p_channel:channels[selected]}),
        rpc('qtime_channel_counts',{}),rpc('qtime_whisper_inbox',{p_room_id:null})
      ]);
      if(current!==epoch)return;
      channelUsers=state.users||[];
      if(!whisperBaseline.has('lobby'))whisperBaseline.set('lobby',Math.max(0,...(whispers||[]).map(m=>Number(m.id)||0)));
      document.querySelectorAll('[data-channel]').forEach(tab=>{
        const count=tab.querySelector('.channel-count');
        if(count)count.textContent=`(${Number(counts[channels[tab.dataset.channel]]||0)}/30)`;
      });
      const log=$('chat-log');log.replaceChildren();
      if(!channelBaseline.has(selected))channelBaseline.set(selected,Math.max(0,...(state.messages||[]).map(m=>Number(m.id)||0)));
      const feed=[...(state.messages||[]).filter(m=>Number(m.id)>channelBaseline.get(selected)).map(m=>({...m,private:false})),
        ...(whispers||[]).filter(m=>Number(m.id)>whisperBaseline.get('lobby')).map(m=>({...m,private:true}))];
      feed.sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
      for(const entry of feed){
        const line=document.createElement('p');line.className='chat-line';
        if(entry.private)line.classList.add('whisper');
        const name=document.createElement('b');name.textContent=entry.private?
          `🔒 ${entry.sender_id===user.id?'나 → '+entry.recipient_name:entry.sender_name+' → 나'}: `:
          entry.nickname+': ';
        line.append(name,document.createTextNode(entry.message));log.append(line);
      }
      if(!feed.length)log.textContent='이 채널의 첫 메시지를 보내보세요.';
      log.scrollTop=log.scrollHeight;
      const users=$('online-user-list');users.replaceChildren();
      for(const entry of channelUsers){
        const card=document.createElement('div');card.className='user-card';
        const icon=document.createElement('div');icon.className='avatar profile-symbol';
        window.qtimeProfileIcon?.set(icon,entry.profile_icon);
        const info=document.createElement('div');info.className='user-info';
        const name=document.createElement('strong');name.textContent=entry.nickname+(entry.user_id===user.id?' (나)':'');
        const detail=document.createElement('span');detail.textContent=`Lv.${entry.level||1} · 접속 중`;
        info.append(name,detail);card.append(icon,info);
        if(entry.user_id!==user.id){
          const view=document.createElement('button');view.type='button';view.className='profile-view-btn';
          view.textContent='프로필 보기';view.onclick=()=>viewProfile(entry.user_id);
          card.append(view);
        }
        users.append(card);
      }
      $('online-user-count').textContent=`(${String((state.users||[]).length).padStart(2,'0')})`;
    }catch(error){if(current===epoch)$('chat-log').textContent='채널 연결 오류: '+errorText(error)}
    finally{channelRefreshing=false}
  }
  function displayRoom(state){
    if(!roomBaseline.has(state.id))roomBaseline.set(state.id,Math.max(0,...(state.messages||[]).map(m=>Number(m.id)||0)));
    state={...state,messages:(state.messages||[]).filter(m=>Number(m.id)>roomBaseline.get(state.id))};
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
      const privateMessages=await rpc('qtime_whisper_inbox',{p_room_id:selected});
      if(roomId===selected){
        if(!whisperBaseline.has(selected))whisperBaseline.set(selected,Math.max(0,...(privateMessages||[]).map(m=>Number(m.id)||0)));
        frame()?.qtimeRoomBridge?.privateUpdate((privateMessages||[]).filter(m=>Number(m.id)>whisperBaseline.get(selected)),user.id);
      }
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
    const title=$('room-title').value.trim()||randomRoomTitles[Math.floor(Math.random()*randomRoomTitles.length)];
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
  async function kickPlayer(target){
    if(!roomId||!room||room.host_id!==user?.id||target===user.id)return;
    if(!confirm('이 참가자를 강퇴할까요?'))return;
    try{await rpc('qtime_room_kick',{p_room_id:roomId,p_target_id:target});await refreshRoom()}
    catch(error){alert('강퇴 실패: '+errorText(error))}
  }
  async function transferHost(target){
    if(!roomId||!room||room.host_id!==user?.id||target===user.id)return;
    if(!confirm('이 참가자에게 방장을 위임할까요?'))return;
    try{await rpc('qtime_room_transfer_host',{p_room_id:roomId,p_target_id:target});await refreshRoom()}
    catch(error){alert('방장 위임 실패: '+errorText(error))}
  }
  async function closeRoom(leave=true){
    const id=roomId;roomId=null;room=match=null;clearInterval(roomPoll);roomPoll=null;
    if(leave&&id&&client){try{await rpc('qtime_room_leave',{p_room_id:id})}catch(error){alert('방 나가기 실패: '+errorText(error));roomId=id;roomPoll=setInterval(refreshRoom,650);return}}
    showingShout=false;document.querySelectorAll('.qtime-shout-notice').forEach(node=>node.remove());window.qtimeCloseFeature();await refreshRooms();nextShout();
  }
  async function setReady(value){
    if(!roomId)return;
    try{await rpc('qtime_room_ready',{p_room_id:roomId,p_ready:value});await refreshRoom()}
    catch(error){alert('준비 변경 실패: '+errorText(error))}
  }
  async function sendRoomMessage(text){
    if(!roomId)return;
    try{
      const doc=frame()?.document;
      const input=doc?.getElementById(doc.getElementById('game-screen')?.classList.contains('active')?'game-chat-input':'chat-input');
      const request=whisperRequest(text,room?.members||[],input?.dataset.targetUserId);
      if(request){await rpc('qtime_whisper_send',{p_recipient_id:request.id,p_message:request.message,p_room_id:roomId})}
      else await rpc('qtime_room_send',{p_room_id:roomId,p_message:window.qtimeChatCommands.expand(text).slice(0,80)});
      if(input)delete input.dataset.targetUserId;
      await refreshRoom();
    }
    catch(error){alert('방 채팅 실패: '+errorText(error))}
  }
  function whisperRequest(input,people,forcedId){
    const match=String(input).match(/^\/(?:w|귓속말)\s+(\S+)\s+([\s\S]+)$/i);
    if(!match){if(/^\/(?:w|귓속말)(?:\s|$)/i.test(input))throw Error('사용법: /w 닉네임 메시지');return null}
    const candidates=people.filter(person=>person.nickname===match[1]&&person.user_id!==user.id&&(!forcedId||person.user_id===forcedId));
    if(candidates.length!==1)throw Error(candidates.length?'같은 닉네임의 이용자가 여러 명입니다. 프로필에서 귓속말을 눌러주세요.':'상대가 접속 중인지 확인해주세요.');
    return {id:candidates[0].user_id,message:window.qtimeChatCommands.expand(match[2]).slice(0,80)};
  }
  async function viewProfile(id){
    try{
      const info=await rpc('qtime_public_profile',{p_user_id:id});selectedProfile=info;
      $('public-name').textContent=info.nickname||'도전자';
      $('public-level').textContent=`LV.${info.level||1}`;
      $('public-exp').textContent=`EXP ${info.exp||0}/100`;
      window.qtimeProfileIcon?.set($('public-avatar'),info.profile_icon);
      $('profile-whisper').hidden=id===user.id;
      $('public-profile-dialog').showModal();
    }catch(error){alert('프로필 열기 실패: '+errorText(error))}
  }
  function prepareWhisper(){
    if(!selectedProfile)return;
    const target=selectedProfile.nickname||'도전자';
    const doc=roomId?frame()?.document:null;
    const input=doc?doc.getElementById(doc.getElementById('game-screen')?.classList.contains('active')?'game-chat-input':'chat-input'):$('chat-input');
    if(input){input.value=`/w ${target} `;input.dataset.targetUserId=selectedProfile.id;input.focus()}
    $('public-profile-dialog').close();
  }
  function makeShout(entry){
    const notice=document.createElement('div');notice.className='qtime-shout-notice';
    notice.style.setProperty('--shout-color',entry.color);
    const label=document.createElement('small');label.textContent=`📣 확성기 · ${entry.nickname||'도전자'}`;
    const message=document.createElement('span');message.textContent=entry.message;
    notice.append(label,message);document.body.append(notice);
    setTimeout(()=>{notice.remove();showingShout=false;nextShout()},3000);
  }
  function nextShout(){
    if(showingShout||!shoutQueue.length)return;
    showingShout=true;const entry=shoutQueue.shift();
    if(roomId){
      if(frame()?.qtimeRoomBridge?.shout)frame().qtimeRoomBridge.shout(entry,()=>{showingShout=false;nextShout()});
      else {showingShout=false;shoutQueue.unshift(entry);setTimeout(nextShout,250)}
    }else makeShout(entry);
  }
  async function refreshShouts(){
    if(!client||!user||shoutRefreshing)return;
    shoutRefreshing=true;
    try{
      const rows=await rpc('qtime_shout_recent',{});
      if(!shoutInitialized){
        lastShout=Math.max(lastShout,0,...(rows||[]).map(entry=>Number(entry.id)||0));
        shoutInitialized=true;
        return;
      }
      for(const entry of rows||[]){
        const id=Number(entry.id);if(id<=lastShout)continue;
        shoutQueue.push(entry);
        lastShout=Math.max(lastShout,id);
      }
      nextShout();
    }catch(error){status('확성기 연결 오류: '+errorText(error))}
    finally{shoutRefreshing=false}
  }
  window.qtimeShoutSend=async(message,color)=>{
    const sentId=Number(await rpc('qtime_shout_send',{p_message:message,p_color:color}));
    if(Number.isFinite(sentId))lastShout=Math.max(lastShout,sentId);
    shoutInitialized=true;
    shoutQueue.push({id:sentId,nickname:profile?.nickname||'도전자',message,color});
    nextShout();
  };
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
  function reset(){epoch++;clearInterval(roomPoll);clearInterval(lobbyPoll);clearInterval(shoutPoll);roomPoll=lobbyPoll=shoutPoll=null;roomId=room=match=null;client=user=profile=null;channelUsers=[];channelBaseline.clear();roomBaseline.clear();whisperBaseline.clear();lastShout=0;shoutInitialized=false;shoutQueue=[];showingShout=false;window.qtimeCloseFeature?.();listMessage('로그인 후 방 목록을 불러옵니다.')}
  document.querySelectorAll('[data-channel]').forEach(tab=>tab.onclick=()=>switchChannel(tab.dataset.channel));
  $('create').onclick=()=>{$('room-dialog').showModal()};
  $('cancel').onclick=()=>{$('room-dialog').close()};
  $('room-form').addEventListener('submit',create);
  $('public-profile-close').onclick=()=>$('public-profile-dialog').close();
  $('public-profile-done').onclick=()=>$('public-profile-dialog').close();
  $('profile-whisper').onclick=prepareWhisper;
  window.qtimeChatCommands?.attach($('chat-input'));
  $('chat-form').onsubmit=async event=>{
    event.preventDefault();const input=$('chat-input'),value=input.value.trim();if(!value||!client)return;
    try{
      const request=whisperRequest(value,channelUsers,input.dataset.targetUserId);
      if(request)await rpc('qtime_whisper_send',{p_recipient_id:request.id,p_message:request.message,p_room_id:null});
      else await rpc('qtime_channel_send',{p_channel:channels[channel],p_message:window.qtimeChatCommands.expand(value)});
      input.value='';delete input.dataset.targetUserId;await refreshChannel();
    }
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
    nextShout();
  });
  window.qtimeRoomServer={closeRoom,setReady,sendRoomMessage,start,answer,viewProfile,kickPlayer,transferHost};
  window.addEventListener('qtime:signed-in',event=>{
    reset();({client,user,profile}=event.detail);
    refreshRooms();refreshChannel();refreshShouts();
    lobbyPoll=setInterval(()=>{refreshRooms();refreshChannel()},4000);
    shoutPoll=setInterval(refreshShouts,1000);
    rpc('qtime_my_room').then(id=>{if(id&&user&&!roomId)openRoom(id)})
      .catch(error=>status('기존 방 확인 실패: '+errorText(error)));
  });
  window.addEventListener('qtime:signed-out',reset);
  window.addEventListener('qtime:profile-changed',()=>{refreshChannel();if(roomId)refreshRoom()});
})();
