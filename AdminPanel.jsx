import React, { useState, useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   STABLE PAY BRAND TOKENS
   Shared with applicant form design system
───────────────────────────────────────────── */
const T = {
  bg0: "#0E0D12", bg1: "#16151C", bg2: "#1D1C25", bg3: "#26252F", bg4: "#302F3A",
  bdr: "#2B2A35", bdrA: "#3D3C4A", bdrFocus: "#6C6DB5",
  blue: "#6C6DB5", blueL: "#9394C8", blueD: "#5A5B9F",
  blueGlow: "rgba(108,109,181,0.18)", blueGlowS: "rgba(108,109,181,0.08)",
  txt: "#ECEAE6", txt2: "#A8A5A0", txt3: "#6E6B65",
  green: "#2EAF7D", greenG: "rgba(46,175,125,0.12)",
  red: "#D94B3F", redG: "rgba(217,75,63,0.10)",
  amber: "#D4943C", amberG: "rgba(212,148,60,0.10)",
  grad: "linear-gradient(135deg,#6C6DB5 0%,#5A5B9F 100%)",
  gradS: "linear-gradient(135deg,rgba(108,109,181,0.14) 0%,rgba(90,91,159,0.04) 100%)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${T.bg0};}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:${T.bdrA};border-radius:4px;}
  ::selection{background:rgba(108,109,181,0.3);color:${T.txt};}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
  .af{animation:fadeIn .3s ease both;}
  .sp-input:focus{outline:none;border-color:${T.bdrFocus}!important;box-shadow:0 0 0 2px rgba(108,109,181,0.12)!important;}
`;

/* ─────────────────────────────────────────────
   GOOGLE DRIVE EXPORT
   Uploads KYB documents to the admin's personal Drive
   via Google Identity Services (OAuth2 token client).
   Requires VITE_GOOGLE_CLIENT_ID at build time.
───────────────────────────────────────────── */
const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function requestDriveAccessToken() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) return reject(new Error("Google Identity Services not loaded — refresh and try again"));
    if (!GOOGLE_CLIENT_ID) return reject(new Error("Google OAuth client ID not configured (VITE_GOOGLE_CLIENT_ID)"));
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (r) => r.access_token ? resolve(r.access_token) : reject(new Error(r.error_description || r.error || "Authorization failed")),
      error_callback: (e) => reject(new Error(e?.message || "Authorization cancelled")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

async function driveCreateFolder(accessToken, name) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) throw new Error(`Drive folder create failed (${res.status})`);
  return res.json();
}

async function driveUploadFile(accessToken, folderId, fileName, blob) {
  const metadata = { name: fileName, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive upload failed for ${fileName} (${res.status})`);
  return res.json();
}

function sanitizeFileName(s) {
  return String(s || "file").replace(/[\/\\?%*:|"<>]/g, "_").slice(0, 180);
}

/* ─────────────────────────────────────────────
   DOCUMENT FRAUD DETECTION ENGINE
   File Integrity + EXIF + ELA + Claude Vision AI
───────────────────────────────────────────── */
const MAGIC = { pdf:[0x25,0x50,0x44,0x46], png:[0x89,0x50,0x4E,0x47], jpeg:[0xFF,0xD8,0xFF], tiff:[0x49,0x49,0x2A,0x00], tiffBE:[0x4D,0x4D,0x00,0x2A] };
const EDIT_SW = ["photoshop","gimp","affinity","canva","pixlr","paint.net","illustrator","inkscape","corel","lightroom","capture one","snapseed","fotor","befunky","picsart","adobe"];

async function readBytes(file, n=16) { return new Uint8Array(await file.slice(0,n).arrayBuffer()); }
function matchMagic(b) { for(const[t,s] of Object.entries(MAGIC)) if(s.every((v,i)=>b[i]===v)) return t.replace("BE",""); return "unknown"; }

async function checkIntegrity(file) {
  const findings=[], bytes=await readBytes(file), det=matchMagic(bytes);
  const ext=file.name.split(".").pop().toLowerCase();
  const map={jpg:"jpeg",jpeg:"jpeg",png:"png",pdf:"pdf",tif:"tiff",tiff:"tiff"};
  const exp=map[ext]||ext;
  if(det==="unknown") findings.push({severity:"warning",area:"File Type",desc:"Magic bytes unrecognised"});
  else if(det!==exp) findings.push({severity:"critical",area:"File Type Mismatch",desc:`Extension .${ext} but signature is ${det}`});
  if(file.size<5000) findings.push({severity:"warning",area:"File Size",desc:`Unusually small (${(file.size/1024).toFixed(1)} KB)`});
  else if(file.size>25*1024*1024) findings.push({severity:"info",area:"File Size",desc:`Very large (${(file.size/(1024*1024)).toFixed(1)} MB)`});
  return {detectedType:det,fileSize:file.size,findings};
}

async function parseExif(file) {
  const findings=[], r={hasExif:false,software:null,dateTime:null,dateTimeOriginal:null,hasGPS:false,findings};
  if(!file.type?.startsWith("image/jpeg")&&!file.name?.toLowerCase().match(/\.jpe?g$/)) return r;
  try {
    const buf=await file.arrayBuffer(), view=new DataView(buf);
    if(view.getUint16(0)!==0xFFD8) return r;
    let off=2;
    while(off<view.byteLength-4){
      const mk=view.getUint16(off);
      if(mk===0xFFE1){
        const len=view.getUint16(off+2),es=off+4;
        const exS=String.fromCharCode(view.getUint8(es),view.getUint8(es+1),view.getUint8(es+2),view.getUint8(es+3));
        if(exS!=="Exif"){off+=2+len;continue;}
        r.hasExif=true;
        const ts=es+6,le=view.getUint16(ts)===0x4949;
        const g16=o=>view.getUint16(ts+o,le),g32=o=>view.getUint32(ts+o,le);
        const rS=(o,l)=>{let s="";for(let i=0;i<l&&ts+o+i<view.byteLength;i++){const c=view.getUint8(ts+o+i);if(!c)break;s+=String.fromCharCode(c);}return s.trim();};
        const ifd=g32(4),ent=g16(ifd);
        for(let i=0;i<ent&&i<100;i++){
          const eo=ifd+2+i*12;if(eo+12>buf.byteLength-ts)break;
          const tag=g16(eo),ty=g16(eo+2),cnt=g32(eo+4),vo=g32(eo+8);
          if(tag===0x0131&&ty===2) r.software=rS(cnt>4?vo:eo+8,Math.min(cnt,64));
          else if(tag===0x0132&&ty===2) r.dateTime=rS(cnt>4?vo:eo+8,Math.min(cnt,20));
          else if(tag===0x8825) r.hasGPS=true;
          else if(tag===0x8769&&ty===4){
            const ee=g16(vo);
            for(let j=0;j<ee&&j<100;j++){const ej=vo+2+j*12;if(ej+12>buf.byteLength-ts)break;if(g16(ej)===0x9003&&g16(ej+2)===2){const ec=g32(ej+4),ev=g32(ej+8);r.dateTimeOriginal=rS(ec>4?ev:ej+8,Math.min(ec,20));}}
          }
        }
        break;
      } else if((mk&0xFF00)!==0xFF00) break;
      else off+=2+view.getUint16(off+2);
    }
  } catch{}
  if(r.software){const sw=r.software.toLowerCase();if(EDIT_SW.some(e=>sw.includes(e))) findings.push({severity:"critical",area:"Editing Software",desc:`Processed with "${r.software}"`}); else findings.push({severity:"info",area:"Software",desc:r.software});}
  if(r.dateTime&&r.dateTimeOriginal&&r.dateTime!==r.dateTimeOriginal) findings.push({severity:"warning",area:"Date Mismatch",desc:`DateTime ${r.dateTime} ≠ Original ${r.dateTimeOriginal}`});
  if(r.hasGPS) findings.push({severity:"info",area:"GPS Data",desc:"Contains GPS — unusual for scanned docs"});
  if(!r.hasExif) findings.push({severity:"info",area:"No EXIF",desc:"Metadata may have been stripped"});
  return r;
}

async function runELA(file) {
  const findings=[];
  if(!file.type?.startsWith("image/")) return {elaScore:0,findings:[{severity:"info",area:"ELA",desc:"Not an image — skipped"}]};
  return new Promise(res=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      try{
        const W=Math.min(img.width,1200),H=Math.round((W/img.width)*img.height);
        const c1=document.createElement("canvas");c1.width=W;c1.height=H;
        const ctx1=c1.getContext("2d");ctx1.drawImage(img,0,0,W,H);const orig=ctx1.getImageData(0,0,W,H);
        const c2=document.createElement("canvas");c2.width=W;c2.height=H;const ctx2=c2.getContext("2d");
        const ri=new Image();
        ri.onload=()=>{
          ctx2.drawImage(ri,0,0,W,H);const rec=ctx2.getImageData(0,0,W,H);
          let tot=0,mx=0;const df=new Float32Array(W*H);
          for(let i=0;i<orig.data.length;i+=4){const idx=i/4,d=(Math.abs(orig.data[i]-rec.data[i])+Math.abs(orig.data[i+1]-rec.data[i+1])+Math.abs(orig.data[i+2]-rec.data[i+2]))/3;df[idx]=d;tot+=d;if(d>mx)mx=d;}
          const avg=tot/(W*H),bs=8,bw=Math.floor(W/bs),bh=Math.floor(H/bs),bv=[];
          for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){let s=0,sq=0,n=0;for(let y=by*bs;y<(by+1)*bs;y++)for(let x=bx*bs;x<(bx+1)*bs;x++){const v=df[y*W+x];s+=v;sq+=v*v;n++;}bv.push(sq/n-(s/n)**2);}
          const med=[...bv].sort((a,b)=>a-b)[Math.floor(bv.length/2)]||0;
          const op=(bv.filter(v=>v>med*4).length/bv.length)*100;
          let sc=0;if(op>15)sc+=40;else if(op>8)sc+=25;else if(op>3)sc+=10;
          if(mx>80)sc+=30;else if(mx>50)sc+=15;else if(mx>30)sc+=5;
          if(avg>15)sc+=30;else if(avg>8)sc+=15;else if(avg>4)sc+=5;
          sc=Math.min(sc,100);
          if(sc>=60) findings.push({severity:"critical",area:"ELA",desc:`High variance (score ${sc}) — ${op.toFixed(1)}% inconsistent blocks`});
          else if(sc>=30) findings.push({severity:"warning",area:"ELA",desc:`Moderate variance (score ${sc})`});
          else findings.push({severity:"info",area:"ELA",desc:`Consistent (score ${sc})`});
          if(op>8) findings.push({severity:"warning",area:"Noise",desc:`${op.toFixed(1)}% abnormal noise variance`});
          URL.revokeObjectURL(url);res({elaScore:sc,findings});
        };
        ri.onerror=()=>{URL.revokeObjectURL(url);res({elaScore:0,findings:[{severity:"info",area:"ELA",desc:"Re-compress failed"}]});};
        ri.src=c1.toDataURL("image/jpeg",0.85);
      }catch{URL.revokeObjectURL(url);res({elaScore:0,findings:[{severity:"info",area:"ELA",desc:"Canvas failed"}]});}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);res({elaScore:0,findings:[{severity:"info",area:"ELA",desc:"Load failed"}]});};
    img.src=url;
  });
}

// TODO: Route through backend proxy for production
async function analyzeWithClaude(file, docType) {
  if(!file.type?.startsWith("image/")) return {riskScore:0,riskLevel:"info",findings:[{severity:"info",area:"AI",desc:"Not an image — AI vision skipped"}],summary:"PDF — AI visual analysis requires images."};
  try{
    const b64=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(",")[1]);r.onerror=no;r.readAsDataURL(file);});
    if(b64.length>10*1024*1024) return {riskScore:0,riskLevel:"info",findings:[{severity:"info",area:"AI",desc:"File >10MB"}],summary:"Too large."};
    const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,
        system:`You are a forensic document examiner AI. Analyze the document for forgery/tampering.\nDocument type: "${docType}"\n\nCheck: digital manipulation, font inconsistencies, visual artifacts, authenticity, stamps/signatures.\n\nRespond ONLY with JSON:\n{"riskScore":<0-100>,"riskLevel":"<low|medium|high|critical>","documentTypeMatch":<bool>,"findings":[{"area":"...","description":"...","severity":"<info|warning|critical>"}],"summary":"..."}`,
        messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:`Analyze this "${docType}" for forgery. JSON response.`}]}]})});
    const d=await resp.json(),txt=d.content?.[0]?.text||"";
    try{const p=JSON.parse(txt.replace(/```json\n?|\n?```/g,"").trim());return{riskScore:p.riskScore??0,riskLevel:p.riskLevel??"low",documentTypeMatch:p.documentTypeMatch??true,findings:(p.findings||[]).map(f=>({severity:f.severity||"info",area:f.area||"General",desc:f.description||""})),summary:p.summary||"Done."};}
    catch{return{riskScore:0,riskLevel:"info",findings:[{severity:"info",area:"AI",desc:"Non-parseable response"}],summary:txt.slice(0,200)};}
  }catch(e){return{riskScore:0,riskLevel:"error",findings:[{severity:"info",area:"AI",desc:e.message}],summary:"API error."};}
}

async function runFullAnalysis(file, docType) {
  const [integrity,exif,ela]=await Promise.all([checkIntegrity(file),parseExif(file),runELA(file)]);
  let ai;try{ai=await analyzeWithClaude(file,docType);}catch{ai={riskScore:0,riskLevel:"error",findings:[],summary:"Failed."};}
  const allF=[...integrity.findings,...exif.findings,...ela.findings,...ai.findings];
  const cliSc=Math.min(100,(integrity.findings.filter(f=>f.severity==="critical").length*30)+(integrity.findings.filter(f=>f.severity==="warning").length*15)+(exif.findings.filter(f=>f.severity==="critical").length*25)+(exif.findings.filter(f=>f.severity==="warning").length*12)+ela.elaScore*0.5);
  const comp=Math.round(cliSc*0.3+(ai.riskScore||0)*0.7);
  const lvl=comp>=70?"critical":comp>=45?"high":comp>=20?"medium":"low";
  return {status:"complete",compositeScore:comp,compositeLevel:lvl,integrity,exif,ela,ai,findings:allF,documentTypeMatch:ai.documentTypeMatch??true,timestamp:Date.now()};
}

/* ─────────────────────────────────────────────
   MOCK DATA — simulates submitted KYB applications
───────────────────────────────────────────── */

/* Tiny placeholder face images for liveness demo (1x1 pixel data URIs) */
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23243A50'/%3E%3Ccircle cx='30' cy='24' r='10' fill='%23506880'/%3E%3Cellipse cx='30' cy='48' rx='18' ry='12' fill='%23506880'/%3E%3C/svg%3E";
function mockLiveness(dateStr) {
  return {
    verified: true,
    challengeCount: 4,
    completedAt: dateStr,
    captures: [
      { challenge: "Look straight at the camera", image: PLACEHOLDER_IMG, timestamp: dateStr },
      { challenge: "Slowly turn your head to the LEFT", image: PLACEHOLDER_IMG, timestamp: dateStr },
      { challenge: "Slowly turn your head to the RIGHT", image: PLACEHOLDER_IMG, timestamp: dateStr },
      { challenge: "Blink twice slowly", image: PLACEHOLDER_IMG, timestamp: dateStr },
    ],
  };
}

/* ─────────────────────────────────────────────
   COMPLETE FIELD MAP — every field from the KYB form
   Grouped by step for rendering in the admin detail view
───────────────────────────────────────────── */
const FIELD_SECTIONS = [
  { title: "Applicant & Contact Details", step: 0, fields: [
    { key: "email", label: "Contact Email Address" },
    { key: "appName", label: "Full Name of Applicant" },
    { key: "appTitle", label: "Designation / Job Title" },
    { key: "appPhone", label: "Mobile Number" },
    { key: "appRole", label: "Role in Organisation" },
    { key: "isAuthSig", label: "Authorised Signatory?" },
    { key: "spPOC", label: "Stable Pay Point of Contact" },
    { key: "referralSource", label: "Referral Source" },
  ]},
  { title: "Company Information", step: 1, fields: [
    { key: "co_name", label: "Legal Entity Name" },
    { key: "co_trade", label: "Trade / DBA Name" },
    { key: "co_country", label: "Country of Incorporation" },
    { key: "co_form", label: "Legal Form" },
    { key: "co_crn", label: "Registration Number (CIN/CRN)", mono: true },
    { key: "co_doi", label: "Date of Incorporation" },
    { key: "co_regAddr", label: "Registered Office Address", wide: true },
    { key: "co_opAddr", label: "Operational Address", wide: true },
    { key: "co_web", label: "Business Website" },
    { key: "co_email", label: "Company / Compliance Email" },
    { key: "co_tin", label: "Tax Identification Number", mono: true },
    { key: "co_gst", label: "GST Registration Number", mono: true },
    { key: "co_lei", label: "LEI (Legal Entity Identifier)", mono: true },
    { key: "co_startup", label: "DPIIT / Startup India Registration" },
  ]},
  { title: "Business Profile", step: 2, fields: [
    { key: "biz_desc", label: "Business Activities Description", wide: true },
    { key: "biz_services", label: "Services / Products Offered", wide: true },
    { key: "biz_custType", label: "Customer Base" },
    { key: "biz_regulated", label: "Regulated / Licensed Activities?" },
    { key: "biz_licences", label: "Licences & Regulatory Authorities", wide: true },
    { key: "biz_targetJuris", label: "Target Jurisdictions", wide: true },
    { key: "biz_exclJuris", label: "Excluded Jurisdictions", wide: true },
    { key: "biz_cdd", label: "KYC / CDD Programme", wide: true },
    { key: "biz_kycVendors", label: "KYC / RegTech Vendors" },
  ]},
  { title: "Payment & Volume Details", step: 3, fields: [
    { key: "vol_monthly", label: "Monthly Volume (USD)" },
    { key: "vol_monthlyINR", label: "Monthly Volume (INR)" },
    { key: "vol_avgTx", label: "Avg Transaction (USD)" },
    { key: "vol_txCount", label: "Monthly Transaction Count" },
    { key: "vol_minTx", label: "Min Transaction (USD)" },
    { key: "vol_maxTx", label: "Max Transaction (USD)" },
    { key: "vol_token", label: "Primary Stablecoin / Token" },
    { key: "vol_chains", label: "Blockchain Network(s)" },
    { key: "vol_wallets", label: "Crypto Wallet Address(es)", mono: true, wide: true },
    { key: "vol_providers", label: "Payment Providers / Banks", wide: true },
    { key: "vol_custodians", label: "Crypto Custody / Exchange Providers", wide: true },
    { key: "vol_fundFlow", label: "End-to-End Fund Flow", wide: true },
  ]},
  { title: "Beneficial Owner 1", step: 4, fields: [
    { key: "bo0_name", label: "Full Legal Name" },
    { key: "bo0_dob", label: "Date of Birth" },
    { key: "bo0_nat", label: "Nationality" },
    { key: "bo0_res", label: "Country of Residence" },
    { key: "bo0_pct", label: "Ownership / Control %" },
    { key: "bo0_ctrl", label: "Nature of Control" },
    { key: "bo0_id", label: "PAN / Passport / ID Number", mono: true },
    { key: "bo0_tin", label: "Tax ID (PAN/SSN/TIN)", mono: true },
    { key: "bo0_addr", label: "Residential Address", wide: true },
    { key: "bo0_email", label: "Contact Email" },
    { key: "bo0_idFront", label: "Photo ID (Front)", file: true },
    { key: "bo0_idBack", label: "Photo ID (Back)", file: true },
    { key: "bo0_proofAddr", label: "Proof of Address", file: true },
    { key: "bo0_selfie", label: "Liveness Verification", liveness: true },
  ]},
  { title: "Beneficial Owner 2", step: 4, fields: [
    { key: "bo1_name", label: "Full Legal Name" },
    { key: "bo1_dob", label: "Date of Birth" },
    { key: "bo1_nat", label: "Nationality" },
    { key: "bo1_res", label: "Country of Residence" },
    { key: "bo1_pct", label: "Ownership / Control %" },
    { key: "bo1_ctrl", label: "Nature of Control" },
    { key: "bo1_id", label: "PAN / Passport / ID Number", mono: true },
    { key: "bo1_tin", label: "Tax ID (PAN/SSN/TIN)", mono: true },
    { key: "bo1_addr", label: "Residential Address", wide: true },
    { key: "bo1_email", label: "Contact Email" },
    { key: "bo1_idFront", label: "Photo ID (Front)", file: true },
    { key: "bo1_idBack", label: "Photo ID (Back)", file: true },
    { key: "bo1_proofAddr", label: "Proof of Address", file: true },
    { key: "bo1_selfie", label: "Liveness Verification", liveness: true },
  ]},
  { title: "Beneficial Owner 3", step: 4, fields: [
    { key: "bo2_name", label: "Full Legal Name" },
    { key: "bo2_dob", label: "Date of Birth" },
    { key: "bo2_nat", label: "Nationality" },
    { key: "bo2_res", label: "Country of Residence" },
    { key: "bo2_pct", label: "Ownership / Control %" },
    { key: "bo2_ctrl", label: "Nature of Control" },
    { key: "bo2_id", label: "PAN / Passport / ID Number", mono: true },
    { key: "bo2_tin", label: "Tax ID (PAN/SSN/TIN)", mono: true },
    { key: "bo2_addr", label: "Residential Address", wide: true },
    { key: "bo2_email", label: "Contact Email" },
    { key: "bo2_idFront", label: "Photo ID (Front)", file: true },
    { key: "bo2_idBack", label: "Photo ID (Back)", file: true },
    { key: "bo2_proofAddr", label: "Proof of Address", file: true },
    { key: "bo2_selfie", label: "Liveness Verification", liveness: true },
  ]},
  { title: "Authorised Signatories & Structure", step: 4, fields: [
    { key: "bo_signatories", label: "Authorised Signatory Name(s) & Positions", wide: true },
  ]},
  { title: "Source of Funds — Business", step: 5, fields: [
    { key: "sof_biz", label: "How the company funds operations", wide: true },
  ]},
  { title: "Source of Wealth — BO 1", step: 5, fields: [
    { key: "sow0_name", label: "BO 1 Full Name" },
    { key: "sow0_desc", label: "Source of Wealth Narrative", wide: true },
  ]},
  { title: "Source of Wealth — BO 2", step: 5, fields: [
    { key: "sow1_name", label: "BO 2 Full Name" },
    { key: "sow1_desc", label: "Source of Wealth Narrative", wide: true },
  ]},
  { title: "Sanctions & PEP Declarations", step: 6, fields: [
    { key: "pep_status", label: "PEP Status" },
    { key: "pep_details", label: "PEP Details", wide: true },
    { key: "sanc1", label: "Not on sanctions lists", bool: true },
    { key: "sanc2", label: "No sanctioned counterparties", bool: true },
    { key: "sanc3", label: "Not in FATF grey/black jurisdiction", bool: true },
    { key: "sanc4", label: "Funds not from sanctioned sources", bool: true },
    { key: "sanc5", label: "Consent to STR filing", bool: true },
    { key: "regAction", label: "Regulatory action history?" },
    { key: "regActionDetails", label: "Regulatory action details", wide: true },
    { key: "highRisk", label: "High-risk business categories", list: true },
  ]},
  { title: "AML / CFT Programme", step: 7, fields: [
    { key: "aml_hasPolicy", label: "Board-approved AML/CFT Policy?" },
    { key: "aml_strFiled", label: "STR filings in past 12 months?" },
    { key: "aml_hasMLRO", label: "Designated MLRO?" },
    { key: "aml_mlroName", label: "MLRO Full Name" },
    { key: "aml_mlroEmail", label: "MLRO Email" },
    { key: "aml_mlroQual", label: "MLRO Qualification" },
    { key: "aml_mlroDOA", label: "MLRO Appointment Date" },
    { key: "aml_txMon", label: "Transaction Monitoring System", wide: true },
    { key: "aml_sanctScreening", label: "Sanctions Screening Programme", wide: true },
    { key: "aml_adverseMedia", label: "Adverse Media Screening" },
    { key: "aml_retention", label: "Record Retention Period" },
    { key: "aml_training", label: "Staff AML Training Frequency" },
    { key: "aml_tools", label: "RegTech / Compliance Tooling" },
    { key: "aml_audit", label: "Independent AML Audit" },
  ]},
  { title: "Declaration & Certification", step: 9, fields: [
    { key: "declarations", label: "Declarations accepted", list: true },
    { key: "decl_name", label: "Signatory Full Name" },
    { key: "decl_title", label: "Signatory Designation" },
    { key: "decl_email", label: "Signatory Email" },
    { key: "decl_date", label: "Date of Certification" },
    { key: "decl_remarks", label: "Additional Remarks", wide: true },
  ]},
  { title: "Submission Metadata", step: 10, fields: [
    { key: "_submissionMeta", label: "Geolocation & Device Info", meta: true, wide: true },
  ]},
];

/* All document upload fields */
const ALL_DOCS = [
  { key: "bo_authLetterFile", label: "Board Resolution / Authorisation Letter" },
  { key: "bo_structureFile", label: "Corporate Structure Chart" },
  { key: "bo_shareRegFile", label: "Shareholder Register" },
  { key: "sof_bizFile", label: "Source of Funds — Business" },
  { key: "sof_bankStmt", label: "Business Bank Statement" },
  { key: "sow0_file", label: "Source of Wealth — BO 1" },
  { key: "sow1_file", label: "Source of Wealth — BO 2" },
  { key: "aml_policyFile", label: "AML/CFT Policy Document" },
  { key: "doc_coi", label: "Certificate of Incorporation (COI)" },
  { key: "doc_regExtract", label: "Business Registry Extract" },
  { key: "doc_articles", label: "Memorandum & Articles of Association" },
  { key: "doc_licence", label: "Operating Licence(s)" },
  { key: "doc_biz_poa", label: "Proof of Registered Business Address" },
  { key: "doc_ubo_id", label: "Government-Issued ID — All BOs & Signatories" },
  { key: "doc_ubo_poa", label: "Proof of Residential Address — All BOs" },
  { key: "doc_shareReg", label: "Shareholder Register / Register of Members" },
  { key: "doc_structure", label: "Corporate Ownership / Structure Chart" },
  { key: "doc_authLetter", label: "Authorisation Letter / Board Resolution" },
  { key: "doc_financials", label: "Audited Financial Statements" },
  { key: "doc_bankStmt", label: "Business Bank Statement (3–6 months)" },
  { key: "doc_amlPolicy", label: "AML/CFT Policy Document" },
  { key: "doc_walletOwn", label: "Crypto Wallet Ownership Confirmation" },
  { key: "doc_sof", label: "Source of Funds — Business" },
  { key: "doc_sowBO1", label: "Source of Wealth — BO 1" },
  { key: "doc_sowBO2", label: "Source of Wealth — BO 2" },
  { key: "bo0_idFront", label: "BO 1 — Photo ID (Front)" },
  { key: "bo0_idBack", label: "BO 1 — Photo ID (Back)" },
  { key: "bo0_proofAddr", label: "BO 1 — Proof of Address" },
  { key: "bo1_idFront", label: "BO 2 — Photo ID (Front)" },
  { key: "bo1_idBack", label: "BO 2 — Photo ID (Back)" },
  { key: "bo1_proofAddr", label: "BO 2 — Proof of Address" },
  { key: "bo2_idFront", label: "BO 3 — Photo ID (Front)" },
  { key: "bo2_idBack", label: "BO 3 — Photo ID (Back)" },
  { key: "bo2_proofAddr", label: "BO 3 — Proof of Address" },
];

const MOCK_APPS = [
  { id:"SP-OTC-A7K3M9X1", submitted:"2026-03-18T14:22:00Z", status:"pending_review", riskTier:"medium",
    data: {
      /* Step 0 — Applicant */
      email:"compliance@meridianfin.in", appName:"Rajesh Mehta", appTitle:"Director", appPhone:"+91 98765 43210", appRole:"Director", isAuthSig:"Yes", spPOC:"Arjun Patel", referralSource:"Direct Outreach",
      /* Step 1 — Company */
      co_name:"Meridian Fintech Pvt. Ltd.", co_trade:"MeridianPay", co_country:"India", co_form:"Private Limited Company (Pvt. Ltd.)", co_crn:"U72200MH2021PTC123456", co_doi:"2021-06-15", co_regAddr:"301, Trade Tower, Bandra Kurla Complex, Mumbai, Maharashtra 400051, India", co_opAddr:"", co_web:"https://meridianfintech.in", co_email:"legal@meridianfin.in", co_tin:"AABCM1234A", co_gst:"27AABCM1234A1Z5", co_lei:"", co_startup:"DIPP12345",
      /* Step 2 — Business Profile */
      biz_desc:"Cross-border remittance facilitation for Indian SMEs importing goods from US/EU suppliers. We receive USDT from our clients and convert to INR via Stable Pay OTC for settlement to supplier bank accounts in India.", biz_services:"B2B cross-border payments, FX hedging advisory, trade finance facilitation", biz_custType:"B2B Only", biz_regulated:"Yes — currently licensed", biz_licences:"AD-II Licence — Reserve Bank of India — Mumbai — Expires 2027-03-31", biz_targetJuris:"India, United States, United Kingdom, Singapore, UAE", biz_exclJuris:"Iran, North Korea, Cuba, Syria, Russia, Belarus, Myanmar", biz_cdd:"Aadhaar-based e-KYC via DigiLocker API, PAN verification via NSDL, video KYC for high-value accounts (>₹50 lakh), risk scoring based on transaction pattern and geography", biz_kycVendors:"IDfy, Chainalysis, Sumsub",
      /* Step 3 — Payment & Volume */
      vol_monthly:"USD 500,000", vol_monthlyINR:"INR 4.15 Crore", vol_avgTx:"USD 25,000", vol_txCount:"21–50", vol_minTx:"USD 1,000", vol_maxTx:"USD 100,000", vol_token:"USDT (TRC-20)", vol_chains:"Tron (TRC-20), Ethereum (ERC-20)", vol_wallets:"TRC-20: TKZxk...7fG3\nERC-20: 0x4a3...8b2F", vol_providers:"HDFC Bank, ICICI Bank, Razorpay", vol_custodians:"Binance, WazirX (OTC desk)", vol_fundFlow:"Client sends USDT (TRC-20) to our custodial wallet → We initiate OTC sell via Stable Pay → Stable Pay settles INR to our HDFC current account → We remit INR to supplier via NEFT/RTGS",
      /* Step 4 — Beneficial Owners */
      bo0_name:"Rajesh Mehta", bo0_dob:"1985-03-12", bo0_nat:"India", bo0_res:"India", bo0_pct:"60%", bo0_ctrl:"Direct Shareholder", bo0_id:"AABPM1234A", bo0_tin:"AABPM1234A", bo0_addr:"14B, Sea View Apartments, Carter Road, Bandra West, Mumbai 400050, India", bo0_email:"rajesh@meridianfin.in", bo0_selfie: mockLiveness("2026-03-18T14:18:00Z"),
      bo1_name:"Priya Sharma", bo1_dob:"1990-08-22", bo1_nat:"India", bo1_res:"India", bo1_pct:"25%", bo1_ctrl:"Direct Shareholder", bo1_id:"BXZPS5678B", bo1_tin:"BXZPS5678B", bo1_addr:"Flat 702, Lodha Palava, Dombivli East, Thane 421204, India", bo1_email:"priya@meridianfin.in", bo1_selfie: mockLiveness("2026-03-18T14:20:00Z"),
      bo2_name:"", bo2_dob:"", bo2_nat:"", bo2_res:"", bo2_pct:"", bo2_ctrl:"", bo2_id:"", bo2_tin:"", bo2_addr:"", bo2_email:"",
      bo_signatories:"Rajesh Mehta — Director — rajesh@meridianfin.in\nPriya Sharma — CFO — priya@meridianfin.in",
      /* Step 5 — Source of Funds */
      sof_biz:"Series A funding of USD 2M from Sequoia Surge (2022), retained earnings from FY2023-24 operations (INR 1.2 Cr net profit), revolving credit facility from HDFC Bank (INR 50 lakh)",
      sow0_name:"Rajesh Mehta", sow0_desc:"15 years employment in investment banking (JP Morgan Mumbai 2008-2018, Goldman Sachs Mumbai 2018-2021), accumulated savings and ESOP liquidation proceeds of approx USD 800K, plus property inheritance from family estate in Pune (2019).",
      sow1_name:"Priya Sharma", sow1_desc:"8 years in management consulting (McKinsey India 2014-2021), accumulated savings, and co-founder equity in Meridian Fintech valued at approx INR 4 Cr based on Series A valuation.",
      /* Step 6 — Sanctions & PEP */
      pep_status:"None are PEPs", pep_details:"", sanc1:true, sanc2:true, sanc3:true, sanc4:true, sanc5:true, regAction:"No", regActionDetails:"", highRisk:["None of the above"],
      /* Step 7 — AML/CFT */
      aml_hasPolicy:"Yes", aml_strFiled:"No", aml_hasMLRO:"Yes", aml_mlroName:"Anita Desai", aml_mlroEmail:"anita.desai@meridianfin.in", aml_mlroQual:"CAMS certified, 12 years compliance experience (HSBC India, Kotak Mahindra)", aml_mlroDOA:"2022-09-01", aml_txMon:"Automated rule-based system via Chainalysis KYT for on-chain monitoring; internal threshold alerts for transactions >₹10 lakh; manual review queue for flagged transactions; weekly STR committee review", aml_sanctScreening:"OFAC SDN, UN Consolidated, EU Sanctions, RBI debarment lists — screened via Refinitiv World-Check at onboarding and daily batch re-screening", aml_adverseMedia:"Automated — periodic", aml_retention:"7 years", aml_training:"Quarterly", aml_tools:"Chainalysis KYT, Refinitiv World-Check, IDfy, Sumsub", aml_audit:"Yes — within last 12 months",
      /* Step 9 — Declaration */
      declarations:[0,1,2,3,4,5,6], decl_name:"Rajesh Mehta", decl_title:"Director", decl_email:"rajesh@meridianfin.in", decl_date:"2026-03-18", decl_remarks:"",
      _submissionMeta:{submittedAt:"2026-03-18T14:22:00Z",timezone:"Asia/Kolkata",ip:"103.21.58.193",userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",screenRes:"2560x1440",platform:"MacIntel",language:"en-IN",geo:{lat:19.0596,lng:72.8295,accuracy:12,capturedAt:"2026-03-18T14:22:01Z"}},
    },
    docs: ALL_DOCS.map(d => ({ ...d, fileName: d.key.replace(/_/g,"_") + ".pdf", hasFile: true })),
  },
  { id:"SP-OTC-B2F8N4P6", submitted:"2026-03-19T09:15:00Z", status:"pending_review", riskTier:"low",
    data: {
      email:"legal@novapay.io", appName:"Sarah Chen", appTitle:"CEO", appPhone:"+1 415 555 0199", appRole:"Managing Director / CEO", isAuthSig:"Yes", spPOC:"", referralSource:"LinkedIn / Social Media",
      co_name:"NovaPay Global LLC", co_trade:"NovaPay", co_country:"United States", co_form:"Limited Liability Company (LLC)", co_crn:"LLC-2023-04521", co_doi:"2023-01-10", co_regAddr:"548 Market St, Suite 200, San Francisco, CA 94104, USA", co_opAddr:"", co_web:"https://novapay.io", co_email:"compliance@novapay.io", co_tin:"87-1234567", co_gst:"", co_lei:"", co_startup:"",
      biz_desc:"Digital payments platform for US freelancers receiving payments from Indian clients. Clients send INR, we convert to USDC and settle to freelancer wallets.", biz_services:"Freelancer payouts, invoice management, stablecoin settlement", biz_custType:"B2C Only", biz_regulated:"Pending licence / registration", biz_licences:"MSB Registration — FinCEN — Pending — Expected Q2 2026", biz_targetJuris:"United States, India", biz_exclJuris:"All OFAC sanctioned countries", biz_cdd:"SSN-based identity verification, Plaid bank verification, Persona KYC for enhanced due diligence", biz_kycVendors:"Persona, Plaid, Elliptic",
      vol_monthly:"USD 1,200,000", vol_monthlyINR:"INR 10 Crore", vol_avgTx:"USD 5,000", vol_txCount:"101–250", vol_minTx:"USD 100", vol_maxTx:"USD 50,000", vol_token:"USDC (ERC-20)", vol_chains:"Ethereum (ERC-20), Base", vol_wallets:"ERC-20: 0x7f2...3aB1\nBase: 0x7f2...3aB1", vol_providers:"Mercury Bank, Stripe", vol_custodians:"Circle, Coinbase Prime", vol_fundFlow:"Indian client pays INR via UPI/bank transfer → Partner processes conversion → USDC minted via Circle → Settled to freelancer wallet on Base",
      bo0_name:"Sarah Chen", bo0_dob:"1988-11-05", bo0_nat:"United States", bo0_res:"United States", bo0_pct:"70%", bo0_ctrl:"Direct Shareholder", bo0_id:"***-**-4521", bo0_tin:"***-**-4521", bo0_addr:"1200 Pacific Ave, Apt 4B, San Francisco, CA 94109, USA", bo0_email:"sarah@novapay.io", bo0_selfie: mockLiveness("2026-03-19T09:10:00Z"),
      bo1_name:"David Park", bo1_dob:"1991-02-18", bo1_nat:"United States", bo1_res:"United States", bo1_pct:"30%", bo1_ctrl:"Direct Shareholder", bo1_id:"***-**-7832", bo1_tin:"***-**-7832", bo1_addr:"456 Oak St, Berkeley, CA 94708, USA", bo1_email:"david@novapay.io", bo1_selfie: mockLiveness("2026-03-19T09:12:00Z"),
      bo2_name:"", bo2_dob:"", bo2_nat:"", bo2_res:"", bo2_pct:"", bo2_ctrl:"", bo2_id:"", bo2_tin:"", bo2_addr:"", bo2_email:"",
      bo_signatories:"Sarah Chen — CEO — sarah@novapay.io",
      sof_biz:"Seed funding USD 500K (Y Combinator W24), angel round USD 1.5M, revenue from platform fees (1.5% per transaction)", sow0_name:"Sarah Chen", sow0_desc:"Ex-Stripe engineer (2014-2022), ESOP liquidation ~USD 1.2M, personal savings from 8 years in tech", sow1_name:"David Park", sow1_desc:"Ex-Meta engineer (2015-2023), RSU proceeds ~USD 800K",
      pep_status:"None are PEPs", sanc1:true, sanc2:true, sanc3:true, sanc4:true, sanc5:true, regAction:"No", highRisk:["None of the above"],
      aml_hasPolicy:"In Development", aml_strFiled:"N/A — not a Reporting Entity", aml_hasMLRO:"No", aml_txMon:"Manual review of transactions >USD 10,000; automated velocity checks via internal tooling", aml_sanctScreening:"OFAC SDN via Elliptic at onboarding; weekly batch rescreening", aml_adverseMedia:"Manual — ad hoc", aml_retention:"7 years", aml_training:"Annually", aml_tools:"Elliptic, Persona", aml_audit:"No",
      declarations:[0,1,2,3,4,5,6], decl_name:"Sarah Chen", decl_title:"CEO", decl_email:"sarah@novapay.io", decl_date:"2026-03-19", decl_remarks:"MSB registration application submitted to FinCEN, expected approval by Q2 2026.",
      _submissionMeta:{submittedAt:"2026-03-19T09:15:00Z",timezone:"America/Los_Angeles",ip:"73.162.45.118",userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",screenRes:"1920x1080",platform:"MacIntel",language:"en-US",geo:{lat:37.7749,lng:-122.4194,accuracy:18,capturedAt:"2026-03-19T09:15:02Z"}},
    },
    docs: ALL_DOCS.slice(0, 15).map(d => ({ ...d, fileName: d.key.replace(/_/g,"_") + ".pdf", hasFile: true })),
  },
  { id:"SP-OTC-D5G2J8L0", submitted:"2026-03-20T02:30:00Z", status:"flagged", riskTier:"high",
    data: {
      email:"ops@cryptovault.sg", appName:"Wei Lin Tan", appTitle:"Chief Compliance Officer / MLRO", appPhone:"+65 9876 5432", appRole:"Chief Compliance Officer / MLRO", isAuthSig:"Yes", spPOC:"", referralSource:"Industry Event",
      co_name:"CryptoVault Pte. Ltd.", co_trade:"CryptoVault", co_country:"Singapore", co_form:"Private Limited Company (Pvt. Ltd.)", co_crn:"202312345K", co_doi:"2023-04-01", co_regAddr:"1 Raffles Place, #20-01, One Raffles Place Tower 2, Singapore 048616", co_opAddr:"", co_web:"https://cryptovault.sg", co_email:"compliance@cryptovault.sg", co_tin:"T23LL1234A", co_gst:"", co_lei:"", co_startup:"",
      biz_desc:"OTC desk for high-net-worth individuals and institutions trading large blocks of stablecoins against SGD and INR. We facilitate USDT/USDC to INR conversions for clients with Indian operations.", biz_services:"OTC crypto trading, block trade execution, stablecoin liquidity provision", biz_custType:"Institutional / Wholesale Only", biz_regulated:"Yes — currently licensed", biz_licences:"MAS Digital Payment Token Service Licence — Monetary Authority of Singapore — Expires 2027-12-31", biz_targetJuris:"Singapore, India, Hong Kong SAR, UAE", biz_exclJuris:"All FATF black-list, OFAC sanctioned", biz_cdd:"SingPass-based MyInfo verification, video KYC via Jumio, enhanced due diligence for >SGD 100K monthly volume, source of wealth verification for all HNI clients", biz_kycVendors:"Jumio, Chainalysis, Elliptic, Crystal Blockchain",
      vol_monthly:"USD 5,000,000", vol_monthlyINR:"INR 41.5 Crore", vol_avgTx:"USD 100,000", vol_txCount:"51–100", vol_minTx:"USD 10,000", vol_maxTx:"USD 500,000", vol_token:"Multiple Stablecoins", vol_chains:"Ethereum (ERC-20), Tron (TRC-20), Solana", vol_wallets:"ERC-20: 0xaB3...9fE2\nTRC-20: TQx4...mN8p\nSolana: 7Kz...4Wp", vol_providers:"DBS Bank, Standard Chartered Singapore", vol_custodians:"Fireblocks, Anchorage Digital, Circle", vol_fundFlow:"Client deposits USDT/USDC to our Fireblocks-custodied wallet → We execute OTC sell on Stable Pay → INR settled to our DBS account → We wire INR to client's Indian bank account via SWIFT",
      bo0_name:"Wei Lin Tan", bo0_dob:"1982-07-19", bo0_nat:"Singapore", bo0_res:"Singapore", bo0_pct:"45%", bo0_ctrl:"Direct Shareholder", bo0_id:"S8219876A", bo0_tin:"S8219876A", bo0_addr:"12 Nassim Road, #08-02, Singapore 258391", bo0_email:"weilin@cryptovault.sg", bo0_selfie: mockLiveness("2026-03-20T02:20:00Z"),
      bo1_name:"Marcus Lim", bo1_dob:"1979-12-03", bo1_nat:"Singapore", bo1_res:"Hong Kong SAR", bo1_pct:"35%", bo1_ctrl:"Direct Shareholder", bo1_id:"S7912345B", bo1_tin:"S7912345B", bo1_addr:"2 Tregunter Path, Mid-Levels, Hong Kong", bo1_email:"marcus@cryptovault.sg", bo1_selfie: mockLiveness("2026-03-20T02:24:00Z"),
      bo2_name:"Yuki Tanaka", bo2_dob:"1995-04-10", bo2_nat:"Japan", bo2_res:"Singapore", bo2_pct:"20%", bo2_ctrl:"Indirect Shareholder", bo2_id:"TK12345678", bo2_tin:"", bo2_addr:"8 Scotts Road, #12-04, Singapore 228238", bo2_email:"yuki@cryptovault.sg", bo2_selfie: mockLiveness("2026-03-20T02:28:00Z"),
      bo_signatories:"Wei Lin Tan — CCO/MLRO — weilin@cryptovault.sg\nMarcus Lim — CEO — marcus@cryptovault.sg",
      sof_biz:"Proprietary capital from founders (USD 3M), Series A from Paradigm (USD 8M, 2024), trading desk revenue", sow0_name:"Wei Lin Tan", sow0_desc:"Former VP at Goldman Sachs Singapore (2006-2020), accumulated compensation and bonuses, property portfolio in Singapore", sow1_name:"Marcus Lim", sow1_desc:"Co-founder of previous fintech acquired by Grab (2019) for SGD 12M, angel investments",
      pep_status:"None are PEPs", sanc1:true, sanc2:true, sanc3:true, sanc4:true, sanc5:true, regAction:"No", highRisk:["None of the above"],
      aml_hasPolicy:"Yes", aml_strFiled:"Yes", aml_hasMLRO:"Yes", aml_mlroName:"Wei Lin Tan", aml_mlroEmail:"weilin@cryptovault.sg", aml_mlroQual:"CAMS, ICA Diploma in AML, 16 years compliance experience", aml_mlroDOA:"2023-04-15", aml_txMon:"Chainalysis KYT real-time monitoring, internal rule engine with 47 scenarios, automated SAR generation, 24h investigation SLA", aml_sanctScreening:"OFAC, UN, EU, MAS MAS-sanctioned lists via World-Check — real-time screening at onboarding and continuous monitoring", aml_adverseMedia:"Automated — real-time", aml_retention:"10 years", aml_training:"Quarterly", aml_tools:"Chainalysis KYT + Reactor, Refinitiv World-Check, Jumio, Crystal Blockchain, Elliptic", aml_audit:"Yes — within last 12 months",
      declarations:[0,1,2,3,4,5,6], decl_name:"Wei Lin Tan", decl_title:"CCO / MLRO", decl_email:"weilin@cryptovault.sg", decl_date:"2026-03-20", decl_remarks:"MAS has been notified of our intent to onboard Stable Pay as an OTC counterparty for INR settlement.",
      _submissionMeta:{submittedAt:"2026-03-20T02:30:00Z",timezone:"Asia/Singapore",ip:"175.156.89.42",userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",screenRes:"3840x2160",platform:"Win32",language:"en-SG",geo:{lat:1.2897,lng:103.8501,accuracy:8,capturedAt:"2026-03-20T02:30:03Z"}},
    },
    docs: ALL_DOCS.map(d => ({ ...d, fileName: d.key.replace(/_/g,"_") + ".jpg", hasFile: true })),
  },
];

/* ─────────────────────────────────────────────
   UI COMPONENTS
───────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    pending_review: { bg: T.amberG, col: T.amber, label: "Pending Review" },
    approved:       { bg: T.greenG, col: T.green, label: "Approved" },
    rejected:       { bg: T.redG,   col: T.red,   label: "Rejected" },
    flagged:        { bg: T.redG,   col: T.red,   label: "Flagged" },
    in_review:      { bg: T.blueGlowS, col: T.blueL, label: "In Review" },
  }[status] || { bg: T.bg3, col: T.txt3, label: status };
  return <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.col, textTransform: "uppercase", letterSpacing: ".04em" }}>{cfg.label}</span>;
}

function RiskTierBadge({ tier }) {
  const cfg = { low: { col: T.green }, medium: { col: T.amber }, high: { col: T.red }, critical: { col: T.red } }[tier] || { col: T.txt3 };
  return <span style={{ fontSize: 10, fontWeight: 700, color: cfg.col, textTransform: "uppercase", letterSpacing: ".06em" }}>{tier}</span>;
}

function RiskBar({ score }) {
  const col = score >= 70 ? T.red : score >= 45 ? T.amber : score >= 20 ? T.blueL : T.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: T.bg3, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, width: `${score}%`, background: `linear-gradient(90deg, ${T.green} 0%, ${T.amber} 50%, ${T.red} 100%)`, transition: "width .6s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "'IBM Plex Mono', monospace", minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
}

function FindingRow({ f }) {
  const col = { info: T.txt3, warning: T.amber, critical: T.red }[f.severity] || T.txt3;
  const bg = { info: "transparent", warning: T.amberG, critical: T.redG }[f.severity] || "transparent";
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: bg, marginBottom: 4, alignItems: "flex-start" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: col, textTransform: "uppercase", letterSpacing: ".04em" }}>{f.area}</span>
        <div style={{ fontSize: 12, color: T.txt2, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div style={{ padding: "14px 16px", background: T.bg2, borderRadius: 10, border: `1px solid ${T.bdr}`, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 10.5, color: T.txt3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.txt, fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Inter', system-ui, sans-serif" }}>{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DOCUMENT REVIEW PANEL
───────────────────────────────────────────── */
function DocReviewCard({ doc, analysis, onAnalyze, onDownload }) {
  const [expanded, setExpanded] = useState(false);
  const a = analysis;
  const hasResult = a && a.status === "complete";
  const isAnalyzing = a && a.status === "analyzing";

  const levelCfg = {
    low:      { bg: T.greenG, bdr: T.green+"44", col: T.green, icon: "✓", label: "Low Risk" },
    medium:   { bg: T.blueGlowS, bdr: T.blue+"44", col: T.blueL, icon: "◐", label: "Medium" },
    high:     { bg: T.amberG, bdr: T.amber+"44", col: T.amber, icon: "⚠", label: "High Risk" },
    critical: { bg: T.redG, bdr: T.red+"44", col: T.red, icon: "✕", label: "Critical" },
  };

  return (
    <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, background: T.bg1, marginBottom: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: T.bg3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke={T.txt3} strokeWidth="1.5"/><path d="M5 5H11M5 8H9M5 11H7" stroke={T.txt3} strokeWidth="1.2" strokeLinecap="round"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>{doc.label}</div>
          <div style={{ fontSize: 11.5, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{doc.fileName}</div>
        </div>

        {/* Badge */}
        {hasResult && (() => {
          const c = levelCfg[a.compositeLevel] || levelCfg.low;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: c.bg, border: `1px solid ${c.bdr}` }}>
              <span style={{ fontSize: 11, color: c.col, fontWeight: 700 }}>{c.icon}</span>
              <span style={{ fontSize: 10.5, color: c.col, fontWeight: 600 }}>{c.label}</span>
              <span style={{ fontSize: 10, color: c.col, fontFamily: "'IBM Plex Mono', monospace", opacity: 0.8 }}>{a.compositeScore}</span>
            </div>
          );
        })()}

        {isAnalyzing && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: T.bg3, border: `1px solid ${T.bdrA}` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", border: `2px solid ${T.blue}`, borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
            <span style={{ fontSize: 10.5, color: T.txt3 }}>Analyzing...</span>
          </div>
        )}

        {doc.hasFile && doc.docId && onDownload && (
          <button
            onClick={() => onDownload(doc)}
            title="Download document"
            style={{
              padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.bdrA}`, background: "transparent",
              color: T.txt2, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif",
            }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1V9M7 9L4 6M7 9L10 6M1 11V13H13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download
          </button>
        )}

        {!hasResult && !isAnalyzing && (
          <button onClick={() => onAnalyze(doc.key, doc.label)} style={{
            padding: "6px 14px", borderRadius: 8, border: "none", background: T.grad, color: "#fff",
            fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
            display: "flex", alignItems: "center", gap: 6, transition: "all .2s",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Scan Document
          </button>
        )}

        {hasResult && (
          <button onClick={() => setExpanded(p => !p)} style={{
            padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.bdrA}`, background: "transparent",
            color: T.txt3, fontSize: 11, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
          }}>{expanded ? "Hide" : "Details"}</button>
        )}
      </div>

      {/* Expanded analysis */}
      {hasResult && expanded && (
        <div className="af" style={{ padding: "0 18px 18px", borderTop: `1px solid ${T.bdr}`, paddingTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: T.txt3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Integrity Score</div>
            <RiskBar score={a.compositeScore} />
          </div>

          {!a.documentTypeMatch && (
            <div style={{ padding: "8px 12px", background: T.redG, border: `1px solid ${T.red}44`, borderRadius: 8, marginBottom: 12, fontSize: 12, color: T.red, fontWeight: 600 }}>
              TYPE MISMATCH — Document does not appear to match "{doc.label}"
            </div>
          )}

          {a.ai?.summary && (
            <div style={{ padding: "10px 12px", background: T.bg0, borderRadius: 8, border: `1px solid ${T.bdr}`, marginBottom: 12, fontSize: 12.5, color: T.txt2, lineHeight: 1.6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.blueL, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 4 }}>AI Assessment</span>
              {a.ai.summary}
            </div>
          )}

          <div style={{ fontSize: 10.5, fontWeight: 600, color: T.txt3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Findings ({a.findings.length})</div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {a.findings.map((f, i) => <FindingRow key={i} f={f} />)}
          </div>

          {/* Metadata */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.bdr}`, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: T.txt3 }}>Analyzed {new Date(a.timestamp).toLocaleString()}</span>
            {a.exif?.software && <span style={{ fontSize: 10, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>SW: {a.exif.software}</span>}
            <span style={{ fontSize: 10, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>ELA: {a.ela?.elaScore ?? "—"}</span>
            <span style={{ fontSize: 10, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>AI: {a.ai?.riskScore ?? "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STR REPORT TAB — Suspicious Transaction Report
   FIU-IND format STR generator
───────────────────────────────────────────── */
function STRReportTab({ app }) {
  const d = app.data;
  const [txns, setTxns] = useState([]);
  const [form, setForm] = useState({ date: "", amount: "", currency: "USD", type: "Crypto-to-Fiat", chain: "", txHash: "", description: "" });
  const [reason, setReason] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterDesig, setReporterDesig] = useState("Compliance Officer");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);

  const addTx = () => {
    if (!form.date || !form.amount) return;
    setTxns(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({ date: "", amount: "", currency: "USD", type: "Crypto-to-Fiat", chain: "", txHash: "", description: "" });
  };
  const removeTx = (id) => setTxns(prev => prev.filter(t => t.id !== id));

  const generateSTR = () => {
    const txRows = txns.map(t => `<tr><td>${t.date}</td><td>${t.currency} ${t.amount}</td><td>${t.type}</td><td><code>${t.chain||"—"}</code></td><td><code style="font-size:8pt;word-break:break-all">${t.txHash||"—"}</code></td><td>${t.description||"—"}</td></tr>`).join("");
    const totalAmt = txns.reduce((s, t) => s + (parseFloat(t.amount.replace(/[^0-9.]/g,"")) || 0), 0);

    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>STR — ${d.co_name} — ${app.ref_code || app.id}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:10.5pt;color:#1a1a2e;padding:36px 44px;line-height:1.5;max-width:900px;margin:0 auto}
h1{font-size:18pt;color:#c0392b;border-bottom:3px solid #c0392b;padding-bottom:6px;margin-bottom:4px;text-align:center}
.subtitle{text-align:center;font-size:11pt;color:#666;margin-bottom:20px}
h2{font-size:12pt;color:#2d2d5e;margin:20px 0 8px;padding:5px 10px;background:#fff0f0;border-left:3px solid #c0392b;border-radius:0 4px 4px 0}
table{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:9.5pt}
th{background:#f8f0f0;color:#6a2c2c;text-align:left;padding:7px 10px;font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #ddd}
td{padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
code{font-family:'Courier New',monospace;font-size:9pt;background:#f5f5f5;padding:1px 4px;border-radius:3px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:3px 20px}
.fl{font-size:8pt;color:#999;text-transform:uppercase;letter-spacing:.04em}
.fv{font-size:10pt;margin-bottom:6px}
.conf{border:2px solid #c0392b;border-radius:8px;padding:14px 16px;margin:16px 0;background:#fff8f8}
.conf-title{font-weight:700;color:#c0392b;font-size:10pt;margin-bottom:6px}
.total{font-size:14pt;font-weight:700;color:#c0392b}
.footer{margin-top:28px;padding-top:10px;border-top:2px solid #eee;font-size:8pt;color:#999;text-align:center}
.sig-box{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:20px 0}
.sig-line{border-top:1px solid #333;padding-top:6px;font-size:9pt;color:#333}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:8pt;font-weight:600;background:#fce4e4;color:#c0392b}
@media print{body{padding:16px 20px}h1{font-size:14pt}.no-print{display:none!important}}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 22px;background:#c0392b;color:#fff;border:none;border-radius:8px;font-size:10.5pt;font-weight:600;cursor:pointer;margin:12px 8px 12px 0}
.btn:hover{background:#a93226}
.btn-outline{background:transparent;color:#c0392b;border:1.5px solid #c0392b}
</style></head><body>
<div class="no-print" style="text-align:center;margin-bottom:20px">
<button class="btn" onclick="window.print()">Print / Save as PDF</button>
<button class="btn btn-outline" onclick="window.close()">Close</button>
</div>

<h1>SUSPICIOUS TRANSACTION REPORT</h1>
<p class="subtitle">Filed under PMLA Section 12, Rule 3 — PML (Maintenance of Records) Rules 2005<br/>
<span class="badge">CONFIDENTIAL — FIU-IND</span></p>

<h2>Part A — Reporting Entity</h2>
<div class="grid2">
<div><div class="fl">Reporting Entity Name</div><div class="fv"><strong>Stable Pay Global</strong></div></div>
<div><div class="fl">FIU Registration No.</div><div class="fv"><code>RE/CRYPTO/2024/XXXX</code></div></div>
<div><div class="fl">Report Date</div><div class="fv">${reportDate}</div></div>
<div><div class="fl">Report Reference</div><div class="fv"><code>STR-${app.ref_code || app.id}-${Date.now().toString(36).toUpperCase().slice(-6)}</code></div></div>
<div><div class="fl">Reporting Officer</div><div class="fv">${reporterName || "—"}</div></div>
<div><div class="fl">Designation</div><div class="fv">${reporterDesig}</div></div>
</div>

<h2>Part B — Subject Entity Details</h2>
<div class="grid2">
<div><div class="fl">Legal Entity Name</div><div class="fv"><strong>${d.co_name || "—"}</strong></div></div>
<div><div class="fl">Application ID</div><div class="fv"><code>${app.ref_code || app.id}</code></div></div>
<div><div class="fl">Registration No.</div><div class="fv"><code>${d.co_crn || "—"}</code></div></div>
<div><div class="fl">Country</div><div class="fv">${d.co_country || "—"}</div></div>
<div><div class="fl">Tax ID (PAN/EIN/TIN)</div><div class="fv"><code>${d.co_tin || "—"}</code></div></div>
<div><div class="fl">Legal Form</div><div class="fv">${d.co_form || "—"}</div></div>
</div>
<div><div class="fl">Registered Address</div><div class="fv">${d.co_regAddr || "—"}</div></div>
<div><div class="fl">Applicant / Contact</div><div class="fv">${d.appName || "—"} — ${d.appRole || ""} — ${d.email || ""}</div></div>

<h2>Part C — Beneficial Owner(s)</h2>
<table>
<thead><tr><th>Name</th><th>Nationality</th><th>ID No.</th><th>Ownership</th><th>Address</th></tr></thead>
<tbody>
${Array.from({length:3},(_,i)=>i).filter(i=>d["bo"+i+"_name"]).map(i => `<tr><td><strong>${d["bo"+i+"_name"]}</strong></td><td>${d["bo"+i+"_nat"]||"—"}</td><td><code>${d["bo"+i+"_id"]||"—"}</code></td><td>${d["bo"+i+"_pct"]||"—"}</td><td>${d["bo"+i+"_addr"]||"—"}</td></tr>`).join("")}
</tbody>
</table>

<h2>Part D — Suspicious Transaction(s)</h2>
<div class="conf">
<div class="conf-title">Total Suspicious Amount: <span class="total">${txns[0]?.currency || "USD"} ${totalAmt.toLocaleString()}</span></div>
<div style="font-size:9pt;color:#666">${txns.length} transaction(s) reported</div>
</div>
<table>
<thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Chain</th><th>Tx Hash</th><th>Description</th></tr></thead>
<tbody>${txRows || "<tr><td colspan='6' style='text-align:center;color:#999'>No transactions added</td></tr>"}</tbody>
</table>

<h2>Part E — Grounds for Suspicion</h2>
<div style="padding:10px 14px;background:#fff8f8;border:1px solid #f5d5d5;border-radius:6px;font-size:10pt;line-height:1.7;min-height:60px;white-space:pre-wrap">${reason || "No grounds specified."}</div>

<h2>Part F — Action Taken</h2>
<div class="grid2">
<div><div class="fl">Entity KYB Status</div><div class="fv">${app.status.replace(/_/g," ").toUpperCase()}</div></div>
<div><div class="fl">Risk Tier</div><div class="fv">${(app.riskTier || "—").toUpperCase()}</div></div>
<div><div class="fl">Transaction Blocked</div><div class="fv">Pending Review</div></div>
<div><div class="fl">EDD Initiated</div><div class="fv">Yes — upon STR filing</div></div>
</div>

<h2>Part G — Certification</h2>
<p style="font-size:9.5pt;margin-bottom:16px;line-height:1.6">I hereby certify that the information contained in this Suspicious Transaction Report is true, correct, and complete to the best of my knowledge and belief. This report is filed pursuant to the obligations under Section 12 of the Prevention of Money Laundering Act, 2002, and Rule 3 of the PML (Maintenance of Records) Rules, 2005.</p>
<div class="sig-box">
<div>
<div class="sig-line"><strong>${reporterName || "________________"}</strong><br/>${reporterDesig}<br/>Stable Pay Global</div>
</div>
<div>
<div class="sig-line">Date: ${reportDate}<br/>Place: ________________</div>
</div>
</div>

<div class="footer">
<strong>CONFIDENTIAL — SUSPICIOUS TRANSACTION REPORT</strong><br/>
Filed under PMLA 2002 / PML Rules 2005 — For FIU-IND use only<br/>
Stable Pay Global · STR-${app.ref_code || app.id} · Generated ${new Date().toISOString()}
</div>
</body></html>`);
    w.document.close();
  };

  const inputStyle = { width: "100%", padding: "9px 12px", background: T.bg2, border: `1.5px solid ${T.bdr}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" };
  const labelStyle = { fontSize: 10.5, fontWeight: 600, color: T.txt3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, display: "block" };

  return (
    <div>
      {/* Header */}
      <div style={{ border: `1px solid ${T.red}33`, borderRadius: 12, padding: 24, background: T.bg1, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: T.redG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 1V17M2 1H11L8.5 5.5L11 10H2" stroke={T.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.txt }}>Suspicious Transaction Report</div>
            <div style={{ fontSize: 12, color: T.txt3 }}>PMLA Section 12 · PML Rules 2005 · FIU-IND Format</div>
          </div>
        </div>

        <div style={{ padding: "12px 16px", background: T.redG, border: `1px solid ${T.red}33`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: T.txt2, lineHeight: 1.6 }}>
          <strong style={{ color: T.red }}>Obligation:</strong> Under PMLA Section 12, Reporting Entities must file an STR with FIU-IND within 7 days of identifying the suspicious activity. This report will be pre-filled with KYB data for <strong>{d.co_name}</strong>.
        </div>

        {/* Reporter details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Reporting Officer Name</label>
            <input value={reporterName} onChange={e => setReporterName(e.target.value)} placeholder="Your full name" style={inputStyle} className="sp-input" />
          </div>
          <div>
            <label style={labelStyle}>Designation</label>
            <input value={reporterDesig} onChange={e => setReporterDesig(e.target.value)} style={inputStyle} className="sp-input" />
          </div>
          <div>
            <label style={labelStyle}>Report Date</label>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={inputStyle} className="sp-input" />
          </div>
        </div>
      </div>

      {/* Suspicious transactions */}
      <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 24, background: T.bg1, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 4 }}>Suspicious Transactions</div>
        <div style={{ fontSize: 12, color: T.txt3, marginBottom: 16 }}>Add transactions that triggered suspicion. These will be included in Part D of the STR.</div>

        {/* Add transaction form */}
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px 1fr 1fr", gap: 10, marginBottom: 12, alignItems: "end" }}>
          <div><label style={labelStyle}>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={inputStyle} className="sp-input" /></div>
          <div><label style={labelStyle}>Amount</label><input value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="e.g. 50,000" style={inputStyle} className="sp-input" /></div>
          <div><label style={labelStyle}>Currency</label>
            <select value={form.currency} onChange={e => setForm(f => ({...f, currency: e.target.value}))} style={{...inputStyle, cursor:"pointer", appearance:"none"}}>
              <option>USD</option><option>INR</option><option>USDT</option><option>USDC</option><option>BTC</option><option>ETH</option>
            </select>
          </div>
          <div><label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} style={{...inputStyle, cursor:"pointer", appearance:"none"}}>
              <option>Crypto-to-Fiat</option><option>Fiat-to-Crypto</option><option>Crypto-to-Crypto</option><option>Wire Transfer</option><option>OTC Trade</option><option>Other</option>
            </select>
          </div>
          <div><label style={labelStyle}>Blockchain</label><input value={form.chain} onChange={e => setForm(f => ({...f, chain: e.target.value}))} placeholder="e.g. Tron TRC-20" style={inputStyle} className="sp-input" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 16 }}>
          <div><label style={labelStyle}>Tx Hash / Reference</label><input value={form.txHash} onChange={e => setForm(f => ({...f, txHash: e.target.value}))} placeholder="Transaction hash or bank reference" style={{...inputStyle, fontFamily:"'IBM Plex Mono',monospace", fontSize:12}} className="sp-input" /></div>
          <button onClick={addTx} style={{
            padding: "9px 20px", borderRadius: 8, border: "none", background: T.red, color: "#fff",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
            display: "flex", alignItems: "center", gap: 6, alignSelf: "end", whiteSpace: "nowrap",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add Transaction
          </button>
        </div>

        {/* Transaction list */}
        {txns.length > 0 && (
          <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "100px 120px 120px 1fr 40px", gap: 4, padding: "8px 12px", background: T.bg3, fontSize: 10, fontWeight: 600, color: T.txt3, textTransform: "uppercase", letterSpacing: ".05em" }}>
              <span>Date</span><span>Amount</span><span>Type</span><span>Details</span><span></span>
            </div>
            {txns.map(t => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "100px 120px 120px 1fr 40px", gap: 4, padding: "8px 12px", borderTop: `1px solid ${T.bdr}`, fontSize: 12, alignItems: "center" }}>
                <span style={{ color: T.txt }}>{t.date}</span>
                <span style={{ color: T.red, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{t.currency} {t.amount}</span>
                <span style={{ color: T.txt2 }}>{t.type}</span>
                <span style={{ color: T.txt3, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.chain ? t.chain + " · " : ""}{t.txHash || t.description || "—"}</span>
                <button onClick={() => removeTx(t.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.red, fontSize: 14, padding: 4 }}>×</button>
              </div>
            ))}
            <div style={{ padding: "8px 12px", borderTop: `1px solid ${T.bdr}`, background: T.redG, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: T.txt3 }}>{txns.length} transaction(s)</span>
              <span style={{ color: T.red, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                Total: {txns[0]?.currency || "USD"} {txns.reduce((s, t) => s + (parseFloat(t.amount.replace(/[^0-9.]/g,"")) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
        {txns.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", color: T.txt3, fontSize: 12, border: `1.5px dashed ${T.bdrA}`, borderRadius: 8 }}>
            No suspicious transactions added yet. Use the form above to attach transactions.
          </div>
        )}
      </div>

      {/* Grounds for suspicion */}
      <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 24, background: T.bg1, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 4 }}>Grounds for Suspicion</div>
        <div style={{ fontSize: 12, color: T.txt3, marginBottom: 12 }}>Describe why these transactions are deemed suspicious. Include patterns, red flags, and any supporting analysis.</div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={"Describe the suspicious activity, including:\n• Nature of the suspicion\n• Transaction patterns that triggered concern\n• Inconsistencies with declared business profile\n• Any structuring or layering indicators\n• Links to sanctioned entities or jurisdictions\n• Deviation from expected transaction behaviour"}
          style={{
            width: "100%", padding: "12px 14px", background: T.bg2, border: `1.5px solid ${T.bdr}`,
            borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
            resize: "vertical", lineHeight: 1.7, minHeight: 140,
          }}
          className="sp-input"
        />
      </div>

      {/* Generate button */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={generateSTR} disabled={txns.length === 0} style={{
          padding: "12px 28px", borderRadius: 8, border: "none",
          background: txns.length === 0 ? T.bg3 : T.red,
          color: txns.length === 0 ? T.txt3 : "#fff",
          fontSize: 14, fontWeight: 600, cursor: txns.length === 0 ? "default" : "pointer",
          fontFamily: "'Inter', system-ui, sans-serif",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: txns.length > 0 ? "0 4px 16px rgba(240,68,56,.3)" : "none",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 1V15M2 1H11L8.5 5.5L11 10H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Generate STR Report
        </button>
        {txns.length === 0 && <span style={{ fontSize: 12, color: T.txt3 }}>Add at least one suspicious transaction to generate the report.</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN ADMIN PANEL
───────────────────────────────────────────── */
export default function AdminPanel() {
  const [view, setView] = useState("list"); // list | detail | login
  const [selectedApp, setSelectedApp] = useState(null);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [docAnalysis, setDocAnalysis] = useState({}); // { "appId:docKey": analysisResult }
  const [detailTab, setDetailTab] = useState("overview");
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem("sp_admin_token") || "");
  const [adminUser, setAdminUser] = useState(null);
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftDetail, setDraftDetail] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [driveState, setDriveState] = useState({ status: "idle", progress: 0, total: 0, folderUrl: null, error: null });

  useEffect(() => {
    setDriveState({ status: "idle", progress: 0, total: 0, folderUrl: null, error: null });
  }, [selectedApp?.id]);

  const downloadDocBlob = async (doc) => {
    const adminToken = sessionStorage.getItem("sp_admin_token");
    const res = await fetch(`/api/documents/${doc.docId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`Could not fetch "${doc.label}" (${res.status})`);
    return res.blob();
  };

  const triggerBrowserDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadOneDoc = async (doc) => {
    if (!doc?.docId) return;
    try {
      const blob = await downloadDocBlob(doc);
      const ext = (doc.fileName || "").split(".").pop();
      const fileName = sanitizeFileName(`${doc.label}${ext ? "." + ext : ""}`);
      triggerBrowserDownload(blob, fileName);
    } catch (err) {
      console.error("[Download] Failed:", err);
      alert(err.message || "Download failed");
    }
  };

  const downloadAllDocs = async (app, docs) => {
    const uploadable = docs.filter(d => d.hasFile && d.docId);
    if (uploadable.length === 0) return;
    for (const doc of uploadable) {
      try {
        const blob = await downloadDocBlob(doc);
        const ext = (doc.fileName || "").split(".").pop();
        const baseLabel = `${app.ref_code || app.id} - ${doc.label}`;
        const fileName = sanitizeFileName(`${baseLabel}${ext ? "." + ext : ""}`);
        triggerBrowserDownload(blob, fileName);
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error("[Download] Failed for", doc.label, err);
      }
    }
  };

  const saveDocsToGoogleDrive = async (app, docs) => {
    const uploadable = docs.filter(d => d.hasFile && d.docId);
    if (uploadable.length === 0) {
      setDriveState({ status: "error", progress: 0, total: 0, folderUrl: null, error: "No uploaded documents to export" });
      return;
    }
    setDriveState({ status: "authorizing", progress: 0, total: uploadable.length, folderUrl: null, error: null });
    try {
      const accessToken = await requestDriveAccessToken();
      setDriveState(s => ({ ...s, status: "creating-folder" }));
      const folderLabel = sanitizeFileName(`KYB - ${app.data.co_name || "Untitled"} - ${app.ref_code || app.id}`);
      const folder = await driveCreateFolder(accessToken, folderLabel);

      const adminToken = sessionStorage.getItem("sp_admin_token");
      let uploaded = 0;
      setDriveState(s => ({ ...s, status: "uploading", progress: 0 }));
      for (const doc of uploadable) {
        const dRes = await fetch(`/api/documents/${doc.docId}/download`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (!dRes.ok) throw new Error(`Could not fetch "${doc.label}" (${dRes.status})`);
        const blob = await dRes.blob();
        const ext = (doc.fileName || "").split(".").pop();
        const fileName = sanitizeFileName(`${doc.label}${ext ? "." + ext : ""}`);
        await driveUploadFile(accessToken, folder.id, fileName, blob);
        uploaded++;
        setDriveState(s => ({ ...s, progress: uploaded }));
      }
      setDriveState({ status: "done", progress: uploaded, total: uploadable.length, folderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`, error: null });
    } catch (err) {
      console.error("[Drive] Export failed:", err);
      setDriveState(s => ({ ...s, status: "error", error: err.message || "Export failed" }));
    }
  };

  // Admin login
  const doLogin = async (email, password) => {
    setLoginLoading(true);
    setLoginErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Login failed");
      sessionStorage.setItem("sp_admin_token", data.token);
      setAdminToken(data.token);
      setAdminUser(data.user);
    } catch (e) {
      setLoginErr(e.message);
    }
    setLoginLoading(false);
  };

  const doLogout = () => {
    sessionStorage.removeItem("sp_admin_token");
    setAdminToken("");
    setAdminUser(null);
    setDrafts([]);
  };

  // Fetch live drafts with polling
  const fetchDrafts = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("sp_admin_token");
      if (!token) { setDraftsLoading(false); return; }
      const res = await fetch("/api/applications/drafts", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      } else if (res.status === 401 || res.status === 403) {
        doLogout();
      }
    } catch {}
    setDraftsLoading(false);
  }, []);

  useEffect(() => {
    fetchDrafts();
    const interval = setInterval(fetchDrafts, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchDrafts, adminToken]);

  // Fetch submitted applications from API
  const fetchApps = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("sp_admin_token");
      if (!token) { setAppsLoading(false); return; }
      const res = await fetch("/api/applications", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = (data.applications || []).map(a => {
          const fd = typeof a.form_data === "string" ? JSON.parse(a.form_data) : (a.form_data || {});
          return {
            id: a.id,
            ref_code: a.ref_code,
            submitted: a.submitted_at,
            status: a.status,
            riskTier: a.risk_tier || "—",
            data: {
              co_name: a.co_name || fd.co_name || "—",
              appName: a.app_name || fd.appName || "—",
              co_country: a.country || fd.co_country || "—",
              ...fd,
            },
            docs: [],
          };
        });
        setApps(normalized);
      } else if (res.status === 401 || res.status === 403) {
        doLogout();
      }
    } catch (err) {
      console.error("[Admin] Failed to fetch applications:", err);
    }
    setAppsLoading(false);
  }, []);

  useEffect(() => {
    if (adminToken) fetchApps();
  }, [fetchApps, adminToken]);

  const openDraft = useCallback(async (draft) => {
    setSelectedDraft(draft);
    setDraftDetail(null);
    setDraftLoading(true);
    try {
      const token = sessionStorage.getItem("sp_admin_token");
      const res = await fetch(`/api/applications/${draft.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const fd = typeof data.form_data === "string" ? JSON.parse(data.form_data) : (data.form_data || {});
        setDraftDetail({ ...data, data: fd });
      }
    } catch {}
    setDraftLoading(false);
  }, []);

  const closeDraft = () => { setSelectedDraft(null); setDraftDetail(null); };

  const openApp = useCallback(async (app) => {
    setSelectedApp(app);
    setView("detail");
    setDetailTab("overview");
    // Fetch full detail from API
    try {
      const token = sessionStorage.getItem("sp_admin_token");
      const res = await fetch(`/api/applications/${app.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const detail = await res.json();
        const fd = typeof detail.form_data === "string" ? JSON.parse(detail.form_data) : (detail.form_data || {});
        const docs = (detail.documents || []).map(d => ({
          key: d.field_key,
          label: (ALL_DOCS.find(ad => ad.key === d.field_key) || {}).label || d.field_key,
          fileName: d.original_name,
          hasFile: true,
          docId: d.id,
        }));
        // Fill in any ALL_DOCS entries that have no uploaded file
        const uploadedKeys = new Set(docs.map(d => d.key));
        ALL_DOCS.forEach(ad => {
          if (!uploadedKeys.has(ad.key)) docs.push({ key: ad.key, label: ad.label, fileName: null, hasFile: false });
        });
        setSelectedApp({
          id: detail.id,
          ref_code: detail.ref_code,
          submitted: detail.submitted_at,
          status: detail.status,
          riskTier: detail.risk_tier || "—",
          data: fd,
          docs,
          notes: detail.notes || [],
        });
      }
    } catch (err) {
      console.error("[Admin] Failed to load app detail:", err);
    }
  }, []);
  const goBack = () => { setView("list"); setSelectedApp(null); };

  const updateStatus = async (appId, newStatus) => {
    try {
      const token = sessionStorage.getItem("sp_admin_token");
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        if (selectedApp?.id === appId) setSelectedApp(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("[Admin] Status update failed:", err);
    }
  };

  // Create a fake File object for demo (in production, files would come from backend)
  const createDemoFile = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };
    return new File([new ArrayBuffer(50000)], fileName, { type: mimeMap[ext] || "application/octet-stream" });
  };

  const triggerDocAnalysis = useCallback((appId, docKey, docLabel) => {
    const aKey = `${appId}:${docKey}`;
    setDocAnalysis(prev => ({ ...prev, [aKey]: { status: "analyzing" } }));
    const appMatch = apps.find(a => a.id === appId);
    const file = createDemoFile((appMatch?.docs || []).find(d => d.key === docKey)?.fileName || "doc.pdf");
    runFullAnalysis(file, docLabel).then(result => {
      setDocAnalysis(prev => ({ ...prev, [aKey]: result }));
    }).catch(() => {
      setDocAnalysis(prev => ({ ...prev, [aKey]: { status: "error", compositeScore: 0, compositeLevel: "low", findings: [{ severity: "info", area: "Error", desc: "Analysis failed" }], timestamp: Date.now() } }));
    });
  }, []);

  const scanAllDocs = (app) => {
    (app.docs || []).forEach(doc => {
      const aKey = `${app.id}:${doc.key}`;
      if (!docAnalysis[aKey]) triggerDocAnalysis(app.id, doc.key, doc.label);
    });
  };

  // Stats
  const pending = apps.filter(a => a.status === "pending_review").length;
  const flagged = apps.filter(a => a.status === "flagged").length;
  const approved = apps.filter(a => a.status === "approved").length;

  return (
    <div style={{ minHeight: "100vh", background: T.bg0, fontFamily: "'Inter', system-ui, sans-serif", color: T.txt, position: "relative" }}>
      <style>{CSS}</style>

      {/* Admin Login Screen */}
      {!adminToken && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
          <div style={{ width: 380, padding: 32, background: T.bg1, borderRadius: 16, border: `1px solid ${T.bdr}` }}>
            <div style={{ fontSize: 14, fontWeight: 400, color: T.blueL, marginBottom: 2 }}>Stable Pay</div>
            <div style={{ fontSize: 9.5, color: T.txt3, letterSpacing: ".06em", marginBottom: 28 }}>COMPLIANCE ADMIN</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Sign in</h2>
            {loginErr && <div style={{ padding: "8px 12px", borderRadius: 8, background: T.redG, color: T.red, fontSize: 12, marginBottom: 14 }}>{loginErr}</div>}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: T.txt3, display: "block", marginBottom: 5 }}>Email</label>
              <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="sp-input" style={{ width: "100%", padding: "10px 14px", background: T.bg2, border: `1.5px solid ${T.bdr}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: T.txt3, display: "block", marginBottom: 5 }}>Password</label>
              <input type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin(loginEmail, loginPw)} className="sp-input" style={{ width: "100%", padding: "10px 14px", background: T.bg2, border: `1.5px solid ${T.bdr}`, borderRadius: 8, color: T.txt, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }} />
            </div>
            <button onClick={() => doLogin(loginEmail, loginPw)} disabled={loginLoading} style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: T.grad, color: "#fff", fontSize: 13, fontWeight: 600, cursor: loginLoading ? "default" : "pointer", fontFamily: "'Inter', system-ui, sans-serif", opacity: loginLoading ? 0.6 : 1 }}>{loginLoading ? "Signing in..." : "Sign in"}</button>
          </div>
        </div>
      )}

      {adminToken && <>
      {/* Top Nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: T.bg1,
        borderBottom: `1px solid ${T.bdr}`,
        padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 400, color: T.blueL }}>Stable Pay</div>
            <div style={{ fontSize: 9.5, color: T.txt3, letterSpacing: ".06em" }}>COMPLIANCE ADMIN</div>
          </div>
          {view === "detail" && (
            <button onClick={goBack} style={{ marginLeft: 20, padding: "5px 14px", borderRadius: 6, border: `1px solid ${T.bdrA}`, background: "transparent", color: T.txt2, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All Applications
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
            <span style={{ fontSize: 11, color: T.txt3 }}>Live</span>
          </div>
          {adminUser && <span style={{ fontSize: 11, color: T.txt2 }}>{adminUser.name}</span>}
          <button onClick={doLogout} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${T.bdrA}`, background: "transparent", fontSize: 11, color: T.txt3, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px", position: "relative", zIndex: 1 }}>

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <div className="af">
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 6 }}>KYB Applications</h1>
            <p style={{ fontSize: 13, color: T.txt2, marginBottom: 24 }}>Review submitted applications, verify documents with AI-powered fraud detection, and manage approvals.</p>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <Stat label="Total" value={apps.length} />
              <Stat label="Pending Review" value={pending} />
              <Stat label="Flagged" value={flagged} />
              <Stat label="Approved" value={approved} />
              <Stat label="Live Drafts" value={drafts.length} />
            </div>

            {/* Live Drafts */}
            <div style={{ marginBottom: 28, border: `1px solid ${T.bdr}`, borderRadius: 14, overflow: "hidden", background: T.bg1 }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}`, animation: "pulse 2s ease-in-out infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Live Drafts</span>
                  <span style={{ fontSize: 10.5, color: T.txt3 }}>Auto-refreshes every 15s</span>
                </div>
                <button onClick={fetchDrafts} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${T.bdrA}`, background: "transparent", color: T.txt2, fontSize: 11, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>Refresh</button>
              </div>
              {draftsLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: T.txt3, fontSize: 12 }}>Loading drafts...</div>
              ) : drafts.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: T.txt3, fontSize: 12 }}>No active drafts</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 110px 140px 140px", gap: 8, padding: "10px 20px", borderBottom: `1px solid ${T.bdr}`, fontSize: 10.5, fontWeight: 600, color: T.txt3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                    <span>Entity / Applicant</span><span>Email</span><span>Country</span><span>Created</span><span>Last Saved</span>
                  </div>
                  {drafts.map(d => {
                    const hasSaved = d.has_saved;
                    const updatedAgo = d.updated_at ? Math.round((Date.now() - new Date(d.updated_at).getTime()) / 60000) : null;
                    const timeLabel = updatedAgo !== null
                      ? updatedAgo < 1 ? "Just now" : updatedAgo < 60 ? `${updatedAgo}m ago` : updatedAgo < 1440 ? `${Math.round(updatedAgo/60)}h ago` : `${Math.round(updatedAgo/1440)}d ago`
                      : "—";
                    return (
                      <div key={d.id} onClick={() => openDraft(d)} style={{
                        display: "grid", gridTemplateColumns: "1fr 160px 110px 140px 140px", gap: 8,
                        padding: "12px 20px", borderBottom: `1px solid ${T.bdr}`, cursor: "pointer",
                        transition: "background .15s",
                      }} onMouseEnter={e => e.currentTarget.style.background = T.bg3} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: d.co_name ? T.txt : T.txt3 }}>{d.co_name || "Not yet entered"}</div>
                          <div style={{ fontSize: 11, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{d.ref_code}</div>
                        </div>
                        <span style={{ fontSize: 12, color: T.txt2, display: "flex", alignItems: "center", wordBreak: "break-all" }}>{d.applicant_email || d.app_email || "—"}</span>
                        <span style={{ fontSize: 12, color: T.txt2, display: "flex", alignItems: "center" }}>{d.country || "—"}</span>
                        <span style={{ fontSize: 11, color: T.txt3, display: "flex", alignItems: "center", fontFamily: "'IBM Plex Mono', monospace" }}>{new Date(d.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {hasSaved ? (
                            <>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: updatedAgo < 5 ? T.green : updatedAgo < 60 ? T.amber : T.txt3 }} />
                              <span style={{ fontSize: 11, color: updatedAgo < 5 ? T.green : updatedAgo < 60 ? T.amber : T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{timeLabel}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: T.txt3, fontStyle: "italic" }}>Never saved</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 14, overflow: "hidden", background: T.bg1 }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 100px 100px 120px 80px", gap: 8, padding: "12px 20px", borderBottom: `1px solid ${T.bdr}`, fontSize: 10.5, fontWeight: 600, color: T.txt3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                <span>Entity</span><span>Applicant</span><span>Country</span><span>Status</span><span>Submitted</span><span>Risk</span>
              </div>
              {/* Rows */}
              {appsLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: T.txt3, fontSize: 12 }}>Loading applications...</div>
              ) : apps.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: T.txt3, fontSize: 12 }}>No submitted applications yet</div>
              ) : apps.map(app => (
                <div key={app.id} onClick={() => openApp(app)} style={{
                  display: "grid", gridTemplateColumns: "1fr 180px 100px 100px 120px 80px", gap: 8,
                  padding: "14px 20px", borderBottom: `1px solid ${T.bdr}`, cursor: "pointer",
                  transition: "background .15s",
                }} onMouseEnter={e => e.currentTarget.style.background = T.bg3} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>{app.data.co_name}</div>
                    <div style={{ fontSize: 11, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{app.ref_code || app.id}</div>
                  </div>
                  <span style={{ fontSize: 12.5, color: T.txt2, display: "flex", alignItems: "center" }}>{app.data.appName}</span>
                  <span style={{ fontSize: 12.5, color: T.txt2, display: "flex", alignItems: "center" }}>{app.data.co_country}</span>
                  <div style={{ display: "flex", alignItems: "center" }}><StatusBadge status={app.status} /></div>
                  <span style={{ fontSize: 12, color: T.txt3, display: "flex", alignItems: "center", fontFamily: "'IBM Plex Mono', monospace" }}>{app.submitted ? new Date(app.submitted).toLocaleDateString() : "—"}</span>
                  <div style={{ display: "flex", alignItems: "center" }}><RiskTierBadge tier={app.riskTier} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === "detail" && selectedApp && (() => {
          const appFromList = apps.find(a => a.id === selectedApp.id);
          const app = selectedApp.data && Object.keys(selectedApp.data).length > 5 ? selectedApp : (appFromList || selectedApp);
          const appDocs = app.docs || [];
          const tabs = [
            { id: "overview", label: "Overview" },
            { id: "documents", label: `Documents (${appDocs.length})` },
            { id: "kyb-report", label: "KYB Report" },
            { id: "str", label: "STR Report" },
            { id: "actions", label: "Actions" },
          ];

          const analyzedDocs = appDocs.map(d => ({ ...d, analysis: docAnalysis[`${app.id}:${d.key}`] }));
          const completedAnalyses = analyzedDocs.filter(d => d.analysis?.status === "complete");
          const flaggedDocs = completedAnalyses.filter(d => d.analysis?.compositeLevel === "high" || d.analysis?.compositeLevel === "critical");

          return (
            <div className="af">
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>{app.data.co_name}</h1>
                    <StatusBadge status={app.status} />
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.txt3 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{app.ref_code || app.id}</span>
                    <span>{app.data.appName} · {app.data.appRole}</span>
                    <span>{app.data.co_country}</span>
                  </div>
                </div>
                <button onClick={() => scanAllDocs(app)} style={{
                  padding: "8px 18px", borderRadius: 8, border: "none", background: T.grad, color: "#fff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: "0 4px 16px rgba(102,103,171,.3)", transition: "all .2s",
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="#fff" strokeWidth="1.5"/><path d="M9.5 9.5L13 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Scan All Documents
                </button>
              </div>

              {/* Alert if flagged docs */}
              {flaggedDocs.length > 0 && (
                <div style={{ padding: "12px 16px", background: T.redG, border: `1px solid ${T.red}44`, borderRadius: 12, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16, color: T.red, flexShrink: 0 }}>⚠</span>
                  <div style={{ fontSize: 12.5, color: T.txt2, lineHeight: 1.6 }}>
                    <strong style={{ color: T.red }}>{flaggedDocs.length} document{flaggedDocs.length > 1 ? "s" : ""} flagged</strong> — {flaggedDocs.map(d => d.label).join(", ")}. Review findings before approving.
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${T.bdr}`, paddingBottom: 0 }}>
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setDetailTab(t.id)} style={{
                    padding: "10px 18px", border: "none", cursor: "pointer",
                    background: "transparent",
                    color: detailTab === t.id ? T.blueL : T.txt3,
                    fontSize: 13, fontWeight: detailTab === t.id ? 600 : 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    borderBottom: `2px solid ${detailTab === t.id ? T.blue : "transparent"}`,
                    marginBottom: -1, transition: "all .15s",
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Tab: Overview — ALL form fields */}
              {detailTab === "overview" && (
                <div>
                  {FIELD_SECTIONS.map(section => {
                    const filledFields = section.fields.filter(f => {
                      const val = app.data[f.key];
                      if (val === undefined || val === null || val === "") return false;
                      if (Array.isArray(val) && val.length === 0) return false;
                      return true;
                    });
                    if (filledFields.length === 0) return null;
                    return (
                      <div key={section.title} style={{ marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.blueL, textTransform: "uppercase", letterSpacing: ".06em" }}>{section.title}</div>
                          <div style={{ flex: 1, height: 1, background: T.bdr }} />
                          <span style={{ fontSize: 10, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>Step {String(section.step + 1).padStart(2, "0")}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {filledFields.map(f => {
                            const val = app.data[f.key];

                            /* Liveness verification field — with viewable/downloadable images */
                            if (f.liveness && val && val.verified) {
                              return (
                                <div key={f.key} style={{ gridColumn: "span 2", padding: "12px 14px", background: T.greenG, borderRadius: 8, border: `1px solid ${T.green}44` }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                    <div>
                                      <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{f.label}</div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>Verified</span>
                                        <span style={{ fontSize: 11, color: T.txt3 }}>{val.challengeCount} challenges · {new Date(val.completedAt).toLocaleString()}</span>
                                      </div>
                                    </div>
                                    <button onClick={() => {
                                      const imgs = (val.captures || []).filter(c => c.image && c.image.startsWith("data:"));
                                      if (imgs.length === 0) return;
                                      const w = window.open("", "_blank");
                                      w.document.write(`<!DOCTYPE html><html><head><title>Liveness Captures — ${app.data.co_name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0C0C14;color:#F0F0F8;font-family:Inter,system-ui,sans-serif;padding:32px}.grid{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}h1{text-align:center;margin-bottom:8px;font-size:18px}p{text-align:center;color:#707088;margin-bottom:24px;font-size:13px}.card{background:#1C1C2E;border-radius:12px;padding:12px;text-align:center;width:200px}.card img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;margin-bottom:8px}.label{font-size:11px;color:#B0B0C8;margin-bottom:6px}.dl{display:inline-block;padding:4px 12px;border-radius:6px;background:#24243A;color:#A0A1D8;font-size:11px;cursor:pointer;border:1px solid #3A3A58;text-decoration:none}@media print{body{background:#fff;color:#000}.card{background:#f5f5f5}.label{color:#333}.dl{display:none}}</style></head><body><h1>Liveness Verification — ${f.key.replace(/_selfie/,"").replace("bo","BO ")}</h1><p>${app.data.co_name} · ${app.ref_code || app.id} · ${new Date(val.completedAt).toLocaleString()}</p><div class="grid">${imgs.map((c,i) => `<div class="card"><img src="${c.image}" alt="Challenge ${i+1}"/><div class="label">${c.challenge}</div><a class="dl" href="${c.image}" download="liveness_${f.key}_${i+1}.jpg">Download</a></div>`).join("")}</div></body></html>`);
                                      w.document.close();
                                    }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${T.green}44`, background: "transparent", color: T.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 8V10.5H11V8M6 1V8M3.5 5.5L6 8L8.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      View & Download
                                    </button>
                                  </div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {(val.captures || []).map((c, i) => (
                                      <div key={i} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => {
                                        if (c.image && c.image.startsWith("data:")) {
                                          const w = window.open(""); w.document.write(`<img src="${c.image}" style="max-width:100%;max-height:100vh;display:block;margin:0 auto;background:#000"/>`); w.document.title = c.challenge;
                                        }
                                      }}>
                                        <div style={{ width: 68, height: 68, borderRadius: 8, overflow: "hidden", border: `1.5px solid ${T.green}44`, marginBottom: 4, transition: "border-color .15s" }}
                                          onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
                                          onMouseLeave={e => e.currentTarget.style.borderColor = T.green+"44"}>
                                          <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        </div>
                                        <div style={{ fontSize: 9, color: T.txt3, maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.challenge}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            /* Submission metadata / geolocation */
                            if (f.meta && val && typeof val === "object") {
                              const geo = val.geo || {};
                              return (
                                <div key={f.key} style={{ gridColumn: "span 2", padding: "12px 14px", background: T.bg2, borderRadius: 8, border: `1px solid ${T.bdr}` }}>
                                  <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{f.label}</div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                                    <div><span style={{ color: T.txt3 }}>Submitted: </span><span style={{ color: T.txt }}>{new Date(val.submittedAt).toLocaleString()}</span></div>
                                    <div><span style={{ color: T.txt3 }}>Timezone: </span><span style={{ color: T.txt }}>{val.timezone}</span></div>
                                    {geo.lat ? (
                                      <>
                                        <div><span style={{ color: T.txt3 }}>Latitude: </span><span style={{ color: T.green, fontFamily: "'IBM Plex Mono', monospace" }}>{geo.lat?.toFixed(6)}</span></div>
                                        <div><span style={{ color: T.txt3 }}>Longitude: </span><span style={{ color: T.green, fontFamily: "'IBM Plex Mono', monospace" }}>{geo.lng?.toFixed(6)}</span></div>
                                        <div><span style={{ color: T.txt3 }}>Accuracy: </span><span style={{ color: T.txt }}>{geo.accuracy?.toFixed(0)}m</span></div>
                                        <div><span style={{ color: T.txt3 }}>Geo captured: </span><span style={{ color: T.txt }}>{new Date(geo.capturedAt).toLocaleTimeString()}</span></div>
                                      </>
                                    ) : (
                                      <div style={{ gridColumn: "span 2" }}><span style={{ color: T.amber }}>Geolocation: {geo.error || "Not available"}</span></div>
                                    )}
                                    {val.ip && <div><span style={{ color: T.txt3 }}>IP Address: </span><span style={{ color: T.blueL, fontFamily: "'IBM Plex Mono', monospace" }}>{val.ip}</span></div>}
                                    <div><span style={{ color: T.txt3 }}>Screen: </span><span style={{ color: T.txt }}>{val.screenRes}</span></div>
                                    {val.platform && <div><span style={{ color: T.txt3 }}>Platform: </span><span style={{ color: T.txt }}>{val.platform}</span></div>}
                                    {val.language && <div><span style={{ color: T.txt3 }}>Language: </span><span style={{ color: T.txt }}>{val.language}</span></div>}
                                    <div style={{ gridColumn: "span 2" }}><span style={{ color: T.txt3 }}>User Agent: </span><span style={{ color: T.txt3, fontSize: 10, wordBreak: "break-all" }}>{val.userAgent}</span></div>
                                  </div>
                                </div>
                              );
                            }

                            /* File upload field */
                            if (f.file) {
                              const name = typeof val === "object" ? val?.name : val;
                              return (
                                <div key={f.key} style={{ gridColumn: f.wide ? "span 2" : "span 1", padding: "10px 14px", background: T.bg2, borderRadius: 8, border: `1px solid ${T.bdr}` }}>
                                  <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{f.label}</div>
                                  <div style={{ fontSize: 12, color: T.blueL, fontFamily: "'IBM Plex Mono', monospace" }}>{name || "—"}</div>
                                </div>
                              );
                            }

                            /* Standard field */
                            const displayVal = f.bool ? (val ? "Yes" : "No")
                              : f.list ? (Array.isArray(val) ? val.join(", ") : String(val))
                              : String(val);
                            return (
                              <div key={f.key} style={{
                                gridColumn: f.wide ? "span 2" : "span 1",
                                padding: "10px 14px", background: T.bg2, borderRadius: 8, border: `1px solid ${T.bdr}`,
                              }}>
                                <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{f.label}</div>
                                <div style={{
                                  fontSize: 12.5, color: f.bool ? (val ? T.green : T.red) : T.txt, fontWeight: 500, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                                  fontFamily: f.mono ? "'IBM Plex Mono', monospace" : "inherit",
                                }}>{displayVal}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Doc summary grid */}
                  {completedAnalyses.length > 0 && (
                    <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: "16px 18px", background: T.bg1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.txt3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Document Verification Summary</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 16px", fontSize: 12 }}>
                        <span style={{ color: T.txt3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Document</span>
                        <span style={{ color: T.txt3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Risk</span>
                        <span style={{ color: T.txt3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Score</span>
                        {completedAnalyses.map(d => {
                          const lvl = d.analysis.compositeLevel;
                          const col = lvl === "critical" ? T.red : lvl === "high" ? T.amber : lvl === "medium" ? T.blueL : T.green;
                          return (
                            <React.Fragment key={d.key}>
                              <span style={{ color: T.txt2 }}>{d.label}</span>
                              <span style={{ color: col, fontWeight: 600, textTransform: "uppercase", fontSize: 11 }}>{lvl}</span>
                              <span style={{ color: col, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{d.analysis.compositeScore}</span>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Documents */}
              {detailTab === "documents" && (
                <div>
                  {(() => {
                    const uploadedCount = appDocs.filter(d => d.hasFile && d.docId).length;
                    const busy = ["authorizing", "creating-folder", "uploading"].includes(driveState.status);
                    const statusLine =
                      driveState.status === "authorizing" ? "Waiting for Google sign-in…" :
                      driveState.status === "creating-folder" ? "Creating Drive folder…" :
                      driveState.status === "uploading" ? `Uploading ${driveState.progress + 1} of ${driveState.total}…` :
                      driveState.status === "done" ? `Exported ${driveState.progress} of ${driveState.total} documents` :
                      driveState.status === "error" ? driveState.error :
                      `${uploadedCount} uploaded document${uploadedCount === 1 ? "" : "s"} ready to export`;
                    const statusColor = driveState.status === "error" ? T.red : driveState.status === "done" ? T.green : T.txt3;
                    return (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "14px 18px", background: T.bg1, border: `1px solid ${T.bdr}`, borderRadius: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: T.bg3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 4L2 14L5 19H13L16 14L10 4H8Z" fill="#4285F4"/><path d="M10 4L16 14H22L16.5 4H10Z" fill="#EA4335"/><path d="M22 14H16L13 19H19L22 14Z" fill="#FBBC05"/><path d="M5 19L8 14H2L5 19Z" fill="#34A853"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>Export to Google Drive</div>
                            <div style={{ fontSize: 11.5, color: statusColor, marginTop: 2 }}>{statusLine}</div>
                          </div>
                        </div>
                        {driveState.status === "done" && driveState.folderUrl ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => downloadAllDocs(app, appDocs)}
                              disabled={uploadedCount === 0}
                              style={{
                                padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${T.bdrA}`, background: "transparent",
                                color: T.txt, fontSize: 12, fontWeight: 600, cursor: uploadedCount === 0 ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                              }}>
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1V9M7 9L4 6M7 9L10 6M1 11V13H13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Download all
                            </button>
                            <a href={driveState.folderUrl} target="_blank" rel="noopener noreferrer" style={{
                              padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${T.bdrA}`, background: "transparent",
                              color: T.txt, fontSize: 12, fontWeight: 600, textDecoration: "none",
                              display: "flex", alignItems: "center", gap: 6,
                            }}>
                              Open folder
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1H9V7M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </a>
                            <button onClick={() => saveDocsToGoogleDrive(app, appDocs)} style={{
                              padding: "8px 16px", borderRadius: 8, border: "none", background: T.grad, color: "#fff",
                              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
                            }}>Export again</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => downloadAllDocs(app, appDocs)}
                            disabled={busy || uploadedCount === 0}
                            style={{
                              padding: "10px 16px", borderRadius: 8,
                              border: `1.5px solid ${busy || uploadedCount === 0 ? T.bdr : T.bdrA}`,
                              background: "transparent",
                              color: busy || uploadedCount === 0 ? T.txt3 : T.txt,
                              fontSize: 12.5, fontWeight: 600,
                              cursor: busy || uploadedCount === 0 ? "not-allowed" : "pointer",
                              fontFamily: "'Inter', system-ui, sans-serif",
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1V9M7 9L4 6M7 9L10 6M1 11V13H13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Download all
                          </button>
                          <button
                            onClick={() => saveDocsToGoogleDrive(app, appDocs)}
                            disabled={busy || uploadedCount === 0}
                            style={{
                              padding: "10px 20px", borderRadius: 8, border: "none",
                              background: busy || uploadedCount === 0 ? T.bg3 : T.grad,
                              color: busy || uploadedCount === 0 ? T.txt3 : "#fff",
                              fontSize: 12.5, fontWeight: 600,
                              cursor: busy || uploadedCount === 0 ? "not-allowed" : "pointer",
                              fontFamily: "'Inter', system-ui, sans-serif",
                              display: "flex", alignItems: "center", gap: 8,
                              boxShadow: busy || uploadedCount === 0 ? "none" : "0 4px 16px rgba(108,109,181,.25)",
                            }}>
                            {busy ? (
                              <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1V9M7 9L4 6M7 9L10 6M1 11V13H13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                            Save to Drive
                          </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {appDocs.map(doc => (
                    <DocReviewCard
                      key={doc.key}
                      doc={doc}
                      analysis={docAnalysis[`${app.id}:${doc.key}`]}
                      onAnalyze={(docKey, docLabel) => triggerDocAnalysis(app.id, docKey, docLabel)}
                      onDownload={downloadOneDoc}
                    />
                  ))}
                </div>
              )}

              {/* Tab: KYB Report — PDF-ready report generator */}
              {detailTab === "kyb-report" && (
                <div>
                  <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 24, background: T.bg1, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.txt }}>KYB Due Diligence Report</div>
                        <div style={{ fontSize: 12, color: T.txt3, marginTop: 4 }}>Comprehensive Know Your Business report for {app.data.co_name}</div>
                      </div>
                      <button onClick={() => {
                        const d = app.data;
                        const bos = Array.from({length: d._boCount || 3}, (_,i) => i).filter(i => d[`bo${i}_name`]);
                        const docsChecklist = appDocs.map(dc => {
                          const a = docAnalysis[`${app.id}:${dc.key}`];
                          return `<tr><td>${dc.label}</td><td>${dc.hasFile ? "Submitted" : "Missing"}</td><td>${a?.status === "complete" ? (a.compositeLevel === "low" ? "Clear" : a.compositeLevel === "medium" ? "Review" : "Flagged") : "Not Scanned"}</td><td>${a?.compositeScore ?? "—"}</td></tr>`;
                        }).join("");
                        const w = window.open("", "_blank");
                        w.document.write(`<!DOCTYPE html><html><head><title>KYB Report — ${d.co_name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11pt;color:#1a1a2e;padding:40px 48px;line-height:1.6;max-width:900px;margin:0 auto}
h1{font-size:20pt;color:#2d2d5e;border-bottom:3px solid #7B7CC4;padding-bottom:8px;margin-bottom:6px}
h2{font-size:13pt;color:#4a4a7a;margin:24px 0 10px;padding:6px 12px;background:#f0f0f8;border-left:3px solid #7B7CC4;border-radius:0 6px 6px 0}
h3{font-size:11pt;color:#5a5a8a;margin:16px 0 6px}
.meta{color:#666;font-size:9.5pt;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:10pt}
th{background:#f0f0f8;color:#4a4a7a;text-align:left;padding:8px 10px;font-size:9pt;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #ddd}
td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}
tr:nth-child(even){background:#fafafe}
.status{display:inline-block;padding:2px 8px;border-radius:10px;font-size:8.5pt;font-weight:600}
.status.approved{background:#d4f8e8;color:#0a7a4a}
.status.pending{background:#fff3cd;color:#856404}
.status.flagged{background:#fce4e4;color:#c0392b}
.badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:8pt;font-weight:600;background:#f0f0f8;color:#6667AB;margin-left:4px}
.risk-box{padding:12px 16px;border-radius:8px;margin:8px 0}
.risk-low{background:#d4f8e8;color:#0a7a4a;border:1px solid #a3e4c4}
.risk-medium{background:#fff3cd;color:#856404;border:1px solid #ffd97a}
.risk-high{background:#fce4e4;color:#c0392b;border:1px solid #f5a5a5}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}
.field-label{font-size:8.5pt;color:#888;text-transform:uppercase;letter-spacing:.04em}
.field-value{font-size:10pt;margin-bottom:8px}
.liveness-grid{display:flex;gap:8px;margin:8px 0}
.liveness-grid img{width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd}
.footer{margin-top:32px;padding-top:12px;border-top:2px solid #eee;font-size:8.5pt;color:#999;text-align:center}
@media print{body{padding:20px 24px}h1{font-size:16pt}h2{font-size:11pt;break-after:avoid}table{font-size:9pt}tr{break-inside:avoid}.no-print{display:none!important}}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 24px;background:#7B7CC4;color:#fff;border:none;border-radius:8px;font-size:11pt;font-weight:600;cursor:pointer;margin:16px 8px 16px 0}
.btn:hover{background:#6667AB}
.btn-outline{background:transparent;color:#7B7CC4;border:1.5px solid #7B7CC4}
</style></head><body>
<div class="no-print" style="text-align:center;margin-bottom:24px">
<button class="btn" onclick="window.print()">Print / Save as PDF</button>
<button class="btn btn-outline" onclick="window.close()">Close</button>
</div>

<h1>KYB Due Diligence Report</h1>
<p class="meta">
<strong>${d.co_name}</strong> &nbsp;·&nbsp; ${app.ref_code || app.id} &nbsp;·&nbsp; Generated ${new Date().toLocaleString()}<br/>
Application submitted: ${app.submitted ? new Date(app.submitted).toLocaleString() : "—"} &nbsp;·&nbsp; Status: <span class="status ${app.status === "approved" ? "approved" : app.status === "flagged" ? "flagged" : "pending"}">${app.status.replace(/_/g," ").toUpperCase()}</span>
&nbsp;·&nbsp; Risk Tier: <strong>${(app.riskTier || "—").toUpperCase()}</strong>
</p>

<h2>1. Applicant & Contact Details</h2>
<div class="grid2">
<div><div class="field-label">Contact Email</div><div class="field-value">${d.email || "—"}</div></div>
<div><div class="field-label">Full Name</div><div class="field-value">${d.appName || "—"}</div></div>
<div><div class="field-label">Designation</div><div class="field-value">${d.appTitle || "—"}</div></div>
<div><div class="field-label">Mobile</div><div class="field-value">${d.appPhone || "—"}</div></div>
<div><div class="field-label">Role</div><div class="field-value">${d.appRole || "—"}</div></div>
<div><div class="field-label">Authorised Signatory</div><div class="field-value">${d.isAuthSig || "—"}</div></div>
</div>

<h2>2. Company Information</h2>
<div class="grid2">
<div><div class="field-label">Legal Entity Name</div><div class="field-value"><strong>${d.co_name || "—"}</strong></div></div>
<div><div class="field-label">Trade Name</div><div class="field-value">${d.co_trade || "—"}</div></div>
<div><div class="field-label">Country of Incorporation</div><div class="field-value">${d.co_country || "—"}</div></div>
<div><div class="field-label">Legal Form</div><div class="field-value">${d.co_form || "—"}</div></div>
<div><div class="field-label">Registration Number</div><div class="field-value"><code>${d.co_crn || "—"}</code></div></div>
<div><div class="field-label">Date of Incorporation</div><div class="field-value">${d.co_doi || "—"}</div></div>
<div><div class="field-label">Website</div><div class="field-value">${d.co_web || "—"}</div></div>
<div><div class="field-label">Tax ID (PAN/EIN/TIN)</div><div class="field-value"><code>${d.co_tin || "—"}</code></div></div>
<div><div class="field-label">GST</div><div class="field-value"><code>${d.co_gst || "—"}</code></div></div>
<div><div class="field-label">LEI</div><div class="field-value"><code>${d.co_lei || "—"}</code></div></div>
</div>
<div><div class="field-label">Registered Address</div><div class="field-value">${d.co_regAddr || "—"}</div></div>
${d.co_opAddr ? `<div><div class="field-label">Operational Address</div><div class="field-value">${d.co_opAddr}</div></div>` : ""}

<h2>3. Business Profile</h2>
<div><div class="field-label">Business Activities</div><div class="field-value">${d.biz_desc || "—"}</div></div>
<div class="grid2">
<div><div class="field-label">Customer Base</div><div class="field-value">${d.biz_custType || "—"}</div></div>
<div><div class="field-label">Regulated?</div><div class="field-value">${d.biz_regulated || "—"}</div></div>
</div>
${d.biz_licences ? `<div><div class="field-label">Licences</div><div class="field-value">${d.biz_licences}</div></div>` : ""}
<div class="grid2">
<div><div class="field-label">Target Jurisdictions</div><div class="field-value">${d.biz_targetJuris || "—"}</div></div>
<div><div class="field-label">Excluded Jurisdictions</div><div class="field-value">${d.biz_exclJuris || "—"}</div></div>
</div>

<h2>4. Payment & Volume</h2>
<div class="grid2">
<div><div class="field-label">Monthly Volume (USD)</div><div class="field-value"><strong>${d.vol_monthly || "—"}</strong></div></div>
<div><div class="field-label">Monthly Volume (INR)</div><div class="field-value">${d.vol_monthlyINR || "—"}</div></div>
<div><div class="field-label">Avg Transaction</div><div class="field-value">${d.vol_avgTx || "—"}</div></div>
<div><div class="field-label">Monthly Tx Count</div><div class="field-value">${d.vol_txCount || "—"}</div></div>
<div><div class="field-label">Primary Token</div><div class="field-value">${d.vol_token || "—"}</div></div>
<div><div class="field-label">Blockchain Networks</div><div class="field-value">${d.vol_chains || "—"}</div></div>
</div>
<div><div class="field-label">Wallet Addresses</div><div class="field-value"><code>${(d.vol_wallets||"—").replace(/\n/g,"<br/>")}</code></div></div>
<div><div class="field-label">Fund Flow</div><div class="field-value">${d.vol_fundFlow || "—"}</div></div>

<h2>5. Beneficial Owners <span class="badge">PMLA</span></h2>
${bos.map(i => `
<h3>BO ${i+1}: ${d["bo"+i+"_name"]}</h3>
<div class="grid2">
<div><div class="field-label">Full Name</div><div class="field-value"><strong>${d["bo"+i+"_name"]}</strong></div></div>
<div><div class="field-label">Date of Birth</div><div class="field-value">${d["bo"+i+"_dob"]||"—"}</div></div>
<div><div class="field-label">Nationality</div><div class="field-value">${d["bo"+i+"_nat"]||"—"}</div></div>
<div><div class="field-label">Residence</div><div class="field-value">${d["bo"+i+"_res"]||"—"}</div></div>
<div><div class="field-label">Ownership %</div><div class="field-value">${d["bo"+i+"_pct"]||"—"}</div></div>
<div><div class="field-label">Control Type</div><div class="field-value">${d["bo"+i+"_ctrl"]||"—"}</div></div>
<div><div class="field-label">ID Number</div><div class="field-value"><code>${d["bo"+i+"_id"]||"—"}</code></div></div>
<div><div class="field-label">Tax ID</div><div class="field-value"><code>${d["bo"+i+"_tin"]||"—"}</code></div></div>
</div>
<div><div class="field-label">Address</div><div class="field-value">${d["bo"+i+"_addr"]||"—"}</div></div>
${d["bo"+i+"_selfie"]?.verified ? `<div style="margin:6px 0"><span style="color:#0a7a4a;font-weight:600">Liveness Verified</span> — ${d["bo"+i+"_selfie"].challengeCount} challenges completed ${new Date(d["bo"+i+"_selfie"].completedAt).toLocaleString()}</div>` : ""}
`).join("")}

<h2>6. Source of Funds <span class="badge">PMLA</span></h2>
<div><div class="field-label">Business Source of Funds</div><div class="field-value">${d.sof_biz || "—"}</div></div>
${[0,1].filter(i => d["sow"+i+"_name"]).map(i => `
<h3>BO ${i+1} Source of Wealth: ${d["sow"+i+"_name"]}</h3>
<div class="field-value">${d["sow"+i+"_desc"]||"—"}</div>
`).join("")}

<h2>7. Sanctions & PEP <span class="badge">FIU-IND</span></h2>
<div class="grid2">
<div><div class="field-label">PEP Status</div><div class="field-value">${d.pep_status || "—"}</div></div>
<div><div class="field-label">Regulatory Actions</div><div class="field-value">${d.regAction || "—"}</div></div>
</div>
<div><div class="field-label">Sanctions Declarations</div><div class="field-value">${[d.sanc1,d.sanc2,d.sanc3,d.sanc4,d.sanc5].filter(Boolean).length}/5 confirmed</div></div>
<div><div class="field-label">High-Risk Categories</div><div class="field-value">${(d.highRisk||[]).join(", ")||"—"}</div></div>

<h2>8. AML/CFT Programme <span class="badge">FATF R.18</span></h2>
<div class="grid2">
<div><div class="field-label">AML Policy</div><div class="field-value">${d.aml_hasPolicy || "—"}</div></div>
<div><div class="field-label">STR Filed (12mo)</div><div class="field-value">${d.aml_strFiled || "—"}</div></div>
<div><div class="field-label">MLRO</div><div class="field-value">${d.aml_hasMLRO === "Yes" ? d.aml_mlroName + " (" + (d.aml_mlroEmail||"") + ")" : d.aml_hasMLRO || "—"}</div></div>
<div><div class="field-label">Sanctions Screening</div><div class="field-value">${d.aml_adverseMedia || "—"}</div></div>
<div><div class="field-label">Record Retention</div><div class="field-value">${d.aml_retention || "—"}</div></div>
<div><div class="field-label">Training Frequency</div><div class="field-value">${d.aml_training || "—"}</div></div>
<div><div class="field-label">Independent Audit</div><div class="field-value">${d.aml_audit || "—"}</div></div>
<div><div class="field-label">RegTech Tools</div><div class="field-value">${d.aml_tools || "—"}</div></div>
</div>

<h2>9. Document Checklist</h2>
<table>
<thead><tr><th>Document</th><th>Status</th><th>Integrity</th><th>Score</th></tr></thead>
<tbody>${docsChecklist}</tbody>
</table>

<h2>10. Declaration</h2>
<div class="grid2">
<div><div class="field-label">Signatory</div><div class="field-value">${d.decl_name || "—"} — ${d.decl_title || ""}</div></div>
<div><div class="field-label">Date</div><div class="field-value">${d.decl_date || "—"}</div></div>
</div>
<div><div class="field-label">Declarations Confirmed</div><div class="field-value">${(d.declarations||[]).length}/7</div></div>

<div class="footer">
<strong>Stable Pay KYB Due Diligence Report</strong> — ${app.ref_code || app.id} — Generated ${new Date().toISOString()}<br/>
This report is confidential and intended for compliance review purposes only.
</div>
</body></html>`);
                        w.document.close();
                      }} style={{
                        padding: "10px 24px", borderRadius: 8, border: "none", background: T.grad, color: "#fff",
                        fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
                        display: "flex", alignItems: "center", gap: 8,
                        boxShadow: "0 4px 16px rgba(102,103,171,.3)",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10V12H12V10M7 2V9M4.5 6.5L7 9L9.5 6.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Generate PDF Report
                      </button>
                    </div>

                    {/* Report preview summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                      {[
                        { label: "Entity", value: app.data.co_name },
                        { label: "Risk Tier", value: (app.riskTier || "—").toUpperCase() },
                        { label: "Status", value: app.status.replace(/_/g," ").toUpperCase() },
                        { label: "Applicant", value: app.data.appName },
                        { label: "Country", value: app.data.co_country },
                        { label: "Monthly Volume", value: app.data.vol_monthly || "—" },
                      ].map(s => (
                        <div key={s.label} style={{ padding: "10px 14px", background: T.bg2, borderRadius: 8, border: `1px solid ${T.bdr}` }}>
                          <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: "14px 16px", background: T.bg0, borderRadius: 8, border: `1px solid ${T.bdr}`, fontSize: 12, color: T.txt3, lineHeight: 1.7 }}>
                      <strong style={{ color: T.txt2 }}>Report includes:</strong> Applicant details, company information, business profile, payment & volume, beneficial owners (with liveness verification status), source of funds, sanctions & PEP declarations, AML/CFT programme, document integrity checklist with scan scores, and signatory declarations.
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: STR Report — Suspicious Transaction Report generator */}
              {detailTab === "str" && (() => {
                return <STRReportTab app={app} />;
              })()}

              {/* Tab: Actions */}
              {detailTab === "actions" && (
                <div>
                  <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 24, background: T.bg1, marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 16 }}>Application Decision</div>

                    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                      <button onClick={() => updateStatus(app.id, "approved")} disabled={app.status === "approved"} style={{
                        padding: "10px 24px", borderRadius: 8, border: "none", cursor: app.status === "approved" ? "default" : "pointer",
                        background: app.status === "approved" ? T.bg3 : `linear-gradient(135deg, ${T.green}, #009B72)`,
                        color: app.status === "approved" ? T.txt3 : "#fff",
                        fontSize: 13, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
                        boxShadow: app.status === "approved" ? "none" : `0 4px 16px rgba(0,200,150,.3)`,
                        display: "flex", alignItems: "center", gap: 8, transition: "all .2s",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {app.status === "approved" ? "Approved" : "Approve"}
                      </button>

                      <button onClick={() => updateStatus(app.id, "rejected")} disabled={app.status === "rejected"} style={{
                        padding: "10px 24px", borderRadius: 8, border: `1.5px solid ${app.status === "rejected" ? T.bdr : T.red}`,
                        background: app.status === "rejected" ? T.bg3 : "transparent",
                        color: app.status === "rejected" ? T.txt3 : T.red,
                        fontSize: 13, fontWeight: 600, cursor: app.status === "rejected" ? "default" : "pointer",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        display: "flex", alignItems: "center", gap: 8, transition: "all .2s",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        {app.status === "rejected" ? "Rejected" : "Reject"}
                      </button>

                      <button onClick={() => updateStatus(app.id, "flagged")} disabled={app.status === "flagged"} style={{
                        padding: "10px 24px", borderRadius: 8, border: `1.5px solid ${app.status === "flagged" ? T.bdr : T.amber}`,
                        background: app.status === "flagged" ? T.bg3 : "transparent",
                        color: app.status === "flagged" ? T.txt3 : T.amber,
                        fontSize: 13, fontWeight: 600, cursor: app.status === "flagged" ? "default" : "pointer",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        display: "flex", alignItems: "center", gap: 8, transition: "all .2s",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 1V13M2 1H9L7 4.5L9 8H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {app.status === "flagged" ? "Flagged" : "Flag for Review"}
                      </button>
                    </div>

                    <div style={{ padding: "12px 16px", background: T.bg0, borderRadius: 8, border: `1px solid ${T.bdr}` }}>
                      <div style={{ fontSize: 10.5, color: T.txt3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Current Status</div>
                      <StatusBadge status={app.status} />
                    </div>
                  </div>

                  <div style={{ border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 24, background: T.bg1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 8 }}>Internal Notes</div>
                    <p style={{ fontSize: 12.5, color: T.txt3, lineHeight: 1.6 }}>Add notes visible only to the compliance team. Notes are stored with the application record for audit trail purposes.</p>
                    <textarea placeholder="Add internal compliance notes..." style={{
                      width: "100%", marginTop: 12, padding: "10px 14px", background: T.bg2,
                      border: `1.5px solid ${T.bdr}`, borderRadius: 8, color: T.txt,
                      fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", resize: "vertical",
                      lineHeight: 1.6, minHeight: 100,
                    }} />
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Draft Detail Overlay */}
      {selectedDraft && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={closeDraft} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "relative", width: "min(620px, 90vw)", height: "100vh", background: T.bg1,
            borderLeft: `1px solid ${T.bdr}`, overflowY: "auto",
            animation: "fadeIn .2s ease both",
          }}>
            {/* Header */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: T.bg1, borderBottom: `1px solid ${T.bdr}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.txt }}>{selectedDraft.co_name || "Untitled Draft"}</div>
                <div style={{ fontSize: 11, color: T.txt3, fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>{selectedDraft.ref_code} &middot; Draft</div>
              </div>
              <button onClick={closeDraft} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.bdrA}`, background: "transparent", color: T.txt2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Meta info */}
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.bdr}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                ["Applicant Email", selectedDraft.applicant_email || selectedDraft.app_email || "—"],
                ["Country", selectedDraft.country || "—"],
                ["Created", new Date(selectedDraft.created_at).toLocaleString()],
                ["Last Saved", selectedDraft.has_saved ? new Date(selectedDraft.updated_at).toLocaleString() : "Never"],
              ].map(([k, v]) => (
                <div key={k} style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 12.5, color: T.txt }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Form data */}
            <div style={{ padding: "20px 24px" }}>
              {draftLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ width: 28, height: 28, border: `3px solid ${T.bdr}`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 12, color: T.txt3 }}>Loading draft data...</div>
                </div>
              ) : draftDetail ? (
                <>
                  {/* Completion summary */}
                  {(() => {
                    let filled = 0, total = 0;
                    FIELD_SECTIONS.forEach(s => s.fields.forEach(f => {
                      if (f.file || f.liveness || f.meta) return;
                      total++;
                      const val = draftDetail.data[f.key];
                      if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) filled++;
                    }));
                    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
                    return (
                      <div style={{ padding: "14px 16px", background: T.bg2, borderRadius: 10, border: `1px solid ${T.bdr}`, marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${pct > 60 ? T.green : pct > 20 ? T.amber : T.txt3}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: pct > 60 ? T.green : pct > 20 ? T.amber : T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{pct}%</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>Form Completion</div>
                          <div style={{ fontSize: 11.5, color: T.txt3 }}>{filled} of {total} fields filled</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sections */}
                  {FIELD_SECTIONS.map(section => {
                    const allFields = section.fields.filter(f => !f.file && !f.liveness && !f.meta);
                    const filledFields = allFields.filter(f => {
                      const val = draftDetail.data[f.key];
                      return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0);
                    });
                    const emptyFields = allFields.filter(f => !filledFields.includes(f));
                    if (allFields.length === 0) return null;
                    return (
                      <div key={section.title} style={{ marginBottom: 22 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: filledFields.length > 0 ? T.blueL : T.txt3, textTransform: "uppercase", letterSpacing: ".06em" }}>{section.title}</div>
                          <div style={{ flex: 1, height: 1, background: T.bdr }} />
                          <span style={{ fontSize: 10, color: filledFields.length === allFields.length ? T.green : T.txt3, fontFamily: "'IBM Plex Mono', monospace" }}>{filledFields.length}/{allFields.length}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {allFields.map(f => {
                            const val = draftDetail.data[f.key];
                            const isFilled = val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0);
                            const displayVal = isFilled
                              ? (f.bool ? (val ? "Yes" : "No") : f.list ? (Array.isArray(val) ? val.join(", ") : String(val)) : String(val))
                              : null;
                            return (
                              <div key={f.key} style={{
                                gridColumn: f.wide ? "span 2" : "span 1",
                                padding: "8px 12px", borderRadius: 8,
                                background: isFilled ? T.bg2 : "transparent",
                                border: `1px solid ${isFilled ? T.bdr : T.bdr}55`,
                              }}>
                                <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>{f.label}</div>
                                {isFilled ? (
                                  <div style={{
                                    fontSize: 12.5, color: T.txt, lineHeight: 1.5, wordBreak: "break-word",
                                    fontFamily: f.mono ? "'IBM Plex Mono', monospace" : "'Inter', system-ui, sans-serif",
                                  }}>{displayVal}</div>
                                ) : (
                                  <div style={{ fontSize: 11.5, color: T.txt3, fontStyle: "italic" }}>Not filled</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: T.txt3, fontSize: 12 }}>Failed to load draft data</div>
              )}
            </div>
          </div>
        </div>
      )}

      </>}
    </div>
  );
}
