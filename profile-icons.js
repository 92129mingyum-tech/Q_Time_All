(() => {
  'use strict';
  const imageNames=new Set(['bear','rabbit','cat','fox']);
  function set(element,icon){
    if(!element)return;
    const value=String(icon||'🙂');element.replaceChildren();
    if(value.startsWith('img:')&&imageNames.has(value.slice(4))){
      const img=document.createElement('img');img.src=`./assets/profiles/${value.slice(4)}.png`;
      img.alt='';img.className='qtime-profile-art';element.append(img);
    }else{
      element.textContent=value==='default'||value.startsWith('img:')?'🙂':value;
    }
  }
  window.qtimeProfileIcon={set};
})();
