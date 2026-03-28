import { describe, it, expect } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  isLocalFilePath,
  processAttachments,
  processSubStepImages,
  readFileData,
  validateClassicSteps,
} from "../../../src/lib/file-utils.js";
import type { ClassicTestStep } from "../../../src/lib/file-utils.js";

describe("file-utils", () => {
  describe("isLocalFilePath", () => {
    it("should return true for unix absolute paths", () => {
      expect(isLocalFilePath("/home/user/file.png")).toBe(true);
    });

    it("should return true for windows paths", () => {
      expect(isLocalFilePath("C:\\Users\\file.png")).toBe(true);
    });

    it("should return true for relative paths", () => {
      expect(isLocalFilePath("./images/screenshot.png")).toBe(true);
    });

    it("should return false for http URLs", () => {
      expect(isLocalFilePath("http://example.com/img.png")).toBe(false);
    });

    it("should return false for https URLs", () => {
      expect(isLocalFilePath("https://example.com/img.png")).toBe(false);
    });

    it("should return false for blob URLs", () => {
      expect(isLocalFilePath("blob:http://example.com/abc")).toBe(false);
    });

    it("should return false for data URLs", () => {
      expect(isLocalFilePath("data:image/png;base64,abc")).toBe(false);
    });
  });

  describe("processAttachments", () => {
    it("should pass through URLs unchanged", () => {
      const result = processAttachments(["https://example.com/file.png"]);
      expect(result).toEqual(["https://example.com/file.png"]);
    });

    it("should throw on non-existent local file", () => {
      expect(() => processAttachments(["/nonexistent/path/file.png"])).toThrow(
        "Failed to read file"
      );
    });
  });

  describe("processSubStepImages", () => {
    it("should pass through non-local-file image URLs unchanged", () => {
      const steps: ClassicTestStep[] = [
        {
          action: "Click button",
          expectedResult: "Button clicked",
          subSteps: [
            {
              action: "Sub action",
              expectedResult: "Sub result",
              images: [
                {
                  url: "https://cdn.example.com/image.png",
                  fileName: "image.png",
                },
              ],
            },
          ],
        },
      ];

      processSubStepImages(steps);

      const img = steps[0].subSteps![0].images![0];
      expect(img.url).toBe("https://cdn.example.com/image.png");
      expect(img.fileName).toBe("image.png");
      // Should NOT have fileContent since it's a URL, not a local path
      expect((img as Record<string, unknown>).fileContent).toBeUndefined();
    });
  });

  describe("readFileData", () => {
    it("should read a real temp file and return correct base64, MIME, and fileName", () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "testdino-"));
      const tmpFile = join(tmpDir, "test-image.png");
      const content = Buffer.from("fake-png-content");
      writeFileSync(tmpFile, content);

      try {
        const result = readFileData(tmpFile);
        expect(result.fileName).toBe("test-image.png");
        expect(result.originalFileName).toBe("test-image.png");
        expect(result.mimeType).toBe("image/png");
        expect(result.fileSize).toBe(content.length);
        expect(result.fileContent).toBe(content.toString("base64"));
      } finally {
        unlinkSync(tmpFile);
      }
    });

    it("should throw for a non-existent file", () => {
      expect(() => readFileData("/no/such/file.txt")).toThrow("File not found");
    });
  });

  describe("validateClassicSteps", () => {
    it("should pass for valid steps without sub-steps", () => {
      const steps: ClassicTestStep[] = [
        { action: "Click button", expectedResult: "Button is clicked" },
      ];
      expect(() => validateClassicSteps(steps)).not.toThrow();
    });

    it("should pass for steps with <= 5 sub-steps", () => {
      const steps: ClassicTestStep[] = [
        {
          action: "Step 1",
          expectedResult: "Result 1",
          subSteps: Array.from({ length: 5 }, (_, i) => ({
            action: `Sub ${i}`,
            expectedResult: `Result ${i}`,
          })),
        },
      ];
      expect(() => validateClassicSteps(steps)).not.toThrow();
    });

    it("should throw for steps with > 5 sub-steps", () => {
      const steps: ClassicTestStep[] = [
        {
          action: "Step 1",
          expectedResult: "Result 1",
          subSteps: Array.from({ length: 6 }, (_, i) => ({
            action: `Sub ${i}`,
            expectedResult: `Result ${i}`,
          })),
        },
      ];
      expect(() => validateClassicSteps(steps)).toThrow("maximum 5 sub-steps");
    });

    it("should throw for sub-steps with > 2 images", () => {
      const steps: ClassicTestStep[] = [
        {
          action: "Step 1",
          expectedResult: "Result 1",
          subSteps: [
            {
              action: "Sub 1",
              expectedResult: "Result",
              images: [
                { url: "https://a.com/1.png", fileName: "1.png" },
                { url: "https://a.com/2.png", fileName: "2.png" },
                { url: "https://a.com/3.png", fileName: "3.png" },
              ],
            },
          ],
        },
      ];
      expect(() => validateClassicSteps(steps)).toThrow("maximum 2 images");
    });
  });
});
