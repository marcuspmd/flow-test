/**
 * @fileoverview DI container tests for ScenarioService
 */

import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "../identifiers";
import type { ILogger } from "../../interfaces/services/ILogger";
import type { IAssertionService } from "../../interfaces/services/IAssertionService";
import type { ICaptureService } from "../../interfaces/services/ICaptureService";
import type { IScenarioService } from "../../interfaces/services/IScenarioService";
import { LoggerService } from "../../services/logger.service";
import { AssertionService } from "../../services/assertion/assertion.service";
import { CaptureService } from "../../services/capture.service";
import { ScenarioService } from "../../services/scenario.service";

describe("ScenarioService DI", () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();

    // Setup required dependencies
    container.bind<ILogger>(TYPES.ILogger).to(LoggerService).inSingletonScope();
    container
      .bind<IAssertionService>(TYPES.IAssertionService)
      .to(AssertionService);
    container.bind<ICaptureService>(TYPES.ICaptureService).to(CaptureService);

    // Bind ScenarioService
    container
      .bind<IScenarioService>(TYPES.IScenarioService)
      .to(ScenarioService);
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe("Container Resolution", () => {
    it("should resolve IScenarioService from container", () => {
      const service = container.get<IScenarioService>(TYPES.IScenarioService);

      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ScenarioService);
    });

    it("should return different instances (transient scope)", () => {
      const service1 = container.get<IScenarioService>(TYPES.IScenarioService);
      const service2 = container.get<IScenarioService>(TYPES.IScenarioService);

      expect(service1).not.toBe(service2);
    });
  });

  describe("IScenarioService Interface", () => {
    let service: IScenarioService;

    beforeEach(() => {
      service = container.get<IScenarioService>(TYPES.IScenarioService);
    });

    it("should have processScenarios method", () => {
      expect(service.processScenarios).toBeDefined();
      expect(typeof service.processScenarios).toBe("function");
    });

    it("should have validateScenarios method", () => {
      expect(service.validateScenarios).toBeDefined();
      expect(typeof service.validateScenarios).toBe("function");
    });

    it("should have suggestConditions method", () => {
      expect(service.suggestConditions).toBeDefined();
      expect(typeof service.suggestConditions).toBe("function");
    });
  });
});
