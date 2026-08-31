#!/usr/bin/env python3
"""
Bitcoin Apps Directory Monitor
==============================
Autonomous health check for bitcoinapps.info

Reads src/data/apps.json and checks:
1. URL health — are all app URLs still online?
2. GitHub activity — are open-source repos still active?

GitHub repos come from the "github" field in apps.json — single source of truth.
"""

import json
import sys
import ssl
import re
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

APPS_JSON = "src/data/apps.json"
TRACKING_QUERY_PARAMS = {"ref", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

GITHUB_RE = re.compile(r'github\.com/([^/]+/[^/]+)')

# ─── Check 1: URL Health ────────────────────────────────────────────

def normalize_url(url):
    """Remove tracking params while preserving functional query params.

    Some app-store URLs require parameters like `id`, `hl`, or `gl`.
    Stripping the full query string turns valid URLs into false 404s.
    """
    parsed = urllib.parse.urlsplit(url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query = [(k, v) for k, v in query if k not in TRACKING_QUERY_PARAMS]
    return urllib.parse.urlunsplit((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        urllib.parse.urlencode(query),
        parsed.fragment,
    ))

def check_url(app):
    """HTTP health check for an app URL."""
    title = app["title"]
    url = normalize_url(app["url"])
    try:
        req = urllib.request.Request(url, method="HEAD")
        req.add_header("User-Agent", "Mozilla/5.0 (BitcoinAppsMonitor/1.0)")
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return {"title": title, "url": url, "status": resp.status, "error": None}
    except urllib.error.HTTPError as e:
        if e.code in (405, 403, 404):
            try:
                req = urllib.request.Request(url, method="GET")
                req.add_header("User-Agent", "Mozilla/5.0 (BitcoinAppsMonitor/1.0)")
                with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
                    return {"title": title, "url": url, "status": resp.status, "error": None}
            except Exception:
                pass
        return {"title": title, "url": url, "status": e.code, "error": str(e)}
    except urllib.error.URLError as e:
        return {"title": title, "url": url, "status": 0, "error": str(e.reason)}
    except Exception as e:
        return {"title": title, "url": url, "status": 0, "error": str(e)}

# ─── Check 2: GitHub Activity ───────────────────────────────────────

def check_github_repo(title, repo_slug):
    """Check GitHub activity via gh CLI."""
    empty = {
        "title": title, "repo": repo_slug,
        "pushed_at": None, "days_since_push": None,
        "stars": None, "open_issues": None,
        "archived": None, "disabled": None,
        "language": None, "error": None
    }
    try:
        import subprocess
        cmd = [
            "gh", "api", f"repos/{repo_slug}",
            "--jq", '{pushed_at,stargazers_count,open_issues_count,archived,disabled,language,default_branch}'
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if proc.returncode == 0 and proc.stdout.strip():
            data = json.loads(proc.stdout)
            pushed = datetime.fromisoformat(data["pushed_at"].replace("Z", "+00:00"))
            empty["pushed_at"] = data["pushed_at"][:10]
            empty["days_since_push"] = (datetime.now(timezone.utc) - pushed).days
            empty["stars"] = data.get("stargazers_count")
            empty["open_issues"] = data.get("open_issues_count")
            empty["archived"] = bool(data.get("archived", False))
            empty["disabled"] = bool(data.get("disabled", False))
            empty["language"] = data.get("language", "")
            empty["error"] = None
            return empty
        empty["error"] = f"gh returned {proc.returncode}: {proc.stderr.strip()[:200]}"
        return empty
    except Exception as e:
        empty["error"] = str(e)
        return empty

# ─── Main ────────────────────────────────────────────────────────────

def main():
    print("⚡ Bitcoin Apps Directory Monitor")
    print(f"📅 {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)

    with open(APPS_JSON) as f:
        apps = json.load(f)
    print(f"📊 {len(apps)} apps\n")

    # ── 1. URL Health ─────────────────────────────────────────
    print("🔍 Checking URL health...")
    url_results = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(check_url, a): a for a in apps}
        for future in as_completed(futures):
            url_results.append(future.result())

    ok = [r for r in url_results if r["status"] and 100 <= r["status"] < 400]
    errors = [r for r in url_results if not r["status"] or r["status"] >= 400]
    print(f"  ✅ {len(ok)}  ❌ {len(errors)}")

    # ── 2. GitHub Activity ────────────────────────────────────
    # Read github field from apps.json — single source of truth
    print("\n🐙 Checking GitHub activity...")
    gh_apps = []
    for a in apps:
        github = a.get("github", "")
        m = GITHUB_RE.search(github)
        if m:
            gh_apps.append((a["title"], m.group(1)))
    print(f"  {len(gh_apps)} repos (from 'github' field in apps.json)")

    gh = [check_github_repo(t, r) for t, r in gh_apps]

    healthy = [r for r in gh if r["error"] is None and not r.get("archived") and r.get("days_since_push") is not None and r["days_since_push"] <= 180]
    stale   = [r for r in gh if r["error"] is None and not r.get("archived") and r.get("days_since_push") is not None and 180 < r["days_since_push"] <= 365]
    dead    = [r for r in gh if r.get("archived") or (r.get("days_since_push") is not None and r["days_since_push"] > 365)]
    errored = [r for r in gh if r["error"]]

    print(f"  🟢 {len(healthy)}  🟡 {len(stale)}  🔴 {len(dead)}  ⚠️ {len(errored)}")

    # ── Report ────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    if errors:
        print(f"\n❌ DEAD APPS ({len(errors)}):")
        for r in sorted(errors, key=lambda x: x["title"]):
            print(f"  • {r['title']}  {r['status']}  {r['error']}\n    {r['url']}")
    else:
        print("\n✅ All apps online")

    if stale:
        print(f"\n🟡 STALE REPOS (>180 days):")
        for r in sorted(stale, key=lambda x: x["days_since_push"]):
            print(f"  • {r['title']}  {r['repo']}  {r['pushed_at']} ({r['days_since_push']}d ago)")
    if dead:
        print(f"\n🔴 DEAD REPOS (>365 days / archived):")
        for r in sorted(dead, key=lambda x: x.get("days_since_push") or 0):
            status = "archived" if r.get("archived") else f"{r['days_since_push']}d ago"
            print(f"  • {r['title']}  {r['repo']}  {status}")
    if errored:
        print(f"\n⚠️ GH ERRORS ({len(errored)}):")
        for r in errored:
            print(f"  • {r['title']}  {r['repo']}  {r['error']}")

    if not errors and not stale and not dead and not errored:
        print("\n✅ All clear!")

    # Save report
    report = {
        "date": datetime.now(timezone.utc).isoformat(),
        "total_apps": len(apps),
        "urls_ok": len(ok),
        "urls_errors": len(errors),
        "github_total": len(gh_apps),
        "github_healthy": len(healthy),
        "github_stale": len(stale),
        "github_dead": len(dead),
        "github_errors": len(errored),
        "url_error_details": errors,
        "github_stale_details": stale,
        "github_dead_details": dead,
    }
    with open("monitor_report.json", "w") as f:
        json.dump(report, f, indent=2)

    if errors or dead:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
