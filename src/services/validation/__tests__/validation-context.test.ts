/**
 * @fileoverview Tests for ValidationContext and ValidationContextBuilder
 */

import {
  ValidationContext,
  ValidationContextBuilder,
} from "../validation-context";

describe("ValidationContextBuilder", () => {
  describe("create", () => {
    it("should create builder with field and value", () => {
      const builder = ValidationContextBuilder.create("email", "test@example.com");
      expect(builder).toBeInstanceOf(ValidationContextBuilder);
    });
  });

  describe("withRule", () => {
    it("should set validation rule", () => {
      const context = ValidationContextBuilder.create("email", "test@example.com")
        .withRule({ pattern: "^[\\w-\\.]+@" })
        .build();

      expect(context.rule).toEqual({ pattern: "^[\\w-\\.]+@" });
    });
  });

  describe("withVariables", () => {
    it("should set variables", () => {
      const variables = { domain: "example.com", username: "test" };
      const context = ValidationContextBuilder.create("email", "test@example.com")
        .withRule({ required: true })
        .withVariables(variables)
        .build();

      expect(context.variables).toEqual(variables);
    });
  });

  describe("withParent", () => {
    it("should set parent object", () => {
      const parent = { user: { email: "test@example.com" } };
      const context = ValidationContextBuilder.create("email", "test@example.com")
        .withRule({ required: true })
        .withParent(parent)
        .build();

      expect(context.parent).toEqual(parent);
    });
  });

  describe("withMetadata", () => {
    it("should set metadata", () => {
      const metadata = { stepIndex: 5, suiteName: "auth-suite" };
      const context = ValidationContextBuilder.create("token", "abc123")
        .withRule({ minLength: 6 })
        .withMetadata(metadata)
        .build();

      expect(context.metadata).toEqual(metadata);
    });
  });

  describe("withInputConfig", () => {
    it("should set input configuration", () => {
      const inputConfig = { type: "text", label: "Email Address" };
      const context = ValidationContextBuilder.create("email", "test@example.com")
        .withRule({ required: true })
        .withInputConfig(inputConfig)
        .build();

      expect(context.inputConfig).toEqual(inputConfig);
    });
  });

  describe("build", () => {
    it("should build complete validation context", () => {
      const context = ValidationContextBuilder.create("password", "secret123")
        .withRule({ minLength: 8 })
        .withVariables({ username: "admin" })
        .withMetadata({ step: 1 })
        .build();

      expect(context).toEqual({
        field: "password",
        value: "secret123",
        rule: { minLength: 8 },
        variables: { username: "admin" },
        metadata: { step: 1 },
      });
    });

    it("should throw error if rule is missing", () => {
      const builder = ValidationContextBuilder.create("email", "test@example.com");

      expect(() => builder.build()).toThrow(
        "Validation rule is required for field: email"
      );
    });

    it("should build with only required fields", () => {
      const context = ValidationContextBuilder.create("name", "John")
        .withRule({ required: true })
        .build();

      expect(context.field).toBe("name");
      expect(context.value).toBe("John");
      expect(context.rule).toEqual({ required: true });
      expect(context.variables).toBeUndefined();
      expect(context.parent).toBeUndefined();
      expect(context.metadata).toBeUndefined();
      expect(context.inputConfig).toBeUndefined();
    });
  });

  describe("chaining", () => {
    it("should allow method chaining", () => {
      const context = ValidationContextBuilder.create("age", 25)
        .withRule({ min: 18, max: 100 })
        .withVariables({ minAge: 18 })
        .withParent({ user: {} })
        .withMetadata({ step: 2 })
        .withInputConfig({ type: "number" })
        .build();

      expect(context.field).toBe("age");
      expect(context.value).toBe(25);
      expect(context.rule).toEqual({ min: 18, max: 100 });
      expect(context.variables).toEqual({ minAge: 18 });
      expect(context.parent).toEqual({ user: {} });
      expect(context.metadata).toEqual({ step: 2 });
      expect(context.inputConfig).toEqual({ type: "number" });
    });
  });

  describe("edge cases", () => {
    it("should handle null value", () => {
      const context = ValidationContextBuilder.create("optional", null)
        .withRule({ required: false })
        .build();

      expect(context.value).toBeNull();
    });

    it("should handle undefined value", () => {
      const context = ValidationContextBuilder.create("optional", undefined)
        .withRule({ required: false })
        .build();

      expect(context.value).toBeUndefined();
    });

    it("should handle empty string value", () => {
      const context = ValidationContextBuilder.create("name", "")
        .withRule({ required: true })
        .build();

      expect(context.value).toBe("");
    });

    it("should handle object value", () => {
      const objectValue = { nested: { key: "value" } };
      const context = ValidationContextBuilder.create("data", objectValue)
        .withRule({ type: "object" })
        .build();

      expect(context.value).toEqual(objectValue);
    });

    it("should handle array value", () => {
      const arrayValue = [1, 2, 3];
      const context = ValidationContextBuilder.create("numbers", arrayValue)
        .withRule({ minLength: 1 })
        .build();

      expect(context.value).toEqual(arrayValue);
    });

    it("should handle boolean value", () => {
      const context = ValidationContextBuilder.create("active", true)
        .withRule({ type: "boolean" })
        .build();

      expect(context.value).toBe(true);
    });

    it("should handle zero value", () => {
      const context = ValidationContextBuilder.create("count", 0)
        .withRule({ min: 0 })
        .build();

      expect(context.value).toBe(0);
    });

    it("should handle empty object as variables", () => {
      const context = ValidationContextBuilder.create("field", "value")
        .withRule({ required: true })
        .withVariables({})
        .build();

      expect(context.variables).toEqual({});
    });

    it("should handle complex rule object", () => {
      const complexRule = {
        required: true,
        minLength: 5,
        maxLength: 100,
        pattern: "^[a-zA-Z]+$",
        custom: {
          nested: {
            validation: true,
          },
        },
      };

      const context = ValidationContextBuilder.create("name", "John")
        .withRule(complexRule)
        .build();

      expect(context.rule).toEqual(complexRule);
    });
  });

  describe("multiple builds", () => {
    it("should allow building multiple times with same result", () => {
      const builder = ValidationContextBuilder.create("field", "value").withRule({
        required: true,
      });

      const context1 = builder.build();
      const context2 = builder.build();

      expect(context1).toEqual(context2);
      // Note: build() returns the same object reference, not a new instance
    });
  });
});

describe("ValidationContext interface", () => {
  it("should define proper structure", () => {
    const context: ValidationContext = {
      field: "email",
      value: "test@example.com",
      rule: { required: true },
      variables: { domain: "example.com" },
      parent: { user: {} },
      metadata: { step: 1 },
      inputConfig: { type: "email" },
    };

    expect(context.field).toBe("email");
    expect(context.value).toBe("test@example.com");
    expect(context.rule).toEqual({ required: true });
    expect(context.variables).toEqual({ domain: "example.com" });
    expect(context.parent).toEqual({ user: {} });
    expect(context.metadata).toEqual({ step: 1 });
    expect(context.inputConfig).toEqual({ type: "email" });
  });

  it("should allow optional fields to be undefined", () => {
    const context: ValidationContext = {
      field: "name",
      value: "John",
      rule: { required: true },
    };

    expect(context.variables).toBeUndefined();
    expect(context.parent).toBeUndefined();
    expect(context.metadata).toBeUndefined();
    expect(context.inputConfig).toBeUndefined();
  });
});
