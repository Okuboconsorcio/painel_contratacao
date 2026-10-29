<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Painel de contratação — instruções para assistentes (Claude, Codex)

Painel de contratação — **sistema separado** do Polaris (schema `recrutamento` no
Supabase `portal-okubo`, Vercel própria). Antes de mexer, leia no
cofre do Obsidian (`C:\Users\Nicolas - consórcio\OneDrive - Okubo Representação Comercial LTDA\Área de Trabalho\Obsidian\Okubo Consórcio`):

1. `04 - Projetos/Projeto - Painel de contratação/Projeto - Painel de contratação.md` — seção **Estado atual**
2. `04 - Projetos/Projeto - Painel de contratação/Regras e condições - Painel de contratação.md`
3. o topo de `07 - Trabalho com IA/Diário de alterações.md`

## Regras deste código

- **Português** em tudo: nomes, rotas, textos (igual ao Polaris).
- **Toda mudança de etapa passa por `src/lib/recrutamento/processo.ts`.** A tela
  não altera a candidatura direto. Passo novo: função nova lá, com histórico,
  e-mails e a etapa permitida em `acoesDaEtapa` (`regras.ts`).
- **Opção de lista nova entra em `opcoes.ts`**, com sua cor.
- **Permissão conferida na ação do servidor** (`actions.ts`), não só escondendo botão.
- **Dados fictícios.** Nunca colocar candidato real em `semente.ts` nem em teste.
- **Supabase é produção** (`portal-okubo`, o mesmo do Polaris): mudança no
  banco só com aprovação do Nicolas, por migração nova em `supabase/migrations/`
  (migração aplicada não se altera). Nunca tocar no schema `polaris`.
- **Nenhum valor de chave** no código, no Git ou no chat — só os nomes.
- **Publicação:** push em branch gera versão de teste; `main` é produção e só
  recebe merge depois do "aprovado" do Nicolas.
- Formulário de ação usa `FormularioAcao` (envia pelo `onSubmit`, não limpa os
  campos quando a resposta é erro).
- Ao terminar: `npm run regras:conferir`, `npx tsc --noEmit`, `npm run build`;
  entrada no `DIARIO.md`; no cofre, passagem + Estado atual + linha no diário.
