/**
 * @fileoverview DI container tests for PriorityService
 */

import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "../identifiers";
import type { ILogger } from "../../interfaces/services/ILogger";
import type { IConfigManager } from "../../interfaces/services/IConfigManager";
import type { IPriorityService } from "../../interfaces/services/IPriorityService";
import { LoggerService } from "../../services/logger.service";
import { ConfigManager } from "../../core/config";
import { PriorityService } from "../../services/priority";

describe("PriorityService DI", () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();

    // Setup required dependencies
    container.bind<ILogger>(TYPES.ILogger).to(LoggerService).inSingletonScope();
    container
      .bind<IConfigManager>(TYPES.IConfigManager)
      .to(ConfigManager)
      .inSingletonScope();

    // Bind PriorityService
    container
      .bind<IPriorityService>(TYPES.IPriorityService)
      .to(PriorityService)
      .inSingletonScope();
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe("Container Resolution", () => {
    it("should resolve IPriorityService from container", () => {
      const service = container.get<IPriorityService>(TYPES.IPriorityService);

      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PriorityService);
    });

    it("should return same instance (singleton scope)", () => {
      const service1 = container.get<IPriorityService>(TYPES.IPriorityService);
      const service2 = container.get<IPriorityService>(TYPES.IPriorityService);

      expect(service1).toBe(service2);
    });
  });

  describe("IPriorityService Interface", () => {
    let service: IPriorityService;

    beforeEach(() => {
      service = container.get<IPriorityService>(TYPES.IPriorityService);
    });

    it("should have orderTests method", () => {
      expect(service.orderTests).toBeDefined();
      expect(typeof service.orderTests).toBe("function");
    });

    it("should have isRequiredTest method", () => {
      expect(service.isRequiredTest).toBeDefined();
      expect(typeof service.isRequiredTest).toBe("function");
    });

    it("should have getRequiredTests method", () => {
      expect(service.getRequiredTests).toBeDefined();
      expect(typeof service.getRequiredTests).toBe("function");
    });

    it("should have filterByPriority method", () => {
      expect(service.filterByPriority).toBeDefined();
      expect(typeof service.filterByPriority).toBe("function");
    });

    it("should have groupByPriority method", () => {
      expect(service.groupByPriority).toBeDefined();
      expect(typeof service.groupByPriority).toBe("function");
    });

    it("should have getPriorityStats method", () => {
      expect(service.getPriorityStats).toBeDefined();
      expect(typeof service.getPriorityStats).toBe("function");
    });

    it("should have suggestOptimizations method", () => {
      expect(service.suggestOptimizations).toBeDefined();
      expect(typeof service.suggestOptimizations).toBe("function");
    });

    it("should have createExecutionPlan method", () => {
      expect(service.createExecutionPlan).toBeDefined();
      expect(typeof service.createExecutionPlan).toBe("function");
    });
  });
});
