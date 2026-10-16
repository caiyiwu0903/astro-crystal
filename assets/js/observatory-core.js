/* C2-A: C0.5 calculation body reused unchanged except parameterized inputs.
 * Independent accuracy verification remains limited to the Taipei fixture.
 * Astronomy Engine 2.1.19 keeps its embedded MIT notice in vendor/.
 */
(function () {
'use strict';
function calculate({timestampUTC, latitude, longitude}) {
  if (!Number.isFinite(timestampUTC) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>60 || Math.abs(longitude)>180) throw Error('時間或座標無效；目前緯度限於南北緯 60 度內。');
  const year = new Date(timestampUTC).getUTCFullYear();
  if (year<2000 || year>2050) throw Error('目前日期範圍為 2000–2050 年。');
  const A = Astronomy, r = Math.PI / 180;
  const t = new Date(timestampUTC);
  const norm = x => ((x % 360) + 360) % 360;
  const theta = norm(A.SiderealTime(t) * 15 + longitude);
  const rotation = A.Rotation_ECT_EQD(t);
  function equatorial(lon) {
    const v = A.RotateVector(rotation, new A.Vector(Math.cos(lon*r), Math.sin(lon*r), 0, A.MakeTime(t)));
    return {ra: norm(Math.atan2(v.y, v.x)/r), dec: Math.atan2(v.z, Math.hypot(v.x,v.y))/r};
  }
  const epsilon = equatorial(90).dec * r;
  const mc = norm(Math.atan2(Math.sin(theta*r)/Math.cos(epsilon), Math.cos(theta*r))/r);
  // Solve the ecliptic point's own semi-arc, not equal longitude quadrants.
  // East upper quadrant: RA-LST = SDA/3, 2*SDA/3, SDA.
  // East lower quadrant: RA-LST = SDA + SNA/3, SDA + 2*SNA/3.
  function residual(offset, portion, below) {
    const q = equatorial(mc + offset);
    const c = -Math.tan(latitude*r)*Math.tan(q.dec*r);
    if (Math.abs(c) >= 1) throw Error('Circumpolar point: outside this spike');
    const sda = Math.acos(c)/r;
    let arc = norm(q.ra-theta);
    if (arc > 270) arc -= 360;
    return arc - (below ? sda + (180-sda)*portion : sda*portion);
  }
  function root(portion, below=false) {
    let lo=0, hi=180;
    if (!(residual(lo,portion,below)<0 && residual(hi,portion,below)>0)) throw Error('Unbracketed cusp');
    for(let i=0;i<60;i++) {
      const mid=(lo+hi)/2;
      if(residual(mid,portion,below)>0) hi=mid; else lo=mid;
    }
    return norm(mc+(lo+hi)/2);
  }
  const asc=root(1), cusps=Array(12);
  cusps[0]=asc; cusps[1]=root(1/3,true); cusps[2]=root(2/3,true);
  cusps[3]=norm(mc+180); cusps[9]=mc;
  cusps[10]=root(1/3); cusps[11]=root(2/3);
  for(const index of [0,1,2,9,10,11]) cusps[(index+6)%12]=norm(cusps[index]+180);
  return {
    Sun:A.Ecliptic(A.GeoVector(A.Body.Sun,t,true)).elon,
    Moon:A.Ecliptic(A.GeoVector(A.Body.Moon,t,true)).elon,
    ASC:asc, MC:mc, cusps,
    siderealDegrees:theta,
    deltaTSeconds:(A.MakeTime(t).tt-A.MakeTime(t).ut)*86400
  };
}

// C3-A1: only coordinate conversion using the pinned engine; no rendering.
// Azimuth clockwise from north: N=0, E=90, S=180, W=270 degrees.
// Altitude is the center's unrefracted angle above the mathematical horizon:
// >0 above, <0 below, =0 on horizon (not a terrain/limb rise-set prediction).
const planetIds=Object.freeze(['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']);
function calculatePlanets(timestampUTC,sky) {
  const A=Astronomy, planets={};
  // Apparent geocentric tropical longitude in the true ecliptic/equinox of date.
  // Signed circular central difference over +/-1 hour; speed is degrees/day.
  // Retrograde means negative longitude speed, not motion across the sky.
  const longitude=(id,t)=>A.Ecliptic(A.GeoVector(A.Body[id],new Date(t),true)).elon;
  for(const id of planetIds) {
    const eclipticLongitude=longitude(id,timestampUTC);
    const delta=((longitude(id,timestampUTC+3600000)-longitude(id,timestampUTC-3600000)+540)%360)-180;
    const longitudeSpeedDegreesPerDay=delta*12;
    if(!Number.isFinite(eclipticLongitude)||!Number.isFinite(longitudeSpeedDegreesPerDay)) throw Error('行星座標無效。');
    planets[id]=Object.freeze({eclipticLongitude,signIndex:Math.floor(eclipticLongitude/30),
      degreesInSign:eclipticLongitude%30,zodiac:zodiac(eclipticLongitude),
      longitudeSpeedDegreesPerDay,retrograde:longitudeSpeedDegreesPerDay<0,
      sky:sky.bodies[id]});
  }
  return Object.freeze(planets);
}
function calculateSky(timestampUTC, location) {
  const A=Astronomy, time=A.MakeTime(new Date(timestampUTC));
  const observer=new A.Observer(location.latitude,location.longitude,0);
  function horizontal(eq) {
    // Horizon requires true equator/equinox of date; RA is hours, Dec degrees.
    const h=A.Horizon(time,observer,eq.ra,eq.dec,null);
    if(!Number.isFinite(h.azimuth)||!Number.isFinite(h.altitude)||h.azimuth<0||h.azimuth>=360||Math.abs(h.altitude)>90) throw Error('天空座標無效。');
    return {azimuth:h.azimuth,altitude:h.altitude,horizonPosition:h.altitude>0?'above':h.altitude<0?'below':'on'};
  }
  const bodies={};
  for(const id of ['Sun','Moon',...planetIds]) {
    // Topocentric apparent direction: includes parallax, light-time and aberration.
    const eq=A.Equator(A.Body[id],time,observer,true,true);
    bodies[id]=Object.freeze({...horizontal(eq),rightAscensionHours:eq.ra,declinationDegrees:eq.dec});
  }
  const rotation=A.Rotation_ECT_EQD(time), ecliptic=[];
  // True ecliptic of date, latitude zero, treated as directions at infinity.
  // Do not apply finite-distance lunar/solar parallax to this reference great circle.
  // 0..360 inclusive, every 5 degrees; retain below-horizon samples and closure.
  for(let longitude=0;longitude<=360;longitude+=5) {
    const angle=(longitude%360)*Math.PI/180;
    const vector=A.RotateVector(rotation,new A.Vector(Math.cos(angle),Math.sin(angle),0,time));
    const eq=A.EquatorFromVector(vector);
    ecliptic.push(Object.freeze({eclipticLongitude:longitude,...horizontal(eq)}));
  }
  return Object.freeze({timestampUTC,location,elevationMeters:0,
    azimuthConvention:'north=0,east=90,south=180,west=270; clockwise',
    altitudeConvention:'unrefracted center; above>0,below<0,on=0; mathematical horizon',
    bodyFrame:'topocentric apparent; true equator/equinox of date; RA hours, Dec degrees',
    eclipticFrame:'true ecliptic of date; latitude=0; directions at infinity',
    refraction:false,timeModel:'UTC approximates UT1; Astronomy Engine default delta T',
    eclipticStepDegrees:5,bodies:Object.freeze(bodies),ecliptic:Object.freeze(ecliptic)});
}

const cities = Object.freeze({
  taipei: Object.freeze({name:'台北',latitude:25.0330,longitude:121.5654,timeZone:'Asia/Taipei'}),
  tokyo: Object.freeze({name:'東京',latitude:35.6762,longitude:139.6503,timeZone:'Asia/Tokyo'}),
  london: Object.freeze({name:'倫敦',latitude:51.5074,longitude:-0.1278,timeZone:'Europe/London'}),
  newyork: Object.freeze({name:'紐約',latitude:40.7128,longitude:-74.0060,timeZone:'America/New_York'})
});
function localTime(timestampUTC,timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(timestampUTC);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// Enumerate offsets surrounding the wall time, then require exactly one round trip.
// Supported city zones only; gaps and overlaps are rejected rather than guessed.
function parseLocal(value,timeZone) {
  if(!Object.values(cities).some(c=>c.timeZone===timeZone)) throw Error('不支援的時區。');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw Error('請填寫完整日期與時間。');
  const [y,m,d,h,n]=value.match(/\d+/g).map(Number);
  const wall=Date.UTC(y,m-1,d,h,n);
  if(new Date(wall).toISOString().slice(0,16)!==value || y<2000 || y>2050) throw Error('請輸入 2000–2050 年內的有效日期時間。');
  const offsets=new Set();
  for(let hours=-36;hours<=36;hours+=6) {
    const sample=wall+hours*3600000;
    offsets.add(Date.parse(localTime(sample,timeZone)+'Z')-sample);
  }
  const candidates=[...offsets].map(offset=>wall-offset).filter(t=>localTime(t,timeZone)===value);
  if(candidates.length!==1) throw Error(candidates.length?'此時間因夏令時間重複，請切換至台北或東京時區指定同一時刻。':'此當地時間不存在，請選擇其他時間。');
  return candidates[0];
}
function snapshot(timestampUTC,cityId,timeZone) {
  const location=cities[cityId];
  if(!location || !Object.values(cities).some(c=>c.timeZone===timeZone)) throw Error('地點或時區無效。');
  const values=calculate({timestampUTC,...location});
  if(![values.Sun,values.Moon,values.ASC,values.MC,...values.cusps].every(Number.isFinite)) throw Error('計算未產生有效結果。');
  const sky=calculateSky(timestampUTC,location);
  const planets=calculatePlanets(timestampUTC,sky);
  return Object.freeze({timestampUTC,timeZone,location,houseSystem:'Placidus',...values,cusps:Object.freeze(values.cusps),sky,planets});
}
function zodiac(degrees) {
  const signs=['牡羊','金牛','雙子','巨蟹','獅子','處女','天秤','天蠍','射手','摩羯','水瓶','雙魚'];
  const total=((Math.round(degrees*60)%21600)+21600)%21600;
  return `${signs[Math.floor(total/1800)]} ${Math.floor(total%1800/60)}°${String(total%60).padStart(2,'0')}′`;
}
globalThis.ObservatoryCore=Object.freeze({calculate,snapshot,cities,localTime,parseLocal,zodiac});
}());
