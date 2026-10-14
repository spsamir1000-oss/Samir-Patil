import { useState, useMemo } from 'react';
import { AttendanceRecord } from '../types';
import * as XLSX from 'xlsx';

const formatToDDMMYYYY = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Calendar,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';

interface AttendanceRecordsProps {
  records: AttendanceRecord[];
  onDeleteRecord: (id: string) => void;
}

export default function AttendanceRecords({ records, onDeleteRecord }: AttendanceRecordsProps) {
  // Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedSchool, setSelectedSchool] = useState('all');
  const [selectedStd, setSelectedStd] = useState('all');
  const [selectedDiv, setSelectedDiv] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, Present, Absent

  // Help alert expander
  const [showImportHelp, setShowImportHelp] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter lists options
  const schools = useMemo(() => Array.from(new Set(records.map(r => r.school))), [records]);
  const standards = useMemo(() => Array.from(new Set(records.map(r => r.std))).sort(), [records]);
  const divisions = useMemo(() => Array.from(new Set(records.map(r => r.div))).sort(), [records]);
  const dates = useMemo(() => Array.from(new Set(records.map(r => r.date))).sort((a, b) => b.localeCompare(a)), [records]);

  // Dynamic filter lists
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDate = selectedDate === 'all' || r.date === selectedDate;
      const matchSchool = selectedSchool === 'all' || r.school === selectedSchool;
      const matchStd = selectedStd === 'all' || r.std === selectedStd;
      const matchDiv = selectedDiv === 'all' || r.div === selectedDiv;
      const matchStatus = selectedStatus === 'all' || r.status === selectedStatus;

      return matchSearch && matchDate && matchSchool && matchStd && matchDiv && matchStatus;
    });
  }, [records, searchQuery, selectedDate, selectedSchool, selectedStd, selectedDiv, selectedStatus]);

  // Overall counts for badges
  const summaryCounts = useMemo(() => {
    const total = filteredRecords.length;
    const p = filteredRecords.filter(r => r.status === 'Present').length;
    const a = filteredRecords.filter(r => r.status === 'Absent').length;
    const h = filteredRecords.filter(r => r.status === 'Holiday').length;
    const l = filteredRecords.filter(r => r.status === 'Leave').length;
    return { total, p, a, h, l };
  }, [filteredRecords]);

  // Export to Excel Workbook
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("No record available for export!");
      return;
    }

    const exportData = filteredRecords.map((r, idx) => {
      let statusLabel = 'A';
      if (r.status === 'Present') statusLabel = 'P';
      else if (r.status === 'Holiday') statusLabel = 'H';
      else if (r.status === 'Leave') statusLabel = 'LH';
      
      return {
        "Sr. No.": idx + 1,
        "School Name": r.school,
        "Student Name": r.studentName,
        "Std": r.std,
        "Division": r.div,
        "Date": formatToDDMMYYYY(r.date),
        "Status": statusLabel
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Records");
    
    // Resize columns
    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 40 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 20 }
    ];

    XLSX.writeFile(workbook, `attendance_records_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Convert and Download CSV formatted for Google Sheets
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert("No record available for download!");
      return;
    }

    // Standard CSV generation with commas and quotes
    const headers = ["Record ID", "Student Name", "School", "Class", "Division", "Date", "Status"];
    const rows = filteredRecords.map(r => [
      r.studentId,
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.school.replace(/"/g, '""')}"`,
      r.std,
      r.div,
      formatToDDMMYYYY(r.date),
      r.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `hajeeri_app_import_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-reset page count
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDate, selectedSchool, selectedStd, selectedDiv, selectedStatus]);

  // Paginated elements
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;

  return (
    <div className="space-y-6">

      {/* Header and Quick Download buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-500" />
            Attendance Records
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Attendance Records — Total: <span className="text-violet-600 font-bold">{records.length}</span> records found
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-violet-650 text-white hover:bg-violet-750 bg-violet-600 rounded-xl shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            Excel Export
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-50 text-indigo-750 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all"
          >
            <FileText className="w-4 h-4" />
            Google Sheets CSV
          </button>
        </div>
      </div>

      {/* Google Sheets CSV Import Instructions alert */}
      {showImportHelp && (
        <div className="relative bg-amber-50 border border-amber-150 rounded-2xl p-5 text-xs text-slate-700 leading-normal space-y-3">
          <button
            onClick={() => setShowImportHelp(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xs"
          >
            Close
          </button>
          <h4 className="font-bold text-amber-850 flex items-center gap-1.5 text-sm">
            <HelpCircle className="w-4.5 h-4.5 text-amber-600" />
            How to Imort class records to Google Sheets:
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 pl-1.5 text-slate-650 font-medium">
            <li>Click on the <span className="text-slate-800 font-bold bg-white px-1.5 py-0.5 rounded border border-amber-200">Google Sheets CSV</span> button above to download the CSV file.</li>
            <li>Open Google Drive or create a new blank Google Sheet directly at <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold underline hover:text-indigo-700">sheets.new</a>.</li>
            <li>In the Google Sheets menu, go to <span className="text-slate-800 font-semibold">File</span> ➔ <span className="text-slate-800 font-semibold">Import</span> ➔ <span className="text-slate-800 font-semibold">Upload</span>.</li>
            <li>Select the downloaded CSV file, choose "Replace spreadsheet" or "Insert new sheet", and click <span className="text-slate-800 font-semibold">Import data</span>.</li>
            <li>All your attendance records will properly load into the Google Sheet! 🚀</li>
          </ol>
        </div>
      )}

      {/* Dynamic Filters form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-405 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Query input */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Student Name</label>
            <input
              type="text"
              placeholder="e.g. Patil"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            />
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Date</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            >
              <option value="all">All Dates</option>
              {dates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* School Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">School</label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            >
              <option value="all">All Schools</option>
              {schools.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Std / Div combination Selector */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Std</label>
              <select
                value={selectedStd}
                onChange={(e) => setSelectedStd(e.target.value)}
                className="w-full text-[11px] font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              >
                <option value="all">All</option>
                {standards.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Div</label>
              <select
                value={selectedDiv}
                onChange={(e) => setSelectedDiv(e.target.value)}
                className="w-full text-[11px] font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              >
                <option value="all">All</option>
                {divisions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Badge options */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            >
              <option value="all">All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Holiday">Holiday</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </div>

        {/* Filters running stats badge counts */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-semibold text-slate-500">
          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-150 shadow-2xs">
            {summaryCounts.total} Total Records
          </span>
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-150 shadow-2xs">
            {summaryCounts.p} Present
          </span>
          <span className="bg-red-50 text-red-705 px-3 py-1 rounded-full border border-red-150 shadow-2xs">
            {summaryCounts.a} Absent
          </span>
          {summaryCounts.h > 0 && (
            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-150 shadow-2xs">
              {summaryCounts.h} Holiday
            </span>
          )}
          {summaryCounts.l > 0 && (
            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-150 shadow-2xs">
              {summaryCounts.l} Leave
            </span>
          )}
        </div>
      </div>

      {/* Records data table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="py-14 text-center text-slate-450 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-350 mx-auto" />
              <div className="text-sm font-semibold">No attendance records found</div>
              <p className="text-xs text-slate-400">Change filters or start taking attendance.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">School Name</th>
                  <th className="py-3 px-4 text-center">Std</th>
                  <th className="py-3 px-4 text-center">Div</th>
                  <th className="py-3 px-4 text-center">Attendance Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center w-12 cursor-default">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-750">
                {paginatedRecords.map((record, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-semibold text-slate-400">{globalIdx}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{record.studentName}</td>
                      <td className="py-3 px-4 text-slate-500 font-medium">{record.school}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">Std {record.std}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{record.div}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600 font-semibold">{record.date}</td>
                      <td className="py-3 px-4 text-center">
                        {record.status === 'Present' ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 border border-emerald-100">
                            <UserCheck className="w-3 h-3" />
                            Present
                          </span>
                        ) : record.status === 'Absent' ? (
                          <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 border border-red-100">
                            <UserX className="w-3 h-3" />
                            Absent
                          </span>
                        ) : record.status === 'Holiday' ? (
                          <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 border border-red-100">
                            <Calendar className="w-3 h-3" />
                            Holiday
                          </span>
                        ) : (
                          <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 border border-red-100">
                            <FileText className="w-3 h-3" />
                            Leave
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this record?")) {
                              onDeleteRecord(record.id);
                            }
                          }}
                          className="hover:bg-red-50 text-slate-400 hover:text-red-500 p-1 rounded-lg transition-all"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginated Navigation Panel */}
        {filteredRecords.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <div>
              Showing {Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredRecords.length, currentPage * itemsPerPage)} of {filteredRecords.length} records
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-all font-bold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-3 text-slate-650">Page {currentPage} / {totalPages}</span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-all font-bold"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
