// app/api/purchase-evaluation/route.js

import { NextResponse } from "next/server";
import { getUserDataset } from "../../../lib/dataset";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function formatSAR(value) {
  return `SAR ${Math.abs(
    Math.round(toNumber(value))
  ).toLocaleString()}`;
}

function clamp(value, minimum, maximum) {
  return Math.max(
    minimum,
    Math.min(maximum, value)
  );
}

function getMonthlyAverage(
  monthlySummary = [],
  fields = []
) {
  if (monthlySummary.length === 0) {
    return 0;
  }

  const total = monthlySummary.reduce(
    (sum, record) => {
      const field = fields.find(
        (name) =>
          record[name] !== undefined &&
          record[name] !== ""
      );

      return (
        sum +
        toNumber(
          field ? record[field] : 0
        )
      );
    },
    0
  );

  return total / monthlySummary.length;
}

function calculateFinancialContext(userData) {
  const profile =
    userData.profile || {};

  const summary =
    userData.summary || {};

  const monthlySummary =
    userData.monthlySummary || [];

  const emergencyFund =
    userData.emergencyFund || null;

  const goals =
    userData.goals || [];

  const currentBalance = toNumber(
    profile.current_balance
  );

  const averageMonthlyIncome =
    toNumber(
      summary.average_monthly_income,
      getMonthlyAverage(
        monthlySummary,
        ["salary", "income"]
      )
    ) ||
    toNumber(
      profile.monthly_income_average,
      profile.monthly_income
    );

  const averageFixedObligations =
    toNumber(
      summary.average_monthly_fixed_obligations,
      getMonthlyAverage(
        monthlySummary,
        [
          "fixed_obligations",
          "liabilities",
        ]
      )
    );

  const averageSubscriptions =
    toNumber(
      summary.average_monthly_subscriptions,
      getMonthlyAverage(
        monthlySummary,
        ["subscriptions"]
      )
    );

  const averageVariableSpending =
    toNumber(
      summary.average_monthly_variable_spending,
      getMonthlyAverage(
        monthlySummary,
        [
          "variable_spending",
          "spending",
        ]
      )
    );

  const averagePlannedSavings =
    toNumber(
      summary.average_monthly_planned_savings,
      getMonthlyAverage(
        monthlySummary,
        [
          "planned_savings",
          "savings_contribution",
        ]
      )
    );

  const incomeAfterCommitments =
    averageMonthlyIncome -
    averageFixedObligations -
    averageSubscriptions;

  const remainingAfterSpending =
    incomeAfterCommitments -
    averageVariableSpending;

  const availableToSpend =
    remainingAfterSpending -
    averagePlannedSavings;

  const emergencyCurrent = toNumber(
    emergencyFund?.current_amount
  );

  const emergencyMinimum = toNumber(
    emergencyFund?.minimum_reserve
  );

  const emergencyTarget = toNumber(
    emergencyFund?.target_amount
  );

  const primaryGoal =
    goals.find(
      (goal) =>
        String(goal.priority)
          .toLowerCase() === "high"
    ) ||
    goals[0] ||
    null;

  const riskFlag =
    summary.risk_flag || "Unknown";

  return {
    currentBalance,
    averageMonthlyIncome,
    averageFixedObligations,
    averageSubscriptions,
    averageVariableSpending,
    averagePlannedSavings,

    incomeAfterCommitments,
    remainingAfterSpending,
    availableToSpend,

    emergencyCurrent,
    emergencyMinimum,
    emergencyTarget,

    emergencySafe:
      emergencyCurrent >=
      emergencyMinimum,

    primaryGoal,
    riskFlag,
  };
}

function calculateGoalImpact({
  amount,
  primaryGoal,
  availableToSpend,
}) {
  if (!primaryGoal) {
    return {
      goalName: null,
      estimatedDelayMonths: 0,
      impactLevel: "None",
      message:
        "No active savings goal was found.",
    };
  }

  const goalName =
    primaryGoal.goal_name ||
    "Primary Goal";

  const plannedContribution =
    Math.max(
      1,
      toNumber(
        primaryGoal.planned_monthly_contribution
      )
    );

  const goalCurrent = toNumber(
    primaryGoal.current_amount
  );

  const goalTarget = toNumber(
    primaryGoal.target_amount
  );

  const goalRemaining =
    Math.max(
      0,
      goalTarget - goalCurrent
    );

  const monthlyCapacity =
    Math.max(
      plannedContribution,
      availableToSpend
    );

  const estimatedDelayMonths =
    monthlyCapacity > 0
      ? Math.ceil(
          amount / monthlyCapacity
        )
      : 12;

  let impactLevel = "Low";

  if (
    amount >= goalRemaining * 0.5 ||
    estimatedDelayMonths >= 4
  ) {
    impactLevel = "High";
  } else if (
    amount >= goalRemaining * 0.2 ||
    estimatedDelayMonths >= 2
  ) {
    impactLevel = "Moderate";
  }

  return {
    goalName,
    estimatedDelayMonths,
    impactLevel,
    message:
      goalRemaining <= 0
        ? `${goalName} is already completed.`
        : `This purchase could delay ${goalName} by approximately ${estimatedDelayMonths} month${
            estimatedDelayMonths === 1
              ? ""
              : "s"
          }.`,
  };
}

function buildPaymentStrategies({
  amount,
  availableToSpend,
  currentBalance,
}) {
  const safeMonthlyCapacity =
    Math.max(
      100,
      availableToSpend
    );

  const recommendedMonths =
    clamp(
      Math.ceil(
        amount /
          Math.max(
            1,
            safeMonthlyCapacity
          )
      ),
      1,
      12
    );

  const recommendedMonthly =
    amount /
    recommendedMonths;

  const installmentMonths =
    amount >= 6000
      ? 6
      : amount >= 3000
      ? 3
      : 2;

  const installmentMonthly =
    amount /
    installmentMonths;

  const payNowRatio =
    currentBalance > 0
      ? amount / currentBalance
      : 1;

  return {
    recommendedMonths,
    recommendedMonthly,

    options: [
      {
        label: "Pay in full now",
        risk:
          payNowRatio <= 0.15
            ? "Low"
            : payNowRatio <= 0.3
            ? "Moderate"
            : "High",

        color:
          payNowRatio <= 0.15
            ? "#2DCFB3"
            : payNowRatio <= 0.3
            ? "#C9A84C"
            : "#E85D75",

        note: `${Math.round(
          payNowRatio * 100
        )}% of current balance`,
      },

      {
        label: `Save ${recommendedMonths} month${
          recommendedMonths === 1
            ? ""
            : "s"
        }`,

        risk: "Recommended",
        color: "#2DCFB3",

        note: `${formatSAR(
          recommendedMonthly
        )} per month`,
      },

      {
        label: `${installmentMonths}-month installment`,

        risk:
          installmentMonthly <=
          Math.max(
            0,
            availableToSpend
          )
            ? "Manageable"
            : "High",

        color:
          installmentMonthly <=
          Math.max(
            0,
            availableToSpend
          )
            ? "#C9A84C"
            : "#E85D75",

        note: `${formatSAR(
          installmentMonthly
        )} per month`,
      },
    ],
  };
}

function createFactors({
  amount,
  context,
  score,
  goalImpact,
}) {
  const {
    currentBalance,
    availableToSpend,
    emergencyCurrent,
    emergencyMinimum,
    averageMonthlyIncome,
    averageFixedObligations,
    averageSubscriptions,
    riskFlag,
  } = context;

  const balanceRatio =
    currentBalance > 0
      ? amount / currentBalance
      : 1;

  const availableRatio =
    availableToSpend > 0
      ? amount / availableToSpend
      : Infinity;

  const commitmentRatio =
    averageMonthlyIncome > 0
      ? (
          averageFixedObligations +
          averageSubscriptions
        ) /
        averageMonthlyIncome
      : 1;

  const emergencyAfterPurchase =
    emergencyCurrent - amount;

  return [
    {
      label: "Current Balance Impact",

      status:
        balanceRatio <= 0.15
          ? "✓ Low Impact"
          : balanceRatio <= 0.3
          ? "◉ Moderate"
          : "⚠ High Impact",

      color:
        balanceRatio <= 0.15
          ? "#2DCFB3"
          : balanceRatio <= 0.3
          ? "#C9A84C"
          : "#E85D75",
    },

    {
      label: "Monthly Cash-Flow Fit",

      status:
        amount <=
        Math.max(
          0,
          availableToSpend
        )
          ? "✓ Fits Available Cash"
          : availableRatio <= 3
          ? "◉ Save Before Buying"
          : "⚠ Exceeds Safe Capacity",

      color:
        amount <=
        Math.max(
          0,
          availableToSpend
        )
          ? "#2DCFB3"
          : availableRatio <= 3
          ? "#C9A84C"
          : "#E85D75",
    },

    {
      label: "Fixed Commitment Burden",

      status:
        commitmentRatio <= 0.35
          ? "✓ Healthy"
          : commitmentRatio <= 0.5
          ? "◉ Moderate"
          : "⚠ High",

      color:
        commitmentRatio <= 0.35
          ? "#2DCFB3"
          : commitmentRatio <= 0.5
          ? "#C9A84C"
          : "#E85D75",
    },

    {
      label: "Emergency Fund Safety",

      status:
        emergencyMinimum <= 0
          ? "◉ Not Configured"
          : emergencyAfterPurchase >=
            emergencyMinimum
          ? "✓ Protected"
          : "⚠ Below Minimum",

      color:
        emergencyMinimum <= 0
          ? "#C9A84C"
          : emergencyAfterPurchase >=
            emergencyMinimum
          ? "#2DCFB3"
          : "#E85D75",
    },

    {
      label: "Savings Goal Impact",

      status:
        goalImpact.impactLevel ===
        "Low"
          ? "✓ Low"
          : goalImpact.impactLevel ===
            "Moderate"
          ? "◉ Moderate"
          : goalImpact.impactLevel ===
            "High"
          ? "⚠ Significant"
          : "✓ None",

      color:
        goalImpact.impactLevel ===
        "High"
          ? "#E85D75"
          : goalImpact.impactLevel ===
            "Moderate"
          ? "#C9A84C"
          : "#2DCFB3",
    },

    {
      label: "Behavioral Risk",

      status: `${riskFlag} Risk`,

      color:
        riskFlag === "High"
          ? "#E85D75"
          : riskFlag === "Medium"
          ? "#C9A84C"
          : "#2DCFB3",
    },

    {
      label: "Affordability Score",

      status: `${score} / 100`,

      color:
        score >= 75
          ? "#2DCFB3"
          : score >= 50
          ? "#C9A84C"
          : "#E85D75",
    },
  ];
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const {
      userId,
      item,
      amount,
      category,
    } = body;

    const numericAmount =
      toNumber(amount);

    if (
      !userId ||
      typeof userId !== "string"
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

    if (
      !item ||
      typeof item !== "string" ||
      !item.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Body must include a valid item name.",
        },
        {
          status: 400,
        }
      );
    }

    if (numericAmount <= 0) {
      return NextResponse.json(
        {
          error:
            "Body must include a valid purchase amount.",
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

    const context =
      calculateFinancialContext(
        userData
      );

    const {
      currentBalance,
      averageMonthlyIncome,
      averageFixedObligations,
      averageSubscriptions,
      averageVariableSpending,
      averagePlannedSavings,
      availableToSpend,
      emergencyCurrent,
      emergencyMinimum,
      emergencySafe,
      riskFlag,
    } = context;

    const balanceRatio =
      currentBalance > 0
        ? numericAmount /
          currentBalance
        : 1;

    const availableRatio =
      availableToSpend > 0
        ? numericAmount /
          availableToSpend
        : Infinity;

    const commitmentRatio =
      averageMonthlyIncome > 0
        ? (
            averageFixedObligations +
            averageSubscriptions
          ) /
          averageMonthlyIncome
        : 1;

    const emergencyAfterPurchase =
      emergencyCurrent -
      numericAmount;

    const goalImpact =
      calculateGoalImpact({
        amount: numericAmount,
        primaryGoal:
          context.primaryGoal,
        availableToSpend,
      });

    let score = 100;

    score -= Math.min(
      30,
      balanceRatio * 60
    );

    if (
      numericAmount >
      Math.max(
        0,
        availableToSpend
      )
    ) {
      score -= Math.min(
        30,
        Number.isFinite(
          availableRatio
        )
          ? availableRatio * 8
          : 30
      );
    }

    score -= Math.min(
      15,
      commitmentRatio * 20
    );

    if (
      emergencyMinimum > 0 &&
      emergencyAfterPurchase <
        emergencyMinimum
    ) {
      score -= 20;
    }

    if (
      goalImpact.impactLevel ===
      "High"
    ) {
      score -= 12;
    } else if (
      goalImpact.impactLevel ===
      "Moderate"
    ) {
      score -= 6;
    }

    if (riskFlag === "High") {
      score -= 10;
    } else if (
      riskFlag === "Medium"
    ) {
      score -= 5;
    }

    score = clamp(
      Math.round(score),
      0,
      100
    );

    let verdict;
    let recommendation;

    if (score >= 75) {
      verdict =
        "Affordable — financially manageable";

      recommendation =
        `The ${item.trim()} appears affordable within your current financial position.\n\n` +
        `Your estimated safe monthly available amount is ${formatSAR(
          availableToSpend
        )}. The purchase should still be planned carefully so your emergency reserve and savings goals remain protected.`;
    } else if (score >= 50) {
      verdict =
        "Affordable — with planning";

      recommendation =
        `The ${item.trim()} may be affordable, but paying the full amount immediately could pressure your monthly cash flow.\n\n` +
        `Rashd recommends saving for the purchase or using a short payment schedule that stays below your monthly available amount of ${formatSAR(
          availableToSpend
        )}.\n\n` +
        goalImpact.message;
    } else {
      verdict =
        "Not recommended right now";

      recommendation =
        `Buying the ${item.trim()} now would place significant pressure on your safe monthly cash flow.\n\n` +
        `Your estimated available amount after commitments, spending, and planned savings is ${formatSAR(
          availableToSpend
        )} per month.\n\n` +
        `${
          emergencySafe
            ? "Your emergency fund is currently protected, but this purchase may reduce that safety."
            : "Your emergency fund is already below its protected minimum."
        }\n\n` +
        goalImpact.message;
    }

    const paymentStrategies =
      buildPaymentStrategies({
        amount: numericAmount,
        availableToSpend,
        currentBalance,
      });

    const factors = createFactors({
      amount: numericAmount,
      context,
      score,
      goalImpact,
    });

    return NextResponse.json({
      userId,

      item: item.trim(),
      amount: numericAmount,
      category:
        category || "Other",

      score,
      verdict,
      recommendation,

      factors,
      goalImpact,
      paymentStrategies,

      context: {
        currentBalance,

        averageMonthlyIncome,
        averageFixedObligations,
        averageSubscriptions,
        averageVariableSpending,
        averagePlannedSavings,

        incomeAfterCommitments:
          context.incomeAfterCommitments,

        remainingAfterSpending:
          context.remainingAfterSpending,

        availableToSpend,

        emergencyCurrent,
        emergencyMinimum,
        emergencyTarget:
          context.emergencyTarget,

        emergencyAfterPurchase,
        emergencySafe:
          emergencyAfterPurchase >=
          emergencyMinimum,

        riskFlag,

        primaryGoal:
          context.primaryGoal
            ?.goal_name || null,
      },

      engine:
        "rashd-cash-flow-affordability-v2",
    });
  } catch (error) {
    console.error(
      "Purchase evaluation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Rashd could not evaluate the purchase.",
      },
      {
        status: 500,
      }
    );
  }
}
