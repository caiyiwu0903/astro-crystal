/* Shared sky entry point; both modes consume the same calculated snapshot. */
(function () {
  'use strict';
  function node(tag,attrs={},text) {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));
    if(text!==undefined) n.textContent=text;
    return n;
  }
  // Stable ID order and retained offsets avoid reordering labels each frame.
  const labelOffsets=new Map();
  const labelCandidates=[];
  for(let y=-10;y<=10;y++) for(let x=-10;x<=10;x++) labelCandidates.push({x:x*20,y:y*22});
  labelCandidates.sort((a,b)=>(a.x*a.x+a.y*a.y)-(b.x*b.x+b.y*b.y));
  function placeLabel(id,origin,width,occupied) {
    const previous=labelOffsets.get(id);
    for(const offset of [...(previous?[previous]:[]),...labelCandidates]) {
      const p={x:origin.x+offset.x,y:origin.y+offset.y};
      const box={left:p.x-width/2,right:p.x+width/2,top:p.y-11,bottom:p.y+11};
      if([box.left,box.right].some(x=>[box.top,box.bottom].some(y=>Math.hypot(x-450,y-190)>148))) continue;
      if(occupied.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top)) continue;
      occupied.push(box);labelOffsets.set(id,offset);return p;
    }
    return origin;
  }
  function build(snapshot,mode='south') {
    if(mode==='south') return ObservatorySky.build(snapshot);
    if(mode!=='allsky') throw Error('不支援的天空模式。');
    const svg=node('svg',{viewBox:'0 0 900 380',role:'img','aria-labelledby':'obs-allsky-title obs-allsky-desc','data-timestamp-utc':new Date(snapshot.timestampUTC).toISOString()});
    svg.append(node('title',{id:'obs-allsky-title'},'360°全天空：十大星體與黃道'));
    svg.append(node('desc',{id:'obs-allsky-desc'},`${snapshot.location.name}，${new Date(snapshot.timestampUTC).toISOString()}。天頂在中心，北上、東左、西右、南下；僅顯示地平線上的星體與黃道，無折射。`));
    const bounds={cx:450,cy:190,radius:150};
    const project=p=>ObservatoryAllSky.project(p,bounds);
    // The unrefracted ecliptic is a great circle: spherical midpoints preserve
    // its geometry across azimuth 0/360 without recalculating ephemerides.
    const vector=p=>{const a=p.azimuth*Math.PI/180,h=p.altitude*Math.PI/180;return [Math.cos(h)*Math.cos(a),Math.cos(h)*Math.sin(a),Math.sin(h)];};
    const direction=v=>({azimuth:(Math.atan2(v[1],v[0])*180/Math.PI+360)%360,altitude:Math.atan2(v[2],Math.hypot(v[0],v[1]))*180/Math.PI});
    function arc(a,b,index,depth=0) {
      if(![a.azimuth,a.altitude,b.azimuth,b.altitude].every(Number.isFinite)) return;
      if(Math.abs(a.altitude)>90||Math.abs(b.altitude)>90) return;
      if(a.altitude<0&&b.altitude<0) return;
      const u=vector(a),v=vector(b);
      if((a.altitude<0)!==(b.altitude<0)) {
        // Exact horizon intersection on the short great-circle arc.
        const t=-u[2]/(v[2]-u[2]),edge=direction(u.map((x,i)=>x+(v[i]-x)*t));
        edge.altitude=0;
        if(a.altitude<0) a=edge;else b=edge;
      }
      const ua=vector(a),vb=vector(b),m=direction(ua.map((x,i)=>x+vb[i]));
      const p=project(a),q=project(b),mid=project(m);
      if(!p||!q||!mid) return;
      if(depth<12&&Math.hypot(mid.x-(p.x+q.x)/2,mid.y-(p.y+q.y)/2)>0.2) {
        arc(a,m,index,depth+1);arc(m,b,index,depth+1);return;
      }
      svg.append(node('path',{d:`M ${p.x} ${p.y} L ${q.x} ${q.y}`,class:'obs-sky-svg__ecliptic','data-segment':index}));
    }
    const samples=snapshot.sky.ecliptic;
    for(let i=1;i<samples.length;i++) arc(samples[i-1],samples[i],i-1);
    svg.append(node('circle',{cx:450,cy:190,r:150,fill:'none',class:'obs-sky-svg__horizon'}));
    for(const [azimuth,text] of [[0,'北'],[90,'東'],[180,'南'],[270,'西']]) {
      const p=ObservatoryAllSky.project({azimuth,altitude:0},{cx:450,cy:190,radius:170});
      svg.append(node('text',{...p,'text-anchor':'middle','dominant-baseline':'middle',class:'obs-sky-svg__label'},text));
    }
    const bodies=[['Sun','太陽','☉'],['Moon','月亮','☽'],
      ['Mercury','水星','☿','#d7e3ee'],['Venus','金星','♀','#fff3cf'],
      ['Mars','火星','♂','#ffb4a2'],['Jupiter','木星','♃','#ffd39a'],
      ['Saturn','土星','♄','#e6d5ad'],['Uranus','天王星','♅','#a4eceb'],
      ['Neptune','海王星','♆','#a8caff'],['Pluto','冥王星','♇','#dcc4f0']];
    const occupied=bodies.map(([id])=>project(snapshot.sky.bodies[id])).filter(Boolean).map(p=>({left:p.x-9,right:p.x+9,top:p.y-9,bottom:p.y+9}));
    for(const [id,name,symbol,color] of bodies) {
      const body=snapshot.sky.bodies[id],p=project(body);
      if(!p) continue;
      const g=node('g',{'data-body':id,'data-azimuth':body.azimuth,'data-altitude':body.altitude});
      g.append(node('title',{},`${name}：方位 ${body.azimuth.toFixed(4)}°，高度 ${body.altitude.toFixed(4)}°`));
      g.append(node('circle',{cx:p.x,cy:p.y,r:color?4:id==='Sun'?7:6,...(color?{fill:color,stroke:'#fff'}:{class:`obs-sky-svg__${id.toLowerCase()}`})}));
      const label=placeLabel(id,{x:p.x,y:p.y-22},24,occupied);
      g.append(node('line',{x1:p.x,y1:p.y,x2:label.x,y2:label.y,stroke:'#e6f2fb','stroke-width':0.8,'stroke-opacity':0.65}));
      g.append(node('text',{...label,class:'obs-sky-svg__body-label','text-anchor':'middle','dominant-baseline':'middle'},symbol));
      svg.append(g);
    }
    return svg;
  }
  globalThis.ObservatorySkyRenderer=Object.freeze({build});
}());
