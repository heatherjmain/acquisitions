import "dotenv/config";
import express from "express";
import { expressMiddleware } from "@as-integrations/express5";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./graphql/schema";
import { initDb } from "./db/db";
import { resolvers } from "./graphql/resolvers";
import { handler as llmHandler } from "./llm/llm-lambda";
import {
  APIGatewayEventRequestContext,
  APIGatewayProxyEvent,
} from "aws-lambda";

(async () => {
  await initDb();
  console.log("ℹ️ DB initialized, starting server");

  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use("/v1/acquisitions", bodyParser.json(), expressMiddleware(server));

  app.post("/v1/llm/acquisitions", bodyParser.json(), async (req, res) => {
    const requestContext: Partial<APIGatewayEventRequestContext> = {
      httpMethod: "POST",
      path: "/v1/llm/acquisitions",
    };

    const lambdaEvent: APIGatewayProxyEvent = {
      body: JSON.stringify(req.body),
      headers: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      path: "/v1/llm/acquisitions",
      pathParameters: null,
      queryStringParameters: null,
      requestContext: requestContext as APIGatewayEventRequestContext,
      resource: "",
      stageVariables: null,
    };

    const lambdaResponse = await llmHandler(lambdaEvent);

    res
      .status(lambdaResponse.statusCode || 200)
      .json(JSON.parse(lambdaResponse.body || "{}"));
  });

  const port = 4000;

  app.listen(port, () => {
    console.log(
      `🚀 Local GraphQL ready at http://localhost:${port}/v1/acquisitions`,
    );
    console.log(
      `🤖 Local LLM ready at http://localhost:${port}/v1/llm/acquisitions`,
    );
  });
})();
