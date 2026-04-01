import { format } from 'date-fns'

export const getOpenHoursBetween = (d1, d2) => {
  let cur = new Date(d1.getTime());
  let total = 0;
  while(cur < d2) {
    const step = new Date(cur);
    step.setHours(cur.getHours() + 1, 0, 0, 0);
    const end = step < d2 ? step : d2;
    if (cur.getHours() >= 6) total += (end - cur) / 3600000;
    cur = end;
  }
  return total;
};

export const getRem = (curr, drain, hrs) => {
  const rate = hrs > 0 ? (drain / hrs) : 0;
  if (rate <= 0) return 999;
  return Math.max(0, (curr - 400) / rate);
};

export const addOpenHours = (startDate, hoursToAdd) => {
  let cur = new Date(startDate.getTime());
  let rem = hoursToAdd;
  while (rem > 0) {
    const h = cur.getHours();
    if (h < 6) {
      cur.setHours(6, 0, 0, 0);
    } else {
      const nextMid = new Date(cur);
      nextMid.setHours(24, 0, 0, 0);
      const maxDay = (nextMid - cur) / 3600000;
      if (rem <= maxDay) {
        cur = new Date(cur.getTime() + rem * 3600000);
        rem = 0;
      } else {
        rem -= maxDay;
        cur = nextMid;
      }
    }
  }
  return cur;
};

export const calculateRunwayPredictions = (data) => {
  if (!data || data.length === 0) return [];
  
  let rDrain = 0, rHrs = 0;
  let sDrain = 0, sHrs = 0;
  let dDrain = 0, dHrs = 0;

  for (let i = data.length - 1; i > 0; i--) {
    const oldR = data[i], newR = data[i-1];
    if (!oldR.time || !newR.time) continue;
    const oDate = new Date(`${oldR.date}T${oldR.time}`);
    const nDate = new Date(`${newR.date}T${newR.time}`);
    
    const hDiff = getOpenHoursBetween(oDate, nDate);
    if (hDiff <= 0 || hDiff > 48) continue;

    const diffReg = Number(oldR.regular) - Number(newR.regular);
    if (diffReg > 0 && diffReg < 10000) { rDrain += diffReg; rHrs += hDiff; }

    const diffSup = Number(oldR.super) - Number(newR.super);
    if (diffSup > 0 && diffSup < 10000) { sDrain += diffSup; sHrs += hDiff; }

    const diffDsl = Number(oldR.diesel) - Number(newR.diesel);
    if (diffDsl > 0 && diffDsl < 10000) { dDrain += diffDsl; dHrs += hDiff; }
  }

  const latest = data[0];
  const latestDate = new Date(`${latest.date}T${latest.time}`);
  
  const calcPrediction = (grade, vol, drain, hrs) => {
      const remHours = getRem(vol, drain, hrs);
      if (remHours === 999) return { grade, remainingHours: 0, runOutTime: 'Stable', depletionRate: 0, currentVol: vol }
      const runOutDate = addOpenHours(latestDate, remHours);
      return { 
        grade, 
        remainingHours: Number(remHours.toFixed(1)), 
        currentVol: vol, 
        depletionRate: hrs > 0 ? (drain/hrs).toFixed(1) : 0, 
        runOutTime: format(runOutDate, "MMM do, h:mm a") 
      };
  }

  return [
    calcPrediction('Regular', latest.regular, rDrain, rHrs),
    calcPrediction('Super', latest.super, sDrain, sHrs),
    calcPrediction('Diesel', latest.diesel, dDrain, dHrs)
  ];
}
