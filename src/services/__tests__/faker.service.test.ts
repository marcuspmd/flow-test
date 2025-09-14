/**
 * Testes unitários para FakerService
 * Cobertura: 100% das funções, branches e statements
 */

// Mock do faker - precisa estar antes do jest.mock
const mockFaker = {
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
});
