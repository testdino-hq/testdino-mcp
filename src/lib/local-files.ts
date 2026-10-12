import {
  processAttachments,
  processStepAttachments,
  type AttachmentInput,
  type TestStep,
} from "./file-utils.js";

// A local package can attach a file by path; the hosted MCP cannot see the
// user's disk. Paths become the file objects the hosted schema expects before
// the arguments are validated against it.
export function prepareLocalFiles(args: Record<string, unknown>): void {
  if (Array.isArray(args.attachments)) {
    args.attachments = processAttachments(
      args.attachments as AttachmentInput[]
    );
  }
  if (Array.isArray(args.steps)) {
    args.steps = processStepAttachments(args.steps as TestStep[]);
  }
}
