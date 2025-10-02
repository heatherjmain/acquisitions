import OpenAI from "openai";
import { getOpenAIClient, runLLM } from "./client";
import * as llmClient from "./client";

jest.mock("openai");

describe("llm client", () => {
  const OLD_ENV = process.env;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  let mockOpenAI: { responses: { create: jest.Mock<any, any, any> } };
  let getOpenAiClientSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    mockOpenAI = {
      responses: {
        create: jest.fn().mockResolvedValue({
          output_text: '```json\n{"graphql":"query{}"}\n```',
        }),
      },
    };

    getOpenAiClientSpy = jest.spyOn(llmClient, "getOpenAIClient");
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("getOpenAIClient", () => {
    it("returns an OpenAI client if OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "test-key";

      const client = getOpenAIClient();

      expect(OpenAI).toHaveBeenCalledTimes(1);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: "test-key" });
      expect(client).toBeInstanceOf(OpenAI);
    });

    it("throws an error if OPENAI_API_KEY is missing", () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => getOpenAIClient()).toThrow("Missing OPENAI_API_KEY");
      expect(OpenAI).not.toHaveBeenCalled();
    });
  });

  describe("runLLM", () => {
    it("should call openai once", async () => {
      getOpenAiClientSpy.mockReturnValueOnce(mockOpenAI as any);

      await runLLM("show acquisitions", "SYSTEM");

      expect(getOpenAiClientSpy).toHaveBeenCalledTimes(1);
      expect(getOpenAiClientSpy).toHaveBeenCalledWith();
    });

    it("returns cleaned output text", async () => {
      getOpenAiClientSpy.mockReturnValueOnce(mockOpenAI as any);

      const result = await runLLM("show acquisitions", "SYSTEM");

      expect(result).toBe('{"graphql":"query{}"}');
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "🐛 LLM raw response: ",
        '```json\n{"graphql":"query{}"}\n```',
      );
    });

    it("throws if no output_text", async () => {
      const mockOpenAIWithNoOutputText = {
        responses: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      getOpenAiClientSpy.mockReturnValueOnce(mockOpenAIWithNoOutputText as any);

      await expect(runLLM("prompt", "SYSTEM")).rejects.toThrow(
        "LLM returned empty response",
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith("⚠️ No response from LLM");
    });

    it("handles output without code which is already valid json", async () => {
      // response already plain JSON string
      const mockOpenAIWithJSONOutputText = {
        responses: {
          create: jest.fn().mockResolvedValue({
            output_text: '{"graphql":"query{}"}',
          } as any),
        },
      };
      getOpenAiClientSpy.mockReturnValueOnce(
        mockOpenAIWithJSONOutputText as any,
      );

      const result = await runLLM("prompt", "SYSTEM");
      expect(result).toBe('{"graphql":"query{}"}');
    });

    it("throws if OPENAI_API_KEY is missing", async () => {
      await expect(runLLM("prompt", "SYSTEM")).rejects.toThrow(
        "Missing OPENAI_API_KEY",
      );
    });
  });
});
