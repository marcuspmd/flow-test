import { SwaggerParser } from "../swagger-parser";
import { OpenAPIValidator } from "../validator";
import * as fs from "fs";
import * as yaml from "js-yaml";

// Mock das dependências
jest.mock("fs");
jest.mock("js-yaml");
jest.mock("../validator");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;
const mockValidator = OpenAPIValidator as jest.Mocked<typeof OpenAPIValidator>;

describe("SwaggerParser", () => {
  let parser: SwaggerParser;

  beforeEach(() => {
    parser = new SwaggerParser();
    jest.clearAllMocks();

    // Setup default mocks
    mockValidator.validateSpec = jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      version: "3.0.0",
    });
  });

  describe("parseFile", () => {
    const mockOpenAPISpec = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            summary: "Get users",
            responses: {
              "200": {
                description: "Successful response",
              },
            },
          },
          post: {
            summary: "Create user",
            parameters: [
              {
                name: "id",
                in: "query",
                required: false,
                schema: { type: "string" },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
            responses: {
              "201": {
                description: "User created",
              },
            },
          },
        },
        "/users/{id}": {
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          get: {
            summary: "Get user by ID",
            responses: {
              "200": {
                description: "User found",
              },
            },
          },
        },
      },
    };

    beforeEach(() => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockOpenAPISpec));
    });

    it("should successfully parse valid JSON Swagger file", async () => {
      const result = await parser.parseFile("/path/to/swagger.json");

      expect(result).toBeDefined();
      expect(result.spec).toEqual(mockOpenAPISpec);
      expect(result.endpoints).toHaveLength(3); // GET /users, POST /users, GET /users/{id}
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "/path/to/swagger.json",
        "utf-8"
      );
    });

    it("should successfully parse valid YAML Swagger file", async () => {
      mockYaml.load.mockReturnValue(mockOpenAPISpec);

      const result = await parser.parseFile("/path/to/swagger.yaml");

      expect(result.spec).toEqual(mockOpenAPISpec);
      expect(result.endpoints).toHaveLength(3);
      expect(mockYaml.load).toHaveBeenCalled();
    });

    it("should successfully parse valid YML Swagger file", async () => {
      mockYaml.load.mockReturnValue(mockOpenAPISpec);

      const result = await parser.parseFile("/path/to/swagger.yml");

      expect(result.spec).toEqual(mockOpenAPISpec);
      expect(result.endpoints).toHaveLength(3);
      expect(mockYaml.load).toHaveBeenCalled();
    });

    it("should handle file reading errors", async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const result = await parser.parseFile("/path/to/nonexistent.json");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(
        "Erro ao processar arquivo /path/to/nonexistent.json: File not found"
      );
      expect(result.spec).toEqual({});
      expect(result.endpoints).toEqual([]);
    });

    it("should handle JSON parsing errors", async () => {
      mockFs.readFileSync.mockReturnValue("invalid json content");

      const result = await parser.parseFile("/path/to/invalid.json");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Erro ao processar arquivo");
    });

    it("should handle YAML parsing errors", async () => {
      mockYaml.load.mockImplementation(() => {
        throw new Error("Invalid YAML");
      });

      const result = await parser.parseFile("/path/to/invalid.yaml");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Invalid YAML");
    });

    it("should handle unsupported file extensions", async () => {
      const result = await parser.parseFile("/path/to/spec.xml");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(
        "Formato de arquivo não suportado: .xml"
      );
    });

    it("should handle validation errors from OpenAPIValidator", async () => {
      mockValidator.validateSpec.mockReturnValue({
        isValid: false,
        errors: ["Missing required field: info"],
        warnings: ["Deprecated field used"],
        version: "3.0.0",
      });

      const result = await parser.parseFile("/path/to/invalid-spec.json");

      expect(result.errors).toContain("Missing required field: info");
      expect(result.warnings).toContain("Deprecated field used");
      expect(result.endpoints).toEqual([]);
    });

    it("should extract correct endpoint information", async () => {
      const result = await parser.parseFile("/path/to/swagger.json");

      expect(result.endpoints).toHaveLength(3);

      // Verify GET /users
      const getUsersEndpoint = result.endpoints.find(
        (e) => e.path === "/users" && e.method === "GET"
      );
      expect(getUsersEndpoint).toBeDefined();
      expect(getUsersEndpoint!.operation.summary).toBe("Get users");

      // Verify POST /users
      const postUsersEndpoint = result.endpoints.find(
        (e) => e.path === "/users" && e.method === "POST"
      );
      expect(postUsersEndpoint).toBeDefined();
      expect(postUsersEndpoint!.operation.summary).toBe("Create user");
      expect(postUsersEndpoint!.parameters).toHaveLength(1);
      expect(postUsersEndpoint!.requestBody).toBeDefined();

      // Verify GET /users/{id}
      const getUserByIdEndpoint = result.endpoints.find(
        (e) => e.path === "/users/{id}" && e.method === "GET"
      );
      expect(getUserByIdEndpoint).toBeDefined();
      expect(getUserByIdEndpoint!.operation.summary).toBe("Get user by ID");
      expect(getUserByIdEndpoint!.parameters).toHaveLength(1); // Path parameter
    });

    it("should handle spec with no paths", async () => {
      const specWithoutPaths = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(specWithoutPaths));

      const result = await parser.parseFile("/path/to/no-paths.json");

      expect(result.endpoints).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("should combine path-level and operation-level parameters", async () => {
      const result = await parser.parseFile("/path/to/swagger.json");

      const getUserByIdEndpoint = result.endpoints.find(
        (e) => e.path === "/users/{id}" && e.method === "GET"
      );
      expect(getUserByIdEndpoint).toBeDefined();
      expect(getUserByIdEndpoint!.parameters).toHaveLength(1);
      expect(getUserByIdEndpoint!.parameters[0].name).toBe("id");
      expect(getUserByIdEndpoint!.parameters[0].in).toBe("path");
    });
  });

  describe("resolveRef", () => {
    beforeEach(() => {
      // Setup a spec with references for testing
      const specWithRefs = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
          parameters: {
            userId: {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          },
        },
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(specWithRefs));
    });

    it("should resolve valid internal references", async () => {
      await parser.parseFile("/path/to/swagger.json");

      const resolved = parser.resolveRef("#/components/schemas/User");

      expect(resolved).toEqual({
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      });
    });

    it("should resolve nested references", async () => {
      await parser.parseFile("/path/to/swagger.json");

      const resolved = parser.resolveRef("#/components/parameters/userId");

      expect(resolved).toEqual({
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
      });
    });

    it("should throw error for external references", async () => {
      await parser.parseFile("/path/to/swagger.json");

      expect(() => {
        parser.resolveRef("external.yaml#/components/schemas/User");
      }).toThrow("Referências externas não são suportadas");
    });

    it("should throw error for non-existent references", async () => {
      await parser.parseFile("/path/to/swagger.json");

      expect(() => {
        parser.resolveRef("#/components/schemas/NonExistent");
      }).toThrow("Referência não encontrada");
    });

    it("should throw error for malformed reference paths", async () => {
      await parser.parseFile("/path/to/swagger.json");

      expect(() => {
        parser.resolveRef("#/invalid/path/structure");
      }).toThrow("Referência não encontrada");
    });

    it("should handle references to undefined values", async () => {
      await parser.parseFile("/path/to/swagger.json");

      expect(() => {
        parser.resolveRef("#/components/responses/undefined");
      }).toThrow("Referência não encontrada");
    });
  });

  describe("getSpec", () => {
    it("should return null before parsing", () => {
      expect(parser.getSpec()).toBeNull();
    });

    it("should return spec after successful parsing", async () => {
      const mockSpec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSpec));

      await parser.parseFile("/path/to/swagger.json");

      expect(parser.getSpec()).toEqual(mockSpec);
    });

    it("should return empty spec after failed parsing", async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File read error");
      });

      await parser.parseFile("/path/to/invalid.json");

      expect(parser.getSpec()).toBeNull();
    });
  });

  describe("Static methods", () => {
    describe("isSupportedFile", () => {
      it("should return true for JSON files", () => {
        expect(SwaggerParser.isSupportedFile("/path/to/spec.json")).toBe(true);
      });

      it("should return true for YAML files", () => {
        expect(SwaggerParser.isSupportedFile("/path/to/spec.yaml")).toBe(true);
      });

      it("should return true for YML files", () => {
        expect(SwaggerParser.isSupportedFile("/path/to/spec.yml")).toBe(true);
      });

      it("should return false for unsupported files", () => {
        expect(SwaggerParser.isSupportedFile("/path/to/spec.xml")).toBe(false);
        expect(SwaggerParser.isSupportedFile("/path/to/spec.txt")).toBe(false);
        expect(SwaggerParser.isSupportedFile("/path/to/spec")).toBe(false);
      });

      it("should handle case insensitive extensions", () => {
        expect(SwaggerParser.isSupportedFile("/path/to/spec.JSON")).toBe(true);
        expect(SwaggerParser.isSupportedFile("/path/to/spec.YAML")).toBe(true);
        expect(SwaggerParser.isSupportedFile("/path/to/spec.YML")).toBe(true);
      });
    });

    describe("getFileType", () => {
      it('should return "json" for JSON files', () => {
        expect(SwaggerParser.getFileType("/path/to/spec.json")).toBe("json");
      });

      it('should return "yaml" for YAML files', () => {
        expect(SwaggerParser.getFileType("/path/to/spec.yaml")).toBe("yaml");
      });

      it('should return "yaml" for YML files', () => {
        expect(SwaggerParser.getFileType("/path/to/spec.yml")).toBe("yaml");
      });

      it("should return null for unsupported files", () => {
        expect(SwaggerParser.getFileType("/path/to/spec.xml")).toBeNull();
        expect(SwaggerParser.getFileType("/path/to/spec.txt")).toBeNull();
        expect(SwaggerParser.getFileType("/path/to/spec")).toBeNull();
      });

      it("should handle case insensitive extensions", () => {
        expect(SwaggerParser.getFileType("/path/to/spec.JSON")).toBe("json");
        expect(SwaggerParser.getFileType("/path/to/spec.YAML")).toBe("yaml");
        expect(SwaggerParser.getFileType("/path/to/spec.YML")).toBe("yaml");
      });
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle parameter resolution errors gracefully", async () => {
      const specWithBadRefs = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              parameters: [{ $ref: "#/components/parameters/nonexistent" }],
              responses: {
                "200": { description: "Success" },
              },
            },
          },
        },
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(specWithBadRefs));

      // Mock console.warn to avoid noise in tests
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await parser.parseFile("/path/to/bad-refs.json");

      expect(result.endpoints).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to resolve parameter reference")
      );

      consoleSpy.mockRestore();
    });

    it("should handle operations with missing responses", async () => {
      const specWithMissingResponses = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              summary: "Get users",
              // Missing responses
            },
          },
        },
      };
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify(specWithMissingResponses)
      );

      const result = await parser.parseFile("/path/to/no-responses.json");

      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].responses).toEqual({});
    });

    it("should handle all HTTP methods", async () => {
      const specWithAllMethods = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: { responses: { "200": { description: "OK" } } },
            post: { responses: { "201": { description: "Created" } } },
            put: { responses: { "200": { description: "Updated" } } },
            delete: { responses: { "204": { description: "Deleted" } } },
            patch: { responses: { "200": { description: "Patched" } } },
            head: { responses: { "200": { description: "Head" } } },
            options: { responses: { "200": { description: "Options" } } },
            trace: { responses: { "200": { description: "Trace" } } },
          },
        },
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(specWithAllMethods));

      const result = await parser.parseFile("/path/to/all-methods.json");

      expect(result.endpoints).toHaveLength(8);
      expect(result.endpoints.map((e) => e.method)).toContain("GET");
      expect(result.endpoints.map((e) => e.method)).toContain("POST");
      expect(result.endpoints.map((e) => e.method)).toContain("PUT");
      expect(result.endpoints.map((e) => e.method)).toContain("DELETE");
      expect(result.endpoints.map((e) => e.method)).toContain("PATCH");
      expect(result.endpoints.map((e) => e.method)).toContain("HEAD");
      expect(result.endpoints.map((e) => e.method)).toContain("OPTIONS");
      expect(result.endpoints.map((e) => e.method)).toContain("TRACE");
    });

    it("should handle empty path items", async () => {
      const specWithEmptyPaths = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/empty": {},
        },
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(specWithEmptyPaths));

      const result = await parser.parseFile("/path/to/empty-paths.json");

      expect(result.endpoints).toEqual([]);
    });
  });
});
