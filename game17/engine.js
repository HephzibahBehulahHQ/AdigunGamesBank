export const DIRECTIONS=["left","center","right"];
export function makeMatch(seed=17001){return{seed,rng:seed>>>0,round:0,finished:false,winner:null,score:{player:0,keeper:0},playerShots:[],playerDives:[],aiKeeperDives:[],aiShots:[],log:[],adaptation:{keeper:{left:0,center:0,right:0},shooter:{left:0,center:0,right:0}}}}
function rand(m){m.rng=(1664525*m.rng+1013904223)>>>0;return m.rng/4294967296}
function sample(m,w){let n=DIRECTIONS.reduce((s,d)=>s+w[d],0),x=rand(m)*n;for(const d of DIRECTIONS){x-=w[d];if(x<0)return d}return"right"}
function valid(d){if(!DIRECTIONS.includes(d))throw Error("Choose left, center, or right")}
const weights=(counts,fn)=>Object.fromEntries(DIRECTIONS.map(d=>[d,fn(counts[d])]));
function normalize(w){let n=DIRECTIONS.reduce((s,d)=>s+w[d],0);return Object.fromEntries(DIRECTIONS.map(d=>[d,w[d]/n]))}
export function keeperProbabilities(m){return normalize(weights(m.adaptation.keeper,n=>1+n*.55))}
export function shooterProbabilities(m){return normalize(weights(m.adaptation.shooter,n=>1/(1+n*.65)))}
export function takeShot(m,d){if(m.finished||m.round>=5)throw Error("It is not the player's shooting turn");valid(d);let kd=sample(m,weights(m.adaptation.keeper,n=>1+n*.55));m.adaptation.keeper[d]++;m.aiKeeperDives.push(kd);m.playerShots.push(d);let goal=rand(m)<(d===kd?.16:.79);if(goal)m.score.player++;let e={round:m.round+1,phase:"shoot",direction:d,keeperDive:kd,outcome:goal?"GOAL":"SAVED"};m.log.unshift(e);m.round++;return e}
export function faceShot(m,d){if(m.finished||m.round<5||m.round>=10)throw Error("It is not the player's goalkeeper turn");valid(d);let dir=sample(m,weights(m.adaptation.shooter,n=>1/(1+n*.65)));m.playerDives.push(d);m.aiShots.push(dir);m.adaptation.shooter[d]++;let saved=rand(m)<(dir===d?.77:.12);if(!saved)m.score.keeper++;let e={round:m.round+1,phase:"keeper",direction:dir,keeperDive:d,outcome:saved?"SAVED":"GOAL"};m.log.unshift(e);m.round++;if(m.round===10){m.finished=true;m.winner=m.score.player>m.score.keeper?"player":m.score.player<m.score.keeper?"keeper":"draw"}return e}
