import test from 'node:test';
import assert from 'node:assert/strict';
import { stepParticle } from '../lib/memory-particles.ts';
const dot=()=>({x:300,y:300,vx:0,vy:0,driftX:0,driftY:0,phase:1,spawnX:0.25,spawnY:1/3,fade:1});
const pointer={x:280,y:300,vx:0,vy:0,active:true};
test('cursor repels particles and momentum persists after departure',()=>{
 const p=dot();for(let i=0;i<12;i++)stepParticle(p,pointer,1/60,1200,900);
 assert(p.x>303&&p.x<315);assert(p.vx>0);const x=p.x,vx=p.vx;
 for(let i=0;i<20;i++)stepParticle(p,{...pointer,active:false},1/60,1200,900);
 assert(p.x>x);assert(p.vx>0&&p.vx<vx);
});
test('exact cursor overlap and extreme cursor speed remain finite and bounded',()=>{
 const p=dot();stepParticle(p,{x:300,y:300,vx:1e9,vy:-1e9,active:true},100,1200,900);
 assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(Math.hypot(p.vx,p.vy)<=100.00001);
});
test('zero elapsed time freezes the field; departing particles respawn invisibly and fade in',()=>{
 const p=dot(),before={...p};stepParticle(p,pointer,0,1200,900);assert.deepEqual(p,before);
 p.x=1213;stepParticle(p,{...pointer,active:false},1/60,1200,900);
 assert.equal(p.x,300);assert.equal(p.y,300);assert.equal(p.fade,0);assert.equal(p.vx,0);
 for(let i=0;i<42;i++)stepParticle(p,{...pointer,active:false},1/60,1200,900);
 assert(p.fade>0.49&&p.fade<0.51);
 for(let i=0;i<43;i++)stepParticle(p,{...pointer,active:false},1/60,1200,900);
 assert.equal(p.fade,1);
});
