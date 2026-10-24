// Site público da AfriMosa TV: lê data/canal.json e mostra só o que já foi aprovado para o ar.
(() => {
  const NO_AR = ["aprovado", "agendado", "no_ar", "publicado"];
  const DESCR = {
    rumba_nova: "Os sucessos e as novidades da rumba congolesa.",
    tradicional: "Cantos e ritmos tradicionais de várias regiões.",
    cc: "Música africana com licença livre, de artistas independentes.",
    licao: "A história e o sentido por trás das canções.",
    lendas: "Os grandes nomes que construíram a música africana.",
    conto: "Contos e histórias da tradição oral.",
    estante: "Livros e autores africanos e afro-brasileiros.",
    kiosque: "O noticiário da África francófona, com fontes.",
    insolito: "Lugares, fatos e histórias surpreendentes do continente.",
    proverbio: "A sabedoria dos provérbios africanos.",
    voce_sabia: "Curiosidades rápidas entre os blocos.",
    autoral: "Músicas próprias do canal.",
    reportagem: "Mini-reportagens de 3 a 4 minutos sobre momentos marcantes.",
    top10: "As paradas mais ouvidas, com dados públicos e fonte.",
    lingua: "Cinco palavras por dia em lingala, kikongo, suaíli, tshiluba e iorubá.",
    mixtape: "Seleções de 30 minutos com músicas liberadas.",
    clima: "O tempo agora nas cidades africanas.",
    noticias: "Giro de notícias entre os blocos.",
    programacao: "O que vem a seguir na grade.",
    estreia: "A estreia oficial do canal.",
  };
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function horaSP(d = new Date()) {
    const p = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", minute: "numeric", hour12: false })
      .formatToParts(d).reduce((a, x) => ((a[x.type] = x.value), a), {});
    return Number(p.hour) % 24 + Number(p.minute) / 60;
  }
  function dataSP(d = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d); // AAAA-MM-DD
  }
  const hh = (h) => `${String(Math.floor(h)).padStart(2, "0")}h`;

  function player(c) {
    const el = $("#player");
    const url = c.youtube_url || (c.youtube_channel_id ? `https://www.youtube.com/channel/${c.youtube_channel_id}/live` : "https://www.youtube.com");
    ["#btn-youtube", "#btn-assistir"].forEach((s) => ($(s).href = url));
    if (c.youtube_channel_id) {
      el.innerHTML = `<iframe src="https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(c.youtube_channel_id)}&autoplay=0"
        title="AfriMosa TV ao vivo" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      return;
    }
    el.innerHTML = `<div class="poster"><img src="assets/logo_fundo_escuro.png" alt="AfriMosa TV"><div id="contagem"></div>
      <a class="botao" href="${esc(url)}" target="_blank" rel="noopener">▶ Assistir no YouTube</a></div>`;
    contagem(c.estreia);
  }

  function contagem(iso) {
    const alvo = iso ? new Date(iso + (iso.length <= 16 ? ":00-03:00" : "")) : null;
    const box = $("#contagem");
    if (!box || !alvo || isNaN(alvo)) return;
    const tick = () => {
      const s = Math.max(0, (alvo - new Date()) / 1000);
      if (s <= 0) { box.innerHTML = `<span class="pilula">No ar agora</span>`; return; }
      const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60);
      box.innerHTML = `<p class="rotulo">Estreia oficial</p><div class="contagem">
        ${[[d, "dias"], [h, "horas"], [m, "min"], [ss, "seg"]].map(([v, r]) => `<div><b>${String(v).padStart(2, "0")}</b><small>${r}</small></div>`).join("")}</div>`;
      setTimeout(tick, 1000);
    };
    tick();
  }

  function grade(g) {
    const fx = (g.faixas || []).slice().sort((a, b) => a.inicio - b.inicio);
    const h = horaSP();
    const atual = fx.find((f) => h >= f.inicio && h < f.fim) || fx[0];
    const prox = fx[(fx.indexOf(atual) + 1) % fx.length];
    if (atual) {
      $("#agora").innerHTML = `
        <div class="item"><span class="hora"><span class="ponto-vivo"></span>Agora</span><span class="nome">${esc(atual.nome)}</span></div>
        <div class="item"><span class="hora">${hh(prox.inicio)}</span><span class="nome muted">${esc(prox.nome)}</span></div>`;
    }
    $("#linha-tempo").innerHTML = fx.map((f) => `<span title="${esc(f.nome)} (${hh(f.inicio)}–${hh(f.fim)})" style="width:${((f.fim - f.inicio) / 24) * 100}%;background:${esc(f.cor)}"></span>`).join("")
      + `<i class="agulha" style="left:calc(${(h / 24) * 100}% - 1px)"></i>`;
    $("#faixas").innerHTML = fx.map((f) => `
      <div class="faixa ${f === atual ? "atual" : ""}" style="border-color:${esc(f.cor)}">
        <div class="h">${hh(f.inicio)} – ${hh(f.fim)}${f === atual ? " · AGORA" : ""}</div>
        <h3>${esc(f.nome)}</h3>
        <div class="q">${(f.quadros || []).map(esc).join(" · ")}</div>
      </div>`).join("");
  }

  function quadros(g) {
    const vistos = new Set();
    const lista = (g.quadros || []).filter((q) => DESCR[q.id] && !vistos.has(q.nome) && vistos.add(q.nome));
    $("#lista-quadros").innerHTML = lista.map((q) => `
      <div class="cartao quadro"><div class="tipo">${esc(q.tipo === "musica" ? "Música" : q.tipo === "fala" ? "Programa" : q.tipo === "intervalo" ? "Intervalo" : "Especial")}</div>
      <h3>${esc(q.nome)}</h3><p class="muted">${esc(DESCR[q.id])}</p></div>`).join("");
  }

  function reportagens(cs) {
    const reps = cs.filter((c) => c.tipo === "reportagem");
    const ar = reps.filter((c) => NO_AR.includes(c.status));
    $("#lista-reportagens").innerHTML = ar.length ? ar.map((r) => `
      <article class="cartao rep"><div class="topo-rep"><span class="pilula">${esc(r.serie)}</span></div>
        <div class="corpo"><h3>${esc(r.titulo)}</h3><p class="muted">${esc(r.roteiro?.abertura || "")}</p>
        <ol>${(r.roteiro?.capitulos || []).map((c) => `<li>${esc(c.titulo)}</li>`).join("")}</ol></div></article>`).join("")
      : `<p class="muted" style="grid-column:1/-1">As primeiras reportagens estreiam em breve.</p>`;
    const breve = reps.filter((c) => !NO_AR.includes(c.status));
    $("#em-breve").innerHTML = breve.length ? `<div class="em-breve"><span class="rotulo">Em breve</span>
      <div class="chips">${breve.map((r) => `<span class="chip">${esc(r.titulo)}</span>`).join("")}</div></div>` : "";
  }

  function linguas(d) {
    const curso = d.curso || {};
    const lics = d.conteudos.filter((c) => c.tipo === "licao" && NO_AR.includes(c.status));
    const nomes = [...new Set(lics.map((l) => l.lingua))];
    if (!nomes.length) { $("#palavras").innerHTML = `<p class="muted">As lições começam em breve.</p>`; return; }
    const total = Object.keys(curso.temas || {}).length || 12;
    const ini = curso.inicio ? new Date(curso.inicio + "T00:00:00-03:00") : new Date();
    const dia = Math.max(0, Math.floor((new Date(dataSP() + "T00:00:00-03:00") - ini) / 86400000));
    const nDia = (dia % total) + 1;
    const mostrar = (nome) => {
      const daLingua = lics.filter((l) => l.lingua === nome).sort((a, b) => a.licao - b.licao);
      const lic = daLingua.filter((l) => l.licao <= nDia).pop() || daLingua[0];
      document.querySelectorAll(".abas-linguas button").forEach((b) => b.classList.toggle("ativa", b.dataset.l === nome));
      $("#palavras").innerHTML = `<p class="licao-info" style="grid-column:1/-1">Lição ${lic.licao} · <b>${esc(lic.tema)}</b></p>` +
        lic.palavras.map((p) => `<div class="cartao palavra"><b>${esc(p.palavra)}</b><i>(${esc(p.pronuncia)})</i><span>${esc(p.significado)}</span></div>`).join("");
    };
    $("#abas-linguas").innerHTML = nomes.map((n) => `<button data-l="${esc(n)}">${esc(n)}</button>`).join("");
    document.querySelectorAll(".abas-linguas button").forEach((b) => (b.onclick = () => mostrar(b.dataset.l)));
    mostrar(nomes[0]);
  }

  function curiosidades(cs) {
    const ok = cs.filter((c) => c.tipo === "curiosidade" && NO_AR.includes(c.status));
    const sec = $("#curiosidades");
    if (!ok.length) { sec.style.display = "none"; return; }
    const hoje = Number(dataSP().replace(/-/g, ""));
    const escolha = [0, 1, 2].map((k) => ok[(hoje * 7 + k * 13) % ok.length]).filter((x, i, a) => a.indexOf(x) === i);
    $("#lista-curiosidades").innerHTML = escolha.map((c) => `
      <div class="cartao curio"><span class="rotulo">${esc(c.serie)}</span><h3 style="margin-top:8px">${esc(c.titulo)}</h3>
      <div class="det">${esc(c.detalhe || "")}</div><p>${esc(c.texto)}</p>
      ${(c.destaques || []).length ? `<ul>${c.destaques.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>`).join("");
  }

  function redes(c) {
    const r = [["youtube_url", "YouTube"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["facebook", "Facebook"], ["whatsapp", "WhatsApp"]]
      .filter(([k]) => c[k]).map(([k, n]) => `<a class="botao sec peq" href="${esc(c[k])}" target="_blank" rel="noopener">${n}</a>`);
    $("#redes").innerHTML = r.length ? r.join("") : `<span class="muted">Links das redes em breve.</span>`;
    if (c.slogan) $("#slogan").textContent = c.slogan;
  }

  fetch("data/canal.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      const c = d.canal || {};
      player(c); grade(d.grade || {}); quadros(d.grade || {}); reportagens(d.conteudos || []);
      linguas(d); curiosidades(d.conteudos || []); redes(c);
      setInterval(() => grade(d.grade || {}), 60000);
    })
    .catch(() => { $("#agora").innerHTML = `<p class="muted">Não foi possível carregar a programação agora.</p>`; });
})();
