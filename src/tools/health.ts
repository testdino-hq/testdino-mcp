/**
 * Health tool - Health check and API key validation
 */

import { endpoints } from "../lib/endpoints.js";
import { apiRequestJson } from "../lib/request.js";
import { getApiKey } from "../lib/env.js";

export const healthTool = {
  name: "health",
  description:
    "Check if your TestDino connection is working. Verifies your API key, shows your account information, and lists available organizations and projects. Use this first to make sure everything is set up correctly and to get organization/project IDs for other tools.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function handleHealth(args?: Record<string, unknown>) {
  // Validate API key and get user info using /api/mcp/hello endpoint
  try {
    // Read API key from environment variable (set in mcp.json) or from args
    const token = getApiKey(args);

    if (!token) {
      return {
        content: [
          {
            type: "text",
            text: "❌ **Error**: Missing TESTDINO_API_KEY environment variable.\n\nPlease configure it in your .cursor/mcp.json file under the 'env' section.",
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
      output += `⚠️ **No Organizations Found**\n\nYour API key doesn't have access to any organizations or projects.\nPlease contact your administrator to grant access.`;
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
          text: `❌ **Error validating API key**\n\n${errorMessage}\n\nPlease check your API key and try again.`,
        },
      ],
    };
  }
}
