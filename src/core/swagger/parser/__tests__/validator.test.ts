import { OpenAPIValidator } from "../validator";
import { OpenAPISpec } from "../../../../types/swagger.types";

describe("OpenAPIValidator", () => {
  describe("validateSpec", () => {
    const validOpenAPI3Spec: OpenAPISpec = {
      openapi: "3.0.0",
      info: {
        title: "Test API",
        version: "1.0.0",
        description: "A test API",
      },
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
        },
      },
    };

    const validSwagger2Spec: OpenAPISpec = {
      swagger: "2.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      host: "api.example.com",
      schemes: ["https"],
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
        },
      },
    };

    it("should validate valid OpenAPI 3.0 spec successfully", () => {
      const result = OpenAPIValidator.validateSpec(validOpenAPI3Spec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.version).toBe("3.0.0");
    });

    it("should validate valid Swagger 2.0 spec successfully", () => {
      const result = OpenAPIValidator.validateSpec(validSwagger2Spec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.version).toBe("2.0");
    });

    it("should detect missing info field", () => {
      const invalidSpec = {
        openapi: "3.0.0",
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(invalidSpec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Campo "info" é obrigatório');
    });

    it("should detect missing info.title", () => {
      const invalidSpec = {
        openapi: "3.0.0",
        info: {
          version: "1.0.0",
        },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(invalidSpec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Campo "info.title" é obrigatório');
    });

    it("should detect missing info.version", () => {
      const invalidSpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
        },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(invalidSpec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Campo "info.version" é obrigatório');
    });

    it("should detect missing paths", () => {
      const invalidSpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(invalidSpec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Campo "paths" é obrigatório e deve conter pelo menos um caminho'
      );
    });

    it("should detect empty paths object", () => {
      const invalidSpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {},
      } as any;

      const result = OpenAPIValidator.validateSpec(invalidSpec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Campo "paths" é obrigatório e deve conter pelo menos um caminho'
      );
    });

    it("should handle unknown spec type", () => {
      const unknownSpec = {
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(unknownSpec);

      expect(result.version).toBe("2.0");
    });
  });

  describe("OpenAPI 3.x validation", () => {
    it("should warn about unsupported OpenAPI version", () => {
      const spec = {
        openapi: "4.0.0", // Version that doesn't start with '3.'
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'Versão OpenAPI "4.0.0" pode ter compatibilidade limitada'
      );
    });

    it("should validate servers with missing URL", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        servers: [
          { url: "https://api.example.com" },
          { description: "Development server" }, // Missing URL
        ],
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Server 1 deve ter uma URL definida");
    });

    it("should validate components with schemas", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
            InvalidType: {
              type: "customType", // Invalid type
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'Component Schema "InvalidType": Tipo "customType" pode não ser totalmente suportado'
      );
    });

    it("should validate security schemes", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
        components: {
          securitySchemes: {
            noType: {
              // Missing type
            },
            invalidType: {
              type: "invalid",
            },
            apiKeyMissingFields: {
              type: "apiKey",
              // Missing name and in
            },
            httpMissingScheme: {
              type: "http",
              // Missing scheme
            },
            validApiKey: {
              type: "apiKey",
              name: "X-API-Key",
              in: "header",
            },
          },
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Security Scheme "noType": Campo "type" é obrigatório'
      );
      expect(result.errors).toContain(
        'Security Scheme "invalidType": Tipo "invalid" inválido'
      );
      expect(result.errors).toContain(
        'Security Scheme "apiKeyMissingFields": Campos "name" e "in" são obrigatórios para apiKey'
      );
      expect(result.errors).toContain(
        'Security Scheme "httpMissingScheme": Campo "scheme" é obrigatório para http'
      );
    });
  });

  describe("Swagger 2.0 validation", () => {
    it("should warn about unsupported Swagger version", () => {
      const spec = {
        swagger: "1.2",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'Versão Swagger "1.2" não é totalmente suportada'
      );
    });

    it("should recommend schemes when host is defined", () => {
      const spec = {
        swagger: "2.0",
        info: { title: "Test API", version: "1.0.0" },
        host: "api.example.com",
        // Missing schemes
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'Campo "schemes" recomendado quando "host" está definido'
      );
    });

    it("should validate definitions", () => {
      const spec = {
        swagger: "2.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
        definitions: {
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
          },
          InvalidType: {
            type: "customType", // Invalid type
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'Definition "InvalidType": Tipo "customType" pode não ser totalmente suportado'
      );
    });
  });

  describe("Paths validation", () => {
    it("should warn about paths not starting with /", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          users: {
            // Missing leading slash
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'Caminho "users" deveria começar com "/"'
      );
    });

    it("should warn about paths without operations", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/empty": {
            description: "Empty path",
            // No operations
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'Caminho "/empty" não possui operações definidas'
      );
    });

    it("should validate path-level parameters", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users/{id}": {
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
              },
              {
                name: "id", // Duplicate name
                in: "query",
              },
              {
                // Missing name
                in: "header",
              },
              {
                name: "invalid",
                in: "invalid", // Invalid location
              },
            ],
            get: {
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('/users/{id}: Parâmetro "id" duplicado');
      expect(result.errors).toContain(
        "/users/{id}: Parâmetro deve ter um nome definido"
      );
      expect(result.errors).toContain(
        '/users/{id}: Parâmetro "invalid" deve ter "in" válido (query, header, path, cookie)'
      );
    });

    it("should validate operation-level parameters", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  name: "filter",
                  in: "query",
                },
                {
                  name: "filter", // Duplicate
                  in: "header",
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '/users (GET): Parâmetro "filter" duplicado'
      );
    });

    it("should require path parameters to be required", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users/{id}": {
            get: {
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: false, // Path params must be required
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '/users/{id} (GET): Parâmetro path "id" deve ser obrigatório'
      );
    });
  });

  describe("Operation validation", () => {
    it("should require at least one response", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              // Missing responses
            },
            post: {
              responses: {}, // Empty responses
            },
          },
        },
      } as any;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "GET /users: Pelo menos uma resposta deve ser definida"
      );
      expect(result.errors).toContain(
        "POST /users: Pelo menos uma resposta deve ser definida"
      );
    });

    it("should recommend success responses", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              responses: {
                "404": { description: "Not found" },
                "500": { description: "Server error" },
                // No 2xx response
              },
            },
            post: {
              responses: {
                default: { description: "Default response" },
                // Has default, should be OK
              },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        "GET /users: Recomendável definir resposta de sucesso (2xx)"
      );
      expect(result.warnings).not.toContain(
        "POST /users: Recomendável definir resposta de sucesso (2xx)"
      );
    });

    it("should validate operationId format", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              operationId: "invalid-operation@id!", // Invalid characters
              responses: { "200": { description: "OK" } },
            },
            post: {
              operationId: "valid_operation-id.v2", // Valid characters
              responses: { "201": { description: "Created" } },
            },
          },
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.warnings).toContain(
        'GET /users: operationId "invalid-operation@id!" contém caracteres especiais'
      );
      expect(result.warnings).not.toContain(
        expect.stringContaining("POST /users: operationId")
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle spec without paths in validatePaths", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
      } as any;

      // This should not throw and should be handled by basic validation
      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Campo "paths" é obrigatório e deve conter pelo menos um caminho'
      );
    });

    it("should handle operations with all HTTP methods", () => {
      const spec = {
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
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should handle components without schemas or securitySchemes", () => {
      const spec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
        components: {
          // Empty components object
        },
      } as OpenAPISpec;

      const result = OpenAPIValidator.validateSpec(spec);

      expect(result.isValid).toBe(true);
    });
  });
});
