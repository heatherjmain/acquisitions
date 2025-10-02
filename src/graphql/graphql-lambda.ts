import { ApolloServer } from "@apollo/server";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import type { APIGatewayProxyHandler } from "aws-lambda";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

export const handler: APIGatewayProxyHandler =
  startServerAndCreateLambdaHandler(
    server,
    handlers.createAPIGatewayProxyEventRequestHandler(),
  );
