#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { LinearClient } from "@linear/sdk";

// Initialize Linear client with API key from environment
const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY,
});

// Create MCP server
const server = new Server(
  {
    name: "linear-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "linear_list_issues",
        description: "List issues from Linear with optional filters. Returns issue ID, title, status, assignee, and priority.",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: {
              type: "string",
              description: "Filter by team key (e.g., 'ENG', 'PROD')",
            },
            status: {
              type: "string",
              description: "Filter by status name (e.g., 'In Progress', 'Done', 'Backlog')",
            },
            assigneeEmail: {
              type: "string",
              description: "Filter by assignee email",
            },
            limit: {
              type: "number",
              description: "Maximum number of issues to return (default: 20)",
            },
          },
        },
      },
      {
        name: "linear_get_issue",
        description: "Get detailed information about a specific Linear issue by its identifier (e.g., 'ENG-123')",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "The issue identifier (e.g., 'ENG-123')",
            },
          },
          required: ["issueId"],
        },
      },
      {
        name: "linear_create_issue",
        description: "Create a new issue in Linear",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Issue title",
            },
            description: {
              type: "string",
              description: "Issue description (supports markdown)",
            },
            teamKey: {
              type: "string",
              description: "Team key to create the issue in (e.g., 'ENG')",
            },
            priority: {
              type: "number",
              description: "Priority: 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low",
            },
            assigneeEmail: {
              type: "string",
              description: "Email of the user to assign the issue to",
            },
          },
          required: ["title", "teamKey"],
        },
      },
      {
        name: "linear_update_issue",
        description: "Update an existing Linear issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "The issue identifier (e.g., 'ENG-123')",
            },
            title: {
              type: "string",
              description: "New title",
            },
            description: {
              type: "string",
              description: "New description",
            },
            status: {
              type: "string",
              description: "New status name (e.g., 'In Progress', 'Done')",
            },
            priority: {
              type: "number",
              description: "New priority: 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low",
            },
            assigneeEmail: {
              type: "string",
              description: "Email of user to assign to",
            },
          },
          required: ["issueId"],
        },
      },
      {
        name: "linear_add_comment",
        description: "Add a comment to a Linear issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "The issue identifier (e.g., 'ENG-123')",
            },
            body: {
              type: "string",
              description: "Comment body (supports markdown)",
            },
          },
          required: ["issueId", "body"],
        },
      },
      {
        name: "linear_search_issues",
        description: "Search for issues using a text query",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query text",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 20)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "linear_list_teams",
        description: "List all teams in the Linear workspace",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "linear_list_projects",
        description: "List projects in Linear",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: {
              type: "string",
              description: "Filter by team key",
            },
          },
        },
      },
      {
        name: "linear_get_my_issues",
        description: "Get issues assigned to the authenticated user",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Filter by status (e.g., 'In Progress')",
            },
            limit: {
              type: "number",
              description: "Maximum number of issues (default: 20)",
            },
          },
        },
      },
    ],
  };
});

// Helper functions
async function getTeamByKey(teamKey) {
  const teams = await linearClient.teams();
  return teams.nodes.find((t) => t.key === teamKey);
}

async function getUserByEmail(email) {
  const users = await linearClient.users();
  return users.nodes.find((u) => u.email === email);
}

async function getWorkflowStateByName(teamId, statusName) {
  const team = await linearClient.team(teamId);
  const states = await team.states();
  return states.nodes.find(
    (s) => s.name.toLowerCase() === statusName.toLowerCase()
  );
}

function formatIssue(issue, state, assignee, team) {
  return {
    id: issue.identifier,
    title: issue.title,
    description: issue.description,
    status: state?.name || "Unknown",
    priority: ["No priority", "Urgent", "High", "Normal", "Low"][issue.priority] || "Unknown",
    assignee: assignee?.name || "Unassigned",
    team: team?.name || "Unknown",
    url: issue.url,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "linear_list_issues": {
        let filter = {};

        if (args.teamKey) {
          const team = await getTeamByKey(args.teamKey);
          if (team) filter.team = { id: { eq: team.id } };
        }

        if (args.status) {
          filter.state = { name: { eqIgnoreCase: args.status } };
        }

        if (args.assigneeEmail) {
          const user = await getUserByEmail(args.assigneeEmail);
          if (user) filter.assignee = { id: { eq: user.id } };
        }

        const issues = await linearClient.issues({
          filter,
          first: args.limit || 20,
        });

        const formattedIssues = await Promise.all(
          issues.nodes.map(async (issue) => {
            const [state, assignee, team] = await Promise.all([
              issue.state,
              issue.assignee,
              issue.team,
            ]);
            return formatIssue(issue, state, assignee, team);
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedIssues, null, 2),
            },
          ],
        };
      }

      case "linear_get_issue": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return {
            content: [{ type: "text", text: `Issue ${args.issueId} not found` }],
          };
        }

        const [state, assignee, team, comments] = await Promise.all([
          issue.state,
          issue.assignee,
          issue.team,
          issue.comments(),
        ]);

        const formatted = formatIssue(issue, state, assignee, team);
        formatted.comments = comments.nodes.map((c) => ({
          body: c.body,
          createdAt: c.createdAt,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }],
        };
      }

      case "linear_create_issue": {
        const team = await getTeamByKey(args.teamKey);
        if (!team) {
          return {
            content: [{ type: "text", text: `Team ${args.teamKey} not found` }],
          };
        }

        const issueInput = {
          teamId: team.id,
          title: args.title,
          description: args.description,
          priority: args.priority,
        };

        if (args.assigneeEmail) {
          const user = await getUserByEmail(args.assigneeEmail);
          if (user) issueInput.assigneeId = user.id;
        }

        const result = await linearClient.createIssue(issueInput);
        const issue = await result.issue;

        return {
          content: [
            {
              type: "text",
              text: `Created issue ${issue.identifier}: ${issue.title}\nURL: ${issue.url}`,
            },
          ],
        };
      }

      case "linear_update_issue": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return {
            content: [{ type: "text", text: `Issue ${args.issueId} not found` }],
          };
        }

        const updateInput = {};

        if (args.title) updateInput.title = args.title;
        if (args.description) updateInput.description = args.description;
        if (args.priority !== undefined) updateInput.priority = args.priority;

        if (args.status) {
          const team = await issue.team;
          const state = await getWorkflowStateByName(team.id, args.status);
          if (state) updateInput.stateId = state.id;
        }

        if (args.assigneeEmail) {
          const user = await getUserByEmail(args.assigneeEmail);
          if (user) updateInput.assigneeId = user.id;
        }

        await linearClient.updateIssue(issue.id, updateInput);

        return {
          content: [
            {
              type: "text",
              text: `Updated issue ${args.issueId}`,
            },
          ],
        };
      }

      case "linear_add_comment": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return {
            content: [{ type: "text", text: `Issue ${args.issueId} not found` }],
          };
        }

        await linearClient.createComment({
          issueId: issue.id,
          body: args.body,
        });

        return {
          content: [
            {
              type: "text",
              text: `Added comment to ${args.issueId}`,
            },
          ],
        };
      }

      case "linear_search_issues": {
        const results = await linearClient.searchIssues(args.query, {
          first: args.limit || 20,
        });

        const formattedIssues = await Promise.all(
          results.nodes.map(async (issue) => {
            const [state, assignee, team] = await Promise.all([
              issue.state,
              issue.assignee,
              issue.team,
            ]);
            return formatIssue(issue, state, assignee, team);
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedIssues, null, 2),
            },
          ],
        };
      }

      case "linear_list_teams": {
        const teams = await linearClient.teams();
        const formatted = teams.nodes.map((t) => ({
          key: t.key,
          name: t.name,
          description: t.description,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }],
        };
      }

      case "linear_list_projects": {
        let filter = {};

        if (args.teamKey) {
          const team = await getTeamByKey(args.teamKey);
          if (team) {
            filter.accessibleTeams = { some: { id: { eq: team.id } } };
          }
        }

        const projects = await linearClient.projects({ filter });
        const formatted = projects.nodes.map((p) => ({
          name: p.name,
          description: p.description,
          state: p.state,
          progress: p.progress,
          url: p.url,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }],
        };
      }

      case "linear_get_my_issues": {
        const me = await linearClient.viewer;
        let filter = {
          assignee: { id: { eq: me.id } },
        };

        if (args.status) {
          filter.state = { name: { eqIgnoreCase: args.status } };
        }

        const issues = await linearClient.issues({
          filter,
          first: args.limit || 20,
        });

        const formattedIssues = await Promise.all(
          issues.nodes.map(async (issue) => {
            const [state, assignee, team] = await Promise.all([
              issue.state,
              issue.assignee,
              issue.team,
            ]);
            return formatIssue(issue, state, assignee, team);
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedIssues, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linear MCP Server running on stdio");
}

main().catch(console.error);
