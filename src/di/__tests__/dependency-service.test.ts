/**
 * @fileoverview DI container tests for DependencyService
 */

import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "../identifiers";
import type { ILogger } from "../../interfaces/services/ILogger";
import type { IDependencyService } from "../../interfaces/services/IDependencyService";
import { LoggerService } from "../../services/logger.service";
import { DependencyService } from "../../services/dependency.service";

describe("DependencyService DI", () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();

    // Setup required dependencies
    container.bind<ILogger>(TYPES.ILogger).to(LoggerService).inSingletonScope();

    // Bind DependencyService
    container
      .bind<IDependencyService>(TYPES.IDependencyService)
      .to(DependencyService)
      .inSingletonScope();
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe("Container Resolution", () => {
    it("should resolve IDependencyService from container", () => {
      const service = container.get<IDependencyService>(
        TYPES.IDependencyService
      );

      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DependencyService);
    });

    it("should return same instance (singleton scope)", () => {
      const service1 = container.get<IDependencyService>(
        TYPES.IDependencyService
      );
      const service2 = container.get<IDependencyService>(
        TYPES.IDependencyService
      );

      expect(service1).toBe(service2);
    });
  });

  describe("IDependencyService Interface", () => {
    let service: IDependencyService;

    beforeEach(() => {
      service = container.get<IDependencyService>(TYPES.IDependencyService);
    });

    it("should have buildDependencyGraph method", () => {
      expect(service.buildDependencyGraph).toBeDefined();
      expect(typeof service.buildDependencyGraph).toBe("function");
    });

    it("should have resolveExecutionOrder method", () => {
      expect(service.resolveExecutionOrder).toBeDefined();
      expect(typeof service.resolveExecutionOrder).toBe("function");
    });

    it("should have detectCircularDependencies method", () => {
      expect(service.detectCircularDependencies).toBeDefined();
      expect(typeof service.detectCircularDependencies).toBe("function");
    });

    it("should have clearGraph method", () => {
      expect(service.clearGraph).toBeDefined();
      expect(typeof service.clearGraph).toBe("function");
    });

    it("should have setCacheEnabled method", () => {
      expect(service.setCacheEnabled).toBeDefined();
      expect(typeof service.setCacheEnabled).toBe("function");
    });

    it("should have clearCache method", () => {
      expect(service.clearCache).toBeDefined();
      expect(typeof service.clearCache).toBe("function");
    });
  });
});
