// lib/mockData.js
// Mock financial data for Rashd AI (رشد) MVP — simulates a connected bank account
// until real Open Banking integration is available (see pitch deck: "التطوير المستقبلي").

const userProfile = {
  id: "user_001",
  name: "سلطان",
  currentBalance: 8450, // SAR
  monthlyIncome: 9000,
  monthlyBudget: {
    total: 6500,
    categories: {
      food: 1200,
      transport: 500,
      shopping: 800,
      entertainment: 400,
      bills: 2200,
      subscriptions: 300,
      other: 1100,
    },
  },
  savingsGoals: [
    {
      id: "goal_travel",
      name: "رحلة إلى اليابان",
      targetAmount: 12000,
      currentAmount: 3200,
      targetDate: "2026-12-01",
    },
    {
      id: "goal_emergency",
      name: "صندوق الطوارئ",
      targetAmount: 15000,
      currentAmount: 6000,
      targetDate: "2027-06-01",
    },
  ],
};

// ~45 days of transactions engineered to include a normal baseline
// AND a deliberate "emotional spending" cluster (late-night, repeated, non-essential)
// so the detection logic below has something real to flag.
const transactions = [
  // --- Normal baseline spending ---
  { id: "t001", date: "2026-06-01T08:15:00", amount: 35, category: "food", merchant: "Starbucks" },
  { id: "t002", date: "2026-06-01T13:00:00", amount: 60, category: "food", merchant: "Lunch spot" },
  { id: "t003", date: "2026-06-02T09:00:00", amount: 150, category: "transport", merchant: "Fuel station" },
  { id: "t004", date: "2026-06-03T19:30:00", amount: 220, category: "food", merchant: "Restaurant" },
  { id: "t005", date: "2026-06-04T10:00:00", amount: 2200, category: "bills", merchant: "Rent/utilities" },
  { id: "t006", date: "2026-06-05T14:00:00", amount: 90, category: "shopping", merchant: "Pharmacy" },
  { id: "t007", date: "2026-06-06T20:00:00", amount: 45, category: "entertainment", merchant: "Cinema" },
  { id: "t008", date: "2026-06-07T09:30:00", amount: 300, category: "subscriptions", merchant: "Gym + streaming" },
  { id: "t009", date: "2026-06-08T12:00:00", amount: 70, category: "food", merchant: "Groceries" },
  { id: "t010", date: "2026-06-09T11:00:00", amount: 130, category: "transport", merchant: "Fuel station" },

  // --- Emotional spending cluster: late-night, repeated shopping, non-essential ---
  // (Designed to trigger: time-of-day + frequency-burst + category-deviation rules)
  { id: "t011", date: "2026-06-10T23:40:00", amount: 480, category: "shopping", merchant: "Online store - clothing" },
  { id: "t012", date: "2026-06-11T00:20:00", amount: 260, category: "shopping", merchant: "Online store - electronics" },
  { id: "t013", date: "2026-06-11T23:55:00", amount: 340, category: "shopping", merchant: "Online store - clothing" },
  { id: "t014", date: "2026-06-12T01:10:00", amount: 190, category: "entertainment", merchant: "In-app purchases" },
  { id: "t015", date: "2026-06-12T22:45:00", amount: 410, category: "shopping", merchant: "Online store - accessories" },

  // --- Back to normal ---
  { id: "t016", date: "2026-06-14T09:00:00", amount: 65, category: "food", merchant: "Groceries" },
  { id: "t017", date: "2026-06-15T18:00:00", amount: 80, category: "food", merchant: "Dinner" },
  { id: "t018", date: "2026-06-16T10:00:00", amount: 500, category: "shopping", merchant: "Electronics store" },
  { id: "t019", date: "2026-06-17T09:00:00", amount: 140, category: "transport", merchant: "Fuel station" },
  { id: "t020", date: "2026-06-18T19:00:00", amount: 55, category: "entertainment", merchant: "Streaming" },
];

module.exports = { userProfile, transactions };
