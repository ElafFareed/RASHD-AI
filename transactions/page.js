"use client";
// app/transactions/page.js

import { useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import {
  Badge,
  GoldLine,
  StatCard,
} from "../../components/UI";
import { useDemoProfile } from "../../components/DemoProfileProvider";

const CATEGORY_COLORS = {
  Income: "#2DCFB3",
  Food: "#E85D75",
  Coffee: "#D977A5",
  Transport: "#4FA3E0",
  Shopping: "#C9A84C",
  Entertainment: "#2DCFB3",
  Groceries: "#34D399",
  Health: "#F59E0B",
  Education: "#9B7EDE",
  "Personal Care": "#F472B6",

  "Debt Payment": "#9B7EDE",
  Rent: "#A78BFA",
  Telecom: "#4FA3E0",
  Utilities: "#F59E0B",
  Insurance: "#34D399",
  Membership: "#C9A84C",
  Subscriptions: "#D977A5",

  "Savings Transfer": "#C9A84C",
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

function formatAmount(value) {
  const amount = toNumber(value);
  const sign = amount >= 0 ? "+" : "-";

  return `${sign}SAR ${Math.abs(
    Math.round(amount)
  ).toLocaleString()}`;
}

function formatSAR(value) {
  return `SAR ${Math.abs(
    Math.round(toNumber(value))
  ).toLocaleString()}`;
}

function getTransactionDate(transaction) {
  const value =
    transaction.datetime ||
    `${transaction.date || ""}T${
      transaction.time || "00:00"
    }`;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }

  return parsed;
}

function formatDate(transaction) {
  const parsed =
    getTransactionDate(transaction);

  if (parsed.getTime() === 0) {
    return transaction.date || "Unknown";
  }

  return parsed.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getTransactionKind(transaction) {
  const amount = toNumber(
    transaction.amount
  );

  if (
    transaction.type === "income" ||
    amount > 0
  ) {
    return "income";
  }

  if (
    transaction.type === "transfer" ||
    transaction.category ===
      "Savings Transfer"
  ) {
    return "savings";
  }

  return "expense";
}

function getTransactionIcon(kind) {
  if (kind === "income") {
    return "↑";
  }

  if (kind === "savings") {
    return "◆";
  }

  return "↓";
}

function getAmountColor(kind) {
  if (kind === "income") {
    return "#2DCFB3";
  }

  if (kind === "savings") {
    return "#C9A84C";
  }

  return "var(--color-text)";
}

export default function TransactionsPage() {
  const {
    userId,
    profile,

    periodTransactions,

    selectedPeriod,
    supportedPeriods,
    setSelectedPeriod,

    loading,
    error,
    reloadProfile,
  } = useDemoProfile();

  const [filter, setFilter] =
    useState("All");

  const [search, setSearch] =
    useState("");

  const normalizedTransactions =
    useMemo(() => {
      return [
        ...periodTransactions,
      ]
        .map((transaction) => {
          const amount = toNumber(
            transaction.amount
          );

          const kind =
            getTransactionKind(
              transaction
            );

          const category =
            transaction.category ||
            (kind === "income"
              ? "Income"
              : kind === "savings"
              ? "Savings Transfer"
              : "Other");

          return {
            id:
              transaction.transaction_id ||
              `${transaction.merchant}-${transaction.datetime}`,

            name:
              transaction.merchant ||
              (kind === "income"
                ? "Income Deposit"
                : kind === "savings"
                ? "Savings Transfer"
                : "Transaction"),

            category,
            amount,
            kind,

            dateLabel:
              formatDate(transaction),

            dateObject:
              getTransactionDate(
                transaction
              ),

            paymentChannel:
              transaction.payment_channel ||
              "Unknown",

            city:
              transaction.city ||
              profile?.city ||
              "",

            isWeekend:
              transaction.is_weekend ===
                true ||
              transaction.is_weekend ===
                "True",

            isLateNight:
              transaction.is_late_night ===
                true ||
              transaction.is_late_night ===
                "True",

            isEssential:
              transaction.is_essential ===
                true ||
              transaction.is_essential ===
                "True",

            burstGroup:
              transaction.burst_group ||
              "",
          };
        })
        .sort(
          (first, second) =>
            second.dateObject.getTime() -
            first.dateObject.getTime()
        );
    }, [
      periodTransactions,
      profile,
    ]);

  const filters = useMemo(() => {
    const categories = Array.from(
      new Set(
        normalizedTransactions.map(
          (transaction) =>
            transaction.category
        )
      )
    ).sort();

    return ["All", ...categories];
  }, [normalizedTransactions]);

  const filteredTransactions =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return normalizedTransactions.filter(
        (transaction) => {
          const matchesFilter =
            filter === "All" ||
            transaction.category ===
              filter;

          const matchesSearch =
            !normalizedSearch ||
            transaction.name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            transaction.category
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            transaction.paymentChannel
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      normalizedTransactions,
      filter,
      search,
    ]);

  const summary = useMemo(() => {
    const totalIncome =
      normalizedTransactions
        .filter(
          (transaction) =>
            transaction.kind ===
            "income"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Math.abs(
              transaction.amount
            ),
          0
        );

    const totalSpending =
      normalizedTransactions
        .filter(
          (transaction) =>
            transaction.kind ===
            "expense"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Math.abs(
              transaction.amount
            ),
          0
        );

    const totalSavings =
      normalizedTransactions
        .filter(
          (transaction) =>
            transaction.kind ===
            "savings"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Math.abs(
              transaction.amount
            ),
          0
        );

    const netCashFlow =
      totalIncome -
      totalSpending -
      totalSavings;

    return {
      totalIncome,
      totalSpending,
      totalSavings,
      netCashFlow,
    };
  }, [normalizedTransactions]);

  const periodLabel =
    PERIOD_LABELS[
      selectedPeriod
    ] || `${selectedPeriod} Months`;

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
          Loading transactions...
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
                "Unable to load transactions."}
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
            marginBottom: 28,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Badge>
              ○ Transactions
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
              Financial Activity
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
              Showing activity for
              the selected{" "}
              {periodLabel.toLowerCase()}.
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
              Transaction Period
            </div>

            <div
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
              }}
            >
              Summary cards and
              transaction records update
              together.
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
                    onClick={() => {
                      setSelectedPeriod(
                        period
                      );

                      setFilter(
                        "All"
                      );
                    }}
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

        {/* Summary cards */}
        <div
          className="grid-4"
          style={{
            marginBottom: 28,
          }}
        >
          <StatCard
            icon="📥"
            label="Period Income"
            value={formatSAR(
              summary.totalIncome
            )}
            sub={`${periodLabel} total`}
            color="#2DCFB3"
          />

          <StatCard
            icon="📤"
            label="Actual Spending"
            value={formatSAR(
              summary.totalSpending
            )}
            sub="Excludes savings transfers"
            color="#E85D75"
          />

          <StatCard
            icon="🎯"
            label="Savings Transfers"
            value={formatSAR(
              summary.totalSavings
            )}
            sub="Moved toward goals"
            color="#C9A84C"
          />

          <StatCard
            icon="⚖️"
            label="Net Cash Flow"
            value={`${
              summary.netCashFlow >= 0
                ? "+"
                : "-"
            }${formatSAR(
              Math.abs(
                summary.netCashFlow
              )
            )}`}
            sub={`${normalizedTransactions.length} records`}
            color={
              summary.netCashFlow >= 0
                ? "#2DCFB3"
                : "#E85D75"
            }
          />
        </div>

        <GoldLine
          style={{
            marginBottom: 24,
          }}
        />

        {/* Category filters and search */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {filters.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setFilter(item)
                  }
                  style={{
                    padding:
                      "7px 14px",
                    borderRadius: 20,
                    background:
                      filter === item
                        ? "var(--color-gold-glow)"
                        : "transparent",
                    border: `1px solid ${
                      filter === item
                        ? "var(--color-border-strong)"
                        : "var(--color-border)"
                    }`,
                    color:
                      filter === item
                        ? "var(--color-gold)"
                        : "var(--color-text-muted)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily:
                      "var(--font-body)",
                  }}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search merchant, category, or channel..."
            style={{
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 10,
              padding:
                "10px 16px",
              color:
                "var(--color-text)",
              fontSize: 13,
              outline: "none",
              width: 280,
              maxWidth: "100%",
            }}
            onFocus={(event) => {
              event.target.style.borderColor =
                "var(--color-gold)";
            }}
            onBlur={(event) => {
              event.target.style.borderColor =
                "var(--color-border)";
            }}
          />
        </div>

        {/* Results count */}
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
          <span
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: 12,
            }}
          >
            {filteredTransactions.length}{" "}
            result
            {filteredTransactions.length ===
            1
              ? ""
              : "s"}
          </span>

          {(filter !== "All" ||
            search.trim()) && (
            <button
              type="button"
              onClick={() => {
                setFilter("All");
                setSearch("");
              }}
              style={{
                border: "none",
                background:
                  "transparent",
                color:
                  "var(--color-gold)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily:
                  "var(--font-body)",
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Transaction list */}
        <div
          style={{
            background:
              "var(--color-surface)",
            border:
              "1px solid var(--color-border)",
            borderRadius: 16,
            padding: "8px 24px",
          }}
        >
          {filteredTransactions.length ===
            0 && (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color:
                  "var(--color-text-dim)",
                fontSize: 13,
              }}
            >
              No transactions match
              your current filters.
            </div>
          )}

          {filteredTransactions.map(
            (
              transaction,
              index
            ) => {
              const color =
                CATEGORY_COLORS[
                  transaction.category
                ] ||
                CATEGORY_COLORS.Other;

              const amountColor =
                getAmountColor(
                  transaction.kind
                );

              return (
                <div
                  key={transaction.id}
                  className="tx-row"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    padding:
                      "14px 4px",
                    borderBottom:
                      index <
                      filteredTransactions.length -
                        1
                        ? "1px solid var(--color-border)"
                        : "none",
                    borderRadius: 8,
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 14,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${color}15`,
                        border: `1px solid ${color}30`,
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize: 15,
                        color,
                        flexShrink: 0,
                      }}
                    >
                      {getTransactionIcon(
                        transaction.kind
                      )}
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
                        {transaction.name}
                      </div>

                      <div
                        style={{
                          color:
                            "var(--color-text-muted)",
                          fontSize: 11,
                          marginTop: 3,
                        }}
                      >
                        {
                          transaction.category
                        }{" "}
                        ·{" "}
                        {
                          transaction.dateLabel
                        }{" "}
                        ·{" "}
                        {
                          transaction.paymentChannel
                        }
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 6,
                        }}
                      >
                        {transaction.kind ===
                          "savings" && (
                          <span
                            style={{
                              padding:
                                "2px 7px",
                              borderRadius: 12,
                              fontSize: 9,
                              background:
                                "rgba(201,168,76,0.12)",
                              color:
                                "#C9A84C",
                              border:
                                "1px solid rgba(201,168,76,0.2)",
                            }}
                          >
                            Savings
                          </span>
                        )}

                        {transaction.isEssential &&
                          transaction.kind ===
                            "expense" && (
                            <span
                              style={{
                                padding:
                                  "2px 7px",
                                borderRadius: 12,
                                fontSize: 9,
                                background:
                                  "rgba(79,163,224,0.12)",
                                color:
                                  "#4FA3E0",
                                border:
                                  "1px solid rgba(79,163,224,0.2)",
                              }}
                            >
                              Essential
                            </span>
                          )}

                        {transaction.isWeekend && (
                          <span
                            style={{
                              padding:
                                "2px 7px",
                              borderRadius: 12,
                              fontSize: 9,
                              background:
                                "rgba(201,168,76,0.12)",
                              color:
                                "#C9A84C",
                              border:
                                "1px solid rgba(201,168,76,0.2)",
                            }}
                          >
                            Weekend
                          </span>
                        )}

                        {transaction.isLateNight && (
                          <span
                            style={{
                              padding:
                                "2px 7px",
                              borderRadius: 12,
                              fontSize: 9,
                              background:
                                "rgba(232,93,117,0.12)",
                              color:
                                "#E85D75",
                              border:
                                "1px solid rgba(232,93,117,0.2)",
                            }}
                          >
                            Late night
                          </span>
                        )}

                        {transaction.burstGroup && (
                          <span
                            style={{
                              padding:
                                "2px 7px",
                              borderRadius: 12,
                              fontSize: 9,
                              background:
                                "rgba(155,126,222,0.12)",
                              color:
                                "#9B7EDE",
                              border:
                                "1px solid rgba(155,126,222,0.2)",
                            }}
                          >
                            Spending burst
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      color:
                        amountColor,
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {formatAmount(
                      transaction.amount
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </AppShell>
  );
}