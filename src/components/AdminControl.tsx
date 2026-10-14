import React, { useState, useEffect } from 'react';
import { Database, Save, CheckCircle, Copy } from 'lucide-react';
import { SyncConfig } from '../types';

export default function AdminControl() {
  const [config, setConfig] = useState<SyncConfig>({
    appsScriptUrl: '',
    oneDriveUrl: '',
    syncTarget: 'both',
    isAutoSyncEnabled: true,
    lastSyncedAt: null
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('same_app_sync_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('same_app_sync_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Admin Control Panel</h2>
            <p className="text-xs text-slate-500 font-semibold">Configure Cloud Integrations</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-8">
            <p className="text-sm text-amber-800 font-semibold leading-relaxed">
              Configure the Webhook URLs here to enable direct syncing of Assessment and Teacher data to your Google Sheets or Microsoft OneDrive storage. 
            </p>
        </div>

        <div className="space-y-5 max-w-2xl">
           <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Sync Target</label>
              <select 
                 value={config.syncTarget || 'both'} 
                 onChange={e => setConfig({...config, syncTarget: e.target.value as 'sheets' | 'onedrive' | 'both'})}
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow appearance-none"
              >
                  <option value="both">Both (Google Sheets & OneDrive)</option>
                  <option value="sheets">Google Sheets Only</option>
                  <option value="onedrive">OneDrive Only</option>
              </select>
           </div>
           
           {(config.syncTarget === 'sheets' || config.syncTarget === 'both') && (
             <div className="space-y-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                <h4 className="text-sm font-black text-slate-800">Google Sheets Webhooks (Apps Script)</h4>
                
                {[
                  { id: 'teachingAnalysis', label: 'Teaching Analysis (Daily Logs)' },
                  { id: 'baseline', label: 'Baseline Assessment' },
                  { id: 'endline', label: 'Endline Assessment' },
                  { id: 'module', label: 'Module Assessment' }
                ].map(cat => (
                  <div key={`gsheet-${cat.id}`} className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider hover:text-indigo-600 transition-colors cursor-pointer">{cat.label}</label>
                     <input 
                        type="text" 
                        placeholder="https://script.google.com/macros/s/..."
                        value={config.appsScriptUrls?.[cat.id as keyof typeof config.appsScriptUrls] || ''} 
                        onChange={e => setConfig({...config, appsScriptUrls: {...(config.appsScriptUrls || {}), [cat.id]: e.target.value}})}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                     />
                  </div>
                ))}
             </div>
           )}

           {(config.syncTarget === 'onedrive' || config.syncTarget === 'both') && (
             <div className="space-y-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl mt-4">
                <h4 className="text-sm font-black text-slate-800">Microsoft OneDrive Webhooks (Power Automate)</h4>
                
                {[
                  { id: 'teachingAnalysis', label: 'Teaching Analysis (Daily Logs)' },
                  { id: 'baseline', label: 'Baseline Assessment' },
                  { id: 'endline', label: 'Endline Assessment' },
                  { id: 'module', label: 'Module Assessment' }
                ].map(cat => (
                  <div key={`onedrive-${cat.id}`} className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider hover:text-indigo-600 transition-colors cursor-pointer">{cat.label}</label>
                     <input 
                        type="text" 
                        placeholder="https://prod-1.centralindia.logic.azure.com:443/workflows/..."
                        value={config.oneDriveUrls?.[cat.id as keyof typeof config.oneDriveUrls] || ''} 
                        onChange={e => setConfig({...config, oneDriveUrls: {...(config.oneDriveUrls || {}), [cat.id]: e.target.value}})}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                     />
                  </div>
                ))}
             </div>
           )}

           <div className="flex items-center gap-3 pt-4">
              <input 
                type="checkbox" 
                id="autoSync"
                checked={config.isAutoSyncEnabled}
                onChange={e => setConfig({...config, isAutoSyncEnabled: e.target.checked})}
                className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="autoSync" className="text-sm font-bold text-slate-700 cursor-pointer">
                Enable Auto-Sync functionality
              </label>
           </div>

           <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              {saved ? (
                 <span className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                    <CheckCircle className="w-5 h-5" /> All settings saved successfully.
                 </span>
              ) : <span />}
              <button 
                 onClick={handleSave}
                 className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-sm active:scale-95"
              >
                 <Save className="w-4 h-4" /> Save Configuration
              </button>
           </div>
        </div>

        {/* Integration Instructions */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 mt-8 space-y-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-2">How to Setup Webhooks</h3>
            
            {/* Google Apps Script instructions */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-indigo-700">1. Google Apps Script Configuration (For Google Sheets)</h4>
              <ol className="list-decimal pl-5 space-y-2 text-xs font-semibold text-slate-600 leading-relaxed">
                 <li>Create and open a new Google Sheet.</li>
                 <li>Click on <span className="font-bold text-slate-800">Extensions {'>'} Apps Script</span>.</li>
                 <li>Remove the default code here and paste the appropriate `doPost(e)` code below based on what you are syncing.
                     
                     <div className="mt-3 space-y-2">
                     {/* Teaching Analysis Log */}
                     <details className="bg-white rounded-md border border-slate-200">
                        <summary className="px-3 py-2 text-[10px] font-bold text-indigo-600 uppercase cursor-pointer hover:bg-slate-50">View / Copy Code: Teaching Analysis (Daily Logs)</summary>
                        <div className="p-3 bg-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono overflow-x-auto rounded-b-md">
                           <pre>{`function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'teaching_analysis_sync' || action === 'teaching_analysis_edit' || action === 'teaching_analysis_delete') {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000); 
      
      const teacherName = payload.teacherName || 'Unknown Teacher';
      const logs = payload.data || [];
      
      const sheetMaster = getOrCreateSheet('Master');
      const sheetTeacher = getOrCreateSheet(teacherName);
      
      setupHeaders(sheetMaster);
      setupHeaders(sheetTeacher);

      if (action === 'teaching_analysis_edit' || action === 'teaching_analysis_delete') {
         logs.forEach(log => {
            processEditOrDelete(sheetMaster, log, action, teacherName);
            processEditOrDelete(sheetTeacher, log, action, teacherName);
         });
      } else {
         const masterRows = [];
         const teacherRows = [];

         logs.forEach(log => {
            const rowData = buildRowData(log, teacherName, 0); // SrNo sorted later
            masterRows.push(rowData);
            teacherRows.push([...rowData]);
         });
         
         if (masterRows.length > 0) {
           sheetMaster.getRange(sheetMaster.getLastRow() + 1, 1, masterRows.length, masterRows[0].length).setValues(masterRows);
         }
         if (teacherRows.length > 0) {
           sheetTeacher.getRange(sheetTeacher.getLastRow() + 1, 1, teacherRows.length, teacherRows[0].length).setValues(teacherRows);
         }
      }

      sortAndRenumber(sheetMaster);
      sortAndRenumber(sheetTeacher);

      lock.releaseLock();
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function processEditOrDelete(sheet, log, action, teacherName) {
   const data = sheet.getDataRange().getValues();
   for (let i = 1; i < data.length; i++) {
     if (data[i][10] == log.id) { 
       if (action === 'teaching_analysis_delete') {
         sheet.deleteRow(i + 1);
       } else if (action === 'teaching_analysis_edit') {
         const rowData = buildRowData(log, teacherName, data[i][0]);
         sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
       }
       break;
     }
   }
}

function buildRowData(log, teacherName, srNo) {
   const dateObj = new Date(log.date);
   const month = dateObj.toLocaleString('en-US', { month: 'long' });
   const week = getWeekOfMonth(dateObj);
   
   const schoolName = log.school || '';
   const classDiv = (log.classGrade ? log.classGrade : '') + (log.division ? ' - ' + log.division : '');
   
   let moduleSession = log.module || '';
   if (log.session) moduleSession += ' / ' + log.session;
   else if (log.eventName) moduleSession += ' / ' + log.eventName;
   else if (log.subModule) moduleSession += ' / ' + log.subModule;
   
   const worksheet = log.worksheet === 'Yes' ? '1' : '';
   const challenges = log.challenges || '';
   return [srNo, month, "Week " + week, log.date, schoolName, classDiv, moduleSession, worksheet, teacherName, challenges, log.id];
}

function sortAndRenumber(sheet) {
   const lastRow = sheet.getLastRow();
   if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).sort(4);
      const numRows = sheet.getLastRow() - 1;
      const srNos = [];
      for (let i = 1; i <= numRows; i++) srNos.push([i]);
      sheet.getRange(2, 1, numRows, 1).setValues(srNos);
   }
}

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function setupHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = ['Sr. No.', 'Month', 'Week', 'Date', 'School Name', 'Class / Division', 'Module/Session Name', 'Worksheet', 'Teacher Name', 'Challenges', 'Log ID'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.hideColumns(11); 
  }
}

function getWeekOfMonth(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}`}</pre>
                        </div>
                     </details>

                     {/* Baseline Assessment */}
                     <details className="bg-white rounded-md border border-slate-200">
                        <summary className="px-3 py-2 text-[10px] font-bold text-indigo-600 uppercase cursor-pointer hover:bg-slate-50">View / Copy Code: Baseline Assessment</summary>
                        <div className="p-3 bg-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono overflow-x-auto rounded-b-md">
                           <pre>{`function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === 'assessment_sync' && payload.assessmentType === 'baseline') {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000); 
      
      const data = payload.data || [];
      
      if (data.length > 1) { 
          const sheetName = 'Baseline Assessment';
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          let sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
              sheet = ss.insertSheet(sheetName);
          }
          
          sheet.clear();
          sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
          sheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold");
      }

      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                        </div>
                     </details>

                     {/* Endline Assessment */}
                     <details className="bg-white rounded-md border border-slate-200">
                        <summary className="px-3 py-2 text-[10px] font-bold text-indigo-600 uppercase cursor-pointer hover:bg-slate-50">View / Copy Code: Endline Assessment</summary>
                        <div className="p-3 bg-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono overflow-x-auto rounded-b-md">
                           <pre>{`function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === 'assessment_sync' && payload.assessmentType === 'endline') {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000); 
      
      const data = payload.data || [];
      
      if (data.length > 1) { 
          const sheetName = 'Endline Assessment';
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          let sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
              sheet = ss.insertSheet(sheetName);
          }
          
          sheet.clear();
          sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
          sheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold");
      }

      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                        </div>
                     </details>

                     {/* Module Assessment */}
                     <details className="bg-white rounded-md border border-slate-200">
                        <summary className="px-3 py-2 text-[10px] font-bold text-indigo-600 uppercase cursor-pointer hover:bg-slate-50">View / Copy Code: Module Assessment</summary>
                        <div className="p-3 bg-slate-800 text-slate-300 text-[10px] sm:text-xs font-mono overflow-x-auto rounded-b-md">
                           <pre>{`function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === 'assessment_sync' && payload.assessmentType === 'module') {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000); 
      
      const data = payload.data || [];
      
      if (data.length > 1) { 
          const sheetName = 'Module Assessment';
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          let sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
              sheet = ss.insertSheet(sheetName);
          }
          
          sheet.clear();
          sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
          sheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold");
      }

      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                        </div>
                     </details>
                     </div>
                 </li>
                 <li>In the top right corner, click <span className="font-bold text-slate-800">Deploy</span> and select <span className="font-bold text-slate-800">New deployment</span>.</li>
                 <li>In <em>Select type</em>, choose the <span className="font-bold text-slate-800">Web app</span> option.</li>
                 <li>Add a description, set Execute as to <span className="font-bold text-slate-800">Me</span>, and set <em>Who has access</em> to <span className="font-bold text-slate-800">Anyone</span>.</li>
                 <li>Click <span className="font-bold text-slate-800">Deploy</span>, grant necessary permissions, and copy the generated <span className="font-bold text-slate-800">Web app URL</span>.</li>
                 <li>Paste the copied URL into the correct <em>Google Sheets Webhook URL</em> box above and click Save.</li>
              </ol>
            </div>

            {/* Power Automate instructions */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-indigo-700">2. Microsoft Power Automate Configuration (For OneDrive/Excel)</h4>
              <ol className="list-decimal pl-5 space-y-2 text-xs font-semibold text-slate-600 leading-relaxed">
                 <li>Go to the <a href="https://make.powerautomate.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline hover:text-indigo-800">Power Automate</a> website and log in.</li>
                 <li>In the left menu, click <span className="font-bold text-slate-800">Create</span> and select <span className="font-bold text-slate-800">Instant cloud flow</span>.</li>
                 <li>Give the flow a name, select <span className="font-bold text-slate-800">When a HTTP request is received</span> as the trigger, and click Create.</li>
                 <li>In the trigger, set the HTTP method to <span className="font-bold text-slate-800">POST</span>. Add JSON schema according to your data.</li>
                 <li>Click New step, search for <span className="font-bold text-slate-800">Excel Online (Business)</span>, and pick the <span className="font-bold text-slate-800">Add a row into a table</span> action.</li>
                 <li>Select your Excel file on OneDrive and pick the Table. Map the incoming data from the HTTP trigger to the table's columns.</li>
                 <li>Finally, click <span className="font-bold text-slate-800">Save</span>. After saving, a <span className="font-bold text-slate-800">HTTP POST URL</span> will be generated in the HTTP trigger box.</li>
                 <li>Copy that URL, paste it into the <em>Microsoft OneDrive Webhook URL</em> box above, and click Save.</li>
              </ol>
            </div>
        </div>
      </div>
    </div>
  );
}
