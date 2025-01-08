import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import './AttendancePage.css';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const AttendancePage = () => {
  const [attendance, setAttendance] = useState([]);
  const [attendanceTable, setAttendanceTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollNo, setRollNo] = useState(null);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [absentDates, setAbsentDates] = useState([]); // State to store absent dates
  const [filteredAbsentDates, setFilteredAbsentDates] = useState([]); // State for filtered absent dates
  const [courseFilter, setCourseFilter] = useState(''); // Filter for course
  const [dateFilter, setDateFilter] = useState(''); // Filter for date

  useEffect(() => {
    const fetchRollNumber = async () => {
      const user = auth.currentUser;
      if (user) {
        const studentDocRef = doc(db, `students/III/A/${user.uid}`);
        const studentDoc = await getDoc(studentDocRef);
        if (studentDoc.exists()) {
          const student = studentDoc.data();
          setRollNo(student.rollNo);

          const courseIds = student.courses;
          fetchAttendanceData(courseIds, student.rollNo);
        }
      }
    };

    fetchRollNumber();
  }, []);

  const fetchAttendanceData = async (courseIds, studentRollNo) => {
    if (!courseIds || courseIds.length === 0) return;

    try {
      const attendanceData = [];
      const attendanceTableData = [];
      let totalClassesConductedOverall = 0;
      let totalPresentOverall = 0;
      let absentDatesTemp = []; // Temporary array to store absent dates

      for (const courseId of courseIds) {
        const courseDocRef = doc(db, `/courses/III/A/sem1/courseDetails/${courseId}`);
        const courseDoc = await getDoc(courseDocRef);

        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          const instructorId = courseData.instructor;

          const attendanceDocRef = doc(db, `/attendance/III/A/${instructorId}/courses/${courseId}`);
          const attendanceDoc = await getDoc(attendanceDocRef);

          if (attendanceDoc.exists()) {
            const attendanceHistory = attendanceDoc.data().attendanceHistory;

            let totalPresent = 0;
            let totalClassesConducted = 0;

            attendanceHistory.forEach(entry => {
              totalClassesConducted++;
              const studentAttendance = entry.attendance.find(
                record => record.rollNo === studentRollNo
              );
              if (studentAttendance && studentAttendance.status === 'Present') {
                totalPresent++;
              }
              if (studentAttendance && studentAttendance.status === 'Absent') {
                absentDatesTemp.push({
                  date: entry.date,
                  courseName: courseData.courseName, // Add course name to the absent date
                });
              }
              if (entry.date === new Date().toISOString().split('T')[0]) {
                attendanceData.push({
                  date: entry.date,
                  courseName: courseData.courseName,
                  status: studentAttendance ? studentAttendance.status : 'Absent',
                });
              }
            });

            const percentage = ((totalPresent / totalClassesConducted) * 100).toFixed(2);

            totalClassesConductedOverall += totalClassesConducted;
            totalPresentOverall += totalPresent;

            attendanceTableData.push({
              courseName: courseData.courseName,
              totalClassesConducted,
              totalPresent,
              percentage,
            });
          }
        }
      }

      const overallPercentage = totalClassesConductedOverall
        ? ((totalPresentOverall / totalClassesConductedOverall) * 100).toFixed(2)
        : 0;

      setAttendance(attendanceData);
      setAttendanceTable(attendanceTableData);
      setOverallPercentage(overallPercentage);
      setAbsentDates(absentDatesTemp); // Update absent dates state
      setFilteredAbsentDates(absentDatesTemp); // Initially, show all absent dates
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage) => {
    if (percentage < 65) return 'text-red-500';
    if (percentage >= 65 && percentage < 75) return 'text-orange-500';
    if (percentage >= 75 && percentage < 85) return 'text-blue-500';
    return 'text-green-500';
  };

  const handleCourseFilterChange = (e) => {
    setCourseFilter(e.target.value);
    filterAbsentDates(e.target.value, dateFilter);
  };

  const handleDateFilterChange = (e) => {
    setDateFilter(e.target.value);
    filterAbsentDates(courseFilter, e.target.value);
  };

  const filterAbsentDates = (course, date) => {
    let filtered = absentDates;

    if (course) {
      filtered = filtered.filter(entry => entry.courseName === course);
    }

    if (date) {
      filtered = filtered.filter(entry => entry.date === date);
    }

    setFilteredAbsentDates(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-4 md:mb-6">Attendance</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Today's Attendance */}
          {/* <motion.div
             initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-4 md:mb-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 md:mb-4">
              Today's Attendance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              
              <div className="bg-green-100 p-4 rounded-lg">
                <h3 className="text-lg md:text-xl font-bold text-green-600 mb-2 flex items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-2xl md:text-3xl mr-2" />
                  Present
                </h3>
                <ul>
                  {attendance
                    .filter(entry => entry.status === 'Present')
                    .map((entry, index) => (
                      <li key={index} className="text-gray-700">
                        {entry.date} - {entry.courseName}
                      </li>
                    ))}
                </ul>
              </div>

           
              <div className="bg-red-100 p-4 rounded-lg">
                <h3 className="text-lg md:text-xl font-bold text-red-600 mb-2 flex items-center">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 text-2xl md:text-3xl mr-2" />
                  Absent
                </h3>
                <ul>
                  {attendance
                    .filter(entry => entry.status === 'Absent')
                    .map((entry, index) => (
                      <li key={index} className="text-gray-700">
                        {entry.date} - {entry.courseName}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </motion.div> */}

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="bg-white shadow-lg rounded-lg p-4 md:p-6 mt-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Filter Attendance</h2>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              {/* Course Filter */}
              <div className="flex items-center space-x-2">
                <label htmlFor="courseFilter" className="text-lg">Course:</label>
                <select
                  id="courseFilter"
                  value={courseFilter}
                  onChange={handleCourseFilterChange}
                  className="p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Courses</option>
                  {attendanceTable.map((entry, index) => (
                    <option key={index} value={entry.courseName}>
                      {entry.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center space-x-2">
                <label htmlFor="dateFilter" className="text-lg">Date:</label>
                <input
                  type="date"
                  id="dateFilter"
                  value={dateFilter}
                  onChange={handleDateFilterChange}
                  className="p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="bg-white shadow-lg rounded-lg p-4 md:p-6 mt-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Attendance Calendar</h2>
            {/* Display filtered absent dates */}
            <div className="calendar">
              {filteredAbsentDates.length > 0 ? (
                <ul>
                  {filteredAbsentDates.map((entry, index) => (
                    <li key={index} className="text-red-500">
                      Absent on: {entry.date} - {entry.courseName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No absent dates found.</p>
              )}
            </div>
          </motion.div>


          {/* Attendance Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="bg-white shadow-lg rounded-lg p-4 md:p-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Attendance Table</h2>
            <table className="table-auto w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th>Course Name</th>
                  <th>Total Classes Conducted</th>
                  <th>Total Present</th>
                  <th>Attendance Percentage</th>
                </tr>
              </thead>
              <tbody>
                {attendanceTable.map((entry, index) => (
                  <tr key={index} className="border-b">
                    <td>{entry.courseName}</td>
                    <td>{entry.totalClassesConducted}</td>
                    <td>{entry.totalPresent}</td>
                    <td className={getPercentageColor(entry.percentage)}>
                      {entry.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <h3>
                Overall Attendance:{" "}
                <span className={getPercentageColor(overallPercentage)}>
                  {overallPercentage}%
                </span>
              </h3>
            </div>
            <div className="mt-6 bg-white p-4 shadow rounded">
              <h3 className="text-lg font-bold mb-2">Legend:</h3>
              <ul className="list-disc pl-5">
                <li className="text-red-500">Below 65%: Poor attendance</li>
                <li className="text-orange-500">65% to 74%: Needs improvement</li>
                <li className="text-blue-500">75% to 84%: Good attendance</li>
                <li className="text-green-500">85% and above: Excellent attendance</li>
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default AttendancePage;
