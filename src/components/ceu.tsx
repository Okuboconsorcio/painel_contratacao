/**
 * O céu do Polaris — as estrelas da moldura.
 *
 * As posições **não** são sorteadas a cada abertura: vêm de um sorteio com
 * semente fixa, que dá sempre o mesmo resultado. Isso importa por dois motivos.
 * O servidor e o navegador desenham o mesmo céu (senão a tela "pula" ao
 * carregar), e a barra lateral vira um lugar reconhecível — as estrelas ficam
 * onde estavam ontem.
 *
 * Nada aqui é interativo nem lê dado nenhum: é enfeite, e enfeite fica atrás.
 */

/** Sorteio com semente (mulberry32): mesma semente, mesma sequência, sempre. */
function sorteio(semente: number) {
  let estado = semente;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Estrela = {
  x: number;
  y: number;
  raio: number;
  brilho: number;
  /** Só algumas cintilam; as outras ficam paradas. */
  cintila: boolean;
  periodo: number;
  atraso: number;
};

function montarCeu(semente: number, quantidade: number): Estrela[] {
  const proximo = sorteio(semente);
  const estrelas: Estrela[] = [];

  for (let i = 0; i < quantidade; i++) {
    const grande = proximo() > 0.93;
    estrelas.push({
      x: proximo() * 100,
      y: proximo() * 100,
      raio: grande ? 1.25 + proximo() * 0.5 : 0.35 + proximo() * 0.5,
      brilho: grande ? 0.55 + proximo() * 0.35 : 0.12 + proximo() * 0.4,
      // Uma em cada seis pisca. Um céu inteiro piscando vira ruído.
      cintila: proximo() > 0.84,
      periodo: 3.5 + proximo() * 4.5,
      atraso: proximo() * 6,
    });
  }

  return estrelas;
}

export function CeuEstrelado({
  semente = 7,
  quantidade = 80,
  className = "",
}: {
  semente?: number;
  quantidade?: number;
  className?: string;
}) {
  const estrelas = montarCeu(semente, quantidade);

  return (
    /*
     * Cada estrela é um ponto posicionado em porcentagem, com tamanho em pixel.
     * Poderia ser um SVG só, mas aí o desenho esticaria junto com a caixa e as
     * estrelas virariam ovais na barra lateral, que é alta e estreita.
     */
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {estrelas.map((e, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-estrela ${e.cintila ? "cintila" : ""}`}
          style={
            {
              left: `${e.x}%`,
              top: `${e.y}%`,
              width: `${e.raio * 2}px`,
              height: `${e.raio * 2}px`,
              opacity: e.brilho,
              boxShadow:
                e.raio > 1.2
                  ? `0 0 ${e.raio * 4}px ${e.raio}px rgba(238,243,255,0.28)`
                  : undefined,
              "--brilho-min": e.brilho * 0.35,
              "--brilho-max": Math.min(1, e.brilho * 1.5),
              "--periodo": `${e.periodo}s`,
              "--atraso": `${e.atraso}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/*
 * A Ursa Menor de verdade, na proporção certa: o cabo sai da Polaris e desce
 * até a concha. É por ela que se acha a Polaris no céu — e é ela que dá nome
 * ao sistema. Fica no fundo da barra, quase apagada, aparecendo onde o menu
 * não chega.
 */
const POLARIS: [number, number] = [86, 26];

/** α (Polaris), δ, ε, ζ — o cabo. */
const CABO: [number, number][] = [POLARIS, [70, 74], [54, 120], [46, 168]];

/** ζ, η, β (Kochab), γ (Pherkad) — a concha, fechando de volta em ζ. */
const CONCHA: [number, number][] = [
  [46, 168],
  [30, 214],
  [52, 258],
  [74, 226],
  [46, 168],
];

/** Raio de cada estrela, pela magnitude real: Polaris e Kochab são as maiores. */
const CORPOS: [number, number, number][] = [
  [86, 26, 3.4], // α Polaris — magnitude 1,98
  [70, 74, 1.5], // δ
  [54, 120, 1.6], // ε
  [46, 168, 1.6], // ζ
  [30, 214, 1.3], // η
  [52, 258, 3.2], // β Kochab — magnitude 2,08
  [74, 226, 2.3], // γ Pherkad
];

const caminho = (pontos: [number, number][]) =>
  pontos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");

export function UrsaMenor({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      viewBox="0 0 120 300"
      fill="none"
      aria-hidden
    >
      {/*
        `pathLength={1}` faz o traço ser medido de 0 a 1, qualquer que seja o
        comprimento real — assim a animação de desenhar a constelação funciona
        sem precisar acertar o número na mão.
      */}
      <g stroke="var(--estrela)" strokeWidth="0.6" opacity="0.22">
        <path d={caminho(CABO)} pathLength={1} className="traca" />
        <path d={caminho(CONCHA)} pathLength={1} className="traca" />
      </g>

      {CORPOS.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill={i === 0 ? "var(--polaris)" : "var(--estrela)"}
          opacity={i === 0 ? 0.5 : 0.3}
        />
      ))}
    </svg>
  );
}

/**
 * A marca: a Polaris com o brilho de quatro pontas. É o mesmo desenho que
 * marca a tela aberta no menu — a estrela que orienta é a mesma em toda parte.
 */
export function EstrelaPolaris({
  className = "",
  respira = false,
}: {
  className?: string;
  respira?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path
        d="M12 0.8 13.9 9.2 22.4 12 13.9 14.8 12 23.2 10.1 14.8 1.6 12 10.1 9.2Z"
        className={respira ? "respira" : undefined}
      />
    </svg>
  );
}
