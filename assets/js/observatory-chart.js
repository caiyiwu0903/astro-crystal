/* SVG projection only. All celestial longitudes come from the shared snapshot.
 * ASC is at the left; longitude increases counterclockwise. DSC/IC are antipodes.
 */
(function () {
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const norm=x=>((x%360)+360)%360;
  function node(tag,attrs={},text) {
    const n=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([key,value])=>n.setAttribute(key,String(value)));
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
  function build(result,{aspects=[],showAspects=false}={}) {
    const svg=node('svg',{viewBox:'-240 -240 480 480',role:'img','aria-labelledby':'obs-wheel-title obs-wheel-desc','data-timestamp-utc':new Date(result.timestampUTC).toISOString()});
    svg.append(node('title',{id:'obs-wheel-title'},'此刻星盤：熱帶黃道與 Placidus 宮位'));
    svg.append(node('desc',{id:'obs-wheel-desc'},`${new Date(result.timestampUTC).toISOString()}，${result.location.name}。上升點在左，黃經逆時針增加。星體採不同半徑標記；半徑不代表距離。精確度數亦列於資訊區。`));
    const point=(lon,r)=>{
      const angle=(lon-result.ASC)*Math.PI/180;
      return {x:-r*Math.cos(angle),y:r*Math.sin(angle)};
    };
    function line(lon,r1,r2,kind,extra={}) {
      const a=point(lon,r1),b=point(lon,r2);
      return node('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:kind,...extra});
    }
    function label(lon,r,text,kind) {return node('text',{...point(lon,r),class:kind,'text-anchor':'middle','dominant-baseline':'middle'},text);}
    for(const [r,kind] of [[180,'obs-wheel__outer'],[150,'obs-wheel__inner'],[40,'obs-wheel__center']]) svg.append(node('circle',{cx:0,cy:0,r,class:kind}));
    const aspectInteractive=new Map();
    if(showAspects) {
      const colors={conjunction:'#B99A59',sextile:'#63A68D',square:'#C46C68',trine:'#4E92C2',opposition:'#9577B9'};
      const layer=node('g',{'data-aspect-layer':'true','stroke-width':0.8});
      const longitude=id=>id==='Sun'||id==='Moon'?result[id]:result.planets[id].eclipticLongitude;
      for(const [index,a] of aspects.entries()) {
        const key='aspect:'+index,description=`${a.body1Name} ${a.name} ${a.body2Name}｜Orb ${a.deviation.toFixed(2)}°`;
        const group=node('g',{class:'obs-wheel__aspect',tabindex:0,role:'button','aria-label':description,'aria-pressed':'false'});
        const p=point(longitude(a.body1),48),q=point(longitude(a.body2),48);
        const line=node('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:colors[a.aspect],'data-aspect':a.aspect,'data-body1':a.body1,'data-body2':a.body2});
        line.append(node('title',{},`${a.body1Name} ${a.name} ${a.body2Name}｜Orb ${a.deviation.toFixed(2)}°`));
        group.append(line);
        if(a.aspect==='conjunction'&&Math.hypot(p.x-q.x,p.y-q.y)<4) group.append(node('circle',{cx:p.x,cy:p.y,r:2,fill:'none',stroke:colors[a.aspect]}));
        group.append(node('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'transparent','stroke-width':12,'stroke-linecap':'round','pointer-events':'stroke',class:'obs-wheel__aspect-hit'}));
        if(a.aspect==='conjunction') group.append(node('circle',{cx:p.x,cy:p.y,r:7,fill:'transparent','pointer-events':'all',class:'obs-wheel__aspect-hit'}));
        aspectInteractive.set(key,{group,description,bodies:[a.body1,a.body2]});
        layer.append(group);
      }
      svg.append(layer);
    }
    const signs=['牡羊','金牛','雙子','巨蟹','獅子','處女','天秤','天蠍','射手','摩羯','水瓶','雙魚'];
    for(let i=0;i<12;i++) {
      svg.append(line(i*30,150,180,'obs-wheel__sign-line',{'data-sign':i,'data-longitude':i*30}));
      svg.append(label(i*30+15,166,signs[i],'obs-wheel__sign'));
    }
    for(let lon=0;lon<360;lon+=5) svg.append(line(lon,150,lon%30===0?143:147,'obs-wheel__tick'));
    result.cusps.forEach((lon,i)=>{
      const cusp=line(lon,40,143,'obs-wheel__cusp',{'data-house':i+1,'data-longitude':lon});
      cusp.append(node('title',{},`${i+1} 宮頭：${ObservatoryCore.zodiac(lon)}（${lon.toFixed(6)}°）`));svg.append(cusp);
      const midpoint=norm(lon+norm(result.cusps[(i+1)%12]-lon)/2);
      svg.append(label(midpoint,60,String(i+1),'obs-wheel__house'));
      const text=label(lon,137,ObservatoryCore.zodiac(lon).split(' ')[1],'obs-wheel__degree');
      const p=point(lon,137);let rotation=norm(90-(lon-result.ASC));
      if(rotation>90&&rotation<270) rotation+=180;
      text.setAttribute('transform',`rotate(${rotation} ${p.x} ${p.y})`);
      svg.append(text);
    });
    for(const [name,lon] of [['ASC',result.ASC],['DSC',norm(result.ASC+180)],['MC',result.MC],['IC',norm(result.MC+180)]]) {
      svg.append(line(lon,40,192,'obs-wheel__axis',{'data-axis':name,'data-longitude':lon}));
      const text=label(lon,210,name,'obs-wheel__axis-label');
      text.append(node('title',{},`${name}：${ObservatoryCore.zodiac(lon)}（${lon.toFixed(6)}°）`));svg.append(text);
    }
    const planets=[['Mercury','☿ 水星'],['Venus','♀ 金星'],['Mars','♂ 火星'],['Jupiter','♃ 木星'],['Saturn','♄ 土星'],['Uranus','♅ 天王星'],['Neptune','♆ 海王星'],['Pluto','♇ 冥王星']];
    const bodies=[['Sun',result.Sun,94,'☉ 太陽'],['Moon',result.Moon,116,'☽ 月亮'],
      ...planets.map(([id,label],i)=>[id,result.planets[id].eclipticLongitude,i%2?116:94,label])];
    const occupied=bodies.map(([,lon,r])=>{const p=point(lon,r);return {left:p.x-6,right:p.x+6,top:p.y-6,bottom:p.y+6};});
    // Interaction belongs to this SVG snapshot; replacing it clears stale selection.
    const info=node('text',{x:0,y:234,'text-anchor':'middle',class:'obs-wheel__info',role:'status','aria-live':'polite'},'');
    const interactive=new Map();let selected=null,hovered=null;
    function highlight() {
      const active=selected||hovered;
      const aspect=aspectInteractive.get(active);
      interactive.forEach(({group,description,label,row},id)=>{
        const involved=aspect?aspect.bodies.includes(id):id===active;
        group.setAttribute('class','obs-wheel__body'+(involved?' is-active':'')+(selected?(involved?' is-selected':' is-muted'):(aspect&&!involved?' is-muted':'')));
        label.setAttribute('aria-pressed',String(id===selected));
        if(row) row.setAttribute('aria-pressed',String(id===selected));
        if(id===active) info.textContent=description;
      });
      aspectInteractive.forEach(({group},key)=>{
        group.setAttribute('class','obs-wheel__aspect'+(key===active?' is-active':aspect?' is-muted':''));
        group.setAttribute('aria-pressed',String(key===selected));
      });
      if(aspect) info.textContent=aspect.description;
      if(!active) info.textContent='';
    }
    svg.onclick=()=>{selected=null;hovered=null;highlight();};
    function bindInteraction(target,key) {
      target.onmouseenter=()=>{hovered=key;highlight();};
      target.onmouseleave=()=>{hovered=null;highlight();};
      target.onfocus=target.onmouseenter;target.onblur=target.onmouseleave;
      target.onclick=event=>{event.stopPropagation();selected=selected===key?null:key;hovered=null;highlight();};
      target.onkeydown=event=>{
        if(event.key==='Enter'||event.key===' ') {event.preventDefault();target.onclick(event);}
        if(event.key==='Escape') svg.onclick();
      };
    }
    aspectInteractive.forEach(({group},key)=>bindInteraction(group,key));
    for(const [name,lon,r,text] of bodies) {
      const g=node('g',{'data-body':name,'data-longitude':lon});
      g.append(node('title',{},`${text}：${ObservatoryCore.zodiac(lon)}（${lon.toFixed(6)}°）`));
      g.append(line(lon,r,149,'obs-wheel__body-guide'));
      const marker=point(lon,r);
      g.append(node('circle',{cx:marker.x,cy:marker.y,r:3,class:'obs-wheel__body-dot'}));
      // Exact longitude marker is never displaced; text uses a separate radial lane.
      const symbol=text.split(' ')[0];
      const p=placeLabel(name,point(lon,r-12),24,occupied,[-132,132,-132,132]);
      g.append(node('line',{x1:marker.x,y1:marker.y,x2:p.x,y2:p.y,class:'obs-wheel__body-guide'}));
      const planet=result.planets[name];
      const description=`${text.split(' ')[1]}｜${ObservatoryCore.zodiac(lon)}${planet?(planet.retrograde?'｜逆行':'｜順行'):''}`;
      const label=node('text',{...p,class:'obs-wheel__body-label','text-anchor':'middle','dominant-baseline':'middle',tabindex:0,role:'button','aria-label':description,'aria-pressed':'false'},symbol);
      interactive.set(name,{group:g,description,label});
      bindInteraction(label,name);
      g.append(label);
      svg.append(g);
    }
    svg.append(info);
    svg.bindPlanetList=()=>{
      interactive.forEach((entry,id)=>{
        const row=document.getElementById('obs-'+id.toLowerCase())?.parentElement;
        if(!row) return;
        entry.row=row;
        row.setAttribute('role','button');row.setAttribute('tabindex','0');
        row.setAttribute('aria-label',entry.description);row.setAttribute('aria-pressed','false');
        for(const event of ['onmouseenter','onmouseleave','onfocus','onblur','onclick','onkeydown']) row[event]=entry.label[event];
      });
      return ()=>interactive.forEach(entry=>{
        if(!entry.row) return;
        for(const event of ['onmouseenter','onmouseleave','onfocus','onblur','onclick','onkeydown']) entry.row[event]=null;
        for(const attr of ['role','tabindex','aria-label','aria-pressed']) entry.row.removeAttribute(attr);
        entry.row=null;
      });
    };
    return svg;
  }
  globalThis.ObservatoryChart=Object.freeze({build});
}());
