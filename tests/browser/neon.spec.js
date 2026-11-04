import { test, expect } from '@playwright/test';

test('Neon Pulse renders actual 4K, commissions a board through controls and resumes progress', async ({ page }, testInfo) => {
  await page.goto('/game1/');
  await expect(page.locator('#neon-canvas')).toHaveAttribute('data-renderer','WebGL2');
  await page.locator('#quality').selectOption('4k');
  await expect(page.locator('#neon-canvas')).toHaveAttribute('data-resolution','3840x2160');
  const buffer=await page.locator('#neon-canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2');return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,error:gl.getError()};});
  expect(buffer).toEqual({width:3840,height:2160,error:0});
  await testInfo.attach('neon-render-buffer',{body:JSON.stringify(buffer),contentType:'application/json'});
  await page.screenshot({path:'test-results/neon-4k.png',fullPage:true});
  await page.locator('#quality').selectOption('auto');
  await page.getByRole('button',{name:'Show a hint',exact:true}).click();
  await expect(page.locator('#message')).toContainText('B2');
  await page.getByRole('button',{name:'Pulse selected signal',exact:true}).click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase','won');
  await expect(page.locator('#matched')).toHaveText('9 / 9');
  await expect(page.locator('#unlock-status')).toContainText('Board 2');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  await page.screenshot({path:'test-results/neon-win.png',fullPage:true});
  await page.reload();
  await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#save-status')).toContainText('1 board commissioned');
  await page.locator('#level').fill('10000'); await page.locator('#load-level').click();
  await expect(page.locator('#message')).toContainText('Complete the current unlocked board');
  await expect(page.locator('#level')).toHaveValue('2');
});

test('Neon Pulse keyboard boundaries, pause, budget failure, undo and retry work', async({page})=>{
  await page.goto('/game1/');
  const canvas=page.locator('#neon-canvas');
  await canvas.press('ArrowLeft');await canvas.press('ArrowUp');
  await expect(page.locator('#selected')).toHaveText('A1');
  await canvas.press('Space');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase','paused');
  await canvas.press('Enter');await expect(page.locator('#moves')).toHaveText('0 / 9');
  await canvas.press('Space');
  for(let i=0;i<9;i++)await canvas.press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase','lost');
  await expect(page.locator('#unlock-status')).toContainText('Board 1');
  await page.getByRole('button',{name:'Undo last pulse',exact:true}).click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase','playing');
  await expect(page.locator('#moves')).toHaveText('8 / 9');
  await page.getByRole('button',{name:'Restart board',exact:true}).click();
  await expect(page.locator('#moves')).toHaveText('0 / 9');
  await page.locator('#signal-4').click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase','won');
});

test('Neon Pulse keeps visible keyboard controls when graphics and storage are unavailable',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'||type==='webgl')return null;return original.call(this,type,...args);};
    Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('TEST-ONLY blocked storage');}});
  });
  await page.setViewportSize({width:390,height:844});
  await page.goto('/game1/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#quality')).toBeDisabled();
  await page.locator('#signal-4').press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase','won');
  await expect(page.locator('#save-status')).toContainText('session only');
  const width=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1]+1);
});
