import { islands } from './islands.mjs';

export const themeFields = {
  accent: { label: 'Primary button', value: '#31583d' },
  accentText: { label: 'Primary button text', value: '#fffdf2' },
  surface: { label: 'Panel surface', value: '#fffdf4' },
  text: { label: 'Panel text', value: '#243227' },
  hud: { label: 'Game controls', value: '#223f3b' },
  shelf: { label: 'Shelf finish', value: '#946849' },
  font: { label: 'Heading font', value: 'Oswald', choices: ['Oswald', 'system-ui', 'monospace'] }
};

const art = (id, label, hint) => ({ id, label, hint, type:'image' });
const controls = [
    art('world','World View','Circular HUD button'),
    art('player','Home island','Return to Player View button on the World View map'),
    art('bridges','Bridge dashboard','Circular HUD button'),
    art('catalog','Seed Catalog','Circular HUD button'),
    art('throw','Throw seed','Launcher button'),
    art('water','Water','Plant details action'),
    art('comment','Comment','Discussion composer'),
    art('follow','Follow','Plant details action'),
    art('adopt','Adopt','Catalog card action')
  ];
export const groups = [
  { title:'Navigation and actions', slots:controls },
  { title:'Optional button states', collapsible:true,
    slots:controls.flatMap(slot=>['pressed','disabled'].map(state=>art(slot.id+'-'+state,slot.label+' · '+state,'Optional state artwork'))) },
  { title:'Plants and bridges', slots:[
    art('seed','Seed','Also appears in the launcher and in flight'),
    art('sprout','Sprout','Transparent sprite, with the base at the bottom'),
    art('young','Young plant','Transparent sprite, with the base at the bottom'),
    art('tree','Tree','Transparent sprite, with the base at the bottom'),
    art('mature','Mature tree','Transparent sprite, with the base at the bottom'),
    art('bridge-foundation','Bridge foundations','Horizontal strip for World View'),
    art('bridge-walkway','Bridge walkway','Horizontal strip for World View'),
    art('bridge-open','Open bridge','Horizontal strip for World View')
  ] },
  { title:'Islands', slots:islands.flatMap(island=>[
    art('island-'+island.id,island.name,'Transparent artwork for World View and the distant Player View'),
    {id:'model-'+island.id,label:island.name+' · 3D model',hint:'GLB handoff asset. The prototype renders the 2D island art.',type:'model'}
  ]) }
];

const slots = new Map(groups.flatMap(group=>group.slots).map(slot=>[slot.id,slot]));
const imageTypes = ['image/png','image/jpeg','image/webp','image/svg+xml'];
const cap = { image:2*1024*1024, model:12*1024*1024 };
const fullCap = 64*1024*1024;
export const blankKit = () => ({ version:1, theme:{}, assets:{} });

function openStore(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('chi-island-design',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('kits');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function stored(key,value){
  const db=await openStore();
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('kits',value===undefined?'readonly':'readwrite');
      const store=tx.objectStore('kits');
      const request=value===undefined?store.get(key):store.put(value,key);
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  } finally { db.close(); }
}
export const readKit = key => stored(key).then(kit => {
  if (!kit) return blankKit();
  if (kit.theme.font === 'serif') kit.theme.font = themeFields.font.value;
  return kit;
});
export const saveKit = (key,value) => stored(key,value);

export async function checkAsset(id,blob){
  const slot=slots.get(id);
  if(!slot || !(blob instanceof Blob) || !blob.size)throw new Error('Choose an asset for this slot.');
  if(blob.size>cap[slot.type])throw new Error(slot.type==='model'?'Use a GLB up to 12 MB.':'Use an image up to 2 MB.');
  if(slot.type==='model'){
    const bytes=new DataView(await blob.slice(0,20).arrayBuffer());
    const invalid=()=>new Error('Choose a valid glTF 2.0 .glb model.');
    if(bytes.byteLength!==20 || bytes.getUint32(0,true)!==0x46546c67 || bytes.getUint32(4,true)!==2 || bytes.getUint32(8,true)!==blob.size)
      throw invalid();
    const size=bytes.getUint32(12,true);
    if(bytes.getUint32(16,true)!==0x4e4f534a || size%4 || size>blob.size-20)throw invalid();
    try {
      const model=JSON.parse(await blob.slice(20,20+size).text());
      if(model.asset?.version!=='2.0')throw invalid();
    } catch {throw invalid();}

  }else{
    if(!imageTypes.includes(blob.type))throw new Error('Choose a PNG, JPEG, WebP, or SVG image.');
    const image=new Image();
    const url=URL.createObjectURL(blob);
    try {
      image.src=url;await image.decode();
      if(!image.naturalWidth||!image.naturalHeight)throw new Error();
    }
    catch {throw new Error('This image could not be opened.');}
    finally {URL.revokeObjectURL(url);}
  }
}

export function checkKitSize(kit){
  const size=Object.values(kit.assets).reduce((sum,asset)=>sum+asset.blob.size,0);
  if(size>fullCap)throw new Error('Keep the kit under 64 MB.');
}

const readData = blob => new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(reader.error);
  reader.readAsDataURL(blob);
});
export async function exportKit(kit){
  const assets={};
  for(const [id,value] of Object.entries(kit.assets))assets[id]={name:value.name,data:await readData(value.blob)};
  return JSON.stringify({version:1,theme:kit.theme,assets});
}
export async function importKit(file){
  if(file.size>fullCap*1.4)throw new Error('This kit is too large.');
  const raw=JSON.parse(await file.text());
  if(raw?.version!==1 || !raw.theme || !raw.assets)throw new Error('Choose a CHI Island design kit.');
  const kit=blankKit();
  for(const [id,value] of Object.entries(raw.theme)){
    const field=themeFields[id];
    if(typeof value==='string' && field && (field.choices?.includes(value) || (!field.choices&&/^#[a-f\d]{6}$/i.test(value))))kit.theme[id]=value;
  }
  for(const [id,asset] of Object.entries(raw.assets)){
    const slot=slots.get(id);
    if(!slot || typeof asset?.name!=='string' || typeof asset.data!=='string')throw new Error('The kit contains an unknown asset slot.');
    const match=/^data:([\w/+.\-]*);base64,([a-z\d+/=]+)$/i.exec(asset.data);
    if(!match || match[2].length>Math.ceil(cap[slot.type]/3)*4)throw new Error('An asset exceeds the size limit or could not be read.');
    const bytes=Uint8Array.from(atob(match[2]), character=>character.charCodeAt(0));
    const blob=new Blob([bytes],{type:match[1]});
    await checkAsset(id,blob);
    kit.assets[id]={name:asset.name.slice(0,160),blob};
    checkKitSize(kit);
  }
  return kit;
}

const variables={accent:'--kit-accent',accentText:'--kit-accent-text',surface:'--kit-surface',text:'--kit-text',hud:'--kit-hud',shelf:'--kit-shelf',font:'--kit-font'};
export async function installGameDesign(images){
  const preview=new URLSearchParams(location.search).get('design')==='preview';
  let kit;
  try { kit=await readKit(preview?'draft':'applied'); }
  catch { return; }
  const root=document.documentElement;
  for(const [key,value] of Object.entries(kit.theme))if(variables[key])root.style.setProperty(variables[key],value);
  await Promise.all(Object.entries(kit.assets).map(async ([id,asset])=>{
    if(slots.get(id)?.type!=='image')return;
    const url=URL.createObjectURL(asset.blob);
    const image=new Image();
    image.src=url;
    try {
      await image.decode();
      images.set(id,image);
      root.style.setProperty('--art-'+id,'url("'+url+'")');
      root.classList.add('art-'+id);
    } catch { URL.revokeObjectURL(url); }
  }));
}
