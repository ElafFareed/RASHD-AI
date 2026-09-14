// app/api/savings-goals/route.js

import { NextResponse } from "next/server";
import { getUserDataset } from "../../../lib/dataset";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function formatSAR(value) {
  return `SAR ${Math.round(
    Math.abs(toNumber(value))
  ).toLocaleString()}`;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function monthsUntilDeadline(value) {
  const deadline = parseDate(value);

  if (!deadline) {
    return 12;
  }

  const today = new Date();

  const months =
    (deadline.getFullYear() -
      today.getFullYear()) *
      12 +
    deadline.getMonth() -
    today.getMonth();

  return Math.max(1, months);
}

function getMonthlyAverage(
  monthlySummary = [],
  fieldNames = []
) {
  if (monthlySummary.length === 0) {
    return 0;
  }

  const total = monthlySummary.reduce(
    (sum, record) => {
      const fieldName =
        fieldNames.find(
          (name) =>
            record[name] !== undefined &&
            record[name] !== ""
        );

      return (
        sum +
        toNumber(
          fieldName
            ? record[fieldName]
            : 0
        )
      );
    },
    0
  );

  return total / monthlySummary.length;
}

function calculateMonthlyCashFlow(userData) {
  const profile =
    userData.profile || {};

  const monthlySummary =
    userData.monthlySummary || [];

  const monthlyIncome =
    getMonthlyAverage(
      monthlySummary,
      ["salary", "income"]
    ) ||
    toNumber(
      profile.monthly_income_average,
      profile.monthly_income
    );

  const fixedObligations =
    getMonthlyAverage(
      monthlySummary,
      [
        "fixed_obligations",
        "liabilities",
      ]
    );

  const subscriptions =
    getMonthlyAverage(
      monthlySummary,
      ["subscriptions"]
    );

  const variableSpending =
    getMonthlyAverage(
      monthlySummary,
      [
        "variable_spending",
        "spending",
      ]
    );

  const plannedSavings =
    getMonthlyAverage(
      monthlySummary,
      [
        "planned_savings",
        "savings_contribution",
      ]
    );

  const availableToSpend =
    monthlyIncome -
    fixedObligations -
    subscriptions -
    variableSpending -
    plannedSavings;

  return {
    monthlyIncome,
    fixedObligations,
    subscriptions,
    variableSpending,
    plannedSavings,
    availableToSpend,
  };
}

function calculateFeasibility({
  minimumMonthly,
  availableMonthly,
  progress,
}) {
  if (progress >= 100) {
    return "Completed";
  }

  if (minimumMonthly <= 0) {
    return "Easily Achievable";
  }

  if (availableMonthly <= 0) {
    return "Unrealistic";
  }

  const ratio =
    minimumMonthly /
    availableMonthly;

  if (ratio <= 0.35) {
    return "Easily Achievable";
  }

  if (ratio <= 0.7) {
    return "Achievable";
  }

  if (ratio <= 1) {
    return "Difficult";
  }

  return "Unrealistic";
}

function buildGoalSuggestion(
  goal,
  availableMonthly
) {
  const targetAmount = toNumber(
    goal.target_amount ??
      goal.targetAmount ??
      goal.target
  );

  const currentAmount = toNumber(
    goal.current_amount ??
      goal.currentAmount ??
      goal.current
  );

  const targetDate =
    goal.target_date ??
    goal.targetDate ??
    goal.deadline ??
    "";

  const remainingAmount = Math.max(
    0,
    targetAmount - currentAmount
  );

  const monthsRemaining =
    monthsUntilDeadline(targetDate);

  const minimumMonthly =
    remainingAmount > 0
      ? Math.ceil(
          remainingAmount /
            monthsRemaining
        )
      : 0;

  const safeAvailableMonthly =
    Math.max(
      0,
      availableMonthly
    );

  const recommendedMonthly =
    remainingAmount <= 0
      ? 0
      : Math.min(
          remainingAmount,
          Math.max(
            100,
            Math.min(
              minimumMonthly,
              safeAvailableMonthly * 0.6
            )
          )
        );

  const aggressiveMonthly =
    remainingAmount <= 0
      ? 0
      : Math.min(
          remainingAmount,
          Math.max(
            recommendedMonthly,
            safeAvailableMonthly * 0.85
          )
        );

  const progress =
    targetAmount > 0
      ? Math.min(
          100,
          Math.round(
            (currentAmount /
              targetAmount) *
              100
          )
        )
      : 0;

  const feasibility =
    calculateFeasibility({
      minimumMonthly,
      availableMonthly:
        safeAvailableMonthly,
      progress,
    });

  const projectedMonths =
    recommendedMonthly > 0
      ? Math.ceil(
          remainingAmount /
            recommendedMonthly
        )
      : 0;

  let recommendation;

  if (progress >= 100) {
    recommendation =
      "This goal is already complete.";
  } else if (
    feasibility ===
    "Easily Achievable"
  ) {
    recommendation =
      `A monthly contribution of approximately ${formatSAR(
        recommendedMonthly
      )} should fit comfortably within the current cash flow.`;
  } else if (
    feasibility === "Achievable"
  ) {
    recommendation =
      `Contribute approximately ${formatSAR(
        recommendedMonthly
      )} per month and monitor discretionary spending.`;
  } else if (
    feasibility === "Difficult"
  ) {
    recommendation =
      `The goal requires at least ${formatSAR(
        minimumMonthly
      )} per month, which uses most of the available monthly cash flow.`;
  } else {
    recommendation =
      `The required ${formatSAR(
        minimumMonthly
      )} monthly contribution exceeds the estimated safe capacity. Extend the deadline or reduce the target.`;
  }

  return {
    goalId:
      goal.goal_id ||
      goal.id ||
      null,

    name:
      goal.goal_name ||
      goal.name ||
      "Savings Goal",

    targetAmount,
    currentAmount,
    targetDate,

    remainingAmount,
    monthsRemaining,
    progress,

    minimumMonthly,
    recommendedMonthly:
      Math.round(
        recommendedMonthly
      ),
    aggressiveMonthly:
      Math.round(
        aggressiveMonthly
      ),

    projectedMonths,
    feasibility,
    recommendation,
  };
}

function normalizeGoalInput(body) {
  return {
    userId:
      typeof body.userId === "string"
        ? body.userId.trim()
        : "",

    name: String(
      body.name ||
        body.goalName ||
        ""
    ).trim(),

    targetAmount: toNumber(
      body.targetAmount ??
        body.target_amount
    ),

    currentAmount: toNumber(
      body.currentAmount ??
        body.current_amount,
      0
    ),

    targetDate:
      body.targetDate ||
      body.target_date ||
      "",

    priority:
      body.priority ||
      "Medium",
  };
}

// GET /api/savings-goals?userId=U001
export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const userId =
      searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "userId is required.",
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

    const cashFlow =
      calculateMonthlyCashFlow(
        userData
      );

    const goals = (
      userData.goals || []
    ).map((goal) =>
      buildGoalSuggestion(
        goal,
        cashFlow.availableToSpend
      )
    );

    return NextResponse.json({
      userId,

      goals,

      summary: {
        goalCount:
          goals.length,

        totalTarget:
          goals.reduce(
            (sum, goal) =>
              sum +
              goal.targetAmount,
            0
          ),

        totalSaved:
          goals.reduce(
            (sum, goal) =>
              sum +
              goal.currentAmount,
            0
          ),

        availableMonthlyCashFlow:
          cashFlow.availableToSpend,

        recommendedMonthlyTotal:
          goals.reduce(
            (sum, goal) =>
              sum +
              goal.recommendedMonthly,
            0
          ),
      },

      cashFlow,

      persistence:
        "Synthetic goals come from the dataset. User-created goals are stored by the client in localStorage.",

      engine:
        "rashd-goal-planning-v2",
    });
  } catch (error) {
    console.error(
      "Savings goals GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load savings goals.",
      },
      {
        status: 500,
      }
    );
  }
}

// POST /api/savings-goals
// Validates and evaluates a new goal.
// It does not write to CSV files.
export async function POST(request) {
  try {
    const body =
      await request.json();

    const {
      userId,
      name,
      targetAmount,
      currentAmount,
      targetDate,
      priority,
    } = normalizeGoalInput(body);

    if (!userId) {
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

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Body must include a goal name.",
        },
        {
          status: 400,
        }
      );
    }

    if (targetAmount <= 0) {
      return NextResponse.json(
        {
          error:
            "targetAmount must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      currentAmount < 0 ||
      currentAmount >
        targetAmount
    ) {
      return NextResponse.json(
        {
          error:
            "currentAmount must be between zero and the target amount.",
        },
        {
          status: 400,
        }
      );
    }

    const deadline =
      parseDate(targetDate);

    if (!deadline) {
      return NextResponse.json(
        {
          error:
            "targetDate must be a valid date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      deadline <= new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "targetDate must be in the future.",
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

    const cashFlow =
      calculateMonthlyCashFlow(
        userData
      );

    const timestamp =
      Date.now();

    const newGoal = {
      id: `local-${timestamp}`,
      goal_id:
        `LOCAL-${timestamp}`,

      user_id: userId,

      goal_name: name,
      target_amount:
        targetAmount,
      current_amount:
        currentAmount,
      target_date:
        targetDate,

      priority,
      status: "Active",

      source:
        "User-created demo goal",

      isLocal: true,
    };

    const evaluation =
      buildGoalSuggestion(
        newGoal,
        cashFlow.availableToSpend
      );

    return NextResponse.json(
      {
        goal: newGoal,

        evaluation,

        cashFlow,

        saved: false,

        persistence:
          "Save this returned goal in localStorage on the client. The API does not modify the CSV dataset.",

        engine:
          "rashd-goal-planning-v2",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Savings goals POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Rashd could not evaluate the savings goal.",
      },
      {
        status: 500,
      }
    );
  }
}
