#!/usr/bin/env python3
"""Check every URL in data/ and write scripts/link-report.md.

Usage (from the project folder):  python3 scripts/check-links.py

For each entry it requests the URL (redirects followed, 15 s timeout, browser-like
User-Agent) and records the final URL, HTTP status and page <title>.
It never changes any data file. Standard library only.
"""
import glob, html, json, os, re, ssl, sys, time
import urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
TIMEOUT = 15
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)


def load_entries():
    out = []
    files = sorted(glob.glob(os.path.join(ROOT, "data", "states", "*.json"))) + [os.path.join(ROOT, "data", "national.json")]
    for path in files:
        if path.endswith("index.json"):
            continue
        with open(path, encoding="utf-8") as fh:
            doc = json.load(fh)
        entries = doc["entries"] if isinstance(doc, dict) else doc
        for e in entries:
            for field in ("url", "events_url"):
                if e.get(field):
                    out.append({"file": os.path.relpath(path, ROOT), "field": field, **{k: e.get(k, "") for k in ("id", "name", "verification")}, "url": e[field]})
    return out


def fetch(url, context):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*;q=0.8"})
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=context) as resp:
        body = resp.read(200_000).decode(resp.headers.get_content_charset() or "utf-8", "replace")
        return resp.status, resp.geturl(), body


def check(item):
    result = {"status": None, "final": "", "title": "", "error": "", "note": ""}
    for context, label in ((ssl.create_default_context(), ""), (ssl._create_unverified_context(), "certificate check failed locally; retried without it")):
        try:
            status, final, body = fetch(item["url"], context)
            m = TITLE_RE.search(body)
            result.update(status=status, final=final, error="", note=label,
                          title=re.sub(r"\s+", " ", html.unescape(m.group(1))).strip() if m else "")
            return {**item, **result}
        except urllib.error.HTTPError as e:
            result.update(status=e.code, final=e.geturl() or "", error="HTTP %d" % e.code, note=label)
            return {**item, **result}
        except ssl.SSLError as e:
            result.update(error="SSL error: %s" % e)
            continue
        except urllib.error.URLError as e:
            if isinstance(e.reason, ssl.SSLError):
                result.update(error="SSL error: %s" % e.reason)
                continue
            result.update(error="Network error: %s" % e.reason)
            return {**item, **result}
        except Exception as e:  # timeouts, resets, bad responses
            result.update(error="%s: %s" % (type(e).__name__, e))
            return {**item, **result}
    return {**item, **result}


def host(url):
    h = (urlparse(url).hostname or "").lower()
    return h[4:] if h.startswith("www.") else h


def cell(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def main():
    items = load_entries()
    print("Checking %d URLs..." % len(items), file=sys.stderr)
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(check, items))

    broken = [r for r in results if r["error"] or (r["status"] and r["status"] >= 400)]
    moved = [r for r in results if r not in broken and r["final"] and host(r["final"]) != host(r["url"])]
    review = [r for r in results if r["verification"] == "needs_check" and r["field"] == "url"]

    lines = ["# Link report", "", "Generated %s. %d URLs checked. This file is read-only output; no data was changed." % (time.strftime("%Y-%m-%d %H:%M"), len(results)), ""]
    lines += ["## Broken (%d)" % len(broken), ""]
    if broken:
        lines += ["| ID | Name | URL | Problem |", "|---|---|---|---|"]
        lines += ["| %s | %s | %s | %s |" % (cell(r["id"]), cell(r["name"]), cell(r["url"]), cell(r["error"] or r["status"])) for r in broken]
    else:
        lines.append("None.")
    lines += ["", "## Redirected to a different domain (%d)" % len(moved), ""]
    if moved:
        lines += ["| ID | Name | Original URL | Final URL | Page title |", "|---|---|---|---|---|"]
        lines += ["| %s | %s | %s | %s | %s |" % (cell(r["id"]), cell(r["name"]), cell(r["url"]), cell(r["final"]), cell(r["title"])) for r in moved]
    else:
        lines.append("None.")
    lines += ["", "## needs_check entries (%d)" % len(review), "",
              "Compare the page title with the organization name. Nothing here is shown on the site until you approve it.", ""]
    if review:
        lines += ["| ID | Expected organization | URL | Status | Page title |", "|---|---|---|---|---|"]
        lines += ["| %s | %s | %s | %s | %s |" % (cell(r["id"]), cell(r["name"]), cell(r["url"]), cell(r["error"] or r["status"]), cell(r["title"])) for r in review]
    else:
        lines.append("None.")
    ssl_retry = [r for r in results if r["note"]]
    if ssl_retry:
        lines += ["", "## Note", "", "%d URLs only loaded after retrying without certificate verification (common with an outdated Python on macOS). Their status is still valid for this check." % len(ssl_retry)]
    out = os.path.join(ROOT, "scripts", "link-report.md")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("Wrote %s  (broken: %d, moved: %d, needs_check: %d)" % (out, len(broken), len(moved), len(review)), file=sys.stderr)


if __name__ == "__main__":
    main()
