/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.OPENAI_API_KEY = "testAPIkey";

import { handler } from "./llm-lambda";
import * as db from "../db/db";
import * as llmClient from "./client";
import * as llmUtil from "./llm-util";

jest.mock("graphql", () => {
  const actual = jest.requireActual("graphql");
  return {
    ...actual,
    execute: jest.fn(),
    parse: actual.parse,
  };
});
import { execute } from "graphql";

describe("handler", () => {
  const mockEvent = {
    body: JSON.stringify({ prompt: "Get acquisitions" }),
  } as any;
  let runLLMSpy: jest.SpyInstance;
  let parseLLMOutputSpy: jest.SpyInstance;
  let getPoolSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    runLLMSpy = jest
      .spyOn(llmClient, "runLLM")
      .mockResolvedValueOnce("FAKE LLM RESPONSE");

    parseLLMOutputSpy = jest
      .spyOn(llmUtil, "parseLLMOutput")
      .mockReturnValueOnce({
        graphql: "query { acquisitions { rows { id } } }",
        variables: { limit: 5 },
      });

    getPoolSpy = jest
      .spyOn(db, "getPool")
      .mockResolvedValueOnce("FAKE_DB_CLIENT" as any);

    (execute as jest.Mock).mockResolvedValueOnce({
      data: { acquisitions: { rows: [{ id: 123 }] } },
    });
  });

  it("should return 400 if prompt is missing", async () => {
    const res = await handler({ body: undefined } as any);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("Missing prompt");
    expect(runLLMSpy).not.toHaveBeenCalled();
  });

  it("should call runLLM once", async () => {
    await handler(mockEvent);

    expect(runLLMSpy).toHaveBeenCalledTimes(1);
    expect(runLLMSpy).toHaveBeenCalledWith(
      "Get acquisitions",
      expect.any(String), // SYSTEM_PROMPT
    );
  });

  it("should call parseLLMOutput once", async () => {
    await handler(mockEvent);

    expect(parseLLMOutputSpy).toHaveBeenCalledTimes(1);
    expect(parseLLMOutputSpy).toHaveBeenCalledWith("FAKE LLM RESPONSE");
  });

  it("should call getPool once", async () => {
    await handler(mockEvent);

    expect(getPoolSpy).toHaveBeenCalledTimes(1);
  });

  it("should call execute once", async () => {
    await handler(mockEvent);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        variableValues: { limit: 5 },
        contextValue: { dbClient: "FAKE_DB_CLIENT" },
      }),
    );
  });

  it("should return 200", async () => {
    const res = await handler(mockEvent);

    expect(res.statusCode).toBe(200);
  });

  it("should return graphql request info and acquisition data", async () => {
    const res = await handler(mockEvent);

    expect(JSON.parse(res.body).llmGeneratedQuery.graphql).toContain(
      "acquisitions",
    );
    expect(JSON.parse(res.body).response.data.acquisitions.rows[0].id).toBe(
      123,
    );
  });
});
