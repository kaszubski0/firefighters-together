# Firefighters Together

A free, static, state-by-state directory of local resources for American firefighters (active and retired) and their families.

**Status: prototype.** It is built to be tested by real firefighters so we can collect feedback. It is unofficial and independent. Listings come from public sources and are labeled by how they were checked. Entries marked `needs_check` are never shown.

The site is plain HTML, CSS and vanilla JavaScript. No framework, no build step, no npm dependencies, no external fonts, images or scripts, no cookies, no forms and no tracking.

## The four Stations

1. **Community** – retiree groups, union retiree chapters, state associations, auxiliaries, museums
2. **Volunteer** – preparedness, prevention education, preservation, company support, mentoring
3. **Family** – support for fallen firefighters' families, spouse communities, scholarships, gatherings
4. **Benefits** – links to official government offices only. The site never summarizes rules or eligibility.

## File structure

```
index.html              Home page and the app shell for all state pages
about.html              About page
404.html                Not-found page (served by GitHub Pages for unknown paths)
css/styles.css          All styles, including print and reduced-motion rules
js/app.js               Hash router, data loading and validation, state picker, tile map, filters
assets/favicon.svg      Site icon
assets/icons/*.svg      Reference copies of the four line icons (the site draws them inline from js/app.js)
data/national.json      National entries (Family, federal Benefits, national associations)
data/states/index.json  All 50 states: slug, name, abbr, coverage ("detailed" or "basic")
data/states/<slug>.json One file per state
scripts/check-links.py  Link checker; writes scripts/link-report.md
todo_associations.json  State associations still waiting for a confirmed official URL
```

Pages use hash URLs so they work on GitHub Pages and can be shared:

- `#/texas` (opens Community)
- `#/texas/benefits`
- `#/texas/community?category=State%20Firefighters%20Association&view=table`

## Data format

Each state file is `{ "state", "abbr", "slug", "updated", "entries": [ ... ] }`. `data/national.json` is `{ "updated", "entries": [ ... ] }`. An entry looks like this:

```json
{
  "id": "oh-community-001",
  "station": "community",
  "category": "State Firefighters Association",
  "name": "Name of the organization",
  "audience": "both",
  "scope": "state",
  "city": "",
  "county": "",
  "description": "Short description written in our own words.",
  "experience_note": "",
  "url": "https://official-site.example/",
  "events_url": "",
  "last_verified": "2026-10-07",
  "verification": "verified",
  "source": "Official website opened and checked",
  "note": "",
  "sample": false
}
```

| Field | Notes |
| --- | --- |
| `station` | `community`, `volunteer`, `family` or `benefits` |
| `audience` | `retirees`, `active`, `both` or `family` |
| `scope` | `state` or `national`. National entries show under a "National" heading on every state page. |
| `description` | Not shown for most Benefits entries. Write it in your own words. |
| `experience_note` | Volunteer station only. Shown as "How your experience helps." |
| `note` | Short secondary text under the description. May be empty. |
| `url`, `events_url` | **Must start with `https://`.** Invalid entries are skipped and logged to the browser console. |
| `last_verified` | `YYYY-MM-DD`. Shown as "Last verified: October 7, 2026". Leave empty if not verified yet. |
| `verification` | See below. |
| `source` | Where the link came from. Shown on the card. |

### The `verification` field

| Value | Meaning | Shown on the site? |
| --- | --- | --- |
| `verified` | Someone opened the page and confirmed it is the right organization. | Yes, labeled "Verified" |
| `official_directory` | The link was taken from an official directory (for example NASFM or the U.S. Department of Labor). | Yes, labeled "From official directory" |
| `needs_check` | Not yet checked. | **No, never** |

## Check the links

```bash
python3 scripts/check-links.py
```

This requests every URL in `data/` (redirects followed, 15-second timeout) and writes `scripts/link-report.md` with three tables: broken links, links that redirect to a different domain, and `needs_check` entries with the page title beside the expected name. It never edits data. Some government sites answer scripts with 403 even though they work in a browser, so open those by hand before treating them as broken.

## Add a verified entry

1. Open `data/states/<slug>.json` and add an entry to `entries` with a unique `id`.
2. Set `verification` to `verified` only after you opened the page yourself and confirmed it. Set `last_verified` to today and `source` to "Official website opened and checked".
3. Preview locally and check the browser console for "Skipped entry" warnings.
4. If a state now has real depth, change its `coverage` to `detailed` in `data/states/index.json`.

## Preview locally

The site loads JSON with `fetch`, so it cannot be opened by double-clicking `index.html`. Start a local server in the project folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy to GitHub Pages

1. Create a GitHub repository named `firefighters-together` (public).
2. Push this folder to the `main` branch.
   ```bash
   git remote add origin https://github.com/<username>/firefighters-together.git
   git branch -M main
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose branch **main** and folder **/ (root)**, then **Save**.
5. Wait a minute or two. The site appears at `https://<username>.github.io/firefighters-together/`.
6. Back in **Settings → Pages**, tick **Enforce HTTPS**.
7. If you use a different repository name, change `<base href="/firefighters-together/">` in `404.html` to match. That tag lets the 404 page load its styles from any path depth.

## Security notes

- The pages set a Content Security Policy (same-origin scripts, styles, images and data only; no inline scripts or styles; no eval) and a `no-referrer` referrer policy.
- All data is rendered with `textContent` and `createElement`. There is no `innerHTML`.
- External links use `target="_blank" rel="noopener noreferrer"` and announce "(opens in new tab)".
- **Turn on two-factor authentication** for the GitHub account that owns the repository.
- **Keep the repository free of secrets.** There should be no passwords, API keys or tokens anywhere in it. The site needs none.
- Review every change to `data/` before merging. A link to the wrong site is the main risk to visitors.

## Checklist: verify an organization before adding it

- [ ] It is an organization, not an individual.
- [ ] You found its official website yourself and the link starts with `https://`.
- [ ] The website loads and shows recent activity (news, events or a current contact page). The organization appears to be active.
- [ ] The name, city and county match what the official site says.
- [ ] Benefits entries are government offices (look for a `.gov` address or the state's official portal).
- [ ] Your description is written in your own words and makes no claims about eligibility or benefits.
- [ ] You set `last_verified` to today's date and `verification` to `verified`.
- [ ] The entry has no personal names, phone numbers, emails or home addresses.
- [ ] You previewed it locally and saw no "Skipped entry" warning.

## Accessibility

Targets WCAG 2.1 AA: 18px base text, 1.6 line height, visible focus outlines, full keyboard use (arrow keys move between Station tabs), 44px tap targets, reduced-motion support and a print stylesheet that shows link addresses.
