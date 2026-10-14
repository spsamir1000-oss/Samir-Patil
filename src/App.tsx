import { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SyncConfig, Teacher, UserSession, InterventionTask, CommunityTaskGroup, RolePermissionsConfig, defaultPermissions } from './types';
import { INITIAL_STUDENTS, getInitialAttendanceRecords } from './data';
import Dashboard from './components/Dashboard';
import StudentsList from './components/StudentsList';
import TakeAttendance from './components/TakeAttendance';
import GoogleSheetsSync from './components/GoogleSheetsSync';
import AndroidAppInfo from './components/AndroidAppInfo';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import TasksPanel from './components/TasksPanel';
import CreateTaskPanel from './components/CreateTaskPanel';
import ObservePanel from './components/ObservePanel';
import TeacherMonitoring from './components/TeacherMonitoring';
import InventoryPanel from './components/InventoryPanel';
import SerpPanel from './components/SerpPanel';
import ArpPanel from './components/ArpPanel';
import DownloadsPanel from './components/DownloadsPanel';
import SystemPanel from './components/SystemPanel';
import { AuthorityProvider } from './context/AuthorityContext';
import AdminAuthorityBadge from './components/AdminAuthorityBadge';
import AdminAuthorityFloatingBar from './components/AdminAuthorityFloatingBar';
import { 
  initializeFirebaseAuth, 
  fetchCloudData, 
  uploadInitialDataToCloud,
  syncSaveStudent,
  syncDeleteStudent,
  syncSaveAttendanceBatch,
  syncDeleteAttendanceRecord,
  syncSaveTask,
  syncDeleteTask,
  syncSaveTaskGroup,
  syncSaveTeacher,
  syncSaveSyncConfig,
  syncSaveRolePermissions
} from './lib/firebaseSync';

import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileSpreadsheet,
  Smartphone,
  CheckSquare,
  ShieldCheck,
  LogOut,
  Briefcase,
  Eye,
  Cloud,
  CloudOff,
  CloudLightning,
  Calendar,
  Package,
  ArrowLeftRight,
  Boxes,
  BookOpen,
  Download,
  Cpu
} from 'lucide-react';

export default function App() {
  const [activeModule, setActiveModule] = useState<'selection' | 'attendance' | 'inventory' | 'serp' | 'arp' | 'system'>('selection');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'take' | 'records' | 'sheets' | 'android' | 'admin' | 'tasks' | 'create_task' | 'observe' | 'teacher_monitoring' | 'downloads'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Firebase synchronization states
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');


  const [rolePermissions, setRolePermissions] = useState<RolePermissionsConfig>(() => {
    const saved = localStorage.getItem('same_app_role_permissions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultPermissions, ...parsed };
      } catch (e) {
        return defaultPermissions;
      }
    }
    return defaultPermissions;
  });

  // Lazy initialize teachers database
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('same_app_teachers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const handleUpdateTeachers = (updatedTeachers: Teacher[]) => {
    setTeachers(updatedTeachers);
    localStorage.setItem('same_app_teachers', JSON.stringify(updatedTeachers));
  };

  // Lazy initialize user session
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('same_app_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const handleLoginSuccess = (session: UserSession) => {
    setCurrentUser(session);
    localStorage.setItem('same_app_session', JSON.stringify(session));
    setActiveModule('selection');
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('same_app_session');
    setActiveModule('selection');
    setActiveTab('dashboard');
  };

  // Lazy initialize students database
  const [students, setStudents] = useState<Student[]>(() => {
    let list = INITIAL_STUDENTS;
    const saved = localStorage.getItem('same_app_students');
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Deduplicate list by name, school, std, div
    const map = new Map<string, Student>();
    list.forEach(s => {
      const key = `${s.name.trim().toLowerCase()}|${s.school.trim().toLowerCase()}|${s.std}|${s.div}`;
      if (!map.has(key)) {
        map.set(key, s);
      }
    });
    return Array.from(map.values());
  });

  // Lazy initialize attendance records history
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('same_app_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return getInitialAttendanceRecords(INITIAL_STUDENTS);
  });

  // Lazy initialize synchronization credential config
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const saved = localStorage.getItem('same_app_sync_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      appsScriptUrl: '',
      oneDriveUrl: '',
      syncTarget: 'sheets',
      isAutoSyncEnabled: false,
      lastSyncedAt: null,
      lastOneDriveSyncedAt: null
    };
  });

  const [interventionTasks, setInterventionTasks] = useState<InterventionTask[]>(() => {
    const saved = localStorage.getItem('same_app_intervention_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [taskGroups, setTaskGroups] = useState<CommunityTaskGroup[]>(() => {
    const saved = localStorage.getItem('same_app_task_groups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    setIsFirebaseSyncing(true);
    setFirebaseStatus('connecting');

    initializeFirebaseAuth(async (user) => {
      if (user) {
        console.log('Firebase anonymous session established successfully. Session UID:', user.uid);
      } else {
        console.log('Firebase anonymous session could not be established. Bypassing auth check for public sync...');
      }
      try {
        const cloud = await fetchCloudData();
        
        const isCloudEmpty = 
          cloud.students.length === 0 && 
          cloud.records.length === 0 && 
          cloud.interventionTasks.length === 0;

        if (isCloudEmpty) {
          console.log('Firebase Firestore is currently empty. Directing initial migration-upload sync...');
          await uploadInitialDataToCloud({
            students,
            records,
            interventionTasks,
            taskGroups,
            teachers,
            syncConfig,
            rolePermissions
          });
          setFirebaseStatus('synced');
          setIsFirebaseSyncing(false);
        } else {
          console.log('Firebase Firestore has active datasets. Syncing them down into state...');
          
          if (cloud.students.length > 0) {
            setStudents(cloud.students);
            localStorage.setItem('same_app_students', JSON.stringify(cloud.students));
          }
          if (cloud.records.length > 0) {
            setRecords(cloud.records);
            localStorage.setItem('same_app_records', JSON.stringify(cloud.records));
          }
          if (cloud.interventionTasks.length > 0) {
            setInterventionTasks(cloud.interventionTasks);
            localStorage.setItem('same_app_intervention_tasks', JSON.stringify(cloud.interventionTasks));
          }
          if (cloud.taskGroups.length > 0) {
            setTaskGroups(cloud.taskGroups);
            localStorage.setItem('same_app_task_groups', JSON.stringify(cloud.taskGroups));
          }
          if (cloud.teachers.length > 0) {
            setTeachers(cloud.teachers);
            localStorage.setItem('same_app_teachers', JSON.stringify(cloud.teachers));
          }
          if (cloud.syncConfig) {
            setSyncConfig(cloud.syncConfig);
            localStorage.setItem('same_app_sync_config', JSON.stringify(cloud.syncConfig));
          }
          if (cloud.rolePermissions) {
            const merged = { ...defaultPermissions, ...cloud.rolePermissions };
            setRolePermissions(merged);
            localStorage.setItem('same_app_role_permissions', JSON.stringify(merged));
          }

          setFirebaseStatus('synced');
          setIsFirebaseSyncing(false);
        }
      } catch (err) {
        console.error('Failed to sync state from cloud:', err);
        setFirebaseStatus('error');
        setIsFirebaseSyncing(false);
      }
    });
  }, []);

  const handleUpdateTask = (updatedTask: InterventionTask) => {
    const updated = interventionTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setInterventionTasks(updated);
    localStorage.setItem('same_app_intervention_tasks', JSON.stringify(updated));
    
    // Firebase Cloud Sync
    syncSaveTask(updatedTask);
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = interventionTasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    // 1. Filter out the task
    const updatedTasks = interventionTasks.filter(t => t.id !== taskId);
    setInterventionTasks(updatedTasks);
    localStorage.setItem('same_app_intervention_tasks', JSON.stringify(updatedTasks));
    
    // Firebase Cloud Sync
    syncDeleteTask(taskId);

    // 2. Sync by removing studentId from the parent task group's studentIds
    if (taskToDelete.taskGroupId) {
      const updatedGroups = taskGroups.map(g => {
        if (g.id === taskToDelete.taskGroupId) {
          const updatedGroup = {
            ...g,
            studentIds: g.studentIds.filter(sid => sid !== taskToDelete.studentId)
          };
          syncSaveTaskGroup(updatedGroup);
          return updatedGroup;
        }
        return g;
      });
      setTaskGroups(updatedGroups);
      localStorage.setItem('same_app_task_groups', JSON.stringify(updatedGroups));
    }
  };

  // Core modification handlers
  const handleAddStudent = (student: Student) => {
    const exists = students.some(s => 
      s.name.trim().toLowerCase() === student.name.trim().toLowerCase() &&
      s.school.trim().toLowerCase() === student.school.trim().toLowerCase() &&
      s.std.trim().toLowerCase() === student.std.trim().toLowerCase() &&
      s.div.trim().toLowerCase() === student.div.trim().toLowerCase()
    );
    if (exists) {
      alert("हा विद्यार्थी या शाळेत आणि वर्गात आधीपासूनच जोडला गेला आहे!");
      return;
    }
    const updated = [student, ...students];
    setStudents(updated);
    localStorage.setItem('same_app_students', JSON.stringify(updated));
    
    // Firebase Cloud Sync
    syncSaveStudent(student);
  };

  const handleAddStudentsList = (newStudents: Student[]) => {
    // Deduplicate against existing students
    const map = new Map<string, Student>();
    students.forEach(s => {
      const key = `${s.name.trim().toLowerCase()}|${s.school.trim().toLowerCase()}|${s.std}|${s.div}`;
      map.set(key, s);
    });

    const added: Student[] = [];
    newStudents.forEach(ns => {
      const key = `${ns.name.trim().toLowerCase()}|${ns.school.trim().toLowerCase()}|${ns.std}|${ns.div}`;
      if (!map.has(key)) {
        map.set(key, ns);
        added.push(ns);
      }
    });

    if (added.length === 0) {
      alert("सर्व विद्यार्थी आधीपासूनच जोडलेले आहेत!");
      return;
    }

    const updated = [...added, ...students];
    setStudents(updated);
    localStorage.setItem('same_app_students', JSON.stringify(updated));
    
    // Firebase Cloud Sync
    added.forEach(s => syncSaveStudent(s));
  };

  const handleDeleteStudent = (id: string) => {
    const updatedStudents = students.filter(s => s.id !== id);
    setStudents(updatedStudents);
    localStorage.setItem('same_app_students', JSON.stringify(updatedStudents));

    // Firebase Cloud Sync
    syncDeleteStudent(id);

    // Cleanup associated attendance records automatically
    const updatedRecords = records.filter(r => r.studentId !== id);
    setRecords(updatedRecords);
    localStorage.setItem('same_app_records', JSON.stringify(updatedRecords));

    // Firebase Cloud Sync deleting records associated
    const recordsToDelete = records.filter(r => r.studentId === id);
    recordsToDelete.forEach(r => syncDeleteAttendanceRecord(`${r.studentId}_${r.date}`));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const updated = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    setStudents(updated);
    localStorage.setItem('same_app_students', JSON.stringify(updated));

    // Firebase Cloud Sync
    syncSaveStudent(updatedStudent);
  };

  const handleImportStudentsAndRecords = (newStudents: Student[], newRecords: AttendanceRecord[]) => {
    // 1. Merge students. If a student with the same school, name, std, div exists, update. Else append.
    const studentMap = new Map<string, Student>();
    
    // Add existing ones
    students.forEach(s => {
      const key = `${s.school.trim()}_${s.name.trim()}_${s.std.trim()}_${s.div.trim()}`.toLowerCase();
      studentMap.set(key, s);
    });

    const finalStudents = [...students];
    newStudents.forEach(ns => {
      const key = `${ns.school.trim()}_${ns.name.trim()}_${ns.std.trim()}_${ns.div.trim()}`.toLowerCase();
      const existing = studentMap.get(key);
      if (existing) {
        // Update existing item attributes including gender
        existing.gender = ns.gender || existing.gender;
        syncSaveStudent(existing); // Sync updated student
      } else {
        finalStudents.push(ns);
        syncSaveStudent(ns); // Sync new student
      }
    });

    setStudents(finalStudents);
    localStorage.setItem('same_app_students', JSON.stringify(finalStudents));

    // 2. Merge records. Overwrite existing statuses matching studentId + date
    if (newRecords.length > 0) {
      const recordMap = new Map<string, AttendanceRecord>();
      records.forEach(r => {
        recordMap.set(`${r.studentId}_${r.date}`, r);
      });
      const recordsToSync: AttendanceRecord[] = [];
      newRecords.forEach(nr => {
        // For new records, we need to map the studentId accurately because if the student was matched,
        // we should find the correct registered ID in finalStudents
        const matchKey = `${nr.school.trim()}_${nr.studentName.trim()}_${nr.std.trim()}_${nr.div.trim()}`.toLowerCase();
        const foundStudent = finalStudents.find(s => 
          `${s.school.trim()}_${s.name.trim()}_${s.std.trim()}_${s.div.trim()}`.toLowerCase() === matchKey
        );
        const actualStudentId = foundStudent ? foundStudent.id : nr.studentId;

        const updatedRecord = {
          ...nr,
          studentId: actualStudentId
        };
        recordMap.set(`${actualStudentId}_${nr.date}`, updatedRecord);
        recordsToSync.push(updatedRecord);
      });
      const finalRecords = Array.from(recordMap.values());
      setRecords(finalRecords);
      localStorage.setItem('same_app_records', JSON.stringify(finalRecords));

      // Firebase Cloud Sync
      syncSaveAttendanceBatch(recordsToSync);
    }
  };

  // Clear all database
  const handleClearAllStudents = () => {
    // Firebase Cloud Sync deletes
    students.forEach(s => syncDeleteStudent(s.id));
    records.forEach(r => syncDeleteAttendanceRecord(`${r.studentId}_${r.date}`));

    setStudents([]);
    localStorage.setItem('same_app_students', JSON.stringify([]));

    setRecords([]);
    localStorage.setItem('same_app_records', JSON.stringify([]));
  };

  const handleSaveAttendanceBatch = (newRecords: AttendanceRecord[]) => {
    const recordMap = new Map<string, AttendanceRecord>();
    records.forEach(r => {
      recordMap.set(`${r.studentId}_${r.date}`, r);
    });
    newRecords.forEach(nr => {
      recordMap.set(`${nr.studentId}_${nr.date}`, nr);
    });
    const updated = Array.from(recordMap.values());
    setRecords(updated);
    localStorage.setItem('same_app_records', JSON.stringify(updated));

    // Firebase Cloud Sync
    syncSaveAttendanceBatch(newRecords);

    // Handle background Auto Sync if enabled
    if (syncConfig.isAutoSyncEnabled) {
      sendAutoSyncPayload(updated);
    }
  };

  const handleCreateTasks = (newTasks: InterventionTask[]) => {
    const updated = [...interventionTasks];
    newTasks.forEach(task => {
      const exists = updated.find(t => t.studentId === task.studentId && t.status !== 'completed');
      if (!exists) {
        updated.push(task);
        syncSaveTask(task); // Sync new task
      }
    });
    setInterventionTasks(updated);
    localStorage.setItem('same_app_intervention_tasks', JSON.stringify(updated));
    setActiveTab('tasks');
  };

  const handleUpdateConfig = (newConfig: SyncConfig) => {
    setSyncConfig(newConfig);
    localStorage.setItem('same_app_sync_config', JSON.stringify(newConfig));
  };

  // Background Auto Sync Push handler triggered on submission saves
  const sendAutoSyncPayload = async (recentRecords: AttendanceRecord[]) => {
    const totalStudents = students.length;
    const totalRecords = recentRecords.length;
    const presentRecords = recentRecords.filter(r => r.status === 'Present').length;
    const rate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100;

    const payload = {
      action: 'sync',
      students: students,
      attendance: recentRecords,
      summary: {
        totalStudents: totalStudents,
        totalRecords: totalRecords,
        percentage: rate
      }
    };

    const target = syncConfig.syncTarget || 'sheets';
    const updatedConfig = { ...syncConfig };
    let hasChanged = false;

    // 1. Google Sheets sync push
    if ((target === 'sheets' || target === 'both') && syncConfig.appsScriptUrl) {
      try {
        await fetch(syncConfig.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        updatedConfig.lastSyncedAt = new Date().toLocaleString('mr-IN');
        hasChanged = true;
      } catch (e) {
        console.error("Auto Sync warning (Google Sheets):", e);
      }
    }

    // 2. OneDrive Excel sync push
    if ((target === 'onedrive' || target === 'both') && syncConfig.oneDriveUrl) {
      try {
        await fetch(syncConfig.oneDriveUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        updatedConfig.lastOneDriveSyncedAt = new Date().toLocaleString('mr-IN');
        hasChanged = true;
      } catch (e) {
        console.error("Auto Sync warning (OneDrive):", e);
      }
    }

    if (hasChanged) {
      setSyncConfig(updatedConfig);
      localStorage.setItem('same_app_sync_config', JSON.stringify(updatedConfig));
    }
  };

  // Global Automatic Task Generation for continuous task groups (continueProcess === true)
  useEffect(() => {
    const activeContinuousGroups = taskGroups.filter(g => g.continueProcess && g.dateMethod === 'till_present');
    if (activeContinuousGroups.length === 0) return;

    let groupsUpdated = false;
    const updatedGroupsList = [...taskGroups];
    const newlyCreatedTasks: InterventionTask[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    activeContinuousGroups.forEach(group => {
      const gStart = group.startDate || '2026-06-01';
      const gEnd = todayStr; // up to today
      const gSchools = group.selectedSchools || [];
      
      let filtered = students;
      if (gSchools.length > 0) {
        filtered = filtered.filter(s => gSchools.includes(s.school));
      }

      const start = new Date(gStart);
      const end = new Date(gEnd);

      const validRecords = records.filter(r => {
        const d = new Date(r.date);
        return d >= start && d <= end;
      });

      const matchedStudentIds: string[] = [];

      for (const student of filtered) {
        // Skip if already in the group's studentIds
        if (group.studentIds.includes(student.id)) continue;

        // Skip if they already have an active task generally
        const hasActiveTask = interventionTasks.some(t => t.studentId === student.id && t.status !== 'completed');
        if (hasActiveTask) continue;

        const studentRecs = validRecords
          .filter(r => r.studentId === student.id && (r.status === 'Absent' || r.status === 'Present'))
          .sort((a, b) => a.date.localeCompare(b.date));

        const totalActiveDays = studentRecs.length;
        const absentDays = studentRecs.filter(r => r.status === 'Absent').length;
        const absentPercent = totalActiveDays > 0 ? (absentDays / totalActiveDays) * 100 : 0;

        // Calculate max streak in this period
        let maxStrk = 0;
        let currentStrk = 0;
        for (const rec of studentRecs) {
          if (rec.status === 'Absent') {
            currentStrk++;
            if (currentStrk > maxStrk) maxStrk = currentStrk;
          } else {
            currentStrk = 0;
          }
        }

        // Check min/max conditions
        if (group.minStreak !== undefined && group.minStreak !== '' && maxStrk < Number(group.minStreak)) continue;
        if (group.maxStreak !== undefined && group.maxStreak !== '' && maxStrk > Number(group.maxStreak)) continue;

        if (group.minAbsentFreq !== undefined && group.minAbsentFreq !== '' && absentDays < Number(group.minAbsentFreq)) continue;
        if (group.maxAbsentFreq !== undefined && group.maxAbsentFreq !== '' && absentDays > Number(group.maxAbsentFreq)) continue;

        if (group.minAbsentPercent !== undefined && group.minAbsentPercent !== '' && absentPercent < Number(group.minAbsentPercent)) continue;
        if (group.maxAbsentPercent !== undefined && group.maxAbsentPercent !== '' && absentPercent > Number(group.maxAbsentPercent)) continue;

        // They match!
        matchedStudentIds.push(student.id);
        newlyCreatedTasks.push({
          id: crypto.randomUUID(),
          studentId: student.id,
          studentName: student.name,
          school: student.school,
          std: student.std,
          div: student.div,
          dateCreated: todayStr,
          status: 'pending',
          taskGroupId: group.id
        });
      }

      if (matchedStudentIds.length > 0) {
        groupsUpdated = true;
        const groupIdx = updatedGroupsList.findIndex(g => g.id === group.id);
        if (groupIdx !== -1) {
          const updatedGroup = {
            ...updatedGroupsList[groupIdx],
            studentIds: [...updatedGroupsList[groupIdx].studentIds, ...matchedStudentIds]
          };
          updatedGroupsList[groupIdx] = updatedGroup;
          // Sync with Firestore
          syncSaveTaskGroup(updatedGroup);
        }
      }
    });

    if (groupsUpdated) {
      setTaskGroups(updatedGroupsList);
      localStorage.setItem('same_app_task_groups', JSON.stringify(updatedGroupsList));
      
      if (newlyCreatedTasks.length > 0) {
        const updatedTasks = [...interventionTasks];
        newlyCreatedTasks.forEach(task => {
          const exists = updatedTasks.find(t => t.studentId === task.studentId && t.status !== 'completed');
          if (!exists) {
            updatedTasks.push(task);
            syncSaveTask(task); // Sync new task
          }
        });
        setInterventionTasks(updatedTasks);
        localStorage.setItem('same_app_intervention_tasks', JSON.stringify(updatedTasks));
      }
    }
  }, [students, records, interventionTasks, taskGroups]);

  // Check role & access privilege
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isCoordinator = currentUser?.role === 'academic_coordinator';
  const isCommunityMember = currentUser?.role === 'community_member';
  
  // Get the precise permission role key based on user's role and types
  const getPermissionRoleKey = (): keyof RolePermissionsConfig => {
    if (!currentUser) return 'teacher';
    if (currentUser.role === 'admin') return 'admin';
    if (currentUser.role === 'manager') return 'manager';
    if (currentUser.role === 'academic_coordinator') return 'academic_coordinator';
    if (currentUser.role === 'community_member') return 'community_member';
    if (currentUser.role === 'teacher') {
      const type = (currentUser.types?.[0] || 'ARP').toUpperCase();
      if (type === 'ARP') return 'teacher_arp';
      if (type === 'SERP') return 'teacher_serp';
      if (type === 'WELLNESS') return 'teacher_wellness';
      if (type === 'SPORT') return 'teacher_sport';
    }
    return 'teacher';
  };

  const currentRoleKey = getPermissionRoleKey();
  const userPerms = rolePermissions[currentRoleKey] || defaultPermissions[currentRoleKey];

  const canViewDashboard = userPerms.dashboard;
  const canViewStudentsAndAttendance = userPerms.students;
  const canViewTakeAttendance = userPerms.take_attendance;
  const canViewTasks = userPerms.tasks;
  const canViewCreateTask = userPerms.create_task;
  const canViewObserve = userPerms.observe;
  const canViewCloudSync = userPerms.cloud_sync;
  const canViewAndroidApp = userPerms.android_app;
  const canViewAdminPanel = userPerms.admin_panel;
  const canViewTeacherMonitoring = isAdmin || isManager || isCoordinator;
  
  const hasFullAccess = isAdmin || isManager; // Keeping this for other potential checks

  const canAccessSerp = 
    isAdmin || 
    isManager || 
    isCoordinator || 
    (currentUser?.role === 'teacher' && currentUser?.types?.some(t => t.toUpperCase() === 'SERP'));

  const canAccessArp = 
    isAdmin || 
    isManager || 
    isCoordinator || 
    (currentUser?.role === 'teacher' && currentUser?.types?.some(t => t.toUpperCase() === 'ARP'));

  const allowedSchools = currentUser?.allowedSchools || [];

  // Filter student list to match selected teacher's assigned schools (Allowed Schools)
  const userStudents = useMemo(() => {
    if (!currentUser) return [];
    if (hasFullAccess || allowedSchools.length === 0) {
      return students;
    }
    return students.filter(s => allowedSchools.includes(s.school));
  }, [students, currentUser, hasFullAccess, allowedSchools]);

  // Filter records lists accordingly
  const userRecords = useMemo(() => {
    if (!currentUser) return [];
    if (hasFullAccess || allowedSchools.length === 0) {
      return records;
    }
    return records.filter(r => allowedSchools.includes(r.school));
  }, [records, currentUser, hasFullAccess, allowedSchools]);

  // Filter tasks lists accordingly
  const userTasks = useMemo(() => {
    if (!currentUser) return [];
    if (hasFullAccess || allowedSchools.length === 0) {
      return interventionTasks;
    }
    return interventionTasks.filter(t => allowedSchools.includes(t.school));
  }, [interventionTasks, currentUser, hasFullAccess, allowedSchools]);

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} availableTeachers={teachers} />;
  }

  // Navigate & toggle sidebar
  const navigateTo = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const renderModuleContent = () => {
    if (activeModule === 'selection') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans text-slate-800 select-none relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="w-full max-w-4xl space-y-8 relative z-10 text-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100/60 px-4 py-2 rounded-2xl">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
                <span className="text-[11px] font-black tracking-widest text-indigo-700 uppercase">
                  Unified School Management System
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Choose Section
              </h1>
              
              <p className="text-sm text-slate-500 font-bold max-w-lg mx-auto">
                Account: <span className="text-slate-800 font-black">{currentUser.name}</span> ({currentUser.role === 'admin' ? '👤 Admin Panel' : '👤 Teacher'})
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full max-w-7xl mx-auto pt-4">
              
              {/* CARD 1: Attendance Section */}
              <div 
                id="module-attendance-card"
                onClick={() => {
                  setActiveModule('attendance');
                  setActiveTab('dashboard');
                }}
                className="bg-white border-2 border-slate-200 hover:border-indigo-600 rounded-[32px] p-8 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 focus:outline-none select-none group relative overflow-hidden"
              >
                <AdminAuthorityBadge
                  itemId="module_attendance"
                  title="Attendance Section Module"
                  marathiTitle="उपस्थिती विभाग"
                  category="module"
                  module="attendance"
                  position="top-right"
                />
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-all duration-300 pointer-events-none" />
                
                <div className="inline-flex justify-center items-center p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 relative z-10 shadow-sm">
                  <ClipboardCheck className="w-10 h-10" />
                </div>
                
                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug mb-3 font-sans">
                  Attendance Section
                </h2>
                
                <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-xs mx-auto">
                  Track daily student attendance, compile summaries, and manage school tasks easily.
                </p>

                <div className="mt-8">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 group-hover:text-indigo-700 bg-indigo-50 group-hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all">
                    Enter Attendance →
                  </span>
                </div>
              </div>

              {/* CARD 2: Inventory Section */}
              <div 
                id="module-inventory-card"
                onClick={() => {
                  setActiveModule('inventory');
                }}
                className="bg-white border-2 border-slate-200 hover:border-indigo-600 rounded-[32px] p-8 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 focus:outline-none select-none group relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]"
              >
                <AdminAuthorityBadge
                  itemId="module_inventory"
                  title="Inventory Section Module"
                  marathiTitle="इन्व्हेंटरी विभाग"
                  category="module"
                  module="inventory"
                  position="top-right"
                />
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-all duration-300 pointer-events-none" />
                
                <div className="inline-flex justify-center items-center p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 relative z-10 shadow-sm">
                  <Boxes className="w-10 h-10" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none font-sans">
                  Inventory
                </h2>
              </div>

              {/* CARD 3: ARP Section */}
              {canAccessArp && (
                <div 
                  id="module-arp-card"
                  onClick={() => {
                    setActiveModule('arp');
                  }}
                  className="bg-white border-2 border-slate-200 hover:border-indigo-600 rounded-[32px] p-8 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 focus:outline-none select-none group relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]"
                >
                  <AdminAuthorityBadge
                    itemId="module_arp"
                    title="ARP Section Module"
                    marathiTitle="एआरपी विभाग"
                    category="module"
                    module="arp"
                    position="top-right"
                  />
                  <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-all duration-300 pointer-events-none" />
                  
                  <div className="inline-flex justify-center items-center p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 relative z-10 shadow-sm">
                    <BookOpen className="w-10 h-10 text-emerald-600" />
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none font-sans">
                    ARP
                  </h2>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-xs mx-auto mt-3">
                    Assessments, Dashboard, and Downloads tracking.
                  </p>
                </div>
              )}

              {/* CARD 4: SERP Section */}
              {canAccessSerp && (
                <div 
                  id="module-serp-card"
                  onClick={() => {
                    setActiveModule('serp');
                  }}
                  className="bg-white border-2 border-slate-200 hover:border-indigo-600 rounded-[32px] p-8 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 focus:outline-none select-none group relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]"
                >
                  <AdminAuthorityBadge
                    itemId="module_serp"
                    title="SERP Section Module"
                    marathiTitle="एसईआरपी विभाग"
                    category="module"
                    module="serp"
                    position="top-right"
                  />
                  <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-all duration-300 pointer-events-none" />
                  
                  <div className="inline-flex justify-center items-center p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 relative z-10 shadow-sm">
                    <BookOpen className="w-10 h-10" />
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none font-sans">
                    SERP
                  </h2>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-xs mx-auto mt-3">
                    Teaching logs, execution analysis & details tracking.
                  </p>
                </div>
              )}

              {/* CARD 5: System Section (SERP chya khali / nantar) */}
              <div 
                id="module-system-card"
                onClick={() => {
                  setActiveModule('system');
                }}
                className="bg-white border-2 border-slate-200 hover:border-indigo-600 rounded-[32px] p-8 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 focus:outline-none select-none group relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]"
              >
                <AdminAuthorityBadge
                  itemId="module_system"
                  title="System & Authority Module"
                  marathiTitle="सिस्टीम व हक्क विभाग"
                  category="module"
                  module="system"
                  position="top-right"
                />
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-all duration-300 pointer-events-none" />
                
                <div className="inline-flex justify-center items-center p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 relative z-10 shadow-sm">
                  <Cpu className="w-10 h-10" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none font-sans">
                  System
                </h2>
                <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-xs mx-auto mt-3">
                  Authority, permissions & role access controls across entire app.
                </p>

                <div className="mt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 group-hover:text-indigo-700 bg-indigo-50 group-hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all">
                    Authority & Rights →
                  </span>
                </div>
              </div>

            </div>

            <div className="pt-6">
              <button 
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-xs font-black text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-5 py-3 rounded-2xl border border-dashed border-rose-250 shadow-sm transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Log Out
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
              Security Access Sync Active 🔐
            </div>
          </div>
        </div>
      );
    }

    if (activeModule === 'inventory') {
      return (
        <InventoryPanel 
          teachers={teachers} 
          currentUser={currentUser} 
          setActiveModule={setActiveModule}
          handleLogout={handleLogout}
        />
      );
    }

    if (activeModule === 'arp') {
      return (
        <ArpPanel
          currentUser={currentUser}
          students={students}
          teachers={teachers}
          setActiveModule={setActiveModule}
          handleLogout={handleLogout}
        />
      );
    }

    if (activeModule === 'serp') {
      return (
        <SerpPanel
          currentUser={currentUser}
          students={students}
          teachers={teachers}
          setActiveModule={setActiveModule}
          handleLogout={handleLogout}
        />
      );
    }

    if (activeModule === 'system') {
      return (
        <SystemPanel
          currentUser={currentUser}
          teachers={teachers}
          setActiveModule={setActiveModule}
          handleLogout={handleLogout}
        />
      );
    }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* SIDEBAR NAVIGATION - LOCKED ON DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 select-none">
        {/* Brand Banner */}
        <div className="flex items-center gap-3 px-6 py-5 bg-indigo-950 border-b border-indigo-900">
          <div className="p-2 bg-gradient-to-tr from-violet-550 to-indigo-650 bg-violet-600 rounded-xl text-white shadow-md">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide">Attendance App</h1>
            <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider truncate max-w-[150px] block">
              👤 {currentUser.name}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {firebaseStatus === 'connecting' && (
                <>
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse mr-0.5" />
                  <span className="text-[8px] text-amber-300 font-bold tracking-wider uppercase">Connecting with Firebase...</span>
                </>
              )}
              {firebaseStatus === 'synced' && (
                <>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-0.5 animate-pulse" />
                  <span className="text-[8px] text-emerald-400 font-bold tracking-wider uppercase">Firebase Cloud Synced</span>
                </>
              )}
              {firebaseStatus === 'error' && (
                <>
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-0.5" />
                  <span className="text-[8px] text-rose-400 font-bold tracking-wider uppercase">Offline Sandbox Mode</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation list items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {/* Back to Module Selection Button */}
          <div className="relative flex items-center mb-4">
            <button
              onClick={() => setActiveModule('selection')}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black bg-slate-800 text-indigo-300 hover:text-white hover:bg-slate-750 transition-all border border-slate-700 shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4 shrink-0 text-indigo-400" />
              ← Switch Module
            </button>
            <AdminAuthorityBadge
              itemId="btn_switch_module"
              title="Switch Module Button"
              marathiTitle="विभाग बदला बटण"
              category="button"
              module="attendance"
              position="inline"
              className="ml-1 shrink-0"
            />
          </div>

          {/* Dashboard Item */}
          {canViewDashboard && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('dashboard')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_attendance_dashboard"
                title="Dashboard View"
                marathiTitle="डॅशबोर्ड"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {/* Students Item */}
          {canViewStudentsAndAttendance && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('students')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'students'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Students</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_students_list"
                title="Students List & Attendance Sheet"
                marathiTitle="विद्यार्थी यादी व हजेरी"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {/* Take Attendance Item */}
          {canViewTakeAttendance && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('take')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'take'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span>Take Attendance</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_take_attendance"
                title="Take Attendance Panel"
                marathiTitle="हजेरी नोंदणी पॅनेल"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {/* Tasks Item */}
          {canViewTasks && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('tasks')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Tasks</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_tasks_panel"
                title="Tasks Panel"
                marathiTitle="टास्क व्यवस्थापन"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {/* Downloads Item */}
          <div className="relative flex items-center">
            <button
              onClick={() => navigateTo('downloads')}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'downloads'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Download className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>Downloads</span>
            </button>
            <AdminAuthorityBadge
              itemId="page_downloads"
              title="Downloads & Reports"
              marathiTitle="डाऊनलोड्स आणि अहवाल"
              category="page"
              module="attendance"
              position="inline"
              className="ml-1 shrink-0"
            />
          </div>

          {/* Manager Specific Tabs */}
          {canViewCloudSync && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('sheets')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'sheets'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Cloud Sync (Sheets)</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_sheets_sync"
                title="Cloud Sync (Google Sheets)"
                marathiTitle="क्लाउड सिंक (गुगल शीट्स)"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {canViewCreateTask && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('create_task')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'create_task'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Create Tasks</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_create_task"
                title="Create Task Management"
                marathiTitle="नवीन टास्क तयार करा"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {canViewObserve && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('observe')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'observe'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Eye className="w-4 h-4 shrink-0 text-teal-400" />
                <span>Observe</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_observe_panel"
                title="Classroom Observation"
                marathiTitle="वर्ग निरीक्षण पॅनेल"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {canViewTeacherMonitoring && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('teacher_monitoring')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'teacher_monitoring'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Teacher Monitoring</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_teacher_monitoring"
                title="Teacher Monitoring"
                marathiTitle="शिक्षक कामकाज निरीक्षण"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {canViewAdminPanel && (
            <div className="relative flex items-center">
              <button
                onClick={() => navigateTo('admin')}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Admin Panel</span>
              </button>
              <AdminAuthorityBadge
                itemId="page_admin_panel"
                title="Admin Master Panel"
                marathiTitle="ॲडमिन पॅनेल"
                category="page"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {/* System & Authority Section */}
          <div className="relative flex items-center">
            <button
              onClick={() => setActiveModule('system')}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-indigo-300 hover:text-white hover:bg-slate-800 transition-all border border-indigo-900/40"
            >
              <Cpu className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>System & Authority</span>
            </button>
            <AdminAuthorityBadge
              itemId="page_system_authority"
              title="System & Authority Section"
              marathiTitle="सिस्टीम व हक्क"
              category="page"
              module="system"
              position="inline"
              className="ml-1 shrink-0"
            />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-350 hover:bg-slate-800 transition-all mt-6 border border-dashed border-rose-950/15"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-550" />
            Sign Out
          </button>
        </nav>

        {/* Footer Credit Line */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-center text-slate-500 font-semibold uppercase tracking-wider">
          v2.2 - Security Access Control ✨
        </div>
      </aside>

      {/* MOBILE BAR AND CONTENT PANEL wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* RESPONSIVE TOP NAV BAR FOR MOBILE SCREEN SIZES */}
        <header className="flex items-center justify-between px-4 py-3.5 bg-indigo-950 border-b border-indigo-900 text-white lg:hidden select-none shrink-0 w-full sticky top-0 z-40">
          <div className="flex items-col">
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="w-5.5 h-5.5 text-indigo-300" />
              <h1 className="text-sm font-extrabold">Attendance App</h1>
              <div className="flex items-center gap-1">
                {firebaseStatus === 'connecting' && (
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" title="Connecting with Firebase..." />
                )}
                {firebaseStatus === 'synced' && (
                  <div className="w-1.5 h-1.5 bg-emerald-550 bg-emerald-500 rounded-full animate-pulse" title="Firebase Cloud Synced" />
                )}
                {firebaseStatus === 'error' && (
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" title="Offline Sandbox Mode" />
                )}
              </div>
            </div>
            <span className="text-[8px] text-indigo-300 font-bold block pl-8">👤 {currentUser.name}</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
          </button>
        </header>

        {/* SLIDE-OVER DRAWER MENU FOR MOBILE */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-indigo-950/80 backdrop-blur-xs select-none">
            <div className="w-64 bg-slate-900 p-5 space-y-6 flex flex-col justify-between h-full border-r border-slate-850 animate-in slide-in-from-left max-w-[85%]">
              
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5.5 h-5.5 text-indigo-400" />
                    <div>
                      <span className="text-sm font-bold text-white block">Attendance App</span>
                      <span className="text-[9px] text-slate-400 block font-semibold truncate max-w-[140px]">{currentUser.name}</span>
                    </div>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {canViewDashboard && (
                    <button
                      onClick={() => navigateTo('dashboard')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'dashboard' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      Dashboard
                    </button>
                  )}

                  {canViewStudentsAndAttendance && (
                    <button
                      onClick={() => navigateTo('students')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'students' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      Students
                    </button>
                  )}

                  {canViewTakeAttendance && (
                    <button
                      onClick={() => navigateTo('take')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'take' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4 shrink-0" />
                      Take Attendance
                    </button>
                  )}

                  {canViewTasks && (
                    <button
                      onClick={() => navigateTo('tasks')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'tasks' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 shrink-0" />
                      Tasks
                    </button>
                  )}

                  {/* Downloads Item */}
                  <button
                    onClick={() => navigateTo('downloads')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'downloads' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Download className="w-4 h-4 shrink-0 text-indigo-400" />
                    Downloads
                  </button>

                  {/* Manager Specific Mobile Tabs */}
                  {canViewCreateTask && (
                    <button
                      onClick={() => navigateTo('create_task')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'create_task' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 shrink-0 text-emerald-400" />
                      Create Tasks
                    </button>
                  )}

                  {canViewObserve && (
                    <button
                      onClick={() => navigateTo('observe')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'observe' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Eye className="w-4 h-4 shrink-0 text-teal-400" />
                      Observe
                    </button>
                  )}

                  {canViewTeacherMonitoring && (
                    <button
                      onClick={() => navigateTo('teacher_monitoring')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'teacher_monitoring' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Calendar className="w-4 h-4 shrink-0 text-amber-400" />
                      Teacher Monitoring
                    </button>
                  )}



                  {canViewCloudSync && (
                    <button
                      onClick={() => navigateTo('sheets')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'sheets' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      Cloud Sync (Sheets)
                    </button>
                  )}

                  {canViewAdminPanel && (
                    <button
                      onClick={() => navigateTo('admin')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'admin' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                      Admin Panel
                    </button>
                  )}

                  {/* System & Authority Section Mobile */}
                  <button
                    onClick={() => {
                      setActiveModule('system');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-300 hover:text-white hover:bg-slate-800 transition-all border border-indigo-900/40"
                  >
                    <Cpu className="w-4 h-4 shrink-0 text-indigo-400" />
                    System & Authority
                  </button>

                  {/* Switch Module Mobile */}
                  <button
                    onClick={() => {
                      setActiveModule('selection');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black text-indigo-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-all mt-4 border border-slate-700 shadow-sm"
                  >
                    <ArrowLeftRight className="w-4 h-4 shrink-0 text-indigo-400" />
                    ← Switch Module
                  </button>

                  {/* Logout Mobile */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-slate-800 mt-4 border border-dashed border-rose-950/20"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-rose-550" />
                    Sign Out
                  </button>
                </nav>
              </div>

              <div className="text-[10px] text-center text-slate-500 font-semibold uppercase tracking-wider pt-4 border-t border-slate-800">
                v2.2 - Security Access Control ✨
              </div>
            </div>

            {/* Spacer overlay to tap dismiss menu */}
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* MAIN SCROLLABLE CONTENT BODY */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && canViewDashboard && <Dashboard students={userStudents} records={userRecords} />}
          {activeTab === 'students' && canViewStudentsAndAttendance && (
            <StudentsList
              students={userStudents}
              records={userRecords}
              tasks={userTasks}
              onAddStudent={handleAddStudent}
              onAddStudentsList={handleAddStudentsList}
              onDeleteStudent={handleDeleteStudent}
              onClearAllStudents={handleClearAllStudents}
              onUpdateStudent={handleUpdateStudent}
              onImportStudentsAndRecords={handleImportStudentsAndRecords}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'downloads' && (
            <DownloadsPanel
              students={userStudents}
              records={userRecords}
              tasks={userTasks}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'take' && canViewTakeAttendance && <TakeAttendance students={userStudents} onSaveAttendanceBatch={handleSaveAttendanceBatch} />}
          {activeTab === 'tasks' && canViewTasks && (
            <TasksPanel 
              tasks={userTasks} 
              onUpdateTask={handleUpdateTask} 
              onDeleteTask={handleDeleteTask}
              currentUser={currentUser} 
              records={userRecords}
            />
          )}
          {activeTab === 'create_task' && canViewCreateTask && (
            <CreateTaskPanel
              students={students}
              records={records}
              existingTasks={interventionTasks}
              onTasksCreated={handleCreateTasks}
              onUpdateAllTasks={(updated) => {
                setInterventionTasks(updated);
                localStorage.setItem('same_app_intervention_tasks', JSON.stringify(updated));
                updated.forEach(t => syncSaveTask(t));
              }}
              taskGroups={taskGroups}
              onUpdateTaskGroups={(groups) => {
                setTaskGroups(groups);
                localStorage.setItem('same_app_task_groups', JSON.stringify(groups));
                groups.forEach(g => syncSaveTaskGroup(g));
              }}
              onDeleteTask={handleDeleteTask}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'observe' && canViewObserve && (
            <ObservePanel
               students={students}
               records={records}
               tasks={interventionTasks}
               currentUser={currentUser}
            />
          )}

          {activeTab === 'sheets' && canViewCloudSync && (
            <GoogleSheetsSync
              students={students}
              records={records}
              config={syncConfig}
              onUpdateConfig={handleUpdateConfig}
            />
          )}
          {activeTab === 'teacher_monitoring' && canViewTeacherMonitoring && (
            <TeacherMonitoring
              teachers={teachers}
              students={students}
              records={records}
            />
          )}

          {activeTab === 'admin' && canViewAdminPanel && (
            <AdminPanel
              teachers={teachers}
              onUpdateTeachers={handleUpdateTeachers}
              students={students}
              config={syncConfig}
              onUpdateConfig={handleUpdateConfig}
              rolePermissions={rolePermissions}
              onUpdateRolePermissions={(perms) => {
                setRolePermissions(perms);
                localStorage.setItem('same_app_role_permissions', JSON.stringify(perms));
                syncSaveRolePermissions(perms);
              }}
              currentUser={currentUser}
            />
          )}
        </main>

      </div>

    </div>
    );
  };

  return (
    <AuthorityProvider currentUser={currentUser} teachers={teachers}>
      {renderModuleContent()}
      <AdminAuthorityFloatingBar onOpenSystemPanel={() => setActiveModule('system')} />
    </AuthorityProvider>
  );
}
