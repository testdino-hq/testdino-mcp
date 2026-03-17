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
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
function isLocalFilePath(input: string): boolean {
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
          `Failed to read file "${attachment}": ${errorMessage}`
        );
      }
    }
    // Return URLs as-is (strings)
    return attachment;
  });
}

