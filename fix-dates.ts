import fs from 'fs';

function updateFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace `type="date"` with `type="date"\nmax={new Date().toISOString().split('T')[0]}`
    // But be careful not to keep adding it if it already has max
    // It's safer to just do a smart regex:
    content = content.replace(/type="date"/g, 'type="date" max={new Date().toISOString().split(\'T\')[0]}');
    
    // Specifically for InventoryPanel.tsx: replace state initialization for dates
    if (filePath.includes('InventoryPanel')) {
      // Just a simple clean up if multiple max are added accidentally
      content = content.replace(/max=\{new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\} max=\{new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\}/g, 'max={new Date().toISOString().split(\'T\')[0]}');
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
}

updateFile('src/components/InventoryPanel.tsx');
updateFile('src/components/TakeAttendance.tsx');
updateFile('src/components/StudentsList.tsx');
updateFile('src/components/AttendanceRecords.tsx');
