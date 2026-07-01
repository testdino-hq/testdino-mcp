export const attachmentItemSchema = {
  type: "object",
  properties: {
    _id: { type: "string" },
    url: { type: "string" },
    blobUrl: { type: "string" },
    containerName: { type: "string" },
    fileName: { type: "string" },
    originalFileName: { type: "string" },
    fileSize: { type: "number" },
    mimeType: { type: "string" },
    fileContent: { type: "string" },
    uploadedBy: { type: "string" },
    uploadedAt: { type: "string" },
  },
  additionalProperties: true,
} as const;

export const linkedIssueItemSchema = {
  type: "object",
  properties: {
    displayId: { type: "string" },
    title: { type: "string" },
    url: { type: "string" },
    issueType: { type: "string" },
    status: { type: "string" },
    source: { type: "string" },
  },
  additionalProperties: true,
} as const;

export const linkItemSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    url: { type: "string" },
  },
  additionalProperties: true,
} as const;

export const buildTargetItemSchema = {
  type: "object",
  properties: {
    platform: { type: "string", enum: ["web", "ios", "android", "api"] },
    version: { type: "string" },
    buildNumber: { type: "string" },
    source: { type: "string" },
    deployUrl: { type: "string" },
  },
  additionalProperties: true,
} as const;

export const findingItemSchema = {
  type: "object",
  properties: {
    category: { type: "string" },
    subCategory: { type: "string" },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    title: { type: "string" },
    description: { type: "string" },
    summary: { type: "string" },
    recommendation: { type: "string" },
    location: { type: "string" },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
} as const;

export const stepResultItemSchema = {
  type: "object",
  properties: {
    order: { type: "number" },
    status: { type: "string" },
    comment: { type: "string" },
    actualResult: { type: "string" },
  },
  additionalProperties: true,
} as const;
