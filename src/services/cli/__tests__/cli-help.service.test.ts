const actualFsHelp = jest.requireActual("fs") as typeof import("fs");

jest.mock("fs", () => ({
  ...actualFsHelp,
  readFileSync: jest.fn(actualFsHelp.readFileSync.bind(actualFsHelp)),
}));

import * as fs from "fs";
import { CLIHelpService } from "../cli-help.service";

describe("CLIHelpService", () => {
  const readSpy = fs.readFileSync as jest.MockedFunction<
    typeof actualFsHelp.readFileSync
  >;

  beforeEach(() => {
    readSpy.mockImplementation((...args) => actualFsHelp.readFileSync(...args));
  });

  afterEach(() => {
    readSpy.mockReset();
  });

  const createLogger = () => ({
    info: jest.fn(),
  });

  it("should display version with value from package.json", () => {
    readSpy.mockImplementation((filePath) => {
      if (String(filePath).endsWith("package.json")) {
        return JSON.stringify({ version: "3.2.1" });
      }
      throw new Error("Unexpected file read");
    });

    const logger = createLogger();
    const service = new CLIHelpService(logger as any);

    const exitCode = service.displayVersion();

    expect(exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith("Flow Test Engine v3.2.1");
  });

  it("should display help message", () => {
    readSpy.mockImplementation((filePath) => {
      if (String(filePath).endsWith("package.json")) {
        return JSON.stringify({ version: "9.9.9" });
      }
      throw new Error("Unexpected file read");
    });

    const logger = createLogger();
    const service = new CLIHelpService(logger as any);

    const exitCode = service.displayHelp();

    expect(exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledTimes(1);
    const helpMessage = logger.info.mock.calls[0][0] as string;
    expect(helpMessage).toContain("Flow Test Engine v9.9.9");
    expect(helpMessage).toContain("USAGE:");
    expect(helpMessage).toContain("--inline-yaml");
  });

  it("should use fallback version when package.json cannot be read", () => {
    readSpy.mockImplementation(() => {
      throw new Error("read error");
    });

    const logger = createLogger();
    const service = new CLIHelpService(logger as any);

    const exitCode = service.displayVersion();

    expect(exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith("Flow Test Engine v1.1.12");
  });
});
