import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleUpdateManualTestCase } from "../../../../src/tools/manual-testcases/update-manual-test-case.js";

describe("handleUpdateManualTestCase", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("throws when caseId is missing", async () => {
    await expect(
      handleUpdateManualTestCase(
        createArgs({ caseId: undefined, updates: { name: "New" } })
      )
    ).rejects.toThrow("caseId is required");
  });

  it("throws when updates object is missing", async () => {
    await expect(
      handleUpdateManualTestCase(createArgs({ caseId: "TC-1" }))
    ).rejects.toThrow("updates object is required");
  });

  it("should include all update fields in PATCH body", async () => {
    mockFetchSuccess({ id: "TC-999" });

    await handleUpdateManualTestCase(
      createArgs({
        caseId: "TC-999",
        updates: {
          name: "Updated name",
          description: "Updated desc",
          status: "Draft",
          testStepsDeclarationType: "Gherkin",
          preconditions: "Precond updated",
          postconditions: "Postcond updated",
          steps: [{ event: "Given", stepDescription: "user is on page" }],
          priority: "low",
          severity: "minor",
          type: "regression",
          layer: "api",
          behavior: "negative",
          automationStatus: "To be automated",
          tags: "updated-tag",
          automation: ["Muted"],
          customFields: { env: "staging" },
        },
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("PATCH");

    const body = JSON.parse(options?.body as string);
    expect(body.name).toBe("Updated name");
    expect(body.description).toBe("Updated desc");
    expect(body.status).toBe("Draft");
    expect(body.testStepsDeclarationType).toBe("Gherkin");
    expect(body.preconditions).toBe("Precond updated");
    expect(body.postconditions).toBe("Postcond updated");
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].event).toBe("Given");
    expect(body.priority).toBe("low");
    expect(body.severity).toBe("minor");
    expect(body.type).toBe("regression");
    expect(body.layer).toBe("api");
    expect(body.behavior).toBe("negative");
    expect(body.automationStatus).toBe("To be automated");
    expect(body.tags).toBe("updated-tag");
    expect(body.automation).toEqual(["Muted"]);
    expect(body.customFields).toEqual({ env: "staging" });
  });

  it("sends PATCH request with correct body", async () => {
    mockFetchSuccess({ id: "TC-123" });

    await handleUpdateManualTestCase(
      createArgs({
        caseId: "TC-123",
        updates: {
          name: "Updated title",
          priority: "high",
          status: "Active",
        },
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("PATCH");

    const body = JSON.parse(options?.body as string);
    expect(body.name).toBe("Updated title");
    expect(body.priority).toBe("high");
    expect(body.status).toBe("Active");
  });
});
