import { CLICommandHandler } from "../cli-command-handler.service";

const handleInitCommandMock = jest.fn();
jest.mock("../../../commands/init", () => ({
  handleInitCommand: (...args: unknown[]) =>
    handleInitCommandMock(...args),
}));

const displaySchemaHelpMock = jest.fn();
const handleSchemaCommandMock = jest.fn();
jest.mock("../../../commands/schema", () => ({
  displaySchemaHelp: () => displaySchemaHelpMock(),
  handleSchemaCommand: (...args: unknown[]) =>
    handleSchemaCommandMock(...args),
}));

const importSpecMock = jest.fn();
jest.mock("../../swagger-import.service", () => ({
  SwaggerImportService: jest.fn().mockImplementation(() => ({
    importSpec: (...args: unknown[]) => importSpecMock(...args),
  })),
}));

const postmanExportFromResultsMock = jest.fn();
const postmanExportMock = jest.fn();
const postmanImportMock = jest.fn();
jest.mock("../../postman-collection.service", () => ({
  PostmanCollectionService: jest.fn().mockImplementation(() => ({
    exportFromExecutionResults: (...args: unknown[]) =>
      postmanExportFromResultsMock(...args),
    exportFromPath: (...args: unknown[]) => postmanExportMock(...args),
    importFromFile: (...args: unknown[]) => postmanImportMock(...args),
  })),
}));

describe("CLICommandHandler", () => {
  const createLogger = () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleInit", () => {
    it("should call init command handler", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);

      handleInitCommandMock.mockResolvedValue(undefined);
      const exitCode = await handler.handleInit(["--template", "basic"]);

      expect(exitCode).toBe(0);
      expect(handleInitCommandMock).toHaveBeenCalledWith([
        "--template",
        "basic",
      ]);
    });
  });

  describe("handleSchema", () => {
    it("should display schema help when requested", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);

      const exitCode = await handler.handleSchema("json", true);

      expect(exitCode).toBe(0);
      expect(displaySchemaHelpMock).toHaveBeenCalled();
      expect(handleSchemaCommandMock).not.toHaveBeenCalled();
    });

    it("should delegate to schema command handler", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      handleSchemaCommandMock.mockResolvedValue(0);

      const exitCode = await handler.handleSchema(undefined, false);

      expect(exitCode).toBe(0);
      expect(handleSchemaCommandMock).toHaveBeenCalledWith({
        format: "json",
        pretty: true,
      });
    });
  });

  describe("handleSwaggerImport", () => {
    it("should return success with warnings", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      importSpecMock.mockResolvedValue({
        success: true,
        warnings: ["be careful"],
        outputPath: "./tests/imported",
        generatedSuites: 4,
        generatedDocs: 1,
      });

      const exitCode = await handler.handleSwaggerImport("api.yaml", "./out");

      expect(exitCode).toBe(0);
      expect(importSpecMock).toHaveBeenCalledWith(
        "api.yaml",
        "./out",
        expect.objectContaining({
          generateDocs: true,
          includeExamples: true,
        })
      );
      expect(logger.warn).toHaveBeenCalledWith("  • be careful");
      expect(logger.info).toHaveBeenCalledWith(
        `📚 Generated documentation files: 1`
      );
    });

    it("should return failure when import fails", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      importSpecMock.mockResolvedValue({
        success: false,
        warnings: [],
        errors: ["bad spec"],
        outputPath: "",
        generatedSuites: 0,
        generatedDocs: 0,
      });

      const exitCode = await handler.handleSwaggerImport("api.yaml");

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("❌ Import failed:");
      expect(logger.error).toHaveBeenCalledWith("  • bad spec");
    });

    it("should handle unexpected errors", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      importSpecMock.mockRejectedValue(new Error("boom"));

      const exitCode = await handler.handleSwaggerImport("api.yaml");

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        "❌ Unexpected error during import:",
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe("handlePostmanExportFromResults", () => {
    it("should export successfully", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanExportFromResultsMock.mockResolvedValue({
        success: true,
        warnings: [],
        outputFiles: ["collection.json"],
      });

      const exitCode = await handler.handlePostmanExportFromResults(
        "results.json"
      );

      expect(exitCode).toBe(0);
      expect(logger.info).toHaveBeenCalledWith("📄 Generated: collection.json");
    });

    it("should report errors and return failure", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanExportFromResultsMock.mockResolvedValue({
        success: false,
        warnings: [],
        errors: ["bad file"],
      });

      const exitCode = await handler.handlePostmanExportFromResults(
        "results.json"
      );

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("  • bad file");
    });

    it("should handle exceptions", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanExportFromResultsMock.mockRejectedValue(new Error("fail"));

      const exitCode = await handler.handlePostmanExportFromResults(
        "results.json"
      );

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        "❌ Unexpected error during Postman export from results:",
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe("handlePostmanExport", () => {
    it("should export successfully with warnings", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanExportMock.mockResolvedValue({
        success: true,
        warnings: ["missing header"],
        outputFiles: ["export.json"],
      });

      const exitCode = await handler.handlePostmanExport("suite.yaml");

      expect(exitCode).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith("  • missing header");
      expect(logger.info).toHaveBeenCalledWith("📄 Generated: export.json");
    });

    it("should return failure when export fails", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanExportMock.mockResolvedValue({
        success: false,
        warnings: [],
        errors: ["cannot export"],
      });

      const exitCode = await handler.handlePostmanExport("suite.yaml");

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("❌ Export failed:");
      expect(logger.error).toHaveBeenCalledWith("  • cannot export");
    });

    it("should handle unexpected error", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanExportMock.mockRejectedValue(new Error("boom"));

      const exitCode = await handler.handlePostmanExport("suite.yaml");

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        "❌ Unexpected error during Postman export:",
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe("handlePostmanImport", () => {
    it("should warn when analyze dependencies without preserving folders", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanImportMock.mockResolvedValue({
        success: true,
        warnings: [],
        generatedSuites: 1,
        folderStructure: "",
        dependenciesFound: [],
        outputFiles: ["test.yaml"],
      });

      const exitCode = await handler.handlePostmanImport(
        "collection.json",
        undefined,
        false,
        true
      );

      expect(exitCode).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        "⚠️  --postman-analyze-deps requires --postman-preserve-folders, ignoring..."
      );
    });

    it("should import successfully with dependencies", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanImportMock.mockResolvedValue({
        success: true,
        warnings: ["minor warning"],
        generatedSuites: 2,
        folderStructure: "structure",
        dependenciesFound: [
          {
            variableName: "token",
            capturedBy: "auth",
            usedBy: ["suiteA"],
          },
        ],
        outputFiles: ["suiteA.yaml", "suiteB.yaml"],
      });

      const exitCode = await handler.handlePostmanImport(
        "collection.json",
        "out",
        true,
        true
      );

      expect(exitCode).toBe(0);
      expect(logger.info).toHaveBeenCalledWith("  • suiteA.yaml");
      expect(logger.warn).toHaveBeenCalledWith("  • minor warning");
      expect(
        postmanImportMock.mock.calls[0][1].preserveFolderStructure
      ).toBe(true);
    });

    it("should report errors when import fails", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanImportMock.mockResolvedValue({
        success: false,
        warnings: [],
        errors: ["invalid file"],
      });

      const exitCode = await handler.handlePostmanImport("collection.json");

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith("❌ Import failed:");
      expect(logger.error).toHaveBeenCalledWith("  • invalid file");
    });

    it("should handle unexpected errors", async () => {
      const logger = createLogger();
      const handler = new CLICommandHandler(logger as any);
      postmanImportMock.mockRejectedValue(new Error("bad"));

      const exitCode = await handler.handlePostmanImport("collection.json");

      expect(exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        "❌ Unexpected error during Postman import:",
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });
});
