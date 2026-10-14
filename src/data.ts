import { Student, AttendanceRecord } from './types';

export const INITIAL_STUDENTS: Student[] = [
  // Class 5-A (19 students)
  { id: '5A-1', name: 'Ansari Farhin Sadareaalam', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-2', name: 'Bhoir Manshree Kishor', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-3', name: 'Chorage Navya Rahul', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-4', name: 'Donde Tanvi Manoj', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-5', name: 'Khrapade Nishita Vishawanath', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-6', name: 'Pashete Manjiri Mukesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-7', name: 'Patil Aaraya Lahu', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-8', name: 'Patil Smaranika Ramesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-9', name: 'Patil Shiddhi Nilesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-10', name: 'Mokashi Gargi Swapnil', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-11', name: 'Patil Pranjal Ramesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-12', name: 'Jagtap Tanvi Sunil', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-13', name: 'Patil Swara Sandeep', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-14', name: 'Bhoir Shreyas Arun', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-15', name: 'Karve Vedika Hemant', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-16', name: 'Jadhav Prachi Vikas', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-17', name: 'Patil Sanskruti Nitin', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-18', name: 'Gaikwad Aditya Ram', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },
  { id: '5A-19', name: 'Mhatre Omkar Bharat', school: 'A. L. Chandavarkar Highschool Khanivali', std: '5', div: 'A' },

  // Class 7-A (10 students)
  { id: '7A-1', name: 'Shimpi Swara Manoj', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-2', name: 'Patil Yadnya Sachin', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-3', name: 'Pilane pradnya Bharat', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-4', name: 'Tathe Divyanka Dhanjay', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-5', name: 'Varma kirti Diraj', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-6', name: 'Pawar Sarthak Santosh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-7', name: 'Patil Tejas Ankush', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-8', name: 'Jadhav Om Dasharath', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-9', name: 'Bhoir Siddhi Sandip', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },
  { id: '7A-10', name: 'Shinde Rahul Vijay', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'A' },

  // Class 7-B (47 students)
  { id: '7B-1', name: 'Batara Janavi Dhrama', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-2', name: 'Bhoir Dhruv Kilas', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-3', name: 'Bhoir Mit Jayadas', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-4', name: 'Bhoye Sharmila Govind', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-5', name: 'Diva Aaditya Nitin', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-6', name: 'Haral Anuj Dinesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-7', name: 'khute pranav Sandip', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-8', name: 'Patil Gheet Sham', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-9', name: 'Patil jay Namadev', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-10', name: 'Patil Mayur Rahul', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-11', name: 'Pothinda Raj Prakas', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-12', name: 'Vanage Daksh Pravin', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-13', name: 'Yadav palak Rajesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-14', name: 'Zhate Pallavi pramod', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-15', name: 'Yadav Niharika Dipak', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-16', name: 'Wagh Vidika Chandrakanta', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-17', name: 'Vardi Shlok Sachin', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-18', name: 'Vanage Deep Dinesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-19', name: 'Thakare Chaitany Sachin', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-20', name: 'Jadhav Pallavi Anil', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-21', name: 'Jadhav Shreya Sharad', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-22', name: 'Patil sparsh Bhanudas', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-23', name: 'Patil Vihan Rahul', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-24', name: 'Patil Yash Umesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-25', name: 'Pawar Rutuja Sanjay', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-26', name: 'Rane Shruti Mahendra', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-27', name: 'Sawant Atharva Vinayak', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-28', name: 'Tambe Kunal Suresh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-29', name: 'Thakar Janhavi Anant', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-30', name: 'Gavit Neha Dilip', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-31', name: 'Ghone Prathamesh Bala', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-32', name: 'Jadhav Janavi Santosh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-33', name: 'Kadam Shivam Madhukar', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-34', name: 'Kor Samruddhi Santosh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-35', name: 'Lad Rohit Harishchandra', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-36', name: 'Mali Swamini Jagannath', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-37', name: 'Mhaske Vinay Sunil', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-38', name: 'Naik Gaurav Rajesh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-39', name: 'Palve Ankita Manohar', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-40', name: 'Patil Kartiki Ravindra', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-41', name: 'Patil Prem Santosh', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-42', name: 'Salunkhe Rohit Vitthal', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-43', name: 'Shinde Sanika Sunil', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-44', name: 'Solse Gayatri Dilip', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-45', name: 'Tawde Sakshi Anand', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-46', name: 'Vishe Diya Jagdish', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' },
  { id: '7B-47', name: 'Zore Harsh Eknath', school: 'A. L. Chandavarkar Highschool Khanivali', std: '7', div: 'B' }
];

export function getInitialAttendanceRecords(students: Student[]): AttendanceRecord[] {
  // Let's pre-populate records for 2026-05-27
  // Target: 76 total records, 55 present, 21 absent
  // Let's assign them systematically to match class distributions
  // 5-A: 19 students (let's say 13 present, 6 absent)
  // 7-A: 10 students (let's say 7 present, 3 absent)
  // 7-B: 47 students (let's say 35 present, 12 absent)
  // Total: 13 + 7 + 35 = 55 present. 6 + 3 + 12 = 21 absent. Matches exactly!

  const date = '2026-05-27';
  const records: AttendanceRecord[] = [];

  students.forEach((student, index) => {
    let status: 'Present' | 'Absent' = 'Present';

    if (student.std === '5' && student.div === 'A') {
      // 19 students. Absents: index % 3 === 0 (6 absents)
      const relativeIndex = index;
      status = (relativeIndex % 3 === 0) ? 'Absent' : 'Present';
    } else if (student.std === '7' && student.div === 'A') {
      // 10 students. Absents: [1, 4, 7] (3 absents)
      const relativeIndex = index - 19;
      status = (relativeIndex === 1 || relativeIndex === 4 || relativeIndex === 7) ? 'Absent' : 'Present';
    } else {
      // 7-B: 47 students. Absents: every 4th student (12 absents)
      const relativeIndex = index - 29;
      status = (relativeIndex % 4 === 1) ? 'Absent' : 'Present';
    }

    records.push({
      id: `${student.id}-${date}`,
      studentId: student.id,
      studentName: student.name,
      school: student.school,
      std: student.std,
      div: student.div,
      date: date,
      status: status
    });
  });

  return records;
}
