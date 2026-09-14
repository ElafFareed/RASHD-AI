// scenarios/runScenarios.js
// Run different test scenarios directly against the logic layer, no server needed:
//   node scenarios/runScenarios.js
//
// Works with or without ANTHROPIC_API_KEY set (falls back to a templated response, see lib/llmClient.js).

require("dotenv").config();
const { userProfile, transactions } = require("../lib/mockData");
const {
  detectEmotionalSpending,
  evaluatePurchase,
  generateSavingsSuggestions,
  computeDashboardIndicators,
} = require("../lib/behaviorAnalysis");
const {
  buildEmotionalSpendingPrompt,
  buildPurchaseEvaluationPrompt,
  buildAssistantSystemPrompt,
} = require("../lib/prompts");
const { callClaude } = require("../lib/llmClient");

function section(title) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

async function scenario1_normalMonth() {
  section("Scenario 1: Dashboard overview (normal + flagged spending mix)");
  const dashboard = computeDashboardIndicators(userProfile, transactions);
  console.log(JSON.stringify(dashboard, null, 2));
}

async function scenario2_emotionalSpendingSpike() {
  section("Scenario 2: Emotional spending detection on the built-in late-night cluster");
  const result = detectEmotionalSpending(transactions);
  console.log(`Flagged ${result.flaggedCount} transactions, total ${result.flaggedTotal} SAR ` +
    `(${result.pctOfTotalSpend}% of spend)`);
  result.flaggedTransactions.forEach((t) =>
    console.log(`  - ${t.date} | ${t.category} | ${t.amount} SAR | reasons: ${t.reasons.join(", ")}`)
  );

  const { system, user } = buildEmotionalSpendingPrompt(result, userProfile);
  const llm = await callClaude({ system, user });
  console.log("\nLLM recommendation:\n" + llm.text);
}

async function scenario3_purchaseEvaluation_affordable() {
  section("Scenario 3: Purchase evaluation — small affordable purchase");
  const evaluation = evaluatePurchase(userProfile, transactions, 150, "food");
  console.log(evaluation);
  const { system, user } = buildPurchaseEvaluationPrompt(evaluation, userProfile);
  const llm = await callClaude({ system, user, maxTokens: 200 });
  console.log("\nLLM explanation:\n" + llm.text);
}

async function scenario4_purchaseEvaluation_risky() {
  section("Scenario 4: Purchase evaluation — large risky purchase");
  const evaluation = evaluatePurchase(userProfile, transactions, 3000, "shopping");
  console.log(evaluation);
  const { system, user } = buildPurchaseEvaluationPrompt(evaluation, userProfile);
  const llm = await callClaude({ system, user, maxTokens: 200 });
  console.log("\nLLM explanation:\n" + llm.text);
}

async function scenario5_savingsGoals() {
  section("Scenario 5: Savings goal suggestions");
  const suggestions = generateSavingsSuggestions(userProfile);
  console.log(JSON.stringify(suggestions, null, 2));
}

async function scenario6_assistantChat() {
  section("Scenario 6: Assistant chat — sample question");
  const dashboard = computeDashboardIndicators(userProfile, transactions);
  const system = buildAssistantSystemPrompt(userProfile, dashboard);
  const question = "هل أستطيع شراء لابتوب جديد بسعر 4000 ريال هذا الشهر؟";
  const llm = await callClaude({ system, user: question, maxTokens: 250 });
  console.log(`User: ${question}`);
  console.log("\nAssistant reply:\n" + llm.text);
}

async function main() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  console.log(`ANTHROPIC_API_KEY detected: ${hasKey ? "yes" : "no (running in offline fallback mode)"}`);

  await scenario1_normalMonth();
  await scenario2_emotionalSpendingSpike();
  await scenario3_purchaseEvaluation_affordable();
  await scenario4_purchaseEvaluation_risky();
  await scenario5_savingsGoals();
  await scenario6_assistantChat();

  console.log("\nDone. Edit lib/mockData.js to try your own scenarios,");
  console.log("or run individual scenarioN() functions by editing main().");
}

main().catch((err) => {
  console.error("Scenario run failed:", err);
  process.exit(1);
});
