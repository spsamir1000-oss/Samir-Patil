import React, { useState, useMemo } from 'react';
import { Teacher, UserSession, AuthorityItem, AuthorityRoleOption, AuthorityCategory } from '../types';
import { 
  getAvailableRoles, 
  loadAuthorityItems, 
  saveAuthorityPermissions, 
  saveAllAuthorityItems,
  registerAuthorityItem,
  INITIAL_AUTHORITY_ITEMS 
} from '../lib/authorityManager';
import AuthorityPermissionModal from './AuthorityPermissionModal';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Pencil,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Plus,
  Layout,
  Grid,
  List,
  Layers,
  BarChart3,
  MousePointerClick,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ClipboardCheck,
  BookOpen,
  Boxes,
  Users,
  Settings,
  Info,
  Calendar,
  Download,
  AlertCircle
} from 'lucide-react';

interface AuthorityControlSectionProps {
  currentUser: UserSession | null;
  teachers: Teacher[];
}

export default function AuthorityControlSection({
  currentUser,
  teachers
}: AuthorityControlSectionProps) {
  const [items, setItems] = useState<AuthorityItem[]>(() => loadAuthorityItems());
  const [availableRoles, setAvailableRoles] = useState<AuthorityRoleOption[]>(() => getAvailableRoles(teachers));

  // Active view: 'simulator' (Live App Overlay) or 'catalog' (Master Directory Tree)
  const [viewMode, setViewMode] = useState<'simulator' | 'catalog'>('simulator');
  
  // Simulator active module & subview
  const [simModule, setSimModule] = useState<'attendance' | 'arp' | 'serp' | 'inventory'>('attendance');
  const [simPage, setSimPage] = useState<string>('dashboard');

  // Filter and search states in Catalog view
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuthorityCategory>('all');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'attendance' | 'arp' | 'serp' | 'inventory' | 'system'>('all');

  // Active editing modal state
  const [modalItem, setModalItem] = useState<AuthorityItem | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  // New element creation modal state
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [newElemId, setNewElemId] = useState('');
  const [newElemName, setNewElemName] = useState('');
  const [newElemMarathi, setNewElemMarathi] = useState('');
  const [newElemCategory, setNewElemCategory] = useState<AuthorityCategory>('button');
  const [newElemModule, setNewElemModule] = useState<'attendance' | 'arp' | 'serp' | 'inventory' | 'system'>('attendance');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenModal = (item: AuthorityItem, mode: 'view' | 'edit') => {
    setModalItem(item);
    setModalMode(mode);
  };

  const handleSaveModal = (updatedItem: AuthorityItem) => {
    saveAuthorityPermissions(updatedItem.id, {
      viewRoles: updatedItem.viewRoles,
      editRoles: updatedItem.editRoles
    });

    setItems(prev => prev.map(it => it.id === updatedItem.id ? updatedItem : it));
    showToast(`"${updatedItem.name}" चे ${modalMode === 'view' ? 'दृश्यता (View)' : 'संपादन (Edit)'} हक्क अपडेट केले!`);
  };

  const handleRoleAdded = (newRole: AuthorityRoleOption) => {
    setAvailableRoles(prev => [...prev, newRole]);
    showToast(`नवीन लॉगिन प्रकार "${newRole.label}" जोडला!`);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('सर्व घटकांच्या परवानग्या मूळ डिफॉल्ट स्थितीत आणायच्या आहेत का?')) {
      localStorage.removeItem('app_authority_permissions');
      setItems(INITIAL_AUTHORITY_ITEMS);
      showToast('सर्व अधिकार यशस्वीरीत्या रीसेट झाले!');
    }
  };

  const handleCreateNewElement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newElemId.trim() || !newElemName.trim()) return;

    const formattedId = newElemId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newItem: AuthorityItem = {
      id: formattedId,
      name: newElemName.trim(),
      marathiName: newElemMarathi.trim() || newElemName.trim(),
      category: newElemCategory,
      module: newElemModule,
      viewRoles: ['*'],
      editRoles: ['admin']
    };

    registerAuthorityItem(newItem);
    setItems(prev => [...prev, newItem]);
    setShowAddElementModal(false);
    setNewElemId('');
    setNewElemName('');
    setNewElemMarathi('');
    showToast(`नवीन घटक "${newItem.name}" समाविष्ट केला!`);
  };

  // Filtered items in Catalog view
  const filteredCatalogItems = useMemo(() => {
    return items.filter(it => {
      const matchSearch = 
        it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.marathiName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCat = categoryFilter === 'all' || it.category === categoryFilter;
      const matchMod = moduleFilter === 'all' || it.module === moduleFilter;

      return matchSearch && matchCat && matchMod;
    });
  }, [items, searchQuery, categoryFilter, moduleFilter]);

  // Helper to get Authority badge for inline placement
  const renderAuthorityBadge = (itemId: string, titleHint?: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return null;

    const viewCount = item.viewRoles.includes('*') || item.viewRoles.length === 0 
      ? 'All' 
      : `${item.viewRoles.length}`;
    const editCount = item.editRoles.includes('*') || item.editRoles.length === 0 
      ? 'All' 
      : `${item.editRoles.length}`;

    return (
      <div 
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 bg-slate-900/90 text-white rounded-xl p-1 shadow-lg border border-slate-700/80 backdrop-blur-md z-30 select-none"
        title={titleHint || item.name}
      >
        <span className="text-[9px] font-black uppercase text-slate-300 px-1.5 py-0.5 bg-slate-800 rounded">
          {item.category}
        </span>

        {/* Eye Button */}
        <button
          type="button"
          onClick={() => handleOpenModal(item, 'view')}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
          title="दृश्यता हक्क बदला (Change View Permission)"
        >
          <Eye className="w-3 h-3" />
          <span>{viewCount}</span>
        </button>

        {/* Pencil Button */}
        <button
          type="button"
          onClick={() => handleOpenModal(item, 'edit')}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-sm"
          title="संपादन / बदल हक्क बदला (Change Edit Permission)"
        >
          <Pencil className="w-3 h-3" />
          <span>{editCount}</span>
        </button>
      </div>
    );
  };

  // Helper to format role names list for chips
  const renderRoleChips = (roleIds: string[]) => {
    if (roleIds.includes('*') || roleIds.length === 0) {
      return (
        <span className="inline-flex items-center text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
          सर्व लॉगिन (All Logins)
        </span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {roleIds.map(rId => {
          const matched = availableRoles.find(r => r.id === rId);
          return (
            <span
              key={rId}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${matched ? matched.badgeBg : 'bg-slate-100'} ${matched ? matched.badgeText : 'text-slate-700'}`}
            >
              {matched?.label || rId}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-slide-down">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Authority & Role Access Controller (हक्क व्यवस्थापन)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              System Authority Master Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              संपूर्ण ॲपमधील प्रत्येक <strong>बटण</strong>, <strong>पेज</strong>, <strong>सेक्शन</strong>, <strong>उपविभाग</strong> आणि <strong>आलेख</strong> कोणाला दिसेल (👁️ Eye) व कोणाला बदलता येईल (✏️ Pencil) हे येथे थेट नियंत्रित करा.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddElementModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              नवीन घटक जोडा
            </button>
            <button
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-black border border-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Defaults
            </button>
          </div>
        </div>

        {/* Quick Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-400 block">एकूण घटक (Elements)</span>
            <span className="text-xl font-black text-white">{items.length}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-400 block">पृष्ठे (Pages)</span>
            <span className="text-xl font-black text-indigo-400">{items.filter(i => i.category === 'page').length}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-400 block">विभाग (Sections)</span>
            <span className="text-xl font-black text-emerald-400">{items.filter(i => i.category === 'section' || i.category === 'subsection').length}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-400 block">बटणे (Buttons)</span>
            <span className="text-xl font-black text-amber-400">{items.filter(i => i.category === 'button').length}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-400 block">आलेख (Graphs)</span>
            <span className="text-xl font-black text-pink-400">{items.filter(i => i.category === 'graph').length}</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setViewMode('simulator')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'simulator' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>थेट ॲप प्रिव्ह्यू (Live App Simulator)</span>
          </button>
          
          <button
            onClick={() => setViewMode('catalog')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'catalog' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>घटक सूची / डायरेक्टरी (Master Catalog)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{availableRoles.length} लॉगिन प्रकार सक्रिय (Active Roles)</span>
        </div>
      </div>

      {/* ==================== VIEW 1: LIVE APP SIMULATOR ==================== */}
      {viewMode === 'simulator' && (
        <div className="space-y-6">
          
          {/* Module Selector in Simulator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'attendance', label: 'Attendance Section', marathi: 'उपस्थिती विभाग', icon: ClipboardCheck, color: 'text-indigo-600', activeBg: 'border-indigo-600 bg-indigo-50/40' },
              { id: 'arp', label: 'ARP Section', marathi: 'एआरपी मूल्यमापन', icon: BookOpen, color: 'text-emerald-600', activeBg: 'border-emerald-600 bg-emerald-50/40' },
              { id: 'serp', label: 'SERP Section', marathi: 'एसईआरपी अध्यापन', icon: BookOpen, color: 'text-blue-600', activeBg: 'border-blue-600 bg-blue-50/40' },
              { id: 'inventory', label: 'Inventory Section', marathi: 'इन्व्हेंटरी साठा', icon: Boxes, color: 'text-amber-600', activeBg: 'border-amber-600 bg-amber-50/40' },
            ].map(mod => {
              const Icon = mod.icon;
              const isActive = simModule === mod.id;
              return (
                <div
                  key={mod.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSimModule(mod.id as any);
                    setSimPage('dashboard');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSimModule(mod.id as any);
                      setSimPage('dashboard');
                    }
                  }}
                  className={`p-4 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                    isActive ? mod.activeBg + ' shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-6 h-6 ${mod.color}`} />
                    {renderAuthorityBadge(`page_${mod.id === 'attendance' ? 'attendance_dashboard' : mod.id === 'arp' ? 'arp_baseline_dashboard' : mod.id === 'serp' ? 'serp_daily_logs' : 'inventory_dashboard'}`)}
                  </div>
                  <div className="text-sm font-black text-slate-900">{mod.label}</div>
                  <div className="text-xs font-bold text-slate-400">{mod.marathi}</div>
                </div>
              );
            })}
          </div>

          {/* Simulator Canvas Frame */}
          <div className="bg-slate-100 p-4 sm:p-6 rounded-[32px] border-2 border-slate-300/80 shadow-inner space-y-6">
            
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                  Authority Overlay Mode
                </span>
                <span className="text-xs font-bold text-slate-600">
                  घटकावर असणाऱ्या <strong>👁️ Eye</strong> किंवा <strong>✏️ Pencil</strong> चिन्हांवर क्लिक करा.
                </span>
              </div>
              <div className="text-xs font-bold text-slate-400">
                Module: <span className="text-slate-800 uppercase font-black">{simModule}</span>
              </div>
            </div>

            {/* ATTENDANCE MODULE SIMULATOR */}
            {simModule === 'attendance' && (
              <div className="space-y-6">
                
                {/* Page Level Authority Container */}
                <div className="bg-white border-2 border-dashed border-indigo-200 rounded-3xl p-6 relative">
                  <div className="absolute top-4 right-4">
                    {renderAuthorityBadge('page_attendance_dashboard', 'Attendance Dashboard Page')}
                  </div>

                  <div className="mb-6">
                    <h2 className="text-xl font-black text-slate-900">Attendance Overview (उपस्थिती डॅशबोर्ड)</h2>
                    <p className="text-xs text-slate-500 font-bold">Daily metrics, school status and trends</p>
                  </div>

                  {/* Section 1: KPI Stats Cards */}
                  <div className="relative border border-slate-200 rounded-2xl p-5 mb-6 bg-slate-50/50">
                    <div className="absolute -top-3 right-4">
                      {renderAuthorityBadge('sec_attendance_kpi_cards', 'KPI Summary Cards Section')}
                    </div>
                    
                    <div className="text-xs font-black uppercase text-slate-400 mb-3">
                      KPI Cards Section (सांख्यिकी कार्ड्स)
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Total Students</div>
                        <div className="text-2xl font-black text-slate-800">142</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Present Today</div>
                        <div className="text-2xl font-black text-emerald-600">136</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <div className="text-[10px] font-bold text-rose-600 uppercase">Absent Today</div>
                        <div className="text-2xl font-black text-rose-600">6</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase">Attendance %</div>
                        <div className="text-2xl font-black text-indigo-600">95.7%</div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Date and Filter Section */}
                  <div className="relative border border-slate-200 rounded-2xl p-5 mb-6 bg-white">
                    <div className="absolute -top-3 right-4">
                      {renderAuthorityBadge('sec_attendance_date_filter', 'Date & School Filter Section')}
                    </div>
                    <div className="text-xs font-black uppercase text-slate-400 mb-3">
                      Filters & School Selection (तारीख व शाळा निवड)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700">
                        📅 Select Date: Today
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700">
                        🏫 School: A. L. Chandavarkar Highschool
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700">
                        🎓 Class: 5th & 7th
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Graphs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="relative border border-slate-200 rounded-2xl p-5 bg-white">
                      <div className="absolute -top-3 right-4">
                        {renderAuthorityBadge('graph_attendance_trend', 'Attendance Trend Graph')}
                      </div>
                      <div className="text-xs font-black uppercase text-slate-400 mb-2">
                        📊 Daily Attendance Trend Graph (दैनिक उपस्थिती आलेख)
                      </div>
                      <div className="h-40 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
                        [ Attendance Trend Line Chart Visualization ]
                      </div>
                    </div>

                    <div className="relative border border-slate-200 rounded-2xl p-5 bg-white">
                      <div className="absolute -top-3 right-4">
                        {renderAuthorityBadge('graph_classwise_attendance', 'Class-wise Attendance Graph')}
                      </div>
                      <div className="text-xs font-black uppercase text-slate-400 mb-2">
                        📊 Class-wise Bar Graph (वर्गनिहाय उपस्थिती आलेख)
                      </div>
                      <div className="h-40 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-center text-xs font-black text-emerald-600">
                        [ Class-wise Comparative Bar Chart ]
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Action Buttons Area */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs font-black uppercase text-slate-500">Action Controls (कृती बटणे)</div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_submit_attendance', 'Save Attendance Button')}
                        </div>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          💾 Save Attendance
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_voice_attendance', 'Voice Attendance Button')}
                        </div>
                        <button className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black pointer-events-none">
                          🎙️ Voice Mode
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_export_attendance_excel', 'Export Excel Button')}
                        </div>
                        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          📥 Export Excel
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_add_student', 'Add Student Button')}
                        </div>
                        <button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          ➕ Add Student
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_delete_student', 'Delete Student Button')}
                        </div>
                        <button className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          🗑️ Delete Student
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ARP MODULE SIMULATOR */}
            {simModule === 'arp' && (
              <div className="space-y-6">
                <div className="bg-white border-2 border-dashed border-emerald-200 rounded-3xl p-6 relative">
                  <div className="absolute top-4 right-4">
                    {renderAuthorityBadge('page_arp_baseline_dashboard', 'Boardable Baseline Dashboard Page')}
                  </div>

                  <div className="mb-6">
                    <h2 className="text-xl font-black text-slate-900">ARP Assessment Manager (एआरपी मूल्यमापन)</h2>
                    <p className="text-xs text-slate-500 font-bold">Baseline, Midline & Endline student evaluation</p>
                  </div>

                  {/* Subsection: Exam Creator */}
                  <div className="relative border border-slate-200 rounded-2xl p-5 mb-6 bg-slate-50/50">
                    <div className="absolute -top-3 right-4">
                      {renderAuthorityBadge('sec_arp_exam_creator', 'Create Assessment Exam Section')}
                    </div>
                    <div className="text-xs font-black uppercase text-slate-400 mb-3">
                      Assessment Setup (परीक्षा तयार करा विभाग)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Exam: Baseline / Midline / Endline</div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Classes: 5th, 6th, 7th, 8th</div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Levels & Total Marks</div>
                    </div>
                  </div>

                  {/* Graphs area */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="relative border border-slate-200 rounded-2xl p-5 bg-white">
                      <div className="absolute -top-3 right-4">
                        {renderAuthorityBadge('graph_arp_level_distribution', 'ARP Level Distribution Graph')}
                      </div>
                      <div className="text-xs font-black uppercase text-slate-400 mb-2">
                        📊 Level Distribution Chart (स्तरनिहाय विद्यार्थी आलेख)
                      </div>
                      <div className="h-40 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-center text-xs font-black text-emerald-600">
                        [ Level 1 to Level 5 Distribution Bar Chart ]
                      </div>
                    </div>

                    <div className="relative border border-slate-200 rounded-2xl p-5 bg-white">
                      <div className="absolute -top-3 right-4">
                        {renderAuthorityBadge('graph_arp_subject_marks_comparison', 'Subject Marks Comparison Graph')}
                      </div>
                      <div className="text-xs font-black uppercase text-slate-400 mb-2">
                        📊 Subject Marks Radar / Bar (विषयनिहाय गुण तुलना)
                      </div>
                      <div className="h-40 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
                        [ Marathi vs Maths vs English Comparison ]
                      </div>
                    </div>
                  </div>

                  {/* Marks Entry & Action buttons */}
                  <div className="relative border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                    <div className="absolute -top-3 right-4">
                      {renderAuthorityBadge('sec_arp_marks_entry_table', 'ARP Marks Entry Table')}
                    </div>
                    <div className="text-xs font-black uppercase text-slate-500">Student Marks Actions (गुण नोंदणी कृती)</div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_arp_enter_marks', 'Enter Marks Button')}
                        </div>
                        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          ✍️ Enter Marks
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_arp_save_all_marks', 'Save All Marks Button')}
                        </div>
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          💾 Save All Marks
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_arp_export_excel', 'Export ARP Excel')}
                        </div>
                        <button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          📥 Export Excel
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_arp_delete_exam', 'Delete Exam Button')}
                        </div>
                        <button className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          🗑️ Delete Exam
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SERP MODULE SIMULATOR */}
            {simModule === 'serp' && (
              <div className="space-y-6">
                <div className="bg-white border-2 border-dashed border-blue-200 rounded-3xl p-6 relative">
                  <div className="absolute top-4 right-4">
                    {renderAuthorityBadge('page_serp_daily_logs', 'SERP Daily Teaching Logs Page')}
                  </div>

                  <div className="mb-6">
                    <h2 className="text-xl font-black text-slate-900">SERP Teaching Logs & Analytics (एसईआरपी तासिका नोंदी)</h2>
                    <p className="text-xs text-slate-500 font-bold">Daily syllabus coverage and teacher monitoring</p>
                  </div>

                  {/* Form section */}
                  <div className="relative border border-slate-200 rounded-2xl p-5 mb-6 bg-slate-50/50">
                    <div className="absolute -top-3 right-4">
                      {renderAuthorityBadge('sec_serp_new_log_form', 'Add Teaching Log Form')}
                    </div>
                    <div className="text-xs font-black uppercase text-slate-400 mb-3">
                      New Teaching Log Entry (नवीन तासिका नोंद)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">School & Class</div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Subject & Topic</div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Hours Spent</div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Teaching Methodology</div>
                    </div>
                  </div>

                  {/* Graphs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="relative border border-slate-200 rounded-2xl p-5 bg-white">
                      <div className="absolute -top-3 right-4">
                        {renderAuthorityBadge('graph_serp_subject_distribution', 'SERP Subject Distribution Graph')}
                      </div>
                      <div className="text-xs font-black uppercase text-slate-400 mb-2">
                        📊 Subject Distribution Pie/Bar (विषय वितरण आलेख)
                      </div>
                      <div className="h-40 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-center text-xs font-black text-blue-600">
                        [ Subject Delivery Hours Breakdown ]
                      </div>
                    </div>

                    <div className="relative border border-slate-200 rounded-2xl p-5 bg-white">
                      <div className="absolute -top-3 right-4">
                        {renderAuthorityBadge('graph_serp_weekly_hours', 'SERP Weekly Teaching Hours Trend')}
                      </div>
                      <div className="text-xs font-black uppercase text-slate-400 mb-2">
                        📊 Weekly Teaching Trend (साप्ताहिक तासिका ट्रेंड)
                      </div>
                      <div className="h-40 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
                        [ Weekly Teaching Hours Trend Line ]
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs font-black uppercase text-slate-500">SERP Actions (कृती)</div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_serp_submit_log', 'Submit Log Button')}
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          💾 Submit Teaching Log
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_serp_edit_log', 'Edit Log Button')}
                        </div>
                        <button className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          ✏️ Edit Log
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_serp_delete_log', 'Delete Log Button')}
                        </div>
                        <button className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          🗑️ Delete Log
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* INVENTORY MODULE SIMULATOR */}
            {simModule === 'inventory' && (
              <div className="space-y-6">
                <div className="bg-white border-2 border-dashed border-amber-200 rounded-3xl p-6 relative">
                  <div className="absolute top-4 right-4">
                    {renderAuthorityBadge('page_inventory_dashboard', 'Inventory Dashboard Page')}
                  </div>

                  <div className="mb-6">
                    <h2 className="text-xl font-black text-slate-900">Inventory & Equipment Stock (इन्व्हेंटरी व्यवस्थापन)</h2>
                    <p className="text-xs text-slate-500 font-bold">Material requests, stock audit, and equipment circulation</p>
                  </div>

                  <div className="relative border border-slate-200 rounded-2xl p-5 mb-6 bg-slate-50/50">
                    <div className="absolute -top-3 right-4">
                      {renderAuthorityBadge('sec_inventory_stock_table', 'Available Stock Table')}
                    </div>
                    <div className="text-xs font-black uppercase text-slate-400 mb-3">
                      Stock Table (उपलब्ध साहित्य साठा)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Science Kits (14)</div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Sports Equipment (45)</div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold">Stationery & Books (120)</div>
                    </div>
                  </div>

                  <div className="relative border border-slate-200 rounded-2xl p-5 bg-white mb-6">
                    <div className="absolute -top-3 right-4">
                      {renderAuthorityBadge('graph_inventory_category_breakdown', 'Category Stock Graph')}
                    </div>
                    <div className="text-xs font-black uppercase text-slate-400 mb-2">
                      📊 Category Breakdown (वर्गवारी साठा आलेख)
                    </div>
                    <div className="h-40 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-center text-xs font-black text-amber-600">
                      [ Inventory Category Stock Allocation Donut Chart ]
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs font-black uppercase text-slate-500">Inventory Actions (कृती)</div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_inventory_add_item', 'Add Item Button')}
                        </div>
                        <button className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          ➕ Add Inventory Item
                        </button>
                      </div>

                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -top-8">
                          {renderAuthorityBadge('btn_inventory_approve_request', 'Approve Request Button')}
                        </div>
                        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow pointer-events-none">
                          ✅ Approve Request
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ==================== VIEW 2: MASTER CATALOG DIRECTORY ==================== */}
      {viewMode === 'catalog' && (
        <div className="space-y-6">
          
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="घटकाचे नाव, मराठी नाव किंवा आयडी शोधा (Search elements)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Module Filter */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">विभाग:</span>
                <select
                  value={moduleFilter}
                  onChange={e => setModuleFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 outline-none w-full md:w-auto"
                >
                  <option value="all">सर्व विभाग (All Modules)</option>
                  <option value="attendance">Attendance (उपस्थिती)</option>
                  <option value="arp">ARP (मूल्यमापन)</option>
                  <option value="serp">SERP (अध्यापन)</option>
                  <option value="inventory">Inventory (इन्व्हेंटरी)</option>
                  <option value="system">System (प्रणाली)</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-2">घटक प्रकार:</span>
              {[
                { id: 'all', label: 'सर्व (All)' },
                { id: 'page', label: '📄 पृष्ठे (Pages)' },
                { id: 'section', label: '📦 विभाग (Sections)' },
                { id: 'subsection', label: '📑 उपविभाग (Subsections)' },
                { id: 'button', label: '🔘 बटणे (Buttons)' },
                { id: 'graph', label: '📊 आलेख (Graphs)' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    categoryFilter === cat.id 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>

          {/* Elements List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 px-2">
              <span>घटक तपशील ({filteredCatalogItems.length} घटक)</span>
              <span>हक्क नियंत्रण (Eye: दृश्यता | Pencil: संपादन)</span>
            </div>

            {filteredCatalogItems.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-black text-slate-700">कोणताही घटक आढळला नाही!</div>
                <div className="text-xs text-slate-400 font-bold">कृपया सर्च शब्द किंवा फिल्टर बदलून पहा.</div>
              </div>
            ) : (
              filteredCatalogItems.map(item => {
                const viewAll = item.viewRoles.includes('*') || item.viewRoles.length === 0;
                const editAll = item.editRoles.includes('*') || item.editRoles.length === 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    
                    {/* Left details */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          item.category === 'page' ? 'bg-indigo-100 text-indigo-700' :
                          item.category === 'section' ? 'bg-emerald-100 text-emerald-700' :
                          item.category === 'subsection' ? 'bg-teal-100 text-teal-700' :
                          item.category === 'button' ? 'bg-amber-100 text-amber-700' :
                          'bg-pink-100 text-pink-700'
                        }`}>
                          {item.category}
                        </span>

                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {item.module}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400">
                          #{item.id}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {item.name}
                        </h3>
                        {item.marathiName && (
                          <span className="text-xs font-bold text-slate-500 truncate">
                            ({item.marathiName})
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-400 font-medium line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Right controls: Eye and Pencil */}
                    <div className="flex flex-wrap items-center gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      
                      {/* VIEW (EYE) CONTROL */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-2 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(item, 'view')}
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all shrink-0"
                          title="दृश्यता हक्क बदला"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 block">कोणाला दिसेल (View)</span>
                          {renderRoleChips(item.viewRoles)}
                        </div>
                      </div>

                      {/* EDIT (PENCIL) CONTROL */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-2 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(item, 'edit')}
                          className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all shrink-0"
                          title="संपादन हक्क बदला"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 block">कोणाला बदलता येईल (Edit)</span>
                          {renderRoleChips(item.editRoles)}
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })
            )}

          </div>
        </div>
      )}

      {/* Permission Modal */}
      {modalItem && (
        <AuthorityPermissionModal
          item={modalItem}
          mode={modalMode}
          availableRoles={availableRoles}
          onClose={() => setModalItem(null)}
          onSave={handleSaveModal}
          onRoleAdded={handleRoleAdded}
        />
      )}

      {/* Add New Custom Element Modal */}
      {showAddElementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">नवीन ॲप घटक नोंदवा (Register Element)</h3>
              <button onClick={() => setShowAddElementModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewElement} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">घटक ID (Unique ID)</label>
                <input
                  type="text"
                  placeholder="उदा. btn_custom_export, sec_new_feature"
                  value={newElemId}
                  onChange={e => setNewElemId(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">इंग्रजी नाव (English Name)</label>
                <input
                  type="text"
                  placeholder="उदा. Custom Export Button"
                  value={newElemName}
                  onChange={e => setNewElemName(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">मराठी नाव (Marathi Name)</label>
                <input
                  type="text"
                  placeholder="उदा. विशेष निर्यात बटण"
                  value={newElemMarathi}
                  onChange={e => setNewElemMarathi(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">प्रकार (Category)</label>
                  <select
                    value={newElemCategory}
                    onChange={e => setNewElemCategory(e.target.value as any)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                  >
                    <option value="page">Page (पृष्ठ)</option>
                    <option value="section">Section (विभाग)</option>
                    <option value="subsection">Subsection (उपविभाग)</option>
                    <option value="button">Button (बटण)</option>
                    <option value="graph">Graph (आलेख)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">विभाग (Module)</label>
                  <select
                    value={newElemModule}
                    onChange={e => setNewElemModule(e.target.value as any)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                  >
                    <option value="attendance">Attendance</option>
                    <option value="arp">ARP</option>
                    <option value="serp">SERP</option>
                    <option value="inventory">Inventory</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddElementModal(false)}
                  className="text-xs font-bold text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-100"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl shadow"
                >
                  घटक जतन करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
