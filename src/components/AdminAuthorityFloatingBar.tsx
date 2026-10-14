import React, { useState } from 'react';
import { useAuthority } from '../context/AuthorityContext';
import { ShieldCheck, Eye, Pencil, Sliders, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';

interface AdminAuthorityFloatingBarProps {
  onOpenSystemPanel?: () => void;
}

export default function AdminAuthorityFloatingBar({
  onOpenSystemPanel
}: AdminAuthorityFloatingBarProps) {
  const { isAdmin, adminAuthorityMode, setAdminAuthorityMode } = useAuthority();
  const [isExpanded, setIsExpanded] = useState(false);

  // If not admin, completely invisible
  if (!isAdmin) return null;

  return (
    <aside 
      aria-label="Admin Authority Mode Controls"
      className="fixed bottom-4 right-4 z-[9999] select-none font-sans"
    >
      {isExpanded ? (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-indigo-500/40 w-80 space-y-3 animate-scale-up">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-black block leading-none">
                  Admin Authority Mode
                </span>
                <span className="text-[10px] text-indigo-300 font-bold">
                  हक्क व परवानग्या नियंत्रण
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 font-medium leading-snug">
            फक्त ॲडमिनसाठी: स्क्रीनवरील प्रत्येक घटकावर <strong>Eye 👁️</strong> (दिसणे) आणि <strong>Pencil ✏️</strong> (बदलणे) चिन्हे दिसतील. त्यावर क्लिक करून लगेच हक्क द्या.
          </p>

          {/* Toggle Button */}
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-xs font-black text-slate-200">
              Authority चिन्हे (Symbols):
            </span>
            <button
              onClick={() => setAdminAuthorityMode(!adminAuthorityMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                adminAuthorityMode
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {adminAuthorityMode ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>सक्रिय (ON)</span>
                </>
              ) : (
                <span>बंद (OFF)</span>
              )}
            </button>
          </div>

          {onOpenSystemPanel && (
            <button
              onClick={onOpenSystemPanel}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Sliders className="w-4 h-4" />
              <span>Master System Authority Panel</span>
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
            adminAuthorityMode
              ? 'bg-slate-900/95 border-indigo-500/50 text-white'
              : 'bg-slate-900/80 border-slate-700 text-slate-400'
          }`}
        >
          <div className="relative">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            {adminAuthorityMode && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-left">
            <div className="text-xs font-black flex items-center gap-1.5">
              <span>Admin Authority</span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${adminAuthorityMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                {adminAuthorityMode ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />
              <span>+</span>
              <Pencil className="w-2.5 h-2.5" />
              <span>हक्क चिन्हे</span>
            </div>
          </div>
          <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
        </button>
      )}
    </aside>
  );
}
