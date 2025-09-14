[**Flow Test Engine v1.0.0**](../README.md)

***

[Flow Test Engine](../globals.md) / EngineHooks

# Interface: EngineHooks

Defined in: [types/engine.types.ts:631](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L631)

Engine lifecycle hooks for monitoring and extending test execution

Provides callback functions that are triggered at different stages of test execution,
allowing for custom logging, monitoring, reporting, and integration with external systems.
All hooks are optional and can be async functions.

## Example

```typescript
const hooks: EngineHooks = {
  onTestDiscovered: async (test) => {
    console.log(`📋 Discovered: ${test.suite_name}`);
    await analyticsTracker.trackTestDiscovered(test);
  },

  onSuiteStart: async (suite) => {
    console.log(`🚀 Starting suite: ${suite.suite_name}`);
    await notificationService.notifySuiteStart(suite);
  },

  onStepStart: async (step, context) => {
    console.log(`▶️ Step: ${step.name}`);
    await monitoring.startStepTimer(step.name);
  },

  onStepEnd: async (step, result, context) => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${step.name} (${result.duration_ms}ms)`);
    await monitoring.recordStepResult(step.name, result);
  },

  onSuiteEnd: async (suite, result) => {
    const rate = (result.successful_steps / result.total_steps * 100).toFixed(1);
    console.log(`📊 Suite ${suite.suite_name}: ${rate}% success rate`);
    await reportingService.saveSuiteResult(suite, result);
  },

  onExecutionStart: async (stats) => {
    console.log(`🎯 Starting execution of ${stats.tests_discovered} test(s)`);
    await dashboard.updateExecutionStatus('running');
  },

  onExecutionEnd: async (result) => {
    console.log(`✨ Execution completed: ${result.success_rate}% success rate`);
    await dashboard.updateExecutionStatus('completed', result);
    await slackNotifier.sendSummary(result);
  },

  onError: async (error, context) => {
    console.error(`💥 Error occurred: ${error.message}`);
    await errorTracker.reportError(error, context);
    await alertingService.sendAlert(error);
  }
};

const engine = new FlowTestEngine('./config.yml', hooks);
```

## Since

1.0.0

## Properties

### onTestDiscovered()?

> `optional` **onTestDiscovered**: (`test`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:644](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L644)

Called when a test suite is discovered during the discovery phase

#### Parameters

##### test

`any`

The discovered test with metadata (suite name, priority, file path, etc.)

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onTestDiscovered: async (test) => {
  logger.info(`Found test: ${test.suite_name} (priority: ${test.priority})`);
  await testRegistry.register(test);
}
```

***

### onSuiteStart()?

> `optional` **onSuiteStart**: (`suite`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:658](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L658)

Called when a test suite execution begins

#### Parameters

##### suite

[`TestSuite`](TestSuite.md)

The test suite about to be executed

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onSuiteStart: async (suite) => {
  console.log(`🚀 Starting ${suite.suite_name} with ${suite.steps.length} steps`);
  await metrics.startTimer(`suite.${suite.suite_name}`);
}
```

***

### onSuiteEnd()?

> `optional` **onSuiteEnd**: (`suite`, `result`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:678](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L678)

Called when a test suite execution completes (success or failure)

#### Parameters

##### suite

[`TestSuite`](TestSuite.md)

The test suite that was executed

##### result

`any`

The execution result containing status, metrics, and details

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onSuiteEnd: async (suite, result) => {
  const duration = await metrics.endTimer(`suite.${suite.suite_name}`);
  await reportDB.saveSuiteResult({
    suiteName: suite.suite_name,
    status: result.status,
    duration,
    steps: result.steps_results
  });
}
```

***

### onStepStart()?

> `optional` **onStepStart**: (`step`, `context`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:694](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L694)

Called before each test step execution

#### Parameters

##### step

[`TestStep`](TestStep.md)

The test step about to be executed

##### context

[`ExecutionContext`](ExecutionContext.md)

Current execution context with variables and metadata

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onStepStart: async (step, context) => {
  console.log(`▶️ Executing: ${step.name}`);
  console.log(`Variables: ${Object.keys(context.runtime_variables).join(', ')}`);
  await tracing.startSpan(`step.${step.name}`);
}
```

***

### onStepEnd()?

> `optional` **onStepEnd**: (`step`, `result`, `context`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:726](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L726)

Called after each test step execution completes

#### Parameters

##### step

[`TestStep`](TestStep.md)

The test step that was executed

##### result

`any`

The step execution result

##### context

[`ExecutionContext`](ExecutionContext.md)

Current execution context

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onStepEnd: async (step, result, context) => {
  const emoji = result.status === 'success' ? '✅' : '❌';
  console.log(`${emoji} ${step.name}: ${result.duration_ms}ms`);

  if (result.status === 'failure') {
    await bugTracker.createIssue({
      title: `Test failed: ${step.name}`,
      description: result.error_message,
      suite: context.suite.suite_name
    });
  }

  await tracing.endSpan(`step.${step.name}`, {
    status: result.status,
    duration: result.duration_ms
  });
}
```

***

### onExecutionStart()?

> `optional` **onExecutionStart**: (`stats`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:745](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L745)

Called at the beginning of the entire test execution

#### Parameters

##### stats

[`ExecutionStats`](ExecutionStats.md)

Initial execution statistics

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onExecutionStart: async (stats) => {
  console.log(`🎯 Starting execution of ${stats.tests_discovered} test suite(s)`);
  await ciSystem.updateBuildStatus('running');
  await slack.notify(`Test execution started: ${stats.tests_discovered} suites`);
}
```

***

### onExecutionEnd()?

> `optional` **onExecutionEnd**: (`result`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:771](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L771)

Called when the entire test execution completes

#### Parameters

##### result

`any`

Final aggregated results of all test executions

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onExecutionEnd: async (result) => {
  const rate = result.success_rate.toFixed(1);
  console.log(`✨ Execution completed: ${rate}% success rate`);

  // Update CI system
  const status = result.failed_tests === 0 ? 'passed' : 'failed';
  await ciSystem.updateBuildStatus(status);

  // Send notifications
  await emailService.sendExecutionSummary({
    successRate: result.success_rate,
    totalTests: result.total_tests,
    duration: result.total_duration_ms,
    reportUrl: `${process.env.REPORT_URL}/latest.html`
  });
}
```

***

### onError()?

> `optional` **onError**: (`error`, `context?`) => `void` \| `Promise`\<`void`\>

Defined in: [types/engine.types.ts:802](https://github.com/marcuspmd/flow-test/blob/c1e02fa49ac7e6bc58b50e23ea92679f9f2bcadb/src/types/engine.types.ts#L802)

Called when any error occurs during execution

#### Parameters

##### error

`Error`

The error that occurred

##### context?

`any`

Optional context information about where the error occurred

#### Returns

`void` \| `Promise`\<`void`\>

#### Example

```typescript
onError: async (error, context) => {
  console.error(`💥 Error in ${context?.suite_name || 'unknown'}: ${error.message}`);

  // Log to monitoring system
  await errorTracking.reportError(error, {
    suite: context?.suite_name,
    step: context?.current_step,
    timestamp: new Date().toISOString(),
    stack: error.stack
  });

  // Alert if critical
  if (error.message.includes('CRITICAL')) {
    await pagerDuty.triggerAlert({
      title: 'Critical test failure',
      description: error.message,
      severity: 'high'
    });
  }
}
```
