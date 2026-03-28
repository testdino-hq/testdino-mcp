/**
 * File utility functions for MCP client
 * Formats file data to match server validation requirements (same format as UI upload)
 */

import { readFileSync, existsSync } from "fs";
import { extname, basename } from "path";

/**
 * MIME type mapping based on file extension
 * Matches server-side MIME type mapping
 */
const mimeTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  mp4: "video/mp4",
  webm: "video/webm",
  zip: "application/zip",
};

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase().substring(1);
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Check if a string is a local file path (not a URL)
 */
export function isLocalFilePath(input: string): boolean {
  return (
    !input.startsWith("http://") &&
    !input.startsWith("https://") &&
    !input.startsWith("blob:") &&
    !input.startsWith("data:") &&
    (input.includes("\\") || input.includes("/") || /^[A-Za-z]:/.test(input))
  );
}

/**
 * File data structure matching server validation requirements
 * Same format as UI sends to attachment controller
 */
export interface FileData {
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  fileContent: string; // Base64 encoded file content (for server to upload)
  // blobUrl and containerName will be set by server after upload
}

/**
 * Read a local file and return file data in server-expected format
 * @param filePath - Path to the local file
 * @returns File data object matching server validation format
 * @throws Error if file doesn't exist or can't be read
 */
export function readFileData(filePath: string): FileData {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileName = basename(filePath);
  const mimeType = getMimeType(filePath);
  const fileBuffer = readFileSync(filePath);
  const fileSize = fileBuffer.length;
  const fileContent = fileBuffer.toString("base64");

  return {
    fileName,
    originalFileName: fileName,
    fileSize,
    mimeType,
    fileContent, // Base64 content for server to upload
  };
}

/**
 * Process attachment inputs: convert local file paths to file data objects, leave URLs as-is
 * @param attachments - Array of attachment inputs (file paths or URLs)
 * @returns Array with local paths converted to file data objects, URLs unchanged as strings
 */
export function processAttachments(
  attachments: string[]
): (FileData | string)[] {
  return attachments.map((attachment) => {
    if (isLocalFilePath(attachment)) {
      try {
        return readFileData(attachment);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to read file "${attachment}": ${errorMessage}`,
          { cause: error }
        );
      }
    }
    // Return URLs as-is (strings)
    return attachment;
  });
}

/**
 * Shared interfaces for manual test case steps
 */
export interface SubStepImage {
  url: string;
  fileName: string;
}

export interface SubStep {
  action: string;
  expectedResult: string;
  data?: string;
  images?: SubStepImage[];
}

export interface ClassicTestStep {
  action: string;
  expectedResult: string;
  data?: string;
  subSteps?: SubStep[];
}

export interface GherkinTestStep {
  event: "Given" | "When" | "And" | "Then" | "But";
  stepDescription: string;
}

export type TestStep = ClassicTestStep | GherkinTestStep;

/**
 * Process subStep images: convert local file paths to base64 file data objects
 * so the server can upload them to Azure Storage.
 */
export function processSubStepImages(steps: TestStep[]): void {
  for (const step of steps) {
    const classicStep = step as ClassicTestStep;
    if (!classicStep.subSteps) continue;
    for (const subStep of classicStep.subSteps) {
      if (!subStep.images) continue;
      subStep.images = subStep.images.map((img) => {
        if (img.url && isLocalFilePath(img.url)) {
          try {
            const fileData = readFileData(img.url);
            return {
              ...img,
              fileContent: fileData.fileContent,
              mimeType: fileData.mimeType,
              fileSize: fileData.fileSize,
              fileName: img.fileName || fileData.fileName,
            };
          } catch {
            return img;
          }
        }
        return img;
      });
    }
  }
}

/**
 * Validate classic steps for sub-step and image constraints
 */
export function validateClassicSteps(steps: TestStep[]): void {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as ClassicTestStep;
    if (!step.subSteps) continue;

    if (step.subSteps.length > 5) {
      throw new Error(
        `Step ${i + 1} has ${step.subSteps.length} sub-steps, but maximum 5 sub-steps are allowed per step.`
      );
    }

    for (let j = 0; j < step.subSteps.length; j++) {
      const subStep = step.subSteps[j];
      if (subStep.images && subStep.images.length > 2) {
        throw new Error(
          `Step ${i + 1}, sub-step ${j + 1} has ${subStep.images.length} images, but maximum 2 images are allowed per sub-step.`
        );
      }
    }
  }
}
