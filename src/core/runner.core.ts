import fs from "fs";
import yaml from "js-yaml";
import { TestSuite } from "../types/common.types";

class Runner {
  private readonly suite: TestSuite;
  private variables: Record<string, any>;

  /**
   * Carrega e inicializa a suíte de testes a partir de um arquivo.
   * @param filePath O caminho para o arquivo .yaml ou .yml da suíte de testes.
   */
  constructor(filePath: string) {
    try {
      console.log(`[INFO] A carregar a suíte de testes de: ${filePath}`);
      const fileContent = fs.readFileSync(filePath, "utf8");
      this.suite = yaml.load(fileContent) as TestSuite;
      this.variables = this.suite.variables || {};
      console.log(
        `[INFO] Suíte "${this.suite.suite_name}" carregada com sucesso.`
      );
    } catch (error) {
      console.error(
        "[ERRO] Falha ao carregar ou interpretar o arquivo de teste:",
        error
      );
      process.exit(1); // Encerra a execução em caso de erro de carregamento
    }
  }

  /**
   * Executa todas as etapas da suíte de testes em sequência.
   */
  public async run(): Promise<void> {
    console.log(`\n--- A iniciar a suíte: ${this.suite.suite_name} ---\n`);

    for (const [index, step] of this.suite.steps.entries()) {
      console.log(
        `[ETAPA ${index + 1}/${this.suite.steps.length}] A executar: ${
          step.name
        }`
      );

      //
      // --- LÓGICA PRINCIPAL VIRÁ AQUI ---
      // 1. Interpolar variáveis na requisição.
      // 2. Executar a requisição HTTP com Axios.
      // 3. Executar as asserções na resposta.
      // 4. Capturar novas variáveis da resposta.
      //

      // Placeholder para indicar sucesso por enquanto
      console.log(`  [✓] Etapa concluída (lógica de execução pendente).`);
    }

    console.log(`\n--- Suíte finalizada ---\n`);
    console.log("Variáveis finais em memória:", this.variables);
  }
}

export { Runner };
