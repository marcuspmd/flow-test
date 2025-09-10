import { faker } from "@faker-js/faker";

/**
 * Configuration options for Faker service
 */
export interface FakerConfig {
  locale?: string;
  seed?: number;
}

/**
 * Allowlisted Faker methods for security
 */
interface FakerMethod {
  category: string;
  method: string;
  args?: any[];
}

/**
 * Service for generating fake data using Faker.js with security controls
 */
export class FakerService {
  private static instance: FakerService;

  /**
   * Allowlisted Faker methods to prevent code injection
   * Only these methods can be called via variable interpolation
   */
  private readonly allowlistedMethods = new Set([
    // Location (replaces deprecated address)
    "location.city",
    "location.country",
    "location.state", 
    "location.streetAddress",
    "location.zipCode",
    
    // Person
    "person.firstName",
    "person.lastName",
    "person.fullName",
    "person.jobTitle",
    
    // Internet
    "internet.email",
    "internet.url",
    "internet.domainName",
    "internet.userName",
    
    // Phone
    "phone.number",
    
    // Date
    "date.past",
    "date.future",
    "date.recent",
    "date.soon",
    "date.birthdate",
    
    // Time
    "datatype.datetime",
    
    // Lorem
    "lorem.word",
    "lorem.words",
    "lorem.sentence",
    "lorem.sentences",
    "lorem.paragraph",
    "lorem.text",
    
    // Number
    "number.int",
    "number.float",
    "number.bigInt",
    
    // String
    "string.alpha",
    "string.alphanumeric",
    "string.numeric",
    "string.uuid",
    
    // Boolean
    "datatype.boolean",
    
    // Array helpers
    "helpers.arrayElement",
    "helpers.arrayElements",
    "helpers.shuffle",
    
    // Finance
    "finance.amount",
    "finance.currencyCode",
    "finance.currencyName",
    
    // Company
    "company.name",
    "company.catchPhrase",
    
    // Commerce
    "commerce.product",
    "commerce.productName",
    "commerce.price",
    "commerce.department",
    
    // Database
    "database.engine",
    "database.type",
    
    // Git
    "git.branch",
    "git.commitHash",
    
    // System
    "system.fileName",
    "system.fileExt",
    "system.mimeType",
  ]);

  private constructor(private config: FakerConfig = {}) {
    this.initializeFaker();
  }

  /**
   * Gets singleton instance of FakerService
   */
  public static getInstance(config?: FakerConfig): FakerService {
    if (!FakerService.instance) {
      FakerService.instance = new FakerService(config);
    }
    return FakerService.instance;
  }

  /**
   * Initializes Faker with configuration
   */
  private initializeFaker(): void {
    // Note: faker.setLocale is not available in v8+, locale should be set during import
    // For now, we'll just set the seed if provided
    
    if (this.config.seed !== undefined) {
      faker.seed(this.config.seed);
    }
  }

  /**
   * Executes a Faker method call safely
   * @param methodPath - The method path (e.g., "person.firstName")
   * @param args - Optional arguments for the method
   * @returns Generated fake data
   */
  public executeMethod(methodPath: string, args: any[] = []): any {
    // Security check: only allow allowlisted methods
    if (!this.allowlistedMethods.has(methodPath)) {
      throw new Error(`Faker method '${methodPath}' is not allowlisted for security reasons`);
    }

    try {
      const pathParts = methodPath.split(".");
      
      if (pathParts.length !== 2) {
        throw new Error(`Invalid Faker method path: ${methodPath}. Expected format: 'category.method'`);
      }

      const [category, method] = pathParts;
      
      // Navigate to the method
      const categoryObject = (faker as any)[category];
      if (!categoryObject) {
        throw new Error(`Faker category '${category}' not found`);
      }

      const methodFunction = categoryObject[method];
      if (typeof methodFunction !== "function") {
        throw new Error(`Faker method '${method}' not found in category '${category}'`);
      }

      // Execute the method with arguments
      return methodFunction.apply(categoryObject, args);
    } catch (error) {
      throw new Error(`Error executing Faker method '${methodPath}': ${error}`);
    }
  }

  /**
   * Parses a Faker expression from variable interpolation
   * Supports formats:
   * - {{faker.person.firstName}}
   * - {{faker.helpers.arrayElement(['a', 'b', 'c'])}}
   * - {{faker.number.int({min: 1, max: 100})}}
   */
  public parseFakerExpression(expression: string): any {
    // Remove faker. prefix if present
    const cleanExpression = expression.startsWith("faker.") 
      ? expression.substring(6) 
      : expression;

    // Check for method with arguments
    const methodWithArgsMatch = cleanExpression.match(/^([^(]+)\((.+)\)$/);
    
    if (methodWithArgsMatch) {
      const [, methodPath, argsString] = methodWithArgsMatch;
      
      try {
        // Parse arguments as JSON array or single value
        const args = this.parseArguments(argsString);
        return this.executeMethod(methodPath, args);
      } catch (error) {
        throw new Error(`Error parsing Faker arguments: ${error}`);
      }
    } else {
      // Simple method call without arguments
      return this.executeMethod(cleanExpression);
    }
  }

  /**
   * Parses arguments from string format
   * Supports: arrays, objects, strings, numbers, booleans
   */
  private parseArguments(argsString: string): any[] {
    try {
      // First try to parse the string directly as JSON (for arrays and objects)
      const directParsed = JSON.parse(argsString);
      return [directParsed];
    } catch {
      try {
        // Convert single quotes to double quotes for JSON compatibility
        const jsonCompatible = argsString.replace(/'/g, '"');
        const directParsedWithQuotes = JSON.parse(jsonCompatible);
        return [directParsedWithQuotes];
      } catch {
        try {
          // If that fails, try wrapping in array brackets (for comma-separated values)
          const wrappedParsed = JSON.parse(`[${argsString}]`);
          return Array.isArray(wrappedParsed) ? wrappedParsed : [wrappedParsed];
        } catch {
          // If JSON parsing fails completely, treat as single string argument
          return [argsString.replace(/^['"]|['"]$/g, "")];
        }
      }
    }
  }

  /**
   * Gets all available Faker methods
   */
  public getAvailableMethods(): string[] {
    return Array.from(this.allowlistedMethods).sort();
  }

  /**
   * Updates Faker configuration
   */
  public updateConfig(config: Partial<FakerConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeFaker();
  }

  /**
   * Sets a seed for reproducible fake data generation
   */
  public setSeed(seed: number): void {
    faker.seed(seed);
  }

  /**
   * Resets Faker to use random seed
   */
  public resetSeed(): void {
    faker.seed();
  }
}

// Export singleton instance
export const fakerService = FakerService.getInstance();