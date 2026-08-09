/* Premade App Store games — HTML + config.ini (edited in Notepad, applied on relaunch) */
(function () {
  const css = `
    html,body{margin:0;height:100%;background:#111;color:#eee;font-family:Tahoma,sans-serif;overflow:hidden}
    canvas{display:block;margin:0 auto;background:#000;image-rendering:pixelated}
    .bar{display:flex;gap:8px;align-items:center;justify-content:center;padding:8px;background:#222;flex-wrap:wrap}
    button{font:inherit;padding:4px 10px;cursor:pointer}
    .hud{font-size:14px}
  `;

  function shell(title, extraHead, body) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>${css}${extraHead || ""}</style></head><body>${body}</body></html>`;
  }

  const snake = shell(
    "Snake",
    "",
    `<div class="bar"><span class="hud" id="score">Score: 0</span><button id="restart">Restart</button></div>
<canvas id="c"></canvas>
<script>
const CFG=Object.assign({apples:1,grid_size:20,player_speed:5},window.GAME_CFG||{});
const N=Math.max(8,Math.min(40,CFG.grid_size|0||20));
const applesWanted=Math.max(1,Math.min(20,CFG.apples|0||1));
const spd=Math.max(1,Math.min(10,CFG.player_speed|0||5));
const tickMs=Math.max(40,220-spd*18);
const CELL=Math.max(10,Math.floor(400/N));
const SIZE=N*CELL;
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
canvas.width=SIZE;canvas.height=SIZE;
let snake,dir,foods,score,alive,timer;
function reset(){
  snake=[{x:(N/2)|0,y:(N/2)|0}];dir={x:1,y:0};score=0;alive=true;foods=[];
  for(let i=0;i<applesWanted;i++)placeFood();
  document.getElementById('score').textContent='Score: 0';
  clearInterval(timer);timer=setInterval(tick,tickMs);
  draw();
}
function placeFood(){
  let f,guard=0;
  do{
    f={x:(Math.random()*N)|0,y:(Math.random()*N)|0};
    guard++;
  }while(guard<400&&(snake.some(s=>s.x===f.x&&s.y===f.y)||foods.some(a=>a.x===f.x&&a.y===f.y)));
  foods.push(f);
}
function tick(){
  if(!alive)return;
  const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(s=>s.x===h.x&&s.y===h.y)){alive=false;draw();return;}
  snake.unshift(h);
  const fi=foods.findIndex(a=>a.x===h.x&&a.y===h.y);
  if(fi>=0){foods.splice(fi,1);score++;document.getElementById('score').textContent='Score: '+score;placeFood();}
  else snake.pop();
  draw();
}
function draw(){
  ctx.fillStyle='#102010';ctx.fillRect(0,0,SIZE,SIZE);
  ctx.fillStyle='#3f3';snake.forEach(s=>{ctx.fillRect(s.x*CELL+1,s.y*CELL+1,CELL-2,CELL-2);});
  ctx.fillStyle='#f44';foods.forEach(f=>{ctx.fillRect(f.x*CELL+1,f.y*CELL+1,CELL-2,CELL-2);});
  if(!alive){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,SIZE,SIZE);ctx.fillStyle='#fff';ctx.font='24px Tahoma';ctx.fillText('Game Over',SIZE/2-60,SIZE/2);}
}
window.addEventListener('keydown',e=>{
  const k=e.key;
  if(k==='ArrowUp'&&dir.y!==1)dir={x:0,y:-1};
  if(k==='ArrowDown'&&dir.y!==-1)dir={x:0,y:1};
  if(k==='ArrowLeft'&&dir.x!==1)dir={x:-1,y:0};
  if(k==='ArrowRight'&&dir.x!==-1)dir={x:1,y:0};
  e.preventDefault();
});
document.getElementById('restart').onclick=reset;reset();
<\/script>`
  );

  const mines = shell(
    "Minesweeper",
    `table{border-collapse:collapse;margin:12px auto} td{width:28px;height:28px;border:2px solid #808080;background:#c0c0c0;text-align:center;font-weight:bold;cursor:pointer;user-select:none}
    td.open{background:#ddd;border:1px solid #999} td.mine{background:#f66} td.flag{color:#c00}`,
    `<div class="bar"><span class="hud" id="status">Mines</span><button id="restart">New</button></div>
<table id="board"></table>
<script>
const CFG=Object.assign({mines:10,grid_size:9},window.GAME_CFG||{});
const W=Math.max(5,Math.min(24,CFG.grid_size|0||9));
const H=W;
const MINES=Math.max(1,Math.min(W*H-9,CFG.mines|0||10));
let grid,open,flag,dead,won;
function reset(){
  dead=won=false;open=Array.from({length:H},()=>Array(W).fill(false));
  flag=Array.from({length:H},()=>Array(W).fill(false));
  grid=Array.from({length:H},()=>Array(W).fill(0));
  let placed=0;
  while(placed<MINES){
    const x=(Math.random()*W)|0,y=(Math.random()*H)|0;
    if(grid[y][x]===-1)continue;grid[y][x]=-1;placed++;
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(grid[y][x]!==-1){
    let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;if(grid[ny][nx]===-1)n++;
    }grid[y][x]=n;
  }
  document.getElementById('status').textContent='Mines: '+MINES+'  ('+W+'x'+H+')';render();
}
function reveal(x,y){
  if(x<0||y<0||x>=W||y>=H||open[y][x]||flag[y][x]||dead)return;
  open[y][x]=true;
  if(grid[y][x]===-1){dead=true;for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++)if(grid[yy][xx]===-1)open[yy][xx]=true;document.getElementById('status').textContent='Boom!';return;}
  if(grid[y][x]===0)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)reveal(x+dx,y+dy);
  checkWin();
}
function checkWin(){
  let left=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!open[y][x]&&grid[y][x]!==-1)left++;
  if(left===0){won=true;document.getElementById('status').textContent='Cleared!';}
}
function render(){
  const t=document.getElementById('board');t.innerHTML='';
  for(let y=0;y<H;y++){
    const tr=document.createElement('tr');
    for(let x=0;x<W;x++){
      const td=document.createElement('td');
      if(flag[y][x]&&!open[y][x]){td.textContent='⚑';td.className='flag';}
      else if(open[y][x]){
        td.className='open'+(grid[y][x]===-1?' mine':'');
        td.textContent=grid[y][x]>0?grid[y][x]:(grid[y][x]===-1?'*':'');
      }
      td.oncontextmenu=e=>{e.preventDefault();if(open[y][x]||dead||won)return;flag[y][x]=!flag[y][x];render();};
      td.onclick=()=>{if(flag[y][x]||dead||won)return;reveal(x,y);render();};
      tr.appendChild(td);
    }
    t.appendChild(tr);
  }
}
document.getElementById('restart').onclick=reset;reset();
<\/script>`
  );

  const breaker = shell(
    "Block Breaker",
    "",
    `<div class="bar"><span class="hud" id="score">Score: 0</span><button id="restart">Restart</button></div>
<canvas id="c" width="480" height="360"></canvas>
<script>
const CFG=Object.assign({rows:5,ball_speed:3,player_speed:6},window.GAME_CFG||{});
const ROWS=Math.max(1,Math.min(12,CFG.rows|0||5));
const BALL_SPD=Math.max(1,Math.min(12,Number(CFG.ball_speed)||3));
const P_SPD=Math.max(1,Math.min(16,Number(CFG.player_speed)||6));
const COLS=10;
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
let paddle,ball,bricks,score,alive,keys={};
function reset(){
  paddle={x:210,y:340,w:60,h:10};
  const ang=-Math.PI/2+(Math.random()*0.5-0.25);
  ball={x:240,y:300,vx:Math.cos(ang)*BALL_SPD,vy:Math.sin(ang)*BALL_SPD,r:6};
  score=0;alive=true;bricks=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)bricks.push({x:8+c*47,y:30+r*18,w:44,h:14,alive:true});
  document.getElementById('score').textContent='Score: 0';
}
function tick(){
  if(!alive){draw();requestAnimationFrame(tick);return;}
  if(keys['ArrowLeft']||keys['a'])paddle.x-=P_SPD;
  if(keys['ArrowRight']||keys['d'])paddle.x+=P_SPD;
  paddle.x=Math.max(0,Math.min(480-paddle.w,paddle.x));
  ball.x+=ball.vx;ball.y+=ball.vy;
  if(ball.x<ball.r||ball.x>480-ball.r)ball.vx*=-1;
  if(ball.y<ball.r)ball.vy*=-1;
  if(ball.y>360){alive=false;}
  if(ball.y+ball.r>=paddle.y&&ball.x>paddle.x&&ball.x<paddle.x+paddle.w&&ball.vy>0){
    ball.vy*=-1;ball.vx+=(ball.x-(paddle.x+paddle.w/2))/20;
    const mag=Math.hypot(ball.vx,ball.vy)||1;
    ball.vx=(ball.vx/mag)*BALL_SPD;ball.vy=(ball.vy/mag)*BALL_SPD;
    if(ball.vy>0)ball.vy=-ball.vy;
  }
  bricks.forEach(b=>{
    if(!b.alive)return;
    if(ball.x>b.x&&ball.x<b.x+b.w&&ball.y>b.y&&ball.y<b.y+b.h){
      b.alive=false;ball.vy*=-1;score+=10;document.getElementById('score').textContent='Score: '+score;
    }
  });
  if(bricks.every(b=>!b.alive))alive=false;
  draw();requestAnimationFrame(tick);
}
function draw(){
  ctx.fillStyle='#102030';ctx.fillRect(0,0,480,360);
  ctx.fillStyle='#4af';ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();
  bricks.forEach(b=>{if(!b.alive)return;ctx.fillStyle='#f84';ctx.fillRect(b.x,b.y,b.w,b.h);});
  if(!alive){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,480,360);ctx.fillStyle='#fff';ctx.font='22px Tahoma';ctx.fillText(bricks.every(b=>!b.alive)?'You win!':'Game Over',180,180);}
}
window.addEventListener('keydown',e=>{keys[e.key]=true;});
window.addEventListener('keyup',e=>{keys[e.key]=false;});
document.getElementById('restart').onclick=()=>{reset();};
reset();tick();
<\/script>`
  );

  const pong = shell(
    "Pong",
    `.modes button{margin:0 2px}.modes button.active{background:#08f;color:#fff}`,
    `<div class="bar modes">
  <button data-mode="1v1" class="active">1v1</button>
  <button data-mode="1vbot">1v Bot</button>
  <button data-mode="training">Training</button>
  <span class="hud" id="score">0 — 0</span>
  <button id="restart">Restart</button>
</div>
<canvas id="c" width="560" height="320"></canvas>
<script>
const CFG=Object.assign({ball_speed:4,player_speed:5,bot_speed:4,ball_count:1},window.GAME_CFG||{});
const BALL_SPD=Math.max(1,Math.min(14,Number(CFG.ball_speed)||4));
const P_SPD=Math.max(1,Math.min(16,Number(CFG.player_speed)||5));
const BOT_SPD=Math.max(1,Math.min(16,Number(CFG.bot_speed)||4));
const BALL_N=Math.max(1,Math.min(8,CFG.ball_count|0||1));
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
let mode='1v1',p1,p2,balls,s1,s2,keys={},wall=false;
function makeBall(){
  const dir=Math.random()<.5?-1:1;
  return{x:280,y:160,vx:dir*BALL_SPD,vy:(Math.random()*2-1)*BALL_SPD*0.7,r:6};
}
function reset(){
  p1={x:20,y:130,w:10,h:60};p2={x:530,y:130,w:10,h:60};
  balls=[];for(let i=0;i<BALL_N;i++){const b=makeBall();b.y=40+i*((280)/BALL_N);balls.push(b);}
  s1=0;s2=0;wall=(mode==='training');
  if(wall){p2={x:548,y:0,w:12,h:320};}
  document.getElementById('score').textContent='0 — 0';
}
function bouncePaddle(ball,p){
  if(ball.x+ball.r>p.x&&ball.x-ball.r<p.x+p.w&&ball.y>p.y&&ball.y<p.y+p.h){
    ball.vx*=-1;ball.vy+=(ball.y-(p.y+p.h/2))/20;
    const mag=Math.hypot(ball.vx,ball.vy)||1;
    ball.vx=(ball.vx/mag)*BALL_SPD;ball.vy=(ball.vy/mag)*BALL_SPD;
    ball.x=ball.vx>0?p.x+p.w+ball.r:p.x-ball.r;
  }
}
function tick(){
  if(keys['w']||keys['W'])p1.y-=P_SPD;
  if(keys['s']||keys['S'])p1.y+=P_SPD;
  p1.y=Math.max(0,Math.min(320-p1.h,p1.y));
  if(mode==='1v1'){
    if(keys['ArrowUp'])p2.y-=P_SPD;
    if(keys['ArrowDown'])p2.y+=P_SPD;
    p2.y=Math.max(0,Math.min(320-p2.h,p2.y));
  } else if(mode==='1vbot'){
    const lead=balls.reduce((a,b)=>Math.abs(b.x-p2.x)<Math.abs(a.x-p2.x)?b:a,balls[0]);
    const target=lead.y-p2.h/2;
    if(p2.y+BOT_SPD<target)p2.y+=BOT_SPD; else if(p2.y-BOT_SPD>target)p2.y-=BOT_SPD;
    p2.y=Math.max(0,Math.min(320-p2.h,p2.y));
  }
  balls.forEach(ball=>{
    ball.x+=ball.vx;ball.y+=ball.vy;
    if(ball.y<ball.r||ball.y>320-ball.r)ball.vy*=-1;
    bouncePaddle(ball,p1);
    if(wall){
      if(ball.x+ball.r>=p2.x){ball.vx= -Math.abs(ball.vx);ball.x=p2.x-ball.r;}
    } else bouncePaddle(ball,p2);
    if(ball.x<0){s2++;Object.assign(ball,makeBall());ball.vx=Math.abs(ball.vx);document.getElementById('score').textContent=s1+' — '+s2;}
    if(ball.x>560){s1++;Object.assign(ball,makeBall());ball.vx=-Math.abs(ball.vx);document.getElementById('score').textContent=s1+' — '+s2;}
  });
  draw();requestAnimationFrame(tick);
}
function draw(){
  ctx.fillStyle='#0a0a12';ctx.fillRect(0,0,560,320);
  ctx.strokeStyle='#333';ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(280,0);ctx.lineTo(280,320);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#eee';ctx.fillRect(p1.x,p1.y,p1.w,p1.h);
  ctx.fillStyle=wall?'#8af':'#eee';ctx.fillRect(p2.x,p2.y,p2.w,p2.h);
  ctx.fillStyle='#fff';
  balls.forEach(ball=>{ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();});
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-mode]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');mode=b.dataset.mode;reset();
});
window.addEventListener('keydown',e=>{keys[e.key]=true;});
window.addEventListener('keyup',e=>{keys[e.key]=false;});
document.getElementById('restart').onclick=reset;
reset();tick();
<\/script>`
  );

  window.ARCHIVE_STORE_GAMES = [
    {
      id: "snake",
      name: "Snake",
      folder: "Snake",
      blurb: "Classic snake. Arrow keys. Edit config.ini for apples / grid / speed.",
      config:
        "[game]\r\n" +
        "apples=1\r\n" +
        "grid_size=20\r\n" +
        "player_speed=5\r\n",
      html: snake,
    },
    {
      id: "minesweeper",
      name: "Minesweeper",
      folder: "Minesweeper",
      blurb: "Clear the board. Right-click flags. Edit config.ini for mines / size.",
      config:
        "[game]\r\n" +
        "mines=10\r\n" +
        "grid_size=9\r\n",
      html: mines,
    },
    {
      id: "block-breaker",
      name: "Block Breaker",
      folder: "Block Breaker",
      blurb: "Break the blocks. Edit config.ini for rows / speeds.",
      config:
        "[game]\r\n" +
        "rows=5\r\n" +
        "ball_speed=3\r\n" +
        "player_speed=6\r\n",
      html: breaker,
    },
    {
      id: "pong",
      name: "Pong",
      folder: "Pong",
      blurb: "1v1, 1v Bot, or Training. Edit config.ini for speeds / balls.",
      config:
        "[game]\r\n" +
        "ball_speed=4\r\n" +
        "player_speed=5\r\n" +
        "bot_speed=4\r\n" +
        "ball_count=1\r\n",
      html: pong,
    },
  ];
})();
