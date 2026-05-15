import { describe, it, expect } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  isLocalFilePath,
  processAttachments,
  processStepAttachments,
  readFileData,
} from "../../../src/lib/file-utils.js";

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

  describe("processStepAttachments", () => {
    it("should process attachments on top-level steps", () => {
      const result = processStepAttachments([
        {
          action: "Open login",
          expectedResult: "Login page opens",
          attachments: ["https://example.com/step.png"],
        },
      ]);

      expect(result[0].attachments).toEqual(["https://example.com/step.png"]);
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
});
