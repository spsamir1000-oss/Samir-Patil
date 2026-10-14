import React from 'react';
import { useAuthority } from '../context/AuthorityContext';
import { Eye, Pencil } from 'lucide-react';
import { AuthorityCategory } from '../types';
import { getOrRegisterAuthorityItem } from '../lib/authorityManager';

interface AdminAuthorityBadgeProps {
  itemId: string;
  title?: string;
  marathiTitle?: string;
  category?: AuthorityCategory;
  module?: 'attendance' | 'inventory' | 'arp' | 'serp' | 'system' | 'general';
  position?: 'inline' | 'top-right' | 'top-left' | 'bottom-right' | 'relative';
  className?: string;
  size?: 'sm' | 'md';
}

export function AdminAuthorityBadge({
  itemId,
  title,
  marathiTitle,
  category = 'button',
  module = 'general',
  position = 'inline',
  className = '',
  size = 'sm'
}: AdminAuthorityBadgeProps) {
  const { isAdmin, adminAuthorityMode, openAuthorityDropdown, refreshTrigger } = useAuthority();

  // If not admin, or if Admin has toggled Authority Mode OFF, render NOTHING
  if (!isAdmin || !adminAuthorityMode) {
    return null;
  }

  const item = getOrRegisterAuthorityItem(itemId, {
    name: title,
    marathiName: marathiTitle,
    category,
    module
  });

  const viewCount = item.viewRoles.includes('*') ? 'All' : item.viewRoles.length;
  const editCount = item.editRoles.includes('*') ? 'All' : item.editRoles.length;

  const positionClasses = {
    inline: 'inline-flex',
    'top-right': 'absolute top-2 right-2 z-20',
    'top-left': 'absolute top-2 left-2 z-20',
    'bottom-right': 'absolute bottom-2 right-2 z-20',
    relative: 'relative z-10'
  }[position];

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      className={`${positionClasses} items-center gap-1 bg-white/95 backdrop-blur-xs border border-indigo-200/90 shadow-sm p-1 rounded-xl pointer-events-auto select-none ${className}`}
      title={`${item.marathiName || item.name}: Eye (पाहणे) आणि Pencil (बदलणे) हक्क सेट करा`}
    >
      <span className="text-[9px] font-black text-slate-500 hidden sm:inline px-1">
        हक्क:
      </span>

      {/* EYE BUTTON (View Rights) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openAuthorityDropdown(itemId, 'view', {
            name: title,
            marathiName: marathiTitle,
            category,
            module
          });
        }}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all hover:scale-105 active:scale-95"
        title="दृश्यता हक्क बदला (Click to configure View Authority dropdown)"
      >
        <Eye className="w-3 h-3 shrink-0" />
        <span>{viewCount}</span>
      </button>

      {/* PENCIL BUTTON (Edit Rights) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openAuthorityDropdown(itemId, 'edit', {
            name: title,
            marathiName: marathiTitle,
            category,
            module
          });
        }}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all hover:scale-105 active:scale-95"
        title="संपादन/नोंद हक्क बदला (Click to configure Edit Authority dropdown)"
      >
        <Pencil className="w-3 h-3 shrink-0" />
        <span>{editCount}</span>
      </button>
    </div>
  );
}

/**
 * High-level wrapper component that attaches an AdminAuthorityBadge
 * to any card, button, section, or container
 */
export function AuthorityWrapper({
  itemId,
  title,
  marathiTitle,
  category = 'section',
  module = 'general',
  children,
  className = '',
  position = 'top-right'
}: {
  itemId: string;
  title?: string;
  marathiTitle?: string;
  category?: AuthorityCategory;
  module?: 'attendance' | 'inventory' | 'arp' | 'serp' | 'system' | 'general';
  children: React.ReactNode;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'inline';
}) {
  const { isAdmin, adminAuthorityMode, canView } = useAuthority();

  // If user does not have view permission (and is not admin), hide the element
  if (!isAdmin && !canView(itemId)) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      {isAdmin && adminAuthorityMode && (
        <AdminAuthorityBadge
          itemId={itemId}
          title={title}
          marathiTitle={marathiTitle}
          category={category}
          module={module}
          position={position}
        />
      )}
    </div>
  );
}

export default AdminAuthorityBadge;
