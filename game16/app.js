import{makeRace,configure,runLap,standings,LAPS,COMPOUNDS}from"./engine.js";
const $=s=>document.querySelector(s);let race=makeRace(),started=false,seed=20261027;const colors={hb1:"#58e6d4",hb2:"#a5ffbd",hb3:"#78a9ff",ai1:"#ff6d82",ai2:"#c28cff",ai3:"#ffb35c"};
function buildSetups(){const box=$("#drivers");box.replaceChildren(...race.drivers.filter(d=>d.controlled).map(d=>{const el=document.createElement("div");el.className="driver";el.innerHTML=`<div><strong>${d.name}</strong><small>${d.id.toUpperCase()} · HB RACING · SKILL ${d.skill}</small></div><div class="field"><label for="tyre-${d.id}">TYRE</label><select id="tyre-${d.id}">${COMPOUNDS.map(t=>`<option value="${t}" ${t===d.tyre?"selected":""}>${t.toUpperCase()}</option>`).join("")}</select></div><div class="field"><label for="fuel-${d.id}">FUEL TARGET · L</label><input id="fuel-${d.id}" type="number" min="0" max="70" step="1" value="${Math.floor(d.fuel)}"></div><div class="field"><label for="agg-${d.id}">AGGRESSION</label><select id="agg-${d.id}">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===d.aggression?"selected":""}>${n} / 5</option>`).join("")}</select></div>`;return el;}));}
function drawChart() {
  const canvas = $("#chart");
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;

  const density = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(width * density);
  canvas.height = Math.round(height * density);
  context.scale(density, density);
  const left = 42;
  const top = 115;
  const right = width - 19;
  const bottom = height - (width <= 420 ? 120 : 78);
  if (bottom <= top || right <= left) return;

  const lapTimes = race.drivers.flatMap(driver => driver.lapTimes.filter(Number.isFinite));
  const lower = Math.min(90, Math.floor(Math.min(...lapTimes) / 5) * 5);
  const upper = Math.max(105, Math.ceil(Math.max(...lapTimes) / 5) * 5);
  const xAt = index => left + index * (right - left) / (LAPS - 1);
  const yAt = seconds => top + (seconds - lower) * (bottom - top) / (upper - lower);

  context.font = "11px ui-monospace, monospace";
  function line(x1, y1, x2, y2) {
    context.strokeStyle = "#294459";
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  for (let tick = 0; tick <= 4; tick++) {
    const seconds = lower + (upper - lower) * tick / 4;
    const y = yAt(seconds);
    line(left, y, right, y);
    context.fillStyle = "#b2c7d4";
    context.fillText(`${seconds.toFixed(1)}`, 4, y + 4);
  }
  for (let index = 0; index < LAPS; index++) {
    const x = xAt(index);
    line(x, top, x, bottom);
    context.fillStyle = "#b2c7d4";
    context.fillText(String(index + 1), x - 4, bottom + 20);
  }

  for (const driver of race.drivers) {
    context.strokeStyle = context.fillStyle = colors[driver.id];
    context.lineWidth = 2;
    context.beginPath();
    let connected = false;
    driver.lapTimes.forEach((seconds, index) => {
      if (seconds == null) {
        connected = false;
        return;
      }
      const x = xAt(index);
      const y = yAt(seconds);
      if (connected) context.lineTo(x, y);
      else context.moveTo(x, y);
      connected = true;
    });
    context.stroke();
    driver.lapTimes.forEach((seconds, index) => {
      if (seconds == null) return;
      context.beginPath();
      context.arc(xAt(index), yAt(seconds), 3, 0, 2 * Math.PI);
      context.fill();
    });
  }
}
function render(){buildSetups();const rows=standings(race);$("#standings").replaceChildren(...rows.map(d=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${d.position}</td><td class="driver-cell"><b>${d.name}</b><span>${d.team}</span></td><td>${d.lapTime==null?"—":d.lapTime.toFixed(2)+" s"}</td><td>${d.fuel.toFixed(1)} L</td><td>${d.tyre.toUpperCase()}</td><td>${d.status}</td>`;return tr;}));$("#lap-label").textContent=`${race.lap}/${LAPS}`;$("#weather").textContent=race.events.at(-1)?.weather ?? "—";$("#race-status").textContent=race.finished?"Finish":started?"Live":"Garage";$("#position-summary").textContent=rows[0]?`${rows[0].team=== "HB Racing"?"HB RACING LEADS":"LEADER: "+rows[0].team}`:"6 CARS";$("#run-lap").textContent=started?(race.lap===0?"RUN LAP 1":`RUN LAP ${race.lap+1}`):"START RACE";$("#run-lap").hidden=race.finished;$("#setup-open").disabled=race.finished;$("#race-replay").hidden=!race.finished;$("#events").replaceChildren(...race.log.slice(0,14).map(m=>{const li=document.createElement("li");li.textContent=m;return li;}));drawChart();if(race.finished){const won=race.winner==="HB Racing";$("#finish-title").textContent=won?"HB RACING WINS":"RACE COMPLETE";$("#finish-title").style.color=won?"#b3ffbf":"#ffc057";$("#finish-copy").textContent=won?"Your strategy brought an HB Racing driver across the line first.":`${race.winner} wins this round. Review tyre, fuel and aggression calls, then race again.`;$("#overlay").showModal();}}
$("#run-lap").onclick=()=>{try{for(const d of race.drivers.filter(x=>x.controlled)){configure(race,d.id,{tyre:$("#tyre-"+d.id).value,fuelTarget:Number($("#fuel-"+d.id).value),aggression:Number($("#agg-"+d.id).value)});}const out=runLap(race);started=true;$("#message").textContent=out.events.join(" ");render();}catch(e){$("#message").textContent=e.message;}};
function restart(){seed+=1;race=makeRace(seed);started=false;$("#overlay").close();$("#studio-help").close();$("#message").textContent="Prepare strategy, then start the race.";render();}$("#restart").onclick=restart;$("#again").onclick=restart;$("#race-replay").onclick=restart;
$("#overlay").addEventListener("close", () => {
  if (race.finished) $("#race-replay").focus();
});
$("#chart-legend").replaceChildren(...race.drivers.map(driver => {
  const item = document.createElement("li");
  item.textContent = driver.name;
  item.style.setProperty("--driver-color", colors[driver.id]);
  return item;
}));
for (const [button, dialog] of [
  ["#help-open", "#studio-help"], ["#setup-open", "#setup"], ["#race-data-open", "#race-data"],
]) {
  $(button).addEventListener("click", () => $(dialog).showModal());
}
new ResizeObserver(drawChart).observe($("#chart"));
render();
