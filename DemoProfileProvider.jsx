"use client";
// components/DemoProfileProvider.jsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const DemoProfileContext = createContext(null);

const SUPPORTED_PERIODS = [1, 3, 6, 12];

const FIXED_CATEGORIES = new Set([
  "Debt Payment",
  "Rent",
  "Telecom",
  "Utilities",
  "Insurance",
  "Membership",
]);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
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
  const rawValue =
    record.period ||
    record.period_start ||
    record.date;

  if (rawValue) {
    const parsed = new Date(rawValue);

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

  const monthIndex =
    monthNames[monthText];

  if (monthIndex === undefined) {
    return null;
  }

  const year =
    monthIndex >= 6
      ? 2025
      : 2026;

  return new Date(year, monthIndex, 1);
}

function getLatestDate(records, parser) {
  const validDates = records
    .map(parser)
    .filter(Boolean);

  if (validDates.length === 0) {
    return null;
  }

  return new Date(
    Math.max(
      ...validDates.map((item) =>
        item.getTime()
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
    return [];
  }

  const startDate =
    getPeriodStartDate(
      latestDate,
      period
    );

  return transactions.filter(
    (transaction) => {
      const transactionDate =
        getTransactionDate(
          transaction
        );

      if (!transactionDate) {
        return false;
      }

      return (
        transactionDate >= startDate &&
        transactionDate <= latestDate
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
    return [];
  }

  const startDate =
    getPeriodStartDate(
      latestDate,
      period
    );

  return monthlySummary
    .filter((record) => {
      const recordDate =
        getMonthlyRecordDate(record);

      if (!recordDate) {
        return false;
      }

      return (
        recordDate >= startDate &&
        recordDate <= latestDate
      );
    })
    .sort((first, second) => {
      const firstDate =
        getMonthlyRecordDate(first);

      const secondDate =
        getMonthlyRecordDate(second);

      return firstDate - secondDate;
    });
}

function getExpenseTransactions(
  transactions = []
) {
  return transactions.filter(
    (transaction) =>
      transaction.type === "expense"
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
      transaction.type === "transfer" ||
      transaction.category ===
        "Savings Transfer"
  );
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

function calculateTopCategories(
  transactions = []
) {
  const totals = {};

  getExpenseTransactions(
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

  const excludedCategories = new Set([
    "Debt Payment",
    "Rent",
    "Telecom",
    "Utilities",
    "Insurance",
    "Membership",
    "Subscriptions",
  ]);

  const filteredEntries =
    Object.entries(totals).filter(
      ([category]) =>
        !excludedCategories.has(
          category
        )
    );

  const totalVariableSpending =
    filteredEntries.reduce(
      (sum, [, amount]) =>
        sum + amount,
      0
    );

  return filteredEntries
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

function calculateBehaviorMetrics(
  expenses = []
) {
  const totalSpent =
    sumTransactions(expenses);

  const weekendSpent =
    sumTransactions(
      expenses.filter(
        (transaction) =>
          transaction.is_weekend ===
          true
      )
    );

  const lateNightSpent =
    sumTransactions(
      expenses.filter(
        (transaction) =>
          transaction.is_late_night ===
          true
      )
    );

  const nonEssentialSpent =
    sumTransactions(
      expenses.filter(
        (transaction) =>
          transaction.is_essential ===
          false
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

  const weekendPercentage =
    totalSpent > 0
      ? Math.round(
          (weekendSpent /
            totalSpent) *
            100
        )
      : 0;

  const lateNightPercentage =
    totalSpent > 0
      ? Math.round(
          (lateNightSpent /
            totalSpent) *
            100
        )
      : 0;

  const nonEssentialPercentage =
    totalSpent > 0
      ? Math.round(
          (nonEssentialSpent /
            totalSpent) *
            100
        )
      : 0;

  const impulsiveScore = Math.min(
    100,
    Math.round(
      weekendPercentage * 0.35 +
        lateNightPercentage * 1.2 +
        nonEssentialPercentage *
          0.45 +
        burstCount * 3
    )
  );

  const riskFlag =
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
    riskFlag,
  };
}

function calculateHealthScore({
  income,
  fixedObligations,
  subscriptions,
  variableSpending,
  plannedSavings,
  emergencyFund,
  behavior,
}) {
  if (income <= 0) {
    return 0;
  }

  const totalOutflow =
    fixedObligations +
    subscriptions +
    variableSpending +
    plannedSavings;

  const budgetScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        Math.max(
          0,
          (totalOutflow /
            income -
            1) *
            100
        )
    )
  );

  const savingsRate =
    plannedSavings / income;

  const savingsScore = Math.min(
    100,
    savingsRate * 500
  );

  const fixedRatio =
    (fixedObligations +
      subscriptions) /
    income;

  const commitmentScore =
    Math.max(
      0,
      100 -
        fixedRatio * 120
    );

  const emergencyCurrent =
    toNumber(
      emergencyFund?.current_amount
    );

  const emergencyMinimum =
    toNumber(
      emergencyFund?.minimum_reserve
    );

  const emergencyScore =
    emergencyMinimum > 0
      ? Math.min(
          100,
          (emergencyCurrent /
            emergencyMinimum) *
            100
        )
      : 50;

  const behaviorScore =
    100 -
    behavior.impulsiveScore;

  return Math.round(
    budgetScore * 0.25 +
      savingsScore * 0.2 +
      commitmentScore * 0.2 +
      emergencyScore * 0.15 +
      behaviorScore * 0.2
  );
}

function createEmptySnapshot(period = 1) {
  return {
    selectedPeriod: period,

    currentBalance: 0,

    periodIncome: 0,
    fixedObligations: 0,
    subscriptions: 0,
    variableSpending: 0,
    plannedSavings: 0,

    incomeAfterCommitments: 0,
    remainingAfterSpending: 0,
    availableToSpend: 0,

    averageMonthlyIncome: 0,
    averageMonthlyFixedObligations: 0,
    averageMonthlySubscriptions: 0,
    averageMonthlyVariableSpending: 0,
    averageMonthlyPlannedSavings: 0,
    averageMonthlyAvailableToSpend: 0,

    monthlyBudget: 0,
    budgetRemaining: 0,
    budgetUtilization: 0,
    savingsRate: 0,
    fixedObligationRatio: 0,

    healthScore: 0,
    impulsiveScore: 0,
    riskFlag: "Unknown",

    weekendPercentage: 0,
    lateNightPercentage: 0,
    nonEssentialPercentage: 0,
    burstCount: 0,

    topCategories: [],

    transactionCount: 0,
    monthlyRecordCount: 0,
  };
}

function calculateSnapshot(
  profileData,
  selectedPeriod
) {
  if (!profileData) {
    return createEmptySnapshot(
      selectedPeriod
    );
  }

  const profile =
    profileData.profile || {};

  const allTransactions =
    profileData.transactions || [];

  const allMonthlySummary =
    profileData.monthlySummary || [];

  const emergencyFund =
    profileData.emergencyFund ||
    null;

  const transactions =
    filterTransactionsByPeriod(
      allTransactions,
      selectedPeriod
    );

  const monthlySummary =
    filterMonthlySummaryByPeriod(
      allMonthlySummary,
      selectedPeriod
    );

  const expenses =
    getExpenseTransactions(
      transactions
    );

  const incomeTransactions =
    getIncomeTransactions(
      transactions
    );

  const savingsTransfers =
    getSavingsTransfers(
      transactions
    );

  const periodIncome =
    monthlySummary.length > 0
      ? monthlySummary.reduce(
          (sum, record) =>
            sum +
            toNumber(
              record.salary
            ),
          0
        )
      : sumTransactions(
          incomeTransactions
        );

  const fixedObligations =
    monthlySummary.length > 0
      ? monthlySummary.reduce(
          (sum, record) =>
            sum +
            toNumber(
              record.fixed_obligations
            ),
          0
        )
      : sumTransactions(
          expenses.filter(
            (transaction) =>
              FIXED_CATEGORIES.has(
                transaction.category
              )
          )
        );

  const subscriptions =
    monthlySummary.length > 0
      ? monthlySummary.reduce(
          (sum, record) =>
            sum +
            toNumber(
              record.subscriptions
            ),
          0
        )
      : sumTransactions(
          expenses.filter(
            (transaction) =>
              transaction.category ===
              "Subscriptions"
          )
        );

  const variableSpending =
    monthlySummary.length > 0
      ? monthlySummary.reduce(
          (sum, record) =>
            sum +
            toNumber(
              record.variable_spending
            ),
          0
        )
      : sumTransactions(
          expenses.filter(
            (transaction) =>
              !FIXED_CATEGORIES.has(
                transaction.category
              ) &&
              transaction.category !==
                "Subscriptions"
          )
        );

  const plannedSavings =
    monthlySummary.length > 0
      ? monthlySummary.reduce(
          (sum, record) =>
            sum +
            toNumber(
              record.planned_savings
            ),
          0
        )
      : sumTransactions(
          savingsTransfers
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

  const monthlyBudget =
    toNumber(
      profile.monthly_budget
    );

  const periodBudget =
    monthlyBudget *
    selectedPeriod;

  const budgetRemaining =
    periodBudget -
    fixedObligations -
    subscriptions -
    variableSpending;

  const budgetUtilization =
    periodBudget > 0
      ? Math.round(
          ((fixedObligations +
            subscriptions +
            variableSpending) /
            periodBudget) *
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

  const fixedObligationRatio =
    periodIncome > 0
      ? Math.round(
          ((fixedObligations +
            subscriptions) /
            periodIncome) *
            100
        )
      : 0;

  const behavior =
    calculateBehaviorMetrics(
      expenses
    );

  const healthScore =
    calculateHealthScore({
      income: periodIncome,
      fixedObligations,
      subscriptions,
      variableSpending,
      plannedSavings,
      emergencyFund,
      behavior,
    });

  return {
    selectedPeriod,

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

    averageMonthlyIncome:
      periodIncome /
      selectedPeriod,

    averageMonthlyFixedObligations:
      fixedObligations /
      selectedPeriod,

    averageMonthlySubscriptions:
      subscriptions /
      selectedPeriod,

    averageMonthlyVariableSpending:
      variableSpending /
      selectedPeriod,

    averageMonthlyPlannedSavings:
      plannedSavings /
      selectedPeriod,

    averageMonthlyAvailableToSpend:
      availableToSpend /
      selectedPeriod,

    monthlyBudget,
    budgetRemaining,
    budgetUtilization,
    savingsRate,
    fixedObligationRatio,

    healthScore,

    impulsiveScore:
      behavior.impulsiveScore,

    riskFlag:
      behavior.riskFlag,

    weekendPercentage:
      behavior.weekendPercentage,

    lateNightPercentage:
      behavior.lateNightPercentage,

    nonEssentialPercentage:
      behavior.nonEssentialPercentage,

    burstCount:
      behavior.burstCount,

    topCategories:
      calculateTopCategories(
        transactions
      ),

    transactionCount:
      transactions.length,

    monthlyRecordCount:
      monthlySummary.length,
  };
}

export function DemoProfileProvider({
  children,
}) {
  const [userId, setUserId] =
    useState("");

  const [
    profileData,
    setProfileData,
  ] = useState(null);

  const [
    selectedPeriod,
    setSelectedPeriodState,
  ] = useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const setSelectedPeriod =
    useCallback((period) => {
      const numericPeriod =
        Number(period);

      if (
        !SUPPORTED_PERIODS.includes(
          numericPeriod
        )
      ) {
        return;
      }

      setSelectedPeriodState(
        numericPeriod
      );

      localStorage.setItem(
        "rashdSelectedPeriod",
        String(numericPeriod)
      );
    }, []);

  const loadProfile = useCallback(
    async ({
      randomize = false,
    } = {}) => {
      setLoading(true);
      setError("");

      try {
        const savedUserId =
          randomize
            ? ""
            : localStorage.getItem(
                "rashdDemoUserId"
              );

        const endpoint = savedUserId
          ? `/api/demo-profile?userId=${encodeURIComponent(
              savedUserId
            )}`
          : "/api/demo-profile";

        const response = await fetch(
          endpoint,
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load the synthetic financial profile."
          );
        }

        localStorage.setItem(
          "rashdDemoUserId",
          data.userId
        );

        setUserId(data.userId);
        setProfileData(data);
      } catch (loadError) {
        console.error(
          "Demo profile error:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the synthetic financial profile."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    try {
      const savedPeriod =
        Number(
          localStorage.getItem(
            "rashdSelectedPeriod"
          )
        );

      if (
        SUPPORTED_PERIODS.includes(
          savedPeriod
        )
      ) {
        setSelectedPeriodState(
          savedPeriod
        );
      }
    } catch {
      setSelectedPeriodState(1);
    }

    loadProfile();
  }, [loadProfile]);

  const snapshot = useMemo(
    () =>
      calculateSnapshot(
        profileData,
        selectedPeriod
      ),
    [
      profileData,
      selectedPeriod,
    ]
  );

  const periodTransactions =
    useMemo(
      () =>
        filterTransactionsByPeriod(
          profileData?.transactions ||
            [],
          selectedPeriod
        ),
      [
        profileData,
        selectedPeriod,
      ]
    );

  const periodMonthlySummary =
    useMemo(
      () =>
        filterMonthlySummaryByPeriod(
          profileData?.monthlySummary ||
            [],
          selectedPeriod
        ),
      [
        profileData,
        selectedPeriod,
      ]
    );

  const value = useMemo(
    () => ({
      userId,

      profileData,

      profile:
        profileData?.profile ||
        null,

      transactions:
        profileData?.transactions ||
        [],

      periodTransactions,

      goals:
        profileData?.goals || [],

      liabilities:
        profileData?.liabilities ||
        [],

      commitments:
        profileData?.commitments ||
        [],

      subscriptions:
        profileData?.subscriptions ||
        [],

      emergencyFund:
        profileData?.emergencyFund ||
        null,

      monthlySummary:
        profileData?.monthlySummary ||
        [],

      periodMonthlySummary,

      summary:
        profileData?.summary ||
        null,

      selectedPeriod,
      supportedPeriods:
        SUPPORTED_PERIODS,

      setSelectedPeriod,

      snapshot,

      loading,
      error,

      reloadProfile: () =>
        loadProfile(),

      loadAnotherProfile: () =>
        loadProfile({
          randomize: true,
        }),
    }),
    [
      userId,
      profileData,
      periodTransactions,
      periodMonthlySummary,
      selectedPeriod,
      setSelectedPeriod,
      snapshot,
      loading,
      error,
      loadProfile,
    ]
  );

  return (
    <DemoProfileContext.Provider
      value={value}
    >
      {children}
    </DemoProfileContext.Provider>
  );
}

export function useDemoProfile() {
  const context = useContext(
    DemoProfileContext
  );

  if (!context) {
    throw new Error(
      "useDemoProfile must be used inside DemoProfileProvider."
    );
  }

  return context;
}