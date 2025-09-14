/**
 * HTML Generator - Compatibilidade com sistema antigo
 *
 * Este arquivo mantém a interface original mas delega
 * a geração para o novo sistema modular de componentes
 */

import * as fs from "fs";
import * as path from "path";
import { ModularHtmlGenerator } from "./modular-html-generator";

export interface HTMLGeneratorOptions {
  templateDir?: string;
  outputDir?: string;
  includeCurlCommands?: boolean;
  includeRawData?: boolean;
  theme?: "light" | "dark" | "auto";
}

export class HtmlGenerator {
  private modularGenerator: ModularHtmlGenerator;
  private options: HTMLGeneratorOptions;

  constructor(options: HTMLGeneratorOptions = {}) {
    this.modularGenerator = new ModularHtmlGenerator();
    this.options = {
      outputDir: "./results",
      includeCurlCommands: true,
      includeRawData: true,
      theme: "auto",
      ...options,
    };
  }

  /**
   * Método principal - mantém compatibilidade com API original
   */
  async generateReport(data: any, outputPath: string): Promise<void> {
    try {
      const htmlContent = this.modularGenerator.generate(data);

      // Garantir que o diretório existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Escrever arquivo
      fs.writeFileSync(outputPath, htmlContent, "utf8");

      console.log(`[INFO] Relatório HTML gerado: ${outputPath}`);
    } catch (error) {
      console.error("[ERRO] Falha ao gerar relatório HTML:", error);
      throw error;
    }
  }

  /**
   * Método para gerar HTML sem salvar (usado por outros métodos)
   */
  generateHTML(data: any, outputPath?: string): Promise<string> {
    const htmlContent = this.modularGenerator.generate(data);

    if (outputPath) {
      // Garantir que o diretório existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Escrever arquivo
      fs.writeFileSync(outputPath, htmlContent, "utf8");

      // Também criar latest.html
      const latestPath = path.join(path.dirname(outputPath), "latest.html");
      fs.writeFileSync(latestPath, htmlContent, "utf8");

      console.log(`[INFO] Relatório HTML gerado: ${outputPath}`);

      return Promise.resolve(outputPath);
    }

    // Se não há outputPath, retorna o conteúdo HTML
    return Promise.resolve(htmlContent);
  }

  /**
   * Método para gerar de JSON (compatibilidade com CLI)
   */
  async generateFromJSON(
    jsonPath: string,
    outputPath?: string
  ): Promise<string> {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

      if (!outputPath) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const baseName = path.basename(jsonPath, path.extname(jsonPath));
        outputPath = path.join(
          this.options.outputDir || "./results",
          `${baseName}_${timestamp}.html`
        );
      }

      await this.generateHTML(jsonData, outputPath);
      return outputPath;
    } catch (error) {
      console.error("[ERRO] Falha ao gerar relatório de JSON:", error);
      throw error;
    }
  }
}

// Classe principal exportada para compatibilidade
export class HTMLReportGenerator extends HtmlGenerator {
  constructor(options: HTMLGeneratorOptions = {}) {
    super(options);
  }
}
