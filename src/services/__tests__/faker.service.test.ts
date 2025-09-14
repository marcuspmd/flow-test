/**
 * Testes unitários para FakerService
 * Cobertura: 100% das funções, branches e statements
 */

// Mock do faker - precisa estar antes do jest.mock
const mockSeed = jest.fn();
const mockFaker = {
  seed: mockSeed,
  internet: {
    email: jest.fn().mockReturnValue("test@example.com"),
    userName: jest.fn().mockReturnValue("testuser"),
    url: jest.fn().mockReturnValue("https://example.com"),
  },
  person: {
    firstName: jest.fn().mockReturnValue("John"),
    lastName: jest.fn().mockReturnValue("Doe"),
    fullName: jest.fn().mockReturnValue("John Doe"),
  },
  number: {
    int: jest.fn().mockReturnValue(5),
    float: jest.fn().mockReturnValue(3.14),
  },
  string: {
    uuid: jest.fn().mockReturnValue("123e4567-e89b-12d3-a456-426614174000"),
  },
  helpers: {
    arrayElement: jest.fn().mockReturnValue("a"),
  },
  datatype: {
    boolean: jest.fn().mockReturnValue(true),
  },
  lorem: {
    word: jest.fn().mockReturnValue("lorem"),
    sentence: jest.fn().mockReturnValue("Lorem ipsum dolor sit amet."),
  },
};

jest.mock("@faker-js/faker", () => ({
  faker: mockFaker,
}));

import { FakerService } from "../faker.service";

describe("FakerService", () => {
  let fakerService: FakerService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear singleton instance
    (FakerService as any).instance = undefined;
    fakerService = FakerService.getInstance();
  });

  describe("parseFakerExpression", () => {
    test("deve gerar email", () => {
      const result = fakerService.parseFakerExpression("faker.internet.email");
      expect(result).toBe("test@example.com");
      expect(mockFaker.internet.email).toHaveBeenCalled();
    });

    test("deve gerar nome", () => {
      const result = fakerService.parseFakerExpression(
        "faker.person.firstName"
      );
      expect(result).toBe("John");
      expect(mockFaker.person.firstName).toHaveBeenCalled();
    });

    test("deve gerar UUID", () => {
      const result = fakerService.parseFakerExpression("faker.string.uuid");
      expect(result).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(mockFaker.string.uuid).toHaveBeenCalled();
    });

    test("deve gerar boolean", () => {
      const result = fakerService.parseFakerExpression(
        "faker.datatype.boolean"
      );
      expect(result).toBe(true);
      expect(mockFaker.datatype.boolean).toHaveBeenCalled();
    });

    test("deve gerar palavra lorem", () => {
      const result = fakerService.parseFakerExpression("faker.lorem.word");
      expect(result).toBe("lorem");
      expect(mockFaker.lorem.word).toHaveBeenCalled();
    });

    test("deve tratar expressão inválida", () => {
      expect(() => {
        fakerService.parseFakerExpression("faker.invalid.method");
      }).toThrow();
    });

    test("deve tratar método inexistente", () => {
      expect(() => {
        fakerService.parseFakerExpression("faker.person.invalidMethod");
      }).toThrow();
    });

    test("deve tratar expressão não-faker", () => {
      expect(() => {
        fakerService.parseFakerExpression("notfaker.test");
      }).toThrow();
    });
  });

  describe("Geração de dados básicos", () => {
    test("deve gerar firstName", () => {
      const result = fakerService.executeMethod("person.firstName");
      expect(result).toBe("John");
      expect(mockFaker.person.firstName).toHaveBeenCalled();
    });

    test("deve gerar email", () => {
      const result = fakerService.executeMethod("internet.email");
      expect(result).toBe("test@example.com");
      expect(mockFaker.internet.email).toHaveBeenCalled();
    });

    test("deve gerar uuid", () => {
      const result = fakerService.executeMethod("string.uuid");
      expect(result).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(mockFaker.string.uuid).toHaveBeenCalled();
    });

    test("deve gerar número inteiro", () => {
      const result = fakerService.executeMethod("number.int");
      expect(result).toBe(5);
      expect(mockFaker.number.int).toHaveBeenCalled();
    });
  });

  describe("parseFakerExpression", () => {
    test("deve parsear expressão simples", () => {
      const result = fakerService.parseFakerExpression("person.firstName");
      expect(result).toBe("John");
    });

    test("deve parsear expressão com prefixo faker", () => {
      const result = fakerService.parseFakerExpression(
        "faker.person.firstName"
      );
      expect(result).toBe("John");
    });

    test("deve parsear expressão com argumentos JSON", () => {
      const result = fakerService.parseFakerExpression(
        'number.int({"min": 1, "max": 10})'
      );
      expect(result).toBe(5);
    });

    test("deve parsear expressão com array", () => {
      const result = fakerService.parseFakerExpression(
        'helpers.arrayElement(["a", "b", "c"])'
      );
      expect(result).toBe("a");
    });
  });

  describe("getAvailableMethods", () => {
    test("deve retornar lista de métodos allowlistados", () => {
      const methods = fakerService.getAvailableMethods();
      expect(Array.isArray(methods)).toBe(true);
      expect(methods).toContain("person.firstName");
      expect(methods).toContain("internet.email");
      expect(methods).toContain("string.uuid");
      expect(methods.length).toBeGreaterThan(0);
    });

    test("deve retornar métodos ordenados", () => {
      const methods = fakerService.getAvailableMethods();
      const sortedMethods = [...methods].sort();
      expect(methods).toEqual(sortedMethods);
    });
  });

  describe("Configuração e seed", () => {
    test("deve criar instância com configuração", () => {
      // Clear singleton to test fresh instance
      (FakerService as any).instance = undefined;
      const configuredService = FakerService.getInstance({ seed: 123 });
      expect(configuredService).toBeDefined();
      expect(mockSeed).toHaveBeenCalledWith(123);
    });

    test("deve atualizar configuração", () => {
      fakerService.updateConfig({ seed: 456 });
      expect(fakerService).toBeDefined();
      expect(mockSeed).toHaveBeenCalledWith(456);
    });

    test("deve definir seed", () => {
      fakerService.setSeed(789);
      expect(fakerService).toBeDefined();
      expect(mockSeed).toHaveBeenCalledWith(789);
    });

    test("deve resetar seed", () => {
      fakerService.resetSeed();
      expect(fakerService).toBeDefined();
      expect(mockSeed).toHaveBeenCalledWith();
    });

    test("deve inicializar configuração sem seed", () => {
      // Clear singleton to test fresh instance
      (FakerService as any).instance = undefined;
      const service = FakerService.getInstance({});
      expect(service).toBeDefined();
    });
  });

  describe("Tratamento de erros", () => {
    test("deve lançar erro para método não allowlistado", () => {
      expect(() => {
        fakerService.executeMethod("hacker.password");
      }).toThrow("Faker method 'hacker.password' is not allowlisted for security reasons");
    });

    test("deve lançar erro para path inválido", () => {
      expect(() => {
        fakerService.executeMethod("invalid");
      }).toThrow("Invalid Faker method path: invalid. Expected format: 'category.method'");
    });

    test("deve lançar erro para path com muitas partes", () => {
      expect(() => {
        fakerService.executeMethod("invalid.too.many.parts");
      }).toThrow("Invalid Faker method path: invalid.too.many.parts. Expected format: 'category.method'");
    });

    test("deve lançar erro para categoria inexistente", () => {
      // Mock temporário para simular categoria inexistente
      const originalMock = mockFaker;
      (mockFaker as any).nonexistent = undefined;

      expect(() => {
        fakerService.executeMethod("nonexistent.method");
      }).toThrow("Faker category 'nonexistent' not found");
    });

    test("deve lançar erro para método inexistente na categoria", () => {
      // Mock temporário para simular método inexistente
      (mockFaker.person as any).nonexistent = "not a function";

      expect(() => {
        fakerService.executeMethod("person.nonexistent");
      }).toThrow("Faker method 'nonexistent' not found in category 'person'");

      // Restaurar mock original
      delete (mockFaker.person as any).nonexistent;
    });
  });

  describe("parseArguments - cobertura completa", () => {
    test("deve parsear argumentos JSON diretos", () => {
      const result = fakerService.parseFakerExpression('number.int({"min": 1, "max": 10})');
      expect(result).toBe(5);
    });

    test("deve parsear argumentos com aspas simples", () => {
      const result = fakerService.parseFakerExpression("helpers.arrayElement(['x', 'y', 'z'])");
      expect(result).toBe("a");
    });

    test("deve parsear argumentos como array", () => {
      const result = fakerService.parseFakerExpression('helpers.arrayElement("test", "test2")');
      expect(result).toBe("a");
    });

    test("deve tratar argumentos como string quando JSON falha", () => {
      const result = fakerService.parseFakerExpression('lorem.word(invalid_json_here)');
      expect(result).toBe("lorem");
    });

    test("deve tratar erro de parsing de argumentos", () => {
      expect(() => {
        fakerService.parseFakerExpression('invalid.method({malformed json})');
      }).toThrow("Error parsing Faker arguments");
    });
  });

  describe("Execução de métodos com argumentos", () => {
    test("deve executar método com argumentos", () => {
      const result = fakerService.executeMethod("number.int", [{ min: 1, max: 10 }]);
      expect(result).toBe(5);
      expect(mockFaker.number.int).toHaveBeenCalledWith({ min: 1, max: 10 });
    });

    test("deve executar método arrayElement com argumentos", () => {
      const result = fakerService.executeMethod("helpers.arrayElement", [["a", "b", "c"]]);
      expect(result).toBe("a");
      expect(mockFaker.helpers.arrayElement).toHaveBeenCalledWith(["a", "b", "c"]);
    });
  });

  describe("Tratamento de exceções na execução", () => {
    test("deve capturar e relançar erros de execução", () => {
      // Mock para simular erro durante execução
      const originalMethod = mockFaker.person.firstName;
      mockFaker.person.firstName = jest.fn().mockImplementation(() => {
        throw new Error("Simulated faker error");
      });

      expect(() => {
        fakerService.executeMethod("person.firstName");
      }).toThrow("Error executing Faker method 'person.firstName': Error: Simulated faker error");

      // Restaurar mock original
      mockFaker.person.firstName = originalMethod;
    });
  });
});
