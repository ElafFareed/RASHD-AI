"use client";
// app/reports/page.js

import { useMemo } from "react";
import AppShell from "../../components/AppShell";
import {
  Badge,
  GoldLine,
  StatCard,
} from "../../components/UI";
import { useDemoProfile } from "../../components/DemoProfileProvider";

const PERIOD_LABELS = {
  1: "1 Month",
  3: "3 Months",
  6: "6 Months",
  12: "12 Months",
};

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

function getGoalProgress(goal) {
  if (!goal) {
    return 0;
  }

  const current = toNumber(
    goal.current_amount
  );

  const target = Math.max(
    1,
    toNumber(goal.target_amount)
  );

  return Math.min(
    100,
    Math.round(
      (current / target) * 100
    )
  );
}

function buildCategoryReports(snapshot) {
  return (snapshot.topCategories || [])
    .slice(0, 5)
    .map((category, index) => {
      const trend =
        index === 0
          ? "Highest"
          : category.percentage >= 20
          ? "Significant"
          : category.percentage >= 10
          ? "Moderate"
          : "Controlled";

      let insight;

      if (category.name === "Food") {
        insight =
          "Dining and food purchases are a major source of variable spending.";
      } else if (category.name === "Shopping") {
        insight =
          "Shopping contributes significantly to discretionary spending.";
      } else if (category.name === "Transport") {
        insight =
          "Transport remains a recurring variable expense.";
      } else if (category.name === "Groceries") {
        insight =
          "Groceries form an essential part of monthly spending.";
      } else if (category.name === "Entertainment") {
        insight =
          "Entertainment is discretionary and can be adjusted when needed.";
      } else if (category.name === "Coffee") {
        insight =
          "Frequent smaller purchases may create a meaningful monthly total.";
      } else {
        insight =
          "This category contributes to the selected period’s variable spending.";
      }

      return {
        label: category.name,
        amount: category.amount,
        percentage: category.percentage,
        trend,
        insight,
        color:
          CATEGORY_COLORS[category.name] ||
          CATEGORY_COLORS.Other,
      };
    });
}

function buildRecommendations({
  snapshot,
  goals,
  emergencyFund,
}) {
  const recommendations = [];

  const topCategory =
    snapshot.topCategories?.[0];

  if (topCategory) {
    const possibleSaving =
      topCategory.amount * 0.1;

    recommendations.push(
      `Reducing ${topCategory.name.toLowerCase()} spending by 10% could free approximately ${formatSAR(
        possibleSaving
      )} during this period.`
    );
  }

  if (
    snapshot.fixedObligationRatio >= 50
  ) {
    recommendations.push(
      `${formatPercentage(
        snapshot.fixedObligationRatio
      )} of income is committed to fixed obligations and subscriptions. Avoid taking on additional recurring payments.`
    );
  }

  if (
    snapshot.nonEssentialPercentage >= 45
  ) {
    recommendations.push(
      `${formatPercentage(
        snapshot.nonEssentialPercentage
      )} of expenses were non-essential. Redirecting part of this spending could improve savings capacity.`
    );
  }

  if (
    snapshot.availableToSpend < 0
  ) {
    recommendations.push(
      `Total outflows exceed income by ${formatSAR(
        Math.abs(
          snapshot.availableToSpend
        )
      )} during this period. Reduce variable spending before increasing goal contributions.`
    );
  } else {
    recommendations.push(
      `${formatSAR(
        snapshot.availableToSpend
      )} remains after commitments, spending, and planned savings during this period.`
    );
  }

  const primaryGoal = goals?.[0];

  if (primaryGoal) {
    const remaining = Math.max(
      0,
      toNumber(
        primaryGoal.target_amount
      ) -
        toNumber(
          primaryGoal.current_amount
        )
    );

    recommendations.push(
      `${formatSAR(
        remaining
      )} remains for ${
        primaryGoal.goal_name
      }. Its current progress is ${getGoalProgress(
        primaryGoal
      )}%.`
    );
  }

  const emergencyCurrent = toNumber(
    emergencyFund?.current_amount
  );

  const emergencyMinimum = toNumber(
    emergencyFund?.minimum_reserve
  );

  if (
    emergencyMinimum > 0 &&
    emergencyCurrent < emergencyMinimum
  ) {
    recommendations.push(
      `The emergency reserve is ${formatSAR(
        emergencyMinimum -
          emergencyCurrent
      )} below its protected minimum. Prioritize restoring it.`
    );
  }

  return recommendations.slice(0, 4);
}

function buildExecutiveSummary({
  profile,
  snapshot,
  selectedPeriod,
  goals,
  emergencyFund,
}) {
  const primaryGoal = goals?.[0];

  const cashFlowSentence =
    snapshot.availableToSpend >= 0
      ? `After fixed obligations, subscriptions, variable spending, and planned savings, ${formatSAR(
          snapshot.availableToSpend
        )} remains available during the selected period.`
      : `Outflows exceed income by ${formatSAR(
          Math.abs(
            snapshot.availableToSpend
          )
        )} during the selected period.`;

  const commitmentSentence =
    snapshot.fixedObligationRatio >= 50
      ? `Fixed commitments consume ${formatPercentage(
          snapshot.fixedObligationRatio
        )} of income, indicating limited financial flexibility.`
      : `Fixed commitments consume ${formatPercentage(
          snapshot.fixedObligationRatio
        )} of income, leaving reasonable flexibility.`;

  const behaviorSentence =
    snapshot.riskFlag === "High"
      ? "Behavioral spending risk is high and requires immediate attention."
      : snapshot.riskFlag === "Medium"
      ? "Behavioral spending risk is moderate, with patterns worth monitoring."
      : "Behavioral spending risk is low and current habits appear relatively controlled.";

  const goalSentence = primaryGoal
    ? `The main savings goal is ${
        primaryGoal.goal_name
      }, currently ${getGoalProgress(
        primaryGoal
      )}% complete.`
    : "There is no active primary savings goal.";

  const emergencyCurrent = toNumber(
    emergencyFund?.current_amount
  );

  const emergencyMinimum = toNumber(
    emergencyFund?.minimum_reserve
  );

  const emergencySentence =
    emergencyMinimum <= 0
      ? "No protected emergency minimum has been configured."
      : emergencyCurrent >= emergencyMinimum
      ? "The emergency-fund minimum is currently protected."
      : "The emergency fund is below its protected minimum.";

  return `${profile.persona || "This profile"} has a financial health score of ${
    snapshot.healthScore
  }/100 across the selected ${
    PERIOD_LABELS[selectedPeriod]
  }. ${cashFlowSentence} ${commitmentSentence} ${behaviorSentence} ${goalSentence} ${emergencySentence}`;
}

function ReportMetric({
  label,
  value,
  note,
  color,
  last = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 18,
        padding: "13px 0",
        borderBottom: last
          ? "none"
          : "1px solid var(--color-border)",
      }}
    >
      <div>
        <div
          style={{
            color: "var(--color-text)",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          {label}
        </div>

        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          {note}
        </div>
      </div>

      <span
        style={{
          color,
          fontSize: 14,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function ReportsPage() {
  const {
    userId,
    profile,
    goals,
    liabilities,
    commitments,
    subscriptions,
    emergencyFund,

    selectedPeriod,
    supportedPeriods,
    setSelectedPeriod,

    snapshot,

    loading,
    error,
    reloadProfile,
  } = useDemoProfile();

  const categoryReports = useMemo(
    () =>
      buildCategoryReports(snapshot),
    [snapshot]
  );

  const recommendations = useMemo(
    () =>
      buildRecommendations({
        snapshot,
        goals,
        emergencyFund,
      }),
    [
      snapshot,
      goals,
      emergencyFund,
    ]
  );

  const executiveSummary = useMemo(
    () =>
      profile
        ? buildExecutiveSummary({
            profile,
            snapshot,
            selectedPeriod,
            goals,
            emergencyFund,
          })
        : "",
    [
      profile,
      snapshot,
      selectedPeriod,
      goals,
      emergencyFund,
    ]
  );

  const alerts = useMemo(() => {
    let count = 0;

    if (
      snapshot.weekendPercentage >= 25
    ) {
      count += 1;
    }

    if (
      snapshot.lateNightPercentage >= 8
    ) {
      count += 1;
    }

    if (
      snapshot.nonEssentialPercentage >= 45
    ) {
      count += 1;
    }

    if (
      snapshot.availableToSpend < 0
    ) {
      count += 1;
    }

    if (
      snapshot.fixedObligationRatio >= 50
    ) {
      count += 1;
    }

    const emergencyCurrent = toNumber(
      emergencyFund?.current_amount
    );

    const emergencyMinimum = toNumber(
      emergencyFund?.minimum_reserve
    );

    if (
      emergencyMinimum > 0 &&
      emergencyCurrent < emergencyMinimum
    ) {
      count += 1;
    }

    return count;
  }, [
    snapshot,
    emergencyFund,
  ]);

  const activeSubscriptions =
    subscriptions?.filter(
      (subscription) =>
        subscription.active !== false
    ) || [];

  const emergencyCurrent = toNumber(
    emergencyFund?.current_amount
  );

  const emergencyMinimum = toNumber(
    emergencyFund?.minimum_reserve
  );

  const emergencyTarget = toNumber(
    emergencyFund?.target_amount
  );

  const emergencyProtected =
    emergencyMinimum <= 0 ||
    emergencyCurrent >= emergencyMinimum;

  if (loading) {
    return (
      <AppShell>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color:
              "var(--color-text-muted)",
          }}
        >
          Loading financial report...
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
            justifyContent: "center",
            padding: 32,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              padding: 28,
              borderRadius: 16,
              background:
                "var(--color-surface)",
              border:
                "1px solid rgba(232,93,117,0.3)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "#E85D75",
                marginBottom: 20,
              }}
            >
              {error ||
                "Unable to load the report."}
            </p>

            <button
              className="btn-gold"
              onClick={reloadProfile}
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

  const availableColor =
    snapshot.availableToSpend >= 0
      ? "#2DCFB3"
      : "#E85D75";

  const healthColor =
    snapshot.healthScore >= 75
      ? "#2DCFB3"
      : snapshot.healthScore >= 50
      ? "#C9A84C"
      : "#E85D75";

  return (
    <AppShell>
      <div
        className="responsive-page"
        style={{
          padding: "40px 48px",
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: 26,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Badge>
              ▣ Reports
            </Badge>

            <h1
              style={{
                fontFamily:
                  "var(--font-display)",
                fontSize: 40,
                color:
                  "var(--color-text)",
                fontWeight: 600,
                marginTop: 16,
                letterSpacing:
                  "-0.02em",
              }}
            >
              Financial Intelligence Report
            </h1>

            <p
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 14,
                marginTop: 8,
              }}
            >
              {profile.persona ||
                "Synthetic profile"}{" "}
              ·{" "}
              {profile.city ||
                "Saudi Arabia"}{" "}
              · {userId}
            </p>

            <p
              style={{
                color:
                  "var(--color-text-dim)",
                fontSize: 12,
                marginTop: 6,
              }}
            >
              Cash-flow and behavioral
              analysis for the selected
              period.
            </p>
          </div>

          <Badge color="#2DCFB3">
            ● Dataset Synced
          </Badge>
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
              Report Period
            </div>

            <div
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
              }}
            >
              Every metric and
              recommendation updates with
              the selected timeframe.
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

        {/* Main KPIs */}
        <div
          className="grid-4"
          style={{
            marginBottom: 18,
          }}
        >
          <StatCard
            icon="🧠"
            label="Health Score"
            value={`${snapshot.healthScore} / 100`}
            sub={`${snapshot.riskFlag} behavioral risk`}
            color={healthColor}
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
            sub="after all cash outflows"
            color={availableColor}
          />

          <StatCard
            icon="⚡"
            label="Financial Alerts"
            value={String(alerts)}
            sub="actionable indicators"
            color={
              alerts > 2
                ? "#E85D75"
                : "#C9A84C"
            }
          />
        </div>

        {/* Secondary KPIs */}
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
            sub={`${formatPercentage(
              snapshot.fixedObligationRatio
            )} of income`}
            color="#9B7EDE"
          />

          <StatCard
            icon="📺"
            label="Subscriptions"
            value={formatSAR(
              snapshot.subscriptions
            )}
            sub={`${activeSubscriptions.length} active services`}
            color="#D977A5"
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
            sub={`${formatPercentage(
              snapshot.savingsRate
            )} savings rate`}
            color="#C9A84C"
          />
        </div>

        <GoldLine
          style={{
            marginBottom: 28,
          }}
        />

        {/* Categories and executive summary */}
        <div
          className="grid-2"
          style={{
            alignItems: "stretch",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 18,
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
                  fontSize: 18,
                  fontFamily:
                    "var(--font-display)",
                  fontWeight: 600,
                }}
              >
                Variable-Spending
                Performance
              </div>

              <Badge>
                {
                  PERIOD_LABELS[
                    selectedPeriod
                  ]
                }
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
              {categoryReports.length >
              0 ? (
                categoryReports.map(
                  (category) => (
                    <div
                      key={
                        category.label
                      }
                      style={{
                        border:
                          "1px solid var(--color-border)",
                        borderRadius: 14,
                        padding: 16,
                        background:
                          "var(--color-ink)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            color:
                              category.color,
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {
                            category.label
                          }
                        </span>

                        <span
                          style={{
                            color:
                              "var(--color-text)",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {formatSAR(
                            category.amount
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          height: 5,
                          borderRadius: 3,
                          background:
                            "var(--color-surface)",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(
                              100,
                              category.percentage
                            )}%`,
                            borderRadius: 3,
                            background:
                              category.color,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            color:
                              "var(--color-text-muted)",
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          {
                            category.insight
                          }
                        </span>

                        <span
                          style={{
                            color:
                              category.color,
                            fontSize: 11,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            category.percentage
                          }
                          % ·{" "}
                          {category.trend}
                        </span>
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
                  No category data is
                  available for this
                  period.
                </p>
              )}
            </div>
          </div>

          {/* Executive summary */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border-strong)",
              borderRadius: 18,
              padding: 24,
              boxShadow:
                "0 0 50px rgba(201,168,76,0.06)",
            }}
          >
            <div
              style={{
                color:
                  "var(--color-text)",
                fontSize: 18,
                fontFamily:
                  "var(--font-display)",
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Rashd Executive Summary
            </div>

            <p
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 13,
                lineHeight: 1.75,
                marginBottom: 22,
              }}
            >
              {executiveSummary}
            </p>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 12,
              }}
            >
              {recommendations.map(
                (
                  recommendation,
                  index
                ) => (
                  <div
                    key={
                      recommendation
                    }
                    style={{
                      display: "flex",
                      gap: 12,
                      padding:
                        "14px 16px",
                      borderRadius: 12,
                      background:
                        "var(--color-ink)",
                      border:
                        "1px solid var(--color-border)",
                    }}
                  >
                    <span
                      style={{
                        color:
                          "var(--color-gold)",
                        fontWeight: 700,
                      }}
                    >
                      0{index + 1}
                    </span>

                    <span
                      style={{
                        color:
                          "var(--color-text)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      {
                        recommendation
                      }
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Ratios and emergency reserve */}
        <div
          className="grid-2"
          style={{
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 16,
              padding: 22,
            }}
          >
            <div
              style={{
                color:
                  "var(--color-text)",
                fontFamily:
                  "var(--font-display)",
                fontSize: 17,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Financial Ratios
            </div>

            <ReportMetric
              label="Fixed obligation ratio"
              value={formatPercentage(
                snapshot.fixedObligationRatio
              )}
              note="Income committed to liabilities, bills, and subscriptions."
              color={
                snapshot.fixedObligationRatio >=
                50
                  ? "#E85D75"
                  : "#2DCFB3"
              }
            />

            <ReportMetric
              label="Savings rate"
              value={formatPercentage(
                snapshot.savingsRate
              )}
              note="Income intentionally allocated to savings goals."
              color={
                snapshot.savingsRate >= 15
                  ? "#2DCFB3"
                  : "#C9A84C"
              }
            />

            <ReportMetric
              label="Non-essential spending"
              value={formatPercentage(
                snapshot.nonEssentialPercentage
              )}
              note="Share of expenses classified as discretionary."
              color={
                snapshot.nonEssentialPercentage >=
                45
                  ? "#E85D75"
                  : "#2DCFB3"
              }
            />

            <ReportMetric
              label="Weekend spending"
              value={formatPercentage(
                snapshot.weekendPercentage
              )}
              note="Share of expenses occurring during weekends."
              color={
                snapshot.weekendPercentage >=
                30
                  ? "#C9A84C"
                  : "#2DCFB3"
              }
              last
            />
          </div>

          <div
            style={{
              background:
                "var(--color-surface)",
              border: `1px solid ${
                emergencyProtected
                  ? "rgba(45,207,179,0.28)"
                  : "rgba(232,93,117,0.28)"
              }`,
              borderRadius: 16,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 14,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  color:
                    "var(--color-text)",
                  fontFamily:
                    "var(--font-display)",
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                Emergency Fund
              </div>

              <Badge
                color={
                  emergencyProtected
                    ? "#2DCFB3"
                    : "#E85D75"
                }
              >
                {emergencyProtected
                  ? "✓ Protected"
                  : "⚠ Below Minimum"}
              </Badge>
            </div>

            <ReportMetric
              label="Current reserve"
              value={formatSAR(
                emergencyCurrent
              )}
              note="The amount currently held as emergency savings."
              color="#4FA3E0"
            />

            <ReportMetric
              label="Protected minimum"
              value={formatSAR(
                emergencyMinimum
              )}
              note="The amount that should remain untouched."
              color="#C9A84C"
            />

            <ReportMetric
              label="Full reserve target"
              value={formatSAR(
                emergencyTarget
              )}
              note="The long-term emergency-fund target."
              color="#2DCFB3"
            />

            <ReportMetric
              label="Active financial obligations"
              value={String(
                (liabilities?.length || 0) +
                  (commitments?.length || 0)
              )}
              note="Liabilities and recurring commitments tracked by Rashd."
              color="#9B7EDE"
              last
            />
          </div>
        </div>

        {/* Behavioral indicators */}
        <div
          className="grid-3"
          style={{
            marginBottom: 24,
          }}
        >
          {[
            {
              label:
                "Weekend Spending",
              value:
                snapshot.weekendPercentage,
              note:
                "Share of expenses occurring during weekends.",
              color: "#C9A84C",
            },
            {
              label:
                "Late-Night Spending",
              value:
                snapshot.lateNightPercentage,
              note:
                "Transactions occurring during late-night hours.",
              color: "#E85D75",
            },
            {
              label:
                "Non-Essential Spending",
              value:
                snapshot.nonEssentialPercentage,
              note:
                "Share of expenses outside essential categories.",
              color: "#4FA3E0",
            },
          ].map(
            (indicator) => (
              <div
                key={
                  indicator.label
                }
                style={{
                  background:
                    "var(--color-surface)",
                  border:
                    "1px solid var(--color-border)",
                  borderRadius: 16,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 11,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.08em",
                    marginBottom: 10,
                  }}
                >
                  {
                    indicator.label
                  }
                </div>

                <div
                  style={{
                    color:
                      indicator.color,
                    fontFamily:
                      "var(--font-display)",
                    fontSize: 30,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  {
                    indicator.value
                  }
                  %
                </div>

                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background:
                      "var(--color-ink)",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(
                        100,
                        indicator.value
                      )}%`,
                      borderRadius: 3,
                      background:
                        indicator.color,
                    }}
                  />
                </div>

                <p
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 12,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {indicator.note}
                </p>
              </div>
            )
          )}
        </div>

        {/* Transparency */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(45,207,179,0.08))",
            border:
              "1px solid var(--color-border-strong)",
            borderRadius: 18,
            padding: 24,
          }}
        >
          <div
            style={{
              color:
                "var(--color-gold)",
              fontSize: 12,
              letterSpacing:
                "0.1em",
              textTransform:
                "uppercase",
              marginBottom: 10,
            }}
          >
            Demo Transparency
          </div>

          <p
            style={{
              color:
                "var(--color-text)",
              fontSize: 14,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            This report is generated
            from fully synthetic
            financial data. Rashd
            identifies financial and
            behavioral indicators that
            may suggest impulsive
            spending, but it does not
            claim to determine a
            user&apos;s emotional state.
          </p>
        </div>
      </div>
    </AppShell>
  );
}