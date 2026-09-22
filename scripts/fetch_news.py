#!/usr/bin/env python3
"""Fetch configured Nepal news feeds and publish normalized JSON for the static app."""
from __future__ import annotations

import hashlib
import html
import json
import re
import time
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
FEEDS = ROOT / "feeds.json"
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
NEWS_OUT = DATA / "news.json"
HEALTH_OUT = DATA / "feed-health.json"
MAX_ITEMS_PER_FEED = 40
MAX_TOTAL_ITEMS = 600
MAX_IMAGES_PER_ITEM = 8
TIMEOUT = 18
UA = "NepaliNewsBot/2.1 (+https://github.com/LaxmanNepal/NepaliNews)"

NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "media": "http://search.yahoo.com/mrss/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "atom": "http://www.w3.org/2005/Atom",
}

def strip_html(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<script[^>]*>.*?</script>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<style[^>]*>.*?</style>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()

def text(node, paths):
    for path in paths:
        found = node.find(path, NS)
        if found is not None and found.text:
            return found.text.strip()
    return ""

def parse_date(value: str) -> str | None:
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        pass
    try:
        value = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return None

def first_link(node: ET.Element) -> str:
    link = node.find("link")
    if link is not None:
        href = link.attrib.get("href")
        if href:
            return href.strip()
        if link.text:
            return link.text.strip()
    for link in node.findall("{http://www.w3.org/2005/Atom}link"):
        href = link.attrib.get("href")
        if href and link.attrib.get("rel", "alternate") in ("alternate", ""):
            return href.strip()
    return ""

def image_urls(node: ET.Element, link: str, encoded_html: str = "") -> list[str]:
    candidates = []

    for elem in node.iter():
        tag = elem.tag.rsplit("}", 1)[-1].lower()
        if tag in {"content", "thumbnail", "enclosure", "image"}:
            url = elem.attrib.get("url") or elem.attrib.get("href")
            media_type = (elem.attrib.get("type") or "").lower()
            if url and (not media_type or media_type.startswith("image/") or tag in {"content", "thumbnail", "image"}):
                candidates.append(url)

    for match in re.findall(r"<img\b[^>]*?\bsrc\s*=\s*[\"']([^\"']+)", encoded_html or "", re.I):
        candidates.append(html.unescape(match))

    # Some feeds expose lazy-loaded images instead of src.
    for match in re.findall(r"\b(?:data-src|data-original|data-lazy-src)\s*=\s*[\"']([^\"']+)", encoded_html or "", re.I):
        candidates.append(html.unescape(match))

    result = []
    seen = set()
    for candidate in candidates:
        candidate = candidate.strip()
        if not candidate or candidate.startswith("data:"):
            continue
        absolute = urljoin(link, candidate)
        if absolute in seen:
            continue
        seen.add(absolute)
        result.append(absolute)
        if len(result) >= MAX_IMAGES_PER_ITEM:
            break
    return result

def parse_feed(feed, raw):
    root = ET.fromstring(raw)
    nodes = list(root.findall(".//item")) + list(root.findall(".//{http://www.w3.org/2005/Atom}entry"))
    items = []
    for node in nodes[:MAX_ITEMS_PER_FEED]:
        title = strip_html(text(node, ["title", "atom:title"]))
        link = first_link(node)
        date_raw = text(node, ["pubDate", "published", "updated", "dc:date", "atom:published", "atom:updated"])
        pub_date = parse_date(date_raw)
        if not title or not link or not pub_date:
            continue

        encoded = text(node, ["content:encoded"])
        description = strip_html(text(node, ["description", "content:encoded", "summary", "atom:summary"]))[:500]
        images = image_urls(node, link, encoded)
        digest = hashlib.sha1(link.encode("utf-8")).hexdigest()[:16]

        items.append({
            "id": digest,
            "title": title,
            "link": link,
            "source": feed["name"],
            "sourceUrl": feed["url"],
            "pubDate": pub_date,
            "categories": feed.get("categories", []),
            "image": images[0] if images else "",
            "images": images,
            "description": description,
        })
    return items

def fetch(feed):
    started = time.perf_counter()
    req = Request(
        feed["url"],
        headers={
            "User-Agent": UA,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
    )
    with urlopen(req, timeout=TIMEOUT) as response:
        raw = response.read()
    items = parse_feed(feed, raw)
    return items, round((time.perf_counter() - started) * 1000)

def main():
    feeds = json.loads(FEEDS.read_text(encoding="utf-8"))
    all_items = []
    health = []
    success = 0

    for feed in feeds:
        started = datetime.now(timezone.utc).isoformat()
        try:
            items, ms = fetch(feed)
            all_items.extend(items)
            success += 1
            health.append({
                "name": feed["name"], "url": feed["url"], "status": "healthy",
                "items": len(items), "responseMs": ms, "lastSuccess": started, "error": ""
            })
        except Exception as exc:
            health.append({
                "name": feed["name"], "url": feed["url"], "status": "failed",
                "items": 0, "responseMs": None, "lastSuccess": None,
                "error": str(exc)[:240]
            })

    # Keep the live dataset focused on the latest 30 days.
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    all_items = [
        x for x in all_items
        if datetime.fromisoformat(x["pubDate"].replace("Z", "+00:00")) >= cutoff
    ]

    # Deduplicate by canonical URL first, then normalized title.
    unique = {}
    for item in all_items:
        key = item["link"].split("#")[0].rstrip("/")
        if key not in unique:
            unique[key] = item

    title_seen = set()
    deduped = []
    for item in sorted(unique.values(), key=lambda x: x["pubDate"], reverse=True):
        title_key = re.sub(r"\W+", "", item["title"].lower())
        if title_key in title_seen:
            continue
        title_seen.add(title_key)
        deduped.append(item)

    news = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "feedCount": len(feeds),
        "healthyFeeds": success,
        "failedFeeds": len(feeds) - success,
        "itemCount": min(len(deduped), MAX_TOTAL_ITEMS),
        "items": deduped[:MAX_TOTAL_ITEMS],
    }
    NEWS_OUT.write_text(json.dumps(news, ensure_ascii=False, indent=2), encoding="utf-8")
    HEALTH_OUT.write_text(json.dumps({
        "generatedAt": news["generatedAt"],
        "feedCount": len(feeds),
        "healthyFeeds": success,
        "failedFeeds": len(feeds) - success,
        "feeds": health,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
