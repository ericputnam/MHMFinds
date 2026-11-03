/**
 * short-video-motion-lib.ts — the animated composition behind short-video-frames.ts (Pip).
 *
 * One draft → one timeline → one self-contained HTML page with a deterministic
 * `window.__seek(t)`. The CLI steps t at FPS, screenshots each frame and pipes the
 * JPEGs into ffmpeg, so every frame is reproducible (no wall-clock CSS animation).
 *
 *   hook  ─ word-by-word slam over a fast montage of every mod image (or a brand opener)
 *   mod×N ─ whip-in card, push-in/pan on the creator's image, pop-in rank number,
 *           caption pill (the draft's Text line), title highlight wipe, "by <creator>"
 *   end   ─ tiled grid of every image, destination pill, creators credited
 *
 * Layout respects TikTok/Reels/Shorts UI: nothing important in the top 150 px,
 * the right 140 px (action rail) or the bottom ~450 px (caption + music bar).
 *
 * Copy rule (growth-plan.md): every word is the draft's — hook, Text lines, mod titles,
 * creators, destination. The only fixed strings are the CTA labels on the end card.
 * `*word*` in the draft's Hook line renders that word on a pink highlight.
 *
 * sfxWav() synthesizes the sound design (boom, ticks, whooshes, pops, chime) as a
 * 16-bit WAV from a seeded PRNG, so the soundtrack is ours and deterministic. Posters
 * who want a trending sound use the silent mp4 and add it in-app.
 */
import { type DraftMod, type ParsedDraft, displayDestination, escapeHtml } from './short-video-frames-lib';

export const FPS = 30;
export const END_SECONDS = 2.8;
export const OPEN_SECONDS = 1.1;

export interface HookWord {
  text: string;
  em: boolean;
}

export type Scene =
  | { kind: 'hook'; t0: number; t1: number; words: HookWord[] }
  | { kind: 'mod'; t0: number; t1: number; index: number; mod: DraftMod; caption: string | null }
  | { kind: 'end'; t0: number; t1: number; destination: string; creators: string[] };

export interface Timeline {
  scenes: Scene[];
  duration: number;
  mods: DraftMod[];
}

/** `*actually*,` → { text: 'actually,', em: true } */
export function hookWords(hook: string): HookWord[] {
  return hook
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^\*(.+)\*([.,!?…]*)$/);
      return m ? { text: m[1] + m[2], em: true } : { text: w, em: false };
    });
}

/** When word k of the hook lands (seconds from 0). */
export function hookWordTime(k: number): number {
  return 0.15 + k * 0.13;
}

export function hookSeconds(words: number): number {
  return words ? Math.min(2.4, Math.max(1.6, hookWordTime(words - 1) + 0.9)) : OPEN_SECONDS;
}

/** Faster cuts for longer lists: 3 mods → 2.6 s each, 7+ → ~2.2 s, never under 1.9 s. */
export function modSeconds(n: number): number {
  return Math.min(2.6, Math.max(1.9, 2.6 - 0.1 * Math.max(0, n - 3)));
}

const round = (x: number) => Math.round(x * 1000) / 1000;

export function buildTimeline(d: ParsedDraft): Timeline {
  const words = d.hook ? hookWords(d.hook) : [];
  const scenes: Scene[] = [{ kind: 'hook', t0: 0, t1: hookSeconds(words.length), words }];
  let t = scenes[0].t1;
  const per = modSeconds(d.mods.length);
  d.mods.forEach((mod, index) => {
    scenes.push({ kind: 'mod', t0: round(t), t1: round(t + per), index, mod, caption: d.texts[index] ?? null });
    t += per;
  });
  const creators = Array.from(new Set(d.mods.map((m) => m.creator)));
  scenes.push({ kind: 'end', t0: round(t), t1: round(t + END_SECONDS), destination: displayDestination(d.targetUrl), creators });
  return { scenes, duration: round(t + END_SECONDS), mods: d.mods };
}

export function frameCount(tl: Timeline, fps = FPS): number {
  return Math.ceil(tl.duration * fps);
}

/** WordPress serves "-1024x576" variants; try the original upload first, then the variant. */
export function fullResCandidates(url: string): string[] {
  const original = url.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1');
  return original === url ? [url] : [original, url];
}

/** Times for still frames (photo mode / carousel): each scene once everything has landed. */
export function stillTimes(tl: Timeline): number[] {
  return tl.scenes.map((s) => round(s.t0 + (s.t1 - s.t0) * (s.kind === 'hook' ? 0.8 : 0.78)));
}

/** Cover frame: the hook fully landed, or the first mod card if there is no hook. */
export function coverTime(tl: Timeline): number {
  const [hook, first] = tl.scenes;
  return hook.kind === 'hook' && hook.words.length ? stillTimes(tl)[0] : first ? stillTimes(tl)[1] : 0;
}

// ---------------------------------------------------------------- sound design

export type SfxKind = 'boom' | 'tick' | 'whoosh' | 'pop' | 'chime';

export function sfxEvents(tl: Timeline): Array<{ t: number; kind: SfxKind }> {
  const ev: Array<{ t: number; kind: SfxKind }> = [{ t: 0, kind: 'boom' }];
  for (const s of tl.scenes) {
    if (s.kind === 'hook') s.words.forEach((_, k) => ev.push({ t: round(hookWordTime(k)), kind: 'tick' }));
    if (s.kind === 'mod') ev.push({ t: round(Math.max(0, s.t0 - 0.12)), kind: 'whoosh' }, { t: round(s.t0 + 0.14), kind: 'pop' });
    if (s.kind === 'end') ev.push({ t: round(s.t0 - 0.12), kind: 'whoosh' }, { t: round(s.t0 + 0.38), kind: 'chime' });
  }
  return ev.sort((a, b) => a.t - b.t);
}

export function sfxWav(tl: Timeline, sampleRate = 44100): Buffer {
  const n = Math.ceil(tl.duration * sampleRate);
  const mix = new Float32Array(n);
  let seed = 0x9e3779b9;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x80000000 - 1;
  };
  const add = (t: number, dur: number, fn: (x: number, i: number) => number) => {
    const start = Math.floor(t * sampleRate);
    const len = Math.floor(dur * sampleRate);
    for (let i = 0; i < len && start + i < n; i++) mix[start + i] += fn(i / len, i);
  };
  for (const e of sfxEvents(tl)) {
    if (e.kind === 'boom') {
      let ph = 0;
      add(e.t, 0.7, (x, i) => {
        ph += (2 * Math.PI * 70 * (1 - 0.35 * x)) / sampleRate;
        return 0.6 * Math.sin(ph) * Math.exp(-x * 4) + (i < sampleRate * 0.03 ? 0.25 * noise() * (1 - i / (sampleRate * 0.03)) : 0);
      });
    } else if (e.kind === 'tick') {
      add(e.t, 0.035, (x, i) => 0.16 * Math.sin((2 * Math.PI * 2300 * i) / sampleRate) * Math.exp(-x * 7));
    } else if (e.kind === 'whoosh') {
      let y = 0;
      add(e.t, 0.42, (x) => {
        y += (0.02 + 0.3 * Math.sin(Math.PI * x)) * (noise() - y);
        return 0.9 * y * Math.pow(Math.sin(Math.PI * x), 2);
      });
    } else if (e.kind === 'pop') {
      let ph = 0;
      add(e.t, 0.09, (x) => {
        ph += (2 * Math.PI * (300 + 1100 * Math.exp(-x * 3))) / sampleRate;
        return 0.32 * Math.sin(ph) * Math.exp(-x * 6);
      });
    } else {
      add(e.t, 0.9, (x, i) => {
        const s = (f: number) => Math.sin((2 * Math.PI * f * i) / sampleRate);
        return 0.22 * (0.5 * s(880) + 0.35 * s(1318.5) + 0.2 * s(1760)) * Math.exp(-x * 4) * Math.min(1, x * 60);
      });
    }
  }
  const pcm = Buffer.alloc(44 + n * 2);
  pcm.write('RIFF', 0);
  pcm.writeUInt32LE(36 + n * 2, 4);
  pcm.write('WAVEfmt ', 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20); // PCM
  pcm.writeUInt16LE(1, 22); // mono
  pcm.writeUInt32LE(sampleRate, 24);
  pcm.writeUInt32LE(sampleRate * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36);
  pcm.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.tanh(mix[i]) * 0.9 * 32767), 44 + i * 2);
  return pcm;
}

// ---------------------------------------------------------------- composition

const PLUMBOB =
  '<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#A7F3D0"/><stop offset=".45" stop-color="#10B981"/><stop offset="1" stop-color="#065F46"/></linearGradient></defs>' +
  '<polygon points="30,0 60,42 30,100 0,42" fill="url(#pg)"/><polygon points="30,0 60,42 30,52 0,42" fill="rgba(255,255,255,.28)"/>' +
  '<polyline points="0,42 30,52 60,42" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/></svg>';

const CSS = `
:root{--pink:#EC4899;--purple:#8B5CF6;--green:#10B981;--dark:#0B0F19}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--dark);color:#fff;font-family:Inter,-apple-system,"Helvetica Neue",sans-serif}
.layer{position:absolute;inset:0;opacity:0;overflow:hidden}
.bg,.mimg,.tile{background-size:cover;background-position:center;background-color:#1b2136}
.bg{position:absolute;inset:-90px;filter:blur(48px) brightness(.36) saturate(1.4)}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,rgba(11,15,25,0) 35%,rgba(11,15,25,.88) 100%)}
.card{position:absolute;left:60px;top:440px;width:960px;height:790px;border-radius:44px;overflow:hidden;
  box-shadow:0 46px 100px rgba(0,0,0,.65),0 0 0 3px rgba(255,255,255,.10)}
.card .ph{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat;background-color:#1b2136}
.card .shine{position:absolute;top:0;bottom:0;width:60%;left:0;background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,.35) 50%,transparent 100%);mix-blend-mode:overlay}
.num{position:absolute;left:30px;top:1010px;font-family:Anton,Impact,sans-serif;font-size:250px;line-height:1;color:#fff;
  text-shadow:0 12px 0 var(--pink),0 24px 50px rgba(0,0,0,.65);transform-origin:30% 70%}
.num small{font-size:120px;opacity:.9}
.cap{position:absolute;left:72px;right:140px;top:236px}
.cap .box{display:inline-block;background:#fff;color:#0B0F19;font-weight:900;font-size:52px;line-height:1.16;padding:18px 30px 20px;border-radius:24px;
  box-shadow:0 14px 34px rgba(0,0,0,.4);transform-origin:left center}
.w{display:inline-block;opacity:0;white-space:pre}
.meta{position:absolute;left:300px;right:140px;top:1262px}
.tblock{position:relative}
.tblock .tx,.tblock .hl{font-weight:900;font-size:var(--fs,66px);line-height:1.16;letter-spacing:-.5px}
.tblock .tx{position:relative;text-shadow:0 4px 20px rgba(0,0,0,.55)}
.tblock .hl{position:absolute;left:0;top:0;right:0;color:transparent}
.tblock .hl span,.tblock .tx span{padding:0 16px;margin-left:-16px;-webkit-box-decoration-break:clone;box-decoration-break:clone;border-radius:14px}
.tblock .hl span{background:linear-gradient(90deg,var(--pink),var(--purple))}
.by{display:flex;align-items:center;gap:16px;margin-top:22px;font-size:44px;font-weight:700;color:rgba(255,255,255,.94)}
.by svg{width:26px;height:44px}
.chrome{position:absolute;inset:0;opacity:0;pointer-events:none}
.brand{position:absolute;left:72px;top:96px;display:flex;align-items:center;gap:12px;font-weight:900;font-size:34px;letter-spacing:.3px}
.brand svg{width:20px;height:34px}
.brand b{color:var(--pink)}
.prog{position:absolute;left:72px;right:140px;top:168px;display:flex;gap:10px}
.seg{flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,.28);overflow:hidden}
.seg i{display:block;height:100%;background:#fff;transform-origin:left center;transform:scaleX(0)}
.flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.mimg{position:absolute;inset:0;opacity:0;filter:brightness(.5) saturate(1.25)}
.pb{position:absolute;left:50%;width:96px;height:160px;margin-left:-48px}
.pb svg{width:100%;height:100%;filter:drop-shadow(0 0 28px rgba(16,185,129,.75))}
.hooktext{position:absolute;left:72px;right:140px;top:640px;font-family:Anton,Impact,sans-serif;font-size:142px;line-height:1.02;text-transform:uppercase;
  text-shadow:0 8px 30px rgba(0,0,0,.6)}
.hooktext .w{margin-right:.2em;transform-origin:50% 60%}
.hooktext .w.em{background:var(--pink);padding:0 .12em;border-radius:14px;text-shadow:none}
.wordmark{position:absolute;left:0;right:0;top:880px;text-align:center;font-weight:900;font-size:112px;letter-spacing:-2px}
.wordmark b{color:var(--pink)}
.grid{position:absolute;left:0;top:0;width:1080px;display:grid;grid-template-columns:repeat(3,360px);grid-auto-rows:360px}
.tile{opacity:0;border:3px solid var(--dark)}
.dim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,15,25,.78) 0%,rgba(11,15,25,.9) 45%,rgba(11,15,25,.97) 100%)}
.endc{position:absolute;left:72px;right:140px;top:470px;text-align:center}
.endc .pb{position:relative;left:auto;margin:0 auto 40px;display:block}
.cta1{font-family:Anton,Impact,sans-serif;font-size:118px;line-height:1.02;text-transform:uppercase;opacity:0}
.url{display:inline-block;margin-top:56px;padding:30px 44px 34px;border-radius:999px;background:linear-gradient(90deg,var(--pink),var(--purple));
  font-weight:900;font-size:50px;line-height:1.15;word-break:break-word;box-shadow:0 20px 60px rgba(236,72,153,.45);opacity:0}
.url .arr{display:inline-block;margin-left:14px}
.bio{margin-top:40px;font-size:40px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.85);opacity:0}
.credits{margin-top:46px;font-size:34px;font-weight:600;line-height:1.4;color:rgba(255,255,255,.7);opacity:0}
`;

function wordsHtml(text: string, cls = ''): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `<span class="w${cls}">${escapeHtml(w)} </span>`)
    .join('');
}

function sceneHtml(s: Scene, tl: Timeline): string {
  if (s.kind === 'hook') {
    const montage = tl.mods.map((_, i) => `<div class="mimg" data-img="${i}"></div>`).join('');
    const text = s.words.length
      ? `<div class="pb" style="top:430px">${PLUMBOB}</div><div class="hooktext">${s.words
          .map((w) => `<span class="w${w.em ? ' em' : ''}">${escapeHtml(w.text)}</span>`)
          .join('')}</div>`
      : `<div class="pb" style="top:660px">${PLUMBOB}</div><div class="wordmark">musthave<b>mods</b></div>`;
    return `<div class="layer" data-scene="hook">${montage}<div class="vig"></div>${text}</div>`;
  }
  if (s.kind === 'mod') {
    const fs = s.mod.title.length > 34 ? 54 : s.mod.title.length > 22 ? 60 : 68;
    const title = escapeHtml(s.mod.title);
    return (
      `<div class="layer" data-scene="mod">` +
      `<div class="bg" data-img="${s.index}"></div><div class="vig"></div>` +
      (s.caption ? `<div class="cap"><span class="box">${wordsHtml(s.caption)}</span></div>` : '') +
      `<div class="card"><div class="ph" data-img="${s.index}"></div><div class="shine"></div></div>` +
      `<div class="num">${s.index + 1}<small>/${tl.mods.length}</small></div>` +
      `<div class="meta"><div class="tblock" style="--fs:${fs}px"><div class="hl"><span>${title}</span></div><div class="tx"><span>${title}</span></div></div>` +
      `<div class="by">${PLUMBOB}<span>by ${escapeHtml(s.mod.creator)}</span></div></div>` +
      `</div>`
    );
  }
  const tiles = Array.from({ length: 18 }, (_, k) => `<div class="tile" data-img="${k % Math.max(1, tl.mods.length)}"></div>`).join('');
  return (
    `<div class="layer" data-scene="end"><div class="grid">${tiles}</div><div class="dim"></div>` +
    `<div class="endc"><div class="pb">${PLUMBOB}</div>` +
    `<div class="cta1">Full list +<br>downloads</div>` +
    `<div class="url"><span>${escapeHtml(s.destination)}</span><span class="arr">↗</span></div>` +
    `<div class="bio">link in bio</div>` +
    `<div class="credits">Creators: ${s.creators.map(escapeHtml).join(' · ')}</div></div></div>`
  );
}

/** Runs inside the page. Plain ES5 so it needs no transpiling; reads window.__TL. */
const SEEK_JS = `
(function(){
var TL=window.__TL, S=TL.scenes, layers=[].slice.call(document.querySelectorAll('[data-scene]'));
var chrome=document.querySelector('.chrome'), flash=document.querySelector('.flash');
var fills=[].slice.call(document.querySelectorAll('.seg i'));
var aspect={}, resolved={};
function clamp(x,a,b){return x<a?a:x>b?b:x}
function P(t,a,d){return clamp((t-a)/d,0,1)}
function eo(p){return 1-Math.pow(1-p,3)}
function ei(p){return p*p*p}
function bo(p){var c=1.9;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)}
function load(urls){return new Promise(function(done){var k=0;(function next(){if(k>=urls.length)return done(null);var im=new Image();
  im.onload=function(){done({url:urls[k],a:im.naturalWidth/im.naturalHeight})};im.onerror=function(){k++;next()};im.src=urls[k]})()})}
window.__ready=Promise.all(TL.mods.map(function(m,i){return load(m.candidates).then(function(r){
  if(r){resolved[i]=r.url;aspect[i]=r.a}return r?null:m.img})})).then(function(failed){
  [].slice.call(document.querySelectorAll('[data-img]')).forEach(function(el){var i=+el.getAttribute('data-img');
    if(resolved[i])el.style.backgroundImage='url("'+resolved[i]+'")'});
  return (document.fonts?document.fonts.ready:Promise.resolve()).then(function(){
    return {failed:failed.filter(Boolean),aspects:aspect}})});
function setT(el,s){if(el)el.style.transform=s}
function setO(el,o){if(el)el.style.opacity=o}
window.__seek=function(t){
  var mods=S.filter(function(s){return s.kind==='mod'}), end=S[S.length-1], hook=S[0];
  layers.forEach(function(L,i){var s=S[i],u=t-s.t0,d=s.t1-s.t0,on=t>=s.t0&&(t<s.t1||i===S.length-1);
    L.style.opacity=on?1:0; if(!on)return;
    if(s.kind==='hook'){
      var ims=L.querySelectorAll('.mimg'), n=ims.length, slot=0.16, k=n?Math.floor(u/slot)%n:0;
      for(var j=0;j<n;j++){ims[j].style.opacity=j===k?1:0;if(j===k)setT(ims[j],'scale('+(1.28-0.12*P(u%slot,0,slot))+')')}
      var pb=L.querySelector('.pb');setT(pb,'translateY('+(Math.sin(u*2.6)*14)+'px) scaleX('+Math.cos(u*3.2)+') scale('+(0.4+0.6*bo(P(u,0,0.35)))+')');
      [].slice.call(L.querySelectorAll('.hooktext .w')).forEach(function(w,k){var p=P(u,0.15+k*0.13,0.22);
        w.style.opacity=Math.min(1,p*3);setT(w,'scale('+(1.9-0.9*bo(p))+') rotate('+((1-p)*-9)+'deg)')});
      var wm=L.querySelector('.wordmark');if(wm){var q=P(u,0.1,0.35);wm.style.opacity=q;setT(wm,'scale('+(0.7+0.3*bo(q))+')')}
      var x=P(u,d-0.22,0.22);setT(L,'scale('+(1+0.55*ei(x))+')');L.style.opacity=1-ei(x);
    }else if(s.kind==='mod'){
      var inP=eo(P(u,0,0.3)), outP=ei(P(u,d-0.2,0.2)), shift=(1-inP)*1150-outP*1150, rot=(1-inP)*7-outP*7, blur=(1-inP)*16+outP*16;
      var card=L.querySelector('.card');setT(card,'translateX('+shift+'px) translateY('+(Math.sin(u*2)*6)+'px) rotate('+rot+'deg)');card.style.filter='blur('+blur+'px)';
      var ph=L.querySelector('.ph'), a=aspect[s.index]||1.2, z=P(u,0,d);
      setT(ph,'scale('+(1.06+0.14*z)+')');
      ph.style.backgroundPosition=a>1.25?(18+64*z)+'% 50%':'50% '+(12+30*z)+'%';
      setT(L.querySelector('.shine'),'translateX('+(-120+340*eo(P(u,0.35,0.6)))+'%)');
      var bg=L.querySelector('.bg');setT(bg,'scale('+(1.15+0.1*z)+')');
      var num=L.querySelector('.num'),np=P(u,0.12,0.32);num.style.opacity=np>0?1-outP:0;
      setT(num,'translateX('+(-outP*600)+'px) scale('+bo(np)+') rotate('+(-14+8*np)+'deg)');
      var cap=L.querySelector('.cap');if(cap){var bx=cap.querySelector('.box'),cp=P(u,0.2,0.16);cap.style.opacity=cp*(1-outP);
        setT(bx,'scale('+(0.85+0.15*bo(cp))+')');
        [].slice.call(cap.querySelectorAll('.w')).forEach(function(w,k){var p=P(u,0.26+k*0.075,0.14);w.style.opacity=p;setT(w,'translateY('+((1-eo(p))*18)+'px) scale('+(0.7+0.3*bo(p))+')')})}
      var meta=L.querySelector('.meta'),tx=meta.querySelector('.tx'),hl=meta.querySelector('.hl'),by=meta.querySelector('.by');
      var tp=P(u,0.28,0.22);tx.style.opacity=tp;setT(tx,'translateY('+((1-eo(tp))*34)+'px)');
      var wp=eo(P(u,0.34,0.3));hl.style.clipPath='inset(0 '+((1-wp)*100)+'% 0 0)';hl.style.opacity=tp;setT(hl,'translateY('+((1-eo(tp))*34)+'px)');
      var bp=P(u,0.48,0.2);by.style.opacity=bp;setT(by,'translateX('+((1-eo(bp))*-40)+'px)');
      meta.style.opacity=1-outP;
    }else{
      var tiles=L.querySelectorAll('.tile');for(var j=0;j<tiles.length;j++){var p=P(u,j*0.025,0.3);tiles[j].style.opacity=p;setT(tiles[j],'scale('+(0.6+0.4*bo(p))+')')}
      setT(L.querySelector('.grid'),'translateY('+(-u*70)+'px)');
      var pb=L.querySelector('.pb'),pp=P(u,0.05,0.35);setT(pb,'translateY('+(Math.sin(u*2.6)*10)+'px) scaleX('+Math.cos(u*3.2)+') scale('+bo(pp)+')');
      var c1=L.querySelector('.cta1'),q=P(u,0.15,0.25);c1.style.opacity=q;setT(c1,'translateY('+((1-eo(q))*60)+'px)');
      var url=L.querySelector('.url'),up=P(u,0.38,0.3),pulse=u>0.7?1+0.035*Math.sin((u-0.7)*Math.PI*2*1.6):1;url.style.opacity=up;setT(url,'scale('+(bo(up)*pulse)+')');
      setT(url.querySelector('.arr'),'translate('+(Math.sin(u*9)*5)+'px,'+(-Math.sin(u*9)*5)+'px)');
      setO(L.querySelector('.bio'),P(u,0.65,0.25));setO(L.querySelector('.credits'),P(u,0.8,0.3));
    }
  });
  var first=mods[0];
  chrome.style.opacity=first?P(t,first.t0-0.1,0.25)*(1-P(t,end.t0,0.2)):0;
  mods.forEach(function(s,i){if(fills[i])fills[i].style.transform='scaleX('+P(t,s.t0,s.t1-s.t0)+')'});
  var f=0;mods.concat([end]).forEach(function(s){var dd=Math.abs(t-s.t0);if(dd<0.07)f=Math.max(f,0.32*(1-dd/0.07))});
  flash.style.opacity=f;
};
window.__seek(0);
})();`;

/** Full page for the timeline. JSON is embedded with `<` escaped so draft text can't close the script. */
export function compositionHtml(tl: Timeline): string {
  const data = {
    scenes: tl.scenes.map((s) => ({ kind: s.kind, t0: s.t0, t1: s.t1 })),
    mods: tl.mods.map((m) => ({ img: m.img, candidates: fullResCandidates(m.img) })),
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const segs = tl.mods.map(() => '<div class="seg"><i></i></div>').join('');
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@600;700;800;900&display=block" rel="stylesheet">` +
    `<style>${CSS}</style></head><body>` +
    tl.scenes.map((s) => sceneHtml(s, tl)).join('') +
    `<div class="chrome"><div class="brand">${PLUMBOB}<span>musthave<b>mods</b></span></div><div class="prog">${segs}</div></div>` +
    `<div class="flash"></div>` +
    `<script>window.__TL=${json};</script><script>${SEEK_JS}</script></body></html>`
  );
}

export function encodeArgs(opts: { fps: number; audio: string | null; out: string }): string[] {
  return [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(opts.fps), '-i', '-',
    ...(opts.audio ? ['-i', opts.audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(opts.fps),
    ...(opts.audio ? ['-c:a', 'aac', '-b:a', '160k', '-shortest'] : ['-an']),
    '-movflags', '+faststart', opts.out,
  ];
}
