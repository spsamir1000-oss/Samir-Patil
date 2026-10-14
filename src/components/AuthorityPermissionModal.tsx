import React, { useState } from 'react';
import { AuthorityItem, AuthorityRoleOption } from '../types';
import { Eye, Pencil, Check, X, Shield, Users, Plus, CheckSquare, Square, Info } from 'lucide-react';
import { addCustomAuthorityRole } from '../lib/authorityManager';

interface AuthorityPermissionModalProps {
  item: AuthorityItem;
  mode: 'view' | 'edit';
  availableRoles: AuthorityRoleOption[];
  onClose: () => void;
  onSave: (updatedItem: AuthorityItem) => void;
  onRoleAdded?: (newRole: AuthorityRoleOption) => void;
}

export default function AuthorityPermissionModal({
  item,
  mode,
  availableRoles,
  onClose,
  onSave,
  onRoleAdded
}: AuthorityPermissionModalProps) {
  const isView = mode === 'view';
  
  // Selected roles list for this mode
  const currentRoles = isView ? item.viewRoles : item.editRoles;
  const isAllInitially = currentRoles.includes('*') || currentRoles.length === 0;

  const [selectedRoles, setSelectedRoles] = useState<string[]>(() => {
    if (isAllInitially) {
      return availableRoles.map(r => r.id);
    }
    return currentRoles;
  });

  const [isAllSelected, setIsAllSelected] = useState<boolean>(isAllInitially);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleMarathiName, setNewRoleMarathiName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleRole = (roleId: string) => {
    let next: string[];
    if (selectedRoles.includes(roleId)) {
      next = selectedRoles.filter(r => r !== roleId);
    } else {
      next = [...selectedRoles, roleId];
    }
    setSelectedRoles(next);
    setIsAllSelected(next.length === availableRoles.length);
  };

  const handleSelectAll = () => {
    setSelectedRoles(availableRoles.map(r => r.id));
    setIsAllSelected(true);
  };

  const handleDeselectAll = () => {
    setSelectedRoles(['admin']); // Always retain admin for safety
    setIsAllSelected(false);
  };

  const handleAdminOnly = () => {
    setSelectedRoles(['admin']);
    setIsAllSelected(false);
  };

  const handleTeachersOnly = () => {
    const teacherRoles = availableRoles
      .filter(r => r.id.includes('teacher') || r.id === 'arp' || r.id === 'serp' || r.id === 'wellness' || r.id === 'sport')
      .map(r => r.id);
    setSelectedRoles(['admin', ...teacherRoles]);
    setIsAllSelected(false);
  };

  const handleAddNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanId) return;

    const newRole: AuthorityRoleOption = {
      id: cleanId,
      label: newRoleName.trim(),
      marathiLabel: newRoleMarathiName.trim() || newRoleName.trim(),
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      isCustom: true
    };

    addCustomAuthorityRole(newRole);
    if (onRoleAdded) {
      onRoleAdded(newRole);
    }
    setSelectedRoles(prev => [...prev, cleanId]);
    setNewRoleName('');
    setNewRoleMarathiName('');
    setShowAddRole(false);
  };

  const handleSave = () => {
    const finalRoles = isAllSelected || selectedRoles.length === availableRoles.length ? ['*'] : selectedRoles;
    
    const updated: AuthorityItem = {
      ...item,
      viewRoles: isView ? finalRoles : item.viewRoles,
      editRoles: !isView ? finalRoles : item.editRoles
    };

    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-scale-up max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isView ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
              {isView ? <Eye className="w-6 h-6" /> : <Pencil className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  isView ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isView ? '👁️ दृश्यता हक्क (Visibility)' : '✏️ संपादन / बदल हक्क (Edit Rights)'}
                </span>
                <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                  {item.category}
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1">
                {item.name}
              </h2>
              {item.marathiName && (
                <p className="text-xs font-bold text-slate-500">
                  {item.marathiName}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 text-xs font-semibold text-slate-600 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            {isView 
              ? 'हा घटक (Page/Section/Button/Graph) कोणत्या लॉगिन प्रकारांना दिसेल ते निवडा.' 
              : 'या घटकावर कोणते लॉगिन प्रकार बदल, नोंद किंवा क्रिया करू शकतील ते निवडा.'}
          </span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            जलद निवड (Quick Presets)
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              सर्व निवडा (All Roles)
            </button>
            <button
              type="button"
              onClick={handleAdminOnly}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all"
            >
              फक्त ॲडमिन (Admin Only)
            </button>
            <button
              type="button"
              onClick={handleTeachersOnly}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all"
            >
              सर्व शिक्षक व ॲडमिन
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Role Checkboxes list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            उपलब्ध लॉगिन प्रकार (Available Login Types) • {selectedRoles.length} निवडले
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableRoles.map(role => {
              const isChecked = selectedRoles.includes(role.id) || isAllSelected;
              return (
                <div
                  key={role.id}
                  onClick={() => handleToggleRole(role.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    isChecked 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                    isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {role.label}
                      </span>
                      {role.isCustom && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 block truncate">
                      {role.marathiLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Role inline form */}
          <div className="pt-2">
            {!showAddRole ? (
              <button
                type="button"
                onClick={() => setShowAddRole(true)}
                className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                नवीन लॉगिन प्रकार जोडा (Add New Role Type)
              </button>
            ) : (
              <form onSubmit={handleAddNewRole} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3 mt-2">
                <div className="text-xs font-black text-slate-700">नवीन लॉगिन प्रकार नोंदणी</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Role Name (e.g. Science Teacher)"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="मराठी नाव (उदा. विज्ञान शिक्षक)"
                    value={newRoleMarathiName}
                    onChange={e => setNewRoleMarathiName(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRole(false)}
                    className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-xl hover:bg-slate-200"
                  >
                    रद्द करा
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-black bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 shadow-sm"
                  >
                    जोडा
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-400">
            {isAllSelected 
              ? 'सर्व लॉगिन प्रकारांना परवानगी आहे' 
              : `${selectedRoles.length} लॉगिन प्रकार निवडले`}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold px-4 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 transition-all"
            >
              रद्द करा
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`text-xs font-black px-6 py-2.5 rounded-2xl text-white shadow-md transition-all flex items-center gap-2 ${
                isView ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              {savedSuccess ? 'जतन झाले!' : 'परवानग्या जतन करा'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
