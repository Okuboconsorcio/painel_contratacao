/**
 * Apaga os dados locais do protótipo (`.dados/`) e recria os de exemplo.
 *
 *   npm run dados:zerar
 */

import { zerar } from "../src/lib/recrutamento/dados.ts";

const banco = zerar();
console.log(
  `Dados recriados: ${banco.vagas.length} vagas, ${banco.candidatos.length} candidatos, ${banco.candidaturas.length} candidaturas, ${banco.emails.length} e-mails.`
);
