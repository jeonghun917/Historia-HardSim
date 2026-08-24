import { describe, expect, it } from "vitest";
import { OpenAiCompatibleLocalClient } from "../src/sim/ai/openAiCompatibleClient";

describe("OpenAiCompatibleLocalClient", () => {
  it("parses structured JSON from an OpenAI-compatible response", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"action":{"actor":"A","kind":"industrial_expansion","requestedScale":1}}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const client = new OpenAiCompatibleLocalClient({
      endpoint: "http://127.0.0.1:8080/v1",
      model: "local-model",
      fetchImpl: fakeFetch,
    });

    const result = await client.structured<{ action: { actor: string } }>({
      system: "compile",
      user: "expand",
      schemaName: "Intent",
    });

    expect(result.action.actor).toBe("A");
    expect(calls[0].url).toBe("http://127.0.0.1:8080/v1/chat/completions");
  });

  it("fails closed on invalid structured JSON", async () => {
    const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({
      choices: [{ message: { content: "not-json" } }],
    }), { status: 200, headers: { "content-type": "application/json" } });

    const client = new OpenAiCompatibleLocalClient({
      endpoint: "http://localhost:11434/v1",
      model: "local-model",
      fetchImpl: fakeFetch,
    });

    await expect(client.structured({ system: "s", user: "u", schemaName: "Intent" }))
      .rejects.toThrow(/invalid JSON/i);
  });
});
