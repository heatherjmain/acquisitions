/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from "./graphql-lambda";

describe("GraphQL Lambda handler", () => {
  it("should return a 200 response", async () => {
    const event = {
      httpMethod: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "query { __typename }",
      }),
    };

    const res = await handler(event as any, {} as any, () => {});

    expect((res as any).statusCode).toBe(200);
    expect((res as any).body).toContain("__typename");
  });
});
