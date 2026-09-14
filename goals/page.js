"use client";
// app/goals/page.js

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AppShell from "../../components/AppShell";
import {
  Badge,
  GoldLine,
  StatCard,
} from "../../components/UI";

import { useDemoProfile } from "../../components/DemoProfileProvider";

const GOAL_STYLES = [
  { icon: "🎯", color: "#2DCFB3" },
  { icon: "✈️", color: "#C9A84C" },
  { icon: "🛡️", color: "#4FA3E0" },
  { icon: "📈", color: "#E85D75" },
  { icon: "💎", color: "#9B7EDE" },
];

const FEASIBILITY_STYLES = {
  "Easily Achievable": {
    color: "#2DCFB3",
    icon: "●",
  },
  Achievable: {
    color: "#C9A84C",
    icon: "●",
  },
  Difficult: {
    color: "#F59E0B",
    icon: "●",
  },
  Unrealistic: {
    color: "#E85D75",
    icon: "●",
  },
  Completed: {
    color: "#4FA3E0",
    icon: "✓",
  },
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

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}

function formatDeadline(value) {
  const parsed = parseDate(value);

  if (!parsed) {
    return value || "No deadline";
  }

  return parsed.toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    }
  );
}

function monthsUntilDeadline(value) {
  const deadline = parseDate(value);

  if (!deadline) {
    return 12;
  }

  const now = new Date();

  const months =
    (deadline.getFullYear() -
      now.getFullYear()) *
      12 +
    deadline.getMonth() -
    now.getMonth();

  return Math.max(1, months);
}

function inferGoalIcon(name, fallback) {
  const normalized = String(
    name || ""
  ).toLowerCase();

  if (
    normalized.includes("emergency")
  ) {
    return "🛡️";
  }

  if (
    normalized.includes("travel") ||
    normalized.includes("vacation")
  ) {
    return "✈️";
  }

  if (
    normalized.includes("car") ||
    normalized.includes("vehicle")
  ) {
    return "🚗";
  }

  if (
    normalized.includes("home") ||
    normalized.includes("house")
  ) {
    return "🏠";
  }

  if (
    normalized.includes("laptop") ||
    normalized.includes("computer") ||
    normalized.includes("macbook")
  ) {
    return "💻";
  }

  if (
    normalized.includes("education") ||
    normalized.includes("study")
  ) {
    return "🎓";
  }

  if (
    normalized.includes("investment")
  ) {
    return "📈";
  }

  return fallback;
}

function calculateFeasibility(
  requiredMonthly,
  availableMonthly,
  progress
) {
  if (progress >= 100) {
    return "Completed";
  }

  if (requiredMonthly <= 0) {
    return "Easily Achievable";
  }

  if (availableMonthly <= 0) {
    return "Unrealistic";
  }

  const ratio =
    requiredMonthly /
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

function calculateGoalData({
  goal,
  index,
  availableMonthly,
}) {
  const target = toNumber(
    goal.target_amount ??
      goal.target
  );

  const current = toNumber(
    goal.current_amount ??
      goal.current
  );

  const remaining = Math.max(
    0,
    target - current
  );

  const deadline =
    goal.target_date ??
    goal.deadline ??
    "";

  const monthsRemaining =
    monthsUntilDeadline(deadline);

  const minimumMonthly =
    remaining > 0
      ? Math.ceil(
          remaining /
            monthsRemaining
        )
      : 0;

  const safeAvailable =
    Math.max(
      0,
      availableMonthly
    );

  const recommendedMonthly =
    remaining <= 0
      ? 0
      : Math.min(
          remaining,
          Math.max(
            100,
            Math.min(
              minimumMonthly,
              safeAvailable * 0.6
            )
          )
        );

  const aggressiveMonthly =
    remaining <= 0
      ? 0
      : Math.min(
          remaining,
          Math.max(
            recommendedMonthly,
            safeAvailable * 0.85
          )
        );

  const progress =
    target > 0
      ? Math.min(
          100,
          Math.round(
            (current / target) *
              100
          )
        )
      : 0;

  const style =
    GOAL_STYLES[
      index %
        GOAL_STYLES.length
    ];

  const feasibility =
    calculateFeasibility(
      minimumMonthly,
      safeAvailable,
      progress
    );

  const feasibilityStyle =
    FEASIBILITY_STYLES[
      feasibility
    ];

  const projectedMonths =
    recommendedMonthly > 0
      ? Math.ceil(
          remaining /
            recommendedMonthly
        )
      : 0;

  let tip;

  if (
    feasibility === "Completed"
  ) {
    tip =
      "Congratulations — this goal has been completed.";
  } else if (
    feasibility ===
    "Easily Achievable"
  ) {
    tip = `This goal fits comfortably within your available monthly cash flow. A contribution of ${formatSAR(
      recommendedMonthly
    )} per month could complete it in approximately ${projectedMonths} months.`;
  } else if (
    feasibility === "Achievable"
  ) {
    tip = `This goal is achievable with consistent contributions. Maintain around ${formatSAR(
      recommendedMonthly
    )} per month and review discretionary spending regularly.`;
  } else if (
    feasibility === "Difficult"
  ) {
    tip = `The minimum required contribution is ${formatSAR(
      minimumMonthly
    )} per month, which uses most of your available cash flow. Consider extending the deadline.`;
  } else {
    tip = `This deadline requires ${formatSAR(
      minimumMonthly
    )} per month, exceeding your estimated safe capacity. Extend the deadline or reduce the target.`;
  }

  return {
    id:
      goal.goal_id ||
      goal.id ||
      `goal-${index}`,

    name:
      goal.goal_name ||
      goal.name ||
      "Savings Goal",

    target,
    current,
    remaining,
    deadline,
    monthsRemaining,

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
    progress,

    priority:
      goal.priority ||
      "Medium",

    feasibility,
    feasibilityColor:
      feasibilityStyle.color,
    feasibilityIcon:
      feasibilityStyle.icon,

    icon: inferGoalIcon(
      goal.goal_name ||
        goal.name,
      goal.icon || style.icon
    ),

    color:
      goal.color ||
      style.color,

    tip,

    isLocal: Boolean(
      goal.isLocal
    ),
  };
}

function createSuggestions({
  goals,
  snapshot,
  emergencyFund,
}) {
  const suggestions = [];

  const attentionGoal =
    goals.find(
      (goal) =>
        goal.feasibility ===
          "Difficult" ||
        goal.feasibility ===
          "Unrealistic"
    );

  if (attentionGoal) {
    suggestions.push({
      icon: "⚠️",
      text: `${attentionGoal.name} requires ${formatSAR(
        attentionGoal.minimumMonthly
      )} per month, but your estimated monthly available amount is ${formatSAR(
        snapshot.averageMonthlyAvailableToSpend
      )}. Consider extending its deadline.`,
    });
  } else if (goals[0]) {
    suggestions.push({
      icon: "🎯",
      text: `${goals[0].name} is currently ${goals[0].feasibility.toLowerCase()}. Rashd recommends approximately ${formatSAR(
        goals[0].recommendedMonthly
      )} per month.`,
    });
  }

  if (
    snapshot.nonEssentialPercentage >=
    40
  ) {
    const potentialRedirect =
      snapshot.averageMonthlyVariableSpending *
      0.1;

    suggestions.push({
      icon: "🛍️",
      text: `Reducing variable spending by 10% could redirect approximately ${formatSAR(
        potentialRedirect
      )} per month toward your goals.`,
    });
  }

  const emergencyCurrent =
    toNumber(
      emergencyFund?.current_amount
    );

  const emergencyMinimum =
    toNumber(
      emergencyFund?.minimum_reserve
    );

  if (
    emergencyMinimum > 0 &&
    emergencyCurrent <
      emergencyMinimum
  ) {
    suggestions.push({
      icon: "🛡️",
      text: `Your emergency reserve is ${formatSAR(
        emergencyMinimum -
          emergencyCurrent
      )} below its protected minimum. Prioritize this before lower-priority goals.`,
    });
  }

  if (suggestions.length < 2) {
    suggestions.push({
      icon: "✨",
      text: `Your current goal plan appears manageable. You have approximately ${formatSAR(
        snapshot.averageMonthlyAvailableToSpend
      )} available per month after commitments, spending, and planned savings.`,
    });
  }

  return suggestions.slice(0, 2);
}

export default function GoalsPage() {
  const {
    userId,
    profile,

    goals: datasetGoals,
    emergencyFund,

    snapshot,

    loading,
    error,
    reloadProfile,
  } = useDemoProfile();

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    localGoals,
    setLocalGoals,
  ] = useState([]);

  const [
    newGoal,
    setNewGoal,
  ] = useState({
    name: "",
    target: "",
    deadline: "",
  });

  const [
    formError,
    setFormError,
  ] = useState("");

  const storageKey = userId
    ? `rashdLocalGoals:${userId}`
    : "";

  useEffect(() => {
    if (!storageKey) {
      setLocalGoals([]);
      return;
    }

    const loadLocalGoals = () => {
      try {
        const saved =
          localStorage.getItem(
            storageKey
          );

        const parsed = saved
          ? JSON.parse(saved)
          : [];

        setLocalGoals(
          Array.isArray(parsed)
            ? parsed
            : []
        );
      } catch (storageError) {
        console.warn(
          "Unable to load local goals:",
          storageError
        );

        setLocalGoals([]);
      }
    };

    const handleGoalsUpdated = (
      event
    ) => {
      if (
        event.detail?.userId !==
        userId
      ) {
        return;
      }

      setLocalGoals(
        Array.isArray(
          event.detail?.goals
        )
          ? event.detail.goals
          : []
      );
    };

    loadLocalGoals();

    window.addEventListener(
      "rashdGoalsUpdated",
      handleGoalsUpdated
    );

    window.addEventListener(
      "storage",
      loadLocalGoals
    );

    window.addEventListener(
      "focus",
      loadLocalGoals
    );

    return () => {
      window.removeEventListener(
        "rashdGoalsUpdated",
        handleGoalsUpdated
      );

      window.removeEventListener(
        "storage",
        loadLocalGoals
      );

      window.removeEventListener(
        "focus",
        loadLocalGoals
      );
    };
  }, [storageKey, userId]);

  const saveLocalGoals = (
    nextGoals
  ) => {
    setLocalGoals(nextGoals);

    if (!storageKey) {
      return;
    }

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
  };

  const availableMonthly =
    Math.max(
      0,
      toNumber(
        snapshot.averageMonthlyAvailableToSpend
      )
    );

  const goals = useMemo(() => {
    const combined = [
      ...localGoals,
      ...datasetGoals,
    ];

    return combined.map(
      (goal, index) =>
        calculateGoalData({
          goal,
          index,
          availableMonthly,
        })
    );
  }, [
    localGoals,
    datasetGoals,
    availableMonthly,
  ]);

  const summary = useMemo(() => {
    const totalSaved =
      goals.reduce(
        (sum, goal) =>
          sum + goal.current,
        0
      );

    const totalTarget =
      goals.reduce(
        (sum, goal) =>
          sum + goal.target,
        0
      );

    const recommendedMonthly =
      goals.reduce(
        (sum, goal) =>
          sum +
          goal.recommendedMonthly,
        0
      );

    const achievable =
      goals.filter(
        (goal) =>
          goal.feasibility ===
            "Easily Achievable" ||
          goal.feasibility ===
            "Achievable" ||
          goal.feasibility ===
            "Completed"
      ).length;

    return {
      totalSaved,
      totalTarget,
      recommendedMonthly,
      achievable,
    };
  }, [goals]);

  const emergencyCurrent =
    toNumber(
      emergencyFund?.current_amount
    );

  const emergencyTarget =
    toNumber(
      emergencyFund?.target_amount
    );

  const emergencyMinimum =
    toNumber(
      emergencyFund?.minimum_reserve
    );

  const essentialMonthly =
    Math.max(
      1,
      toNumber(
        snapshot.averageMonthlyFixedObligations
      ) +
        toNumber(
          snapshot.averageMonthlySubscriptions
        )
    );

  const reserveCoverage =
    emergencyCurrent /
    essentialMonthly;

  const suggestions = useMemo(
    () =>
      createSuggestions({
        goals,
        snapshot,
        emergencyFund,
      }),
    [
      goals,
      snapshot,
      emergencyFund,
    ]
  );

  const createGoal = () => {
    setFormError("");

    const name =
      newGoal.name.trim();

    const target = toNumber(
      newGoal.target
    );

    const deadline =
      newGoal.deadline;

    if (!name) {
      setFormError(
        "Please enter a goal name."
      );
      return;
    }

    if (target <= 0) {
      setFormError(
        "Please enter a valid target amount."
      );
      return;
    }

    if (!deadline) {
      setFormError(
        "Please choose a deadline."
      );
      return;
    }

    const deadlineDate =
      new Date(deadline);

    if (
      Number.isNaN(
        deadlineDate.getTime()
      )
    ) {
      setFormError(
        "Please choose a valid deadline."
      );
      return;
    }

    if (
      deadlineDate <= new Date()
    ) {
      setFormError(
        "The deadline must be in the future."
      );
      return;
    }

    const timestamp = Date.now();

    const goal = {
      id: `local-${timestamp}`,
      goal_id: `LOCAL-${timestamp}`,
      user_id: userId,

      goal_name: name,
      target_amount: target,
      current_amount: 0,
      target_date: deadline,

      priority: "Medium",
      status: "On Track",
      source: "Local Demo Goal",
      isLocal: true,
    };

    saveLocalGoals([
      goal,
      ...localGoals,
    ]);

    setNewGoal({
      name: "",
      target: "",
      deadline: "",
    });

    setShowModal(false);
  };

  const deleteLocalGoal = (
    goalId
  ) => {
    saveLocalGoals(
      localGoals.filter(
        (goal) =>
          (goal.goal_id ||
            goal.id) !== goalId
      )
    );
  };

  const closeModal = () => {
    setFormError("");

    setNewGoal({
      name: "",
      target: "",
      deadline: "",
    });

    setShowModal(false);
  };

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
          Loading savings goals...
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
                "Unable to load savings goals."}
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
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 36,
          }}
        >
          <div>
            <Badge>
              ◆ Savings Goals
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
              Your Financial Horizons
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
              Recommendations are based
              on your monthly available
              cash flow.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Badge color="#2DCFB3">
              ● Locally Synced
            </Badge>

            <button
              className="btn-gold"
              onClick={() =>
                setShowModal(true)
              }
              style={{
                padding:
                  "12px 24px",
                fontSize: 13,
                borderRadius: 12,
              }}
            >
              + New Goal
            </button>
          </div>
        </div>

        {/* Summary */}
        <div
          className="grid-4"
          style={{
            marginBottom: 28,
          }}
        >
          <StatCard
            icon="💰"
            label="Total Saved"
            value={formatSAR(
              summary.totalSaved
            )}
            sub={`across ${goals.length} goals`}
            color="#2DCFB3"
          />

          <StatCard
            icon="🎯"
            label="Total Target"
            value={formatSAR(
              summary.totalTarget
            )}
            sub="combined target amount"
            color="#C9A84C"
          />

          <StatCard
            icon="📅"
            label="Recommended Monthly"
            value={formatSAR(
              summary.recommendedMonthly
            )}
            sub={`${formatSAR(
              availableMonthly
            )} available monthly`}
            color="#4FA3E0"
          />

          <StatCard
            icon="🏆"
            label="Achievable Goals"
            value={`${summary.achievable} / ${goals.length}`}
            sub="based on current capacity"
            color="#E85D75"
          />
        </div>

        {/* Emergency fund */}
        {emergencyFund && (
          <div
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border-strong)",
              borderRadius: 18,
              padding: 24,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "var(--color-text)",
                    fontFamily:
                      "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  🛡️ Emergency Fund
                </div>

                <div
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  Protected reserve before
                  discretionary savings
                </div>
              </div>

              <Badge
                color={
                  emergencyCurrent >=
                  emergencyMinimum
                    ? "#2DCFB3"
                    : "#E85D75"
                }
              >
                {emergencyCurrent >=
                emergencyMinimum
                  ? "✓ Minimum Protected"
                  : "⚠ Below Minimum"}
              </Badge>
            </div>

            <div className="grid-4">
              <StatCard
                icon="💵"
                label="Current Reserve"
                value={formatSAR(
                  emergencyCurrent
                )}
                sub="currently protected"
                color="#2DCFB3"
              />

              <StatCard
                icon="🔒"
                label="Minimum Reserve"
                value={formatSAR(
                  emergencyMinimum
                )}
                sub="should remain untouched"
                color="#E85D75"
              />

              <StatCard
                icon="🎯"
                label="Reserve Target"
                value={formatSAR(
                  emergencyTarget
                )}
                sub="full emergency target"
                color="#C9A84C"
              />

              <StatCard
                icon="📆"
                label="Expense Coverage"
                value={`${reserveCoverage.toFixed(
                  1
                )} months`}
                sub="fixed-cost coverage"
                color="#4FA3E0"
              />
            </div>
          </div>
        )}

        <GoldLine
          style={{
            marginBottom: 32,
          }}
        />

        {/* Goal cards */}
        <div
          className="grid-2"
          style={{
            marginBottom: 28,
          }}
        >
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="goal-card"
              style={{
                background:
                  "var(--color-surface)",
                border:
                  "1px solid var(--color-border)",
                borderRadius: 20,
                padding: 28,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${goal.color}15`,
                      border: `1px solid ${goal.color}30`,
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {goal.icon}
                  </div>

                  <div>
                    <div
                      style={{
                        color:
                          "var(--color-text)",
                        fontFamily:
                          "var(--font-display)",
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      {goal.name}
                    </div>

                    <div
                      style={{
                        color:
                          "var(--color-text-muted)",
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      Due{" "}
                      {formatDeadline(
                        goal.deadline
                      )}{" "}
                      ·{" "}
                      {
                        goal.monthsRemaining
                      }{" "}
                      months left
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                      }}
                    >
                      <span
                        style={{
                          padding:
                            "3px 8px",
                          borderRadius: 12,
                          fontSize: 9,
                          color:
                            goal.feasibilityColor,
                          background: `${goal.feasibilityColor}12`,
                          border: `1px solid ${goal.feasibilityColor}30`,
                        }}
                      >
                        {
                          goal.feasibilityIcon
                        }{" "}
                        {
                          goal.feasibility
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: goal.color,
                      fontFamily:
                        "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    {goal.progress}%
                  </span>

                  {goal.isLocal && (
                    <button
                      type="button"
                      onClick={() =>
                        deleteLocalGoal(
                          goal.id
                        )
                      }
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border:
                          "1px solid rgba(232,93,117,0.25)",
                        background:
                          "rgba(232,93,117,0.08)",
                        color:
                          "#E85D75",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  height: 7,
                  background:
                    "var(--color-ink)",
                  borderRadius: 4,
                  marginBottom: 15,
                }}
              >
                <div
                  style={{
                    width: `${goal.progress}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${goal.color}, ${goal.color}80)`,
                    borderRadius: 4,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginBottom: 16,
                  gap: 12,
                }}
              >
                <span
                  style={{
                    color:
                      "var(--color-text-muted)",
                    fontSize: 12,
                  }}
                >
                  {formatSAR(
                    goal.current
                  )}{" "}
                  saved
                </span>

                <span
                  style={{
                    color: goal.color,
                    fontSize: 12,
                  }}
                >
                  {formatSAR(
                    goal.target
                  )}{" "}
                  target
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {[
                  {
                    label:
                      "Minimum",
                    value:
                      goal.minimumMonthly,
                  },
                  {
                    label:
                      "Recommended",
                    value:
                      goal.recommendedMonthly,
                  },
                  {
                    label:
                      "Aggressive",
                    value:
                      goal.aggressiveMonthly,
                  },
                ].map((option) => (
                  <div
                    key={option.label}
                    style={{
                      padding:
                        "10px 10px",
                      borderRadius: 10,
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
                        fontSize: 9,
                        marginBottom: 5,
                      }}
                    >
                      {option.label}
                    </div>

                    <div
                      style={{
                        color:
                          option.label ===
                          "Recommended"
                            ? goal.color
                            : "var(--color-text)",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {formatSAR(
                        option.value
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding:
                    "11px 14px",
                  borderRadius: 10,
                  background: `${goal.color}08`,
                  border: `1px solid ${goal.color}20`,
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
                  🤖{" "}
                  <span
                    style={{
                      color: goal.color,
                    }}
                  >
                    Rashd:
                  </span>{" "}
                  {goal.tip}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div
          style={{
            background:
              "var(--color-surface)",
            border:
              "1px solid var(--color-border-strong)",
            borderRadius: 20,
            padding: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                color:
                  "var(--color-text)",
                fontFamily:
                  "var(--font-display)",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Rashd&apos;s Smart Suggestions
            </div>

            <Badge color="#2DCFB3">
              🤖 Cash-Flow Analysis
            </Badge>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {suggestions.map(
              (suggestion, index) => (
                <div
                  key={index}
                  style={{
                    padding:
                      "18px 20px",
                    borderRadius: 14,
                    background:
                      "var(--color-gold-glow)",
                    border:
                      "1px solid var(--color-border)",
                    display: "flex",
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                    }}
                  >
                    {suggestion.icon}
                  </span>

                  <p
                    style={{
                      color:
                        "var(--color-text)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {suggestion.text}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* New goal modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            zIndex: 200,
            backdropFilter:
              "blur(8px)",
          }}
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            style={{
              width: 480,
              maxWidth: "90vw",
              padding: 36,
              borderRadius: 20,
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border-strong)",
            }}
          >
            <h2
              style={{
                color:
                  "var(--color-text)",
                fontFamily:
                  "var(--font-display)",
                fontSize: 28,
                marginBottom: 8,
              }}
            >
              New Savings Goal
            </h2>

            <p
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 13,
                marginBottom: 26,
              }}
            >
              Rashd will evaluate this
              goal using your available
              monthly cash flow.
            </p>

            {[
              {
                label:
                  "Goal Name",
                key: "name",
                type: "text",
                placeholder:
                  "e.g. Vacation Fund",
              },
              {
                label:
                  "Target Amount (SAR)",
                key: "target",
                type: "number",
                placeholder:
                  "e.g. 10000",
              },
              {
                label:
                  "Deadline",
                key: "deadline",
                type: "date",
                placeholder: "",
              },
            ].map((field) => (
              <div
                key={field.key}
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color:
                      "var(--color-text-muted)",
                    fontSize: 11,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.08em",
                  }}
                >
                  {field.label}
                </label>

                <input
                  type={field.type}
                  min={
                    field.type ===
                    "number"
                      ? "1"
                      : undefined
                  }
                  value={
                    newGoal[field.key]
                  }
                  placeholder={
                    field.placeholder
                  }
                  onChange={(event) =>
                    setNewGoal(
                      (previous) => ({
                        ...previous,
                        [field.key]:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "12px 16px",
                    boxSizing:
                      "border-box",
                    borderRadius: 10,
                    background:
                      "var(--color-ink)",
                    border:
                      "1px solid var(--color-border)",
                    color:
                      "var(--color-text)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            ))}

            {formError && (
              <div
                style={{
                  marginBottom: 18,
                  padding:
                    "11px 14px",
                  borderRadius: 10,
                  background:
                    "rgba(232,93,117,0.08)",
                  border:
                    "1px solid rgba(232,93,117,0.25)",
                  color:
                    "#E85D75",
                  fontSize: 12,
                }}
              >
                ⚠ {formError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
              }}
            >
              <button
                type="button"
                className="btn-gold"
                onClick={createGoal}
                style={{
                  flex: 1,
                  padding: 13,
                }}
              >
                Create Goal ✦
              </button>

              <button
                type="button"
                className="btn-outline"
                onClick={closeModal}
                style={{
                  padding:
                    "13px 20px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}