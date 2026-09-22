#!/usr/bin/env python3
"""Build the public source registry from feeds.json."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
feeds=json.loads((ROOT/"feeds.json").read_text(encoding="utf-8"))
sources=[]
for i,feed in enumerate(feeds,1):
    name=feed["name"]
    language="English" if "English" in name or name in {"The Himalayan Times","Nepali Times","The Annapurna Express","The Rising Nepal","Nepal News","Nepal Views","Khabarhub"} else "Nepali"
    sources.append({
        "id": f"source-{i:03d}",
        "name": name,
        "feed": feed["url"],
        "language": language,
        "categories": feed.get("categories",[]),
        "active": True
    })
out={"description":"Configured publisher sources for NepaliNews. Original links remain the publisher's property.","generatedAt":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),"count":len(sources),"sources":sources}
(ROOT/"data/sources.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
