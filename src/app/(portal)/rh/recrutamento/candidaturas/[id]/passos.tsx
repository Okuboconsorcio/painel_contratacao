/**
 * Os formulários de cada passo da candidatura. A página escolhe quais mostrar
 * a partir de `acoesDaEtapa` — o mesmo que o motor usa para recusar passo fora
 * de ordem, então a tela e a regra não divergem.
 */

import FormularioAcao from "@/components/recrutamento/formulario-acao";
import {
  CRITERIOS_ENTREVISTA,
  CRITERIOS_TRIAGEM,
  DADOS_FICHA,
  ENTREVISTADORES,
  MOTIVOS_DESISTENCIA,
  MOTIVOS_REPROVACAO,
  SUPERVISORAS,
} from "@/lib/recrutamento/opcoes";
import type { Candidatura, Configuracao } from "@/lib/recrutamento/tipos";
import {
  avaliacaoAcao,
  confirmacaoAcao,
  contatoAcao,
  decisaoAcao,
  desfazerAcao,
  desistenciaAcao,
  naoCompareceuAcao,
  remarcarAcao,
  triagemAcao,
} from "../../actions";
import CamposContato from "./campos-contato";
import CamposEntrevista from "./campos-entrevista";

const Oculto = ({ c }: { c: Candidatura }) => <input type="hidden" name="candidatura_id" value={c.id} />;

function Nota({ nome, rotulo, ajuda, obrigatoria = true }: { nome: string; rotulo: string; ajuda?: string; obrigatoria?: boolean }) {
  return (
    <div>
      <label htmlFor={nome} className="rotulo-campo">
        {rotulo}
      </label>
      <input id={nome} name={nome} type="number" min={0} max={10} step={0.5} required={obrigatoria} className="campo w-24" />
      {ajuda && <p className="mt-1 text-[0.7rem] leading-snug text-tenue">{ajuda}</p>}
    </div>
  );
}

function Motivo({ lista, rotulo = "Motivo (obrigatório se não for aprovar)" }: { lista: string[]; rotulo?: string }) {
  const id = `motivos-${lista.length}`;
  return (
    <div>
      <label htmlFor="motivo" className="rotulo-campo">
        {rotulo}
      </label>
      <input id="motivo" name="motivo" list={id} className="campo" placeholder="Escolha ou escreva" />
      <datalist id={id}>
        {lista.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>
  );
}

function Escolha({ nome, opcoes }: { nome: string; opcoes: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map(([valor, rotulo], i) => (
        <label key={valor} className="flex cursor-pointer items-center gap-1.5 rounded-md border border-linha px-3 py-1.5 text-[0.8rem] has-[:checked]:border-royal-vivo has-[:checked]:bg-royal-vivo/5">
          <input type="radio" name={nome} value={valor} defaultChecked={i === 0} />
          {rotulo}
        </label>
      ))}
    </div>
  );
}

export function PassoTriagem({ c, config }: { c: Candidatura; config: Configuracao }) {
  return (
    <FormularioAcao acao={triagemAcao} botao="Registrar triagem">
      <Oculto c={c} />
      <div className="grid gap-4 sm:grid-cols-2">
        {CRITERIOS_TRIAGEM.map((k) => (
          <Nota key={k.chave} nome={`nota_${k.chave}`} rotulo={`${k.rotulo} (0 a 10)`} ajuda={k.ajuda} />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <Escolha nome="decisao" opcoes={[["APROVADO", "Aprovar para contato"], ["RESERVA", "Guardar na reserva"], ["REPROVADO", "Reprovar"]]} />
        <Motivo lista={MOTIVOS_REPROVACAO} />
        <div>
          <label htmlFor="comentario" className="rotulo-campo">
            Comentário
          </label>
          <input id="comentario" name="comentario" className="campo" />
        </div>
        <p className="text-[0.72rem] text-tenue">
          Ao reprovar, o e-mail de retorno sai {config.dias_espera_negativa} dia(s) depois — dá tempo de desfazer se foi engano.
        </p>
      </div>
    </FormularioAcao>
  );
}

export function PassoContato({ c, padrao }: { c: Candidatura; padrao: { dia: string; entrevistadores: string; supervisora: string } }) {
  return (
    <FormularioAcao acao={contatoAcao} botao="Registrar contato">
      <Oculto c={c} />
      <CamposContato padraoEntrevista={padrao} />
      <p className="mt-2 text-[0.72rem] text-tenue">
        Todo contato fica registrado, inclusive &ldquo;não atendeu&rdquo;. Entrevista marcada manda e-mail ao candidato na hora e
        agenda o lembrete da véspera para ele, a responsável e os master.
      </p>
    </FormularioAcao>
  );
}

export function PassoRemarcar({ c, padrao }: { c: Candidatura; padrao: { dia: string; hora: string; local: string; entrevistadores: string; supervisora: string } }) {
  return (
    <FormularioAcao acao={remarcarAcao} botao="Remarcar" variante="secundario">
      <Oculto c={c} />
      <CamposEntrevista padrao={padrao} />
      <div className="mt-3">
        <label htmlFor="motivo-remarcar" className="rotulo-campo">
          Por que remarcou
        </label>
        <input id="motivo-remarcar" name="motivo" className="campo" />
      </div>
    </FormularioAcao>
  );
}

export function PassoNaoCompareceu({ c }: { c: Candidatura }) {
  return (
    <FormularioAcao
      acao={naoCompareceuAcao}
      botao="Registrar que não compareceu"
      variante="perigo"
      confirmar="Encerrar como 'não compareceu'? Os lembretes pendentes são cancelados. Para dar outra chance, use Remarcar."
    >
      <Oculto c={c} />
      <label htmlFor="obs-nc" className="rotulo-campo">
        Observação
      </label>
      <input id="obs-nc" name="observacao" className="campo" placeholder="Ex.: não respondeu no WhatsApp" />
    </FormularioAcao>
  );
}

function ParteFicha({ n, titulo, nota }: { n: number; titulo: string; nota: string }) {
  return (
    <div className="mb-2 mt-5 flex flex-wrap items-baseline justify-between gap-x-3 border-b border-linha pb-1 first:mt-0">
      <h3 className="text-[0.78rem] font-semibold uppercase tracking-wide text-navy-900">
        <span className="mr-1.5 tabular-nums text-royal-vivo">{n}</span>
        {titulo}
      </h3>
      <span className="text-[0.7rem] text-tenue">{nota}</span>
    </div>
  );
}

/** Pergunta de sim/não da parte 1, com o complemento do papel ao lado. */
function SimNao({ chave, rotulo, detalhe, obrigatoria }: { chave: string; rotulo: string; detalhe?: string; obrigatoria?: boolean }) {
  return (
    <fieldset>
      <legend className="rotulo-campo">
        {rotulo}
        {obrigatoria && " *"}
      </legend>
      <div className="flex items-center gap-2">
        {[["SIM", "Sim"], ["NAO", "Não"]].map(([valor, texto]) => (
          <label key={valor} className="flex cursor-pointer items-center gap-1 text-[0.8rem]">
            <input type="radio" name={`dado_${chave}`} value={valor} required={obrigatoria} />
            {texto}
          </label>
        ))}
        <input name={`dado_${chave}_detalhe`} className="campo min-w-0 flex-1" placeholder={detalhe} aria-label={`${rotulo} — ${detalhe}`} />
      </div>
    </fieldset>
  );
}

const primeiroNome = (nome: string) => nome.split(" ")[0].toLowerCase();

export function PassoAvaliacao({ c, horario, bairroCidade }: { c: Candidatura; horario: string; bairroCidade: string }) {
  // Quem foi marcado no agendamento já vem assinalado; o entrevistador corrige se mudou.
  const marcados = (c.entrevista?.entrevistadores ?? "").toLowerCase();
  const supervisoraMarcada = (c.entrevista?.supervisora ?? "").toLowerCase();
  return (
    <FormularioAcao acao={avaliacaoAcao} botao="Registrar entrevista">
      <Oculto c={c} />
      <p className="mb-3 text-[0.78rem] text-tenue">
        Passe para cá a ficha de avaliação preenchida na entrevista, na mesma ordem do papel, e anexe a ficha escaneada.
        A decisão (aprovar ou reprovar) é um passo separado, da gestão com a supervisora.
      </p>

      <ParteFicha n={1} titulo="Dados do candidato" nota="perguntados no início da entrevista · * obrigatório" />
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {DADOS_FICHA.map((d) =>
          d.tipo === "simnao" ? (
            <SimNao
              key={d.chave}
              chave={d.chave}
              rotulo={d.chave === "disponivel" && horario ? `Disponível no horário da vaga (${horario})?` : d.rotulo}
              detalhe={d.detalhe}
              obrigatoria={d.obrigatoria}
            />
          ) : (
            <div key={d.chave}>
              <label htmlFor={`dado_${d.chave}`} className="rotulo-campo">
                {d.rotulo}
              </label>
              <input
                id={`dado_${d.chave}`}
                name={`dado_${d.chave}`}
                defaultValue={d.chave === "bairro_cidade" ? bairroCidade : undefined}
                className="campo"
              />
            </div>
          )
        )}
      </div>

      <ParteFicha n={2} titulo="Avaliação da entrevista" nota="só o que foi observado aqui — nota de 0 a 10 e o porquê em uma linha" />
      <div className="divide-y divide-linha rounded-lg border border-linha">
        {CRITERIOS_ENTREVISTA.map((k, i) => (
          <div key={k.chave} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_5.5rem_1.4fr]">
            <label htmlFor={`nota_${k.chave}`} className="text-[0.8rem] text-navy-900">
              {i + 1}. {k.rotulo}
              <span className="block text-[0.7rem] leading-snug text-tenue">{k.ajuda}</span>
            </label>
            <input id={`nota_${k.chave}`} name={`nota_${k.chave}`} type="number" min={0} max={10} step={0.5} required className="campo" aria-label={`Nota: ${k.rotulo}`} />
            <input name={`just_${k.chave}`} className="campo" placeholder="Por quê (uma linha)" aria-label={`Por quê: ${k.rotulo}`} />
          </div>
        ))}
      </div>

      <ParteFicha n={3} titulo="Pontos observados" nota="exatamente 3 de cada, com exemplo concreto da entrevista" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["positivo", "3 pontos positivos"],
          ["atencao", "3 pontos de atenção"],
        ].map(([prefixo, titulo]) => (
          <fieldset key={prefixo} className="space-y-1.5">
            <legend className="rotulo-campo">{titulo}</legend>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 text-[0.75rem] tabular-nums text-tenue">{i}</span>
                <input name={`${prefixo}_${i}`} required className="campo" aria-label={`${titulo}, ${i}`} />
              </div>
            ))}
          </fieldset>
        ))}
      </div>

      <ParteFicha n={4} titulo="Fechamento" nota="preenchido ao final, antes de liberar o candidato" />
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="rotulo-campo">Entrevista realizada por</legend>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8rem]">
            {ENTREVISTADORES.map((nome) => (
              <label key={nome} className="flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" name="realizada_por" value={nome} defaultChecked={marcados.includes(primeiroNome(nome))} />
                {nome}
              </label>
            ))}
            <input name="realizada_outro" className="campo w-48" placeholder="Outro, quem?" aria-label="Outro entrevistador" />
          </div>
        </fieldset>
        <Nota nome="nota_entrevistador" rotulo="Nota geral do entrevistador" />
        <div />
        <fieldset className="sm:col-span-2">
          <legend className="rotulo-campo">Supervisora que participou</legend>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8rem]">
            {SUPERVISORAS.map((nome) => (
              <label key={nome} className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name="supervisora" value={nome} defaultChecked={supervisoraMarcada.includes(primeiroNome(nome))} />
                {nome}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" name="supervisora" value="OUTRA" />
              Outra:
            </label>
            <input name="supervisora_outra" className="campo w-40" placeholder="quem?" aria-label="Outra supervisora" />
            <label className="flex cursor-pointer items-center gap-1.5 text-tenue">
              <input type="radio" name="supervisora" value="" />
              Não participou
            </label>
          </div>
        </fieldset>
        <Nota nome="nota_supervisora" rotulo="Nota da supervisora" obrigatoria={false} />
        <div>
          <span className="rotulo-campo">Candidato aprovado?</span>
          <Escolha
            nome="parecer"
            opcoes={[
              ["APROVADO", "Sim, encaminhar para início"],
              ["REPROVADO", "Não"],
              ["RESERVA", "Reserva, chamar em outra vaga"],
            ]}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ficha" className="rotulo-campo">
            Ficha de avaliação escaneada (com as assinaturas)
          </label>
          <input id="ficha" name="ficha" type="file" accept=".pdf,.jpg,.jpeg,.png" className="campo py-1.5" />
        </div>
      </div>
    </FormularioAcao>
  );
}

export function PassoDecisao({ c, podeDecidir, config }: { c: Candidatura; podeDecidir: boolean; config: Configuracao }) {
  if (!podeDecidir) {
    return (
      <p className="text-[0.83rem] text-tenue">
        Aguardando a decisão da gestão (Leonardo, Rogerio e Luana, com a supervisora). Este login não registra a decisão.
      </p>
    );
  }
  // O aviso diz o que vai acontecer de fato: com o e-mail desligado, o retorno ao candidato é manual.
  const aprovacao = config.emails_ligados.includes("APROVADO") ? "a aprovação manda e-mail na hora" : "o e-mail de aprovação está desligado";
  const negativa = config.emails_ligados.includes("REPROVADO_ENTREVISTA")
    ? `a negativa sai em ${config.dias_espera_negativa} dia(s)`
    : "o e-mail de negativa está desligado — avise o candidato por fora";
  return (
    <FormularioAcao acao={decisaoAcao} botao="Registrar decisão" confirmar={`Registrar a decisão? Para o candidato: ${aprovacao}; ${negativa}.`}>
      <Oculto c={c} />
      <div className="space-y-3">
        <Escolha nome="resultado" opcoes={[["APROVADO", "Aprovar"], ["RESERVA", "Guardar na reserva"], ["REPROVADO", "Reprovar"]]} />
        <div>
          <label htmlFor="quem_decidiu" className="rotulo-campo">
            Quem participou da decisão
          </label>
          <input id="quem_decidiu" name="quem_decidiu" defaultValue="Leonardo, Rogerio, Luana e a supervisora" className="campo" />
        </div>
        <Motivo lista={MOTIVOS_REPROVACAO} />
        <div>
          <label htmlFor="comentario-decisao" className="rotulo-campo">
            Comentário
          </label>
          <input id="comentario-decisao" name="comentario" className="campo" />
        </div>
      </div>
    </FormularioAcao>
  );
}

export function PassoConfirmacao({ c, sugestao }: { c: Candidatura; sugestao: string }) {
  return (
    <FormularioAcao acao={confirmacaoAcao} botao="Confirmou o início — encaminhar ao RH">
      <Oculto c={c} />
      <div className="max-w-xs">
        <label htmlFor="data_inicio" className="rotulo-campo">
          Início (segunda-feira, se der)
        </label>
        <input id="data_inicio" name="data_inicio" type="date" defaultValue={sugestao} className="campo" />
        <p className="mt-1 text-[0.7rem] leading-snug text-tenue">
          Outro dia útil também vale; fica anotado no histórico para o RH ajustar a primeira semana.
        </p>
      </div>
    </FormularioAcao>
  );
}

export function PassoDesistencia({ c }: { c: Candidatura }) {
  return (
    <FormularioAcao acao={desistenciaAcao} botao="Registrar desistência" variante="perigo" confirmar="Encerrar a candidatura como desistência?">
      <Oculto c={c} />
      <Motivo lista={MOTIVOS_DESISTENCIA} rotulo="Motivo" />
    </FormularioAcao>
  );
}

export function PassoDesfazer({ c, negativaPendente, negativaEnviada }: { c: Candidatura; negativaPendente: boolean; negativaEnviada: boolean }) {
  return (
    <FormularioAcao acao={desfazerAcao} botao="Desfazer encerramento" variante="secundario" confirmar="Voltar a candidatura para a etapa anterior?">
      <Oculto c={c} />
      <p className="text-[0.8rem] text-tenue">
        Volta a candidatura para onde estava antes de ser encerrada.
        {negativaPendente && " O e-mail de negativa ainda não saiu e será cancelado."}
        {negativaEnviada && " Atenção: o e-mail de negativa já foi enviado ao candidato — avise-o pessoalmente."}
      </p>
    </FormularioAcao>
  );
}
