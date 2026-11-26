/* Nepenthes Highlands add-on: shaders, settings (cookie), progress (cookie). Load after the main script. */
(()=>{
const P=location.pathname.replace(/[^/]*$/,''),
ck=(n,v)=>{document.cookie=n+'='+encodeURIComponent(v)+';max-age=31536000;path='+P+';SameSite=Lax'},
rd=n=>{const m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):''},
DEF={fov:72,scale:1,fog:1,fx:1,bloom:.5,vig:.4,sat:1.1,con:1.05};
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
let fx=1;
const orig=renderer.render.bind(renderer),v2=new THREE.Vector2();
renderer.render=(s,c)=>{
if(!fx||s!==scene){orig(s,c);return}
renderer.getDrawingBufferSize(v2);
if(rt.width!==v2.x||rt.height!==v2.y){rt.setSize(v2.x,v2.y);U.px.value.set(1/v2.x,1/v2.y)}
renderer.setRenderTarget(rt);orig(s,c);renderer.setRenderTarget(null);orig(ps,pc)};

function applySet(){const S=getS();
cam.fov=S.fov;cam.updateProjectionMatrix();
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*S.scale);renderer.setSize(innerWidth,innerHeight);
scene.fog.near=14*S.fog;scene.fog.far=72*S.fog;
fx=S.fx;U.bl.value=S.bloom;U.vg.value=S.vig;U.sa.value=S.sat;U.co.value=S.con}
applySet();
addEventListener('focus',applySet);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)applySet()});

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
lk.innerHTML='<a href="settings.html" style="color:#8fc46a">Settings (O): graphics and field of view</a>';
lk.onclick=e=>e.stopPropagation();
document.querySelector('#ov>div').appendChild(lk);
addEventListener('keydown',e=>{if(e.code==='KeyO'&&!ui&&!e.ctrlKey&&!e.metaKey&&!e.altKey){save();location.href='settings.html'}});
})();
