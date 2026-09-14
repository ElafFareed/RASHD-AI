// app/api/transactions/route.js

import { NextResponse } from "next/server";
import { getUserDataset } from "../../../lib/dataset";

const VALID_PERIODS = [1, 3, 6, 12];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function filterByPeriod(transactions, months) {
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

function buildSummary(transactions) {
  let income = 0;
  let expenses = 0;

  const categoryTotals = {};

  transactions.forEach((transaction) => {
    const amount = toNumber(transaction.amount);

    if (
      transaction.type === "income" ||
      amount > 0
    ) {
      income += Math.abs(amount);
    } else {
      expenses += Math.abs(amount);

      const category =
        transaction.category || "Other";

      categoryTotals[category] =
        (categoryTotals[category] || 0) +
        Math.abs(amount);
    }
  });

  return {
    income,
    expenses,
    net: income - expenses,

    topCategories: Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId =
      searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          error: "userId is required.",
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
            "Synthetic profile not found.",
        },
        {
          status: 404,
        }
      );
    }

    const category =
      searchParams.get("category");

    const merchant =
      searchParams.get("merchant");

    const type =
      searchParams.get("type");

    const period = VALID_PERIODS.includes(
      Number(searchParams.get("period"))
    )
      ? Number(
          searchParams.get("period")
        )
      : 3;

    let transactions =
      filterByPeriod(
        userData.transactions,
        period
      );

    if (category) {
      transactions =
        transactions.filter(
          (t) =>
            t.category === category
        );
    }

    if (merchant) {
      transactions =
        transactions.filter((t) =>
          (
            t.merchant || ""
          )
            .toLowerCase()
            .includes(
              merchant.toLowerCase()
            )
        );
    }

    if (type) {
      transactions =
        transactions.filter(
          (t) => t.type === type
        );
    }

    transactions.sort(
      (a, b) =>
        getTransactionDate(b) -
        getTransactionDate(a)
    );

    return NextResponse.json({
      userId,
      period,

      count: transactions.length,

      summary:
        buildSummary(
          transactions
        ),

      transactions,
    });
  } catch (error) {
    console.error(
      "Transactions API:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load transactions.",
      },
      {
        status: 500,
      }
    );
  }
}