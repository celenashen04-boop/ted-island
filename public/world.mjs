import { islandRim, islandLandmarks } from './islands.mjs';

export function createWorld(canvas, artwork = new Map()) {
  const ctx=canvas.getContext('2d');
  let islands=[],bridges=[],home=0,yaw=.25,pitch=.55,drag=null;

  function draw(){
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width||!height)return;
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
        continue;
      }
      const tile=(x,z,y)=>project(rotate({x:island.x+x,y:island.y+y,z:island.z+z}));
      const edge=islandRim.map(([x,z])=>tile(x,z,0));
      const bottom=tile(0,0,-1.0);
      for(let i=0;i<edge.length;i++)path([edge[i],edge[(i+1)%edge.length],bottom],i%2?'#70605e':'#8b7470');
      path(edge,island.color);
      for(const [x,z,y] of islandLandmarks){
        const base=tile(x,z,0),top=tile(x,z,y);
        ctx.strokeStyle='#e4ceb0';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(...base);ctx.lineTo(...top);ctx.stroke();
      }
    }
    const labels=[];
    for(const island of items){
      const [x,y]=project({...island.position,y:island.position.y+.70});
      ctx.font='600 14px system-ui';
      const w=Math.min(width-16,ctx.measureText(island.name).width+18);
      const left=Math.max(8,Math.min(width-w-8,x-w/2));
      let top=Math.max(8,y-20);
      while(labels.some(label=>left<label.left+label.w+4&&left+w+4>label.left&&Math.abs(label.top-top)<26))top+=26;
      labels.push({left,top,w});
      ctx.fillStyle=island.id===home?'#e9d6a6':'#102833';
      ctx.beginPath();ctx.roundRect(left,top,w,23,6);ctx.fill();
      ctx.fillStyle=island.id===home?'#203431':'#f9f5e6';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(island.name,left+w/2,top+12,w-10);
    }
  }
  canvas.addEventListener('pointerdown',event=>{
    if(drag)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId!==drag?.id)return;
    yaw+=(event.clientX-drag.x)*.012;
    pitch=Math.max(.22,Math.min(1.20,pitch+(event.clientY-drag.y)*.008));
    drag.x=event.clientX;drag.y=event.clientY;draw();
  });
  canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  new ResizeObserver(draw).observe(canvas);
  return {
    update(state){({islands,bridges,home}=state);draw();},
    draw
  };
}
