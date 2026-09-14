// lib/prompts.js
// Prompt-engineering layer: turns structured signals from behaviorAnalysis.js
// into the natural-language coaching Rashd AI shows the user.

/**
 * The prompt template you asked for — takes the emotional-spending detector's
 * output and asks the LLM to produce a short, non-judgmental, actionable
 * recommendation in the user's own language.
 */
function buildEmotionalSpendingPrompt(emotionalSpendingResult, profile) {
  const { flaggedTransactions, flaggedTotal, pctOfTotalSpend } = emotionalSpendingResult;

  const transactionLines = flaggedTransactions
    .map(
      (t) =>
        `- ${t.date} | ${t.category} | ${t.amount} SAR | ${t.merchant} | أسباب الرصد: ${t.reasons.join(", ")}`
    )
    .join("\n");

  const system = `أنت "رشد"، مساعد مالي ذكي داخل تطبيق يساعد المستخدمين على فهم سلوكهم المالي.
مهمتك تحليل عمليات شراء تم رصدها كإنفاق عاطفي/اندفاعي محتمل (بناءً على توقيت الشراء، وتكرار العمليات، وتجاوز المتوسط المعتاد للفئة) وتقديم ملاحظة قصيرة وودودة وغير حكمية للمستخدم.
القواعد:
- لا تكن انتقاديًا أو مخجلاً للمستخدم أبدًا.
- كن محددًا: اذكر الفئة والمبلغ التقريبي والنمط الذي لوحظ.
- قدّم اقتراحًا عمليًا واحدًا أو اثنين قابلين للتنفيذ فورًا.
- أجب بالعربية الفصحى المبسطة، بحد أقصى 4-5 جمل.
- لا تخترع أرقامًا غير موجودة في البيانات المُعطاة.`;

  const user = `بيانات المستخدم:
- الدخل الشهري: ${profile.monthlyIncome} ريال
- الميزانية الشهرية: ${profile.monthlyBudget.total} ريال

العمليات المرصودة كإنفاق عاطفي محتمل (الإجمالي: ${flaggedTotal} ريال، ما يعادل ${pctOfTotalSpend}% من إجمالي الإنفاق):
${transactionLines || "لا توجد عمليات مرصودة."}

اكتب ملاحظة قصيرة للمستخدم حول هذا النمط مع اقتراح عملي.`;

  return { system, user };
}

/** System prompt for the general chat "financial assistant" feature (slide 7). */
function buildAssistantSystemPrompt(profile, dashboard) {
  return `أنت "رشد"، المساعد المالي الذكي داخل تطبيق رشد AI.
لديك حق الوصول إلى بيانات المستخدم المالية التالية فقط (لا تفترض أي بيانات أخرى):
- الرصيد الحالي: ${dashboard.balance} ريال
- الدخل الشهري: ${dashboard.monthlyIncome} ريال
- إجمالي الإنفاق هذا الشهر: ${dashboard.totalSpend} ريال (${dashboard.budgetUsedPct}% من الميزانية)
- تجاوزات الميزانية: ${JSON.stringify(dashboard.budgetBreach)}
- إنفاق عاطفي مرصود: ${dashboard.emotionalSpending.count} عملية بإجمالي ${dashboard.emotionalSpending.total} ريال
- أهداف الادخار: ${JSON.stringify(dashboard.savingsGoals)}

أجب بإيجاز ووضوح باللغة العربية، بنبرة داعمة وغير حكمية. استخدم الأرقام أعلاه فقط، ولا تخترع بيانات.`;
}

/** Prompt to explain a purchase-evaluation result in natural language (slide 7: "تقييم فوري قبل أي عملية شراء"). */
function buildPurchaseEvaluationPrompt(evaluation, profile) {
  const system = `أنت "رشد"، مساعد مالي ذكي. اشرح نتيجة تقييم قدرة الشراء التالية للمستخدم بجملتين إلى ثلاث جمل، بنبرة ودودة وعملية، بالعربية.`;
  const user = `نتيجة التقييم:
- المبلغ: ${evaluation.amount} ريال
- الفئة: ${evaluation.category}
- مستوى الخطورة: ${evaluation.riskLevel}
- الأسباب: ${evaluation.flags.join(", ") || "لا توجد"}
- الرصيد المتبقي بعد الشراء: ${evaluation.remainingBalanceAfterPurchase} ريال
- نسبة استخدام الميزانية الشهرية حاليًا: ${evaluation.budgetUsedPct}%

اشرح للمستخدم هل يُنصح بإتمام هذا الشراء الآن أم لا، وسبب ذلك.`;

  return { system, user };
}

module.exports = {
  buildEmotionalSpendingPrompt,
  buildAssistantSystemPrompt,
  buildPurchaseEvaluationPrompt,
};
