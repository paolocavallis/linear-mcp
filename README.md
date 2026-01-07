# Linear MCP Server

Adds Linear tools to Claude Code for AI-powered issue management.

## Setup

```bash
# Clone and install
git clone <this-repo>
cd linear-mcp
npm install

# Get your Linear API key from:
# Linear > Settings > Account > API > Create key

# Add to Claude Code
claude mcp add linear-mcp \
  --scope user \
  -e LINEAR_API_KEY="your-api-key" \
  -- node $(pwd)/index.js

# Restart Claude Code
```

## Usage

Once installed, ask Claude Code things like:

- "List my Linear teams"
- "Show issues in ENG"
- "Create a bug in PROD: Login timeout issue"
- "Update ENG-123 to Done"
- "Add a comment to PROD-456: Fixed in v2.1"
- "Search for authentication issues"

## Available Tools

| Tool | Description |
|------|-------------|
| `linear_list_issues` | List issues with filters (team, status, assignee) |
| `linear_get_issue` | Get issue details by ID |
| `linear_create_issue` | Create new issues |
| `linear_update_issue` | Update status, priority, assignee |
| `linear_add_comment` | Add comments to issues |
| `linear_search_issues` | Search issues by text |
| `linear_list_teams` | List all teams |
| `linear_list_projects` | List projects |
| `linear_get_my_issues` | Get your assigned issues |
