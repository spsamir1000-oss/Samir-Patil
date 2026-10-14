import React, { useState } from 'react';
import { Teacher, UserSession } from '../types';
import AuthorityControlSection from './AuthorityControlSection';
import {
  ShieldCheck,
  Users,
  Settings,
  ArrowLeft,
  LogOut,
  Cpu,
  Layers,
  Database,
  Sliders,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { getAvailableRoles } from '../lib/authorityManager';

interface SystemPanelProps {
  currentUser: UserSession | null;
  teachers: Teacher[];
  setActiveModule: (module: 'selection' | 'attendance' | 'inventory' | 'serp' | 'arp' | 'system') => void;
  handleLogout: () => void;
}

export default function SystemPanel({
  currentUser,
  teachers,
  setActiveModule,
  handleLogout
}: SystemPanelProps) {
  // Subsections inside System: 'authority' is primary as requested
  const [activeTab, setActiveTab] = useState<'authority' | 'roles' | 'info'>('authority');
  const availableRoles = getAvailableRoles(teachers);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveModule('selection')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>मुख्य विभाग (Back to Main)</span>
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-black text-slate-900 leading-none block">
                  System Section (प्रणाली व्यवस्थापन)
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Authority, Roles & App Permissions Control
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-black text-slate-700">👤 {currentUser?.name || 'User'}</span>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase">
                {currentUser?.role || 'Staff'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-all border border-rose-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">बाहेर पडा (Logout)</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* System Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <button
            id="system-tab-authority"
            onClick={() => setActiveTab('authority')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'authority'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Authority (हक्क व परवानग्या व्यवस्थापन)</span>
          </button>

          <button
            id="system-tab-roles"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Login Roles Directory (लॉगिन भूमिका यादी)</span>
          </button>

          <button
            id="system-tab-info"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'info'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>System Information & Sync Status</span>
          </button>
        </div>

        {/* Tab 1: Authority Management Section (Primary Core Request) */}
        {activeTab === 'authority' && (
          <AuthorityControlSection
            currentUser={currentUser}
            teachers={teachers}
          />
        )}

        {/* Tab 2: Login Roles Directory */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                लॉगिन प्रकार व अधिकार भूमिका (Configured Roles)
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                ॲपमधील सर्व भूमिका येथे दर्शविल्या आहेत. Eye व Pencil हक्क सेट करताना हेच पर्याय वापरले जातात.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableRoles.map(role => (
                <div key={role.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${role.badgeBg} ${role.badgeText}`}>
                      Role ID: {role.id}
                    </span>
                    {role.isCustom && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Custom Role
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900">{role.label}</div>
                  <div className="text-xs font-bold text-slate-400">{role.marathiLabel}</div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                एकूण {availableRoles.length} भूमिका सिस्टीममध्ये नोंदणीकृत आहेत.
              </span>
              <button
                onClick={() => setActiveTab('authority')}
                className="text-xs font-black text-indigo-600 hover:text-indigo-700"
              >
                Authority मधील परवानग्या पहा →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: System Info */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                प्रणाली माहिती व सुरक्षा स्थिती (System Diagnostics)
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Unified School Systems • Real-time Authority Engine
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authority Rule Engine Status</span>
                </div>
                <div className="text-sm font-black text-slate-800">Active & Enforcing</div>
                <div className="text-xs text-slate-500 font-bold">
                  View and Edit rules are dynamically evaluated on all pages, sections, buttons and graphs.
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                  <KeyRound className="w-4 h-4" />
                  <span>Session Authentication</span>
                </div>
                <div className="text-sm font-black text-slate-800">
                  {currentUser?.name} ({currentUser?.role})
                </div>
                <div className="text-xs text-slate-500 font-bold">
                  Schools: {currentUser?.allowedSchools?.join(', ') || 'All Schools'}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
