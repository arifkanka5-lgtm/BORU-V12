"use client";
import {useState} from "react";
type Item={id:string,status:string,description?:string,subject?:string,countryCode:string,createdAt:string};
export default function V9(){
 const [api,setApi]=useState('http://localhost:3001/api/v1');const [token,setToken]=useState('');const [totp,setTotp]=useState('');
 const [tab,setTab]=useState<'reports'|'tickets'>('reports');const [items,setItems]=useState<Item[]>([]);
 const [stats,setStats]=useState<Record<string,unknown>|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 async function call(path:string,method='GET',body?:object){
  if(!token)throw Error('JWT gerekli');
  const res=await fetch(`${api.replace(/\/$/,'')}/admin/v9/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'x-admin-totp':totp,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await res.json();if(!res.ok)throw Error(data.message||`HTTP ${res.status}`);return data;
 }
 async function refresh(which=tab){setLoading(true);setError('');try{const [list,summary]=await Promise.all([call(which),call('stats')]);setItems(list);setStats(summary);setTab(which);}catch(e){setError(String(e));}finally{setLoading(false);}}
 async function resolve(item:Item){const note=prompt('İşlem gerekçesi (en az 5 karakter)');if(!note||note.trim().length<5)return;
  try{await call(`${tab}/${item.id}`,'PATCH',{status:'RESOLVED',resolutionNote:note.trim()});await refresh();}catch(e){setError(String(e));}}
 const style={background:'#201A36',border:'1px solid #48365F',borderRadius:12,padding:14,color:'#fff'};
 return <main style={{background:'#0B0D20',minHeight:'100vh',color:'#fff',fontFamily:'Arial',padding:24}}><div style={{maxWidth:1050,margin:'auto'}}>
 <h1 style={{color:'#E9B653'}}>🐺 BÖRÜ CONTROL V9</h1><p>Şikâyet, destek ve ülke bazlı moderasyon</p>
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input aria-label="API adresi" value={api} onChange={e=>setApi(e.target.value)} style={style}/><input aria-label="Yönetici JWT" type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Yönetici JWT" style={style}/><input aria-label="MFA kodu" value={totp} onChange={e=>setTotp(e.target.value)} placeholder="MFA kodu" /><button onClick={()=>refresh()} style={style}>Yenile</button></div>
 {error&&<p role="alert" style={{color:'#ff9d9d'}}>{error}</p>}{loading&&<p>Yükleniyor...</p>}
 {stats&&<section style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:20}}>{Object.entries(stats).map(([k,v])=><div key={k} style={style}><small>{k}</small><h2>{Array.isArray(v)?v.join(', '):String(v)}</h2></div>)}</section>}
 <nav style={{display:'flex',gap:10,margin:'22px 0'}}>{(['reports','tickets'] as const).map(k=><button key={k} onClick={()=>refresh(k)} style={{...style,background:tab===k?'#6737B5':'#201A36'}}>{k==='reports'?'Şikâyetler':'Destek Talepleri'}</button>)}</nav>
 {items.length===0?<p>Liste boş veya henüz yüklenmedi.</p>:items.map(x=><article key={x.id} style={{...style,marginBottom:10}}><strong>{x.subject||x.description||x.id}</strong><p>{x.countryCode} · {x.status} · {new Date(x.createdAt).toLocaleString('tr-TR')}</p><button onClick={()=>resolve(x)} style={style}>Çözüldü olarak işaretle</button></article>)}
 <p style={{color:'#B8ADC8',marginTop:24}}>Geliştirme sürümü. MFA, CSRF koruması, hassas veri maskeleme ve kapsamlı güvenlik testleri üretim öncesinde zorunludur.</p>
 </div></main>;
}
