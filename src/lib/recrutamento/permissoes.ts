/**
 * Quem pode o quê no recrutamento.
 *
 * Imita o `pode(módulo, ação)` do Polaris: cada tipo de login tem, por módulo,
 * as chaves ver/criar/editar/excluir. **Proposta** — a matriz abaixo precisa
 * ser revista com o Nicolas e o Leonardo junto com a revisão geral de logins
 * pedida no documento do processo. No Polaris ela vira linhas da tabela
 * `polaris.permissoes` (ver `supabase/recrutamento.sql`), e esta função some:
 * a pergunta passa a ser feita ao banco.
 *
 * Módulos novos:
 * - `recrutamento` — vagas, candidatos, triagem, contato, agendamento, registro
 *   da entrevista e confirmação do início;
 * - `recrutamento_decidir` — aprovar, reprovar ou guardar na reserva depois da
 *   entrevista (regra 3: a gestão decide junto com a supervisora);
 * - `recrutamento_config` — e-mails e configurações.
 */

export type Papel = "master" | "diretoria" | "gestor_rh" | "suporte_administrativo" | "vendedor";
export type Modulo = "recrutamento" | "recrutamento_decidir" | "recrutamento_config";
export type AcaoPermissao = "ver" | "criar" | "editar" | "excluir";

type Chaves = Partial<Record<AcaoPermissao, boolean>>;

const TUDO: Chaves = { ver: true, criar: true, editar: true, excluir: true };

export const MATRIZ: Record<Papel, Partial<Record<Modulo, Chaves>>> = {
  master: { recrutamento: TUDO, recrutamento_decidir: TUDO, recrutamento_config: TUDO },
  diretoria: {
    recrutamento: { ver: true },
    recrutamento_decidir: { ver: true, criar: true, editar: true },
  },
  // Decisão do Nicolas (29/10): todos do recrutamento registram a decisão
  // pós-entrevista — inclusive a Letícia e o Marco. A regra 3 (decidir com a
  // supervisora) continua garantida por "quem decidiu", obrigatório.
  gestor_rh: {
    recrutamento: { ver: true, criar: true, editar: true },
    recrutamento_decidir: { ver: true, criar: true, editar: true },
  },
  suporte_administrativo: {
    recrutamento: { ver: true, criar: true, editar: true },
    recrutamento_decidir: { ver: true, criar: true, editar: true },
  },
  vendedor: {},
};

export const PAPEIS: Record<Papel, { rotulo: string; exemplo: string }> = {
  master: { rotulo: "Master", exemplo: "Nicolas Okubo" },
  diretoria: { rotulo: "Diretoria", exemplo: "Leonardo Okubo" },
  suporte_administrativo: { rotulo: "Suporte administrativo", exemplo: "Letícia Garcia" },
  gestor_rh: { rotulo: "Gestor de RH", exemplo: "Marco Aurelio" },
  vendedor: { rotulo: "Vendedor (sem acesso)", exemplo: "Vendedor de teste" },
};

export function pode(papel: Papel, modulo: Modulo, acao: AcaoPermissao): boolean {
  return MATRIZ[papel]?.[modulo]?.[acao] === true;
}
