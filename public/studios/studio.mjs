import * as THREE from '../island-kit/three.module.min.js';
import { islandModel } from '../island-kit/navigation.mjs';
import { islands, islandScale, islandSpacing } from '../islands.mjs';

const id = islands.find(entry => entry.model === document.body.dataset.island)?.id;
const model = islandModel(id);
const canvas = document.getElementById('scene');
const hint = document.getElementById('hint');
const error = document.getElementById('error');
const orbitButton = document.getElementById('orbit');
const exploreButton = document.getElementById('explore');
const joystick = document.getElementById('joystick');
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

if (!model) throw new Error('Unknown island studio');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
} catch {
  error.hidden = false;
  error.textContent = 'This island needs a browser with WebGL 2 enabled.';
  throw new Error('WebGL 2 is unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

// Match the lighting and sky used by TED Island's main renderer.
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xb4cbb9, 1.7));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
sun.position.set(-10, 18, 12);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xd8f4ec, .55);
fill.position.set(9, 5, -8);
scene.add(fill);
scene.add(model.group);

const camera = new THREE.PerspectiveCamera(52, 1, .055, 150 * islandScale);
const bounds = new THREE.Box3().setFromObject(model.group);
const target = new THREE.Vector3(model.group.position.x, model.group.position.y + 1.1 * islandScale, model.group.position.z);
const span = bounds.getSize(new THREE.Vector3());
const defaultDistance = Math.max(span.x, span.z) * 1.45;
let orbitYaw = .7, orbitPitch = .48, orbitDistance = defaultDistance;
let mode = 'orbit';
let {x, z, yaw, pitch} = model.spawn();
let feet = model.queryIsland(x,z,0).height;
let verticalSpeed = 0, grounded = true, standingOnObject = false;
const eyeHeight = 1.05, bodyHeight = 1.12, radius = .13;
const maxStepUp = bodyHeight * .75, maxStepDown = bodyHeight / 2, stepTolerance = .00001;
const keys = new Set();
let joystickSide = 0, joystickAhead = 0, joystickPointer = null;
let dragging = null;

function setMode(next) {
  mode = next;
  document.body.classList.toggle('exploring', next === 'explore');
  orbitButton.setAttribute('aria-pressed', String(next === 'orbit'));
  exploreButton.setAttribute('aria-pressed', String(next === 'explore'));
  hint.textContent = next === 'orbit'
    ? 'Drag to orbit · Scroll to zoom'
    : matchMedia('(pointer: coarse)').matches
      ? 'Move with the joystick · Drag the view to look'
      : 'WASD to walk · Drag to look · Arrow keys also look';
  if (next === 'explore') canvas.focus({preventScroll:true});
}
orbitButton.addEventListener('click', () => setMode('orbit'));
exploreButton.addEventListener('click', () => setMode('explore'));
document.getElementById('reset').addEventListener('click', () => {
  if (mode === 'orbit') {
    orbitYaw = .7; orbitPitch = .48; orbitDistance = defaultDistance;
  } else {
    ({x, z, yaw, pitch} = model.spawn());
    feet = model.queryIsland(x,z,0).height;
    verticalSpeed = 0; grounded = true; standingOnObject = false;
  }
});
document.getElementById('navigation').addEventListener('click', () => {
  const entry = islands[id];
  const manifest = {
    ...model.navigationManifest(),
    runtime: {
      model: entry.model, islandScale, islandSpacing,
      islandPosition: model.group.position.toArray(), rotationY: model.group.rotation.y,
      player: {eyeHeight, bodyHeight, radius, maxStepUp, maxStepDown, speed:2.65},
      spawn: model.spawn(),
      collision: 'Use islandModel(id).queryIsland(), blocksMovement(), and solidFloorAt().'
    }
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url; link.download = `${entry.model}-navigation.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function floorAt(px,pz,ceiling){
  const nav=model.queryIsland(px,pz,0);
  const ground=nav.blockedBy!=='island_boundary' && nav.height<=ceiling ? nav.height : -Infinity;
  const solid=standingOnObject ? model.solidFloorAt(px,pz,ceiling,feet-maxStepDown,radius) : -Infinity;
  return Math.max(ground,solid);
}
function moveTo(px,pz){
  if(px===x&&pz===z)return;
  const nav=model.queryIsland(px,pz,radius);
  if(!nav.walkable)return;
  let step=feet,solidFloor=-Infinity;
  const ceiling=feet+maxStepUp+stepTolerance;
  if(nav.height>ceiling)return;
  if(grounded){
    if(standingOnObject)solidFloor=model.solidFloorAt(px,pz,feet+.001,feet-maxStepDown,radius);
    const floor=Math.max(nav.height,solidFloor);
    step=floor>=feet-maxStepDown?floor:Math.max(feet,floor);
  }
  if(model.blocksMovement(x,z,px,pz,step,radius,bodyHeight)){
    const minimum=Math.max(step,feet)+.001;
    if(!grounded||minimum>ceiling)return;
    solidFloor=model.solidFloorAt(px,pz,ceiling,minimum,radius);
    if(!Number.isFinite(solidFloor))return;
    if(model.blocksMovement(x,z,x,z,feet+bodyHeight,radius,solidFloor-feet,0)||
      model.blocksMovement(x,z,px,pz,solidFloor,radius,bodyHeight)||
      model.blocksMovement(px,pz,px,pz,solidFloor,radius,bodyHeight))return;
    step=solidFloor;
  }
  x=px;z=pz;feet=step;
  if(grounded)standingOnObject=step===solidFloor;
}
function updatePlayer(dt){
  const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+joystickSide;
  const ahead=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+joystickAhead;
  yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.8;
  pitch=clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.6,-1.33,1.16);
  if(side||ahead){
    const speed=dt*2.65/Math.max(1,Math.hypot(side,ahead));
    moveTo(x+(Math.sin(yaw)*ahead+Math.cos(yaw)*side)*speed,z);
    moveTo(x,z+(-Math.cos(yaw)*ahead+Math.sin(yaw)*side)*speed);
  }
  verticalSpeed-=9.8*dt;
  const floor=floorAt(x,z,feet+.001);
  const nextFeet=feet+verticalSpeed*dt;
  grounded=nextFeet<=floor;
  if(grounded){feet=floor;verticalSpeed=0;}
  else feet=nextFeet;
  if(feet < -10){({x,z,yaw,pitch}=model.spawn());feet=model.queryIsland(x,z,0).height;verticalSpeed=0;grounded=true;standingOnObject=false;}
}

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 && event.pointerType !== 'touch') return;
  if (dragging) return;
  canvas.focus({preventScroll:true});
  dragging={id:event.pointerId,x:event.clientX,y:event.clientY,traveled:0};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if(dragging?.id!==event.pointerId)return;
  const dx=event.pointerType==='touch'?event.clientX-dragging.x:event.movementX;
  const dy=event.pointerType==='touch'?event.clientY-dragging.y:event.movementY;
  dragging.x=event.clientX;dragging.y=event.clientY;
  if(mode==='orbit'){
    orbitYaw-=dx*.005;orbitPitch=clamp(orbitPitch+dy*.005,-.1,1.4);
  }else{
    dragging.traveled+=Math.abs(dx)+Math.abs(dy);
    if(dragging.traveled>4){
      yaw+=dx*.0035;pitch=clamp(pitch-dy*.0035,-1.33,1.16);
    }
  }
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
  if(dragging?.id===event.pointerId)dragging=null;
});
canvas.addEventListener('wheel',event=>{
  if(mode!=='orbit')return;
  event.preventDefault();
  orbitDistance=clamp(orbitDistance*Math.exp(event.deltaY*.001),span.length()*.55,span.length()*4);
},{passive:false});
window.addEventListener('keydown',event=>{
  if(mode!=='explore'||event.altKey||event.ctrlKey||event.metaKey)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
    keys.add(event.code);event.preventDefault();
  }
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>keys.clear());

function updateJoystick(event){
  const rect=joystick.getBoundingClientRect();
  const reach=rect.width*.31;
  const dx=(event.clientX-rect.left-rect.width/2)/reach;
  const dy=(event.clientY-rect.top-rect.height/2)/reach;
  const magnitude=Math.hypot(dx,dy);
  const factor=clamp((magnitude-.1)/.9,0,1)/Math.max(magnitude,.001);
  joystickSide=dx*factor;joystickAhead=-dy*factor;
  joystick.style.setProperty('--x',`${joystickSide*reach}px`);
  joystick.style.setProperty('--y',`${-joystickAhead*reach}px`);
}
joystick.addEventListener('pointerdown',event=>{
  if(joystickPointer!==null)return;
  joystickPointer=event.pointerId;joystick.setPointerCapture(event.pointerId);updateJoystick(event);
});
joystick.addEventListener('pointermove',event=>{if(joystickPointer===event.pointerId)updateJoystick(event);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,event=>{
  if(joystickPointer!==event.pointerId)return;
  joystickPointer=null;joystickSide=joystickAhead=0;
  joystick.style.removeProperty('--x');joystick.style.removeProperty('--y');
});

let last=0,elapsed=0;
let viewportWidth=0,viewportHeight=0;
function draw(now){
  requestAnimationFrame(draw);
  const dt=last?Math.min(.045,(now-last)/1000):0;
  last=now;elapsed+=dt;
  model.update(dt,elapsed);
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return;
  if(width!==viewportWidth||height!==viewportHeight){
    renderer.setSize(width,height,false);
    viewportWidth=width;viewportHeight=height;
  }
  const focal=Math.max(height*.77,width*.48);
  const fov=mode==='explore' ? Math.atan(height/(2*focal))*360/Math.PI : 52;
  if(camera.fov!==fov||camera.aspect!==width/height){
    camera.fov=fov;camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  if(mode==='orbit'){
    camera.position.set(target.x+Math.sin(orbitYaw)*Math.cos(orbitPitch)*orbitDistance,
      target.y+Math.sin(orbitPitch)*orbitDistance,
      target.z+Math.cos(orbitYaw)*Math.cos(orbitPitch)*orbitDistance);
    camera.lookAt(target);
  }else{
    updatePlayer(dt);
    const horizontal=Math.cos(pitch);
    camera.position.set(model.group.position.x+x,model.group.position.y+feet+eyeHeight,model.group.position.z+z);
    camera.lookAt(camera.position.x+Math.sin(yaw)*horizontal,camera.position.y+Math.sin(pitch),camera.position.z-Math.cos(yaw)*horizontal);
  }
  renderer.render(scene,camera);
}
requestAnimationFrame(draw);
