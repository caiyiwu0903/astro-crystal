/* Local trend only: no prediction that an aspect will eventually perfect.
 * Reuses snapshots at t +/- sampleSeconds. Units: degrees, degrees/day, UTC ms.
 * Opposite one-sided trends (crossing perfection/station) remain undetermined.
 */
(function () {
  'use strict';
  const defaults=Object.freeze({sampleSeconds:60,exactDegrees:0.0001,minRateDegreesPerDay:0.00001});
  const signed=x=>((x%360+540)%360)-180;
  const longitude=(s,id)=>id==='Sun'||id==='Moon'?s?.[id]:s?.planets?.[id]?.eclipticLongitude;
  function calculate(snapshot,aspects,options={}) {
    const {sampleSeconds,exactDegrees,minRateDegreesPerDay}=Object.assign({},defaults,options);
    if(!Number.isFinite(sampleSeconds)||sampleSeconds<=0||sampleSeconds>3600||
      !Number.isFinite(exactDegrees)||exactDegrees<0||exactDegrees>1||
      !Number.isFinite(minRateDegreesPerDay)||minRateDegreesPerDay<0) throw new RangeError('Invalid dynamics thresholds');
    const dt=sampleSeconds*1000,days=sampleSeconds/86400;
    let before,after;
    try {
      const core=globalThis.ObservatoryCore;
      const city=Object.keys(core.cities).find(id=>core.cities[id].latitude===snapshot.location.latitude&&core.cities[id].longitude===snapshot.location.longitude);
      const sample=options.sample||((t)=>core.snapshot(t,city,snapshot.timeZone));
      before=sample(snapshot.timestampUTC-dt);after=sample(snapshot.timestampUTC+dt);
      for(const [s,t] of [[before,snapshot.timestampUTC-dt],[after,snapshot.timestampUTC+dt]]) {
        if(s.timestampUTC!==t||s.location.latitude!==snapshot.location.latitude||s.location.longitude!==snapshot.location.longitude) throw Error('Mismatched sample');
      }
    } catch { before=after=null; }
    return Object.freeze(aspects.map(a=>{
      let dynamics='undetermined',deviationRateDegreesPerDay=null;
      try {
        if(!before||!after) throw Error('Unavailable sample');
        const values=[before,snapshot,after].map(s=>[longitude(s,a.body1),longitude(s,a.body2)]);
        if(!values.flat().every(Number.isFinite)||!Number.isFinite(a.angle)||!Number.isFinite(a.deviation)) throw Error('Invalid longitude');
        // Reject implausible jumps, including malformed or discontinuous samples.
        for(let i=0;i<2;i++) for(let body=0;body<2;body++) if(Math.abs(signed(values[i+1][body]-values[i][body]))>30*days) throw Error('Unreliable sample');
        const deviations=values.map(([x,y])=>Math.abs(Math.abs(signed(x-y))-a.angle));
        if(Math.abs(deviations[1]-a.deviation)>1e-7) throw Error('Stale aspect result');
        const left=(deviations[1]-deviations[0])/days,right=(deviations[2]-deviations[1])/days;
        const target=signed(values[1][1]-values[1][0])<0?-a.angle:a.angle;
        const residuals=values.map(([x,y])=>signed(y-x-target));
        const crossesExact=residuals[0]*residuals[2]<0;
        if(deviations[1]<=exactDegrees) dynamics='exact';
        else if(!crossesExact&&left < -minRateDegreesPerDay&&right < -minRateDegreesPerDay) dynamics='applying';
        else if(!crossesExact&&left > minRateDegreesPerDay&&right > minRateDegreesPerDay) dynamics='separating';
        deviationRateDegreesPerDay=(left+right)/2;
      } catch { /* Keep undetermined rather than guessing from unreliable samples. */ }
      return Object.freeze({...a,dynamics,deviationRateDegreesPerDay});
    }));
  }
  globalThis.ObservatoryAspectDynamics=Object.freeze({calculate,defaults});
}());
