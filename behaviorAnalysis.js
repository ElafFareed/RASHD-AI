// lib/behaviorAnalysis.js
// Rule-based feature engineering on transactions.
// This layer produces STRUCTURED SIGNALS. The LLM layer (see llmClient.js + prompts.js)
// turns those signals into natural-language recommendations. Keeping this split means:
//  - the numbers are deterministic and testable (no hallucination risk on the math)
//  - the LLM only has to reason/explain, not compute

/** Groups transactions by category and returns totals + counts. */
function getSpendByCategory(transactions) {
  const byCategory = {};
  for (const t of transactions) {
    if (!byCategory[t.category]) byCategory[t.category] = { total: 0, count: 0 };
    byCategory[t.category].total += t.amount;
    byCategory[t.category].count += 1;
  }
  return byCategory;
}

function getTotalSpend(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/** % of income spent, and comparison against the user's declared budget. */
function getMonthlySpendRate(transactions, profile) {
  const totalSpend = getTotalSpend(transactions);
  const spendByCategory = getSpendByCategory(transactions);

  const budgetBreach = [];
  for (const [category, limit] of Object.entries(profile.monthlyBudget.categories)) {
    const actual = spendByCategory[category]?.total || 0;
    if (actual > limit) {
      budgetBreach.push({
        category,
        limit,
        actual,
        overBy: Number((actual - limit).toFixed(2)),
      });
    }
  }

  return {
    totalSpend,
    incomeUsedPct: Number(((totalSpend / profile.monthlyIncome) * 100).toFixed(1)),
    budgetUsedPct: Number(((totalSpend / profile.monthlyBudget.total) * 100).toFixed(1)),
    budgetBreach,
  };
}

/**
 * Emotional / impulsive spending detector.
 * Since the MVP has no voice/text/facial signal (see slide 5 — only transaction data),
 * "emotion" is inferred from BEHAVIORAL PATTERNS in the transaction stream:
 *
 *  1. Late-night purchases (23:00–04:00) — classic impulse-buy window
 *  2. Frequency burst — 3+ purchases in the same non-essential category within 48h
 *  3. Amount deviation — a purchase significantly above the category's average
 *  4. Non-essential category — shopping/entertainment weighted higher than bills/food staples
 *
 * Each rule contributes a score; transactions crossing the threshold are flagged.
 * Returns per-transaction flags AND a plain-language-ready summary object for the LLM prompt.
 */
function detectEmotionalSpending(transactions) {
  const NON_ESSENTIAL = new Set(["shopping", "entertainment"]);
  const NIGHT_START_HOUR = 23;
  const NIGHT_END_HOUR = 4;

  const spendByCategory = getSpendByCategory(transactions);
  const categoryAverages = {};
  for (const [cat, data] of Object.entries(spendByCategory)) {
    categoryAverages[cat] = data.total / data.count;
  }

  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  const flagged = [];
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    let score = 0;
    const reasons = [];

    const hour = new Date(t.date).getHours();
    const isLateNight = hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
    if (isLateNight) {
      score += 2;
      reasons.push("late_night_purchase");
    }

    if (NON_ESSENTIAL.has(t.category)) {
      score += 1;
      reasons.push("non_essential_category");
    }

    const avg = categoryAverages[t.category] || t.amount;
    if (t.amount > avg * 1.3) {
      score += 1;
      reasons.push("above_category_average");
    }

    // Frequency burst: count same-category purchases within 48h window around this one
    const windowMs = 48 * 60 * 60 * 1000;
    const burstCount = sorted.filter(
      (o) =>
        o.category === t.category &&
        Math.abs(new Date(o.date) - new Date(t.date)) <= windowMs
    ).length;
    if (burstCount >= 3) {
      score += 2;
      reasons.push("frequency_burst");
    }

    if (score >= 3) {
      flagged.push({ ...t, emotionalSpendScore: score, reasons });
    }
  }

  const flaggedTotal = flagged.reduce((sum, t) => sum + t.amount, 0);

  return {
    flaggedTransactions: flagged,
    flaggedCount: flagged.length,
    flaggedTotal: Number(flaggedTotal.toFixed(2)),
    pctOfTotalSpend: transactions.length
      ? Number(((flaggedTotal / getTotalSpend(transactions)) * 100).toFixed(1))
      : 0,
  };
}

/**
 * Purchase-capacity check: "should I buy this?" evaluator run BEFORE a purchase.
 * Combines remaining budget headroom + how close the user is to a savings goal deadline.
 */
function evaluatePurchase(profile, transactions, amount, category) {
  const spendRate = getMonthlySpendRate(transactions, profile);
  const categorySpend = getSpendByCategory(transactions)[category]?.total || 0;
  const categoryLimit = profile.monthlyBudget.categories[category] ?? profile.monthlyBudget.total * 0.15;
  const remainingInCategory = Number((categoryLimit - categorySpend).toFixed(2));
  const remainingBalance = profile.currentBalance - amount;

  let riskLevel = "low";
  const flags = [];

  if (amount > remainingInCategory) {
    riskLevel = "medium";
    flags.push("exceeds_category_budget");
  }
  if (remainingBalance < profile.monthlyBudget.total * 0.2) {
    riskLevel = "high";
    flags.push("low_balance_after_purchase");
  }
  if (spendRate.budgetUsedPct > 90) {
    riskLevel = "high";
    flags.push("monthly_budget_nearly_exhausted");
  }

  return {
    amount,
    category,
    canAfford: remainingBalance >= 0,
    riskLevel,
    flags,
    remainingInCategory,
    remainingBalanceAfterPurchase: Number(remainingBalance.toFixed(2)),
    budgetUsedPct: spendRate.budgetUsedPct,
  };
}

/** Suggests a monthly contribution to hit each savings goal by its target date. */
function generateSavingsSuggestions(profile) {
  const now = new Date();
  return profile.savingsGoals.map((goal) => {
    const monthsLeft = Math.max(
      1,
      Math.round((new Date(goal.targetDate) - now) / (1000 * 60 * 60 * 24 * 30))
    );
    const remaining = goal.targetAmount - goal.currentAmount;
    const suggestedMonthly = Number((remaining / monthsLeft).toFixed(2));
    return {
      goalId: goal.id,
      name: goal.name,
      remaining,
      monthsLeft,
      suggestedMonthlyContribution: suggestedMonthly,
      onTrack: suggestedMonthly <= profile.monthlyIncome * 0.2, // heuristic: <20% of income
    };
  });
}

/** Aggregated numbers for a dashboard view. */
function computeDashboardIndicators(profile, transactions) {
  const spendRate = getMonthlySpendRate(transactions, profile);
  const emotional = detectEmotionalSpending(transactions);
  const savings = generateSavingsSuggestions(profile);

  return {
    balance: profile.currentBalance,
    monthlyIncome: profile.monthlyIncome,
    totalSpend: spendRate.totalSpend,
    budgetUsedPct: spendRate.budgetUsedPct,
    budgetBreach: spendRate.budgetBreach,
    emotionalSpending: {
      count: emotional.flaggedCount,
      total: emotional.flaggedTotal,
      pctOfTotalSpend: emotional.pctOfTotalSpend,
    },
    savingsGoals: savings,
  };
}

module.exports = {
  getSpendByCategory,
  getTotalSpend,
  getMonthlySpendRate,
  detectEmotionalSpending,
  evaluatePurchase,
  generateSavingsSuggestions,
  computeDashboardIndicators,
};
