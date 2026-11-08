# Pês

Grupos de amigos, eventos e prémios do ano. Web app estática (GitHub Pages) com Firebase (login + base de dados).

- `index.html` — a app inteira
- `firestore.rules` — regras de segurança da base de dados

## Notificações e regras
- `sw.js` recebe as notificações; `manifest.webmanifest` + `icons/` dão o ícone no ecrã principal.
- `.github/workflows/notificacoes.yml` corre `scripts/notify.mjs` a cada ~10 min (eventos novos, mensagens, lembrete na véspera, votação de domingo).
- `.github/workflows/regras.yml` publica `firestore.rules` no Firebase sempre que o ficheiro muda.
- Segredos do repositório necessários: `FIREBASE_SERVICE_ACCOUNT` e `VAPID_PRIVATE_KEY`.
