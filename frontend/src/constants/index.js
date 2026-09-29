/**
 * CivicPulse Shared Constants & Enums
 * All string literals and enum sets across the entire application are defined here.
 */

// User Roles
export const USER_ROLES = {
  CITIZEN: 'citizen',
  WORKER: 'worker',
  DEPT_ADMIN: 'dept_admin',
  SUPER_ADMIN: 'super_admin',
};

export const USER_ROLE_LABELS = {
  citizen: 'Citizen',
  worker: 'Field Worker',
  dept_admin: 'Department Admin',
  super_admin: 'Super Admin',
};

// Municipal Departments
export const DEPARTMENTS = [
  'Roads & Potholes',
  'Sanitation & Garbage',
  'Street Lighting',
  'Water Supply',
  'General',
];

// Civic Issue Enums
export const ISSUE_CATEGORIES = [
  'Roads & Potholes',
  'Sanitation & Garbage',
  'Street Lighting',
  'Water Supply',
  'Electricity',
  'Other',
];

export const ISSUE_STATUSES = {
  REPORTED: 'Reported',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const ISSUE_STATUS_LIST = [
  'Reported',
  'In Progress',
  'Resolved',
  'Rejected',
];

export const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const PRIORITY_LIST = ['Low', 'Medium', 'High'];

// Consumer Safety Complaint Enums
export const COMPLAINT_CATEGORIES = [
  'Adulterated Food',
  'Defective Product',
  'Billing Fraud',
  'Unsafe Cosmetics',
  'Other',
];

export const COMPLAINT_STATUSES = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const COMPLAINT_STATUS_LIST = [
  'Submitted',
  'Under Review',
  'Escalated',
  'Resolved',
  'Rejected',
];

// Visual Status Badge Styling Tokens
// Reported: gray, In Progress: amber, Resolved: green, Rejected: red
export const STATUS_COLORS = {
  Reported: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  },
  Submitted: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  },
  'In Progress': {
    bg: 'bg-amber-950/60',
    text: 'text-amber-300',
    border: 'border-amber-700/60',
    dot: 'bg-amber-400 animate-pulse',
  },
  'Under Review': {
    bg: 'bg-amber-950/60',
    text: 'text-amber-300',
    border: 'border-amber-700/60',
    dot: 'bg-amber-400 animate-pulse',
  },
  Escalated: {
    bg: 'bg-rose-950/60',
    text: 'text-rose-300',
    border: 'border-rose-700/60',
    dot: 'bg-rose-400 animate-pulse',
  },
  Resolved: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-300',
    border: 'border-emerald-700/60',
    dot: 'bg-emerald-400',
  },
  Rejected: {
    bg: 'bg-red-950/60',
    text: 'text-red-400',
    border: 'border-red-800/60',
    dot: 'bg-red-500',
  },
};

// Priority Badge Styling Tokens
// High: red, Medium: amber, Low: gray
export const PRIORITY_COLORS = {
  High: {
    bg: 'bg-red-950/60',
    text: 'text-red-300',
    border: 'border-red-700/60',
    dot: 'bg-red-400',
  },
  Medium: {
    bg: 'bg-amber-950/60',
    text: 'text-amber-300',
    border: 'border-amber-700/60',
    dot: 'bg-amber-400',
  },
  Low: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  },
};

// Role landing destinations after login
export const ROLE_REDIRECT_MAP = {
  citizen: '/issues',
  worker: '/worker',
  dept_admin: '/admin',
  super_admin: '/admin',
};

// Upload constraints
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
