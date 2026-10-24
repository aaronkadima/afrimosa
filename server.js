/**
 * AfriMosa TV — servidor de autenticação.
 * Requer hospedagem Node.js com HTTPS. GitHub Pages NÃO executa este arquivo.
 * Sem dependências npm; credenciais exclusivas em variáveis de ambiente.
 */
'use strict';
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { scryptSync, createHmac, timingSafeEqual } = require('node:crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
const SITE_PW = process.env.AFRIMOSA_SITE_PASSWORD || '';
const ADMIN_PW = process.env.AFRIMOSA_ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || '';
if (SITE_PW.length < 12 || ADMIN_PW.length < 12 || SITE_PW === ADMIN_PW || SECRET.length < 32) {
  console.error('Configure AFRIMOSA_SITE_PASSWORD e AFRIMOSA_ADMIN_PASSWORD (mínimo 12 caracteres distintos) e SESSION_SECRET (mínimo 32 caracteres).');
  process.exit(1);
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) process.exit(1);

const hashPassword = (password, role) => scryptSync(password, `afrimosa-${role}-v1`, 64);
const passwordHashes = { site: hashPassword(SITE_PW, 'site'), admin: hashPassword(ADMIN_PW, 'admin') };
const attempts = new Map();
const LOGIN_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const PUBLIC_STATUS = new Set(['aprovado', 'agendado', 'no_ar', 'publicado']);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const ASSETS = new Set(['admin.css', 'admin.js', 'base.css', 'site.css', 'publico.js', 'icone.png', 'kuba.jpg', 'logo_fundo_escuro.png']);

function commonHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}
function respond(res, status, body, type='text/plain; charset=utf-8', extra={}) {
  res.writeHead(status, { 'Content-Type': type, ...extra });
  res.end(body);
}
function redirect(res, dest, extra={}) { res.writeHead(303, { Location: dest, ...extra }); res.end(); }
function safeNext(value) {
  const v = String(value || '/');
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\r\n]/.test(v) || v.startsWith('/entrar') || v.startsWith('/sair')) return '/';
  return v;
}
function isAdminPath(pathname) { return pathname === '/admin' || pathname.startsWith('/admin/'); }
function parseCookies(raw) {
  const o = {};
  for (const part of (raw || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) o[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return o;
}
function makeToken(role, ttlHours) {
  const payload = `${role}.${Date.now() + ttlHours * 3600000}`;
  const mac = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${mac}`;
}
function validToken(token, role) {
  if (!token || !/^((site)|(admin))\.\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const parts = token.split('.');
  if (parts[0] !== role || Number(parts[1]) <= Date.now()) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const mac = Buffer.from(parts[2], 'hex');
  const expected = createHmac('sha256', SECRET).update(payload).digest();
  return timingSafeEqual(mac, expected);
}
function sessions(req) {
  const c = parseCookies(req.headers.cookie);
  return { site: validToken(c.afrimosa_site, 'site'), admin: validToken(c.afrimosa_admin, 'admin') };
}
function loginPage(next, error=false) {
  const admin = isAdminPath(next);
  const heading = admin ? 'Acesso à gestão' : 'Acesso à AfriMosa TV';
  const title = admin ? 'Painel administrativo' : 'Plataforma de conteúdos';
  const escapedNext = next.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Entrar · AfriMosa TV</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 15% 10%,#274c44 0%,transparent 40%),linear-gradient(140deg,#081c20,#142822 72%,#102326);color:#f9f7ec;font:16px system-ui,-apple-system,Segoe UI,sans-serif}.card{width:min(100%,410px);padding:clamp(24px,5vw,40px);background:#112d2a;border:1px solid #34534b;border-radius:24px;box-shadow:0 24px 70px #0005}.mark{font-size:13px;letter-spacing:.21em;font-weight:800;color:#f6c069;text-transform:uppercase}h1{font-size:clamp(26px,6vw,34px);letter-spacing:-.04em;line-height:1.15;margin:20px 0 10px}p{color:#d1dbd5;line-height:1.5;margin:0 0 26px}label{display:block;font-size:14px;font-weight:650;margin-bottom:10px}input{width:100%;height:50px;border-radius:10px;border:1px solid #698178;background:#0e2423;color:#fff;padding:0 14px;font:inherit;outline-offset:3px}input:focus{outline:2px solid #edc46f}button{width:100%;height:52px;border:0;border-radius:10px;font:700 16px system-ui;background:#e9af50;color:#10201c;cursor:pointer;margin-top:16px}button:hover{background:#f2c97c}.error{color:#ffe0d8;background:#693a37;padding:10px 12px;border-radius:9px;margin-bottom:16px;font-size:14px}.foot{margin-top:24px;color:#9eb6aa;font-size:12px;line-height:1.5}</style></head><body><main class="card"><div class="mark">AfriMosa TV</div><h1>${heading}</h1><p>${title} · Acesso exclusivo mediante senha.</p>${error?'<div class="error" role="alert">Senha inválida ou limite de tentativas alcançado. Tente novamente.</div>':''}<form action="/entrar" method="post"><input type="hidden" name="next" value="${escapedNext}"><label for="password">Senha de acesso</label><input id="password" name="password" type="password" minlength="12" maxlength="256" autocomplete="current-password" required autofocus><button type="submit">Entrar com segurança</button></form><div class="foot">Sessão limitada · Conexão HTTPS obrigatória em produção</div></main></body></html>`;
}
function publicProjection(d) {
  const c = d.canal || {};
  const keep = (...fields) => Object.fromEntries(fields.filter(k => c[k] !== undefined).map(k => [k,c[k]]));
  return {
    canal: keep('nome', 'slogan', 'estreia', 'youtube_url', 'youtube_channel_id', 'instagram', 'tiktok', 'facebook', 'whatsapp'),
    grade: { faixas: (d.grade?.faixas || []).map(f => ({inicio:f.inicio, fim:f.fim, nome:f.nome, cor:f.cor, quadros:f.quadros})), quadros: (d.grade?.quadros || []).map(q => ({id:q.id, nome:q.nome, tipo:q.tipo})) },
    curso: {inicio:d.curso?.inicio, temas:d.curso?.temas},
    conteudos: (d.conteudos || []).filter(x => PUBLIC_STATUS.has(x.status)).map(x => {
      const base = { tipo:x.tipo, status:x.status, titulo:x.titulo, serie:x.serie };
      if (x.tipo === 'reportagem') base.roteiro = { abertura:x.roteiro?.abertura, capitulos:(x.roteiro?.capitulos || []).map(p => ({titulo:p.titulo})) };
      if (x.tipo === 'licao') Object.assign(base,{lingua:x.lingua, licao:x.licao, tema:x.tema, palavras:(x.palavras || []).map(p => ({palavra:p.palavra, pronuncia:p.pronuncia, significado:p.significado}))});
      if (x.tipo === 'curiosidade') Object.assign(base,{detalhe:x.detalhe, texto:x.texto, destaques:x.destaques});
      return base;
    })
  };
}
async function file(res, filename, method) {
  try {
    const bytes = await readFile(path.join(ROOT, filename));
    const ext = path.extname(filename);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(method === 'HEAD' ? undefined : bytes);
  } catch (e) {
    respond(res, e.code === 'ENOENT' ? 404 : 500, 'Arquivo indisponível.');
  }
}
async function readPost(req) {
  return new Promise((resolve, reject) => {
    let str = '';
    req.on('data', c => { str += c; if (str.length > 2048) { reject(new Error('too_large')); req.destroy(); } });
    req.on('end', () => resolve(new URLSearchParams(str)));
    req.on('error', reject);
  });
}
http.createServer(async (req, res) => {
  commonHeaders(res);
  if (PROD && req.headers['x-forwarded-proto'] !== 'https') {
    return respond(res, 426, 'HTTPS obrigatório. Configure um proxy TLS seguro.');
  }
  const raw = req.url || '/';
  const u = new URL(raw, 'http://localhost');
  const pathname = u.pathname;
  if (!['GET', 'HEAD', 'POST'].includes(req.method)) return respond(res, 405, 'Método não permitido.');
  const auth = sessions(req);
  if (pathname === '/health' && req.method === 'GET') return respond(res, 200, 'OK');
  if (pathname === '/sair') {
    return redirect(res, '/entrar', { 'Set-Cookie': ['afrimosa_site=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict'+(PROD?'; Secure':''), 'afrimosa_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict'+(PROD?'; Secure':'')] });
  }
  if (pathname === '/entrar') {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const body = loginPage(safeNext(u.searchParams.get('next')), u.searchParams.has('erro'));
      return respond(res, 200, req.method === 'HEAD' ? '' : body, 'text/html; charset=utf-8');
    }
    if (req.method !== 'POST') return respond(res, 405, 'Método não permitido.');
    try {
      const params = await readPost(req);
      const next = safeNext(params.get('next'));
      const role = isAdminPath(next) ? 'admin' : 'site';
      const password = params.get('password') || '';
      const sourceIp = (req.socket.remoteAddress || 'unknown');
      const key = `${sourceIp}:${role}`;
      const now = Date.now();
      const rec = attempts.get(key) || { count:0, until:now+LOGIN_WINDOW };
      if (now >= rec.until) { rec.count = 0; rec.until = now + LOGIN_WINDOW; }
      const allowed = rec.count < MAX_ATTEMPTS;
      const pass = password.length <= 256 && password.length >= 12 && timingSafeEqual(hashPassword(password, role), passwordHashes[role]);
      if (!allowed || !pass) {
        rec.count++; attempts.set(key, rec);
        return redirect(res, '/entrar?erro=1&next=' + encodeURIComponent(next));
      }
      attempts.delete(key);
      const ttl = role === 'admin' ? 4 : 12;
      const value = `afrimosa_${role}=${makeToken(role, ttl)}; Path=/; Max-Age=${ttl*3600}; HttpOnly; SameSite=Strict${PROD ? '; Secure' : ''}`;
      return redirect(res, next, {'Set-Cookie':value});
    } catch { return respond(res, 413, 'Dados inválidos.'); }
  }
  if (!['GET','HEAD'].includes(req.method)) return respond(res, 405, 'Método não permitido.');
  const needsAdmin = isAdminPath(pathname) || pathname === '/assets/admin.js' || pathname === '/assets/admin.css';
  const allowed = needsAdmin ? auth.admin : (auth.site || auth.admin);
  if (!allowed) {
    if (pathname === '/' || pathname === '/index.html' || needsAdmin) {
      return redirect(res, '/entrar?next=' + encodeURIComponent(needsAdmin ? '/admin/' : '/'));
    }
    return respond(res, 401, 'Autenticação necessária.');
  }
  if (pathname === '/data/canal.json') {
    try {
      const d = await readFile(path.join(ROOT, 'data', 'canal.json'), 'utf8');
      const body = auth.admin ? d : JSON.stringify(publicProjection(JSON.parse(d)));
      return respond(res, 200, req.method === 'HEAD' ? '' : body, 'application/json; charset=utf-8');
    } catch { return respond(res, 500, 'Falha ao ler dados.'); }
  }
  if (pathname === '/' || pathname === '/index.html') return file(res, 'index.html', req.method);
  if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/index.html') return file(res, 'admin/index.html', req.method);
  if (pathname.startsWith('/assets/')) {
    const asset = pathname.substring('/assets/'.length);
    if (ASSETS.has(asset)) return file(res, `assets/${asset}`, req.method);
  }
  return respond(res, 404, 'Página não encontrada.');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`AfriMosa TV protegida disponível na porta ${PORT}.`);
});
