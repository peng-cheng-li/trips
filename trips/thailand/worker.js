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
  return new Response(H, {headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
} };
