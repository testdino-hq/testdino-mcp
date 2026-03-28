import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleCreateManualTestCase } from "../../../../src/tools/manual-testcases/create-manual-test-case.js";

describe("handleCreateManualTestCase", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("throws when title is missing", async () => {
    await expect(
      handleCreateManualTestCase(
        createArgs({ title: undefined, suiteName: "Suite" })
      )
    ).rejects.toThrow("title is required");
  });

  it("throws when suiteName is missing", async () => {
    await expect(
      handleCreateManualTestCase(
        createArgs({ title: "Test", suiteName: undefined })
      )
    ).rejects.toThrow("suiteName is required");
  });

  it("should forward all optional params to the API", async () => {
    mockFetchSuccess({ id: "tc-full" });

    await handleCreateManualTestCase(
      createArgs({
        title: "Full test",
        suiteName: "Full Suite",
        description: "A full description",
        status: "Active",
        testStepsDeclarationType: "Classic",
        preconditions: "User is logged in",
        postconditions: "User is logged out",
        steps: [
          { action: "Click login", expectedResult: "Login form appears" },
        ],
        priority: "high",
        severity: "critical",
        type: "functional",
        layer: "e2e",
        behavior: "positive",
        automationStatus: "Automated",
        tags: "smoke,regression",
        automation: ["To be Automated", "Is flaky"],
        customFields: { team: "backend", sprint: "42" },
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");

    const body = JSON.parse(options?.body as string);
    expect(body.projectId).toBe("test-project-id");
    expect(body.title).toBe("Full test");
    expect(body.suiteName).toBe("Full Suite");
    expect(body.description).toBe("A full description");
    expect(body.status).toBe("Active");
    expect(body.testStepsDeclarationType).toBe("Classic");
    expect(body.preconditions).toBe("User is logged in");
    expect(body.postconditions).toBe("User is logged out");
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].action).toBe("Click login");
    expect(body.priority).toBe("high");
    expect(body.severity).toBe("critical");
    expect(body.type).toBe("functional");
    expect(body.layer).toBe("e2e");
    expect(body.behavior).toBe("positive");
    expect(body.automationStatus).toBe("Automated");
    expect(body.tags).toBe("smoke,regression");
    expect(body.automation).toEqual(["To be Automated", "Is flaky"]);
    expect(body.customFields).toEqual({ team: "backend", sprint: "42" });
  });

  it("sends POST request with correct body", async () => {
    mockFetchSuccess({ id: "tc-new" });

    await handleCreateManualTestCase(
      createArgs({
        title: "Login flow test",
        suiteName: "Auth Suite",
        description: "Tests the login flow",
        priority: "high",
        status: "Active",
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");

    const body = JSON.parse(options?.body as string);
    expect(body.projectId).toBe("test-project-id");
    expect(body.title).toBe("Login flow test");
    expect(body.suiteName).toBe("Auth Suite");
    expect(body.description).toBe("Tests the login flow");
    expect(body.priority).toBe("high");
    expect(body.status).toBe("Active");
  });
});
