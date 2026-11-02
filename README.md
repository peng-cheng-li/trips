# trips — 旅行プラン

One folder per destination/trip. Each is a single self-contained `index.html` (mobile-first, short cards, JP + 中文 labels).

```
trips/
  nikko/index.html      日光 ドライブ日帰り (A定番 / B絶景 / C節約)
  <next-trip>/index.html
scripts/make_deploy.py  builds a Cloudflare Worker deploy script for one trip
build/                  generated deploy scripts (git-ignored)
```

| Trip | Folder | Live |
|---|---|---|
| 日光 ドライブ日帰り | `trips/nikko` | https://nikko-daytrip.logipab.workers.dev/ |
| タイ バンコク＋パタヤ 2026.11 | `trips/thailand` | https://thailand-trip.logipab.workers.dev/ |

## Add a new trip
1. Folder name: `trips/<place>` or `trips/<place>-<yyyymm>` (lowercase ASCII, e.g. `trips/kyoto-202612`).
2. Copy `trips/nikko/index.html` as the template; keep the style: route chips, 2–3 option tabs, time rows, budget total, short memo. No long prose.
3. Verify hours/fees from official sites; mark estimates as 目安.
4. Deploy: `python3 scripts/make_deploy.py <folder> <place>-trip` then run the printed file through the user-Cloudflare MCP `execute` tool (`"code": "$file:<path>"`). URL: `https://<worker>.logipab.workers.dev/`.
5. Add a row to the table above, commit, push.

Hosting: Cloudflare Workers (account logipab). Cloudflare Pages is not used because the connector lacks Pages permission.
