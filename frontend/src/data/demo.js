export const demoProfile = {
  name: "ankit khade",
  age: 28,
  gender: "Male",
  category: "SC",
  state: "Maharashtra",
  district: "Parbhani",
  income: 240000,
  project_cost: 200000,
  required_amount: 200000,
  purpose: "Starting a small business",
  business_type: "Tailoring",
  education: "Diploma / vocational"
};

export const demoSchemes = [
  {
    id: "SC001",
    name: "Entrepreneurship Support Scheme",
    category: ["SC"],
    income_limit: 300000,
    min_amount: 50000,
    max_amount: 500000,
    purposes: ["business", "entrepreneurship", "small business"],
    locations: ["Maharashtra"]
  },
  {
    id: "SC002",
    name: "Micro Business Assistance Scheme",
    category: ["SC", "eligible applicants"],
    income_limit: 500000,
    min_amount: 50000,
    max_amount: 1000000,
    purposes: ["micro enterprise", "business", "small business"],
    locations: ["Maharashtra", "All India"]
  },
  {
    id: "SC003",
    name: "Skill & Enterprise Starter Scheme",
    category: ["eligible entrepreneurs", "SC"],
    income_limit: 400000,
    min_amount: 25000,
    max_amount: 300000,
    purposes: ["skill-based business", "business", "entrepreneurship"],
    locations: ["Maharashtra", "All India"]
  }
];

export const demoPartners = [
  { id: "P001", name: "Demo Channel Partner - Parbhani", district: "Parbhani", schemes: ["SC001", "SC003"], distance_km: 3.2 },
  { id: "P002", name: "Demo Channel Partner - Nanded", district: "Nanded", schemes: ["SC002"], distance_km: 62 },
  { id: "P003", name: "Demo Channel Partner - Chhatrapati Sambhajinagar", district: "Chhatrapati Sambhajinagar", schemes: ["SC001"], distance_km: 190 }
];

export const demoDocuments = [
  ["Identity Proof", "Required", "Basic identity evidence."],
  ["Caste Certificate", "Required", "Verifies the configured category."],
  ["Income Certificate", "Required", "Supports the income condition."],
  ["Address Proof", "Required", "Establishes applicant location."],
  ["Project/Business Details", "Required", "Describes the proposed business."],
  ["Bank Account Details", "Required", "Illustrative financial-routing requirement."]
];
