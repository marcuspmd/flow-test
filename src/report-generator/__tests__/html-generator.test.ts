/**
 * Tests for HtmlGenerator
 */

import * as fs from "fs";
import * as path from "path";
import {
  HtmlGenerator,
  HTMLReportGenerator,
  HTMLGeneratorOptions,
} from "../html-generator";
import { ModularHtmlGenerator } from "../modular-html-generator";

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock("../modular-html-generator");

const mockFs = fs as jest.Mocked<typeof fs>;
const MockModularHtmlGenerator = ModularHtmlGenerator as jest.MockedClass<
  typeof ModularHtmlGenerator
>;

describe("HtmlGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (mockFs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (mockFs.readFileSync as jest.Mock).mockReturnValue("{}");
  });

  describe("constructor", () => {
    it("deve criar instância com opções padrão", () => {
      const generator = new HtmlGenerator();
      expect(generator).toBeInstanceOf(HtmlGenerator);
    });

    it("deve criar instância com opções customizadas", () => {
      const options: HTMLGeneratorOptions = {
        outputDir: "./custom-output",
      };
      const generator = new HtmlGenerator(options);
      expect(generator).toBeInstanceOf(HtmlGenerator);
    });
  });

  describe("generateHTML", () => {
    it("deve gerar HTML usando modular generator", async () => {
      const mockData = { suite_name: "test", total_time: 1000, steps: [] };
      const htmlGenerator = new HtmlGenerator();

      // Mock do método generate na instância
      const generateSpy = jest
        .spyOn(htmlGenerator["modularGenerator"], "generate")
        .mockReturnValue("<html>test</html>");

      const result = await htmlGenerator.generateHTML(mockData);

      expect(result).toBe("<html>test</html>");
      expect(generateSpy).toHaveBeenCalledWith(mockData);
    });

    it("deve salvar arquivo quando outputPath é fornecido", async () => {
      const mockData = { suite_name: "test", total_time: 1000, steps: [] };
      const outputPath = "./test-output.html";
      const htmlGenerator = new HtmlGenerator();

      // Mock do método generate na instância
      const generateSpy = jest
        .spyOn(htmlGenerator["modularGenerator"], "generate")
        .mockReturnValue("<html>test</html>");

      const result = await htmlGenerator.generateHTML(mockData, outputPath);

      // O código salva o arquivo fornecido + latest.html e retorna o outputPath
      expect(result).toBe(outputPath);
      expect(generateSpy).toHaveBeenCalledWith(mockData);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        outputPath,
        "<html>test</html>",
        "utf8"
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "latest.html",
        "<html>test</html>",
        "utf8"
      );
    });
  });

  describe("generateFromJSON", () => {
    it("deve gerar HTML a partir de arquivo JSON", async () => {
      const jsonPath = "./test.json";
      const htmlGenerator = new HtmlGenerator();

      // Mock do método generate na instância
      const generateSpy = jest
        .spyOn(htmlGenerator["modularGenerator"], "generate")
        .mockReturnValue("<html>test</html>");

      const result = await htmlGenerator.generateFromJSON(jsonPath);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(jsonPath, "utf8");
      expect(generateSpy).toHaveBeenCalled();
      // generateFromJSON sempre retorna um path, não o conteúdo HTML
      expect(typeof result).toBe("string");
      expect(result).toMatch(/test_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.html$/);
    });
  });
});

describe("HTMLReportGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (mockFs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (mockFs.readFileSync as jest.Mock).mockReturnValue("{}");
  });

  it("deve criar instância com configuração padrão", () => {
    const generator = new HTMLReportGenerator();
    expect(generator).toBeInstanceOf(HTMLReportGenerator);
  });

  it("deve criar instância com opções customizadas", () => {
    const options: HTMLGeneratorOptions = {
      outputDir: "./custom-output",
    };
    const generator = new HTMLReportGenerator(options);
    expect(generator).toBeInstanceOf(HTMLReportGenerator);
  });
});
