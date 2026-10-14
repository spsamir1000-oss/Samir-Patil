import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Student, 
  AttendanceRecord, 
  InterventionTask, 
  CommunityTaskGroup, 
  Teacher, 
  SyncConfig, 
  RolePermissionsConfig 
} from '../types';

// Setup background silent auth to ensure 'request.auth != null'
export function initializeFirebaseAuth(onUserAuthenticated: (user: User | null) => void) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      onUserAuthenticated(user);
    } else {
      try {
        const credential = await signInAnonymously(auth);
        if (credential.user) {
          onUserAuthenticated(credential.user);
        }
      } catch (error) {
        console.warn('Failed to authenticate anonymously with Firebase (unauthenticated mode):', error);
        onUserAuthenticated(null);
      }
    }
  });
}

// 1. Fetch entire Cloud Firestore Database to synchronize state
export interface CloudSyncData {
  students: Student[];
  records: AttendanceRecord[];
  interventionTasks: InterventionTask[];
  taskGroups: CommunityTaskGroup[];
  teachers: Teacher[];
  rolePermissions?: RolePermissionsConfig;
  syncConfig?: SyncConfig;
}

export async function fetchCloudData(): Promise<CloudSyncData> {
  const result: CloudSyncData = {
    students: [],
    records: [],
    interventionTasks: [],
    taskGroups: [],
    teachers: []
  };

  try {
    // A. Fetch Students
    const studentSnap = await getDocs(collection(db, 'students')).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'students');
      return null;
    });
    if (studentSnap) {
      studentSnap.forEach(doc => {
        result.students.push(doc.data() as Student);
      });
    }

    // B. Fetch Attendance Records
    const recordsSnap = await getDocs(collection(db, 'attendance_records')).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'attendance_records');
      return null;
    });
    if (recordsSnap) {
      recordsSnap.forEach(doc => {
        result.records.push(doc.data() as AttendanceRecord);
      });
    }

    // C. Fetch Intervention Tasks
    const tasksSnap = await getDocs(collection(db, 'intervention_tasks')).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'intervention_tasks');
      return null;
    });
    if (tasksSnap) {
      tasksSnap.forEach(doc => {
        result.interventionTasks.push(doc.data() as InterventionTask);
      });
    }

    // D. Fetch Task Groups
    const groupsSnap = await getDocs(collection(db, 'community_task_groups')).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'community_task_groups');
      return null;
    });
    if (groupsSnap) {
      groupsSnap.forEach(doc => {
        result.taskGroups.push(doc.data() as CommunityTaskGroup);
      });
    }

    // E. Fetch Teachers
    const teachersSnap = await getDocs(collection(db, 'teachers')).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'teachers');
      return null;
    });
    if (teachersSnap) {
      teachersSnap.forEach(doc => {
        result.teachers.push(doc.data() as Teacher);
      });
    }

    // F. Fetch Sync Config Setting
    const syncDoc = await getDoc(doc(db, 'settings', 'sync_config')).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'settings/sync_config');
      return null;
    });
    if (syncDoc && syncDoc.exists()) {
      result.syncConfig = syncDoc.data() as SyncConfig;
    }

    // G. Fetch Role Permissions Setting
    const permDoc = await getDoc(doc(db, 'settings', 'role_permissions')).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'settings/role_permissions');
      return null;
    });
    if (permDoc && permDoc.exists()) {
      result.rolePermissions = permDoc.data() as RolePermissionsConfig;
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch data from cloud:', error);
    return result;
  }
}

// 2. Perform Migration Upload when Firestore is found Empty
export async function uploadInitialDataToCloud(data: {
  students: Student[];
  records: AttendanceRecord[];
  interventionTasks: InterventionTask[];
  taskGroups: CommunityTaskGroup[];
  teachers: Teacher[];
  syncConfig: SyncConfig;
  rolePermissions: RolePermissionsConfig;
}) {
  try {
    // Batch write in chunks of 500 documents (Firestore batch size limit)
    const writeInBatches = async (items: any[], collectionName: string) => {
      let batch = writeBatch(db);
      let count = 0;

      for (const item of items) {
        if (!item.id) continue;
        const ref = doc(db, collectionName, item.id);
        batch.set(ref, item);
        count++;

        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    };

    // A. Students
    if (data.students.length > 0) {
      await writeInBatches(data.students, 'students').catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'students');
      });
    }

    // B. Attendance Records
    if (data.records.length > 0) {
      await writeInBatches(data.records, 'attendance_records').catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'attendance_records');
      });
    }

    // C. Intervention Tasks
    if (data.interventionTasks.length > 0) {
      await writeInBatches(data.interventionTasks, 'intervention_tasks').catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'intervention_tasks');
      });
    }

    // D. Task Groups
    if (data.taskGroups.length > 0) {
      await writeInBatches(data.taskGroups, 'community_task_groups').catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'community_task_groups');
      });
    }

    // E. Teachers
    if (data.teachers.length > 0) {
      await writeInBatches(data.teachers, 'teachers').catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'teachers');
      });
    }

    // F. Sync Config Doc
    await setDoc(doc(db, 'settings', 'sync_config'), data.syncConfig).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'settings/sync_config');
    });

    // G. Role Permissions Doc
    await setDoc(doc(db, 'settings', 'role_permissions'), data.rolePermissions).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, 'settings/role_permissions');
    });

    console.log('Successfully completed first-time Firebase data migration!');
  } catch (err) {
    console.error('Failed to run cloud data migration:', err);
  }
}

// 3. Granular Entity Handlers for Live Sync
export async function syncSaveStudent(student: Student) {
  try {
    await setDoc(doc(db, 'students', student.id), student);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `students/${student.id}`);
  }
}

export async function syncDeleteStudent(studentId: string) {
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
  }
}

export async function syncSaveAttendanceBatch(records: AttendanceRecord[]) {
  try {
    let batch = writeBatch(db);
    let count = 0;

    for (const record of records) {
      const id = `${record.studentId}_${record.date}`; // Unique stable compound id
      // Ensure we clean id structure for rules compliance schema
      const sanitizedRecord = { ...record, id }; 
      const ref = doc(db, 'attendance_records', id);
      batch.set(ref, sanitizedRecord);
      count++;

      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'attendance_records');
  }
}

export async function syncDeleteAttendanceRecord(recordId: string) {
  try {
    await deleteDoc(doc(db, 'attendance_records', recordId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `attendance_records/${recordId}`);
  }
}

export async function syncSaveTask(task: InterventionTask) {
  try {
    await setDoc(doc(db, 'intervention_tasks', task.id), task);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `intervention_tasks/${task.id}`);
  }
}

export async function syncDeleteTask(taskId: string) {
  try {
    await deleteDoc(doc(db, 'intervention_tasks', taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `intervention_tasks/${taskId}`);
  }
}

export async function syncSaveTaskGroup(group: CommunityTaskGroup) {
  try {
    await setDoc(doc(db, 'community_task_groups', group.id), group);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `community_task_groups/${group.id}`);
  }
}

export async function syncSaveTeacher(teacher: Teacher) {
  try {
    await setDoc(doc(db, 'teachers', teacher.id), teacher);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `teachers/${teacher.id}`);
  }
}

export async function syncSaveSyncConfig(config: SyncConfig) {
  try {
    await setDoc(doc(db, 'settings', 'sync_config'), config);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/sync_config');
  }
}

export async function syncSaveRolePermissions(permissions: RolePermissionsConfig) {
  try {
    await setDoc(doc(db, 'settings', 'role_permissions'), permissions);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/role_permissions');
  }
}
