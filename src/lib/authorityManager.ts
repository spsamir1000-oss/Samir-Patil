import { Teacher, UserSession, AuthorityCategory, AuthorityRoleOption, AuthorityItem } from '../types';

export const BASE_AUTHORITY_ROLES: AuthorityRoleOption[] = [
  { id: 'admin', label: 'System Admin', marathiLabel: 'सिस्टम ॲडमिन', badgeBg: 'bg-rose-100', badgeText: 'text-rose-700' },
  { id: 'manager', label: 'School Manager', marathiLabel: 'शाळा मॅनेजर', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  { id: 'academic_coordinator', label: 'Academic Coordinator', marathiLabel: 'शैक्षणिक समन्वयक', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  { id: 'community_member', label: 'Community Mentor', marathiLabel: 'समुदाय मेंटॉर', badgeBg: 'bg-teal-100', badgeText: 'text-teal-700' },
  { id: 'arp', label: 'ARP Teacher', marathiLabel: 'एआरपी शिक्षक', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  { id: 'serp', label: 'SERP Teacher', marathiLabel: 'एसईआरपी शिक्षक', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700' },
  { id: 'wellness', label: 'Wellness Teacher', marathiLabel: 'वेलनेस शिक्षक', badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },
  { id: 'sport', label: 'Sport Teacher', marathiLabel: 'क्रीडा शिक्षक', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' },
  { id: 'teacher', label: 'General Teacher', marathiLabel: 'सामान्य शिक्षक', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700' },
];

export const INITIAL_AUTHORITY_ITEMS: AuthorityItem[] = [
  // ==================== 0. TOP LEVEL MODULES ====================
  {
    id: 'module_attendance',
    name: 'Attendance Section Module',
    marathiName: 'उपस्थिती विभाग मॉड्यूल',
    category: 'module',
    module: 'attendance',
    description: 'Main attendance section covering student tracking, daily attendance and reports',
    viewRoles: ['*'],
    editRoles: ['*']
  },
  {
    id: 'module_inventory',
    name: 'Inventory Section Module',
    marathiName: 'इन्व्हेंटरी साठा विभाग मॉड्यूल',
    category: 'module',
    module: 'inventory',
    description: 'School inventory and stock management module',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'module_arp',
    name: 'ARP Section Module',
    marathiName: 'एआरपी विभाग मॉड्यूल',
    category: 'module',
    module: 'arp',
    description: 'Academic Resource Person baseline and assessment module',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp']
  },
  {
    id: 'module_serp',
    name: 'SERP Section Module',
    marathiName: 'एसईआरपी विभाग मॉड्यूल',
    category: 'module',
    module: 'serp',
    description: 'Special Education Resource Person daily teaching module',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'serp']
  },
  {
    id: 'module_system',
    name: 'System & Authority Module',
    marathiName: 'सिस्टीम व हक्क व्यवस्थापन मॉड्यूल',
    category: 'module',
    module: 'system',
    description: 'System authority, roles directory and permission master control',
    viewRoles: ['*'],
    editRoles: ['admin']
  },

  // ==================== 1. ATTENDANCE MODULE ====================
  // Pages
  {
    id: 'page_attendance_dashboard',
    name: 'Attendance Dashboard',
    marathiName: 'उपस्थिती डॅशबोर्ड',
    category: 'page',
    module: 'attendance',
    description: 'Main attendance overview page with metrics and statistics',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'academic_coordinator']
  },
  {
    id: 'page_students_list',
    name: 'Students List Page',
    marathiName: 'विद्यार्थी यादी पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Browse, manage, and edit registered school students',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp', 'serp', 'teacher']
  },
  {
    id: 'page_take_attendance',
    name: 'Take Attendance Page',
    marathiName: 'हजेरी नोंदणी पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Mark daily attendance for class and division',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp', 'serp', 'teacher']
  },
  {
    id: 'page_attendance_records',
    name: 'Attendance Records Page',
    marathiName: 'हजेरी नोंदी इतिहास पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Historical attendance log and monthly registers',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'page_tasks_panel',
    name: 'Tasks & Interventions Page',
    marathiName: 'टास्क व पाठपुरावा पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Community mentor tasks and home visits tracking',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'community_member']
  },
  {
    id: 'page_create_task',
    name: 'Create Task Page',
    marathiName: 'नवीन टास्क निर्मिती पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Create new student retention tasks and intervention groups',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'page_observe_panel',
    name: 'Observe Panel Page',
    marathiName: 'वर्ग व शिक्षक निरीक्षण पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Classroom evaluation and teaching metrics recording',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'academic_coordinator']
  },
  {
    id: 'page_teacher_monitoring',
    name: 'Teacher Monitoring Page',
    marathiName: 'शिक्षक मॉनिटरिंग पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Track teacher presence and activity compliance',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'academic_coordinator']
  },
  {
    id: 'page_sheets_sync',
    name: 'Google Sheets Sync Page',
    marathiName: 'गुगल शीट सिंक पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Live bi-directional synchronization with Google Sheets',
    viewRoles: ['admin', 'manager'],
    editRoles: ['admin']
  },
  {
    id: 'page_downloads',
    name: 'Downloads & Reports Page',
    marathiName: 'अहवाल व डाऊनलोड्स पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'Generate Excel and PDF attendance reports',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp', 'serp']
  },
  {
    id: 'page_admin_panel',
    name: 'Admin Control Panel Page',
    marathiName: 'अॅडमिन पॅनेल पृष्ठ',
    category: 'page',
    module: 'attendance',
    description: 'User accounts, permissions, and cloud configurations',
    viewRoles: ['admin'],
    editRoles: ['admin']
  },

  // Sections & Subsections
  {
    id: 'sec_attendance_kpi_cards',
    name: 'Attendance KPI Stats Cards',
    marathiName: 'उपस्थिती मुख्य सांख्यिकी कार्ड्स',
    category: 'section',
    module: 'attendance',
    description: 'Total students, Present, Absent, and Percentage metrics',
    viewRoles: ['*'],
    editRoles: ['admin']
  },
  {
    id: 'sec_attendance_date_filter',
    name: 'Date & School Filter Section',
    marathiName: 'तारीख व शाळा निवड फिल्टर',
    category: 'section',
    module: 'attendance',
    description: 'Date picker and school selector for attendance records',
    viewRoles: ['*'],
    editRoles: ['*']
  },
  {
    id: 'sec_attendance_summary_table',
    name: 'Attendance Summary Table',
    marathiName: 'उपस्थिती सारांश तक्ता',
    category: 'subsection',
    module: 'attendance',
    description: 'School and class-wise attendance aggregation table',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'sec_student_import_export',
    name: 'Excel Import / Export Section',
    marathiName: 'एक्सेल आयात व निर्यात विभाग',
    category: 'section',
    module: 'attendance',
    description: 'Bulk student registration via Excel template upload',
    viewRoles: ['admin', 'manager', 'arp', 'serp'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'sec_quick_attendance_grid',
    name: 'Student Attendance Marking Grid',
    marathiName: 'हजेरी नोंदणी विद्यार्थी ग्रीड',
    category: 'subsection',
    module: 'attendance',
    description: 'Interactive checklist for Present / Absent / Holiday marks',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp', 'serp', 'teacher']
  },

  // Graphs
  {
    id: 'graph_attendance_trend',
    name: 'Attendance Trend Graph',
    marathiName: 'दैनंदिन उपस्थिती ट्रेंड आलेख',
    category: 'graph',
    module: 'attendance',
    description: 'Visual time-series line graph of attendance percentage',
    viewRoles: ['*'],
    editRoles: ['admin']
  },
  {
    id: 'graph_classwise_attendance',
    name: 'Class-wise Attendance Bar Chart',
    marathiName: 'वर्गनिहाय हजेरी बार आलेख',
    category: 'graph',
    module: 'attendance',
    description: 'Bar chart comparing attendance across classes 5th to 10th',
    viewRoles: ['*'],
    editRoles: ['admin']
  },
  {
    id: 'graph_school_comparison',
    name: 'School Comparison Graph',
    marathiName: 'शाळा तुलनात्मक उपस्थिती आलेख',
    category: 'graph',
    module: 'attendance',
    description: 'Comparative visualization of attendance among schools',
    viewRoles: ['*'],
    editRoles: ['admin']
  },

  // Buttons
  {
    id: 'btn_submit_attendance',
    name: 'Save Attendance Button',
    marathiName: 'हजेरी सेव्ह करा बटण',
    category: 'button',
    module: 'attendance',
    description: 'Submit daily attendance entries to database',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp', 'serp', 'teacher']
  },
  {
    id: 'btn_add_student',
    name: 'Add Student Button',
    marathiName: 'नवीन विद्यार्थी जोडा बटण',
    category: 'button',
    module: 'attendance',
    description: 'Open modal to register a new student',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp', 'serp']
  },
  {
    id: 'btn_edit_student',
    name: 'Edit Student Button',
    marathiName: 'विद्यार्थी माहिती बदला बटण',
    category: 'button',
    module: 'attendance',
    description: 'Modify student name, grade, or school info',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'btn_delete_student',
    name: 'Delete Student Button',
    marathiName: 'विद्यार्थी हटवा बटण',
    category: 'button',
    module: 'attendance',
    description: 'Permanently remove student record from system',
    viewRoles: ['admin', 'manager'],
    editRoles: ['admin']
  },
  {
    id: 'btn_export_attendance_excel',
    name: 'Export Attendance Excel Button',
    marathiName: 'एक्सेल अहवाल डाऊनलोड बटण',
    category: 'button',
    module: 'attendance',
    description: 'Download attendance spreadsheets to local disk',
    viewRoles: ['*'],
    editRoles: ['*']
  },
  {
    id: 'btn_voice_attendance',
    name: 'Voice Attendance Input Button',
    marathiName: 'व्हॉइस हजेरी इनपुट बटण',
    category: 'button',
    module: 'attendance',
    description: 'Speech recognition tool to call student roll numbers',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp', 'serp', 'teacher']
  },

  // ==================== 2. ARP MODULE ====================
  // Pages
  {
    id: 'page_arp_baseline_dashboard',
    name: 'Boardable Baseline Dashboard',
    marathiName: 'बोर्डेबल बेसलाइन डॅशबोर्ड',
    category: 'page',
    module: 'arp',
    description: 'Overview of student baseline levels and school benchmarks',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp']
  },
  {
    id: 'page_arp_baseline_exam',
    name: 'Boardable Baseline Exam Page',
    marathiName: 'बोर्डेबल बेसलाइन परीक्षा व्यवस्थापन',
    category: 'page',
    module: 'arp',
    description: 'Baseline examination papers, subsections and marks',
    viewRoles: ['*'],
    editRoles: ['admin', 'arp']
  },
  {
    id: 'page_arp_midline_exam',
    name: 'Boardable Midline Exam Page',
    marathiName: 'बोर्डेबल मिडलाइन परीक्षा व्यवस्थापन',
    category: 'page',
    module: 'arp',
    description: 'Midline examination tracking and level progress',
    viewRoles: ['*'],
    editRoles: ['admin', 'arp']
  },
  {
    id: 'page_arp_endline_exam',
    name: 'Boardable Endline Exam Page',
    marathiName: 'बोर्डेबल एंडलाइन परीक्षा व्यवस्थापन',
    category: 'page',
    module: 'arp',
    description: 'Final endline evaluation and learning outcome tracking',
    viewRoles: ['*'],
    editRoles: ['admin', 'arp']
  },
  {
    id: 'page_arp_assessment_section',
    name: 'ARP Assessment & Marks Entry',
    marathiName: 'विद्यार्थी मूल्यमापन व गुण नोंदणी',
    category: 'page',
    module: 'arp',
    description: 'Assessment entry screen for teachers to input marks',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp']
  },
  {
    id: 'page_arp_downloads',
    name: 'ARP Downloads & Analytics',
    marathiName: 'एआरपी अहवाल व विश्लेषण',
    category: 'page',
    module: 'arp',
    description: 'Analytics reports and level distribution downloads',
    viewRoles: ['*'],
    editRoles: ['admin', 'arp']
  },

  // Sections & Subsections
  {
    id: 'sec_arp_exam_creator',
    name: 'ARP Exam & Subsection Creator',
    marathiName: 'परीक्षा व उपविभाग निर्मिती सेक्शन',
    category: 'section',
    module: 'arp',
    description: 'Create new assessment paper with total marks and criteria',
    viewRoles: ['admin', 'manager', 'arp'],
    editRoles: ['admin', 'arp']
  },
  {
    id: 'sec_arp_student_selector',
    name: 'ARP Student List Selector',
    marathiName: 'विद्यार्थी यादी निवड फिल्टर',
    category: 'subsection',
    module: 'arp',
    description: 'Filter students by school, exam, and grade',
    viewRoles: ['*'],
    editRoles: ['*']
  },
  {
    id: 'sec_arp_marks_entry_table',
    name: 'ARP Student Marks Table',
    marathiName: 'विद्यार्थी गुण नोंदणी तक्ता',
    category: 'subsection',
    module: 'arp',
    description: 'Table containing students and input fields for marks',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp']
  },
  {
    id: 'sec_arp_level_criteria',
    name: 'Marks Level Criteria Display',
    marathiName: 'स्तर निश्चिती निकष तक्ता',
    category: 'subsection',
    module: 'arp',
    description: 'Guide showing criteria for Level 1, 2, 3, etc.',
    viewRoles: ['*'],
    editRoles: ['admin']
  },

  // Graphs
  {
    id: 'graph_arp_level_distribution',
    name: 'ARP Level Distribution Chart',
    marathiName: 'स्तरनिहाय विद्यार्थी आलेख',
    category: 'graph',
    module: 'arp',
    description: 'Bar chart showing number of students in each level',
    viewRoles: ['*'],
    editRoles: ['admin']
  },
  {
    id: 'graph_arp_subject_marks_comparison',
    name: 'Subject Marks Comparison Graph',
    marathiName: 'विषयनिहाय गुण तुलना आलेख',
    category: 'graph',
    module: 'arp',
    description: 'Radar and bar chart comparing Marathi, Maths, English marks',
    viewRoles: ['*'],
    editRoles: ['admin']
  },
  {
    id: 'graph_arp_schoolwise_performance',
    name: 'School Performance Bar Chart',
    marathiName: 'शाळा कामगिरी तुलना आलेख',
    category: 'graph',
    module: 'arp',
    description: 'Assessment performance comparison between all schools',
    viewRoles: ['*'],
    editRoles: ['admin']
  },

  // Buttons
  {
    id: 'btn_arp_create_exam',
    name: 'Create Assessment Exam Button',
    marathiName: 'नवीन परीक्षा तयार करा बटण',
    category: 'button',
    module: 'arp',
    description: 'Save new assessment paper structure',
    viewRoles: ['admin', 'arp'],
    editRoles: ['admin', 'arp']
  },
  {
    id: 'btn_arp_enter_marks',
    name: 'Enter Marks Action Button',
    marathiName: 'गुण नोंदवा बटण',
    category: 'button',
    module: 'arp',
    description: 'Open student marks entry dialogue',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp']
  },
  {
    id: 'btn_arp_save_all_marks',
    name: 'Save All Marks Button',
    marathiName: 'सर्व गुण जतन करा बटण',
    category: 'button',
    module: 'arp',
    description: 'Batch commit student exam marks',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'arp']
  },
  {
    id: 'btn_arp_delete_exam',
    name: 'Delete Assessment Exam Button',
    marathiName: 'परीक्षा हटवा बटण',
    category: 'button',
    module: 'arp',
    description: 'Permanently remove an assessment paper and its scores',
    viewRoles: ['admin'],
    editRoles: ['admin']
  },
  {
    id: 'btn_arp_export_excel',
    name: 'Export ARP Excel Report Button',
    marathiName: 'एआरपी एक्सेल डाऊनलोड बटण',
    category: 'button',
    module: 'arp',
    description: 'Export ARP assessment marks to Excel',
    viewRoles: ['*'],
    editRoles: ['*']
  },

  // ==================== 3. SERP MODULE ====================
  // Pages
  {
    id: 'page_serp_daily_logs',
    name: 'SERP Daily Teaching Logs Page',
    marathiName: 'एसईआरपी दैनंदिन तासिका नोंदी पृष्ठ',
    category: 'page',
    module: 'serp',
    description: 'Daily syllabus log and topic coverage entries',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'serp']
  },
  {
    id: 'page_serp_teacher_monitoring',
    name: 'SERP Teacher Monitoring Page',
    marathiName: 'एसईआरपी शिक्षक निरीक्षण पृष्ठ',
    category: 'page',
    module: 'serp',
    description: 'Observational evaluations of SERP sessions',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'academic_coordinator']
  },
  {
    id: 'page_serp_analysis',
    name: 'SERP Analytics & Trends Page',
    marathiName: 'एसईआरपी विश्लेषण व ट्रेंड पृष्ठ',
    category: 'page',
    module: 'serp',
    description: 'Detailed hours, topic analysis, and school reach',
    viewRoles: ['*'],
    editRoles: ['admin', 'serp']
  },
  {
    id: 'page_serp_downloads',
    name: 'SERP Downloads & Reports',
    marathiName: 'एसईआरपी अहवाल डाऊनलोड्स',
    category: 'page',
    module: 'serp',
    description: 'Download SERP logs, charts, and summary reports',
    viewRoles: ['*'],
    editRoles: ['admin', 'serp']
  },

  // Sections & Subsections
  {
    id: 'sec_serp_new_log_form',
    name: 'SERP Add New Log Form',
    marathiName: 'नवीन तासिका नोंद फॉर्म',
    category: 'section',
    module: 'serp',
    description: 'Form to enter subject, class, lesson, and time spent',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'serp']
  },
  {
    id: 'sec_serp_logs_history_table',
    name: 'SERP Teaching Logs History Table',
    marathiName: 'तासिका नोंदी इतिहास तक्ता',
    category: 'subsection',
    module: 'serp',
    description: 'Table listing previous teaching sessions',
    viewRoles: ['*'],
    editRoles: ['admin', 'serp']
  },

  // Graphs
  {
    id: 'graph_serp_subject_distribution',
    name: 'SERP Subject Distribution Pie/Bar',
    marathiName: 'विषय वितरण आलेख',
    category: 'graph',
    module: 'serp',
    description: 'Percentage of sessions dedicated to each subject',
    viewRoles: ['*'],
    editRoles: ['admin']
  },
  {
    id: 'graph_serp_weekly_hours',
    name: 'SERP Weekly Teaching Hours Trend',
    marathiName: 'साप्ताहिक तासिका ट्रेंड आलेख',
    category: 'graph',
    module: 'serp',
    description: 'Hours delivered per week chart',
    viewRoles: ['*'],
    editRoles: ['admin']
  },

  // Buttons
  {
    id: 'btn_serp_submit_log',
    name: 'Submit Daily Log Button',
    marathiName: 'तासिका नोंद जतन करा बटण',
    category: 'button',
    module: 'serp',
    description: 'Save teaching log to database',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'serp']
  },
  {
    id: 'btn_serp_edit_log',
    name: 'Edit Daily Log Button',
    marathiName: 'तासिका नोंद संपादित करा बटण',
    category: 'button',
    module: 'serp',
    description: 'Modify existing teaching log',
    viewRoles: ['admin', 'serp'],
    editRoles: ['admin', 'serp']
  },
  {
    id: 'btn_serp_delete_log',
    name: 'Delete Daily Log Button',
    marathiName: 'तासिका नोंद हटवा बटण',
    category: 'button',
    module: 'serp',
    description: 'Remove teaching log record',
    viewRoles: ['admin'],
    editRoles: ['admin']
  },

  // ==================== 4. INVENTORY MODULE ====================
  // Pages
  {
    id: 'page_inventory_dashboard',
    name: 'Inventory Dashboard & Stock',
    marathiName: 'इन्व्हेंटरी डॅशबोर्ड व साठा',
    category: 'page',
    module: 'inventory',
    description: 'View equipment, books, and stock quantities',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'page_inventory_requests',
    name: 'Item Requests & Approvals',
    marathiName: 'साहित्य मागणी व मंजुरी पृष्ठ',
    category: 'page',
    module: 'inventory',
    description: 'Staff requests for items and admin approvals',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager', 'teacher', 'arp', 'serp']
  },
  {
    id: 'page_inventory_circulation',
    name: 'Distribution & Circulation Page',
    marathiName: 'साहित्य वितरण व देवाणघेवाण',
    category: 'page',
    module: 'inventory',
    description: 'Track which items are issued to which school or teacher',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },

  // Sections & Subsections
  {
    id: 'sec_inventory_stock_table',
    name: 'Inventory Stock Table',
    marathiName: 'उपलब्ध साहित्य साठा तक्ता',
    category: 'section',
    module: 'inventory',
    description: 'List of items, total quantity, and available quantity',
    viewRoles: ['*'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'sec_inventory_request_form',
    name: 'New Item Request Form',
    marathiName: 'नवीन साहित्य मागणी अर्ज',
    category: 'subsection',
    module: 'inventory',
    description: 'Form for teachers to request materials',
    viewRoles: ['*'],
    editRoles: ['*']
  },

  // Graphs
  {
    id: 'graph_inventory_category_breakdown',
    name: 'Inventory Category Breakdown Graph',
    marathiName: 'वर्गवारी साठा विभाजन आलेख',
    category: 'graph',
    module: 'inventory',
    description: 'Donut chart showing sports, academic, and lab items',
    viewRoles: ['*'],
    editRoles: ['admin']
  },

  // Buttons
  {
    id: 'btn_inventory_add_item',
    name: 'Add Inventory Item Button',
    marathiName: 'नवीन साहित्य जोडा बटण',
    category: 'button',
    module: 'inventory',
    description: 'Register a new physical item in inventory',
    viewRoles: ['admin', 'manager'],
    editRoles: ['admin', 'manager']
  },
  {
    id: 'btn_inventory_approve_request',
    name: 'Approve Request Button',
    marathiName: 'मागणी मंजूर करा बटण',
    category: 'button',
    module: 'inventory',
    description: 'Approve or reject material request',
    viewRoles: ['admin'],
    editRoles: ['admin']
  },

  // ==================== 5. SYSTEM MODULE ====================
  // Pages
  {
    id: 'page_system_authority',
    name: 'Authority & Access Control Page',
    marathiName: 'हक्क व अधिकार व्यवस्थापन पृष्ठ',
    category: 'page',
    module: 'system',
    description: 'Master view to control View and Edit permissions across the entire app',
    viewRoles: ['admin'],
    editRoles: ['admin']
  },
  {
    id: 'page_system_roles',
    name: 'Login Types & Roles Directory',
    marathiName: 'लॉगिन प्रकार व भूमिका यादी',
    category: 'page',
    module: 'system',
    description: 'Manage staff roles and dynamic login types',
    viewRoles: ['admin'],
    editRoles: ['admin']
  },
  {
    id: 'btn_system_reset_permissions',
    name: 'Reset All Permissions Button',
    marathiName: 'सर्व अधिकार पूर्ववत करा बटण',
    category: 'button',
    module: 'system',
    description: 'Reset view and edit permissions back to defaults',
    viewRoles: ['admin'],
    editRoles: ['admin']
  },
  {
    id: 'btn_system_add_custom_item',
    name: 'Register New App Item Button',
    marathiName: 'नवीन ॲप घटक नोंदवा बटण',
    category: 'button',
    module: 'system',
    description: 'Add a new button, page, or graph into the authority matrix',
    viewRoles: ['admin'],
    editRoles: ['admin']
  }
];

const LOCAL_STORAGE_KEY = 'app_authority_permissions';
const LOCAL_CUSTOM_ROLES_KEY = 'app_authority_custom_roles';
const LOCAL_CUSTOM_ITEMS_KEY = 'app_authority_custom_items';

/**
 * Gets all available roles by combining BASE_ROLES with custom roles and teacher types
 */
export function getAvailableRoles(teachers: Teacher[] = []): AuthorityRoleOption[] {
  const roleMap = new Map<string, AuthorityRoleOption>();
  
  // 1. Add base roles
  BASE_AUTHORITY_ROLES.forEach(r => roleMap.set(r.id.toLowerCase(), r));

  // 2. Add custom roles from localStorage
  try {
    const custom = localStorage.getItem(LOCAL_CUSTOM_ROLES_KEY);
    if (custom) {
      const parsed: AuthorityRoleOption[] = JSON.parse(custom);
      parsed.forEach(r => roleMap.set(r.id.toLowerCase(), r));
    }
  } catch (e) {
    console.error('Error loading custom authority roles', e);
  }

  // 3. Add any dynamic types found on teachers
  teachers.forEach(t => {
    if (t.types && Array.isArray(t.types)) {
      t.types.forEach(type => {
        const cleanId = type.toLowerCase().trim();
        if (cleanId && !roleMap.has(cleanId)) {
          roleMap.set(cleanId, {
            id: cleanId,
            label: `${type} Staff`,
            marathiLabel: `${type} शिक्षक`,
            badgeBg: 'bg-cyan-100',
            badgeText: 'text-cyan-800',
            isCustom: true
          });
        }
      });
    }
  });

  return Array.from(roleMap.values());
}

/**
 * Adds a new custom role to the system
 */
export function addCustomAuthorityRole(role: AuthorityRoleOption): void {
  try {
    const existing = localStorage.getItem(LOCAL_CUSTOM_ROLES_KEY);
    const list: AuthorityRoleOption[] = existing ? JSON.parse(existing) : [];
    const index = list.findIndex(r => r.id.toLowerCase() === role.id.toLowerCase());
    if (index >= 0) {
      list[index] = role;
    } else {
      list.push(role);
    }
    localStorage.setItem(LOCAL_CUSTOM_ROLES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving custom role', e);
  }
}

/**
 * Loads all authority items with saved permission overrides
 */
export function loadAuthorityItems(): AuthorityItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const overrides: Record<string, { viewRoles?: string[]; editRoles?: string[] }> = saved ? JSON.parse(saved) : {};
    
    // Also load any custom registered items
    const customItemsSaved = localStorage.getItem(LOCAL_CUSTOM_ITEMS_KEY);
    const customItems: AuthorityItem[] = customItemsSaved ? JSON.parse(customItemsSaved) : [];

    const allItems = [...INITIAL_AUTHORITY_ITEMS, ...customItems];
    const itemMap = new Map<string, AuthorityItem>();

    allItems.forEach(item => {
      const override = overrides[item.id];
      itemMap.set(item.id, {
        ...item,
        viewRoles: override?.viewRoles !== undefined ? override.viewRoles : item.viewRoles,
        editRoles: override?.editRoles !== undefined ? override.editRoles : item.editRoles
      });
    });

    return Array.from(itemMap.values());
  } catch (e) {
    console.error('Error loading authority items', e);
    return INITIAL_AUTHORITY_ITEMS;
  }
}

/**
 * Saves permission configuration for an element
 */
export function saveAuthorityPermissions(
  itemId: string, 
  perms: { viewRoles?: string[]; editRoles?: string[] }
): void {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const data: Record<string, { viewRoles?: string[]; editRoles?: string[] }> = saved ? JSON.parse(saved) : {};
    data[itemId] = {
      ...data[itemId],
      ...perms
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('authority-permissions-updated', { detail: { itemId, perms } }));
    }
  } catch (e) {
    console.error('Error saving authority permission', e);
  }
}

/**
 * Saves all authority items in bulk
 */
export function saveAllAuthorityItems(items: AuthorityItem[]): void {
  try {
    const data: Record<string, { viewRoles: string[]; editRoles: string[] }> = {};
    items.forEach(it => {
      data[it.id] = {
        viewRoles: it.viewRoles,
        editRoles: it.editRoles
      };
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('authority-permissions-updated'));
    }
  } catch (e) {
    console.error('Error saving all authority items', e);
  }
}

/**
 * Dynamically register a new item in authority matrix (for future features)
 */
export function registerAuthorityItem(item: AuthorityItem): void {
  try {
    const customSaved = localStorage.getItem(LOCAL_CUSTOM_ITEMS_KEY);
    const customList: AuthorityItem[] = customSaved ? JSON.parse(customSaved) : [];
    if (!customList.some(i => i.id === item.id) && !INITIAL_AUTHORITY_ITEMS.some(i => i.id === item.id)) {
      customList.push(item);
      localStorage.setItem(LOCAL_CUSTOM_ITEMS_KEY, JSON.stringify(customList));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('authority-permissions-updated'));
      }
    }
  } catch (e) {
    console.error('Error registering dynamic authority item', e);
  }
}

/**
 * Gets an existing authority item or returns/registers a defaulted item
 */
export function getOrRegisterAuthorityItem(
  itemId: string,
  defaults?: Partial<AuthorityItem>
): AuthorityItem {
  const allItems = loadAuthorityItems();
  const existing = allItems.find(i => i.id === itemId);
  if (existing) return existing;

  const newItem: AuthorityItem = {
    id: itemId,
    name: defaults?.name || itemId.replace(/^[^_]+_/, '').replace(/_/g, ' '),
    marathiName: defaults?.marathiName || defaults?.name || itemId,
    category: defaults?.category || 'button',
    module: defaults?.module || 'general',
    description: defaults?.description || 'Registered system element',
    viewRoles: defaults?.viewRoles || ['*'],
    editRoles: defaults?.editRoles || ['*']
  };

  registerAuthorityItem(newItem);
  return newItem;
}

/**
 * Checks if a user has permission to VIEW an element
 */
export function canUserView(
  itemId: string, 
  currentUser: UserSession | null, 
  items?: AuthorityItem[]
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true; // Admin has universal master access

  const allItems = items || loadAuthorityItems();
  const target = allItems.find(i => i.id === itemId);
  if (!target) return true; // By default visible if unmapped

  const { viewRoles } = target;
  if (!viewRoles || viewRoles.length === 0 || viewRoles.includes('*')) {
    return true;
  }

  // Check if current user's role or type matches allowed roles
  const userRoles = [currentUser.role.toLowerCase()];
  if (currentUser.types && Array.isArray(currentUser.types)) {
    currentUser.types.forEach(t => userRoles.push(t.toLowerCase()));
  }

  return viewRoles.some(r => userRoles.includes(r.toLowerCase()));
}

/**
 * Checks if a user has permission to EDIT/ACT on an element
 */
export function canUserEdit(
  itemId: string, 
  currentUser: UserSession | null, 
  items?: AuthorityItem[]
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true; // Admin has universal master access

  const allItems = items || loadAuthorityItems();
  const target = allItems.find(i => i.id === itemId);
  if (!target) return true; // By default editable if unmapped

  const { editRoles } = target;
  if (!editRoles || editRoles.length === 0 || editRoles.includes('*')) {
    return true;
  }

  const userRoles = [currentUser.role.toLowerCase()];
  if (currentUser.types && Array.isArray(currentUser.types)) {
    currentUser.types.forEach(t => userRoles.push(t.toLowerCase()));
  }

  return editRoles.some(r => userRoles.includes(r.toLowerCase()));
}
