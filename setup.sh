#!/bin/bash

# Linear MCP Server Setup Script
# This adds the Linear MCP server to your Claude Code configuration

echo "Setting up Linear MCP Server for Claude Code..."

# Check if LINEAR_API_KEY is set
if [ -z "$LINEAR_API_KEY" ]; then
    echo ""
    echo "ERROR: LINEAR_API_KEY environment variable is not set."
    echo ""
    echo "To get your Linear API key:"
    echo "1. Go to Linear Settings > Account > API"
    echo "2. Click 'Create key' under 'Personal API keys'"
    echo "3. Copy the key and run:"
    echo "   export LINEAR_API_KEY='your-key-here'"
    echo ""
    exit 1
fi

# Add to Claude Code MCP settings
claude mcp add linear-mcp \
    --scope user \
    -e LINEAR_API_KEY="$LINEAR_API_KEY" \
    -- node /Users/paolocavalli/linear-ai-integrations/mcp-server/index.js

echo ""
echo "Linear MCP Server added to Claude Code!"
echo ""
echo "Available tools:"
echo "  - linear_list_issues: List issues with filters"
echo "  - linear_get_issue: Get issue details"
echo "  - linear_create_issue: Create new issues"
echo "  - linear_update_issue: Update issues (status, assignee, etc)"
echo "  - linear_add_comment: Add comments to issues"
echo "  - linear_search_issues: Search issues by text"
echo "  - linear_list_teams: List all teams"
echo "  - linear_list_projects: List projects"
echo "  - linear_get_my_issues: Get your assigned issues"
echo ""
echo "Restart Claude Code to use the new tools!"
