/* Design Arcade — scene, game, tools, disk drive and download. */
{
const $=id=>document.getElementById(id);
const CAT={ux:'UX LAW',heur:'HEURISTIC',gest:'GESTALT',bias:'COGNITIVE BIAS',psy:'PSYCHOLOGY'};
/* Principles come from content/laws.json, embedded by app/page.tsx. */
const LAWS=JSON.parse($('laws-data').textContent).map(l=>({n:l.number,cat:l.category,title:l.title,def:l.definition,tip:l.applyIt,src:l.source}));

/* ---------- helpers ---------- */
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const SKY=['#1462dc','#1a72ea','#2484f4','#3398fa','#48abff','#62bdff','#7fcdff'].map(hex);
const GRASS=['#8fd61f','#9fe327','#aeee31','#bdf63f','#cbfb55'].map(hex);
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pick=(ramp,t,x,y)=>{const v=Math.max(0,Math.min(1,t))*(ramp.length-1)+BAYER[(y&3)*4+(x&3)]/16-.5;return ramp[Math.max(0,Math.min(ramp.length-1,Math.round(v)))]};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const NV='#1d1548',PU='#7d4cf0',PL='#a27bff',PD='#5a2fc0',PDD='#45219c';

const world=$('world'),cv=$('scene'),g=cv.getContext('2d');
const st=document.createElement('canvas'),s=st.getContext('2d');
let W,H,P,G,state='start';
const R=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
function disc(c,cx,cy,r,col){for(let y=-r;y<=r;y++){const w=Math.round(Math.sqrt(r*r-y*y));R(c,cx-w,cy+y,w*2+1,1,col)}}

/* ---------- sound + haptics ----------
   Chiptune sounds synthesised with Web Audio (square/triangle voices + filtered noise), no audio files.
   Haptics: navigator.vibrate where supported (Android); on iOS 18+ Safari a hidden <input switch> gives a light tick.
   One toggle (#snd, key M) controls both; saved in localStorage 'uxl-sound'. */
const FX=(()=>{
  let on=true;try{on=localStorage.getItem('uxl-sound')!=='off'}catch(e){}
  let ac=null,master=null,nbuf=null;
  const ctx=()=>{
    if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
      ac=new A();master=ac.createGain();master.gain.value=.16;master.connect(ac.destination);
      nbuf=ac.createBuffer(1,ac.sampleRate*.6,ac.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
    if(ac.state==='suspended')ac.resume().catch(()=>{});
    return ac};
  // one voice: oscillator with an optional pitch glide and a short attack/decay envelope
  const tone=(f,d,{t=0,type='square',v=.5,f2=0,a=.004}={})=>{const c=ac,t0=c.currentTime+t,o=c.createOscillator(),gn=c.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+d);
    gn.gain.setValueAtTime(0,t0);gn.gain.linearRampToValueAtTime(v,t0+a);gn.gain.exponentialRampToValueAtTime(.001,t0+d);
    o.connect(gn).connect(master);o.start(t0);o.stop(t0+d+.02)};
  // filtered noise: clicks, whooshes, the drive's seek ticks
  const noise=(d,{t=0,v=.4,f=1200,f2=0,q=1,type='bandpass'}={})=>{const c=ac,t0=c.currentTime+t,src=c.createBufferSource(),fl=c.createBiquadFilter(),gn=c.createGain();
    src.buffer=nbuf;fl.type=type;fl.Q.value=q;fl.frequency.setValueAtTime(f,t0);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t0+d);
    gn.gain.setValueAtTime(v,t0);gn.gain.exponentialRampToValueAtTime(.001,t0+d);
    src.connect(fl).connect(gn).connect(master);src.start(t0);src.stop(t0+d+.02)};
  const seq=(ns,step,o={})=>ns.forEach((f,i)=>f&&tone(f,step*1.6,{...o,t:(o.t||0)+i*step}));
  const N={C5:523,D5:587,E5:659,G5:784,A5:880,B5:988,C6:1047,D6:1175,E6:1319,G6:1568,C7:2093,G4:392,E4:330,C4:262,A4:440};
  const S={
    tap:()=>tone(1320,.05,{v:.35}),
    key:()=>{tone(1760,.03,{v:.3});noise(.03,{v:.25,f:4000})},                       // deck key / option button
    tick:()=>tone(2400,.018,{v:.18,type:'triangle'}),                                // slider + typing
    start:()=>{tone(N.B5,.08);tone(N.E6,.35,{t:.08});                                // coin in...
      noise(1.4,{t:.1,v:.18,f:300,f2:3200,q:2});tone(220,1.4,{t:.1,type:'triangle',f2:880,v:.25})}, // ...and zoom
    power:()=>seq([N.C5,N.E5,N.G5,N.C6],.06,{type:'square',v:.35}),               // screen powers on
    exit:()=>{noise(1.3,{v:.16,f:3000,f2:250,q:2});tone(880,1.3,{type:'triangle',f2:180,v:.22});seq([N.G5,N.E5,N.C5],.07,{v:.3})},
    shuffle:()=>{noise(.12,{v:.3,f:900,f2:4000,q:3});tone(440,.1,{type:'triangle',f2:1200,v:.3})}, // joystick ratchet
    reveal:()=>{tone(N.E6,.06,{type:'triangle',v:.3,t:.04});tone(N.B5*2,.12,{type:'triangle',v:.22,t:.1})}, // new card sparkle
    knew:()=>{tone(N.B5,.07,{v:.4});tone(N.E6,.32,{t:.07,v:.4})},                    // pick-up
    levelup:()=>{seq([N.C5,N.E5,N.G5,N.C6,N.E6,N.G6],.07,{v:.38});tone(N.C7,.5,{t:.42,v:.3});tone(N.C6,.5,{t:.42,v:.3,type:'triangle'})},
    newto:()=>{tone(N.A5,.1,{type:'triangle',v:.45});tone(N.E5,.22,{t:.1,type:'triangle',v:.45});tone(N.A5*2,.18,{t:.16,type:'triangle',v:.15})},
    clear:()=>{seq([N.G4,N.C5,N.E5,N.G5,0,N.E5,N.G5],.11,{v:.35});seq([N.C6],.6,{t:.77,v:.35});tone(N.E5,.9,{t:.77,type:'triangle',v:.3})},
    eject:()=>{noise(.04,{v:.5,f:2500});tone(140,.06,{v:.35});tone(300,.18,{t:.04,f2:900,type:'triangle',v:.25});noise(.4,{t:.1,v:.12,f:600,f2:2400,q:2})},
    lift:()=>{tone(500,.12,{type:'triangle',f2:1000,v:.22});noise(.7,{t:.1,v:.12,f:500,f2:2600,q:2})}, // disk leaves the rack
    land:()=>{noise(.05,{v:.55,f:1800});tone(90,.12,{v:.4,f2:60});noise(.04,{t:.07,v:.35,f:3500})}, // clunk into the drive
    load:()=>{tone(70,.7,{type:'sawtooth',v:.07});for(let i=0;i<7;i++)noise(.025,{t:.05+i*.09+Math.random()*.03,v:.3,f:2800+Math.random()*1500,q:4})}, // drive seek
    boot:()=>seq([N.C5,N.G5,N.C6,N.E6],.05,{v:.3}),
    special:()=>{tone(200,.45,{f2:1600,v:.3});noise(.45,{v:.18,f:400,f2:5000,q:2});tone(N.C6,.08,{t:.45,v:.4});tone(N.G6,.3,{t:.52,v:.35})},
    fail:()=>{tone(150,.12,{v:.35});tone(110,.2,{t:.12,v:.35})},                    // can't do that
    swap:()=>{tone(N.E6,.06,{v:.3});tone(N.C6,.06,{t:.06,v:.3});tone(N.E6,.08,{t:.12,v:.3})},
    copy:()=>{tone(N.G6,.04,{v:.3});tone(N.C7,.1,{t:.05,v:.3})},
    saving:()=>{for(let i=0;i<4;i++)tone(N.C6*(1+i*.12),.04,{t:i*.06,v:.22})},
    saved:()=>{tone(N.C6,.07,{v:.38});tone(N.G6,.07,{t:.07,v:.38});tone(N.C7,.3,{t:.14,v:.32})},
    toggle:()=>{tone(N.E6,.05,{v:.35});tone(N.A5*2,.08,{t:.05,v:.35})}};
  const VIB={tap:6,key:8,tick:3,start:[12,40,12],power:10,exit:12,shuffle:10,reveal:6,knew:[12,40,12],levelup:[20,50,20,50,40],
    newto:16,clear:[30,60,30,60,60],eject:[8,30,8],lift:6,land:[18,40,10],load:0,boot:8,special:[12,30,12,30,30],fail:[30,40,30],swap:[8,30,8],copy:8,saving:0,saved:[10,40,20],toggle:10};
  // iOS has no navigator.vibrate; toggling a native switch inside a user gesture gives a light system haptic
  const iOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let sw=null;
  if(iOS&&!('vibrate' in navigator)){const l=document.createElement('label');l.setAttribute('aria-hidden','true');l.style.cssText='position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const i=document.createElement('input');i.type='checkbox';i.setAttribute('switch','');i.tabIndex=-1;l.appendChild(i);document.body.appendChild(l);sw=l}
  const buzz=p=>{if(!p)return;try{if(navigator.vibrate)navigator.vibrate(p);else if(sw)sw.click()}catch(e){}};
  let lastTick=0;
  const play=n=>{if(!on)return;
    if(n==='tick'){const t=performance.now();if(t-lastTick<45)return;lastTick=t}
    buzz(VIB[n]);if(!ctx())return;try{S[n]()}catch(e){}};
  const btn=document.getElementById('snd');
  const sync=()=>{if(!btn)return;btn.setAttribute('aria-pressed',String(on));btn.classList.toggle('mute',!on);btn.title=on?'Sound and haptics on (M)':'Sound and haptics off (M)'};
  const toggle=()=>{on=!on;try{localStorage.setItem('uxl-sound',on?'on':'off')}catch(e){}sync();if(on){ctx();play('toggle')}};
  if(btn)btn.addEventListener('click',e=>{e.stopPropagation();toggle()});
  sync();
  // browsers only allow audio after a gesture: unlock on the first one
  const unlock=()=>{if(on)ctx()};addEventListener('pointerdown',unlock,{once:true,capture:true});addEventListener('keydown',unlock,{once:true,capture:true});
  return {play,toggle}})();
const sfx=FX.play;

/* ---------- layout ---------- */
function layout(){
  const vw=innerWidth,vh=innerHeight;
  P=vw<600?3:vw<1100?4:5;
  W=Math.ceil(vw/P);H=Math.ceil(vh/P);
  const portrait=vw/vh<.85;
  let cw,m,sw,sh,dh,lh,mq;
  if(portrait){cw=Math.round(Math.min(W*.8,H*.42));m=Math.max(4,Math.round(cw*.06));sw=cw-2*m;sh=Math.round(sw*1.05);dh=Math.round(cw*.22);lh=Math.round(cw*.46);mq=Math.round(cw*.2)}
  else{sw=Math.round(Math.min(H*.88/1.36,W*.5));m=Math.max(4,Math.round(sw*.05));cw=sw+2*m;sh=Math.round(sw*.6);dh=Math.round(sw*.17);lh=Math.round(sw*.26);mq=Math.round(sw*.15)}
  const dx=Math.max(3,Math.round(cw*.05)),cb=Math.round(H*(portrait?.9:.95)),cx=Math.round(W/2),x0=cx-Math.round(cw/2),x1=x0+cw;
  const lowY=cb-lh,deckY=lowY-dh,y0=deckY-(sh+2*m),gap=Math.max(3,Math.round(mq*.25)),mqY=y0-gap-mq;
  const gh=Math.round(H*(portrait?.64:.7));
  G={portrait,cw,m,sw,sh,dh,lh,mq,dx,cb,cx,x0,x1,lowY,deckY,y0,sx:x0+m,sy:y0+m,mqY,gh};
  cv.width=st.width=W;cv.height=st.height=H;
  cv.style.width=W*P+'px';cv.style.height=H*P+'px';
  world.style.width=W*P+'px';world.style.height=H*P+'px';
  const place=(id,x,y,w,h)=>Object.assign($(id).style,{left:x*P+'px',top:y*P+'px',width:w*P+'px',height:h*P+'px'});
  const mqx=x0+Math.round(cw*.04);G.mqx=mqx;G.mqw=cw-2*Math.round(cw*.04);
  place('marq',mqx+3,mqY+3,G.mqw-6,mq-6);
  place('screen',G.sx,G.sy,sw,sh);
  place('deck',x0,deckY,cw,dh);
  place('lower',G.sx,lowY+3,sw,lh-6);
  drawStatic();
  world.style.setProperty('--z',zoom().z);
  applyT();
}
function zoom(){
  const vw=innerWidth,vh=innerHeight,bh=G.cb-G.y0+2;
  const z=G.portrait?Math.min(vw*1.02/(G.cw*P),vh*.95/(bh*P)):Math.min(vw*.92/((G.cw+2*G.dx)*P),vh*.95/(bh*P));
  let tx=vw/2-G.cx*P*z,ty=vh/2-(G.y0+bh/2)*P*z;
  tx=Math.min(0,Math.max(vw-W*P*z,tx));ty=Math.min(0,Math.max(vh-H*P*z,ty));
  return {z,tx,ty};
}
function applyT(){
  if(state==='start'){world.style.transform='none';return}
  const t=zoom();world.style.transform=`translate(${t.tx}px,${t.ty}px) scale(${t.z})`;
}

/* ---------- static scene ---------- */
function cloudBlob(cx,cy,sz){
  const parts=[[0,0,1],[-.9,.25,.7],[.9,.25,.75],[-.45,-.35,.7],[.4,-.45,.8],[1.6,.45,.5],[-1.6,.5,.45]];
  parts.forEach(([a,b,r])=>disc(s,Math.round(cx+a*sz),Math.round(cy+b*sz),Math.round(r*sz),'#ffffff'));
  R(s,cx-2.1*sz,cy+.6*sz,4.2*sz,Math.max(2,sz*.35),'#d7ecff');
}
function drawStatic(){
  const r=(x,y,w,h,c)=>R(s,x,y,w,h,c);
  const {portrait,cw,m,sw,sh,dh,lh,mq,dx,cb,cx,x0,x1,lowY,deckY,y0,sx,sy,mqY,gh}=G;
  const rand=rng(11);
  // sky + ground via ImageData
  const vy=gh-Math.round((H-gh)*.9),img=s.createImageData(W,H),D=img.data;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=y<gh?pick(SKY,y/gh,x,y):pick(GRASS,(y-gh)/(H-gh)*.8+.15,x,y);
    const i=(y*W+x)*4;D[i]=c[0];D[i+1]=c[1];D[i+2]=c[2];D[i+3]=255;
  }
  s.putImageData(img,0,0);
  // clouds
  const cs=portrait?Math.round(W*.07):Math.round(H*.06);
  cloudBlob(Math.round(W*.08),Math.round(H*.1),cs);cloudBlob(Math.round(W*.92),Math.round(H*.16),Math.round(cs*1.1));
  cloudBlob(Math.round(W*.96),Math.round(H*.38),Math.round(cs*.8));cloudBlob(Math.round(W*.02),Math.round(H*.42),Math.round(cs*.75));
  // tile floor
  const lineC='#6fbf1f';
  for(let k=1;k<=9;k++){const y=Math.round(gh+(H-gh)*Math.pow(k/9,1.7));r(0,y,W,1,lineC)}
  const vx=W/2;for(let k=-14;k<=14;k++){const xb=vx+k*W*.14;for(let y=gh;y<H;y++){const x=Math.round(vx+(xb-vx)*(y-vy)/(H-vy));if(x>=0&&x<W)r(x,y,1,1,lineC)}}
  const conf=['#ff4fae','#5fb8ff','#ffffff','#ffd23a'];
  for(let k=0;k<Math.round(W*H/900);k++){const x=Math.round(rand()*W),y=Math.round(gh+6+rand()*(H-gh-6)),c=conf[k%4];r(x-1,y,3,1,c);r(x,y-1,1,3,c)}
  for(let x=0;x<W;x+=7+Math.round(rand()*9)){const y=H-2-Math.round(rand()*4);r(x,y,1,2,'#3f8f1a');r(x+1,y-1,1,3,'#4fa821');r(x+2,y,1,2,'#3f8f1a')}
  // wall
  const wh=Math.round(H*(portrait?.07:.1)),wy=gh-wh;
  r(0,wy,W,wh,PD);r(0,wy,W,2,PL);r(0,wy+2,W,1,PU);r(0,gh-2,W,2,PDD);
  for(let k=0;k<2;k++)for(let j=0;j<Math.round(wh*.45);j++)r(Math.round(W*.86)+k*4+Math.round(j*.5),gh-4-j,2,1,'#c6f432');
  // fence (left)
  const fx1=Math.round(W*(portrait?.3:.28)),fh=Math.round(H*(portrait?.1:.13)),fy=wy-fh;
  for(let y=fy;y<wy;y++)for(let x=0;x<fx1;x++)if((x+y)%5===0||(x-y+500)%5===0)r(x,y,1,1,'rgba(29,21,72,.55)');
  r(0,fy,fx1,1,NV);for(let x=2;x<fx1;x+=Math.max(10,Math.round(W*.09)))r(x,fy,1,fh,NV);
  // floodlight
  const fl=Math.round(W*.07),ft=Math.round(H*(portrait?.22:.18)),pw2=Math.max(9,Math.round(W*(portrait?.12:.05)));
  r(fl-1,ft,2,wy-ft,PD);r(fl,ft,1,wy-ft,PU);
  r(fl-pw2/2-1,ft-pw2-1,pw2+2,pw2+2,NV);r(fl-pw2/2,ft-pw2,pw2,pw2,'#2a2470');
  const ls=pw2/3;for(let a=0;a<3;a++)for(let b=0;b<3;b++)disc(s,Math.round(fl-pw2/2+ls*(a+.5)),Math.round(ft-pw2+ls*(b+.5)),Math.max(1,Math.round(ls*.38)),'#ffffff');
  // school building (right, behind wall)
  const bx=Math.round(W*(portrait?.78:.76)),bw=W-bx+4,btop=wy-Math.round(H*(portrait?.12:.18));
  disc(s,W-2,btop+4,Math.round(H*.06),'#3f9a3a');disc(s,W-8,btop+1,Math.round(H*.04),'#58b84a');
  r(bx,btop,bw,wy-btop,PU);r(bx,btop,2,wy-btop,PL);
  r(bx-2,btop-3,bw+4,3,'#b7633a');r(bx-2,btop-4,bw+4,1,'#d9824f');
  const gx=bx+Math.round(bw*.32),gw=Math.round(bw*.36);r(gx,btop-10,gw,10,'#f3e2c0');r(gx+2,btop-12,gw-4,2,'#b7633a');
  disc(s,gx+Math.round(gw/2),btop-5,Math.max(2,Math.round(gw*.22)),'#ffffff');r(gx+Math.round(gw/2),btop-7,1,3,NV);r(gx+Math.round(gw/2),btop-5,2,1,NV);
  for(let row=0;row<2;row++)for(let x=bx+3;x<W;x+=7){const y=btop+3+row*7;r(x,y,5,5,'#f3e2c0');r(x+1,y+1,3,3,'#2f6fe8');r(x+1,y+1,1,1,'#9fd0ff')}
  // hoop (right)
  const hx=Math.round(W*(portrait?.97:.88)),htop=Math.round(H*(portrait?.42:.24)),bbw=Math.round(W*(portrait?.11:.1)),bbh=Math.round(bbw*.75);
  r(hx-1,htop,3,gh+Math.round((H-gh)*.15)-htop,PD);r(hx,htop,1,gh-htop,PL);
  r(hx-1,gh+Math.round((H-gh)*.15)-3,6,4,PDD);
  const bbx=hx-bbw;r(bbx-1,htop-bbh-1,bbw+2,bbh+2,NV);r(bbx,htop-bbh,bbw,bbh,'#f4f4ff');r(bbx,htop-bbh,bbw,1,'#ffffff');
  const iw=Math.round(bbw*.4),ih=Math.round(bbh*.4);r(bbx+(bbw-iw)/2,htop-ih-3,iw,ih,'#e85a1e');r(bbx+(bbw-iw)/2+1,htop-ih-2,iw-2,ih-2,'#f4f4ff');
  r(bbx+(bbw-iw)/2-2,htop-3,iw+4,2,'#e85a1e');
  for(let k=0;k<Math.round(bbh*.5);k+=2)r(bbx+(bbw-iw)/2-1+Math.round(k*.2),htop-1+k,iw+2-Math.round(k*.4),1,'#ffffff');
  // bench + bin (left, on ground)
  const bnx=Math.round(W*(portrait?.02:.06)),bny=gh+Math.round((H-gh)*.08),bnw=Math.round(W*(portrait?.16:.08));
  r(bnx,bny,bnw,2,'#f39a2c');r(bnx,bny+3,bnw,2,'#e07f1a');r(bnx,bny-4,bnw,2,'#f39a2c');
  r(bnx+1,bny+5,1,4,NV);r(bnx+bnw-2,bny+5,1,4,NV);r(bnx+1,bny-2,1,2,NV);r(bnx+bnw-2,bny-2,1,2,NV);
  const bix=bnx+bnw+3,biw=Math.max(5,Math.round(bnw*.35)),bih=Math.round(biw*1.3);
  r(bix,bny+8-bih,biw,bih,'#2f6fe8');r(bix,bny+8-bih,biw,1,'#7fb6ff');r(bix-1,bny+7-bih,biw+2,1,'#1d4fb8');
  // ---- cabinet ----
  r(x0-dx-3,cb,cw+2*dx+8,3,'rgba(40,90,0,.35)');
  // marquee + posts
  const {mqx,mqw}=G;
  r(x0+Math.round(cw*.14),mqY+mq,3,y0-mqY-mq,PD);r(x1-Math.round(cw*.14)-3,mqY+mq,3,y0-mqY-mq,PD);
  r(mqx-1,mqY-1,mqw+2,mq+2,NV);r(mqx,mqY,mqw,mq,PU);r(mqx,mqY,mqw,1,PL);r(mqx+2,mqY+2,mqw-4,mq-4,'#0b1033');
  const bk=(x,y,w,h,c)=>{const L=Math.max(3,Math.round(Math.min(w,h)*.18));r(x,y,L,1,c);r(x,y,1,L,c);r(x+w-L,y,L,1,c);r(x+w-1,y,1,L,c);r(x,y+h-1,L,1,c);r(x,y+h-L,1,L,c);r(x+w-L,y+h-1,L,1,c);r(x+w-1,y+h-L,1,L,c)};
  bk(mqx+3,mqY+3,mqw-6,mq-6,'#c6f432');
  // body
  r(x0-1,y0-2,cw+2,deckY-y0+3,NV);r(x0,y0-1,cw,deckY-y0+1,PU);r(x0,y0-1,cw,1,PL);r(x0,y0,2,deckY-y0,PL);r(x1-2,y0,2,deckY-y0,PD);
  r(sx-3,sy-3,sw+6,sh+6,PDD);r(sx-2,sy-2,sw+4,sh+4,'#21185e');
  // deck slab
  const dk0=x0-dx,dkw=cw+2*dx,top=Math.round(dh*.42);
  r(dk0-1,deckY-1,dkw+2,dh+2,NV);r(dk0,deckY,dkw,top,PL);r(dk0,deckY,dkw,1,'#c2a6ff');r(dk0,deckY+top,dkw,dh-top,PU);r(dk0,deckY+dh-2,dkw,2,PD);
  // lower
  r(x0-1,lowY,cw+2,cb-lowY,NV);r(x0,lowY,cw,cb-lowY-1,'#6a3be0');r(x0,lowY,2,cb-lowY-1,PU);r(x1-2,lowY,2,cb-lowY-1,PD);r(x0,cb-3,cw,2,PDD);
}

/* ---------- animated ---------- */
function drawScreen(t){
  const {sx,sy,sw,sh}=G;
  g.save();g.beginPath();g.rect(sx,sy,sw,sh);g.clip();
  R(g,sx,sy,sw,sh,'#0b1033');
  for(let k=0;k<14;k++){const x=sx+((k*37)%sw),y=sy+3+((k*23)%Math.round(sh*.45));if(Math.sin(t*1.7+k)>0)R(g,x,y,1,1,'#7d8cff')}
  g.restore();
  const L=Math.max(3,Math.round(Math.min(sw,sh)*.08)),c='#c6f432',i=2;
  [[sx+i,sy+i,1,1],[sx+sw-1-i,sy+i,-1,1],[sx+i,sy+sh-1-i,1,-1],[sx+sw-1-i,sy+sh-1-i,-1,-1]].forEach(([x,y,a,b])=>{R(g,a>0?x:x-L+1,y,L,1,c);R(g,x,b>0?y:y-L+1,1,L,c)});
}
function bird(x,y,f){const c=NV;R(g,x,y,1,1,c);if(f){R(g,x-1,y-1,1,1,c);R(g,x-2,y-1,1,1,c);R(g,x+1,y-1,1,1,c);R(g,x+2,y-1,1,1,c)}else{R(g,x-1,y,1,1,c);R(g,x-2,y+1,1,1,c);R(g,x+1,y,1,1,c);R(g,x+2,y+1,1,1,c)}}
let last=0;
function frame(ts){
  if(ts-last>90){last=ts;const t=reduced?0:ts/1000;
    g.drawImage(st,0,0);
    const top=Math.max(8,G.mqY-6);
    [[.2,.3,1],[.5,.15,.7],[.75,.5,1.2],[.35,.7,.9]].forEach(([bx,by,sp],k)=>{const x=Math.round(((bx*W+t*sp*4)%(W+20))-10),y=Math.round(4+by*(top-6));bird(x,y,Math.floor(t*3+k)%2)});
    drawScreen(t);
  }
  requestAnimationFrame(frame);
}

/* ---------- laws + game ---------- */
const order=LAWS.map((_,k)=>k);for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
let pos=0;const seen=new Set();
const PER_LV=5;let G2={known:0,score:0,answered:{}};
try{const sv=JSON.parse(localStorage.getItem('uxl-arcade')||'null');if(sv&&typeof sv.score==='number')G2=sv}catch(e){}
Object.keys(G2.answered).forEach(k=>seen.add(+k));
const persist=()=>{try{localStorage.setItem('uxl-arcade',JSON.stringify(G2))}catch(e){}};
const num=n=>String(n).padStart(3,'0');
const cur=()=>LAWS[order[pos]];
const lvl=()=>1+Math.floor(G2.known/PER_LV);
function hud(){
  $('lv').textContent='LV '+lvl();$('pts').textContent=String(G2.score).padStart(4,'0')+' PTS';
  const seg=G2.known%PER_LV;[...$('bar').children].forEach((el,k)=>el.classList.toggle('on',k<seg));
}
function render(dir){
  const l=cur();seen.add(l.n);hud();
  $('cat').textContent=CAT[l.cat];const h=$('title');h.textContent=l.title;h.className=l.title.length>16?'long':'';
  $('def').textContent=l.def;$('tip').textContent=l.tip;$('src').textContent='SOURCE: '+l.src.toUpperCase();
  const done=l.n in G2.answered;$('yes').disabled=$('no').disabled=done;
  $('clear').hidden=true;$('clear').dataset.shown='';
  if(dir&&!reduced){const law=$('law'),f=$('flash');law.style.setProperty('--dir',dir);law.classList.remove('swap');f.classList.remove('go');void law.offsetWidth;law.classList.add('swap');f.classList.add('go')}
  if(dir)sfx('reveal');
  prerender();
}
const joy=$('joy');
function tilt(cls){joy.classList.remove('l','r','w');void joy.offsetWidth;joy.classList.add(cls);if(cls!=='w')setTimeout(()=>joy.classList.remove(cls),160)}
function pop(main,sub,cls){const p=$('pop'),ct=document.querySelector('.content');ct.classList.add('dim');clearTimeout(pop.t);pop.t=setTimeout(()=>ct.classList.remove('dim'),reduced?900:1000);p.className='pop';p.innerHTML=main+(sub?`<small>${sub}</small>`:'');void p.offsetWidth;p.className='pop go'+(cls?' '+cls:'')}
let adv,busy=false;
function pickUnseen(){const pool=order.map((v,k)=>k).filter(k=>!seen.has(LAWS[order[k]].n));return pool.length?pool[Math.floor(Math.random()*pool.length)]:-1}
function shuffle(auto){
  if(state!=='on'||swapping)return;clearTimeout(adv);busy=false;tilt('w');if(auto!==true)sfx('shuffle');
  if(!disk){insert(DISKS[Math.floor(Math.random()*DISKS.length)].id);return}
  if(disk!=='principles'){toolShuffle();return}
  if(seen.size>=LAWS.length){showClear();return}
  const k=pickUnseen();if(k<0){showClear();return}
  pos=k;render(1);
}
function answer(knew){
  if(disk!=='principles'||swapping)return;
  const l=cur();if(busy||l.n in G2.answered)return;busy=true;
  G2.answered[l.n]=knew?1:0;$('yes').disabled=$('no').disabled=true;tilt(knew?'r':'l');
  if(knew){
    G2.known++;G2.score+=100;hud();
    const up=G2.known%PER_LV===0;
    const bar=$('bar');bar.classList.remove('up');void bar.offsetWidth;bar.classList.add('up');
    sfx(up?'levelup':'knew');
    if(up){pop('LEVEL UP!','NOW LV '+lvl()+' · +100 PTS','lvl');const m=$('marq');m.classList.remove('flash');void m.offsetWidth;m.classList.add('flash')}
    else pop('+100 PTS','HP +1 · '+(PER_LV-G2.known%PER_LV)+' TO LV '+(lvl()+1));
  }else{sfx('newto');pop('NOW YOU KNOW','ADDED TO YOUR PLAYBOOK')}
  persist();
  clearTimeout(adv);adv=setTimeout(()=>{busy=false;shuffle(true)},reduced?900:1150);
}
function showClear(){
  const total=LAWS.length,knew=Object.values(G2.answered).filter(v=>v).length;
  $('cTot').textContent=total;
  $('cStats').innerHTML=`YOU KNEW <b>${knew}</b> OF ${total}<br>LEVEL <b>${lvl()}</b> · <b>${G2.score}</b> PTS`;
  $('clear').hidden=false;$('clear').dataset.shown='1';sfx('clear');$('again').focus({preventScroll:true});
}
function again(){sfx('power');clearTimeout(adv);busy=false;G2={known:0,score:0,answered:{}};persist();seen.clear();pos=Math.floor(Math.random()*order.length);render(1);$('yes').focus({preventScroll:true})}

/* ---------- disks + tools ---------- */
const DISKS=[
 {id:'principles',name:'DESIGN PRINCIPLES',short:'PRINCIPLES',tag:'UX',c:'#ff4fae'},
 {id:'contrast',name:'CONTRAST FIGHT',short:'CONTRAST',tag:'AA',c:'#5fb8ff'},
 {id:'type',name:'TYPE SCALE',short:'TYPE',tag:'Aa',c:'#ffd23a'},
 {id:'grid',name:'LAYOUT GRID',short:'GRID',tag:'12',c:'#c6f432'}];
let disk='',swapping=false;
const dOf=id=>DISKS.find(d=>d.id===id);
$('rack').innerHTML=DISKS.map(d=>`<button class="disk" data-d="${d.id}" style="--dc:${d.c}" aria-label="Insert the ${d.name.toLowerCase()} disk"><span class="flop"><em>${d.tag}</em></span>${d.short}</button>`).join('');
const rackBtn=id=>$('rack').querySelector(`[data-d="${id}"]`);
function setMarq(n){$('marq').querySelector('.in').innerHTML=`<i class="dia">◆</i>${n}<i class="dia">◆</i>`}
const DESC={principles:LAWS.length+' UX laws, heuristics and psychology. Play the quiz.',contrast:'Beat the boss: check text and background contrast.',type:'Pick two options, get a full heading scale.',grid:'Exact column widths for any frame.'};
$('menu').innerHTML=DISKS.map((d,i)=>`<button class="mi" data-d="${d.id}" style="--dc:${d.c}"><i>${d.tag}</i><span><b>${i+1} · ${d.name}</b>${DESC[d.id]}</span></button>`).join('');
$('menu').addEventListener('click',e=>{const b=e.target.closest('.mi');if(b)insert(b.dataset.d)});
function syncDrive(){const d=dOf(disk);[...$('rack').children].forEach(b=>b.classList.toggle('out',b.dataset.d===disk));
  $('lip').style.setProperty('--dc',d?d.c:'transparent');$('lip').style.opacity=d?1:0;$('dname').textContent=d?d.short:'EMPTY';$('dled').classList.toggle('on',!!d);$('ej').disabled=!d;
  setMarq(d?d.name:'DESIGN ARCADE');$('dl').classList.toggle('off',!d);$('dlT').textContent=d?'DOWNLOAD':'INSERT A DISK';}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function loc(el){const wr=world.getBoundingClientRect(),sc=wr.width/(W*P),b=el.getBoundingClientRect();return{x:(b.left-wr.left)/sc,y:(b.top-wr.top)/sc,w:b.width/sc,h:b.height/sc}}
function flyClone(d,b){const e=document.createElement('span');e.className='flop fly';e.style.cssText=`--dc:${d.c};left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transform-origin:0 0`;e.innerHTML=`<em>${d.tag}</em>`;world.appendChild(e);return e}
async function insert(id){
  if(state!=='on'||swapping||id===disk)return;swapping=true;
  const nd=dOf(id),m=loc($('mouth')),anim=!reduced,dled=$('dled');
  dled.classList.add('busy');clearTimeout(adv);busy=false;
  if(disk)await ejectAnim();
  // fly the new disk into the drive
  const fb=rackBtn(id).querySelector('.flop'),from=loc(fb);rackBtn(id).classList.add('out');sfx('lift');
  if(anim){
    const sc=Math.min(1,m.w*.84/from.w),tx=m.x+(m.w-from.w*sc)/2-from.x,yIn=m.y+m.h*.36,tyA=yIn-from.h*sc-from.y,tyI=yIn-from.y;
    const e=flyClone(nd,from);
    await e.animate([
      {transform:'translate(0px,0px) scale(1)',clipPath:'inset(0 0 0% 0)'},
      {transform:`translate(0px,${-from.h*.3}px) scale(1.08)`,clipPath:'inset(0 0 0% 0)',offset:.18},
      {transform:`translate(${tx}px,${tyA}px) scale(${sc})`,clipPath:'inset(0 0 0% 0)',offset:.7,easing:'linear'},
      {transform:`translate(${tx}px,${tyI}px) scale(${sc})`,clipPath:'inset(0 0 100% 0)'}
    ],{duration:950,easing:'cubic-bezier(.45,0,.25,1)',fill:'forwards'}).finished;
    e.remove();
  }
  disk=id;syncDrive();sfx('land');if(anim)setTimeout(()=>sfx('load'),120);
  const scr=$('screen');scr.dataset.disk='';$('ldName').textContent=nd.name;scr.classList.remove('ld');void scr.offsetWidth;scr.classList.add('ld');
  await wait(anim?720:0);
  scr.classList.remove('ld');scr.dataset.disk=id;dled.classList.remove('busy');sfx('boot');
  if(id==='principles'){if(cur().n in G2.answered){const k=pickUnseen();if(k<0){render(0);showClear()}else{pos=k;render(0)}}else render(0)}else renderTool(id);
  swapping=false;prerender();
  const first=scr.querySelector(`.prog[data-p="${id}"] button,.prog[data-p="${id}"] input`);if(first)first.focus({preventScroll:true});
}
async function ejectAnim(){
  const od=dOf(disk);if(!od)return;sfx('eject');const m=loc($('mouth')),back=loc(rackBtn(od.id).querySelector('.flop'));
  if(!reduced){
    const os=Math.min(1,m.w*.84/back.w),x0=m.x+(m.w-back.w*os)/2,y0=m.y+m.h*.36;
    const e=flyClone(od,{x:x0,y:y0,w:back.w,h:back.h});$('lip').style.opacity=0;
    await e.animate([
      {transform:`translate(0px,0px) scale(${os})`,clipPath:'inset(0 0 100% 0)'},
      {transform:`translate(0px,${-back.h*os}px) scale(${os})`,clipPath:'inset(0 0 0% 0)',offset:.4},
      {transform:`translate(${back.x-x0}px,${back.y-y0}px) scale(1)`,clipPath:'inset(0 0 0% 0)'}
    ],{duration:620,easing:'cubic-bezier(.45,0,.25,1)',fill:'forwards'}).finished;
    e.remove();
  }
  rackBtn(od.id).classList.remove('out');
}
async function eject(){
  if(state!=='on'||swapping||!disk)return;swapping=true;clearTimeout(adv);busy=false;
  $('dled').classList.add('busy');await ejectAnim();
  disk='';syncDrive();$('dled').classList.remove('busy');$('screen').dataset.disk='';swapping=false;
  const f=$('menu').querySelector('.mi');if(f)f.focus({preventScroll:true});
}
$('ej').onclick=eject;
$('rack').addEventListener('click',e=>{const b=e.target.closest('.disk');if(b)insert(b.dataset.d)});

let TS={c:{f:'#7a8a99',b:'#ffffff'},t:{base:16,ratio:'1.25',shrink:80},g:{w:1440,c:12,gut:24,m:80}};
try{const v=JSON.parse(localStorage.getItem('uxl-tools')||'null');if(v&&v.c&&v.t&&v.g)TS=v}catch(e){}
const saveTS=()=>{try{localStorage.setItem('uxl-tools',JSON.stringify(TS))}catch(e){}};
const kt=n=>+(+n).toFixed(3),f2=n=>(Math.round(n*100)/100).toFixed(2);
const hexP=h=>{h=String(h||'').trim().replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');return /^[0-9a-f]{6}$/i.test(h)?[0,2,4].map(i=>parseInt(h.substr(i,2),16)):null};
const toHex=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const lum=a=>{const [r,g3,b]=a.map(u=>(u/=255,u<=.03928?u/12.92:((u+.055)/1.055)**2.4));return .2126*r+.7152*g3+.0722*b};
const cratio=(a,b)=>{const i=lum(a),j=lum(b);return(Math.max(i,j)+.05)/(Math.min(i,j)+.05)};
const CHECKS=[['AA BODY 4.5',4.5],['AA LARGE 3',3],['AAA BODY 7',7],['UI ICONS 3',3]];
function cState(){const F=hexP(TS.c.f),B=hexP(TS.c.b);return{F,B,rt:F&&B?cratio(F,B):1}}
function rContrast(){
  const {F,B,rt}=cState(),hp=Math.round(Math.max(0,Math.min(100,(4.5-rt)/3.5*100)));
  if(F){$('cF').value=toHex(F);if(document.activeElement!==$('cFt'))$('cFt').value=toHex(F)}
  if(B){$('cB').value=toHex(B);if(document.activeElement!==$('cBt'))$('cBt').value=toHex(B)}
  const p=$('cPrev');p.style.background=B?toHex(B):'';p.style.color=F?toHex(F):'';
  $('cRatio').textContent=f2(rt)+' : 1';$('eHp').style.width=hp+'%';$('eLv').textContent='LV '+Math.max(1,Math.ceil(hp/20));
  $('cChips').innerHTML=CHECKS.map(([k,v])=>`<div class="chip ${rt>=v?'ok':'no'}">${k}<b>${rt>=v?'PASS':'FAIL'}</b></div>`).join('');
  $('cMsg').textContent=!F||!B?'Enter colours as hex, like #1a1a1a.':rt>=7?'Flawless victory. Even AAA bows to you.':rt>=4.5?'Enemy defeated! AAA needs 7:1 — hit Special move again to go for it.':rt>=3?'The enemy is wounded. OK for large text and icons only.':'The enemy laughs. Most people will struggle to read this.';
}
function special(){
  const {F,B,rt}=cState();if(!F||!B)return;
  const goal=rt<4.5?4.5:rt<7?7:0;if(!goal){sfx('fail');$('cMsg').textContent='Already AAA. Nothing left to beat.';return}
  const tryTo=t=>{for(let k=0;k<=1.0001;k+=.01){const c=F.map((v,i)=>v+(t[i]-v)*k);if(cratio(c,B)>=goal)return{c,k}}return null};
  const w=[tryTo([0,0,0]),tryTo([255,255,255])].filter(Boolean).sort((a,b)=>a.k-b.k);
  if(!w.length){sfx('fail');$('cMsg').textContent=goal===7?'AAA isn\'t possible on this background. Try a darker or lighter background.':'No text colour can win on this background.';return}
  TS.c.f=toHex(w[0].c);saveTS();rContrast();$('cMsg').textContent=`Special move! ${TS.c.f} now passes ${goal===7?'AAA (7:1)':'AA (4.5:1)'}.`;tilt('r');sfx('special');
}
const RATIOS=[['1.2','SUBTLE'],['1.25','BALANCED'],['1.333','BOLD'],['1.5','DRAMATIC']],BASES=[14,16,18,20];
$('tBase').innerHTML=BASES.map(b=>`<button data-v="${b}">${b}PX</button>`).join('');
$('tRatio').innerHTML=RATIOS.map(([v,n])=>`<button data-v="${v}">${n}<small>×${v}</small></button>`).join('');
if(!RATIOS.some(r=>r[0]===TS.t.ratio))TS.t.ratio='1.25';if(!BASES.includes(TS.t.base))TS.t.base=16;TS.t.shrink=80;
function steps(){const t=TS.t,q=parseFloat(t.ratio),v1=360,v2=1440,names=['h1','h2','h3','h4','h5','body','small','tiny'];
  return [5,4,3,2,1,0,-1,-2].map((b,i)=>{const w=t.base*q**b,lh=Math.max(1.1,Math.min(1.6,1.6-b*.1)),y=b>0?Math.max(t.base,w*(t.shrink/100)):w,E=(w-y)/(v2-v1),C=y-E*v1;
    return{n:names[i],px:w,lh,cl:b>0?`clamp(${kt(y/16)}rem, ${kt(C/16)}rem + ${kt(E*100)}vw, ${kt(w/16)}rem)`:`${kt(w/16)}rem`}})}
const tokens=()=>':root{\n'+steps().map(s2=>`  --fs-${s2.n}: ${s2.cl};\n  --lh-${s2.n}: ${kt(s2.lh)};`).join('\n')+'\n}';
function rType(){
  const t=TS.t;[...$('tBase').children].forEach(b=>b.classList.toggle('on',+b.dataset.v===t.base));[...$('tRatio').children].forEach(b=>b.classList.toggle('on',b.dataset.v===t.ratio));
  $('tList').innerHTML=steps().map(s2=>`<div class="srow"><code><b>${s2.n.toUpperCase()}</b><br>${Math.round(s2.px)}PX</code><span style="font-size:min(${(Math.min(s2.px,40)/7).toFixed(2)}cqw,calc(${Math.min(s2.px,34).toFixed(1)}px / var(--z)))">Level up</span></div>`).join('');
}
const PRE=[['DESKTOP',1440,12,24,80],['TABLET',1024,8,20,40],['IPHONE',390,4,16,20],['ANDROID',360,4,16,16]];
$('gPre').innerHTML=PRE.map(([n],i)=>`<button data-i="${i}">${n}</button>`).join('');
function gCalc(){const g3=TS.g,u=g3.w-2*g3.m,f=(u-(g3.c-1)*g3.gut)/g3.c;return{u,f,span:n=>n<=g3.c?kt(f*n+g3.gut*(n-1))+'px':'—',pp:f>0&&Number.isInteger(kt(f))}}
function rGrid(){
  const g3=TS.g,{u,f,span,pp}=gCalc();
  [['gW','w'],['gG','gut'],['gM','m']].forEach(([id,k])=>{if(document.activeElement!==$(id))$(id).value=g3[k]});$('gC').value=g3.c;$('gCv').textContent=g3.c;
  [...$('gPre').children].forEach((b,i)=>{const p=PRE[i];b.classList.toggle('on',p[1]===g3.w&&p[2]===g3.c&&p[3]===g3.gut&&p[4]===g3.m)});
  const pv=$('gPrev');pv.style.padding=`0 ${Math.max(0,g3.m/g3.w*100)}%`;pv.style.gap=`${Math.max(0,g3.gut/g3.w*100)}%`;pv.innerHTML=f>0?'<i></i>'.repeat(g3.c):'';
  const st=$('gStat');st.textContent=f<=0?'TOO TIGHT':pp?'PIXEL PERFECT':'SUB-PIXEL';st.className=f>0&&pp?'':'warn';
  $('gCol').textContent=(f>0?kt(f):0)+'px';
  $('gList').innerHTML=[['CONTENT',kt(u)+'px'],['SPAN 6',span(6)],['SPAN 4',span(4)],['SPAN 3',span(3)]].map(([k,v])=>`<div class="kv">${k}<b>${v}</b></div>`).join('');
}
function renderTool(id){if(id==='contrast')rContrast();else if(id==='type')rType();else if(id==='grid')rGrid()}
function toolShuffle(){
  if(disk==='contrast'){const rh=()=>toHex([0,0,0].map(()=>Math.random()*255));TS.c={f:rh(),b:rh()}}
  else if(disk==='type'){TS.t={...TS.t,base:BASES[Math.floor(Math.random()*BASES.length)],ratio:RATIOS[Math.floor(Math.random()*RATIOS.length)][0]}}
  else if(disk==='grid'){const i=([...$('gPre').children].findIndex(b=>b.classList.contains('on'))+1)%PRE.length,p=PRE[i];TS.g={w:p[1],c:p[2],gut:p[3],m:p[4]}}
  saveTS();renderTool(disk);prerender();sfx('reveal');
  const pr=$('screen').querySelector(`.prog[data-p="${disk}"]`);pr.classList.remove('swap');void pr.offsetWidth;
  const f=$('flash');f.classList.remove('go');void f.offsetWidth;if(!reduced)f.classList.add('go');
}
async function copyTxt(btn,txt){const o=btn.textContent;try{await navigator.clipboard.writeText(txt);btn.textContent='COPIED!';sfx('copy')}catch(e){sfx('fail');btn.textContent='CAN\'T COPY'}setTimeout(()=>btn.textContent=o,1300)}
// wiring
const num2=(v,lo,hi,d)=>{v=parseFloat(v);return isFinite(v)?Math.max(lo,Math.min(hi,v)):d};
['cF','cB'].forEach(id=>$(id).addEventListener('input',e=>{TS.c[id==='cF'?'f':'b']=e.target.value;sfx('tick');saveTS();rContrast();prerender()}));
['cFt','cBt'].forEach(id=>$(id).addEventListener('input',e=>{sfx('tick');if(hexP(e.target.value)){TS.c[id==='cFt'?'f':'b']=toHex(hexP(e.target.value));saveTS();rContrast();prerender()}}));
$('cSpecial').onclick=()=>{special();saveTS();prerender()};
$('cSwap').onclick=()=>{sfx('swap');TS.c={f:TS.c.b,b:TS.c.f};saveTS();rContrast();prerender();tilt('l')};
$('cCopy').onclick=e=>{const {rt}=cState();copyTxt(e.currentTarget,`Text ${TS.c.f} on ${TS.c.b} = ${f2(rt)}:1 (${CHECKS.map(([k,v])=>k+' '+(rt>=v?'pass':'fail')).join(', ')})`)};
$('tBase').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sfx('key');TS.t.base=+b.dataset.v;saveTS();rType();prerender()});
$('tRatio').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sfx('key');TS.t.ratio=b.dataset.v;saveTS();rType();prerender()});
$('tCopy').onclick=e=>copyTxt(e.currentTarget,tokens());
[['gW','w',100,4000],['gG','gut',0,200],['gM','m',0,800]].forEach(([id,k,lo,hi])=>$(id).addEventListener('input',e=>{sfx('tick');TS.g[k]=num2(e.target.value,lo,hi,TS.g[k]);saveTS();rGrid();prerender()}));
$('gC').addEventListener('input',e=>{sfx('tick');TS.g.c=+e.target.value;saveTS();rGrid();prerender()});
$('gPre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sfx('key');const p=PRE[+b.dataset.i];TS.g={w:p[1],c:p[2],gut:p[3],m:p[4]};saveTS();rGrid();prerender()});
$('gCopy').onclick=e=>{const {f,u}=gCalc(),g3=TS.g;copyTxt(e.currentTarget,`Frame ${g3.w}px · ${g3.c} columns · column ${kt(f)}px · gutter ${g3.gut}px · margin ${g3.m}px · content ${kt(u)}px`)};
syncDrive();

/* ---------- start / exit ---------- */
let timer;
function start(){
  if(state!=='start')return;state='zooming';document.body.className='zooming';sfx('start');
  world.classList.toggle('anim',!reduced);applyT();
  clearTimeout(timer);timer=setTimeout(()=>{state='on';document.body.className='on';sfx('power');world.classList.remove('anim');$('screen').dataset.disk=disk;{const k=pickUnseen();if(k>=0)pos=k}const f=$('menu').querySelector('.mi');if(f)f.focus({preventScroll:true})},reduced?0:1500);
}
async function exit(){
  if(state!=='on'||swapping)return;
  if(disk){swapping=true;clearTimeout(adv);busy=false;$('dled').classList.add('busy');await ejectAnim();disk='';syncDrive();$('dled').classList.remove('busy');$('screen').dataset.disk='';swapping=false;await wait(reduced?0:250)}
  sfx('exit');state='start';document.body.className='start';
  world.classList.toggle('anim',!reduced);applyT();
  clearTimeout(timer);timer=setTimeout(()=>world.classList.remove('anim'),1550);$('start').focus({preventScroll:true});
}

/* ---------- download ---------- */
function wrap(x,t,max){const out=[];let line='';for(const w of t.split(' ')){const s2=line?line+' '+w:w;if(x.measureText(s2).width>max&&line){out.push(line);line=w}else line=s2}if(line)out.push(line);return out}
function toolLine(){
  if(disk==='contrast'){const {rt}=cState();return `TEXT ${TS.c.f} ON ${TS.c.b} · ${f2(rt)}:1`}
  if(disk==='type')return `BODY ${TS.t.base}PX · ${(RATIOS.find(r=>r[0]===TS.t.ratio)||['',''])[1]} SCALE ×${TS.t.ratio}`;
  const {f}=gCalc();return `${TS.g.w}PX FRAME · ${TS.g.c} COLS · ${kt(f)}PX`;
}
function drawToolCard(x,T,r,sx,sy,sw,sh,cxm,M){
  const L=sx+70,Wd=sw-140;x.textAlign='center';
  const hdr={contrast:'BOSS · CONTRAST FIGHT',type:'FORGE · TYPE SCALE',grid:'MAP · LAYOUT GRID'}[disk];
  T(hdr,cxm,sy+150,'700 28px Silkscreen','#5fb8ff');x.fillStyle='#ff4fae';x.font='700 24px Silkscreen';const hw=x.measureText(hdr).width*1.17;x.fillText('◆',cxm-hw/2-30,sy+148);x.fillText('◆',cxm+hw/2+30,sy+148);
  if(disk==='contrast'){
    const {F,B,rt}=cState();
    r(L-6,sy+200,Wd+12,252,'#ffffff');r(L,sy+206,Wd,240,B?toHex(B):'#000');
    x.font='italic 900 110px Rubik';x.fillStyle=F?toHex(F):'#fff';x.fillText('Aa Pixel',cxm,sy+366);
    T(f2(rt)+' : 1',cxm,sy+560,'italic 900 92px Rubik','#ffffff',1);
    const cw2=(Wd-36)/4;CHECKS.forEach(([k,v],i)=>{const ok=rt>=v,bx=L+i*(cw2+12);x.strokeStyle=ok?'#c6f432':'#8a1f5c';x.lineWidth=4;x.strokeRect(bx,sy+610,cw2,96);T(k,bx+cw2/2,sy+650,'700 16px Silkscreen',ok?'#c6f432':'#ff8fc8');T(ok?'PASS':'FAIL',bx+cw2/2,sy+688,'700 26px Silkscreen',ok?'#c6f432':'#ff8fc8')});
  }else if(disk==='type'){
    const st=steps();let y=sy+200;r(L,y,Wd,520,'#05081f');x.strokeStyle='#2f4bd8';x.lineWidth=4;x.strokeRect(L,y,Wd,520);
    st.forEach((s2,i)=>{const ry=y+i*65;x.textAlign='left';T(s2.n.toUpperCase(),L+24,ry+30,'700 18px Silkscreen','#5fb8ff');T(Math.round(s2.px)+'PX',L+24,ry+54,'700 16px Silkscreen','#8f9bd8');
      x.font=`700 ${Math.min(58,s2.px*1.15).toFixed(1)}px "Pixelify Sans"`;x.fillStyle='#fff';x.fillText('Level up',L+170,ry+48);if(i<7)r(L+16,ry+64,Wd-32,2,'rgba(255,255,255,.15)')});
    x.textAlign='center';
  }else{
    const g3=TS.g,{u,f,span,pp}=gCalc();const by=sy+200,bh=130;r(L-6,by-6,Wd+12,bh+12,'#ffffff');r(L,by,Wd,bh,'#1f2580');
    if(f>0){const mp=g3.m/g3.w*Wd,gp=g3.gut/g3.w*Wd,cwp=(Wd-2*mp-(g3.c-1)*gp)/g3.c;for(let i=0;i<g3.c;i++)r(L+mp+i*(cwp+gp),by,cwp,bh,'rgba(255,79,174,.7)')}
    T(f<=0?'TOO TIGHT':pp?'PIXEL PERFECT':'SUB-PIXEL',cxm,by+bh+70,'700 26px Silkscreen',f>0&&pp?'#c6f432':'#ff4fae');
    T((f>0?kt(f):0)+'px',cxm,by+bh+190,'italic 900 110px Rubik','#ffffff',1);
    T('COLUMN WIDTH',cxm,by+bh+235,'700 20px Silkscreen','#cfd8ff');
    [['FRAME',g3.w+'px'],['COLUMNS',String(g3.c)],['GUTTER',g3.gut+'px'],['MARGIN',g3.m+'px'],['SPAN 6',span(6)],['SPAN 4',span(4)]].forEach(([k,v],i)=>{const col=i%2,row=Math.floor(i/2),bx=L+col*(Wd/2+6),bw=Wd/2-6,yy=by+bh+270+row*58;x.strokeStyle='#2f4bd8';x.lineWidth=3;x.strokeRect(bx,yy,bw,48);x.textAlign='left';T(k,bx+16,yy+32,'700 18px Silkscreen','#cfd8ff');x.textAlign='right';T(v,bx+bw-16,yy+32,'700 20px Silkscreen','#ffffff')});
    x.textAlign='center';
  }
}
/* next/font serves the fonts under hashed family names (exposed as CSS variables in app/layout.tsx),
   so canvas font strings written with the plain names are mapped to the real ones here. */
const FAM=(()=>{const cs=getComputedStyle(document.documentElement),v=(n,f)=>cs.getPropertyValue(n).trim()||f;
  return {Rubik:v('--font-rubik','Rubik'),Silkscreen:v('--font-silkscreen','Silkscreen'),'"Pixelify Sans"':v('--font-pixelify','"Pixelify Sans"')}})();
const fam=f=>f.replace(/"Pixelify Sans"|Rubik|Silkscreen/g,m=>FAM[m]);
const FONT=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'font');
async function makePNG(){
  const l=cur(),dd=dOf(disk);
  try{await Promise.all(['italic 900 80px Rubik','500 40px "Pixelify Sans"','400 34px "Pixelify Sans"','700 26px Silkscreen'].map(f=>document.fonts.load(fam(f))))}catch(e){}
  const W2=1080,H2=1350,c=document.createElement('canvas');c.width=W2;c.height=H2;const x=c.getContext('2d');Object.defineProperty(x,'font',{get(){return FONT.get.call(this)},set(f){FONT.set.call(this,fam(f))}});
  const r=(a,b2,w,h,col)=>{x.fillStyle=col;x.fillRect(Math.round(a),Math.round(b2),Math.round(w),Math.round(h))};
  const Q=10;
  for(let yy=0;yy<H2;yy+=Q)for(let xx=0;xx<W2;xx+=Q){const k=yy<1150?pick(SKY,yy/1150,xx/Q,yy/Q):pick(GRASS,(yy-1150)/200*.8+.15,xx/Q,yy/Q);r(xx,yy,Q,Q,`rgb(${k})`)}
  const cl=(cx,cy,sz)=>{[[0,0,1],[-.9,.25,.7],[.9,.25,.75],[-.45,-.35,.7],[.4,-.45,.8],[1.6,.45,.5],[-1.6,.5,.45]].forEach(([a,b2,rr])=>{x.fillStyle='#fff';const R2=rr*sz;for(let y=-R2;y<=R2;y+=Q){const w=Math.sqrt(R2*R2-y*y);x.fillRect(Math.round((cx+a*sz-w)/Q)*Q,Math.round((cy+b2*sz+y)/Q)*Q,Math.round(w*2/Q)*Q,Q)}})};
  cl(60,120,60);cl(1040,260,70);
  r(0,1150,W2,4,'#6fbf1f');r(0,1230,W2,4,'#6fbf1f');
  const mx=150,mw=780,my=40,mh=120;
  r(mx+120,my+mh,18,60,PD);r(mx+mw-138,my+mh,18,60,PD);
  r(mx-6,my-6,mw+12,mh+12,NV);r(mx,my,mw,mh,PU);r(mx+12,my+12,mw-24,mh-24,'#0b1033');
  x.font='700 50px Silkscreen';x.textAlign='center';x.fillStyle='#c6f432';x.shadowColor='rgba(198,244,50,.7)';x.shadowBlur=18;x.fillText(dd.name,W2/2,my+mh/2+22);x.shadowBlur=0;
  x.fillStyle='#ff4fae';x.font='700 30px Silkscreen';x.fillText('◆',mx+50,my+mh/2+12);x.fillText('◆',mx+mw-50,my+mh/2+12);
  const cx0=110,cw=860,cy0=220;
  r(cx0-6,cy0-6,cw+12,880+12,NV);r(cx0,cy0,cw,880,PU);r(cx0,cy0,12,880,PL);r(cx0+cw-12,cy0,12,880,PD);
  const sx=cx0+50,sy=cy0+50,sw=cw-100,sh=780;
  r(sx-14,sy-14,sw+28,sh+28,PDD);r(sx,sy,sw,sh,'#0b1033');
  const L=40;[[sx+14,sy+14,1,1],[sx+sw-14,sy+14,-1,1],[sx+14,sy+sh-14,1,-1],[sx+sw-14,sy+sh-14,-1,-1]].forEach(([a,b2,u,v])=>{r(u>0?a:a-L,b2-(v>0?0:6),L,6,'#c6f432');r(a-(u>0?0:6),v>0?b2:b2-L,6,L,'#c6f432')});
  const T=(t,tx,ty,font,col,sh2)=>{x.font=font;if(sh2){x.fillStyle='#0b1033';x.fillText(t,tx+8,ty+8);x.fillStyle='#2f5bff';x.fillText(t,tx+4,ty+4)}x.fillStyle=col;x.fillText(t,tx,ty)};
  const cxm=sx+sw/2,M=sw-120;x.textAlign='left';
  T(disk==='principles'?'#'+num(l.n):dd.short,sx+50,sy+70,'700 24px Silkscreen','#cfd8ff');x.textAlign='right';T(disk==='principles'?'DESIGN PRINCIPLES':'DESIGN ARCADE',sx+sw-50,sy+70,'700 24px Silkscreen','#cfd8ff');x.textAlign='center';
  if(disk!=='principles'){drawToolCard(x,T,r,sx,sy,sw,sh,cxm,M)}else{
  let y=sy+160;T(CAT[l.cat],cxm,y,'700 28px Silkscreen','#5fb8ff');x.fillStyle='#ff4fae';x.font='700 24px Silkscreen';const cwid=x.measureText(CAT[l.cat]).width*1.17;x.fillText('◆',cxm-cwid/2-30,y-2);x.fillText('◆',cxm+cwid/2+30,y-2);
  let fs=80,lines;const ttl=l.title.toUpperCase();do{x.font=`italic 900 ${fs}px Rubik`;lines=wrap(x,ttl,M);fs-=2}while((lines.length>2||lines.some(t=>x.measureText(t).width>M))&&fs>44);fs+=2;
  y+=20;lines.forEach(t=>{y+=fs;T(t,cxm,y,`italic 900 ${fs}px Rubik`,'#ffffff',1)});
  y+=24;x.font='500 40px "Pixelify Sans"';wrap(x,l.def,M).forEach(t=>{y+=50;T(t,cxm,y,'500 40px "Pixelify Sans"','#ffffff')});
  x.font='400 34px "Pixelify Sans"';const tl=wrap(x,l.tip,M-80);const bh=60+tl.length*44+30;y+=44;
  r(sx+70,y,sw-140,bh,'rgba(11,16,51,.85)');x.strokeStyle='#2f4bd8';x.lineWidth=4;x.strokeRect(sx+70,y,sw-140,bh);r(sx+56,y+bh*.3,6,bh*.4,'#5fb8ff');r(sx+sw-62,y+bh*.3,6,bh*.4,'#5fb8ff');
  T('APPLY IT',cxm,y+50,'700 24px Silkscreen','#ff4fae');let ty=y+60;tl.forEach(t=>{ty+=44;T(t,cxm,ty,'400 34px "Pixelify Sans"','#ffffff')});
  }
  const dy=cy0+880;r(cx0-46,dy,cw+92,110,NV);r(cx0-40,dy+6,cw+80,44,PL);r(cx0-40,dy+50,cw+80,54,PU);
  const jx=cx0+120;r(jx-50,dy+36,100,22,'#14123a');r(jx-7,dy-6,14,48,'#1d1d2b');x.fillStyle='#f02a2a';x.beginPath();x.arc(jx,dy-12,28,0,7);x.fill();x.fillStyle='#ff8a8a';x.beginPath();x.arc(jx-9,dy-20,8,0,7);x.fill();
  {const dx2=cx0+700;r(dx2,dy+10,170,52,'#14123a');r(dx2+4,dy+14,162,44,'#2a1a6e');r(dx2+14,dy+30,142,12,'#03031a');r(dx2+22,dy+27,126,6,dOf(disk).c);r(dx2+150,dy+46,10,10,'#ffd23a');}
  [['#ffd23a','#e8a10c',cx0+400],['#ff4a3d','#c81e1e',cx0+560]].forEach(([a,b2,bx])=>{x.fillStyle=b2;x.beginPath();x.arc(bx,dy+34,34,0,7);x.fill();x.fillStyle=a;x.beginPath();x.arc(bx,dy+28,30,0,7);x.fill()});
  r(cx0-6,dy+110,cw+12,130,NV);r(cx0,dy+110,cw,124,'#6a3be0');r(sx,dy+130,sw,84,'#0b1033');x.strokeStyle='#2f4bd8';x.strokeRect(sx,dy+130,sw,84);
  T((disk==='principles'?'SOURCE: '+l.src:toolLine()).toUpperCase().slice(0,46),cxm,dy+184,'700 24px Silkscreen','#c6f432');
  return c;
}
let dlApi=null,pre=null,preT;
(async()=>{try{if(window.claude&&typeof claude.use==='function')dlApi=await claude.use('downloads')}catch(e){}})();
const toBlob=c=>new Promise(r=>c.toBlob(r,'image/png'));
const preKey=()=>disk+':'+(disk==='principles'?cur().n:JSON.stringify(disk==='contrast'?TS.c:disk==='type'?TS.t:TS.g));
async function build(){const k=preKey();if(pre&&pre.k===k)return pre;const c=await makePNG();const blob=await toBlob(c);pre={k,blob,url:c.toDataURL('image/png')};return pre}
function prerender(){if(!disk)return;clearTimeout(preT);preT=setTimeout(()=>{build().catch(()=>{})},400)}
const slug=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function dlLabel(t,ok){if(t==='SAVING…')sfx('saving');else if(t==='SAVED!')sfx('saved');else if(t==='TRY AGAIN')sfx('fail');$('dlT').textContent=t==='DOWNLOAD'&&!disk?'INSERT A DISK':t;$('dl').classList.toggle('ok',!!ok)}
async function download(){
  if(!disk){$('dl').classList.remove('off');void $('dl').offsetWidth;$('dl').classList.add('off');tilt('w');sfx('fail');return}
  const l=cur(),name=disk==='principles'?`design-principle-${num(l.n)}-${slug(l.title)}.png`:disk==='contrast'?`contrast-fight-${TS.c.f.slice(1)}-on-${TS.c.b.slice(1)}.png`:disk==='type'?`type-scale-${TS.t.base}-${TS.t.ratio}.png`:`layout-grid-${TS.g.w}-${TS.g.c}col.png`;
  dlLabel('SAVING…');
  let img;try{img=await build()}catch(e){dlLabel('TRY AGAIN');setTimeout(()=>dlLabel('DOWNLOAD'),1500);return}
  if(dlApi){
    try{await dlApi.save({filename:name,data:img.blob});dlLabel('SAVED!',1);setTimeout(()=>dlLabel('DOWNLOAD'),1600);return}
    catch(e){if(e&&e.code==='declined'){dlLabel('DOWNLOAD');return}}
  }
  // Phones: native share sheet (iOS "Save Image" puts it in Photos). Desktop: normal file download.
  try{const file=new File([img.blob],name,{type:'image/png'});
    if(matchMedia('(pointer:coarse)').matches&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:name});dlLabel('SAVED!',1);setTimeout(()=>dlLabel('DOWNLOAD'),1600);return}
      catch(e){if(e&&e.name==='AbortError'){dlLabel('DOWNLOAD');return}}
    }}catch(e){}
  try{const u=URL.createObjectURL(img.blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}catch(e){}
  dlLabel('DOWNLOAD');
  let framed=true;try{framed=window.self!==window.top}catch(e){}
  if(!framed){dlLabel('SAVED!',1);setTimeout(()=>dlLabel('DOWNLOAD'),1600);return}
  $('sheet').hidden=false;$('sheetBody').innerHTML=`<img src="${img.url}" alt="${disk==='principles'?l.title:dOf(disk).name} arcade card">`;$('close').focus();
}
const closeSheet=()=>{sfx('tap');$('sheet').hidden=true;$('dl').focus({preventScroll:true})};

/* ---------- events ---------- */
$('start').onclick=start;$('exit').onclick=exit;
$('shuf').onclick=shuffle;joy.onclick=shuffle;$('dl').onclick=download;
$('yes').onclick=()=>answer(true);$('no').onclick=()=>answer(false);$('again').onclick=again;
$('close').onclick=closeSheet;$('sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
$('copy').onclick=async()=>{const l=cur(),b2=$('copy');try{await navigator.clipboard.writeText(disk==='principles'?`${l.title}\n${l.def}\nApply it: ${l.tip}\nSource: ${l.src}`:disk==='type'?tokens():toolLine());b2.textContent='COPIED';sfx('copy')}catch(e){b2.textContent='CAN\'T COPY'}setTimeout(()=>b2.textContent='COPY TEXT',1500)};
document.addEventListener('keydown',e=>{
  if(!$('sheet').hidden){if(e.key==='Escape')closeSheet();return}
  if(e.key.toLowerCase()==='m'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!(document.activeElement&&/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName))){FX.toggle();return}
  if(state==='start'){if(e.key==='Enter'||e.key===' '){e.preventDefault();start()}return}
  if(state!=='on')return;
  const k=e.key.toLowerCase();
  if(document.activeElement&&/^(INPUT|SELECT)$/.test(document.activeElement.tagName)){if(e.key==='Escape')document.activeElement.blur();return}
  if(/^[1-4]$/.test(k)){insert(DISKS[+k-1].id);return}
  if(k==='e'){eject();return}
  if(k==='y')answer(true);else if(k==='n')answer(false);
  else if(e.key===' '&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();shuffle()}
  else if(k==='d')download();else if(e.key==='Escape')exit();
});
let px0=null;
$('screen').addEventListener('pointerdown',e=>{px0=e.clientX});
$('screen').addEventListener('pointerup',e=>{if(px0===null||state!=='on')return;const dx=e.clientX-px0;px0=null;if(Math.abs(dx)>40&&disk==='principles')shuffle()});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{world.classList.remove('anim');layout()},120)});
if(matchMedia('(hover:hover)').matches)document.querySelector('.hint').textContent='Click anywhere or press Enter to start';
addEventListener('scroll',()=>{if(scrollX||scrollY)scrollTo(0,0)});
['screen','deck','lower','marq'].forEach(id=>$(id).addEventListener('scroll',e=>{e.target.scrollTop=0;e.target.scrollLeft=0}));
layout();requestAnimationFrame(frame);
}
