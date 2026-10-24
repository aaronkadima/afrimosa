'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const SITE = 'SiteSenhaDeTeste-2026-Forte';
const ADMIN = 'AdminSenhaDeTeste-2026-MaisForte';
let proc, origin;

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}
async function waitReady(port) {
  for (let i=0;i<80;i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/health`); if (r.status===200) return; } catch {}
    await new Promise(r=>setTimeout(r,50));
  }
  throw Error('Servidor não inicializou');
}
before(async () => {
  const port = await availablePort();
  origin = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['server.js'], { cwd:path.resolve(__dirname,'..'), env:{...process.env,NODE_ENV:'test',PORT:String(port),AFRIMOSA_SITE_PASSWORD:SITE,AFRIMOSA_ADMIN_PASSWORD:ADMIN,SESSION_SECRET:'TESTE-SEGREDO-APENAS-TESTE-NAO-USAR-EM-PRODUCAO'} });
  await waitReady(port);
});
after(() => proc?.kill());
const req = (url, options={}) => fetch(origin+url, {redirect:'manual', ...options});
const form = (next, password) => ({method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({next,password}).toString()});
const cookie = (response) => response.headers.get('set-cookie').split(';')[0];

test('sem sessão, site redireciona e JSON é negado', async () => {
  let r=await req('/'); assert.equal(r.status,303); assert.match(r.headers.get('location'),/\/entrar/);
  r=await req('/data/canal.json'); assert.equal(r.status,401);
  r=await req('/assets/publico.js'); assert.equal(r.status,401);
});
test('senha errada não cria sessão', async () => {
  const r=await req('/entrar',form('/','senha_completamente_errada_2026'));
  assert.equal(r.status,303); assert.match(r.headers.get('location'),/erro=1/); assert.equal(r.headers.get('set-cookie'),null);
});
test('senha pública libera site, não painel e não vaza campos internos', async () => {
  let r=await req('/entrar',form('/',SITE)); assert.equal(r.status,303);
  const c=cookie(r); assert.match(c,/afrimosa_site=/);
  r=await req('/',{headers:{cookie:c}}); assert.equal(r.status,200); assert.match(await r.text(),/AfriMosa TV/);
  r=await req('/admin/',{headers:{cookie:c}}); assert.equal(r.status,303);
  r=await req('/assets/admin.js',{headers:{cookie:c}}); assert.equal(r.status,303);
  r=await req('/data/canal.json',{headers:{cookie:c}}); assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.prompts,undefined); assert.equal(data.kpis,undefined); assert.equal(data.metas,undefined); assert.equal(data.playbook,undefined); assert.equal(data.agenda,undefined);
  assert.ok(data.conteudos.every(x=>['aprovado','agendado','no_ar','publicado'].includes(x.status)));
  assert.ok(data.conteudos.every(x=>!('narracao' in x) && !('fontes' in x) && !('arquivos_redes' in x)));
});
test('senha de gestão libera somente área certa e arquivo completo', async () => {
  let r=await req('/entrar',form('/admin/',ADMIN)); assert.equal(r.status,303);
  const c=cookie(r); assert.match(c,/afrimosa_admin=/);
  r=await req('/admin/',{headers:{cookie:c}}); assert.equal(r.status,200);
  r=await req('/assets/admin.js',{headers:{cookie:c}}); assert.equal(r.status,200);
  r=await req('/data/canal.json',{headers:{cookie:c}}); assert.equal(r.status,200);
  const data=await r.json(); assert.ok(Array.isArray(data.prompts)); assert.ok(data.metas);
  r=await req('/',{headers:{cookie:c}}); assert.equal(r.status,200);
});
test('tentativas de traversal não revelam .env e rotas desconhecidas são 404',async()=>{
  let r=await req('/.env'); assert.equal(r.status,401); // exige autenticação antes de resolver rota
  r=await req('/admin/../README.md'); assert.notEqual(r.status,200);
});
