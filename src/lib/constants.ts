export const PROJECT_STAGES = [
  "Book Survey",
  "Survey & Return Report",
  "Report Submitted – Awaiting Agreement",
  "Planning & Authorisation",
  "Schedule Works",
  "Works In Progress",
  "Works Completed",
  "Snagging (If Needed)",
  "Final Accounts & Invoicing",
  "Closed",
  "On Hold"
]

export const VULNERABILITY_OPTIONS = [
  // Physical & Age Related
  { id: "elderly", label: "Elderly", category: "Physical", icon: "👴", color: "orange" },
  { id: "mobility_issues", label: "Mobility Issues", category: "Physical", icon: "♿", color: "blue" },
  { id: "visual_impairment", label: "Visual Impairment", category: "Physical", icon: "👁️", color: "purple" },
  { id: "hearing_impairment", label: "Hearing Impairment", category: "Physical", icon: "👂", color: "purple" },
  
  // Health Related
  { id: "health_concerns", label: "Health Concerns", category: "Medical", icon: "🏥", color: "red" },
  { id: "mental_health", label: "Mental Health", category: "Medical", icon: "🧠", color: "pink" },
  { id: "dementia_alzheimers", label: "Dementia/Alzheimers", category: "Medical", icon: "🧠", color: "red" },
  
  // Social & Communication
  { id: "vulnerable_adult", label: "Vulnerable Adult", category: "Social", icon: "🛡️", color: "red" },
  { id: "language_barrier", label: "Language Barrier", category: "Communication", icon: "🌍", color: "green" },
  { id: "learning_disability", label: "Learning Disability", category: "Cognitive", icon: "📚", color: "blue" },
  
  // Situational
  { id: "single_occupancy", label: "Single Occupancy", category: "Situational", icon: "🏠", color: "yellow" },
  { id: "children_present", label: "Children Present", category: "Situational", icon: "👶", color: "cyan" },
  { id: "financial_hardship", label: "Financial Hardship", category: "Situational", icon: "💰", color: "orange" },
  
  // Safety & Security
  { id: "security_concerns", label: "Security Concerns", category: "Safety", icon: "🔒", color: "red" },
  { id: "previous_trauma", label: "Previous Trauma", category: "Psychological", icon: "💔", color: "red" }
]

// Helper function to get vulnerability option by ID
export const getVulnerabilityOption = (id: string) => {
  return VULNERABILITY_OPTIONS.find(option => option.id === id || option.label === id)
}

// Group vulnerabilities by category
export const VULNERABILITY_CATEGORIES = VULNERABILITY_OPTIONS.reduce((acc, option) => {
  if (!acc[option.category]) {
    acc[option.category] = []
  }
  acc[option.category].push(option)
  return acc
}, {} as Record<string, typeof VULNERABILITY_OPTIONS>)

export const HOLD_REASONS = [
  'Awaiting Customer Decision',
  'Awaiting Materials',
  'Awaiting Contractor Availability',
  'Awaiting Specialist Report',
  'Third Party Access Required',
  'Insurance Approval Required',
  'Other'
]
