/**
 * Unit tests for IterationService DI integration
 */

import "reflect-metadata";
import { createContainer } from "../container";
import { TYPES } from "../identifiers";
import type { IIterationService } from "../../interfaces/services/IIterationService";

describe("IterationService DI", () => {
  describe("Container Resolution", () => {
    it("should resolve IIterationService from container", () => {
      const container = createContainer();

      const service = container.get<IIterationService>(TYPES.IIterationService);

      expect(service).toBeDefined();
      expect(typeof service.expandIteration).toBe("function");
      expect(typeof service.validateIteration).toBe("function");
    });

    it("should return different instances (transient scope)", () => {
      const container = createContainer();

      const service1 = container.get<IIterationService>(
        TYPES.IIterationService
      );
      const service2 = container.get<IIterationService>(
        TYPES.IIterationService
      );

      expect(service1).not.toBe(service2);
    });
  });

  describe("IIterationService Interface", () => {
    let service: IIterationService;

    beforeEach(() => {
      const container = createContainer();
      service = container.get<IIterationService>(TYPES.IIterationService);
    });

    it("should have expandIteration method", () => {
      expect(service).toHaveProperty("expandIteration");
      expect(typeof service.expandIteration).toBe("function");
    });

    it("should have validateIteration method", () => {
      expect(service).toHaveProperty("validateIteration");
      expect(typeof service.validateIteration).toBe("function");
    });

    it("should expand array iteration", () => {
      const config = {
        over: "test_items",
        as: "item",
      };

      const variableContext = {
        test_items: ["a", "b", "c"],
      };

      const contexts = service.expandIteration(config, variableContext);

      expect(contexts).toHaveLength(3);
      expect(contexts[0]).toEqual({
        index: 0,
        value: "a",
        variableName: "item",
        isFirst: true,
        isLast: false,
      });
      expect(contexts[2]).toEqual({
        index: 2,
        value: "c",
        variableName: "item",
        isFirst: false,
        isLast: true,
      });
    });

    it("should expand range iteration", () => {
      const config = {
        range: "1..3",
        as: "page",
      };

      const contexts = service.expandIteration(config, {});

      expect(contexts).toHaveLength(3);
      expect(contexts[0]).toEqual({
        index: 0,
        value: 1,
        variableName: "page",
        isFirst: true,
        isLast: false,
      });
      expect(contexts[2]).toEqual({
        index: 2,
        value: 3,
        variableName: "page",
        isFirst: false,
        isLast: true,
      });
    });

    it("should validate iteration configuration", () => {
      const validArrayConfig = {
        over: "items",
        as: "item",
      };

      const validRangeConfig = {
        range: "1..10",
        as: "index",
      };

      const invalidConfig = {
        // Missing required properties
      } as any;

      expect(service.validateIteration(validArrayConfig)).toEqual([]);
      expect(service.validateIteration(validRangeConfig)).toEqual([]);
      expect(service.validateIteration(invalidConfig).length).toBeGreaterThan(
        0
      );
    });
  });
});
