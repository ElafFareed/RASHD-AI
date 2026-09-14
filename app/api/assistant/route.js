// app/api/assistant/route.js

import { NextResponse } from "next/server";
import {
  getUserDataset,
  getUserPeriodDataset,
} from "../../../lib/dataset";

const SUPPORTED_PERIODS = [1, 3, 6, 12];

const FIXED_CATEGORIES = new Set([
  "Debt Payment",
  "Rent",
  "Telecom",
  "Utilities",
  "Insurance",
  "Membership",
]);

const EXCLUDED_VARIABLE_CATEGORIES = new Set([
  ...FIXED_CATEGORIES,
  "Subscriptions",
  "Savings Transfer",
]);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function formatSAR(value) {
  const numericValue = toNumber(value);
  const sign = numericValue < 0 ? "-" : "";

  return `${sign}SAR ${Math.abs(
    Math.round(numericValue)
  ).toLocaleString()}`;
}

function formatPercentage(value) {
  return `${Math.round(
    toNumber(value)
  )}%`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isActive(record = {}) {
  const status = normalizeText(
    record.status
  );

  if (!status) {
    return record.active !== false;
  }

  return ![
    "inactive",
    "cancelled",
    "canceled",
    "closed",
    "completed",
    "paid off",
  ].includes(status);
}

function isTrue(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    normalizeText(value) === "true"
  );
}

function isFalse(value) {
  return (
    value === false ||
    value === 0 ||
    value === "0" ||
    normalizeText(value) === "false"
  );
}

function sumRecords(records = [], getValue) {
  return records.reduce(
    (total, record) =>
      total +
      toNumber(getValue(record)),
    0
  );
}

/* -------------------------------------------------------------------------- */
/* Transaction helpers                                                        */
/* -------------------------------------------------------------------------- */

function getExpenseTransactions(
  transactions = []
) {
  return transactions.filter(
    (transaction) => {
      const amount = toNumber(
        transaction.amount
      );

      const isSavingsTransfer =
        transaction.type === "transfer" ||
        transaction.category ===
          "Savings Transfer";

      return (
        !isSavingsTransfer &&
        (
          transaction.type ===
            "expense" ||
          amount < 0
        )
      );
    }
  );
}

function getIncomeTransactions(
  transactions = []
) {
  return transactions.filter(
    (transaction) =>
      transaction.type === "income" ||
      toNumber(transaction.amount) > 0
  );
}

function getSavingsTransfers(
  transactions = []
) {
  return transactions.filter(
    (transaction) =>
      transaction.type ===
        "transfer" ||
      transaction.category ===
        "Savings Transfer"
  );
}

function getVariableExpenses(
  transactions = []
) {
  return getExpenseTransactions(
    transactions
  ).filter((transaction) => {
    return !EXCLUDED_VARIABLE_CATEGORIES.has(
      transaction.category
    );
  });
}

function getTopCategories(
  transactions = []
) {
  const totals = {};

  getVariableExpenses(
    transactions
  ).forEach((transaction) => {
    const category =
      transaction.category ||
      "Other";

    const amount = Math.abs(
      toNumber(transaction.amount)
    );

    totals[category] =
      (totals[category] || 0) +
      amount;
  });

  const totalVariableSpending =
    Object.values(totals).reduce(
      (sum, amount) =>
        sum + amount,
      0
    );

  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,

      percentage:
        totalVariableSpending > 0
          ? Math.round(
              (
                amount /
                totalVariableSpending
              ) * 100
            )
          : 0,
    }))
    .sort(
      (first, second) =>
        second.amount -
        first.amount
    );
}

/* -------------------------------------------------------------------------- */
/* Liability helpers — matches liabilities.csv                                */
/* -------------------------------------------------------------------------- */

function getLiabilityName(
  liability = {}
) {
  return (
    liability.name ||
    liability.type ||
    "Liability"
  );
}

function getLiabilityMonthlyPayment(
  liability = {}
) {
  return toNumber(
    liability.average_monthly_payment ??
      liability.monthly_payment ??
      liability.monthly_amount ??
      liability.monthly_installment
  );
}

function getLiabilityRemainingBalance(
  liability = {}
) {
  const directBalance = toNumber(
    liability.outstanding_balance ??
      liability.remaining_balance ??
      liability.remaining_amount
  );

  if (directBalance > 0) {
    return directBalance;
  }

  const monthlyPayment =
    getLiabilityMonthlyPayment(
      liability
    );

  const remainingMonths =
    toNumber(
      liability.remaining_months ??
        liability.months_left
    );

  return (
    monthlyPayment *
    remainingMonths
  );
}

function getActiveLiabilities(
  liabilities = []
) {
  return liabilities.filter(
    isActive
  );
}

function getLargestLiability(
  liabilities = []
) {
  return (
    [...liabilities].sort(
      (first, second) =>
        getLiabilityRemainingBalance(
          second
        ) -
        getLiabilityRemainingBalance(
          first
        )
    )[0] || null
  );
}

function getMonthlyLiabilityTotal(
  liabilities = []
) {
  return liabilities.reduce(
    (total, liability) =>
      total +
      getLiabilityMonthlyPayment(
        liability
      ),
    0
  );
}

function getTotalLiabilityBalance(
  liabilities = []
) {
  return liabilities.reduce(
    (total, liability) =>
      total +
      getLiabilityRemainingBalance(
        liability
      ),
    0
  );
}

/* -------------------------------------------------------------------------- */
/* Commitment helpers — matches commitments.csv                               */
/* -------------------------------------------------------------------------- */

function getCommitmentName(
  commitment = {}
) {
  return (
    commitment.name ||
    commitment.category ||
    "Commitment"
  );
}

function getCommitmentMonthlyAmount(
  commitment = {}
) {
  return toNumber(
    commitment.average_monthly_amount ??
      commitment.monthly_amount ??
      commitment.amount
  );
}

function getActiveCommitments(
  commitments = []
) {
  return commitments.filter(
    isActive
  );
}

function getMonthlyCommitmentTotal(
  commitments = []
) {
  return commitments.reduce(
    (total, commitment) =>
      total +
      getCommitmentMonthlyAmount(
        commitment
      ),
    0
  );
}

/* -------------------------------------------------------------------------- */
/* Subscription helpers — matches subscriptions.csv                           */
/* -------------------------------------------------------------------------- */

function getSubscriptionName(
  subscription = {}
) {
  return (
    subscription.service_name ||
    subscription.name ||
    "Subscription"
  );
}

function getSubscriptionMonthlyCost(
  subscription = {}
) {
  return toNumber(
    subscription.average_monthly_amount ??
      subscription.monthly_cost ??
      subscription.monthly_amount
  );
}

function getActiveSubscriptions(
  subscriptions = []
) {
  return subscriptions.filter(
    isActive
  );
}

function getMonthlySubscriptionTotal(
  subscriptions = []
) {
  return subscriptions.reduce(
    (total, subscription) =>
      total +
      getSubscriptionMonthlyCost(
        subscription
      ),
    0
  );
}

/* -------------------------------------------------------------------------- */
/* Message helpers                                                            */
/* -------------------------------------------------------------------------- */

function getPurchaseAmount(message) {
  const matches = String(
    message
  ).match(
    /(?:sar|riyal|riyals|﷼)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );

  if (!matches) {
    return null;
  }

  const amount = Number(
    matches[1].replaceAll(
      ",",
      ""
    )
  );

  return Number.isFinite(amount)
    ? amount
    : null;
}

function getRequestedPeriod(
  message,
  fallback = 3
) {
  const normalized =
    normalizeText(message);

  const patterns = [
    {
      months: 12,

      values: [
        "12 month",
        "12 months",
        "year",
        "yearly",
        "annual",
        "last year",
      ],
    },

    {
      months: 6,

      values: [
        "6 month",
        "6 months",
        "half year",
        "half-year",
      ],
    },

    {
      months: 3,

      values: [
        "3 month",
        "3 months",
        "quarter",
        "quarterly",
      ],
    },

    {
      months: 1,

      values: [
        "1 month",
        "this month",
        "last month",
        "monthly",
      ],
    },
  ];

  const matched =
    patterns.find((pattern) =>
      pattern.values.some(
        (value) =>
          normalized.includes(
            value
          )
      )
    );

  if (matched) {
    return matched.months;
  }

  const numericFallback =
    Number(fallback);

  return SUPPORTED_PERIODS.includes(
    numericFallback
  )
    ? numericFallback
    : 3;
}

/* -------------------------------------------------------------------------- */
/* Behavioral analysis                                                        */
/* -------------------------------------------------------------------------- */

function calculateBehaviorMetrics({
  transactions,
  summary,
}) {
  const expenses =
    getExpenseTransactions(
      transactions
    );

  const totalSpent = sumRecords(
    expenses,
    (transaction) =>
      Math.abs(
        toNumber(
          transaction.amount
        )
      )
  );

  const weekendSpent =
    sumRecords(
      expenses.filter(
        (transaction) =>
          isTrue(
            transaction.is_weekend
          )
      ),

      (transaction) =>
        Math.abs(
          toNumber(
            transaction.amount
          )
        )
    );

  const lateNightSpent =
    sumRecords(
      expenses.filter(
        (transaction) =>
          isTrue(
            transaction.is_late_night
          )
      ),

      (transaction) =>
        Math.abs(
          toNumber(
            transaction.amount
          )
        )
    );

  const nonEssentialSpent =
    sumRecords(
      expenses.filter(
        (transaction) =>
          isFalse(
            transaction.is_essential
          )
      ),

      (transaction) =>
        Math.abs(
          toNumber(
            transaction.amount
          )
        )
    );

  const burstCount = new Set(
    expenses
      .map(
        (transaction) =>
          transaction.burst_group
      )
      .filter(Boolean)
  ).size;

  const calculatedWeekend =
    totalSpent > 0
      ? Math.round(
          (
            weekendSpent /
            totalSpent
          ) * 100
        )
      : 0;

  const calculatedLateNight =
    totalSpent > 0
      ? Math.round(
          (
            lateNightSpent /
            totalSpent
          ) * 100
        )
      : 0;

  const calculatedNonEssential =
    totalSpent > 0
      ? Math.round(
          (
            nonEssentialSpent /
            totalSpent
          ) * 100
        )
      : 0;

  const weekendPercentage =
    calculatedWeekend ||
    Math.round(
      toNumber(
        summary
          ?.weekend_spend_ratio
      ) * 100
    );

  const lateNightPercentage =
    calculatedLateNight ||
    Math.round(
      toNumber(
        summary
          ?.late_night_spend_ratio
      ) * 100
    );

  const nonEssentialPercentage =
    calculatedNonEssential ||
    Math.round(
      toNumber(
        summary
          ?.nonessential_spend_ratio
      ) * 100
    );

  const impulsiveScore =
    Math.min(
      100,
      Math.round(
        weekendPercentage * 0.35 +
        lateNightPercentage * 1.2 +
        nonEssentialPercentage *
          0.45 +
        burstCount * 3
      )
    );

  const calculatedRiskFlag =
    impulsiveScore >= 60
      ? "High"
      : impulsiveScore >= 35
      ? "Medium"
      : "Low";

  return {
    weekendPercentage,
    lateNightPercentage,
    nonEssentialPercentage,
    burstCount,
    impulsiveScore,

    riskFlag:
      summary?.risk_flag ||
      calculatedRiskFlag,
  };
}

/* -------------------------------------------------------------------------- */
/* Financial calculation                                                      */
/* -------------------------------------------------------------------------- */

function calculateFinancialMetrics({
  userData,
  months,
}) {
  const profile =
    userData.profile || {};

  const transactions =
    userData.transactions || [];

  const monthlySummary =
    userData.monthlySummary ||
    [];

  const summary =
    userData.summary || {};

  const liabilities =
    getActiveLiabilities(
      userData.liabilities || []
    );

  const commitments =
    getActiveCommitments(
      userData.commitments || []
    );

  const subscriptionsList =
    getActiveSubscriptions(
      userData.subscriptions || []
    );

  const emergencyFund =
    userData.emergencyFund ||
    null;

  const goals =
    userData.goals || [];

  const safeMonths = Math.max(
    1,
    months
  );

  const periodIncome =
    monthlySummary.length > 0
      ? sumRecords(
          monthlySummary,

          (record) =>
            record.salary ??
            record.income
        )
      : sumRecords(
          getIncomeTransactions(
            transactions
          ),

          (transaction) =>
            Math.abs(
              toNumber(
                transaction.amount
              )
            )
        );

  const fixedObligations =
    monthlySummary.length > 0
      ? sumRecords(
          monthlySummary,

          (record) =>
            record.fixed_obligations ??
            record.liabilities
        )
      : sumRecords(
          getExpenseTransactions(
            transactions
          ).filter(
            (transaction) =>
              FIXED_CATEGORIES.has(
                transaction.category
              )
          ),

          (transaction) =>
            Math.abs(
              toNumber(
                transaction.amount
              )
            )
        );

  const subscriptions =
    monthlySummary.length > 0
      ? sumRecords(
          monthlySummary,

          (record) =>
            record.subscriptions
        )
      : sumRecords(
          getExpenseTransactions(
            transactions
          ).filter(
            (transaction) =>
              transaction.category ===
              "Subscriptions"
          ),

          (transaction) =>
            Math.abs(
              toNumber(
                transaction.amount
              )
            )
        );

  const variableSpending =
    monthlySummary.length > 0
      ? sumRecords(
          monthlySummary,

          (record) =>
            record.variable_spending ??
            record.spending
        )
      : sumRecords(
          getVariableExpenses(
            transactions
          ),

          (transaction) =>
            Math.abs(
              toNumber(
                transaction.amount
              )
            )
        );

  const plannedSavings =
    monthlySummary.length > 0
      ? sumRecords(
          monthlySummary,

          (record) =>
            record.planned_savings ??
            record.savings_contribution
        )
      : sumRecords(
          getSavingsTransfers(
            transactions
          ),

          (transaction) =>
            Math.abs(
              toNumber(
                transaction.amount
              )
            )
        );

  const averageMonthlyIncome =
    periodIncome /
    safeMonths;

  const averageMonthlyFixedObligations =
    fixedObligations /
    safeMonths;

  const averageMonthlySubscriptions =
    subscriptions /
    safeMonths;

  const averageMonthlyVariableSpending =
    variableSpending /
    safeMonths;

  const averageMonthlyPlannedSavings =
    plannedSavings /
    safeMonths;

  const incomeAfterCommitments =
    periodIncome -
    fixedObligations -
    subscriptions;

  const remainingAfterSpending =
    incomeAfterCommitments -
    variableSpending;

  const availableToSpend =
    remainingAfterSpending -
    plannedSavings;

  const averageMonthlyAvailableToSpend =
    availableToSpend /
    safeMonths;

  const behavior =
    calculateBehaviorMetrics({
      transactions,
      summary,
    });

  const emergencyCurrent =
    toNumber(
      emergencyFund
        ?.current_amount
    );

  const emergencyMinimum =
    toNumber(
      emergencyFund
        ?.minimum_reserve
    );

  const emergencyTarget =
    toNumber(
      emergencyFund
        ?.target_amount
    );

  const fixedObligationRatio =
    periodIncome > 0
      ? Math.round(
          (
            (
              fixedObligations +
              subscriptions
            ) /
            periodIncome
          ) * 100
        )
      : 0;

  const savingsRate =
    periodIncome > 0
      ? Math.round(
          (
            plannedSavings /
            periodIncome
          ) * 100
        )
      : 0;

  const totalOutflow =
    fixedObligations +
    subscriptions +
    variableSpending +
    plannedSavings;

  const cashFlowScore =
    periodIncome > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              100 -
              Math.max(
                0,
                (
                  totalOutflow /
                  periodIncome -
                  1
                ) * 100
              )
            )
          )
        )
      : 0;

  const emergencyScore =
    emergencyMinimum > 0
      ? Math.min(
          100,
          Math.round(
            (
              emergencyCurrent /
              emergencyMinimum
            ) * 100
          )
        )
      : 50;

  const commitmentScore =
    Math.max(
      0,
      100 -
      fixedObligationRatio
    );

  const savingsScore =
    Math.min(
      100,
      savingsRate * 5
    );

  const behaviorScore =
    100 -
    behavior.impulsiveScore;

  const healthScore =
    Math.round(
      cashFlowScore * 0.25 +
      savingsScore * 0.2 +
      commitmentScore * 0.2 +
      emergencyScore * 0.15 +
      behaviorScore * 0.2
    );

  return {
    months,

    currentBalance:
      toNumber(
        profile.current_balance
      ),

    periodIncome,
    fixedObligations,
    subscriptions,
    variableSpending,
    plannedSavings,

    incomeAfterCommitments,
    remainingAfterSpending,
    availableToSpend,

    averageMonthlyIncome,
    averageMonthlyFixedObligations,
    averageMonthlySubscriptions,
    averageMonthlyVariableSpending,
    averageMonthlyPlannedSavings,
    averageMonthlyAvailableToSpend,

    fixedObligationRatio,
    savingsRate,

    healthScore,
    ...behavior,

    emergencyCurrent,
    emergencyMinimum,
    emergencyTarget,

    emergencyProtected:
      emergencyMinimum <= 0 ||
      emergencyCurrent >=
        emergencyMinimum,

    liabilities,
    commitments,
    subscriptionsList,
    goals,

    monthlyLiabilityPayments:
      getMonthlyLiabilityTotal(
        liabilities
      ),

    totalLiabilityBalance:
      getTotalLiabilityBalance(
        liabilities
      ),

    monthlyCommitmentPayments:
      getMonthlyCommitmentTotal(
        commitments
      ),

    monthlySubscriptionCost:
      getMonthlySubscriptionTotal(
        subscriptionsList
      ),

    topCategories:
      getTopCategories(
        transactions
      ),

    transactionCount:
      transactions.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Reply builders                                                             */
/* -------------------------------------------------------------------------- */

function buildOverviewReply({
  metrics,
  goals,
}) {
  const mainGoal =
    goals[0];

  return (
    `Here is your ${metrics.months}-month financial overview:\n\n` +
    `• Current balance: ${formatSAR(
      metrics.currentBalance
    )}\n` +
    `• Period income: ${formatSAR(
      metrics.periodIncome
    )}\n` +
    `• Fixed obligations: ${formatSAR(
      metrics.fixedObligations
    )}\n` +
    `• Subscriptions: ${formatSAR(
      metrics.subscriptions
    )}\n` +
    `• Variable spending: ${formatSAR(
      metrics.variableSpending
    )}\n` +
    `• Planned savings: ${formatSAR(
      metrics.plannedSavings
    )}\n` +
    `• Available to spend: ${formatSAR(
      metrics.availableToSpend
    )}\n` +
    `• Financial health score: ${metrics.healthScore}/100\n` +
    `• Behavioral risk: ${metrics.riskFlag}` +
    (
      mainGoal
        ? `\n• Main goal: ${mainGoal.goal_name}`
        : ""
    )
  );
}

function buildSpendingReply({
  metrics,
}) {
  const topCategory =
    metrics.topCategories[0];

  const secondCategory =
    metrics.topCategories[1];

  if (!topCategory) {
    return (
      "There is not enough variable-spending data for this period."
    );
  }

  let reply =
    `${topCategory.name} is your highest variable-spending category during the selected ${metrics.months}-month period.\n\n` +
    `• ${topCategory.name}: ${formatSAR(
      topCategory.amount
    )} (${formatPercentage(
      topCategory.percentage
    )})\n` +
    `• Total variable spending: ${formatSAR(
      metrics.variableSpending
    )}\n` +
    `• Monthly variable-spending average: ${formatSAR(
      metrics.averageMonthlyVariableSpending
    )}`;

  if (secondCategory) {
    reply +=
      `\n• Second-highest category: ${secondCategory.name} at ${formatSAR(
        secondCategory.amount
      )}`;
  }

  if (
    metrics.availableToSpend <
    0
  ) {
    reply +=
      `\n\nYour total outflows exceed income by ${formatSAR(
        Math.abs(
          metrics.availableToSpend
        )
      )} during this period.`;
  } else {
    reply +=
      `\n\nAfter commitments, spending, and savings, ${formatSAR(
        metrics.availableToSpend
      )} remains available during the period.`;
  }

  return reply;
}

function buildBehaviorReply({
  metrics,
}) {
  const signals = [];

  if (
    metrics.weekendPercentage >=
    25
  ) {
    signals.push(
      `${metrics.weekendPercentage}% of expenses occurred on weekends`
    );
  }

  if (
    metrics.lateNightPercentage >=
    8
  ) {
    signals.push(
      `${metrics.lateNightPercentage}% occurred late at night`
    );
  }

  if (
    metrics.nonEssentialPercentage >=
    45
  ) {
    signals.push(
      `${metrics.nonEssentialPercentage}% was classified as non-essential`
    );
  }

  if (
    metrics.burstCount > 0
  ) {
    signals.push(
      `${metrics.burstCount} spending burst${
        metrics.burstCount === 1
          ? ""
          : "s"
      } were detected`
    );
  }

  if (
    signals.length === 0
  ) {
    return (
      "No strong impulsive-spending signals were detected for this period.\n\n" +
      `Current behavioral risk: ${metrics.riskFlag}.`
    );
  }

  return (
    `Rashd detected these patterns during the selected ${metrics.months}-month period:\n\n` +
    signals
      .map(
        (signal) =>
          `• ${signal}`
      )
      .join("\n") +
    `\n\nBehavioral risk: ${metrics.riskFlag}.\n\n` +
    "These signals may indicate impulsive behavior, but they do not prove the user's emotional state. Consider category limits and a short pause before non-essential purchases."
  );
}

function buildSavingsReply({
  metrics,
  goals,
}) {
  const mainGoal =
    goals[0];

  if (!mainGoal) {
    return (
      "There is no active savings goal in this profile.\n\n" +
      `Your estimated safe monthly available amount is ${formatSAR(
        metrics.averageMonthlyAvailableToSpend
      )}. You can create a goal and Rashd will evaluate its feasibility.`
    );
  }

  const target =
    toNumber(
      mainGoal.target_amount
    );

  const current =
    toNumber(
      mainGoal.current_amount
    );

  const remaining =
    Math.max(
      0,
      target - current
    );

  const safeMonthlyCapacity =
    Math.max(
      0,
      metrics.averageMonthlyAvailableToSpend
    );

  const recommendedContribution =
    remaining > 0
      ? Math.min(
          remaining,
          Math.max(
            100,
            safeMonthlyCapacity *
              0.6
          )
        )
      : 0;

  const estimatedMonths =
    recommendedContribution > 0
      ? Math.ceil(
          remaining /
          recommendedContribution
        )
      : 0;

  return (
    `Your main goal is ${mainGoal.goal_name}.\n\n` +
    `• Target: ${formatSAR(
      target
    )}\n` +
    `• Saved: ${formatSAR(
      current
    )}\n` +
    `• Remaining: ${formatSAR(
      remaining
    )}\n` +
    `• Planned monthly contribution: ${formatSAR(
      mainGoal.planned_monthly_contribution
    )}\n` +
    `• Safe monthly capacity: ${formatSAR(
      safeMonthlyCapacity
    )}\n\n` +
    (
      remaining <= 0
        ? "This goal is already complete."
        : safeMonthlyCapacity <= 0
        ? "Your current cash flow does not safely support an additional contribution. Consider reducing variable spending or extending the deadline."
        : `Rashd recommends approximately ${formatSAR(
            recommendedContribution
          )} per month. At that pace, the goal could be completed in about ${estimatedMonths} month${
            estimatedMonths === 1
              ? ""
              : "s"
          }.`
    )
  );
}

function buildLiabilityReply({
  metrics,
}) {
  const liabilities =
    metrics.liabilities;

  if (
    liabilities.length === 0
  ) {
    return (
      "No active liabilities were found for this profile."
    );
  }

  const largestLiability =
    getLargestLiability(
      liabilities
    );

  const totalMonthlyPayments =
    getMonthlyLiabilityTotal(
      liabilities
    );

  const totalRemaining =
    getTotalLiabilityBalance(
      liabilities
    );

  let reply =
    "Here is your liabilities overview:\n\n" +
    `• Active liabilities: ${liabilities.length}\n` +
    `• Total monthly liability payments: ${formatSAR(
      totalMonthlyPayments
    )}\n` +
    `• Total remaining balances: ${formatSAR(
      totalRemaining
    )}`;

  if (largestLiability) {
    const liabilityName =
      getLiabilityName(
        largestLiability
      );

    const remainingBalance =
      getLiabilityRemainingBalance(
        largestLiability
      );

    const monthlyPayment =
      getLiabilityMonthlyPayment(
        largestLiability
      );

    reply +=
      `\n• Largest liability: ${liabilityName} — ${formatSAR(
        remainingBalance
      )} remaining`;

    if (monthlyPayment > 0) {
      reply +=
        ` with a monthly payment of ${formatSAR(
          monthlyPayment
        )}`;
    }

    if (
      toNumber(
        largestLiability
          .remaining_months
      ) > 0
    ) {
      reply +=
        `\n• Estimated remaining term: ${Math.round(
          toNumber(
            largestLiability
              .remaining_months
          )
        )} months`;
    }

    if (
      toNumber(
        largestLiability
          .interest_rate
      ) > 0
    ) {
      reply +=
        `\n• Interest rate: ${toNumber(
          largestLiability
            .interest_rate
        ).toFixed(2)}%`;
    }
  }

  reply +=
  `\n\nFixed obligations, including liability payments, plus subscriptions currently use ${formatPercentage(
    metrics.fixedObligationRatio
  )} of period income.`;

  return reply;
}

function buildCommitmentReply({
  metrics,
}) {
  const commitments =
    metrics.commitments;

  if (
    commitments.length === 0
  ) {
    return (
      "No active recurring commitments were found for this profile."
    );
  }

  const totalMonthly =
    getMonthlyCommitmentTotal(
      commitments
    );

  const largestCommitment =
    [...commitments].sort(
      (first, second) =>
        getCommitmentMonthlyAmount(
          second
        ) -
        getCommitmentMonthlyAmount(
          first
        )
    )[0];

  let reply =
    "Here is your recurring commitments overview:\n\n" +
    `• Active commitments: ${commitments.length}\n` +
    `• Average monthly commitment cost: ${formatSAR(
      totalMonthly
    )}`;

  if (largestCommitment) {
    reply +=
      `\n• Largest commitment: ${getCommitmentName(
        largestCommitment
      )} at ${formatSAR(
        getCommitmentMonthlyAmount(
          largestCommitment
        )
      )} per month`;
  }

  const essentialCount =
    commitments.filter(
      (commitment) =>
        isTrue(
          commitment.is_essential
        )
    ).length;

  reply +=
    `\n• Essential commitments: ${essentialCount}`;

  return reply;
}

function buildSubscriptionReply({
  metrics,
}) {
  const subscriptions =
    metrics.subscriptionsList;

  if (
    subscriptions.length === 0
  ) {
    return (
      "No active subscriptions were found for this profile."
    );
  }

  const totalMonthlyCost =
    getMonthlySubscriptionTotal(
      subscriptions
    );

  const largestSubscription =
    [...subscriptions].sort(
      (first, second) =>
        getSubscriptionMonthlyCost(
          second
        ) -
        getSubscriptionMonthlyCost(
          first
        )
    )[0];

  let reply =
    "Here is your subscriptions overview:\n\n" +
    `• Active subscriptions: ${subscriptions.length}\n` +
    `• Average monthly subscription cost: ${formatSAR(
      totalMonthlyCost
    )}\n` +
    `• Estimated ${metrics.months}-month subscription cost: ${formatSAR(
      totalMonthlyCost *
      metrics.months
    )}`;

  if (largestSubscription) {
    reply +=
      `\n• Highest-cost service: ${getSubscriptionName(
        largestSubscription
      )} at ${formatSAR(
        getSubscriptionMonthlyCost(
          largestSubscription
        )
      )} per month`;
  }

  return reply;
}

function buildEmergencyReply({
  metrics,
}) {
  if (
    metrics.emergencyMinimum <=
      0 &&
    metrics.emergencyCurrent <=
      0
  ) {
    return (
      "No emergency-fund information is configured for this profile."
    );
  }

  const reserveDifference =
    metrics.emergencyCurrent -
    metrics.emergencyMinimum;

  const essentialMonthlyCost =
    Math.max(
      1,
      metrics.averageMonthlyFixedObligations +
      metrics.averageMonthlySubscriptions
    );

  const coverageMonths =
    metrics.emergencyCurrent /
    essentialMonthlyCost;

  return (
    "Here is your emergency-fund status:\n\n" +
    `• Current reserve: ${formatSAR(
      metrics.emergencyCurrent
    )}\n` +
    `• Protected minimum: ${formatSAR(
      metrics.emergencyMinimum
    )}\n` +
    `• Target: ${formatSAR(
      metrics.emergencyTarget
    )}\n` +
    `• Fixed-cost coverage: ${coverageMonths.toFixed(
      1
    )} months\n\n` +
    (
      metrics.emergencyProtected
        ? `The minimum reserve is protected by ${formatSAR(
            Math.max(
              0,
              reserveDifference
            )
          )}.`
        : `The reserve is ${formatSAR(
            Math.abs(
              reserveDifference
            )
          )} below its protected minimum.`
    )
  );
}

function buildAffordabilityReply({
  message,
  metrics,
  goals,
}) {
  const purchaseAmount =
    getPurchaseAmount(message);

  if (!purchaseAmount) {
    return (
      `Your current balance is ${formatSAR(
        metrics.currentBalance
      )}, and your estimated safe monthly available amount is ${formatSAR(
        metrics.averageMonthlyAvailableToSpend
      )}.\n\n` +
      "Tell me the purchase price or use the Affordability Checker for the full score, emergency-fund impact, and payment strategies."
    );
  }

  const mainGoal =
    goals[0];

  const currentBalance =
    metrics.currentBalance;

  const availableMonthly =
    Math.max(
      0,
      metrics.averageMonthlyAvailableToSpend
    );

  const balanceRatio =
    currentBalance > 0
      ? purchaseAmount /
        currentBalance
      : 1;

  const emergencyAfterPurchase =
    metrics.emergencyCurrent -
    purchaseAmount;

  const emergencySafe =
    metrics.emergencyMinimum <=
      0 ||
    emergencyAfterPurchase >=
      metrics.emergencyMinimum;

  const recommendedMonths =
    availableMonthly > 0
      ? Math.max(
          1,
          Math.min(
            12,
            Math.ceil(
              purchaseAmount /
              availableMonthly
            )
          )
        )
      : 12;

  let verdict;

  if (
    purchaseAmount <=
      availableMonthly &&
    balanceRatio <= 0.2 &&
    emergencySafe
  ) {
    verdict =
      "This purchase appears affordable.";
  } else if (
    balanceRatio <= 0.4 &&
    availableMonthly > 0 &&
    emergencySafe
  ) {
    verdict =
      "This purchase may be affordable with planning.";
  } else {
    verdict =
      "This purchase is not recommended right now.";
  }

  let reply =
    `${verdict}\n\n` +
    `• Purchase amount: ${formatSAR(
      purchaseAmount
    )}\n` +
    `• Current balance: ${formatSAR(
      currentBalance
    )}\n` +
    `• Safe monthly available amount: ${formatSAR(
      availableMonthly
    )}\n` +
    `• Balance after purchase: ${formatSAR(
      currentBalance -
      purchaseAmount
    )}\n` +
    `• Emergency reserve after purchase: ${formatSAR(
      emergencyAfterPurchase
    )}\n` +
    `• Emergency reserve status: ${
      emergencySafe
        ? "Protected"
        : "Below minimum"
    }\n\n`;

  if (
    purchaseAmount >
    availableMonthly
  ) {
    reply +=
      `Rashd recommends saving for approximately ${recommendedMonths} month${
        recommendedMonths === 1
          ? ""
          : "s"
      } rather than paying the entire amount from one month's cash flow.`;
  } else {
    reply +=
      "The purchase fits within your monthly cash-flow capacity, but essential expenses and savings goals should remain protected.";
  }

  if (mainGoal) {
    reply +=
      `\n\nYour main goal is ${mainGoal.goal_name}. A large purchase may delay its progress.`;
  }

  return reply;
}

function buildLocalReply({
  message,
  metrics,
  goals,
}) {
  const normalized =
    normalizeText(message);

  if (
    normalized.includes(
      "afford"
    ) ||
    normalized.includes("buy") ||
    normalized.includes(
      "purchase"
    )
  ) {
    return buildAffordabilityReply({
      message,
      metrics,
      goals,
    });
  }

  if (
    normalized.includes(
      "liabilit"
    ) ||
    normalized.includes("loan") ||
    normalized.includes("debt") ||
    normalized.includes(
      "installment"
    )
  ) {
    return buildLiabilityReply({
      metrics,
    });
  }

  if (
    normalized.includes(
      "commitment"
    ) ||
    normalized.includes("rent") ||
    normalized.includes(
      "phone bill"
    ) ||
    normalized.includes(
      "internet bill"
    ) ||
    normalized.includes(
      "fixed payment"
    )
  ) {
    return buildCommitmentReply({
      metrics,
    });
  }

  if (
    normalized.includes(
      "subscription"
    ) ||
    normalized.includes(
      "netflix"
    ) ||
    normalized.includes(
      "spotify"
    ) ||
    normalized.includes(
      "amazon prime"
    ) ||
    normalized.includes(
      "chatgpt"
    )
  ) {
    return buildSubscriptionReply({
      metrics,
    });
  }

  if (
    normalized.includes(
      "emergency"
    ) ||
    normalized.includes(
      "reserve"
    )
  ) {
    return buildEmergencyReply({
      metrics,
    });
  }

  if (
    normalized.includes(
      "weekend"
    ) ||
    normalized.includes(
      "emotional"
    ) ||
    normalized.includes(
      "impulsive"
    ) ||
    normalized.includes(
      "behavior"
    ) ||
    normalized.includes(
      "late night"
    )
  ) {
    return buildBehaviorReply({
      metrics,
    });
  }

  if (
    normalized.includes("save") ||
    normalized.includes(
      "saving"
    ) ||
    normalized.includes("goal")
  ) {
    return buildSavingsReply({
      metrics,
      goals,
    });
  }

  if (
    normalized.includes("food") ||
    normalized.includes(
      "shopping"
    ) ||
    normalized.includes(
      "transport"
    ) ||
    normalized.includes(
      "spending"
    ) ||
    normalized.includes(
      "cut back"
    ) ||
    normalized.includes(
      "category"
    )
  ) {
    return buildSpendingReply({
      metrics,
    });
  }

  if (
    normalized.includes(
      "income"
    ) ||
    normalized.includes(
      "balance"
    ) ||
    normalized.includes(
      "overview"
    ) ||
    normalized.includes(
      "health"
    ) ||
    normalized.includes(
      "available"
    )
  ) {
    return buildOverviewReply({
      metrics,
      goals,
    });
  }

  return (
    `I analyzed your synthetic financial profile across the selected ${metrics.months}-month period.\n\n` +
    `• Current balance: ${formatSAR(
      metrics.currentBalance
    )}\n` +
    `• Average monthly income: ${formatSAR(
      metrics.averageMonthlyIncome
    )}\n` +
    `• Average monthly fixed obligations: ${formatSAR(
      metrics.averageMonthlyFixedObligations
    )}\n` +
    `• Average monthly subscriptions: ${formatSAR(
      metrics.averageMonthlySubscriptions
    )}\n` +
    `• Average monthly available to spend: ${formatSAR(
      metrics.averageMonthlyAvailableToSpend
    )}\n` +
    `• Financial health score: ${metrics.healthScore}/100\n` +
    `• Behavioral risk: ${metrics.riskFlag}\n\n` +
    "You can ask about spending, liabilities, commitments, subscriptions, emergency savings, goals, affordability, or your overall financial health."
  );
}

/* -------------------------------------------------------------------------- */
/* API route                                                                  */
/* -------------------------------------------------------------------------- */

export async function POST(request) {
  try {
    const body =
      await request.json();

    const {
      message,
      userId,
      period = 3,
    } = body;

    if (
      !message ||
      typeof message !==
        "string" ||
      !message.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Body must include a valid message.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !userId ||
      typeof userId !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Body must include a valid userId.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedUserId =
      userId
        .trim()
        .toUpperCase();

    const requestedPeriod =
      getRequestedPeriod(
        message,
        period
      );

    const periodData =
      getUserPeriodDataset(
        normalizedUserId,
        requestedPeriod
      );

    const fullUserData =
      getUserDataset(
        normalizedUserId
      );

    if (
      !periodData ||
      !fullUserData
    ) {
      return NextResponse.json(
        {
          error:
            "Synthetic financial profile not found.",
        },
        {
          status: 404,
        }
      );
    }

    const combinedUserData = {
      ...fullUserData,

      transactions:
        periodData.transactions ||
        [],

      monthlySummary:
        periodData.monthlySummary ||
        [],
    };

    const metrics =
      calculateFinancialMetrics({
        userData:
          combinedUserData,

        months:
          requestedPeriod,
      });

    const reply =
      buildLocalReply({
        message:
          message.trim(),

        metrics,

        goals:
          fullUserData.goals ||
          [],
      });

    return NextResponse.json({
      reply,

      usedFallback: false,

      engine:
        "rashd-cash-flow-assistant-v3",

      userId:
        normalizedUserId,

      period:
        requestedPeriod,

      context: {
        currentBalance:
          metrics.currentBalance,

        averageMonthlyIncome:
          metrics.averageMonthlyIncome,

        averageMonthlyFixedObligations:
          metrics.averageMonthlyFixedObligations,

        averageMonthlySubscriptions:
          metrics.averageMonthlySubscriptions,

        averageMonthlyVariableSpending:
          metrics.averageMonthlyVariableSpending,

        averageMonthlyPlannedSavings:
          metrics.averageMonthlyPlannedSavings,

        averageMonthlyAvailableToSpend:
          metrics.averageMonthlyAvailableToSpend,

        monthlyLiabilityPayments:
          metrics.monthlyLiabilityPayments,

        totalLiabilityBalance:
          metrics.totalLiabilityBalance,

        monthlyCommitmentPayments:
          metrics.monthlyCommitmentPayments,

        monthlySubscriptionCost:
          metrics.monthlySubscriptionCost,

        healthScore:
          metrics.healthScore,

        riskFlag:
          metrics.riskFlag,
      },
    });
  } catch (error) {
    console.error(
      "Assistant API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Rashd could not process the request.",
      },
      {
        status: 500,
      }
    );
  }
}
