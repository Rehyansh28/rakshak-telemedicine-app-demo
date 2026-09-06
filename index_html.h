const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ECG Monitor</title>
<style>
 body{background:#0b0f14;color:#d7e3ee;font-family:system-ui,sans-serif;margin:0;padding:20px}
 #wrap{max-width:900px;margin:auto}
 h1{font-size:20px}
 canvas{width:100%;height:320px;background:#050a0f;border:1px solid #1d2a36;border-radius:8px;display:block}
 .bar{display:flex;gap:24px;align-items:center;margin:10px 0;font-size:14px}
 .dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}
 .ok{background:#2ecc71}.bad{background:#e74c3c}
 .stats{display:flex;gap:28px;margin-top:12px;font-size:13px;color:#7f95a8;flex-wrap:wrap}
</style></head><body><div id="wrap">
 <h1>ECG MONITOR</h1>
 <div class="bar">
   <span><span id="dot" class="dot bad"></span><span id="status">DISCONNECTED</span></span>
   <span>Leads: <b id="leads">--</b></span>
 </div>
 <canvas id="ecg"></canvas>
 <div class="stats">
   <span>Rate: <b id="fs">250</b> Hz</span>
   <span>Samples: <b id="count">0</b></span>
   <span>Raw ADC counts, uncalibrated - educational prototype, not for medical use</span>
 </div>
</div>
<script>
const WINDOW = 1250;                       // 5 seconds at 250 Hz
const buf = new Array(WINDOW).fill(null);  // ring buffer of recent samples
let head = 0, total = 0, leadsOff = false;

// ---- 1. RECEIVE. Do almost no work in here. ----
function connect(){
  const ws = new WebSocket("ws://" + location.host + "/ws");
  ws.onopen  = () => setStatus(true);
  ws.onclose = () => { setStatus(false); setTimeout(connect, 1000); };  // auto-reconnect
  ws.onerror = () => ws.close();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    for (const v of m.d){        // append each of the 25 samples
      buf[head] = v;
      head = (head + 1) % WINDOW;   // wrap around, overwriting the oldest
      total++;
    }
    leadsOff = m.d[m.d.length-1] === -1;
    document.getElementById('fs').textContent = m.fs;
  };
}
function setStatus(up){
  document.getElementById('dot').className = 'dot ' + (up ? 'ok' : 'bad');
  document.getElementById('status').textContent = up ? 'CONNECTED' : 'DISCONNECTED';
}

// ---- 2. DRAW. Runs independently, at the screen's refresh rate. ----
const cv = document.getElementById('ecg'), ctx = cv.getContext('2d');
function resize(){ cv.width = cv.clientWidth*devicePixelRatio; cv.height = cv.clientHeight*devicePixelRatio; }
addEventListener('resize', resize); resize();

function draw(){
  const W = cv.width, H = cv.height;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle = '#152230'; ctx.lineWidth = 1;             // faint ECG-paper grid
  for(let x=0;x<W;x+=W/25){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=H/8) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2*devicePixelRatio;
  ctx.beginPath();
  let started = false;
  for(let i=0;i<WINDOW;i++){
    const v = buf[(head+i)%WINDOW];                    // read oldest -> newest
    if(v === null || v === -1){ started = false; continue; }  // gap when leads are off
    const x = (i/WINDOW)*W;
    const y = H - (v/4095)*H;                          // map 0..4095 onto the canvas
    if(!started){ ctx.moveTo(x,y); started = true; } else { ctx.lineTo(x,y); }
  }
  ctx.stroke();

  document.getElementById('count').textContent = total;
  document.getElementById('leads').textContent = leadsOff ? 'OFF' : 'OK';
  requestAnimationFrame(draw);                         // ask for the next frame
}
connect(); draw();
</script></body></html>
)rawliteral";