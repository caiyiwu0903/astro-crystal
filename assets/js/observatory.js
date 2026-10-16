/* One synchronous snapshot supplies the numerical panels and both SVG views. */
(function () {
  'use strict';
  const el=id=>document.getElementById(id);
  const input=el('obs-datetime'),city=el('obs-city'),zone=el('obs-zone'),button=el('obs-update'),status=el('obs-status');
  const core=globalThis.ObservatoryCore;
  const skyMode=el('obs-sky-mode');
  const slider=el('obs-range'),previous=el('obs-prev'),forward=el('obs-next');
  const hour=3600000,minTime=Date.UTC(2000,0,1),maxTime=Date.UTC(2051,0,1)-60000;
  let timelineAnchor;
  let result=null;
  let clearPlanetList=()=>{};
  const play=el('obs-play');
  let playback=null;
  function pause() {
    if(playback!==null) clearInterval(playback);
    playback=null;
    play.textContent='▶';play.setAttribute('aria-label','播放');play.setAttribute('aria-pressed','false');
  }
  const planetIds=['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  const outputs=['obs-sun','obs-moon','obs-asc','obs-mc','obs-cusps','obs-result-time','obs-timeline-time','obs-location',...planetIds.map(id=>'obs-'+id.toLowerCase())];
  function fail(error) {
    clearPlanetList();
    pause();play.disabled=true;
    result=null;
    [slider,previous,forward].forEach(control=>{control.disabled=true;});
    el('obs-sky-plot').textContent='天空無法更新，請檢查觀測條件。';
    delete el('obs-sky-plot').dataset.timestampUtc;
    el('obs-wheel').textContent='星盤無法更新，請檢查觀測條件。';
    delete el('obs-wheel').dataset.timestampUtc;
    outputs.forEach(id=>{el(id).textContent='—';el(id).removeAttribute('title');delete el(id).dataset.timestampUtc;});
    status.textContent=' 無法更新：'+(error.message.includes('夏令時間重複')?'此當地時間因夏令時間重複，請選擇其他時間，或以時間軸從明確時刻步進。':error.message);
    input.setAttribute('aria-invalid','true');
  }
  if(!core || !globalThis.Astronomy || !globalThis.ObservatoryChart || !globalThis.ObservatorySky || !globalThis.ObservatoryAllSky || !globalThis.ObservatorySkyRenderer || !globalThis.ObservatoryAspects) { fail(Error('計算或繪圖程式未載入，請重新整理。')); return; }
  el('obs-show-aspects').checked=false;
  el('obs-show-aspects').addEventListener('change',()=>{
    if(!result) return;
    const wheel=ObservatoryChart.build(result,{aspects:ObservatoryAspects.calculate(result),showAspects:el('obs-show-aspects').checked});
    clearPlanetList();el('obs-wheel').replaceChildren(wheel);clearPlanetList=wheel.bindPlanetList();
  });
  skyMode.value='south';skyMode.disabled=false;
  skyMode.addEventListener('change',()=>{
    if(!result) return;
    el('obs-sky-plot').replaceChildren(ObservatorySkyRenderer.build(result,skyMode.value));
  });
  function render(next) {
    const aspects=ObservatoryAspects.calculate(next);
    const wheel=ObservatoryChart.build(next,{aspects,showAspects:el('obs-show-aspects').checked});
    const sky=ObservatorySkyRenderer.build(next,skyMode.value);
    const stamp=core.localTime(next.timestampUTC,next.timeZone).replace('T',' ');
    const instant=new Date(next.timestampUTC).toISOString();
    ['Sun','Moon','ASC','MC'].forEach((key,i)=>{
      const target=el(['obs-sun','obs-moon','obs-asc','obs-mc'][i]);
      target.textContent=core.zodiac(next[key]);
      target.title=`黃經 ${next[key].toFixed(6)}°`;
    });
    planetIds.forEach(id=>{
      const planet=next.planets[id],target=el('obs-'+id.toLowerCase());
      target.textContent=planet.zodiac+(planet.retrograde?' R':'');
      target.title=`黃經 ${planet.eclipticLongitude.toFixed(6)}°；${planet.retrograde?'逆行':'順行'}`;
    });
    const fragment=document.createDocumentFragment();
    next.cusps.forEach((value,i)=>{
      fragment.append(document.createTextNode(`${i+1} 宮：${core.zodiac(value)}`));
      if(i<11) fragment.append(document.createElement('br'));
    });
    el('obs-cusps').replaceChildren(fragment);
    el('obs-result-time').textContent=`觀測時間 ${stamp} · ${next.timeZone} · ${next.location.name}`;
    el('obs-timeline-time').textContent=stamp;
    el('obs-location').textContent=`${next.location.name}｜緯度 ${next.location.latitude}°、經度 ${next.location.longitude}°（東正西負）｜海拔 0 m`;
    outputs.forEach(id=>{el(id).dataset.timestampUtc=instant;});
    el('obs-wheel').replaceChildren(wheel);
    clearPlanetList();clearPlanetList=wheel.bindPlanetList();
    el('obs-wheel').dataset.timestampUtc=instant;
    el('obs-sky-plot').replaceChildren(sky);
    el('obs-sky-plot').dataset.timestampUtc=instant;
    status.textContent='';
    input.removeAttribute('aria-invalid');
    result=next;
  }
  function update(timestampUTC,keepWindow=false) {
    try {
      zone.value=core.cities[city.value].timeZone;
      // Manual wall-time input must be unique; timeline/now provide an explicit UTC instant.
      const instant=timestampUTC??core.parseLocal(input.value,zone.value);
      const next=core.snapshot(instant,city.value,zone.value);
      render(next);
      input.value=core.localTime(next.timestampUTC,zone.value);
      // UTC elapsed hours remain unambiguous across DST gaps and repeated hours.
      if(!keepWindow) timelineAnchor=next.timestampUTC;
      slider.min=String(Math.max(-24,Math.ceil((minTime-timelineAnchor)/hour)));
      slider.max=String(Math.min(24,Math.floor((maxTime-timelineAnchor)/hour)));
      slider.value=String((next.timestampUTC-timelineAnchor)/hour);
      slider.title=`${core.localTime(timelineAnchor+Number(slider.min)*hour,zone.value).replace('T',' ')} ～ ${core.localTime(timelineAnchor+Number(slider.max)*hour,zone.value).replace('T',' ')}（${zone.value}；每格實際經過 1 小時）`;
      slider.setAttribute('aria-valuetext',`${input.value.replace('T',' ')} ${zone.value}`);
      slider.disabled=false;
      previous.disabled=next.timestampUTC-hour<minTime;
      forward.disabled=next.timestampUTC+hour>maxTime;
      play.disabled=forward.disabled;
      if(play.disabled) pause();
    }
    catch(error) { fail(error); }
  }
  play.addEventListener('click',()=>{
    if(playback!==null) {pause();return;}
    if(!result||play.disabled) return;
    play.textContent='Ⅱ';play.setAttribute('aria-label','暫停');play.setAttribute('aria-pressed','true');
    playback=setInterval(()=>{
      if(!result||result.timestampUTC+hour>maxTime) {pause();return;}
      update(result.timestampUTC+hour);
    },1000);
  });
  previous.addEventListener('click',()=>{pause();if(result&&!previous.disabled) update(result.timestampUTC-hour);});
  forward.addEventListener('click',()=>{pause();if(result&&!forward.disabled) update(result.timestampUTC+hour);});
  slider.addEventListener('input',()=>{
    pause();
    const offset=Number(slider.value);
    if(result&&!slider.disabled&&Number.isInteger(offset)&&offset>=Number(slider.min)&&offset<=Number(slider.max)) update(timelineAnchor+offset*hour,true);
  });
  [input,city,zone,button].forEach(control=>{control.disabled=false;});
  zone.value=core.cities[city.value].timeZone;
  input.value=core.localTime(Math.floor(Date.now()/60000)*60000,zone.value);
  input.addEventListener('input',pause);
  input.addEventListener('change',()=>{pause();update();});
  button.addEventListener('click',()=>{pause();update(Math.floor(Date.now()/60000)*60000);});
  city.addEventListener('change',()=>{
    pause();
    update();
  });
  update(Math.floor(Date.now()/60000)*60000);
}());
