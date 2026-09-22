const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const ago=d=>{if(!d)return"recent";const m=Math.max(1,Math.floor((Date.now()-new Date(d).getTime())/60000));return m<60?m+"m ago":m<1440?Math.floor(m/60)+"h ago":Math.floor(m/1440)+"d ago"};
async function get(path){try{const r=await fetch(path,{cache:"no-store"});return r.ok?await r.json():null}catch(e){return null}}
async function run(){
 const id=new URLSearchParams(location.search).get("id");
 const data=await get("./data/stories.json");
 const s=(data?.stories||[]).find(x=>x.id===id);
 const root=$("#storyArticle");
 if(!s){root.innerHTML='<div class="empty"><h2>Story not found</h2><p>This story may have expired from the live 30-day news window.</p></div>';return}
 const item=s.items?.[0]||{};
 const image=item.image||"";
 document.title=s.title+" — NepaliNews";
 root.innerHTML='<div class="story-kicker"><span class="eyebrow">STORY BRIEF</span><span>'+esc(ago(s.updatedAt))+'</span></div><h1>'+esc(s.title)+'</h1><div class="story-stats"><span>'+esc(s.sourceCount)+' sources</span><span>'+esc(s.languageCount)+' languages</span><span>Updated '+esc(ago(s.updatedAt))+'</span></div>'+(image?'<figure class="story-hero-image"><img src="'+esc(image)+'" alt="" loading="eager" referrerpolicy="no-referrer"><figcaption>Image supplied through the publisher feed.</figcaption></figure>':'')+'<div class="story-layout"><div><p class="story-summary">'+esc(s.summary||"A short summary is not available in the publisher feed.")+'</p><p class="story-note">This is a short news brief assembled from publisher feed metadata. NepaliNews does not reproduce the full article.</p></div><aside><b>Coverage</b><div class="source-list">'+(s.items||[]).slice(0,12).map(x=>'<div class="source-row"><span>'+esc(x.source)+'</span><small>'+esc(ago(x.pubDate))+'</small><a href="'+esc(x.link||"#")+'" target="_blank" rel="noopener noreferrer">Publisher ↗</a></div>').join("")+'</div></aside></div>';
}
run();
$("#themeBtn")?.addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("nn-theme",document.body.classList.contains("dark")?"dark":"light")});
if(localStorage.getItem("nn-theme")==="dark")document.body.classList.add("dark");
