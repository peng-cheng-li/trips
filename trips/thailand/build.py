#!/usr/bin/env python3
"""Builds index.html from template.html + plan.json, and (with --deploy KEYFILE) build/deploy-thailand-trip.js
for the user-Cloudflare MCP `execute` tool. KV namespace thailand-trip-plan is bound as PLAN; EDIT_KEY is a secret (never committed)."""
import sys,json,base64,pathlib
d=pathlib.Path(__file__).parent;root=d.parent.parent
plan=json.dumps(json.load(open(d/'plan.json')),ensure_ascii=False)
html=(d/'template.html').read_text().replace('__PLAN__',plan.replace('</','<\\/'));(d/'index.html').write_text(html)
if '--deploy' in sys.argv:
  key=pathlib.Path(sys.argv[sys.argv.index('--deploy')+1]).read_text().strip()
  src='const H = '+json.dumps(html)+';\nconst DEF = '+json.dumps(plan)+';\n'+(d/'worker.js').read_text()
  b=base64.b64encode(src.encode()).decode()
  meta={'main_module':'worker.js','compatibility_date':'2026-10-01','bindings':[{'type':'kv_namespace','name':'PLAN','namespace_id':'d5e243e2b5ad4a968003d5203e7a0fa6'},{'type':'secret_text','name':'EDIT_KEY','text':key}]}
  js=f"""async () => {{
const src = new TextDecoder().decode(Uint8Array.from(atob({json.dumps(b)}), c=>c.charCodeAt(0)));
const form = new FormData();
form.append('metadata', new Blob([{json.dumps(json.dumps(meta))}], {{type:'application/json'}}));
form.append('worker.js', new Blob([src], {{type:'application/javascript+module'}}), 'worker.js');
const r = await cloudflare.request({{method:'PUT', path:`/accounts/${{accountId}}/workers/scripts/thailand-trip`, body: form}});
const s = await cloudflare.request({{method:'POST', path:`/accounts/${{accountId}}/workers/scripts/thailand-trip/subdomain`, body:{{enabled:true}}}});
return {{ok:r.success, err:r.errors, sub:s.success}};
}}"""
  o=root/'build'/'deploy-thailand-trip.js';o.parent.mkdir(exist_ok=True);o.write_text(js);print(o)
