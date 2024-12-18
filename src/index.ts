#!/usr/bin/env node

/**
 * Sundry implementation of the MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

/**
 * Input and output types for Sundry
 */
type ContextQuery = {
  query: string;
}

type ContextResponse = {
   confidence: string, 
   data: string, 
   user_message?: string, 
   error?: string 
}

type SourcesResponse = {
  sources: {
    [key: string]: string[]
  }
};

/**
 * Assure we have the SUNDRY_USER_API_KEY
 * and SUNDRY_APPLICATION_API_KEY
 */
const SUNDRY_USER_API_KEY = process.env.SUNDRY_USER_API_KEY;
if (!SUNDRY_USER_API_KEY) {
  throw new Error("SUNDRY_USER_API_KEY environment variable is required");
}
const SUNDRY_APPLICATION_API_KEY = process.env.SUNDRY_APPLICATION_API_KEY;
if (!SUNDRY_APPLICATION_API_KEY) {
  throw new Error("SUNDRY_APPLICATION_API_KEY environment variable is required");
}

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new Server(
  {
    name: "Sundry",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Construct our axios instance for accessing Sundry
 */
const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:3002/v1",
  headers: {
    'Authorization': `Bearer ${SUNDRY_USER_API_KEY}`,
    'X-API-Key': SUNDRY_APPLICATION_API_KEY
  }
});

const getSources = async (): Promise<SourcesResponse> => {
  try {
    const response = await axiosInstance.get<SourcesResponse>('/sources');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch sources: ${error.message}`);
    }
    throw new Error(`An unexpected error occurred: ${error}`);
  }
};

const getContext = async (body: ContextQuery): Promise<ContextResponse> => {
  try {
    const response = await axiosInstance.post<ContextResponse>('/context', body);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch context: ${error.message}`);
    }
    throw new Error(`An unexpected error occurred: ${error}`);
  }
};

/**
 * Handler that lists available tools.
 * Exposes a single "get_context" tool that lets clients query for user related context
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Get the user's available sources so the model know what it has access to
  const sources = await getSources();

  return {
    tools: [
      {
        name: "get_context",
        description: `Query information about the user's: ${JSON.stringify(sources.sources)}

IMPORTANT: ALWAYS phrase queries AS IF YOU ARE THE USER asking about their own data
IMPORTANT: ALWAYS communicate assumptions from the user_message to the user in a natural way

✓ Use natural language queries like:
- "my most recent github issue"
- "any github issues assigned to me"
- "find discussions about the auth bug"
- "who commented on my latest PR"

❌ Avoid technical queries like:
- "query=issues.latest"
- "GET /issues?state=open"

Returns:
- data matching your query
- confidence level (certain/optimistic/tentative/doubtful)
- user_message with important context assumptions

Key requirements:
- Phrase queries from the user's perspective ("my", "I", "me")
- Always communicate the user_message to explain how the query was interpreted
- Low confidence + assumptions means more specific queries needed
- Use conversational language and mirror user's intent
- If errors occur, suggest alternatives`,
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The user context related query to search for in plain text",
            }
          },
          required: ["query"],
          additionalProperties: false,
        }
      }
    ]
  };
});

/**
 * Handler for the get_context tool.
 * Creates a new note with the provided title and content, and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_context": {
      const query = String(request.params.arguments?.query);
      if (!query) {
        throw new Error("query is required");
      }

      const result = await getContext({ query });

      return {
        content: [{
            type: "text",
            text: JSON.stringify(result)
        }]
      }
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((_error) => {
  process.exit(1);
});
