/* Pure azimuthal equidistant projection to SVG coordinates (positive y down).
 * Input: existing north=0/east=90 azimuth, geometric altitude in degrees.
 * Output: zenith at (cx,cy), horizon at radius; north up, east left.
 * Returns null for hidden/invalid directions; does not compute ephemerides.
 * Deliberately not loaded by the page until a later integration step.
 */
(function () {
  'use strict';
  function project({azimuth,altitude},{cx=0,cy=0,radius=180}={}) {
    if(![cx,cy,radius].every(Number.isFinite)||radius<=0) throw new RangeError('Invalid projection bounds');
    if(!Number.isFinite(azimuth)||!Number.isFinite(altitude)||altitude<0||altitude>90) return null;
    if(altitude===90) return {x:cx,y:cy};
    const angle=((azimuth%360)+360)%360*Math.PI/180;
    const r=radius*(90-altitude)/90;
    return {x:cx-r*Math.sin(angle),y:cy-r*Math.cos(angle)};
  }
  globalThis.ObservatoryAllSky=Object.freeze({project});
}());
