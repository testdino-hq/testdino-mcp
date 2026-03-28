import { describe, it, expect, beforeEach } from "vitest";
import { getApiKey } from "../../../src/lib/env.js";

describe("getApiKey", () => {
  beforeEach(() => {
    delete process.env.TESTDINO_PAT;
  });

  it("should return undefined when no token is available", () => {
    expect(getApiKey()).toBeUndefined();
  });

  it("should return token from environment variable", () => {
    process.env.TESTDINO_PAT = "env-token";
    expect(getApiKey()).toBe("env-token");
  });

  it("should return token from args", () => {
    expect(getApiKey({ token: "args-token" })).toBe("args-token");
  });

  it("should prefer env var over args.token (ISS-001: inverted precedence)", () => {
    // ISS-001 documents this as a bug — env overrides args.
    // When ISS-001 is fixed, flip this assertion.
    process.env.TESTDINO_PAT = "env-token";
    expect(getApiKey({ token: "args-token" })).toBe("env-token");
  });

  it("should return undefined when args is not an object", () => {
    expect(getApiKey("not-an-object")).toBeUndefined();
  });

  it("should return undefined when args.token is not a string", () => {
    expect(getApiKey({ token: 123 })).toBeUndefined();
  });
});
