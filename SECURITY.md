# Segurança e acesso por senha — AfriMosa TV

## Estado da implantação

O arquivo `server.js` implementa autenticação de verdade no **servidor**. Ele **não é executado pelo GitHub Pages**, que hospeda somente arquivos estáticos. Portanto, a proteção **não entra em vigor** enquanto você continuar usando `https://aaronkadima.github.io/afrimosa/` e o projeto continuar publicado no GitHub Pages.

**Não é seguro** adicionar uma comparação de senha em JavaScript no navegador: a pessoa pode ignorar a tela e baixar os arquivos HTML, JS e JSON diretamente.

## 1. Alterar o repositório para privado

Abra https://github.com/aaronkadima/afrimosa/settings e siga **General → Danger Zone → Change repository visibility → Make private**. Confirme o nome do repositório e a alteração. A conexão do assistente ao GitHub não possui a operação administrativa necessária para mudar a visibilidade.

Isso **não protege automaticamente um site GitHub Pages** em todos os planos. GitHub Pages publicado de um repositório privado ainda pode ser acessível publicamente quando o plano o permite. A publicação privada do GitHub Pages é um recurso de organizações **GitHub Enterprise Cloud**, não uma função padrão de repositórios pessoais.

## 2. Desativar a publicação pública antiga

Abra https://github.com/aaronkadima/afrimosa/settings/pages e use **Unpublish site** (se disponível). Em contas GitHub Free, transformar o repositório em privado normalmente retira o site do ar. Verifique a despublicação de `/afrimosa/`, `/afrimosa/admin/` e `/afrimosa/data/canal.json` em uma janela anônima.

Se você tiver um domínio próprio associado, remova ou atualize os registros DNS do GitHub Pages antes de alterar a visibilidade.

## 3. Hospedar a versão protegida

Conecte o repositório privado a um serviço que execute Node.js com HTTPS (por exemplo, Render, Railway ou servidor próprio com reverse proxy HTTPS). Use:

- **Build command:** não é necessário instalar dependências; `npm install` é opcional.
- **Start command:** `npm start` (equivalente a `node server.js`).
- **Node.js:** versão 20 ou superior.
- **Health check:** `/health` (responde apenas `OK`).
- **HTTPS:** obrigatório na frente do serviço. Em produção, o servidor só atende quando recebe `X-Forwarded-Proto: https` do proxy TLS confiável.

Configure as variáveis do serviço **sem incluí-las no código nem no GitHub**:

| Variável | Função |
|---|---|
| `NODE_ENV=production` | Exige HTTPS via proxy e configura cookies `Secure` |
| `AFRIMOSA_SITE_PASSWORD` | Senha do site, mínimo 12 caracteres |
| `AFRIMOSA_ADMIN_PASSWORD` | Senha diferente do painel `/admin/`, mínimo 12 caracteres |
| `SESSION_SECRET` | Segredo aleatório, mínimo 32 caracteres |
| `PORT` | Definida pelo provedor, se necessário (padrão 3000) |

Exemplo de geração de segredo (execute localmente e copie o resultado apenas ao painel do serviço):

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Não use os textos de exemplo de `.env.example` como senhas reais. Prefira senhas aleatórias, únicas e longas. Nunca envie credenciais por commits, issues, URLs ou parâmetros HTTP.

## 4. Escopo do acesso

- `/` e as páginas do site exigem a senha do site ou uma sessão administrativa válida.
- `/admin/`, `assets/admin.js` e `assets/admin.css` exigem **senha administrativa independente**.
- `/data/canal.json` exige login. A sessão **administrativa** recebe todos os dados; a sessão do **site** recebe apenas uma projeção com conteúdo aprovado, sem prompts internos, KPIs, agenda administrativa, metas e playbook.
- Os recursos estáticos aceitos também exigem sessão. Arquivos `.env`, `.git` e outros arquivos de desenvolvimento nunca são servidos pelo programa.
- Sessões em cookies `HttpOnly`, `SameSite=Strict`, assinatura HMAC e expiração (12 horas para site, 4 horas para admin). O servidor limita tentativas de senha por IP.
- `/sair` encerra a sessão no navegador. Ao alterar senhas, troque também `SESSION_SECRET` para invalidar sessões antigas.

## 5. Limitações e orientações

- **GitHub Pages não executa o servidor de autenticação.** Desative o Pages público antes de considerar o conteúdo protegido.
- Alterar a visibilidade **não retira retroativamente** cópias, forks, caches, clones ou dados previamente publicados. Se chaves ou tokens foram expostos, revogue-os e crie outros novos.
- A autenticação protege o acesso HTTP **somente pela hospedagem Node.js configurada**. O acesso ao repositório é controlado separadamente pelo GitHub.
- O painel atual utiliza um token de acesso ao GitHub para gravar mudanças no repositório. Prefira um token de escopo mínimo e não ative a opção de persistir o token em computador compartilhado.
- A limitação de tentativas é em memória e por instância. Para ambientes distribuídos ou com alto tráfego, use proteção adicional por provedor (WAF/rate limiting centralizado) e controle de usuários individualizado.

## 6. Validação

```sh
npm test
```

Os testes conferem o bloqueio de páginas/arquivos, a autenticação de cada perfil e a separação entre dados internos e públicos. Após a publicação, teste também numa janela anônima e com HTTPS real.
