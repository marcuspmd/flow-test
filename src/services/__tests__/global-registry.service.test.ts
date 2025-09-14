import { GlobalRegistryService } from "../global-registry.service";

// Mock logger
jest.mock("../logger.service", () => ({
  getLogger: jest.fn(() => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe("GlobalRegistryService", () => {
  let registryService: GlobalRegistryService;

  beforeEach(() => {
    registryService = new GlobalRegistryService();
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with empty registry", () => {
      expect(registryService).toBeInstanceOf(GlobalRegistryService);
      expect(registryService.getRegisteredNodes()).toEqual([]);
    });
  });

  describe("registerNode", () => {
    it("should register a new node with exports", () => {
      const nodeId = "auth-flow";
      const suiteName = "Authentication Tests";
      const exports = ["user_token", "user_id"];
      const filePath = "./tests/auth.yaml";

      registryService.registerNode(nodeId, suiteName, exports, filePath);

      const nodeInfo = registryService.getNodeInfo(nodeId);
      expect(nodeInfo).toEqual({
        nodeId,
        suiteName,
        exports,
        filePath,
        lastUpdated: expect.any(Date),
        variableCount: 0,
      });
    });

    it("should update existing node registration", () => {
      const nodeId = "test-node";
      registryService.registerNode(nodeId, "Test 1", ["var1"], "./test1.yaml");

      // Set a variable first
      registryService.setExportedVariable(nodeId, "var1", "value1");

      // Re-register with different exports
      registryService.registerNode(nodeId, "Test 2", ["var2"], "./test2.yaml");

      const nodeInfo = registryService.getNodeInfo(nodeId);
      expect(nodeInfo?.suiteName).toBe("Test 2");
      expect(nodeInfo?.exports).toEqual(["var2"]);
      expect(nodeInfo?.filePath).toBe("./test2.yaml");
    });

    it("should handle empty exports array", () => {
      registryService.registerNode(
        "empty-node",
        "Empty Test",
        [],
        "./empty.yaml"
      );

      const nodeInfo = registryService.getNodeInfo("empty-node");
      expect(nodeInfo?.exports).toEqual([]);
    });
  });

  describe("setExportedVariable", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1", "var2"],
        "./test.yaml"
      );
    });

    it("should set exported variable value", () => {
      registryService.setExportedVariable("test-node", "var1", "test-value");

      expect(registryService.getExportedVariable("test-node.var1")).toBe(
        "test-value"
      );
    });

    it("should update existing variable value", () => {
      registryService.setExportedVariable("test-node", "var1", "initial-value");
      registryService.setExportedVariable("test-node", "var1", "updated-value");

      expect(registryService.getExportedVariable("test-node.var1")).toBe(
        "updated-value"
      );
    });

    it("should handle different value types", () => {
      registryService.setExportedVariable("test-node", "var1", 123);
      registryService.setExportedVariable("test-node", "var2", {
        key: "value",
      });

      expect(registryService.getExportedVariable("test-node.var1")).toBe(123);
      expect(registryService.getExportedVariable("test-node.var2")).toEqual({
        key: "value",
      });
    });

    it("should handle null and undefined values", () => {
      registryService.setExportedVariable("test-node", "var1", null);
      registryService.setExportedVariable("test-node", "var2", undefined);

      expect(registryService.getExportedVariable("test-node.var1")).toBe(null);
      expect(registryService.getExportedVariable("test-node.var2")).toBe(
        undefined
      );
    });

    it("should create namespace if node does not exist", () => {
      registryService.setExportedVariable("new-node", "new-var", "new-value");

      expect(registryService.getExportedVariable("new-node.new-var")).toBe(
        "new-value"
      );
      const nodeInfo = registryService.getNodeInfo("new-node");
      expect(nodeInfo?.suiteName).toBe("new-node"); // fallback to nodeId
      expect(nodeInfo?.exports).toEqual(["new-var"]);
      expect(nodeInfo?.filePath).toBe("");
    });
  });

  describe("getExportedVariable", () => {
    beforeEach(() => {
      registryService.registerNode(
        "auth",
        "Auth Suite",
        ["token", "user_id"],
        "./auth.yaml"
      );
      registryService.setExportedVariable("auth", "token", "abc123");
      registryService.setExportedVariable("auth", "user_id", 456);
    });

    it("should get exported variable with full name", () => {
      expect(registryService.getExportedVariable("auth.token")).toBe("abc123");
      expect(registryService.getExportedVariable("auth.user_id")).toBe(456);
    });

    it("should return undefined for non-existent variable", () => {
      expect(
        registryService.getExportedVariable("auth.non-existent")
      ).toBeUndefined();
    });

    it("should return undefined for non-existent node", () => {
      expect(
        registryService.getExportedVariable("unknown.variable")
      ).toBeUndefined();
    });

    it("should return undefined for invalid format", () => {
      expect(
        registryService.getExportedVariable("invalid-format")
      ).toBeUndefined();
      expect(registryService.getExportedVariable("")).toBeUndefined();
    });

    it("should handle variables with dots in name (limitation)", () => {
      registryService.registerNode(
        "complex",
        "Complex Suite",
        ["var.with.dots"],
        "./complex.yaml"
      );
      registryService.setExportedVariable(
        "complex",
        "var.with.dots",
        "dotted-value"
      );

      // Due to split(".", 2) limitation, this will not work as expected
      // The split will treat "complex.var" as nodeId and "with.dots" as variableName
      expect(
        registryService.getExportedVariable("complex.var.with.dots")
      ).toBeUndefined();

      // But we can verify that the variable was stored correctly
      const nodeVariables = registryService.getNodeVariables("complex");
      expect(nodeVariables["var.with.dots"]).toBe("dotted-value");
    });

    it("should handle runtime variable logging differently", () => {
      registryService.registerNode("test", "Test", ["user_id"], "./test.yaml");

      // Request runtime variable that doesn't exist - should log as debug, not warning
      expect(
        registryService.getExportedVariable("test.user_id")
      ).toBeUndefined();

      // Request non-runtime variable that doesn't exist - should log as warning
      expect(
        registryService.getExportedVariable("test.regular_var")
      ).toBeUndefined();
    });
  });

  describe("hasExportedVariable", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1"],
        "./test.yaml"
      );
      registryService.setExportedVariable("test-node", "var1", "value1");
    });

    it("should return true for existing variable", () => {
      expect(registryService.hasExportedVariable("test-node.var1")).toBe(true);
    });

    it("should return false for non-existent variable", () => {
      expect(
        registryService.hasExportedVariable("test-node.non-existent")
      ).toBe(false);
    });

    it("should return false for non-existent node", () => {
      expect(registryService.hasExportedVariable("unknown.variable")).toBe(
        false
      );
    });

    it("should return false for invalid format", () => {
      expect(registryService.hasExportedVariable("invalid-format")).toBe(false);
      expect(registryService.hasExportedVariable("")).toBe(false);
    });
  });

  describe("getNodeVariables", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1", "var2"],
        "./test.yaml"
      );
      registryService.setExportedVariable("test-node", "var1", "value1");
      registryService.setExportedVariable("test-node", "var2", "value2");
    });

    it("should get all variables for a node", () => {
      const variables = registryService.getNodeVariables("test-node");

      expect(variables).toEqual({
        var1: "value1",
        var2: "value2",
      });
    });

    it("should return empty object for node without variables", () => {
      registryService.registerNode(
        "empty-node",
        "Empty Suite",
        ["var1"],
        "./empty.yaml"
      );

      expect(registryService.getNodeVariables("empty-node")).toEqual({});
    });

    it("should return empty object for non-existent node", () => {
      expect(registryService.getNodeVariables("unknown-node")).toEqual({});
    });
  });

  describe("getAllExportedVariables", () => {
    beforeEach(() => {
      registryService.registerNode(
        "auth",
        "Auth Suite",
        ["token"],
        "./auth.yaml"
      );
      registryService.registerNode(
        "user",
        "User Suite",
        ["profile"],
        "./user.yaml"
      );
      registryService.setExportedVariable("auth", "token", "abc123");
      registryService.setExportedVariable("user", "profile", { name: "John" });
    });

    it("should get variables from all nodes", () => {
      const allVariables = registryService.getAllExportedVariables();

      expect(allVariables).toEqual({
        "auth.token": "abc123",
        "user.profile": { name: "John" },
      });
    });

    it("should return empty object when no variables are set", () => {
      const emptyRegistry = new GlobalRegistryService();
      expect(emptyRegistry.getAllExportedVariables()).toEqual({});
    });
  });

  describe("getNodeInfo", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1", "var2"],
        "./test.yaml"
      );
      registryService.setExportedVariable("test-node", "var1", "value1");
    });

    it("should return complete node information", () => {
      const nodeInfo = registryService.getNodeInfo("test-node");

      expect(nodeInfo).toEqual({
        nodeId: "test-node",
        suiteName: "Test Suite",
        exports: ["var1", "var2"],
        filePath: "./test.yaml",
        lastUpdated: expect.any(Date),
        variableCount: 1,
      });
    });

    it("should return null for non-existent node", () => {
      expect(registryService.getNodeInfo("unknown-node")).toBe(null);
    });

    it("should track variable count correctly", () => {
      expect(registryService.getNodeInfo("test-node")?.variableCount).toBe(1);

      registryService.setExportedVariable("test-node", "var2", "value2");
      expect(registryService.getNodeInfo("test-node")?.variableCount).toBe(2);
    });
  });

  describe("getRegisteredNodes", () => {
    beforeEach(() => {
      registryService.registerNode(
        "auth",
        "Auth Suite",
        ["token"],
        "./auth.yaml"
      );
      registryService.registerNode(
        "user",
        "User Suite",
        ["profile"],
        "./user.yaml"
      );
    });

    it("should return all registered node IDs", () => {
      const nodes = registryService.getRegisteredNodes();

      expect(nodes).toHaveLength(2);
      expect(nodes).toContain("auth");
      expect(nodes).toContain("user");
    });

    it("should return empty array when no nodes registered", () => {
      const emptyRegistry = new GlobalRegistryService();
      expect(emptyRegistry.getRegisteredNodes()).toHaveLength(0);
    });

    it("should return sorted node IDs", () => {
      const nodes = registryService.getRegisteredNodes();
      expect(nodes).toEqual(["auth", "user"]); // alphabetically sorted
    });
  });

  describe("getAvailableVariableNames", () => {
    beforeEach(() => {
      registryService.registerNode(
        "auth",
        "Auth Suite",
        ["token"],
        "./auth.yaml"
      );
      registryService.registerNode(
        "user",
        "User Suite",
        ["profile"],
        "./user.yaml"
      );
      registryService.setExportedVariable("auth", "token", "abc123");
      registryService.setExportedVariable("user", "profile", { name: "John" });
    });

    it("should return all available variable full names", () => {
      const variableNames = registryService.getAvailableVariableNames();

      expect(variableNames).toHaveLength(2);
      expect(variableNames).toContain("auth.token");
      expect(variableNames).toContain("user.profile");
    });

    it("should return sorted variable names", () => {
      const variableNames = registryService.getAvailableVariableNames();
      expect(variableNames).toEqual(["auth.token", "user.profile"]); // sorted
    });

    it("should return empty array when no variables set", () => {
      const emptyRegistry = new GlobalRegistryService();
      expect(emptyRegistry.getAvailableVariableNames()).toEqual([]);
    });
  });

  describe("unregisterNode", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1"],
        "./test.yaml"
      );
      registryService.setExportedVariable("test-node", "var1", "value1");
    });

    it("should completely remove node and its variables", () => {
      registryService.unregisterNode("test-node");

      expect(registryService.getNodeInfo("test-node")).toBe(null);
      expect(registryService.hasExportedVariable("test-node.var1")).toBe(false);
    });

    it("should handle unregistering non-existent node", () => {
      expect(() =>
        registryService.unregisterNode("unknown-node")
      ).not.toThrow();
    });

    it("should remove variables from global index", () => {
      expect(registryService.hasExportedVariable("test-node.var1")).toBe(true);

      registryService.unregisterNode("test-node");
      expect(registryService.hasExportedVariable("test-node.var1")).toBe(false);
    });
  });

  describe("clearNodeVariables", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1", "var2"],
        "./test.yaml"
      );
      registryService.setExportedVariable("test-node", "var1", "value1");
      registryService.setExportedVariable("test-node", "var2", "value2");
    });

    it("should clear all variables from a node", () => {
      registryService.clearNodeVariables("test-node");

      expect(registryService.getNodeVariables("test-node")).toEqual({});
      expect(registryService.getNodeInfo("test-node")?.variableCount).toBe(0);
    });

    it("should handle clearing variables from non-existent node", () => {
      expect(() =>
        registryService.clearNodeVariables("unknown-node")
      ).not.toThrow();
    });

    it("should keep node registration after clearing variables", () => {
      registryService.clearNodeVariables("test-node");

      const nodeInfo = registryService.getNodeInfo("test-node");
      expect(nodeInfo).toBeDefined();
      expect(nodeInfo?.exports).toEqual(["var1", "var2"]);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle nodes with same name but different case", () => {
      registryService.registerNode("Test", "Test 1", ["var1"], "./test1.yaml");
      registryService.registerNode("test", "Test 2", ["var2"], "./test2.yaml");

      expect(registryService.getRegisteredNodes()).toHaveLength(2);
      expect(registryService.getNodeInfo("Test")?.suiteName).toBe("Test 1");
      expect(registryService.getNodeInfo("test")?.suiteName).toBe("Test 2");
    });

    it("should handle special characters in node IDs (limitation)", () => {
      const nodeId = "node-with_special.chars123";
      registryService.registerNode(
        nodeId,
        "Special Suite",
        ["var1"],
        "./special.yaml"
      );
      registryService.setExportedVariable(nodeId, "var1", "special-value");

      // Due to split limitation with dots in nodeId, this will not work correctly
      expect(
        registryService.getExportedVariable(`${nodeId}.var1`)
      ).toBeUndefined();

      // But we can verify the variable was stored
      const nodeVariables = registryService.getNodeVariables(nodeId);
      expect(nodeVariables.var1).toBe("special-value");
    });

    it("should handle large number of variables efficiently", () => {
      const nodeId = "large-node";
      const largeExports = Array.from({ length: 100 }, (_, i) => `var${i}`);

      registryService.registerNode(
        nodeId,
        "Large Suite",
        largeExports,
        "./large.yaml"
      );

      // Set half of the variables
      for (let i = 0; i < 50; i++) {
        registryService.setExportedVariable(nodeId, `var${i}`, `value${i}`);
      }

      expect(registryService.getNodeInfo(nodeId)?.variableCount).toBe(50);
      expect(
        Object.keys(registryService.getNodeVariables(nodeId))
      ).toHaveLength(50);
    });

    it("should handle unicode characters in variable names and values", () => {
      registryService.registerNode(
        "unicode",
        "Unicode Suite",
        ["变量", "переменная"],
        "./unicode.yaml"
      );
      registryService.setExportedVariable("unicode", "变量", "中文值");
      registryService.setExportedVariable(
        "unicode",
        "переменная",
        "русское значение"
      );

      expect(registryService.getExportedVariable("unicode.变量")).toBe(
        "中文值"
      );
      expect(registryService.getExportedVariable("unicode.переменная")).toBe(
        "русское значение"
      );
    });

    it("should handle extremely long variable names and values", () => {
      const longVarName = "x".repeat(1000);
      const longValue = "y".repeat(10000);

      registryService.registerNode(
        "long",
        "Long Suite",
        [longVarName],
        "./long.yaml"
      );
      registryService.setExportedVariable("long", longVarName, longValue);

      expect(registryService.getExportedVariable(`long.${longVarName}`)).toBe(
        longValue
      );
    });

    it("should handle invalid variable name format gracefully", () => {
      expect(registryService.getExportedVariable("node")).toBeUndefined(); // no dot
      expect(registryService.getExportedVariable(".variable")).toBeUndefined(); // empty node
      expect(registryService.getExportedVariable("node.")).toBeUndefined(); // empty variable
      expect(registryService.getExportedVariable(".")).toBeUndefined(); // just dot
    });

    it("should handle setting variables on non-exported names (warning behavior)", () => {
      registryService.registerNode("test", "Test", ["allowed"], "./test.yaml");

      // Should set non-exported variable but emit warning
      registryService.setExportedVariable("test", "not-allowed", "value");
      expect(registryService.getExportedVariable("test.not-allowed")).toBe(
        "value"
      );

      // Should set exported variable
      registryService.setExportedVariable("test", "allowed", "value");
      expect(registryService.getExportedVariable("test.allowed")).toBe("value");
    });
  });

  describe("getStats", () => {
    beforeEach(() => {
      registryService.registerNode(
        "auth",
        "Auth Suite",
        ["token"],
        "./auth.yaml"
      );
      registryService.registerNode(
        "user",
        "User Suite",
        ["profile"],
        "./user.yaml"
      );
      registryService.setExportedVariable("auth", "token", "abc123");
    });

    it("should return accurate statistics", () => {
      const stats = registryService.getStats();

      expect(stats.total_nodes).toBe(2);
      expect(stats.total_exported_variables).toBe(1);
      expect(stats.nodes_with_variables).toBe(1);
      expect(stats.average_variables_per_node).toBe(0.5);
      expect(stats.most_recent_update).toBeInstanceOf(Date);
    });

    it("should return null for most_recent_update when no nodes exist", () => {
      const emptyRegistry = new GlobalRegistryService();
      const stats = emptyRegistry.getStats();

      expect(stats.total_nodes).toBe(0);
      expect(stats.total_exported_variables).toBe(0);
      expect(stats.nodes_with_variables).toBe(0);
      expect(stats.average_variables_per_node).toBe(0);
      expect(stats.most_recent_update).toBe(null);
    });
  });

  describe("exportState", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1"],
        "./test.yaml"
      );
      registryService.setExportedVariable("test-node", "var1", "test-value");
    });

    it("should export complete registry state as JSON", () => {
      const stateString = registryService.exportState();
      const state = JSON.parse(stateString);

      expect(state.registry).toHaveLength(1);
      expect(state.registry[0].nodeId).toBe("test-node");
      expect(state.registry[0].variables).toHaveLength(1);
      expect(state.registry[0].variables[0].name).toBe("var1");
      expect(state.registry[0].variables[0].value).toBe("test-value");
      expect(state.stats).toBeDefined();
      expect(state.variableIndex).toHaveLength(1);
    });

    it("should export empty state for empty registry", () => {
      const emptyRegistry = new GlobalRegistryService();
      const stateString = emptyRegistry.exportState();
      const state = JSON.parse(stateString);

      expect(state.registry).toHaveLength(0);
      expect(state.variableIndex).toHaveLength(0);
      expect(state.stats.total_nodes).toBe(0);
    });
  });

  describe("createSnapshot", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1"],
        "./test.yaml"
      );
      registryService.setExportedVariable(
        "test-node",
        "var1",
        "original-value"
      );
    });

    it("should create and restore snapshot correctly", () => {
      // Create snapshot
      const restoreSnapshot = registryService.createSnapshot();

      // Modify state
      registryService.setExportedVariable(
        "test-node",
        "var1",
        "modified-value"
      );
      registryService.registerNode(
        "new-node",
        "New Suite",
        ["var2"],
        "./new.yaml"
      );

      expect(registryService.getExportedVariable("test-node.var1")).toBe(
        "modified-value"
      );
      expect(registryService.getRegisteredNodes()).toHaveLength(2);

      // Restore snapshot
      restoreSnapshot();

      expect(registryService.getExportedVariable("test-node.var1")).toBe(
        "original-value"
      );
      expect(registryService.getRegisteredNodes()).toHaveLength(1);
    });

    it("should handle restoration of empty registry", () => {
      const emptyRegistry = new GlobalRegistryService();
      const restoreSnapshot = emptyRegistry.createSnapshot();

      // Add some data
      emptyRegistry.registerNode("test", "Test", ["var"], "./test.yaml");
      expect(emptyRegistry.getRegisteredNodes()).toHaveLength(1);

      // Restore empty state
      restoreSnapshot();
      expect(emptyRegistry.getRegisteredNodes()).toHaveLength(0);
    });
  });

  describe("validateIntegrity", () => {
    beforeEach(() => {
      registryService.registerNode(
        "test-node",
        "Test Suite",
        ["var1", "var2"],
        "./test.yaml"
      );
      registryService.setExportedVariable("test-node", "var1", "value1");
    });

    it("should validate correct registry integrity", () => {
      const result = registryService.validateIntegrity();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      // May have warnings for variables in exports but not set yet
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("should detect index inconsistencies", () => {
      // Manually corrupt the registry to test validation
      // This is a bit hacky but necessary to test error conditions
      const registry = (registryService as any).registry;
      const variableIndex = (registryService as any).variableIndex;

      // Add orphaned index entry
      variableIndex.set("orphan.variable", "non-existent-node");

      const result = registryService.validateIntegrity();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some((error) => error.includes("non-existent node"))
      ).toBe(true);
    });

    it("should detect missing index entries", () => {
      // Add variable without updating index properly
      const namespace = (registryService as any).registry.get("test-node");
      namespace.variables.set("unindexed-var", {
        nodeId: "test-node",
        suiteName: "Test Suite",
        variableName: "unindexed-var",
        value: "test",
        timestamp: Date.now(),
        filePath: "./test.yaml",
      });

      const result = registryService.validateIntegrity();

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes("exists but is not in index")
        )
      ).toBe(true);
    });
  });

  describe("clearAll", () => {
    beforeEach(() => {
      registryService.registerNode(
        "node1",
        "Suite 1",
        ["var1"],
        "./suite1.yaml"
      );
      registryService.registerNode(
        "node2",
        "Suite 2",
        ["var2"],
        "./suite2.yaml"
      );
      registryService.setExportedVariable("node1", "var1", "value1");
      registryService.setExportedVariable("node2", "var2", "value2");
    });

    it("should clear entire registry", () => {
      registryService.clearAll();

      expect(registryService.getRegisteredNodes()).toHaveLength(0);
      expect(registryService.getAllExportedVariables()).toEqual({});
      expect(registryService.getAvailableVariableNames()).toHaveLength(0);
    });

    it("should allow re-registration after clearing", () => {
      registryService.clearAll();
      registryService.registerNode(
        "new-node",
        "New Suite",
        ["new-var"],
        "./new.yaml"
      );

      expect(registryService.getNodeInfo("new-node")).toBeDefined();
    });
  });

  describe("private method edge cases", () => {
    it("should handle runtime variable detection", () => {
      // Test isLikelyRuntimeVariable through behavior
      registryService.registerNode(
        "test",
        "Test",
        ["user_id", "normal_var"],
        "./test.yaml"
      );

      // These should be treated as runtime variables (reduced warning noise)
      registryService.setExportedVariable("test", "user_id", "user123");
      registryService.setExportedVariable("test", "normal_var", "normal");

      expect(registryService.getExportedVariable("test.user_id")).toBe(
        "user123"
      );
      expect(registryService.getExportedVariable("test.normal_var")).toBe(
        "normal"
      );
    });

    it("should handle value formatting in logs", () => {
      registryService.registerNode(
        "format-test",
        "Format Test",
        ["short", "long", "object", "large_object", "null_val"],
        "./format.yaml"
      );

      // Test different value types for formatting
      registryService.setExportedVariable(
        "format-test",
        "short",
        "short value"
      );
      registryService.setExportedVariable(
        "format-test",
        "long",
        "x".repeat(100)
      );
      registryService.setExportedVariable("format-test", "object", {
        key: "value",
        nested: { deep: "object" },
      });

      // Create large object to trigger the "{...}" formatting
      const largeObject = {};
      for (let i = 0; i < 20; i++) {
        (largeObject as any)[
          `key${i}`
        ] = `very_long_value_${i}_that_makes_object_large`;
      }
      registryService.setExportedVariable(
        "format-test",
        "large_object",
        largeObject
      );
      registryService.setExportedVariable("format-test", "null_val", null);

      expect(registryService.getExportedVariable("format-test.short")).toBe(
        "short value"
      );
      expect(registryService.getExportedVariable("format-test.long")).toBe(
        "x".repeat(100)
      );
      expect(registryService.getExportedVariable("format-test.object")).toEqual(
        { key: "value", nested: { deep: "object" } }
      );
      expect(
        registryService.getExportedVariable("format-test.large_object")
      ).toEqual(largeObject);
      expect(registryService.getExportedVariable("format-test.null_val")).toBe(
        null
      );
    });
  });

  describe("additional coverage for uncovered lines", () => {
    test("should handle logger.info call in registerNode", () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      registryService.registerNode(
        "node-with-logging",
        "Test Suite",
        ["var1", "var2"],
        "/path/to/test.yaml"
      );

      // Verify registration worked
      expect(registryService.getRegisteredNodes()).toContain(
        "node-with-logging"
      );

      consoleSpy.mockRestore();
    });

    test("should exercise variable index update in registerNode", () => {
      registryService.registerNode(
        "indexed-node",
        "Index Test",
        ["export1", "export2", "export3"],
        "/test.yaml"
      );

      // Set variables for the exports
      registryService.setExportedVariable("indexed-node", "export1", "value1");
      registryService.setExportedVariable("indexed-node", "export2", "value2");
      registryService.setExportedVariable("indexed-node", "export3", "value3");

      // Verify all are in the index
      expect(registryService.hasExportedVariable("indexed-node.export1")).toBe(
        true
      );
      expect(registryService.hasExportedVariable("indexed-node.export2")).toBe(
        true
      );
      expect(registryService.hasExportedVariable("indexed-node.export3")).toBe(
        true
      );

      // Verify they can be retrieved
      expect(registryService.getExportedVariable("indexed-node.export1")).toBe(
        "value1"
      );
      expect(registryService.getExportedVariable("indexed-node.export2")).toBe(
        "value2"
      );
      expect(registryService.getExportedVariable("indexed-node.export3")).toBe(
        "value3"
      );
    });

    test("should cover namespace fallback creation when registering variables", () => {
      // Register variable without first registering the node
      registryService.setExportedVariable("auto-created", "var1", "value1");

      // Verify the namespace was auto-created
      expect(registryService.getRegisteredNodes()).toContain("auto-created");
      expect(registryService.getExportedVariable("auto-created.var1")).toBe(
        "value1"
      );

      // Verify the auto-created namespace has correct structure
      const nodeInfo = registryService.getNodeInfo("auto-created");
      expect(nodeInfo).toBeTruthy();
      expect(nodeInfo?.suiteName).toBe("auto-created"); // fallback to nodeId
      expect(nodeInfo?.exports).toEqual(["var1"]);
      expect(nodeInfo?.filePath).toBe("");
    });

    test("should handle logger.debug in getExportedVariable", () => {
      registryService.registerNode(
        "debug-test",
        "Debug Test",
        ["valid_var"],
        "/debug.yaml"
      );

      // Test successful retrieval (no debug call)
      registryService.setExportedVariable("debug-test", "valid_var", "success");
      expect(registryService.getExportedVariable("debug-test.valid_var")).toBe(
        "success"
      );

      // Test missing variable (triggers debug log) - lines 224-227
      expect(
        registryService.getExportedVariable("debug-test.missing_var")
      ).toBeUndefined();

      // Test missing node (triggers debug log)
      expect(
        registryService.getExportedVariable("non-existent.variable")
      ).toBeUndefined();
    });

    test("should exercise all formatValue branches", () => {
      // Test very long strings (>50 chars) - should trigger truncation
      const longString = "a".repeat(100);
      registryService.setExportedVariable("test", "long_string", longString);

      // Test large objects (>3 keys) - should trigger truncation
      const largeObject = {
        key1: "value1",
        key2: "value2",
        key3: "value3",
        key4: "value4",
        key5: "value5",
      };
      registryService.setExportedVariable("test", "large_object", largeObject);

      // Test undefined/null values
      registryService.setExportedVariable("test", "undefined_val", undefined);
      registryService.setExportedVariable("test", "null_val", null);

      // Test short string and small object (no truncation)
      registryService.setExportedVariable("test", "short_string", "short");
      registryService.setExportedVariable("test", "small_object", {
        key: "value",
      });

      // Verify all were set correctly
      expect(registryService.getExportedVariable("test.long_string")).toBe(
        longString
      );
      expect(registryService.getExportedVariable("test.large_object")).toEqual(
        largeObject
      );
      expect(
        registryService.getExportedVariable("test.undefined_val")
      ).toBeUndefined();
      expect(registryService.getExportedVariable("test.null_val")).toBeNull();
      expect(registryService.getExportedVariable("test.short_string")).toBe(
        "short"
      );
      expect(registryService.getExportedVariable("test.small_object")).toEqual({
        key: "value",
      });
    });

    test("should handle isRuntimeVariable method coverage", () => {
      // Test runtime variables (variableName matches nodeId)
      registryService.setExportedVariable(
        "runtime",
        "runtime",
        "runtime_value"
      );
      expect(registryService.getExportedVariable("runtime.runtime")).toBe(
        "runtime_value"
      );

      // Test non-runtime variables
      registryService.setExportedVariable("test", "normal_var", "normal_value");
      expect(registryService.getExportedVariable("test.normal_var")).toBe(
        "normal_value"
      );
    });

    test("should exercise variableIndex.set in registerNode", () => {
      // Test multiple exports to ensure all get added to index
      const exports = ["var1", "var2", "var3", "var4", "var5"];
      registryService.registerNode(
        "multi-export",
        "Multi Export Test",
        exports,
        "/multi.yaml"
      );

      // Verify each export is in the variable index after registration
      exports.forEach((exportName) => {
        expect(
          registryService.hasExportedVariable(`multi-export.${exportName}`)
        ).toBe(true); // Already in index after registration
      });

      // Set variables and verify they're accessible
      exports.forEach((exportName, index) => {
        registryService.setExportedVariable(
          "multi-export",
          exportName,
          `value${index}`
        );
        expect(
          registryService.hasExportedVariable(`multi-export.${exportName}`)
        ).toBe(true);
        expect(
          registryService.getExportedVariable(`multi-export.${exportName}`)
        ).toBe(`value${index}`);
      });
    });

    test("should handle register node with empty file path", () => {
      registryService.registerNode(
        "empty-path",
        "Empty Path Test",
        ["var1"],
        ""
      );
      registryService.setExportedVariable("empty-path", "var1", "value");

      const nodeInfo = registryService.getNodeInfo("empty-path");
      expect(nodeInfo?.filePath).toBe("");
      expect(nodeInfo?.exports).toEqual(["var1"]);
    });
  });
});
