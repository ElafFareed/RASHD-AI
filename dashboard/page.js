"use client";
// app/dashboard/page.js

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AppShell from "../../components/AppShell";
import {
  Badge,
  StatCard,
} from "../../components/UI";

import { useDemoProfile } from "../../components/DemoProfileProvider";

const CATEGORY_COLORS = {
  Food: "#E85D75",
  Coffee: "#D977A5",
  Transport: "#4FA3E0",
  Shopping: "#C9A84C",
  Entertainment: "#2DCFB3",
  Groceries: "#34D399",
  Health: "#F59E0B",
  Education: "#9B7EDE",
  "Personal Care": "#F472B6",
  Other: "#8B89A0",
};

const PERIOD_LABELS = {
  1: "1 Month",
  3: "3 Months",
  6: "6 Months",
  12: "12 Months",
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function formatSAR(value) {
  return `SAR ${Math.round(
    toNumber(value)
  ).toLocaleString()}`;
}

function formatPercentage(value) {
  return `${Math.round(
    toNumber(value)
  )}%`;
}

function getFirstName(name) {
  return (
    name?.trim()?.split(" ")?.[0] ||
    "User"
  );
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return String(value);
  }

  return parsedDate.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
}

function formatMonth(value) {
  if (!value) {
    return "Month";
  }

  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return String(value);
  }

  return parsedDate.toLocaleDateString(
    "en-US",
    {
      month: "short",
    }
  );
}

function getTransactionDate(
  transaction
) {
  const dateValue =
    transaction.datetime ||
    `${transaction.date || ""}T${
      transaction.time || "00:00"
    }`;

  const parsedDate = new Date(
    dateValue
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return new Date(0);
  }

  return parsedDate;
}

function getMonthlyRecordDate(record) {
  const dateValue =
    record.period ||
    record.period_start ||
    record.date;

  if (dateValue) {
    const parsedDate = new Date(
      dateValue
    );

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return parsedDate;
    }
  }

  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const monthIndex =
    monthMap[record.month];

  if (monthIndex === undefined) {
    return null;
  }

  const year =
    monthIndex >= 6
      ? 2025
      : 2026;

  return new Date(
    year,
    monthIndex,
    1
  );
}

function buildBalanceTrend({
  monthlySummary,
  transactions,
  currentBalance,
}) {
  if (
    Array.isArray(monthlySummary) &&
    monthlySummary.length > 0
  ) {
    return monthlySummary.map(
      (record, index) => {
        const date =
          getMonthlyRecordDate(
            record
          );

        return {
          key:
            record.period ||
            `${record.month}-${index}`,

          label:
            date
              ? formatMonth(date)
              : record.month ||
                `M${index + 1}`,

          value: toNumber(
            record.closing_balance,
            0
          ),
        };
      }
    );
  }

  const monthlyNet = {};

  transactions.forEach(
    (transaction) => {
      const transactionDate =
        getTransactionDate(
          transaction
        );

      if (
        transactionDate.getTime() ===
        0
      ) {
        return;
      }

      const key = `${transactionDate.getFullYear()}-${String(
        transactionDate.getMonth() +
          1
      ).padStart(2, "0")}`;

      monthlyNet[key] =
        (monthlyNet[key] || 0) +
        toNumber(
          transaction.amount
        );
    }
  );

  const monthKeys =
    Object.keys(monthlyNet).sort();

  if (monthKeys.length === 0) {
    return [
      {
        key: "current",
        label: "Current",
        value: currentBalance,
      },
    ];
  }

  const closingBalances =
    new Array(monthKeys.length);

  closingBalances[
    monthKeys.length - 1
  ] = currentBalance;

  for (
    let index =
      monthKeys.length - 2;
    index >= 0;
    index -= 1
  ) {
    const followingMonth =
      monthKeys[index + 1];

    closingBalances[index] =
      closingBalances[index + 1] -
      monthlyNet[followingMonth];
  }

  return monthKeys.map(
    (key, index) => {
      const [year, month] =
        key.split("-");

      return {
        key,

        label: new Date(
          Number(year),
          Number(month) - 1,
          1
        ).toLocaleDateString(
          "en-US",
          {
            month: "short",
          }
        ),

        value:
          closingBalances[index],
      };
    }
  );
}

function createInsights({
  snapshot,
  goals,
  selectedPeriod,
}) {
  const insights = [];

  if (
    snapshot.fixedObligationRatio >=
    50
  ) {
    insights.push({
      icon: "⚠",
      text: `${formatPercentage(
        snapshot.fixedObligationRatio
      )} of income is committed to fixed obligations and subscriptions during this period.`,
      type: "warning",
    });
  } else {
    insights.push({
      icon: "✓",
      text: `Fixed commitments use ${formatPercentage(
        snapshot.fixedObligationRatio
      )} of income, leaving greater financial flexibility.`,
      type: "positive",
    });
  }

  if (
    snapshot.availableToSpend >= 0
  ) {
    insights.push({
      icon: "✦",
      text: `After commitments, variable spending, and planned savings, approximately ${formatSAR(
        snapshot.availableToSpend
      )} remains available across the selected ${PERIOD_LABELS[
        selectedPeriod
      ].toLowerCase()}.`,
      type: "positive",
    });
  } else {
    insights.push({
      icon: "!",
      text: `Cash outflows exceed period income by approximately ${formatSAR(
        Math.abs(
          snapshot.availableToSpend
        )
      )}.`,
      type: "warning",
    });
  }

  const topCategory =
    snapshot.topCategories?.[0];

  if (topCategory) {
    insights.push({
      icon: "◉",
      text: `${topCategory.name} is the highest variable-spending category at ${formatSAR(
        topCategory.amount
      )}, representing ${formatPercentage(
        topCategory.percentage
      )} of variable spending.`,
      type: "neutral",
    });
  }

  if (
    snapshot.nonEssentialPercentage >=
    45
  ) {
    insights.push({
      icon: "🛍️",
      text: `${formatPercentage(
        snapshot.nonEssentialPercentage
      )} of expenses were non-essential during this period.`,
      type: "warning",
    });
  }

  const primaryGoal = goals?.[0];

  if (
    primaryGoal &&
    insights.length < 4
  ) {
    const remaining = Math.max(
      0,
      toNumber(
        primaryGoal.target_amount
      ) -
        toNumber(
          primaryGoal.current_amount
        )
    );

    insights.push({
      icon: "🎯",
      text: `${formatSAR(
        remaining
      )} remains to complete the ${
        primaryGoal.goal_name
      } goal.`,
      type: "neutral",
    });
  }

  return insights.slice(0, 3);
}

function FinancialFlowItem({
  icon,
  label,
  value,
  sub,
  color,
  isLast = false,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 0",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: `${color}15`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: 11,
              marginBottom: 3,
            }}
          >
            {label}
          </div>

          <div
            style={{
              color,
              fontFamily:
                "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {formatSAR(value)}
          </div>

          {sub && (
            <div
              style={{
                color:
                  "var(--color-text-dim)",
                fontSize: 10,
                marginTop: 3,
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>

      {!isLast && (
        <div
          style={{
            marginLeft: 18,
            height: 16,
            borderLeft:
              "1px dashed var(--color-border-strong)",
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const {
    userId,
    profile,
    goals,

    periodTransactions,
    periodMonthlySummary,

    selectedPeriod,
    supportedPeriods,
    setSelectedPeriod,

    snapshot,

    loading,
    error,
    reloadProfile,
  } = useDemoProfile();

  const [userName, setUserName] =
    useState("User");

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "rashdUser"
        );

      if (!savedUser) {
        return;
      }

      const parsedUser =
        JSON.parse(savedUser);

      setUserName(
        parsedUser?.name ||
          parsedUser?.email?.split(
            "@"
          )[0] ||
          "User"
      );
    } catch (userError) {
      console.warn(
        "Unable to read Rashd user:",
        userError
      );
    }
  }, []);

  const spendingData =
    useMemo(() => {
      return (
        snapshot.topCategories || []
      )
        .slice(0, 5)
        .map((category) => ({
          cat: category.name,
          pct:
            category.percentage,
          amount: category.amount,
          color:
            CATEGORY_COLORS[
              category.name
            ] ||
            CATEGORY_COLORS.Other,
        }));
    }, [snapshot.topCategories]);

  const balanceTrend =
    useMemo(
      () =>
        buildBalanceTrend({
          monthlySummary:
            periodMonthlySummary,

          transactions:
            periodTransactions,

          currentBalance:
            snapshot.currentBalance,
        }),
      [
        periodMonthlySummary,
        periodTransactions,
        snapshot.currentBalance,
      ]
    );

  const maximumBalance =
    useMemo(() => {
      return Math.max(
        ...balanceTrend.map(
          (item) =>
            Math.max(
              0,
              toNumber(item.value)
            )
        ),
        1
      );
    }, [balanceTrend]);

  const insights = useMemo(
    () =>
      createInsights({
        snapshot,
        goals,
        selectedPeriod,
      }),
    [
      snapshot,
      goals,
      selectedPeriod,
    ]
  );

  const recentTransactions =
    useMemo(() => {
      return [
        ...periodTransactions,
      ]
        .sort(
          (first, second) =>
            getTransactionDate(
              second
            ) -
            getTransactionDate(
              first
            )
        )
        .slice(0, 5);
    }, [periodTransactions]);

  const primaryGoal = goals?.[0];

  const goalProgress =
    primaryGoal
      ? Math.min(
          100,
          Math.round(
            (toNumber(
              primaryGoal.current_amount
            ) /
              Math.max(
                1,
                toNumber(
                  primaryGoal.target_amount
                )
              )) *
              100
          )
        )
      : 0;

  const riskColor =
    snapshot.riskFlag === "High"
      ? "#E85D75"
      : snapshot.riskFlag ===
        "Medium"
      ? "#C9A84C"
      : "#2DCFB3";

  const availableColor =
    snapshot.availableToSpend >= 0
      ? "#2DCFB3"
      : "#E85D75";

  if (loading) {
    return (
      <AppShell>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            color:
              "var(--color-text-muted)",
          }}
        >
          <div
            style={{
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 30,
                marginBottom: 12,
              }}
            >
              📊
            </div>

            Loading financial
            dashboard...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !profile) {
    return (
      <AppShell>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: 32,
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: "100%",
              padding: 28,
              borderRadius: 16,
              background:
                "var(--color-surface)",
              border:
                "1px solid rgba(232,93,117,0.3)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 28,
                marginBottom: 12,
              }}
            >
              ⚠
            </div>

            <p
              style={{
                color: "#E85D75",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              {error ||
                "Unable to load the dashboard."}
            </p>

            <button
              className="btn-gold"
              onClick={
                reloadProfile
              }
              style={{
                padding:
                  "11px 22px",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        className="responsive-page"
        style={{
          padding: "32px 36px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 26,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily:
                  "var(--font-display)",
                fontSize: 32,
                color:
                  "var(--color-text)",
                fontWeight: 600,
                letterSpacing:
                  "-0.02em",
                marginBottom: 4,
              }}
            >
              Good evening,{" "}
              {getFirstName(
                userName
              )}
            </h1>

            <p
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 14,
              }}
            >
              {profile.persona ||
                "Synthetic financial profile"}{" "}
              ·{" "}
              {profile.city ||
                "Saudi Arabia"}{" "}
              · {userId}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Badge color="#2DCFB3">
              ● Dataset Synced
            </Badge>
          </div>
        </div>

        {/* Period selector */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 28,
            padding: "12px 14px",
            borderRadius: 14,
            background:
              "var(--color-surface)",
            border:
              "1px solid var(--color-border)",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "var(--color-text)",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 3,
              }}
            >
              Financial Period
            </div>

            <div
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
              }}
            >
              Current balance stays
              constant; activity metrics
              update by period.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            {supportedPeriods.map(
              (period) => {
                const active =
                  selectedPeriod ===
                  period;

                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() =>
                      setSelectedPeriod(
                        period
                      )
                    }
                    style={{
                      minWidth: 58,
                      padding:
                        "8px 13px",
                      borderRadius: 10,
                      border: `1px solid ${
                        active
                          ? "var(--color-border-strong)"
                          : "var(--color-border)"
                      }`,
                      background: active
                        ? "linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1))"
                        : "var(--color-ink)",
                      color: active
                        ? "var(--color-gold)"
                        : "var(--color-text-muted)",
                      fontSize: 12,
                      fontWeight: active
                        ? 700
                        : 500,
                      cursor: "pointer",
                      fontFamily:
                        "var(--font-body)",
                    }}
                  >
                    {period}M
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Main stat cards */}
        <div
          className="grid-4"
          style={{
            marginBottom: 18,
          }}
        >
          <StatCard
            icon="💰"
            label="Current Balance"
            value={formatSAR(
              snapshot.currentBalance
            )}
            sub="Actual account balance"
            color="#2DCFB3"
          />

          <StatCard
            icon="💵"
            label="Period Income"
            value={formatSAR(
              snapshot.periodIncome
            )}
            sub={`${formatSAR(
              snapshot.averageMonthlyIncome
            )} monthly average`}
            color="#4FA3E0"
          />

          <StatCard
            icon="💸"
            label="Available to Spend"
            value={formatSAR(
              snapshot.availableToSpend
            )}
            sub="After commitments, spending & savings"
            color={availableColor}
          />

          <StatCard
            icon="🧠"
            label="Financial Health"
            value={`${snapshot.healthScore} / 100`}
            sub={`${snapshot.riskFlag} behavioral risk`}
            color={riskColor}
          />
        </div>

        {/* Secondary stat cards */}
        <div
          className="grid-4"
          style={{
            marginBottom: 28,
          }}
        >
          <StatCard
            icon="🏠"
            label="Fixed Obligations"
            value={formatSAR(
              snapshot.fixedObligations
            )}
            sub={`${formatSAR(
              snapshot.averageMonthlyFixedObligations
            )} monthly average`}
            color="#9B7EDE"
          />

          <StatCard
            icon="📺"
            label="Subscriptions"
            value={formatSAR(
              snapshot.subscriptions
            )}
            sub={`${formatSAR(
              snapshot.averageMonthlySubscriptions
            )} monthly average`}
            color="#F59E0B"
          />

          <StatCard
            icon="🛒"
            label="Variable Spending"
            value={formatSAR(
              snapshot.variableSpending
            )}
            sub={`${formatSAR(
              snapshot.averageMonthlyVariableSpending
            )} monthly average`}
            color="#E85D75"
          />

          <StatCard
            icon="🎯"
            label="Planned Savings"
            value={formatSAR(
              snapshot.plannedSavings
            )}
            sub={
              primaryGoal
                ? `${goalProgress}% of ${primaryGoal.goal_name}`
                : `${formatPercentage(
                    snapshot.savingsRate
                  )} savings rate`
            }
            color="#C9A84C"
          />
        </div>

        {/* Financial flow + balance trend */}
        <div
          className="grid-2"
          style={{
            marginBottom: 20,
            alignItems: "stretch",
          }}
        >
          {/* Financial flow */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border-strong)",
              borderRadius: 16,
              padding: 24,
              boxShadow:
                "0 0 40px rgba(201,168,76,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 14,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  color:
                    "var(--color-text)",
                  fontSize: 16,
                  fontFamily:
                    "var(--font-display)",
                  fontWeight: 600,
                }}
              >
                Financial Flow
              </div>

              <Badge>
                {PERIOD_LABELS[
                  selectedPeriod
                ]}
              </Badge>
            </div>

            <FinancialFlowItem
              icon="💵"
              label="Period Income"
              value={
                snapshot.periodIncome
              }
              sub="Income received during selected period"
              color="#4FA3E0"
            />

            <FinancialFlowItem
              icon="🏠"
              label="Fixed Commitments"
              value={
                snapshot.fixedObligations +
                snapshot.subscriptions
              }
              sub="Liabilities, bills and subscriptions"
              color="#9B7EDE"
            />

            <FinancialFlowItem
              icon="◈"
              label="Income After Commitments"
              value={
                snapshot.incomeAfterCommitments
              }
              sub="Disposable income before variable spending"
              color="#C9A84C"
            />

            <FinancialFlowItem
              icon="🛒"
              label="Variable Spending"
              value={
                snapshot.variableSpending
              }
              sub="Food, shopping, transport and other activity"
              color="#E85D75"
            />

            <FinancialFlowItem
              icon="🎯"
              label="Planned Savings"
              value={
                snapshot.plannedSavings
              }
              sub="Goal and savings transfers"
              color="#F59E0B"
            />

            <FinancialFlowItem
              icon="✓"
              label="Available to Spend"
              value={
                snapshot.availableToSpend
              }
              sub="Safe remaining cash flow"
              color={availableColor}
              isLast
            />
          </div>

          {/* Balance trend */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "var(--color-text)",
                    fontSize: 16,
                    fontFamily:
                      "var(--font-display)",
                    fontWeight: 600,
                  }}
                >
                  Balance Trend
                </div>

                <div
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  Monthly closing account
                  balances
                </div>
              </div>

              <Badge>
                {balanceTrend.length}{" "}
                month
                {balanceTrend.length ===
                1
                  ? ""
                  : "s"}
              </Badge>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap:
                  selectedPeriod >= 12
                    ? 6
                    : 12,
                height: 210,
              }}
            >
              {balanceTrend.map(
                (item, index) => {
                  const positiveValue =
                    Math.max(
                      0,
                      toNumber(
                        item.value
                      )
                    );

                  return (
                    <div
                      key={item.key}
                      title={`${item.label}: ${formatSAR(
                        item.value
                      )}`}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        gap: 8,
                        height: "100%",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          width: "100%",
                          display: "flex",
                          alignItems:
                            "flex-end",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            minHeight: 8,
                            height: `${Math.max(
                              8,
                              (positiveValue /
                                maximumBalance) *
                                100
                            )}%`,
                            background:
                              index ===
                              balanceTrend.length -
                                1
                                ? "linear-gradient(180deg, #C9A84C, #8A6F32)"
                                : "linear-gradient(180deg, rgba(45,207,179,0.5), rgba(45,207,179,0.2))",
                            borderRadius:
                              "6px 6px 0 0",
                            transition:
                              "height 0.5s ease",
                          }}
                        />
                      </div>

                      <span
                        style={{
                          color:
                            "var(--color-text-muted)",
                          fontSize:
                            selectedPeriod >=
                            12
                              ? 9
                              : 11,
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                          maxWidth:
                            "100%",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Spending breakdown + metrics */}
        <div
          className="grid-2"
          style={{
            marginBottom: 20,
          }}
        >
          {/* Spending breakdown */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  color:
                    "var(--color-text)",
                  fontSize: 16,
                  fontFamily:
                    "var(--font-display)",
                  fontWeight: 600,
                }}
              >
                Variable Spending
                Breakdown
              </div>

              <Badge>
                {PERIOD_LABELS[
                  selectedPeriod
                ]}
              </Badge>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 14,
              }}
            >
              {spendingData.length >
              0 ? (
                spendingData.map(
                  (item) => (
                    <div
                      key={item.cat}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            color:
                              "var(--color-text-muted)",
                            fontSize: 12,
                          }}
                        >
                          {item.cat}
                        </span>

                        <div
                          style={{
                            textAlign:
                              "right",
                          }}
                        >
                          <span
                            style={{
                              color:
                                "var(--color-text)",
                              fontSize: 12,
                            }}
                          >
                            {formatSAR(
                              item.amount
                            )}
                          </span>

                          <span
                            style={{
                              color:
                                "var(--color-text-dim)",
                              fontSize: 10,
                              marginLeft: 7,
                            }}
                          >
                            {formatPercentage(
                              item.pct
                            )}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          height: 6,
                          background:
                            "var(--color-ink)",
                          borderRadius: 3,
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              item.pct
                            )}%`,
                            height: "100%",
                            background:
                              item.color,
                            borderRadius: 3,
                            transition:
                              "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  )
                )
              ) : (
                <p
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 13,
                  }}
                >
                  No variable-spending
                  data is available for
                  this period.
                </p>
              )}
            </div>
          </div>

          {/* Key ratios */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                color:
                  "var(--color-text)",
                fontSize: 16,
                fontFamily:
                  "var(--font-display)",
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              Financial Ratios
            </div>

            {[
              {
                label:
                  "Fixed obligation ratio",
                value:
                  snapshot.fixedObligationRatio,
                note:
                  "Income committed to bills and subscriptions",
                color:
                  snapshot.fixedObligationRatio >
                  50
                    ? "#E85D75"
                    : "#2DCFB3",
              },
              {
                label: "Savings rate",
                value:
                  snapshot.savingsRate,
                note:
                  "Income directed toward planned savings",
                color:
                  snapshot.savingsRate >=
                  15
                    ? "#2DCFB3"
                    : "#C9A84C",
              },
              {
                label:
                  "Budget utilization",
                value:
                  snapshot.budgetUtilization,
                note:
                  "Selected-period budget consumed",
                color:
                  snapshot.budgetUtilization >
                  100
                    ? "#E85D75"
                    : "#C9A84C",
              },
              {
                label:
                  "Non-essential spending",
                value:
                  snapshot.nonEssentialPercentage,
                note:
                  "Share of expenses classified as discretionary",
                color:
                  snapshot.nonEssentialPercentage >=
                  45
                    ? "#E85D75"
                    : "#2DCFB3",
              },
            ].map(
              (metric, index) => (
                <div
                  key={metric.label}
                  style={{
                    padding:
                      "13px 0",
                    borderBottom:
                      index < 3
                        ? "1px solid var(--color-border)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 18,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        color:
                          "var(--color-text)",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {metric.label}
                    </span>

                    <span
                      style={{
                        color:
                          metric.color,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {formatPercentage(
                        metric.value
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      color:
                        "var(--color-text-muted)",
                      fontSize: 11,
                    }}
                  >
                    {metric.note}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid-2">
          {/* Insights */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  color:
                    "var(--color-text)",
                  fontSize: 16,
                  fontFamily:
                    "var(--font-display)",
                  fontWeight: 600,
                }}
              >
                Rashd Insights
              </div>

              <Badge color="#2DCFB3">
                🤖 Live Analysis
              </Badge>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 12,
              }}
            >
              {insights.map(
                (
                  insight,
                  index
                ) => (
                  <div
                    key={`${insight.type}-${index}`}
                    style={{
                      background:
                        "var(--color-ink)",
                      borderRadius: 12,
                      padding:
                        "14px 16px",
                      border: `1px solid ${
                        insight.type ===
                        "positive"
                          ? "rgba(45,207,179,0.2)"
                          : insight.type ===
                            "warning"
                          ? "rgba(232,93,117,0.2)"
                          : "var(--color-border)"
                      }`,
                      display: "flex",
                      gap: 12,
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {insight.icon}
                    </span>

                    <p
                      style={{
                        color:
                          "var(--color-text-muted)",
                        fontSize: 13,
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {insight.text}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  color:
                    "var(--color-text)",
                  fontSize: 16,
                  fontFamily:
                    "var(--font-display)",
                  fontWeight: 600,
                }}
              >
                Recent Transactions
              </div>

              <Badge>
                {
                  snapshot.transactionCount
                }{" "}
                records
              </Badge>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 2,
              }}
            >
              {recentTransactions.length >
              0 ? (
                recentTransactions.map(
                  (
                    transaction,
                    index
                  ) => {
                    const amount =
                      toNumber(
                        transaction.amount
                      );

                    const isIncome =
                      transaction.type ===
                        "income" ||
                      amount > 0;

                    const category =
                      transaction.category ||
                      (isIncome
                        ? "Income"
                        : "Other");

                    const color =
                      CATEGORY_COLORS[
                        category
                      ] ||
                      (isIncome
                        ? "#2DCFB3"
                        : CATEGORY_COLORS.Other);

                    return (
                      <div
                        key={
                          transaction.transaction_id ||
                          `${category}-${index}`
                        }
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "center",
                          gap: 20,
                          padding:
                            "12px 0",
                          borderBottom:
                            index <
                            recentTransactions.length -
                              1
                              ? "1px solid var(--color-border)"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 12,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: `${color}15`,
                              border: `1px solid ${color}30`,
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontSize: 14,
                              color,
                              flexShrink: 0,
                            }}
                          >
                            {isIncome
                              ? "↑"
                              : "↓"}
                          </div>

                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                color:
                                  "var(--color-text)",
                                fontSize: 13,
                                fontWeight: 500,
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {transaction.merchant ||
                                "Transaction"}
                            </div>

                            <div
                              style={{
                                color:
                                  "var(--color-text-muted)",
                                fontSize: 11,
                              }}
                            >
                              {category} ·{" "}
                              {formatDate(
                                transaction.datetime ||
                                  transaction.date
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            color:
                              isIncome
                                ? "#2DCFB3"
                                : "var(--color-text)",
                            fontSize: 14,
                            fontWeight: 600,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {isIncome
                            ? "+"
                            : "-"}
                          {formatSAR(
                            Math.abs(
                              amount
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <p
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 13,
                  }}
                >
                  No transactions are
                  available for this
                  period.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}