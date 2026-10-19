(function () {
  let user = null, mode = 'login', pending = null;
  const $ = (id) => document.getElementById(id);
  const api = (url, body) =>
    fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

  const css = document.createElement('style');
  css.textContent = `
  .au-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:999}
  .au-bg.open{display:flex}
  .au-box{background:var(--panel,#111826);border:1px solid var(--line,#243047);border-radius:16px;padding:28px;width:min(380px,92vw);color:var(--ink,#e6edf7)}
  .au-box h3{margin:0 0 4px}.au-box p{margin:0 0 16px;color:var(--muted,#8b98ad);font-size:14px}
  .au-box input{width:100%;margin-bottom:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--line,#243047);background:var(--panel2,#0b111c);color:inherit}
  .au-box .main{width:100%;padding:10px;border:0;border-radius:8px;background:var(--blue,#4da3ff);color:var(--bg,#06101f);font-weight:600;cursor:pointer}
  .au-err{color:#ff7b7b;font-size:13px;min-height:18px}
  .au-sw{background:none;border:0;color:var(--blue,#4da3ff);cursor:pointer;margin-top:10px;padding:0}`;
  document.head.appendChild(css);

  const bg = document.createElement('div');
  bg.className = 'au-bg';
  bg.innerHTML = `<div class="au-box">
    <h3 id="au-title"></h3><p>Continue karne ke liye sign in karein. Resume, certificate aur link clicks record hote hain.</p>
    <input id="au-name" placeholder="Name" autocomplete="name">
    <input id="au-email" type="email" placeholder="Email" autocomplete="email">
    <input id="au-pass" type="password" placeholder="Password (min 8)" autocomplete="current-password">
    <div class="au-err" id="au-err"></div>
    <button class="main" id="au-go"></button>
    <button class="au-sw" id="au-sw"></button></div>`;
  document.body.appendChild(bg);

  function render() {
    const s = mode === 'signup';
    $('au-title').textContent = s ? 'Create account' : 'Welcome back';
    $('au-name').style.display = s ? '' : 'none';
    $('au-go').textContent = s ? 'Sign up' : 'Log in';
    $('au-sw').textContent = s ? 'Already have an account? Log in' : 'New here? Sign up';
    $('au-err').textContent = '';
  }
  const close = () => bg.classList.remove('open');

  // koi bhi action ko login ke peeche lagane ke liye: requireLogin(() => ...)
  window.requireLogin = (cb) => {
    if (user) return cb();
    pending = cb; mode = 'login'; render(); bg.classList.add('open'); $('au-email').focus();
  };

  function run(el) {
    if (el.dataset.gate === 'download') {
      location.href = '/files/' + encodeURIComponent(el.dataset.file);
      return;
    }
    api('/api/track', { target: el.dataset.target }); // log karo, wait nahi
    const url = el.getAttribute('href');
    if (url.startsWith('mailto:')) location.href = url;
    else window.open(url, '_blank', 'noopener');
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-gate]');
    if (!el) return;
    e.preventDefault();
    window.requireLogin(() => run(el));
  });

  $('au-sw').onclick = () => { mode = mode === 'signup' ? 'login' : 'signup'; render(); };
  bg.onclick = (e) => { if (e.target === bg) close(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $('au-go').onclick = async () => {
    const body = { email: $('au-email').value, password: $('au-pass').value };
    if (mode === 'signup') body.name = $('au-name').value;
    const r = await api('/api/' + mode, body);
    if (!r.ok) { $('au-err').textContent = r.data.error || 'Kuch galat hua'; return; }
    user = r.data.name;
    $('au-pass').value = '';
    close();
    if (pending) { const cb = pending; pending = null; cb(); }
  };

  window.portfolioLogout = () => api('/api/logout', {}).then(() => { user = null; });
  api('/api/me').then((r) => { if (r.ok) user = r.data.name; });
  render();
})();
