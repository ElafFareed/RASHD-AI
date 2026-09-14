// app/api/dashboard/route.js

import { NextResponse } from "next/server";
import { getUserDataset } from "../../../lib/dataset";

const VALID_PERIODS = [1, 3, 6, 12];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function getTransactionDate(transaction) {
  const value =
    transaction.datetime ||
    transaction.date;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function filterTransactions(transactions, months) {
  if (!transactions.length) return [];

  const latest = new Date(
    Math.max(
      ...transactions
        .map(getTransactionDate)
        .filter(Boolean)
        .map((d) => d.getTime())
    )
  );

  const start = new Date(
    latest.getFullYear(),
    latest.getMonth() - months + 1,
    1
  );

  return transactions.filter((t) => {
    const d = getTransactionDate(t);
    return d && d >= start && d <= latest;
  });
}

function average(records, field) {
  if (!records.length) return 0;

  return (
    records.reduce(
      (sum, r) =>
        sum + toNumber(r[field]),
      0
    ) / records.length
  );
}

function calculateTopCategories(transactions) {
  const totals = {};

  transactions.forEach((t) => {
    const amount = toNumber(t.amount);

    if (
      t.type === "income" ||
      amount > 0
    )
      return;

    const category =
      t.category || "Other";

    totals[category] =
      (totals[category] || 0) +
      Math.abs(amount);
  });

  const total = Object.values(
    totals
  ).reduce((a, b) => a + b, 0);

  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage:
        total > 0
          ? Math.round(
              (amount / total) * 100
            )
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

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

    const period = VALID_PERIODS.includes(
      Number(
        searchParams.get("period")
      )
    )
      ? Number(
          searchParams.get("period")
        )
      : 3;

    const data =
      getUserDataset(userId);

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Synthetic profile not found.",
        },
        {
          status: 404,
        }
      );
    }

    const transactions =
      filterTransactions(
        data.transactions || [],
        period
      );

    const monthly =
      (data.monthlySummary || []).slice(
        -period
      );

    const profile =
      data.profile || {};

    const summary =
      data.summary || {};

    const income =
      average(monthly, "salary") ||
      average(monthly, "income") ||
      toNumber(
        profile.monthly_income_average,
        profile.monthly_income
      );

    const fixed =
      average(
        monthly,
        "fixed_obligations"
      ) ||
      average(
        monthly,
        "liabilities"
      );

    const subscriptions =
      average(
        monthly,
        "subscriptions"
      );

    const variable =
      average(
        monthly,
        "variable_spending"
      ) ||
      average(
        monthly,
        "spending"
      );

    const savings =
      average(
        monthly,
        "planned_savings"
      ) ||
      average(
        monthly,
        "savings_contribution"
      );

    const available =
      income -
      fixed -
      subscriptions -
      variable -
      savings;

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            toNumber(
              summary.impulsive_spending_score
            )
        )
      )
    );

    return NextResponse.json({
      userId,

      period,

      balance: toNumber(
        profile.current_balance
      ),

      monthlyIncome: income,

      fixedObligations: fixed,

      subscriptions,

      variableSpending:
        variable,

      plannedSavings:
        savings,

      availableToSpend:
        available,

      healthScore,

      riskFlag:
        summary.risk_flag ||
        "Unknown",

      topCategories:
        calculateTopCategories(
          transactions
        ),

      transactions,

      goals:
        data.goals || [],

      emergencyFund:
        data.emergencyFund ||
        null,

      engine:
        "rashd-dashboard-v2",
    });
  } catch (error) {
    console.error(
      "Dashboard API:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}