/**
 * @fileoverview Secure fake data generation service using Faker.js with method allowlisting.
 *
 * @remarks
 * This module provides the FakerService class which offers secure fake data generation
 * capabilities for testing purposes. It includes security controls through method allowlisting
 * to prevent code injection while supporting comprehensive data generation scenarios.
 *
 * @packageDocumentation
 */

import { faker } from "@faker-js/faker";

/**
 * Configuration options for the Faker service initialization.
 *
 * @remarks
 * FakerConfig allows customization of the Faker.js behavior including
 * locale-specific data generation and deterministic output through seeding.
 *
 * @example Basic configuration
 * ```typescript
 * const config: FakerConfig = {
 *   locale: 'en_US',
 *   seed: 12345
 * };
 *
 * const fakerService = FakerService.getInstance();
 * fakerService.configure(config);
 * ```
 *
 * @public
 * @since 1.0.0
 */
export interface FakerConfig {
  /** Locale for generating region-specific data (e.g., 'en_US', 'pt_BR', 'es_ES') */
  locale?: string;

  /** Seed value for deterministic fake data generation across test runs */
  seed?: number;
}

/**
 * Represents an allowlisted Faker method for secure execution.
 *
 * @remarks
 * FakerMethod defines the structure for validating and executing Faker.js
 * method calls safely. Only methods included in the allowlist can be executed
 * to prevent security vulnerabilities.
 *
 * @internal
 */
interface FakerMethod {
  /** The Faker.js category (e.g., 'person', 'internet', 'location') */
  category: string;

  /** The specific method within the category (e.g., 'firstName', 'email') */
  method: string;

  /** Optional arguments to pass to the Faker method */
  args?: any[];
}

/**
 * Secure fake data generation service using Faker.js with comprehensive security controls.
 *
 * @remarks
 * The FakerService provides a secure interface for generating fake data in test scenarios.
 * It implements security measures through method allowlisting to prevent code injection
 * while offering extensive fake data generation capabilities for realistic test data.
 *
 * **Security Features:**
 * - **Method Allowlisting**: Only pre-approved Faker.js methods can be executed
 * - **Input Validation**: All method calls are validated before execution
 * - **Error Handling**: Safe fallback values for failed generation attempts
 * - **Singleton Pattern**: Consistent configuration across the application
 *
 * **Supported Data Categories:**
 * - **Person Data**: Names, job titles, demographics
 * - **Internet Data**: Emails, URLs, IP addresses, user agents
 * - **Location Data**: Addresses, cities, countries, coordinates
 * - **Communication**: Phone numbers, social media handles
 * - **Commerce**: Product names, prices, departments
 * - **Date/Time**: Past and future dates, recent timestamps
 * - **Identification**: UUIDs, random numbers, boolean values
 * - **Text Generation**: Lorem ipsum, words, sentences
 *
 * @example Basic usage with variable interpolation
 * ```typescript
 * const fakerService = FakerService.getInstance();
 *
 * // These can be used in YAML test files as {{$faker.person.firstName}}
 * const firstName = fakerService.generate('person.firstName');
 * const email = fakerService.generate('internet.email');
 * const address = fakerService.generate('location.streetAddress');
 *
 * console.log(`User: ${firstName}, Email: ${email}, Address: ${address}`);
 * ```
 *
 * @example Deterministic data generation with seeding
 * ```typescript
 * const fakerService = FakerService.getInstance();
 * fakerService.configure({ seed: 12345, locale: 'en_US' });
 *
 * // These will generate the same values across test runs
 * const name1 = fakerService.generate('person.fullName');
 * const name2 = fakerService.generate('person.fullName');
 * ```
 *
 * @example Batch data generation
 * ```typescript
 * const testUsers = fakerService.generateBatch([
 *   'person.firstName',
 *   'person.lastName',
 *   'internet.email',
 *   'person.jobTitle'
 * ], 10);
 *
 * // Returns array of 10 user objects with generated data
 * ```
 *
 * @public
 * @since 1.0.0
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
    "location.latitude",
    "location.longitude",

    // Person
    "person.firstName",
    "person.lastName",
    "person.fullName",
    "person.jobTitle",
    "person.gender",
    "person.jobArea",

    // Internet
    "internet.email",
    "internet.url",
    "internet.domainName",
    "internet.userName",
    "internet.ip",
    "internet.ipv4",
    "internet.mac",

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
    "lorem.lines",

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
    "finance.accountNumber",
    "finance.routingNumber",
    "finance.creditCardNumber",
    "finance.creditCardCVV",

    // Company
    "company.name",
    "company.catchPhrase",
    "company.buzzPhrase",

    // Commerce
    "commerce.product",
    "commerce.productName",
    "commerce.productDescription",
    "commerce.price",
    "commerce.department",
    "commerce.productMaterial",

    // Vehicle
    "vehicle.manufacturer",
    "vehicle.model",
    "vehicle.type",
    "vehicle.fuel",
    "vehicle.vin",

    // Image
    "image.avatar",

    // Science - Remove deprecated methods
    // "science.chemicalElement.name", // Not available in v8+
    // "science.unit.name", // Not available in v8+

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
    try {
      const pathParts = methodPath.split(".");

      if (pathParts.length !== 2) {
        throw new Error(
          `Invalid Faker method path: ${methodPath}. Expected format: 'category.method'`
        );
      }

      const [category, method] = pathParts;

      // Security check: only allow allowlisted methods (check BEFORE accessing)
      if (!this.allowlistedMethods.has(methodPath)) {
        throw new Error(
          `Faker method '${methodPath}' is not allowlisted for security reasons`
        );
      }

      // Navigate to the method
      const categoryObject = (faker as any)[category];
      if (!categoryObject) {
        throw new Error(`Faker category '${category}' not found`);
      }

      const methodFunction = categoryObject[method];
      if (typeof methodFunction !== "function") {
        throw new Error(
          `Faker method '${method}' not found in category '${category}'`
        );
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
