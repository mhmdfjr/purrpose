// Abstraction for AI suggestion — provider behind interface (ARCHITECTURE.md 4.4)
// Implementation will be added in M5; for M0 this is a placeholder.

export async function generateAiSuggestion(summary: string): Promise<string | null> {
  void summary;
  // TODO: implement LLM call with timeout + fallback to rule-based
  return null;
}
