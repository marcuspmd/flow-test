/**
 * @fileoverview Unit tests for IterationService
 *
 * @remarks
 * This test suite covers the IterationService class which handles
 * array and range iteration logic for test steps.
 */

import { IterationService } from "../iteration.service";
import {
  IterationConfig,
  ArrayIterationConfig,
  RangeIterationConfig,
  IterationContext,
} from "../../types/engine.types";

describe("IterationService", () => {
  let iterationService: IterationService;

  beforeEach(() => {
    iterationService = new IterationService();
  });

  describe("constructor", () => {
    it("should create instance successfully", () => {
      expect(iterationService).toBeInstanceOf(IterationService);
    });
  });

  describe("validateIteration", () => {
    describe("array iteration validation", () => {
      it("should validate valid array iteration config", () => {
        const config: ArrayIterationConfig = {
          over: "test_cases",
          as: "test_case",
        };

        const errors = iterationService.validateIteration(config);
        expect(errors).toHaveLength(0);
      });

      it("should reject array iteration without 'over' property", () => {
        const config = {
          as: "test_case",
        } as ArrayIterationConfig;

        const errors = iterationService.validateIteration(config);
        // Without 'over', it's not recognized as array iteration
        expect(errors).toContain(
          "Iteration configuration must be either array iteration or range iteration"
        );
      });

      it("should reject array iteration without 'as' property", () => {
        const config = {
          over: "test_cases",
        } as ArrayIterationConfig;

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain(
          'Array iteration requires "as" property to name the iteration variable'
        );
      });

      it("should reject array iteration with empty 'over' property", () => {
        const config: ArrayIterationConfig = {
          over: "",
          as: "test_case",
        };

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain('Array iteration requires "over" property');
      });

      it("should reject array iteration with empty 'as' property", () => {
        const config: ArrayIterationConfig = {
          over: "test_cases",
          as: "",
        };

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain(
          'Array iteration requires "as" property to name the iteration variable'
        );
      });
    });

    describe("range iteration validation", () => {
      it("should validate valid range iteration config", () => {
        const config: RangeIterationConfig = {
          range: "1..5",
          as: "index",
        };

        const errors = iterationService.validateIteration(config);
        expect(errors).toHaveLength(0);
      });

      it("should reject range iteration without 'range' property", () => {
        const config = {
          as: "index",
        } as RangeIterationConfig;

        const errors = iterationService.validateIteration(config);
        // Without 'range', it's not recognized as range iteration
        expect(errors).toContain(
          "Iteration configuration must be either array iteration or range iteration"
        );
      });

      it("should reject range iteration without 'as' property", () => {
        const config = {
          range: "1..5",
        } as RangeIterationConfig;

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain(
          'Range iteration requires "as" property to name the iteration variable'
        );
      });

      it("should reject invalid range format", () => {
        const config: RangeIterationConfig = {
          range: "invalid",
          as: "index",
        };

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain(
          'Invalid range: Invalid range format: invalid. Expected format: "start..end" (e.g., "1..5")'
        );
      });

      it("should reject range where start > end", () => {
        const config: RangeIterationConfig = {
          range: "5..1",
          as: "index",
        };

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain(
          "Invalid range: Invalid range: start (5) cannot be greater than end (1)"
        );
      });

      it("should handle various invalid range formats", () => {
        const invalidRanges = [
          "1-5", // wrong separator
          "1..a", // non-numeric end
          "a..5", // non-numeric start
          "1..2..3", // too many parts
          "1..", // missing end
          "..5", // missing start
          "1...5", // wrong separator count
        ];

        invalidRanges.forEach((range) => {
          const config: RangeIterationConfig = {
            range,
            as: "index",
          };

          const errors = iterationService.validateIteration(config);
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0]).toContain("Invalid range:");
        });
      });

      it("should reject empty range property", () => {
        const config: RangeIterationConfig = {
          range: "",
          as: "index",
        };

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain('Range iteration requires "range" property');
      });
    });

    describe("invalid config types", () => {
      it("should reject config that is neither array nor range iteration", () => {
        const config = {
          invalid: "property",
        } as any;

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain(
          "Iteration configuration must be either array iteration or range iteration"
        );
      });

      it("should reject empty config", () => {
        const config = {} as any;

        const errors = iterationService.validateIteration(config);
        expect(errors).toContain(
          "Iteration configuration must be either array iteration or range iteration"
        );
      });
    });
  });

  describe("expandIteration", () => {
    describe("array iteration", () => {
      it("should expand simple array iteration", () => {
        const config: ArrayIterationConfig = {
          over: "test_cases",
          as: "test_case",
        };

        const variableContext = {
          test_cases: [
            { name: "test1", value: 1 },
            { name: "test2", value: 2 },
            { name: "test3", value: 3 },
          ],
        };

        const result = iterationService.expandIteration(
          config,
          variableContext
        );

        expect(result).toHaveLength(3);

        expect(result[0]).toEqual({
          index: 0,
          value: { name: "test1", value: 1 },
          variableName: "test_case",
          isFirst: true,
          isLast: false,
        });

        expect(result[1]).toEqual({
          index: 1,
          value: { name: "test2", value: 2 },
          variableName: "test_case",
          isFirst: false,
          isLast: false,
        });

        expect(result[2]).toEqual({
          index: 2,
          value: { name: "test3", value: 3 },
          variableName: "test_case",
          isFirst: false,
          isLast: true,
        });
      });

      it("should expand array iteration with template syntax", () => {
        const config: ArrayIterationConfig = {
          over: "{{test_cases}}",
          as: "item",
        };

        const variableContext = {
          test_cases: ["a", "b"],
        };

        const result = iterationService.expandIteration(
          config,
          variableContext
        );

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe("a");
        expect(result[1].value).toBe("b");
      });

      it("should handle dot notation for nested objects", () => {
        const config: ArrayIterationConfig = {
          over: "data.items",
          as: "item",
        };

        const variableContext = {
          data: {
            items: ["item1", "item2"],
          },
        };

        const result = iterationService.expandIteration(
          config,
          variableContext
        );

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe("item1");
        expect(result[1].value).toBe("item2");
      });

      it("should handle single item array", () => {
        const config: ArrayIterationConfig = {
          over: "single_item",
          as: "item",
        };

        const variableContext = {
          single_item: ["only_one"],
        };

        const result = iterationService.expandIteration(
          config,
          variableContext
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          index: 0,
          value: "only_one",
          variableName: "item",
          isFirst: true,
          isLast: true,
        });
      });

      it("should handle empty array", () => {
        const config: ArrayIterationConfig = {
          over: "empty_array",
          as: "item",
        };

        const variableContext = {
          empty_array: [],
        };

        const result = iterationService.expandIteration(
          config,
          variableContext
        );

        expect(result).toHaveLength(0);
      });

      it("should throw error for non-existent variable", () => {
        const config: ArrayIterationConfig = {
          over: "non_existent",
          as: "item",
        };

        const variableContext = {};

        expect(() => {
          iterationService.expandIteration(config, variableContext);
        }).toThrow('Variable path "non_existent" not found in context');
      });

      it("should throw error for non-array variable", () => {
        const config: ArrayIterationConfig = {
          over: "not_array",
          as: "item",
        };

        const variableContext = {
          not_array: "string value",
        };

        expect(() => {
          iterationService.expandIteration(config, variableContext);
        }).toThrow('Variable "not_array" is not an array. Got: string');
      });

      it("should throw error for non-existent nested path", () => {
        const config: ArrayIterationConfig = {
          over: "data.missing.path",
          as: "item",
        };

        const variableContext = {
          data: { existing: "value" },
        };

        expect(() => {
          iterationService.expandIteration(config, variableContext);
        }).toThrow('Variable path "data.missing.path" not found in context');
      });

      it("should throw error when nested path resolves to non-array", () => {
        const config: ArrayIterationConfig = {
          over: "data.value",
          as: "item",
        };

        const variableContext = {
          data: { value: "not an array" },
        };

        expect(() => {
          iterationService.expandIteration(config, variableContext);
        }).toThrow(
          'Variable "data.value" resolved to non-array value. Got: string'
        );
      });
    });

    describe("range iteration", () => {
      it("should expand basic range iteration", () => {
        const config: RangeIterationConfig = {
          range: "1..3",
          as: "index",
        };

        const result = iterationService.expandIteration(config, {});

        expect(result).toHaveLength(3);

        expect(result[0]).toEqual({
          index: 0,
          value: 1,
          variableName: "index",
          isFirst: true,
          isLast: false,
        });

        expect(result[1]).toEqual({
          index: 1,
          value: 2,
          variableName: "index",
          isFirst: false,
          isLast: false,
        });

        expect(result[2]).toEqual({
          index: 2,
          value: 3,
          variableName: "index",
          isFirst: false,
          isLast: true,
        });
      });

      it("should handle single value range", () => {
        const config: RangeIterationConfig = {
          range: "5..5",
          as: "num",
        };

        const result = iterationService.expandIteration(config, {});

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          index: 0,
          value: 5,
          variableName: "num",
          isFirst: true,
          isLast: true,
        });
      });

      it("should handle large ranges", () => {
        const config: RangeIterationConfig = {
          range: "1..100",
          as: "page",
        };

        const result = iterationService.expandIteration(config, {});

        expect(result).toHaveLength(100);
        expect(result[0].value).toBe(1);
        expect(result[99].value).toBe(100);
        expect(result[0].isFirst).toBe(true);
        expect(result[99].isLast).toBe(true);
      });

      it("should handle ranges starting from zero", () => {
        const config: RangeIterationConfig = {
          range: "0..2",
          as: "idx",
        };

        const result = iterationService.expandIteration(config, {});

        expect(result).toHaveLength(3);
        expect(result[0].value).toBe(0);
        expect(result[1].value).toBe(1);
        expect(result[2].value).toBe(2);
      });

      it("should throw error for invalid range format", () => {
        const config: RangeIterationConfig = {
          range: "invalid",
          as: "index",
        };

        expect(() => {
          iterationService.expandIteration(config, {});
        }).toThrow(
          'Invalid range format: invalid. Expected format: "start..end" (e.g., "1..5")'
        );
      });

      it("should throw error when start > end", () => {
        const config: RangeIterationConfig = {
          range: "10..5",
          as: "index",
        };

        expect(() => {
          iterationService.expandIteration(config, {});
        }).toThrow("Invalid range: start (10) cannot be greater than end (5)");
      });
    });

    describe("invalid iteration config", () => {
      it("should throw error for invalid config type", () => {
        const config = {
          invalid: "property",
        } as any;

        expect(() => {
          iterationService.expandIteration(config, {});
        }).toThrow("Invalid iteration configuration");
      });
    });
  });

  describe("edge cases and error conditions", () => {
    it("should handle null/undefined in variable context", () => {
      const config: ArrayIterationConfig = {
        over: "null_value",
        as: "item",
      };

      const variableContext = {
        null_value: null,
      };

      expect(() => {
        iterationService.expandIteration(config, variableContext);
      }).toThrow('Variable "null_value" is not an array. Got: object');
    });

    it("should handle deeply nested object paths", () => {
      const config: ArrayIterationConfig = {
        over: "level1.level2.level3.array",
        as: "item",
      };

      const variableContext = {
        level1: {
          level2: {
            level3: {
              array: ["deep1", "deep2"],
            },
          },
        },
      };

      const result = iterationService.expandIteration(config, variableContext);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe("deep1");
      expect(result[1].value).toBe("deep2");
    });

    it("should handle arrays with mixed data types", () => {
      const config: ArrayIterationConfig = {
        over: "mixed_array",
        as: "item",
      };

      const variableContext = {
        mixed_array: [1, "string", { object: true }, null, [1, 2, 3], true],
      };

      const result = iterationService.expandIteration(config, variableContext);

      expect(result).toHaveLength(6);
      expect(result[0].value).toBe(1);
      expect(result[1].value).toBe("string");
      expect(result[2].value).toEqual({ object: true });
      expect(result[3].value).toBe(null);
      expect(result[4].value).toEqual([1, 2, 3]);
      expect(result[5].value).toBe(true);
    });

    it("should handle very large numeric ranges", () => {
      const config: RangeIterationConfig = {
        range: "1000000..1000002",
        as: "big_num",
      };

      const result = iterationService.expandIteration(config, {});

      expect(result).toHaveLength(3);
      expect(result[0].value).toBe(1000000);
      expect(result[2].value).toBe(1000002);
    });
  });
});
