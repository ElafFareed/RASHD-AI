"use client";
// app/affordability/page.js

import { useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { Badge, GoldLine } from "../../components/UI";
import { useDemoProfile } from "../../components/DemoProfileProvider";

const CATEGORIES = [
  "Tech",
  "Fashion",
  "Travel",
  "Food",
  "Home",
  "Other",
];

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

function getScoreColor(score) {
  if (score >= 75) {
    return "#2DCFB3";
  }

  if (score >= 50) {
    return "#C9A84C";
  }

  return "#E85D75";
}

function getImpactColor(level) {
  if (level === "High") {
    return "#E85D75";
  }

  if (level === "Moderate") {
    return "#C9A84C";
  }

  return "#2DCFB3";
}

function SnapshotCard({
  label,
  value,
  color,
  sub,
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          color: "var(--color-text-muted)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color,
          fontSize: 20,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
        }}
      >
        {value}
      </div>

      {sub && (
        <div
          style={{
            color: "var(--color-text-dim)",
            fontSize: 10,
            marginTop: 5,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function CashFlowRow({
  label,
  value,
  color = "var(--color-text)",
  strong = false,
  last = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 18,
        padding: "10px 0",
        borderBottom: last
          ? "none"
          : "1px solid var(--color-border)",
      }}
    >
      <span
        style={{
          color: strong
            ? "var(--color-text)"
            : "var(--color-text-muted)",
          fontSize: 12,
          fontWeight: strong ? 600 : 400,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color,
          fontSize: 13,
          fontWeight: strong ? 700 : 600,
          whiteSpace: "nowrap",
        }}
      >
        {formatSAR(value)}
      </span>
    </div>
  );
}

export default function AffordabilityPage() {
  const {
    userId,
    profile,
    goals,
    emergencyFund,
    snapshot,

    loading: profileLoading,
    error: profileError,
    reloadProfile,
  } = useDemoProfile();

  const [amount, setAmount] =
    useState("4500");

  const [item, setItem] =
    useState("Laptop");

  const [category, setCategory] =
    useState("Tech");

  const [result, setResult] =
    useState(null);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [
    requestError,
    setRequestError,
  ] = useState("");

  const [
    goalCreated,
    setGoalCreated,
  ] = useState(false);

  const primaryGoal =
    goals?.[0] || null;

  const emergencyCurrent = toNumber(
    emergencyFund?.current_amount
  );

  const emergencyMinimum = toNumber(
    emergencyFund?.minimum_reserve
  );

  const emergencyProtected =
    emergencyMinimum <= 0 ||
    emergencyCurrent >= emergencyMinimum;

  const monthlyAvailable = toNumber(
    snapshot.averageMonthlyAvailableToSpend
  );

  const contextCards = useMemo(
    () => [
      {
        label: "Current Balance",
        value: formatSAR(
          snapshot.currentBalance
        ),
        color: "#2DCFB3",
        sub: "Actual present account balance",
      },
      {
        label: "Available to Spend",
        value: formatSAR(
          snapshot.averageMonthlyAvailableToSpend
        ),
        color:
          snapshot.averageMonthlyAvailableToSpend >=
          0
            ? "#C9A84C"
            : "#E85D75",
        sub: "Monthly amount after all outflows",
      },
      {
        label: "Fixed Commitments",
        value: formatSAR(
          snapshot.averageMonthlyFixedObligations +
            snapshot.averageMonthlySubscriptions
        ),
        color: "#9B7EDE",
        sub: "Bills, debt and subscriptions",
      },
      {
        label: primaryGoal
          ? "Main Goal Progress"
          : "Planned Savings",
        value: primaryGoal
          ? `${getGoalProgress(
              primaryGoal
            )}%`
          : formatSAR(
              snapshot.averageMonthlyPlannedSavings
            ),
        color: "#4FA3E0",
        sub: primaryGoal
          ? primaryGoal.goal_name
          : "Average monthly contribution",
      },
    ],
    [
      snapshot,
      primaryGoal,
    ]
  );

  const handleAnalyze = async () => {
    const numericAmount =
      toNumber(amount);

    if (!item.trim()) {
      setRequestError(
        "Please enter an item name."
      );
      return;
    }

    if (numericAmount <= 0) {
      setRequestError(
        "Please enter a valid purchase amount."
      );
      return;
    }

    if (!userId) {
      setRequestError(
        "The synthetic profile has not loaded yet."
      );
      return;
    }

    setAnalyzing(true);
    setRequestError("");
    setGoalCreated(false);
    setResult(null);

    try {
      const response = await fetch(
        "/api/purchase-evaluation",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            item: item.trim(),
            amount: numericAmount,
            category,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to evaluate this purchase."
        );
      }

      setResult(data);
    } catch (error) {
      console.error(
        "Affordability request error:",
        error
      );

      setRequestError(
        error instanceof Error
          ? error.message
          : "Unable to evaluate this purchase."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const createSavingsGoal = () => {
    if (!result || !userId) {
      return;
    }

    const storageKey =
      `rashdLocalGoals:${userId}`;

    let savedGoals = [];

    try {
      const stored =
        localStorage.getItem(
          storageKey
        );

      const parsed = stored
        ? JSON.parse(stored)
        : [];

      savedGoals = Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch {
      savedGoals = [];
    }

    const targetAmount =
      toNumber(result.amount);

    const recommendedMonths =
      Math.max(
        1,
        toNumber(
          result.paymentStrategies
            ?.recommendedMonths,
          2
        )
      );

    const deadline = new Date();

    deadline.setMonth(
      deadline.getMonth() +
        recommendedMonths
    );

    const timestamp = Date.now();

    const newGoal = {
      id: `local-${timestamp}`,
      goal_id: `LOCAL-${timestamp}`,
      user_id: userId,

      goal_name:
        `${result.item} Fund`,

      target_amount: targetAmount,
      current_amount: 0,

      target_date: deadline
        .toISOString()
        .slice(0, 10),

      priority: "Medium",
      status: "On Track",

      source:
        "Affordability Checker",

      isLocal: true,
    };

    const nextGoals = [
      newGoal,
      ...savedGoals,
    ];

    localStorage.setItem(
      storageKey,
      JSON.stringify(nextGoals)
    );

    window.dispatchEvent(
      new CustomEvent(
        "rashdGoalsUpdated",
        {
          detail: {
            userId,
            goals: nextGoals,
          },
        }
      )
    );

    setGoalCreated(true);
  };

  if (profileLoading) {
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
          Loading affordability
          profile...
        </div>
      </AppShell>
    );
  }

  if (profileError || !profile) {
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
              {profileError ||
                "Unable to load the financial profile."}
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

  const score =
    result?.score ?? 0;

  const scoreColor =
    getScoreColor(score);

  const resultContext =
    result?.context || {};

  const projectedBalance =
    result
      ? toNumber(
          resultContext.currentBalance,
          snapshot.currentBalance
        ) -
        toNumber(result.amount)
      : 0;

  const emergencyAfterPurchase =
    result
      ? toNumber(
          resultContext.emergencyAfterPurchase,
          emergencyCurrent -
            toNumber(result.amount)
        )
      : emergencyCurrent;

  const emergencySafeAfter =
    result
      ? Boolean(
          resultContext.emergencySafe
        )
      : emergencyProtected;

  const goalImpactColor =
    getImpactColor(
      result?.goalImpact
        ?.impactLevel
    );

  return (
    <AppShell>
      <div className="responsive-split">
        {/* Input panel */}
        <div
          style={{
            padding: 48,
            borderRight:
              "1px solid var(--color-border)",
            overflowY: "auto",
          }}
        >
          <Badge>
            ◉ Affordability Checker
          </Badge>

          <h1
            style={{
              fontFamily:
                "var(--font-display)",
              fontSize: 42,
              color:
                "var(--color-text)",
              fontWeight: 600,
              marginTop: 20,
              marginBottom: 8,
              letterSpacing:
                "-0.02em",
            }}
          >
            Can you afford it?
          </h1>

          <p
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: 14,
              marginBottom: 14,
              lineHeight: 1.6,
            }}
          >
            Rashd evaluates purchases
            using your actual balance,
            monthly cash flow, fixed
            commitments, emergency
            reserve, behavioral risk,
            and savings goals.
          </p>

          <p
            style={{
              color:
                "var(--color-text-dim)",
              fontSize: 12,
              marginBottom: 34,
            }}
          >
            {profile.persona ||
              "Synthetic profile"}{" "}
            ·{" "}
            {profile.city ||
              "Saudi Arabia"}{" "}
            · {userId}
          </p>

          {/* Item */}
          <div
            style={{
              marginBottom: 22,
            }}
          >
            <label
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
                letterSpacing:
                  "0.08em",
                textTransform:
                  "uppercase",
                display: "block",
                marginBottom: 10,
              }}
            >
              Item Name
            </label>

            <input
              value={item}
              onChange={(event) => {
                setItem(
                  event.target.value
                );

                setResult(null);
                setGoalCreated(false);
              }}
              placeholder="e.g. Laptop"
              style={{
                width: "100%",
                background:
                  "var(--color-surface)",
                border:
                  "1px solid var(--color-border)",
                borderRadius: 12,
                padding:
                  "14px 18px",
                color:
                  "var(--color-text)",
                fontSize: 15,
                outline: "none",
                boxSizing:
                  "border-box",
              }}
            />
          </div>

          {/* Amount */}
          <div
            style={{
              marginBottom: 22,
            }}
          >
            <label
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
                letterSpacing:
                  "0.08em",
                textTransform:
                  "uppercase",
                display: "block",
                marginBottom: 10,
              }}
            >
              Amount (SAR)
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 18,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color:
                    "var(--color-gold)",
                  fontSize: 15,
                }}
              >
                ﷼
              </span>

              <input
                value={amount}
                onChange={(event) => {
                  setAmount(
                    event.target.value
                  );

                  setResult(null);
                  setGoalCreated(false);
                }}
                type="number"
                min="1"
                style={{
                  width: "100%",
                  background:
                    "var(--color-surface)",
                  border:
                    "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding:
                    "14px 18px 14px 44px",
                  color:
                    "var(--color-text)",
                  fontSize: 15,
                  outline: "none",
                  boxSizing:
                    "border-box",
                }}
              />
            </div>
          </div>

          {/* Category */}
          <div
            style={{
              marginBottom: 32,
            }}
          >
            <label
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
                letterSpacing:
                  "0.08em",
                textTransform:
                  "uppercase",
                display: "block",
                marginBottom: 10,
              }}
            >
              Category
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {CATEGORIES.map(
                (categoryItem) => (
                  <button
                    key={categoryItem}
                    type="button"
                    onClick={() => {
                      setCategory(
                        categoryItem
                      );

                      setResult(null);
                      setGoalCreated(
                        false
                      );
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      textAlign:
                        "center",
                      background:
                        category ===
                        categoryItem
                          ? "var(--color-gold-glow)"
                          : "var(--color-surface)",
                      border: `1px solid ${
                        category ===
                        categoryItem
                          ? "var(--color-gold)"
                          : "var(--color-border)"
                      }`,
                      color:
                        category ===
                        categoryItem
                          ? "var(--color-gold)"
                          : "var(--color-text-muted)",
                      fontSize: 13,
                      cursor:
                        "pointer",
                      fontFamily:
                        "var(--font-body)",
                    }}
                  >
                    {categoryItem}
                  </button>
                )
              )}
            </div>
          </div>

          {requestError && (
            <div
              style={{
                padding:
                  "11px 14px",
                borderRadius: 10,
                marginBottom: 18,
                color: "#E85D75",
                fontSize: 12,
                background:
                  "rgba(232,93,117,0.08)",
                border:
                  "1px solid rgba(232,93,117,0.25)",
              }}
            >
              ⚠ {requestError}
            </div>
          )}

          <button
            className="btn-gold"
            onClick={handleAnalyze}
            disabled={analyzing}
            style={{
              width: "100%",
              padding: 16,
              fontSize: 15,
              opacity:
                analyzing
                  ? 0.7
                  : 1,
            }}
          >
            {analyzing
              ? "Analyzing..."
              : "Analyze Affordability →"}
          </button>

          <GoldLine
            style={{
              margin:
                "40px 0 28px",
            }}
          />

          {/* Snapshot cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {contextCards.map(
              (card) => (
                <SnapshotCard
                  key={card.label}
                  {...card}
                />
              )
            )}
          </div>

          {/* Cash-flow breakdown */}
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                color:
                  "var(--color-text)",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Monthly Cash-Flow
              Breakdown
            </div>

            <CashFlowRow
              label="Monthly Income"
              value={
                snapshot.averageMonthlyIncome
              }
              color="#2DCFB3"
            />

            <CashFlowRow
              label="Fixed Obligations"
              value={
                -snapshot.averageMonthlyFixedObligations
              }
              color="#9B7EDE"
            />

            <CashFlowRow
              label="Subscriptions"
              value={
                -snapshot.averageMonthlySubscriptions
              }
              color="#D977A5"
            />

            <CashFlowRow
              label="Variable Spending"
              value={
                -snapshot.averageMonthlyVariableSpending
              }
              color="#E85D75"
            />

            <CashFlowRow
              label="Planned Savings"
              value={
                -snapshot.averageMonthlyPlannedSavings
              }
              color="#C9A84C"
            />

            <CashFlowRow
              label="Available to Spend"
              value={monthlyAvailable}
              color={
                monthlyAvailable >= 0
                  ? "#2DCFB3"
                  : "#E85D75"
              }
              strong
              last
            />
          </div>

          {/* Emergency reserve */}
          {emergencyFund && (
            <div
              style={{
                background:
                  "var(--color-surface)",
                border: `1px solid ${
                  emergencyProtected
                    ? "rgba(45,207,179,0.25)"
                    : "rgba(232,93,117,0.25)"
                }`,
                borderRadius: 14,
                padding:
                  "18px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    color:
                      "var(--color-text)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  🛡️ Emergency Reserve
                </div>

                <span
                  style={{
                    color:
                      emergencyProtected
                        ? "#2DCFB3"
                        : "#E85D75",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {emergencyProtected
                    ? "✓ Protected"
                    : "⚠ Below Minimum"}
                </span>
              </div>

              <CashFlowRow
                label="Current Reserve"
                value={
                  emergencyCurrent
                }
                color="#4FA3E0"
              />

              <CashFlowRow
                label="Protected Minimum"
                value={
                  emergencyMinimum
                }
                color="#C9A84C"
                last
              />
            </div>
          )}
        </div>

        {/* Results panel */}
        <div
          style={{
            padding:
              "48px 36px",
            display: "flex",
            flexDirection:
              "column",
            gap: 20,
            overflowY: "auto",
          }}
        >
          {!result &&
            !analyzing && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexDirection:
                  "column",
                gap: 16,
                opacity: 0.55,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                }}
              >
                ◉
              </div>

              <p
                style={{
                  color:
                    "var(--color-text-muted)",
                  fontSize: 14,
                  textAlign:
                    "center",
                  lineHeight: 1.6,
                }}
              >
                Enter a purchase and
                click Analyze
                <br />
                to receive a
                cash-flow-based result.
              </p>
            </div>
          )}

          {analyzing && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexDirection:
                  "column",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius:
                    "50%",
                  border:
                    "3px solid var(--color-border)",
                  borderTopColor:
                    "var(--color-gold)",
                  animation:
                    "rashdSpin 0.8s linear infinite",
                }}
              />

              <p
                style={{
                  color:
                    "var(--color-text-muted)",
                  fontSize: 14,
                }}
              >
                Rashd is evaluating
                cash flow, emergency
                safety and goals...
              </p>

              <style>{`
                @keyframes rashdSpin {
                  to {
                    transform: rotate(360deg);
                  }
                }
              `}</style>
            </div>
          )}

          {result &&
            !analyzing && (
            <>
              {/* Score */}
              <div
                style={{
                  background:
                    "var(--color-surface)",
                  border:
                    "1px solid var(--color-border-strong)",
                  borderRadius: 20,
                  padding: 32,
                  textAlign:
                    "center",
                  boxShadow:
                    "0 0 60px rgba(201,168,76,0.08)",
                }}
              >
                <div
                  style={{
                    position:
                      "relative",
                    width: 130,
                    height: 130,
                    margin:
                      "0 auto 24px",
                  }}
                >
                  <svg
                    width="130"
                    height="130"
                    style={{
                      transform:
                        "rotate(-90deg)",
                    }}
                  >
                    <circle
                      cx="65"
                      cy="65"
                      r="54"
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth="8"
                    />

                    <circle
                      cx="65"
                      cy="65"
                      r="54"
                      fill="none"
                      stroke={
                        scoreColor
                      }
                      strokeWidth="8"
                      strokeDasharray={`${
                        (score /
                          100) *
                        339
                      } 339`}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div
                    style={{
                      position:
                        "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <span
                      style={{
                        color:
                          scoreColor,
                        fontSize: 32,
                        fontFamily:
                          "var(--font-display)",
                        fontWeight: 700,
                      }}
                    >
                      {score}
                    </span>

                    <span
                      style={{
                        color:
                          "var(--color-text-muted)",
                        fontSize: 11,
                      }}
                    >
                      / 100
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    color:
                      scoreColor,
                    fontSize: 20,
                    fontFamily:
                      "var(--font-display)",
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {result.verdict}
                </div>

                <div
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 13,
                  }}
                >
                  {result.item} ·{" "}
                  {formatSAR(
                    result.amount
                  )}{" "}
                  · {result.category}
                </div>
              </div>

              {/* Before and after */}
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
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  If You Buy Today
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 36px 1fr",
                    alignItems:
                      "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background:
                        "var(--color-ink)",
                      border:
                        "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "var(--color-text-muted)",
                        fontSize: 10,
                        marginBottom: 6,
                      }}
                    >
                      Balance Before
                    </div>

                    <div
                      style={{
                        color:
                          "#2DCFB3",
                        fontSize: 17,
                        fontWeight: 700,
                      }}
                    >
                      {formatSAR(
                        resultContext.currentBalance
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      color:
                        "var(--color-gold)",
                      textAlign:
                        "center",
                      fontSize: 20,
                    }}
                  >
                    →
                  </div>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background:
                        "var(--color-ink)",
                      border: `1px solid ${
                        projectedBalance >=
                        0
                          ? "rgba(201,168,76,0.25)"
                          : "rgba(232,93,117,0.25)"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        color:
                          "var(--color-text-muted)",
                        fontSize: 10,
                        marginBottom: 6,
                      }}
                    >
                      Balance After
                    </div>

                    <div
                      style={{
                        color:
                          projectedBalance >=
                          0
                            ? "#C9A84C"
                            : "#E85D75",
                        fontSize: 17,
                        fontWeight: 700,
                      }}
                    >
                      {formatSAR(
                        projectedBalance
                      )}
                    </div>
                  </div>
                </div>

                {emergencyFund && (
                  <div
                    style={{
                      marginTop: 14,
                      padding:
                        "12px 14px",
                      borderRadius: 10,
                      background:
                        "var(--color-ink)",
                      border: `1px solid ${
                        emergencySafeAfter
                          ? "rgba(45,207,179,0.25)"
                          : "rgba(232,93,117,0.25)"
                      }`,
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 14,
                    }}
                  >
                    <span
                      style={{
                        color:
                          "var(--color-text-muted)",
                        fontSize: 12,
                      }}
                    >
                      Emergency reserve
                      after purchase
                    </span>

                    <span
                      style={{
                        color:
                          emergencySafeAfter
                            ? "#2DCFB3"
                            : "#E85D75",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {formatSAR(
                        emergencyAfterPurchase
                      )}{" "}
                      ·{" "}
                      {emergencySafeAfter
                        ? "Protected"
                        : "Below Minimum"}
                    </span>
                  </div>
                )}
              </div>

              {/* Factors */}
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
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  Why This Score?
                </div>

                {(result.factors ||
                  []).map(
                  (
                    factor,
                    index
                  ) => (
                    <div
                      key={
                        factor.label
                      }
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: 18,
                        padding:
                          "11px 0",
                        borderBottom:
                          index <
                          result.factors
                            .length -
                            1
                            ? "1px solid var(--color-border)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "var(--color-text-muted)",
                          fontSize: 13,
                        }}
                      >
                        {factor.label}
                      </span>

                      <span
                        style={{
                          color:
                            factor.color,
                          fontSize: 13,
                          fontWeight: 500,
                          textAlign:
                            "right",
                        }}
                      >
                        {factor.status}
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Goal impact */}
              {result.goalImpact && (
                <div
                  style={{
                    background:
                      "var(--color-surface)",
                    border: `1px solid ${goalImpactColor}35`,
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: 16,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        color:
                          "var(--color-text)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      🎯 Savings Goal
                      Impact
                    </div>

                    <Badge
                      color={
                        goalImpactColor
                      }
                    >
                      {
                        result
                          .goalImpact
                          .impactLevel
                      }{" "}
                      Impact
                    </Badge>
                  </div>

                  {result.goalImpact
                    .goalName && (
                    <div
                      style={{
                        color:
                          goalImpactColor,
                        fontFamily:
                          "var(--font-display)",
                        fontSize: 17,
                        fontWeight: 600,
                        marginBottom: 7,
                      }}
                    >
                      {
                        result
                          .goalImpact
                          .goalName
                      }
                    </div>
                  )}

                  <p
                    style={{
                      color:
                        "var(--color-text-muted)",
                      fontSize: 12,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {
                      result
                        .goalImpact
                        .message
                    }
                  </p>
                </div>
              )}

              {/* Recommendation */}
              <div
                style={{
                  background:
                    "var(--color-gold-glow)",
                  border:
                    "1px solid var(--color-border-strong)",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    🤖
                  </span>

                  <div>
                    <div
                      style={{
                        color:
                          "var(--color-gold)",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      Rashd
                      recommends
                    </div>

                    <p
                      style={{
                        color:
                          "var(--color-text)",
                        fontSize: 13,
                        lineHeight: 1.65,
                        margin: 0,
                        whiteSpace:
                          "pre-line",
                      }}
                    >
                      {
                        result.recommendation
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment strategies */}
              <div
                style={{
                  background:
                    "var(--color-surface)",
                  border:
                    "1px solid var(--color-border)",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    color:
                      "var(--color-text)",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  Payment Strategies
                </div>

                {(
                  result
                    .paymentStrategies
                    ?.options || []
                ).map(
                  (option) => (
                    <div
                      key={
                        option.label
                      }
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: 16,
                        padding:
                          "10px 14px",
                        borderRadius: 10,
                        marginBottom: 8,
                        background:
                          "var(--color-ink)",
                        border: `1px solid ${option.color}20`,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color:
                              "var(--color-text)",
                            fontSize: 13,
                          }}
                        >
                          {
                            option.label
                          }
                        </div>

                        <div
                          style={{
                            color:
                              "var(--color-text-muted)",
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {
                            option.note
                          }
                        </div>
                      </div>

                      <span
                        style={{
                          color:
                            option.color,
                          fontSize: 12,
                          fontWeight: 600,
                          padding:
                            "3px 10px",
                          borderRadius: 10,
                          background: `${option.color}15`,
                          border: `1px solid ${option.color}30`,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          option.risk
                        }
                      </span>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={
                  createSavingsGoal
                }
                disabled={
                  goalCreated
                }
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border:
                    "1px solid rgba(45,207,179,0.3)",
                  background:
                    "rgba(45,207,179,0.1)",
                  color:
                    "#2DCFB3",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    goalCreated
                      ? "default"
                      : "pointer",
                  fontFamily:
                    "var(--font-body)",
                  opacity:
                    goalCreated
                      ? 0.7
                      : 1,
                }}
              >
                {goalCreated
                  ? "✓ Savings Goal Created"
                  : "Create Savings Goal for this ✦"}
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}