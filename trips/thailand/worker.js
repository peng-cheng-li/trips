// thailand-trip Worker: serves the page and a shared plan in KV (binding PLAN, secret EDIT_KEY).
export default { async fetch(req, env) {
  const u = new URL(req.url);
  if (u.pathname === '/api/plan') {
    if (req.method === 'GET') { const v = await env.PLAN.get('plan'); return new Response(v || DEF, {headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}); }
    if (req.method === 'PUT') {
      if (req.headers.get('x-edit-key') !== env.EDIT_KEY) return new Response('unauthorized', {status:401});
      const t = await req.text(); if (t.length > 200000) return new Response('too large', {status:413});
      let j; try { j = JSON.parse(t); } catch { return new Response('bad json', {status:400}); }
      if (!Array.isArray(j.days)) return new Response('bad plan', {status:400});
      await env.PLAN.put('plan', JSON.stringify(j)); return new Response('ok');
    }
    return new Response('method', {status:405});
  }
  if (u.pathname === '/api/ocr') {
    // Receipt / payment-screenshot recognition via Workers AI vision (free tier). Read-only: never touches the plan.
    if (req.method !== 'POST') return new Response('method', {status:405});
    const t = await req.text(); if (t.length > 4000000) return new Response('too large', {status:413});
    let j; try { j = JSON.parse(t); } catch { return new Response('bad json', {status:400}); }
    const b64 = typeof j.img === 'string' ? j.img.replace(/^data:[^,]+,/, '') : '';
    if (!b64 || b64.length < 100) return new Response('bad image', {status:400});
    let bytes; try { bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); } catch { return new Response('bad image', {status:400}); }
    if (!env.AI) return new Response(JSON.stringify({ok:false, err:'ai unavailable'}), {status:503, headers:{'content-type':'application/json'}});
    const prompt = 'You read receipt and payment screenshots (Thai, Chinese, Japanese, English). Extract: name = shop name or what was paid for (short, keep the language of the image); amount = the final total amount paid (number only, no commas, no currency symbol); currency = THB for Thai baht, CNY for Chinese yuan, JPY for Japanese yen. Reply with ONLY this JSON object, nothing else: {"name":"...","amount":123,"currency":"THB"}';
    try {
      const r = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {image: [...bytes], prompt: prompt, max_tokens: 200});
      const txt = (r && r.response) || '';
      let o = null;
      const m = txt.match(/\{[\s\S]*?\}/);
      if (m) { try { o = JSON.parse(m[0]); } catch { o = null; } }
      if (!o) { const g = re => { const mm = txt.match(re); return mm ? mm[1] : null; }; const nm = g(/"name"\s*:\s*"([^"]*)"/), am = g(/"amount"\s*:\s*"?([\d.]+)"?/), cu = g(/"currency"\s*:\s*"(THB|CNY|JPY)"/); if (am || nm) o = {name: nm || '', amount: am, currency: cu || 'THB'}; }
      if (!o) return new Response(JSON.stringify({ok:false}), {headers:{'content-type':'application/json'}});
      const cur = ['THB','CNY','JPY'].includes(o.currency) ? o.currency : 'THB';
      const amt = +o.amount;
      return new Response(JSON.stringify({ok:true, name: String(o.name || '').slice(0, 60), amount: (isFinite(amt) && amt > 0) ? amt : 0, currency: cur}), {headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    } catch (e) { return new Response(JSON.stringify({ok:false}), {headers:{'content-type':'application/json'}}); }
  }
  if (u.pathname === '/api/personal') {
    // Expense-only writes, no edit key (owner's choice 2026-11-17): can only replace one member's personal expense list, nothing else in the plan.
    if (req.method !== 'POST') return new Response('method', {status:405});
    const t = await req.text(); if (t.length > 50000) return new Response('too large', {status:413});
    let j; try { j = JSON.parse(t); } catch { return new Response('bad json', {status:400}); }
    const MEMS = ['Hiro','Fujisaki','Li'];
    if (!MEMS.includes(j.member) || !Array.isArray(j.list) || j.list.length > 200) return new Response('bad request', {status:400});
    const clean = [];
    for (const x of j.list) {
      if (!x || typeof x.name !== 'string' || x.name.length > 100) return new Response('bad item', {status:400});
      const c = +x.c; if (!isFinite(c) || c < 0 || c > 10000000) return new Response('bad amount', {status:400});
      const it = {name: x.name, c: c, s: x.s === true};
      if (x.cur === 'CNY' || x.cur === 'JPY') { const o = +x.o; if (!isFinite(o) || o < 0 || o > 100000000) return new Response('bad amount', {status:400}); it.o = o; it.cur = x.cur; const rj = +x.rj, rc = +x.rc; if (isFinite(rj) && rj > 0) it.rj = rj; if (isFinite(rc) && rc > 0) it.rc = rc; }
      if (Array.isArray(x.w)) { const w = x.w.filter(m => MEMS.includes(m)); if (w.length && w.length < 3) it.w = w; }
      clean.push(it);
    }
    const v = await env.PLAN.get('plan'); let plan; try { plan = JSON.parse(v || DEF); } catch { return new Response('plan unreadable', {status:500}); }
    plan.personal = plan.personal || {}; plan.personal[j.member] = clean;
    await env.PLAN.put('plan', JSON.stringify(plan));
    return new Response(JSON.stringify(plan), {headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
  if (u.pathname === '/bg.webp') return new Response(Uint8Array.from(atob(BG), c=>c.charCodeAt(0)), {headers:{'content-type':'image/webp','cache-control':'public, max-age=604800'}});
  const png = b => new Response(Uint8Array.from(atob(b), c=>c.charCodeAt(0)), {headers:{'content-type':'image/png','cache-control':'public, max-age=604800'}});
  if (u.pathname === '/icon-180.png') return png(I180);
  if (u.pathname === '/icon-192.png') return png(I192);
  if (u.pathname === '/icon-512.png') return png(I512);
  if (u.pathname === '/manifest.webmanifest') return new Response(MANIFEST, {headers:{'content-type':'application/manifest+json; charset=utf-8','cache-control':'public, max-age=86400'}});
  return new Response(H, {headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
} };
