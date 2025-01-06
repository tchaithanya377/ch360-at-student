import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { db } from '../firebase'; // Import Firebase config

const CourseCard = ({ course }) => (
  <div className="card p-6 rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 animate-fadeIn">
    <h3 className="text-2xl font-bold text-gray-900">{course.courseName || 'N/A'}</h3>
    <p className="text-gray-700 mt-2">Course Code: {course.courseCode || 'N/A'}</p>
    <div className="mt-4 flex justify-between items-center">
      <span className="text-sm text-gray-600">Instructor: {course.instructorName || 'N/A'}</span>
    </div>
    <div className="mt-4">
      <Link to={`/courses/${course.id}`} className="text-blue-500 hover:underline">
        View Details
      </Link>
    </div>
  </div>
);

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          console.error('No logged-in user.');
          setLoading(false);
          return;
        }

        const studentRef = doc(db, `students/III/A`, user.uid); // Update path as needed
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          const { Year, Section, courses } = studentData;

          const coursesPromises = courses.map(async (courseId) => {
            const coursePath = `courses/${Year}/${Section}/sem1/courseDetails/${courseId}`;
            const courseRef = doc(db, coursePath);
            const courseSnap = await getDoc(courseRef);

            if (courseSnap.exists()) {
              const courseData = courseSnap.data();

              // Fetch instructor details
              const instructorRef = doc(db, 'faculty', courseData.instructor);
              const instructorSnap = await getDoc(instructorRef);
              const instructorName = instructorSnap.exists() ? instructorSnap.data().name : 'N/A';

              return {
                id: courseId,
                ...courseData,
                instructorName,
              };
            }

            return {
              id: courseId,
              courseName: 'N/A',
              courseCode: 'N/A',
              instructorName: 'N/A',
            };
          });

          const coursesData = await Promise.all(coursesPromises);
          setCourses(coursesData);
        } else {
          console.error('Student document not found.');
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const courseName = course?.courseName?.toLowerCase() || '';
    const instructorName = course?.instructorName?.toLowerCase() || '';
    return (
      courseName.includes(search.toLowerCase()) || instructorName.includes(search.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-light p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Course List</h1>
      <div className="mb-6 relative max-w-md mx-auto">
        <input
          type="text"
          placeholder="Search for a course or instructor..."
          className="p-4 pl-10 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FiSearch className="absolute left-3 top-3 text-gray-400" size={24} />
      </div>
      {loading ? (
        <div className="text-center text-gray-600">Loading courses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
          ) : (
            <div className="text-gray-600 text-center col-span-full">No courses found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseList;
