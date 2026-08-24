import type { LocalLlmPort, NarrationInput } from "./contracts";

export async function narrateComputedResult(
  llm: LocalLlmPort,
  input: NarrationInput,
): Promise<string> {
  return llm.text({
    system: [
      "Narrate the supplied Historia HardSim result.",
      "Treat the supplied diff as authoritative and final.",
      "Do not add new state changes, victories, losses, resources, territorial transfers or causal claims not present in the diff.",
      "If the result is partial or constrained, preserve that limitation explicitly.",
    ].join(" "),
    user: JSON.stringify(input),
  });
}
