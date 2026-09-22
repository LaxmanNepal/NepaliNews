const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const ago=d=>{if(!d)return"recent";const m=Math.max(1,Math.floor((Date.now()-new Date(d).getTime())/60000));return m<60?m+"m ago":m<1440?Math.floor(m/60)+"h ago":Math.floor(m/1440)+"d ago"};
const fmt=d=>d?new Date(d).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}):"Time unavailable";
async function get(path){try{const r=await fetch(path,{cache:"no-store"});return r.ok?await r.json():null}catch(e){return null}}

function uniqueImages(items){
 const seen=new Set();
 return (items||[]).map(x=>x.image).filter(Boolean).filter(url=>{if(seen.has(url))return false;seen.add(url);return true}).slice(0,8);
}
function relatedStories(all,current){
 const cats=new Set(current.categories||[]);
 return (all||[]).filter(x=>x.id!==current.id).map(x=>{
   const overlap=(x.categories||[]).filter(c=>cats.has(c)).length;
   const freshness=Date.now()-new Date(x.updatedAt||x.publishedAt||0).getTime();
   return {x,score:overlap*10-(freshness/86400000)};
 }).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>x.x);
}

async function run(){
 const id=new URLSearchParams(location.search).get("id");
 const data=await get("./data/stories.json");
 const s=(data?.stories||[]).find(x=>x.id===id);
 const root=$("#storyArticle");
 if(!s){root.innerHTML='<div class="empty"><h2>Story not found</h2><p>This story may have expired from the live 30-day news window.</p></div>';return}

 const items=s.items||[];
 const lead=items[0]||{};
 const images=uniqueImages(items);
 const related=relatedStories(data?.stories||[],s);
 const sourceNames=[...new Set(items.map(x=>x.source).filter(Boolean))];
 document.title=s.title+" — NepaliNews";

 const facts=[
   ["Published",fmt(s.publishedAt)],
   ["Updated",fmt(s.updatedAt||s.publishedAt)],
   ["Coverage",sourceNames.length+" publisher"+(sourceNames.length===1?"":"s")],
   ["Languages",String(s.languageCount||1)]
 ];

 root.innerHTML=
 '<div class="story-kicker"><span class="eyebrow">STORY BRIEF</span><span>'+esc(ago(s.updatedAt||s.publishedAt))+'</span></div>'+
 '<h1>'+esc(s.title)+'</h1>'+
 '<div class="story-stats"><span>'+esc(s.sourceCount||sourceNames.length)+' sources</span><span>'+esc(s.languageCount||1)+' languages</span><span>Updated '+esc(ago(s.updatedAt||s.publishedAt))+'</span></div>'+
 (lead.image?'<figure class="story-hero-image"><img src="'+esc(lead.image)+'" alt="" loading="eager" referrerpolicy="no-referrer"><figcaption>Image supplied through the publisher feed.</figcaption></figure>':'')+
 '<div class="story-layout"><div>'+
 '<section class="story-summary-block"><div class="section-label">QUICK BRIEF</div><p class="story-summary">'+esc(s.summary||"A short summary is not available in the publisher feed.")+'</p></section>'+
 '<section class="story-facts"><div class="section-label">AT A GLANCE</div><div class="fact-grid">'+facts.map(f=>'<div><small>'+esc(f[0])+'</small><b>'+esc(f[1])+'</b></div>').join("")+'</div></section>'+
 (images.length>1?'<section class="story-gallery"><div class="section-label">COVERAGE IMAGES</div><div class="story-image-grid">'+images.map((url,i)=>'<img src="'+esc(url)+'" alt="News image '+(i+1)+'" loading="lazy" referrerpolicy="no-referrer">').join("")+'</div></section>':'')+
 '<section class="story-timeline"><div class="section-label">COVERAGE TIMELINE</div><div class="timeline">'+items.slice().sort((a,b)=>new Date(a.pubDate)-new Date(b.pubDate)).slice(0,12).map(x=>'<div class="timeline-item"><span class="timeline-dot"></span><div><b>'+esc(x.source)+'</b><small>'+esc(fmt(x.pubDate))+'</small></div></div>').join("")+'</div></section>'+
 '<p class="story-note">This is a short news brief assembled from publisher feed metadata. NepaliNews does not reproduce the full article. For the complete report, use the publisher link in the coverage panel.</p>'+
 '</div><aside><b>Coverage</b><div class="source-list">'+items.slice(0,12).map(x=>'<div class="source-row"><span>'+esc(x.source)+'</span><small>'+esc(ago(x.pubDate))+'</small><a href="'+esc(x.link||"#")+'" target="_blank" rel="noopener noreferrer">Publisher ↗</a></div>').join("")+'</div></aside></div>'+
 (related.length?'<section class="related-stories"><div class="section-label">RELATED STORIES</div><div class="related-grid">'+related.map(x=>'<a class="related-card" href="./story.html?id='+encodeURIComponent(x.id)+'"><small>'+esc(x.sourceCount||0)+' sources · '+esc(ago(x.updatedAt||x.publishedAt))+'</small><b>'+esc(x.title)+'</b></a>').join("")+'</div></section>':'');
}
run();
$("#themeBtn")?.addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("nn-theme",document.body.classList.contains("dark")?"dark":"light")});
if(localStorage.getItem("nn-theme")==="dark")document.body.classList.add("dark");