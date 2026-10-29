# Painel de contratação — Okubo / MGCON

Gestão do processo seletivo: vagas, banco de currículos, triagem, contato e
agendamento, entrevista (ficha de avaliação), decisão, confirmação do início e
passagem para a admissão no RH. **Sistema separado** do Polaris (decisão de
29/10/2026), no mesmo projeto Supabase, em schema próprio — como a Fila Agil.

> Documentação completa no cofre do Obsidian:
> `Okubo Consórcio/04 - Projetos/Projeto - Painel de contratação/`

## Dois modos

| | Sistema de verdade | Protótipo (computador) |
|---|---|---|
| Quando | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` configuradas | Sem essas variáveis |
| Dados | Supabase, schema `recrutamento`; arquivos no bucket privado `recrutamento` | `.dados/` (fora do Git), pessoas **fictícias** |
| Login | Supabase Auth (mesmo e-mail e senha do Polaris); papel em `recrutamento.usuario` | Sem login; "ver como" no rodapé do menu |
| E-mail | SMTP do Google (`EMAIL_SMTP_USUARIO`, `EMAIL_SMTP_SENHA`) | Simulado |

Na Vercel, sem as variáveis do Supabase, o painel mostra erro de configuração
(não há arquivo local lá).

## Rodar

```
npm install
npm run dev              # http://localhost:3000/rh/recrutamento
npm run regras:conferir  # confere as regras do processo
npm run dados:zerar      # protótipo: apaga os dados locais e recria os de exemplo
npm run build            # build de produção
```

## Variáveis (só os nomes — valores na Vercel, nunca no Git)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — públicas
- `SUPABASE_SERVICE_ROLE_KEY` — chave secreta; só o servidor usa
- `CRON_SECRET` — protege o agendador diário (`/api/cron/recrutamento`, 9h05)
- `EMAIL_SMTP_USUARIO`, `EMAIL_SMTP_SENHA` — envio de e-mail (senha de app do Google)
- `RECRUTAMENTO_CHAVE_LP` — opcional; exigida da landing page em `x-chave-lp`

## Onde está cada coisa

| Pasta / arquivo | O que é |
|---|---|
| `src/app/(portal)/rh/recrutamento/` | Telas e ações |
| `src/lib/recrutamento/processo.ts` | Motor: cada passo, histórico e e-mails |
| `src/lib/recrutamento/regras.ts`, `opcoes.ts`, `datas.ts`, `emails.ts`, `consultas.ts` | Regras, rótulos, textos, contas |
| `src/lib/recrutamento/dados.ts`, `dados-supabase.ts` | Onde os dados moram (arquivo local ou Supabase) |
| `src/lib/recrutamento/envio.ts` | Envio real da fila de e-mails e limpeza LGPD |
| `src/lib/recrutamento/sessao.ts`, `permissoes.ts`, `src/proxy.ts`, `src/app/login/` | Login e quem pode o quê |
| `src/app/api/recrutamento/inscricao/` | Entrada da landing page |
| `src/app/api/cron/recrutamento/` | Agendador diário (Vercel) |
| `supabase/migrations/` | Banco do sistema separado (**aplicado** em 29/10/2026) |
| `supabase/recrutamento.sql` | Rascunho antigo para uma integração futura ao Polaris |

## Etapas

`INSCRITO → TRIAGEM_APROVADA → ENTREVISTA_AGENDADA → ENTREVISTADO → APROVADO → ADMISSAO`,
e três encerramentos (`REPROVADO`, `DESISTIU`, `RESERVA`) que guardam onde a
pessoa estava, para poder desfazer.
