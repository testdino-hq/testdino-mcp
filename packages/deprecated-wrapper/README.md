# testdino-mcp (DEPRECATED)

> **This package has moved to [`@testdino/mcp`](https://www.npmjs.com/package/@testdino/mcp).**

## Migration

Replace in your configuration:

```diff
- "args": ["-y", "testdino-mcp"]
+ "args": ["-y", "@testdino/mcp"]
```

Or if installed globally:

```bash
npm uninstall -g testdino-mcp
npm install -g @testdino/mcp
```

This wrapper package forwards to `@testdino/mcp` so existing installations continue to work, but it will be removed in the future. Please migrate to `@testdino/mcp` directly.
