/**
 * @fileoverview Tests for path helper functions
 */

import * as fs from "fs";
import * as path from "path";
import {
  resolvePath,
  fileExists,
  readFileBuffer,
  validateFilePath,
} from "../path.helper";

// Mock fs module
jest.mock("fs");

describe("path.helper", () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolvePath", () => {
    it("should resolve relative path with default baseDir", () => {
      const result = resolvePath("./certs/cert.pem");
      expect(result).toBe(path.resolve(process.cwd(), "./certs/cert.pem"));
    });

    it("should resolve relative path with custom baseDir", () => {
      const baseDir = "/custom/base";
      const result = resolvePath("./certs/cert.pem", baseDir);
      expect(result).toBe(path.resolve(baseDir, "./certs/cert.pem"));
    });

    it("should handle absolute paths", () => {
      const absolutePath = "/absolute/path/cert.pem";
      const result = resolvePath(absolutePath);
      expect(result).toBe(path.resolve(process.cwd(), absolutePath));
    });

    it("should handle paths without leading ./", () => {
      const result = resolvePath("certs/cert.pem");
      expect(result).toBe(path.resolve(process.cwd(), "certs/cert.pem"));
    });
  });

  describe("fileExists", () => {
    it("should return true when file exists and is a file", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);

      const result = fileExists("./cert.pem");
      expect(result).toBe(true);
    });

    it("should return false when file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = fileExists("./nonexistent.pem");
      expect(result).toBe(false);
    });

    it("should return false when path is a directory", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => false } as fs.Stats);

      const result = fileExists("./directory");
      expect(result).toBe(false);
    });

    it("should return false when fs throws error", () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = fileExists("./cert.pem");
      expect(result).toBe(false);
    });

    it("should use custom baseDir", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);

      const result = fileExists("./cert.pem", "/custom/base");
      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.resolve("/custom/base", "./cert.pem")
      );
    });
  });

  describe("readFileBuffer", () => {
    it("should read file and return buffer", () => {
      const mockBuffer = Buffer.from("certificate data");
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
      mockFs.readFileSync.mockReturnValue(mockBuffer);

      const result = readFileBuffer("./cert.pem");
      expect(result).toBe(mockBuffer);
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });

    it("should throw error when file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => readFileBuffer("./nonexistent.pem")).toThrow(
        "File not found"
      );
    });

    it("should throw error when path is not a file", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => false } as fs.Stats);

      expect(() => readFileBuffer("./directory")).toThrow("Path is not a file");
    });

    it("should use custom baseDir", () => {
      const mockBuffer = Buffer.from("data");
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
      mockFs.readFileSync.mockReturnValue(mockBuffer);

      readFileBuffer("./cert.pem", "/custom/base");
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.resolve("/custom/base", "./cert.pem")
      );
    });
  });

  describe("validateFilePath", () => {
    it("should return null for valid file", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);

      const result = validateFilePath("./cert.pem");
      expect(result).toBeNull();
    });

    it("should return error message when file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = validateFilePath("./nonexistent.pem");
      expect(result).toContain("file not found");
    });

    it("should return error message when path is not a file", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => false } as fs.Stats);

      const result = validateFilePath("./directory");
      expect(result).toContain("path is not a file");
    });

    it("should use custom file type in error message", () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = validateFilePath(
        "./cert.pem",
        process.cwd(),
        "Certificate"
      );
      expect(result).toContain("Certificate file not found");
    });

    it("should handle exceptions gracefully", () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = validateFilePath(
        "./cert.pem",
        process.cwd(),
        "Certificate"
      );
      expect(result).toContain("Certificate validation error");
      expect(result).toContain("Permission denied");
    });

    it("should use custom baseDir", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);

      validateFilePath("./cert.pem", "/custom/base", "Certificate");
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.resolve("/custom/base", "./cert.pem")
      );
    });
  });
});
