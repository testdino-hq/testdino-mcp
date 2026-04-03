export const AUDIT_CATEGORY_METADATA = {
  surface_level_tests: {
    label: "Surface-Level Tests",
    description:
      "Tests only check page load or basic UI presence, not meaningful behavior.",
  },
  missing_validation: {
    label: "Missing Validation",
    description: "Tests do something but do not verify the important outcome.",
  },
  stability_issues: {
    label: "Flaky or Unstable",
    description:
      "Timing, waiting, shared-state, or order-dependent issues make tests unreliable.",
  },
  hard_to_maintain: {
    label: "Hard to Maintain",
    description:
      "Selectors, setup, naming, or structure make the suite difficult to update safely.",
  },
  coverage_gaps: {
    label: "Missing Scenarios",
    description:
      "Important cases like errors, empty states, mobile, or accessibility are not covered.",
  },
  organization_ownership: {
    label: "Organization & Ownership",
    description:
      "Grouping, tags, skips, or ownership signals are missing or unclear.",
  },
  setup_configuration: {
    label: "Setup & Configuration",
    description:
      "Project-level configuration weakens reliability, debugging, or consistency.",
  },
  duplication_overlap: {
    label: "Duplication & Overlap",
    description:
      "Multiple tests repeat or fragment the same flow instead of covering it cleanly.",
  },
  other: {
    label: "General Issues",
    description:
      "Issues that need follow-up or do not fit the main audit groups cleanly.",
  },
} as const;

export const AUDIT_CATEGORY_CODES = Object.freeze(
  Object.keys(AUDIT_CATEGORY_METADATA)
) as ReadonlyArray<keyof typeof AUDIT_CATEGORY_METADATA>;

export const DEFAULT_AUDIT_CATEGORY = "other" as const;

function normalizeAuditCategoryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const AUDIT_CATEGORY_ALIASES = Object.freeze(
  (() => {
    const aliases: Record<string, string> = {};

    for (const [code, metadata] of Object.entries(AUDIT_CATEGORY_METADATA)) {
      aliases[normalizeAuditCategoryKey(code)] = code;
      aliases[normalizeAuditCategoryKey(metadata.label)] = code;
    }

    const legacyAliases: Record<string, string> = {
      shallow_tests: "surface_level_tests",
      shallow_test: "surface_level_tests",
      shallow_assertions: "surface_level_tests",
      side_effect_coverage: "missing_validation",
      missing_assertions: "missing_validation",
      determinism_flakiness: "stability_issues",
      flakiness: "stability_issues",
      flaky_tests: "stability_issues",
      maintainability: "hard_to_maintain",
      coverage_blind_spots: "coverage_gaps",
      blind_spots: "coverage_gaps",
      annotations_tags: "organization_ownership",
      config_issues: "setup_configuration",
      playwright_config: "setup_configuration",
      consolidation: "duplication_overlap",
      duplication: "duplication_overlap",
    };

    for (const [alias, code] of Object.entries(legacyAliases)) {
      aliases[normalizeAuditCategoryKey(alias)] = code;
    }

    return aliases;
  })()
);

export function normalizeAuditCategory(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AUDIT_CATEGORY;

  const normalizedKey = normalizeAuditCategoryKey(value);
  if (!normalizedKey) return DEFAULT_AUDIT_CATEGORY;

  return AUDIT_CATEGORY_ALIASES[normalizedKey] || DEFAULT_AUDIT_CATEGORY;
}

export function isRecognizedAuditCategory(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const normalizedKey = normalizeAuditCategoryKey(value);
  if (!normalizedKey) return false;

  return Boolean(AUDIT_CATEGORY_ALIASES[normalizedKey]);
}

export function normalizeAuditSubCategory(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
