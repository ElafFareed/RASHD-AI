"use client";
// app/chat/page.js

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AppShell from "../../components/AppShell";
import { Badge } from "../../components/UI";
import { useDemoProfile } from "../../components/DemoProfileProvider";

const PERIOD_LABELS = {
  1: "1 Month",
  3: "3 Months",
  6: "6 Months",
  12: "12 Months",
};

const EXCLUDED_VARIABLE_CATEGORIES = new Set([
  "Debt Payment",
  "Rent",
  "Telecom",
  "Utilities",
  "Insurance",
  "Membership",
  "Subscriptions",
  "Savings Transfer",
]);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function formatSAR(value) {
  const numericValue =
    toNumber(value);

  const sign =
    numericValue < 0 ? "-" : "";

  return `${sign}SAR ${Math.abs(
    Math.round(numericValue)
  ).toLocaleString()}`;
}

function getFirstName(name) {
  return (
    name?.trim()?.split(" ")?.[0] ||
    "User"
  );
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

function getTopCategories(
  transactions = []
) {
  const totals = {};

  transactions
    .filter((transaction) => {
      const amount = toNumber(
        transaction.amount
      );

      const isExpense =
        transaction.type === "expense" ||
        (
          amount < 0 &&
          transaction.type !== "transfer"
        );

      const category =
        transaction.category ||
        "Other";

      return (
        isExpense &&
        !EXCLUDED_VARIABLE_CATEGORIES.has(
          category
        )
      );
    })
    .forEach((transaction) => {
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

  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
    }))
    .sort(
      (first, second) =>
        second.amount -
        first.amount
    );
}

function buildInitialMessage({
  userName,
  profile,
  goals,
  periodTransactions,
  snapshot,
  selectedPeriod,
  emergencyFund,
  liabilities,
  subscriptions,
}) {
  if (!profile) {
    return [];
  }

  const firstName =
    getFirstName(userName);

  const primaryGoal =
    goals?.[0] || null;

  const topCategory =
    getTopCategories(
      periodTransactions
    )[0];

  const emergencyCurrent =
    toNumber(
      emergencyFund?.current_amount
    );

  const emergencyMinimum =
    toNumber(
      emergencyFund?.minimum_reserve
    );

  const emergencyStatus =
    emergencyMinimum <= 0
      ? "Not configured"
      : emergencyCurrent >=
        emergencyMinimum
      ? "Protected"
      : "Below minimum";

  const lines = [
    `مرحباً ${firstName}! I'm Rashd, your AI financial guide.`,
    "",
    `I've analyzed your assigned synthetic profile for the selected ${PERIOD_LABELS[
      selectedPeriod
    ].toLowerCase()}.`,
    "",
    `• Current balance: ${formatSAR(
      snapshot.currentBalance
    )}`,
    `• Average monthly income: ${formatSAR(
      snapshot.averageMonthlyIncome
    )}`,
    `• Average fixed commitments: ${formatSAR(
      snapshot.averageMonthlyFixedObligations +
        snapshot.averageMonthlySubscriptions
    )}`,
    `• Average variable spending: ${formatSAR(
      snapshot.averageMonthlyVariableSpending
    )}`,
    `• Average monthly available to spend: ${formatSAR(
      snapshot.averageMonthlyAvailableToSpend
    )}`,
    `• Financial health score: ${snapshot.healthScore}/100`,
    `• Behavioral risk: ${snapshot.riskFlag}`,
    `• Active liabilities: ${
      liabilities?.length || 0
    }`,
    `• Active subscriptions: ${
      subscriptions?.filter(
        (subscription) =>
          subscription.active !== false
      ).length || 0
    }`,
    `• Emergency reserve: ${emergencyStatus}`,
  ];

  if (topCategory) {
    lines.push(
      `• Highest variable-spending category: ${
        topCategory.name
      } at ${formatSAR(
        topCategory.amount
      )}`
    );
  }

  if (primaryGoal) {
    const remaining =
      Math.max(
        0,
        toNumber(
          primaryGoal.target_amount
        ) -
          toNumber(
            primaryGoal.current_amount
          )
      );

    lines.push(
      `• Main goal: ${
        primaryGoal.goal_name
      } — ${formatSAR(
        remaining
      )} remaining`
    );
  }

  lines.push(
    "",
    "You can ask about spending, liabilities, subscriptions, emergency savings, affordability, or goal planning."
  );

  return [
    {
      from: "ai",
      text: lines.join("\n"),
    },
  ];
}

function createSuggestions({
  goals,
  periodTransactions,
  snapshot,
  liabilities,
  subscriptions,
  emergencyFund,
}) {
  const primaryGoal =
    goals?.[0] || null;

  const topCategory =
    getTopCategories(
      periodTransactions
    )[0];

  const suggestions = [
    "Give me my financial overview",
    "How much can I safely spend monthly?",
    "Can I afford a SAR 4,500 purchase?",
  ];

  if (
    liabilities?.length > 0
  ) {
    suggestions.push(
      "What are my largest liabilities?"
    );
  }

  if (
    subscriptions?.length > 0
  ) {
    suggestions.push(
      "How much do my subscriptions cost?"
    );
  }

  if (emergencyFund) {
    suggestions.push(
      "Is my emergency fund protected?"
    );
  }

  if (topCategory) {
    suggestions.push(
      `Why is my ${topCategory.name.toLowerCase()} spending high?`
    );
  }

  if (primaryGoal) {
    suggestions.push(
      `How can I reach my ${primaryGoal.goal_name} faster?`
    );
  }

  if (
    snapshot.weekendPercentage >= 20
  ) {
    suggestions.push(
      "Analyze my weekend spending"
    );
  }

  return suggestions.slice(0, 7);
}

function createConversationTemplates({
  userName,
  profile,
  goals,
  periodTransactions,
  snapshot,
  selectedPeriod,
  emergencyFund,
  liabilities,
  subscriptions,
}) {
  if (!profile) {
    return [];
  }

  const initialMessages =
    buildInitialMessage({
      userName,
      profile,
      goals,
      periodTransactions,
      snapshot,
      selectedPeriod,
      emergencyFund,
      liabilities,
      subscriptions,
    });

  const primaryGoal =
    goals?.[0] || null;

  const topCategory =
    getTopCategories(
      periodTransactions
    )[0];

  const overviewText =
    `Here is your ${PERIOD_LABELS[
      selectedPeriod
    ].toLowerCase()} overview:\n\n` +
    `• Current balance: ${formatSAR(
      snapshot.currentBalance
    )}\n` +
    `• Period income: ${formatSAR(
      snapshot.periodIncome
    )}\n` +
    `• Fixed obligations: ${formatSAR(
      snapshot.fixedObligations
    )}\n` +
    `• Subscriptions: ${formatSAR(
      snapshot.subscriptions
    )}\n` +
    `• Variable spending: ${formatSAR(
      snapshot.variableSpending
    )}\n` +
    `• Planned savings: ${formatSAR(
      snapshot.plannedSavings
    )}\n` +
    `• Available to spend: ${formatSAR(
      snapshot.availableToSpend
    )}`;

  const behaviorText =
    `During this period:\n\n` +
    `• Weekend spending: ${
      snapshot.weekendPercentage
    }%\n` +
    `• Late-night spending: ${
      snapshot.lateNightPercentage
    }%\n` +
    `• Non-essential spending: ${
      snapshot.nonEssentialPercentage
    }%\n` +
    `• Spending bursts: ${
      snapshot.burstCount
    }\n\n` +
    `Behavioral risk: ${
      snapshot.riskFlag
    }.`;

  const goalText =
    primaryGoal
      ? `Your main goal is ${
          primaryGoal.goal_name
        }.\n\n` +
        `• Progress: ${getGoalProgress(
          primaryGoal
        )}%\n` +
        `• Target: ${formatSAR(
          primaryGoal.target_amount
        )}\n` +
        `• Saved: ${formatSAR(
          primaryGoal.current_amount
        )}\n` +
        `• Remaining: ${formatSAR(
          Math.max(
            0,
            toNumber(
              primaryGoal.target_amount
            ) -
              toNumber(
                primaryGoal.current_amount
              )
          )
        )}\n` +
        `• Monthly safe capacity: ${formatSAR(
          snapshot.averageMonthlyAvailableToSpend
        )}`
      : "This profile currently has no active savings goal.";

  const spendingText =
    topCategory
      ? `${topCategory.name} is currently the highest variable-spending category at ${formatSAR(
          topCategory.amount
        )} during the selected period.`
      : "There is not enough variable-spending data for this period.";

  return [
    {
      title: "Financial overview",
      messages: initialMessages,
    },
    {
      title: "Cash-flow analysis",
      messages: [
        ...initialMessages,
        {
          from: "user",
          text: "Give me my financial overview",
        },
        {
          from: "ai",
          text: overviewText,
        },
      ],
    },
    {
      title: "Spending behavior",
      messages: [
        ...initialMessages,
        {
          from: "user",
          text: "Analyze my spending behavior",
        },
        {
          from: "ai",
          text: `${spendingText}\n\n${behaviorText}`,
        },
      ],
    },
    {
      title: "Savings strategy",
      messages: [
        ...initialMessages,
        {
          from: "user",
          text: "Am I on track with my savings goal?",
        },
        {
          from: "ai",
          text: goalText,
        },
      ],
    },
    {
      title: "Liabilities",
      messages: [
        ...initialMessages,
        {
          from: "user",
          text: "What are my largest liabilities?",
        },
      ],
    },
  ];
}

function SnapshotRow({
  label,
  value,
  color,
  last = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems: "center",
        gap: 12,
        padding: "7px 0",
        borderBottom: last
          ? "none"
          : "1px solid var(--color-border)",
      }}
    >
      <span
        style={{
          color:
            "var(--color-text-muted)",
          fontSize: 11,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color,
          fontSize: 11,
          fontWeight: 600,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function ChatPage() {
  const {
    userId,
    profileData,
    profile,

    goals,
    liabilities,
    subscriptions,
    emergencyFund,

    periodTransactions,

    selectedPeriod,
    supportedPeriods,
    setSelectedPeriod,

    snapshot,

    loading: profileLoading,
    error: profileError,

    reloadProfile,
    loadAnotherProfile,
  } = useDemoProfile();

  const [
    userName,
    setUserName,
  ] = useState("User");

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState(0);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [input, setInput] =
    useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const bottomRef =
    useRef(null);

  const previousProfileRef =
    useRef("");

  const previousPeriodRef =
    useRef(selectedPeriod);

  const suggestions =
    useMemo(
      () =>
        createSuggestions({
          goals,
          periodTransactions,
          snapshot,
          liabilities,
          subscriptions,
          emergencyFund,
        }),
      [
        goals,
        periodTransactions,
        snapshot,
        liabilities,
        subscriptions,
        emergencyFund,
      ]
    );

  const conversations =
    useMemo(
      () =>
        createConversationTemplates({
          userName,
          profile,
          goals,
          periodTransactions,
          snapshot,
          selectedPeriod,
          emergencyFund,
          liabilities,
          subscriptions,
        }),
      [
        userName,
        profile,
        goals,
        periodTransactions,
        snapshot,
        selectedPeriod,
        emergencyFund,
        liabilities,
        subscriptions,
      ]
    );

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
        "Unable to load Rashd user:",
        userError
      );

      setUserName("User");
    }
  }, []);

  useEffect(() => {
    if (
      !profile ||
      !userId ||
      profileLoading
    ) {
      return;
    }

    const profileChanged =
      previousProfileRef.current !==
      userId;

    const periodChanged =
      previousPeriodRef.current !==
      selectedPeriod;

    if (
      messages.length === 0 ||
      profileChanged ||
      periodChanged
    ) {
      const initialMessages =
        buildInitialMessage({
          userName,
          profile,
          goals,
          periodTransactions,
          snapshot,
          selectedPeriod,
          emergencyFund,
          liabilities,
          subscriptions,
        });

      setMessages(
        initialMessages
      );

      setSelectedConversation(0);
      setInput("");
      setError("");

      previousProfileRef.current =
        userId;

      previousPeriodRef.current =
        selectedPeriod;
    }
  }, [
    userId,
    profile,
    goals,
    periodTransactions,
    snapshot,
    selectedPeriod,
    emergencyFund,
    liabilities,
    subscriptions,
    profileLoading,
    userName,
    messages.length,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const startNewConversation = () => {
    const initialMessages =
      buildInitialMessage({
        userName,
        profile,
        goals,
        periodTransactions,
        snapshot,
        selectedPeriod,
        emergencyFund,
        liabilities,
        subscriptions,
      });

    setSelectedConversation(0);
    setMessages(
      initialMessages
    );
    setInput("");
    setError("");
  };

  const handleConversationSelect = (
    conversation,
    index
  ) => {
    setSelectedConversation(index);

    setMessages(
      conversation.messages
    );

    setInput("");
    setError("");
  };

  const handleLoadAnotherProfile =
    async () => {
      if (
        loading ||
        profileLoading
      ) {
        return;
      }

      setMessages([]);
      setSelectedConversation(0);
      setInput("");
      setError("");

      previousProfileRef.current =
        "";

      await loadAnotherProfile();
    };

  const handlePeriodChange = (
    period
  ) => {
    if (
      loading ||
      period === selectedPeriod
    ) {
      return;
    }

    setSelectedPeriod(period);
    setMessages([]);
    setInput("");
    setError("");
    setSelectedConversation(0);
  };

  const sendMessage = async (
    text
  ) => {
    const messageText =
      typeof text === "string"
        ? text.trim()
        : input.trim();

    if (
      !messageText ||
      loading ||
      profileLoading ||
      !profileData ||
      !userId
    ) {
      return;
    }

    const userMessage = {
      from: "user",
      text: messageText,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(
      updatedMessages
    );

    setInput("");
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/assistant",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              message:
                messageText,

              userId,

              period:
                selectedPeriod,

              history:
                updatedMessages
                  .slice(-8)
                  .map(
                    (message) => ({
                      role:
                        message.from ===
                        "user"
                          ? "user"
                          : "assistant",

                      content:
                        message.text,
                    })
                  ),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Rashd could not generate a response."
        );
      }

      setMessages(
        (
          previousMessages
        ) => [
          ...previousMessages,
          {
            from: "ai",

            text:
              data.reply ||
              "Sorry, I could not generate a response.",
          },
        ]
      );
    } catch (chatError) {
      console.warn(
        "Chat request failed:",
        chatError
      );

      setError(
        chatError instanceof Error
          ? chatError.message
          : "Rashd could not respond. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
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
            padding: 32,
          }}
        >
          <div
            style={{
              textAlign: "center",
              color:
                "var(--color-text-muted)",
            }}
          >
            <div
              style={{
                fontSize: 30,
                marginBottom: 14,
              }}
            >
              🤖
            </div>

            <p>
              Rashd is preparing your
              financial context...
            </p>
          </div>
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
              maxWidth: 480,
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
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              {profileError ||
                "Unable to load the financial profile."}
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

  const primaryGoal =
    goals?.[0] || null;

  const monthlyCommitments =
    toNumber(
      snapshot.averageMonthlyFixedObligations
    ) +
    toNumber(
      snapshot.averageMonthlySubscriptions
    );

  const riskColor =
    snapshot.riskFlag === "High"
      ? "#E85D75"
      : snapshot.riskFlag ===
        "Medium"
      ? "#C9A84C"
      : "#2DCFB3";

  return (
    <AppShell>
      <div
        className="chat-layout"
        style={{
          display: "flex",
          height: "100vh",
          minHeight: 0,
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 270,
            borderRight:
              "1px solid var(--color-border)",
            display: "flex",
            flexDirection:
              "column",
            padding: 20,
            background:
              "var(--color-midnight)",
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          <button
            type="button"
            onClick={
              startNewConversation
            }
            style={{
              width: "100%",
              padding:
                "11px 16px",
              borderRadius: 10,
              background:
                "var(--color-gold-glow)",
              border:
                "1px solid var(--color-border-strong)",
              color:
                "var(--color-gold)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 12,
              textAlign: "left",
              fontFamily:
                "var(--font-body)",
            }}
          >
            + New Conversation
          </button>

          <button
            type="button"
            onClick={
              handleLoadAnotherProfile
            }
            disabled={
              profileLoading ||
              loading
            }
            style={{
              width: "100%",
              padding:
                "10px 16px",
              borderRadius: 10,
              background:
                "transparent",
              border:
                "1px solid var(--color-border)",
              color:
                "var(--color-text-muted)",
              fontSize: 12,
              cursor:
                profileLoading ||
                loading
                  ? "default"
                  : "pointer",
              marginBottom: 22,
              textAlign: "left",
              fontFamily:
                "var(--font-body)",
              opacity:
                profileLoading ||
                loading
                  ? 0.5
                  : 1,
            }}
          >
            ↻ Load Another Demo
            Profile
          </button>

          <div
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: 10,
              letterSpacing:
                "0.1em",
              textTransform:
                "uppercase",
              marginBottom: 10,
            }}
          >
            Analysis Period
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 7,
              marginBottom: 22,
            }}
          >
            {supportedPeriods.map(
              (period) => {
                const active =
                  period ===
                  selectedPeriod;

                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() =>
                      handlePeriodChange(
                        period
                      )
                    }
                    disabled={
                      loading
                    }
                    style={{
                      padding:
                        "8px 10px",
                      borderRadius: 9,
                      border: `1px solid ${
                        active
                          ? "var(--color-border-strong)"
                          : "var(--color-border)"
                      }`,
                      background:
                        active
                          ? "var(--color-gold-glow)"
                          : "var(--color-surface)",
                      color:
                        active
                          ? "var(--color-gold)"
                          : "var(--color-text-muted)",
                      fontSize: 11,
                      fontWeight:
                        active
                          ? 700
                          : 500,
                      cursor:
                        loading
                          ? "default"
                          : "pointer",
                      fontFamily:
                        "var(--font-body)",
                      opacity:
                        loading
                          ? 0.6
                          : 1,
                    }}
                  >
                    {period}M
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: 11,
              letterSpacing:
                "0.1em",
              textTransform:
                "uppercase",
              marginBottom: 12,
            }}
          >
            Recent
          </div>

          {conversations.map(
            (
              conversation,
              index
            ) => {
              const active =
                selectedConversation ===
                index;

              return (
                <button
                  key={
                    conversation.title
                  }
                  type="button"
                  onClick={() =>
                    handleConversationSelect(
                      conversation,
                      index
                    )
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding:
                      "10px 12px",
                    borderRadius: 8,
                    marginBottom: 4,
                    color: active
                      ? "var(--color-text)"
                      : "var(--color-text-muted)",
                    background: active
                      ? "var(--color-surface)"
                      : "transparent",
                    border: active
                      ? "1px solid var(--color-border)"
                      : "1px solid transparent",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily:
                      "var(--font-body)",
                  }}
                >
                  {
                    conversation.title
                  }
                </button>
              );
            }
          )}

          {/* Profile */}
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background:
                "var(--color-gold-glow)",
              border:
                "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                color:
                  "var(--color-gold)",
                fontSize: 10,
                letterSpacing:
                  "0.1em",
                textTransform:
                  "uppercase",
                marginBottom: 8,
              }}
            >
              Synthetic Profile
            </div>

            <div
              style={{
                color:
                  "var(--color-text)",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {profile.persona ||
                "Demo Profile"}
            </div>

            <div
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
              }}
            >
              {userId} ·{" "}
              {profile.city ||
                "Saudi Arabia"}
            </div>
          </div>

          {/* Snapshot */}
          <div
            style={{
              marginTop: 16,
              background:
                "var(--color-surface)",
              borderRadius: 12,
              border:
                "1px solid var(--color-border)",
              padding: 16,
            }}
          >
            <div
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 10,
                letterSpacing:
                  "0.1em",
                textTransform:
                  "uppercase",
                marginBottom: 8,
              }}
            >
              Financial Snapshot
            </div>

            <SnapshotRow
              label="Balance"
              value={formatSAR(
                snapshot.currentBalance
              )}
              color="#2DCFB3"
            />

            <SnapshotRow
              label="Monthly income"
              value={formatSAR(
                snapshot.averageMonthlyIncome
              )}
              color="#4FA3E0"
            />

            <SnapshotRow
              label="Commitments"
              value={formatSAR(
                monthlyCommitments
              )}
              color="#9B7EDE"
            />

            <SnapshotRow
              label="Available"
              value={formatSAR(
                snapshot.averageMonthlyAvailableToSpend
              )}
              color={
                snapshot.averageMonthlyAvailableToSpend >=
                0
                  ? "#C9A84C"
                  : "#E85D75"
              }
            />

            <SnapshotRow
              label="Health"
              value={`${snapshot.healthScore}/100`}
              color="#4FA3E0"
            />

            <SnapshotRow
              label="Risk"
              value={
                snapshot.riskFlag
              }
              color={riskColor}
              last
            />
          </div>
        </div>

        {/* Main chat */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection:
              "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding:
                "18px 28px",
              borderBottom:
                "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: 20,
              background:
                "var(--color-midnight)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, rgba(201,168,76,0.3), rgba(45,207,179,0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  border:
                    "1px solid var(--color-border-strong)",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                🤖
              </div>

              <div>
                <div
                  style={{
                    color:
                      "var(--color-text)",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  Rashd Financial AI
                </div>

                <div
                  style={{
                    color:
                      "#2DCFB3",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {loading
                    ? "⟳ Analyzing your financial context..."
                    : `● Online · ${
                        PERIOD_LABELS[
                          selectedPeriod
                        ]
                      } analysis`}
                </div>
              </div>
            </div>

            <Badge color="#2DCFB3">
              ● Cash-Flow Powered
            </Badge>
          </div>

          {/* Context bar */}
          <div
            style={{
              padding:
                "11px 28px",
              borderBottom:
                "1px solid var(--color-border)",
              background:
                "var(--color-gold-glow)",
              display: "flex",
              gap: 22,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 12,
              }}
            >
              Monthly income:{" "}
              <strong
                style={{
                  color:
                    "var(--color-text)",
                }}
              >
                {formatSAR(
                  snapshot.averageMonthlyIncome
                )}
              </strong>
            </span>

            <span
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 12,
              }}
            >
              Fixed commitments:{" "}
              <strong
                style={{
                  color:
                    "var(--color-text)",
                }}
              >
                {formatSAR(
                  monthlyCommitments
                )}
              </strong>
            </span>

            <span
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 12,
              }}
            >
              Available monthly:{" "}
              <strong
                style={{
                  color:
                    snapshot.averageMonthlyAvailableToSpend >=
                    0
                      ? "#2DCFB3"
                      : "#E85D75",
                }}
              >
                {formatSAR(
                  snapshot.averageMonthlyAvailableToSpend
                )}
              </strong>
            </span>

            {primaryGoal && (
              <span
                style={{
                  color:
                    "var(--color-text-muted)",
                  fontSize: 12,
                }}
              >
                Goal:{" "}
                <strong
                  style={{
                    color:
                      "var(--color-text)",
                  }}
                >
                  {
                    primaryGoal.goal_name
                  }{" "}
                  (
                  {getGoalProgress(
                    primaryGoal
                  )}
                  %)
                </strong>
              </span>
            )}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 28,
              display: "flex",
              flexDirection:
                "column",
              gap: 20,
            }}
          >
            {messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={`${message.from}-${index}`}
                  style={{
                    display: "flex",
                    justifyContent:
                      message.from ===
                      "user"
                        ? "flex-end"
                        : "flex-start",
                    alignItems:
                      "flex-start",
                    gap: 12,
                  }}
                >
                  {message.from ===
                    "ai" && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        flexShrink: 0,
                        background:
                          "var(--color-gold-glow)",
                        border:
                          "1px solid var(--color-border)",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize: 14,
                        marginTop: 4,
                      }}
                    >
                      ر
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth:
                        "72%",
                      background:
                        message.from ===
                        "user"
                          ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))"
                          : "var(--color-surface)",
                      border: `1px solid ${
                        message.from ===
                        "user"
                          ? "var(--color-border-strong)"
                          : "var(--color-border)"
                      }`,
                      borderRadius:
                        message.from ===
                        "user"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      padding:
                        "14px 18px",
                    }}
                  >
                    <p
                      style={{
                        color:
                          "var(--color-text)",
                        fontSize: 14,
                        lineHeight: 1.7,
                        margin: 0,
                        whiteSpace:
                          "pre-line",
                      }}
                    >
                      {message.text}
                    </p>
                  </div>
                </div>
              )
            )}

            {loading && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems:
                    "flex-start",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    flexShrink: 0,
                    background:
                      "var(--color-gold-glow)",
                    border:
                      "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    fontSize: 14,
                  }}
                >
                  ر
                </div>

                <div
                  style={{
                    background:
                      "var(--color-surface)",
                    border:
                      "1px solid var(--color-border)",
                    borderRadius:
                      "16px 16px 16px 4px",
                    padding:
                      "16px 20px",
                    display: "flex",
                    gap: 6,
                    alignItems:
                      "center",
                  }}
                >
                  {[0, 1, 2].map(
                    (dot) => (
                      <div
                        key={dot}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius:
                            "50%",
                          background:
                            "var(--color-gold)",
                          animation: `rashdBounce 1.2s ease-in-out ${
                            dot * 0.2
                          }s infinite`,
                        }}
                      />
                    )
                  )}

                  <style>{`
                    @keyframes rashdBounce {
                      0%, 80%, 100% {
                        transform: scale(0.7);
                        opacity: 0.4;
                      }

                      40% {
                        transform: scale(1);
                        opacity: 1;
                      }
                    }
                  `}</style>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding:
                    "12px 18px",
                  borderRadius: 12,
                  background:
                    "rgba(232,93,117,0.1)",
                  border:
                    "1px solid rgba(232,93,117,0.3)",
                  color:
                    "#E85D75",
                  fontSize: 13,
                  maxWidth: 460,
                }}
              >
                ⚠ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div
            style={{
              padding:
                "0 28px 14px",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {suggestions.map(
              (suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    sendMessage(
                      suggestion
                    )
                  }
                  disabled={
                    loading
                  }
                  style={{
                    padding:
                      "7px 14px",
                    borderRadius: 20,
                    background:
                      "transparent",
                    border:
                      "1px solid var(--color-border)",
                    color:
                      "var(--color-text-muted)",
                    fontSize: 12,
                    cursor:
                      loading
                        ? "default"
                        : "pointer",
                    fontFamily:
                      "var(--font-body)",
                    opacity:
                      loading
                        ? 0.5
                        : 1,
                  }}
                >
                  {suggestion}
                </button>
              )
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding:
                "14px 28px 28px",
              borderTop:
                "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                background:
                  "var(--color-surface)",
                border:
                  "1px solid var(--color-border)",
                borderRadius: 14,
                padding:
                  "10px 12px 10px 18px",
              }}
            >
              <input
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                disabled={loading}
                placeholder={`Ask Rashd anything, ${getFirstName(
                  userName
                )}...`}
                style={{
                  flex: 1,
                  background:
                    "none",
                  border: "none",
                  outline: "none",
                  color:
                    "var(--color-text)",
                  fontSize: 14,
                  fontFamily:
                    "var(--font-body)",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  sendMessage()
                }
                disabled={
                  !input.trim() ||
                  loading ||
                  !userId
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: "none",
                  background:
                    input.trim() &&
                    !loading &&
                    userId
                      ? "linear-gradient(135deg, #C9A84C, #8A6F32)"
                      : "var(--color-ink)",
                  cursor:
                    input.trim() &&
                    !loading &&
                    userId
                      ? "pointer"
                      : "default",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  color:
                    input.trim() &&
                    !loading &&
                    userId
                      ? "#0A0A0F"
                      : "var(--color-text-dim)",
                  flexShrink: 0,
                }}
              >
                →
              </button>
            </div>

            <p
              style={{
                color:
                  "var(--color-text-dim)",
                fontSize: 11,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              Powered by Rashd AI ·
              Analysis based on fully
              synthetic financial data
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
