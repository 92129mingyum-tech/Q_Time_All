(() => {
  'use strict';
  let context;
  function play(type='tap'){
    if(localStorage.getItem('qtime-sound')==='off')return;
    try{
      context ||= new (window.AudioContext||window.webkitAudioContext)();
      if(context.state==='suspended')context.resume();
      const t=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
      const notes={tap:[520,630,.055],answer:[410,660,.11],score:[580,920,.18]};
      const [start,end,duration]=notes[type]||notes.tap;
      osc.type='sine';osc.frequency.setValueAtTime(start,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.035,t+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      osc.connect(gain);gain.connect(context.destination);osc.start(t);osc.stop(t+duration+.015);
    }catch{} // Audio is optional when the device has no sound output.
  }
  window.qtimeSound={play};
})();
