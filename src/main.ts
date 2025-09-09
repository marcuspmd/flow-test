import fs from "fs";
import { Runner } from "./core/runner.core";

// Ponto de entrada da aplicação
async function main() {
  const testFile = process.argv[2] || "./tests/start-flow.yaml";

  if (!fs.existsSync(testFile)) {
    console.error(`[ERRO] Arquivo de teste não encontrado: ${testFile}`);
    return;
  }

  const runner = new Runner(testFile);
  await runner.run();
}

main();
