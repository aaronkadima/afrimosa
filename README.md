# Plataforma AfriMosa TV

Site público do canal e área de gestão, num só repositório, hospedado de graça no **GitHub Pages**.
Não precisa de servidor nem de banco de dados: tudo fica no arquivo `data/canal.json`.

```
afrimosa-plataforma/
├── index.html          ← site para visitantes
├── admin/index.html    ← gestão do canal (endereço: .../admin/)
├── assets/             ← estilos, scripts, logo e textura
└── data/canal.json     ← todos os dados (gerado pelo programa + suas edições)
```

## 1. Código instalado e publicação do site

O código-fonte completo já está instalado na branch **main** de
https://github.com/aaronkadima/afrimosa, com o site público, o painel de gestão,
os recursos visuais e `data/canal.json`.

Para ativar a hospedagem gratuita **GitHub Pages**, se ainda não estiver habilitada:

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment**, escolha **Deploy from a branch**.
3. Selecione a branch **main** e a pasta **/ (root)**, depois **Save**.

Endereços previstos após o Pages estar ativo:

- Site: https://aaronkadima.github.io/afrimosa/
- Gestão: https://aaronkadima.github.io/afrimosa/admin/

> O painel é acessível publicamente. Para gravar os dados diretamente no repositório,
> utilize um token fine-grained com permissão Contents: Read and write, restrito a este repositório.
> Nunca publique credenciais em `data/canal.json`.

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

- O repositório e o site são públicos: **qualquer pessoa pode ler o `canal.json`**. Prompts, roteiros e
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
