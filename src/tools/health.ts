/**
 * Health tool - Health check and PAT validation
 */

import { endpoints } from "../lib/endpoints.js";
import { apiRequestJson } from "../lib/request.js";
import { getApiKey } from "../lib/env.js";

export const healthTool = {
  name: "health",
  description:
    "Check if your TestDino connection is working. Verifies your PAT, shows your account information, and lists available organizations and projects. Each organization also shows your role in it (owner/admin/member/billing/viewer) so you can tell the user what they can do there — treat it as informational, not a security guarantee. Use this first to make sure everything is set up correctly and to get organization/project IDs for other tools.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

interface McpHealthOrgProject {
  projectId?: string;
  projectName?: string | null;
}

interface McpHealthOrg {
  orgId?: string | null;
  orgName?: string | null;
  // The caller's org-membership role (owner/admin/member/billing/viewer),
  // enriched server-side. Optional: absent on servers that predate the role
  // enrichment, so the renderer only shows it when present. Informational
  // only — never a security guarantee.
  role?: string | null;
  projects?: McpHealthOrgProject[] | { allProjects?: boolean };
}

interface McpHealthBody {
  userId?: string;
  tokenType?: string;
  patValid?: boolean;
  orgs?: McpHealthOrg[];
  expiresAt?: string | null;
}

/**
 * Formats the MCP service health shape: a flat body with `orgs` instead of
 * the `{data: {user, pat, access}}` envelope. Servers on this shape do not
 * report per-project permissions or modules, so the output lists IDs only.
 */
function formatMcpHealthBody(data: McpHealthBody): string {
  let output = `✅ **TestDino Connection Successful!**\n\n`;

  if (data.userId) {
    output += `👤 **User ID**: \`${data.userId}\`\n`;
  }
  const expiry = data.expiresAt
    ? ` (expires ${data.expiresAt.slice(0, 10)})`
    : "";
  output += `🔑 **PAT**: ${data.patValid === false ? "invalid" : "valid"}${expiry}\n\n`;

  const orgs = Array.isArray(data.orgs) ? data.orgs : [];
  if (orgs.length === 0) {
    output += `⚠️ **No Organizations Found**\n\nYour PAT doesn't have access to any organizations or projects.\nPlease contact your administrator to grant access.`;
    return output;
  }

  const countProjects = (org: McpHealthOrg): number =>
    Array.isArray(org.projects) ? org.projects.length : 0;
  const totalProjects = orgs.reduce((sum, org) => sum + countProjects(org), 0);

  output += `📊 **Access Summary**\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `Organizations: ${orgs.length} | Projects: ${totalProjects}\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  orgs.forEach((org, orgIndex) => {
    output += `**${orgIndex + 1}. ${org.orgName || "Unnamed organization"}**\n`;
    output += `   📋 Org ID: \`${org.orgId || "unknown"}\`\n`;
    // Only rendered when the server supplies it (older servers omit role).
    if (org.role) {
      output += `   🛡️ Your role: ${org.role}\n`;
    }

    if (Array.isArray(org.projects) && org.projects.length > 0) {
      output += `   📁 Projects (${org.projects.length}):\n\n`;
      org.projects.forEach((project, projIndex) => {
        output += `   ${orgIndex + 1}.${projIndex + 1} **${project.projectName || "Unnamed project"}**\n`;
        output += `       • Project ID: \`${project.projectId || "unknown"}\`\n\n`;
      });
    } else if (
      org.projects &&
      !Array.isArray(org.projects) &&
      org.projects.allProjects === true
    ) {
      output += `   📁 Projects: all projects (wildcard scope) — use a listing tool or ask the user for a projectId\n\n`;
    } else {
      output += `   ℹ️ No projects available\n\n`;
    }

    if (orgIndex < orgs.length - 1) {
      output += `   ─────────────────────────────────────\n\n`;
    }
  });

  output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `\nYou can use organisation Id and project Id in other MCP tools.\n`;
  output += `Happy Testing!😀`;

  return output;
}

export async function handleHealth(args?: Record<string, unknown>) {
  // Validate PAT and get user info using /api/mcp/hello endpoint
  try {
    // Read PAT from environment variable (set in mcp.json) or from args
    const token = getApiKey(args);

    if (!token) {
      return {
        content: [
          {
            type: "text",
            text: "❌ **Error**: Missing TESTDINO_PAT environment variable.\n\nPlease configure it in your .cursor/mcp.json file under the 'env' section.",
          },
        ],
      };
    }

    const helloEndpoint = endpoints.hello();
    const response = await apiRequestJson<{
      success?: boolean;
      message?: string;
      data?: {
        user: {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          fullName: string;
        };
        pat: {
          id: string;
          name: string;
        };
        access: Array<{
          organizationId: string;
          organizationName: string;
          projects: Array<{
            projectId: string;
            projectName: string;
            modules: {
              testRuns: boolean;
              manualTestCases: boolean;
            };
            permissions: {
              canRead: boolean;
              canWrite: boolean;
              role: string;
            };
          }>;
        }>;
      };
    }>(helloEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Handle wrapped response structure (success helper format)
    const responseData = response.data || response;

    // MCP service shape: flat body with `orgs` (no data/user/pat envelope).
    const flatBody = responseData as unknown as Record<string, unknown>;
    if (flatBody && Array.isArray(flatBody.orgs)) {
      return {
        content: [
          {
            type: "text",
            text: formatMcpHealthBody(flatBody as McpHealthBody),
          },
        ],
      };
    }

    // Type guard to check if we have the expected data structure
    if (
      !responseData ||
      typeof responseData === "string" ||
      !("user" in responseData)
    ) {
      return {
        content: [
          {
            type: "text",
            text: `❌ **Error**: Unexpected response from TestDino server.\n\n${JSON.stringify(responseData)}`,
          },
        ],
      };
    }

    const data = responseData as {
      user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        fullName: string;
      };
      pat: {
        id: string;
        name: string;
      };
      access: Array<{
        organizationId: string;
        organizationName: string;
        projects: Array<{
          projectId: string;
          projectName: string;
          modules: {
            testRuns: boolean;
            manualTestCases: boolean;
          };
          permissions: {
            canRead: boolean;
            canWrite: boolean;
            role: string;
          };
        }>;
      }>;
    };

    // Format the response
    let output = `✅ **TestDino Connection Successful!**\n\n`;
    output += `👤 **Account**: ${data.user.fullName}\n`;
    output += `🔑 **PAT**: ${data.pat.name}\n\n`;

    if (!data.access || data.access.length === 0) {
      output += `⚠️ **No Organizations Found**\n\nYour PAT doesn't have access to any organizations or projects.\nPlease contact your administrator to grant access.`;
    } else {
      // Calculate totals
      const totalOrgs = data.access.length;
      const totalProjects = data.access.reduce(
        (sum, org) => sum + (org.projects?.length || 0),
        0
      );

      output += `📊 **Access Summary**\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      output += `Organizations: ${totalOrgs} | Projects: ${totalProjects}\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      data.access.forEach((org, orgIndex) => {
        output += `**${orgIndex + 1}. ${org.organizationName}**\n`;
        output += `   📋 Org ID: \`${org.organizationId}\`\n`;

        if (org.projects && org.projects.length > 0) {
          output += `   📁 Projects (${org.projects.length}):\n\n`;

          org.projects.forEach((project, projIndex) => {
            const accessIcon = project.permissions.canWrite ? "✏️" : "👁️";
            const accessLabel = project.permissions.canWrite ? "Write" : "Read";

            output += `   ${orgIndex + 1}.${projIndex + 1} ${accessIcon} **${project.projectName}**\n`;
            output += `       • Project ID: \`${project.projectId}\`\n`;
            output += `       • Access: ${accessLabel} (${project.permissions.role})\n`;

            if (project.modules.testRuns) {
              output += `       • Modules: Test Runs ✓\n`;
            }
            if (project.modules.manualTestCases) {
              output += `       • Modules: Test Case Management ✓\n`;
            }
            output += `\n`;
          });
        } else {
          output += `   ℹ️ No projects available\n\n`;
        }

        // Add separator between organizations (except after the last one)
        if (orgIndex < data.access.length - 1) {
          output += `   ─────────────────────────────────────\n\n`;
        }
      });

      output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      output += `\nHello👋 ${data.user.firstName}!\n`;
      output += `You can use organisation Id and project Id in other MCP tools.\n`;
      output += `Happy Testing!😀`;
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `❌ **Error validating PAT**\n\n${errorMessage}\n\nPlease check your PAT and try again.`,
        },
      ],
    };
  }
}
