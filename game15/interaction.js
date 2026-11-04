/** The command map and screen-reader descriptions share the actual objective position. */
export function objectiveLabel(state,x,y) {
  if(state.config.mode==='uplink'&&x===state.config.relay.x&&y===state.config.relay.y)return 'LINK';
  if(state.config.mode==='retrieve'&&!state.carrier&&x===state.core.x&&y===state.core.y)return 'CORE';
  return '';
}

/** A cancelled, dragged or multi-pointer gesture must never become a tactical command. */
export function createTapTracker(onTap) {
  let press=null;
  return {
    down(event){
      if(!event.isPrimary||event.button!==0){press=null;return;}
      press={id:event.pointerId,x:event.clientX,y:event.clientY};
    },
    up(event){
      if(!press||press.id!==event.pointerId)return;
      const start=press;press=null;
      if(!event.isPrimary||event.button!==0||Math.hypot(event.clientX-start.x,event.clientY-start.y)>12)return;
      onTap(event.clientX,event.clientY);
    },
    cancel(){press=null;}
  };
}
