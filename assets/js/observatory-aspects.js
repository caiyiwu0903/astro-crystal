/* Independent major-aspect calculations from an existing snapshot.
 * Custom orbs: sextile 6 degrees; other major aspects 10 with Sun/Moon, else 7.
 * No ephemeris calls, input mutation, or applying/separating classification.
 */
(function () {
  'use strict';
  const defaults=Object.freeze({luminaryOrb:10,planetOrb:7,sextileOrb:6});
  const bodies=Object.freeze([
    ['Sun','太陽'],['Moon','月亮'],['Mercury','水星'],['Venus','金星'],
    ['Mars','火星'],['Jupiter','木星'],['Saturn','土星'],['Uranus','天王星'],
    ['Neptune','海王星'],['Pluto','冥王星']
  ].map(Object.freeze));
  const aspects=Object.freeze([
    ['conjunction','合相',0],['sextile','六合',60],['square','四分',90],
    ['trine','三分',120],['opposition','對分',180]
  ].map(Object.freeze));
  const normalize=x=>((x%360)+360)%360;
  function calculate(snapshot,{orb}={}) {
    if(orb!==undefined&&(!Number.isFinite(orb)||orb<0||orb>180)) throw new RangeError('Orb must be between 0 and 180 degrees');
    const positions=bodies.map(([id])=>{
      const longitude=id==='Sun'||id==='Moon'?snapshot?.[id]:snapshot?.planets?.[id]?.eclipticLongitude;
      if(!Number.isFinite(longitude)) throw new TypeError(`Missing or invalid longitude: ${id}`);
      return normalize(longitude);
    });
    const result=[];
    for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) {
      const distance=Math.abs(positions[i]-positions[j]);
      const separation=Math.min(distance,360-distance);
      // At most one result per pair, even if a caller chooses overlapping orbs.
      // Closest target wins; equal deviations use the aspect order above.
      let best=null;
      for(const [aspect,name,angle] of aspects) {
        const deviation=Math.abs(separation-angle);
        const allowedOrb=orb??(aspect==='sextile'?defaults.sextileOrb:(i<2||j<2)?defaults.luminaryOrb:defaults.planetOrb);
        if(deviation<=allowedOrb&&(!best||deviation<best.deviation)) best={aspect,name,angle,deviation,orb:allowedOrb};
      }
      if(best) result.push(Object.freeze({
        body1:bodies[i][0],body1Name:bodies[i][1],body2:bodies[j][0],body2Name:bodies[j][1],
        ...best,separation
      }));
    }
    return Object.freeze(result);
  }
  globalThis.ObservatoryAspects=Object.freeze({calculate,defaults});
}());
