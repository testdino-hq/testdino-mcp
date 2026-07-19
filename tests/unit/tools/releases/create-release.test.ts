import { describe, it, expect, afterEach } from "vitest";
import {
  mockFetchSuccess,
  restoreFetch,
  getLastFetchOptions,
} from "../../../helpers/mockFetch.js";
import { createArgs } from "../../../helpers/mockTypes.js";
import { handleCreateRelease } from "../../../../src/tools/releases/create-release.js";

describe("handleCreateRelease", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("throws when name is missing", async () => {
    await expect(
      handleCreateRelease(createArgs({ name: undefined }))
    ).rejects.toThrow("name is required");
  });

  it("sends POST request with correct body", async () => {
    mockFetchSuccess({ id: "rel-new" });

    await handleCreateRelease(
      createArgs({
        name: "Release 1.0",
        description: "First release",
        type: "major",
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");

    const body = JSON.parse(options?.body as string);
    expect(body.name).toBe("Release 1.0");
    expect(body.description).toBe("First release");
    expect(body.type).toBe("major");
    // projectId is stripped from the body and used to build the URL
    expect(body.projectId).toBeUndefined();
  });

  it("forwards branch, environment, buildTarget, and testers in the POST body", async () => {
    mockFetchSuccess({ id: "rel-full" });

    await handleCreateRelease(
      createArgs({
        name: "Release 2.0",
        branch: "release/2.0",
        environment: "Staging",
        buildTarget: {
          platform: "web",
          version: "2.0.0",
          buildNumber: "1234",
          source: "ci",
          deployUrl: "https://staging.example.com",
        },
        testers: ["user_1", "user_2"],
      })
    );

    const options = getLastFetchOptions();
    expect(options?.method).toBe("POST");

    const body = JSON.parse(options?.body as string);
    expect(body.branch).toBe("release/2.0");
    expect(body.environment).toBe("Staging");
    expect(body.buildTarget).toEqual({
      platform: "web",
      version: "2.0.0",
      buildNumber: "1234",
      source: "ci",
      deployUrl: "https://staging.example.com",
    });
    expect(body.testers).toEqual(["user_1", "user_2"]);
  });
});
