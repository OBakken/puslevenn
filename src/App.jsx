import { useState, useRef, useEffect, useCallback } from "react";
import { savePuzzle, loadPuzzle } from "./storage";

/*══════════════════════════════════════════════════════════════
  PUSLEVENN — Send et bilde som puslespill
══════════════════════════════════════════════════════════════*/

const SNAP_DIST = 22;
const MAX_IMG_W = 680;
const MAX_IMG_H = 480;
const JPEG_Q = 0.52;

/*──────────────────────────────────────────────
  IMAGE COMPRESSION
──────────────────────────────────────────────*/
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > MAX_IMG_W) { h = h * MAX_IMG_W / w; w = MAX_IMG_W; }
        if (h > MAX_IMG_H) { w = w * MAX_IMG_H / h; h = MAX_IMG_H; }
        const c = document.createElement("canvas");
        c.width = Math.round(w); c.height = Math.round(h);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", JPEG_Q));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/*──────────────────────────────────────────────
  PUZZLE ENGINE
──────────────────────────────────────────────*/
function buildEdgeMap(rows, cols) {
  const h = [], v = [];
  for (let r = 0; r < rows - 1; r++) { h[r] = []; for (let c = 0; c < cols; c++) h[r][c] = Math.random() < 0.5 ? 1 : -1; }
  for (let r = 0; r < rows; r++) { v[r] = []; for (let c = 0; c < cols - 1; c++) v[r][c] = Math.random() < 0.5 ? 1 : -1; }
  return { h, v };
}

function getEdges(row, col, rows, cols, em) {
  return {
    top: row === 0 ? 0 : -em.h[row-1][col], bottom: row === rows-1 ? 0 : em.h[row][col],
    left: col === 0 ? 0 : -em.v[row][col-1], right: col === cols-1 ? 0 : em.v[row][col],
  };
}

function jigsawEdge(ax, ay, bx, by, nx, ny, type, tab) {
  if (type === 0) return `L ${bx} ${by}`;
  const dx = bx-ax, dy = by-ay, d = type, n = 0.32*tab, h = 0.85*tab;
  const pt = (f, o) => [ax+dx*f+nx*d*o, ay+dy*f+ny*d*o];
  const P = a => `${a[0].toFixed(2)} ${a[1].toFixed(2)}`;
  return [
    `L ${P(pt(.34,0))}`,
    `C ${P(pt(.36,0))} ${P(pt(.37,n*.25))} ${P(pt(.38,n))}`,
    `C ${P(pt(.38,n*1.5))} ${P(pt(.30,n+h))} ${P(pt(.42,n+h))}`,
    `C ${P(pt(.50,n+h*1.18))} ${P(pt(.50,n+h*1.18))} ${P(pt(.58,n+h))}`,
    `C ${P(pt(.70,n+h))} ${P(pt(.62,n*1.5))} ${P(pt(.62,n))}`,
    `C ${P(pt(.63,n*.25))} ${P(pt(.64,0))} ${P(pt(.66,0))}`,
    `L ${bx} ${by}`,
  ].join(" ");
}

function piecePath(cw, ch, edges, tab) {
  const o = tab, tl=[o,o], tr=[o+cw,o], br=[o+cw,o+ch], bl=[o,o+ch];
  let d = `M ${tl[0]} ${tl[1]}`;
  d += " "+jigsawEdge(tl[0],tl[1],tr[0],tr[1],0,-1,edges.top,tab);
  d += " "+jigsawEdge(tr[0],tr[1],br[0],br[1],1,0,edges.right,tab);
  d += " "+jigsawEdge(br[0],br[1],bl[0],bl[1],0,1,edges.bottom,tab);
  d += " "+jigsawEdge(bl[0],bl[1],tl[0],tl[1],-1,0,edges.left,tab);
  return d+" Z";
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [b[i],b[j]] = [b[j],b[i]];
  }
  return b;
}

function PieceSVG({ id, cw, ch, edges, tab, col, row, imgUrl, boardW, boardH, uid }) {
  const pw = cw+2*tab, ph = ch+2*tab;
  const pathD = piecePath(cw, ch, edges, tab);
  const clipId = `pc${uid}-${id}`;
  const pad = 2;
  return (
    <svg width={pw} height={ph} viewBox={`0 0 ${pw} ${ph}`} style={{display:"block",overflow:"visible"}}>
      <defs><clipPath id={clipId}><path d={pathD}/></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        <path d={pathD} fill="#8B7355"/>
        <image href={imgUrl} x={tab-col*cw-pad} y={tab-row*ch-pad}
          width={boardW+pad*2} height={boardH+pad*2} preserveAspectRatio="none"/>
      </g>
      <path d={pathD} fill="none" stroke="rgba(40,25,10,.55)" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d={pathD} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="0.6" strokeLinejoin="round"/>
    </svg>
  );
}

const PRESETS = [
  { label:"Lett", sub:"6 brikker", cols:3, rows:2, rotate:false },
  { label:"Medium", sub:"12 brikker", cols:4, rows:3, rotate:false },
  { label:"Vanskelig", sub:"12 + rotasjon", cols:4, rows:3, rotate:true },
  { label:"Ekspert", sub:"20 + rotasjon", cols:5, rows:4, rotate:true },
];

/*══════════════════════════════════════════════
  SCREEN 1: CREATE & SHARE
══════════════════════════════════════════════*/
function CreateScreen({ onPreview }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [preset, setPreset] = useState(0);
  const [msg, setMsg] = useState("");
  const [sender, setSender] = useState("");
  const [shareUrl, setShareUrl] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true); setError(null);
    const url = await compressImage(file);
    setImgUrl(url); setBusy(false);
  };

  const generate = async () => {
    if (!imgUrl) return;
    setBusy(true); setError(null);
    const id = await savePuzzle({ img: imgUrl, msg, sender, difficulty: preset });
    if (id) {
      const base = window.location.origin + window.location.pathname;
      const url = `${base}?p=${id}`;
      setShareUrl(url);
      setShareId(id);
    } else {
      setError("Kunne ikke lagre puslespillet. Sjekk Firebase-oppsettet i src/storage.js");
    }
    setBusy(false);
  };

  const getShareUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?p=${shareId}`;
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); }
    catch {
      const t = document.createElement("textarea");
      t.value = shareUrl; document.body.appendChild(t);
      t.select(); document.execCommand("copy"); document.body.removeChild(t);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={S.dark}>
      <div style={S.box}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={S.logo}>Puslevenn</div>
          <div style={S.sub}>Send et bilde som puslespill</div>
        </div>

        {!shareUrl ? (<>
          {/* Upload */}
          <div
            onClick={() => !imgUrl && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            style={{
              ...S.upload,
              borderColor: dragOver ? "#C8A56A" : "rgba(200,165,106,.25)",
              background: dragOver ? "rgba(200,165,106,.08)" : "rgba(255,255,255,.03)",
              cursor: imgUrl ? "default" : "pointer",
            }}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
              onChange={e => handleFile(e.target.files[0])} />
            {busy && !imgUrl ? (
              <div style={{color:"#B8A88E",fontSize:".9rem"}}>Komprimerer...</div>
            ) : imgUrl ? (
              <div style={{position:"relative",width:"100%"}}>
                <img src={imgUrl} alt="" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block",borderRadius:10}} />
                <button onClick={e => { e.stopPropagation(); setImgUrl(null); setShareUrl(null); }} style={S.xBtn}>✕ Bytt</button>
              </div>
            ) : (<>
              <div style={{fontSize:"2.4rem",marginBottom:8,opacity:.5}}>📸</div>
              <div style={{color:"#B8A88E",fontSize:".9rem",fontWeight:600}}>Slipp et bilde her</div>
              <div style={{color:"#7A6E5E",fontSize:".72rem",marginTop:2}}>eller trykk for å velge</div>
            </>)}
          </div>

          {imgUrl && (
            <div style={{animation:"slideUp .4s ease"}}>
              <label style={S.lbl}>Hilsen til mottaker</label>
              <textarea value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="F.eks. Gratulerer med dagen! 🎂" maxLength={200} style={S.ta} />

              <label style={S.lbl}>Fra</label>
              <input value={sender} onChange={e => setSender(e.target.value)}
                placeholder="Ditt navn (valgfritt)" maxLength={40} style={S.inp} />

              <label style={S.lbl}>Vanskelighetsgrad</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => setPreset(i)} style={{
                    ...S.preBtn,
                    borderColor: preset === i ? "#C8A56A" : "rgba(200,165,106,.15)",
                    background: preset === i ? "rgba(200,165,106,.15)" : "rgba(255,255,255,.03)",
                  }}>
                    <div style={{fontSize:".82rem",fontWeight:700,color:preset===i?"#E8D5B5":"#A89A82"}}>{p.label}</div>
                    <div style={{fontSize:".62rem",color:"#7A6E5E",marginTop:1}}>{p.sub}</div>
                  </button>
                ))}
              </div>

              {error && <div style={{color:"#E57373",fontSize:".78rem",marginBottom:10,textAlign:"center"}}>{error}</div>}
              <button onClick={generate} disabled={busy} style={{...S.pri,opacity:busy?.6:1}}>
                {busy ? "Lagrer..." : "Lag delings-lenke →"}
              </button>
            </div>
          )}
        </>) : (
          /* Share result */
          <div style={{animation:"slideUp .4s ease",textAlign:"center"}}>
            <div style={{fontSize:"2.5rem",marginBottom:8}}>🎉</div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:"#E8D5B5",marginBottom:4}}>Puslespillet er klart!</div>
            <div style={{fontSize:".78rem",color:"#9A8B74",marginBottom:20,lineHeight:1.5}}>
              Send denne lenken til mottakeren.<br/>De må pusle bildet for å se det!
            </div>

            <div style={S.urlWrap}>
              <div style={{fontSize:".62rem",color:"#7A6E5E",marginBottom:3}}>Din delings-lenke</div>
              <div style={{fontSize:".9rem",color:"#E8D5B5",fontWeight:600,wordBreak:"break-all",fontFamily:"monospace"}}>
                {shareUrl}
              </div>
            </div>

            <button onClick={copyLink} style={{
              ...S.pri,
              background: copied ? "linear-gradient(135deg,#66BB6A,#43A047)" : "linear-gradient(135deg,#C8A56A,#A8854A)",
            }}>{copied ? "✓ Kopiert!" : "📋 Kopier lenke"}</button>

            <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={() => {
                const url = getShareUrl();
                const txt = sender
                  ? `${sender} har laget en bildeoverraskelse til deg! 🧩✨ Trykk her for å åpne den: ${url}`
                  : `Du har fått en bildeoverraskelse! 🧩✨ Trykk her for å åpne den: ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
              }} style={S.shr}>WhatsApp</button>
              <button onClick={() => {
                const url = getShareUrl();
                const subj = sender ? `Bildeoverraskelse fra ${sender} 🧩✨` : "Du har fått en bildeoverraskelse! 🧩✨";
                const body = sender
                  ? `${sender} har laget en bildeoverraskelse til deg! 🧩✨\n\nTrykk her for å åpne den:\n${url}`
                  : `Du har fått en bildeoverraskelse! 🧩✨\n\nTrykk her for å åpne den:\n${url}`;
                window.open(`mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
              }} style={S.shr}>E-post</button>
              <button onClick={() => {
                const url = getShareUrl();
                const txt = sender
                  ? `${sender} har laget en bildeoverraskelse til deg! 🧩✨ Trykk her for å åpne den: ${url}`
                  : `Du har fått en bildeoverraskelse! 🧩✨ Trykk her for å åpne den: ${url}`;
                const sep = /iPad|iPhone|iPod/.test(navigator.userAgent) ? "&" : "?";
                window.open(`sms:${sep}body=${encodeURIComponent(txt)}`);
              }} style={S.shr}>SMS</button>
            </div>

            <button onClick={() => onPreview(shareId)} style={{...S.shr,marginTop:16}}>
              👁 Forhåndsvis puslespillet
            </button>
            <button onClick={() => { setShareUrl(null); setImgUrl(null); setMsg(""); setSender(""); }}
              style={{...S.shr,marginTop:8}}>← Lag et nytt</button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/*══════════════════════════════════════════════
  SCREEN 2: SOLVE PUZZLE
══════════════════════════════════════════════*/
function SolveScreen({ imgUrl, config, msg, sender, onReveal }) {
  const { cols, rows, rotate } = config;
  const total = cols * rows;
  const maxW = Math.min(400, typeof window !== "undefined" ? window.innerWidth - 32 : 400);
  const boardW = maxW, boardH = Math.round(boardW / 1.5);
  const cellW = boardW / cols, cellH = boardH / rows;
  const tab = Math.round(Math.min(cellW, cellH) * 0.22);
  const pw = cellW + 2*tab, ph = cellH + 2*tab;
  const bL = 14, bT = 48;

  const [em, setEm] = useState(() => buildEdgeMap(rows, cols));
  const [pcs, setPcs] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [zTop, setZTop] = useState(total + 1);
  const [uid, setUid] = useState(() => Math.random().toString(36).slice(2,8));
  const [timer, setTimer] = useState(0);
  const dr = useRef(null), area = useRef(null), tmr = useRef(null), timerRef = useRef(0), lastRot = useRef(0);

  const cPos = useCallback(id => {
    const c = id % cols, r = Math.floor(id / cols);
    return { x: bL + c*cellW - tab, y: bT + r*cellH - tab };
  }, [cols, cellW, cellH, tab, bL, bT]);

  const scatter = useCallback(() => {
    setEm(buildEdgeMap(rows, cols));
    setUid(Math.random().toString(36).slice(2,8));
    const tY = bT + boardH + 24, ppr = Math.min(cols+1, 5);
    const idx = shuffle([...Array(total).keys()]);
    setPcs(idx.map((id, i) => ({
      id, col: id%cols, row: Math.floor(id/cols),
      x: bL + (i%ppr)*(boardW/ppr) + Math.random()*8-4,
      y: tY + Math.floor(i/ppr)*(cellH*.88+14) + Math.random()*6,
      rot: rotate ? [0,90,180,270][Math.floor(Math.random()*4)] : 0,
      placed: false, z: i+1,
    })));
    setZTop(total+1); setTimer(0);
  }, [rows, cols, total, rotate, boardH, boardW, bL, bT, cellH]);

  useEffect(() => { scatter(); }, [scatter]);
  useEffect(() => {
    tmr.current = setInterval(() => setTimer(t => { timerRef.current = t+1; return t+1; }), 1000);
    return () => clearInterval(tmr.current);
  }, []);

  const pDown = (e, id) => {
    e.preventDefault();
    const p = e;
    const pc = pcs.find(x => x.id === id);
    if (!pc) return;
    const rect = area.current.getBoundingClientRect();
    const nz = zTop + 1; setZTop(nz);
    const isTouch = e.pointerType === "touch";
    dr.current = { id, oX: p.clientX-rect.left-pc.x, oY: p.clientY-rect.top-pc.y, sX: p.clientX, sY: p.clientY, moved: false, threshold: isTouch ? 15 : 5 };
    setDragId(id);
    setPcs(prev => prev.map(x => x.id === id ? {...x, z: nz, placed: false} : x));
  };

  const pMove = useCallback(e => {
    if (!dr.current) return; e.preventDefault();
    if (Math.abs(e.clientX - dr.current.sX) > dr.current.threshold || Math.abs(e.clientY - dr.current.sY) > dr.current.threshold)
      dr.current.moved = true;
    if (!dr.current.moved) return;
    const rect = area.current.getBoundingClientRect();
    const { id, oX, oY } = dr.current;
    setPcs(prev => prev.map(x => x.id === id ? {...x, x: e.clientX-rect.left-oX, y: e.clientY-rect.top-oY} : x));
  }, []);

  const trySnap = useCallback(id => {
    setPcs(prev => {
      const next = prev.map(pc => {
        if (pc.id !== id || pc.placed) return pc;
        const c = cPos(id);
        if (Math.abs(pc.x-c.x) < SNAP_DIST && Math.abs(pc.y-c.y) < SNAP_DIST && pc.rot%360 === 0)
          return {...pc, x: c.x, y: c.y, placed: true, rot: 0, z: 0};
        return pc;
      });
      if (next.every(x => x.placed)) {
        clearInterval(tmr.current);
        setTimeout(() => onReveal(timerRef.current), 500);
      }
      return next;
    });
  }, [cPos, onReveal]);

  const pUp = useCallback(() => {
    if (!dr.current) return;
    const { id, moved } = dr.current;
    dr.current = null; setDragId(null);
    if (!moved && rotate) {
      const now = Date.now();
      if (now - lastRot.current < 300) return;
      lastRot.current = now;
      setPcs(prev => prev.map(x => x.id === id && !x.placed ? {...x, rot: x.rot+90} : x));
      setTimeout(() => trySnap(id), 50);
    } else {
      trySnap(id);
    }
  }, [trySnap, rotate]);

  useEffect(() => {
    window.addEventListener("pointermove", pMove);
    window.addEventListener("pointerup", pUp);
    return () => {
      window.removeEventListener("pointermove", pMove);
      window.removeEventListener("pointerup", pUp);
    };
  }, [pMove, pUp]);

  const placed = pcs.filter(p => p.placed).length;
  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const ppr = Math.min(cols+1, 5);
  const tRows = Math.ceil(total / ppr);

  return (
    <div style={{
      ...S.dark,
      background: `repeating-conic-gradient(rgba(0,0,0,.01) 0% 25%,transparent 0% 50%) 0 0/48px 48px,
        linear-gradient(170deg,#D7BC92 0%,#C8A56A 40%,#BA9058 72%,#CCAC74 100%)`,
      justifyContent: "flex-start", paddingTop: 8,
    }}>
      <div ref={area} style={{
        position: "relative", width: boardW + 28, margin: "0 auto",
        minHeight: bT + boardH + tRows*(cellH*.88+14) + 80, touchAction: "none",
        WebkitUserSelect: "none", userSelect: "none", overscrollBehavior: "none",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 4px 0",zIndex:999,position:"relative"}}>
          <div>
            {sender && <div style={{fontSize:".68rem",color:"#5D4037",fontWeight:700,opacity:.7}}>Fra {sender}</div>}
            <div style={{fontSize:".62rem",color:"#6D4C41",fontWeight:600,opacity:.5}}>Pusle bildet for å se det!</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <span style={S.badge}>⏱ {fmt(timer)}</span>
            <span style={S.badge}>🧩 {placed}/{total}</span>
          </div>
        </div>
        {rotate && <div style={{textAlign:"center",fontSize:".58rem",color:"#8D6E63",fontWeight:600,opacity:.5,padding:"2px 0"}}>Trykk = roter · Dra = flytt</div>}

        {/* Board */}
        <div style={{
          position:"absolute",left:bL,top:bT,width:boardW,height:boardH,
          border:"3px solid rgba(40,20,5,.7)",borderRadius:6,
          background:"rgba(255,250,230,.25)",boxShadow:"inset 0 2px 24px rgba(0,0,0,.2), 0 0 0 3px rgba(40,20,5,.3), 0 4px 12px rgba(0,0,0,.15)",pointerEvents:"none",
        }}>
          {Array.from({length:cols-1}).map((_,i) => <div key={`v${i}`} style={{position:"absolute",left:(i+1)*cellW,top:0,width:2,height:"100%",background:"rgba(40,20,5,.3)"}}/>)}
          {Array.from({length:rows-1}).map((_,i) => <div key={`h${i}`} style={{position:"absolute",top:(i+1)*cellH,left:0,height:2,width:"100%",background:"rgba(40,20,5,.3)"}}/>)}
        </div>

        {/* Pieces */}
        {pcs.slice().sort((a,b) => a.z-b.z).map(p => {
          const edges = getEdges(p.row, p.col, rows, cols, em);
          const isDrag = dragId === p.id;
          const rotW = rotate && p.rot%360 !== 0 && !p.placed;
          return (
            <div key={p.id} onPointerDown={e => pDown(e, p.id)}
              style={{
                position:"absolute", left:p.x, top:p.y, width:pw, height:ph,
                zIndex: p.placed ? 1 : p.z+10,
                cursor: p.placed ? "default" : isDrag ? "grabbing" : "grab",
                transformOrigin: "center center",
                transform: `rotate(${p.rot}deg) scale(${isDrag ? 1.05 : 1})`,
                filter: p.placed ? "drop-shadow(0 1px 2px rgba(0,0,0,.08))" : isDrag ? "drop-shadow(0 8px 18px rgba(0,0,0,.4))" : "drop-shadow(0 3px 7px rgba(0,0,0,.26))",
                transition: isDrag ? "filter .1s,transform .1s" : "filter .2s,transform .3s cubic-bezier(.34,1.56,.64,1)",
                touchAction: "none",
                animation: p.placed ? "snapPop .3s cubic-bezier(.34,1.56,.64,1)" : "none",
              }}>
              <PieceSVG id={p.id} cw={cellW} ch={cellH} edges={edges} tab={tab}
                col={p.col} row={p.row} imgUrl={imgUrl} boardW={boardW} boardH={boardH} uid={uid} />
              {rotW && (
                <div style={{position:"absolute",bottom:3,right:3,width:7,height:7,borderRadius:"50%",
                  background:"rgba(200,70,30,.65)",border:"1px solid rgba(255,255,255,.4)",transform:`rotate(${-p.rot}deg)`}}>
                  <div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:1.5,height:3,
                    background:"rgba(255,255,255,.7)",borderRadius:1}}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes snapPop{0%{transform:rotate(0deg) scale(1.1);filter:brightness(1.1)}50%{transform:rotate(0deg) scale(.97)}100%{transform:rotate(0deg) scale(1);filter:brightness(1)}}`}</style>
    </div>
  );
}

/*══════════════════════════════════════════════
  SCREEN 3: REVEAL
══════════════════════════════════════════════*/
function RevealScreen({ imgUrl, msg, sender, time, onReset }) {
  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={S.dark}>
      <div style={{...S.box, maxWidth:440, opacity:show?1:0, transition:"opacity .6s ease"}}>
        <div style={{textAlign:"center",fontSize:"2.8rem",marginBottom:8,animation:"pulse 2s infinite"}}>✨</div>
        <div style={{
          borderRadius:14, overflow:"hidden",
          boxShadow:"0 12px 48px rgba(0,0,0,.35),0 0 0 2px rgba(200,165,106,.2)",
          marginBottom:20, animation:"scaleIn 1s cubic-bezier(.34,1.56,.64,1)",
        }}>
          <img src={imgUrl} alt="" style={{width:"100%",display:"block"}} />
        </div>
        {msg && (
          <div style={{
            background:"rgba(200,165,106,.08)", border:"1.5px solid rgba(200,165,106,.2)",
            borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center",
          }}>
            <div style={{fontSize:"1rem",color:"#E8D5B5",fontWeight:600,lineHeight:1.5,fontStyle:"italic",
              fontFamily:"'Playfair Display',Georgia,serif"}}>"{msg}"</div>
            {sender && <div style={{fontSize:".78rem",color:"#9A8B74",marginTop:8,fontWeight:600}}>— {sender}</div>}
          </div>
        )}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:".78rem",color:"#9A8B74"}}>
            Puslet på <span style={{color:"#C8A56A",fontWeight:700}}>{fmt(time)}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={() => {
            const a = document.createElement("a"); a.href = imgUrl; a.download = "puslespill-bilde.jpg"; a.click();
          }} style={S.pri}>Lagre bildet ↓</button>
          <button onClick={onReset} style={S.shr}>Lag ditt eget →</button>
        </div>
      </div>
      <style>{`
        @keyframes scaleIn{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
      `}</style>
    </div>
  );
}

/*══════════════════════════════════════════════
  LOADING / ERROR SCREENS
══════════════════════════════════════════════*/
function LoadingScreen({ text }) {
  return (
    <div style={{...S.dark,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={S.logo}>Puslevenn</div>
      <div style={{color:"#9A8B74",fontSize:".85rem",fontWeight:600}}>{text || "Laster puslespillet..."}</div>
    </div>
  );
}

function ErrorScreen({ onReset }) {
  return (
    <div style={{...S.dark,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:"2.5rem"}}>😕</div>
      <div style={{color:"#E8D5B5",fontSize:"1.1rem",fontWeight:700}}>Puslespillet ble ikke funnet</div>
      <div style={{color:"#9A8B74",fontSize:".82rem",textAlign:"center",maxWidth:280,lineHeight:1.5}}>
        Lenken er ugyldig eller puslespillet er utløpt. Be avsenderen lage et nytt!
      </div>
      <button onClick={onReset} style={{...S.pri,width:"auto",marginTop:12}}>Lag ditt eget puslespill →</button>
    </div>
  );
}

/*══════════════════════════════════════════════
  APP ROUTER
══════════════════════════════════════════════*/
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [data, setData] = useState(null);
  const [time, setTime] = useState(0);

  const loadPuzzleById = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("p") || (window.location.hash.startsWith("#p=") ? window.location.hash.slice(3) : null);
    if (!id) { setScreen("create"); return; }
    setScreen("loading");
    const puzzle = await loadPuzzle(id);
    if (puzzle) { setData(puzzle); setScreen("solve"); }
    else setScreen("error");
  }, []);

  useEffect(() => { loadPuzzleById(); }, [loadPuzzleById]);

  const goCreate = () => { window.history.replaceState(null, "", window.location.pathname); setData(null); setScreen("create"); };

  if (screen === "loading") return <LoadingScreen />;
  if (screen === "error") return <ErrorScreen onReset={goCreate} />;
  if (screen === "create") return (
    <CreateScreen onPreview={async (id) => {
      const puzzle = await loadPuzzle(id);
      if (puzzle) { setData(puzzle); setScreen("solve"); }
    }} />
  );
  if (screen === "solve" && data) return (
    <SolveScreen imgUrl={data.img} config={PRESETS[data.difficulty] || PRESETS[0]}
      msg={data.msg} sender={data.sender}
      onReveal={t => { setTime(t); setScreen("reveal"); }} />
  );
  if (screen === "reveal" && data) return (
    <RevealScreen imgUrl={data.img} msg={data.msg} sender={data.sender}
      time={time} onReset={goCreate} />
  );
  return null;
}

/*══════════════════════════════════════════════
  STYLES
══════════════════════════════════════════════*/
const S = {
  dark: {
    minHeight: "100vh",
    background: `radial-gradient(ellipse at 20% 50%,rgba(200,165,106,.12) 0%,transparent 50%),
      radial-gradient(ellipse at 80% 20%,rgba(180,140,80,.08) 0%,transparent 50%),
      linear-gradient(175deg,#1a1611 0%,#2a2118 40%,#1e1812 100%)`,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "24px 16px", fontFamily: "'DM Sans',sans-serif",
  },
  box: { width: "min(400px,92vw)" },
  logo: {
    fontSize: "clamp(1.6rem,5vw,2.4rem)", fontWeight: 900, color: "#E8D5B5", letterSpacing: "-1px",
    textShadow: "0 2px 20px rgba(200,165,106,.25)", fontFamily: "'Playfair Display',Georgia,serif",
  },
  sub: { fontSize: ".82rem", color: "#9A8B74", letterSpacing: ".1em", fontWeight: 500, marginTop: 3 },
  upload: {
    width: "100%", minHeight: 180, border: "2px dashed", borderRadius: 14,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    marginBottom: 20, overflow: "hidden", transition: "all .3s",
  },
  xBtn: {
    position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.6)", color: "#E8D5B5",
    border: "1px solid rgba(200,165,106,.3)", borderRadius: 8, padding: "4px 12px",
    fontSize: ".7rem", fontWeight: 600, cursor: "pointer",
  },
  lbl: { display: "block", fontSize: ".68rem", color: "#9A8B74", letterSpacing: ".1em", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" },
  ta: {
    width: "100%", background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(200,165,106,.2)",
    borderRadius: 10, padding: "10px 14px", fontSize: ".85rem", color: "#E8D5B5",
    fontFamily: "'DM Sans',sans-serif", resize: "none", minHeight: 60, marginBottom: 14, outline: "none", boxSizing: "border-box",
  },
  inp: {
    width: "100%", background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(200,165,106,.2)",
    borderRadius: 10, padding: "10px 14px", fontSize: ".85rem", color: "#E8D5B5",
    fontFamily: "'DM Sans',sans-serif", marginBottom: 14, outline: "none", boxSizing: "border-box",
  },
  preBtn: { border: "1.5px solid", borderRadius: 10, padding: "8px 12px", cursor: "pointer", textAlign: "left", transition: "all .2s", background: "transparent" },
  pri: {
    width: "100%", background: "linear-gradient(135deg,#C8A56A,#A8854A)", color: "#1a1611", border: "none",
    borderRadius: 12, padding: "13px 24px", fontSize: ".95rem", fontWeight: 700, cursor: "pointer",
    letterSpacing: ".03em", boxShadow: "0 4px 20px rgba(200,165,106,.3),inset 0 1px 0 rgba(255,255,255,.15)",
    fontFamily: "'DM Sans',sans-serif",
  },
  shr: {
    background: "rgba(200,165,106,.1)", color: "#C8A56A", border: "1.5px solid rgba(200,165,106,.25)",
    borderRadius: 10, padding: "8px 16px", fontSize: ".78rem", fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  },
  urlWrap: {
    background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(200,165,106,.15)",
    borderRadius: 10, padding: "12px 14px", marginBottom: 14, textAlign: "left",
  },
  badge: { fontSize: ".65rem", color: "#5D4037", fontWeight: 700, background: "rgba(255,255,255,.18)", padding: "3px 8px", borderRadius: 10 },
};
