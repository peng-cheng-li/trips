#!/usr/bin/env python3
"""Usage: python3 scripts/make_deploy.py <trip-folder> <worker-name>
Writes build/deploy-<worker>.js : a Cloudflare API script that uploads trips/<folder>/index.html
as a single-file Worker and enables <worker>.logipab.workers.dev.
Run it with the user-Cloudflare MCP `execute` tool: {"code": "$file:/abs/path/build/deploy-<worker>.js"}"""
import sys,base64,json,pathlib
root=pathlib.Path(__file__).resolve().parent.parent
folder,worker=sys.argv[1],sys.argv[2]
h=base64.b64encode((root/'trips'/folder/'index.html').read_bytes()).decode()
js=f"""async () => {{
const html = new TextDecoder().decode(Uint8Array.from(atob({json.dumps(h)}), c=>c.charCodeAt(0)));
const src = `const H = ${{JSON.stringify(html)}};\\nexport default {{ async fetch() {{ return new Response(H, {{headers:{{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}}}}); }} }};`;
const form = new FormData();
form.append('metadata', new Blob([JSON.stringify({{main_module:'worker.js', compatibility_date:'2026-10-01'}})], {{type:'application/json'}}));
form.append('worker.js', new Blob([src], {{type:'application/javascript+module'}}), 'worker.js');
const r = await cloudflare.request({{method:'PUT', path:`/accounts/${{accountId}}/workers/scripts/{worker}`, body: form}});
const s = await cloudflare.request({{method:'POST', path:`/accounts/${{accountId}}/workers/scripts/{worker}/subdomain`, body:{{enabled:true}}}});
return {{ok:r.success, sub:s.success, url:'https://{worker}.logipab.workers.dev/'}};
}}"""
out=root/'build'/f'deploy-{worker}.js';out.parent.mkdir(exist_ok=True);out.write_text(js);print(out)
