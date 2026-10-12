import {
  processAttachments,
  processStepAttachments,
  type AttachmentInput,
  type TestStep,
} from "./file-utils.js";

// A local package can attach a file by path; the hosted MCP cannot see the
// user's disk. Paths become the file objects the hosted schema expects before
// the arguments are validated against it. Only manual test cases store an
// uploaded file's content; other attachment fields stay as the hosted ones.
export function prepareLocalFiles(
  toolName: string,
  args: Record<string, unknown>
): void {
  if (toolName !== "create_manual_test_case") {
    return;
  }
  if (Array.isArray(args.attachments)) {
    args.attachments = processAttachments(
      args.attachments as AttachmentInput[]
    );
  }
  if (Array.isArray(args.steps)) {
    args.steps = processStepAttachments(args.steps as TestStep[]);
  }
}
