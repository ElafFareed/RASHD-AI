// lib/llmClient.js

export async function callClaude({
  fallback = "Rashd is using its local financial intelligence engine.",
}) {
  return {
    text: fallback,
    usedFallback: true,
  };
}