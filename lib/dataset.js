// lib/dataset.js

import fs from "node:fs";
import path from "node:path";

const DATA_DIRECTORY = path.join(
  process.cwd(),
  "data"
);

const SUPPORTED_PERIODS = [1, 3, 6, 12];

function parseValue(value) {
  const trimmed = String(value ?? "").trim();

  if (trimmed === "") {
    return "";
  }

  const normalized = trimmed.toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  const numberValue = Number(trimmed);

  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }

  return trimmed;
}

function parseCsvLine(line) {
  const values = [];

  let current = "";
  let insideQuotes = false;

  for (
    let index = 0;
    index < line.length;
    index += 1
  ) {
    const character = line[index];

    if (character === '"') {
      if (
        insideQuotes &&
        line[index + 1] === '"'
      ) {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

function readCsv(filename) {
  const filePath = path.join(
    DATA_DIRECTORY,
    filename
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Dataset file not found: ${filePath}`
    );
  }

  const fileContent = fs
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "");

  const lines = fileContent
    .split(/\r?\n/)
    .filter(
      (line) => line.trim() !== ""
    );

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(
    lines[0]
  ).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce(
      (row, header, index) => {
        row[header] = parseValue(
          values[index] ?? ""
        );

        return row;
      },
      {}
    );
  });
}

function normalizeUserId(userId) {
  return String(userId ?? "")
    .trim()
    .toUpperCase();
}

function parseTransactionDate(transaction) {
  const rawDate =
    transaction.datetime ||
    transaction.date;

  if (!rawDate) {
    return null;
  }

  const parsed = new Date(rawDate);

  if (
    Number.isNaN(parsed.getTime())
  ) {
    return null;
  }

  return parsed;
}

function parseMonthlyPeriod(record) {
  const rawPeriod =
    record.period ||
    record.period_start ||
    record.month_start ||
    record.date;

  if (rawPeriod) {
    const parsed = new Date(rawPeriod);

    if (
      !Number.isNaN(parsed.getTime())
    ) {
      return parsed;
    }
  }

  const monthValue = String(
    record.month ?? ""
  ).trim();

  if (!monthValue) {
    return null;
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

  const normalizedMonth =
    monthValue.toLowerCase();

  const monthIndex =
    monthNames[normalizedMonth];

  if (monthIndex === undefined) {
    return null;
  }

  const year =
    monthIndex >= 6 ? 2025 : 2026;

  return new Date(
    year,
    monthIndex,
    1
  );
}

function getLatestTransactionDate(
  transactions = []
) {
  const dates = transactions
    .map(parseTransactionDate)
    .filter(Boolean);

  if (dates.length === 0) {
    return null;
  }

  return new Date(
    Math.max(
      ...dates.map((dateValue) =>
        dateValue.getTime()
      )
    )
  );
}

function getPeriodStartDate(
  latestDate,
  months
) {
  if (!latestDate) {
    return null;
  }

  const safeMonths =
    SUPPORTED_PERIODS.includes(months)
      ? months
      : 1;

  return new Date(
    latestDate.getFullYear(),
    latestDate.getMonth() -
      safeMonths +
      1,
    1
  );
}

function filterTransactionsByPeriod(
  transactions,
  months
) {
  const latestDate =
    getLatestTransactionDate(
      transactions
    );

  if (!latestDate) {
    return [];
  }

  const startDate = getPeriodStartDate(
    latestDate,
    months
  );

  return transactions.filter(
    (transaction) => {
      const dateValue =
        parseTransactionDate(
          transaction
        );

      if (!dateValue) {
        return false;
      }

      return (
        dateValue >= startDate &&
        dateValue <= latestDate
      );
    }
  );
}

function filterMonthlySummaryByPeriod(
  monthlySummary,
  months
) {
  const datedRecords = monthlySummary
    .map((record) => ({
      record,
      date: parseMonthlyPeriod(record),
    }))
    .filter((item) => item.date);

  if (datedRecords.length === 0) {
    return [];
  }

  const latestDate = new Date(
    Math.max(
      ...datedRecords.map((item) =>
        item.date.getTime()
      )
    )
  );

  const startDate = getPeriodStartDate(
    latestDate,
    months
  );

  return datedRecords
    .filter(
      (item) =>
        item.date >= startDate &&
        item.date <= latestDate
    )
    .sort(
      (first, second) =>
        first.date - second.date
    )
    .map((item) => item.record);
}

function sumBy(
  records,
  getValue
) {
  return records.reduce(
    (total, record) => {
      const value = Number(
        getValue(record)
      );

      return (
        total +
        (Number.isFinite(value)
          ? value
          : 0)
      );
    },
    0
  );
}

function getExpenseTransactions(
  transactions
) {
  return transactions.filter(
    (transaction) =>
      transaction.type ===
        "expense" ||
      Number(transaction.amount) < 0
  );
}

function calculatePeriodMetrics({
  transactions,
  monthlySummary,
  months,
}) {
  const filteredTransactions =
    filterTransactionsByPeriod(
      transactions,
      months
    );

  const filteredMonthlySummary =
    filterMonthlySummaryByPeriod(
      monthlySummary,
      months
    );

  const expenses =
    getExpenseTransactions(
      filteredTransactions
    );

  const income = sumBy(
    filteredTransactions.filter(
      (transaction) =>
        transaction.type ===
          "income" ||
        Number(
          transaction.amount
        ) > 0
    ),
    (transaction) =>
      Math.abs(
        Number(transaction.amount)
      )
  );

  const totalSpent = sumBy(
    expenses,
    (transaction) =>
      Math.abs(
        Number(transaction.amount)
      )
  );

  const fixedObligations =
    filteredMonthlySummary.length > 0
      ? sumBy(
          filteredMonthlySummary,
          (record) =>
            record.fixed_obligations ??
            record.liabilities ??
            0
        )
      : sumBy(
          expenses.filter(
            (transaction) =>
              [
                "Debt Payment",
                "Rent",
                "Telecom",
                "Utilities",
                "Insurance",
                "Membership",
              ].includes(
                transaction.category
              )
          ),
          (transaction) =>
            Math.abs(
              Number(
                transaction.amount
              )
            )
        );

  const subscriptions =
    filteredMonthlySummary.length > 0
      ? sumBy(
          filteredMonthlySummary,
          (record) =>
            record.subscriptions ?? 0
        )
      : sumBy(
          expenses.filter(
            (transaction) =>
              transaction.category ===
              "Subscriptions"
          ),
          (transaction) =>
            Math.abs(
              Number(
                transaction.amount
              )
            )
        );

  const variableSpending =
    filteredMonthlySummary.length > 0
      ? sumBy(
          filteredMonthlySummary,
          (record) =>
            record.variable_spending ??
            record.spending ??
            0
        )
      : Math.max(
          0,
          totalSpent -
            fixedObligations -
            subscriptions
        );

  const plannedSavings =
    filteredMonthlySummary.length > 0
      ? sumBy(
          filteredMonthlySummary,
          (record) =>
            record.planned_savings ??
            record.savings_contribution ??
            0
        )
      : sumBy(
          filteredTransactions.filter(
            (transaction) =>
              transaction.type ===
                "transfer" ||
              transaction.category ===
                "Savings Transfer"
          ),
          (transaction) =>
            Math.abs(
              Number(
                transaction.amount
              )
            )
        );

  const weekendSpent = sumBy(
    expenses.filter(
      (transaction) =>
        transaction.is_weekend === true
    ),
    (transaction) =>
      Math.abs(
        Number(transaction.amount)
      )
  );

  const lateNightSpent = sumBy(
    expenses.filter(
      (transaction) =>
        transaction.is_late_night ===
        true
    ),
    (transaction) =>
      Math.abs(
        Number(transaction.amount)
      )
  );

  const nonEssentialSpent = sumBy(
    expenses.filter(
      (transaction) =>
        transaction.is_essential ===
        false
    ),
    (transaction) =>
      Math.abs(
        Number(transaction.amount)
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

  const availableToSpend =
    income -
    fixedObligations -
    subscriptions -
    variableSpending -
    plannedSavings;

  return {
    months,
    transactionCount:
      filteredTransactions.length,

    monthlyRecordCount:
      filteredMonthlySummary.length,

    income,
    totalSpent,
    fixedObligations,
    subscriptions,
    variableSpending,
    plannedSavings,
    availableToSpend,

    averageMonthlyIncome:
      months > 0
        ? income / months
        : 0,

    averageMonthlySpending:
      months > 0
        ? totalSpent / months
        : 0,

    averageMonthlyAvailable:
      months > 0
        ? availableToSpend / months
        : 0,

    weekendPercentage:
      totalSpent > 0
        ? Math.round(
            (weekendSpent /
              totalSpent) *
              100
          )
        : 0,

    lateNightPercentage:
      totalSpent > 0
        ? Math.round(
            (lateNightSpent /
              totalSpent) *
              100
          )
        : 0,

    nonEssentialPercentage:
      totalSpent > 0
        ? Math.round(
            (nonEssentialSpent /
              totalSpent) *
              100
          )
        : 0,

    burstCount,

    transactions:
      filteredTransactions,

    monthlySummary:
      filteredMonthlySummary,
  };
}

let cachedDataset = null;

export function getDataset() {
  if (cachedDataset) {
    return cachedDataset;
  }

  cachedDataset = {
    profiles: readCsv(
      "profiles.csv"
    ),

    transactions: readCsv(
      "transactions.csv"
    ),

    goals: readCsv(
      "goals.csv"
    ),

    liabilities: readCsv(
      "liabilities.csv"
    ),

    commitments: readCsv(
      "commitments.csv"
    ),

    subscriptions: readCsv(
      "subscriptions.csv"
    ),

    emergencyFunds: readCsv(
      "emergency_fund.csv"
    ),

    monthlySummaries: readCsv(
      "monthly_summary.csv"
    ),

    summaries: readCsv(
      "user_summary.csv"
    ),
  };

  return cachedDataset;
}

export function clearDatasetCache() {
  cachedDataset = null;
}

export function getAvailableUsers() {
  const { profiles } = getDataset();

  return profiles.map((profile) => ({
    userId: profile.user_id,
    persona:
      profile.persona ||
      "Demo Profile",

    city:
      profile.city || "",

    monthsAvailable:
      Number(
        profile.months_available
      ) || 12,
  }));
}

export function getUserDataset(
  userId
) {
  const normalizedUserId =
    normalizeUserId(userId);

  const dataset = getDataset();

  const profile =
    dataset.profiles.find(
      (item) =>
        normalizeUserId(
          item.user_id
        ) === normalizedUserId
    );

  if (!profile) {
    return null;
  }

  const filterByUser = (item) =>
    normalizeUserId(
      item.user_id
    ) === normalizedUserId;

  const transactions =
    dataset.transactions
      .filter(filterByUser)
      .sort((first, second) => {
        const firstDate =
          parseTransactionDate(first);

        const secondDate =
          parseTransactionDate(second);

        if (
          !firstDate ||
          !secondDate
        ) {
          return 0;
        }

        return (
          secondDate - firstDate
        );
      });

  const goals =
    dataset.goals.filter(
      filterByUser
    );

  const liabilities =
    dataset.liabilities.filter(
      filterByUser
    );

  const commitments =
    dataset.commitments.filter(
      filterByUser
    );

  const subscriptions =
    dataset.subscriptions.filter(
      filterByUser
    );

  const emergencyFund =
    dataset.emergencyFunds.find(
      filterByUser
    ) ?? null;

  const monthlySummary =
    dataset.monthlySummaries
      .filter(filterByUser)
      .sort((first, second) => {
        const firstDate =
          parseMonthlyPeriod(first);

        const secondDate =
          parseMonthlyPeriod(second);

        if (
          !firstDate ||
          !secondDate
        ) {
          return 0;
        }

        return firstDate - secondDate;
      });

  const summary =
    dataset.summaries.find(
      filterByUser
    ) ?? null;

  return {
    profile,
    transactions,
    goals,
    liabilities,
    commitments,
    subscriptions,
    emergencyFund,
    monthlySummary,
    summary,
  };
}

export function getUserPeriodDataset(
  userId,
  months = 1
) {
  const userData =
    getUserDataset(userId);

  if (!userData) {
    return null;
  }

  const safeMonths =
    SUPPORTED_PERIODS.includes(
      Number(months)
    )
      ? Number(months)
      : 1;

  const periodMetrics =
    calculatePeriodMetrics({
      transactions:
        userData.transactions,

      monthlySummary:
        userData.monthlySummary,

      months: safeMonths,
    });

  return {
    ...userData,
    period: safeMonths,
    periodMetrics,
    transactions:
      periodMetrics.transactions,
    monthlySummary:
      periodMetrics.monthlySummary,
  };
}

export function getSupportedPeriods() {
  return [...SUPPORTED_PERIODS];
}
