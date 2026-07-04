import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Home from './pages/Home';
import CourseLessons from './pages/courses/CourseLessons';
import LessonPage from './pages/courses/LessonPage';
import LessonTopic from './pages/courses/${courseId}/${lesson.id}/LessonTopic';
import ExamPage from './pages/courses/ExamPage';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import { MainLayout } from './layouts/MainLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import TeacherIndex from './pages/teacher/TeacherIndex';
import Students from './pages/teacher/Students';
import Courses from './pages/teacher/Courses';
import Exercises from './pages/teacher/Exercises';
import ExerciseList from './pages/teacher/ExerciseList';
import Hackathon from './pages/teacher/Hackathon';
import InviteStudents from './pages/teacher/InviteStudents';
import { useThemeMode } from './hooks/useTheme';

function App() {
  const { mode } = useThemeMode();
  return (
    <Box sx={{bgcolor: mode === 'fancy' ? 'transparent' : 'background.default' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<MainLayout />}>
          <Route path="/courses/:courseId" element={<CourseLessons />} />
          <Route path="/courses/:courseId/:lessonId" element={<LessonPage />} />
          <Route path="/courses/:courseId/:lessonId/topic" element={<LessonTopic />} />
          <Route path="/courses/:courseId/exam/:challengeSlug" element={<ExamPage />} />
          <Route path="/dashboards/student" element={<StudentDashboard />} />
        </Route>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherIndex />} />
          <Route path="students" element={<Students />} />
          <Route path="courses" element={<Courses />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="exercises/list" element={<ExerciseList />} />
          <Route path="hackathon" element={<Hackathon />} />
          <Route path="invite" element={<InviteStudents />} />
        </Route>
      </Routes>
    </Box>
  );
}

export default App;