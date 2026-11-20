import { islandRim, islandLandmarks } from './islands.mjs';

export function createWorld(canvas, artwork, homeButton, enterHome) {
  const ctx=canvas.getContext('2d');
  let islands=[],bridges=[],home=0,yaw=.25,pitch=.55,drag=null,targets=[];

  function draw(){
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width||!height)return;
    targets=[];
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const sky=ctx.createLinearGradient(0,0,width,height);
    sky.addColorStop(0,'#182d3c');sky.addColorStop(1,'#355964');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const scale=Math.min(width/8,height/5.6);
    const rotate=({x,y,z})=>({x:x*Math.cos(yaw)-z*Math.sin(yaw),y,z:x*Math.sin(yaw)+z*Math.cos(yaw)});
    const project=({x,y,z})=>[width/2+x*scale,height*.53+(z*Math.sin(pitch)-y*Math.cos(pitch))*scale];
    const items=islands.map(island=>({...island,position:rotate(island)})).sort((a,b)=>a.position.z-b.position.z);
    const path=(points,color)=>{
      ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
    };
    for(const bridge of bridges){
      const start=items.find(item=>item.id===home),end=items.find(item=>item.id===bridge.destination);
      if(!start||!end)continue;
      const [ax,ay]=project(start.position),[bx,by]=project(end.position);
      const art=artwork.get(bridge.open?'bridge-open':bridge.progress>=40?'bridge-walkway':'bridge-foundation');
      if(art){
        const length=Math.hypot(bx-ax,by-ay);
        ctx.save();ctx.translate(ax,ay);ctx.rotate(Math.atan2(by-ay,bx-ax));
        ctx.drawImage(art,0,-9,length,18);ctx.restore();
        continue;
      }
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);
      ctx.lineWidth=3;ctx.strokeStyle=bridge.open?'#e6cd8d':'#b7a475';ctx.setLineDash(bridge.open?[]:[4,7]);ctx.stroke();
    }
    ctx.setLineDash([]);
    for(const island of items){
      const image=artwork.get('island-'+island.id);
      if(image){
        const [x,y]=project(island.position);
        const w=Math.min(scale*1.65,scale*1.9*image.width/image.height);
        const h=w*image.height/image.width;
        ctx.drawImage(image,x-w/2,y-h*.35,w,h);
        targets.push({id:island.id,polygons:[[[x-w/2,y-h*.35],[x+w/2,y-h*.35],[x+w/2,y+h*.65],[x-w/2,y+h*.65]]]});
        continue;
      }
      const tile=(x,z,y)=>project(rotate({x:island.x+x,y:island.y+y,z:island.z+z}));
      const edge=islandRim.map(([x,z])=>tile(x,z,0));
      const bottom=tile(0,0,-1.0);
      const sides=edge.map((point,index)=>[point,edge[(index+1)%edge.length],bottom]);
      sides.forEach((side,index)=>path(side,index%2?'#70605e':'#8b7470'));
      path(edge,island.color);
      const polygons=[...sides,edge];
      targets.push({id:island.id,polygons});
      for(const [x,z,y] of islandLandmarks){
        const base=tile(x,z,0),top=tile(x,z,y);
        ctx.strokeStyle='#e4ceb0';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(...base);ctx.lineTo(...top);ctx.stroke();
        polygons.push([[top[0]-4,top[1]-3],[top[0]+4,top[1]-3],[base[0]+4,base[1]+3],[base[0]-4,base[1]+3]]);
      }
    }
    const labels=[];
    const homeEntry=items.find(island=>island.id===home);
    homeButton.hidden=!homeEntry;
    for(const island of items){
      const [x,y]=project({...island.position,y:island.position.y+.70});
      ctx.font='600 14px system-ui';
      const isHome=island.id===home;
      const h=isHome?44:23;
      const w=Math.min(width-16,ctx.measureText(island.name).width+(isHome?52:18));
      const left=Math.max(8,Math.min(width-w-8,x-w/2));
      let top=Math.max(8,Math.min(height-h-8,y-20));
      while(labels.some(label=>left<label.left+label.w+4&&left+w+4>label.left&&top<label.top+label.h+4&&top+h+4>label.top))top+=h+4;
      labels.push({left,top,w,h});
      if(isHome){
        homeButton.textContent=island.name;
        homeButton.setAttribute('aria-label','Enter '+island.name+', your home island');
        homeButton.style.left=left+'px';
        homeButton.style.top=top+'px';
        homeButton.style.width=w+'px';
        continue;
      }
      ctx.fillStyle='#162c37';
      ctx.beginPath();ctx.roundRect(left,top,w,h,6);ctx.fill();
      ctx.fillStyle='#a2b3b4';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(island.name,left+w/2,top+12,w-10);
    }
  }

  function contains(point,polygon){
    const [x,y]=point;
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [ax,ay]=polygon[i], [bx,by]=polygon[j];
      if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    }
    return inside;
  }

  function homeAt(event){
    const rect=canvas.getBoundingClientRect();
    const point=[event.clientX-rect.left,event.clientY-rect.top];
    return targets.findLast(target=>target.polygons.some(polygon=>contains(point,polygon)))?.id===home;
  }

  homeButton.addEventListener('click',enterHome);
  canvas.addEventListener('pointerdown',event=>{
    if(drag || event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,travel:0};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag){canvas.style.cursor=homeAt(event)?'pointer':'';return;}
    if(event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x, dy=event.clientY-drag.y;
    drag.travel+=Math.hypot(dx,dy);
    drag.x=event.clientX;drag.y=event.clientY;
    if(drag.travel<6)return;
    canvas.style.cursor='grabbing';
    yaw+=dx*.012;
    pitch=Math.max(.22,Math.min(1.20,pitch+dy*.008));
    draw();
  });
  canvas.addEventListener('pointerup',event=>{
    if(event.pointerId!==drag?.id)return;
    const enter=drag.travel<6&&homeAt(event);
    drag=null;
    canvas.style.cursor='';
    if(enter)enterHome();
  });
  canvas.addEventListener('lostpointercapture',event=>{
    if(event.pointerId===drag?.id)drag=null;
    canvas.style.cursor='';
  });
  new ResizeObserver(draw).observe(canvas);
  return {
    update(state){({islands,bridges,home}=state);draw();},
    draw
  };
}
