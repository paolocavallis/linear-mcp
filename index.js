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
    version: "2.0.0",
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
      // === ISSUES ===
      {
        name: "linear_list_issues",
        description: "List issues from Linear with optional filters. Returns issue ID, title, status, assignee, and priority.",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Filter by team key (e.g., 'ENG', 'PROD')" },
            status: { type: "string", description: "Filter by status name (e.g., 'In Progress', 'Done', 'Backlog')" },
            assigneeEmail: { type: "string", description: "Filter by assignee email" },
            projectName: { type: "string", description: "Filter by project name" },
            labelName: { type: "string", description: "Filter by label name" },
            limit: { type: "number", description: "Maximum number of issues to return (default: 20)" },
          },
        },
      },
      {
        name: "linear_get_issue",
        description: "Get detailed information about a specific Linear issue by its identifier (e.g., 'ENG-123')",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "The issue identifier (e.g., 'ENG-123')" },
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
            title: { type: "string", description: "Issue title" },
            description: { type: "string", description: "Issue description (supports markdown)" },
            teamKey: { type: "string", description: "Team key to create the issue in (e.g., 'ENG')" },
            priority: { type: "number", description: "Priority: 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low" },
            assigneeEmail: { type: "string", description: "Email of the user to assign the issue to" },
            projectName: { type: "string", description: "Name of project to add issue to" },
            labelNames: { type: "array", items: { type: "string" }, description: "Labels to add to the issue" },
            estimate: { type: "number", description: "Story points estimate" },
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
            issueId: { type: "string", description: "The issue identifier (e.g., 'ENG-123')" },
            title: { type: "string", description: "New title" },
            description: { type: "string", description: "New description" },
            status: { type: "string", description: "New status name (e.g., 'In Progress', 'Done')" },
            priority: { type: "number", description: "New priority: 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low" },
            assigneeEmail: { type: "string", description: "Email of user to assign to" },
            projectName: { type: "string", description: "Project to move issue to" },
            estimate: { type: "number", description: "Story points estimate" },
          },
          required: ["issueId"],
        },
      },
      {
        name: "linear_delete_issue",
        description: "Delete/archive an issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "The issue identifier (e.g., 'ENG-123')" },
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
            issueId: { type: "string", description: "The issue identifier (e.g., 'ENG-123')" },
            body: { type: "string", description: "Comment body (supports markdown)" },
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
            query: { type: "string", description: "Search query text" },
            limit: { type: "number", description: "Maximum number of results (default: 20)" },
          },
          required: ["query"],
        },
      },
      {
        name: "linear_get_my_issues",
        description: "Get issues assigned to the authenticated user",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", description: "Filter by status (e.g., 'In Progress')" },
            limit: { type: "number", description: "Maximum number of issues (default: 20)" },
          },
        },
      },

      // === PROJECTS ===
      {
        name: "linear_list_projects",
        description: "List projects in Linear",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Filter by team key" },
            state: { type: "string", description: "Filter by state: 'planned', 'started', 'paused', 'completed', 'canceled', 'backlog'" },
          },
        },
      },
      {
        name: "linear_get_project",
        description: "Get detailed information about a project",
        inputSchema: {
          type: "object",
          properties: {
            projectName: { type: "string", description: "The project name" },
          },
          required: ["projectName"],
        },
      },
      {
        name: "linear_create_project",
        description: "Create a new project in Linear",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Project name" },
            description: { type: "string", description: "Project description" },
            teamKeys: { type: "array", items: { type: "string" }, description: "Team keys to associate with project" },
            state: { type: "string", description: "Initial state: 'planned', 'started', 'paused', 'backlog'" },
            targetDate: { type: "string", description: "Target completion date (YYYY-MM-DD)" },
          },
          required: ["name", "teamKeys"],
        },
      },
      {
        name: "linear_update_project",
        description: "Update an existing project",
        inputSchema: {
          type: "object",
          properties: {
            projectName: { type: "string", description: "Current project name to find it" },
            name: { type: "string", description: "New project name" },
            description: { type: "string", description: "New description" },
            state: { type: "string", description: "New state: 'planned', 'started', 'paused', 'completed', 'canceled', 'backlog'" },
            targetDate: { type: "string", description: "New target date (YYYY-MM-DD)" },
          },
          required: ["projectName"],
        },
      },
      {
        name: "linear_delete_project",
        description: "Delete a project",
        inputSchema: {
          type: "object",
          properties: {
            projectName: { type: "string", description: "Project name to delete" },
          },
          required: ["projectName"],
        },
      },

      // === CYCLES ===
      {
        name: "linear_list_cycles",
        description: "List cycles (sprints) for a team",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Team key (required)" },
            limit: { type: "number", description: "Maximum number of cycles (default: 10)" },
          },
          required: ["teamKey"],
        },
      },
      {
        name: "linear_get_active_cycle",
        description: "Get the currently active cycle for a team",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Team key (required)" },
          },
          required: ["teamKey"],
        },
      },
      {
        name: "linear_create_cycle",
        description: "Create a new cycle (sprint)",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Team key" },
            name: { type: "string", description: "Cycle name" },
            startsAt: { type: "string", description: "Start date (YYYY-MM-DD)" },
            endsAt: { type: "string", description: "End date (YYYY-MM-DD)" },
          },
          required: ["teamKey", "startsAt", "endsAt"],
        },
      },
      {
        name: "linear_add_issue_to_cycle",
        description: "Add an issue to a cycle",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "Issue identifier" },
            cycleNumber: { type: "number", description: "Cycle number" },
            teamKey: { type: "string", description: "Team key" },
          },
          required: ["issueId", "cycleNumber", "teamKey"],
        },
      },

      // === LABELS ===
      {
        name: "linear_list_labels",
        description: "List all labels in the workspace or for a team",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Filter by team key" },
          },
        },
      },
      {
        name: "linear_create_label",
        description: "Create a new label",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Label name" },
            color: { type: "string", description: "Hex color code (e.g., '#ff0000')" },
            teamKey: { type: "string", description: "Team key (for team-specific label)" },
          },
          required: ["name"],
        },
      },
      {
        name: "linear_add_label_to_issue",
        description: "Add a label to an issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "Issue identifier" },
            labelName: { type: "string", description: "Label name to add" },
          },
          required: ["issueId", "labelName"],
        },
      },
      {
        name: "linear_remove_label_from_issue",
        description: "Remove a label from an issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "Issue identifier" },
            labelName: { type: "string", description: "Label name to remove" },
          },
          required: ["issueId", "labelName"],
        },
      },

      // === TEAMS & USERS ===
      {
        name: "linear_list_teams",
        description: "List all teams in the Linear workspace",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "linear_list_users",
        description: "List all users in the workspace",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "linear_get_user",
        description: "Get information about a user",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string", description: "User email" },
          },
          required: ["email"],
        },
      },

      // === WORKFLOW STATES ===
      {
        name: "linear_list_workflow_states",
        description: "List workflow states (statuses) for a team",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Team key (required)" },
          },
          required: ["teamKey"],
        },
      },

      // === ISSUE RELATIONS ===
      {
        name: "linear_create_issue_relation",
        description: "Create a relation between two issues (blocks, is blocked by, relates to, duplicates)",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "First issue identifier" },
            relatedIssueId: { type: "string", description: "Second issue identifier" },
            type: { type: "string", description: "Relation type: 'blocks', 'duplicate', 'related'" },
          },
          required: ["issueId", "relatedIssueId", "type"],
        },
      },

      // === ROADMAPS ===
      {
        name: "linear_list_roadmaps",
        description: "List roadmaps in the workspace",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },

      // === ATTACHMENTS ===
      {
        name: "linear_add_attachment",
        description: "Add a URL attachment to an issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "Issue identifier" },
            url: { type: "string", description: "URL to attach" },
            title: { type: "string", description: "Attachment title" },
          },
          required: ["issueId", "url"],
        },
      },
    ],
  };
});

// Helper functions
async function getTeamByKey(teamKey) {
  const teams = await linearClient.teams();
  return teams.nodes.find((t) => t.key.toLowerCase() === teamKey.toLowerCase());
}

async function getUserByEmail(email) {
  const users = await linearClient.users();
  return users.nodes.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

async function getWorkflowStateByName(teamId, statusName) {
  const team = await linearClient.team(teamId);
  const states = await team.states();
  return states.nodes.find(
    (s) => s.name.toLowerCase() === statusName.toLowerCase()
  );
}

async function getProjectByName(projectName) {
  const projects = await linearClient.projects();
  return projects.nodes.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );
}

async function getLabelByName(labelName, teamId = null) {
  const labels = await linearClient.issueLabels();
  return labels.nodes.find((l) => {
    const nameMatch = l.name.toLowerCase() === labelName.toLowerCase();
    if (teamId) {
      return nameMatch && l._team?.id === teamId;
    }
    return nameMatch;
  });
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
      // === ISSUES ===
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

        if (args.projectName) {
          const project = await getProjectByName(args.projectName);
          if (project) filter.project = { id: { eq: project.id } };
        }

        if (args.labelName) {
          filter.labels = { name: { eqIgnoreCase: args.labelName } };
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
          content: [{ type: "text", text: JSON.stringify(formattedIssues, null, 2) }],
        };
      }

      case "linear_get_issue": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        const [state, assignee, team, comments, labels, project] = await Promise.all([
          issue.state,
          issue.assignee,
          issue.team,
          issue.comments(),
          issue.labels(),
          issue.project,
        ]);

        const formatted = formatIssue(issue, state, assignee, team);
        formatted.labels = labels.nodes.map((l) => l.name);
        formatted.project = project?.name;
        formatted.estimate = issue.estimate;
        formatted.comments = comments.nodes.map((c) => ({
          body: c.body,
          createdAt: c.createdAt,
        }));

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      case "linear_create_issue": {
        const team = await getTeamByKey(args.teamKey);
        if (!team) {
          return { content: [{ type: "text", text: `Team ${args.teamKey} not found` }] };
        }

        const issueInput = {
          teamId: team.id,
          title: args.title,
          description: args.description,
          priority: args.priority,
          estimate: args.estimate,
        };

        if (args.assigneeEmail) {
          const user = await getUserByEmail(args.assigneeEmail);
          if (user) issueInput.assigneeId = user.id;
        }

        if (args.projectName) {
          const project = await getProjectByName(args.projectName);
          if (project) issueInput.projectId = project.id;
        }

        if (args.labelNames && args.labelNames.length > 0) {
          const labelIds = [];
          for (const labelName of args.labelNames) {
            const label = await getLabelByName(labelName);
            if (label) labelIds.push(label.id);
          }
          if (labelIds.length > 0) issueInput.labelIds = labelIds;
        }

        const result = await linearClient.createIssue(issueInput);
        const issue = await result.issue;

        return {
          content: [{ type: "text", text: `Created issue ${issue.identifier}: ${issue.title}\nURL: ${issue.url}` }],
        };
      }

      case "linear_update_issue": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        const updateInput = {};

        if (args.title) updateInput.title = args.title;
        if (args.description) updateInput.description = args.description;
        if (args.priority !== undefined) updateInput.priority = args.priority;
        if (args.estimate !== undefined) updateInput.estimate = args.estimate;

        if (args.status) {
          const team = await issue.team;
          const state = await getWorkflowStateByName(team.id, args.status);
          if (state) updateInput.stateId = state.id;
        }

        if (args.assigneeEmail) {
          const user = await getUserByEmail(args.assigneeEmail);
          if (user) updateInput.assigneeId = user.id;
        }

        if (args.projectName) {
          const project = await getProjectByName(args.projectName);
          if (project) updateInput.projectId = project.id;
        }

        await linearClient.updateIssue(issue.id, updateInput);

        return { content: [{ type: "text", text: `Updated issue ${args.issueId}` }] };
      }

      case "linear_delete_issue": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        await linearClient.deleteIssue(issue.id);

        return { content: [{ type: "text", text: `Deleted issue ${args.issueId}` }] };
      }

      case "linear_add_comment": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        await linearClient.createComment({
          issueId: issue.id,
          body: args.body,
        });

        return { content: [{ type: "text", text: `Added comment to ${args.issueId}` }] };
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

        return { content: [{ type: "text", text: JSON.stringify(formattedIssues, null, 2) }] };
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

        return { content: [{ type: "text", text: JSON.stringify(formattedIssues, null, 2) }] };
      }

      // === PROJECTS ===
      case "linear_list_projects": {
        let filter = {};

        if (args.teamKey) {
          const team = await getTeamByKey(args.teamKey);
          if (team) {
            filter.accessibleTeams = { some: { id: { eq: team.id } } };
          }
        }

        if (args.state) {
          filter.state = { eq: args.state };
        }

        const projects = await linearClient.projects({ filter });
        const formatted = await Promise.all(
          projects.nodes.map(async (p) => {
            const teams = await p.teams();
            const issues = await p.issues();
            return {
              id: p.id,
              name: p.name,
              description: p.description,
              state: p.state,
              progress: Math.round(p.progress * 100) + "%",
              teams: teams.nodes.map((t) => t.key),
              issueCount: issues.nodes.length,
              targetDate: p.targetDate,
              url: p.url,
            };
          })
        );

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      case "linear_get_project": {
        const project = await getProjectByName(args.projectName);
        if (!project) {
          return { content: [{ type: "text", text: `Project "${args.projectName}" not found` }] };
        }

        const [teams, issues, lead] = await Promise.all([
          project.teams(),
          project.issues(),
          project.lead,
        ]);

        const issuesByStatus = {};
        for (const issue of issues.nodes) {
          const state = await issue.state;
          const status = state?.name || "Unknown";
          issuesByStatus[status] = (issuesByStatus[status] || 0) + 1;
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              name: project.name,
              description: project.description,
              state: project.state,
              progress: Math.round(project.progress * 100) + "%",
              teams: teams.nodes.map((t) => t.key),
              lead: lead?.name,
              targetDate: project.targetDate,
              startDate: project.startDate,
              issueCount: issues.nodes.length,
              issuesByStatus,
              url: project.url,
            }, null, 2),
          }],
        };
      }

      case "linear_create_project": {
        const teamIds = [];
        for (const teamKey of args.teamKeys) {
          const team = await getTeamByKey(teamKey);
          if (team) teamIds.push(team.id);
        }

        if (teamIds.length === 0) {
          return { content: [{ type: "text", text: "No valid teams found" }] };
        }

        const projectInput = {
          name: args.name,
          description: args.description,
          teamIds,
          state: args.state || "planned",
        };

        if (args.targetDate) {
          projectInput.targetDate = args.targetDate;
        }

        const result = await linearClient.createProject(projectInput);
        const project = await result.project;

        return {
          content: [{ type: "text", text: `Created project "${project.name}"\nURL: ${project.url}` }],
        };
      }

      case "linear_update_project": {
        const project = await getProjectByName(args.projectName);
        if (!project) {
          return { content: [{ type: "text", text: `Project "${args.projectName}" not found` }] };
        }

        const updateInput = {};
        if (args.name) updateInput.name = args.name;
        if (args.description) updateInput.description = args.description;
        if (args.state) updateInput.state = args.state;
        if (args.targetDate) updateInput.targetDate = args.targetDate;

        await linearClient.updateProject(project.id, updateInput);

        return { content: [{ type: "text", text: `Updated project "${args.projectName}"` }] };
      }

      case "linear_delete_project": {
        const project = await getProjectByName(args.projectName);
        if (!project) {
          return { content: [{ type: "text", text: `Project "${args.projectName}" not found` }] };
        }

        await linearClient.deleteProject(project.id);

        return { content: [{ type: "text", text: `Deleted project "${args.projectName}"` }] };
      }

      // === CYCLES ===
      case "linear_list_cycles": {
        const team = await getTeamByKey(args.teamKey);
        if (!team) {
          return { content: [{ type: "text", text: `Team ${args.teamKey} not found` }] };
        }

        const cycles = await team.cycles({ first: args.limit || 10 });
        const formatted = cycles.nodes.map((c) => ({
          number: c.number,
          name: c.name,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          progress: Math.round(c.progress * 100) + "%",
          issueCountScope: c.issueCountScope,
          completedIssueCountScope: c.completedIssueCountScope,
        }));

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      case "linear_get_active_cycle": {
        const team = await getTeamByKey(args.teamKey);
        if (!team) {
          return { content: [{ type: "text", text: `Team ${args.teamKey} not found` }] };
        }

        const cycle = await team.activeCycle;
        if (!cycle) {
          return { content: [{ type: "text", text: `No active cycle for team ${args.teamKey}` }] };
        }

        const issues = await cycle.issues();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              number: cycle.number,
              name: cycle.name,
              startsAt: cycle.startsAt,
              endsAt: cycle.endsAt,
              progress: Math.round(cycle.progress * 100) + "%",
              issueCount: issues.nodes.length,
            }, null, 2),
          }],
        };
      }

      case "linear_create_cycle": {
        const team = await getTeamByKey(args.teamKey);
        if (!team) {
          return { content: [{ type: "text", text: `Team ${args.teamKey} not found` }] };
        }

        const result = await linearClient.createCycle({
          teamId: team.id,
          name: args.name,
          startsAt: new Date(args.startsAt),
          endsAt: new Date(args.endsAt),
        });

        const cycle = await result.cycle;

        return { content: [{ type: "text", text: `Created cycle #${cycle.number}` }] };
      }

      case "linear_add_issue_to_cycle": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        const team = await getTeamByKey(args.teamKey);
        if (!team) {
          return { content: [{ type: "text", text: `Team ${args.teamKey} not found` }] };
        }

        const cycles = await team.cycles();
        const cycle = cycles.nodes.find((c) => c.number === args.cycleNumber);
        if (!cycle) {
          return { content: [{ type: "text", text: `Cycle #${args.cycleNumber} not found` }] };
        }

        await linearClient.updateIssue(issue.id, { cycleId: cycle.id });

        return { content: [{ type: "text", text: `Added ${args.issueId} to cycle #${args.cycleNumber}` }] };
      }

      // === LABELS ===
      case "linear_list_labels": {
        let filter = {};
        if (args.teamKey) {
          const team = await getTeamByKey(args.teamKey);
          if (team) filter.team = { id: { eq: team.id } };
        }

        const labels = await linearClient.issueLabels({ filter });
        const formatted = labels.nodes.map((l) => ({
          name: l.name,
          color: l.color,
          description: l.description,
        }));

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      case "linear_create_label": {
        const labelInput = {
          name: args.name,
          color: args.color,
        };

        if (args.teamKey) {
          const team = await getTeamByKey(args.teamKey);
          if (team) labelInput.teamId = team.id;
        }

        const result = await linearClient.createIssueLabel(labelInput);
        const label = await result.issueLabel;

        return { content: [{ type: "text", text: `Created label "${label.name}"` }] };
      }

      case "linear_add_label_to_issue": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        const label = await getLabelByName(args.labelName);
        if (!label) {
          return { content: [{ type: "text", text: `Label "${args.labelName}" not found` }] };
        }

        const currentLabels = await issue.labels();
        const labelIds = currentLabels.nodes.map((l) => l.id);
        labelIds.push(label.id);

        await linearClient.updateIssue(issue.id, { labelIds });

        return { content: [{ type: "text", text: `Added label "${args.labelName}" to ${args.issueId}` }] };
      }

      case "linear_remove_label_from_issue": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        const label = await getLabelByName(args.labelName);
        if (!label) {
          return { content: [{ type: "text", text: `Label "${args.labelName}" not found` }] };
        }

        const currentLabels = await issue.labels();
        const labelIds = currentLabels.nodes.filter((l) => l.id !== label.id).map((l) => l.id);

        await linearClient.updateIssue(issue.id, { labelIds });

        return { content: [{ type: "text", text: `Removed label "${args.labelName}" from ${args.issueId}` }] };
      }

      // === TEAMS & USERS ===
      case "linear_list_teams": {
        const teams = await linearClient.teams();
        const formatted = await Promise.all(
          teams.nodes.map(async (t) => {
            const members = await t.members();
            return {
              key: t.key,
              name: t.name,
              description: t.description,
              memberCount: members.nodes.length,
            };
          })
        );

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      case "linear_list_users": {
        const users = await linearClient.users();
        const formatted = users.nodes.map((u) => ({
          name: u.name,
          email: u.email,
          displayName: u.displayName,
          active: u.active,
          admin: u.admin,
        }));

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      case "linear_get_user": {
        const user = await getUserByEmail(args.email);
        if (!user) {
          return { content: [{ type: "text", text: `User with email ${args.email} not found` }] };
        }

        const assignedIssues = await user.assignedIssues({ first: 5 });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              name: user.name,
              email: user.email,
              displayName: user.displayName,
              active: user.active,
              admin: user.admin,
              recentIssues: assignedIssues.nodes.map((i) => i.identifier),
            }, null, 2),
          }],
        };
      }

      // === WORKFLOW STATES ===
      case "linear_list_workflow_states": {
        const team = await getTeamByKey(args.teamKey);
        if (!team) {
          return { content: [{ type: "text", text: `Team ${args.teamKey} not found` }] };
        }

        const states = await team.states();
        const formatted = states.nodes.map((s) => ({
          name: s.name,
          type: s.type,
          color: s.color,
          position: s.position,
        }));

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      // === ISSUE RELATIONS ===
      case "linear_create_issue_relation": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        const relatedIssue = await linearClient.issue(args.relatedIssueId);
        if (!relatedIssue) {
          return { content: [{ type: "text", text: `Issue ${args.relatedIssueId} not found` }] };
        }

        await linearClient.createIssueRelation({
          issueId: issue.id,
          relatedIssueId: relatedIssue.id,
          type: args.type,
        });

        return {
          content: [{ type: "text", text: `Created ${args.type} relation: ${args.issueId} -> ${args.relatedIssueId}` }],
        };
      }

      // === ROADMAPS ===
      case "linear_list_roadmaps": {
        const roadmaps = await linearClient.roadmaps();
        const formatted = roadmaps.nodes.map((r) => ({
          name: r.name,
          description: r.description,
          slug: r.slugId,
        }));

        return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
      }

      // === ATTACHMENTS ===
      case "linear_add_attachment": {
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          return { content: [{ type: "text", text: `Issue ${args.issueId} not found` }] };
        }

        await linearClient.createAttachment({
          issueId: issue.id,
          url: args.url,
          title: args.title || args.url,
        });

        return { content: [{ type: "text", text: `Added attachment to ${args.issueId}` }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linear MCP Server v2.0 running on stdio");
}

main().catch(console.error);
