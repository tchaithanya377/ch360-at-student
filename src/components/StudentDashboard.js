import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const StudentDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [todaysClasses, setTodaysClasses] = useState([]);
  const [courseNames, setCourseNames] = useState({});
  const [facultyNames, setFacultyNames] = useState({});

  useEffect(() => {
    const fetchStudentName = async () => {
      setLoading(true);
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const studentDoc = doc(db, 'students', 'III', 'A', user.uid);
            const docSnap = await getDoc(studentDoc);

            if (docSnap.exists()) {
              setStudentName(docSnap.data().name);
            } else {
              console.error('No such student document!');
            }
          } catch (error) {
            console.error('Error fetching student data:', error);
          } finally {
            setLoading(false);
          }
        }
      });
    };

    fetchStudentName();
  }, []);

  useEffect(() => {
    const fetchTodaysClasses = async () => {
      const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
      try {
        // Fetch timetable data based on the current day
        const timetableCollection = collection(db, 'timetables', 'III', 'A');
        const q = query(timetableCollection, where('day', '==', currentDay));
        const querySnapshot = await getDocs(q);
  
        const classes = [];
        const courseIds = new Set();
        const facultyIds = new Set();
  
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Course ID (debugging):', data.courseId);  // Log the course ID
          classes.push({
            id: doc.id,
            startTime: data.startTime,
            endTime: data.endTime,
            room: data.room,
            periods: data.periods,
            facultyId: data.facultyId,
            courseId: data.courseId,
          });
          courseIds.add(data.courseId);
          facultyIds.add(data.facultyId);  // Collect faculty IDs
        });
  
        // Fetch course details based on course IDs
        const courseDetails = {};
        for (const courseId of courseIds) {
          const courseDoc = doc(db, 'courses', 'III', 'A', 'sem1', 'courseDetails', courseId);
          const courseSnap = await getDoc(courseDoc);
  
          if (courseSnap.exists()) {
            courseDetails[courseId] = courseSnap.data().courseName;  // Use courseName from course details
          } else {
            console.error(`No course found for ID: ${courseId}`);
          }
        }
  
        console.log('Course Names:', courseDetails);  // Log the fetched course names
        setCourseNames(courseDetails);

        // Fetch faculty details based on faculty IDs
        const facultyDetails = {};
        for (const facultyId of facultyIds) {
          const facultyDoc = doc(db, 'faculty', facultyId);
          const facultySnap = await getDoc(facultyDoc);
  
          if (facultySnap.exists()) {
            facultyDetails[facultyId] = facultySnap.data().name;  // Use faculty name
          } else {
            console.error(`No faculty found for ID: ${facultyId}`);
          }
        }
  
        console.log('Faculty Names:', facultyDetails);  // Log the fetched faculty names
        setFacultyNames(facultyDetails);

        // Sort classes by start time
        classes.sort((a, b) => {
          const timeA = a.startTime.split(':');
          const timeB = b.startTime.split(':');
          const minutesA = parseInt(timeA[0]) * 60 + parseInt(timeA[1]);
          const minutesB = parseInt(timeB[0]) * 60 + parseInt(timeB[1]);
          return minutesA - minutesB;
        });

        setTodaysClasses(classes);
      } catch (error) {
        console.error('Error fetching today\'s classes:', error);
      }
    };
  
    fetchTodaysClasses();
  }, []);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  return (
    <div className="flex flex-col md:flex-row">
      <main className="flex-1 p-6 bg-gray-100 min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Welcome, {loading ? 'Loading...' : studentName || 'Student'}!
            </h1>
            <p className="text-gray-600">Here's an overview of your current academic status.</p>
          </div>
          <img src="/avatar.jpg" alt="Profile" className="w-16 h-16 rounded-full mt-4 md:mt-0" />
        </header>

        {/* Today's Classes Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Today's Classes</h2>
          {todaysClasses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto bg-white shadow-md rounded-md">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700">Period</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700">Time</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700">Room</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700">Course</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700">Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {todaysClasses.map((cls) => (
                    <tr key={cls.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-700">{cls.periods.join(', ')}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{cls.startTime} - {cls.endTime}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{cls.room}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {courseNames[cls.courseId] || 'Loading...'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {facultyNames[cls.facultyId] || 'Loading...'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No classes scheduled for today.</p>
          )}
        </section>

        {/* Attendance Calendar */}
        <section>
          <h2 className="text-xl font-bold mb-4">Attendance Calendar</h2>
          <Calendar
            value={selectedDate}
            onChange={handleDateChange}
          />
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
