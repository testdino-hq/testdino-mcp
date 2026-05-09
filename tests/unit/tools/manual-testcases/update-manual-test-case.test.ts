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
          steps: [
            {
              event: "Given",
              stepDescription: "user is on page",
              attachments: ["https://example.com/step.png"],
            },
          ],
          priority: "low",
          severity: "minor",
          type: "regression",
          layer: "api",
          behavior: "negative",
          automationStatus: "To be automated",
          tags: "updated-tag",
          flags: ["Muted"],
          attachments: { add: ["https://example.com/case.png"] },
          customFields: { env: "staging" },
        },
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("PATCH");

    const body = JSON.parse(options?.body as string);
    expect(body.updates.name).toBe("Updated name");
    expect(body.updates.description).toBe("Updated desc");
    expect(body.updates.status).toBe("Draft");
    expect(body.updates.testStepsDeclarationType).toBe("Gherkin");
    expect(body.updates.preconditions).toBe("Precond updated");
    expect(body.updates.postconditions).toBe("Postcond updated");
    expect(body.updates.steps).toHaveLength(1);
    expect(body.updates.steps[0].event).toBe("Given");
    expect(body.updates.steps[0].attachments).toEqual([
      "https://example.com/step.png",
    ]);
    expect(body.updates.priority).toBe("low");
    expect(body.updates.severity).toBe("minor");
    expect(body.updates.type).toBe("regression");
    expect(body.updates.layer).toBe("api");
    expect(body.updates.behavior).toBe("negative");
    expect(body.updates.automationStatus).toBe("To be automated");
    expect(body.updates.tags).toBe("updated-tag");
    expect(body.updates.flags).toEqual(["Muted"]);
    expect(body.updates.attachments.add).toEqual([
      "https://example.com/case.png",
    ]);
    expect(body.updates.customFields).toEqual({ env: "staging" });
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
    expect(body.updates.name).toBe("Updated title");
    expect(body.updates.priority).toBe("high");
    expect(body.updates.status).toBe("Active");
  });
});
