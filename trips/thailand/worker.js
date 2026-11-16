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
      if (Array.isArray(x.w)) { const w = x.w.filter(m => MEMS.includes(m)); if (w.length && w.length < 3) it.w = w; }
      clean.push(it);
    }
    const v = await env.PLAN.get('plan'); let plan; try { plan = JSON.parse(v || DEF); } catch { return new Response('plan unreadable', {status:500}); }
    plan.personal = plan.personal || {}; plan.personal[j.member] = clean;
    await env.PLAN.put('plan', JSON.stringify(plan));
    return new Response(JSON.stringify(plan), {headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
  if (u.pathname === '/bg.webp') return new Response(Uint8Array.from(atob(BG), c=>c.charCodeAt(0)), {headers:{'content-type':'image/webp','cache-control':'public, max-age=604800'}});
  return new Response(H, {headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
} };
