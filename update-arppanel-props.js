const fs = require('fs');
let code = fs.readFileSync('src/components/ArpPanel.tsx', 'utf8');
code = code.replace(
  "<ArpAssessmentSection \\n              currentUser={currentUser} \\n              attendanceStudents={mainStudents}\\n              arpRecords={arpRecords} \\n            />",
  "<ArpAssessmentSection \\n              currentUser={currentUser} \\n              attendanceStudents={arpStudents}\\n              arpRecords={arpRecords} \\n            />"
);
fs.writeFileSync('src/components/ArpPanel.tsx', code);
