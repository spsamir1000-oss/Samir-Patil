import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSession, Teacher, AuthorityItem, AuthorityRoleOption } from '../types';
import { 
  loadAuthorityItems, 
  saveAuthorityPermissions, 
  getOrRegisterAuthorityItem, 
  getAvailableRoles,
  canUserView,
  canUserEdit
} from '../lib/authorityManager';
import { ShieldCheck, Eye, Pencil, X, Check, CheckSquare, Square, Users } from 'lucide-react';

interface AuthorityContextType {
  currentUser: UserSession | null;
  teachers: Teacher[];
  isAdmin: boolean;
  adminAuthorityMode: boolean;
  setAdminAuthorityMode: (enabled: boolean) => void;
  availableRoles: AuthorityRoleOption[];
  openAuthorityDropdown: (itemId: string, initialMode?: 'view' | 'edit', defaults?: Partial<AuthorityItem>) => void;
  closeAuthorityDropdown: () => void;
  canView: (itemId: string) => boolean;
  canEdit: (itemId: string) => boolean;
  refreshTrigger: number;
}

const AuthorityContext = createContext<AuthorityContextType | undefined>(undefined);

interface AuthorityProviderProps {
  children: ReactNode;
  currentUser: UserSession | null;
  teachers: Teacher[];
}

export function AuthorityProvider({
  children,
  currentUser,
  teachers
}: AuthorityProviderProps) {
  const isAdmin = currentUser?.role === 'admin';
  
  // Admin Authority Mode: default ON for admin, loaded from localStorage if user toggled
  const [adminAuthorityMode, setAdminAuthorityModeState] = useState<boolean>(() => {
    if (!isAdmin) return false;
    const saved = localStorage.getItem('admin_authority_mode_active');
    return saved !== null ? saved === 'true' : true;
  });

  // Keep adminAuthorityMode in sync if user changes
  useEffect(() => {
    if (!isAdmin) {
      setAdminAuthorityModeState(false);
    } else {
      const saved = localStorage.getItem('admin_authority_mode_active');
      setAdminAuthorityModeState(saved !== null ? saved === 'true' : true);
    }
  }, [isAdmin, currentUser?.id]);

  const setAdminAuthorityMode = (enabled: boolean) => {
    setAdminAuthorityModeState(enabled);
    localStorage.setItem('admin_authority_mode_active', String(enabled));
  };

  // Available roles dynamically computed from base + registered teachers
  const availableRoles = getAvailableRoles(teachers);

  // Active modal/dropdown state
  const [activeItem, setActiveItem] = useState<AuthorityItem | null>(null);
  const [activeMode, setActiveMode] = useState<'view' | 'edit'>('view');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['*']);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [saveToast, setSaveToast] = useState(false);

  // Listen to custom updates from anywhere
  useEffect(() => {
    const handleUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('authority-permissions-updated', handleUpdate);
    return () => window.removeEventListener('authority-permissions-updated', handleUpdate);
  }, []);

  const openAuthorityDropdown = (
    itemId: string, 
    initialMode: 'view' | 'edit' = 'view', 
    defaults?: Partial<AuthorityItem>
  ) => {
    if (!isAdmin) return;
    const item = getOrRegisterAuthorityItem(itemId, defaults);
    setActiveItem(item);
    setActiveMode(initialMode);
    setSelectedRoles(initialMode === 'view' ? [...item.viewRoles] : [...item.editRoles]);
    setSaveToast(false);
  };

  const closeAuthorityDropdown = () => {
    setActiveItem(null);
  };

  // Switch between view and edit tab inside dropdown
  const handleSwitchMode = (mode: 'view' | 'edit') => {
    if (!activeItem) return;
    setActiveMode(mode);
    const item = getOrRegisterAuthorityItem(activeItem.id);
    setSelectedRoles(mode === 'view' ? [...item.viewRoles] : [...item.editRoles]);
  };

  // Toggle all roles
  const handleToggleAll = () => {
    if (!activeItem) return;
    const newRoles = selectedRoles.includes('*') ? [] : ['*'];
    setSelectedRoles(newRoles);
    persistChange(newRoles);
  };

  // Toggle single role
  const handleToggleRole = (roleId: string) => {
    if (!activeItem) return;
    let newRoles: string[];
    
    if (selectedRoles.includes('*')) {
      // Uncheck from 'all'
      newRoles = availableRoles.map(r => r.id).filter(id => id !== roleId);
    } else if (selectedRoles.includes(roleId)) {
      newRoles = selectedRoles.filter(r => r !== roleId);
    } else {
      newRoles = [...selectedRoles, roleId];
      // If all roles are now selected, represent as '*'
      if (availableRoles.every(r => newRoles.includes(r.id))) {
        newRoles = ['*'];
      }
    }

    setSelectedRoles(newRoles);
    persistChange(newRoles);
  };

  const persistChange = (roles: string[]) => {
    if (!activeItem) return;
    const perms = activeMode === 'view' ? { viewRoles: roles } : { editRoles: roles };
    saveAuthorityPermissions(activeItem.id, perms);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
    setRefreshTrigger(prev => prev + 1);
  };

  const canView = (itemId: string) => canUserView(itemId, currentUser);
  const canEdit = (itemId: string) => canUserEdit(itemId, currentUser);

  return (
    <AuthorityContext.Provider
      value={{
        currentUser,
        teachers,
        isAdmin,
        adminAuthorityMode,
        setAdminAuthorityMode,
        availableRoles,
        openAuthorityDropdown,
        closeAuthorityDropdown,
        canView,
        canEdit,
        refreshTrigger
      }}
    >
      {children}

      {/* ================= GLOBAL AUTHORITY DROPDOWN / POPOVER MODAL ================= */}
      {isAdmin && activeItem && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={closeAuthorityDropdown}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-500/30 text-indigo-300 rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                    Authority Controller ({activeItem.category})
                  </span>
                </div>
                <h3 className="text-base font-black text-white leading-tight">
                  {activeItem.marathiName || activeItem.name}
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  {activeItem.name} • <span className="font-mono text-[10px] text-indigo-200">{activeItem.id}</span>
                </p>
              </div>

              <button
                onClick={closeAuthorityDropdown}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs (Eye vs Pencil) */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('view')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                  activeMode === 'view'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>👁️ दृश्यता हक्क (View Roles)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('edit')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                  activeMode === 'edit'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Pencil className="w-4 h-4" />
                <span>✏️ संपादन/कृती हक्क (Edit Roles)</span>
              </button>
            </div>

            {/* Explanation Note */}
            <div className="px-5 py-2.5 bg-indigo-50/60 border-b border-indigo-100 text-[11px] text-indigo-900 font-bold flex items-center justify-between">
              <span>
                {activeMode === 'view'
                  ? '🎯 हा घटक कोणत्या लॉगिन प्रकारांना दिसेल ते निवडा:'
                  : '⚡ या घटकावर कोणाला कृती/संपादन/नोंद करता येईल ते निवडा:'}
              </span>
              {saveToast && (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md animate-pulse">
                  ✓ जतन झाले! (Saved)
                </span>
              )}
            </div>

            {/* Quick Toggle: All Roles */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleToggleAll}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  selectedRoles.includes('*')
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-black'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-bold'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  {selectedRoles.includes('*') ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>सर्व लॉगिन प्रकारांना परवानगी (Allow All Roles - Universal)</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  [*]
                </span>
              </button>
            </div>

            {/* Roles List */}
            <div className="p-4 max-h-64 overflow-y-auto space-y-2">
              <div className="text-[10px] font-black uppercase text-slate-400 mb-2">
                विशिष्ट लॉगिन प्रकार निवडा (Choose Specific Roles):
              </div>
              
              {availableRoles.map(role => {
                const isSelected = selectedRoles.includes('*') || selectedRoles.includes(role.id);
                return (
                  <div
                    key={role.id}
                    onClick={() => handleToggleRole(role.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-black shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          {role.marathiLabel}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">
                          {role.label}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${role.badgeBg} ${role.badgeText}`}>
                      {role.id}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                सक्रिय हक्क: <strong className="text-slate-900">{selectedRoles.includes('*') ? 'सर्व' : selectedRoles.length}</strong> भूमिका
              </div>
              
              <button
                type="button"
                onClick={closeAuthorityDropdown}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow transition-all"
              >
                पूर्ण झाले (Done)
              </button>
            </div>

          </div>
        </div>
      )}

    </AuthorityContext.Provider>
  );
}

export function useAuthority() {
  const context = useContext(AuthorityContext);
  if (!context) {
    throw new Error('useAuthority must be used within an AuthorityProvider');
  }
  return context;
}
