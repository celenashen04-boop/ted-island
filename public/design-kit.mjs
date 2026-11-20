import {blankKit,groups,themeFields,readKit,saveKit,checkAsset,checkKitSize,exportKit,importKit} from './design-assets.mjs';

const byId=id=>document.getElementById(id);
const status=byId('kit-status'),error=byId('kit-error');
let kit=blankKit(),pending=Promise.resolve(),previewURLs=[];
const make=(tag,text,className)=>{
  const node=document.createElement(tag);
  if(text)node.textContent=text;
  if(className)node.className=className;
  return node;
};
const report=message=>{error.textContent='';status.textContent=message;};
const showError=failure=>{error.textContent=failure.message||'Could not save your kit.';};
function draftChanged(){
  const snapshot=structuredClone(kit);
  pending=pending.catch(()=>{}).then(()=>saveKit('draft',snapshot));
  pending.then(()=>report('Draft saved in this browser.'),showError);
}

function render(){
  for(const url of previewURLs)URL.revokeObjectURL(url);
  previewURLs=[];
  const theme=byId('kit-theme');theme.replaceChildren();
  for(const [key,field] of Object.entries(themeFields)){
    const label=make('label',field.label,'theme-field');
    const control=make(field.choices?'select':'input');
    if(field.choices)for(const choice of field.choices){
      const option=make('option',choice);option.value=choice;control.append(option);
    }
    else control.type='color';
    control.value=kit.theme[key]??field.value;
    control.addEventListener('change',()=>{kit.theme[key]=control.value;draftChanged();});
    label.append(control);
    theme.append(label);
  }
  const groupsNode=byId('kit-slots');
  const expanded=groupsNode.querySelector('details')?.open;
  groupsNode.replaceChildren();
  for(const group of groups){
    const section=make(group.collapsible?'details':'section');
    if(group.collapsible)section.open=Boolean(expanded);
    const heading=make(group.collapsible?'summary':'h2',group.title);
    const grid=make('div',null,'kit-grid');
    for(const slot of group.slots){
      const article=make('article',null,'asset-slot');
      const asset=kit.assets[slot.id];
      const preview=make('div',null,'asset-preview');
      if(asset&&slot.type==='image'){
        const image=make('img');image.alt=slot.label;
        image.src=URL.createObjectURL(asset.blob);previewURLs.push(image.src);preview.append(image);
      } else preview.textContent=asset?'GLB attached':slot.type==='model'?'No model attached':'Default artwork';
      const actions=make('div',null,'asset-actions');
      const upload=make('label',asset?'Replace':'Upload','secondary asset-upload');
      const file=make('input');
      file.type='file';
      file.accept=slot.type==='model'?'.glb,model/gltf-binary':'image/png,image/jpeg,image/webp,image/svg+xml';
      file.setAttribute('aria-label','Upload '+slot.label);
      file.addEventListener('change',async ()=>{
        const chosen=file.files[0];
        if(!chosen)return;
        file.disabled=true;
        try {
          await checkAsset(slot.id,chosen);
          const assets={...kit.assets,[slot.id]:{name:chosen.name.slice(0,160),blob:chosen}};
          checkKitSize({...kit,assets});
          kit.assets=assets;draftChanged();render();
        } catch(failure){showError(failure);file.value='';file.disabled=false;}
      });
      upload.append(file);actions.append(upload);
      if(asset){
        const remove=make('button','Remove','secondary');
        remove.type='button';
        remove.setAttribute('aria-label','Remove '+slot.label);
        remove.addEventListener('click',()=>{delete kit.assets[slot.id];draftChanged();render();});
        actions.append(remove);
      }
      if(asset&&slot.type==='model'){
        const download=make('a','Download GLB','secondary');
        download.href=URL.createObjectURL(asset.blob);previewURLs.push(download.href);
        download.download=asset.name;actions.append(download);
      }
      article.append(make('h3',slot.label),preview,make('p',slot.hint));
      if(asset)article.append(make('p',asset.name));
      article.append(actions);
      grid.append(article);
    }
    section.append(heading,grid);groupsNode.append(section);
  }
}

byId('apply-kit').addEventListener('click',async ()=>{
  try {await pending;await saveKit('applied',kit);report('Applied in this browser. Reload the game to see the changes.');}
  catch(failure){showError(failure);}
});
byId('restore-defaults').addEventListener('click',async ()=>{
  try {await saveKit('applied',blankKit());report('Default game artwork restored. Your draft is still available.');}
  catch(failure){showError(failure);}
});
byId('export-kit').addEventListener('click',async ()=>{
  try {
    const url=URL.createObjectURL(new Blob([await exportKit(kit)],{type:'application/json'}));
    const link=make('a');link.href=url;link.download='chi-island-design-kit.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    report('Kit exported. Share the JSON file to hand it off.');
  } catch(failure){showError(failure);}
});
byId('import-kit').addEventListener('change',async event=>{
  const input=event.target,file=input.files[0];
  if(!file)return;
  try {
    const replacement=await importKit(file);
    await pending.catch(()=>{});
    await saveKit('draft',replacement);
    kit=replacement;
    render();report('Imported into the draft. Preview it before applying.');
  }catch(failure){showError(failure);}
  finally {input.value='';}
});
byId('preview-kit').addEventListener('click',event=>{
  // Keep the link native so it opens reliably, even in browsers that block popups.
  if(byId('kit-editor').hidden){event.preventDefault();showError(new Error('The draft hasn’t loaded yet.'));}
});
try {
  kit=await readKit('draft');
  render();byId('kit-editor').hidden=false;
  report('Draft artwork is stored in this browser. Export a kit to share it.');
} catch(failure){showError(failure);}
