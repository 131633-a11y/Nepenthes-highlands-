/* Nepenthes Highlands add-on: shaders, settings (cookie), progress (cookie). Load after the main script. */
(()=>{
const P=location.pathname.replace(/[^/]*$/,''),
ck=(n,v)=>{document.cookie=n+'='+encodeURIComponent(v)+';max-age=31536000;path='+P+';SameSite=Lax'},
rd=n=>{const m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):''},
DEF={fov:72,scale:1,fog:1,fx:1,bloom:.5,vig:.4,sat:1.1,con:1.05,mom:1};
const getS=()=>{const o={...DEF};new URLSearchParams(rd('nh_set')).forEach((v,k)=>{if(k in o&&isFinite(v))o[k]=+v});return o};

/* ---- post-processing shader: bloom, vignette, saturation, contrast ---- */
const U={t:{value:null},px:{value:new THREE.Vector2()},bl:{value:.5},vg:{value:.4},sa:{value:1.1},co:{value:1.05}},
rt=new THREE.WebGLRenderTarget(2,2,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}),
ps=new THREE.Scene(),pc=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
U.t.value=rt.texture;
ps.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:U,depthTest:false,
vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',
fragmentShader:`uniform sampler2D t;uniform vec2 px;uniform float bl,vg,sa,co;varying vec2 u;
void main(){vec3 c=texture2D(t,u).rgb,b=vec3(0.);
for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++)b+=max(texture2D(t,u+vec2(float(i),float(j))*px*3.).rgb-.62,0.);
c+=b/25.*bl*3.;
float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,sa);c=(c-.5)*co+.5;
c*=1.-vg*pow(length(u-.5)*1.4,2.);
gl_FragColor=vec4(c,1.);}`})));
let fx=1,mo=1;
const orig=renderer.render.bind(renderer),v2=new THREE.Vector2();
renderer.render=(s,c)=>{
if(s===scene){mom();rtag()}
if(!fx||s!==scene){orig(s,c);return}
renderer.getDrawingBufferSize(v2);
if(rt.width!==v2.x||rt.height!==v2.y){rt.setSize(v2.x,v2.y);U.px.value.set(1/v2.x,1/v2.y)}
renderer.setRenderTarget(rt);orig(s,c);renderer.setRenderTarget(null);orig(ps,pc)};

function applySet(){const S=getS();
cam.fov=S.fov;cam.updateProjectionMatrix();
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*S.scale);renderer.setSize(innerWidth,innerHeight);
scene.fog.near=14*S.fog;scene.fog.far=72*S.fog;
fx=S.fx;mo=S.mom;U.bl.value=S.bloom;U.vg.value=S.vig;U.sa.value=S.sat;U.co.value=S.con}
applySet();
addEventListener('focus',applySet);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)applySet()});

/* ---- rarity tiers ---- */
const TR=[['Common','#b8c4b0',1],['Uncommon','#6ec85a',1.15],['Rare','#4aa8ff',1.4],['Epic','#b070ff',1.8],['Legendary','#ffb02e',2.5],['Mythic','#ff5a7a',1]],
rsum=SP.reduce((a,x)=>a+x.rar,0);
SP.forEach(s=>{s.tier=s.hyb?5:s.rar>=1?0:s.rar>=.35?1:s.rar>=.12?2:s.rar>=.04?3:4;if(!s.hyb)s.v=Math.round(s.v*TR[s.tier][2])});
const spOf=k=>k>=100&&k<292?SP[(k-100)%64]:null,
badge=s=>'<b style="color:'+TR[s.tier][1]+'">'+TR[s.tier][0]+'</b> <small>(about 1 in '+Math.round(rsum/s.rar)+')</small>',
wrap=(n,fn)=>{const o=window[n];window[n]=function(...a){const r=o.apply(this,a);fn(...a);return r}},
deco=()=>panel.querySelectorAll('button[data-k]').forEach(b=>{const s=spOf(+b.dataset.k);if(!s||b.dataset.rt)return;b.dataset.rt=1;const c=TR[s.tier][1];b.style.borderLeft='4px solid '+c;b.insertAdjacentHTML('beforeend','<em style="margin-left:auto;font-size:11px;color:'+c+'">'+TR[s.tier][0]+'</em>')});
function rtag(){const m=/^<i>([^<]+)<\/i>/.exec(tag.innerHTML),s=m&&SP.find(x=>x.n===m[1]);if(s)tag.innerHTML=badge(s)+'<br>'+tag.innerHTML}
wrap('renderBar',()=>{const l=hb();document.querySelectorAll('#bar div').forEach((d,i)=>{const s=spOf(l[i]);if(s&&!d.classList.contains('on'))d.style.borderColor=TR[s.tier][1]})});
wrap('renderShop',deco);wrap('renderUI',deco);
wrap('renderLog',()=>{document.querySelectorAll('#log span').forEach(e=>{const s=SP.find(x=>x.n===e.textContent);if(s)e.style.borderColor=e.style.color=TR[s.tier][1]})});
{const o=window.collect;window.collect=function(){const t=target,had=t&&found.has(t.sp.n);o.apply(this,arguments);if(t&&!had&&t.sp.tier>=3&&!t.sp.hyb)toast(TR[t.sp.tier][0]+' find: '+t.sp.n+'!')}}

/* ---- CS-style momentum: ground friction, air strafing, bunny hopping ---- */
const mk={};let vx=0,vz=0,lt=performance.now();
const WK=['KeyW','KeyA','KeyS','KeyD'],sh=document.createElement('div');
sh.style.cssText='position:absolute;left:14px;bottom:16px;font:700 22px system-ui,sans-serif;text-shadow:0 1px 4px #000';
document.getElementById('hud').appendChild(sh);
addEventListener('keydown',e=>{if(mo&&WK.includes(e.code)){mk[e.code]=1;e.stopImmediatePropagation()}else if(e.code==='KeyH'){vx=vz=0}},true);
addEventListener('keyup',e=>{if(WK.includes(e.code))mk[e.code]=0},true);
addEventListener('blur',()=>{for(const k in mk)mk[k]=0});
function mom(){const now=performance.now(),dt=Math.min(.05,(now-lt)/1000);lt=now;
if(!mo||ov.style.display!=='none'||ui||!built[(p.x/CS|0)+','+(p.z/CS|0)]){vx=vz=0;sh.textContent='';return}
const wet=get(Math.floor(p.x),Math.floor(p.y+.5),Math.floor(p.z))===7,gnd=on,max=wet?2.6:(keys.ShiftLeft||keys.ShiftRight)?6:4.2;
let f=(mk.KeyW?1:0)-(mk.KeyS?1:0),s=(mk.KeyD?1:0)-(mk.KeyA?1:0);const l=Math.hypot(f,s)||1;f/=l;s/=l;
const sn=Math.sin(p.yaw),cs=Math.cos(p.yaw),wx=-sn*f+cs*s,wz=-cs*f-sn*s,has=f||s,
acc=(ws,a)=>{const add=ws-(vx*wx+vz*wz);if(add<=0)return;const q=Math.min(add,a*max*dt);vx+=q*wx;vz+=q*wz};
if(wet){const k=Math.max(0,1-4*dt);vx*=k;vz*=k;if(has)acc(max,8)}
else if(gnd){if(!keys.Space){const v=Math.hypot(vx,vz);if(v>0){const k=Math.max(0,v-Math.max(v,1.7)*5.2*dt)/v;vx*=k;vz*=k}}if(has)acc(max,5.5)}
else if(has)acc(max*.12,12);
let v=Math.hypot(vx,vz);if(v>18){vx*=18/v;vz*=18/v;v=18}
for(let i=0;i<3;i++){const dx=vx*dt/3,dz=vz*dt/3;
if(dx){if(!hits(p.x+dx,p.y,p.z))p.x+=dx;else if((on||gr)&&!hits(p.x+dx,p.y+1.01,p.z)){p.x+=dx;p.y+=1.01;camOff-=1.01}else vx=0}
if(dz){if(!hits(p.x,p.y,p.z+dz))p.z+=dz;else if((on||gr)&&!hits(p.x,p.y+1.01,p.z+dz)){p.z+=dz;p.y+=1.01;camOff-=1.01}else vz=0}}
p.x=Math.max(1,Math.min(W-1,p.x));p.z=Math.max(1,Math.min(D-1,p.z));
cam.position.x=p.x;cam.position.z=p.z;
sh.textContent=v>.3?v.toFixed(1)+' m/s':'';sh.style.color=v>9?'#ff7a5a':v>6?'#ffe48a':'#eef6e6'}

/* ---- progress saved in one cookie ---- */
let loaded=0,warned=0;
function save(){if(!loaded)return;
const r=n=>Math.round(n*100)/100,
pl=Object.keys(planters).map(k=>{const q=planters[k],c=k.split(',').map(Number);return[...c,get(c[0],c[1],c[2]),q.sub?1:0,q.sp===undefined?-1:q.sp,r(q.prog),q.need].join('_')}).join(';'),
pp=Object.keys(potProg).filter(k=>potProg[k].length).map(k=>k+':'+potProg[k].map(r).join('~')).join(','),
s=[[r(money),r(day),lvl,gl,cur,r(p.x),r(p.y),r(p.z),r(p.yaw)].join(','),ups.join(''),
Object.keys(inv).filter(k=>inv[k]>0).map(k=>k+':'+inv[k]).join(','),
[...found].map(n=>SP.findIndex(x=>x.n===n)).join(','),pp,pl].join('|');
if(encodeURIComponent(s).length>3900){if(!warned){warned=1;toast('Save is too big for a cookie, progress not saved')}return}
ck('nh_save',s)}

function load(){const s=rd('nh_save');if(s)try{
const[a,u,i,f,pp,pl]=s.split('|'),n=a.split(',').map(Number);
money=n[0];day=n[1];lvl=n[2];cur=n[4];
u.split('').forEach((c,k)=>ups[k]=+c);
for(const k in inv)delete inv[k];
i.split(',').filter(Boolean).forEach(t=>{const[k,v]=t.split(':');inv[+k]=+v});
found.clear();f.split(',').filter(Boolean).forEach(x=>SP[+x]&&found.add(SP[+x].n));
for(const k in potProg)delete potProg[k];
pp.split(',').filter(Boolean).forEach(t=>{const[k,v]=t.split(':');potProg[+k]=v.split('~').map(Number)});
for(let l=1;l<=n[3];l++){gl=l;buildGH(l);apron(l)}
const keep=new Set(pl.split(';').filter(Boolean).map(t=>t.split('_').slice(0,3).join(',')));
for(const k in planters){const q=planters[k];if(q.g)scene.remove(q.g);if(!keep.has(k)){const c=k.split(',').map(Number);set(c[0],c[1],c[2],0)}delete planters[k]}
pl.split(';').filter(Boolean).forEach(t=>{const[x,y,z,b,sb,sp,pr,nd]=t.split('_').map(Number);set(x,y,z,b);
const q=planters[x+','+y+','+z]={sub:sb,prog:pr,need:nd};
if(sp>=0){q.sp=sp;q.st=-1;q.g=plant(SP[sp],0);q.g.position.set(x+.5,y+1,z+.5);scene.add(q.g)}});
p.x=n[5];p.y=n[6];p.z=n[7];p.yaw=n[8];p.vy=0;
renderLog();renderBar();toast('Progress loaded')}catch(e){console.warn('Save could not be read',e)}
loaded=1}
load();
setInterval(save,15000);
addEventListener('beforeunload',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});

/* ---- settings link on the start/pause screen, plus the O key ---- */
const lk=document.createElement('p');
lk.innerHTML='<a href="settings.html" style="color:#8fc46a">Settings (O): graphics and field of view</a><br><small>Momentum: hold Space to bunny hop and steer with A/D in the air to build speed. Plants now have rarity tiers.</small>';
lk.onclick=e=>e.stopPropagation();
document.querySelector('#ov>div').appendChild(lk);
addEventListener('keydown',e=>{if(e.code==='KeyO'&&!ui&&!e.ctrlKey&&!e.metaKey&&!e.altKey){save();location.href='settings.html'}});
})();
