import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Upload, Trash2, Calendar, Check, X, Volume2, Download, AlertCircle, FileSpreadsheet, ArrowLeft, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Student interface specific to Exams
export interface BaselineStudent {
  id: string;
  name: string;
  school: string;
  std: string;
  div: string;
  medium: string;
  gender: string;
}

// Assessment record for Exams
export interface BaselineRecord {
  studentId: string;
  rollNo: string;
  date: string;
  attendance: 'Present' | 'Absent';
  answers: string[]; // Answers corresponding to Q1 - Q50
}

export default function BaselineExaminationSection({ examType = 'baseline' }: { examType?: 'baseline' | 'endline' }) {
  // --- ROBUST SEPARATED STATES TO PREVENT SYNC RACE-CONDITIONS ---
  const [baselineStudents, setBaselineStudents] = useState<BaselineStudent[]>(() => {
    const saved = localStorage.getItem('baseline_students_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [endlineStudents, setEndlineStudents] = useState<BaselineStudent[]>(() => {
    const saved = localStorage.getItem('endline_students_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [baselineRecords, setBaselineRecords] = useState<BaselineRecord[]>(() => {
    const saved = localStorage.getItem('baseline_records_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [endlineRecords, setEndlineRecords] = useState<BaselineRecord[]>(() => {
    const saved = localStorage.getItem('endline_records_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Derived states based on current examType prop
  const students = examType === 'endline' ? endlineStudents : baselineStudents;
  const records = examType === 'endline' ? endlineRecords : baselineRecords;

  const setStudents = (updater: BaselineStudent[] | ((prev: BaselineStudent[]) => BaselineStudent[])) => {
    if (examType === 'endline') {
      setEndlineStudents(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('endline_students_v1', JSON.stringify(next));
        return next;
      });
    } else {
      setBaselineStudents(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('baseline_students_v1', JSON.stringify(next));
        return next;
      });
    }
  };

  const setRecords = (updater: BaselineRecord[] | ((prev: BaselineRecord[]) => BaselineRecord[])) => {
    if (examType === 'endline') {
      setEndlineRecords(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('endline_records_v1', JSON.stringify(next));
        return next;
      });
    } else {
      setBaselineRecords(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('baseline_records_v1', JSON.stringify(next));
        return next;
      });
    }
  };

  // Class-wise custom question counts (default to 50 for 5th, 6th, 7th, 8th class)
  const [baselineQuestionCounts, setBaselineQuestionCounts] = useState<{ [cls: string]: number }>(() => {
    const saved = localStorage.getItem('baseline_question_counts_v2');
    return saved ? JSON.parse(saved) : { '5': 50, '6': 50, '7': 50, '8': 50 };
  });

  const [endlineQuestionCounts, setEndlineQuestionCounts] = useState<{ [cls: string]: number }>(() => {
    const saved = localStorage.getItem('endline_question_counts_v2');
    return saved ? JSON.parse(saved) : { '5': 50, '6': 50, '7': 50, '8': 50 };
  });

  const questionCounts = examType === 'endline' ? endlineQuestionCounts : baselineQuestionCounts;

  const setQuestionCounts = (updater: { [cls: string]: number } | ((prev: { [cls: string]: number }) => { [cls: string]: number })) => {
    if (examType === 'endline') {
      setEndlineQuestionCounts(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('endline_question_counts_v2', JSON.stringify(next));
        return next;
      });
    } else {
      setBaselineQuestionCounts(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('baseline_question_counts_v2', JSON.stringify(next));
        return next;
      });
    }
  };

  const getQuestionCountForClass = (classStr: string) => {
    const numericClass = classStr.replace(/\D/g, ''); // Extract digits
    return questionCounts[numericClass] ?? questionCounts[classStr] ?? 50;
  };

  // State to show/hide configuration panel
  const [showConfig, setShowConfig] = useState(false);

  // Modal / Input form states
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<BaselineStudent | null>(null);

  // Derived max questions for currently active student
  const activeStudentMaxQuestions = useMemo(() => {
    if (!selectedStudent) return 50;
    return getQuestionCountForClass(selectedStudent.std);
  }, [selectedStudent, questionCounts]);

  // Marks fill form states (for active student in modal)
  const [marksDate, setMarksDate] = useState(new Date().toISOString().split('T')[0]);
  const [marksAttendance, setMarksAttendance] = useState<'Present' | 'Absent'>('Present');
  const [marksRollNo, setMarksRollNo] = useState('');
  const [marksAnswers, setMarksAnswers] = useState<string[]>(Array(50).fill(''));
  const [marksStep, setMarksStep] = useState<'info' | 'entry'>('info');

  // Drag and drop upload state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard entry states
  const [activeInputIndex, setActiveInputIndex] = useState<number>(0);

  // Speech speaking state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Clear last function
  const handleClearLast = () => {
    setMarksAnswers(prev => {
      const next = [...prev];
      if (next[activeInputIndex] !== '') {
        next[activeInputIndex] = '';
      } else if (activeInputIndex > 0) {
        const prevIdx = activeInputIndex - 1;
        next[prevIdx] = '';
        setActiveInputIndex(prevIdx);
      }
      return next;
    });
  };

  // Keyboard keypad press function
  const handleKeypadPress = (val: string, maxQs: number) => {
    setMarksAnswers(prev => {
      const next = [...prev];
      next[activeInputIndex] = val;
      return next;
    });
    if (activeInputIndex < maxQs - 1) {
      setActiveInputIndex(activeInputIndex + 1);
    }
  };

  // Physical keyboard key event listener
  useEffect(() => {
    if (!isMarksModalOpen || marksAttendance === 'Absent' || marksStep !== 'entry' || !selectedStudent) return;

    const maxQs = getQuestionCountForClass(selectedStudent.std);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== document.body) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', '8', '9'].includes(key)) {
        e.preventDefault();
        handleKeypadPress(key, maxQs);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleClearLast();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeInputIndex > 0) {
          setActiveInputIndex(activeInputIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeInputIndex < maxQs - 1) {
          setActiveInputIndex(activeInputIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMarksModalOpen, activeInputIndex, marksAttendance, marksStep, selectedStudent, questionCounts]);

  // Speak aloud the question numbers and answers using SpeechSynthesis in English
  const handleRepeatAnswers = () => {
    if (!window.speechSynthesis) {
      alert('Text-to-Speech is not available in your browser.');
      return;
    }

    if (window.speechSynthesis.speaking || isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let textToSpeak = '';
    const maxQs = selectedStudent ? getQuestionCountForClass(selectedStudent.std) : 50;
    const answeredIndices = marksAnswers.slice(0, maxQs)
      .map((ans, idx) => (ans !== '' ? { qNum: idx + 1, ans } : null))
      .filter(Boolean) as { qNum: number; ans: string }[];

    if (answeredIndices.length === 0) {
      textToSpeak = 'No answers have been filled yet. Please enter options.';
    } else {
      textToSpeak = 'The filled answers are: ';
      answeredIndices.forEach((item) => {
        textToSpeak += `Question ${item.qNum}, ${item.ans}. `;
      });
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking when modal closes
  useEffect(() => {
    if (!isMarksModalOpen && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isMarksModalOpen]);

  // Cleanup synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // --- DELETE STUDENT & MARKS ---
  const handleDeleteStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('तुम्ही खात्रीने हा विद्यार्थी यादीतून काढून टाकू इच्छिता का?')) {
      setStudents(prev => prev.filter(s => s.id !== id));
      setRecords(prev => prev.filter(r => r.studentId !== id));
    }
  };

  // --- CLEAR ALL STUDENTS ---
  const handleClearAll = () => {
    if (confirm('लक्ष द्या! यादीतील सर्व विद्यार्थ्यांचा डेटा आणि त्यांचे गुण पूर्णपणे डिलीट होतील. तुम्ही खात्रीने डिलीट करू इच्छिता का?')) {
      if (examType === 'endline') {
        setEndlineStudents([]);
        setEndlineRecords([]);
        localStorage.setItem('endline_students_v1', JSON.stringify([]));
        localStorage.setItem('endline_records_v1', JSON.stringify([]));
      } else {
        setBaselineStudents([]);
        setBaselineRecords([]);
        localStorage.setItem('baseline_students_v1', JSON.stringify([]));
        localStorage.setItem('baseline_records_v1', JSON.stringify([]));
      }
    }
  };

  // --- EXCEL / CSV IMPORT PARSING ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    if (e.target) e.target.value = ''; // Reset input to allow re-upload of same file
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as ArrayBuffer;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 2D Array formatting
        const rawJson = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        const rows: string[][] = rawJson.map(row => 
          Array.isArray(row) ? row.map(val => val === null || val === undefined ? '' : String(val).trim()) : []
        );

        if (rows.length < 2) {
          alert('फाईलमध्ये पुरेसा डेटा सापडला नाही! कृपया किमान १ हेडर रो आणि १ डेटा रो असल्याची खात्री करा.');
          return;
        }

        // Identify headers
        const headers = rows[0].map(h => h.trim().toLowerCase());
        let idxSchool = -1;
        let idxName = -1;
        let idxClass = -1;
        let idxDiv = -1;
        let idxMedium = -1;
        let idxGender = -1;

        headers.forEach((header, index) => {
          if (header.includes('school') || header.includes('शाळा')) idxSchool = index;
          else if (header.includes('student') || header.includes('name') || header.includes('नाव') || header.includes('विद्यार्थी')) idxName = index;
          else if (header.includes('class') || header.includes('std') || header.includes('इयत्ता') || header.includes('कक्षा') || header.includes('वर्ग')) idxClass = index;
          else if (header.includes('division') || header.includes('div') || header.includes('तुकडी') || header.includes('तुकडी')) idxDiv = index;
          else if (header.includes('medium') || header.includes('माध्यम')) idxMedium = index;
          else if (header.includes('gender') || header.includes('sex') || header.includes('लिंग') || header.includes('जेंडर')) idxGender = index;
        });

        if (idxName === -1 || idxSchool === -1 || idxClass === -1 || idxDiv === -1) {
          alert('कॉलम सापडले नाहीत! कृपया हेडरमध्ये "School Name", "Students Name", "Class", "Division" कॉलम्स असल्याची खात्री करा.');
          return;
        }

        const newParsedStudents: BaselineStudent[] = [];
        const prefix = examType === 'endline' ? 'EL' : 'BL';

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || !row[idxName]) continue;

          const sName = row[idxName];
          const sSchool = row[idxSchool] || 'A. L. Chandavarkar Highschool Khanivali';
          const sClass = row[idxClass] || '5';
          const sDiv = row[idxDiv] || 'A';
          const sMedium = idxMedium !== -1 ? row[idxMedium] || 'Marathi' : 'Marathi';
          
          let sGender = 'Boy';
          if (idxGender !== -1 && row[idxGender]) {
            const rawGen = row[idxGender].toLowerCase();
            if (['female', 'girl', 'f', 'मुलगी', 'स्त्री'].includes(rawGen)) {
              sGender = 'Girl';
            }
          }

          newParsedStudents.push({
            id: `${prefix}-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
            name: sName,
            school: sSchool,
            std: sClass,
            div: sDiv.toUpperCase(),
            medium: sMedium,
            gender: sGender
          });
        }

        if (newParsedStudents.length === 0) {
          alert('एकाही विद्यार्थ्याचा अचूक डेटा आयात करता आला नाही.');
        } else {
          setStudents(prev => [...prev, ...newParsedStudents]);
          alert(`${newParsedStudents.length} विद्यार्थी यशस्वीरीत्या आयात केले गेले!`);
        }
      } catch (error) {
        console.error(error);
        alert('फाईल वाचताना एरर आली. कृपया टेंपलेट तपासा.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- DOWNLOAD TEMPLATE EXCEL ---
  const handleDownloadTemplate = () => {
    const wsData = [
      ['Sr.No', 'School Name', 'Students Name', 'Class', 'Division', 'Medium', 'Gender'],
      ['1', 'A. L. Chandavarkar Highschool Khanivali', 'Siddharth Patil', '5', 'A', 'Marathi', 'Boy'],
      ['2', 'A. L. Chandavarkar Highschool Khanivali', 'Sneha Mhatre', '6', 'B', 'Semi-English', 'Girl']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, examType === 'endline' ? 'Endline_Student_Template.xlsx' : 'Baseline_Student_Template.xlsx');
  };

  // --- OPEN MARKS MODAL ---
  const handleOpenMarksModal = (student: BaselineStudent) => {
    setSelectedStudent(student);
    const existingRecord = records.find(r => r.studentId === student.id);
    const classLimit = getQuestionCountForClass(student.std);
    
    if (existingRecord) {
      setMarksDate(existingRecord.date);
      setMarksAttendance(existingRecord.attendance);
      setMarksRollNo(existingRecord.rollNo);
      
      const loadedAnswers = [...existingRecord.answers];
      while (loadedAnswers.length < classLimit) {
        loadedAnswers.push('');
      }
      setMarksAnswers(loadedAnswers.slice(0, classLimit));
    } else {
      setMarksAttendance('Present');
      setMarksRollNo('');
      setMarksAnswers(Array(classLimit).fill(''));
    }
    
    setActiveInputIndex(0);
    setMarksStep('info');
    setIsMarksModalOpen(true);
  };

  // --- SAVE MARKS SUBMIT ---
  const handleSaveMarks = () => {
    if (!selectedStudent) return;
    const maxQs = getQuestionCountForClass(selectedStudent.std);

    const updatedRecord: BaselineRecord = {
      studentId: selectedStudent.id,
      rollNo: marksRollNo.trim(),
      date: marksDate,
      attendance: marksAttendance,
      answers: marksAttendance === 'Absent' ? Array(maxQs).fill('') : marksAnswers.slice(0, maxQs).map((ans) => ans || '')
    };

    setRecords(prev => {
      const filtered = prev.filter(r => r.studentId !== selectedStudent.id);
      return [...filtered, updatedRecord];
    });

    setIsMarksModalOpen(false);
    setSelectedStudent(null);
  };

  // Check how many questions are filled
  const getFilledQuestionsCount = (answers: string[], limit: number = 50) => {
    return answers.slice(0, limit).filter(a => a !== '').length;
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Hidden file input for header Excel upload action */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv" 
        className="hidden" 
      />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            {examType === 'endline' ? 'Endline Examination (उत्तर चाचणी मूल्यमापन)' : 'Baseline Examination (पायाभूत चाचणी मूल्यमापन)'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            विद्यार्थ्यांची यादी Excel फाईलद्वारे अपलोड करा, आणि पेपरमधील उत्तरे (A, B, C, D, 8, 9) मॅन्युअली किंवा कीबोर्ड वापरून झटपट भरा.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
              showConfig 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-black' 
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            ⚙️ Question Settings (प्रश्न संख्या)
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Template Download
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 rounded-xl transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Excel (यादी आयात करा)
          </button>

          {students.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All List
            </button>
          )}
        </div>
      </div>

      {/* CLASSWISE QUESTION COUNT CONFIGURATION PANEL */}
      {showConfig && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-left space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>🎯</span> इयत्तानिहाय प्रश्न संख्या निश्चित करा (Class-wise Question Limits)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                प्रत्येक वर्गासाठी किती प्रश्नांचे गुण भरायचे आहेत ते निश्चित करा. (किमान १, कमाल ५०)
              </p>
            </div>
            <button
              onClick={() => {
                setQuestionCounts({ '5': 50, '6': 50, '7': 50, '8': 50 });
                alert('सर्व वर्गांची प्रश्नसंख्या ५० वर पूर्ववत केली आहे!');
              }}
              className="px-3 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors animate-pulse"
            >
              Reset to 50
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['5', '6', '7', '8'].map(cls => (
              <div key={cls} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1.5">
                <span className="text-xs font-extrabold text-slate-600">Class (इयत्ता) {cls}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={questionCounts[cls] ?? 50}
                    onChange={(e) => {
                      const val = Math.min(50, Math.max(1, parseInt(e.target.value) || 50));
                      setQuestionCounts(prev => ({
                        ...prev,
                        [cls]: val
                      }));
                    }}
                    className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-black text-slate-800 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <span className="text-xs text-slate-400 font-bold">Qs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXCEL UPLOAD ZONE (WHEN EMPTY) */}
      {students.length === 0 && (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
              : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/30 shadow-xs'
          }`}
        >
          <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10 text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">विद्यार्थ्यांची Excel/CSV यादी येथे अपलोड करा</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
            Drag & drop file here or click to browse. <br />
            (Template Columns: Sr.No, School Name, Students Name, Class, Division, Medium, Gender)
          </p>
        </div>
      )}

      {/* STUDENT CARDS GRID */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => {
            const studentRecord = records.find(r => r.studentId === student.id);
            const isFilled = !!studentRecord;
            const isAbsent = studentRecord?.attendance === 'Absent';
            const classLimit = getQuestionCountForClass(student.std);
            const filledCount = studentRecord ? getFilledQuestionsCount(studentRecord.answers, classLimit) : 0;
            const isComplete = isFilled && !isAbsent && filledCount === classLimit;

            // Determine border and background colors depending on status
            let cardColors = 'border-amber-200 bg-amber-50/60 hover:border-amber-400';
            let statusText = '';
            let statusBadgeColors = '';

            if (isFilled && isAbsent) {
              cardColors = 'border-rose-200 bg-rose-50/50 hover:border-rose-400';
              statusText = 'Absent (गैरहजर)';
              statusBadgeColors = 'text-rose-700 bg-rose-100 border-rose-200';
            } else if (isComplete) {
              cardColors = 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-400';
              statusText = `Marks Filled (${filledCount}/${classLimit} Qs) - Complete`;
              statusBadgeColors = 'text-emerald-700 bg-emerald-100 border-emerald-200';
            } else {
              // Incomplete (Marks filled < classLimit) or Pending
              cardColors = 'border-amber-200 bg-amber-50/60 hover:border-amber-400';
              statusText = isFilled 
                ? `Marks Filled (${filledCount}/${classLimit} Qs) - Incomplete (अपूर्ण)` 
                : 'Pending (गुण भरणे बाकी)';
              statusBadgeColors = 'text-amber-700 bg-amber-100 border-amber-200';
            }

            return (
              <div
                key={student.id}
                onClick={() => handleOpenMarksModal(student)}
                className={`relative border rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer select-none flex flex-col justify-between group ${cardColors}`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {student.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase mt-0.5">
                        {student.school}
                      </p>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteStudent(student.id, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/70 border border-slate-100 text-slate-600">
                      Class: {student.std}({student.div})
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/70 border border-slate-100 text-slate-600">
                      Medium: {student.medium}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/70 border border-slate-100 text-slate-600">
                      {student.gender}
                    </span>
                    {studentRecord?.rollNo && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/70 border border-slate-100 text-slate-700">
                        Roll: {studentRecord.rollNo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator Badge */}
                <div className="mt-4 pt-3.5 border-t border-slate-100/50 flex items-center">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 ${statusBadgeColors}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isFilled && isAbsent ? 'bg-rose-500 animate-pulse' : isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {statusText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- ASSESSMENT MARKS & ENTRY MODAL --- */}
      {isMarksModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 my-8 flex flex-col gap-4 overflow-hidden">
            
            {/* Header info */}
            <div className="bg-[#1565C0] -mx-6 md:-mx-8 -mt-6 md:-mt-8 p-4 rounded-t-3xl flex justify-between items-center text-white shadow-md">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (marksStep === 'entry') {
                      setMarksStep('info');
                    } else {
                      setIsMarksModalOpen(false);
                    }
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
                  title="Close / Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-base md:text-lg font-black tracking-tight text-white">
                    विद्यार्थी (Student): {selectedStudent.name}
                  </h3>
                  <p className="text-[11px] md:text-xs text-blue-100 font-bold mt-0.5">
                    Class: {selectedStudent.std}({selectedStudent.div}) • {marksStep === 'info' ? 'माहिती व उपस्थिती (Info & Attendance)' : 'Typing Through Answers'}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleSaveMarks}
                className="px-4 py-1.5 text-xs font-black bg-white/10 hover:bg-white/20 active:scale-95 border border-white/25 rounded-xl transition-all flex items-center gap-1.5 text-white cursor-pointer"
              >
                <Save className="w-4 h-4 text-white" />
                SAVE
              </button>
            </div>

            {/* Total count summary strip / Student Info Banner */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center py-2.5 px-4 bg-slate-50 border-b border-slate-100/80 -mx-6 md:-mx-8 text-xs text-slate-500 font-bold gap-2">
              <div>
                विद्यार्थी: <span className="font-black text-sm text-slate-800">{selectedStudent.name}</span>
                <span className="mx-2 text-slate-300">|</span>
                Class: <span className="font-extrabold text-slate-800">{selectedStudent.std} ({selectedStudent.div})</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  Total Questions: <span className="font-extrabold text-slate-800">{activeStudentMaxQuestions}</span>
                </div>
                <div>
                  Answered: <span className="font-extrabold text-[#1565C0]">{getFilledQuestionsCount(marksAnswers, activeStudentMaxQuestions)} / {activeStudentMaxQuestions}</span>
                </div>
              </div>
            </div>

            {/* STEP 1: INFORMATION SETUP & ATTENDANCE SCREEN */}
            {marksStep === 'info' && (
              <div className="flex flex-col gap-6 py-2 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-sm">
                  
                  {/* Date field */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Date (तारीख)</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={marksDate}
                        onChange={(e) => setMarksDate(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold"
                      />
                    </div>
                  </div>

                  {/* Attendance Selector */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Attendance (हजेरी)</label>
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          setMarksAttendance('Present');
                          setMarksStep('entry');
                        }}
                        className={`flex-1 py-2.5 font-bold transition-all text-center cursor-pointer ${
                          marksAttendance === 'Present'
                            ? 'bg-emerald-600 text-white shadow-inner font-black'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Present (हजर)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarksAttendance('Absent')}
                        className={`flex-1 py-2.5 font-bold transition-all text-center cursor-pointer ${
                          marksAttendance === 'Absent'
                            ? 'bg-rose-600 text-white shadow-inner font-black'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Absent (गैर)
                      </button>
                    </div>
                  </div>

                  {/* Roll No. Field */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">Roll No. (क्रमांक)</label>
                    <input
                      type="text"
                      placeholder="Roll No"
                      value={marksRollNo}
                      onChange={(e) => setMarksRollNo(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold"
                    />
                  </div>

                </div>

                {/* Primary Proceed/Save buttons */}
                <div className="flex justify-center pt-2">
                  {marksAttendance === 'Present' ? (
                    <button
                      type="button"
                      onClick={() => setMarksStep('entry')}
                      className="px-8 py-3.5 font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 hover:shadow-lg hover:shadow-blue-600/15 rounded-2xl transition-all flex items-center gap-2 cursor-pointer text-sm"
                    >
                      Proceed to Data Entry (गुण नोंदवा) →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveMarks}
                      className="px-8 py-3.5 font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 hover:shadow-lg hover:shadow-rose-600/15 rounded-2xl transition-all flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <Check className="w-4 h-4" /> Save as Absent (गैरहजर जतन करा)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: MARKS / QUESTIONS KEYBOARD DATA ENTRY SCREEN */}
            {marksStep === 'entry' && marksAttendance === 'Present' && (
              <>
                {/* Custom Question Grid */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="grid grid-cols-10 border-collapse">
                    {marksAnswers.slice(0, activeStudentMaxQuestions).map((answer, index) => {
                      const isActive = activeInputIndex === index;
                      
                      // Font color for entered answers
                      let answerColor = 'text-slate-300';
                      if (answer === 'A') {
                        answerColor = 'text-[#2E5B15]';
                      } else if (answer === 'B') {
                        answerColor = 'text-[#1B365D]';
                      } else if (answer === 'C') {
                        answerColor = 'text-[#9A3412]';
                      } else if (answer === 'D') {
                        answerColor = 'text-[#581C87]';
                      } else if (answer === '8') {
                        answerColor = 'text-[#78350F]';
                      } else if (answer === '9') {
                        answerColor = 'text-[#9D174D]';
                      }

                      return (
                        <div
                          key={index}
                          onClick={() => setActiveInputIndex(index)}
                          className={`flex flex-col items-center justify-center border-r border-b py-2 cursor-pointer transition-all ${
                            isActive
                              ? 'bg-blue-50/60 ring-2 ring-blue-500/30 font-black relative z-10 border-blue-200'
                              : 'bg-white hover:bg-slate-50'
                          } ${
                            index % 10 === 9 ? 'border-r-0' : 'border-r-slate-100'
                          } ${
                            index >= activeStudentMaxQuestions - 10 ? 'border-b-0' : 'border-b-slate-100'
                          }`}
                        >
                          <span className="text-[10px] md:text-[11px] font-bold text-slate-400 tracking-tight">
                            Q.{index + 1}
                          </span>
                          <span className={`text-sm md:text-base font-extrabold mt-0.5 tracking-tight ${isActive ? 'text-[#1565C0]' : answerColor}`}>
                            {answer || '–'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Big Keyboard Keypad Grid */}
                <div className="grid grid-cols-10 gap-1 my-1.5">
                  {[
                    { value: 'A', bg: 'bg-[#E2F0D9] hover:bg-[#D4EAB9] border-[#B7DCA4]', text: 'text-[#2E5B15]', span: 'col-span-4' },
                    { value: 'B', bg: 'bg-[#D9E1F2] hover:bg-[#C2D1ED] border-[#A2BDDF]', text: 'text-[#1B365D]', span: 'col-span-4' },
                    { value: '8', bg: 'bg-[#FEF3C7] hover:bg-[#FDE68A] border-[#FCD34D]', text: 'text-[#78350F]', span: 'col-span-2' },
                    { value: 'C', bg: 'bg-[#FFE2D1] hover:bg-[#FED1B9] border-[#FDBA74]', text: 'text-[#9A3412]', span: 'col-span-4' },
                    { value: 'D', bg: 'bg-[#E9D5FF] hover:bg-[#DFBEFB] border-[#D8B4FE]', text: 'text-[#581C87]', span: 'col-span-4' },
                    { value: '9', bg: 'bg-[#FCE7F3] hover:bg-[#FBC3E3] border-[#FBCFE8]', text: 'text-[#9D174D]', span: 'col-span-2' },
                  ].map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => handleKeypadPress(btn.value, activeStudentMaxQuestions)}
                      className={`py-8 md:py-10 text-4xl md:text-5xl font-black rounded-2xl flex items-center justify-center border shadow-xs active:scale-95 transition-all cursor-pointer ${btn.bg} ${btn.text} ${btn.span}`}
                    >
                      {btn.value}
                    </button>
                  ))}
                </div>

                {/* Bottom toolbar status bar */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-row justify-between items-center text-xs font-semibold">
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-slate-800">
                      Current Question: <span className="text-[#1565C0] font-black">{activeInputIndex + 1}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      Press A, B, C, D, 8 or 9 to enter answer
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* Speak Aloud Button */}
                    <button
                      type="button"
                      onClick={handleRepeatAnswers}
                      className={`px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer shadow-xs active:scale-95 border ${
                        isSpeaking 
                          ? 'text-white bg-rose-600 hover:bg-rose-700 border-rose-600' 
                          : 'text-indigo-600 bg-white hover:bg-indigo-50 border-indigo-200'
                      }`}
                      title={isSpeaking ? "Stop Speaking" : "Speak Answers Aloud"}
                    >
                      {isSpeaking ? (
                        <>
                          <X className="w-4 h-4 shrink-0 animate-pulse" />
                          STOP SPEAK
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 shrink-0" />
                          SPEAK
                        </>
                      )}
                    </button>

                    {/* Clear Button */}
                    <button
                      type="button"
                      onClick={handleClearLast}
                      className="px-6 py-2.5 text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer shadow-xs active:scale-95"
                      title="Clear current or previous answer"
                    >
                      <X className="w-4 h-4 shrink-0" />
                      CLEAR
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Submit button controls */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 mt-2 text-xs">
              <button
                type="button"
                onClick={() => setIsMarksModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              {(marksStep === 'entry' || marksAttendance === 'Absent') && (
                <button
                  type="button"
                  onClick={handleSaveMarks}
                  className="px-5 py-2.5 font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl hover:shadow-lg hover:shadow-blue-600/15 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 animate-pulse" />
                  Submit Assessment (गुण जतन करा)
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
