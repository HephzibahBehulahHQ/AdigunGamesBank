import { campaign, LEVEL_COUNT } from '../shared/progression.js';

export const SAVE_KEY='adigun.campaign.v1.tactics-grid';
const validSave=value=>value?.version===1&&Number.isInteger(value.completed)&&value.completed>=0&&value.completed<=LEVEL_COUNT&&value.unlocked===Math.min(LEVEL_COUNT,value.completed+1);

/** Only completed missions persist. Corrupt data never becomes earned progress. */
export function openTacticsCampaign(storage) {
  let notice='';
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  let raw=null;
  try{raw=storage.getItem(SAVE_KEY);}catch{notice='Browser storage is unavailable. Progress lasts for this session only.';}
  if(raw!==null){
    let valid=false;try{valid=validSave(JSON.parse(raw));}catch{ /* Recover this game's malformed save only. */ }
    if(!valid){
      try{storage.removeItem(SAVE_KEY);notice='The unreadable campaign save was reset. Mission 1 is ready.';}
      catch{notice='The campaign save could not be read or repaired. Progress lasts for this session only.';storage=null;}
    }
  }
  const unavailable={getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}};
  const progress=campaign('tactics-grid',storage||unavailable);
  const saved=()=>{
    try{const value=JSON.parse(storage.getItem(SAVE_KEY)||'null');return validSave(value)&&value.completed>=progress.completed;}
    catch{return false;}
  };
  const description=()=>{
    const counts=`${progress.completed.toLocaleString()} missions cleared · ${progress.unlocked.toLocaleString()} unlocked.`;
    const persistence=progress.completed?(saved()?'Campaign progress is saved on this device.':'Session-only progress: browser storage could not save it. Keep this page open.'):'Completed missions save locally when browser storage is available.';
    return [notice,counts,persistence].filter(Boolean).join(' ');
  };
  return {progress,saved,description};
}
