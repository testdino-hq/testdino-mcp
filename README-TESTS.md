# TestDino MCP - Test Suite

This document describes the test cases for the TestDino MCP server.

## Test Structure

```
__tests__/
├── setup.ts                    # Test configuration and global mocks
├── tools/                      # Tool-specific tests
│   ├── health.test.ts         # Health tool tests
│   ├── list-testruns.test.ts  # List test runs tool tests
│   └── ...                    # Other tool tests
├── lib/                        # Utility function tests
│   ├── request.test.ts        # API request utilities
│   └── endpoints.test.ts      # Endpoint configuration
└── integration/               # Integration tests
    └── mcp-server.test.ts     # MCP server integration tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

### Tool Tests

Each tool has comprehensive test cases covering:

1. **Schema Validation**
   - Tool name and description
   - Input schema structure
   - Required parameters
   - Optional parameters

2. **Handler Functionality**
   - Success scenarios
   - Error handling
   - Missing API key
   - Invalid responses
   - Edge cases

3. **API Integration**
   - Correct endpoint calls
   - Proper authentication headers
   - Parameter passing
   - Response formatting

### Utility Tests

- **Request Utilities**: HTTP request/response handling
- **Endpoints**: URL building and query parameter handling
- **Environment**: API key and URL configuration

### Integration Tests

- MCP server initialization
- Tool registration
- Request routing
- Error handling

## Test Cases by Tool

### Health Tool (`health.test.ts`)

- ✅ Tool schema validation
- ✅ Missing API key handling
- ✅ Successful API key validation
- ✅ User info formatting
- ✅ Multiple organizations handling
- ✅ Empty organizations handling
- ✅ API error handling
- ✅ Unexpected response format handling

### List Test Runs Tool (`list-testruns.test.ts`)

- ✅ Tool schema validation
- ✅ Missing API key handling
- ✅ Successful test run listing
- ✅ Filter parameter handling
- ✅ Pagination parameters
- ✅ Empty results handling
- ✅ API error handling

### Request Utilities (`request.test.ts`)

- ✅ GET request handling
- ✅ POST request with body
- ✅ Custom headers
- ✅ JSON response parsing
- ✅ Error response handling
- ✅ Empty response handling

### Endpoints (`endpoints.test.ts`)

- ✅ Base URL configuration
- ✅ Query parameter building
- ✅ Filter parameter inclusion
- ✅ Undefined/null value exclusion
- ✅ URL encoding

### MCP Server Integration (`mcp-server.test.ts`)

- ✅ Tool listing
- ✅ Tool routing
- ✅ Request handling
- ✅ Error handling for unknown tools

## Adding New Tests

When adding a new tool:

1. Create a test file in `__tests__/tools/`
2. Test the tool schema
3. Test the handler function with:
   - Success cases
   - Error cases
   - Edge cases
4. Mock all external dependencies
5. Ensure 100% code coverage for the tool

## Mocking Guidelines

- Mock all external API calls
- Mock environment variables
- Mock file system operations
- Use jest.clearAllMocks() in beforeEach
- Reset mocks between tests

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should clearly describe what they test
3. **Coverage**: Aim for high code coverage
4. **Speed**: Tests should run quickly
5. **Maintainability**: Keep tests simple and readable

