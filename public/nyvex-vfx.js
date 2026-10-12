/* NYVEX signature visual: a refractive crystal moving through an orbital flow field. */
(() => {
  'use strict';
  const stage = document.querySelector('.nyvex-visual');
  const canvas = document.getElementById('nyvex-vfx');
  if (!stage || !canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette = {
    DREAM: [[190,166,255],[129,220,246],[238,201,255]],
    FORGE: [[119,221,255],[157,249,224],[182,180,255]],
    SCOUT: [[255,177,216],[155,198,255],[218,185,255]],
    TACTIC: [[145,239,210],[142,207,255],[201,177,255]]
  };
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
    [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
    [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]
  ];
  const edges = [], edgeSet = new Set(), faces = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      let distance = 0;
      for (let k = 0; k < 3; k++) distance += Math.pow(vertices[i][k] - vertices[j][k], 2);
      if (Math.abs(distance - 4) < .001) {
        edges.push([i,j]);
        edgeSet.add(i + ',' + j);
      }
    }
  }
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      for (let k = j + 1; k < vertices.length; k++) {
        if (edgeSet.has(i + ',' + j) && edgeSet.has(i + ',' + k) && edgeSet.has(j + ',' + k)) faces.push([i,j,k]);
      }
    }
  }

  let width = 0, height = 0, dpr = 1, frame = 0;
  let running = false, visible = !document.hidden, lastTime = 0;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  let mode = 'DREAM', state = 'idle';
  const particles = Array.from({length: 92}, (_, index) => ({
    angle: Math.random() * Math.PI * 2,
    radius: .16 + Math.random() * .6,
    phase: Math.random() * Math.PI * 2,
    speed: .15 + Math.random() * .42,
    size: .55 + Math.random() * 1.15,
    strand: index % 4,
    drift: (Math.random() - .5) * .16
  }));
  const rgb = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const colors = () => palette[mode] || palette.DREAM;

  function project(point, centerX, centerY, scale, time) {
    const x0 = point[0], y0 = point[1], z0 = point[2];
    const yaw = time * (state === 'thinking' ? .36 : .18) + pointerX * .12;
    const pitch = time * .13 + pointerY * .08;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const x1 = x0 * cy - z0 * sy;
    const z1 = x0 * sy + z0 * cy;
    const y1 = y0 * cx - z1 * sx;
    const z2 = y0 * sx + z1 * cx;
    const perspective = 3.6 / (3.6 + z2);
    return { x: centerX + x1 * scale * perspective, y: centerY + y1 * scale * perspective, z: z2 };
  }

  function draw(time) {
    if (!width || !height) return;
    const colorsNow = colors();
    ctx.clearRect(0,0,width,height);
    const minSide = Math.min(width,height);
    const cx = width * (.53 + pointerX * .025);
    const cy = height * (.47 + pointerY * .018);
    const scale = minSide * (state === 'thinking' ? .205 : .185);
    const energy = state === 'thinking' ? 1.45 : 1;

    const aura = ctx.createRadialGradient(cx,cy,0,cx,cy,minSide*.42);
    aura.addColorStop(0,rgb(colorsNow[0],.22));
    aura.addColorStop(.33,rgb(colorsNow[1],.1));
    aura.addColorStop(1,rgb(colorsNow[2],0));
    ctx.fillStyle = aura;
    ctx.fillRect(0,0,width,height);

    // Elliptical instrument rings establish depth around the crystal.
    ctx.save();
    ctx.translate(cx,cy);
    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath();
      ctx.ellipse(0,0,minSide*(.18+ring*.067),minSide*(.075+ring*.025),-.42+ring*.22+time*.025,0,Math.PI*2);
      ctx.strokeStyle = rgb(colorsNow[ring % colorsNow.length],.1+(ring===1?.09:0));
      ctx.lineWidth = ring===1 ? 1 : .65;
      ctx.stroke();
    }
    ctx.rotate(time*.035);
    for (let i = 0; i < 52; i++) {
      const angle = i/52*Math.PI*2;
      const r1 = minSide*.29, r2 = r1+(i%4===0?7:3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle)*r1,Math.sin(angle)*r1*.47);
      ctx.lineTo(Math.cos(angle)*r2,Math.sin(angle)*r2*.47);
      ctx.strokeStyle = rgb(colorsNow[1],i%4===0?.42:.16);
      ctx.lineWidth = i%4===0?.9:.55;
      ctx.stroke();
    }
    ctx.restore();

    // Flow field: small light traces move along irregular orbital paths.
    for (const particle of particles) {
      const angle = particle.angle + time*particle.speed*.45*energy;
      const wave = Math.sin(time*.42+particle.phase+particle.strand)*.035;
      const radius = minSide*(particle.radius+wave);
      const x = cx+Math.cos(angle)*radius*(1.08+particle.drift)+pointerX*minSide*.04;
      const y = cy+Math.sin(angle*(1+particle.strand*.015)+particle.phase*.08)*radius*.69+pointerY*minSide*.035;
      if (x<8||x>width-8||y<8||y>height-8) continue;
      const alpha = (.17+.33*(Math.sin(time*.8+particle.phase)+1)/2)*(state==='thinking'?1.35:1);
      ctx.beginPath();
      ctx.arc(x,y,particle.size*(state==='thinking'?1.08:1),0,Math.PI*2);
      ctx.fillStyle = rgb(colorsNow[particle.strand%colorsNow.length],alpha);
      ctx.fill();
      if (particle.strand===1&&particle.size>1.2) {
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x-Math.cos(angle)*9,y-Math.sin(angle)*9);
        ctx.strokeStyle = rgb(colorsNow[1],alpha*.48);
        ctx.lineWidth = .7;
        ctx.stroke();
      }
    }

    // A slowly rotating icosahedron with translucent faces and luminous edges.
    const points = vertices.map(point => project(point,cx,cy,scale,time));
    const sortedFaces = faces.map(face => ({
      face: face,
      depth: (points[face[0]].z+points[face[1]].z+points[face[2]].z)/3
    })).sort((a,b)=>a.depth-b.depth);
    for (const entry of sortedFaces) {
      const a=points[entry.face[0]], b=points[entry.face[1]], c=points[entry.face[2]];
      ctx.beginPath();
      ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineTo(c.x,c.y); ctx.closePath();
      const alpha=.025+((entry.depth+1.8)/3.6)*.07;
      ctx.fillStyle=rgb(colorsNow[(entry.face[0]+entry.face[1])%colorsNow.length],alpha);
      ctx.fill();
      ctx.strokeStyle=rgb(colorsNow[0],.11);
      ctx.lineWidth=.55;
      ctx.stroke();
    }
    for (const edge of edges) {
      const a=points[edge[0]], b=points[edge[1]];
      const alpha=.26+((a.z+b.z+3.2)/6.4)*.48;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
      const gradient=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
      gradient.addColorStop(0,rgb(colorsNow[0],alpha));
      gradient.addColorStop(.52,rgb(colorsNow[1],alpha*1.3));
      gradient.addColorStop(1,rgb(colorsNow[2],alpha*.7));
      ctx.strokeStyle=gradient;
      ctx.lineWidth=state==='thinking'?1.25:.95;
      ctx.stroke();
    }
    points.forEach((point,index)=>{
      ctx.beginPath();
      ctx.arc(point.x,point.y,1.15+Math.max(0,point.z)*.42,0,Math.PI*2);
      ctx.fillStyle=rgb(colorsNow[index%colorsNow.length],.75);
      ctx.fill();
    });
    const centerGlow=ctx.createRadialGradient(cx-scale*.2,cy-scale*.24,0,cx,cy,scale*1.2);
    centerGlow.addColorStop(0,rgb(colorsNow[2],.12));
    centerGlow.addColorStop(.45,rgb(colorsNow[0],.055));
    centerGlow.addColorStop(1,rgb(colorsNow[0],0));
    ctx.fillStyle=centerGlow;
    ctx.beginPath(); ctx.arc(cx,cy,scale*1.25,0,Math.PI*2); ctx.fill();

    if (!motionQuery.matches) {
      const sweepY=(time*(state==='thinking'?52:24)%(height+100))-50;
      const sweep=ctx.createLinearGradient(0,sweepY-18,0,sweepY+18);
      sweep.addColorStop(0,rgb(colorsNow[1],0));
      sweep.addColorStop(.5,rgb(colorsNow[1],state==='thinking'?.08:.035));
      sweep.addColorStop(1,rgb(colorsNow[1],0));
      ctx.fillStyle=sweep;
      ctx.fillRect(0,sweepY-18,width,36);
    }
  }

  function resize() {
    const rect=stage.getBoundingClientRect();
    width=Math.max(1,rect.width);
    height=Math.max(1,rect.height);
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);
    canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw(performance.now()*.001);
  }
  function animate(timestamp) {
    if (!running||!visible||motionQuery.matches) return;
    const now=timestamp*.001;
    const delta=lastTime?Math.min(.06,now-lastTime):.016;
    lastTime=now;
    pointerX+=(targetX-pointerX)*Math.min(1,delta*2.8);
    pointerY+=(targetY-pointerY)*Math.min(1,delta*2.8);
    draw(now);
    frame=requestAnimationFrame(animate);
  }
  function start() {
    if(running||!visible||motionQuery.matches) return;
    running=true; lastTime=0; frame=requestAnimationFrame(animate);
  }
  function stop() {
    running=false;
    if(frame) cancelAnimationFrame(frame);
    frame=0;
  }
  function setMode(next) {
    if(!palette[next]) return;
    mode=next;
    stage.dataset.mode=next.toLowerCase();
  }

  stage.addEventListener('pointermove',event=>{
    const rect=stage.getBoundingClientRect();
    targetX=Math.max(-1,Math.min(1,((event.clientX-rect.left)/rect.width-.5)*2));
    targetY=Math.max(-1,Math.min(1,((event.clientY-rect.top)/rect.height-.5)*2));
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{targetX=0;targetY=0;},{passive:true});
  document.querySelectorAll('[data-mode]').forEach(button=>{
    button.addEventListener('click',()=>setMode(String(button.dataset.mode||'DREAM').toUpperCase()));
  });
  const thinking=document.getElementById('thinking');
  if(thinking) {
    new MutationObserver(()=>{
      state=thinking.classList.contains('hidden')?'idle':'thinking';
      stage.dataset.state=state;
      if(!running) draw(performance.now()*.001);
    }).observe(thinking,{attributes:true,attributeFilter:['class']});
  }
  if(typeof ResizeObserver!=='undefined') new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    visible=!document.hidden;
    if(!visible) stop();
    else {resize();start();}
  });
  if(typeof motionQuery.addEventListener==='function') motionQuery.addEventListener('change',()=>{stop();draw(performance.now()*.001);start();});
  resize();
  start();
})();
