import { jest } from "@jest/globals";

// Mock functions
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockProcessExit = jest.fn();
const mockGenerateFromJSON = jest.fn<() => Promise<string>>();
const mockPathResolve = jest.fn();

// Mock dependencies before importing CLI
jest.mock("path", () => ({
  resolve: mockPathResolve,
}));

jest.mock("../html-generator", () => ({
  HTMLReportGenerator: jest.fn().mockImplementation(() => ({
    generateFromJSON: mockGenerateFromJSON,
  })),
}));

// Store originals
const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

describe("CLI Report Generator", () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup console and process mocks
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    process.exit = mockProcessExit as any;

    // Setup default path mock
    mockPathResolve.mockReturnValue("/mock/path/results/latest.json");

    // Clear module cache
    jest.resetModules();
  });

  afterEach(() => {
    // Restore originals
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  describe("Successful Generation", () => {
    it("should generate HTML report successfully", async () => {
      // Arrange
      const expectedOutput = "/path/to/report.html";
      mockGenerateFromJSON.mockResolvedValue(expectedOutput);

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Generating HTML report viewer..."
      );
      expect(mockPathResolve).toHaveBeenCalledWith(
        process.cwd(),
        "results/latest.json"
      );
      expect(mockGenerateFromJSON).toHaveBeenCalledWith(
        "/mock/path/results/latest.json"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "✅ HTML report viewer generated successfully!"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `📄 Report: ${expectedOutput}`
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `🌐 Open in browser: file://${expectedOutput}`
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it("should handle different output paths", async () => {
      // Arrange
      const customPath = "/custom/output/path.html";
      mockGenerateFromJSON.mockResolvedValue(customPath);

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(`📄 Report: ${customPath}`);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `🌐 Open in browser: file://${customPath}`
      );
    });

    it("should resolve path correctly", async () => {
      // Arrange
      const expectedResolvedPath = "/resolved/path/latest.json";
      mockPathResolve.mockReturnValue(expectedResolvedPath);
      mockGenerateFromJSON.mockResolvedValue("/output.html");

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockPathResolve).toHaveBeenCalledWith(
        process.cwd(),
        "results/latest.json"
      );
      expect(mockGenerateFromJSON).toHaveBeenCalledWith(expectedResolvedPath);
    });
  });

  describe("Error Handling", () => {
    it("should handle generator errors", async () => {
      // Arrange
      const errorMessage = "Generator failed";
      mockGenerateFromJSON.mockRejectedValue(new Error(errorMessage));

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Generating HTML report viewer..."
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Error generating HTML report:",
        errorMessage
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error exceptions", async () => {
      // Arrange
      const stringError = "String error message";
      mockGenerateFromJSON.mockRejectedValue(stringError);

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Error generating HTML report:",
        stringError
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should handle path resolution errors", async () => {
      // Arrange
      const pathError = "Path resolution failed";
      mockPathResolve.mockImplementation(() => {
        throw new Error(pathError);
      });

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Error generating HTML report:",
        pathError
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should handle synchronous generator errors", async () => {
      // Arrange
      const syncError = "Synchronous error";
      mockGenerateFromJSON.mockImplementation(() => {
        throw new Error(syncError);
      });

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Error generating HTML report:",
        syncError
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty output path", async () => {
      // Arrange
      mockGenerateFromJSON.mockResolvedValue("");

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith("📄 Report: ");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "🌐 Open in browser: file://"
      );
    });

    it("should handle special characters in path", async () => {
      // Arrange
      const specialPath = "/path/with spaces/[special]/report.html";
      mockGenerateFromJSON.mockResolvedValue(specialPath);

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(`📄 Report: ${specialPath}`);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `🌐 Open in browser: file://${specialPath}`
      );
    });

    it("should handle Error without message", async () => {
      // Arrange
      const errorWithoutMessage = { name: "CustomError" } as Error;
      mockGenerateFromJSON.mockRejectedValue(errorWithoutMessage);

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Error generating HTML report:",
        errorWithoutMessage
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should handle null/undefined errors", async () => {
      // Arrange
      mockGenerateFromJSON.mockRejectedValue(null);

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Error generating HTML report:",
        null
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("Integration Flow", () => {
    it("should execute in correct order", async () => {
      // Arrange
      const outputPath = "/final/report.html";
      mockGenerateFromJSON.mockResolvedValue(outputPath);

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - Verify complete flow
      expect(mockConsoleLog).toHaveBeenCalledTimes(4);
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        1,
        "Generating HTML report viewer..."
      );
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        2,
        "✅ HTML report viewer generated successfully!"
      );
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        3,
        `📄 Report: ${outputPath}`
      );
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        4,
        `🌐 Open in browser: file://${outputPath}`
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it("should not show success messages on error", async () => {
      // Arrange
      mockGenerateFromJSON.mockRejectedValue(new Error("Test error"));

      // Act
      require("../cli");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Generating HTML report viewer..."
      );
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        "✅ HTML report viewer generated successfully!"
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Error generating HTML report:",
        "Test error"
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });
});
