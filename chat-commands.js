(() => {
  'use strict';
  const entries=[
    ['기쁨','😄'],['웃음','😁'],['행복','😊'],['사랑','😍'],['하트','❤️'],
    ['축하','🎉'],['박수','👏'],['엄지','👍'],['응원','💪'],['승리','🏆'],
    ['슬픔','😢'],['눈물','😭'],['화남','😡'],['짜증','😤'],['놀람','😲'],
    ['당황','😳'],['부끄','🥺'],['졸림','😴'],['피곤','🥱'],['걱정','😟'],
    ['생각','🤔'],['장난','😜'],['윙크','😉'],['인사','👋'],['감사','🙏'],
    ['굿','👌'],['별','⭐'],['불','🔥'],['번개','⚡'],['꽃','🌸'],
    ['커피','☕'],['고양이','🐱'],['강아지','🐶'],['토끼','🐰'],['유령','👻']
  ];
  const lookup=Object.fromEntries(entries);
  function expand(message){
    return String(message).replace(/\/([가-힣]+)(?=\s|$)/g,(match,name)=>lookup[name]||match);
  }
  function attach(input){
    const form=input.closest('form');if(!form)return;
    form.style.position='relative';
    const menu=document.createElement('div');menu.className='qtime-emote-menu';menu.hidden=true;
    menu.setAttribute('role','listbox');form.append(menu);
    function draw(){
      const match=input.value.slice(0,input.selectionStart).match(/(?:^|\s)\/([가-힣]*)$/);
      if(!match){menu.hidden=true;return}
      const query=match[1],matches=entries.filter(([name])=>name.includes(query)).slice(0,16);
      menu.replaceChildren();for(const [name,emoji] of matches){
        const button=document.createElement('button');button.type='button';
        button.textContent=`${emoji} /${name}`;button.setAttribute('role','option');
        button.onmousedown=event=>event.preventDefault();
        button.onclick=()=>{
          const end=input.selectionStart,start=end-match[0].length+(match[0][0]===' '?1:0);
          input.setRangeText('/'+name+' ',start,end,'end');menu.hidden=true;input.focus();
        };menu.append(button)
      }
      menu.hidden=!matches.length;
    }
    input.addEventListener('input',draw);
    input.addEventListener('click',draw);
    input.addEventListener('keydown',event=>{if(event.key==='Escape')menu.hidden=true});
    input.addEventListener('blur',()=>setTimeout(()=>{menu.hidden=true},150));
  }
  window.qtimeChatCommands={expand,attach,names:entries};
})();
