import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { resolvers } from "../graphql/resolvers";
import { typeDefs } from "../graphql/schema";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { getPool } from "../db/db";
import { execute, parse } from "graphql";
import { SYSTEM_PROMPT } from "./prompts";
import { runLLM } from "./client";
import { parseLLMOutput } from "./llm-util";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const userPrompt = event.body ? JSON.parse(event.body).prompt : undefined;
  console.debug("🐛 userPrompt:", userPrompt);

  if (!userPrompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing prompt" }),
    };
  }

  // Use LLM to get graphQL query
  const llmResponse = await runLLM(userPrompt, SYSTEM_PROMPT);
  console.info("ℹ️ LLM response", llmResponse);

  // Parse LLM response
  const parsedLlmResponse = parseLLMOutput(llmResponse);
  console.info("ℹ️ Parsed LLM response", parsedLlmResponse);

  // Query GraphQL
  const dbClient = await getPool();
  const dbResponse = await execute({
    schema: makeExecutableSchema({ typeDefs, resolvers }),
    document: parse(parsedLlmResponse.graphql),
    variableValues: parsedLlmResponse.variables,
    contextValue: { dbClient },
  });
  console.debug("🐛 DB response", dbResponse.data);

  return {
    statusCode: 200,
    body: JSON.stringify({
      llmGeneratedQuery: {
        graphql: parsedLlmResponse.graphql,
        variables: parsedLlmResponse.variables,
      },
      response: dbResponse,
    }),
  };
};
