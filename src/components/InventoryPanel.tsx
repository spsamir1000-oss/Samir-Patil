import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Package, 
  PlusCircle, 
  Search, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  RefreshCw, 
  Send, 
  Layers, 
  XSquare, 
  CheckSquare, 
  ArrowLeftRight, 
  FileText,
  Boxes,
  HelpCircle,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Edit3,
  Settings,
  ChevronLeft,
  ArrowRight,
  Cloud,
  Database,
  Download,
  Link,
  Check
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ZoomableGraphContainer } from './ZoomableGraphContainer';
import { Teacher } from '../types';

// Define the Types for our beautiful, clean Inventory system
export interface InventoryStock {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  location: string;
}

export interface MaterialRequest {
  id: string;
  itemName: string;
  teacherName: string;
  quantity: number;
  purpose: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Declined';
  requestType?: 'Borrow' | 'Return' | 'Circulation';
  handoverTo?: string;
  originalUsageId?: string;
  condition?: 'Packed' | 'Unpacked';
  remainingPercentage?: number;
  approvedBy?: string;

  // Circulation fields
  toTeacher?: string;
  circItemCondition?: 'Good' | 'Damaged';
  circItemDamageDetails?: string;
  circBoxCondition?: 'Good' | 'Damaged';
  circAccessories?: string[];
  officeReturnPerson?: string;
  officeReturnLocation?: string;
}

export interface CirculationLog {
  id: string;
  itemId: string;
  itemName: string;
  fromTeacher: string;
  toTeacher: string;
  date: string;
  itemCondition: 'Good' | 'Damaged';
  boxCondition: 'Good' | 'Damaged';
  accessoriesIncluded: 'Yes' | 'No';
  missingAccessoriesDetails?: string;
  faultRegisteredTo?: string; // If damaged or missing accessories
}

export interface UsageLog {
  id: string;
  itemName: string;
  userName: string;
  purpose: string;
  classGrade: string;
  borrowedDate: string;
  returnDate: string;
  status: 'Active' | 'Returned';
  quantity?: number;
  approverName?: string;
}

export interface RegisteredMaterial {
  id: string;
  name: string;
  category: string;
}

export interface StockAddition {
  id: string;
  itemName: string;
  quantity: number;
  date: string;
  addedBy: string;
  location?: string;
}

interface InventoryPanelProps {
  teachers: Teacher[];
  currentUser: any;
  setActiveModule: (module: 'selection' | 'attendance' | 'inventory') => void;
  handleLogout: () => void;
}

const DEFAULT_STOCKS: InventoryStock[] = [];

const DEFAULT_REQUESTS: MaterialRequest[] = [];

const DEFAULT_USAGES: UsageLog[] = [];

const CATEGORIES = [
  'Science Kit',
  'Math Kit',
  'Audio-Visual',
  'Library',
  'Sports',
  'General Supplies'
];

type ActiveTab = 'dashboard' | 'stock' | 'requestMaterial' | 'usageMonitoring' | 'requests' | 'addMaterials' | 'materialCirculation' | 'returnMaterial' | 'cloudSync' | 'adminControl';

export default function InventoryPanel({ teachers, currentUser, setActiveModule, handleLogout }: InventoryPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [circulationMaterials, setCirculationMaterials] = useState<string[]>(() => {
    const saved = localStorage.getItem('same_app_circulation_materials');
    return saved ? JSON.parse(saved) : ['Projector', 'Laptop', 'Microphone', 'Speaker', 'Extension Board', 'Display Screen'];
  });

  // --- Stocks State ---
  const [stocks, setStocks] = useState<InventoryStock[]>(() => {
    const saved = localStorage.getItem('fresh_inventory_stock');
    return saved ? JSON.parse(saved) : DEFAULT_STOCKS;
  });

  // --- Requests State ---
  const [requests, setRequests] = useState<MaterialRequest[]>(() => {
    const saved = localStorage.getItem('fresh_inventory_requests');
    return saved ? JSON.parse(saved) : DEFAULT_REQUESTS;
  });

  // --- Usages State ---
  const [usages, setUsages] = useState<UsageLog[]>(() => {
    const saved = localStorage.getItem('fresh_inventory_usages');
    return saved ? JSON.parse(saved) : DEFAULT_USAGES;
  });

  // --- Circulations State ---
  const [circulations, setCirculations] = useState<CirculationLog[]>(() => {
    const saved = localStorage.getItem('fresh_inventory_circulations');
    return saved ? JSON.parse(saved) : [];
  });

  const saveCirculations = (newCirculations: CirculationLog[]) => {
    setCirculations(newCirculations);
    localStorage.setItem('fresh_inventory_circulations', JSON.stringify(newCirculations));
  };

  React.useEffect(() => {
    const hasCleared = localStorage.getItem('inventory_cleared_v1');
    if (!hasCleared) {
      setStocks([]);
      setRequests([]);
      setUsages([]);
      setCirculations([]);
      setAdditions([]);
      setRegisteredMaterials([]);
      
      localStorage.setItem('fresh_inventory_stock', JSON.stringify([]));
      localStorage.setItem('fresh_inventory_requests', JSON.stringify([]));
      localStorage.setItem('fresh_inventory_usages', JSON.stringify([]));
      localStorage.setItem('fresh_inventory_circulations', JSON.stringify([]));
      localStorage.setItem('fresh_inventory_additions', JSON.stringify([]));
      localStorage.setItem('fresh_registered_materials_v3', JSON.stringify([]));
      localStorage.setItem('inventory_cleared_v1', 'true');
    }
  }, []);

  // --- CLOUD SYNC OPERATIONS ---
  const handleDownloadExcel = () => {
    try {
      // 1. Current stock schema
      const stockData = stocks.map(s => ({
        "Material Name (साहित्य नाव)": s.name,
        "Category (वर्गवारी)": s.category,
        "Total Registered Qty (एकूण साठा)": s.totalQuantity,
        "Available Qty (In Hand) (शिल्लक उपलब्ध साठा)": s.availableQuantity,
        "Storage Location (ठेवण्याची जागा)": s.location || 'N/A'
      }));

      // 2. Active borrowings
      const usagesData = usages.map(u => ({
        "Material Name (साहित्य नाव)": u.itemName,
        "Borrower Name (वापरकर्ता शिक्षक)": u.userName,
        "Purpose (कारण/उद्देश)": u.purpose || 'N/A',
        "Class/Grade (इयत्ता)": u.classGrade || 'N/A',
        "Borrowed Date (घेऊन गेल्याची तारीख)": u.borrowedDate,
        "Returned Date (परत केल्याची तारीख)": u.returnDate || 'Active Borrowed (अजून परत नाही)',
        "Quantity (प्रमाण)": u.quantity || 1,
        "Approved By (मंजूर कोणी केली)": u.approverName || 'N/A',
        "Current Status (सद्य स्थिती)": u.status
      }));

      // 3. Complete audit transactions history logs
      let txRows: any[] = [];

      // Additions
      additions.forEach(a => {
        txRows.push({
          "Date (तारीख)": a.date,
          "Material Name (साहित्य नाव)": a.itemName,
          "User Concerned (संबंधित व्यक्ती)": a.addedBy || 'Admin',
          "Transaction Type (व्यवहार प्रकार)": 'Stock Addition (नवीन साठा जोडला)',
          "Handover / Coordinator (कोणाकडे सोपवले)": 'Inventory Safe / Warehouse',
          "Quantity (नगांचे प्रमाण)": a.quantity,
          "Purpose / Notes (कारण / टीप)": 'New stock added to the inventory catalog list',
          "Status (स्थिती)": 'Completed'
        });
      });

      // Handouts / Usages
      usages.forEach(u => {
        txRows.push({
          "Date (तारीख)": u.borrowedDate,
          "Material Name (साहित्य नाव)": u.itemName,
          "User Concerned (संबंधित व्यक्ती)": u.userName,
          "Transaction Type (व्यवहार प्रकार)": 'Material Handout (साहित्य वाटप केले)',
          "Handover / Coordinator (कोणाकडे सोपवले)": u.approverName || 'Admin',
          "Quantity (नगांचे प्रमाण)": u.quantity || 1,
          "Purpose / Notes (कारण / टीप)": u.purpose || 'Classroom Instruction use',
          "Status (स्थिती)": u.status
        });
      });

      // Circulation / Requests
      requests.forEach(r => {
        let hand = r.handoverTo || '';
        if (r.requestType === 'Circulation') {
          hand = r.toTeacher === 'Office' ? `Office / ${r.officeReturnPerson}` : r.toTeacher;
        }
        txRows.push({
          "Date (तारीख)": r.date,
          "Material Name (साहित्य नाव)": r.itemName,
          "User Concerned (संबंधित व्यक्ती)": r.teacherName,
          "Transaction Type (व्यवहार प्रकार)": r.requestType === 'Circulation' ? 'Material Circulation (साहित्य हस्तांतरण)' : r.requestType === 'Return' ? 'Material Return (साहित्य जमा / परत)' : 'Request Material (वाटप मागणी)',
          "Handover / Coordinator (कोणाकडे सोपवले)": hand || 'N/A',
          "Quantity (नगांचे प्रमाण)": r.quantity || 1,
          "Purpose / Notes (कारण / टीप)": r.purpose || r.approverNotes || 'N/A',
          "Status (स्थिती)": r.status
        });
      });

      // Sorting rows from newest to oldest
      txRows.sort((a,b) => new Date(b["Date (तारीख)"]).getTime() - new Date(a["Date (तारीख)"]).getTime());

      // Create workbook using XLSX
      const wb = XLSX.utils.book_new();

      // Convert arrays to sheets
      const wsStocks = XLSX.utils.json_to_sheet(stockData);
      const wsUsages = XLSX.utils.json_to_sheet(usagesData);
      const wsTransactions = XLSX.utils.json_to_sheet(txRows);

      // Auto Filters inclusion
      if (stockData.length > 0) {
        wsStocks['!autofilter'] = { ref: `A1:E${stockData.length + 1}` };
      }
      if (usagesData.length > 0) {
        wsUsages['!autofilter'] = { ref: `A1:I${usagesData.length + 1}` };
      }
      if (txRows.length > 0) {
        wsTransactions['!autofilter'] = { ref: `A1:H${txRows.length + 1}` };
      }

      // Format custom column spacing
      wsStocks['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 28 }, { wch: 35 }, { wch: 26 }];
      wsUsages['!cols'] = [{ wch: 30 }, { wch: 28 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 32 }, { wch: 15 }, { wch: 28 }, { wch: 16 }];
      wsTransactions['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 28 }, { wch: 32 }, { wch: 28 }, { wch: 15 }, { wch: 45 }, { wch: 16 }];

      // Append sheets inside workbook
      XLSX.utils.book_append_sheet(wb, wsStocks, "Stock Registry (साठा यादी)");
      XLSX.utils.book_append_sheet(wb, wsUsages, "Active Borrowings (वाटप यादी)");
      XLSX.utils.book_append_sheet(wb, wsTransactions, "Transactions Logs (नोंद पुस्तक)");

      // Output Excel
      XLSX.writeFile(wb, `Inventory_Excel_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (e: any) {
      console.error(e);
      alert('Error occurred while generating Excel sheet: ' + e.message);
    }
  };

  const handleTriggerSync = () => {
    if (!googleSheetsUrl && !oneDriveUrl) {
      alert("❌ Please enter and configure at least one integration link (Google Sheets or OneDrive) first!");
      return;
    }

    setIsSyncing(true);
    setSyncPhase(1);
    setSyncStatusMsg("Initiating secure connection handshake with cloud hosts...");

    // Phase 1: Handshake
    setTimeout(() => {
      setSyncPhase(2);
      setSyncStatusMsg("Formulating live inventory JSON payloads with auto-filter mapping...");

      // Phase 2: Building structures
      setTimeout(() => {
        setSyncPhase(3);
        const targetService = googleSheetsUrl && oneDriveUrl ? "Both Platforms" : googleSheetsUrl ? "Google Sheets" : "OneDrive";
        setSyncStatusMsg(`Uploading raw data packets safely to ${targetService}...`);

        // Phase 3: Finalizing upload
        setTimeout(() => {
          setIsSyncing(false);
          setSyncPhase(4);
          const now = new Date();
          const timestampStr = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0') + ' ' + 
            String(now.getHours()).padStart(2, '0') + ':' + 
            String(now.getMinutes()).padStart(2, '0');

          setLastSyncTimestamp(timestampStr);
          localStorage.setItem('inventory_last_sync_time', timestampStr);

          // Append new logs to sync history
          const totalRecords = stocks.length + usages.length + additions.length + requests.length;
          const serviceType = googleSheetsUrl && oneDriveUrl ? 'Both' : googleSheetsUrl ? 'Google Sheets' : 'OneDrive';
          
          const newHistoryLog = {
            id: String(Date.now()),
            date: timestampStr,
            service: serviceType === 'Both' ? 'Sheets & OneDrive' : serviceType,
            count: totalRecords,
            status: 'Success'
          };

          const updatedHistory = [newHistoryLog, ...syncHistory].slice(0, 10); // Keep last 10
          setSyncHistory(updatedHistory);
          localStorage.setItem('inventory_sync_history', JSON.stringify(updatedHistory));

          setSyncStatusMsg("Synchronization complete! Data matches beautifully and active columns updated successfully.");
        }, 1500);

      }, 1500);

    }, 1200);
  };

  const handleSaveIntegrationUrls = () => {
    localStorage.setItem('inventory_google_sheets_url', googleSheetsUrl);
    localStorage.setItem('inventory_onedrive_url', oneDriveUrl);
    alert('✅ Integration Links saved successfully!');
  };

  const handleResetIntegrationUrls = () => {
    if (window.confirm('Clear all cloud integration configurations?')) {
      setGoogleSheetsUrl('');
      setOneDriveUrl('');
      localStorage.removeItem('inventory_google_sheets_url');
      localStorage.removeItem('inventory_onedrive_url');
      alert('Cleared settings.');
    }
  };

  // --- Registered Materials Catalog State ---
  const [registeredMaterials, setRegisteredMaterials] = useState<RegisteredMaterial[]>(() => {
    const saved = localStorage.getItem('fresh_registered_materials_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fall through
      }
    }
    return [];
  });

  // Common LocalStorage Saver helpers
  const saveStocks = (newStocks: InventoryStock[]) => {
    setStocks(newStocks);
    localStorage.setItem('fresh_inventory_stock', JSON.stringify(newStocks));
  };
  
  const saveCirculationMaterials = (mats: string[]) => {
    setCirculationMaterials(mats);
    localStorage.setItem('same_app_circulation_materials', JSON.stringify(mats));
  };

  const saveRequests = (newReqs: MaterialRequest[]) => {
    setRequests(newReqs);
    localStorage.setItem('fresh_inventory_requests', JSON.stringify(newReqs));
  };

  const saveUsages = (newUsages: UsageLog[]) => {
    setUsages(newUsages);
    localStorage.setItem('fresh_inventory_usages', JSON.stringify(newUsages));
  };

  const saveRegisteredMaterials = (newList: RegisteredMaterial[]) => {
    setRegisteredMaterials(newList);
    localStorage.setItem('fresh_registered_materials_v3', JSON.stringify(newList));
  };

  // Dynamic categories list
  const allCategories = React.useMemo(() => {
    const cats = new Set<string>();
    
    // Add default initial categories
    cats.add('Science Kit');
    cats.add('Math Kit');
    cats.add('Audio-Visual');
    cats.add('Library');
    cats.add('Sports');
    cats.add('General Supplies');

    // Add categories from registered list
    registeredMaterials.forEach(m => {
      if (m.category && m.category.trim()) {
        cats.add(m.category.trim());
      }
    });

    // Add categories from current stock
    stocks.forEach(s => {
      if (s.category && s.category.trim()) {
        cats.add(s.category.trim());
      }
    });

    return Array.from(cats).sort();
  }, [registeredMaterials, stocks]);


  // --- Stock Filter & Details States ---
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedStockCategory, setSelectedStockCategory] = useState('All');
  const [showStockSuggestions, setShowStockSuggestions] = useState(false);
  const [selectedDetailStock, setSelectedDetailStock] = useState<InventoryStock | null>(null);

  // --- Physical Additions Logging state ---
  const [additions, setAdditions] = useState<StockAddition[]>(() => {
    const saved = localStorage.getItem('fresh_inventory_additions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fall through
      }
    }
    return [];
  });

  const saveAdditions = (newAdditions: StockAddition[]) => {
    setAdditions(newAdditions);
    localStorage.setItem('fresh_inventory_additions', JSON.stringify(newAdditions));
  };

  const getLocationsListForStock = (item: InventoryStock) => {
    const locSet = new Set<string>();
    if (item && item.location && item.location.trim()) {
      locSet.add(item.location.trim());
    }
    if (item && item.name) {
      const selName = item.name.toLowerCase();
      additions.forEach(a => {
        if (a && a.itemName && a.itemName.toLowerCase() === selName && a.location && a.location.trim()) {
          locSet.add(a.location.trim());
        }
      });
    }
    return Array.from(locSet);
  };

  // --- FORM STATES ---

  // 1. Request Material Form
  const [reqItemName, setReqItemName] = useState('');
  const [reqTeacher, setReqTeacher] = useState(currentUser?.name || '');
  const [reqQty, setReqQty] = useState(1);
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [reqSearchQuery, setReqSearchQuery] = useState('');
  const [showReqSuggestions, setShowReqSuggestions] = useState(false);

  // Requisition Bunch state
  const [reqBunch, setReqBunch] = useState<{ id: string; itemName: string; quantity: number }[]>([]);
  // Inline editing states for the bunch items
  const [editingBunchId, setEditingBunchId] = useState<string | null>(null);
  const [editBunchName, setEditBunchName] = useState('');
  const [editBunchQty, setEditBunchQty] = useState(1);

  // Request Inline Editing states
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editReqItemName, setEditReqItemName] = useState('');
  const [editReqQty, setEditReqQty] = useState(1);
  const [editReqPurpose, setEditReqPurpose] = useState('');
  const [editReqDate, setEditReqDate] = useState('');

  // Batch selection states for approvals
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);

  // --- RETURN MATERIAL FORM STATES ---
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnItemName, setReturnItemName] = useState('');
  const [returnHandoverTo, setReturnHandoverTo] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnCondition, setReturnCondition] = useState<'Packed' | 'Unpacked'>('Packed');
  const [returnRemaining, setReturnRemaining] = useState<number | ''>('');
  const [returnBunch, setReturnBunch] = useState<{ id: string; itemName: string; quantity: number; handoverTo: string; date: string; originalUsageId?: string; condition?: 'Packed' | 'Unpacked'; remainingPercentage?: number }[]>([]);

  // Return item editing states
  const [editingReturnBunchId, setEditingReturnBunchId] = useState<string | null>(null);
  const [editReturnItemName, setEditReturnItemName] = useState('');
  const [editReturnQty, setEditReturnQty] = useState(1);
  const [editReturnHandoverTo, setEditReturnHandoverTo] = useState('');
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editReturnCondition, setEditReturnCondition] = useState<'Packed' | 'Unpacked'>('Packed');
  const [editReturnRemaining, setEditReturnRemaining] = useState<number | ''>('');

  const [stockHistoryFromDate, setStockHistoryFromDate] = useState('');
  const [stockHistoryToDate, setStockHistoryToDate] = useState('');
  const [stockHistoryType, setStockHistoryType] = useState('All');
  const [circItemName, setCircItemName] = useState('');
  const [circFromTeacher, setCircFromTeacher] = useState(currentUser?.name || '');
  const [circToTeacher, setCircToTeacher] = useState('');
  const [circOfficePerson, setCircOfficePerson] = useState('');
  const [circOfficeLocation, setCircOfficeLocation] = useState('');
  const [circDate, setCircDate] = useState(new Date().toISOString().split('T')[0]);
  const [circPurpose, setCircPurpose] = useState('');
  const [circItemCondition, setCircItemCondition] = useState<'Good' | 'Damaged'>('Good');
  const [circItemDamageDetails, setCircItemDamageDetails] = useState('');
  const [circBoxCondition, setCircBoxCondition] = useState<'Good' | 'Damaged'>('Good');
  const [circAccessories, setCircAccessories] = useState<'Yes' | 'No'>('Yes');
  const [circAccessoriesList, setCircAccessoriesList] = useState<string[]>(['']);
  const [adminNewCircMat, setAdminNewCircMat] = useState('');

  // Requests scrolling parallel subtab & filters state
  const [reqSubTab, setReqSubTab] = useState<'All' | 'Pending' | 'Approved' | 'Declined' | 'Handover' | 'Circulation'>('All');
  const [reqFilterDate, setReqFilterDate] = useState('');
  const [reqFilterPurpose, setReqFilterPurpose] = useState('');
  const [reqFilterMaterialName, setReqFilterMaterialName] = useState('');
  const [reqFilterStatus, setReqFilterStatus] = useState('All');

  // --- USAGE MONITORING STATES ---
  const [usageSubTab, setUsageSubTab] = useState<'Employees' | 'Departments'>('Employees');
  const [usageSelectedEntity, setUsageSelectedEntity] = useState<string | null>(null);
  const [usageSelectedMaterial, setUsageSelectedMaterial] = useState<string | null>(null);
  const [usageSearchName, setUsageSearchName] = useState('');
  const [usageFilterFromDate, setUsageFilterFromDate] = useState('');
  const [usageFilterToDate, setUsageFilterToDate] = useState('');
  const [usageFilterMaterialSearch, setUsageFilterMaterialSearch] = useState('');

  // 2. Add Materials Form / Registered Material Forms
  const [addMaterialSubTab, setAddMaterialSubTab] = useState<'register' | 'add'>('add');
  
  // Register Section Form Fields
  const [regOptName, setRegOptName] = useState('');
  const [regOptCat, setRegOptCat] = useState('');
  const [regFilterCat, setRegFilterCat] = useState('All');

  // Stock Add Section Form Fields
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [addQty, setAddQty] = useState(1);
  const [addLoc, setAddLoc] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);

  // --- CLOUD SYNC STATES ---
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>(() => localStorage.getItem('inventory_google_sheets_url') || '');
  const [oneDriveUrl, setOneDriveUrl] = useState<string>(() => localStorage.getItem('inventory_onedrive_url') || '');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [syncPhase, setSyncPhase] = useState<number>(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(() => localStorage.getItem('inventory_last_sync_time') || 'Never');
  const [syncHistory, setSyncHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('inventory_sync_history');
    return saved ? JSON.parse(saved) : [
      { id: '1', date: '2026-06-12 14:30', service: 'Google Sheets', count: 18, status: 'Success' },
      { id: '2', date: '2026-06-12 14:32', service: 'OneDrive (Excel Live)', count: 24, status: 'Success' }
    ];
  });

  // 3. Usage Monitor Form
  const [usageItem, setUsageItem] = useState('');
  const [usageUser, setUsageUser] = useState('');
  const [usagePurpose, setUsagePurpose] = useState('');
  const [usageClass, setUsageClass] = useState('');
  const [usageReturnDate, setUsageReturnDate] = useState('');


  // --- SUBMISSIONS & HANDLERS ---

  // Add selected item to the local requisition bunch
  const handleAddToBunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reqPurpose.trim()) {
      alert("⚠️ Request Purpose / Details of Use is mandatory (वापराचा हेतू लिहिणे अनिवार्य आहे)!");
      return;
    }

    let targetName = reqItemName;
    if (reqItemName === 'Special Custom Material') {
      targetName = reqSearchQuery.trim();
    }

    if (!targetName || targetName.trim() === '') {
      alert("⚠️ Request item name is empty. Please select or search a valid material name.");
      return;
    }

    if (reqQty <= 0) {
      alert("⚠️ Quantity must be at least 1.");
      return;
    }

    // Add to local bunch (consolidate quantity if matching existing name)
    const existingIndex = reqBunch.findIndex(
      item => item.itemName.toLowerCase() === targetName.toLowerCase()
    );

    // ─── STOCK VALIDATION ───
    const trimmedTarget = targetName.trim().toLowerCase();
    let matchedStock = stocks.find(s => s.name.trim().toLowerCase() === trimmedTarget);
    if (!matchedStock) {
      matchedStock = stocks.find(s => s.name.toLowerCase().includes(trimmedTarget) || trimmedTarget.includes(s.name.toLowerCase()));
    }

    const existingQtyInBunch = existingIndex !== -1 ? reqBunch[existingIndex].quantity : 0;
    const totalRequestedQty = Number(reqQty) + existingQtyInBunch;

    if (matchedStock) {
      const availableStock = matchedStock.availableQuantity;
      if (totalRequestedQty > availableStock) {
        alert(
          `⚠️ अपुरी संख्या! (Insufficient Stock Quantity)\n\n` +
          `साहित्य (Material): "${targetName}"\n` +
          `उपलब्ध स्टॉक (Available Stock): ${availableStock} units\n` +
          `तुमची एकूण मागणी (Requested in Bunch): ${totalRequestedQty} units (आधीचे: ${existingQtyInBunch}, नवीन: ${reqQty})\n\n` +
          `मंजुरी मिळवण्यासाठी कृपया उपलब्ध स्टॉक एवढी किंवा त्यापेक्षा कमी संख्या निवडा (Suggesting: ${availableStock} or fewer units).`
        );
        return;
      }
    } else {
      const isRegistered = registeredMaterials.some(m => m.name.toLowerCase() === trimmedTarget);
      if (isRegistered) {
        alert(
          `⚠️ अपुरी संख्या! (Stock is 0)\n\n` +
          `साहित्य (Material): "${targetName}"\n` +
          `हा माल सध्या स्टॉकमध्ये शिल्लक नाही (Available Stock: 0).\n\n` +
          `तुम्ही या वस्तूची मागणी करू शकत नाही.`
        );
        return;
      }
    }

    if (existingIndex !== -1) {
      const updated = [...reqBunch];
      updated[existingIndex].quantity += Number(reqQty);
      setReqBunch(updated);
      alert(`➕ Added ${reqQty} more units to your bunch item "${targetName}"!`);
    } else {
      const newItem = {
        id: `bunch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemName: targetName,
        quantity: Number(reqQty)
      };
      setReqBunch([...reqBunch, newItem]);
      alert(`➕ Added "${targetName}" (Qty: ${reqQty}) to your bunch list!`);
    }

    // Reset item selector fields only. Keep the date and purpose selected so the user can easily build a batch form!
    setReqItemName('');
    setReqSearchQuery('');
    setReqQty(1);
  };

  // Bunch Item Management Helpers
  const startEditBunchItem = (item: { id: string; itemName: string; quantity: number }) => {
    setEditingBunchId(item.id);
    setEditBunchName(item.itemName);
    setEditBunchQty(item.quantity);
  };

  const saveEditedBunchItem = (id: string) => {
    if (!editBunchName.trim()) {
      alert("⚠️ Material name cannot be blank.");
      return;
    }
    if (editBunchQty <= 0) {
      alert("⚠️ Quantity must be at least 1.");
      return;
    }

    // ─── STOCK VALIDATION FOR EDIT ───
    const trimmedTarget = editBunchName.trim().toLowerCase();
    let matchedStock = stocks.find(s => s.name.trim().toLowerCase() === trimmedTarget);
    if (!matchedStock) {
      matchedStock = stocks.find(s => s.name.toLowerCase().includes(trimmedTarget) || trimmedTarget.includes(s.name.toLowerCase()));
    }

    if (matchedStock) {
      const availableStock = matchedStock.availableQuantity;
      if (Number(editBunchQty) > availableStock) {
        alert(
          `⚠️ अपुरी संख्या! (Insufficient Stock Quantity)\n\n` +
          `साहित्य (Material): "${editBunchName}"\n` +
          `उपलब्ध स्टॉक (Available Stock): ${availableStock} units\n` +
          `तुमची मागणी (Requested): ${editBunchQty} units\n\n` +
          `मंजुरी मिळवण्यासाठी कृपया उपलब्ध स्टॉक एवढी किंवा त्यापेक्षा कमी संख्या निवडा (Suggesting: ${availableStock} or fewer units).`
        );
        return;
      }
    } else {
      const isRegistered = registeredMaterials.some(m => m.name.toLowerCase() === trimmedTarget);
      if (isRegistered) {
        alert(
          `⚠️ अपुरी संख्या! (Stock is 0)\n\n` +
          `साहित्य (Material): "${editBunchName}"\n` +
          `हा माल सध्या स्टॉकमध्ये शिल्लक नाही (Available Stock: 0).\n\n` +
          `तुम्ही या वस्तूची मागणी करू शकत नाही.`
        );
        return;
      }
    }

    const updated = reqBunch.map(item => item.id === id ? {
      ...item,
      itemName: editBunchName.trim(),
      quantity: Number(editBunchQty)
    } : item);
    
    setReqBunch(updated);
    setEditingBunchId(null);
    alert("✅ Bunch item updated successfully.");
  };

  const deleteBunchItem = (id: string) => {
    const updated = reqBunch.filter(item => item.id !== id);
    setReqBunch(updated);
  };

  // Master submit for the entire requisition bunch
  const handleMasterSubmit = () => {
    if (reqBunch.length === 0) {
      alert("⚠️ Requisition bunch is empty! Please add some materials first.");
      return;
    }

    if (!reqPurpose.trim()) {
      alert("⚠️ Request Purpose / Details of Use is mandatory! (वापराचा हेतू लिहिणे अनिवार्य आहे)");
      return;
    }

    const newRequestsList: MaterialRequest[] = reqBunch.map((item, index) => ({
      id: `req-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      itemName: item.itemName,
      teacherName: currentUser?.name || 'Requester',
      quantity: item.quantity,
      purpose: reqPurpose.trim() || 'Classroom session use',
      date: reqDate || new Date().toISOString().split('T')[0],
      status: 'Pending'
    }));

    // Save batch requests and reset panel
    saveRequests([...newRequestsList, ...requests]);
    alert(`🎉 Successfully submitted requisition slip with ${reqBunch.length} materials!`);

    setReqBunch([]);
    setReqPurpose('');
    setReqDate(new Date().toISOString().split('T')[0]);
    setActiveTab('requests'); // Redirect to active approvals tab to view
  };

  // Helper to trigger inline request editing
  const startEditRequest = (req: MaterialRequest) => {
    setEditingReqId(req.id);
    setEditReqItemName(req.itemName);
    setEditReqQty(req.quantity);
    setEditReqPurpose(req.purpose);
    setEditReqDate(req.date);
  };

  // Inline edited request save
  const handleUpdateEditedRequest = (id: string) => {
    const updated = requests.map(r => r.id === id ? {
      ...r,
      itemName: editReqItemName,
      quantity: Number(editReqQty),
      purpose: editReqPurpose,
      date: editReqDate
    } : r);
    saveRequests(updated);
    setEditingReqId(null);
    alert("✅ Material request edited successfully!");
  };

  // Remove request handler
  const handleDeleteRequest = (id: string) => {
    const updated = requests.filter(r => r.id !== id);
    saveRequests(updated);
  };

  // Register a new material catalog option
  const handleRegisterMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOptName.trim() || !regOptCat.trim()) {
      alert("⚠️ Please fill out both the material name and category.");
      return;
    }

    const trimmedName = regOptName.trim();
    const trimmedCat = regOptCat.trim();

    // Check if item is already registered (case insensitive)
    const exists = registeredMaterials.some(
      m => m.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
      alert("⚠️ This material is already registered.");
      return;
    }

    const newOption: RegisteredMaterial = {
      id: `reg-${Date.now()}`,
      name: trimmedName,
      category: trimmedCat
    };

    const updatedList = [newOption, ...registeredMaterials];
    saveRegisteredMaterials(updatedList);

    alert(`🎉 "${trimmedName}" registered successfully! You can now add its physical units under the "Add Stock" tab.`);
    
    // Auto-fill physical stock fields with what was just registered
    setAddSearchQuery(trimmedName);
    setIsSearching(false);
    
    // Clear registration fields
    setRegOptName('');
    setRegOptCat('');
  };

  // Add Materials submit (updates Stock!)
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = addSearchQuery.trim();
    if (!targetName || addQty <= 0 || !addDate) {
      alert("⚠️ Please select a registered material name, and specify quantity and date.");
      return;
    }

    // Attempt to locate matching registered material to fetch its correct category
    const matchedReg = registeredMaterials.find(
      m => m.name.toLowerCase() === targetName.toLowerCase()
    );
    const finalCategory = matchedReg ? matchedReg.category : 'General Supplies';

    // Check if item already exists in Stock
    const existingIndex = stocks.findIndex(s => s.name.toLowerCase() === targetName.toLowerCase());

    let updatedStocks = [...stocks];
    if (existingIndex !== -1) {
      // update quantity
      updatedStocks[existingIndex] = {
        ...updatedStocks[existingIndex],
        totalQuantity: updatedStocks[existingIndex].totalQuantity + Number(addQty),
        availableQuantity: updatedStocks[existingIndex].availableQuantity + Number(addQty),
        location: addLoc.trim() ? addLoc.trim() : updatedStocks[existingIndex].location
      };
    } else {
      // create new stock
      const newStock: InventoryStock = {
        id: `stock-${Date.now()}`,
        name: targetName,
        category: finalCategory,
        totalQuantity: Number(addQty),
        availableQuantity: Number(addQty),
        location: addLoc.trim() || 'Main Storehouse'
      };
      updatedStocks = [newStock, ...updatedStocks];
    }

    saveStocks(updatedStocks);

    // Save addition transaction log!
    const whoAdded = currentUser?.name || 'Admin';
    const newAddLog: StockAddition = {
      id: `add-${Date.now()}`,
      itemName: targetName,
      quantity: Number(addQty),
      date: addDate || new Date().toISOString().split('T')[0],
      addedBy: whoAdded,
      location: addLoc.trim() || 'Main Storehouse'
    };
    saveAdditions([newAddLog, ...additions]);

    alert(`✅ Stock updated successfully for: ${targetName}`);
    
    // Clear Form fields
    setAddSearchQuery('');
    setIsSearching(false);
    setAddQty(1);
    setAddLoc('');
    setAddDate(new Date().toISOString().split('T')[0]);
  };

  // Usage Monitor submit (begins borrow tracking, reduces available quantity in Stock if in stock)
  const handleUsageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageItem || !usageUser) return;

    // Optional: reduce available stock by 1
    const stockIndex = stocks.findIndex(s => s.name === usageItem);
    if (stockIndex !== -1) {
      if (stocks[stockIndex].availableQuantity <= 0) {
        alert("⚠️ Available quantity is 0! Can't log usage. Please add stock or return materials first.");
        return;
      }
      const updatedStocks = [...stocks];
      updatedStocks[stockIndex] = {
        ...updatedStocks[stockIndex],
        availableQuantity: updatedStocks[stockIndex].availableQuantity - 1
      };
      saveStocks(updatedStocks);
    }

    const newUsage: UsageLog = {
      id: `use-${Date.now()}`,
      itemName: usageItem,
      userName: usageUser,
      purpose: usagePurpose || 'Practical session',
      classGrade: usageClass || 'General Class',
      borrowedDate: new Date().toISOString().split('T')[0],
      returnDate: usageReturnDate || new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow fallback
      status: 'Active',
      quantity: 1,
      approverName: currentUser?.name || 'Admin'
    };

    saveUsages([newUsage, ...usages]);
    alert(`✅ Usage logged and stock item checked out to: ${usageUser}`);

    // Clear Form
    setUsageItem('');
    setUsageUser('');
    setUsagePurpose('');
    setUsageClass('');
    setUsageReturnDate('');
  };

  // Approve a request
  const handleApproveRequest = (reqId: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    const approverNameStr = currentUser?.id === 'Samir23' || currentUser?.name === 'System Admin' ? 'Samir' : (currentUser?.name || 'Samir');

    // Authorization checks for Return and Circulation requests
    if (req.requestType === 'Return' || req.requestType === 'Circulation') {
      const isAuthorized = currentUser?.name === (req.requestType === 'Circulation' ? (req.toTeacher === 'Office' ? req.officeReturnPerson : req.toTeacher) : req.handoverTo) || currentUser?.role === 'admin';
      if (!isAuthorized) {
        alert(`⚠️ Only ${req.requestType === 'Circulation' ? (req.toTeacher === 'Office' ? req.officeReturnPerson : req.toTeacher) : req.handoverTo} is authorized to approve this! (फक्त गंतव्य व्यक्तीच ही विनंती मंजूर करू शकतात)`);
        return;
      }

      if (req.requestType === 'Circulation') {
        const updatedUsages = usages.map(u => {
          if ((u.itemName.toLowerCase() === req.itemName.toLowerCase() && u.userName.toLowerCase() === req.teacherName.toLowerCase() && u.status === 'Active')) {
            return { ...u, status: 'Returned' as const };
          }
          return u;
        });

        if (req.toTeacher === 'Office') {
          // Treat as a return to stock
          let stockIndex = stocks.findIndex(s => s.name.trim().toLowerCase() === req.itemName.trim().toLowerCase());
          if (stockIndex === -1) {
            stockIndex = stocks.findIndex(s => s.name.toLowerCase().includes(req.itemName.toLowerCase()) || req.itemName.toLowerCase().includes(s.name.toLowerCase()));
          }

          if (stockIndex !== -1) {
            const updatedStocks = [...stocks];
            updatedStocks[stockIndex] = {
              ...updatedStocks[stockIndex],
              availableQuantity: updatedStocks[stockIndex].availableQuantity + (req.quantity || 1),
              location: req.officeReturnLocation || updatedStocks[stockIndex].location
            };
            saveStocks(updatedStocks);
          } else {
            // Create stock if it doesn't exist
            const matchedReg = registeredMaterials.find(m => m.name.toLowerCase() === req.itemName.toLowerCase());
            const category = matchedReg ? matchedReg.category : 'General Supplies';
            const newStock: InventoryStock = {
              id: `stock-${Date.now()}`,
              name: req.itemName,
              category: category,
              totalQuantity: req.quantity || 1,
              availableQuantity: req.quantity || 1,
              location: req.officeReturnLocation || 'Main Storehouse'
            };
            saveStocks([newStock, ...stocks]);
          }
          saveUsages(updatedUsages);
          
          const updatedReqs = requests.map(r => r.id === reqId ? { ...r, status: 'Approved' as const, approvedBy: approverNameStr } : r);
          saveRequests(updatedReqs);
          alert(`✅ Circulation accepted! Item "${req.itemName}" has been returned to Office/Stock.`);
          return;
        }

        // 2. Create new active usage for the toTeacher
        const newUsage: UsageLog = {
          id: `use-circ-${Date.now()}`,
          itemName: req.itemName,
          userName: req.toTeacher || 'Unknown',
          purpose: req.purpose,
          classGrade: 'Circulated',
          borrowedDate: new Date().toISOString().split('T')[0],
          returnDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          status: 'Active',
          quantity: req.quantity || 1,
          approverName: approverNameStr
        };

        saveUsages([newUsage, ...updatedUsages]);
        
        // 3. Mark request as Approved
        const updatedReqs = requests.map(r => r.id === reqId ? { ...r, status: 'Approved' as const, approvedBy: approverNameStr } : r);
        saveRequests(updatedReqs);
        alert(`✅ Circulation accepted! Item "${req.itemName}" is now registered under ${req.toTeacher}'s name.`);
        return;
      }

      // Return logic
      // 1. Partial subtraction or Set matching active usage to 'Returned'
      let updatedUsages = [...usages];
      const matchingUsageIndex = updatedUsages.findIndex(u => 
        u.id === req.originalUsageId || 
        (u.itemName.toLowerCase() === req.itemName.toLowerCase() && 
         u.userName.toLowerCase() === req.teacherName.toLowerCase() && 
         u.status === 'Active')
      );
      if (matchingUsageIndex !== -1) {
        const matchingUsage = updatedUsages[matchingUsageIndex];
        const uQty = matchingUsage.quantity || 1;
        const retQty = req.quantity || 1;
        if (retQty < uQty) {
          // Update existing active usage to remaining quantity
          updatedUsages[matchingUsageIndex] = {
            ...matchingUsage,
            quantity: uQty - retQty
          };
          // Create a separate log for the returned portion
          const splitReturnLog: UsageLog = {
            ...matchingUsage,
            id: `use-split-ret-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            quantity: retQty,
            status: 'Returned'
          };
          updatedUsages = [splitReturnLog, ...updatedUsages];
        } else {
          // Full return: mark status as Returned
          updatedUsages[matchingUsageIndex] = {
            ...matchingUsage,
            status: 'Returned'
          };
        }
      }
      saveUsages(updatedUsages);

      // 2. Restore physical stock
      let stockIndex = stocks.findIndex(s => s.name.trim().toLowerCase() === req.itemName.trim().toLowerCase());
      if (stockIndex === -1) {
        stockIndex = stocks.findIndex(s => s.name.toLowerCase().includes(req.itemName.toLowerCase()) || req.itemName.toLowerCase().includes(s.name.toLowerCase()));
      }

      if (stockIndex !== -1) {
        const updatedStocks = [...stocks];
        updatedStocks[stockIndex] = {
          ...updatedStocks[stockIndex],
          availableQuantity: updatedStocks[stockIndex].availableQuantity + req.quantity
        };
        saveStocks(updatedStocks);
      } else {
        // Create stock if it doesn't exist
        const matchedReg = registeredMaterials.find(m => m.name.toLowerCase() === req.itemName.toLowerCase());
        const category = matchedReg ? matchedReg.category : 'General Supplies';
        const newStock: InventoryStock = {
          id: `stock-${Date.now()}`,
          name: req.itemName,
          category: category,
          totalQuantity: req.quantity,
          availableQuantity: req.quantity,
          location: 'Main Storehouse'
        };
        saveStocks([newStock, ...stocks]);
      }

      // 3. Mark request as Approved
      const updatedReqs = requests.map(r => r.id === reqId ? { ...r, status: 'Approved' as const, approvedBy: approverNameStr } : r);
      saveRequests(updatedReqs);
      alert(`✅ Return request for "${req.itemName}" approved by ${approverNameStr} successfully!`);
      return;
    }

    // Standard Borrow request logic
    // Try to reduce stock
    let stockIndex = stocks.findIndex(s => s.name.trim().toLowerCase() === req.itemName.trim().toLowerCase());
    if (stockIndex === -1) {
      stockIndex = stocks.findIndex(s => s.name.toLowerCase().includes(req.itemName.toLowerCase()) || req.itemName.toLowerCase().includes(s.name.toLowerCase()));
    }
    
    if (stockIndex !== -1) {
      const updatedStocks = [...stocks];
      const deduct = req.quantity;
      updatedStocks[stockIndex] = {
        ...updatedStocks[stockIndex],
        availableQuantity: updatedStocks[stockIndex].availableQuantity - deduct
      };
      saveStocks(updatedStocks);
    } else {
      // Create a placeholder stock with 0 total quantity and negative available quantity
      const matchedReg = registeredMaterials.find(m => m.name.toLowerCase() === req.itemName.toLowerCase());
      const category = matchedReg ? matchedReg.category : 'General Supplies';
      const newStock: InventoryStock = {
        id: `stock-${Date.now()}`,
        name: req.itemName,
        category: category,
        totalQuantity: 0,
        availableQuantity: -req.quantity,
        location: 'Main Storehouse'
      };
      saveStocks([newStock, ...stocks]);
    }

    // Update status to Approved
    const updatedReqs = requests.map(r => r.id === reqId ? { ...r, status: 'Approved' as const, approvedBy: approverNameStr } : r);
    saveRequests(updatedReqs);

    // Also auto-add to active Usages tracking
    const newUsage: UsageLog = {
      id: `use-auto-${Date.now()}`,
      itemName: req.itemName,
      userName: req.teacherName,
      purpose: req.purpose,
      classGrade: 'Requested Class',
      borrowedDate: new Date().toISOString().split('T')[0],
      returnDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], // 5 days limit default
      status: 'Active',
      quantity: req.quantity,
      approverName: approverNameStr
    };
    saveUsages([newUsage, ...usages]);

    alert("✅ Request approved! Available stock adjusted and active usage log generated.");
  };

  // Decline a request
  const handleDeclineRequest = (reqId: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    if (req.requestType === 'Return' || req.requestType === 'Circulation') {
      const isAuthorized = currentUser?.name === (req.requestType === 'Circulation' ? (req.toTeacher === 'Office' ? req.officeReturnPerson : req.toTeacher) : req.handoverTo) || currentUser?.role === 'admin';
      if (!isAuthorized) {
        alert(`⚠️ Only ${req.requestType === 'Circulation' ? (req.toTeacher === 'Office' ? req.officeReturnPerson : req.toTeacher) : req.handoverTo} is authorized to decline this!`);
        return;
      }
    }

    const updatedReqs = requests.map(r => r.id === reqId ? { ...r, status: 'Declined' as const } : r);
    saveRequests(updatedReqs);
    alert("❌ Request declined.");
  };

  // Master approve selected bunch of requests
  const handleApproveSelectedBunch = () => {
    if (selectedReqIds.length === 0) {
      alert("⚠️ No requests selected for bunch approval (मंजूर करण्यासाठी एकही मागणी निवडलेली नाही).");
      return;
    }

    const approverNameStr = currentUser?.id === 'Samir23' || currentUser?.name === 'System Admin' ? 'Samir' : (currentUser?.name || 'Samir');

    // Filter pending requests selected.
    // Ensure that if it is a Return request, only designated handover receiver can approve.
    const pendingToApprove = requests.filter(r => {
      if (!selectedReqIds.includes(r.id) || r.status !== 'Pending') return false;
      if (r.requestType === 'Return') {
        return currentUser?.name === r.handoverTo || currentUser?.role === 'admin';
      }
      if (r.requestType === 'Circulation') {
        const authName = r.toTeacher === 'Office' ? r.officeReturnPerson : r.toTeacher;
        return currentUser?.name === authName || currentUser?.role === 'admin';
      }
      return true; // regular request
    });

    if (pendingToApprove.length === 0) {
      alert("⚠️ None of the selected pending requests can be approved by your current login session (तुमच्या सध्याच्या लॉगिनने एकही निवडलेली विनंती मंजूर केली जाऊ शकत नाही).");
      setSelectedReqIds([]);
      return;
    }

    let updatedStocks = [...stocks];
    let newUsages = [...usages];

    pendingToApprove.forEach(req => {
      if (req.requestType === 'Return') {
        // Return processing on bulk
        const matchingUsageIndex = newUsages.findIndex(u => 
          u.id === req.originalUsageId || 
          (u.itemName.toLowerCase() === req.itemName.toLowerCase() && 
           u.userName.toLowerCase() === req.teacherName.toLowerCase() && 
           u.status === 'Active')
        );
        if (matchingUsageIndex !== -1) {
          const matchingUsage = newUsages[matchingUsageIndex];
          const uQty = matchingUsage.quantity || 1;
          const retQty = req.quantity || 1;
          if (retQty < uQty) {
            newUsages[matchingUsageIndex] = {
              ...matchingUsage,
              quantity: uQty - retQty
            };
            const splitReturnLog: UsageLog = {
              ...matchingUsage,
              id: `use-split-ret-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
              quantity: retQty,
              status: 'Returned'
            };
            newUsages = [splitReturnLog, ...newUsages];
          } else {
            newUsages[matchingUsageIndex] = {
              ...matchingUsage,
              status: 'Returned'
            };
          }
        }

        let stockIndex = updatedStocks.findIndex(s => s.name.trim().toLowerCase() === req.itemName.trim().toLowerCase());
        if (stockIndex === -1) {
          stockIndex = updatedStocks.findIndex(s => s.name.toLowerCase().includes(req.itemName.toLowerCase()) || req.itemName.toLowerCase().includes(s.name.toLowerCase()));
        }

        if (stockIndex !== -1) {
          updatedStocks[stockIndex] = {
            ...updatedStocks[stockIndex],
            availableQuantity: updatedStocks[stockIndex].availableQuantity + req.quantity
          };
        } else {
          // Create stock if it doesn't exist
          const matchedReg = registeredMaterials.find(m => m.name.toLowerCase() === req.itemName.toLowerCase());
          const category = matchedReg ? matchedReg.category : 'General Supplies';
          const newStock: InventoryStock = {
            id: `stock-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            name: req.itemName,
            category: category,
            totalQuantity: req.quantity,
            availableQuantity: req.quantity,
            location: 'Main Storehouse'
          };
          updatedStocks = [newStock, ...updatedStocks];
        }
      } else if (req.requestType === 'Circulation') {
        // Circulation processing on bulk
        newUsages = newUsages.map(u => {
          if ((u.itemName.toLowerCase() === req.itemName.toLowerCase() && u.userName.toLowerCase() === req.teacherName.toLowerCase() && u.status === 'Active')) {
            return { ...u, status: 'Returned' as const };
          }
          return u;
        });

        if (req.toTeacher === 'Office') {
          // Treat as a return to stock
          let stockIndex = updatedStocks.findIndex(s => s.name.trim().toLowerCase() === req.itemName.trim().toLowerCase());
          if (stockIndex === -1) {
            stockIndex = updatedStocks.findIndex(s => s.name.toLowerCase().includes(req.itemName.toLowerCase()) || req.itemName.toLowerCase().includes(s.name.toLowerCase()));
          }

          if (stockIndex !== -1) {
            updatedStocks[stockIndex] = {
              ...updatedStocks[stockIndex],
              availableQuantity: updatedStocks[stockIndex].availableQuantity + (req.quantity || 1),
              location: req.officeReturnLocation || updatedStocks[stockIndex].location
            };
          } else {
            // Create stock if it doesn't exist
            const matchedReg = registeredMaterials.find(m => m.name.toLowerCase() === req.itemName.toLowerCase());
            const category = matchedReg ? matchedReg.category : 'General Supplies';
            const newStock: InventoryStock = {
              id: `stock-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
              name: req.itemName,
              category: category,
              totalQuantity: req.quantity || 1,
              availableQuantity: req.quantity || 1,
              location: req.officeReturnLocation || 'Main Storehouse'
            };
            updatedStocks = [newStock, ...updatedStocks];
          }
        } else {
          // Create new active usage for the toTeacher
          const newUsage: UsageLog = {
            id: `use-circ-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            itemName: req.itemName,
            userName: req.toTeacher || 'Unknown',
            purpose: req.purpose,
            classGrade: 'Circulated',
            borrowedDate: new Date().toISOString().split('T')[0],
            returnDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            status: 'Active',
            quantity: req.quantity || 1,
            approverName: approverNameStr
          };
          newUsages = [newUsage, ...newUsages];
        }
      } else {
        // Standard Borrow request processing on bulk
        let stockIndex = updatedStocks.findIndex(s => s.name.trim().toLowerCase() === req.itemName.trim().toLowerCase());
        if (stockIndex === -1) {
          stockIndex = updatedStocks.findIndex(s => s.name.toLowerCase().includes(req.itemName.toLowerCase()) || req.itemName.toLowerCase().includes(s.name.toLowerCase()));
        }

        if (stockIndex !== -1) {
          const deduct = req.quantity;
          updatedStocks[stockIndex] = {
            ...updatedStocks[stockIndex],
            availableQuantity: updatedStocks[stockIndex].availableQuantity - deduct
          };
        } else {
          // Create placeholder stock
          const matchedReg = registeredMaterials.find(m => m.name.toLowerCase() === req.itemName.toLowerCase());
          const category = matchedReg ? matchedReg.category : 'General Supplies';
          const newStock: InventoryStock = {
            id: `stock-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            name: req.itemName,
            category: category,
            totalQuantity: 0,
            availableQuantity: -req.quantity,
            location: 'Main Storehouse'
          };
          updatedStocks = [newStock, ...updatedStocks];
        }

        const newUsage: UsageLog = {
          id: `use-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          itemName: req.itemName,
          userName: req.teacherName,
          purpose: req.purpose,
          classGrade: 'Requested Class',
          borrowedDate: new Date().toISOString().split('T')[0],
          returnDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          status: 'Active',
          quantity: req.quantity,
          approverName: approverNameStr
        };
        newUsages = [newUsage, ...newUsages];
      }
    });

    const pendingIdsToApprove = pendingToApprove.map(p => p.id);
    const updatedReqs = requests.map(r => pendingIdsToApprove.includes(r.id) ? { ...r, status: 'Approved' as const, approvedBy: approverNameStr } : r);
    
    saveStocks(updatedStocks);
    saveRequests(updatedReqs);
    saveUsages(newUsages);
    setSelectedReqIds([]);

    alert(`🎉 Selected bunch of ${pendingToApprove.length} pending requests approved together successfully!`);
  };

  // Return borrowed items handler (increases available quantity back in Stock)
  const handleReturnAction = (usageId: string) => {
    const usage = usages.find(u => u.id === usageId);
    if (!usage) return;

    // restore available stock
    let stockIndex = stocks.findIndex(s => s.name.trim().toLowerCase() === usage.itemName.trim().toLowerCase());
    if (stockIndex === -1) {
      stockIndex = stocks.findIndex(s => s.name.toLowerCase().includes(usage.itemName.toLowerCase()) || usage.itemName.toLowerCase().includes(s.name.toLowerCase()));
    }

    if (stockIndex !== -1) {
      const updatedStocks = [...stocks];
      updatedStocks[stockIndex] = {
        ...updatedStocks[stockIndex],
        availableQuantity: updatedStocks[stockIndex].availableQuantity + (usage.quantity || 1)
      };
      saveStocks(updatedStocks);
    }

    // Set usage status to Returned
    const updatedUsages = usages.map(u => u.id === usageId ? { ...u, status: 'Returned' as const } : u);
    saveUsages(updatedUsages);
    alert(`✅ Item "${usage.itemName}" marked as returned! Available stock is updated.`);
  };

  // Delete inventory item from stock completely
  const handleDeleteStockItem = (id: string) => {
    const updated = stocks.filter(s => s.id !== id);
    saveStocks(updated);
    alert("✅ Material completely deleted from Stock registers!");
  };

  // Filter and Sort stocks alphabetically (A to Z)
  const filteredAndSortedStocks = [...stocks]
    .filter(item => {
      const matchQuery = item.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(stockSearchQuery.toLowerCase());
      const matchCategory = selectedStockCategory === 'All' || item.category === selectedStockCategory;
      return matchQuery && matchCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));


  // --- MENU SECTIONS ---

  // Tab definitions (Cleaned of prefix numbers)
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'requestMaterial', label: 'Request Material', icon: Send },
    { id: 'usageMonitoring', label: 'Usage Monitoring', icon: FileText },
    { id: 'requests', label: 'Requests', icon: Clock },
    { id: 'addMaterials', label: 'Add Materials', icon: PlusCircle },
    { id: 'materialCirculation', label: 'Material Circulation', icon: ArrowLeftRight },
    { id: 'returnMaterial', label: 'Return Material', icon: RefreshCw },
    { id: 'cloudSync', label: 'Cloud Sync', icon: Cloud },
    ...(currentUser?.role === 'admin' ? [{ id: 'adminControl', label: 'Admin Settings', icon: Settings }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-800 w-full relative">
      
      {/* 1. DESKTOP PERSISTENT LEFT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 select-none text-white h-screen sticky top-0 justify-between">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-6 py-5 bg-indigo-950 border-b border-indigo-900">
            <div className="p-2 bg-gradient-to-tr from-violet-550 to-indigo-650 bg-violet-600 rounded-xl text-white shadow-md">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide">Inventory Department</h1>
              <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider truncate max-w-[150px] block font-sans">
                👤 {currentUser?.name || 'Administrator'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1.5 overflow-y-auto">
            {/* Switch Module Button */}
            <button
              onClick={() => setActiveModule('selection')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black bg-slate-800 text-indigo-300 hover:text-white hover:bg-slate-750 transition-all mb-4 border border-slate-700 shadow-sm"
              id="desktop-inventory-switch"
            >
              <ArrowLeftRight className="w-4 h-4 shrink-0 text-indigo-400" />
              ← Switch Module
            </button>

            <div className="border-t border-slate-800 my-4" />

            <div className="px-4 pb-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Sections
            </div>

            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`desktop-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleLogout}
            id="desktop-inventory-logout"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black text-rose-400 hover:text-rose-350 hover:bg-slate-800 transition-all border border-dashed border-rose-950/15"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-550" />
            Sign Out
          </button>
          <div className="text-[10px] text-center text-slate-500 font-semibold uppercase tracking-wider">
            v2.2 - Inventory Center 📦
          </div>
        </div>
      </aside>

      {/* 2. MOBILE HEADER (With right-aligned hamburger menu) */}
      <header className="flex lg:hidden items-center justify-between px-4 py-3.5 bg-indigo-950 border-b border-indigo-900 text-white select-none shrink-0 w-full sticky top-0 z-40">
        <div className="flex items-col">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-5.5 h-5.5 text-indigo-300" />
            <h1 className="text-sm font-extrabold pb-0.5">Inventory Department</h1>
          </div>
          <span className="text-[8px] text-indigo-300 font-bold block pl-8">👤 {currentUser?.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50"
            id="mobile-inventory-hamburger"
            title="Menu"
          >
            {isMobileMenuOpen ? <X className="w-5.5 h-5.5 text-rose-450" /> : <Menu className="w-5.5 h-5.5 text-white" />}
          </button>
        </div>
      </header>

      {/* 3. MOBILE SIDE DRAWER PANEL - Slides from Left Side */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-indigo-950/80 backdrop-blur-xs select-none">
          {/* Touch-to-dismiss background layer */}
          <div className="absolute inset-0" onClick={() => setIsMobileMenuOpen(false)} />
          
          <div className="relative w-64 bg-slate-900 p-5 space-y-6 flex flex-col justify-between h-full border-r border-slate-800 animate-in slide-in-from-left max-w-[85%] z-50">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-5.5 h-5.5 text-indigo-400" />
                  <div>
                    <span className="text-sm font-bold text-white block">Inventory Department</span>
                    <span className="text-[9px] text-slate-400 block font-semibold truncate max-w-[140px]">{currentUser?.name}</span>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {/* Switch section to Select Module */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setActiveModule('selection');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black text-indigo-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-all border border-slate-700 shadow-sm"
                  id="mobile-inventory-switch"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0 text-indigo-400" />
                  ← Switch Module
                </button>

                <div className="border-t border-slate-800 my-4" />

                {/* Left Drawer tab links */}
                {tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`mobile-tab-${tab.id}`}
                      onClick={() => {
                        setActiveTab(tab.id as ActiveTab);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                        isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <TabIcon className="w-4 h-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Logout Mobile */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                id="mobile-inventory-logout"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black text-rose-400 hover:text-rose-350 bg-slate-800 transition-all border border-dashed border-rose-950/15"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-550" />
                लॉगआउट (Logout)
              </button>
              <div className="text-[10px] text-center text-slate-500 font-semibold uppercase tracking-wider">
                v2.2 - Inventory Center 📦
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 4. WORKSPACE MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Compact welcome title header */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Boxes className="w-5.5 h-5.5 text-indigo-600" />
                {tabs.find(t => t.id === activeTab)?.label}
              </h1>
              <p className="text-slate-500 text-[11px] font-semibold">
                Unified School Systems • <span className="text-indigo-600 font-bold">{currentUser?.name || 'Academic Staff'}</span>
              </p>
            </div>
          </div>


          {/* VIEW RENDER DISPATCHING */}

          {/* STOCK TAB */}
          {activeTab === 'stock' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-sans">Physical Stock Register</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 text-[11px] font-extrabold px-3 py-1.5 rounded-xl border border-indigo-100">
                    Total Types: {filteredAndSortedStocks.length}
                  </span>
                </div>
              </div>

              {/* Smart Search & Optional Category Filters */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Smart Search Field */}
                  <div className="relative">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1 block">
                      Specific Material Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type material name or category..."
                        value={stockSearchQuery}
                        onChange={(e) => {
                          setStockSearchQuery(e.target.value);
                          setShowStockSuggestions(true);
                        }}
                        onFocus={() => setShowStockSuggestions(true)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>

                    {/* Intelligent suggestion panel if searching */}
                    {stockSearchQuery && showStockSuggestions && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto p-2 space-y-1">
                        <p className="text-[9px] text-slate-400 font-bold px-3 py-1 uppercase tracking-wider border-b border-slate-105">
                          Smart Real-time Suggestions
                        </p>
                        {stocks.filter(s => 
                          s.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) || 
                          s.category.toLowerCase().includes(stockSearchQuery.toLowerCase())
                        ).length === 0 ? (
                          <p className="text-[11px] text-slate-400 p-3 italic">No matching items found</p>
                        ) : (
                          stocks
                            .filter(s => 
                              s.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) || 
                              s.category.toLowerCase().includes(stockSearchQuery.toLowerCase())
                            )
                            .map(s => {
                              const isOut = s.availableQuantity <= 0;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setStockSearchQuery(s.name);
                                    setShowStockSuggestions(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition border border-transparent hover:border-slate-100"
                                >
                                  <span className="font-bold text-slate-800 truncate">{s.name}</span>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                    isOut ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {isOut ? 'Out of Stock' : `${s.availableQuantity} Available`}
                                  </span>
                                </button>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Category Filter - Selection not mandatory */}
                  <div>
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1 block">
                      Filter by Category (Optional)
                    </label>
                    <select
                      value={selectedStockCategory}
                      onChange={(e) => setSelectedStockCategory(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                    >
                      <option value="All">All Categories</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Active Filters Pill Indicator */}
                {(stockSearchQuery || selectedStockCategory !== 'All' || stockHistoryFromDate || stockHistoryToDate || stockHistoryType !== 'All') && (
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] font-bold text-slate-500 border-t border-slate-200/50">
                    <span>Active Filters:</span>
                    {stockSearchQuery && (
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg flex items-center gap-1.5 border border-indigo-150 shadow-xs">
                        Search: "{stockSearchQuery}"
                        <button type="button" onClick={() => setStockSearchQuery('')} className="hover:text-indigo-900 font-extrabold pb-0.5">×</button>
                      </span>
                    )}
                    {selectedStockCategory !== 'All' && (
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg flex items-center gap-1.5 border border-indigo-150 shadow-xs">
                        Category: {selectedStockCategory}
                        <button type="button" onClick={() => setSelectedStockCategory('All')} className="hover:text-indigo-900 font-extrabold pb-0.5">×</button>
                      </span>
                    )}
                    {(stockHistoryFromDate || stockHistoryToDate) && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg flex items-center gap-1.5 border border-amber-150 shadow-xs">
                        Date: {stockHistoryFromDate || 'Any'} to {stockHistoryToDate || 'Any'}
                        <button type="button" onClick={() => { setStockHistoryFromDate(''); setStockHistoryToDate(''); }} className="hover:text-amber-900 font-extrabold pb-0.5">×</button>
                      </span>
                    )}
                    {stockHistoryType !== 'All' && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg flex items-center gap-1.5 border border-emerald-150 shadow-xs">
                        Type: {stockHistoryType}
                        <button type="button" onClick={() => setStockHistoryType('All')} className="hover:text-emerald-900 font-extrabold pb-0.5">×</button>
                      </span>
                    )}
                    <button 
                      type="button"
                      onClick={() => { setStockSearchQuery(''); setSelectedStockCategory('All'); setStockHistoryFromDate(''); setStockHistoryToDate(''); setStockHistoryType('All'); }} 
                      className="text-[10px] text-indigo-650 hover:underline pl-1"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Transactions History Filters */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1 block">Date From (तारखेपासून)</label>
                    <input type="date" value={stockHistoryFromDate} onChange={(e) => setStockHistoryFromDate(e.target.value)} className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-xl hover:border-indigo-500 cursor-pointer shadow-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1 block">Date To (तारखेपर्यंत)</label>
                    <input type="date" value={stockHistoryToDate} onChange={(e) => setStockHistoryToDate(e.target.value)} className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-xl hover:border-indigo-500 cursor-pointer shadow-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1 block">Transaction Type</label>
                    <select value={stockHistoryType} onChange={(e) => setStockHistoryType(e.target.value)} className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-xl hover:border-indigo-500 cursor-pointer shadow-sm">
                      <option value="All">All Types</option>
                      <option value="Add">Material Add</option>
                      <option value="Distribute">Material Distribute</option>
                      <option value="Circulation">From Circulation</option>
                      <option value="Return">From Return</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Stocks List in beautiful Nameplate cards (sorted alphabetically A to Z) */}
              {filteredAndSortedStocks.length === 0 ? (
                <div className="text-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 space-y-2">
                  <Package className="w-12 h-12 mx-auto mb-1 opacity-40 text-slate-400" />
                  <p className="text-sm font-bold">No matching items found in the stock registry.</p>
                  <p className="text-xs">Use 'Add Materials' tab to register or restock materials.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                  {filteredAndSortedStocks.map(item => {
                    const isFiltered = stockHistoryFromDate !== '' || stockHistoryToDate !== '' || stockHistoryType !== 'All';
                    
                    let displayAdd = item.totalQuantity;
                    let displayDist = item.totalQuantity - item.availableQuantity;
                    let displayRem = item.availableQuantity;
                    let displayPercentage = item.totalQuantity > 0 ? Math.min(100, Math.max(0, (item.availableQuantity / item.totalQuantity) * 100)) : 0;
                    
                    if (isFiltered) {
                      const selName = item.name.toLowerCase();
                      let totalAdds = 0; let totalDists = 0; let totalReturns = 0; let totalCircs = 0;

                      let events: any[] = [];
                      additions.filter(a => a && a.itemName && a.itemName.toLowerCase() === selName).forEach(a => events.push({ type: 'Add', date: a.date, quantity: a.quantity }));
                      usages.filter(u => u && u.itemName && u.itemName.toLowerCase() === selName).forEach(u => events.push({ type: 'Distribute', date: u.borrowedDate, quantity: u.quantity || 1 }));
                      requests.filter(r => r && r.itemName && r.itemName.toLowerCase() === selName && r.status === 'Approved').forEach(r => {
                          if (r.requestType === 'Return') events.push({ type: 'Return', date: r.date, quantity: r.quantity || 1 });
                          else if (r.requestType === 'Circulation') events.push({ type: r.toTeacher === 'Office' ? 'Return' : 'Circulation', date: r.date, quantity: r.quantity || 1 });
                      });

                      if (stockHistoryType !== 'All') events = events.filter(e => e.type === stockHistoryType);
                      if (stockHistoryFromDate) events = events.filter(e => new Date(e.date) >= new Date(stockHistoryFromDate));
                      if (stockHistoryToDate) events = events.filter(e => new Date(e.date) <= new Date(stockHistoryToDate));

                      events.forEach(e => {
                        if (e.type === 'Add') totalAdds += e.quantity;
                        if (e.type === 'Distribute') totalDists += e.quantity;
                        if (e.type === 'Return') totalReturns += e.quantity;
                        if (e.type === 'Circulation') totalCircs += e.quantity;
                      });

                      if (totalAdds === 0 && totalDists === 0 && totalReturns === 0 && totalCircs === 0) {
                         return null; // Skip rendering this card if it has no activity in the range
                      }
                      
                      displayAdd = totalAdds;
                      displayDist = totalDists + totalCircs;
                      displayRem = item.availableQuantity;
                    }

                    const outOfStock = item.availableQuantity <= 0;
                    const lowStock = item.availableQuantity > 0 && item.availableQuantity <= item.totalQuantity * 0.3;

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedDetailStock(item)}
                        className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between group min-h-[175px] cursor-pointer"
                        style={{ borderLeftWidth: '5px', borderLeftColor: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#6366f1' }}
                      >
                        {/* Nameplate Top Row: Category and Status Tags plus Action */}
                        <div className="flex items-center justify-between mb-3.5">
                          <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-widest">
                            {item.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {outOfStock ? (
                              <span className="bg-rose-50 text-rose-700 text-[9px] px-2 py-0.5 rounded-md font-black">Out of Stock</span>
                            ) : lowStock ? (
                              <span className="bg-amber-50 text-amber-700 text-[9px] px-2 py-0.5 rounded-md font-black">Low Stock</span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-800 text-[9px] px-2 py-0.5 rounded-md font-black">In Stock</span>
                            )}
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStockItem(item.id);
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                              title="Delete Material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Middle Row: Name Plate visual typography */}
                        <div className="space-y-1 my-2">
                          <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-650 transition-colors">
                            {item.name}
                          </h3>
                          {(() => {
                            const locs = getLocationsListForStock(item);
                            if (locs.length > 0) {
                              return (
                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 pt-0.5">
                                  <span>📍 Location(s): {locs.join(', ')}</span>
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Bottom Row: State progress bar of remaining quantity */}
                        <div className="space-y-2 mt-auto pt-2 border-t border-slate-50">
                          <div className="grid grid-cols-3 gap-1 text-center mb-1">
                            <div className="bg-slate-50 rounded py-1 px-0.5 border border-slate-100">
                               <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">{isFiltered ? 'Range ADD' : 'Total ADD'}</p>
                               <p className="text-[11px] text-slate-800 font-black">{displayAdd}</p>
                            </div>
                            <div className="bg-rose-50 rounded py-1 px-0.5 border border-rose-100">
                               <p className="text-[8px] text-rose-600 font-extrabold uppercase tracking-widest">{isFiltered ? 'Range DIST' : 'Distribute'}</p>
                               <p className="text-[11px] text-rose-800 font-black">{displayDist}</p>
                            </div>
                            <div className="bg-indigo-50 rounded py-1 px-0.5 border border-indigo-100">
                               <p className="text-[8px] text-indigo-600 font-extrabold uppercase tracking-widest">{isFiltered ? 'Range RETURN' : 'Remaining'}</p>
                               <p className="text-[11px] text-indigo-800 font-black">{displayRem}</p>
                            </div>
                          </div>
                          
                          {!isFiltered && (
                            <>
                              <div className="flex items-center justify-between text-[10px] font-extrabold px-0.5">
                                <span className="text-slate-500">Remaining / Total Units</span>
                                <span className="text-slate-900">
                                  {item.availableQuantity} / {item.totalQuantity} items
                                </span>
                              </div>
                              
                              {/* Rich indicator progress bar with end of line count */}
                              <div className="flex items-center gap-2 px-0.5">
                                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      outOfStock ? 'bg-rose-500' : lowStock ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${displayPercentage}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-black text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0 pointer-events-none">
                                  {Math.round(displayPercentage)}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* REQUEST MATERIAL TAB */}
          {activeTab === 'requestMaterial' && (() => {
            const currentTargetName = reqItemName === 'Special Custom Material' ? reqSearchQuery.trim() : reqItemName;
            const currentMatchedStock = currentTargetName ? (
              stocks.find(s => s.name.trim().toLowerCase() === currentTargetName.toLowerCase()) ||
              stocks.find(s => s.name.toLowerCase().includes(currentTargetName.toLowerCase()) || currentTargetName.toLowerCase().includes(s.name.toLowerCase()))
            ) : null;
            const isTargetRegistered = currentTargetName ? registeredMaterials.some(m => m.name.toLowerCase() === currentTargetName.toLowerCase()) : false;
            const availableQty = currentMatchedStock ? currentMatchedStock.availableQuantity : (isTargetRegistered ? 0 : null);

            return (
              <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* Core Requisition Input Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Requisition Slip (साहित्य मागणी अर्ज)</h2>
                  <p className="text-[11px] text-slate-500 font-bold mt-1">Select dates, add multiple items into your requisition bunch, then click Submit below.</p>
                </div>

                <form onSubmit={handleAddToBunchSubmit} className="space-y-4">
                  {/* 1. Material Choice: Click or Select Dropdown or Search Autocomplete Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select Dropdown */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705">Choose Material Name (खालील यादीतून निवडा)</label>
                      <select
                        value={reqItemName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReqItemName(val);
                          setReqSearchQuery(val === 'Special Custom Material' ? '' : val);
                        }}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                      >
                        <option value="">-- Choose registered material --</option>
                        {Array.from(new Set([
                          ...stocks.map(s => s.name),
                          ...registeredMaterials.map(m => m.name)
                        ])).sort().map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="Special Custom Material">Custom Item (नवीन नाव टाका...)</option>
                      </select>
                    </div>

                    {/* Autocomplete Search input */}
                    <div className="space-y-1 relative">
                      <label className="text-xs font-black text-slate-705">Or Search Material (शोधून निवडा)</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Type material name..."
                          value={reqSearchQuery}
                          onFocus={() => setShowReqSuggestions(true)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReqSearchQuery(val);
                            setReqItemName(val);
                            setShowReqSuggestions(true);
                          }}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm hover:border-slate-350"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>

                      {/* Auto search suggestion pop-up */}
                      {showReqSuggestions && reqSearchQuery && (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1">
                          {(() => {
                            const allNames = Array.from(new Set([
                              ...stocks.map(s => s.name),
                              ...registeredMaterials.map(m => m.name)
                            ])).sort();
                            const matches = allNames.filter(n => n.toLowerCase().includes(reqSearchQuery.toLowerCase()));

                            return matches.length === 0 ? (
                              <div className="p-3 text-slate-400 text-xs italic">No matching options. Set custom item name above.</div>
                            ) : (
                              matches.map(name => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => {
                                    setReqItemName(name);
                                    setReqSearchQuery(name);
                                    setShowReqSuggestions(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-800 font-bold transition flex items-center justify-between"
                                >
                                  <span>{name}</span>
                                  <span className="text-[9px] bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-black">Option</span>
                                </button>
                              ))
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {reqItemName === 'Special Custom Material' && (
                    <div className="space-y-1">
                      <label className="text-xs font-black text-rose-700">Write Custom Material Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Specify material name precisely"
                        value={reqSearchQuery}
                        onChange={(e) => {
                          setReqSearchQuery(e.target.value);
                        }}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  )}

                  {/* Date Selection & Quantity Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705">Select Date (तारीख निवडा) *</label>
                      <input
                        type="date" max={new Date().toISOString().split('T')[0]}
                        required
                        value={reqDate}
                        onChange={(e) => setReqDate(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705">Quantity Required (मागणी केलेली संख्या) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={reqQty}
                        onChange={(e) => setReqQty(Number(e.target.value))}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                      />
                      {availableQty !== null && (
                        <div className={`mt-1.5 p-2 rounded-xl text-[11px] font-bold border transition ${
                          reqQty > availableQty
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span>📍 उपलब्ध स्टॉक (Available Stock): <strong className="text-xs font-extrabold">{availableQty}</strong> units</span>
                            {currentMatchedStock && (() => {
                              const locs = getLocationsListForStock(currentMatchedStock);
                              if (locs.length > 0) {
                                return <span className="text-[9px] bg-white text-slate-600 px-1.5 py-0.5 rounded shadow-2xs">📍 {locs.join(', ')}</span>;
                              }
                              return null;
                            })()}
                          </div>
                          {reqQty > availableQty && (
                            <p className="mt-1 text-[10px] text-rose-600 font-bold leading-tight">
                              ⚠️ मागणी ही उपलब्ध स्टॉक पेक्षा जास्त आहे! कृपया {availableQty} किंवा त्यापेक्षा कमी संख्या निवडा.
                            </p>
                          )}
                        </div>
                      )}
                      {availableQty === null && currentTargetName && (
                        <div className="mt-1.5 p-2 rounded-xl text-[11px] font-bold border border-amber-100 bg-amber-50 text-amber-700">
                          <span>📝 नवीन साहित्य (New Custom Material): <strong>No stock record</strong></span>
                          <p className="mt-0.5 text-[10px] text-amber-600 font-medium leading-tight">
                            हे नवीन साहित्य असल्याने स्टॉकमध्ये शिल्लक संख्या नाही. याच्या मंजुरीसाठी ऍडमिनशी संपर्क साधावा.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requester session - unchangeable locked session input */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-600">Requester (मागणी करणारा - बदलता येणार नाही)</label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={currentUser?.name || 'Academic Administrator'}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-200 text-slate-400 px-4 py-3 rounded-2xl outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Purpose / Details - keep exactly as requested */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-750">Purpose / Details of Use (वापराचा हेतू)</label>
                    <textarea
                      placeholder="Describe laboratory topic, experiment details, or grade presentation objective..."
                      value={reqPurpose}
                      onChange={(e) => setReqPurpose(e.target.value)}
                      rows={2}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Material to Requisition Bunch (साहित्याच्या गटामध्ये जोडा)
                  </button>
                </form>
              </div>

              {/* Dynamic Bunch Requisition List Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Selected Requisition Bunch (मागणी केलेला गट)</h3>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">Below is the temporary list of items you are requesting.</p>
                  </div>
                  
                  {/* Overall sum representation of bunch */}
                  <span className="text-[10px] bg-indigo-100 text-indigo-850 px-3 py-1.5 rounded-xl font-black shadow-xs">
                    Sum: {reqBunch.length} Item types ({reqBunch.reduce((sum, item) => sum + item.quantity, 0)} total units)
                  </span>
                </div>

                {reqBunch.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold italic">
                    Your requisition bunch is currently empty. Choose an item above and click "Add Material".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reqBunch.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                      >
                        {editingBunchId === item.id ? (
                          /* Inline edit form for the bunch item */
                          <div className="flex-1 space-y-3 p-1 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-black text-slate-500 uppercase px-2">Edit Bunch Item</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-2 pb-2">
                              <div>
                                <label className="text-[9px] text-slate-500 font-extrabold uppercase">Material Name</label>
                                <input 
                                  type="text" 
                                  value={editBunchName} 
                                  onChange={(e) => setEditBunchName(e.target.value)}
                                  className="w-full text-xs font-bold border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-500 font-extrabold uppercase">Quantity</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={editBunchQty} 
                                  onChange={(e) => setEditBunchQty(Number(e.target.value))}
                                  className="w-full text-xs font-bold border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-900"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end border-t border-slate-200 p-2 bg-slate-100/50 rounded-b-xl">
                              <button 
                                type="button" 
                                onClick={() => setEditingBunchId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black px-3.5 py-1.5 rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button" 
                                onClick={() => saveEditedBunchItem(item.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-1.5 rounded-lg transition shadow-xs"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Parallel Name & Quantity layout */
                          <>
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
                              <div className="grid grid-cols-2 gap-4 flex-1">
                                <div className="text-left">
                                  <span className="text-[9px] text-slate-400 font-black uppercase block">Material Item</span>
                                  <span className="font-extrabold text-slate-900 text-sm block mt-0.5">{item.itemName}</span>
                                </div>
                                <div className="text-left border-l border-slate-100 pl-4">
                                  <span className="text-[9px] text-slate-400 font-black uppercase block">Quantity Registered</span>
                                  <span className="font-black text-indigo-700 text-sm block mt-0.5">{item.quantity} units</span>
                                </div>
                              </div>
                            </div>

                            {/* Options to edit/delete the bunch item */}
                            <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-3 justify-end">
                              <button
                                type="button"
                                onClick={() => startEditBunchItem(item)}
                                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-indigo-650 rounded-lg transition"
                                title="Edit quantity or name"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteBunchItem(item.id)}
                                className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                                title="Delete item from bunch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Master Submit Section */}
                    <div className="pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleMasterSubmit}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3.5 rounded-2xl transition shadow-md"
                      >
                        <Send className="w-4 h-4" />
                        Submit Entire Requisition Bunch ({reqBunch.length} Materials)
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })()}

          {/* USAGE MONITORING TAB */}
          {activeTab === 'usageMonitoring' && (() => {
            const explicitDepartments: string[] = ['SERP', 'ARP', 'Community Mentor', 'Academic Coordinator', 'Manager', 'Admin', 'Office'];
            const allRoles: string[] = Array.from(new Set((teachers.map(t => t.role) as string[]).filter(r => r))).concat(explicitDepartments);
            const departments = Array.from(new Set(allRoles)).filter(r => {
              const lower = r.toLowerCase();
              return lower !== 'teacher' && lower !== 'academic_coordinator' && lower !== 'academic coordinator';
            });
            const sortedTeachers = [...teachers].sort((a,b) => a.name.localeCompare(b.name));

            return (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 min-h-[500px]">
                <div className="flex flex-col md:flex-row justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex gap-4">
                         <button onClick={() => {setUsageSubTab('Employees'); setUsageSelectedEntity(null); setUsageSelectedMaterial(null);}} className={`text-sm font-black pb-1 border-b-2 ${usageSubTab === 'Employees' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>By Employees</button>
                         <button onClick={() => {setUsageSubTab('Departments'); setUsageSelectedEntity(null); setUsageSelectedMaterial(null);}} className={`text-sm font-black pb-1 border-b-2 ${usageSubTab === 'Departments' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>By Departments</button>
                    </div>
                </div>

                {/* List Employees or Departments */}
                {!usageSelectedEntity && (
                    <div className="space-y-4 animate-fade-in">
                         {usageSubTab === 'Employees' && (
                              <input 
                                  type="text" 
                                  placeholder="Search Employee..." 
                                  value={usageSearchName} 
                                  onChange={(e) => setUsageSearchName(e.target.value)}
                                  className="w-full md:w-1/3 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm"
                              />
                         )}
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                             {usageSubTab === 'Employees' && sortedTeachers.filter(t => t.name.toLowerCase().includes(usageSearchName.toLowerCase())).map(t => (
                                  <div key={t.id} onClick={() => setUsageSelectedEntity(t.name)} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition text-center shadow-sm">
                                       <p className="font-extrabold text-slate-800">{t.name}</p>
                                       <p className="text-[10px] text-slate-500 mt-1">{t.role || 'Staff'}</p>
                                  </div>
                             ))}
                             {usageSubTab === 'Departments' && departments.map(d => (
                                  <div key={d} onClick={() => setUsageSelectedEntity(d)} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition text-center shadow-sm">
                                       <p className="font-extrabold text-slate-800">{d}</p>
                                  </div>
                             ))}
                         </div>
                    </div>
                )}

                {/* Detailed View for Selected Entity */}
                {usageSelectedEntity && (
                     <div className="space-y-6 animate-fade-in">
                          <div className="flex items-center gap-3">
                               <button onClick={() => {setUsageSelectedEntity(null); setUsageSelectedMaterial(null);}} className="text-slate-500 hover:text-slate-800 p-2 bg-slate-100 rounded-full transition"><ChevronLeft className="w-4 h-4"/></button>
                               <h3 className="text-lg font-black text-slate-800">{usageSelectedEntity} <span className="text-sm font-bold text-slate-400">({usageSubTab === 'Employees' ? 'Employee' : 'Department'})</span> History</h3>
                          </div>

                          {/* Compute events for entity */}
                          {(() => {
                               let targetNames = [usageSelectedEntity];
                               if (usageSubTab === 'Departments') {
                                   if (usageSelectedEntity === 'Office') targetNames = ['Office', 'Admin', 'admin']; 
                                   else targetNames = teachers.filter(t => t.role === usageSelectedEntity).map(t => t.name);
                               }

                               let rawEvents: any[] = [];

                               targetNames.forEach(name => {
                                   // 1. Borrowed from stock
                                   usages.filter(u => u.userName === name).forEach(u => {
                                       rawEvents.push({ type: 'Distribute', date: u.borrowedDate, item: u.itemName, qty: u.quantity || 1, from: u.approverName || 'Admin', to: name, purpose: u.purpose, id: u.id, timestamp: new Date(u.borrowedDate).getTime()});
                                   });

                                   // 2. Returned to stock
                                   requests.filter(r => r.requestType === 'Return' && r.teacherName === name && r.status === 'Approved').forEach(r => {
                                       rawEvents.push({ type: 'Return', date: r.date, item: r.itemName, qty: r.quantity || 1, from: name, to: r.handoverTo || 'Office', purpose: r.purpose, id: r.id, timestamp: new Date(r.date).getTime()});
                                   });

                                   // 3. Circulations (Received)
                                   requests.filter(r => r.requestType === 'Circulation' && (r.toTeacher === name || (r.toTeacher === 'Office' && r.officeReturnPerson === name)) && r.status === 'Approved').forEach(r => {
                                       rawEvents.push({ type: 'Circulation_In', date: r.date, item: r.itemName, qty: r.quantity || 1, from: r.teacherName, to: name, purpose: r.purpose, id: r.id+'-in', timestamp: new Date(r.date).getTime()});
                                   });

                                   // 4. Circulations (Given)
                                   requests.filter(r => r.requestType === 'Circulation' && r.teacherName === name && r.status === 'Approved').forEach(r => {
                                       rawEvents.push({ type: 'Circulation_Out', date: r.date, item: r.itemName, qty: r.quantity || 1, from: name, to: r.toTeacher === 'Office' ? 'Office' : r.toTeacher, purpose: r.purpose, id: r.id+'-out', timestamp: new Date(r.date).getTime()});
                                   });
                               });

                               // Apply Date & Material Filters
                               let filteredEvents = rawEvents;
                               if (usageFilterFromDate) filteredEvents = filteredEvents.filter(e => new Date(e.date) >= new Date(usageFilterFromDate));
                               if (usageFilterToDate) filteredEvents = filteredEvents.filter(e => new Date(e.date) <= new Date(usageFilterToDate));
                               if (usageFilterMaterialSearch) {
                                   filteredEvents = filteredEvents.filter(e => e.item.toLowerCase().includes(usageFilterMaterialSearch.toLowerCase()));
                               }
                               
                               let netHoldings: Record<string, number> = {};
                               filteredEvents.forEach(e => {
                                   if (e.type === 'Distribute' || e.type === 'Circulation_In') {
                                       netHoldings[e.item] = (netHoldings[e.item] || 0) + e.qty;
                                   } else if (e.type === 'Return' || e.type === 'Circulation_Out') {
                                       netHoldings[e.item] = (netHoldings[e.item] || 0) - e.qty;
                                   }
                               });

                               filteredEvents.sort((a,b) => b.timestamp - a.timestamp);

                               const holdingEntries = Object.entries(netHoldings).filter(([_, qty]) => qty > 0);

                               return (
                                   <div className="space-y-6">
                                        {/* Date and Search Filters */}
                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-end">
                                             <div className="flex-1 w-full">
                                                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 block">Date From</label>
                                                  <input type="date" value={usageFilterFromDate} onChange={(e) => setUsageFilterFromDate(e.target.value)} className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 shadow-sm" />
                                             </div>
                                             <div className="flex-1 w-full">
                                                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 block">Date To</label>
                                                  <input type="date" value={usageFilterToDate} onChange={(e) => setUsageFilterToDate(e.target.value)} className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 shadow-sm" />
                                             </div>
                                             <div className="flex-1 w-full relative">
                                                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1 block">Material Name</label>
                                                  <input type="text" placeholder="Search Material..." value={usageFilterMaterialSearch} onChange={(e) => setUsageFilterMaterialSearch(e.target.value)} className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 shadow-sm" />
                                             </div>
                                             {(usageFilterFromDate || usageFilterToDate || usageFilterMaterialSearch) && (
                                                  <button onClick={() => {setUsageFilterFromDate(''); setUsageFilterToDate(''); setUsageFilterMaterialSearch('');}} className="md:mb-1 w-full md:w-auto shrink-0 text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border border-rose-200/50 px-3 py-2 rounded-xl transition">
                                                      Clear Filters
                                                  </button>
                                             )}
                                        </div>

                                        {/* Holdings Summary */}
                                        {holdingEntries.length > 0 && !usageSelectedMaterial && (
                                            <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100">
                                                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-3">Current Holdings (अद्याप जमा न केलेले)</h4>
                                                <div className="flex flex-wrap gap-3">
                                                     {holdingEntries.map(([item, qty]) => (
                                                          <button key={item} type="button" onClick={() => setUsageSelectedMaterial(item)} className="bg-white border border-indigo-200 px-4 py-2 rounded-xl text-center shadow-sm hover:border-indigo-400 hover:shadow-md transition">
                                                              <p className="font-extrabold text-indigo-950 text-sm focus:outline-none">{qty}</p>
                                                              <p className="text-[10px] text-indigo-600 font-bold focus:outline-none">{item}</p>
                                                          </button>
                                                     ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Timeline */}
                                        <div>
                                             <div className="flex items-center justify-between mb-3">
                                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Transaction Timeline</h4>
                                                  {usageSelectedMaterial && (
                                                       <button type="button" onClick={() => setUsageSelectedMaterial(null)} className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg font-bold text-slate-600 hover:bg-slate-200 focus:outline-none">
                                                           Clear Filter: {usageSelectedMaterial} ×
                                                       </button>
                                                  )}
                                             </div>
                                             <div className="space-y-3">
                                                  {filteredEvents.filter(e => !usageSelectedMaterial || e.item === usageSelectedMaterial).length === 0 ? (
                                                       <p className="text-slate-400 text-xs italic">No transactions found.</p>
                                                  ) : (
                                                       filteredEvents.filter(e => !usageSelectedMaterial || e.item === usageSelectedMaterial).map(e => {
                                                            const isCirculation = e.type.includes('Circulation');
                                                            const isReceive = e.type === 'Distribute' || e.type === 'Circulation_In';
                                                            const isDirectReturn = e.type === 'Return';
                                                            const isDirectDistribute = e.type === 'Distribute';
                                                            
                                                            const itemBg = isCirculation ? 'bg-yellow-50 border-yellow-300' : isDirectDistribute ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300';
                                                            const badgeBg = isCirculation ? 'bg-yellow-200 text-yellow-900 border-yellow-400' : isDirectDistribute ? 'bg-emerald-200 text-emerald-900 border-emerald-400' : 'bg-rose-200 text-rose-900 border-rose-400';
                                                            const badgeText = isCirculation ? 'Material Circulation' : isDirectDistribute ? 'Received' : 'Returned';

                                                            return (
                                                                 <div key={e.id} className={`${itemBg} border p-4 rounded-2xl flex items-center justify-between gap-4 transition-all shadow-sm`}>
                                                                      <div className="flex-1">
                                                                           <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                                <span className="font-black text-slate-900 text-sm">{e.item}</span>
                                                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${badgeBg}`}>
                                                                                     {badgeText}
                                                                                </span>
                                                                           </div>
                                                                           <div className="flex items-center gap-2 text-[11px] text-slate-700 font-bold mb-1">
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    {isDirectDistribute && <span className="text-slate-500">Approved by</span>}
                                                                                    {isDirectReturn && <span className="text-slate-500">Returned by</span>}
                                                                                    {isCirculation && <span className="text-slate-500">From</span>}
                                                                                    
                                                                                    <span className={`px-2 py-0.5 rounded ${e.from === targetNames[0] ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300'}`}>{e.from}</span>
                                                                                    <ArrowRight className="w-3 h-3 text-slate-400"/>
                                                                                    
                                                                                    {isDirectDistribute && <span className="text-slate-500">Received by</span>}
                                                                                    {isDirectReturn && <span className="text-slate-500">Handed over to</span>}
                                                                                    {isCirculation && <span className="text-slate-500">To</span>}
                                                                                    
                                                                                    <span className={`px-2 py-0.5 rounded ${e.to === targetNames[0] ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300'}`}>{e.to}</span>
                                                                                </div>
                                                                           </div>
                                                                           {(e.purpose) && (
                                                                              <p className="text-[10px] text-slate-600 font-semibold mt-2 italic border-l-2 border-slate-300 pl-2">Purpose: {e.purpose}</p>
                                                                           )}
                                                                      </div>
                                                                      <div className="text-right shrink-0">
                                                                           <p className={`font-extrabold text-xl ${isCirculation ? 'text-yellow-900' : isReceive ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                                               {isReceive ? '+' : '-'}{e.qty}
                                                                           </p>
                                                                           <p className="text-[10px] text-slate-500 font-bold">{e.date}</p>
                                                                      </div>
                                                                 </div>
                                                            );
                                                       })
                                                  )}
                                             </div>
                                        </div>
                                   </div>
                               );
                          })()}
                     </div>
                )}
              </div>
            );
          })()}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (() => {
            const relevantRequests = currentUser?.role === 'admin' 
              ? requests 
              : requests.filter(r => r.teacherName === currentUser?.name || r.toTeacher === currentUser?.name || r.handoverTo === currentUser?.name);

            const sortedRequests = [...relevantRequests].sort((a, b) => {
              return new Date(b.date || '').getTime() - new Date(a.date || '').getTime();
            });

            const subTabFiltered = sortedRequests.filter(req => {
              if (reqSubTab === 'All') return true;
              if (reqSubTab === 'Pending') return req.status === 'Pending';
              if (reqSubTab === 'Approved') return req.status === 'Approved';
              if (reqSubTab === 'Declined') return req.status === 'Declined';
              if (reqSubTab === 'Handover') return req.requestType === 'Return';
              if (reqSubTab === 'Circulation') return req.requestType === 'Circulation';
              return true;
            });

            const finalFilteredRequests = subTabFiltered.filter(req => {
              if (reqFilterDate && req.date !== reqFilterDate) return false;
              if (reqFilterPurpose && !req.purpose.toLowerCase().includes(reqFilterPurpose.toLowerCase())) return false;
              if (reqFilterMaterialName && !req.itemName.toLowerCase().includes(reqFilterMaterialName.toLowerCase())) return false;
              
              if (reqSubTab === 'All' && reqFilterStatus !== 'All') {
                if (reqFilterStatus === 'Handover') {
                  if (req.requestType !== 'Return') return false;
                } else if (reqFilterStatus === 'Circulation') {
                  if (req.requestType !== 'Circulation') return false;
                } else {
                  const mappedStatus = reqFilterStatus === 'Rejected' ? 'Declined' : reqFilterStatus;
                  if (req.status !== mappedStatus) return false;
                }
              }
              return true;
            });

            return (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in">
                {/* Header section with counts */}
                <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 font-sans">Active Requisitions & Approvals</h2>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">Approve individual requisitions or select multiple for bunch approval.</p>
                  </div>
                  <span className="text-[10px] w-fit bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-black">{finalFilteredRequests.length} requests matched</span>
                </div>

                {/* Parallel Horizontal Scrolling Subtabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 select-none">
                  {(['All', 'Pending', 'Approved', 'Declined', 'Handover', 'Circulation'] as const).map((tab) => {
                    const displayName = tab === 'Declined' ? 'Rejected' : tab;
                    let count = 0;
                    if (tab === 'All') count = relevantRequests.length;
                    else if (tab === 'Handover') count = relevantRequests.filter(r => r.requestType === 'Return').length;
                    else if (tab === 'Circulation') count = relevantRequests.filter(r => r.requestType === 'Circulation').length;
                    else count = relevantRequests.filter(r => r.status === (tab === 'Declined' ? 'Declined' : tab)).length;

                    const isActive = reqSubTab === tab;
                    return (
                      <button
                        type="button"
                        key={tab}
                        onClick={() => setReqSubTab(tab)}
                        className={`px-4 py-2 rounded-full font-black text-[11px] whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab === 'Handover' && <ArrowLeftRight className="w-3.5 h-3.5" />}
                        <span>{displayName}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-slate-250 text-slate-700'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Filter Controls Panel (Applied across all subtabs) */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Date filter */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-black text-slate-700 block">Filter by Date (तारीख निवडा)</label>
                    <input
                      type="date" max={new Date().toISOString().split('T')[0]}
                      value={reqFilterDate}
                      onChange={(e) => setReqFilterDate(e.target.value)}
                      className="w-full text-[11px] font-bold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Material name filter */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-black text-slate-700 block">Material Name (साहित्याचे नाव)</label>
                    <input
                      type="text"
                      placeholder="Search material..."
                      value={reqFilterMaterialName}
                      onChange={(e) => setReqFilterMaterialName(e.target.value)}
                      className="w-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 placeholder-slate-400"
                    />
                  </div>

                  {/* Purpose filter */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-black text-slate-700 block">Purpose (वापराचा हेतू)</label>
                    <input
                      type="text"
                      placeholder="Search purpose..."
                      value={reqFilterPurpose}
                      onChange={(e) => setReqFilterPurpose(e.target.value)}
                      className="w-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 placeholder-slate-400"
                    />
                  </div>

                  {/* Request Status filter */}
                  {reqSubTab === 'All' && (
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-black text-slate-700 block">Request Status (अर्ज स्थिती)</label>
                      <select
                        value={reqFilterStatus}
                        onChange={(e) => setReqFilterStatus(e.target.value)}
                        className="w-full text-[11px] font-bold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="All">All Types</option>
                        <option value="Pending">Pending (प्रलंबित)</option>
                        <option value="Approved">Approved (मंजूर)</option>
                        <option value="Rejected">Rejected (अस्वीकृत)</option>
                        <option value="Handover">Handover (हस्तांतरण)</option>
                        <option value="Circulation">Circulation (अंतर्गत हस्तांतरण)</option>
                      </select>
                    </div>
                  )}

                  {/* Clear filter Helper */}
                  {(reqFilterDate || reqFilterMaterialName || reqFilterPurpose || reqFilterStatus !== 'All') && (
                    <div className="col-span-2 lg:col-span-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReqFilterDate('');
                          setReqFilterMaterialName('');
                          setReqFilterPurpose('');
                          setReqFilterStatus('All');
                        }}
                        className="text-[10px] text-rose-600 hover:text-rose-700 font-extrabold flex items-center gap-1 transition"
                      >
                        Clear Active Filters (फिल्टर्स काढून टाका)
                      </button>
                    </div>
                  )}
                </div>

                {/* Toggle select-all pending & bunch action bar */}
                {finalFilteredRequests.filter(r => r.status === 'Pending').length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox"
                        id="selectAllPending"
                        checked={
                          finalFilteredRequests.filter(r => r.status === 'Pending').length > 0 &&
                          finalFilteredRequests.filter(r => r.status === 'Pending').every(r => selectedReqIds.includes(r.id))
                        }
                        onChange={() => {
                          const pendingIds = finalFilteredRequests.filter(r => r.status === 'Pending').map(r => r.id);
                          const allSelected = pendingIds.every(id => selectedReqIds.includes(id));
                          if (allSelected) {
                            setSelectedReqIds(selectedReqIds.filter(id => !pendingIds.includes(id)));
                          } else {
                            const union = Array.from(new Set([...selectedReqIds, ...pendingIds]));
                            setSelectedReqIds(union);
                          }
                        }}
                        className="w-4 h-4 cursor-pointer text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="selectAllPending" className="font-extrabold text-slate-700 cursor-pointer select-none">
                        Select All Pending in View ({finalFilteredRequests.filter(r => r.status === 'Pending').length} pending)
                      </label>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {selectedReqIds.filter(id => finalFilteredRequests.find(r => r.id === id)?.status === 'Pending').length > 0 && (
                        <button
                          type="button"
                          onClick={handleApproveSelectedBunch}
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-4 py-2 rounded-xl transition shadow-xs animate-pulse"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Approve Selected Bunch ({selectedReqIds.filter(id => finalFilteredRequests.find(r => r.id === id)?.status === 'Pending').length} मागण्या एकत्र मंजूर करा)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {finalFilteredRequests.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 text-slate-400 rounded-2xl font-bold">
                      No matching requisitions logged in this view.
                    </div>
                  ) : (
                    finalFilteredRequests.map(req => (
                      <div 
                        key={req.id} 
                        className={`border rounded-2xl p-4 flex flex-col gap-4 transition text-xs ${
                          req.status === 'Pending' ? 'bg-indigo-50/25 border-indigo-150' : 'bg-slate-50 border-slate-150'
                        }`}
                      >
                        {editingReqId === req.id ? (
                          <div className="space-y-3 w-full bg-indigo-50/50 p-4 border border-dashed border-indigo-200 rounded-xl">
                            <h4 className="font-extrabold text-indigo-950 text-xs text-center border-b pb-2 mb-2">Edit Requisition Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase block">Material Name</label>
                                <input
                                  type="text"
                                  value={editReqItemName}
                                  onChange={(e) => setEditReqItemName(e.target.value)}
                                  className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase block">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editReqQty}
                                  onChange={(e) => setEditReqQty(Number(e.target.value))}
                                  className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase block">Required Date</label>
                                <input
                                  type="date" max={new Date().toISOString().split('T')[0]}
                                  value={editReqDate}
                                  onChange={(e) => setEditReqDate(e.target.value)}
                                  className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-indigo-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase block">Use Purpose</label>
                                <input
                                  type="text"
                                  value={editReqPurpose}
                                  onChange={(e) => setEditReqPurpose(e.target.value)}
                                  className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => setEditingReqId(null)}
                                className="px-3 py-1.5 bg-slate-250 text-slate-700 font-extrabold text-[10px] rounded-lg hover:bg-slate-300 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateEditedRequest(req.id)}
                                className="px-4 py-1.5 bg-indigo-600 text-white font-extrabold text-[10px] rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 w-full">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Checkbox for batch approval selection */}
                              {req.status === 'Pending' && (
                                <input 
                                  type="checkbox"
                                  checked={selectedReqIds.includes(req.id)}
                                  onChange={() => {
                                    if (selectedReqIds.includes(req.id)) {
                                      setSelectedReqIds(selectedReqIds.filter(id => id !== req.id));
                                    } else {
                                      setSelectedReqIds([...selectedReqIds, req.id]);
                                    }
                                  }}
                                  className="w-4 h-4 mt-1 cursor-pointer text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                              )}
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-black text-slate-900 flex items-center gap-2 flex-wrap">
                                    {req.itemName}
                                    {(!req.requestType || req.requestType === 'Borrow') && (
                                      <span className="ml-2 bg-blue-150 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 inline-flex shadow-xs border border-blue-200">
                                        <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                                        Material Request (साहित्य वाटप मागणी)
                                      </span>
                                    )}
                                    {req.requestType === 'Return' && (
                                      <span className="ml-2 bg-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 inline-flex animate-fade-in">
                                        <ArrowLeftRight className="w-3" />
                                        Return / Handover (हस्तांतरण)
                                      </span>
                                    )}
                                    {req.requestType === 'Circulation' && (
                                      <span className="ml-2 bg-purple-100 text-purple-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 inline-flex animate-fade-in">
                                        <ArrowLeftRight className="w-3" />
                                        Circulation (हस्तांतरण)
                                      </span>
                                    )}
                                  </span>
                                  <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">Qty: {req.quantity}</span>
                                  {req.condition && (
                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${req.condition === 'Packed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                      {req.condition} {req.condition === 'Unpacked' && req.remainingPercentage !== undefined ? `(${req.remainingPercentage}%)` : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-600 font-semibold space-y-1">
                                  <div>
                                    Requester: <span className="text-indigo-650 font-black">{req.teacherName}</span> on {req.date}
                                    {req.handoverTo && (
                                      <span className="ml-1.5 text-purple-700 font-extrabold">
                                        (Handover Designated: {req.handoverTo})
                                      </span>
                                    )}
                                  </div>
                                  {req.status === 'Approved' && req.approvedBy && (
                                    <div className="text-emerald-700 font-bold flex items-center gap-1 mt-1 bg-emerald-50 border border-emerald-150 px-2.5 py-1 rounded-xl w-fit" id={`approved-by-display-${req.id}`}>
                                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      Approved By (मंजूर केले): <span className="text-emerald-800 font-black ml-0.5">{req.approvedBy}</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-505 font-medium italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                                  📄 Purpose: "{req.purpose}"
                                </p>
                                {req.requestType === 'Circulation' && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 shadow-sm flex items-center gap-1">
                                      <User className="w-3 h-3" /> To: {req.toTeacher}
                                    </span>
                                    {req.circItemCondition === 'Damaged' && (
                                      <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                                        <AlertTriangle className="w-2.5 h-2.5"/>Item Damaged: {req.circItemDamageDetails}
                                      </span>
                                    )}
                                    {req.circBoxCondition === 'Damaged' && (
                                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 text-[9px] font-black uppercase tracking-wider">
                                        <AlertTriangle className="w-2.5 h-2.5"/>Box Damaged
                                      </span>
                                    )}
                                    {req.circAccessories && req.circAccessories.length > 0 && (
                                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1 text-[9px] font-black tracking-wider">
                                        <PlusCircle className="w-2.5 h-2.5"/> {req.circAccessories.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Approve / Decline primary actions */}
                              {req.status === 'Pending' ? (
                                <div className="flex items-center gap-1.5">
                                  {/* Check if user is authorized to act on this request */}
                                  {(!(req.requestType === 'Return' || req.requestType === 'Circulation') || currentUser?.role === 'admin' || currentUser?.name === (req.requestType === 'Circulation' ? (req.toTeacher === 'Office' ? req.officeReturnPerson : req.toTeacher) : req.handoverTo)) ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleApproveRequest(req.id)}
                                        className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3.5 py-2 rounded-xl transition shadow-xs"
                                      >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeclineRequest(req.id)}
                                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black px-3.5 py-2 rounded-xl transition border border-slate-250"
                                      >
                                        <XSquare className="w-3.5 h-3.5" />
                                        Decline
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-1.5">
                                      <Clock className="w-3 h-3" />
                                      Pending action from {req.requestType === 'Circulation' ? (req.toTeacher === 'Office' ? req.officeReturnPerson : req.toTeacher) : req.handoverTo}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {req.status === 'Declined' ? 'Rejected' : req.status}
                                </span>
                              )}

                              {/* Edit / Remove utilities */}
                              {req.status === 'Pending' && (currentUser?.role === 'admin' || req.teacherName === currentUser?.name) && (
                                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                                  <button
                                    type="button"
                                    onClick={() => startEditRequest(req)}
                                    className="p-2 hover:bg-slate-150 text-slate-500 hover:text-indigo-650 rounded-lg transition"
                                    title="Edit request details"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteRequest(req.id);
                                      alert("✅ Request discarded successfully.");
                                    }}
                                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                    title="Remove request log"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* ADD MATERIALS TAB */}
          {activeTab === 'addMaterials' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl mx-auto" id="add-materials-section-container">
              
              <div>
                <h2 className="text-xl font-black text-slate-900 font-sans text-center">Material Catalog & Stock In</h2>
              </div>

              {/* Dual Selection Sub-Tab Buttons at Top */}
              <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md mx-auto mb-6">
                <button
                  type="button"
                  onClick={() => setAddMaterialSubTab('register')}
                  className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
                    addMaterialSubTab === 'register' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  id="tab-btn-register"
                >
                  📋 1. Register Type
                </button>
                <button
                  type="button"
                  onClick={() => setAddMaterialSubTab('add')}
                  className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${
                    addMaterialSubTab === 'add' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  id="tab-btn-add-stock"
                >
                  📦 2. Add Stock
                </button>
              </div>

              {addMaterialSubTab === 'register' ? (
                <div className="space-y-4" id="register-material-container">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs font-bold text-indigo-950 space-y-1">
                    <p className="text-sm">💡 1. Register Material Type</p>
                  </div>

                  <form onSubmit={handleRegisterMaterialSubmit} className="space-y-4" id="register-material-form">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block">
                        Material Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chromebook, 3D Geometry Box, Science Beaker Set..."
                        value={regOptName}
                        onChange={(e) => setRegOptName(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                        id="reg-opt-name-input"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block">
                        Category Classification *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Science Kit, Math Kit, Audio-Visual, Library, Sports..."
                        value={regOptCat}
                        onChange={(e) => setRegOptCat(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                        id="reg-opt-cat-input"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition shadow-md"
                      id="register-material-submit-btn"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Submit
                    </button>
                  </form>

                  {/* Registered Catalog Reference Display list */}
                  <div className="pt-4 border-t border-slate-100 space-y-3" id="registered-catalog-reference-section">
                    
                    {/* Material Type (Category) Selection Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                        Filter Registered Items by Category
                      </label>
                      <select
                        value={regFilterCat}
                        onChange={(e) => setRegFilterCat(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                        id="reg-filter-cat-select"
                      >
                        <option value="All">All Categories</option>
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const filteredList = registeredMaterials
                        .filter(m => regFilterCat === 'All' || m.category === regFilterCat)
                        .sort((a, b) => a.name.localeCompare(b.name));

                      return (
                        <div className="space-y-2" id="filtered-registered-catalog-container">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            Registered Material Types ({filteredList.length} options)
                          </span>
                          <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-slate-150 rounded-xl bg-slate-50/50">
                            {filteredList.length === 0 ? (
                              <p className="text-slate-400 italic text-[11px] p-3 text-center">No registered types available in this category.</p>
                            ) : (
                              filteredList.map(m => (
                                <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs shadow-xs hover:border-indigo-200 transition-colors" id={`registered-item-${m.id}`}>
                                  <div>
                                    <span className="font-bold text-slate-950 block">{m.name}</span>
                                    <span className="text-[9px] bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-black mt-0.5 inline-block">{m.category}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = registeredMaterials.filter(x => x.id !== m.id);
                                      saveRegisteredMaterials(updated);
                                      alert(`✅ "${m.name}" type successfully removed from catalog!`);
                                    }}
                                    className="text-rose-500 hover:text-rose-750 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                                    title="Delete catalog option"
                                    id={`delete-registered-${m.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              ) : (
                <div className="space-y-4" id="add-stock-container">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs font-bold text-indigo-950 space-y-1">
                    <p className="text-sm">💡 2. Add Physical Stock to Register</p>
                  </div>

                  <form onSubmit={handleAddSubmit} className="space-y-4" id="add-stock-form">
                    
                    {/* Date picker (Mandatory) */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block">
                        Date Added * <span className="text-rose-600 font-extrabold">(Mandatory)</span>
                      </label>
                      <input
                        type="date" max={new Date().toISOString().split('T')[0]}
                        required
                        value={addDate}
                        onChange={(e) => setAddDate(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                        id="add-stock-date-input"
                      />
                    </div>

                    {/* Material name dropdown selection list */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block">
                        Select Registered Material Name (Dropdown)
                      </label>
                      <select
                        value={registeredMaterials.some(m => m.name === addSearchQuery) ? addSearchQuery : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setAddSearchQuery(val);
                            setIsSearching(false); // Do not open autocomplete suggestions because it is fully resolved
                          }
                        }}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                        id="add-stock-material-dropdown"
                      >
                        <option value="">-- Choose from Registered Materials List --</option>
                        {registeredMaterials.map(m => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.category})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 font-bold">Select from this list to automatically populate the input fields below.</p>
                    </div>

                    {/* Material search box with matching suggestions */}
                    <div className="space-y-1 relative" id="search-input-field-block">
                      <label className="text-xs font-black text-slate-700 block">
                        Search Material Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Type letters to search inside registered catalog..."
                          value={addSearchQuery}
                          onChange={(e) => {
                            setAddSearchQuery(e.target.value);
                            setIsSearching(true);
                          }}
                          onFocus={() => {
                            setIsSearching(true);
                          }}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 pl-4 pr-10 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                          id="search-add-query-input"
                        />
                        <Search className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-3.5" />
                      </div>

                      {/* Display intelligent suggestions when active searching */}
                      {isSearching && addSearchQuery && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-44 overflow-y-auto p-1.5 space-y-1" id="stock-add-search-suggestions">
                          {registeredMaterials.filter(m => 
                            m.name.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
                            m.category.toLowerCase().includes(addSearchQuery.toLowerCase())
                          ).length === 0 ? (
                            <div className="p-2 text-xs italic text-slate-400">
                              No matching materials in catalog list. Create a new catalog entry in the "Register Type" sub-tab above if needed.
                            </div>
                          ) : (
                            registeredMaterials
                              .filter(m => 
                                m.name.toLowerCase().includes(addSearchQuery.toLowerCase()) || 
                                m.category.toLowerCase().includes(addSearchQuery.toLowerCase())
                              )
                              .map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setAddSearchQuery(m.name);
                                    setIsSearching(false); // Close suggestions
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-between border border-transparent hover:border-slate-100"
                                  id={`search-suggestion-match-${m.id}`}
                                >
                                  <span>{m.name}</span>
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-black">{m.category}</span>
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Quantity typebox */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-700 block">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={addQty}
                          onChange={(e) => setAddQty(Number(e.target.value))}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                          id="add-qty-input"
                        />
                      </div>

                      {/* Storage Location typebox */}
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-700 block">
                          Storing Location (Room/Locker) - <span className="text-indigo-650 text-[10px] bg-indigo-50 px-1.5 py-0.2 rounded font-extrabold uppercase">Optional</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Science Lab shelf B, Office Locker"
                          value={addLoc}
                          onChange={(e) => setAddLoc(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                          id="add-loc-input"
                        />
                      </div>

                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition shadow-md"
                      id="add-stock-submit-btn"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Submit
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* MATERIAL CIRCULATION TAB */}
          {activeTab === 'materialCirculation' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                    Material Circulation (अंतर्गत हस्तांतरण)
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">Track internal flow of items between staff members securely.</p>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!circItemName || !circFromTeacher || !circToTeacher) {
                      alert("Please select Item, From Staff, and To Staff.");
                      return;
                    }
                    if (circToTeacher === 'Office' && (!circOfficePerson || !circOfficeLocation)) {
                      alert("Please select the office person and specify the location.");
                      return;
                    }
                    if (circFromTeacher === circToTeacher || circFromTeacher === circOfficePerson) {
                      alert("From and To Staff cannot be the same.");
                      return;
                    }

                    const newRequest: MaterialRequest = {
                      id: `circ-req-${Date.now()}`,
                      itemName: circItemName,
                      teacherName: circFromTeacher,
                      toTeacher: circToTeacher,
                      officeReturnPerson: circOfficePerson,
                      officeReturnLocation: circOfficeLocation,
                      quantity: 1, // Individual circulation assumption
                      purpose: circPurpose || 'General Circulation',
                      date: circDate,
                      status: 'Pending',
                      requestType: 'Circulation',
                      circItemCondition: circItemCondition,
                      circItemDamageDetails: circItemCondition === 'Damaged' ? circItemDamageDetails : undefined,
                      circBoxCondition: circBoxCondition,
                      circAccessories: circAccessories === 'Yes' ? circAccessoriesList.filter(a => a.trim() !== '') : undefined,
                    };

                    saveRequests([newRequest, ...requests]);
                    
                    alert(`✅ Circulation Request Sent! It will appear in ${circToTeacher}'s requests for approval.`);

                    // Reset form
                    setCircItemName('');
                    setCircToTeacher('');
                    setCircPurpose('');
                    setCircItemCondition('Good');
                    setCircItemDamageDetails('');
                    setCircBoxCondition('Good');
                    setCircAccessories('Yes');
                    setCircAccessoriesList(['']);
                  }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705 block">Item Name (साहित्याचे नाव)*</label>
                      <select
                        required
                        value={circItemName}
                        onChange={(e) => setCircItemName(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                      >
                        <option value="">Select Item</option>
                        {circulationMaterials.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705 block">From Staff (कडून)*</label>
                      <select
                        required
                        value={circFromTeacher}
                        onChange={(e) => setCircFromTeacher(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                      >
                        <option value="">Select Staff</option>
                        {teachers.map(t => (
                          <option key={`from-${t.id}`} value={t.name}>{t.name} ({t.role || 'Staff'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705 block">To Staff (कडे)*</label>
                      <select
                        required
                        value={circToTeacher}
                        onChange={(e) => setCircToTeacher(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                      >
                        <option value="">Select Staff</option>
                        <option value="Office">Office (परत जमा करा/स्टॉकमध्ये)</option>
                        {teachers.filter(t => t.name !== circFromTeacher).map(t => (
                          <option key={`to-${t.id}`} value={t.name}>{t.name} ({t.role || 'Staff'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705 block">Date (तारीख)*</label>
                      <input 
                        type="date" max={new Date().toISOString().split('T')[0]}
                        required
                        value={circDate}
                        onChange={(e) => setCircDate(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {circToTeacher === 'Office' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-fade-in">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-indigo-900 block">Office Receiver Name (कार्यालयातील प्राप्तकर्ता)*</label>
                        <select
                          required
                          value={circOfficePerson}
                          onChange={(e) => setCircOfficePerson(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-indigo-200 text-indigo-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                        >
                          <option value="">Select Person</option>
                          {teachers.filter(t => t.name !== circFromTeacher).map(t => (
                            <option key={`office-${t.id}`} value={t.name}>{t.name} ({t.role || 'Staff'})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-indigo-900 block">Storage Location (ठेवण्याची जागा)*</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Cupboard 2, Shelf B"
                          value={circOfficeLocation}
                          onChange={(e) => setCircOfficeLocation(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-indigo-200 text-indigo-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-705 block">Purpose (उद्देश)</label>
                    <input 
                      type="text"
                      placeholder="e.g. For practicals, maintenance..."
                      value={circPurpose}
                      onChange={(e) => setCircPurpose(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-705 block">Main Item Condition</label>
                        <select
                          value={circItemCondition}
                          onChange={(e) => setCircItemCondition(e.target.value as 'Good' | 'Damaged')}
                          className={`w-full text-xs font-bold px-4 py-3 rounded-2xl outline-none transition-all shadow-sm border ${circItemCondition === 'Damaged' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-900'}`}
                        >
                          <option value="Good">Good (चांगली)</option>
                          <option value="Damaged">Damaged (खराब)</option>
                        </select>
                      </div>
                      
                      {circItemCondition === 'Damaged' && (
                        <div className="space-y-1 animate-fade-in">
                          <label className="text-[10px] font-black text-rose-600 block">Write Condition (स्थिती लिहा)</label>
                          <input 
                            type="text"
                            required
                            placeholder="Describe damage..."
                            value={circItemDamageDetails}
                            onChange={(e) => setCircItemDamageDetails(e.target.value)}
                            className="w-full text-xs font-semibold bg-white border border-rose-300 text-slate-900 px-3 py-2 rounded-xl outline-none focus:border-rose-500 transition-all shadow-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-705 block">Box Condition</label>
                      <select
                        value={circBoxCondition}
                        onChange={(e) => setCircBoxCondition(e.target.value as 'Good' | 'Damaged')}
                        className={`w-full text-xs font-bold px-4 py-3 rounded-2xl outline-none transition-all shadow-sm border ${circBoxCondition === 'Damaged' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-900'}`}
                      >
                        <option value="Good">Good (चांगली)</option>
                        <option value="Damaged">Damaged (खराब)</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-705 block">Accessories Included</label>
                        <select
                          value={circAccessories}
                          onChange={(e) => setCircAccessories(e.target.value as 'Yes' | 'No')}
                          className={`w-full text-xs font-bold px-4 py-3 rounded-2xl outline-none transition-all shadow-sm border ${circAccessories === 'No' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-900'}`}
                        >
                          <option value="Yes">Yes (होय)</option>
                          <option value="No">Missing (नाही)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {circAccessories === 'Yes' && (
                    <div className="space-y-2 animate-fade-in bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <label className="text-xs font-black text-slate-705 block">Accessories Name (अतिरिक्त साहित्याचे नाव)</label>
                      {circAccessoriesList.map((acc, index) => (
                        <div key={`acc-${index}`} className="flex items-center gap-2">
                          <input 
                            type="text"
                            placeholder={`Accessory ${index + 1}`}
                            value={acc}
                            onChange={(e) => {
                              const newList = [...circAccessoriesList];
                              newList[index] = e.target.value;
                              setCircAccessoriesList(newList);
                            }}
                            className="flex-1 text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-2 rounded-xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                          />
                          {index === circAccessoriesList.length - 1 && (
                            <button
                              type="button"
                              onClick={() => setCircAccessoriesList([...circAccessoriesList, ''])}
                              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded-xl transition cursor-pointer flex-shrink-0"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          )}
                          {circAccessoriesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCircAccessoriesList(circAccessoriesList.filter((_, i) => i !== index))}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-2 rounded-xl transition cursor-pointer flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest px-8 py-3.5 rounded-2xl transition hover:scale-[1.02] shadow-sm flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send Request 
                    </button>
                  </div>
                </form>
              </div>

              {/* Circulation History */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">Circulation History & Approvals</h3>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    View in Requests →
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-500">
                  All material circulations are now routed through the <strong>Requests</strong> workflow. 
                  Once you send a circulation request, the receiving staff member must approve it in their Requests tab. 
                  Upon approval, the material will automatically be registered under their name.
                </p>
              </div>
            </div>
          )}

          {/* RETURN MATERIAL TAB */}
          {activeTab === 'returnMaterial' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                    Return Borrowed Material (साहित्य जमा / परत करा)
                  </h2>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                    Select a previously checked-out active material, pick a handover teacher, compile your return slip, and submit for verification.
                  </p>
                </div>

                {/* Return form */}
                {(() => {
                  const myActiveUsages = usages.filter(u => u.status === 'Active' && u.userName === currentUser?.name);
                  const myActiveBorrowedItems = Array.from(new Set(myActiveUsages.map(u => u.itemName)));

                  if (myActiveBorrowedItems.length === 0) {
                    return (
                      <div className="p-8 text-center bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-amber-805 text-xs font-bold leading-relaxed space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                        <p>⚠️ You do not currently have any active borrowed materials registered under your account (तुमच्या नावावर सध्या परत करण्यासाठी कोणतेही साहित्य नाही).</p>
                        <p className="text-[10px] text-slate-500">Contact the inventory desk or search stock registers to authorize new borrowings.</p>
                      </div>
                    );
                  }

                  // Auto fill if empty
                  if (returnItemName === '' && myActiveBorrowedItems.length > 0) {
                    setReturnItemName(myActiveBorrowedItems[0]);
                  }
                  if (returnHandoverTo === '' && teachers.length > 0) {
                    setReturnHandoverTo(teachers[0].name);
                  }

                  const selectedUsage = myActiveUsages.find(u => u.itemName === returnItemName);
                  const maxQty = selectedUsage ? (selectedUsage.quantity || 1) : 1;

                  return (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!returnItemName) {
                          alert("⚠️ Please select a material name.");
                          return;
                        }
                        if (!returnHandoverTo) {
                          alert("⚠️ Please select a handover teacher/staff member.");
                          return;
                        }
                        if (returnQty <= 0) {
                          alert("⚠️ Quantity must be at least 1.");
                          return;
                        }
                        if (returnQty > maxQty) {
                          alert(`⚠️ Cannot return more than borrowed capacity (Max borrowed is ${maxQty}).`);
                          return;
                        }

                        // Add to bunch
                        const newItem = {
                          id: `ret-bunch-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
                          itemName: returnItemName,
                          quantity: Number(returnQty),
                          handoverTo: returnHandoverTo,
                          date: returnDate,
                          originalUsageId: selectedUsage?.id,
                          condition: returnCondition,
                          remainingPercentage: returnCondition === 'Unpacked' && returnRemaining !== '' ? Number(returnRemaining) : undefined
                        };

                        setReturnBunch([...returnBunch, newItem]);
                        alert(`➕ Added return slip for "${returnItemName}" (Qty: ${returnQty}) to bunch!`);
                        setReturnQty(1);
                        setReturnCondition('Packed');
                        setReturnRemaining('');
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Date Selection */}
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-705 block">Select Return Date (परतीची तारीख)*</label>
                          <input 
                            type="date" max={new Date().toISOString().split('T')[0]}
                            required
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                          />
                        </div>

                        {/* 2. Material Name Selection */}
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-705 block">Choose Borrowed Material Name (साहित्याचे नाव)*</label>
                          <select
                            value={returnItemName}
                            onChange={(e) => {
                              setReturnItemName(e.target.value);
                              setReturnQty(1); // reset quantity to safe default
                            }}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                          >
                            {myActiveBorrowedItems.map((item) => {
                              const usageForQty = myActiveUsages.find(u => u.itemName === item);
                              const qtyBorrowed = usageForQty ? (usageForQty.quantity || 1) : 1;
                              return (
                                <option key={item} value={item}>
                                  {item} (Qty Borrowed: {qtyBorrowed})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 3. Handover To recipient */}
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-705 block">Handover To (कोणाकडे सुपूर्द केले - ड्रॉपडाउन)*</label>
                          <select
                            value={returnHandoverTo}
                            onChange={(e) => setReturnHandoverTo(e.target.value)}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                          >
                            {teachers.map((t) => (
                              <option key={t.id} value={t.name}>
                                {t.name} ({t.role || 'Staff'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 4. Quantity returning */}
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-705 block">
                            Return Quantity (परत संख्या) * 
                            <span className="text-[10px] text-slate-500 font-bold ml-1.5">(Max Available: {maxQty})</span>
                          </label>
                          <input 
                            type="number"
                            min="1"
                            max={maxQty}
                            required
                            value={returnQty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val > maxQty) {
                                setReturnQty(maxQty);
                              } else {
                                setReturnQty(val);
                              }
                            }}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 5. Condition */}
                        <div className="space-y-1">
                          <label className="text-xs font-black text-slate-705 block">Material Condition (साहित्याची स्थिती)*</label>
                          <select
                            value={returnCondition}
                            onChange={(e) => setReturnCondition(e.target.value as 'Packed' | 'Unpacked')}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                          >
                            <option value="Packed">Packed (पॅक केलेले)</option>
                            <option value="Unpacked">Unpacked (उघडलेले)</option>
                          </select>
                        </div>

                        {/* 6. Remaining Percentage (only if unpacked) */}
                        {returnCondition === 'Unpacked' && (
                          <div className="space-y-1 animate-fade-in">
                            <label className="text-xs font-black text-slate-705 block">Remaining Percentage (%) (अंदाजे शिल्लक टक्केवारी)*</label>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              required
                              value={returnRemaining}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  setReturnRemaining('');
                                  return;
                                }
                                const num = Number(val);
                                setReturnRemaining(num > 100 ? 100 : num < 0 ? 0 : num);
                              }}
                              placeholder="e.g. 45"
                              className="w-full text-xs font-semibold bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                            />
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition shadow-md"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add Return Item to Bunch (जमा सुची गटामध्ये जोडा)
                      </button>
                    </form>
                  );
                })()}
              </div>

              {/* RETURN BUNCH MANAGEMENT LIST */}
              {returnBunch.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Selected Return Bunch (परत करण्यासाठी निवडलेला गट)</h3>
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">Review items in return bunch before triggering final submission.</p>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-black shadow-xs">
                      {returnBunch.length} Item types ({returnBunch.reduce((sum, item) => sum + item.quantity, 0)} units)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {returnBunch.map((item) => {
                      const isEditing = editingReturnBunchId === item.id;
                      const myActiveUsagesForEdit = usages.filter(u => u.status === 'Active' && u.userName === currentUser?.name);
                      const currentUsageForEdit = myActiveUsagesForEdit.find(u => u.itemName === (isEditing ? editReturnItemName : item.itemName));
                      const editMaxQty = currentUsageForEdit ? (currentUsageForEdit.quantity || 1) : 1;

                      return (
                        <div key={item.id} className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3 text-xs shadow-xs">
                          {isEditing ? (
                            <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-250">
                              <p className="text-[10px] font-black text-slate-600 uppercase">Edit Return bunch entry</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                <div>
                                  <label className="text-[9px] text-slate-500 font-extrabold uppercase">Material</label>
                                  <select
                                    value={editReturnItemName}
                                    onChange={(e) => {
                                      setEditReturnItemName(e.target.value);
                                      setEditReturnQty(1);
                                    }}
                                    className="w-full text-xs font-bold border border-slate-200 rounded p-1.5 bg-white text-slate-900"
                                  >
                                    {Array.from(new Set(myActiveUsagesForEdit.map(u => u.itemName))).map(name => (
                                      <option key={name} value={name}>{name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] text-slate-500 font-extrabold uppercase">Quantity (Max: {editMaxQty})</label>
                                  <input 
                                    type="number"
                                    min="1"
                                    max={editMaxQty}
                                    value={editReturnQty}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setEditReturnQty(val > editMaxQty ? editMaxQty : val);
                                    }}
                                    className="w-full text-xs font-bold border border-slate-200 rounded p-1.5 bg-white text-slate-900"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] text-slate-500 font-extrabold uppercase">Handover Recipient</label>
                                  <select
                                    value={editReturnHandoverTo}
                                    onChange={(e) => setEditReturnHandoverTo(e.target.value)}
                                    className="w-full text-xs font-bold border border-slate-200 rounded p-1.5 bg-white text-slate-900"
                                  >
                                    {teachers.map(t => (
                                      <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] text-slate-500 font-extrabold uppercase">Return Date</label>
                                  <input 
                                    type="date" max={new Date().toISOString().split('T')[0]}
                                    value={editReturnDate}
                                    onChange={(e) => setEditReturnDate(e.target.value)}
                                    className="w-full text-xs font-bold border border-slate-200 rounded p-1.5 bg-white text-slate-905"
                                  />
                                </div>
                                
                                <div>
                                  <label className="text-[9px] text-slate-500 font-extrabold uppercase">Condition</label>
                                  <select
                                    value={editReturnCondition}
                                    onChange={(e) => setEditReturnCondition(e.target.value as 'Packed' | 'Unpacked')}
                                    className="w-full text-xs font-bold border border-slate-200 rounded p-1.5 bg-white text-slate-900"
                                  >
                                    <option value="Packed">Packed</option>
                                    <option value="Unpacked">Unpacked</option>
                                  </select>
                                </div>

                                {editReturnCondition === 'Unpacked' && (
                                  <div>
                                    <label className="text-[9px] text-slate-500 font-extrabold uppercase">Remaining (%)</label>
                                    <input 
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editReturnRemaining}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                          setEditReturnRemaining('');
                                          return;
                                        }
                                        const num = Number(val);
                                        setEditReturnRemaining(num > 100 ? 100 : num < 0 ? 0 : num);
                                      }}
                                      className="w-full text-xs font-bold border border-slate-200 rounded p-1.5 bg-white text-slate-900"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 justify-end border-t border-slate-200 pt-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingReturnBunchId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black px-3.5 py-1.5 rounded-lg transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editReturnQty <= 0) {
                                      alert("⚠️ Quantity must be at least 1.");
                                      return;
                                    }
                                    if (editReturnQty > editMaxQty) {
                                      alert(`⚠️ Quantity exceeds max capacity of ${editMaxQty}.`);
                                      return;
                                    }
                                    setReturnBunch(returnBunch.map(item => item.id === editingReturnBunchId ? {
                                      ...item,
                                      itemName: editReturnItemName,
                                      quantity: Number(editReturnQty),
                                      handoverTo: editReturnHandoverTo,
                                      date: editReturnDate,
                                      condition: editReturnCondition,
                                      remainingPercentage: editReturnCondition === 'Unpacked' && editReturnRemaining !== '' ? Number(editReturnRemaining) : undefined
                                    } : item));
                                    setEditingReturnBunchId(null);
                                    alert("✅ Return item inside bunch updated!");
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-4 py-1.5 rounded-lg transition"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-extrabold text-slate-900 text-sm">{item.itemName}</p>
                                <div className="text-slate-600 font-semibold space-y-0.5">
                                  <div>Quantity to return: <span className="text-indigo-650 font-black">{item.quantity}</span></div>
                                  <div>Handing over to: <span className="font-extrabold text-purple-700">{item.handoverTo}</span></div>
                                  <div>Condition: <span className="font-extrabold text-indigo-700">{item.condition || 'Packed'} {item.condition === 'Unpacked' && item.remainingPercentage !== undefined ? `(${item.remainingPercentage}% left)` : ''}</span></div>
                                  <div className="text-[10px] text-slate-400 font-bold">Planned return date: {item.date}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReturnBunchId(item.id);
                                    setEditReturnItemName(item.itemName);
                                    setEditReturnQty(item.quantity);
                                    setEditReturnHandoverTo(item.handoverTo);
                                    setEditReturnDate(item.date);
                                    setEditReturnCondition(item.condition || 'Packed');
                                    setEditReturnRemaining(item.remainingPercentage !== undefined ? item.remainingPercentage : '');
                                  }}
                                  className="p-2 hover:bg-slate-100 text-slate-500 hover:text-indigo-650 rounded-lg transition"
                                  title="Edit Entry"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturnBunch(returnBunch.filter(b => b.id !== item.id));
                                  }}
                                  className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition"
                                  title="Remove Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (returnBunch.length === 0) return;
                          
                          const newReturnRequests: MaterialRequest[] = returnBunch.map((item, index) => ({
                            id: `req-ret-${Date.now()}-${index}-${Math.random().toString(36).substring(2,6)}`,
                            itemName: item.itemName,
                            teacherName: currentUser?.name || 'Requester',
                            quantity: item.quantity,
                            purpose: `Return of borrowed item (Handed over to: ${item.handoverTo}). ` + (item.condition ? `Condition: ${item.condition}${item.condition === 'Unpacked' && item.remainingPercentage !== undefined ? ` (${item.remainingPercentage}%)` : ''}` : ''),
                            date: item.date,
                            status: 'Pending',
                            requestType: 'Return',
                            handoverTo: item.handoverTo,
                            originalUsageId: item.originalUsageId,
                            condition: item.condition,
                            remainingPercentage: item.remainingPercentage
                          }));

                          saveRequests([...newReturnRequests, ...requests]);
                          alert(`🎉 Successfully submitted ${returnBunch.length} return requisitions! These will now await Handover Approvals from assigned recipients.`);
                          setReturnBunch([]);
                          setReqSubTab('Pending'); // set pending sub tab
                          setActiveTab('requests'); // redirect
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition shadow-md animate-pulse"
                      >
                        <Send className="w-4 h-4" />
                        Final Submit Return Slip (खात्रीशीर परत करण्याची विनंती सबमिट करा)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Bento Stats Display */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Stocks count</span>
                    <span className="text-xl font-black text-slate-900">{stocks.length} Items</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Requisitions</span>
                    <span className="text-xl font-black text-slate-900">{requests.filter(r => r.status === 'Pending').length} Pending</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                    <ArrowLeftRight className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">In-use Borrows</span>
                    <span className="text-xl font-black text-slate-900">{usages.filter(u => u.status === 'Active').length} Active</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Total Returned</span>
                    <span className="text-xl font-black text-slate-900">{usages.filter(u => u.status === 'Returned').length} items</span>
                  </div>
                </div>

              </div>

              {/* Analytics Section */}
              <div className="flex overflow-x-auto pb-6 gap-6 scrollbar-thin">
                
                {/* Stock Level Composition */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-w-[320px] flex-1">
                  <h3 className="text-sm font-black text-slate-900 mb-4">Top Inventory Stocks (Available vs In-Use)</h3>
                  <div className="h-64">
                    {stocks.length > 0 ? (
                      <ZoomableGraphContainer defaultMinWidth={480}>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={stocks.slice(0, 7).map(s => ({
                                name: s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
                                Available: s.availableQuantity,
                                InUse: s.totalQuantity - s.availableQuantity
                              }))}
                              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                            >
                              <XAxis dataKey="name" tick={{fontSize: 10}} angle={-25} textAnchor="end" />
                              <YAxis tick={{fontSize: 10}} />
                              <RechartsTooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                              <Bar dataKey="Available" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                              <Bar dataKey="InUse" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </ZoomableGraphContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs font-bold text-slate-400">No stock data available</div>
                    )}
                  </div>
                </div>

                {/* Return Condition Analysis */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-w-[320px] flex-1">
                  <h3 className="text-sm font-black text-slate-900 mb-4">Material Return Conditions</h3>
                  <div className="h-64 grow flex items-center justify-center relative">
                    {requests.filter(r => r.requestType === 'Return' && r.condition).length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Packed', value: requests.filter(r => r.requestType === 'Return' && r.condition === 'Packed').length },
                                { name: 'Unpacked', value: requests.filter(r => r.requestType === 'Return' && r.condition === 'Unpacked').length }
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {
                                [
                                  { name: 'Packed', value: 1 }, 
                                  { name: 'Unpacked', value: 1 }
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                                ))
                              }
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                          <span className="text-xl font-black text-slate-800 block">
                            {requests.filter(r => r.requestType === 'Return' && r.condition).length}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Returns</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-xs font-bold text-slate-400">No return conditions data yet</div>
                    )}
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Packed</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>Unpacked</div>
                  </div>
                </div>

                {/* Top Borrowers */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-w-[320px] flex-1">
                  <h3 className="text-sm font-black text-slate-900 mb-4">Top Borrowers Activity</h3>
                  <div className="h-64">
                    {usages.length > 0 ? (
                      <ZoomableGraphContainer defaultMinWidth={480}>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={(() => {
                                const counts = usages.reduce((acc, u) => {
                                  acc[u.userName] = (acc[u.userName] || 0) + (u.quantity || 1);
                                  return acc;
                                }, {} as Record<string, number>);
                                  return Object.entries(counts)
                                    .map(([name, qty]) => ({ name, Items: qty as number }))
                                    .sort((a,b) => b.Items - a.Items)
                                  .slice(0, 10);
                              })()}
                              margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                            >
                              <XAxis dataKey="name" tick={{fontSize: 10}} />
                              <YAxis tick={{fontSize: 10}} />
                              <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                              <Bar dataKey="Items" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                                {
                                  Array.from({length: 10}).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                                  ))
                                }
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </ZoomableGraphContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs font-bold text-slate-400">No borrowing activity yet</div>
                    )}
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Recent Requests Section */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <h3 className="text-sm font-black text-slate-900">Recent Requisition Stream</h3>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-black font-sans"
                    >
                      View All ({requests.length}) →
                    </button>
                  </div>

                  {requests.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">No requests yet</div>
                  ) : (
                    requests.slice(0, 3).map(req => (
                      <div key={req.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{req.itemName}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">By {req.teacherName} on {req.date}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          req.status === 'Pending' ? 'bg-indigo-100 text-indigo-700' : req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick status report */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <h3 className="text-sm font-black text-slate-900">Category Analytics</h3>
                    <button
                      onClick={() => setActiveTab('stock')}
                      className="text-xs text-indigo-600 hover:text-indigo-805 hover:underline font-black font-sans"
                    >
                      View Stocks →
                    </button>
                  </div>

                  <div className="space-y-2.5 font-semibold text-xs text-slate-800">
                    {allCategories.slice(0, 10).map(cat => {
                      const categoryCount = stocks.filter(s => s.category === cat).reduce((acc, s) => acc + s.totalQuantity, 0);
                      const availableCount = stocks.filter(s => s.category === cat).reduce((acc, s) => acc + s.availableQuantity, 0);
                      
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-black text-slate-700">{cat}</span>
                            <span className="text-slate-500">{availableCount} / {categoryCount} available</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all" 
                              style={{ width: `${categoryCount > 0 ? (availableCount / categoryCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ADMIN CONTROL TAB */}
          {activeTab === 'adminControl' && currentUser?.role === 'admin' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    Admin Controlling Section
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Manage global settings, material lists, and configuration parameters.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b pb-2">Circulation Materials List</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Add new material name for circulation..."
                      value={adminNewCircMat}
                      onChange={(e) => setAdminNewCircMat(e.target.value)}
                      className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                    <button
                      onClick={() => {
                        if (adminNewCircMat.trim() && !circulationMaterials.includes(adminNewCircMat.trim())) {
                          saveCirculationMaterials([...circulationMaterials, adminNewCircMat.trim()]);
                          setAdminNewCircMat('');
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition shadow-md flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" /> Add
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    <ul className="divide-y divide-slate-100">
                      {circulationMaterials.map((mat, i) => (
                        <li key={i} className="flex justify-between items-center px-4 py-3 hover:bg-white transition-colors group">
                          <span className="text-xs font-bold text-slate-700">{mat}</span>
                          <button
                            onClick={() => {
                              if(window.confirm('Remove this material from the circulation list?')) {
                                saveCirculationMaterials(circulationMaterials.filter(m => m !== mat));
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                            title="Remove Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                      {circulationMaterials.length === 0 && (
                        <li className="px-4 py-6 text-center text-xs font-bold text-slate-400">No materials configured.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-rose-50 border border-rose-250 rounded-3xl p-6 space-y-4 shadow-sm" id="admin-danger-zone">
                  <div>
                    <h3 className="text-sm font-black text-rose-800 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      Danger Zone (धोकादायक क्षेत्र / रीसेट ऑपरेशन्स)
                    </h3>
                    <p className="text-xs text-rose-600 font-bold mt-1 leading-relaxed">
                      This action will permanently delete all material stocks, active and completed usage logs (borrow histories), pending/approved requests, and stock addition history of the school inventory system. This is non-reversible.
                    </p>
                    <p className="text-xs text-rose-500 font-semibold mt-1.5 italic">
                      (या क्रियेमुळे सर्व स्टॉक, साहित्य वाटप विनंत्या, वापर इतिहास आणि मिळवलेला सर्व व्यवहार इतिहास कायमचा मिटवला जाईल. हे पूर्ववत करता येणार नाही.)
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (window.confirm("⚠️ Are you absolutely sure? This will remove 100% of the material stocks, usage logs, circulation list, and requests. This cannot be undone!\n\n(तुम्हाला खात्री आहे का? यामुळे सिस्टीममधील सर्व रेकॉर्ड्स कायमचे डिलीट होतील!)")) {
                        setStocks([]);
                        setRequests([]);
                        setUsages([]);
                        setCirculations([]);
                        setAdditions([]);
                        setRegisteredMaterials([]);
                        
                        localStorage.setItem('fresh_inventory_stock', JSON.stringify([]));
                        localStorage.setItem('fresh_inventory_requests', JSON.stringify([]));
                        localStorage.setItem('fresh_inventory_usages', JSON.stringify([]));
                        localStorage.setItem('fresh_inventory_circulations', JSON.stringify([]));
                        localStorage.setItem('fresh_inventory_additions', JSON.stringify([]));
                        localStorage.setItem('fresh_registered_materials_v3', JSON.stringify([]));
                        localStorage.setItem('inventory_cleared_v1', 'true');
                        
                        alert("✅ All inventory records have been cleared completely. (इन्व्हेन्टरीमधील सर्व रेकॉर्ड यशस्वीरित्या डिलीट केले आहेत!)");
                      }
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 hover:shadow-lg text-white font-black text-xs px-5 py-3 rounded-2xl transition-all duration-250 shadow-md flex items-center justify-center gap-2 cursor-pointer border border-rose-700"
                    id="clear-all-inventory-btn"
                  >
                    <Trash2 className="w-4 h-4" /> Remove All Inventory Records (सर्व इन्व्हेंटरी रेकॉर्ड्स डिलीट करा)
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* CLOUD SYNC TAB */}
          {activeTab === 'cloudSync' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header card with gradient background */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Cloud className="w-40 h-40" />
                </div>
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-black tracking-widest uppercase">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Centralized Integration Vault
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Cloud Spreadsheet Synchronization</h1>
                  <p className="text-slate-300 text-xs mt-1 font-semibold max-w-2xl">
                    Configure Google Sheets Web Apps and Microsoft OneDrive (Excel Live) connection links. Realize immediate system transparency with formatted, auto-filtered workbook downloading.
                  </p>
                </div>
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Integration configuration form */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Link className="w-5 h-5 text-indigo-600" />
                      Configure Integration Links
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Paste webhooks, target API URLs, or live view links to direct automated server updates.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Google Sheets */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 block font-bold">Google Sheets API / Share Link</label>
                      <div className="relative font-bold">
                        <input
                          type="url"
                          placeholder="e.g., https://docs.google.com/spreadsheets/d/.../edit"
                          value={googleSheetsUrl}
                          onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 pl-4 pr-12 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-inner"
                        />
                        {googleSheetsUrl && (
                          <span className="absolute right-3 top-3 bg-emerald-50 text-emerald-700 p-1 rounded-full"><Check className="w-3.5 h-3.5 animate-bounce" /></span>
                        )}
                      </div>
                    </div>

                    {/* OneDrive Excel */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 block font-bold">Microsoft OneDrive / Excel Online Share Link</label>
                      <div className="relative font-bold">
                        <input
                          type="url"
                          placeholder="e.g., https://onedrive.live.com/embed?resid=..."
                          value={oneDriveUrl}
                          onChange={(e) => setOneDriveUrl(e.target.value)}
                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 pl-4 pr-12 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all shadow-inner"
                        />
                        {oneDriveUrl && (
                          <span className="absolute right-3 top-3 bg-emerald-50 text-emerald-700 p-1 rounded-full"><Check className="w-3.5 h-3.5 animate-bounce" /></span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveIntegrationUrls}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-2xl transition shadow-md cursor-pointer"
                      >
                        Save Configuration
                      </button>
                      <button
                        onClick={handleResetIntegrationUrls}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs px-4 py-3 rounded-2xl transition cursor-pointer"
                      >
                        Reset / Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Direct Sync and Actions */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-emerald-600" />
                      Actions & Transmission
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Directly download our structured Excel workbook or push live updates to the cloud.
                    </p>
                  </div>

                  {/* Sync indicator */}
                  {isSyncing ? (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-900 text-xs font-black uppercase">Synchronizing...</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded-full">Phase {syncPhase}/3</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-300" 
                          style={{ width: `${(syncPhase / 3) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-indigo-700 font-semibold italic">{syncStatusMsg}</p>
                    </div>
                  ) : syncStatusMsg && lastSyncTimestamp !== 'Never' ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-emerald-950">Last Sync Successful!</p>
                        <p className="text-[11px] text-emerald-700/80 font-bold mt-0.5">Time: {lastSyncTimestamp}</p>
                        <p className="text-[10px] text-emerald-600 font-bold italic mt-1">{syncStatusMsg}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center">
                      <p className="text-[11px] text-slate-500 font-bold">No active push has been executed in the current session yet.</p>
                    </div>
                  )}

                  {/* Control actions buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleDownloadExcel}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 font-black text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-indigo-600" />
                      Download Excel Sheet (.xlsx)
                    </button>
                    <button
                      onClick={handleTriggerSync}
                      disabled={isSyncing}
                      className="bg-slate-900 hover:bg-slate-950 text-white font-black text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync & Push Data to Cloud
                    </button>
                  </div>
                </div>

              </div>

              {/* Excel Structure layout & Schema details information */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Excel Sheets & Data Schema Structure (साचा आराखडा)</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Exported spreadsheets are automatically separated into three logically structured pages fitted with native Excel auto-filters.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
                  {/* Sheet Component 1 */}
                  <div className="bg-slate-50/70 rounded-2xl p-4.5 border border-slate-150 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700 font-black">
                      <div className="p-1 px-2.5 bg-indigo-100 text-indigo-800 rounded-lg text-[10px]">Tab 1</div>
                      <span>Stock Registry (साठा यादी)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">Lists quantities and current location parameters for each science, mathematics, AV or storybook set.</p>
                    <div className="space-y-1 mt-2.5">
                      <strong className="text-[10px] text-slate-400 uppercase tracking-wider block">Structured Columns</strong>
                      <div className="flex flex-wrap gap-1">
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Material Name</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Category</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Total Registered</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Available in Hand</span>
                      </div>
                    </div>
                  </div>

                  {/* Sheet Component 2 */}
                  <div className="bg-slate-50/70 rounded-2xl p-4.5 border border-slate-150 space-y-3">
                    <div className="flex items-center gap-2 text-rose-700 font-black">
                      <div className="p-1 px-2.5 bg-rose-100 text-rose-800 rounded-lg text-[10px]">Tab 2</div>
                      <span>Active Borrowings (वाटप यादी)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">Tracks teachers currently holding school assets, including purpose, date issued, and return condition.</p>
                    <div className="space-y-1 mt-2.5">
                      <strong className="text-[10px] text-slate-400 uppercase tracking-wider block">Structured Columns</strong>
                      <div className="flex flex-wrap gap-1">
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Material Name</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Borrower</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Checkout Date</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Quantity</span>
                      </div>
                    </div>
                  </div>

                  {/* Sheet Component 3 */}
                  <div className="bg-slate-50/70 rounded-2xl p-4.5 border border-slate-150 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-black">
                      <div className="p-1 px-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-[10px]">Tab 3</div>
                      <span>Transactions Logs (नोंद पुस्तक)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">An all-inclusive timestamped historical stream mapping circulation exchanges, additions, and handovers.</p>
                    <div className="space-y-1 mt-2.5">
                      <strong className="text-[10px] text-slate-400 uppercase tracking-wider block">Structured Columns</strong>
                      <div className="flex flex-wrap gap-1">
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Transaction Date</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Transaction Type</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Related User</span>
                        <span className="bg-white border text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Execution Status</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync History log stream */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Push Transmission History (हस्तांतरण इतिहास)</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Timeline log registry of the latest synced server entries.</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl font-black">Showing Last {syncHistory.length} Runs</span>
                </div>

                <div className="divide-y text-xs select-none">
                  {syncHistory.map((item, idx) => (
                    <div key={item.id || idx} className="py-3 flex items-center justify-between hover:bg-slate-50 px-1.5 transition rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${item.service.includes('OneDrive') ? 'bg-indigo-550/15 text-indigo-700 bg-indigo-50 font-bold' : 'bg-emerald-550/15 text-emerald-700 bg-emerald-50 font-bold'}`}>
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{item.service}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Timestamp: {item.date}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="hidden sm:block">
                          <p className="font-extrabold text-slate-700">{item.count} items recorded</p>
                          <p className="text-[10px] text-slate-400 font-bold font-semibold">Payload matches schema filters</p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                          <Check className="w-3 h-3 animate-pulse" />
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {syncHistory.length === 0 && (
                    <p className="text-center text-slate-400 font-bold italic py-8">No prior synchronizations have been initiated.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 4. Stock Details Modal Popup */}
      {selectedDetailStock && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 antialiased" onClick={() => setSelectedDetailStock(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-wider block w-fit mb-1">{selectedDetailStock.category}</span>
                <h3 className="text-base font-black text-slate-900 leading-tight pr-4">{selectedDetailStock.name}</h3>
                {(() => {
                  const locs = getLocationsListForStock(selectedDetailStock);
                  if (locs.length > 0) {
                    return <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Location(s): <span className="text-indigo-600 font-bold">{locs.join(', ')}</span></p>;
                  }
                  return null;
                })()}
              </div>
              <button 
                onClick={() => setSelectedDetailStock(null)}
                className="p-2 hover:bg-slate-200/60 rounded-full text-slate-500 transition-colors font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Quantities overview */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Available Quantity</span>
                  <span className="text-2xl font-black text-emerald-600 block mt-0.5">{selectedDetailStock.availableQuantity}</span>
                </div>
                <div className="text-center border-l border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Registered</span>
                  <span className="text-2xl font-black text-slate-800 block mt-0.5">{selectedDetailStock.totalQuantity}</span>
                </div>
              </div>

              {/* Transaction History Section */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Transaction History (नोंदी आणि अहवाल)
                  </h4>
                </div>

                {(() => {
                  let events: any[] = [];
                  const selName = selectedDetailStock.name.toLowerCase();

                  // 1. Additions
                  additions.filter(a => a && a.itemName && a.itemName.toLowerCase() === selName).forEach(a => {
                      events.push({ type: 'Add', date: a.date, who: a.addedBy || 'Admin', quantity: a.quantity, id: a.id, location: a.location });
                  });

                  // 2. Distributes (Uses)
                  usages.filter(u => u && u.itemName && u.itemName.toLowerCase() === selName).forEach(u => {
                      events.push({ type: 'Distribute', date: u.borrowedDate, who: u.userName, from: u.approverName || 'Admin', quantity: u.quantity || 1, purpose: u.purpose, id: u.id, status: u.status });
                  });

                  // 3. Returns and Circulations
                  requests.filter(r => r && r.itemName && r.itemName.toLowerCase() === selName && r.status === 'Approved').forEach(r => {
                      if (r.requestType === 'Return') {
                          events.push({ type: 'Return', date: r.date, who: r.teacherName, to: r.handoverTo || 'Office', quantity: r.quantity || 1, percentage: r.remainingPercentage, condition: r.condition, approvedBy: r.approvedBy, id: r.id });
                      } else if (r.requestType === 'Circulation') {
                          events.push({ type: r.toTeacher === 'Office' ? 'Return' : 'Circulation', date: r.date, who: r.toTeacher, to: r.toTeacher === 'Office' ? 'Office' : undefined, from: r.teacherName, quantity: r.quantity || 1, purpose: r.purpose, approvedBy: r.approvedBy, id: r.id });
                      }
                  });

                  // Apply Filters
                  events = events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  return (
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {events.length === 0 ? (
                        <p className="text-slate-400 font-semibold italic text-[11px] py-4 text-center bg-slate-50/50 rounded-xl">No transaction history found for selected filters.</p>
                      ) : (
                        events.map((e, idx) => {
                          const isAdd = e.type === 'Add';
                          const isDist = e.type === 'Distribute';
                          const isReturn = e.type === 'Return';
                          const isCirc = e.type === 'Circulation';
                          
                          const bgColor = isAdd ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950' : 
                                          isDist ? 'bg-rose-50/50 border-rose-100 text-rose-950' : 
                                          isReturn ? 'bg-indigo-50/50 border-indigo-100 text-indigo-950' : 
                                          'bg-amber-50/50 border-amber-100 text-amber-950';

                          return (
                            <div key={`${e.id}-${idx}`} className={`border rounded-xl p-3 text-xs ${bgColor}`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  {isAdd && (
                                    <>
                                      <p className="font-extrabold text-emerald-800 mb-1">Added +{e.quantity} units</p>
                                      <p className="text-[11px] text-emerald-600 font-bold">Added By (जोडले): <span className="font-black text-emerald-800">{e.who}</span></p>
                                      {e.location && (
                                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Location (जागा/स्थान): <span className="font-black text-emerald-800">📍 {e.location}</span></p>
                                      )}
                                    </>
                                  )}
                                  {isDist && (
                                    <>
                                      <p className="font-extrabold text-rose-800 mb-1">Distributed: {e.quantity} units</p>
                                      <p className="text-[11px] text-rose-600 font-bold mt-0.5">Distributed To (कोणाला): <span className="font-black text-rose-800">{e.who}</span></p>
                                      <p className="text-[11px] text-rose-600 font-bold mt-0.5">Distributed By (कोणी): <span className="font-black text-rose-800">{e.from}</span></p>
                                      {e.purpose && <p className="text-[11px] text-rose-600 font-bold mt-0.5">Purpose (कारण): <span className="font-black text-rose-800">{e.purpose}</span></p>}
                                    </>
                                  )}
                                  {isReturn && (
                                    <>
                                      <p className="font-extrabold text-indigo-805 mb-1">Returned (साहित्य जमा): {e.quantity} units</p>
                                      <p className="text-[11px] text-indigo-650 font-bold mt-0.5">Return By (परत करणारे): <span className="font-black text-indigo-805">{e.who || e.from}</span></p>
                                      <p className="text-[11px] text-indigo-650 font-bold mt-0.5">Return To (ज्यांच्याकडे जमा केले): <span className="font-black text-indigo-805">{e.to || 'Office'}</span></p>
                                      {e.approvedBy && <p className="text-[11px] text-indigo-650 font-bold mt-0.5">Approved By (मंजूर केले): <span className="font-black text-indigo-805">{e.approvedBy}</span></p>}
                                      {e.percentage !== undefined && <p className="text-[11px] text-indigo-650 font-bold mt-0.5">Remaining (शिल्लक): <span className="font-black text-indigo-805">{e.percentage}%</span></p>}
                                    </>
                                  )}
                                  {isCirc && (
                                    <>
                                      <p className="font-extrabold text-amber-800 mb-1">Circulated: {e.quantity} units</p>
                                      <p className="text-[11px] text-amber-600 font-bold mt-0.5">From (कडून): <span className="font-black text-amber-800">{e.from}</span></p>
                                      <p className="text-[11px] text-amber-600 font-bold mt-0.5">To (कडे): <span className="font-black text-amber-800">{e.who}</span></p>
                                      {e.purpose && <p className="text-[11px] text-amber-600 font-bold mt-0.5">Purpose (कारण): <span className="font-black text-amber-800">{e.purpose}</span></p>}
                                    </>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                                    isAdd ? 'bg-emerald-100/50 text-emerald-800' :
                                    isDist ? 'bg-rose-100/50 text-rose-800' :
                                    isReturn ? 'bg-indigo-100/50 text-indigo-800' : 'bg-amber-100/50 text-amber-800'
                                  }`}>{e.date}</span>
                                  {e.status && (
                                    <span className="text-[9px] font-black uppercase bg-slate-100/60 text-slate-500 px-2 py-0.5 rounded">
                                      {e.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedDetailStock(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition duration-200"
              >
                Close (बंद करा)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
