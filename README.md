# Sundry MCP Server

The official Sundry MCP server

## Features

### Tools
- `get_context` - Query context for the user
  - Takes a natural language query
  - Returns context

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sundry": {
      "command": "node",
      "args": [
        "/path/to/sundry/build/index.js"
      ],
      "env": {
        "SUNDRY_USER_API_KEY": "YOUR SUNDRY USER API KEY",
        "SUNDRY_APPLICATION_API_KEY": "YOUR SUNDRY APPLICATION API KEY"
      }
    }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
