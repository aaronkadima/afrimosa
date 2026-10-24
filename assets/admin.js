// Gestão da AfriMosa TV — funciona só no navegador (GitHub Pages), sem servidor.
// Os dados vêm de data/canal.json; as edições ficam num rascunho no navegador até você
// salvar no GitHub ou baixar o arquivo.
(() => {
  "use strict";
  const ARQ = "../data/canal.json";
  const CH_RASCUNHO = "afrimosa_rascunho_v1";
  const CH_GITHUB = "afrimosa_github_v1";
  const STATUS = [
    ["ideia", "Ideia"], ["roteiro", "Roteiro"], ["producao", "Em produção"], ["previa", "Prévia"],
    ["aprovado", "Aprovado"], ["agendado", "Agendado"], ["no_ar", "No ar / publicado"],
  ];
  const NOME_ST = Object.fromEntries(STATUS);
  const TIPOS = { reportagem: "Reportagem", licao: "Lição", curiosidade: "Curiosidade", top10: "Top 10", social: "Redes sociais", outro: "Outro" };
  const CAT_PROMPT = { powershell: "PowerShell", narracao: "Narração", video: "Vídeo (IA)", redes: "Redes sociais", roteiro: "Roteiro (IA)" };
  const REDES = ["youtube", "instagram", "tiktok", "facebook"];

  let D = null;            // dados em edição
  let sujo = false;        // há alterações não enviadas
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const fmtData = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : "";
  const num = (n) => Number(n || 0).toLocaleString("pt-BR");
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* navegador sem armazenamento */ } };
  const ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const apagar = (k) => { try { localStorage.removeItem(k); } catch (e) { /* */ } };

  function toast(t) {
    const el = $("#toast"); el.textContent = t; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), 2200);
  }
  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); toast("Copiado!"); }
    catch (e) { const a = document.createElement("textarea"); a.value = t; document.body.append(a); a.select(); document.execCommand("copy"); a.remove(); toast("Copiado!"); }
  }
  function mudou() {
    sujo = true;
    D.atualizado_plataforma = new Date().toISOString();
    guardar(CH_RASCUNHO, JSON.stringify(D));
    estado();
  }
  function estado() {
    $("#estado").innerHTML = `Dados de <b>${esc((D.atualizado || "").replace("T", " ").slice(0, 16))}</b><br>` +
      (sujo ? `<span style="color:var(--laranja)">● Alterações não enviadas</span><br><a href="#" id="ir-salvar">Salvar no GitHub</a>` : `<span style="color:var(--ok)">● Tudo salvo</span>`);
    const b = $("#ir-salvar"); if (b) b.onclick = (e) => { e.preventDefault(); abrir("config"); };
  }

  // ------------------------------------------------------------------ carregar
  async function carregar() {
    let arquivo = null;
    try { arquivo = await (await fetch(ARQ, { cache: "no-store" })).json(); } catch (e) { /* */ }
    const r = ler(CH_RASCUNHO);
    let rasc = null;
    try { rasc = r ? JSON.parse(r) : null; } catch (e) { rasc = null; }
    if (rasc && arquivo) {
      D = arquivo;
      const av = $("#aviso-rascunho");
      av.hidden = false;
      av.innerHTML = `Você tem alterações feitas neste navegador em ${esc((rasc.atualizado_plataforma || "").slice(0, 16).replace("T", " "))} que ainda não foram salvas no GitHub.
        <button class="botao peq" id="usar-rasc">Continuar com elas</button><button class="botao sec peq" id="desc-rasc">Descartar</button>`;
      $("#usar-rasc").onclick = () => { D = rasc; sujo = true; av.hidden = true; tudo(); };
      $("#desc-rasc").onclick = () => { apagar(CH_RASCUNHO); av.hidden = true; tudo(); };
    } else {
      D = arquivo || rasc;
      sujo = !arquivo && !!rasc;
    }
    if (!D) {
      $("#aba-painel").innerHTML = `<div class="aviso">Não encontrei <b>data/canal.json</b>. Gere com
        <code>python -m afrimosa plataforma exportar</code> e envie para o GitHub, ou importe o arquivo em Configurações.</div>`;
      D = { canal: {}, grade: { faixas: [], quadros: [] }, conteudos: [], prompts: [], agenda: [], kpis: [], checklists: {}, metas: {}, playbook: [] };
    }
    for (const k of ["conteudos", "prompts", "agenda", "kpis", "playbook"]) D[k] = D[k] || [];
    D.checklists = D.checklists || {}; D.metas = D.metas || {}; D.canal = D.canal || {};
    tudo();
  }
  function tudo() { estado(); painel(); conteudos(); agenda(); prompts(); grade(); metas(); manual(); config(); }

  function abrir(aba) {
    $$("#abas button").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
    $$(".aba").forEach((s) => (s.hidden = s.id !== `aba-${aba}`));
    guardar("afrimosa_aba", aba);
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ painel
  function painel() {
    const cs = D.conteudos;
    const cont = (f) => cs.filter(f).length;
    const k = D.kpis.slice().sort((a, b) => (a.data > b.data ? 1 : -1)).pop() || {};
    const m = D.metas;
    const h = hoje();
    const prox = proximos(14);
    const pend = cs.filter((c) => c.status === "previa").slice(0, 8);
    $("#aba-painel").innerHTML = `
      <div class="cab"><div><span class="rotulo">Visão geral</span><h1>Painel do canal</h1></div>
        <div class="acoes"><button class="botao" data-ir="conteudos">+ Novo conteúdo</button><a class="botao sec" href="../index.html" target="_blank">Ver o site</a></div></div>
      <div class="numeros">
        <div class="cartao numero"><b>${cont((c) => c.status === "no_ar")}</b><span>no ar</span></div>
        <div class="cartao numero"><b>${cont((c) => c.status === "aprovado")}</b><span>aprovados</span></div>
        <div class="cartao numero"><b>${cont((c) => c.status === "agendado")}</b><span>agendados</span></div>
        <div class="cartao numero"><b>${cont((c) => ["producao", "previa"].includes(c.status))}</b><span>em produção</span></div>
        <div class="cartao numero"><b>${cont((c) => ["ideia", "roteiro"].includes(c.status))}</b><span>roteiros e ideias</span></div>
        <div class="cartao numero"><b>${num(k.inscritos)}</b><span>inscritos (último registro)</span></div>
      </div>
      <div class="duas">
        <div class="cartao"><h3>Monetização</h3>${barrasMeta(k, m)}
          <p class="muted" style="font-size:.8rem">${esc(m.nota_ypp || "")}</p></div>
        <div class="cartao"><h3>Próximos 14 dias</h3>
          ${prox.length ? `<table class="tabela">${prox.map((p) => `<tr><td>${fmtData(p.data)} ${esc(p.hora || "")}</td><td><b>${esc(p.titulo)}</b><br><small class="muted">${esc(p.onde)}</small></td></tr>`).join("")}</table>`
            : `<p class="muted">Nada agendado. Agende conteúdos em <a href="#" data-ir="agenda">Agenda</a>.</p>`}</div>
        <div class="cartao"><h3>Prévias esperando aprovação</h3>
          ${pend.length ? pend.map((c) => `<div class="item" data-id="${esc(c.id)}" data-tipo="${c.tipo}"><b>${esc(c.titulo)}</b><small>${TIPOS[c.tipo] || c.tipo}</small></div>`).join("")
            : `<p class="muted">Nenhuma prévia pendente.</p>`}</div>
        <div class="cartao"><h3>Rotina de hoje</h3>${rotinaHoje()}</div>
      </div>`;
    ligarComuns($("#aba-painel"));
  }
  function barrasMeta(k, m) {
    const linha = (rot, v, alvo) => {
      const p = alvo ? Math.min(100, (Number(v || 0) / alvo) * 100) : 0;
      return `<div class="meta-linha"><div class="t"><span>${rot}</span><span>${num(v)} / ${num(alvo)}</span></div><div class="barra"><i style="width:${p}%"></i></div></div>`;
    };
    const prazo = m.prazo_ypp ? Math.ceil((new Date(m.prazo_ypp + "T23:59:00") - new Date()) / 86400000) : null;
    return linha("Inscritos (Programa de Parcerias)", k.inscritos, m.inscritos_meta) +
      linha("Horas de exibição (12 meses)", k.horas, m.horas_meta) +
      linha("Views de Shorts (90 dias)", k.shorts_90d, m.shorts_meta) +
      (prazo !== null ? `<p class="rotulo" style="margin-top:6px">${prazo > 0 ? `${prazo} dias até ${fmtData(m.prazo_ypp)}` : "Prazo de referência passou"}</p>` : "");
  }
  function rotinaHoje() {
    const sec = (D.playbook || []).find((s) => s.id === "semana");
    if (!sec) return `<p class="muted">—</p>`;
    const dia = new Date().toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).split("-")[0];
    const itens = sec.itens.filter((t) => t.toLowerCase().startsWith(dia.toLowerCase()) || t.startsWith("Todo dia"));
    return itens.length ? itens.map((t) => `<p>• ${esc(t)}</p>`).join("") : `<p class="muted">Dia livre: revise a live e os comentários.</p>`;
  }
  function proximos(dias) {
    const h = hoje();
    const lim = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
    const a = D.conteudos.filter((c) => c.data_agendada && c.data_agendada >= h && c.data_agendada <= lim)
      .map((c) => ({ data: c.data_agendada, hora: c.hora_agendada, titulo: c.titulo, onde: (c.redes || []).join(", ") || TIPOS[c.tipo] }));
    const b = D.agenda.filter((x) => x.data >= h && x.data <= lim).map((x) => ({ data: x.data, hora: x.hora, titulo: x.titulo, onde: x.plataforma }));
    return a.concat(b).sort((x, y) => (x.data + (x.hora || "") > y.data + (y.hora || "") ? 1 : -1));
  }
  function ligarComuns(raiz) {
    $$("[data-ir]", raiz).forEach((b) => (b.onclick = (e) => {
      e.preventDefault(); abrir(b.dataset.ir); if (b.dataset.ir === "conteudos" && b.textContent.includes("Novo")) editar(null);
    }));
    $$(".item[data-id]", raiz).forEach((el) => (el.onclick = () => editar(el.dataset.id)));
  }

  // ------------------------------------------------------------------ conteúdos
  const filtro = { tipo: "", status: "", busca: "", serie: "" };
  function conteudos() {
    const series = [...new Set(D.conteudos.map((c) => c.serie).filter(Boolean))].sort();
    $("#aba-conteudos").innerHTML = `
      <div class="cab"><div><span class="rotulo">Produção</span><h1>Conteúdos</h1></div>
        <div class="acoes"><button class="botao" id="novo">+ Novo conteúdo</button></div></div>
      <div class="filtros">
        <input id="f-busca" placeholder="Buscar título…" value="${esc(filtro.busca)}">
        <select id="f-tipo"><option value="">Todos os tipos</option>${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}" ${filtro.tipo === k ? "selected" : ""}>${v}</option>`).join("")}</select>
        <select id="f-serie"><option value="">Todas as séries</option>${series.map((s) => `<option ${filtro.serie === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>
      </div>
      <p class="muted" style="font-size:.82rem">Arraste um cartão para outra coluna para mudar o status. O status calculado pelo programa (prévia, no ar…) é atualizado a cada exportação; o que você mudar aqui fica marcado como manual.</p>
      <div class="kanban" id="kanban"></div>`;
    $("#novo").onclick = () => editar(null);
    const at = () => { filtro.busca = $("#f-busca").value; filtro.tipo = $("#f-tipo").value; filtro.serie = $("#f-serie").value; desenharKanban(); };
    $("#f-busca").oninput = at; $("#f-tipo").onchange = at; $("#f-serie").onchange = at;
    desenharKanban();
  }
  function desenharKanban() {
    const b = filtro.busca.toLowerCase();
    const lista = D.conteudos.filter((c) => (!filtro.tipo || c.tipo === filtro.tipo) && (!filtro.serie || c.serie === filtro.serie)
      && (!b || (c.titulo || "").toLowerCase().includes(b)));
    $("#kanban").innerHTML = STATUS.map(([st, nome]) => {
      const col = lista.filter((c) => (c.status || "ideia") === st);
      const max = 60;
      return `<div class="coluna" data-st="${st}"><h3>${nome}<span>${col.length}</span></h3>
        ${col.slice(0, max).map((c) => `<div class="item" draggable="true" data-id="${esc(c.id)}" data-tipo="${esc(c.tipo)}">
          <b>${esc(c.titulo)}</b><small>${esc(TIPOS[c.tipo] || c.tipo)}${c.serie ? " · " + esc(c.serie) : ""}${c.data_agendada ? " · 📅 " + fmtData(c.data_agendada) : ""}</small></div>`).join("")}
        ${col.length > max ? `<small class="muted">+ ${col.length - max} (use a busca)</small>` : ""}</div>`;
    }).join("");
    $$("#kanban .item").forEach((el) => {
      el.onclick = () => editar(el.dataset.id);
      el.ondragstart = (e) => e.dataTransfer.setData("text/plain", el.dataset.id);
    });
    $$("#kanban .coluna").forEach((col) => {
      col.ondragover = (e) => { e.preventDefault(); col.classList.add("alvo"); };
      col.ondragleave = () => col.classList.remove("alvo");
      col.ondrop = (e) => {
        e.preventDefault(); col.classList.remove("alvo");
        const c = D.conteudos.find((x) => x.id === e.dataTransfer.getData("text/plain"));
        if (c && c.status !== col.dataset.st) { c.status = col.dataset.st; c.status_manual = true; mudou(); desenharKanban(); painel(); }
      };
    });
  }

  function editar(id) {
    let c = D.conteudos.find((x) => x.id === id);
    const novo = !c;
    if (novo) c = { id: uid("item"), tipo: "reportagem", titulo: "", serie: "", status: "ideia", origem: "manual", roteiro: { abertura: "", capitulos: [{ titulo: "", texto: "" }], fechamento: "" } };
    const r = c.roteiro;
    const caps = r ? r.capitulos : null;
    $("#modal-corpo").innerHTML = `
      <div class="cab" style="margin:0"><div><span class="rotulo">${novo ? "Novo conteúdo" : esc(TIPOS[c.tipo] || c.tipo)} ${c.origem === "programa" ? "· vem do programa" : ""}</span>
        <h2 style="margin:4px 0 0">${esc(c.titulo || "Sem título")}</h2></div><button class="botao sec peq" value="fechar">Fechar ✕</button></div>
      <div class="campos">
        <label class="largo">Título<input id="e-titulo" value="${esc(c.titulo)}"></label>
        <label>Tipo<select id="e-tipo">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}" ${c.tipo === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Série / quadro<input id="e-serie" value="${esc(c.serie || "")}"></label>
        <label>Status<select id="e-status">${STATUS.map(([k, v]) => `<option value="${k}" ${c.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Id (programa)<input id="e-id" value="${esc(c.id)}" ${c.origem === "programa" ? "disabled" : ""}></label>
        <label>Data agendada<input type="date" id="e-data" value="${esc(c.data_agendada || "")}"></label>
        <label>Hora<input type="time" id="e-hora" value="${esc(c.hora_agendada || "")}"></label>
        <div class="largo"><span class="muted" style="font-size:.8rem">Publicar em:</span>
          ${REDES.map((rd) => `<label style="display:inline-flex;gap:6px;align-items:center;margin-right:14px"><input type="checkbox" class="e-rede" value="${rd}" ${(c.redes || []).includes(rd) ? "checked" : ""}>${rd}</label>`).join("")}</div>
        <label class="largo">Notas<textarea id="e-notas" rows="2">${esc(c.notas || "")}</textarea></label>
      </div>
      ${r ? `<h3>Roteiro</h3>
        <label>Abertura<textarea id="e-abertura" rows="2">${esc(r.abertura || "")}</textarea></label>
        <div id="e-caps">${caps.map((cp, i) => capEdit(cp, i)).join("")}</div>
        <div><button type="button" class="botao sec peq" id="e-add-cap">+ Capítulo</button></div>
        <label>Fechamento<textarea id="e-fechamento" rows="2">${esc(r.fechamento || "")}</textarea></label>` : ""}
      ${c.palavras ? `<h3>Palavras</h3><table class="tabela"><tr><th>Palavra</th><th>Pronúncia</th><th>Significado</th></tr>
        ${c.palavras.map((p) => `<tr><td>${esc(p.palavra)}</td><td>${esc(p.pronuncia)}</td><td>${esc(p.significado)}</td></tr>`).join("")}</table>` : ""}
      ${c.texto && !r ? `<h3>Texto</h3><p>${esc(c.texto)}</p>${(c.destaques || []).map((d) => `<p class="muted">• ${esc(d)}</p>`).join("")}` : ""}
      ${c.narracao ? `<p class="muted" style="font-size:.82rem">Narrações encontradas no PC: ${Object.entries(c.narracao).map(([k, v]) => `${k}${v ? " ✓" : " —"}`).join(" · ")}</p>` : ""}
      ${c.arquivos_redes && c.arquivos_redes.length ? `<p class="muted" style="font-size:.82rem">Arquivos para redes já gerados: ${c.arquivos_redes.length}</p>` : ""}
      <div class="linha-acoes">
        ${r ? `<button type="button" class="botao sec peq" id="b-narr">Copiar textos de narração</button>
               <button type="button" class="botao sec peq" id="b-yaml">Copiar roteiro (YAML)</button>` : ""}
        <button type="button" class="botao sec peq" id="b-cmd">Copiar comandos PowerShell</button>
        ${novo || c.origem !== "programa" ? `<button type="button" class="botao perigo peq" id="b-excluir" ${novo ? "hidden" : ""}>Excluir</button>` : ""}
        <button type="button" class="botao" id="b-salvar">Salvar</button>
      </div>`;
    const ler_ = () => {
      c.titulo = $("#e-titulo").value.trim(); c.tipo = $("#e-tipo").value; c.serie = $("#e-serie").value.trim();
      if (c.origem !== "programa") c.id = $("#e-id").value.trim() || c.id;
      const st = $("#e-status").value; if (st !== c.status) { c.status = st; c.status_manual = true; }
      c.data_agendada = $("#e-data").value || undefined; c.hora_agendada = $("#e-hora").value || undefined;
      if (c.data_agendada && ["ideia", "roteiro", "producao", "previa", "aprovado"].includes(c.status) && c.status === "aprovado") { c.status = "agendado"; c.status_manual = true; }
      c.redes = $$(".e-rede:checked").map((x) => x.value);
      c.notas = $("#e-notas").value;
      if (r) {
        r.abertura = $("#e-abertura").value; r.fechamento = $("#e-fechamento").value;
        r.capitulos = $$("#e-caps .cap-edit").map((el) => ({ titulo: $(".c-tit", el).value, texto: $(".c-txt", el).value, imagem: caps[Number(el.dataset.i)]?.imagem }));
      }
    };
    $("#modal").showModal();
    const addCap = $("#e-add-cap");
    if (addCap) addCap.onclick = () => { ler_(); r.capitulos.push({ titulo: "", texto: "" }); editarDeNovo(c, novo); };
    $$(".c-del").forEach((b) => (b.onclick = () => { ler_(); r.capitulos.splice(Number(b.dataset.i), 1); editarDeNovo(c, novo); }));
    if ($("#b-narr")) $("#b-narr").onclick = () => { ler_(); copiar(textoNarracao(c)); };
    if ($("#b-yaml")) $("#b-yaml").onclick = () => { ler_(); copiar(yamlRoteiro(c)); };
    $("#b-cmd").onclick = () => { ler_(); copiar(comandos(c)); };
    const bx = $("#b-excluir");
    if (bx) bx.onclick = () => { if (confirm("Excluir este conteúdo?")) { D.conteudos = D.conteudos.filter((x) => x !== c); mudou(); $("#modal").close(); conteudos(); painel(); agenda(); } };
    $("#b-salvar").onclick = () => {
      ler_();
      if (!c.titulo) { toast("Dê um título"); return; }
      if (novo && !D.conteudos.includes(c)) D.conteudos.unshift(c);
      mudou(); $("#modal").close(); conteudos(); painel(); agenda(); toast("Salvo no rascunho");
    };
    editar._pendente = { c, novo };
  }
  function editarDeNovo(c, novo) {
    if (novo && !D.conteudos.includes(c)) { D.conteudos.unshift(c); }
    $("#modal").close(); editar(c.id);
  }
  const capEdit = (cp, i) => `<div class="cap-edit" data-i="${i}"><div style="display:flex;gap:8px"><input class="c-tit" placeholder="Capítulo ${i + 1}: título" value="${esc(cp.titulo)}" style="flex:1">
    <button type="button" class="botao sec peq c-del" data-i="${i}">Remover</button></div>
    <textarea class="c-txt" rows="4" placeholder="Texto (vira legenda e narração)">${esc(cp.texto)}</textarea>
    <small class="muted">${(cp.texto || "").split(/\s+/).filter(Boolean).length} palavras · ideal 55–70</small></div>`;

  function textoNarracao(c) {
    const r = c.roteiro, extenso = (t) => t;
    const partes = [`[abertura] → narracao\\${c.id}\\abertura.mp3`, `${c.serie || ""}.\n\n${c.titulo}...\n\n${extenso(r.abertura || "")}`, ""];
    r.capitulos.forEach((cp, i) => partes.push(`[${i + 1}] ${cp.titulo} → narracao\\${c.id}\\${i + 1}.mp3`, extenso(cp.texto), ""));
    partes.push(`[fechamento] → narracao\\${c.id}\\fechamento.mp3`, r.fechamento || "");
    return partes.join("\n");
  }
  function yamlRoteiro(c) {
    const r = c.roteiro, q = (t) => JSON.stringify(String(t || ""));
    const linhas = [`- id: ${c.id}`, `  titulo: ${q(c.titulo)}`, `  abertura: ${q(r.abertura)}`];
    if (r.fechamento) linhas.push(`  fechamento: ${q(r.fechamento)}`);
    linhas.push("  capitulos:");
    r.capitulos.forEach((cp) => {
      linhas.push(`    - titulo: ${q(cp.titulo)}`);
      if (cp.imagem) linhas.push(`      imagem: ${JSON.stringify(cp.imagem).replace(/"(\w+)":/g, "$1: ")}`);
      linhas.push(`      texto: >-`, ...String(cp.texto || "").match(/.{1,90}(\s|$)/g)?.map((l) => "        " + l.trim()) || ["        "]);
    });
    return `# Cole em dados\\reportagens\\minhas.yaml (abaixo de "episodios:"; série: ${c.serie || "—"})\n` + linhas.join("\n");
  }
  function comandos(c) {
    const id = c.id;
    if (c.tipo === "reportagem") return [
      `python -m afrimosa reportagens roteiro ${id}`, `python -m afrimosa reportagens previa ${id}`,
      `python -m afrimosa reportagens aprovar ${id}`, `python -m afrimosa social reportagem ${id}`].join("\n");
    if (c.tipo === "licao") {
      const lg = (id.split("-")[1] || "lingala"); return [`python -m afrimosa linguas previa ${lg} ${c.licao}`,
        `python -m afrimosa linguas aprovar ${lg} ${c.licao}`, `python -m afrimosa social linguas ${lg} ${c.licao}`].join("\n");
    }
    if (c.tipo === "curiosidade") return [`python -m afrimosa curiosidades previa ${id}`, `python -m afrimosa curiosidades aprovar ${id}`, `python -m afrimosa social curiosidades ${id}`].join("\n");
    if (c.tipo === "top10") return [`python -m afrimosa top10 previa ${id}`, `python -m afrimosa top10 aprovar ${id}`].join("\n");
    return `# sem comandos para este tipo`;
  }

  // ------------------------------------------------------------------ agenda
  function agenda() {
    const h = hoje();
    const itens = D.conteudos.filter((c) => c.data_agendada).map((c) => ({ ref: c, data: c.data_agendada, hora: c.hora_agendada, titulo: c.titulo, onde: (c.redes || []).join(", ") || "—", st: c.status, tipo: "conteudo" }))
      .concat(D.agenda.map((x) => ({ ref: x, data: x.data, hora: x.hora, titulo: x.titulo, onde: x.plataforma, st: x.status, tipo: "agenda" })))
      .sort((a, b) => (a.data + (a.hora || "") > b.data + (b.hora || "") ? 1 : -1));
    const futuros = itens.filter((i) => i.data >= h), passados = itens.filter((i) => i.data < h).reverse().slice(0, 20);
    const linha = (i) => `<tr><td>${fmtData(i.data)}</td><td>${esc(i.hora || "")}</td><td><b>${esc(i.titulo)}</b></td><td>${esc(i.onde || "")}</td>
      <td><span class="etq st-${esc(i.st)}">${esc(NOME_ST[i.st] || i.st || "")}</span></td>
      <td>${i.tipo === "conteudo" ? `<button class="botao sec peq" data-abre="${esc(i.ref.id)}">Abrir</button>` : `<button class="botao sec peq" data-del="${D.agenda.indexOf(i.ref)}">Remover</button>`}</td></tr>`;
    $("#aba-agenda").innerHTML = `
      <div class="cab"><div><span class="rotulo">Calendário</span><h1>Agenda de publicações</h1></div></div>
      <div class="cartao" style="margin-bottom:18px"><h3>Novo agendamento</h3>
        <div class="campos">
          <label>Data<input type="date" id="a-data" value="${h}"></label><label>Hora<input type="time" id="a-hora" value="19:00"></label>
          <label>Onde<select id="a-onde"><option>YouTube (vídeo)</option><option>YouTube (Short)</option><option>YouTube (Comunidade)</option><option>Live</option><option>Instagram (reel)</option><option>Instagram (carrossel)</option><option>TikTok</option><option>Facebook</option></select></label>
          <label class="largo">O quê<input id="a-tit" placeholder="Ex.: Reel Parte 1/4 · A luta do século"></label>
        </div><div class="linha-acoes" style="margin-top:10px"><button class="botao" id="a-add">Agendar</button></div>
        <p class="muted" style="font-size:.8rem;margin:8px 0 0">Para agendar um conteúdo do quadro de produção, abra o conteúdo e preencha a data.</p></div>
      <div class="cartao rolagem"><h3>Próximos</h3>${futuros.length ? `<table class="tabela"><tr><th>Data</th><th>Hora</th><th>Conteúdo</th><th>Onde</th><th>Status</th><th></th></tr>${futuros.map(linha).join("")}</table>` : `<p class="muted">Nada agendado ainda.</p>`}</div>
      ${passados.length ? `<div class="cartao rolagem" style="margin-top:18px"><h3>Últimos</h3><table class="tabela">${passados.map(linha).join("")}</table></div>` : ""}`;
    $("#a-add").onclick = () => {
      const t = $("#a-tit").value.trim(); if (!t) { toast("Descreva o que vai ser publicado"); return; }
      D.agenda.push({ id: uid("ag"), data: $("#a-data").value, hora: $("#a-hora").value, plataforma: $("#a-onde").value, titulo: t, status: "agendado" });
      mudou(); agenda(); painel(); toast("Agendado");
    };
    $$("[data-abre]", $("#aba-agenda")).forEach((b) => (b.onclick = () => editar(b.dataset.abre)));
    $$("[data-del]", $("#aba-agenda")).forEach((b) => (b.onclick = () => { D.agenda.splice(Number(b.dataset.del), 1); mudou(); agenda(); painel(); }));
  }

  // ------------------------------------------------------------------ prompts
  const fp = { cat: "powershell", busca: "" };
  function prompts() {
    const b = fp.busca.toLowerCase();
    const lista = D.prompts.filter((p) => (!fp.cat || p.categoria === fp.cat) && (!b || (p.titulo + p.texto + (p.tags || []).join(" ")).toLowerCase().includes(b)));
    $("#aba-prompts").innerHTML = `
      <div class="cab"><div><span class="rotulo">Biblioteca</span><h1>Prompts e comandos</h1></div>
        <div class="acoes"><button class="botao" id="p-novo">+ Novo prompt</button></div></div>
      <div class="filtros">${Object.entries(CAT_PROMPT).map(([k, v]) => `<button class="botao ${fp.cat === k ? "" : "sec"} peq" data-cat="${k}">${v} (${D.prompts.filter((p) => p.categoria === k).length})</button>`).join("")}
        <button class="botao ${!fp.cat ? "" : "sec"} peq" data-cat="">Todos</button><input id="p-busca" placeholder="Buscar…" value="${esc(fp.busca)}"></div>
      <p class="muted" style="font-size:.82rem">Campos entre chaves, como <code>{id}</code>, viram caixas para preencher antes de copiar.</p>
      <div class="prompts">${lista.map(promptCard).join("") || `<p class="muted">Nenhum prompt aqui.</p>`}</div>`;
    $$("[data-cat]").forEach((x) => (x.onclick = () => { fp.cat = x.dataset.cat; prompts(); }));
    $("#p-busca").oninput = (e) => { fp.busca = e.target.value; const pos = e.target.selectionStart; prompts(); const i = $("#p-busca"); i.focus(); i.setSelectionRange(pos, pos); };
    $("#p-novo").onclick = () => editarPrompt(null);
    $$(".prompt").forEach((el) => {
      const p = D.prompts.find((x) => x.id === el.dataset.id);
      const preencher = () => {
        let t = p.texto;
        $$(".var", el).forEach((v) => { if (v.value) t = t.split(`{${v.dataset.v}}`).join(v.value); });
        $("pre", el).textContent = t; return t;
      };
      $$(".var", el).forEach((v) => (v.oninput = preencher));
      $(".p-copiar", el).onclick = () => copiar(preencher());
      $(".p-editar", el).onclick = () => editarPrompt(p);
    });
  }
  function promptCard(p) {
    const vars = [...new Set((p.texto.match(/\{([a-z_]+)\}/g) || []).map((v) => v.slice(1, -1)))];
    return `<div class="cartao prompt" data-id="${esc(p.id)}"><span class="rotulo">${esc(CAT_PROMPT[p.categoria] || p.categoria)}</span>
      <h3 style="margin-top:6px">${esc(p.titulo)}</h3>
      ${vars.length ? `<div class="vars">${vars.map((v) => `<input class="var" data-v="${v}" placeholder="${v}">`).join("")}</div>` : ""}
      <pre>${esc(p.texto)}</pre>${p.nota ? `<p class="nota">${esc(p.nota)}</p>` : ""}
      <div class="rodape-p"><button class="botao peq p-copiar">Copiar</button><button class="botao sec peq p-editar">Editar</button>
      ${(p.tags || []).map((t) => `<span class="etq">${esc(t)}</span>`).join("")}</div></div>`;
  }
  function editarPrompt(p) {
    const novo = !p;
    p = p || { id: uid("p"), categoria: fp.cat || "powershell", titulo: "", texto: "", tags: [], nota: "" };
    $("#modal-corpo").innerHTML = `<div class="cab" style="margin:0"><h2>${novo ? "Novo prompt" : "Editar prompt"}</h2><button class="botao sec peq" value="fechar">Fechar ✕</button></div>
      <div class="campos"><label>Categoria<select id="pp-cat">${Object.entries(CAT_PROMPT).map(([k, v]) => `<option value="${k}" ${p.categoria === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="largo">Título<input id="pp-tit" value="${esc(p.titulo)}"></label>
      <label class="largo">Texto<textarea id="pp-txt" rows="10">${esc(p.texto)}</textarea></label>
      <label class="largo">Nota (opcional)<input id="pp-nota" value="${esc(p.nota || "")}"></label>
      <label class="largo">Etiquetas (separadas por vírgula)<input id="pp-tags" value="${esc((p.tags || []).join(", "))}"></label></div>
      <div class="linha-acoes">${novo ? "" : `<button type="button" class="botao perigo peq" id="pp-del">Excluir</button>`}<button type="button" class="botao" id="pp-ok">Salvar</button></div>`;
    $("#modal").showModal();
    $("#pp-ok").onclick = () => {
      p.categoria = $("#pp-cat").value; p.titulo = $("#pp-tit").value.trim(); p.texto = $("#pp-txt").value; p.nota = $("#pp-nota").value;
      p.tags = $("#pp-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
      if (!p.titulo || !p.texto) { toast("Preencha título e texto"); return; }
      if (novo) D.prompts.unshift(p);
      mudou(); $("#modal").close(); prompts(); toast("Prompt salvo");
    };
    const del = $("#pp-del");
    if (del) del.onclick = () => { if (confirm("Excluir este prompt?")) { D.prompts = D.prompts.filter((x) => x !== p); mudou(); $("#modal").close(); prompts(); } };
  }

  // ------------------------------------------------------------------ grade
  function grade() {
    const g = D.grade || {};
    const hh = (h) => `${String(h).padStart(2, "0")}h`;
    $("#aba-grade").innerHTML = `
      <div class="cab"><div><span class="rotulo">Programação</span><h1>Grade e quadros</h1></div>
        <div class="acoes"><button class="botao sec" id="g-yaml">Copiar faixas (YAML)</button></div></div>
      <p class="muted" style="font-size:.85rem">A grade vem do <code>config\\grade.yaml</code> do programa. Para mudar horários e pesos, edite lá e exporte de novo.</p>
      <div class="cartao rolagem"><h3>Faixas do dia</h3><table class="tabela"><tr><th></th><th>Horário</th><th>Faixa</th><th>Quadros</th></tr>
        ${(g.faixas || []).map((f) => `<tr><td><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${esc(f.cor)}"></span></td>
          <td>${hh(f.inicio)}–${hh(f.fim)}</td><td><b>${esc(f.nome)}</b></td><td class="muted">${(f.quadros || []).map(esc).join(" · ")}</td></tr>`).join("")}</table></div>
      <div class="cartao rolagem" style="margin-top:18px"><h3>Quadros</h3><table class="tabela"><tr><th>Quadro</th><th>Tipo</th><th>Peças aprovadas no acervo</th><th>Conteúdos na plataforma</th></tr>
        ${(g.quadros || []).map((q) => `<tr><td><b>${esc(q.nome)}</b></td><td class="muted">${esc(q.tipo)}</td><td>${num(q.no_acervo)}</td>
          <td>${num(D.conteudos.filter((c) => c.serie === q.nome || c.tipo === q.id).length)}</td></tr>`).join("")}</table></div>
      <div class="cartao" style="margin-top:18px"><h3>Intervalos</h3><pre style="white-space:pre-wrap;color:var(--creme)">${esc(JSON.stringify(g.intervalos || {}, null, 1))}</pre></div>`;
    $("#g-yaml").onclick = () => copiar("faixas:\n" + (g.faixas || []).map((f) => `  - nome: ${f.nome}\n    inicio: ${f.inicio}\n    fim: ${f.fim}\n    cor: "${f.cor}"`).join("\n"));
  }

  // ------------------------------------------------------------------ metas
  function metas() {
    const m = D.metas;
    const ks = D.kpis.slice().sort((a, b) => (a.data > b.data ? 1 : -1));
    const ult = ks[ks.length - 1] || {};
    const prazo = m.prazo_ypp ? Math.max(1, Math.ceil((new Date(m.prazo_ypp + "T23:59:00") - new Date()) / 86400000)) : null;
    const falta = (v, alvo) => Math.max(0, (alvo || 0) - Number(v || 0));
    $("#aba-metas").innerHTML = `
      <div class="cab"><div><span class="rotulo">Resultados</span><h1>Metas e números</h1></div></div>
      <div class="duas">
        <div class="cartao"><h3>Programa de Parcerias</h3>${barrasMeta(ult, m)}
          ${prazo ? `<p>Para chegar até <b>${fmtData(m.prazo_ypp)}</b> (${prazo} dias), o canal precisa de, por dia:</p>
          <p>• <b>${num(Math.ceil(falta(ult.inscritos, m.inscritos_meta) / prazo))}</b> inscritos &nbsp; • <b>${num(Math.ceil(falta(ult.horas, m.horas_meta) / prazo))}</b> horas de exibição</p>
          <p class="muted" style="font-size:.82rem">Uma live 24h com 10 pessoas assistindo ao mesmo tempo soma cerca de 240 horas por dia.</p>` : ""}
          <p class="muted" style="font-size:.8rem">${esc(m.nota_ypp || "")}</p></div>
        <div class="cartao"><h3>Registrar números (YouTube Studio)</h3>
          <div class="campos"><label>Data<input type="date" id="k-data" value="${hoje()}"></label>
            <label>Inscritos<input type="number" id="k-insc" value="${esc(ult.inscritos || "")}"></label>
            <label>Horas (12 meses)<input type="number" id="k-horas" value="${esc(ult.horas || "")}"></label>
            <label>Views de Shorts (90 dias)<input type="number" id="k-shorts" value="${esc(ult.shorts_90d || "")}"></label>
            <label>CTR das miniaturas (%)<input type="number" step="0.1" id="k-ctr"></label>
            <label>Retenção média (%)<input type="number" step="0.1" id="k-ret"></label>
            <label>Espectadores na live (pico)<input type="number" id="k-live"></label>
            <label>Receita do mês (R$)<input type="number" step="0.01" id="k-rec"></label>
            <label class="largo">O que foi testado nesta semana<input id="k-teste"></label></div>
          <div class="linha-acoes" style="margin-top:10px"><button class="botao" id="k-add">Registrar</button></div></div>
      </div>
      <div class="cartao" style="margin-top:18px"><h3>Evolução</h3>${grafico(ks)}</div>
      <div class="cartao rolagem" style="margin-top:18px"><h3>Histórico</h3>${ks.length ? `<table class="tabela"><tr><th>Data</th><th>Inscritos</th><th>Horas</th><th>Shorts 90d</th><th>CTR</th><th>Retenção</th><th>Live</th><th>Receita</th><th>Teste</th><th></th></tr>
        ${ks.slice().reverse().map((k) => `<tr><td>${fmtData(k.data)}</td><td>${num(k.inscritos)}</td><td>${num(k.horas)}</td><td>${num(k.shorts_90d)}</td><td>${k.ctr ?? ""}</td><td>${k.retencao ?? ""}</td><td>${k.live ?? ""}</td><td>${k.receita ?? ""}</td><td class="muted">${esc(k.teste || "")}</td>
        <td><button class="botao sec peq" data-k="${esc(k.data)}">×</button></td></tr>`).join("")}</table>` : `<p class="muted">Registre os números uma vez por semana (segunda-feira).</p>`}</div>`;
    $("#k-add").onclick = () => {
      const v = (s) => ($(s).value === "" ? undefined : Number($(s).value));
      const k = { data: $("#k-data").value, inscritos: v("#k-insc"), horas: v("#k-horas"), shorts_90d: v("#k-shorts"), ctr: v("#k-ctr"), retencao: v("#k-ret"), live: v("#k-live"), receita: v("#k-rec"), teste: $("#k-teste").value };
      D.kpis = D.kpis.filter((x) => x.data !== k.data).concat([k]); mudou(); metas(); painel(); toast("Números registrados");
    };
    $$("[data-k]", $("#aba-metas")).forEach((b) => (b.onclick = () => { D.kpis = D.kpis.filter((x) => x.data !== b.dataset.k); mudou(); metas(); painel(); }));
  }
  function grafico(ks) {
    if (ks.length < 2) return `<p class="muted">O gráfico aparece a partir de dois registros.</p>`;
    const W = 800, H = 200, P = 30;
    const serie = (campo, cor) => {
      const vs = ks.map((k) => Number(k[campo] || 0)); const mx = Math.max(...vs) || 1;
      const pts = vs.map((v, i) => `${P + (i / (vs.length - 1)) * (W - 2 * P)},${H - P - (v / mx) * (H - 2 * P)}`).join(" ");
      return `<polyline fill="none" stroke="${cor}" stroke-width="3" points="${pts}"/>`;
    };
    return `<svg class="grafico" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${serie("inscritos", "#FBAF29")}${serie("horas", "#E77F33")}${serie("shorts_90d", "#7a9cc6")}</svg>
      <p class="muted" style="font-size:.8rem"><span style="color:#FBAF29">■</span> inscritos &nbsp; <span style="color:#E77F33">■</span> horas &nbsp; <span style="color:#7a9cc6">■</span> Shorts (cada linha na própria escala)</p>`;
  }

  // ------------------------------------------------------------------ manual
  function manual() {
    const ck = D.checklists;
    $("#aba-manual").innerHTML = `
      <div class="cab"><div><span class="rotulo">Como gerir um canal que cresce</span><h1>Manual do gestor</h1></div></div>
      <p class="muted">Práticas de quem gere canais grandes: constância, séries, um teste por semana, decisões guiadas por números e cuidado com direitos e políticas. Marque os itens conforme forem feitos; as listas de rotina podem ser zeradas a cada semana.</p>
      <div class="duas">${(D.playbook || []).map((s) => `
        <div class="cartao"><div style="display:flex;justify-content:space-between;align-items:center"><h3>${esc(s.titulo)}</h3>
          ${["publicacao", "semana"].includes(s.id) ? `<button class="botao sec peq" data-zera="${s.id}">Zerar</button>` : ""}</div>
          ${s.itens.map((t, i) => { const f = ck[s.id]?.[i]; return `<label class="check ${f ? "feito" : ""}"><input type="checkbox" data-s="${s.id}" data-i="${i}" ${f ? "checked" : ""}><span>${esc(t)}</span></label>`; }).join("")}
        </div>`).join("")}</div>`;
    $$("#aba-manual input[type=checkbox]").forEach((x) => (x.onchange = () => {
      (ck[x.dataset.s] = ck[x.dataset.s] || {})[x.dataset.i] = x.checked; x.closest(".check").classList.toggle("feito", x.checked); mudou();
    }));
    $$("[data-zera]").forEach((b) => (b.onclick = () => { ck[b.dataset.zera] = {}; mudou(); manual(); }));
  }

  // ------------------------------------------------------------------ configurações
  function config() {
    const c = D.canal, gh = lerGH();
    const campo = (k, rot, ph) => `<label>${rot}<input data-canal="${k}" value="${esc(c[k] || "")}" placeholder="${ph}"></label>`;
    $("#aba-config").innerHTML = `
      <div class="cab"><div><span class="rotulo">Ajustes</span><h1>Configurações</h1></div></div>
      <div class="cartao"><h3>Canal e redes (aparecem no site)</h3><div class="campos">
        ${campo("youtube_url", "Link do canal no YouTube", "https://www.youtube.com/@afrimosatv")}
        ${campo("youtube_channel_id", "ID do canal (para a live no site)", "UCxxxxxxxxxxxxxxxx")}
        ${campo("instagram", "Instagram", "https://instagram.com/...")}${campo("tiktok", "TikTok", "https://tiktok.com/@...")}
        ${campo("facebook", "Facebook", "https://facebook.com/...")}${campo("whatsapp", "Canal do WhatsApp", "https://whatsapp.com/channel/...")}
      </div><p class="muted" style="font-size:.8rem;margin-top:8px">O ID do canal está em YouTube Studio → Configurações → Canal → Configurações avançadas.</p></div>

      <div class="cartao" style="margin-top:18px"><h3>Salvar no GitHub</h3>
        <p class="muted" style="font-size:.85rem">Grava o <code>data/canal.json</code> direto no seu repositório. Crie um token em GitHub → Settings → Developer settings → Fine-grained tokens, só para este repositório, com permissão <b>Contents: Read and write</b>. O token fica só neste navegador.</p>
        <div class="campos">
          <label>Usuário ou organização<input id="gh-dono" value="${esc(gh.dono || "aaronkadima")}" placeholder="aaronkadima"></label>
          <label>Repositório<input id="gh-repo" value="${esc(gh.repo || "afrimosa")}" placeholder="afrimosa"></label>
          <label>Branch<input id="gh-branch" value="${esc(gh.branch || "main")}"></label>
          <label class="largo">Token<input id="gh-token" type="password" value="${esc(gh.token || "")}" placeholder="github_pat_..."></label>
          <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="gh-lembrar" ${gh.lembrar ? "checked" : ""}>Lembrar o token neste computador</label>
        </div>
        <div class="linha-acoes" style="margin-top:10px"><button class="botao" id="gh-salvar">Salvar no GitHub</button></div>
        <p class="muted" id="gh-msg" style="font-size:.85rem"></p></div>

      <div class="cartao" style="margin-top:18px"><h3>Arquivo</h3>
        <div class="linha-acoes" style="justify-content:flex-start">
          <button class="botao sec" id="x-baixar">Baixar canal.json</button>
          <label class="botao sec" style="display:inline-flex">Importar canal.json<input type="file" id="x-importar" accept=".json" hidden></label>
          <button class="botao sec" id="x-descartar">Descartar alterações deste navegador</button></div></div>

      <div class="aviso" style="margin-top:18px"><b>Segurança:</b> tudo o que está neste arquivo fica público no GitHub (repositório público e GitHub Pages).
        Nunca coloque aqui a chave de transmissão, senhas, o client_secret ou tokens do YouTube.</div>`;
    $$("[data-canal]").forEach((i) => (i.onchange = () => { c[i.dataset.canal] = i.value.trim(); mudou(); }));
    $("#gh-salvar").onclick = salvarGH;
    $("#x-baixar").onclick = baixar;
    $("#x-importar").onchange = importar;
    $("#x-descartar").onclick = () => { if (confirm("Descartar as alterações não enviadas?")) { apagar(CH_RASCUNHO); location.reload(); } };
  }
  function lerGH() {
    let g = {};
    try { g = JSON.parse(ler(CH_GITHUB) || sessionStorage.getItem(CH_GITHUB) || "{}"); } catch (e) { g = {}; }
    return g;
  }
  function gravarGH(g) {
    const s = JSON.stringify(g);
    try { sessionStorage.setItem(CH_GITHUB, s); } catch (e) { /* */ }
    if (g.lembrar) guardar(CH_GITHUB, s); else { const sem = { ...g, token: "" }; guardar(CH_GITHUB, JSON.stringify(sem)); }
  }
  function b64grande(t) {
    const bytes = new TextEncoder().encode(t); let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function salvarGH() {
    const g = { dono: $("#gh-dono").value.trim(), repo: $("#gh-repo").value.trim(), branch: $("#gh-branch").value.trim() || "main",
      token: $("#gh-token").value.trim(), lembrar: $("#gh-lembrar").checked };
    const msg = $("#gh-msg");
    if (!g.dono || !g.repo || !g.token) { msg.textContent = "Preencha usuário, repositório e token."; return; }
    gravarGH(g);
    const url = `https://api.github.com/repos/${encodeURIComponent(g.dono)}/${encodeURIComponent(g.repo)}/contents/data/canal.json`;
    const cab = { Authorization: `Bearer ${g.token}`, Accept: "application/vnd.github+json" };
    msg.textContent = "Enviando…";
    try {
      let sha;
      const r0 = await fetch(`${url}?ref=${encodeURIComponent(g.branch)}`, { headers: cab });
      if (r0.ok) sha = (await r0.json()).sha;
      const corpo = { message: `Plataforma: atualização ${new Date().toLocaleString("pt-BR")}`, content: b64grande(JSON.stringify(D, null, 1)), branch: g.branch };
      if (sha) corpo.sha = sha;
      const r = await fetch(url, { method: "PUT", headers: { ...cab, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      if (!r.ok) throw new Error(`${r.status} ${(await r.json()).message || ""}`);
      sujo = false; apagar(CH_RASCUNHO); estado();
      msg.textContent = "Salvo no GitHub. O site atualiza em 1 a 2 minutos.";
      toast("Salvo no GitHub");
    } catch (e) {
      msg.textContent = `Não consegui salvar: ${e.message}. Confira o token (Contents: Read and write) e o nome do repositório.`;
    }
  }
  function baixar() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 1)], { type: "application/json" }));
    a.download = "canal.json"; a.click(); URL.revokeObjectURL(a.href);
  }
  function importar(e) {
    const f = e.target.files[0]; if (!f) return;
    f.text().then((t) => { try { D = JSON.parse(t); mudou(); tudo(); toast("Arquivo importado"); } catch (x) { toast("Arquivo inválido"); } });
  }

  // ------------------------------------------------------------------ início
  $$("#abas button").forEach((b) => (b.onclick = () => abrir(b.dataset.aba)));
  window.addEventListener("beforeunload", (e) => { if (sujo) { e.preventDefault(); e.returnValue = ""; } });
  carregar().then(() => abrir(ler("afrimosa_aba") || "painel"));
})();
