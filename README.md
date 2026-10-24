# Plataforma AfriMosa TV

> **🔒 Atenção — proteção por senha:** foi implementado o servidor `server.js` com senhas separadas para o site e o painel. Essa autenticação **só funciona em uma hospedagem Node.js com HTTPS**; o GitHub Pages não executa o servidor e continuará expondo os arquivos publicados. Antes de considerar o site protegido, torne o repositório privado, despublique o Pages antigo e implante o servidor em um provedor adequado. Consulte [SECURITY.md](SECURITY.md) para o procedimento completo.

Site do canal e área de gestão no mesmo repositório. A versão com acesso por senha precisa de um servidor Node.js com HTTPS. Os dados continuam no arquivo `data/canal.json`.

```
afrimosa-plataforma/
├── index.html          ← site para visitantes
├── admin/index.html    ← gestão do canal (endereço: .../admin/)
├── assets/             ← estilos, scripts, logo e textura
└── data/canal.json     ← todos os dados (gerado pelo programa + suas edições)
```

## 1. Publicar no GitHub (uma vez)

1. Entre em github.com → **New repository** → nome `afrimosa-plataforma` → **Public** → *Create repository*.
2. Na página do repositório, clique em **uploading an existing file** e arraste **todo o conteúdo** desta pasta
   (index.html, admin, assets, data, README.md, .nojekyll) → *Commit changes*.
3. Vá em **Settings → Pages** → *Source: Deploy from a branch* → *Branch: main* e pasta */ (root)* → *Save*.
4. Em 1 a 2 minutos o site fica em `https://SEU-USUARIO.github.io/afrimosa-plataforma/`
   e a gestão em `https://SEU-USUARIO.github.io/afrimosa-plataforma/admin/`.

Se preferir pedir ajuda ao ChatGPT ou a outro assistente, peça só estes passos; não é preciso mudar o código.

## 2. Atualizar os dados a partir do programa

No PowerShell, na pasta do programa:

```
cd C:\AfriMosaTV\afrimosa-tv
python -m afrimosa plataforma exportar --destino C:\AfriMosaTV\afrimosa-plataforma\data\canal.json
```

O comando junta reportagens (com roteiro e status: roteiro, em produção, prévia, no ar), lições,
curiosidades, Top 10, grade e quadros. **O que você editou na plataforma é mantido**: prompts, agenda,
metas, checklists, notas, datas e status marcados à mão.

Depois envie o `data/canal.json` para o GitHub (arraste o arquivo em *Add file → Upload files* dentro da pasta `data`).

## 3. Editar pela área de gestão

As edições ficam guardadas no seu navegador até você salvar. Duas formas de salvar:

- **Salvar no GitHub (recomendado):** em *Configurações*, informe usuário, repositório e um token
  *fine-grained* com acesso só a este repositório e permissão **Contents: Read and write**
  (GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens).
- **Baixar canal.json** e enviar o arquivo pelo site do GitHub.

Importante: depois de editar na plataforma, **salve no GitHub antes de rodar o `exportar` de novo**, e
use o `canal.json` mais recente como destino, para nada se perder.

## Segurança

- A hospedagem GitHub Pages antiga é pública e não fornece proteção por senha: **qualquer pessoa pode ler o `canal.json`**. Prompts, roteiros e
  agenda podem ficar lá; **chave de transmissão, senhas, client_secret e tokens do YouTube nunca**.
- A área de gestão não é indexada pelo Google (`noindex`), mas não é secreta. Só quem tem o token
  consegue gravar alterações no repositório.
- O token fica apenas no seu navegador. Se marcar "Lembrar", ele fica salvo naquele computador.

## Abas da gestão

| Aba | Para quê |
|---|---|
| Painel | números de produção, metas de monetização, agenda dos próximos 14 dias, prévias pendentes, rotina do dia |
| Conteúdos | quadro de produção (ideia → roteiro → produção → prévia → aprovado → agendado → no ar), editor de roteiro, cópia do texto de narração, do YAML e dos comandos |
| Agenda | publicações por data e plataforma (YouTube, Shorts, Comunidade, Instagram, TikTok, Facebook) |
| Prompts | biblioteca de comandos do PowerShell, narração, vídeo com IA, redes e roteiros, com campos para preencher |
| Grade e quadros | faixas do dia e quadros, com quantas peças aprovadas cada um tem |
| Metas e números | registro semanal dos números do YouTube Studio, progresso para o Programa de Parcerias, ritmo diário necessário |
| Manual do gestor | estratégia, checklist de publicação, rotina semanal, métricas, caminho da monetização e riscos |
| Configurações | links do canal e redes (aparecem no site), salvar no GitHub, importar e baixar |