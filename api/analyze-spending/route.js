// app/api/analyze-spending/route.js

import { NextResponse } from "next/server";
import { getUserDataset } from "../../../lib/dataset";

const SUPPORTED_PERIODS = [1, 3, 6, 12];

const FIXED_CATEGORIES = new Set([
  "Debt Payment",
  "Rent",
  "Telecom",
  "Utilities",
  "Insurance",
  "Membership",
]);

const NON_VARIABLE_CATEGORIES = new Set([
  ...FIXED_CATEGORIES,
  "Subscriptions",
  "Savings Transfer",
  "Income",
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

function clamp(value, minimum, maximum) {
  return Math.max(
    minimum,
    Math.min(maximum, value)
  );
}

function isTrue(value) {
  return (
    value === true ||
    String(value).toLowerCase() === "true" ||
    value === 1 ||
    value === "1"
  );
}

function isFalse(value) {
  return (
    value === false ||
    String(value).toLowerCase() === "false" ||
    value === 0 ||
    value === "0"
  );
}

function getTransactionDate(transaction) {
  const rawValue =
    transaction.datetime ||
    transaction.date;

  if (!rawValue) {
    return null;
  }

  const parsed = new Date(rawValue);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function getMonthlyRecordDate(record) {
  const directDate =
    record.period ||
    record.period_start ||
    record.date;

  if (directDate) {
    const parsed = new Date(directDate);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const monthNames = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  const monthText = String(
    record.month || ""
  )
    .trim()
    .toLowerCase();

  const monthIndex = monthNames[monthText];

  if (monthIndex === undefined) {
    return null;
  }

  const explicitYear = toNumber(
    record.year,
    0
  );

  const inferredYear =
    explicitYear ||
    (monthIndex >= 6 ? 2025 : 2026);

  return new Date(
    inferredYear,
    monthIndex,
    1
  );
}

function getLatestDate(records, dateParser) {
  const dates = records
    .map(dateParser)
    .filter(Boolean);

  if (dates.length === 0) {
    return null;
  }

  return new Date(
    Math.max(
      ...dates.map((date) =>
        date.getTime()
      )
    )
  );
}

function getPeriodStartDate(
  latestDate,
  period
) {
  if (!latestDate) {
    return null;
  }

  return new Date(
    latestDate.getFullYear(),
    latestDate.getMonth() -
      period +
      1,
    1
  );
}

function filterTransactionsByPeriod(
  transactions,
  period
) {
  const latestDate = getLatestDate(
    transactions,
    getTransactionDate
  );

  if (!latestDate) {
    return transactions;
  }

  const startDate = getPeriodStartDate(
    latestDate,
    period
  );

  return transactions.filter(
    (transaction) => {
      const date =
        getTransactionDate(transaction);

      if (!date) {
        return false;
      }

      return (
        date >= startDate &&
        date <= latestDate
      );
    }
  );
}

function filterMonthlySummaryByPeriod(
  monthlySummary,
  period
) {
  const latestDate = getLatestDate(
    monthlySummary,
    getMonthlyRecordDate
  );

  if (!latestDate) {
    return monthlySummary;
  }

  const startDate = getPeriodStartDate(
    latestDate,
    period
  );

  return monthlySummary
    .filter((record) => {
      const date =
        getMonthlyRecordDate(record);

      if (!date) {
        return false;
      }

      return (
        date >= startDate &&
        date <= latestDate
      );
    })
    .sort((first, second) => {
      return (
        getMonthlyRecordDate(first) -
        getMonthlyRecordDate(second)
      );
    });
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
      transaction.type === "transfer" ||
      transaction.category ===
        "Savings Transfer"
  );
}

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
          transaction.type === "expense" ||
          amount < 0
        )
      );
    }
  );
}

function getVariableExpenses(
  transactions = []
) {
  return getExpenseTransactions(
    transactions
  ).filter((transaction) => {
    const category =
      transaction.category || "Other";

    return !NON_VARIABLE_CATEGORIES.has(
      category
    );
  });
}

function sumTransactions(
  transactions = []
) {
  return transactions.reduce(
    (total, transaction) =>
      total +
      Math.abs(
        toNumber(transaction.amount)
      ),
    0
  );
}

function sumRecords(
  records,
  getValue
) {
  return records.reduce(
    (total, record) =>
      total +
      toNumber(getValue(record)),
    0
  );
}

function calculateTopCategories(
  transactions = []
) {
  const totals = {};

  getVariableExpenses(
    transactions
  ).forEach((transaction) => {
    const category =
      transaction.category || "Other";

    const amount = Math.abs(
      toNumber(transaction.amount)
    );

    totals[category] =
      (totals[category] || 0) +
      amount;
  });

  const totalVariableSpending =
    Object.values(totals).reduce(
      (sum, amount) => sum + amount,
      0
    );

  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage:
        totalVariableSpending > 0
          ? Math.round(
              (amount /
                totalVariableSpending) *
                100
            )
          : 0,
    }))
    .sort(
      (first, second) =>
        second.amount -
        first.amount
    );
}

function calculateBehavior({
  transactions,
  summary,
}) {
  const expenses =
    getExpenseTransactions(
      transactions
    );

  const totalSpent =
    sumTransactions(expenses);

  const weekendSpent =
    sumTransactions(
      expenses.filter(
        (transaction) =>
          isTrue(
            transaction.is_weekend
          )
      )
    );

  const lateNightSpent =
    sumTransactions(
      expenses.filter(
        (transaction) =>
          isTrue(
            transaction.is_late_night
          )
      )
    );

  const nonEssentialSpent =
    sumTransactions(
      expenses.filter(
        (transaction) =>
          isFalse(
            transaction.is_essential
          )
      )
    );

  const burstGroups = new Set(
    expenses
      .map(
        (transaction) =>
          transaction.burst_group
      )
      .filter(Boolean)
  );

  const calculatedWeekendPercentage =
    totalSpent > 0
      ? Math.round(
          (weekendSpent /
            totalSpent) *
            100
        )
      : 0;

  const calculatedLateNightPercentage =
    totalSpent > 0
      ? Math.round(
          (lateNightSpent /
            totalSpent) *
            100
        )
      : 0;

  const calculatedNonEssentialPercentage =
    totalSpent > 0
      ? Math.round(
          (nonEssentialSpent /
            totalSpent) *
            100
        )
      : 0;

  const weekendPercentage =
    calculatedWeekendPercentage ||
    Math.round(
      toNumber(
        summary?.weekend_spend_ratio
      ) * 100
    );

  const lateNightPercentage =
    calculatedLateNightPercentage ||
    Math.round(
      toNumber(
        summary?.late_night_spend_ratio
      ) * 100
    );

  const nonEssentialPercentage =
    calculatedNonEssentialPercentage ||
    Math.round(
      toNumber(
        summary?.nonessential_spend_ratio
      ) * 100
    );

  const riskScore = clamp(
    Math.round(
      weekendPercentage * 0.35 +
      lateNightPercentage * 1.2 +
      nonEssentialPercentage * 0.45 +
      burstGroups.size * 3
    ),
    0,
    100
  );

  const riskFlag =
    riskScore >= 60
      ? "High"
      : riskScore >= 35
      ? "Medium"
      : "Low";

  const signals = [];

  if (weekendPercentage >= 25) {
    signals.push({
      type: "weekend",
      label: "Weekend Spending",
      value: weekendPercentage,
      message: `${weekendPercentage}% of expenses occurred on weekends.`,
      severity:
        weekendPercentage >= 40
          ? "High"
          : "Medium",
    });
  }

  if (lateNightPercentage >= 8) {
    signals.push({
      type: "late-night",
      label: "Late-Night Spending",
      value: lateNightPercentage,
      message: `${lateNightPercentage}% of expenses occurred late at night.`,
      severity:
        lateNightPercentage >= 15
          ? "High"
          : "Medium",
    });
  }

  if (nonEssentialPercentage >= 45) {
    signals.push({
      type: "non-essential",
      label: "Non-Essential Spending",
      value: nonEssentialPercentage,
      message: `${nonEssentialPercentage}% of expenses were classified as non-essential.`,
      severity:
        nonEssentialPercentage >= 60
          ? "High"
          : "Medium",
    });
  }

  if (burstGroups.size > 0) {
    signals.push({
      type: "burst",
      label: "Spending Bursts",
      value: burstGroups.size,
      message: `${burstGroups.size} spending burst${
        burstGroups.size === 1
          ? ""
          : "s"
      } detected.`,
      severity:
        burstGroups.size >= 3
          ? "High"
          : "Medium",
    });
  }

  return {
    totalSpent,
    weekendSpent,
    lateNightSpent,
    nonEssentialSpent,

    weekendPercentage,
    lateNightPercentage,
    nonEssentialPercentage,

    burstCount:
      burstGroups.size,

    riskScore,
    riskFlag,
    signals,
  };
}

function calculateFinancialMetrics({
  profile,
  transactions,
  monthlySummary,
  emergencyFund,
  period,
}) {
  const incomeTransactions =
    getIncomeTransactions(
      transactions
    );

  const expenseTransactions =
    getExpenseTransactions(
      transactions
    );

  const savingsTransfers =
    getSavingsTransfers(
      transactions
    );

  const periodIncome =
    monthlySummary.length > 0
      ? sumRecords(
          monthlySummary,
          (record) =>
            record.salary ??
            record.income
        )
      : sumTransactions(
          incomeTransactions
        );

  const fixedObligations =
    monthlySummary.length > 0
      ? sumRecords(
          monthlySummary,
          (record) =>
            record.fixed_obligations ??
            record.liabilities
        )
      : sumTransactions(
          expenseTransactions.filter(
            (transaction) =>
              FIXED_CATEGORIES.has(
                transaction.category
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
      : sumTransactions(
          expenseTransactions.filter(
            (transaction) =>
              transaction.category ===
              "Subscriptions"
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
      : sumTransactions(
          getVariableExpenses(
            transactions
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
      : sumTransactions(
          savingsTransfers
        );

  const safePeriod = Math.max(
    1,
    period
  );

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

  const averageMonthlyIncome =
    periodIncome / safePeriod;

  const averageMonthlyFixedObligations =
    fixedObligations /
    safePeriod;

  const averageMonthlySubscriptions =
    subscriptions /
    safePeriod;

  const averageMonthlyVariableSpending =
    variableSpending /
    safePeriod;

  const averageMonthlyPlannedSavings =
    plannedSavings /
    safePeriod;

  const averageMonthlyAvailableToSpend =
    availableToSpend /
    safePeriod;

  const fixedObligationRatio =
    periodIncome > 0
      ? Math.round(
          (
            (
              fixedObligations +
              subscriptions
            ) /
            periodIncome
          ) *
            100
        )
      : 0;

  const savingsRate =
    periodIncome > 0
      ? Math.round(
          (plannedSavings /
            periodIncome) *
            100
        )
      : 0;

  const emergencyCurrent =
    toNumber(
      emergencyFund?.current_amount
    );

  const emergencyMinimum =
    toNumber(
      emergencyFund?.minimum_reserve
    );

  const emergencyTarget =
    toNumber(
      emergencyFund?.target_amount
    );

  return {
    currentBalance: toNumber(
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

    emergencyCurrent,
    emergencyMinimum,
    emergencyTarget,

    emergencyProtected:
      emergencyMinimum <= 0 ||
      emergencyCurrent >=
        emergencyMinimum,
  };
}

function calculateHealthScore({
  financial,
  behavior,
}) {
  const {
    periodIncome,
    fixedObligationRatio,
    savingsRate,
    availableToSpend,
    emergencyCurrent,
    emergencyMinimum,
  } = financial;

  const totalOutflow =
    financial.fixedObligations +
    financial.subscriptions +
    financial.variableSpending +
    financial.plannedSavings;

  const cashFlowScore =
    periodIncome > 0
      ? clamp(
          Math.round(
            100 -
              Math.max(
                0,
                (
                  totalOutflow /
                    periodIncome -
                  1
                ) *
                  100
              )
          ),
          0,
          100
        )
      : 0;

  const commitmentScore = clamp(
    100 -
      Math.max(
        0,
        fixedObligationRatio - 25
      ) *
        2,
    0,
    100
  );

  const savingsScore = clamp(
    savingsRate * 5,
    0,
    100
  );

  const emergencyScore =
    emergencyMinimum > 0
      ? clamp(
          Math.round(
            (emergencyCurrent /
              emergencyMinimum) *
              100
          ),
          0,
          100
        )
      : 50;

  const behaviorScore =
    100 - behavior.riskScore;

  const availableScore =
    availableToSpend >= 0
      ? 100
      : clamp(
          100 -
            (
              Math.abs(
                availableToSpend
              ) /
              Math.max(
                1,
                periodIncome
              )
            ) *
              150,
          0,
          100
        );

  const healthScore = Math.round(
    cashFlowScore * 0.2 +
      commitmentScore * 0.2 +
      savingsScore * 0.15 +
      emergencyScore * 0.15 +
      behaviorScore * 0.2 +
      availableScore * 0.1
  );

  return {
    healthScore,

    components: {
      cashFlowScore:
        Math.round(cashFlowScore),

      commitmentScore:
        Math.round(commitmentScore),

      savingsScore:
        Math.round(savingsScore),

      emergencyScore:
        Math.round(emergencyScore),

      behaviorScore:
        Math.round(behaviorScore),

      availableCashScore:
        Math.round(availableScore),
    },
  };
}

function buildRecommendations({
  financial,
  behavior,
  topCategories,
}) {
  const recommendations = [];

  const topCategory =
    topCategories[0];

  if (topCategory) {
    const reduction =
      topCategory.amount * 0.1;

    recommendations.push({
      priority: "Medium",
      category: "Variable Spending",
      title: `Reduce ${topCategory.name} spending`,
      message: `Reducing ${topCategory.name.toLowerCase()} spending by 10% could free approximately ${formatSAR(
        reduction
      )} during this period.`,
      estimatedImpact: reduction,
    });
  }

  if (
    financial.fixedObligationRatio >= 50
  ) {
    recommendations.push({
      priority: "High",
      category: "Fixed Commitments",
      title:
        "Avoid additional recurring payments",
      message: `${financial.fixedObligationRatio}% of income is already committed to fixed obligations and subscriptions.`,
      estimatedImpact: 0,
    });
  }

  if (
    behavior.nonEssentialPercentage >=
    45
  ) {
    const monthlyReduction =
      financial.averageMonthlyVariableSpending *
      0.1;

    recommendations.push({
      priority:
        behavior.nonEssentialPercentage >=
        60
          ? "High"
          : "Medium",
      category: "Behavior",
      title:
        "Set a discretionary-spending limit",
      message: `${behavior.nonEssentialPercentage}% of expenses were non-essential. A 10% reduction in monthly variable spending could free approximately ${formatSAR(
        monthlyReduction
      )} per month.`,
      estimatedImpact:
        monthlyReduction,
    });
  }

  if (
    behavior.weekendPercentage >= 30
  ) {
    recommendations.push({
      priority: "Medium",
      category: "Behavior",
      title:
        "Create a weekend spending cap",
      message: `${behavior.weekendPercentage}% of expenses occurred on weekends. Set a separate weekend allowance to reduce unplanned purchases.`,
      estimatedImpact: 0,
    });
  }

  if (
    behavior.lateNightPercentage >= 8
  ) {
    recommendations.push({
      priority:
        behavior.lateNightPercentage >=
        15
          ? "High"
          : "Medium",
      category: "Behavior",
      title:
        "Pause late-night purchases",
      message:
        "Use a waiting period before completing late-night, non-essential purchases.",
      estimatedImpact: 0,
    });
  }

  if (!financial.emergencyProtected) {
    recommendations.push({
      priority: "High",
      category: "Emergency Fund",
      title:
        "Restore the emergency reserve",
      message: `The emergency fund is ${formatSAR(
        financial.emergencyMinimum -
          financial.emergencyCurrent
      )} below its protected minimum.`,
      estimatedImpact:
        financial.emergencyMinimum -
        financial.emergencyCurrent,
    });
  }

  if (
    financial.availableToSpend < 0
  ) {
    recommendations.push({
      priority: "High",
      category: "Cash Flow",
      title:
        "Reduce monthly outflows",
      message: `Total outflows exceed income by ${formatSAR(
        Math.abs(
          financial.availableToSpend
        )
      )} during this period.`,
      estimatedImpact:
        Math.abs(
          financial.availableToSpend
        ),
    });
  } else {
    recommendations.push({
      priority: "Low",
      category: "Cash Flow",
      title:
        "Allocate remaining cash intentionally",
      message: `${formatSAR(
        financial.availableToSpend
      )} remains after commitments, spending, and savings during the selected period.`,
      estimatedImpact:
        financial.availableToSpend,
    });
  }

  const priorityOrder = {
    High: 0,
    Medium: 1,
    Low: 2,
  };

  return recommendations
    .sort(
      (first, second) =>
        priorityOrder[
          first.priority
        ] -
        priorityOrder[
          second.priority
        ]
    )
    .slice(0, 5);
}

function buildSummary({
  period,
  financial,
  behavior,
  healthScore,
  recommendations,
}) {
  const cashFlowStatement =
    financial.availableToSpend >= 0
      ? `${formatSAR(
          financial.availableToSpend
        )} remains available after all outflows during the selected period.`
      : `Outflows exceed income by ${formatSAR(
          Math.abs(
            financial.availableToSpend
          )
        )} during the selected period.`;

  const commitmentStatement =
    financial.fixedObligationRatio >= 50
      ? `Fixed commitments consume a high ${financial.fixedObligationRatio}% of income.`
      : `Fixed commitments consume ${financial.fixedObligationRatio}% of income.`;

  const behaviorStatement =
    behavior.riskFlag === "High"
      ? "Behavioral spending risk is high."
      : behavior.riskFlag === "Medium"
      ? "Behavioral spending risk is moderate."
      : "Behavioral spending risk is low.";

  const topRecommendation =
    recommendations[0];

  return (
    `Rashd analyzed the selected ${period}-month period and calculated a financial health score of ${healthScore}/100. ` +
    `${cashFlowStatement} ` +
    `${commitmentStatement} ` +
    `${behaviorStatement}` +
    (
      topRecommendation
        ? ` The highest-priority action is: ${topRecommendation.title.toLowerCase()}.`
        : ""
    )
  );
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const {
      userId,
      period = 3,
      transactions:
        customTransactions,
    } = body;

    const selectedPeriod =
      SUPPORTED_PERIODS.includes(
        Number(period)
      )
        ? Number(period)
        : 3;

    let profile = {};
    let summary = {};
    let emergencyFund = null;
    let transactions = [];
    let monthlySummary = [];

    if (
      Array.isArray(
        customTransactions
      )
    ) {
      transactions =
        filterTransactionsByPeriod(
          customTransactions,
          selectedPeriod
        );

      profile = {
        current_balance:
          toNumber(
            body.currentBalance
          ),

        monthly_income:
          toNumber(
            body.monthlyIncome
          ),
      };
    } else {
      if (
        !userId ||
        typeof userId !== "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Provide either a valid userId or a custom transactions array.",
          },
          {
            status: 400,
          }
        );
      }

      const userData =
        getUserDataset(userId);

      if (!userData) {
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

      profile =
        userData.profile || {};

      summary =
        userData.summary || {};

      emergencyFund =
        userData.emergencyFund ||
        null;

      transactions =
        filterTransactionsByPeriod(
          userData.transactions ||
            [],
          selectedPeriod
        );

      monthlySummary =
        filterMonthlySummaryByPeriod(
          userData.monthlySummary ||
            [],
          selectedPeriod
        );
    }

    if (
      !Array.isArray(
        transactions
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Transactions must be an array.",
        },
        {
          status: 400,
        }
      );
    }

    const behavior =
      calculateBehavior({
        transactions,
        summary,
      });

    const financial =
      calculateFinancialMetrics({
        profile,
        transactions,
        monthlySummary,
        emergencyFund,
        period:
          selectedPeriod,
      });

    const topCategories =
      calculateTopCategories(
        transactions
      );

    const {
      healthScore,
      components:
        healthComponents,
    } = calculateHealthScore({
      financial,
      behavior,
    });

    const recommendations =
      buildRecommendations({
        financial,
        behavior,
        topCategories,
      });

    const executiveSummary =
      buildSummary({
        period:
          selectedPeriod,

        financial,
        behavior,
        healthScore,
        recommendations,
      });

    return NextResponse.json({
      userId: userId || null,

      period:
        selectedPeriod,

      healthScore,

      healthComponents,

      riskFlag:
        behavior.riskFlag,

      riskScore:
        behavior.riskScore,

      cashFlow: {
        currentBalance:
          financial.currentBalance,

        periodIncome:
          financial.periodIncome,

        fixedObligations:
          financial.fixedObligations,

        subscriptions:
          financial.subscriptions,

        variableSpending:
          financial.variableSpending,

        plannedSavings:
          financial.plannedSavings,

        incomeAfterCommitments:
          financial.incomeAfterCommitments,

        remainingAfterSpending:
          financial.remainingAfterSpending,

        availableToSpend:
          financial.availableToSpend,

        averageMonthlyIncome:
          financial.averageMonthlyIncome,

        averageMonthlyFixedObligations:
          financial.averageMonthlyFixedObligations,

        averageMonthlySubscriptions:
          financial.averageMonthlySubscriptions,

        averageMonthlyVariableSpending:
          financial.averageMonthlyVariableSpending,

        averageMonthlyPlannedSavings:
          financial.averageMonthlyPlannedSavings,

        averageMonthlyAvailableToSpend:
          financial.averageMonthlyAvailableToSpend,

        fixedObligationRatio:
          financial.fixedObligationRatio,

        savingsRate:
          financial.savingsRate,
      },

      emergencyFund: {
        current:
          financial.emergencyCurrent,

        minimum:
          financial.emergencyMinimum,

        target:
          financial.emergencyTarget,

        protected:
          financial.emergencyProtected,
      },

      behavior: {
        totalSpent:
          behavior.totalSpent,

        weekendSpent:
          behavior.weekendSpent,

        lateNightSpent:
          behavior.lateNightSpent,

        nonEssentialSpent:
          behavior.nonEssentialSpent,

        weekendPercentage:
          behavior.weekendPercentage,

        lateNightPercentage:
          behavior.lateNightPercentage,

        nonEssentialPercentage:
          behavior.nonEssentialPercentage,

        burstCount:
          behavior.burstCount,

        signals:
          behavior.signals,
      },

      topCategories,

      recommendations,

      executiveSummary,

      transactionCount:
        transactions.length,

      engine:
        "rashd-financial-behavior-analysis-v2",
    });
  } catch (error) {
    console.error(
      "Analyze spending error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Rashd could not analyze spending.",
      },
      {
        status: 500,
      }
    );
  }
}