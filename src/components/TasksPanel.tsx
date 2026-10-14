import React, { useState, useMemo } from 'react';
import { InterventionTask, UserSession, AttendanceRecord } from '../types';
import { AdminAuthorityBadge } from './AdminAuthorityBadge';
import { 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  AlertCircle, 
  Check, 
  X, 
  HelpCircle,
  MessageSquare,
  FileText,
  Trash2
} from 'lucide-react';

interface TasksPanelProps {
  tasks: InterventionTask[];
  onUpdateTask: (task: InterventionTask) => void;
  onDeleteTask?: (taskId: string) => void;
  currentUser: UserSession | null;
  records: AttendanceRecord[];
}

export default function TasksPanel({ tasks, onUpdateTask, onDeleteTask, currentUser, records }: TasksPanelProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Action Modal States
  const [selectedTask, setSelectedTask] = useState<InterventionTask | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [noClicked, setNoClicked] = useState(false);
  const [unsuccessfulReasonText, setUnsuccessfulReasonText] = useState('');
  
  // Custom Delete Modal State
  const [taskToDelete, setTaskToDelete] = useState<{ id: string, name: string } | null>(null);

  // Access rights check
  const isAdmin = currentUser?.role === 'admin';
  const isCommunityMember = currentUser?.role === 'community_member';
  const hasFullAccess = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'academic_coordinator';
  const canPerformAction = hasFullAccess || isCommunityMember;

  // Dynamically fetch actual returning present date for active_task
  const getStudentAttendanceReturnDate = (task: InterventionTask) => {
    const visitDateStr = task.visitDate || task.homeVisitDate;
    if (!visitDateStr) return null;

    // Find earliest record with 'Present' state on or after home visit date
    const returnRecord = records
      .filter(r => r.studentId === task.studentId && r.status === 'Present' && r.date >= visitDateStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    return returnRecord ? returnRecord.date : null;
  };

  // Organize Tasks into categories incorporating live return stats
  const pendingTasksList = useMemo(() => {
    return tasks.filter(t => {
      // Must be pending and match query
      const isPending = t.status === 'pending';
      const matchesSearch = t.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      return isPending && matchesSearch;
    });
  }, [tasks, searchQuery]);

  const activeTasksList = useMemo(() => {
    return tasks.filter(t => {
      // Must be active and not yet returned/resolved
      const isHomeVisitDone = t.status === 'home_visit_done';
      const isCustomActive = t.status === 'active_task';
      const hasMatchedPresent = getStudentAttendanceReturnDate(t) !== null;
      
      const matchesSearch = t.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // If it has matched present record, it will automatically move to 'completed'!
      return (isCustomActive || isHomeVisitDone) && !hasMatchedPresent && matchesSearch;
    });
  }, [tasks, records, searchQuery]);

  const completedTasksList = useMemo(() => {
    return tasks.filter(t => {
      const isCompleted = t.status === 'completed';
      const isUnsuccessful = t.status === 'unsuccessful';
      const isSuccessful = t.status === 'successful';
      
      // Active states that are promoted to Successful due to present attendance
      const isCustomActive = t.status === 'active_task';
      const isHomeVisitDone = t.status === 'home_visit_done';
      const hasMatchedPresent = getStudentAttendanceReturnDate(t) !== null;
      
      const matchesSearch = t.studentName.toLowerCase().includes(searchQuery.toLowerCase());

      return (isCompleted || isUnsuccessful || isSuccessful || ((isCustomActive || isHomeVisitDone) && hasMatchedPresent)) && matchesSearch;
    });
  }, [tasks, records, searchQuery]);

  // Click handler to open the action dialog
  const handleStudentNameClick = (task: InterventionTask) => {
    if (!isCommunityMember) {
      alert("फक्त कम्युनिटी मेंटॉर (Community Mentor) या कामाची नोंद (Active Task) करू शकतात!");
      return;
    }
    setSelectedTask(task);
    setNoClicked(false);
    setUnsuccessfulReasonText('');
    setShowActionDialog(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, taskId: string, studentName: string) => {
    e.stopPropagation(); // Avoid opening the dialog
    setTaskToDelete({ id: taskId, name: studentName });
  };
  
  const handleConfirmDelete = () => {
    if (taskToDelete) {
      onDeleteTask?.(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  // YES Flow Handler
  const handleYesAction = () => {
    if (!selectedTask) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = {
      ...selectedTask,
      status: 'active_task' as const,
      visitResult: 'yes' as const,
      visitDate: todayStr,
      homeVisitDate: todayStr,
      homeVisitBy: currentUser?.name || 'Community Mentor'
    };

    onUpdateTask(updated);
    setShowActionDialog(false);
    setSelectedTask(null);
  };

  // NO Submission Handler
  const handleNoSubmit = () => {
    if (!selectedTask || !unsuccessfulReasonText.trim()) {
      alert("कृपया गैरहजर राहण्याचे कारण नमूद करा!");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const updated = {
      ...selectedTask,
      status: 'unsuccessful' as const,
      visitResult: 'no' as const,
      visitDate: todayStr,
      homeVisitDate: todayStr,
      unsuccessfulReason: unsuccessfulReasonText.trim(),
      homeVisitNotes: unsuccessfulReasonText.trim(),
      homeVisitBy: currentUser?.name || 'Community Mentor'
    };

    onUpdateTask(updated);
    setShowActionDialog(false);
    setSelectedTask(null);
  };

  // Card Rendering Helper
  const renderTaskCard = (task: InterventionTask) => {
    const isUnsuccessful = task.status === 'unsuccessful';
    const presentReturnDate = getStudentAttendanceReturnDate(task);
    const isSuccessful = task.status === 'successful' || task.status === 'completed' || (presentReturnDate !== null && (task.status === 'active_task' || task.status === 'home_visit_done'));

    // Dynamic Colors and styling based on result condition
    if (isSuccessful) {
      // Light Green complete box of Successful returns (Item 6)
      return (
        <div key={task.id} className="bg-emerald-50/60 border border-emerald-250 p-5 rounded-2xl shadow-sm space-y-3 transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                👨‍🎓 {task.studentName}
              </h4>
              <p className="text-xs text-emerald-700/85 font-semibold mt-0.5">
                🏢 {task.school} • इ. {task.std} तुकडी {task.div}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xs uppercase flex items-center gap-1 select-none">
                <Check className="w-3.5 h-3.5" />
                SUCCESSFUL
              </div>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={(e) => handleDeleteClick(e, task.id, task.studentName)}
                  className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg border border-rose-100 cursor-pointer"
                  title="टास्क डिलीट करा"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-2 font-medium">
             <div className="flex justify-between items-center border-b border-emerald-100/30 pb-1.5 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">📅 घरभेट दिनांक (Yes Date):</span>
                <span className="font-extrabold text-emerald-950">{task.visitDate || task.homeVisitDate || task.dateCreated}</span>
             </div>
             <div className="flex justify-between items-center text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">🏫 पुनरागमन दिनांक (Present Date):</span>
                <span className="font-extrabold text-emerald-950">{presentReturnDate || task.schoolReturnDate || task.completedDate || 'नुकतीच हजेरी'}</span>
             </div>
          </div>
        </div>
      );
    }

    if (isUnsuccessful) {
      // Light Red/Pink complete box of Unsuccessful visits (Item 5)
      return (
        <div key={task.id} className="bg-rose-50/60 border border-rose-250 p-5 rounded-2xl shadow-sm space-y-3 transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="text-sm font-black text-rose-950 flex items-center gap-1.5">
                👨‍🎓 {task.studentName}
              </h4>
              <p className="text-xs text-rose-700/85 font-semibold mt-0.5">
                🏢 {task.school} • इ. {task.std} तुकडी {task.div}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xs uppercase flex items-center gap-1 select-none">
                <X className="w-3.5 h-3.5" />
                Unsuccessful
              </div>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={(e) => handleDeleteClick(e, task.id, task.studentName)}
                  className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg border border-rose-100 cursor-pointer"
                  title="टास्क डिलीट करा"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-rose-100 text-xs text-rose-800 space-y-2 font-medium">
             <div className="flex justify-between items-center border-b border-rose-100/35 pb-1.5 text-[11px]">
                <span className="text-rose-700 font-bold">📅 भेट तारीख (Visit Date):</span>
                <span className="font-extrabold text-rose-950">{task.visitDate || task.homeVisitDate || task.dateCreated}</span>
             </div>
             <div className="text-[11px] pt-1 leading-relaxed">
                <span className="block text-rose-700 font-bold mb-1">💬 शाळेत न येण्याचे कारण (Unsuccessful Reason):</span>
                <p className="font-extrabold text-rose-900 bg-rose-50/70 p-2.5 rounded-lg border border-rose-100/80 italic">
                  "{task.unsuccessfulReason || task.homeVisitNotes || 'कारण नमूद केलेले नाही'}"
                </p>
             </div>
          </div>
        </div>
      );
    }

    // Default Pending or Active Task cards
    const isActiveTask = task.status === 'active_task' || task.status === 'home_visit_done';
    
    return (
      <div 
        key={task.id} 
        className={`bg-white rounded-2xl p-5 border shadow-sm space-y-4 transition-all hover:border-slate-350 ${(!isActiveTask && !isCommunityMember) ? 'cursor-default' : 'cursor-pointer'} ${isActiveTask ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'}`}
        onClick={(e) => {
          // Prevent dialog opening if clicking the delete button
          const target = e.target as HTMLElement;
          if (target.closest('button')) {
            return;
          }
          if (!isActiveTask) {
             handleStudentNameClick(task);
          }
        }}
      >
        <div className="flex justify-between items-start gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-800 hover:text-indigo-600 transition-colors">
              👨‍🎓 <span className="underline decoration-slate-300 decoration-dashed underline-offset-4">{task.studentName}</span>
            </h4>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              🏢 {task.school} • इ. {task.std} तुकडी {task.div}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isActiveTask ? (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xs uppercase flex items-center gap-1 shrink-0 animate-pulse select-none">
                <Clock className="w-3.5 h-3.5" />
                शाळेत येण्याची वाट पाहत आहे (Active Task)
              </span>
            ) : (
               <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xs uppercase flex items-center gap-1 shrink-0 select-none">
                <AlertCircle className="w-3.5 h-3.5" />
                भेट देणे आवश्यक (Pending Visit)
              </span>
            )}
            {!isActiveTask && currentUser?.role === 'admin' && (
              <button
                onClick={(e) => handleDeleteClick(e, task.id, task.studentName)}
                className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg border border-rose-100 cursor-pointer"
                title="टास्क डिलीट करा"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1 font-semibold">
          <div className="flex justify-between items-center">
             <span>📅 निर्मिती दिनांक (Task Created):</span>
             <span className="font-bold text-slate-800">{task.dateCreated}</span>
          </div>
          {isActiveTask && (
            <div className="flex justify-between items-center text-amber-700">
               <span>📅 घरभेट दिनांक (Yes Clicked):</span>
               <span className="font-extrabold">{task.visitDate || task.homeVisitDate} ({task.homeVisitBy})</span>
            </div>
          )}
        </div>

        {!isActiveTask && isCommunityMember && (
           <div className="pt-2 flex justify-end">
             <span className="text-[10px] font-extrabold bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-lg hover:bg-violet-100 block transition-colors">
               नोंदणी पूर्ण करण्यासाठी नावावर क्लिक करा ✍️
             </span>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 select-none">
      
      {/* Dynamic Header */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <h2 className="text-xl font-black flex items-center gap-2 relative z-10">
           <MapPin className="w-6 h-6 text-amber-500" /> 
           घरभेट व अंमलबजावणी (Intervention Tasks)
        </h2>
        <AdminAuthorityBadge
          itemId="section_tasks_panel"
          title="Tasks Panel Section"
          marathiTitle="टास्क व्यवस्थापन विभाग"
          category="section"
          module="attendance"
          position="inline"
          className="relative z-10"
        />
      </div>

      {/* Tabs list with counts & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex p-1 bg-slate-200/60 rounded-2xl w-full md:w-auto items-center">
            <div className="relative flex items-center flex-1 md:flex-initial">
              <button
                 onClick={() => setActiveTab('pending')}
                 className={`w-full md:px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                   activeTab === 'pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                 }`}
              >
                 भेट द्यायची यादी ({pendingTasksList.length})
              </button>
              <AdminAuthorityBadge
                itemId="tab_tasks_pending"
                title="Pending Visits Tab"
                marathiTitle="भेट द्यायची यादी टॅब"
                category="button"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>

            <div className="relative flex items-center flex-1 md:flex-initial ml-1">
              <button
                 onClick={() => setActiveTab('active')}
                 className={`w-full md:px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                   activeTab === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                 }`}
              >
                 सक्रिय टास्क (Active: {activeTasksList.length})
              </button>
              <AdminAuthorityBadge
                itemId="tab_tasks_active"
                title="Active Tasks Tab"
                marathiTitle="सक्रिय टास्क टॅब"
                category="button"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>

            <div className="relative flex items-center flex-1 md:flex-initial ml-1">
              <button
                 onClick={() => setActiveTab('completed')}
                 className={`w-full md:px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                   activeTab === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                 }`}
              >
                 पूर्ण झालेले कार्य ({completedTasksList.length})
              </button>
              <AdminAuthorityBadge
                itemId="tab_tasks_completed"
                title="Completed Tasks Tab"
                marathiTitle="पूर्ण झालेली कार्ये टॅब"
                category="button"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
         </div>

         {/* Search Input bar */}
         <div className="relative w-full md:w-64">
           <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
           <input 
             type="text" 
             placeholder="नाव शोधा..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-white border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-xs font-bold focus:border-violet-500 outline-none transition-all shadow-sm"
           />
         </div>
      </div>

      {/* Structured Action List Panel */}
      <div className="space-y-4">
         {activeTab === 'pending' && (
            pendingTasksList.length > 0 ? pendingTasksList.map(renderTaskCard) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-slate-800 font-black text-sm">प्रलंबित यादी कोरी आहे!</h3>
                <p className="text-slate-400 text-xs mt-1">सर्व विद्यार्थ्यांच्या घरभेतीचे काम उत्तमरित्या पूर्ण झाले आहे.</p>
              </div>
            )
         )}
         
         {activeTab === 'active' && (
            activeTasksList.length > 0 ? activeTasksList.map(renderTaskCard) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-bounce" />
                <h3 className="text-slate-800 font-black text-sm">कोणतेही ऍक्टिव्ह टास्क शिल्लक नाही</h3>
                <p className="text-slate-400 text-xs mt-1">सक्रिय असलेले विद्यार्थी शाळेत हजेरी नोंदवण्याची प्रतीक्षा करत आहेत.</p>
              </div>
            )
         )}

         {activeTab === 'completed' && (
            completedTasksList.length > 0 ? completedTasksList.map(renderTaskCard) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-800 font-black text-sm font-semibold">कोणताही टास्क अद्याप पूर्ण झालेला नाही</h3>
              </div>
            )
         )}
      </div>

      {/* Action Dialog (Yes/No selections and reason typing text input) */}
      {selectedTask && showActionDialog && (
         <div className="fixed inset-0 z-[100] bg-slate-900/60 p-4 flex items-center justify-center backdrop-blur-xs">
           <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in flex flex-col">
             
             {/* Header */}
             <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
                <div>
                   <h3 className="font-extrabold text-sm tracking-wide">घरभेट निर्णय प्रविष्टी (Home Visit Action)</h3>
                   <p className="text-[10px] text-slate-400 font-bold mt-0.5">विद्यार्थी: {selectedTask.studentName}</p>
                </div>
                <button onClick={() => setShowActionDialog(false)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded">
                  <X className="w-5 h-5" />
                </button>
             </div>

             {/* Content Area */}
             <div className="p-6 space-y-6">
                
                {/* 1. Show student meta */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                   <p className="text-[10px] font-bold text-slate-500 uppercase">शाळा आणि वर्ग (School Details)</p>
                   <p className="text-xs font-black text-slate-800 mt-1">🏢 {selectedTask.school} | {selectedTask.std}-{selectedTask.div}</p>
                </div>

                {!noClicked ? (
                  // YES NO Action Choice Buttons
                  <div className="space-y-4">
                     <p className="text-xs font-extrabold text-center text-slate-700">काऊन्सेलिंग नंतर विद्यार्थी पुन्हा शाळेत येणार आहे का?</p>
                     
                     <div className="grid grid-cols-2 gap-4">
                       {/* YES BUTTON (Item 4) */}
                       <button
                         onClick={handleYesAction}
                         className="flex flex-col items-center justify-center p-5 bg-emerald-50 border border-emerald-200 hover:border-emerald-350 hover:bg-emerald-100/70 text-emerald-800 rounded-2xl transition-all shadow-xs group"
                       >
                         <CheckCircle className="w-9 h-9 text-emerald-500 group-hover:scale-110 transition-transform mb-2" />
                         <span className="text-sm font-black">होय (Yes)</span>
                         <span className="text-[9px] font-semibold text-emerald-600 mt-0.5">शाळेत परत येईल</span>
                       </button>

                       {/* NO BUTTON (Item 5) */}
                       <button
                         onClick={() => setNoClicked(true)}
                         className="flex flex-col items-center justify-center p-5 bg-rose-50 border border-rose-200 hover:border-rose-350 hover:bg-rose-100/70 text-rose-800 rounded-2xl transition-all shadow-xs group"
                       >
                         <XCircle className="w-9 h-9 text-rose-500 group-hover:scale-110 transition-transform mb-2" />
                         <span className="text-sm font-black">नाही (No)</span>
                         <span className="text-[9px] font-semibold text-rose-600 mt-0.5">पुनरागमनास नकार</span>
                       </button>
                     </div>
                  </div>
                ) : (
                  // NO reason text area input screen (Item 5)
                  <div className="space-y-4 animate-fade-in">
                     <div className="flex justify-between items-center">
                       <label className="text-xs font-black text-rose-950 flex items-center gap-1">
                         <MessageSquare className="w-4 h-4 text-rose-500" />
                         शाळेत न येण्याचे कारण प्रविष्ट करा:
                       </label>
                       
                       <button onClick={() => setNoClicked(false)} className="text-[10px] font-bold text-slate-500 underline">
                         मागे जा (Go Back)
                       </button>
                     </div>

                     <textarea
                       className="w-full bg-slate-50 border border-rose-100 hover:border-rose-200 rounded-xl p-3.5 text-xs font-semibold focus:border-rose-500 focus:bg-white outline-none min-h-[110px] shadow-inner transition-colors"
                       placeholder="उदा. स्थलांतर, शेती कामात मदत, आर्थिक किंवा कौटुंबिक अडचणी इ. कारण नमूद करा..."
                       value={unsuccessfulReasonText}
                       onChange={e => setUnsuccessfulReasonText(e.target.value)}
                     />

                     <button
                       onClick={handleNoSubmit}
                       className="w-full py-3 bg-rose-500 text-white hover:bg-rose-600 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all"
                     >
                       <FileText className="w-4 h-4" />
                       नोंद अयशस्वी म्हणून सबमिट करा
                     </button>
                  </div>
                )}
             </div>

             {/* Footer Cancel bar */}
             <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end shrink-0">
               <button onClick={() => setShowActionDialog(false)} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 text-xs font-black rounded-lg">
                 बंद करा (Close)
               </button>
             </div>
           </div>
         </div>
      )}

      {/* Custom Delete Confirmation Dialog */}
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
                onClick={handleConfirmDelete}
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
    </div>
  );
}
