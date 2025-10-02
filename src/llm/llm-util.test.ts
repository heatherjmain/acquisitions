import { parseLLMOutput } from "./llm-util";

describe("parseLLMOutput", () => {
  it("should correctly parse valid LLM JSON output", () => {
    const raw = JSON.stringify({
      graphql: "query { acquisitions { id } }",
      variables: { limit: 10, offset: 0 },
    });

    const result = parseLLMOutput(raw);

    expect(result).toEqual({
      graphql: "query { acquisitions { id } }",
      variables: { limit: 10, offset: 0 },
    });
  });

  it("should throw if JSON is invalid", () => {
    const raw = "not a JSON string";

    expect(() => parseLLMOutput(raw)).toThrow("LLM did not return valid JSON");
  });

  it("should throw if parsed JSON is missing graphql or variables", () => {
    const rawMissingGraphql = JSON.stringify({ variables: {} });
    const rawMissingVariables = JSON.stringify({ graphql: "query{}" });

    expect(() => parseLLMOutput(rawMissingGraphql)).toThrow(
      "LLM did not return valid JSON",
    );

    expect(() => parseLLMOutput(rawMissingVariables)).toThrow(
      "LLM did not return valid JSON",
    );
  });
});
