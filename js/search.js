import{getNews,normalize}from"./news-engine.js";
const q=new URLSearchParams(location.search).get("q")||"";
const root=document.querySelector("#content");
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
async function run(){
 const items=normalize(await getNews());
 const results=items.filter(x=>(x.title+" "+x.summary+" "+x.source).toLowerCase().includes(q.toLowerCase()));
 if(root)root.innerHTML=results.slice(0,60).map(x=>'<article class="story"><div class="meta">'+esc(x.source)+'</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary)+'</p><div class="source"><span>'+esc(new Date(x.date).toLocaleString())+'</span><a href="./story.html?id='+encodeURIComponent(x.id||"")+'">Read story →</a></div></article>').join("")||'<div class="empty">No matching stories found.</div>';
}
run();