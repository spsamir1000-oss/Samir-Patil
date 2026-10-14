import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, InterventionTask, CommunityTaskGroup } from '../types';
import { 
  Briefcase, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  PlusCircle, 
  ChevronDown, 
  ChevronUp, 
  ClipboardList,
  CheckSquare
} from 'lucide-react';

interface CreateTaskPanelProps {
  students: Student[];
  records: AttendanceRecord[];
  existingTasks: InterventionTask[];
  onTasksCreated: (tasks: InterventionTask[]) => void;
  onUpdateAllTasks?: (tasks: InterventionTask[]) => void;
  taskGroups: CommunityTaskGroup[];
  onUpdateTaskGroups: (groups: CommunityTaskGroup[]) => void;
  onDeleteTask?: (taskId: string) => void;
  currentUser?: { role: string; name: string };
}

export default function CreateTaskPanel({ 
  students, 
  records, 
  existingTasks, 
  onTasksCreated,
  onUpdateAllTasks,
  taskGroups,
  onUpdateTaskGroups,
  onDeleteTask,
  currentUser
}: CreateTaskPanelProps) {
  const isAdmin = currentUser?.role === 'admin';

  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [openSchoolDropdown, setOpenSchoolDropdown] = useState(false);
  const [dateMethod, setDateMethod] = useState<'range' | 'till_present'>('range');
  const [continueProcess, setContinueProcess] = useState(false);
  
  const [minStreak, setMinStreak] = useState<number | ''>('');
  const [maxStreak, setMaxStreak] = useState<number | ''>('');
  
  const [minAbsentFreq, setMinAbsentFreq] = useState<number | ''>('');
  const [maxAbsentFreq, setMaxAbsentFreq] = useState<number | ''>('');
  
  const [minAbsentPercent, setMinAbsentPercent] = useState<number | ''>('');
  const [maxAbsentPercent, setMaxAbsentPercent] = useState<number | ''>('');

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  
  // Task Groups are passed as props, so no local state is needed

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  
  // Manual Task States
  const [showManualSection, setShowManualSection] = useState(false);
  const [manualSchool, setManualSchool] = useState('');
  const [manualStd, setManualStd] = useState('');
  const [manualDiv, setManualDiv] = useState('');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  
  // Custom delete modals
  const [taskToDelete, setTaskToDelete] = useState<{ id: string, name: string } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<CommunityTaskGroup | null>(null);

  // Expand/collapse groups status
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Group editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Derive unique schools
  const uniqueSchools = useMemo(() => {
    return Array.from(new Set(students.map(s => s.school))).sort();
  }, [students]);

  // Derive unique manual dropdown options
  const uniqueManualStds = useMemo(() => {
    const filtered = students.filter(s => !manualSchool || s.school === manualSchool);
    return Array.from(new Set(filtered.map(s => s.std))).sort();
  }, [students, manualSchool]);

  const uniqueManualDivs = useMemo(() => {
    const filtered = students.filter(s => (!manualSchool || s.school === manualSchool) && (!manualStd || s.std === manualStd));
    return Array.from(new Set(filtered.map(s => s.div))).sort();
  }, [students, manualSchool, manualStd]);

  // Filter students for manual selection
  const manualStudentsFiltered = useMemo(() => {
    let filtered = students;
    if (manualSchool) filtered = filtered.filter(s => s.school === manualSchool);
    if (manualStd) filtered = filtered.filter(s => s.std === manualStd);
    if (manualDiv) filtered = filtered.filter(s => s.div === manualDiv);
    if (manualSearchQuery.trim()) {
      const q = manualSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
    }
    // Return early if no specific filter is widely set to avoid rendering huge lists
    if (!manualSchool && !manualStd && !manualSearchQuery.trim()) {
      return filtered.slice(0, 10);
    }
    return filtered.slice(0, 50); // limit for UI performance
  }, [students, manualSchool, manualStd, manualDiv, manualSearchQuery]);

  // Add Manual Task function
  const handleAddManualTask = (student: Student) => {
    const hasActive = existingTasks.some(t => t.studentId === student.id && t.status !== 'completed');
    if (hasActive) {
      alert("या विद्यार्थ्याचा टास्क आधीपासूनच सुरू आहे.");
      return;
    }

    const taskGroupId = crypto.randomUUID();
    const dateStr = new Date().toISOString().split('T')[0];

    const newGroup: CommunityTaskGroup = {
      id: taskGroupId,
      title: `मॅन्युअल टास्क - ${student.name}`,
      dateCreated: dateStr,
      conditionsUsed: 'मॅन्युअली निवडलेले',
      studentIds: [student.id]
    };

    onUpdateTaskGroups([newGroup, ...taskGroups]);

    const newTask: InterventionTask = {
      id: crypto.randomUUID(),
      studentId: student.id,
      studentName: student.name,
      school: student.school,
      std: student.std,
      div: student.div,
      dateCreated: dateStr,
      status: 'pending',
      taskGroupId: taskGroupId
    };

    onTasksCreated([newTask]);
    alert(`"${student.name}" साठी टास्क यशस्वीरित्या तयार झाला!`);
  };

  // Evaluate students based on criteria
  const evaluatedStudents = useMemo(() => {
    if (!startDate || !endDate) return [];

    let filtered = students;
    if (selectedSchools.length > 0) {
      filtered = filtered.filter(s => selectedSchools.includes(s.school));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const validRecords = records.filter(r => {
      const d = new Date(r.date);
      return d >= start && d <= end;
    });

    const results = [];

    for (const student of filtered) {
      // Find if an active task exists
      const hasActiveTask = existingTasks.some(t => t.studentId === student.id && t.status !== 'completed');

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
      if (minStreak !== '' && maxStrk < minStreak) continue;
      if (maxStreak !== '' && maxStrk > maxStreak) continue;

      if (minAbsentFreq !== '' && absentDays < minAbsentFreq) continue;
      if (maxAbsentFreq !== '' && absentDays > maxAbsentFreq) continue;

      if (minAbsentPercent !== '' && absentPercent < minAbsentPercent) continue;
      if (maxAbsentPercent !== '' && absentPercent > maxAbsentPercent) continue;

      results.push({
        student,
        maxStreak: maxStrk,
        absentDays,
        absentPercent: Math.round(absentPercent),
        totalActiveDays,
        hasActiveTask
      });
    }

    return results;

  }, [students, records, startDate, endDate, selectedSchools, minStreak, maxStreak, minAbsentFreq, maxAbsentFreq, minAbsentPercent, maxAbsentPercent, existingTasks]);

  // Handle setting default title when opening create form
  React.useEffect(() => {
    if (evaluatedStudents.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const schoolPart = selectedSchools.length > 0 ? (selectedSchools.length === 1 ? ` - ${selectedSchools[0]}` : ` - ${selectedSchools.length} शाळा`) : ' - सर्व शाळा';
      setCustomTaskTitle(`टास्क${schoolPart} - ${todayStr}`);
    }
  }, [evaluatedStudents.length, selectedSchools]);

  const toggleSelect = (id: string, disabled: boolean) => {
    if (disabled) return;
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const selectAll = () => {
    const next = new Set(selectedStudentIds);
    evaluatedStudents.forEach(item => {
      if (!item.hasActiveTask) {
        next.add(item.student.id);
      }
    });
    setSelectedStudentIds(next);
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Submit and Create Task Group flow
  const handleCreateTaskGroup = () => {
    if (evaluatedStudents.length === 0) return;
    
    // Auto-select all if none selected by default, or use selected ones
    const targetStudentIds = selectedStudentIds.size > 0 
      ? Array.from(selectedStudentIds) 
      : evaluatedStudents.filter(item => !item.hasActiveTask).map(item => item.student.id);

    if (targetStudentIds.length === 0) {
      alert("कृपया गैरहजर विद्यार्थ्यांची निवड करा!");
      return;
    }

    const taskGroupId = crypto.randomUUID();
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Build Conditions Text
    const conditionsArr = [];
    if (dateMethod === 'till_present') {
      conditionsArr.push(`कालावधी: आजच्या तारखेपर्यंत (Till Present Date)`);
      if (continueProcess) {
        conditionsArr.push(`प्रक्रिया सुरू ठेवा (Continuous)`);
      }
    } else {
      conditionsArr.push(`कालावधी: ${startDate} ते ${endDate}`);
    }
    if (selectedSchools.length > 0) {
      conditionsArr.push(`शाळा: ${selectedSchools.join(', ')}`);
    }
    if (minStreak !== '') conditionsArr.push(`किमान स्ट्रीक: ${minStreak} दिवस`);
    if (minAbsentFreq !== '') conditionsArr.push(`किमान गैरहजर: ${minAbsentFreq} दिवस`);
    if (minAbsentPercent !== '') conditionsArr.push(`किमान गैरहजर %: ${minAbsentPercent}%`);
    const conditionsUsed = conditionsArr.join(' | ');

    // 1. Create a new task group and save
    const newGroup: CommunityTaskGroup = {
      id: taskGroupId,
      title: customTaskTitle.trim() || `टास्क - ${dateStr}`,
      dateCreated: dateStr,
      conditionsUsed,
      studentIds: targetStudentIds,
      dateMethod,
      continueProcess: dateMethod === 'till_present' ? continueProcess : false,
      startDate,
      endDate,
      minStreak,
      maxStreak,
      minAbsentFreq,
      maxAbsentFreq,
      minAbsentPercent,
      maxAbsentPercent,
      selectedSchools
    };

    const updatedGroups = [newGroup, ...taskGroups];
    onUpdateTaskGroups(updatedGroups);

    // 2. Create individual Intervention tasks for selected students
    const newTasks: InterventionTask[] = [];
    evaluatedStudents.forEach(item => {
      if (targetStudentIds.includes(item.student.id)) {
        newTasks.push({
          id: crypto.randomUUID(),
          studentId: item.student.id,
          studentName: item.student.name,
          school: item.student.school,
          std: item.student.std,
          div: item.student.div,
          dateCreated: dateStr,
          status: 'pending',
          taskGroupId: taskGroupId // link back to our parent group task
        });
      }
    });

    onTasksCreated(newTasks);
    
    // Reset state
    setSelectedStudentIds(new Set());
    setShowCreateForm(false);
  };

  // Task Groups edit title
  const startEditGroup = (group: CommunityTaskGroup) => {
    setEditingGroupId(group.id);
    setEditingTitle(group.title);
  };

  const saveEditGroup = () => {
    if (!editingTitle.trim() || !editingGroupId) return;

    const updated = taskGroups.map(g => {
      if (g.id === editingGroupId) {
        return { ...g, title: editingTitle.trim() };
      }
      return g;
    });

    onUpdateTaskGroups(updated);
    setEditingGroupId(null);
  };

  // Task Groups Delete flow
  const handleDeleteGroup = (group: CommunityTaskGroup) => {
    setGroupToDelete(group);
  };

  const confirmDeleteGroup = () => {
    if (!groupToDelete) return;

    // 1. Filter out from taskGroups
    const updatedGroups = taskGroups.filter(g => g.id !== groupToDelete.id);
    onUpdateTaskGroups(updatedGroups);

    // 2. Delete linked individual tasks in parents' state
    if (onUpdateAllTasks) {
      const remainingTasks = existingTasks.filter(t => t.taskGroupId !== groupToDelete.id);
      onUpdateAllTasks(remainingTasks);
    }
    setGroupToDelete(null);
  };
  
  const confirmDeleteTask = () => {
    if (taskToDelete) {
      onDeleteTask?.(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 select-none">
      {/* Banner Title */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
           <Briefcase className="w-6 h-6 text-emerald-400" /> 
           टास्क तयार करा (Create Tasks)
        </h2>
      </div>

      {/* Filter Criteria Panel */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-550" />
          १. निकष आणि फिल्टर निवडून सामूहीक टास्क (Group Task By Filters)
        </div>
        
        {/* Date Selection Method Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDateMethod('range')}
            className={`py-3 px-4 rounded-xl text-xs font-black transition-all duration-200 border ${
              dateMethod === 'range'
                ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🗓️ विशिष्ट कालावधी (Date Range)
          </button>
          <button
            type="button"
            onClick={() => {
              setDateMethod('till_present');
              const todayStr = new Date().toISOString().split('T')[0];
              setEndDate(todayStr);
            }}
            className={`py-3 px-4 rounded-xl text-xs font-black transition-all duration-200 border ${
              dateMethod === 'till_present'
                ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎯 आजच्या तारखेपर्यंत (Till Present Date)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">प्रारंभ तारीख (Start Date)</label>
            <input 
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-violet-500"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">
              {dateMethod === 'till_present' ? "आजची तारीख (Today's Date)" : "अंतिम तारीख (End Date)"}
            </label>
            <input 
              type="date"
              disabled={dateMethod === 'till_present'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 relative">
            <label className="text-xs font-black text-slate-700">शाळा निवडा (School Name)</label>
            <button
              type="button"
              onClick={() => setOpenSchoolDropdown(!openSchoolDropdown)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-left flex justify-between items-center outline-none focus:border-violet-500"
            >
              <span className="truncate pr-2">
                {selectedSchools.length === 0
                  ? 'सर्व शाळा (All Schools)'
                  : `${selectedSchools.length} शाळा निवडल्या`}
              </span>
              <span className="text-[10px] text-slate-400">▼</span>
            </button>
            {openSchoolDropdown && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-2 space-y-1">
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={selectedSchools.length === 0}
                    onChange={() => {
                      setSelectedSchools([]);
                    }}
                  />
                  <span>सर्व शाळा (All Schools)</span>
                </label>
                {uniqueSchools.map(sch => {
                  const isChecked = selectedSchools.includes(sch);
                  return (
                    <label key={sch} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedSchools(selectedSchools.filter(s => s !== sch));
                          } else {
                            setSelectedSchools([...selectedSchools, sch]);
                          }
                        }}
                      />
                      <span>{sch}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Till Present Date conditional switch: Continue Process */}
        {dateMethod === 'till_present' && (
          <div className="mt-4 p-4 bg-violet-50/50 border border-violet-100 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-black text-violet-950 flex items-center gap-1.5">
                <span>🔄</span>
                <span>प्रक्रिया सुरू ठेवा (Continue Process)</span>
              </label>
              <p className="text-[10px] text-violet-700 font-medium leading-tight">
                हा पर्याय निवडल्यास, जसे दिवस पुढे येतील तसे निकष आपोआप लागू होतील आणि नवीन गैरहजर मुलांचे टास्क रोज ऑटोमॅटिक तयार होतील.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={continueProcess}
                onChange={e => setContinueProcess(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-500">सलग गैरहजरी श्रेणी (Absent Streak Range)</label>
            <div className="flex gap-2">
              <input type="number" min="0" placeholder="किमान दिवस" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                 value={minStreak === '' ? '' : minStreak} onChange={e => setMinStreak(e.target.value ? Number(e.target.value) : '')} />
              <input type="number" min="0" placeholder="कमाल दिवस" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                 value={maxStreak === '' ? '' : maxStreak} onChange={e => setMaxStreak(e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-500">एकूण गैरहजर दिवस (Absent Days Range)</label>
            <div className="flex gap-2">
              <input type="number" min="0" placeholder="किमान दिवस" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                 value={minAbsentFreq === '' ? '' : minAbsentFreq} onChange={e => setMinAbsentFreq(e.target.value ? Number(e.target.value) : '')} />
              <input type="number" min="0" placeholder="कमाल दिवस" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                 value={maxAbsentFreq === '' ? '' : maxAbsentFreq} onChange={e => setMaxAbsentFreq(e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-500">गैरहजर टक्केवारी श्रेणी (Absent % Range)</label>
            <div className="flex gap-2">
              <input type="number" min="0" max="100" placeholder="किमान %" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                 value={minAbsentPercent === '' ? '' : minAbsentPercent} onChange={e => setMinAbsentPercent(e.target.value ? Number(e.target.value) : '')} />
              <input type="number" min="0" max="100" placeholder="कमाल %" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                 value={maxAbsentPercent === '' ? '' : maxAbsentPercent} onChange={e => setMaxAbsentPercent(e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
        </div>

        {/* Dynamic Summary Notification & Create Task Button right below criteria */}
        {startDate && endDate && (
           <div className="bg-violet-50 border border-violet-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
             <div>
               <p className="text-xs font-black text-violet-800">
                 निवडलेल्या निकषांनुसार <span className="text-violet-950 underline font-black">{evaluatedStudents.length}</span> विद्यार्थी सापडले आहेत.
               </p>
               <p className="text-[10px] text-violet-400 font-bold mt-0.5">या निकषांना एक ग्रुप टास्क म्हणून जतन करण्यासाठी खाली क्लिक करा</p>
             </div>
             
             {evaluatedStudents.length > 0 && !showCreateForm && (
               <button 
                 onClick={() => setShowCreateForm(true)}
                 className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
               >
                 <PlusCircle className="w-4 h-4" />
                 टास्क तयार करा (Create Task)
               </button>
             )}
           </div>
        )}

        {/* Task Submission naming box */}
        {showCreateForm && evaluatedStudents.length > 0 && (
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5 animate-fade-in">
             <div className="flex justify-between items-center">
               <h4 className="text-xs font-black text-slate-800">नवीन टास्क माहिती (New Task Metadata)</h4>
               <button onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-4 h-4" />
               </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-[10px] font-bold text-slate-500 mb-1">टास्क शीर्षक (Task Title)</label>
                 <input 
                   type="text" 
                   className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                   value={customTaskTitle}
                   onChange={e => setCustomTaskTitle(e.target.value)}
                   placeholder="उदा. सलग ३ दिवस गैरहजर जळगाव"
                 />
               </div>
               <div className="flex items-end">
                 <button
                   onClick={handleCreateTaskGroup}
                   className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs rounded-xl shadow-md hover:teal-600 transition-all flex items-center justify-center gap-1.5"
                 >
                   <CheckCircle className="w-4 h-4" />
                   Submit
                 </button>
               </div>
             </div>
           </div>
        )}
      </div>

      {/* Matching Students Checklist */}
      {startDate && endDate && evaluatedStudents.length > 0 && (
         <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
           <div className="flex justify-between items-end border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-800 text-sm">विद्यार्थी यादी (Matching Students Checklist)</h3>
                <p className="text-slate-500 text-[10px] font-bold mt-0.5">निवडलेले विद्यार्थी या टास्कचे भाग असतील (टास्क तयार करण्यापूर्वी हवा तो बदल करा)</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={selectAll} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200 transition-colors">Select All</button>
                 <button onClick={clearSelection} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200 transition-colors">Clear</button>
              </div>
           </div>

           <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-100 rounded-xl">
             <table className="w-full text-left border-collapse min-w-[700px]">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black sticky top-0">
                   <th className="py-3 px-4">निवड (Select)</th>
                   <th className="py-3 px-4">नाव (Student Name)</th>
                   <th className="py-3 px-4">शाळा आणि वर्ग (School & Class)</th>
                   <th className="py-3 px-4 text-center">सलग गैरहजर (Streak)</th>
                   <th className="py-3 px-4 text-center">गैरहजर दिवस / एकूण</th>
                   <th className="py-3 px-4 text-right">गैरहजरी %</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                 {evaluatedStudents.map(item => {
                   const isSelected = selectedStudentIds.has(item.student.id);
                   const isBlocked = item.hasActiveTask;
                   return (
                     <tr 
                       key={item.student.id} 
                       className={`hover:bg-slate-50 transition-colors ${isBlocked ? 'opacity-50' : 'cursor-pointer'}`}
                       onClick={() => toggleSelect(item.student.id, isBlocked)}
                     >
                       <td className="py-3 px-4">
                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isBlocked ? 'border-slate-300 bg-slate-100' : isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 bg-white'}`}>
                           {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                           {isBlocked && <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                         </div>
                       </td>
                       <td className="py-3 px-4 whitespace-nowrap">
                         <span className="font-bold text-slate-800">{item.student.name}</span>
                         {isBlocked && <span className="block text-[9px] text-rose-500 font-bold mt-0.5">लॉग आधीपासून सुरू आहे (Task already active)</span>}
                       </td>
                       <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                         🏢 {item.student.school} <span className="text-slate-400 mx-1">|</span> {item.student.std}-{item.student.div}
                       </td>
                       <td className="py-3 px-4 text-center">
                         <span className={`px-2 py-0.5 rounded font-bold ${item.maxStreak > 2 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                           🚫 सलग {item.maxStreak} दिवस
                         </span>
                       </td>
                       <td className="py-3 px-4 text-center text-slate-600">
                         {item.absentDays} / {item.totalActiveDays} दिवस
                       </td>
                       <td className="py-3 px-4 text-right">
                         <span className={`px-2 py-0.5 rounded font-bold ${item.absentPercent > 50 ? 'bg-rose-100 text-rose-700' : item.absentPercent > 25 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                           {item.absentPercent}%
                         </span>
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>
         </div>
      )}

      {/* Manual Task Creation Panel */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
        <div 
          className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between cursor-pointer group"
          onClick={() => setShowManualSection(!showManualSection)}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            २. मॅन्युअली विद्यार्थी निवडून टास्क तयार करा (Add Tasks Manually)
          </div>
          {showManualSection ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        
        {showManualSection && (
          <div className="space-y-6 pt-2 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">शाळा</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                  value={manualSchool}
                  onChange={e => {
                    setManualSchool(e.target.value);
                    setManualStd('');
                    setManualDiv('');
                  }}
                >
                  <option value="">सर्व शाळा</option>
                  {uniqueSchools.map(sch => <option key={sch} value={sch}>{sch}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">वर्ग</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                  value={manualStd}
                  onChange={e => {
                    setManualStd(e.target.value);
                    setManualDiv('');
                  }}
                  disabled={!manualSchool}
                >
                  <option value="">सर्व वर्ग</option>
                  {uniqueManualStds.map(std => <option key={std} value={std}>वर्ग {std}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">तुकडी</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                  value={manualDiv}
                  onChange={e => setManualDiv(e.target.value)}
                  disabled={!manualStd}
                >
                  <option value="">सर्व तुकड्या</option>
                  {uniqueManualDivs.map(div => <option key={div} value={div}>तुकडी {div}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">नाव शोधा</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="विद्यार्थ्याचे नाव..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
                    value={manualSearchQuery}
                    onChange={e => setManualSearchQuery(e.target.value)}
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black">
                    <th className="py-2.5 px-4">नाव (Student Name)</th>
                    <th className="py-2.5 px-4">शाळा आणि वर्ग</th>
                    <th className="py-2.5 px-4 text-right">कृती (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {manualStudentsFiltered.length === 0 ? (
                     <tr>
                       <td colSpan={3} className="py-6 text-center text-slate-400 font-bold">
                         कोणतेही विद्यार्थी सापडले नाहीत.
                       </td>
                     </tr>
                  ) : (
                    manualStudentsFiltered.map(student => {
                      const hasActive = existingTasks.some(t => t.studentId === student.id && t.status !== 'completed');
                      return (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-slate-800">{student.name}</span>
                            {hasActive && <span className="block text-[9px] text-rose-500 font-bold mt-0.5">टास्क आधीपासून सुरू आहे</span>}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                             {student.school} | {student.std}-{student.div}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                             <button
                               disabled={hasActive}
                               onClick={() => handleAddManualTask(student)}
                               className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${hasActive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 hover:scale-105 active:scale-95'}`}
                             >
                               + Task जोडा
                             </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              {manualStudentsFiltered.length === 50 && (
                <div className="text-center py-2 text-[10px] text-slate-400 font-bold border-t border-slate-100">
                  फक्त पहिले ५० विद्यार्थी दाखवत आहे. नाव शोधून अधिक अचूक शोधा.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Groups List Row (Jo task tayar jhala to khali show karel + Edit / Delete) */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
         <div>
           <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
             <ClipboardList className="w-4 h-4 text-violet-600 animate-pulse" />
             ३. तयार केलेले टास्क आणि नियंत्रक (Created Intervention Tasks History)
           </h3>
           <p className="text-slate-400 text-[10px] font-bold mt-0.5">पद्धतशीररित्या तयार केलेले घरभेटीचे नियोजन आणि त्यांचे रिझल्ट्स</p>
         </div>

         {taskGroups.length === 0 ? (
           <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-semibold">
              कोणताही ग्रुप टास्क तयार केलेला नाही. निकष निवडून पहिला टास्क तयार करा!
           </div>
         ) : (
           <div className="grid grid-cols-1 gap-4">
             {taskGroups.map(group => {
               // Find students belonging to this group
               const matchedIndividualTasks = existingTasks.filter(t => t.taskGroupId === group.id);
               const isExpanded = expandedGroupId === group.id;

               return (
                 <div key={group.id} className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 transition-all hover:bg-slate-50 group">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 pb-3">
                     
                     <div className="flex-1">
                       {editingGroupId === group.id ? (
                         <div className="flex items-center gap-2">
                           <input 
                             type="text" 
                             className="text-xs font-bold border border-slate-300 rounded px-2 py-1 outline-none focus:border-violet-600 bg-white"
                             value={editingTitle}
                             onChange={e => setEditingTitle(e.target.value)}
                           />
                           <button onClick={saveEditGroup} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                             <Save className="w-4 h-4" />
                           </button>
                           <button onClick={() => setEditingGroupId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-2">
                           <h4 className="text-xs font-black text-slate-800 tracking-wide group-hover:text-indigo-600 transition-colors uppercase">
                             📋 {group.title}
                           </h4>
                           <button onClick={() => startEditGroup(group)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-6 \00 z-10 transition-all">
                             <Edit2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       )}

                       <div className="text-[10px] font-semibold text-slate-400 mt-1 flex flex-wrap gap-2">
                         <span>📅 निर्मिती: <strong className="font-extrabold text-slate-600">{group.dateCreated}</strong></span>
                          {group.continueProcess && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-black border border-emerald-200 text-[9px] uppercase tracking-wider animate-pulse ml-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              🔄 स्वयंचलित सुरू (Continuous Mode ON)
                            </span>
                          )}
                         <span>•</span>
                         <span>👥 विद्यार्थी: <strong className="font-extrabold text-violet-600">{group.studentIds.length} जण</strong></span>
                       </div>

                       <div className="text-[9px] font-extrabold text-slate-500 bg-white/70 border border-slate-150 px-2 py-0.5 rounded-lg inline-block mt-1.5 shadow-2xs font-mono">
                         ⚙️ {group.conditionsUsed}
                       </div>
                     </div>

                     {/* Action edits and expand toggle */}
                     <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <button 
                          onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 inline-flex items-center gap-1 transition-all"
                        >
                          {isExpanded ? (
                            <>माहिती बंद करा <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>विद्यार्थी पहा ({matchedIndividualTasks.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>

                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteGroup(group)}
                            className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg border border-rose-100 transition-all font-black"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                     </div>
                   </div>

                   {/* Expandable student records containing statuses */}
                   {isExpanded && (
                     <div className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-2 animate-fade-in">
                       {matchedIndividualTasks.length === 0 ? (
                         <div className="text-[10px] font-bold text-slate-400 text-center py-2">
                           या टास्क मधील विद्यार्थ्यांची नोंद आधीच पूर्ण किंवा नष्ट झाली आहे.
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                           {matchedIndividualTasks.map(t => {
                             let bgClass = 'bg-slate-100 border-slate-200 text-slate-700';
                             let statText = 'प्रलंबित (Pending Visit)';

                             if (t.status === 'active_task') {
                               bgClass = 'bg-amber-50 border-amber-200 text-amber-800';
                               statText = 'सक्रिय (Yes clicked, Will return)';
                             } else if (t.status === 'successful' || t.status === 'completed') {
                               bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                               statText = 'यशस्वी हजर (Successful)';
                             } else if (t.status === 'unsuccessful') {
                               bgClass = 'bg-rose-50 border-rose-200 text-rose-700';
                               statText = 'अयशस्वी (No clicked)';
                             }

                             return (
                               <div key={t.id} className={`p-2 rounded-xl border text-[10px] transition-all font-semibold flex items-center justify-between ${bgClass}`}>
                                 <div>
                                   <p className="font-bold text-xs">{t.studentName}</p>
                                   <p className="text-[8px] opacity-75">{t.school} | वर्ग {t.std}-{t.div}</p>
                                 </div>
                                 <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                   <span className="text-[8px] uppercase tracking-wider font-extrabold bg-white/70 px-1.5 py-0.5 rounded border border-black/5 block shadow-4xs">
                                     {statText}
                                   </span>
                                   {isAdmin && (
                                     <button
                                       onClick={() => setTaskToDelete({ id: t.id, name: t.studentName })}
                                       className="p-1 hover:bg-rose-100/50 text-rose-500 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                       title="टास्क डिलीट करा"
                                     >
                                       <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                   )}
                                 </div>
                               </div>
                             )
                           })}
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
         )}
      </div>
      
      {/* Custom Delete Confirmation Dialog for Task */}
       {taskToDelete && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setTaskToDelete(null)}>
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
             <div className="flex flex-col items-center text-center space-y-3">
               <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center border border-rose-100 mb-2">
                 <Trash2 className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-black text-rose-950 tracking-tight text-balance">
                 टास्क डिलीट करायचा?
               </h3>
               <p className="text-sm font-semibold text-rose-700/80">
                 तुम्हाला <span className="font-extrabold text-rose-900">"{taskToDelete.name}"</span> चे टास्क खरोखरच पुसून टाकायचे आहे का?
               </p>
             </div>
             
             <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
               <button
                 onClick={() => setTaskToDelete(null)}
                 className="w-full py-3.5 bg-slate-50 text-slate-700 font-bold rounded-xl active:bg-slate-100 transition-colors"
                 type="button"
               >
                 रद्द करा
               </button>
               <button
                 onClick={confirmDeleteTask}
                 className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all flex justify-center items-center gap-2"
                 type="button"
               >
                 <Trash2 className="w-4 h-4" />
                 डिलीट करा
               </button>
             </div>
           </div>
         </div>
       )}
 
       {/* Custom Delete Confirmation Dialog for Group */}
       {groupToDelete && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setGroupToDelete(null)}>
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
             <div className="flex flex-col items-center text-center space-y-3">
               <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center border border-rose-100 mb-2">
                 <Trash2 className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-black text-rose-950 tracking-tight text-balance">
                 ग्रुप डिलीट करायचा?
               </h3>
               <p className="text-sm font-semibold text-rose-700/80">
                 तुम्हाला <span className="font-extrabold text-rose-900">"{groupToDelete.title}"</span> हा टास्क ग्रुप डिलिट करायचा आहे का? यातील सर्व विद्यार्थ्यांचे टास्क नष्ट होतील.
               </p>
             </div>
             
             <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
               <button
                 onClick={() => setGroupToDelete(null)}
                 className="w-full py-3.5 bg-slate-50 text-slate-700 font-bold rounded-xl active:bg-slate-100 transition-colors"
                 type="button"
               >
                 रद्द करा
               </button>
               <button
                 onClick={confirmDeleteGroup}
                 className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all flex justify-center items-center gap-2"
                 type="button"
               >
                 <Trash2 className="w-4 h-4" />
                 नष्ट करा
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
