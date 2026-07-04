gsap.registerPlugin(ScrollTrigger);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* THEME (dark mode) */
(function(){
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  root.setAttribute('data-theme', initial);

  document.querySelectorAll('.theme-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  });
})();

/* MOBILE MENU */
(function(){
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileMenu');
  if(!toggle || !menu) return;

  const closeMenu = ()=>{
    toggle.classList.remove('open');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', ()=>{
    const isOpen = menu.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  menu.querySelectorAll('a').forEach(a=> a.addEventListener('click', closeMenu));
})();

const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 'top -60',
  onUpdate: self => nav.classList.toggle('scrolled', self.scroll() > 60)
});

if(!reduceMotion){
  gsap.set(['#hero-title','#hero-sub','#hero-actions'], {y:26, filter:'blur(10px)'});
  const tl = gsap.timeline({defaults:{ease:'power3.out'}});
  tl.to('#hero-title', {opacity:1, y:0, filter:'blur(0px)', duration:1.1}, 0.15)
    .to('#hero-sub', {opacity:1, y:0, filter:'blur(0px)', duration:1}, 0.4)
    .to('#hero-actions', {opacity:1, y:0, filter:'blur(0px)', duration:0.9}, 0.6);
} else {
  gsap.set(['#hero-title','#hero-sub','#hero-actions'], {opacity:1});
}

document.querySelectorAll('.reveal').forEach(el=>{
  if(el.id && el.id.startsWith('hero')) return; // handled above
  if(reduceMotion){ gsap.set(el, {opacity:1}); return; }
  gsap.set(el, {y:34, opacity:0, filter:'blur(6px)'});
  gsap.to(el, {
    y:0, opacity:1, filter:'blur(0px)',
    duration:1.1, ease:'power3.out',
    scrollTrigger:{trigger:el, start:'top 88%', once:true}
  });
});

/* stagger project cards */
gsap.utils.toArray('.projects-grid .card').forEach((el,i)=>{
  if(reduceMotion) return;
  gsap.fromTo(el, {y:50, opacity:0, filter:'blur(6px)'}, {
    y:0, opacity:1, filter:'blur(0px)', duration:1, delay:i*0.08, ease:'power3.out',
    scrollTrigger:{trigger:el, start:'top 90%', once:true}
  });
});

/* ============ COUNT-UP STATS ============ */
document.querySelectorAll('[data-count]').forEach(el=>{
  const target = parseInt(el.dataset.count, 10);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      const obj = {val:0};
      gsap.to(obj, {
        val: target, duration: 1.6, ease:'power2.out',
        onUpdate: () => el.textContent = Math.floor(obj.val) + (target>=25?'+':'')
      });
    }
  });
});

/* ============ ABOUT VISUAL PARALLAX ============ */
if(!reduceMotion && window.innerWidth > 720){
  gsap.to('.about-visual', {
    yPercent:-6, ease:'none',
    scrollTrigger:{trigger:'.about', start:'top bottom', end:'bottom top', scrub:1}
  });
}

/* ============ HERO CANVAS: drifting node network (signature element) ============ */
(function(){
  const canvas = document.getElementById('hero-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w,h,dpr;
  let nodes = [];
  let mouse = {x:0, y:0, active:false};

  function lineColor(){
    return getComputedStyle(document.documentElement).getPropertyValue('--line-rgb').trim() || '58,58,60';
  }

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const isMobile = w < 720;
    const count = Math.round((w*h)/30000);
    nodes = Array.from({length: Math.max(isMobile?16:24, Math.min(count, isMobile?32:60))}, ()=>({
      x: Math.random()*w,
      y: Math.random()*h,
      vx: (Math.random()-0.5)*0.18,
      vy: (Math.random()-0.5)*0.18,
      r: Math.random()*1.6+1
    }));
  }

  function step(){
    ctx.clearRect(0,0,w,h);
    const rgb = lineColor();
    nodes.forEach(n=>{
      n.x += n.vx; n.y += n.vy;
      if(n.x<0||n.x>w) n.vx*=-1;
      if(n.y<0||n.y>h) n.vy*=-1;
    });
    const maxDist = Math.min(160, w/6);
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i], b=nodes[j];
        const dx=a.x-b.x, dy=a.y-b.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<maxDist){
          const op = (1-dist/maxDist)*0.16;
          ctx.strokeStyle = `rgba(${rgb},${op})`;
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
      if(mouse.active){
        const dx=nodes[i].x-mouse.x, dy=nodes[i].y-mouse.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<180){
          const op=(1-dist/180)*0.3;
          ctx.strokeStyle=`rgba(47,95,255,${op})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(mouse.x,mouse.y);
          ctx.stroke();
        }
      }
    }
    nodes.forEach(n=>{
      ctx.beginPath();
      ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${rgb},0.4)`;
      ctx.fill();
    });
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  canvas.parentElement.addEventListener('mousemove', e=>{
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX-rect.left; mouse.y = e.clientY-rect.top; mouse.active=true;
  });
  canvas.parentElement.addEventListener('mouseleave', ()=> mouse.active=false);
  canvas.parentElement.addEventListener('touchmove', e=>{
    if(!e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX-rect.left; mouse.y = e.touches[0].clientY-rect.top; mouse.active=true;
  }, {passive:true});

  resize();
  if(!reduceMotion) requestAnimationFrame(step);
  else { step(); }
})();
