# TestDino MCP Test Suite

This directory contains comprehensive tests for the TestDino MCP server and its tools.

## Test Structure

```
__tests__/
├── setup.ts                          # Jest configuration and setup
├── lib/
│   ├── request.test.ts               # Tests for API request utilities
│   └── endpoints.test.ts             # Tests for endpoint configuration
├── tools/
│   ├── health.test.ts                # Tests for health check tool
│   ├── testruns/
│   │   ├── list-testruns.test.ts     # Tests for list test runs tool
│   │   └── get-run-details.test.ts   # Tests for get run details tool
│   └── testcases/
│       ├── list-testcase.test.ts     # Tests for list test cases tool
│       └── get-testcase-details.test.ts # Tests for get test case details tool
└── mcp-server.test.ts                # Integration tests for MCP server
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- health.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="health"
```

## Test Coverage

The test suite covers:

### Core Libraries
- ✅ Request utilities (`apiRequest`, `apiRequestJson`)
- ✅ Endpoint configuration and URL building
- ✅ Query string parameter handling

### Tools
- ✅ Health check tool
- ✅ List test runs tool
- ✅ Get run details tool
- ✅ List test cases tool
- ✅ Get test case details tool

### Integration
- ✅ Tool registration
- ✅ Tool schema validation
- ✅ Error handling

## Test Patterns

### Mocking Strategy
- All external API calls are mocked using Jest
- Environment variables are mocked in `setup.ts`
- No real network requests are made during tests

### Test Structure
Each test file follows this pattern:
1. **Setup**: Mock dependencies
2. **Tool Definition Tests**: Verify tool schemas and properties
3. **Handler Tests**: Test tool handler functions with various scenarios
4. **Error Handling**: Test error cases and edge cases

## Adding New Tests

When adding a new tool:

1. Create a test file in the appropriate directory:
   - `__tests__/tools/[tool-name].test.ts` for tool tests
   - `__tests__/lib/[module-name].test.ts` for library tests

2. Follow the existing test patterns:
   ```typescript
   describe("Tool Name", () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });

     describe("toolDefinition", () => {
       // Test tool schema, name, description
     });

     describe("handleTool", () => {
       // Test handler function
     });
   });
   ```

3. Mock all external dependencies:
   ```typescript
   jest.mock("../../src/lib/endpoints.js");
   jest.mock("../../src/lib/request.js");
   jest.mock("../../src/lib/env.js");
   ```

4. Test both success and error scenarios

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- Fast execution (all tests use mocks)
- No external dependencies
- Deterministic results
- Coverage reporting

## Notes

- Tests use ES modules (`import/export`)
- Jest is configured for TypeScript with ESM support
- All API calls are mocked to avoid network dependencies
- Test timeout is set to 10 seconds for async operations

