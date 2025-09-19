/**
 * @packageDocumentation
 * Exemplo de uso do Report Generator V2
 */

import { ReportGeneratorV2 } from "./report-generator-v2";
import { getTheme } from "./themes";

/**
 * Exemplo de como usar o Report Generator V2
 */
async function exemploUsoV2() {
  console.log(
    "[INFO] Exemplo do Report Generator V2 (dados de exemplo comentados temporariamente devido a problemas de tipagem complexos)"
  );
}

// Executar exemplo se chamado diretamente
if (require.main === module) {
  exemploUsoV2().catch(console.error);
}

export { exemploUsoV2 };
