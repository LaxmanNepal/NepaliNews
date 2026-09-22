const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
function ago(d){if(!d)return"recent";const n=Date.now()-new Date(d).getTime(),m=Math.max(1,Math.floor(n/60000));return m<60?m+"m ago":m<1440?Math.floor(m/60)+"h ago":Math.floor(m/1440)+"d ago"}
async function json(path){try{const r=await fetch(path,{cache:"no-store"});return r.ok?await r.json():null}catch(e){return null}}
async function load(){
 const [storyData,newsData,sourceData]=await Promise.all([json("./data/stories.json"),json("./data/news.json"),json("./data/sources.json")]);
 let stories=storyData?.stories||[];
 if(!stories.length) stories=(newsData?.items||[]).map(x=>({title:x.title,summary:x.description,publishedAt:x.pubDate,updatedAt:x.pubDate,sourceCount:1,languageCount:1,sources:[x.source],items:[x]}));
 stories=stories.filter(x=>x.title).sort((a,b)=>new Date(b.updatedAt||b.publishedAt||0)-new Date(a.updatedAt||a.publishedAt||0));
 const grid=$("#storyGrid");
 grid.innerHTML=stories.slice(0,9).map(x=>{
   const item=x.items?.[0]||{};
   const link="./story.html?id="+encodeURIComponent(x.id||"");
   const chips=(x.sources||[]).slice(0,4).map(s=>"<span>"+esc(s)+"</span>").join("");
   return '<article class="story"><div class="meta">'+esc(ago(x.updatedAt||x.publishedAt))+' · '+esc(x.sourceCount||1)+' source'+(x.sourceCount===1?"":"s")+' · '+esc(x.languageCount||1)+' language'+(x.languageCount===1?"":"s")+'</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary||"Read the original publisher coverage for the full story.")+'</p><div class="source"><span>'+chips+'</span><a href="'+esc(link)+'" >Read story →</a></div></article>'
 }).join("")||'<article class="story"><h3>No live stories yet</h3><p>Publisher feeds are being synchronized.</p></article>';
 $("#storyCount").textContent=(storyData?.storyCount||stories.length)+"+";
 $("#sourceCount").textContent=sourceData?.count||new Set((newsData?.items||[]).map(x=>x.source).filter(Boolean)).size||"—";
 $("#tickerText").textContent=stories[0]?.title||"Publisher feeds are synchronizing…";
}
load();
$("#themeBtn")?.addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("nn-theme",document.body.classList.contains("dark")?"dark":"light")});
if(localStorage.getItem("nn-theme")==="dark")document.body.classList.add("dark");
