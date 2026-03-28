import { beforeEach, afterEach } from "vitest";

// Clean environment between tests
beforeEach(() => {
  delete process.env.TESTDINO_PAT;
});

afterEach(() => {
  delete process.env.TESTDINO_PAT;
});
