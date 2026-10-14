import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  TrendingUp, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Target,
  FileCheck,
  Download,
  Settings,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Edit2,
  Trash2
} from 'lucide-react';
import { Teacher, Student } from '../types';
import AssessmentManager from './AssessmentManager';
import SerpDownload from './SerpDownload';
import AdminControl from './AdminControl';
import SerpAnalysis from './SerpAnalysis';
import SerpTeacherMonitoring from './SerpTeacherMonitoring';

interface SerpPanelProps {
  currentUser: Teacher | null;
  students: Student[];
  teachers: Teacher[];
  setActiveModule: (module: 'selection' | 'attendance' | 'inventory' | 'serp') => void;
  handleLogout: () => void;
}

type ActiveTab = 'dailyLog' | 'moduleAssessment' | 'baselineEndline' | 'analysis' | 'download' | 'adminControl' | 'teacherMonitoring';

interface DailyLog {
  id: string;
  date: string;
  teacherId: string;
  status?: string;
  
  // New Fields
  school: string;
  classGrade: string;
  division: string;
  module: string;
  subModule?: string;
  session: string;
  optionalSession?: string;
  eventName?: string;
  worksheet: string;

  // Old Fields
  topic?: string;
  duration?: number;
  studentsPresent?: number;
  learningOutcomes?: string;
  challenges?: string;
}

interface ClassEntry {
  school: string;
  classGrade: string;
  division: string;
  module: string;
  subModule?: string;
  session: string;
  optionalSession?: string;
  eventName?: string;
  worksheet: string;
  otherModule?: string;
  otherHours?: string;
  otherMinutes?: string;
}

export default function SerpPanel({ currentUser, students, teachers, setActiveModule, handleLogout }: SerpPanelProps) {
  const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'academic_coordinator';
  const isSerpTeacher = currentUser?.role === 'teacher' && currentUser?.types?.some(t => t.toUpperCase() === 'SERP');
  const canAccess = isManagement || isSerpTeacher;

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md border border-slate-200/80 shadow-xl flex flex-col items-center">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl mb-6">
            <BookOpen className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied (प्रवेश नाकारला)</h2>
          <p className="text-slate-500 font-medium mb-6">
            या विभागासाठी तुमच्याकडे आवश्यक परवानग्या नाहीत. हा विभाग केवळ SERP लॉगिन आणि शैक्षणिक समन्वयक, व्यवस्थापक, किंवा प्रशासक यांच्यासाठीच उपलब्ध आहे.
          </p>
          <button 
            onClick={() => setActiveModule('selection')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-sm"
          >
            मुख्य पृष्ठावर जा
          </button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<ActiveTab>('dailyLog');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [logs, setLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('serp_teaching_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logStatus, setLogStatus] = useState<'Present' | 'Holiday' | 'On Leave'>('Present');
  const [logChallenges, setLogChallenges] = useState('');
  const [baselineTab, setBaselineTab] = useState<'baseline' | 'endline'>('baseline');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const [showPendingLogs, setShowPendingLogs] = useState<boolean>(() => {
    return localStorage.getItem('serp_show_pending_logs') !== 'false';
  });

  const [showRecentLogs, setShowRecentLogs] = useState(true);

  const [pendingStartDate, setPendingStartDate] = useState<string>(() => {
    return localStorage.getItem('serp_pending_start_date') || 
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 14); // 14 days ago
        return d.toISOString().split('T')[0];
      })();
  });

  const [pendingEndDate, setPendingEndDate] = useState<string>(() => {
    return localStorage.getItem('serp_pending_end_date') || 
      (() => {
        return new Date().toISOString().split('T')[0]; // today
      })();
  });

  const pendingDates = useMemo(() => {
    if (!pendingStartDate || !pendingEndDate) return [];
    const start = new Date(pendingStartDate);
    const end = new Date(pendingEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    const datesList: string[] = [];
    const current = new Date(start);
    const todayStr = new Date().toISOString().split('T')[0];
    let limit = 0;
    while (current <= end && limit < 150) {
      const dateStr = current.toISOString().split('T')[0];
      if (dateStr <= todayStr) {
        datesList.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
      limit++;
    }

    const loggedDates = new Set(
      logs
        .filter(l => {
          if (currentUser?.role === 'teacher') {
            return l.teacherId === currentUser.id;
          }
          return true;
        })
        .map(l => l.date)
    );

    return datesList.filter(d => !loggedDates.has(d)).sort((a, b) => b.localeCompare(a));
  }, [pendingStartDate, pendingEndDate, logs, currentUser]);

  const handlePendingStartDateChange = (val: string) => {
    setPendingStartDate(val);
    localStorage.setItem('serp_pending_start_date', val);
  };

  const handlePendingEndDateChange = (val: string) => {
    setPendingEndDate(val);
    localStorage.setItem('serp_pending_end_date', val);
  };

  const handleTogglePendingLogs = () => {
    const nextVal = !showPendingLogs;
    setShowPendingLogs(nextVal);
    localStorage.setItem('serp_show_pending_logs', String(nextVal));
  };
  
  const [classEntries, setClassEntries] = useState<ClassEntry[]>(() => {
    const lastSchool = localStorage.getItem('serp_last_school') || '';
    return [{ school: lastSchool, classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }];
  });

  // Calculate unique schools from students data
  const schoolOptions = Array.from(new Set(students.map(s => s.school))).filter(Boolean).sort();
  const classOptions = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  const divisionOptions = ['A', 'B', 'C', 'D', 'E', 'F'];
  const moduleOptions = Array.from({length: 10}, (_, i) => `Module ${i + 1}`);
  const mainModuleOptions = [
    ...Array.from({length: 10}, (_, i) => `Module ${i + 1}`),
    'Event',
    'Module Assessment',
    'Baseline Assessment',
    'Endline Assessment',
    'Other'
  ];
  const subModuleOptions = Array.from({length: 10}, (_, i) => `Module ${i + 1}`);
  const sessionOptions = ['Session 1', 'Session 2', 'Session 3', 'Session 4'];
  const worksheetOptions = ['Yes', 'No'];

  const handleEntryChange = (index: number, field: keyof ClassEntry, value: string) => {
    const updated = [...classEntries];
    (updated[index] as any)[field] = value;
    setClassEntries(updated);

    if (field === 'school') {
      localStorage.setItem('serp_last_school', value);
    }
  };

  const handleAddEntry = () => {
    const lastEntry = classEntries[classEntries.length - 1];
    if (lastEntry) {
      setClassEntries([...classEntries, { ...lastEntry }]);
    } else {
      const lastSchool = localStorage.getItem('serp_last_school') || '';
      setClassEntries([...classEntries, { school: lastSchool, classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }]);
    }
  };

  const handleRemoveEntry = (index: number) => {
    const updated = [...classEntries];
    updated.splice(index, 1);
    setClassEntries(updated);
  };

  const isFormValid = () => {
    if (!logDate) return false;
    if (logStatus !== 'Present') return true;

    if (classEntries.length === 0) return false;

    return classEntries.every(entry => {
      if (!entry.school || !entry.classGrade || !entry.division || !entry.module) {
        return false;
      }
      if (entry.module === 'Module Assessment' && !entry.subModule) {
        return false;
      }
      if (entry.module === 'Event' && !entry.eventName?.trim()) {
        return false;
      }
      if (entry.module === 'Other') {
        const hasName = !!entry.otherModule?.trim();
        const hrs = parseInt(entry.otherHours || '0') || 0;
        const mins = parseInt(entry.otherMinutes || '0') || 0;
        const hasTime = (hrs > 0 || mins > 0);
        return hasName && hasTime;
      }
      
      const isAssessment = entry.module === 'Baseline Assessment' || entry.module === 'Endline Assessment' || entry.module === 'Module Assessment';
      if (!isAssessment && !entry.session) {
        return false;
      }

      return true;
    });
  };

  const triggerWebhook = (actionType: 'teaching_analysis_sync' | 'teaching_analysis_edit' | 'teaching_analysis_delete', targetLogs: DailyLog[]) => {
    try {
        const configStr = localStorage.getItem('same_app_sync_config');
        if (!configStr) return;
        const config = JSON.parse(configStr);
        
        let gsheetUrl = config.appsScriptUrl;
        if (config.appsScriptUrls && config.appsScriptUrls['teachingAnalysis']) gsheetUrl = config.appsScriptUrls['teachingAnalysis'];

        let oDriveUrl = config.oneDriveUrl;
        if (config.oneDriveUrls && config.oneDriveUrls['teachingAnalysis']) oDriveUrl = config.oneDriveUrls['teachingAnalysis'];

        if (!gsheetUrl && !oDriveUrl) return;

        const target = config.syncTarget || 'sheets';
        const isSheetsEnabled = target === 'sheets' || target === 'both';
        const isOneDriveEnabled = target === 'onedrive' || target === 'both';

        const payload = {
            action: actionType,
            teacherName: currentUser?.name || 'Unknown',
            data: targetLogs
        };

        if (isSheetsEnabled && gsheetUrl) {
            fetch(gsheetUrl, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)}).catch(e => console.warn('Sync failed', e));
        }
        if (isOneDriveEnabled && oDriveUrl) {
            fetch(oDriveUrl, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)}).catch(e => console.warn('Sync failed', e));
        }
    } catch (e) {
        console.error("Auto sync failed", e);
    }
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDate) {
      alert("Please select a date.");
      return;
    }

    if (!isFormValid()) {
      alert("Please completely fill in fields for all class entries.");
      return;
    }

    let updatedOrNewLogs: DailyLog[] = [];

    if (logStatus !== 'Present') {
      updatedOrNewLogs.push({
        id: editingLogId || Date.now().toString(),
        date: logDate,
        teacherId: currentUser?.id || 'unknown',
        status: logStatus,
        school: '',
        classGrade: '',
        division: '',
        module: '',
        session: '',
        worksheet: '',
        challenges: ''
      });
    } else {
      updatedOrNewLogs = classEntries.map((entry, index) => ({
        id: editingLogId || (Date.now().toString() + index),
        date: logDate,
        teacherId: currentUser?.id || 'unknown',
        status: logStatus,
        school: entry.school,
        classGrade: entry.classGrade,
        division: entry.division,
        module: entry.module === 'Other' ? (entry.otherModule || 'Other') : entry.module,
        subModule: entry.subModule || '',
        session: entry.module === 'Other' ? '' : (entry.session || ''),
        optionalSession: entry.optionalSession || '',
        eventName: entry.eventName || '',
        worksheet: (entry.module === 'Baseline Assessment' || entry.module === 'Endline Assessment' || entry.module === 'Module Assessment' || entry.module === 'Event' || entry.module === 'Other') ? 'No' : entry.worksheet,
        challenges: logChallenges,
        duration: entry.module === 'Other' ? ((parseInt(entry.otherHours || '0') * 60) + parseInt(entry.otherMinutes || '0')) : undefined
      }));
    }

    let finalLogs = [...logs];
    if (editingLogId) {
      // It's an edit, replace the specific log element
      const index = finalLogs.findIndex(l => l.id === editingLogId);
      if (index !== -1) {
         finalLogs[index] = updatedOrNewLogs[0];
      }
      setEditingLogId(null);
      alert("Daily log updated successfully.");
      setTimeout(() => triggerWebhook('teaching_analysis_edit', [updatedOrNewLogs[0]]), 100);
    } else {
      finalLogs = [...finalLogs, ...updatedOrNewLogs];
      alert("Daily teaching log saved successfully.");
      setTimeout(() => triggerWebhook('teaching_analysis_sync', updatedOrNewLogs), 100);
      setActiveTab('analysis'); // only jump on new logs
    }

    setLogs(finalLogs);
    localStorage.setItem('serp_teaching_logs', JSON.stringify(finalLogs));
    
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogStatus('Present');
    setLogChallenges('');
    const lastSchool = localStorage.getItem('serp_last_school') || '';
    setClassEntries([{ school: lastSchool, classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }]);
  };

  const handleDeleteLog = (logId: string) => {
     const logToDelete = logs.find(l => l.id === logId);
     if (!logToDelete) return;

     const logDate = new Date(logToDelete.date);
     const now = new Date();
     if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) {
        alert("Only logs from the current month can be deleted.");
        return;
     }

     if (window.confirm("Are you sure you want to delete this daily log entry?")) {
        const updatedLogs = logs.filter(l => l.id !== logId);
        setLogs(updatedLogs);
        localStorage.setItem('serp_teaching_logs', JSON.stringify(updatedLogs));
        
        setTimeout(() => triggerWebhook('teaching_analysis_delete', [logToDelete]), 100);
     }
  };

  const handleEditClick = (log: DailyLog) => {
     const logDate = new Date(log.date);
     const now = new Date();
     if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) {
        alert("Only logs from the current month can be edited.");
        return;
     }
     
     setEditingLogId(log.id);
     setLogDate(log.date);
     setLogStatus((log.status as any) || 'Present');
     setLogChallenges(log.challenges || '');
     
     if (log.status !== 'Present') {
        setClassEntries([{ school: '', classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }]);
     } else {
        const isStandardModule = ['Baseline Assessment', 'Endline Assessment', 'Module Assessment', 'Event'].includes(log.module) || log.module.startsWith('Module');
        setClassEntries([{
           school: log.school,
           classGrade: log.classGrade,
           division: log.division,
           module: isStandardModule ? log.module : 'Other',
           session: log.session || '',
           subModule: log.subModule || '',
           optionalSession: log.optionalSession || '',
           eventName: log.eventName || '',
           worksheet: log.worksheet || 'Yes',
           otherModule: isStandardModule ? '' : log.module,
           otherHours: log.duration ? Math.floor(log.duration / 60).toString() : '0',
           otherMinutes: log.duration ? (log.duration % 60).toString() : '0'
        }]);
     }
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const myLogs = logs.filter(log => log.teacherId === currentUser?.id);
  
  // Calculate some stats
  const totalClasses = myLogs.length;
  const totalDuration = myLogs.reduce((acc, log) => acc + Number(log.duration), 0);
  const totalStudents = myLogs.reduce((acc, log) => acc + Number(log.studentsPresent), 0);

  const tabs = [
    { id: 'dailyLog', label: 'Add Daily Log', icon: PlusCircle },
    { id: 'moduleAssessment', label: 'Module Assessment', icon: FileCheck },
    { id: 'baselineEndline', label: 'Baseline/Endline Assessment', icon: Target },
    { id: 'analysis', label: 'Analysis', icon: TrendingUp },
    { id: 'download', label: 'Download', icon: Download },
    ...(isManagement ? [{ id: 'teacherMonitoring', label: 'Teacher Monitoring', icon: Users }] : []),
    ...(currentUser?.role === 'admin' ? [{ id: 'adminControl', label: 'Admin Control', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-800 w-full relative">
      
      {/* 1. DESKTOP PERSISTENT LEFT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 select-none text-white h-screen sticky top-0 justify-between">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-6 py-5 bg-indigo-950 border-b border-indigo-900">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-inner shadow-indigo-400/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white uppercase font-sans">SERP Portal</h1>
              <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Teaching Logs</p>
            </div>
          </div>

          {/* User Widget */}
          <div className="px-5 py-5 border-b border-slate-800">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm shadow-inner overflow-hidden border border-slate-600">
                 {currentUser?.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                 <p className="text-xs font-black truncate text-white">{currentUser?.name}</p>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 truncate block mt-0.5">
                   SERP Module
                 </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-6 space-y-7">
            <div className="px-4 pb-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Sections
            </div>
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TabIcon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm text-indigo-100' : 'group-hover:rotate-6'}`} />
                    <span className="text-xs font-bold">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="bg-slate-800/40 rounded-2xl p-2 space-y-1">
             <button
                onClick={() => setActiveModule('selection')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
             >
                <ChevronLeft className="w-4 h-4" />
                Back to Modules
             </button>
             <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-500 hover:bg-rose-950/30 transition-all border border-transparent hover:border-rose-900/50"
             >
                <LogOut className="w-4 h-4" />
                Logout
             </button>
          </div>
        </div>
      </aside>

      {/* MOBILE NAV OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* MOBILE DRAWER */}
      <aside className={`fixed top-0 left-0 h-full w-[280px] bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out lg:hidden flex flex-col justify-between ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-600 rounded-lg shadow-inner shadow-indigo-400/30">
                   <BookOpen className="w-5 h-5 text-white" />
                 </div>
                 <div>
                   <h1 className="text-sm font-black tracking-tight text-white uppercase">SERP Portal</h1>
                 </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <div className="px-2 pb-2 mt-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Sections</div>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as ActiveTab); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <TabIcon className="w-5 h-5" />
                    <span className="text-sm font-bold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900">
             <button
               onClick={() => setActiveModule('selection')}
               className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 mb-2"
             >
               <ChevronLeft className="w-5 h-5" /> Back
             </button>
             <button
               onClick={handleLogout}
               className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 bg-rose-950/20"
             >
               <LogOut className="w-5 h-5" /> Logout
             </button>
          </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        
        {/* TOP NAVBAR MOB */}
        <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-black text-slate-900 uppercase">SERP PORTAL</h1>
          </div>
        </header>

        {/* SCROLLABLE MAIN */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-7xl mx-auto custom-scrollbar relative">
          


          {/* DAILY LOG FORM TAB */}
          {activeTab === 'dailyLog' && (
            <div className="max-w-2xl mx-auto animate-fade-in space-y-6 pb-10">
              {/* Pending Daily Logs Section */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 animate-pulse">
                      <Clock className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        Pending Daily Logs (प्रलंबित दैनिक नोंदी)
                        {pendingDates.length > 0 && (
                          <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                            {pendingDates.length}
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Dates with no logged data in the selected range (निवडलेल्या कालावधीत न भरलेल्या दैनिक नोंदीची तारीख)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleTogglePendingLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPendingLogs ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        Hide (लपवा)
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-rose-500" />
                        Show (दाखवा)
                      </>
                    )}
                  </button>
                </div>

                {showPendingLogs && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Date segment selector */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Start Date (सुरवातीची तारीख)</label>
                        <input
                          type="date"
                          value={pendingStartDate}
                          onChange={(e) => handlePendingStartDateChange(e.target.value)}
                          className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">End Date (शेवटची तारीख)</label>
                        <input
                          type="date"
                          value={pendingEndDate}
                          onChange={(e) => handlePendingEndDateChange(e.target.value)}
                          className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Pending Dates display list */}
                    {pendingDates.length === 0 ? (
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                        <span className="text-xs font-extrabold text-emerald-800">
                          All logs completed for this date range! 🎉
                        </span>
                        <p className="text-[10px] text-emerald-500 font-bold mt-0.5">या कालावधीतील सर्व दैनिक नोंदी भरल्या आहेत!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-wider">
                          Missing Dates - Click to autofill date:
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1.5 custom-scrollbar border border-slate-100 bg-slate-50/50 rounded-xl">
                          {pendingDates.map((date) => (
                            <button
                              key={date}
                              type="button"
                              onClick={() => {
                                setLogDate(date);
                                // Scroll down smoothly to the Add Log form
                                const formEl = document.querySelector('form');
                                if (formEl) {
                                  formEl.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                              className="bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Calendar className="w-3.5 h-3.5 text-rose-400" />
                              {date}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                 <div className="mb-6">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                       <PlusCircle className="w-6 h-6 text-indigo-600" />
                       Add Daily Teaching Log
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Record your class execution details for analysis.</p>
                 </div>

                 <form onSubmit={handleSaveLog} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Date</label>
                        <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Status</label>
                        <select value={logStatus} onChange={e => setLogStatus(e.target.value as any)} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none">
                          <option value="Present">Present</option>
                          <option value="Holiday">Holiday</option>
                          <option value="On Leave">On Leave</option>
                        </select>
                      </div>
                    </div>

                    {logStatus === 'Present' && (
                      <>
                        <div className="space-y-6">
                          {classEntries.map((entry, index) => (
                            <div key={index} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative shadow-sm">
                              {classEntries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEntry(index)}
                                  className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              
                              <div className="flex items-center gap-2 mb-4">
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                  Class Set {index + 1}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">School</label>
                              <select 
                                value={entry.school} 
                                onChange={(e) => handleEntryChange(index, 'school', e.target.value)} 
                                required 
                                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none"
                              >
                                <option value="" disabled>Select School</option>
                                {schoolOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Class</label>
                              <select 
                                value={entry.classGrade} 
                                onChange={(e) => handleEntryChange(index, 'classGrade', e.target.value)} 
                                required 
                                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none"
                              >
                                <option value="" disabled>Select Class</option>
                                {classOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Division</label>
                              <select 
                                value={entry.division} 
                                onChange={(e) => handleEntryChange(index, 'division', e.target.value)} 
                                required 
                                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none"
                              >
                                <option value="" disabled>Select Division</option>
                                {divisionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Module</label>
                              <select 
                                value={entry.module} 
                                onChange={(e) => {
                                  handleEntryChange(index, 'module', e.target.value);
                                  handleEntryChange(index, 'session', '');
                                  handleEntryChange(index, 'optionalSession', '');
                                  handleEntryChange(index, 'eventName', '');
                                  handleEntryChange(index, 'subModule', '');
                                }} 
                                required 
                                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none"
                              >
                                <option value="" disabled>Select Module</option>
                                {mainModuleOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>

                            {entry.module === 'Module Assessment' && (
                              <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Module</label>
                                <select 
                                  value={entry.subModule || ''} 
                                  onChange={(e) => handleEntryChange(index, 'subModule', e.target.value)} 
                                  required 
                                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none"
                                >
                                  <option value="" disabled>Select Module</option>
                                  {subModuleOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            )}

                            {entry.module === 'Event' ? (
                              <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Event Name</label>
                                <input 
                                  type="text" 
                                  value={entry.eventName || ''} 
                                  onChange={(e) => handleEntryChange(index, 'eventName', e.target.value)} 
                                  required 
                                  placeholder="Enter Event Name"
                                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                                />
                              </div>
                            ) : entry.module === 'Other' ? (
                              <div className="col-span-1 sm:col-span-2 space-y-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-2">
                                <div>
                                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Module Name / Description <span className="text-rose-500">*</span></label>
                                  <input 
                                    type="text" 
                                    value={entry.otherModule || ''} 
                                    onChange={(e) => handleEntryChange(index, 'otherModule', e.target.value)} 
                                    required 
                                    placeholder="Enter Custom Module Name"
                                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Hours <span className="text-rose-500">*</span></label>
                                    <select 
                                      value={entry.otherHours || '0'} 
                                      onChange={(e) => handleEntryChange(index, 'otherHours', e.target.value)} 
                                      className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none cursor-pointer"
                                    >
                                      {Array.from({ length: 9 }, (_, i) => (
                                        <option key={i} value={String(i)}>{i} Hour{i !== 1 ? 's' : ''}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Minutes <span className="text-rose-500">*</span></label>
                                    <select 
                                      value={entry.otherMinutes || '0'} 
                                      onChange={(e) => handleEntryChange(index, 'otherMinutes', e.target.value)} 
                                      className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none cursor-pointer"
                                    >
                                      {Array.from({ length: 60 }, (_, i) => (
                                        <option key={i} value={String(i)}>{i} Min{i !== 1 ? 's' : ''}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              !(entry.module === 'Baseline Assessment' || entry.module === 'Endline Assessment' || entry.module === 'Module Assessment') && (
                                <div>
                                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Session</label>
                                  <select 
                                    value={entry.session} 
                                    onChange={(e) => handleEntryChange(index, 'session', e.target.value)} 
                                    required 
                                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none"
                                  >
                                    <option value="" disabled>Select Session</option>
                                    {sessionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                              )
                            )}

                            {!(entry.module === 'Baseline Assessment' || entry.module === 'Endline Assessment' || entry.module === 'Module Assessment' || entry.module === 'Event' || entry.module === 'Other') && (
                              <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Module Worksheet</label>
                                <select 
                                  value={entry.worksheet} 
                                  onChange={(e) => handleEntryChange(index, 'worksheet', e.target.value)} 
                                  required 
                                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none appearance-none"
                                >
                                  {worksheetOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center -mt-2">
                       <button 
                         type="button" 
                         onClick={handleAddEntry}
                         className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-5 py-2.5 rounded-full transition-colors border border-indigo-200 shadow-sm"
                       >
                         <PlusCircle className="w-4 h-4" />
                         Add Another Class Details
                       </button>
                    </div>
                  </>
                )}

                    {logStatus === 'Present' && (
                      <div className="pt-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Challenges you faced</label>
                        <textarea 
                          value={logChallenges} 
                          onChange={e => setLogChallenges(e.target.value)} 
                          rows={3} 
                          placeholder="Any difficulties faced or help needed?" 
                          className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none resize-none" 
                        />
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={!isFormValid()}
                        className={`w-full text-white font-black text-sm py-4 rounded-xl shadow-md transition-all ${
                          isFormValid() 
                            ? (editingLogId ? 'bg-amber-500 hover:bg-amber-600 cursor-pointer' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer')
                            : 'bg-slate-300 cursor-not-allowed opacity-50 shadow-none'
                        }`}
                      >
                        {editingLogId ? 'Update Daily Log' : 'Submit Daily Log'}
                      </button>
                      
                      {editingLogId && (
                         <button
                           type="button"
                           onClick={() => {
                              setEditingLogId(null);
                              const lastSchool = localStorage.getItem('serp_last_school') || '';
                              setClassEntries([{ school: lastSchool, classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }]);
                              setLogChallenges('');
                           }}
                           className="w-full text-slate-500 hover:text-slate-700 font-bold text-sm py-3 mt-2 rounded-xl transition-colors border border-slate-200"
                         >
                            Cancel Editing
                         </button>
                      )}
                    </div>
                 </form>
              </div>

              {/* RECENT LOGS SECTION */}
              {myLogs.length > 0 && (
                 <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-indigo-500" />
                          Recent Daily Logs
                       </h3>
                       <button
                         onClick={() => setShowRecentLogs(!showRecentLogs)}
                         className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                       >
                         {showRecentLogs ? <><EyeOff className="w-3.5 h-3.5" /> Hide Logs</> : <><Eye className="w-3.5 h-3.5" /> Show Recent Logs</>}
                       </button>
                    </div>

                    {showRecentLogs && (
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                             <thead>
                                <tr className="border-b-2 border-slate-100 uppercase text-[10px] tracking-wider text-slate-400 font-black">
                                   <th className="p-3">Date</th>
                                   <th className="p-3">School</th>
                                   <th className="p-3">Class & Div</th>
                                   <th className="p-3">Module</th>
                                   <th className="p-3 text-right">Actions</th>
                                </tr>
                             </thead>
                             <tbody>
                                {myLogs
                                   .filter(log => {
                                     const logDate = new Date(log.date);
                                     const now = new Date();
                                     return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
                                   })
                                   .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                   .slice(0, 15)
                                   .map(log => (
                                   <tr key={log.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${editingLogId === log.id ? 'bg-amber-50' : ''}`}>
                                      <td className="p-3 text-xs font-bold text-slate-700 whitespace-nowrap">{log.date}</td>
                                      <td className="p-3 text-xs font-bold text-slate-600 truncate max-w-[150px]">{log.status === 'Present' ? log.school : '-'}</td>
                                      <td className="p-3 text-xs font-bold text-slate-600">{log.status === 'Present' ? `${log.classGrade} - ${log.division}` : '-'}</td>
                                      <td className="p-3 text-xs font-bold text-slate-600">
                                         {log.status !== 'Present' ? (
                                            <span className="text-rose-500 font-black uppercase text-[10px] px-2 py-1 rounded bg-rose-50">{log.status}</span>
                                         ) : (
                                            <span>{log.module} {log.session ? `/ ${log.session}` : ''}</span>
                                         )}
                                      </td>
                                      <td className="p-3 items-center justify-end flex gap-2">
                                         <button 
                                            type="button" 
                                            onClick={() => handleEditClick(log)}
                                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                                            title="Edit"
                                         >
                                            <Edit2 className="w-4 h-4" />
                                         </button>
                                         <button 
                                            type="button"
                                            onClick={() => handleDeleteLog(log.id)}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                            title="Delete"
                                         >
                                            <Trash2 className="w-4 h-4" />
                                         </button>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                          {myLogs.length > 15 && <p className="text-[10px] text-slate-400 font-bold mt-3 text-center uppercase tracking-wider">Showing 15 most recent logs</p>}
                       </div>
                    )}
                 </div>
              )}
            </div>
          )}

          {/* MODULE ASSESSMENT TAB */}
          {activeTab === 'moduleAssessment' && (
            <div className="space-y-6 animate-fade-in pb-10">
               <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center min-h-[400px] flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-emerald-50 flex items-center justify-center rounded-3xl mb-4 text-emerald-500 shadow-inner">
                     <FileCheck className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mb-2">Module Assessment</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed font-semibold">
                    Manage and record module-wise assessments for your students here.
                  </p>
                  
                  <AssessmentManager assessmentType="module" currentUser={currentUser} />
               </div>
            </div>
          )}

          {/* BASELINE/ENDLINE ASSESSMENT TAB */}
          {activeTab === 'baselineEndline' && (
            <div className="space-y-6 animate-fade-in pb-10">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 relative">
                  <button 
                    onClick={() => setBaselineTab('baseline')} 
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all z-10 ${baselineTab === 'baseline' ? 'text-indigo-700 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Baseline Assessment
                  </button>
                  <button 
                    onClick={() => setBaselineTab('endline')} 
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all z-10 ${baselineTab === 'endline' ? 'text-indigo-700 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Endline Assessment
                  </button>
                </div>

                <div className="text-center min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 p-6">
                  <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center rounded-2xl mb-4 text-slate-400">
                     <Target className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mb-2">
                    {baselineTab === 'baseline' ? 'Baseline Assessment' : 'Endline Assessment'}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold mb-6">
                    Track the {baselineTab === 'baseline' ? 'starting' : 'final'} performance and growth metrics of your students.
                  </p>
                  
                  <AssessmentManager assessmentType={baselineTab} currentUser={currentUser} />
                </div>
              </div>
            </div>
          )}

          {/* ANALYSIS TAB */}
          {activeTab === 'analysis' && (
            <div className="space-y-6 animate-fade-in pb-10">
               <SerpAnalysis currentUser={currentUser} teachers={teachers} />
            </div>
          )}

          {/* OLD ANALYSIS BLOCK DISABLED COMMENTED OUT */}
          {/*
               <div className="bg-white border text-center border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm min-h-[400px] flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-indigo-50 flex items-center justify-center rounded-3xl mb-4 text-indigo-500 shadow-inner">
                     <TrendingUp className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mb-2">Teaching Analysis & Reporting</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed font-semibold">
                    This section will visualize your daily log data to show student engagement trends, time distribution across subjects, and overall impact metrics. Feature incoming.
                  </p>
                  
                  <div className="flex gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-40 text-left">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Classes Logged</p>
                       <p className="text-xl font-black mt-1 text-slate-800">{totalClasses}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-40 text-left">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Avg View</p>
                       <p className="text-xl font-black mt-1 text-slate-800">{totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0} std/class</p>
                    </div>
                  </div>
               </div>
            </div>
          */}

          {activeTab === 'download' && (
             <SerpDownload currentUser={currentUser} />
          )}

          {activeTab === 'adminControl' && currentUser?.role === 'admin' && (
             <AdminControl />
          )}

          {activeTab === 'teacherMonitoring' && isManagement && (
            <SerpTeacherMonitoring 
               logs={logs} 
               teachers={teachers} 
            />
          )}

        </main>
      </div>
    </div>
  );
}
