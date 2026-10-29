# Diário — Painel de contratação

O que mudou e **por quê**. O mais novo em cima.

## 2026-10-29 (noite) — Sistema separado: Supabase, login e e-mail de verdade (Claude Code)

**Pedido do Nicolas:** não colocar no Polaris agora; fazer sistema separado, já.
Mesmo desenho da Fila Agil (schema próprio no Supabase do Polaris, login
compartilhado, Vercel própria).

- **Dois modos em `dados.ts`:** com `NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` usa o Supabase (`dados-supabase.ts`); sem elas, o
  arquivo local do protótipo. `lerBanco`/`transacao`/`lerArquivo` viraram
  assíncronos.
- **O motor continua em TypeScript** (não virou SQL): a transação lê tudo,
  aplica a regra em memória, compara antes/depois e manda só o que mudou para
  `recrutamento.aplicar`, que grava numa transação só. Por quê: as regras já
  estão testadas (53 conferências) e reescrever em SQL dobraria o trabalho e
  o risco. A segurança vem de o navegador não falar com o banco: só o servidor,
  com a chave secreta, depois de conferir login e papel.
- **Momentos:** o banco devolve `+00:00`; `dados-supabase.ts` normaliza para o
  ISO com `Z`, porque o app compara momentos como texto.
- **Login:** `proxy.ts` (Next 16) manda para `/login` quem não entrou;
  `sessao.ts` lê o papel de `recrutamento.usuario`. Sair é `scope: "local"`
  para não derrubar o Polaris.
- **E-mail:** `envio.ts` reserva no banco (`reservar_emails`, `for update skip
  locked`) e manda pelo SMTP do Google; sem senha configurada, não reserva —
  fica agendado. Agendador diário `/api/cron/recrutamento` (12:05 UTC = 9h05)
  com `CRON_SECRET`.
- **Migrações** em `supabase/migrations/`. `supabase/recrutamento.sql` era o
  rascunho para o Polaris e fica como referência da integração futura.
- **Migração aplicada (aprovada pelo Nicolas, 29/10):** `recrutamento_estrutura`
  — schema e tabelas, configuração inicial.
- **Migração aplicada:** `recrutamento_seguranca` — RLS em tudo, só a própria
  linha de `usuario` para o logado; bucket privado `recrutamento` (10 MB).
- **Migração aplicada:** `recrutamento_funcoes` — `aplicar`, `reservar_emails`,
  `registrar_envio`, só para a chave secreta.
- **Migração aplicada:** `recrutamento_expor_api` — `recrutamento` no fim da
  lista `pgrst.db_schemas` (lista conferida imediatamente antes).
- Teste no banco numa transação desfeita: 10/10 (gravar, atualizar, sábado
  recusado, reserva única de e-mail, envio, limpeza, apagar pessoa inteira,
  usuário comum barrado na leitura e na gravação). Conferido depois: tabelas
  vazias. Nicolas cadastrado como `master` (mesmo login do Polaris).
- **GitHub:** `Okuboconsorcio/painel_contratacao` (criado pelo Nicolas): `main`
  só com o README; o código em `feat/inicial`.
- **Vercel:** projeto `painel-contratacao` (time okuboconsorcios-projects),
  ligado ao repositório, com `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Só versão de teste por branch;
  produção (`main`) só depois do "aprovado". Faltam as variáveis secretas, que
  o Nicolas cola na Vercel.
- **Defeito achado no build da Vercel:** o Next montava o Painel no build, como
  página fixa (no computador passava porque lia o arquivo local). Com banco de
  verdade, a tela mostraria dado velho. Agora `dynamic = "force-dynamic"` na
  moldura `(portal)/layout.tsx` e no login. Conferido com `VERCEL=1 npm run
  build` sem chaves: todas as telas `ƒ` (na hora).
- **Pegadinha do Supabase:** schema novo exposto na API precisa de
  `notify pgrst, 'reload schema'` além do `reload config` — sem isso a API diz
  "Could not find the table … in the schema cache". Rodado em 29/10 depois das
  migrações (não muda estrutura).
- **Versão de teste com as chaves (29/10):** `/api/recrutamento/inscricao`
  respondeu `{"vagas":[]}` lendo o banco de verdade; `/rh/recrutamento` sem
  login cai no `/login`.
- **Primeira publicação = produção** na Vercel (regra para projeto novo):
  cancelada antes de ficar pronta. Trava "Ignored Build Step" pula produção
  até o "aprovado".

## 2026-10-29 (fim da tarde) — Endereço, dia de início e limpeza LGPD (Claude Code)

- **Endereço padrão** da entrevista na semente: R. Cabo Diogo Oliver, 536 - Vila
  Mogilar - SP, 08773-000.
- **"O dia pode mudar"** (Nicolas): `validarDataInicio` só recusa data passada e
  fim de semana; `avisosInicio` aponta dia fora da segunda e feriado, e o aviso
  vai para o histórico ao confirmar. `sugestaoInicio`: próxima segunda ou, se
  feriado, o dia útil seguinte (antes pulava uma semana inteira). SQL rascunho:
  `isodow between 1 and 5`.
- **"Apaga sim"**: `apagarVencidos` no motor tira a pessoa e tudo o que fala
  dela (candidaturas, contatos, eventos, e-mails) e devolve os arquivos para
  apagar do disco depois de gravar. `limpezas_lgpd` guarda só data e
  quantidade. Roda na moldura a cada tela (só grava se houver vencido); no
  Polaris, no agendador. O filtro do banco virou "Apagados em até 30 dias".
- Estado civil e filhos ficam na ficha (confirmado). Integração: só quando o
  Nicolas mandar.

## 2026-10-29 (tarde) — Decisões do Nicolas aplicadas (Claude Code)

- **Triagem:** os 4 critérios ficam (confirmados).
- **Decisão pós-entrevista:** todos do recrutamento (`gestor_rh` e
  `suporte_administrativo` ganharam `recrutamento_decidir` criar/editar). "Quem
  decidiu" continua obrigatório — é o que garante a regra 3.
- **E-mails:** `config.emails_ligados`; `agendarEmail` não põe na fila modelo
  desligado. Padrão: só `ENTREVISTA_AGENDADA` e os dois lembretes. Liga/desliga
  em E-mails › Configuração. A confirmação da decisão diz se o candidato vai
  receber e-mail ou se o retorno é por fora. O script de regras liga todos para
  conferir o mecanismo e confere à parte que desligado não entra.
- **LGPD:** `config.meses_guarda` (12) e `guardarAte()` em `regras.ts` — último
  movimento (aceite ou candidatura) + N meses; contratado não vence. Ficha do
  candidato, filtro no banco e texto do aceite. Apagar ainda é manual — na
  integração, decidir se o agendador apaga sozinho.

## 2026-10-29 (tarde) — Ficha de avaliação igual ao papel (Claude Code)

**Pedido do Nicolas:** enviou a ficha usada hoje (`MGCON-Ficha-Avaliacao-Candidato.pdf`,
v1) e pediu "tudo, igual ao papel".

**O que mudou:**
- `Avaliacao` ganhou a parte 1 (`dados`, chaves em `DADOS_FICHA`), pontos como
  lista de 3, `realizada_por` e `supervisora`. Os critérios ganharam o texto de
  ajuda do papel.
- O motor recusa: sem resposta de experiência (vendas, telemarketing, consórcio)
  e horário; sem exatamente 3+3 pontos; sem quem entrevistou; supervisora e nota
  dela separadas. As outras perguntas da parte 1 ficam opcionais, como no papel.
- Entrevistadores e supervisoras do fechamento vêm de `ENTREVISTADORES` e
  `SUPERVISORAS` (nomes do papel); no Polaris, da lista de usuários.
- SQL rascunho: `avaliacao_dados jsonb`, pontos como `text[]` com 3 itens.
- Dados antigos de `.dados/` não servem mais (formato mudou) — recriados com
  `npm run dados:zerar`.

**Alerta registrado:** estado civil, filhos e rede de apoio entraram por decisão
do Nicolas. Foi avisado que a Lei 9.029/1995 proíbe usar isso para decidir
contratação; rever com o jurídico antes de usar com candidato real.

## 2026-10-29 — Protótipo inicial (Claude Code)

**Pedido do Nicolas:** painel de contratação "tipo Infojobs, só a parte de
gestão", para controlar as etapas dos candidatos e guardar o banco de
currículos, pensado para integrar depois ao Polaris. Base: documento "Novo
processo de contratação" (Word) e a nota `03 - Processos/Contratação de novos
colaboradores` do cofre.

**Decisões:**
- **Projeto separado, mesma tecnologia e mesmo visual do Polaris**, com as telas
  já no endereço que terão lá (`/rh/recrutamento`). Integrar = copiar pastas e
  trocar `dados.ts`, `sessao.ts` e `permissoes.ts`.
- **Dados em arquivo local, não no Supabase.** O banco do Polaris é produção;
  um protótipo não deve criar tabela lá sem aprovação.
- **Motor único (`processo.ts`)**: tela, landing page e dados de exemplo passam
  pelas mesmas funções. A semente é montada passando pelo motor, então o
  histórico e os e-mails de exemplo saem iguais aos do uso real.
- **E-mail por fila com horário**, não envio na hora: resolve "negativa só 2 dias
  depois", "aprovação na hora" e "lembrete na véspera" com o mesmo mecanismo, e
  permite cancelar a negativa ao desfazer um engano.
- **Decisão pós-entrevista é passo separado do registro da entrevista**, com
  permissão própria (`recrutamento_decidir`): a regra 3 do processo diz que a
  gestão decide com a supervisora.
- **Início sempre na segunda** é bloqueio; **segunda feriado** é só aviso (o
  02/11 caiu bem no primeiro teste). Feriados copiados de `ciclos.ts` do Polaris.
- **Formulário não limpa no erro**: o padrão do React 19 (`<form action>`)
  apaga os campos ao terminar a ação, mesmo com erro. `FormularioAcao` envia pelo
  `onSubmit` para a pessoa não perder o que digitou.

**Conferido:** `regras:conferir` 34/34; `tsc` sem erro; `npm run build` ok;
no navegador: caminho completo inscrito → admissão, reprovar e desfazer (negativa
cancelada), recusa sem LGPD, recusa de início numa quarta, cadastro com
currículo PDF, API da landing page (aceita, recusa duplicado, recusa sem
LGPD), regra 1 da vaga, "ver como" vendedor (sem acesso) e suporte
administrativo (sem configuração).

**Não feito:** landing page, envio real de e-mail, integração com Supabase,
funções `rh_rec_*` do SQL, revisão da matriz de permissões.
