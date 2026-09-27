(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let room=null, meId=null, match=null, phase='waiting', round=0, lastScore=0;
  let seenMessage=0, activeBubble=null, bubbleUntil=0, resultTimer=null;
  let seenPrivate=0;
  let clockOffset=0, lastRoundKey='', lastRevealKey='', lastResultKey='';
  let optionOrder=[0,1,2,3],halfLeft=3,halfRound=0,audienceRound=0;
  function shuffledOptions(key,count){
    let seed=2166136261;
    for(const char of key)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
    const order=Array.from({length:count},(_,i)=>i);
    for(let i=order.length-1;i>0;i--){
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      const j=(seed>>>0)%(i+1);[order[i],order[j]]=[order[j],order[i]];
    }
    return order;
  }
  const send=(action,data)=>parent.qtimeRoomServer?.[action]?.(data);
  function fit(){
    const scale=Math.min(innerWidth/1360,innerHeight/800);
    const stage=$('stage');stage.style.transform=`scale(${scale})`;
    stage.style.left=`${(innerWidth-1360*scale)/2}px`;
    stage.style.top=`${(innerHeight-800*scale)/2}px`;
  }
  function screen(which){
    document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===which));
    $('stage').classList.toggle('game-active',which==='game-screen');
  }
  function drawPlayers(force=false){
    if(!room)return;
    const arena=$('arena');
    const scores=new Map((match?.scores||[]).map(row=>[row.user_id,Number(row.score||0)]));
    const members=room.members||[],isTeam=room.mode==='team';
    const displayMembers=isTeam?[...members.filter(m=>m.team==='RED').slice(0,4),...Array(Math.max(0,4-members.filter(m=>m.team==='RED').length)).fill(null),...members.filter(m=>m.team==='BLUE').slice(0,4),...Array(Math.max(0,4-members.filter(m=>m.team==='BLUE').length)).fill(null)]:members.slice(0,10);
    const signature=displayMembers.map((m,i)=>m?`${m.user_id}:${m.team}:${scores.get(m.user_id)??m.score}`:`empty:${i}`).join('|');
    if(!force&&arena.dataset.signature===signature)return;
    arena.dataset.signature=signature;arena.replaceChildren();arena.classList.toggle('team-mode',isTeam);
    const speechLayer=document.createElement('div');speechLayer.className='speech-layer';arena.append(speechLayer);
    arena.style.setProperty('--player-count',String(Math.max(1,Math.min(10,members.length))));
    displayMembers.forEach((member,i)=>{
      if(!member){const empty=document.createElement('div');empty.className='arena-player empty '+(i<4?'team-red':'team-blue');arena.append(empty);return}
      const card=document.createElement('div');card.className='arena-player';card.dataset.userId=member.user_id;
      if(member.team)card.classList.add('team-'+member.team.toLowerCase());
      if(member.user_id===meId)card.classList.add('mine');
      const art=document.createElement('img');art.src=`./assets/characters/${i%2?'female':'male'}.png`;art.alt='';
      const plate=document.createElement('div');plate.className='plate';
      const name=document.createElement('span');name.textContent=member.nickname||'도전자';
      const score=document.createElement('b');score.textContent=(scores.get(member.user_id)??member.score??0)+'점';
      plate.append(name,score);card.append(art,plate);
      if(member.user_id===meId){const mark=document.createElement('span');mark.id='my-answer-mark';mark.className='answer-mark';card.append(mark)}
      arena.append(card);
    });
    if(activeBubble&&Date.now()<bubbleUntil)showBubble(activeBubble,false);
  }
  function showBubble(message,remember=true){
    if(remember){activeBubble=message;bubbleUntil=Date.now()+3000}
    const arena=$('arena');
    const card=[...arena.querySelectorAll('.arena-player')].find(el=>el.dataset.userId===message.sender_id);
    if(!card)return;
    const layer=arena.querySelector('.speech-layer');if(!layer)return;
    layer.querySelector(`[data-sender="${CSS.escape(String(message.sender_id))}"]`)?.remove();
    const bubble=document.createElement('div');bubble.className='speech-bubble';
    bubble.dataset.sender=message.sender_id;bubble.textContent=message.message.slice(0,40);layer.append(bubble);
    const width=168,center=card.offsetLeft+card.offsetWidth/2;
    bubble.style.left=Math.max(8,Math.min(arena.clientWidth-width-8,center-width/2))+'px';bubble.style.top='8px';
    setTimeout(()=>{if(bubble.isConnected)bubble.remove()},Math.max(0,bubbleUntil-Date.now()));
  }
  function roomUpdate(next,id){
    room=next;meId=id;
    $('room-screen').querySelector('h1').textContent=next.title||'퀴즈방';
    let members=next.members||[],isHost=next.host_id===id;
    if(next.mode==='team')members=[...members].sort((a,b)=>(a.team==='RED'?0:1)-(b.team==='RED'?0:1)||String(a.user_id).localeCompare(String(b.user_id)));
    document.querySelector('.room-head .muted').textContent=`방장 ${members.find(m=>m.user_id===next.host_id)?.nickname||'도전자'}`;
    const slots=document.querySelector('.slots.ten');slots.replaceChildren();
    const waitingSlots=next.mode==='team'?[...members.filter(member=>member.team==='RED').slice(0,4),...Array(Math.max(0,4-members.filter(member=>member.team==='RED').length)).fill(null),...members.filter(member=>member.team==='BLUE').slice(0,4),...Array(Math.max(0,4-members.filter(member=>member.team==='BLUE').length)).fill(null)]:members.slice(0,10);
    waitingSlots.forEach((member,index)=>{
      if(!member){
        const card=document.createElement('article');card.className=`slot compact empty team-${index<4?'red':'blue'}`;
        const count=document.createElement('span');count.className='empty-number';count.textContent=String(index+1).padStart(2,'0');
        const label=document.createElement('span');label.textContent=`${index<4?'RED':'BLUE'} 빈자리`;card.append(count,label);slots.append(card);return;
      }
      const card=document.createElement('article');card.className='slot compact';
      if(member.user_id===id)card.classList.add('mine');
      if(member.team)card.classList.add('team-'+member.team.toLowerCase());
      const icon=document.createElement('span');icon.className='profile-icon';
      window.qtimeProfileIcon?.set(icon,member.profile_icon);
      const body=document.createElement('div');body.className='member';
      const name=document.createElement('strong');name.textContent=member.nickname||'도전자';
      const level=document.createElement('small');level.textContent=`LV.${member.level||1}`;
      body.append(name,level);
      const badge=document.createElement('span');badge.className='slot-tag';
      badge.textContent=member.is_cpu?'🤖 CPU · 준비 완료':member.user_id===next.host_id?'👑 방장':member.ready?'✓ 준비 완료':'준비 전';
      if(member.team)badge.textContent=`${member.team} · `+badge.textContent;
      card.append(icon,body,badge);
      if(member.user_id!==id&&!member.is_cpu){
        const view=document.createElement('button');view.className='profile-view-btn';view.type='button';
        view.textContent='프로필 보기';view.onclick=()=>send('viewProfile',member.user_id);card.append(view);
        if(isHost&&next.status==='waiting'){
          const kick=document.createElement('button');kick.className='profile-view-btn';kick.type='button';kick.textContent='강퇴';kick.onclick=()=>send('kickPlayer',member.user_id);
          const transfer=document.createElement('button');transfer.className='profile-view-btn';transfer.type='button';transfer.textContent='방장 위임';transfer.onclick=()=>send('transferHost',member.user_id);
          const actions=document.createElement('div');actions.className='host-actions';actions.append(kick,transfer);card.append(actions);
        }
      }else if(member.is_cpu&&isHost&&next.status==='waiting'){
        const kick=document.createElement('button');kick.className='profile-view-btn';kick.type='button';kick.textContent='CPU 강퇴';kick.onclick=()=>send('kickPlayer',member.user_id);card.append(kick);
      }
      slots.append(card);
    });
    for(let i=members.length;next.mode!=='team'&&i<next.max_players;i++){
      const card=document.createElement('article');card.className='slot compact empty';
      const count=document.createElement('span');count.className='empty-number';count.textContent=String(i+1).padStart(2,'0');
      const label=document.createElement('span');label.textContent='참가자 대기 중';card.append(count,label);slots.append(card);
    }
    document.querySelector('.section-title strong').textContent=`${members.length} / ${next.max_players}`;
    $('team-controls').hidden=next.mode!=='team';$('cpu-red').hidden=!isHost;$('cpu-blue').hidden=!isHost;
    const pills=document.querySelectorAll('.room-head .pill');
    if(pills[0])pills[0].textContent=({normal:'일반 대전',cpu:'컴퓨터 대전',team:'팀전'})[next.mode]||'일반 대전';
    if(pills[1])pills[1].textContent=({1:'쉬움',2:'보통',3:'어려움',4:'넌센스'})[next.difficulty]||'보통';
    if(pills[2])pills[2].textContent=`${members.length} / ${next.max_players}명`;
    const mine=members.find(m=>m.user_id===id);
    $('ready').hidden=isHost;$('start').hidden=!isHost;
    $('ready').textContent=mine?.ready?'준비 취소':'준비하기';
    $('start').disabled=!isHost||next.status!=='waiting'||!members.every(m=>m.is_cpu||m.user_id===id||m.ready);
    $('ready-hint').textContent=next.host_timeout?.active?
      (next.host_timeout.warning?`방장 시작 제한 ${next.host_timeout.seconds_left}초 · 시간 초과 시 방장 변경`:`모두 준비 완료 · 방장이 ${next.host_timeout.seconds_left}초 안에 시작해야 합니다.`):
      next.status==='playing'?'게임이 진행 중입니다.':
      isHost?($('start').disabled?'다른 참가자의 준비를 기다립니다.':'게임을 시작할 수 있어요.'):'준비를 눌러 방장에게 알려주세요.';
    const chat=$('chat');const nearBottom=chat.scrollHeight-chat.scrollTop-chat.clientHeight<40;const previousScroll=chat.scrollTop;chat.replaceChildren();
    for(const entry of next.messages||[]){
      const p=document.createElement('p'),b=document.createElement('b');b.textContent=entry.nickname+' ';
      p.append(b,document.createTextNode(entry.message));chat.append(p);
    }
    chat.scrollTop=nearBottom?chat.scrollHeight:previousScroll;
    const newest=(next.messages||[]).at(-1);
    if(newest&&Number(newest.id)>seenMessage){
      if(seenMessage&&phase!=='waiting')showBubble(newest);
      seenMessage=Number(newest.id);
    }
    drawPlayers();
  }
  function stamp(value){return new Date(value).getTime()}
  function now(){return Date.now()+clockOffset}
  function updateClock(){
    if(!match||phase==='waiting')return;
    const began=stamp(match.started_at);
    if(phase==='countdown'){
      const delta=began-now(),value=delta>2400?'3':delta>1600?'2':delta>800?'1':'START';
      $('countdown-value').textContent=value;return;
    }
    if(phase==='finished'){
      const left=Math.max(0,Math.ceil((stamp(match.ended_at)+7000-now())/1000));
      $('result-timer').textContent=`${left}초 뒤 방으로 돌아갑니다`;
      if(left===0)showRoom();return;
    }
    const left=Math.max(0,7000-(now()-began-(round-1)*10000));
    $('timer').textContent=Math.ceil(left/1000)+'초';
    $('timer').style.color=left<=3000?'#ff8c93':'#ffe184';
    $('time-bar').style.width=(left/70)+'%';
    $('time-bar').style.background=left<=3000?'#f34e56':'#35a8bc';
  }
  function showRoom(){
    phase='waiting';match=null;lastRoundKey='';lastRevealKey='';lastResultKey='';
    $('result').classList.remove('show');$('countdown').hidden=true;screen('room-screen');
  }
  function scoreEffect(points,combo){
    const card=$('arena').querySelector('.mine');if(!card||!points)return;window.qtimeSound?.play('score');
    card.classList.remove('score-bounce');void card.offsetWidth;card.classList.add('score-bounce');
    const pop=document.createElement('div');pop.className='score-pop';pop.textContent=`+${points}점`;card.append(pop);
    if(combo>=2){
      const label=document.createElement('div');label.className='combo-pop';label.textContent=`${combo} COMBO!`;
      card.append(label);setTimeout(()=>label.remove(),1250);
    }
    setTimeout(()=>{pop.remove();card.classList.remove('score-bounce')},1250);
  }
  function renderRound(next){
    round=next.round;
    $('round-label').textContent=`${round} / 10`;
    $('category').textContent=next.category||'퀴즈';
    $('question').textContent=next.question||'';
    $('feedback').textContent='';
    $('explanation').hidden=true;
    $('answers').replaceChildren();
    halfRound=0;audienceRound=0;$('half-hint').disabled=halfLeft<=0;$('audience-help').classList.remove('active');
    optionOrder=shuffledOptions(`${next.started_at}:${next.round}`,(next.options||[]).length);
    optionOrder.forEach((original,index)=>{
      const button=document.createElement('button');button.type='button';
      button.textContent=`${'①②③④'[index]} ${next.options[original]}`;
      button.onclick=()=>choose(index);$('answers').append(button);
    });
    screen('game-screen');drawPlayers(true);
  }
  function halfHintUpdate(data){if(!data)return;halfLeft=Number(data.remaining??halfLeft);halfRound=round;$('half-count').textContent=String(halfLeft);$('half-hint').disabled=true;for(const original of data.removed||[]){const shown=optionOrder.indexOf(Number(original));const button=$('answers').children[shown];if(button){button.classList.add('hint-removed');button.disabled=true;button.textContent='✕ 제거된 오답'}}}
  function audienceUpdate(data){if(!data||Number(data.round)!==round)return;audienceRound=round;$('audience-help').classList.add('active');const rates=data.rates||[0,0,0,0],max=Math.max(...rates);[...$('answers').children].forEach((button,shown)=>{const original=optionOrder[shown],rate=Number(rates[original]||0);button.dataset.rate=rate+'%';button.classList.toggle('audience-top',max>0&&rate===max);button.querySelector('.vote-rate')?.remove();const label=document.createElement('span');label.className='vote-rate';label.textContent=` ${rate}%`;button.append(label)})}
  function selected(next){
    [...$('answers').children].forEach((button,i)=>button.classList.toggle('selected',optionOrder[i]===next.my_choice));
    const mark=$('my-answer-mark');if(mark)mark.textContent=next.my_choice==null?'':String(optionOrder.indexOf(next.my_choice)+1);
  }
  async function choose(index){
    if(phase!=='question'||!match||!$('game-screen').classList.contains('active'))return;
    const left=7000-(now()-stamp(match.started_at)-(round-1)*10000);
    if(left<=0)return;
    const original=optionOrder[index];
    if(original==null)return;
    const old=match.my_choice;match.my_choice=original;selected(match);window.qtimeSound?.play('answer');
    try{await send('answer',{round,choice:original})}
    catch(error){match.my_choice=old;selected(match);$('feedback').textContent='답변 전송 실패: '+String(error.message||error)}
  }
  function showResult(next){
    $('countdown').hidden=true;screen('game-screen');
    const ranks=$('result-score');ranks.replaceChildren();
    const scores=next.scores||[];
    if(room?.mode==='team'){
      const teams={RED:0,BLUE:0};for(const entry of scores){const member=room.members?.find(item=>item.user_id===entry.user_id);if(member?.team in teams)teams[member.team]+=Number(entry.score||0)}
      const teamRow=document.createElement('div');teamRow.className='result-row team-total';
      const winner=teams.RED===teams.BLUE?'무승부':teams.RED>teams.BLUE?'RED 팀 승리':'BLUE 팀 승리';
      teamRow.textContent=`${winner} · RED ${teams.RED}점 / BLUE ${teams.BLUE}점`;ranks.append(teamRow);
    }
    scores.forEach((entry,i)=>{
      const rank=scores.findIndex(item=>item.score===entry.score)+1;
      const row=document.createElement('div');row.className='result-row';
      if(entry.user_id===meId)row.classList.add('my-result');
      if(rank===1)row.classList.add('winner');
      row.textContent=`${rank}위  ${entry.nickname}  ${entry.score}점`;ranks.append(row);
    });
    const reviews=$('result-explanations');reviews.replaceChildren();
    for(const entry of next.reviews||[]){const p=document.createElement('p');p.textContent=`${entry.round}. ${entry.explanation}`;reviews.append(p)}
    $('result').classList.add('show');updateClock();
  }
  function matchUpdate(next){
    if(!next)return;
    if(next.server_now)clockOffset=stamp(next.server_now)-Date.now();
    if(next.phase==='waiting'){
      if(phase==='waiting')return;
      showRoom();return;
    }
    match=next;phase=next.phase;
    if(phase==='countdown'){
      screen('room-screen');$('countdown').hidden=false;
      $('countdown-value').textContent='3';drawPlayers();updateClock();return;
    }
    if(phase==='finished'){
      const key=next.ended_at;
      if(lastResultKey!==key){lastResultKey=key;showResult(next);parent.qtimeRefreshMyProfile?.()}
      updateClock();return;
    }
    $('countdown').hidden=true;
    const key=`${next.started_at}:${next.round}`;
    if(lastRoundKey!==key){lastRoundKey=key;renderRound(next)}
    selected(next);
    const myScore=Number((next.scores||[]).find(row=>row.user_id===meId)?.score||0);
    if(phase==='reveal'){
      const revealKey=key;
      if(lastRevealKey!==revealKey){
        lastRevealKey=revealKey;
        audienceRound=0;$('audience-help').classList.remove('active');
        [...$('answers').children].forEach((button,i)=>{
          button.disabled=true;
          button.classList.remove('audience-top');button.querySelector('.vote-rate')?.remove();
          button.classList.toggle('correct',optionOrder[i]===next.correct_index);
          button.classList.toggle('wrong',optionOrder[i]===next.my_choice&&optionOrder[i]!==next.correct_index);
        });
        $('explanation').textContent=`정답 ${optionOrder.indexOf(next.correct_index)+1}번 · ${next.explanation||''}`;
        $('explanation').hidden=false;
        $('feedback').textContent='';
        drawPlayers();scoreEffect(Number(next.my_points||0),Number(next.my_streak||0));
      }
    }else drawPlayers();
    lastScore=myScore;
    $('hud-score').textContent=myScore+'점';
    $('hud-combo').textContent=String(next.my_streak||0);
    updateClock();
  }
  function privateUpdate(messages,myId){
    if(!room)return;
    const chat=$('chat');const nearBottom=chat.scrollHeight-chat.scrollTop-chat.clientHeight<40;const previousScroll=chat.scrollTop;
    for(const item of [...(messages||[])].reverse()){
      const row=document.createElement('p');row.className='whisper';
      const name=document.createElement('b');
      name.textContent=item.sender_id===myId?`🔒 나 → ${item.recipient_name}: `:`🔒 ${item.sender_name} → 나: `;
      row.append(name,document.createTextNode(item.message));chat.append(row);
    }
    chat.scrollTop=nearBottom?chat.scrollHeight:previousScroll;
    const latest=(messages||[])[0];
    if(latest&&Number(latest.id)>seenPrivate){
      if(seenPrivate&&phase!=='waiting')showBubble({...latest,sender_id:latest.sender_id});
      seenPrivate=Number(latest.id);
    }
  }
  function shout(entry,done){
    const notice=document.createElement('div');notice.className='qtime-shout-notice';
    notice.style.setProperty('--shout-color',entry.color);
    const label=document.createElement('small');label.textContent=`📣 확성기 · ${entry.nickname||'도전자'}`;
    const message=document.createElement('span');message.textContent=entry.message;
    notice.append(label,message);document.body.append(notice);
    setTimeout(()=>{notice.remove();done?.()},3000);
  }
  $('ready').onclick=()=>send('setReady',!room?.members?.find(m=>m.user_id===meId)?.ready);
  $('start').onclick=()=>send('start');
  $('invite').onclick=()=>send('invitePeople');
  $('join-red').onclick=()=>send('setTeam','RED');$('join-blue').onclick=()=>send('setTeam','BLUE');
  $('cpu-red').onclick=()=>send('addTeamCpu','RED');$('cpu-blue').onclick=()=>send('addTeamCpu','BLUE');
  $('leave').onclick=()=>send('closeRoom');
  $('back-room').onclick=()=>{
    if(confirm('게임 중 방을 나가시겠습니까? 이 경기의 경험치와 게임 재화는 지급되지 않습니다.'))send('closeRoom');
  };
  $('result-back').onclick=showRoom;
  $('result-exit').onclick=()=>send('closeRoom');
  $('chat-form').onsubmit=event=>{
    event.preventDefault();const input=$('chat-input'),message=input.value.trim();
    if(!message)return;send('sendRoomMessage',message);input.value='';
  };
  $('game-chat-form').onsubmit=event=>{
    event.preventDefault();const input=$('game-chat-input'),message=input.value.trim().slice(0,30);
    if(!message)return;send('sendRoomMessage',message);input.value='';
  };
  $('half-hint').onclick=()=>{if(phase!=='question'||halfRound===round||halfLeft<=0)return;send('useHalfHint',{round})};
  $('audience-help').onclick=()=>{if(phase!=='question')return;audienceRound=round;send('useAudience',{round})};
  window.qtimeChatCommands?.attach($('chat-input'));
  window.qtimeChatCommands?.attach($('game-chat-input'));
  document.querySelectorAll('[data-room-menu]').forEach(button=>button.onclick=()=>send('openRoomMenu',button.dataset.roomMenu));
  addEventListener('keydown',event=>{
    if(event.target.closest('input,textarea,[contenteditable]'))return;
    if(event.ctrlKey&&!event.altKey&&!event.shiftKey){
      const key=event.key.toLowerCase(),isHost=room?.host_id===meId;
      if(key==='r'&&!isHost&&room?.status==='waiting'){
        event.preventDefault();send('setReady',!room?.members?.find(m=>m.user_id===meId)?.ready);return;
      }
      if(key==='s'&&isHost&&room?.status==='waiting'){
        event.preventDefault();if(!$('start').disabled)send('start');return;
      }
    }
    if(!/^[1-4]$/.test(event.key)||event.ctrlKey||event.altKey||event.metaKey)return;
    if(phase==='question'){event.preventDefault();choose(Number(event.key)-1)}
  });
  addEventListener('resize',fit);fit();setInterval(updateClock,100);
  window.qtimeRoomBridge={update:roomUpdate,matchUpdate,privateUpdate,shout,halfHintUpdate,audienceUpdate};
})();
