import React, { useState, useMemo } from 'react';
import { Teacher, Student, SyncConfig, RolePermissionsConfig, FeaturePermissions } from '../types';
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  Database,
  School,
  Save,
  Check,
  Lock,
  Eye,
  EyeOff,
  Cloud,
  FileSpreadsheet,
  ToggleRight,
  ToggleLeft
} from 'lucide-react';

interface AdminPanelProps {
  teachers: Teacher[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  students: Student[];
  config: SyncConfig;
  onUpdateConfig: (config: SyncConfig) => void;
  rolePermissions: RolePermissionsConfig;
  onUpdateRolePermissions: (perms: RolePermissionsConfig) => void;
  currentUser?: { role: string; name: string };
}

type AccountRole = 'ARP' | 'SERP' | 'MANAGER' | 'ACADEMIC_COORDINATOR' | 'COMMUNITY_MEMBER' | 'WELLNESS' | 'SPORT';

export default function AdminPanel({
  teachers,
  onUpdateTeachers,
  students,
  config,
  onUpdateConfig,
  rolePermissions,
  onUpdateRolePermissions,
  currentUser
}: AdminPanelProps) {
  const isAdmin = currentUser?.role === 'admin';

  // Config URL states
  const [sheetsUrlInput, setSheetsUrlInput] = useState(config.appsScriptUrl || '');
  const [oneDriveUrlInput, setOneDriveUrlInput] = useState(config.oneDriveUrl || '');
  const [syncTarget, setSyncTarget] = useState<'sheets' | 'onedrive' | 'both'>(config.syncTarget || 'sheets');
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(config.isAutoSyncEnabled);
  const [configSaved, setConfigSaved] = useState(false);

  // Editing state for Teacher list selection
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // New/Edit Teacher States
  const [tName, setTName] = useState('');
  const [tId, setTId] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tSelectedSchools, setTSelectedSchools] = useState<string[]>([]);
  const [allowAllSchools, setAllowAllSchools] = useState(true);
  const [showTeacherPassWord, setShowTeacherPassword] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // Role selection for account creation/editing
  const [accountRole, setAccountRole] = useState<AccountRole>('ARP');

  // Deleting teacher confirmation state
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);

  // Role Filter for accounts list
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Role permissions config states
  const [selectedConfigRole, setSelectedConfigRole] = useState<keyof RolePermissionsConfig>('teacher');

  const handleTogglePermission = (feature: keyof FeaturePermissions) => {
    onUpdateRolePermissions({
      ...rolePermissions,
      [selectedConfigRole]: {
        ...rolePermissions[selectedConfigRole],
        [feature]: !rolePermissions[selectedConfigRole][feature]
      }
    });
  };

  const roleDisplayName = (role: keyof RolePermissionsConfig) => {
    switch (role) {
      case 'admin': return 'Admin (अॅडमिन)';
      case 'manager': return 'Manager (मॅनेजर)';
      case 'academic_coordinator': return 'Academic Coordinator (शैक्षणिक समन्वयक)';
      case 'community_member': return 'Community Mentor (समुदाय मेंटॉर)';
      case 'teacher': return 'Teacher - General (सामान्य शिक्षक)';
      case 'teacher_arp': return 'Teacher - ARP (एआरपी शिक्षक)';
      case 'teacher_serp': return 'Teacher - SERP (एसईआरपी शिक्षक)';
      case 'teacher_wellness': return 'Teacher - Wellness (वेलनेस शिक्षक)';
      case 'teacher_sport': return 'Teacher - Sport (स्पोर्ट शिक्षक)';
    }
  };

  // Filtered accounts list
  const filteredTeachers = useMemo(() => {
    if (filterRole === 'ALL') return teachers;
    return teachers.filter(teacher => {
      const role = teacher.role || 'teacher';
      const type = teacher.types?.[0] || 'ARP';
      
      if (filterRole === 'MANAGER') return role === 'manager';
      if (filterRole === 'ACADEMIC_COORDINATOR') return role === 'academic_coordinator';
      if (filterRole === 'COMMUNITY_MEMBER') return role === 'community_member';
      if (filterRole === 'ARP') return role === 'teacher' && type === 'ARP';
      if (filterRole === 'SERP') return role === 'teacher' && type === 'SERP';
      if (filterRole === 'WELLNESS') return role === 'teacher' && (type === 'Wellness' || type === 'WELLNESS');
      if (filterRole === 'SPORT') return role === 'teacher' && (type === 'Sport' || type === 'SPORT');
      return true;
    });
  }, [teachers, filterRole]);

  // Find unique schools dynamically
  const availableSchools = useMemo(() => {
    const schoolsSet = new Set<string>();
    students.forEach(s => {
      if (s.school) schoolsSet.add(s.school);
    });
    return Array.from(schoolsSet).sort();
  }, [students]);

  const handleToggleSchoolSelection = (sch: string) => {
    if (allowAllSchools) {
      setAllowAllSchools(false);
    }
    setTSelectedSchools(prev => 
      prev.includes(sch) ? prev.filter(x => x !== sch) : [...prev, sch]
    );
  };

  const handleEditTeacherClick = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setTName(teacher.name);
    setTId(teacher.id);
    setTPassword(teacher.password || '');
    setTSelectedSchools(teacher.allowedSchools || []);
    setAllowAllSchools(!teacher.allowedSchools || teacher.allowedSchools.length === 0);
    
    let derivedRole: AccountRole = 'ARP';
    if (teacher.role === 'manager') derivedRole = 'MANAGER';
    else if (teacher.role === 'academic_coordinator') derivedRole = 'ACADEMIC_COORDINATOR';
    else if (teacher.role === 'community_member') derivedRole = 'COMMUNITY_MEMBER';
    else if (teacher.types?.includes('SERP')) derivedRole = 'SERP';
    else if (teacher.types?.includes('Wellness') || teacher.types?.includes('WELLNESS')) derivedRole = 'WELLNESS';
    else if (teacher.types?.includes('Sport') || teacher.types?.includes('SPORT')) derivedRole = 'SPORT';
    
    setAccountRole(derivedRole);
    setErrorText(null);
    setSuccessText(null);
  };

  const handleCancelEdit = () => {
    setEditingTeacherId(null);
    setTName('');
    setTId('');
    setTPassword('');
    setTSelectedSchools([]);
    setAllowAllSchools(true);
    setAccountRole('ARP');
    setErrorText(null);
    setSuccessText(null);
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanId = tId.trim();
    const cleanName = tName.trim();
    const cleanPass = tPassword;

    if (!cleanId || !cleanName || !cleanPass) {
      setErrorText('कृपया नाव, आयडी आणि पासवर्ड भरणे आवश्यक आहे!');
      return;
    }

    const restrictedIds = ['samir23', 'admin12', 'manager12', 'coordinator12', 'community12'];
    if (restrictedIds.includes(cleanId.toLowerCase())) {
      setErrorText('You cannot create a teacher with a reserved role ID!');
      return;
    }

    // Check duplicate ID excluding the current one undergoing edit
    const duplicate = teachers.find(
      t => t.id.toLowerCase() === cleanId.toLowerCase() && t.id.toLowerCase() !== editingTeacherId?.toLowerCase()
    );
    if (duplicate) {
      setErrorText(`"${cleanId}" हा युझर आयडी आधीपासूनच अस्तित्वात आहे! कृपया दुसरा निवडा.`);
      return;
    }

    // Schools mapping
    const finalSchools = allowAllSchools ? [] : tSelectedSchools;
    if (!allowAllSchools && finalSchools.length === 0) {
      setErrorText('कृपया शिक्षकासाठी किमान एक शाळा निवडा किंवा "सर्व शाळा" सक्षम करा!');
      return;
    }

    // Define role and type based on selection
    let newRole: 'manager' | 'teacher' | 'academic_coordinator' | 'community_member' = 'teacher';
    let newTypes: string[] = [];

    if (accountRole === 'MANAGER') {
      newRole = 'manager';
      newTypes = ['MANAGER'];
    } else if (accountRole === 'ACADEMIC_COORDINATOR') {
      newRole = 'academic_coordinator';
      newTypes = ['ACADEMIC COORDINATOR'];
    } else if (accountRole === 'COMMUNITY_MEMBER') {
      newRole = 'community_member';
      newTypes = ['COMMUNITY MENTOR'];
    } else if (accountRole === 'SERP') {
      newRole = 'teacher';
      newTypes = ['SERP'];
    } else if (accountRole === 'WELLNESS') {
      newRole = 'teacher';
      newTypes = ['Wellness'];
    } else if (accountRole === 'SPORT') {
      newRole = 'teacher';
      newTypes = ['Sport'];
    } else {
      newRole = 'teacher';
      newTypes = ['ARP'];
    }

    if (editingTeacherId) {
      // Edit Update mode
      const updated = teachers.map(t => {
        if (t.id.toLowerCase() === editingTeacherId.toLowerCase()) {
          return {
            id: cleanId,
            name: cleanName,
            password: cleanPass,
            role: newRole,
            allowedSchools: finalSchools,
            types: newTypes
          };
        }
        return t;
      });
      onUpdateTeachers(updated);
      setSuccessText('शिक्षक किंवा युजर माहिती यशस्वीरीत्या सुधारली आहे!');
      handleCancelEdit();
    } else {
      // Normal Create mode
      const newTeacher: Teacher = {
        id: cleanId,
        name: cleanName,
        password: cleanPass,
        role: newRole,
        allowedSchools: finalSchools,
        types: newTypes
      };

      onUpdateTeachers([...teachers, newTeacher]);
      
      // Clear state
      setTName('');
      setTId('');
      setTPassword('');
      setTSelectedSchools([]);
      setAllowAllSchools(true);
      setAccountRole('ARP');
      setSuccessText('नवीन खाते यशस्वीरीत्या तयार केले आहे!');
    }
  };

  const handleDeleteTeacher = (teacherIdToRem: string) => {
    const updated = teachers.filter(t => t.id !== teacherIdToRem);
    onUpdateTeachers(updated);
    if (editingTeacherId === teacherIdToRem) {
      handleCancelEdit();
    }
    setSuccessText('शिक्षक खाते यशस्वीरीत्या हटवले आहे!');
  };

  const handleSaveConfig = () => {
    const updated: SyncConfig = {
      ...config,
      appsScriptUrl: sheetsUrlInput.trim(),
      oneDriveUrl: oneDriveUrlInput.trim(),
      syncTarget: syncTarget,
      isAutoSyncEnabled: isAutoSyncEnabled
    };
    onUpdateConfig(updated);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header Description */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-indigo-600 font-extrabold text-[10px] tracking-widest text-indigo-100 uppercase px-3 py-1 rounded-full border border-indigo-500">
              👑 ॲडमिन पॅनेल (Admin Console)
            </span>
            <h1 className="text-xl md:text-2xl font-black mt-2">ॲडमिन प्रशासन व सुरक्षा नियंत्रण</h1>
            <p className="text-xs text-indigo-200">शिक्षकांची खाती तयार करा, त्यांच्या शाळांचे अधिकार निश्चित करा आणि क्लाउड सिंक URL नियंत्रित करा.</p>
          </div>
          <div className="flex items-center gap-2 bg-black/20 p-3 rounded-2xl border border-white/5 self-start md:self-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-[10px] uppercase font-bold text-slate-300">
              लॉगिन: <span className="text-white font-mono">Samir23</span> (ॲडमिन)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Create Actions and Settings Forms (Col-span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Form to Create/Edit Teacher Account */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Users className="w-5 h-5 text-violet-500" />
              {editingTeacherId ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  शिक्षक माहिती बदला (Editing: <span className="text-indigo-600 underline font-extrabold">{tName}</span>)
                </span>
              ) : (
                'शिक्षक खाते तयार करा (Create Teacher ID)'
              )}
            </h2>

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              {/* Account type selection */}
              <div className="space-y-1.5 max-w-sm relative">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  💡 खात्याचा प्रकार निवडा (Select Account Role):
                </span>
                <select
                  value={accountRole}
                  onChange={(e) => setAccountRole(e.target.value as AccountRole)}
                  className="w-full text-xs font-black border border-slate-200 bg-slate-50 hover:bg-slate-100/80 rounded-xl px-4 py-2.5 outline-none transition-all cursor-pointer shadow-xs"
                >
                  <option value="ARP">Teacher - ARP</option>
                  <option value="SERP">Teacher - SERP</option>
                  <option value="WELLNESS">Teacher - Wellness (वॅलनेस)</option>
                  <option value="SPORT">Teacher - Sport (स्पोर्ट)</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
                  <option value="COMMUNITY_MEMBER">Community Mentor</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teacher Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">शिक्षकाचे नाव (Teacher Name):</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. अरुण सावंत (Arun Sawant)"
                    value={tName}
                    onChange={e => setTName(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Login ID */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">लॉगिन आयडी (User Login ID):</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. arun_sir (Unique login id)"
                    value={tId}
                    onChange={e => setTId(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Box */}
              <div className="space-y-1 max-w-md">
                <label className="text-xs font-semibold text-slate-500">पासवर्ड (Login Password):</label>
                <div className="relative">
                  <input
                    type={showTeacherPassWord ? 'text' : 'password'}
                    required
                    placeholder="उदा. Arun@789"
                    value={tPassword}
                    onChange={e => setTPassword(e.target.value)}
                    className="w-full text-xs font-bold font-mono border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTeacherPassword(!showTeacherPassWord)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showTeacherPassWord ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* School Permissions Mapping */}
              <div className="space-y-2 border-t border-dashed border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <School className="w-4 h-4 text-indigo-500" />
                    अनुमत असणाऱ्या शाळा (Allowed Schools List):
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setAllowAllSchools(!allowAllSchools);
                      if (!allowAllSchools) setTSelectedSchools([]);
                    }}
                    className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all border ${
                      allowAllSchools 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {allowAllSchools ? '✓ सर्व शाळा अधिकृत (All Schools Allowed)' : 'शाळा निवडा (Limit Specific Schools)'}
                  </button>
                </div>

                {!allowAllSchools && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/50 space-y-2 max-h-40 overflow-y-auto">
                    {availableSchools.length === 0 ? (
                      <div className="text-[10px] text-slate-400 font-bold p-1">कोणतीही उपलब्ध शाळा आढळली नाही. आधी विद्यार्थी डेटा जोडा.</div>
                    ) : (
                      availableSchools.map(sch => {
                        const isChecked = tSelectedSchools.includes(sch);
                        return (
                          <label key={sch} className="flex items-start gap-2 px-1.5 py-1 hover:bg-white rounded-lg transition-all cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSchoolSelection(sch)}
                              className="w-3.5 h-3.5 mt-0.5 accent-violet-600 rounded cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-600">{sch}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-0.5">Note: "सर्व शाळा अधिकृत" ठेवल्यास, शिक्षक उपलब्ध असणाऱ्या सर्व शाळांची हजेरी घेऊ शकतात.</div>
              </div>

              {/* Status Alert Panels */}
              {errorText && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100">
                  ⚠️ {errorText}
                </div>
              )}
              {successText && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 animate-fade-in">
                  🎉 {successText}
                </div>
              )}

              {/* Submit & Cancel Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editingTeacherId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingTeacherId ? 'बदल जतन करा (Save Changes)' : 'नवीन शिक्षक साठवा (Save Teacher ID)'}
                </button>
                {editingTeacherId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-2.5 bg-slate-105 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer border border-slate-200"
                  >
                    रद्द करा (Cancel)
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Sync config control section */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Cloud className="w-5 h-5 text-indigo-500" />
              क्लाउड सिंक सेटिंग्ज (Cloud Sync Setup Control)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">OneDrive पत्ता (URL) आणि Google Sheets ॲप स्क्रिप्ट (URL) पत्ता बदलणे ॲडमिन द्वारे सुरक्षित केले गेले आहे.</p>

            <div className="space-y-4 pt-1">
              {/* Google sheet field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  Google Sheet Apps Script URL:
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetsUrlInput}
                  onChange={e => setSheetsUrlInput(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                />
              </div>

              {/* OneDrive field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Database className="w-4 h-4 text-sky-500" />
                  OneDrive Excel Webhook / Flow URL:
                </label>
                <input
                  type="url"
                  placeholder="https://prod-31.westus.logic.azure.com:443/workflows/..."
                  value={oneDriveUrlInput}
                  onChange={e => setOneDriveUrlInput(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mode switch */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">सिंक्रोनाइझेशनचे लक्ष्य (Sync Target):</label>
                  <select
                    value={syncTarget}
                    onChange={e => setSyncTarget(e.target.value as any)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white outline-none transition-all cursor-pointer"
                  >
                    <option value="sheets">फक्त Google Sheet (Google Sheet Only)</option>
                    <option value="onedrive">फक्त Microsoft OneDrive (OneDrive Only)</option>
                    <option value="both">दोन्ही एकाच वेळी (Both Sheets and OneDrive)</option>
                  </select>
                </div>

                {/* Auto sync check */}
                <div className="flex items-center gap-2.5 pt-6 select-none cursor-pointer">
                  <input
                    id="auto-sync"
                    type="checkbox"
                    checked={isAutoSyncEnabled}
                    onChange={e => setIsAutoSyncEnabled(e.target.checked)}
                    className="w-4 h-4 border border-slate-300 rounded accent-violet-600 cursor-pointer"
                  />
                  <label htmlFor="auto-sync" className="text-xs font-bold text-slate-700 cursor-pointer">
                    हजेरी घेताच त्वरित स्वयंचलित सिंक करा (Auto Sync)
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  बॅकअप पत्ते साठवा (Save Sync Settings)
                </button>
                {configSaved && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                    <Check className="w-4 h-4" /> सेटिंग्ज जतन केली गेली!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feature Access Permissions Control Section */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-rose-500" />
              खातेनुसार प्रवेश नियंत्रण (Account Feature Permissions)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">कोणत्या लॉगिनला ॲपमधील कोणती माहिती दिसेल किंवा कोणती कामे करता येतील हे तुम्ही इथून ठरवू शकता.</p>

            <div className="my-3">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-2">
                खात्याचा प्रकार निवडा (Select Role):
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {([
                  'admin',
                  'manager',
                  'academic_coordinator',
                  'community_member',
                  'teacher',
                  'teacher_arp',
                  'teacher_serp',
                  'teacher_wellness',
                  'teacher_sport'
                ] as Array<keyof RolePermissionsConfig>).map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedConfigRole(role)}
                    className={`py-2 px-3 text-left w-full rounded-xl text-[10px] font-black transition-all border ${
                      selectedConfigRole === role
                        ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {roleDisplayName(role)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 mt-2">
              <h3 className="text-[11px] font-black tracking-widest uppercase text-slate-600 mb-2">{roleDisplayName(selectedConfigRole)} चे अधिकार:</h3>
              
              {/* Login types note */}
              <div className="mb-4 bg-white/60 p-2.5 rounded-xl border border-slate-200/50 text-[10px] font-bold text-slate-500 leading-relaxed space-y-1">
                <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-extrabold mb-0.5">लागू असलेले लॉगइन प्रकार (Associated Login Types):</span>
                {selectedConfigRole === 'teacher' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Other General Teachers (इतर सर्व सामान्य शिक्षक)</span>
                  </div>
                )}
                {selectedConfigRole === 'teacher_arp' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Teacher - ARP (एआरपी शिक्षक)</span>
                  </div>
                )}
                {selectedConfigRole === 'teacher_serp' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Teacher - SERP (एसईआरपी शिक्षक)</span>
                  </div>
                )}
                {selectedConfigRole === 'teacher_wellness' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Teacher - Wellness (वेलनेस शिक्षक)</span>
                  </div>
                )}
                {selectedConfigRole === 'teacher_sport' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Teacher - Sport (स्पोर्ट शिक्षक)</span>
                  </div>
                )}
                {selectedConfigRole === 'community_member' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Community Mentor (समुदाय मार्गदर्शक / मेंटॉर)</span>
                  </div>
                )}
                {selectedConfigRole === 'manager' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Manager (मॅनेजर)</span>
                  </div>
                )}
                {selectedConfigRole === 'academic_coordinator' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Academic Coordinator (शैक्षणिक समन्वयक)</span>
                  </div>
                )}
                {selectedConfigRole === 'admin' && (
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">Admin (अॅडमिन)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                
                {[
                  { key: 'dashboard', label: 'डॅशबोर्ड (Dashboard)' },
                  { key: 'students', label: 'विद्यार्थी यादी व माहिती (Students Info)' },
                  { key: 'take_attendance', label: 'हजेरी घेणे (Take Attendance)' },
                  { key: 'tasks', label: 'भेट कार्य (View/Complete Tasks)' },
                  { key: 'create_task', label: 'नवीन कार्य तयार करणे (Create Tasks)' },
                  { key: 'observe', label: 'निरीक्षण व विश्लेषण (Observe Panel)' },
                  { key: 'cloud_sync', label: 'क्लाउड सिंक (Cloud Sync Status)' },
                  { key: 'android_app', label: 'अँड्रॉइड ॲप माहिती (App Builder Info)' },
                  { key: 'admin_panel', label: 'प्रशासन (Admin Settings)' },
                ].map(({ key, label }) => {
                  const permissionKey = key as keyof FeaturePermissions;
                  const isEnabled = rolePermissions[selectedConfigRole][permissionKey];
                  const isDisabledForAdmin = selectedConfigRole === 'admin'; // Admin should ideally have all

                  return (
                    <div key={key} className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isEnabled ? 'bg-emerald-50/50' : 'bg-transparent hover:bg-slate-50'} border border-transparent`}>
                      <span className="text-xs font-bold text-slate-700">{label}</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(permissionKey)}
                        disabled={isDisabledForAdmin && isEnabled} // Prevent accidental admin lockout
                        className={`transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 ${isEnabled ? 'text-emerald-500 hover:text-emerald-600 focus:ring-emerald-500' : 'text-slate-300 hover:text-slate-400 focus:ring-slate-300'} ${isDisabledForAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                         {isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-4 px-2">टीप: अॅडमिन लॉगिन ला एडिट किंवा डिलीट करण्याचे सर्व अधिकार कायम राहतील. इतर लॉगिन ला कोणताही डेटा मुख्यत्वे डिलीट करण्याची परवानगी नाही.</p>
            </div>
          </div>

        </div>

        {/* Right Side: Display Teacher list (Col-span 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm min-h-[350px] flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3 mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    सध्याचे शिक्षक युजर्स ({filteredTeachers.length})
                  </h2>
                  <span className="text-[10px] font-extrabold text-slate-400">एकूण: {teachers.length}</span>
                </div>

                {/* Filter section with select dropdown */}
                <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between gap-3 border border-slate-200/50">
                  <span className="text-[10px] font-bold text-slate-500">खाते फिल्टर (Role Filter):</span>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="flex-1 text-[10px] font-black border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white cursor-pointer"
                  >
                    <option value="ALL">सर्व (All)</option>
                    <option value="ARP">Teacher - ARP</option>
                    <option value="SERP">Teacher - SERP</option>
                    <option value="WELLNESS">Teacher - Wellness</option>
                    <option value="SPORT">Teacher - Sport</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
                    <option value="COMMUNITY_MEMBER">Community Mentor</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredTeachers.length === 0 ? (
                   <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center px-4">
                     <Users className="w-8 h-8 text-slate-300 mb-2" />
                     <span className="text-xs font-bold text-slate-400">निवडलेल्या प्रकारची खाती आढळली नाहीत! (No accounts found)</span>
                     <p className="text-[10px] text-slate-400 mt-1">फिल्टर बदला किंवा नवीन खाते तयार करा.</p>
                   </div>
                ) : (
                  filteredTeachers.map(teacher => (
                    <div
                      key={teacher.id}
                      className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl hover:border-violet-100 hover:bg-violet-50/10 transition-all flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          {/* Editable Name Link with Type Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleEditTeacherClick(teacher)}
                                className="text-xs font-black text-slate-800 hover:text-indigo-600 text-left flex items-center gap-1.5 cursor-pointer group"
                                title="शिक्षक माहिती बदलण्यासाठी नाव क्लिक करा (Click to Edit)"
                              >
                                👤 {teacher.name}
                              </button>
                            ) : (
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                👤 {teacher.name}
                              </span>
                            )}
                            
                            <div className="flex gap-1 flex-wrap">
                              <span className="bg-violet-100 text-violet-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-violet-200/60 uppercase">
                                {teacher.role === 'manager' && 'Manager'}
                                {teacher.role === 'admin' && 'Admin'}
                                {teacher.role === 'academic_coordinator' && 'Academic Coordinator'}
                                {teacher.role === 'community_member' && 'Community Mentor'}
                                {(!teacher.role || teacher.role === 'teacher') && `Teacher - ${teacher.types?.[0] || 'ARP'}`}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-slate-505 text-slate-550 text-slate-500 font-mono flex flex-wrap items-center gap-1.5 leading-relaxed">
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold font-sans">ID: {teacher.id}</span>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Pass: {teacher.password}</span>
                          </div>
                        </div>

                        {/* Delete inline confirm / trigger button */}
                        {isAdmin && (
                          deletingTeacherId === teacher.id ? (
                            <div className="flex items-center gap-1.5 animate-fade-in shrink-0 bg-rose-50 p-1.5 rounded-xl border border-rose-100">
                              <button
                                onClick={() => {
                                  handleDeleteTeacher(teacher.id);
                                  setDeletingTeacherId(null);
                                }}
                                type="button"
                                className="px-2 py-1 text-[9px] font-black bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                नक्की (Confirm)
                              </button>
                              <button
                                onClick={() => setDeletingTeacherId(null)}
                                type="button"
                                className="px-2 py-1 text-[9px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              >
                                नको (Cancel)
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingTeacherId(teacher.id)}
                              type="button"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="शिक्षक खाते डिलीट करा"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>

                      {/* Schools preview inside teachers box */}
                      <div className="border-t border-slate-200/50 pt-2 flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide mr-1 mt-0.5">अधिकार: </span>
                        {(!teacher.allowedSchools || teacher.allowedSchools.length === 0) ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            सर्व शाळा अधिकृत ☑
                          </span>
                        ) : (
                          teacher.allowedSchools.map(s => (
                            <span key={s} className="bg-indigo-50 border border-indigo-100/30 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-md truncate max-w-[150px]" title={s}>
                              🏫 {s}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Admin safety note */}
            <div className="mt-8 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-start gap-2.5 text-[10px] text-slate-500 leading-normal">
              <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700">सुरक्षा चेतावणी:</span> ॲडमिन कडे सर्व अधिकार सुरक्षित असतात. कृपया शिक्षकांचे पासवर्ड सुरक्षित ठिकाणी नोंदवून ठेवा. चुकीचा पासवर्ड सलग टाकल्यास सुरक्षा सिस्टीम लॉक लागू शकतो.
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
