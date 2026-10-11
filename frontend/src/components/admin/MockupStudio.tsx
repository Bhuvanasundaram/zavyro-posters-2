import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const MOCKUP_TEMPLATE_STORAGE_KEY = "zavyro.mockupTemplates.v1";
export type MockupTemplate = { id: string; label: string; note?: string; src: string; frame: { x: number; y: number; w: number; h: number }; custom?: boolean };
export function readMockupTemplates(): MockupTemplate[] {
  try { const raw = localStorage.getItem(MOCKUP_TEMPLATE_STORAGE_KEY); const custom = raw ? JSON.parse(raw) as MockupTemplate[] : []; return custom.filter(t => t && t.id && t.src && t.frame); }
  catch { return []; }
}
function resolveUrl(url: string) { if (/^(https?:|data:|blob:)/i.test(url)) return url; return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`; }
function loadImage(url: string, crossOrigin = false): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const image = new Image(); if (crossOrigin) image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = () => reject(new Error("A mockup background or poster image could not be loaded with canvas-safe CORS permissions. Ensure the image is served by your Zavyro backend and the backend allows your frontend origin.")); image.src = url; }); }
const btn: CSSProperties = { border: "1px solid var(--color-border)", borderRadius: 9, padding: "9px 12px", background: "var(--color-background)", color: "var(--color-text)", fontWeight: 700, cursor: "pointer", minHeight: 40 };

export default function MockupStudio({ artworkUrl, mockupUrl, onSaved }: { artworkUrl: string; mockupUrl: string; onSaved: (url: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const wrapRef = useRef<HTMLDivElement>(null); const nav = useNavigate();
  const [templates, setTemplates] = useState<MockupTemplate[]>(readMockupTemplates);
  const [sceneId, setSceneId] = useState(templates[0]?.id || "");
  const [zoom, setZoom] = useState(1); const [fitMode, setFitMode] = useState<"fit" | "fill">("fill"); const [rotation, setRotation] = useState(0); const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const scene = templates.find(t => t.id === sceneId) || templates[0] || null;
  useEffect(() => {
    let cancelled = false;
    const refresh = () => setTemplates(readMockupTemplates());
    window.addEventListener("storage", refresh); window.addEventListener("zavyro-mockup-templates-changed", refresh);
    void fetch(`${API_URL}/api/admin/mockup-templates`, { credentials: "include", signal: AbortSignal.timeout(12000) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Template list unavailable")))
      .then(data => { if (cancelled || !Array.isArray(data.templates)) return; const custom = data.templates as MockupTemplate[]; localStorage.setItem(MOCKUP_TEMPLATE_STORAGE_KEY, JSON.stringify(custom)); setTemplates(custom); if (custom.length && !custom.some(t => t.id === sceneId)) setSceneId(custom[0].id); else if (!custom.length) setSceneId(""); })
      .catch(() => { /* Keep the cached admin-uploaded templates available if the API is temporarily offline. */ });
    return () => { cancelled = true; window.removeEventListener("storage", refresh); window.removeEventListener("zavyro-mockup-templates-changed", refresh); };
  }, []);
  useEffect(() => { setZoom(1); setFitMode("fill"); setRotation(0); setOffset({ x: 0, y: 0 }); }, [sceneId, artworkUrl]);
  useEffect(() => {
    let cancelled = false; const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx || !scene) return;
    setError("");
    void Promise.all([loadImage(resolveUrl(scene.src), true), artworkUrl ? loadImage(resolveUrl(artworkUrl), true) : Promise.resolve(null)]).then(([bg, art]) => {
      if (cancelled) return;
      const maxW = 900; const ratio = bg.naturalWidth / Math.max(1, bg.naturalHeight); const w = Math.min(maxW, bg.naturalWidth || maxW); const h = Math.max(1, Math.round(w / Math.max(.1, ratio)));
      canvas.width = w; canvas.height = h; ctx.clearRect(0, 0, w, h); ctx.drawImage(bg, 0, 0, w, h);
      if (!art) return;
      const f = { x: scene.frame.x*w, y: scene.frame.y*h, w: scene.frame.w*w, h: scene.frame.h*h };
      ctx.save(); ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.clip();
      const rad = rotation * Math.PI / 180; const c = Math.abs(Math.cos(rad)); const s = Math.abs(Math.sin(rad));
      // Calculate scale using the rotated artwork's bounding box so Fit shows the whole print
      // and Fill covers the complete frame. The source artwork is never modified.
      const rotatedW = c * art.naturalWidth + s * art.naturalHeight;
      const rotatedH = s * art.naturalWidth + c * art.naturalHeight;
      const base = fitMode === "fit"
        ? Math.min(f.w / Math.max(1, rotatedW), f.h / Math.max(1, rotatedH))
        : Math.max(f.w / Math.max(1, rotatedW), f.h / Math.max(1, rotatedH));
      // Fit mode must keep the full artwork inside the frame. Fill mode must
      // cover every point of the frame, even after dragging, so no background
      // gaps can appear along the frame edges. Canvas clipping also prevents
      // any artwork pixels from drawing outside the marked border.
      const effectiveZoom = fitMode === "fit" ? Math.min(zoom, 1) : Math.max(zoom, 1);
      const aw = art.naturalWidth * base * effectiveZoom;
      const ah = art.naturalHeight * base * effectiveZoom;
      const scaledRotatedW = rotatedW * base * effectiveZoom;
      const scaledRotatedH = rotatedH * base * effectiveZoom;
      const desiredCx = f.x + f.w / 2 + offset.x * w / 100;
      const desiredCy = f.y + f.h / 2 + offset.y * h / 100;
      let cx = desiredCx;
      let cy = desiredCy;
      if (fitMode === "fill") {
        const minCx = f.x + f.w - scaledRotatedW / 2;
        const maxCx = f.x + scaledRotatedW / 2;
        const minCy = f.y + f.h - scaledRotatedH / 2;
        const maxCy = f.y + scaledRotatedH / 2;
        cx = Math.max(minCx, Math.min(maxCx, desiredCx));
        cy = Math.max(minCy, Math.min(maxCy, desiredCy));
      } else {
        const boundW = scaledRotatedW;
        const boundH = scaledRotatedH;
        cx = Math.max(f.x + boundW / 2, Math.min(f.x + f.w - boundW / 2, desiredCx));
        cy = Math.max(f.y + boundH / 2, Math.min(f.y + f.h - boundH / 2, desiredCy));
      }
      ctx.translate(cx, cy); ctx.rotate(rad); ctx.drawImage(art, -aw / 2, -ah / 2, aw, ah); ctx.restore();
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not render this mockup."); });
    return () => { cancelled = true; };
  }, [scene, artworkUrl, zoom, fitMode, rotation, offset]);
  const zoomBounds = useMemo(() => ({ min: 1, max: 3 }), []);
  function startDrag(e: ReactPointerEvent<HTMLCanvasElement>) { if (saving) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; }
  function moveDrag(e: ReactPointerEvent<HTMLCanvasElement>) { const d = drag.current; const rect = e.currentTarget.getBoundingClientRect(); if (!d || d.id !== e.pointerId) return; setOffset({ x: Math.max(-100, Math.min(100, d.ox + (e.clientX-d.x)/Math.max(1,rect.width)*100)), y: Math.max(-100, Math.min(100, d.oy + (e.clientY-d.y)/Math.max(1,rect.height)*100)) }); }
  function stopDrag(e: ReactPointerEvent<HTMLCanvasElement>) { if (drag.current?.id === e.pointerId) drag.current = null; }
  function wheel(e: ReactWheelEvent<HTMLCanvasElement>) { e.preventDefault(); setZoom(v => Math.max(zoomBounds.min, Math.min(zoomBounds.max, v + (e.deltaY < 0 ? .05 : -.05)))); }
  async function saveMockup() { const canvas = canvasRef.current; if (!canvas || !artworkUrl) { setError("Upload the original print artwork first."); return; } setSaving(true); setError(""); setMessage(""); try { const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not render the mockup.")),"image/jpeg",.94)); if(blob.size>25*1024*1024) throw new Error("Generated mockup is larger than 25 MB."); const body=new FormData(); body.append("file",blob,"zavyro-mockup.jpg"); const response=await fetch(`${API_URL}/api/admin/uploads`,{method:"POST",credentials:"include",body,signal:AbortSignal.timeout(30000)}); const result=await response.json(); if(!response.ok||!result.success||!result.url) throw new Error(result.message||"Could not save the mockup."); onSaved(String(result.url)); setMessage("Mockup saved separately. Click Save Poster to attach it to the product; original print artwork is unchanged."); } catch(e){setError(e instanceof Error?e.message:"Could not save the mockup.");} finally{setSaving(false);} }
  return <section style={{ border:"1px solid var(--color-border)", borderRadius:14, padding:14, marginTop:14, display:"grid", gap:12, minWidth:0 }}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong style={{color:"var(--color-text)"}}>Mockup Studio</strong><p style={{margin:"5px 0 0",color:"var(--color-text-secondary)",fontSize:12}}>Compact preview with the same drag, zoom, rotation and reset style as Adjust Frame. This changes only the shop mockup, never the print file.</p></div><button type="button" style={btn} onClick={()=>nav("/admin/mockup-templates")}>Manage mockup templates ↗</button></div>
    {templates.length > 0 ? <><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:8}}>{templates.map(t=><button type="button" key={t.id} onClick={()=>setSceneId(t.id)} aria-pressed={sceneId===t.id} style={{textAlign:"left",padding:9,borderRadius:10,border:`1px solid ${sceneId===t.id?"var(--color-accent)":"var(--color-border)"}`,background:sceneId===t.id?"var(--color-accent-bg)":"var(--color-background)",color:"var(--color-text)",cursor:"pointer",minWidth:0}}><strong style={{display:"block",fontSize:12}}>{t.label}</strong><span style={{display:"block",fontSize:11,color:"var(--color-text-secondary)",marginTop:3}}>Uploaded template</span></button>)}</div>
    <div ref={wrapRef} style={{width:"100%",maxWidth:560,justifySelf:"center",borderRadius:10,overflow:"hidden",border:"1px solid var(--color-border)",background:"#eee"}}><canvas ref={canvasRef} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onWheel={wheel} style={{width:"100%",height:"auto",maxHeight:520,objectFit:"contain",display:"block",touchAction:"none",cursor:saving?"wait":drag.current?"grabbing":"grab"}} aria-label="Drag to position poster; use wheel or controls to zoom" /></div>
    <p style={{margin:0,fontSize:11,textAlign:"center",color:"var(--color-text-secondary)"}}>Drag poster to reposition · scroll/pinch trackpad to zoom · use rotation controls below</p>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}} role="group" aria-label="Artwork fit mode">
      <span style={{fontSize:12,fontWeight:700,color:"var(--color-text)"}}>Artwork framing</span>
      {(["fit", "fill"] as const).map(mode => <button key={mode} type="button" aria-pressed={fitMode===mode} onClick={()=>{setFitMode(mode);setZoom(1);}} style={{...btn,borderColor:fitMode===mode?"var(--color-accent)":"var(--color-border)",background:fitMode===mode?"var(--color-accent-bg)":"var(--color-background)"}}>{mode === "fit" ? "Fit · show whole poster" : "Fill · cover frame"}</button>)}
      <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{fitMode === "fit" ? "Keeps the entire artwork visible; margins may show inside the frame." : "Covers the frame edge-to-edge; some artwork may be cropped."}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
      <label style={{display:"grid",gap:5,fontSize:12,color:"var(--color-text)"}}>Zoom <strong>{Math.round(zoom*100)}%</strong><div style={{display:"flex",gap:6,alignItems:"center"}}><button type="button" style={btn} onClick={()=>setZoom(v=>Math.max(1,v-.1))} aria-label="Zoom out">−</button><input style={{flex:1,minWidth:0}} type="range" min="1" max="3" step=".01" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button type="button" style={btn} onClick={()=>setZoom(v=>Math.min(3,v+.1))} aria-label="Zoom in">+</button></div></label>
      <label style={{display:"grid",gap:5,fontSize:12,color:"var(--color-text)"}}>Rotation <strong>{rotation}°</strong><input type="range" min="0" max="360" step="1" value={rotation} onChange={e=>setRotation(Number(e.target.value))}/><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[0,90,180,270].map(v=><button key={v} type="button" style={btn} onClick={()=>setRotation(v)}>{v}°</button>)}</div></label>
      <label style={{display:"grid",gap:5,fontSize:12,color:"var(--color-text)"}}>Horizontal position <strong>{Math.round(offset.x)}</strong><input type="range" min="-50" max="50" value={offset.x} onChange={e=>setOffset(v=>({...v,x:Number(e.target.value)}))}/></label>
      <label style={{display:"grid",gap:5,fontSize:12,color:"var(--color-text)"}}>Vertical position <strong>{Math.round(offset.y)}</strong><input type="range" min="-50" max="50" value={offset.y} onChange={e=>setOffset(v=>({...v,y:Number(e.target.value)}))}/></label>
    </div>
    {mockupUrl&&<div style={{display:"flex",gap:10,alignItems:"center",color:"var(--color-text-secondary)",fontSize:12,flexWrap:"wrap"}}><img src={resolveUrl(mockupUrl)} alt="Saved mockup thumbnail" style={{width:84,height:84,objectFit:"contain",borderRadius:6,background:"#eee"}}/>Existing saved mockup. The original print image remains separate.</div>}
    {(error||message)&&<p role="status" style={{margin:0,fontSize:12,color:error?"#dc2626":"#16a34a"}}>{error||message}</p>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" style={btn} onClick={()=>{setZoom(1);setFitMode("fill");setRotation(0);setOffset({x:0,y:0});}}>Reset adjustment</button><button type="button" disabled={saving||!artworkUrl} onClick={()=>void saveMockup()} style={{...btn,border:0,background:"var(--color-accent)",color:"white",opacity:(saving || !artworkUrl) ? .6 : 1}}>{saving?"Saving mockup…":mockupUrl?"Save updated mockup":"Generate & save mockup"}</button></div></> : <div style={{border:"1px dashed var(--color-border)",borderRadius:10,padding:18,textAlign:"center",color:"var(--color-text-secondary)",fontSize:13}}><strong style={{display:"block",color:"var(--color-text)",marginBottom:6}}>No uploaded mockup templates yet</strong>Upload a background on the Mockup Templates page, mark its poster frame, and it will appear here. The built-in Bedroom, Landscape and other sample scenes are not shown.<div style={{marginTop:12}}><button type="button" style={btn} onClick={()=>nav("/admin/mockup-templates")}>Upload mockup template ↗</button></div></div>}
  </section>;
}
