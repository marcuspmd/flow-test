/**
 * Unit tests for InputService DI integration
 */

import "reflect-metadata";
import { createContainer } from "../container";
import { TYPES } from "../identifiers";
import type { IInputService } from "../../interfaces/services/IInputService";

describe("InputService DI", () => {
  describe("Container Resolution", () => {
    it("should resolve IInputService from container", () => {
      const container = createContainer();

      const service = container.get<IInputService>(TYPES.IInputService);

      expect(service).toBeDefined();
      expect(typeof service.setExecutionContext).toBe("function");
      expect(typeof service.promptUser).toBe("function");
      expect(typeof service.promptMultipleInputs).toBe("function");
    });

    it("should return different instances (transient scope)", () => {
      const container = createContainer();

      const service1 = container.get<IInputService>(TYPES.IInputService);
      const service2 = container.get<IInputService>(TYPES.IInputService);

      expect(service1).not.toBe(service2);
    });
  });

  describe("IInputService Interface", () => {
    let service: IInputService;

    beforeEach(() => {
      const container = createContainer();
      service = container.get<IInputService>(TYPES.IInputService);
    });

    it("should have setExecutionContext method", () => {
      expect(service).toHaveProperty("setExecutionContext");
      expect(typeof service.setExecutionContext).toBe("function");
    });

    it("should have promptUser method", () => {
      expect(service).toHaveProperty("promptUser");
      expect(typeof service.promptUser).toBe("function");
    });

    it("should have promptMultipleInputs method", () => {
      expect(service).toHaveProperty("promptMultipleInputs");
      expect(typeof service.promptMultipleInputs).toBe("function");
    });
  });
});
