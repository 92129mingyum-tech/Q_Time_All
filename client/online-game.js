(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let room=null, meId=null, match=null, phase='waiting', round=0, lastScore=0;
  let seenMessage=0, activeBubble=null, bubbleUntil=0, resultTimer=null;
  let seenPrivate=0;
  let clockOffset=0, lastRoundKey='', lastRevealKey='', lastResultKey='';
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
    const members=room.members||[];
    const signature=members.map(m=>`${m.user_id}:${scores.get(m.user_id)??m.score}`).join('|');
    if(!force&&arena.dataset.signature===signature)return;
    arena.dataset.signature=signature;arena.replaceChildren();
    arena.style.setProperty('--player-count',String(Math.max(1,Math.min(10,members.length))));
    members.slice(0,10).forEach((member,i)=>{
      const card=document.createElement('div');card.className='arena-player';card.dataset.userId=member.user_id;
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
    const card=[...$('arena').children].find(el=>el.dataset.userId===message.sender_id);
    if(!card)return;
    card.querySelector('.speech-bubble')?.remove();
    const bubble=document.createElement('div');bubble.className='speech-bubble';
    bubble.textContent=message.message.slice(0,30);card.append(bubble);
    setTimeout(()=>{if(bubble.isConnected)bubble.remove()},Math.max(0,bubbleUntil-Date.now()));
  }
  function roomUpdate(next,id){
    room=next;meId=id;
    $('room-screen').querySelector('h1').textContent=next.title||'퀴즈방';
    const members=next.members||[],isHost=next.host_id===id;
    document.querySelector('.room-head .muted').textContent=`방장 ${members.find(m=>m.user_id===next.host_id)?.nickname||'도전자'}`;
    const slots=document.querySelector('.slots.ten');slots.replaceChildren();
    members.slice(0,10).forEach(member=>{
      const card=document.createElement('article');card.className='slot compact';
      if(member.user_id===id)card.classList.add('mine');
      const icon=document.createElement('span');icon.className='profile-icon';
      window.qtimeProfileIcon?.set(icon,member.profile_icon);
      const body=document.createElement('div');body.className='member';
      const name=document.createElement('strong');name.textContent=member.nickname||'도전자';
      const level=document.createElement('small');level.textContent=`LV.${member.level||1}`;
      body.append(name,level);
      const badge=document.createElement('span');badge.className='slot-tag';
      badge.textContent=member.user_id===next.host_id?'👑 방장':member.ready?'✓ 준비 완료':'준비 전';
      card.append(icon,body,badge);
      if(member.user_id!==id){
        const view=document.createElement('button');view.className='profile-view-btn';view.type='button';
        view.textContent='프로필 보기';view.onclick=()=>send('viewProfile',member.user_id);card.append(view);
      }
      slots.append(card);
    });
    for(let i=members.length;i<next.max_players;i++){
      const card=document.createElement('article');card.className='slot compact empty';
      const count=document.createElement('span');count.className='empty-number';count.textContent=String(i+1).padStart(2,'0');
      const label=document.createElement('span');label.textContent='참가자 대기 중';card.append(count,label);slots.append(card);
    }
    document.querySelector('.section-title strong').textContent=`${members.length} / ${next.max_players}`;
    const pills=document.querySelectorAll('.room-head .pill');
    if(pills[2])pills[2].textContent=`${members.length} / ${next.max_players}명`;
    const mine=members.find(m=>m.user_id===id);
    $('ready').hidden=isHost;$('start').hidden=!isHost;
    $('ready').textContent=mine?.ready?'준비 취소':'준비하기';
    $('start').disabled=!isHost||next.status!=='waiting'||!members.every(m=>m.user_id===id||m.ready);
    $('ready-hint').textContent=next.status==='playing'?'게임이 진행 중입니다.':
      isHost?($('start').disabled?'다른 참가자의 준비를 기다립니다.':'게임을 시작할 수 있어요.'):'준비를 눌러 방장에게 알려주세요.';
    const chat=$('chat');chat.replaceChildren();
    for(const entry of next.messages||[]){
      const p=document.createElement('p'),b=document.createElement('b');b.textContent=entry.nickname+' ';
      p.append(b,document.createTextNode(entry.message));chat.append(p);
    }
    chat.scrollTop=chat.scrollHeight;
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
  }
  function showRoom(){
    phase='waiting';match=null;lastRoundKey='';lastRevealKey='';lastResultKey='';
    $('result').classList.remove('show');$('countdown').hidden=true;screen('room-screen');
  }
  function scoreEffect(points,combo){
    const card=$('arena').querySelector('.mine');if(!card||!points)return;
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
    (next.options||[]).forEach((option,index)=>{
      const button=document.createElement('button');button.type='button';
      button.textContent=`${'①②③④'[index]} ${option}`;
      button.onclick=()=>choose(index);$('answers').append(button);
    });
    screen('game-screen');drawPlayers(true);
  }
  function selected(next){
    [...$('answers').children].forEach((button,i)=>button.classList.toggle('selected',i===next.my_choice));
    const mark=$('my-answer-mark');if(mark)mark.textContent=next.my_choice==null?'':String(next.my_choice+1);
  }
  async function choose(index){
    if(phase!=='question'||!match||!$('game-screen').classList.contains('active'))return;
    const left=7000-(now()-stamp(match.started_at)-(round-1)*10000);
    if(left<=0)return;
    const old=match.my_choice;match.my_choice=index;selected(match);
    try{await send('answer',{round,choice:index})}
    catch(error){match.my_choice=old;selected(match);$('feedback').textContent='답변 전송 실패: '+String(error.message||error)}
  }
  function showResult(next){
    $('countdown').hidden=true;screen('game-screen');
    const ranks=$('result-score');ranks.replaceChildren();
    const scores=next.scores||[];
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
      if(lastResultKey!==key){lastResultKey=key;showResult(next)}
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
        [...$('answers').children].forEach((button,i)=>{
          button.disabled=true;
          button.classList.toggle('correct',i===next.correct_index);
          button.classList.toggle('wrong',i===next.my_choice&&i!==next.correct_index);
        });
        $('explanation').textContent=`정답 ${next.correct_index+1}번 · ${next.explanation||''}`;
        $('explanation').hidden=false;
        $('feedback').textContent=next.my_points>0?`정답! +${next.my_points}점`:'이번 문제는 0점';
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
    const chat=$('chat');
    for(const item of [...(messages||[])].reverse()){
      const row=document.createElement('p');row.className='whisper';
      const name=document.createElement('b');
      name.textContent=item.sender_id===myId?`🔒 나 → ${item.recipient_name}: `:`🔒 ${item.sender_name} → 나: `;
      row.append(name,document.createTextNode(item.message));chat.append(row);
    }
    chat.scrollTop=chat.scrollHeight;
    const latest=(messages||[])[0];
    if(latest&&Number(latest.id)>seenPrivate){
      if(seenPrivate&&phase!=='waiting')showBubble({...latest,sender_id:latest.sender_id});
      seenPrivate=Number(latest.id);
    }
  }
  function shout(entry,done){
    const notice=document.createElement('div');notice.className='qtime-shout-notice';
    notice.style.setProperty('--shout-color',entry.color);
    const label=document.createElement('small');label.textContent=`📣 ${entry.nickname}님의 확성기`;
    const message=document.createElement('span');message.textContent=entry.message;
    notice.append(label,message);document.body.append(notice);
    setTimeout(()=>{notice.remove();done?.()},3000);
  }
  $('ready').onclick=()=>send('setReady',!room?.members?.find(m=>m.user_id===meId)?.ready);
  $('start').onclick=()=>send('start');
  $('leave').onclick=()=>send('closeRoom');
  $('back-room').onclick=()=>send('closeRoom');
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
  window.qtimeChatCommands?.attach($('chat-input'));
  window.qtimeChatCommands?.attach($('game-chat-input'));
  addEventListener('keydown',event=>{
    if(!/^[1-4]$/.test(event.key)||event.target.closest('input,textarea,[contenteditable]'))return;
    if(phase==='question'){event.preventDefault();choose(Number(event.key)-1)}
  });
  addEventListener('resize',fit);fit();setInterval(updateClock,100);
  window.qtimeRoomBridge={update:roomUpdate,matchUpdate,privateUpdate,shout};
})();
