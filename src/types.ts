export interface Student {
  id: string;
  name: string;
  school: string;
  std: string; // e.g., "5", "7"
  div: string; // e.g., "A", "B"
  gender?: string; // e.g., "M", "F", "Other"
  medium?: string; // e.g., "Marathi", "English", "Semi-English"
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  school: string;
  std: string;
  div: string;
  date: string; // Format: YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Holiday' | 'Leave';
}

export interface InterventionTask {
  id: string;
  studentId: string;
  studentName: string;
  school: string;
  std: string;
  div: string;
  dateCreated: string; // YYYY-MM-DD
  status: 'pending' | 'home_visit_done' | 'completed' | 'active_task' | 'unsuccessful' | 'successful';
  homeVisitPhotoUrl?: string;
  homeVisitNotes?: string;
  homeVisitDate?: string;
  homeVisitBy?: string;
  schoolReturnPhotoUrl?: string;
  schoolReturnDate?: string;
  completedDate?: string;
  schoolReturnBy?: string;

  // New workflow fields for Community Tasks
  taskGroupId?: string;         // Links to parent group
  visitDate?: string;           // Date when clicked Yes/No
  visitResult?: 'yes' | 'no';   // Yes -> student will return, No -> won't return
  unsuccessfulReason?: string;  // Typed reason if "No" is chosen
  actualPresentDate?: string;   // Calculated or set date of actual attendance return
}

export interface CommunityTaskGroup {
  id: string;
  title: string;
  dateCreated: string;
  conditionsUsed: string;
  studentIds: string[];
  dateMethod?: 'range' | 'till_present';
  continueProcess?: boolean;
  startDate?: string;
  endDate?: string;
  minStreak?: number | '';
  maxStreak?: number | '';
  minAbsentFreq?: number | '';
  maxAbsentFreq?: number | '';
  minAbsentPercent?: number | '';
  maxAbsentPercent?: number | '';
  selectedSchools?: string[];
}

export interface WebhookUrls {
  teachingAnalysis?: string;
  baseline?: string;
  endline?: string;
  module?: string;
}

export interface SyncConfig {
  appsScriptUrl: string;
  oneDriveUrl?: string;
  appsScriptUrls?: WebhookUrls;
  oneDriveUrls?: WebhookUrls;
  syncTarget?: 'sheets' | 'onedrive' | 'both';
  isAutoSyncEnabled: boolean;
  lastSyncedAt: string | null;
  lastOneDriveSyncedAt?: string | null;
}

export interface TopStudent {
  name: string;
  percentage: number;
  presentCount: number;
  totalCount: number;
  classStr: string;
}

export interface Below75Student {
  name: string;
  school: string;
  classStr: string;
  percentage: number;
  presentCount: number;
  totalCount: number;
}

export interface Teacher {
  id: string;
  name: string;
  password?: string;
  role?: 'admin' | 'manager' | 'teacher' | 'academic_coordinator' | 'community_member';
  allowedSchools: string[];
  types?: string[]; // e.g. ["ARP", "SERP"]
}

export interface FeaturePermissions {
  dashboard: boolean;
  students: boolean;
  take_attendance: boolean;
  tasks: boolean;
  create_task: boolean;
  observe: boolean;
  cloud_sync: boolean;
  android_app: boolean;
  admin_panel: boolean;
}

export interface RolePermissionsConfig {
  admin: FeaturePermissions;
  manager: FeaturePermissions;
  academic_coordinator: FeaturePermissions;
  community_member: FeaturePermissions;
  teacher: FeaturePermissions;
  teacher_arp: FeaturePermissions;
  teacher_serp: FeaturePermissions;
  teacher_wellness: FeaturePermissions;
  teacher_sport: FeaturePermissions;
}

export const defaultPermissions: RolePermissionsConfig = {
  admin: { dashboard: true, students: true, take_attendance: true, tasks: true, create_task: true, observe: true, cloud_sync: true, android_app: true, admin_panel: true },
  manager: { dashboard: true, students: true, take_attendance: true, tasks: true, create_task: true, observe: true, cloud_sync: true, android_app: true, admin_panel: false },
  academic_coordinator: { dashboard: true, students: true, take_attendance: true, tasks: true, create_task: true, observe: true, cloud_sync: false, android_app: false, admin_panel: false },
  community_member: { dashboard: true, students: false, take_attendance: false, tasks: true, create_task: false, observe: false, cloud_sync: false, android_app: false, admin_panel: false },
  teacher: { dashboard: true, students: true, take_attendance: true, tasks: false, create_task: false, observe: false, cloud_sync: false, android_app: false, admin_panel: false },
  teacher_arp: { dashboard: true, students: true, take_attendance: true, tasks: false, create_task: false, observe: false, cloud_sync: false, android_app: false, admin_panel: false },
  teacher_serp: { dashboard: true, students: true, take_attendance: true, tasks: false, create_task: false, observe: false, cloud_sync: false, android_app: false, admin_panel: false },
  teacher_wellness: { dashboard: true, students: true, take_attendance: true, tasks: false, create_task: false, observe: false, cloud_sync: false, android_app: false, admin_panel: false },
  teacher_sport: { dashboard: true, students: true, take_attendance: true, tasks: false, create_task: false, observe: false, cloud_sync: false, android_app: false, admin_panel: false },
};

export interface UserSession {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'teacher' | 'academic_coordinator' | 'community_member';
  allowedSchools?: string[];
  types?: string[]; // e.g. ["ARP", "SERP"]
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  school: string;
  totalQuantity: number;
  availableQuantity: number;
  assignedTo?: string;
  lastUpdated: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  notes?: string;
}

export type AuthorityCategory = 'module' | 'page' | 'section' | 'subsection' | 'button' | 'graph';

export interface AuthorityRoleOption {
  id: string;
  label: string;
  marathiLabel: string;
  badgeBg: string;
  badgeText: string;
  isCustom?: boolean;
}

export interface AuthorityItem {
  id: string;
  name: string;
  marathiName: string;
  category: AuthorityCategory;
  module: 'attendance' | 'inventory' | 'arp' | 'serp' | 'system' | 'general';
  subModule?: string;
  description?: string;
  viewRoles: string[]; // Role IDs allowed to view, ['*'] means all
  editRoles: string[]; // Role IDs allowed to edit, ['*'] means all
}


