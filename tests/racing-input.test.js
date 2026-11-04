import test from 'node:test';
import assert from 'node:assert/strict';
import { bindHoldButton } from '../game10/input.js';
function button() {
  const events=new Map(),attributes={};
  return { attributes, focus(){}, setPointerCapture(){}, setAttribute(k,v){attributes[k]=v;},
    addEventListener(k,fn){events.set(k,fn);}, fire(k,extra={}){events.get(k)?.({preventDefault(){},...extra});} };
}
test('simultaneous steering touch does not release held throttle on focus blur',()=>{
  const held=new Set(), throttle=button(), steering=button();
  bindHoldButton(throttle,'throttle',held);bindHoldButton(steering,'right',held);
  throttle.fire('pointerdown',{pointerId:1});throttle.fire('blur');steering.fire('pointerdown',{pointerId:2});
  assert.deepEqual([...held].sort(),['right','throttle']);
  steering.fire('pointercancel',{pointerId:2});assert.deepEqual([...held],['throttle']);
  throttle.fire('pointerup',{pointerId:1});assert.equal(held.size,0);
});
test('keyboard release, unrelated pointer release and lost capture preserve other active inputs',()=>{
  const held=new Set(), throttle=button(),reset=bindHoldButton(throttle,'throttle',held);
  throttle.fire('pointerdown',{pointerId:1});throttle.fire('keydown',{key:'Enter'});throttle.fire('keyup',{key:'Enter'});
  throttle.fire('pointerup',{pointerId:99});assert.ok(held.has('throttle'));
  throttle.fire('lostpointercapture',{pointerId:1});assert.equal(held.size,0);
  throttle.fire('keydown',{key:' '});throttle.fire('blur');assert.equal(held.size,0);
  throttle.fire('pointerdown',{pointerId:2});reset();assert.equal(held.size,0);assert.equal(throttle.attributes['aria-pressed'],'false');
  throttle.fire('keyup',{key:'Enter'});assert.equal(held.size,0);
});
