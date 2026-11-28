import{MAP,COVER,makeMatch,step,standings}from"./engine.js";
const $=s=>document.querySelector(s),c=$("#arena"),x=c.getContext("2d");
let m=makeMatch(),running=false,last=0,lastSecond=-1,aim={x:MAP.cx,y:MAP.cy},keys=new Set(),startHeld=false,paused=false;
const help=$("#studio-help"), result=$("#end-screen"), touchKeys=new Set();
let view={scale:1,left:0,top:0};
function resize(){
 const {width,height}=c.getBoundingClientRect(), density=Math.min(devicePixelRatio,2);
 c.width=Math.round(width*density);c.height=Math.round(height*density);
 const scale=Math.min(c.width/MAP.width,c.height/MAP.height);
 view={scale,left:(c.width-MAP.width*scale)/2,top:(c.height-MAP.height*scale)/2};
 draw();
}
const angle=()=>Math.atan2(aim.y-m.actors[0].y,aim.x-m.actors[0].x);
function draw(){
 if(!x)return;
 x.resetTransform();x.fillStyle="#08121d";x.fillRect(0,0,c.width,c.height);
 x.setTransform(view.scale,0,0,view.scale,view.left,view.top);
 const w=MAP.width,h=MAP.height,g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,"#102630");g.addColorStop(1,"#08121d");x.fillStyle=g;x.fillRect(0,0,w,h);
 x.strokeStyle="#7bdfff13";x.lineWidth=1;for(let i=0;i<=w;i+=50){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke()}for(let i=0;i<=h;i+=50){x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke()}
 for(const o of COVER){x.fillStyle="#263747";x.fillRect(o.x,o.y,o.w,o.h);x.strokeStyle="#92b7ca";x.strokeRect(o.x+1,o.y+1,o.w-2,o.h-2)}
 x.save();x.beginPath();x.rect(0,0,w,h);x.arc(MAP.cx,MAP.cy,m.zoneRadius,0,Math.PI*2,true);x.fillStyle="#ff456d18";x.fill("evenodd");x.restore();
 x.beginPath();x.arc(MAP.cx,MAP.cy,m.zoneRadius,0,Math.PI*2);x.strokeStyle="#ff6688";x.lineWidth=3;x.setLineDash([10,8]);x.stroke();x.setLineDash([]);
 for(const q of m.loot)if(!q.taken){x.fillStyle=q.kind==="med"?"#56ffb0":"#ffc966";x.shadowColor=x.fillStyle;x.shadowBlur=12;x.fillRect(q.x-8,q.y-8,16,16);x.shadowBlur=0;x.fillStyle="#07131c";x.font="bold 12px sans-serif";x.textAlign="center";x.fillText(q.kind==="med"?"+":"A",q.x,q.y+4)}
 for(const b of m.bullets){x.fillStyle=b.source==="player"?"#bffff6":"#ffd2a0";x.beginPath();x.arc(b.x,b.y,4,0,7);x.fill()}
 for(const a of m.actors)if(a.alive){let col=a.id==="player"?"#65f0dc":a.style==="aggressive"?"#ff6c77":a.style==="scavenger"?"#ffd36e":"#9e9aff";x.shadowColor=col;x.shadowBlur=10;x.fillStyle=col;x.beginPath();x.arc(a.x,a.y,a.id==="player"?13:10,0,7);x.fill();x.shadowBlur=0;x.fillStyle="#efffff";x.font="10px monospace";x.textAlign="center";x.fillText(a.id==="player"?"YOU":a.name,a.x,a.y-17);x.fillStyle="#15202a";x.fillRect(a.x-14,a.y+15,28,4);x.fillStyle=a.hp>50?"#66f0ad":a.hp>25?"#ffd36e":"#ff6877";x.fillRect(a.x-14,a.y+15,28*a.hp/100,4)}
}
function roster(){let el=$("#roster");el.replaceChildren();for(const a of standings(m)){let row=document.createElement("div");row.className="contestant"+(a.alive?"":" dead");let n=document.createElement("span"),s=document.createElement("b");n.textContent=String(a.place).padStart(2,"0")+" "+a.name+(a.id==="player"?" · YOU":"");s.textContent=a.alive?Math.ceil(a.hp)+" HP":"OUT · "+a.kills+" K";row.append(n,s);el.append(row)}}
function feed(){let el=$("#feed");el.replaceChildren();for(const e of m.events.slice(0,12)){let li=document.createElement("li");li.textContent=e;el.append(li)}}
function ui(force=false){let p=m.actors[0];$("#hp").textContent=Math.ceil(p.hp);$("#ammo").textContent=p.ammo;$("#kills").textContent=p.kills;$("#alive").textContent=m.actors.filter(a=>a.alive).length;$("#radius").textContent=Math.round(m.zoneRadius);let sec=Math.floor(m.time);if(force||sec!==lastSecond){lastSecond=sec;$("#clock").textContent=String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");$("#zone").textContent=m.zoneStage?"STORM PHASE "+m.zoneStage:"SAFE ZONE";roster();feed()}if(m.finished){running=false;let win=m.actors.find(a=>a.id===m.winner);$("#end-title").textContent=m.winner==="player"?"LAST SIGNAL":m.winner==="draw"?"NO SURVIVORS":"ELIMINATED";$("#end-copy").textContent=m.winner==="player"?"Champion · "+p.kills+" eliminations · "+Math.ceil(p.hp)+" HP · "+Math.floor(m.time)+" seconds survived.":"Winner: "+(win?.name||"the storm")+" · "+p.kills+" eliminations · survived "+Math.floor(m.time)+" seconds.";finishMatch()}}
function setPaused(value){
 paused=value;
 keys.clear();touchKeys.clear();
 $("#pause").textContent=value?"▶":"Ⅱ";
 $("#pause").setAttribute("aria-label",value?"Resume":"Pause");
}
function finishMatch(){
 running=false;
 setPaused(false);
 $("#pause").disabled=true;
 $("#touch-pad").hidden=true;
 $("#review").hidden=false;
 $("#review").focus();
 result.showModal();
}
function start(){
 m=makeMatch((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);
 m.actors[0].cooldown=0;
 running=true;last=0;lastSecond=-1;
 setPaused(false);
 result.close();help.close();
 $("#start").hidden=$("#review").hidden=true;
 $("#touch-pad").hidden=$("#pause").disabled=false;
 c.focus();ui(true);draw();
}
function reset(){
 running=false;m=makeMatch();
 setPaused(false);
 help.close();result.close();
 $("#start").hidden=false;
 $("#review").hidden=$("#touch-pad").hidden=$("#pause").disabled=true;
 lastSecond=-1;ui(true);draw();
 $("#start").focus();
}
function point(event){
 const bounds=c.getBoundingClientRect();
 aim={
  x:((event.clientX-bounds.left)*c.width/bounds.width-view.left)/view.scale,
  y:((event.clientY-bounds.top)*c.height/bounds.height-view.top)/view.scale,
 };
}
const held=key=>keys.has(key)||touchKeys.has(key);
function input(){let p=navigator.getGamepads?.()[0],ax=p?.axes?.[0]||0,ay=p?.axes?.[1]||0;return{left:held("a")||held("arrowleft")||ax<-.25,right:held("d")||held("arrowright")||ax>.25,up:held("w")||held("arrowup")||ay<-.25,down:held("s")||held("arrowdown")||ay>.25,fire:held(" ")||held("enter")||!!(p?.buttons?.[7]?.pressed||p?.buttons?.[0]?.pressed),aim:angle()}}
function frame(t){let dt=last?Math.min(.05,(t-last)/1000):0;last=t;let p=navigator.getGamepads?.()[0],pressed=!!p?.buttons?.[9]?.pressed;if(pressed&&!startHeld&&!running&&!m.finished&&!help.open)start();startHeld=pressed;if(running&&!paused&&!help.open){step(m,input(),dt);ui();draw()}requestAnimationFrame(frame)}
window.addEventListener("keydown", e => {
 if (help.open || result.open) return;
 if (e.key === "Escape" && running) { setPaused(!paused); return; }
 if (paused || e.defaultPrevented || e.target instanceof Element && e.target.closest('button, a, summary, input, select, textarea')) return;
 if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
 keys.add(e.key.toLowerCase());
 if (!running && !m.finished && (e.key === "Enter" || e.key === " ")) start();
});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));c.addEventListener("pointermove",point);c.addEventListener("pointerdown",e=>{point(e);if(running&&!paused){let p=m.actors[0];if(p.alive&&p.ammo>0&&p.cooldown<=0)step(m,{fire:true,aim:angle()},.001);ui(true);draw()}});
$("#start").addEventListener("click",start);$("#restart").addEventListener("click",reset);$("#again").addEventListener("click",start);$("#pause").addEventListener("click",()=>setPaused(!paused));
$("#review").addEventListener("click",()=>result.showModal());
$("#help-open").addEventListener("click",()=>{keys.clear();touchKeys.clear();help.showModal();});
for(const button of $("#touch-pad").children){
 const key=button.dataset.key;
 button.addEventListener("pointerdown",event=>{
  if(paused)return;
  button.setPointerCapture(event.pointerId);
  touchKeys.add(key);
 });
 for(const type of ["pointerup","pointercancel","lostpointercapture"]){
  button.addEventListener(type,()=>touchKeys.delete(key));
 }
}
window.addEventListener("blur",()=>{if(running)setPaused(true);});
new ResizeObserver(resize).observe(c);
ui(true);resize();requestAnimationFrame(frame);
