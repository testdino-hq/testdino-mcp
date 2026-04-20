import { describe, it, expect, beforeEach } from "vitest";
import { getApiKey, getApiUrl } from "../../../src/lib/env.js";

describe("env", () => {
  beforeEach(() => {
    delete process.env.TESTDINO_PAT;
    delete process.env.TESTDINO_API_URL;
  });

  describe("getApiUrl", () => {
    it("should default to the production API URL", () => {
      expect(getApiUrl()).toBe("https://api.testdino.com");
    });

    it("should prefer TESTDINO_API_URL when configured", () => {
      process.env.TESTDINO_API_URL = "http://localhost:3001";
      expect(getApiUrl()).toBe("http://localhost:3001");
    });
  });

  describe("getApiKey", () => {
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

    it("should prefer args.token over the environment variable", () => {
      process.env.TESTDINO_PAT = "env-token";
      expect(getApiKey({ token: "args-token" })).toBe("args-token");
    });

    it("should return undefined when args is not an object", () => {
      expect(getApiKey("not-an-object")).toBeUndefined();
    });

    it("should return undefined when args.token is not a string", () => {
      expect(getApiKey({ token: 123 })).toBeUndefined();
    });
  });
});
