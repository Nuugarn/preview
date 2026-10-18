import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const loading = document.querySelector('#loading');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bcb3a6');
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, .04, 70);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.23, .05);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.enablePan = true;
controls.minDistance = 1.05;
controls.maxDistance = 14;
controls.minPolarAngle = .015;
controls.maxPolarAngle = Math.PI - .015;
controls.rotateSpeed = .6;
function startingCamera() {
  const distance = innerWidth < 650 ? 8.8 : 6.5;
  camera.position.set(.02, 1.98, distance);
  controls.update();
}
startingCamera();

scene.add(new THREE.HemisphereLight(0xf1f3f6, 0x514238, 1.35));
const key = new THREE.DirectionalLight(0xf5f6ff, 3.1);
key.position.set(-2.2, 2.8, 4);key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: .1, far: 14 });
key.shadow.normalBias = .018;key.shadow.bias = -.0002;key.shadow.radius = 3;
key.target.position.set(0, 1, 0);scene.add(key,key.target);
const fill = new THREE.DirectionalLight(0xcad8ef, 1.0);fill.position.set(4, 2.5, 3);scene.add(fill);
const back = new THREE.DirectionalLight(0xffead0, .9);back.position.set(-1, 3, -4);scene.add(back);

let model, door, book, closedQuaternion, bookQuaternion, motion = null, currentAngle = 0, targetAngle = 0, bookAngle = 0;
let phase = 'closed';
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const up = new THREE.Vector3(0, 1, 0);
const bookAxis = new THREE.Vector3(1, 0, 0);
const scratchQuaternion = new THREE.Quaternion();
const activePointers = new Set();
let press = null, lastTap = null;

function isDoorObject(object) {
  for (let o=object;o;o=o.parent) if(o===door) return true;
  return false;
}
function isBookObject(object) {
  for(let o=object;o;o=o.parent)if(o===book)return true;
  return false;
}
function canActivate(object){
  return !motion && (phase==='closed'?isBookObject(object):phase==='open'&&isDoorObject(object));
}
function pick(x,y) {
  if(!model)return null;
  const rect=canvas.getBoundingClientRect();
  pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  // The first visible surface wins: walls never click through to the hidden cabinet.
  return raycaster.intersectObject(model,true)[0]?.object ?? null;
}
function startPhase(next, now=performance.now()){
  phase=next;
  const bookPhase=next==='pulling'||next==='resetting';
  motion={start:now,duration:reducedMotion?0:bookPhase?350:1000};
}
function toggleDoor() {
  if(!door||motion)return;
  if(phase==='closed'){targetAngle=Math.PI/2;startPhase('pulling');status.textContent='กำลังดึงหนังสือเพื่อเปิดประตู';}
  else if(phase==='open'){targetAngle=0;startPhase('closing');status.textContent='กำลังปิดประตู';}
}
canvas.addEventListener('pointerdown',e=>{
  activePointers.add(e.pointerId);
  if(activePointers.size===1 && e.button===0)press={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,multi:false};
  else if(press)press.multi=true;
});
canvas.addEventListener('pointermove',e=>{
  if(press && Math.hypot(e.clientX-press.x,e.clientY-press.y)>7)press.moved=true;
  if(e.pointerType==='mouse' && activePointers.size===0)canvas.style.cursor=canActivate(pick(e.clientX,e.clientY))?'pointer':'grab';
});
canvas.addEventListener('pointerup',e=>{
  activePointers.delete(e.pointerId);
  if(press?.id===e.pointerId){
    if(!press.moved && !press.multi && canActivate(pick(e.clientX,e.clientY))){toggleDoor();lastTap={x:e.clientX,y:e.clientY};}
    press=null;
  }
});
canvas.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);press=null;});
canvas.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDoor();}
  if(e.key==='Home'){e.preventDefault();controls.target.set(0,1.23,.05);startingCamera();}
});

new GLTFLoader().load('./assets/hidden-cabinet.glb',gltf=>{
  model=gltf.scene;scene.add(model);door=model.getObjectByName('Door_Hinge');
  book=model.getObjectByName('Book_Trigger');
  if(!door||!book)throw new Error('Door or book pivot is missing from the model');
  closedQuaternion=door.quaternion.clone();
  bookQuaternion=book.quaternion.clone();
  model.traverse(o=>{
    if(o.isMesh){
      o.castShadow=o.name!=='Ceiling'&&!o.name.startsWith('Downlight');o.receiveShadow=true;
      for(const m of (Array.isArray(o.material)?o.material:[o.material])){
        if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        if(m.name.includes('Warm 2700K'))m.emissiveIntensity=3.3;
      }
    }
  });
  // The warm shelf lights are children of the moving cabinet, just like their LED strips.
  for(const height of [.58,1.075,1.55,2.10]){
    const lamp=new THREE.RectAreaLight(0xffb468,45,.83,.045);
    lamp.position.set(.49,height-.045,.34);lamp.rotation.x=-1.05;door.add(lamp);
  }
  const downlight=new THREE.SpotLight(0xffcc8c,9,4,.6,.75,1.5);
  downlight.position.set(0,2.66,.43);downlight.target.position.set(0,1.0,.08);scene.add(downlight,downlight.target);
  model.updateMatrixWorld(true);
  loading.classList.add('hidden');
  document.body.dataset.ready='true';
  // Read-only QA snapshot; interaction is always exercised through actual pointer events.
  function screenPoint(object,point=new THREE.Vector3()){
    const p=object.localToWorld(point).project(camera),r=canvas.getBoundingClientRect();
    return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
  }
  window.cabinetSnapshot=()=>{
    model.updateMatrixWorld(true);
    const bookScreen=screenPoint(book,new THREE.Vector3(0,.15,.003));
    const closeTargets=[];
    for(const name of ['Door_stile','Door_stile.001','Door_back_panel']){
      const object=model.getObjectByName(name);if(!object)continue;
      const p=screenPoint(object);if(isDoorObject(pick(p.x,p.y)))closeTargets.push(p);
    }
    return {ready:true,phase,bookDegrees:bookAngle*180/Math.PI,bookScreen,closeTargets,angleDegrees:currentAngle*180/Math.PI,targetDegrees:targetAngle*180/Math.PI,embeddedAnimations:gltf.animations.map(a=>a.name),camera:camera.position.toArray(),lastTap,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  };
},xhr=>{
  if(xhr.total)document.querySelector('#loading-text').textContent=`กำลังเตรียมโมเดล ${Math.round(xhr.loaded/xhr.total*100)}%`;
},error=>{
  console.error(error);document.querySelector('#loading-text').textContent='โหลดโมเดลไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ';
  document.querySelector('.loader').hidden=true;
});

function frame(now){
  requestAnimationFrame(frame);
  if(motion){
    const t=motion.duration ? Math.min(1,(now-motion.start)/motion.duration) : 1;
    const eased=t*t*(3-2*t);
    if(phase==='pulling')bookAngle=eased*Math.PI/12;
    if(phase==='opening')currentAngle=eased*Math.PI/2;
    if(phase==='closing')currentAngle=(1-eased)*Math.PI/2;
    if(phase==='resetting')bookAngle=(1-eased)*Math.PI/12;
    door.quaternion.copy(closedQuaternion).multiply(scratchQuaternion.setFromAxisAngle(up,currentAngle));
    book.quaternion.copy(bookQuaternion).multiply(scratchQuaternion.setFromAxisAngle(bookAxis,bookAngle));
    if(t===1){
      if(phase==='pulling')startPhase('opening',now);
      else if(phase==='closing')startPhase('resetting',now);
      else{phase=phase==='opening'?'open':'closed';motion=null;status.textContent=phase==='open'?'ประตูเปิด':'ประตูปิด';}
    }
  }
  controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
