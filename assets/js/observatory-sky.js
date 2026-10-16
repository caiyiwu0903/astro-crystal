/* South-facing azimuth/altitude chart, not a perspective image.
 * Uses only snapshot.sky. Local great-circle subdivision, no ephemeris calculations.
 */
(function () {
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const visible=p=>Number.isFinite(p.azimuth)&&Number.isFinite(p.altitude)&&p.azimuth>=90&&p.azimuth<=270&&p.altitude>=0&&p.altitude<=90;
  const project=p=>({x:45+(p.azimuth-90)*4.5,y:300-p.altitude*3});
  function node(tag,attrs={},text) {
    const n=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));
    if(text!==undefined) n.textContent=text;
    return n;
  }
  // Stable ID order and retained offsets avoid reordering labels each frame.
  const labelOffsets=new Map();
  const labelCandidates=[];
  for(let y=-10;y<=10;y++) for(let x=-10;x<=10;x++) labelCandidates.push({x:x*20,y:y*22});
  labelCandidates.sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y));
  function placeLabel(id,origin,width,occupied,bounds) {
    const previous=labelOffsets.get(id);
    for(const offset of [...(previous?[previous]:[]),...labelCandidates]) {
      const p={x:origin.x+offset.x,y:origin.y+offset.y};
      const box={left:p.x-width/2,right:p.x+width/2,top:p.y-11,bottom:p.y+11};
      if(box.left<bounds[0]||box.right>bounds[1]||box.top<bounds[2]||box.bottom>bounds[3]) continue;
      if(occupied.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top)) continue;
      occupied.push(box);labelOffsets.set(id,offset);return p;
    }
    return origin;
  }
  function build(snapshot) {
    const sky=snapshot.sky;
    const svg=node('svg',{viewBox:'0 0 900 380',role:'img','aria-labelledby':'obs-sky-svg-title obs-sky-svg-desc','data-timestamp-utc':new Date(snapshot.timestampUTC).toISOString()});
    svg.append(node('title',{id:'obs-sky-svg-title'},'南向天空：十大星體與黃道'));
    svg.append(node('desc',{id:'obs-sky-svg-desc'},'方位角90至270度，東在左、西在右；高度0至90度，地平線在底部。不含折射。黃道由5度取樣局部細分並裁切；北側及地平線下不繪製。天頂方位退化，無法解析的跳轉處斷線。地景為裝飾。'));
    const defs=node('defs'),clip=node('clipPath',{id:'obs-sky-clip'});
    clip.append(node('rect',{x:45,y:30,width:810,height:270}));defs.append(clip);svg.append(defs);
    for(const altitude of [0,30,60,90]) {
      const y=project({azimuth:90,altitude}).y;
      svg.append(node('line',{x1:45,y1:y,x2:855,y2:y,class:altitude===0?'obs-sky-svg__horizon':'obs-sky-svg__grid'}));
      svg.append(node('text',{x:35,y:y+5,'text-anchor':'end',class:'obs-sky-svg__label'},`${altitude}°`));
    }
    for(const [azimuth,text] of [[90,'東'],[135,'東南'],[180,'南'],[225,'西南'],[270,'西']]) {
      const x=project({azimuth,altitude:0}).x;
      svg.append(node('line',{x1:x,y1:30,x2:x,y2:300,class:'obs-sky-svg__grid'}));
      svg.append(node('text',{x,y:324,'text-anchor':'middle',class:'obs-sky-svg__label'},text));
    }
    const plot=node('g',{'clip-path':'url(#obs-sky-clip)'});
    // The unrefracted ecliptic is a great circle. Normalize the sum of adjacent
    // unit directions to obtain its exact spherical midpoint, not an az/alt average.
    function midpoint(a,b) {
      const rad=Math.PI/180;
      const vector=p=>{const az=p.azimuth*rad,h=p.altitude*rad;return [Math.cos(h)*Math.cos(az),Math.cos(h)*Math.sin(az),Math.sin(h)];};
      const u=vector(a),v=vector(b),w=u.map((x,i)=>x+v[i]);
      return {azimuth:(Math.atan2(w[1],w[0])/rad+360)%360,altitude:Math.atan2(w[2],Math.hypot(w[0],w[1]))/rad};
    }
    function segment(a,b,index,depth=0) {
      if(![a.azimuth,a.altitude,b.azimuth,b.altitude].every(Number.isFinite)) return;
      const m=midpoint(a,b),jump=Math.abs(a.azimuth-b.azimuth)>90;
      const bend=Math.max(Math.abs(m.azimuth-(a.azimuth+b.azimuth)/2)*4.5,Math.abs(m.altitude-(a.altitude+b.altitude)/2)*3);
      const boundary=visible(a)!==visible(b)||visible(a)!==visible(m);
      // Subpixel curvature tolerance; boundary refinement keeps clipping on the arc.
      if(depth<16&&(jump||bend>0.25||boundary)) {
        segment(a,m,index,depth+1);segment(m,b,index,depth+1);return;
      }
      if(jump) return; // Retain protection at a true zenith singularity / azimuth wrap.
      // Clip each resolved short segment to the south-facing rectangle.
      let lo=0,hi=1;
      for(const [start,end,min,max] of [[a.azimuth,b.azimuth,90,270],[a.altitude,b.altitude,0,90]]) {
        const delta=end-start;
        if(delta===0) {if(start<min||start>max) return;}
        else {const t1=(min-start)/delta,t2=(max-start)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
      }
      if(lo>=hi) return;
      const at=t=>project({azimuth:Math.max(90,Math.min(270,a.azimuth+(b.azimuth-a.azimuth)*t)),altitude:Math.max(0,Math.min(90,a.altitude+(b.altitude-a.altitude)*t))});
      const p=at(lo),q=at(hi);
      plot.append(node('path',{d:`M ${p.x} ${p.y} L ${q.x} ${q.y}`,class:'obs-sky-svg__ecliptic','data-segment':index}));
    }
    for(let i=1;i<sky.ecliptic.length;i++) {
      segment(sky.ecliptic[i-1],sky.ecliptic[i],i-1);
    }
    const descriptions=[];
    const bodies=[['Sun','太陽'],['Moon','月亮'],
      ['Mercury','水星','☿','#d7e3ee'],['Venus','金星','♀','#fff3cf'],
      ['Mars','火星','♂','#ffb4a2'],['Jupiter','木星','♃','#ffd39a'],
      ['Saturn','土星','♄','#e6d5ad'],['Uranus','天王星','♅','#a4eceb'],
      ['Neptune','海王星','♆','#a8caff'],['Pluto','冥王星','♇','#dcc4f0']];
    const occupied=bodies.filter(([id])=>visible(sky.bodies[id])).map(([id])=>{const p=project(sky.bodies[id]);return {left:p.x-9,right:p.x+9,top:p.y-9,bottom:p.y+9};});
    for(const [id,name,symbol,color] of bodies) {
      const p=sky.bodies[id],state=p.altitude<0?'地平線下':visible(p)?'可見視野':'南向視野外';
      if(!symbol) descriptions.push(`${name}：${state}（方位 ${p.azimuth.toFixed(1)}°／高度 ${p.altitude.toFixed(1)}°）`);
      if(!visible(p)) continue;
      const xy=project(p),g=node('g',{'data-body':id,'data-azimuth':p.azimuth,'data-altitude':p.altitude});
      g.append(node('title',{},`${name}：方位 ${p.azimuth.toFixed(4)}°，高度 ${p.altitude.toFixed(4)}°`));
      // A neutral Moon disk avoids implying an uncalculated lunar phase.
      g.append(node('circle',{cx:xy.x,cy:xy.y,r:symbol?4:id==='Sun'?7:6,
        ...(symbol?{fill:color,stroke:'#fff'}:{class:`obs-sky-svg__${id.toLowerCase()}`})}));
      const label=placeLabel(id,{x:xy.x,y:xy.y-22},symbol?24:44,occupied,[47,853,32,298]);
      g.append(node('line',{x1:xy.x,y1:xy.y,x2:label.x,y2:label.y,stroke:'#e6f2fb','stroke-width':0.8,'stroke-opacity':0.65}));
      g.append(node('text',{...label,'text-anchor':'middle','dominant-baseline':'middle',class:'obs-sky-svg__body-label'},symbol||name));
      plot.append(g);
    }
    svg.append(plot);
    descriptions.forEach((text,i)=>svg.append(node('text',{x:450,y:350+i*22,'text-anchor':'middle',class:'obs-sky-svg__status'},text)));
    return svg;
  }
  globalThis.ObservatorySky=Object.freeze({build});
}());
