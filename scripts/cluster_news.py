#!/usr/bin/env python3
"""Create deterministic story clusters from normalized news.json without external APIs."""
import json,re,hashlib
from pathlib import Path
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/"data/news.json").read_text(encoding="utf-8"))
items=data.get("items",[])

STOP={"the","and","for","with","from","this","that","नेपाल","का","को","मा","ले","र","एक","यो","छ","भएको","गरेको","भन्ने","आज","भोलि"}
def tokens(s):
    s=re.sub(r"[^\w\u0900-\u097F ]+"," ",s.lower())
    return {x for x in s.split() if len(x)>2 and x not in STOP}
def sim(a,b):
    x,y=tokens(a),tokens(b)
    return len(x&y)/max(1,len(x|y))
def slug(s):
    return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")[:60]

clusters=[]
for item in items:
    best=None; score=0
    for c in clusters:
        candidate=max((sim(item["title"],x["title"]) for x in c["items"][:4]),default=0)
        if candidate>score:
            score=candidate; best=c
    if best is not None and score>=0.55:
        best["items"].append(item)
    else:
        clusters.append({"items":[item]})

stories=[]
for c in clusters:
    its=sorted(c["items"],key=lambda x:x.get("pubDate",""),reverse=True)
    first=its[0]
    sources=sorted({x.get("source","") for x in its if x.get("source")})
    langs=["English" if any(k in x for k in ["English","Times","Express","Rising","Khabarhub","Nepal News","Nepal Views"]) else "Nepali" for x in sources]
    story_id=hashlib.sha1(("|".join(sources)+"|"+first["title"]).encode()).hexdigest()[:16]
    stories.append({
        "id":story_id,
        "title":first["title"],
        "summary":first.get("description",""),
        "publishedAt":first.get("pubDate"),
        "updatedAt":its[0].get("pubDate"),
        "sourceCount":len(sources),
        "languageCount":len(set(langs)),
        "sources":sources,
        "categories":sorted({c for x in its for c in x.get("categories",[])}),
        "items":its[:12]
    })
stories.sort(key=lambda x:x.get("updatedAt") or "",reverse=True)
out={"generatedAt":datetime.now(timezone.utc).isoformat(),"sourceItemCount":len(items),"storyCount":len(stories),"stories":stories[:300]}
(ROOT/"data/stories.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
