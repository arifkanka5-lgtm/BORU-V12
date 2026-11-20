"use client";
import {useState} from 'react';
type Data = Record<string,unknown> | unknown[];
const sections=[['overview','Genel Bakış'],['users','Kullanıcılar'],['rooms','Sesli Odalar'],['catalog','Coin / Hediyeler / VIP'],['audit','Denetim Kayıtları']] as const;
export default function Page(){
 const [token,setToken]=useState('');const [totp,setTotp]=useState('');const [api,setApi]=useState('http://localhost:3001/api/v1');
 const [section,setSection]=useState<string>('overview');const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function request(path:string,method='GET',body?:unknown){
   if(!token.trim())throw Error('Yönetici oturum anahtarı gerekli');
   const res=await fetch(`${api.replace(/\/$/,'')}/admin/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'x-admin-totp':totp, ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
   const value=await res.json();if(!res.ok)throw Error(Array.isArray(value.message)?value.message.join(', '):value.message||`HTTP ${res.status}`);
   return value;
 }
 async function load(name:string){setSection(name);setBusy(true);setError('');setData(null);try{setData(await request(name));}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function toggleUser(id:string,suspended:boolean){if(!confirm(suspended?'Hesabı askıya al?':'Hesabı geri aç?'))return;try{await request(`users/${id}/suspension`,'PATCH',{suspended});await load('users');}catch(e){setError(String(e));}}
 async function toggleGift(id:string,active:boolean){try{await request(`gifts/${id}`,'PATCH',{active});await load('catalog');}catch(e){setError(String(e));}}
 const records=Array.isArray(data)?data:[];
 const catalog=data&&!Array.isArray(data)?data as Record<string,unknown>:null;
 return <main style={{maxWidth:1240,margin:'auto',padding:24,color:'#f6f2ff'}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #373050',paddingBottom:18}}><div><h1 style={{color:'#E9B653',margin:0}}>🐺 BÖRÜ CONTROL</h1><p style={{color:'#b3a7cc'}}>Süper Admin • V10</p></div><span style={{color:'#E9B653'}}>Yönetim Merkezi</span></header>
  <section style={{display:'flex',gap:10,flexWrap:'wrap',margin:'24px 0'}}><input aria-label="API adresi" value={api} onChange={e=>setApi(e.target.value)} placeholder="API adresi" style={input}/><input aria-label="Yönetici JWT" type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Yönetici JWT (yalnızca bellekte)" style={{...input,flex:2}}/><input aria-label="6 haneli MFA kodu" inputMode="numeric" maxLength={6} value={totp} onChange={e=>setTotp(e.target.value)} placeholder="MFA kodu" style={input}/><button style={btn} onClick={()=>load(section)}>Bağlan / Yenile</button></section>
  <nav style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:22}}>{sections.map(([key,label])=><button key={key} onClick={()=>load(key)} style={{...btn,background:section===key?'#6633B8':'#25203C'}}>{label}</button>)}</nav>
  {error&&<p role="alert" style={{color:'#ff9d9d'}}>Hata: {error}</p>}{busy&&<p>Yükleniyor...</p>}
  {section==='overview'&&catalog&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>{Object.entries(catalog).map(([k,v])=><article key={k} style={card}><p style={{color:'#c4b8dc'}}>{({users:'Kullanıcılar',rooms:'Odalar',gifts:'Hediyeler',packages:'Coin Paketleri',activeVip:'Aktif VIP'} as Record<string,string>)[k]||k}</p><strong style={{fontSize:28,color:'#E9B653'}}>{String(v)}</strong></article>)}</div>}
  {section==='users'&&<div style={card}><h2>Kullanıcı Yönetimi</h2>{records.map((x:any)=><div key={x.id} style={line}><span>{x.displayName} · #{x.publicId}<small style={{display:'block',color:'#a99dbf'}}>{x.email}</small></span><button style={btn} onClick={()=>toggleUser(x.id,!x.suspendedAt)}>{x.suspendedAt?'Hesabı Aç':'Askıya Al'}</button></div>)}</div>}
  {section==='rooms'&&<div style={card}><h2>Sesli Odalar</h2>{records.map((x:any)=><div key={x.id} style={line}><span>{x.title}</span><small>{x.isPrivate?'Özel':'Herkese açık'}</small></div>)}</div>}
  {section==='catalog'&&catalog&&<div style={card}><h2>Hediye Yönetimi</h2>{Array.isArray(catalog.gifts)&&catalog.gifts.map((x:any)=><div key={x.id} style={line}><span>{x.name} · {x.priceCoins} Coin</span><button style={btn} onClick={()=>toggleGift(x.id,!x.active)}>{x.active?'Pasifleştir':'Aktifleştir'}</button></div>)}<h2>Coin Paketleri</h2>{Array.isArray(catalog.packages)&&catalog.packages.map((x:any)=><p key={x.id}>{x.title}: {x.coins} Coin</p>)}<h2>VIP Paketleri</h2>{Array.isArray(catalog.vip)&&catalog.vip.map((x:any)=><p key={x.id}>{JSON.stringify(x)}</p>)}</div>}
  {section==='audit'&&<div style={card}><h2>Denetim Kayıtları</h2>{records.map((x:any)=><div key={x.id} style={line}><span>{x.action} · {x.targetId||'—'}</span><small>{new Date(x.createdAt).toLocaleString('tr-TR')}</small></div>)}</div>}
  <p style={{marginTop:32,color:'#a99dbf',fontSize:13}}>V8 geliştirme sürümü. Üretimde HTTPS, MFA, güvenli oturum yönetimi ve daha kapsamlı rol denetimi gereklidir.</p>
 </main>;
}
const input:React.CSSProperties={flex:1,minWidth:170,background:'#1b1730',color:'#fff',border:'1px solid #4d4168',borderRadius:10,padding:12};
const btn:React.CSSProperties={border:0,borderRadius:10,padding:'11px 15px',background:'#6633B8',color:'white',cursor:'pointer'};
const card:React.CSSProperties={background:'#201A36',padding:20,border:'1px solid #3d3158',borderRadius:16};
const line:React.CSSProperties={display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:'12px 0',borderBottom:'1px solid #3d3158'};
