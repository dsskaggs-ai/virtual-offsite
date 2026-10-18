/* tiny cookie-jar client for the API tests */
module.exports = function client(base) {
  const jar = {};
  function cookies() { return Object.entries(jar).map(([k, v]) => k + '=' + v).join('; '); }
  function take(r) {
    const set = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
    set.forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/Max-Age=0/i.test(c)) delete jar[k]; else jar[k] = v; });
  }
  async function post(path, body) {
    const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookies() }, body: JSON.stringify(body || {}) });
    take(r); let j = {}; try { j = await r.json(); } catch (e) { } return { status: r.status, j };
  }
  async function get(path, o) {
    const r = await fetch(base + path, { headers: { Cookie: cookies() }, redirect: 'manual' });
    take(r); const text = await r.text(); return { status: r.status, text, loc: r.headers.get('location'), headers: r.headers };
  }
  return { post, get, jar };
};
