import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { MainLayout } from './layouts/MainLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { RouteFallback } from './components/ui/RouteFallback';
import { useThemeMode } from './hooks/useTheme';

// Totes les pàgines es carreguen sota demanda: així una visita a un curs no baixa el codi
// del tauler (ni les seves gràfiques) i el bundle inicial és molt més petit.
const Home = lazy(() => import('./pages/Home'));
const StudentDashboard = lazy(() => import('./pages/dashboards/StudentDashboard'));
const CourseLessons = lazy(() => import('./pages/courses/CourseLessons'));
const LessonPage = lazy(() => import('./pages/courses/LessonPage'));
const LessonTopic = lazy(() => import('./pages/courses/${courseId}/${lesson.id}/LessonTopic'));
const TopicTestPage = lazy(() => import('./pages/courses/TopicTestPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SurveysPage = lazy(() => import('./pages/courses/SurveysPage'));
const SurveyPage = lazy(() => import('./pages/courses/SurveyPage'));
const DrivePage = lazy(() => import('./pages/courses/DrivePage'));
const ChallengesPage = lazy(() => import('./pages/courses/ChallengesPage'));
const ChallengePage = lazy(() => import('./pages/courses/ChallengePage'));
const ExamsPage = lazy(() => import('./pages/courses/ExamsPage'));
const ExamPage = lazy(() => import('./pages/courses/ExamPage'));
const TeacherIndex = lazy(() => import('./pages/teacher/TeacherIndex'));
const Students = lazy(() => import('./pages/teacher/Students'));
const Courses = lazy(() => import('./pages/teacher/Courses'));
const Exercises = lazy(() => import('./pages/teacher/Exercises'));
const ExerciseList = lazy(() => import('./pages/teacher/ExerciseList'));
const Test = lazy(() => import('./pages/teacher/Test'));
const Hackathon = lazy(() => import('./pages/teacher/Hackathon'));
const InviteStudents = lazy(() => import('./pages/teacher/InviteStudents'));

// L'antiga pàgina "Més estadístiques" ara és una secció del tauler del curs
function LegacyStatsRedirect() {
  const { courseId = '' } = useParams();
  return <Navigate to={`/dashboards/student?course=${encodeURIComponent(courseId)}`} replace />;
}

// Enllaços antics (/exam/) continuen funcionant
function LegacyExamRedirect() {
  const { courseId, challengeSlug } = useParams();
  return <Navigate to={`/courses/${courseId}/test/${challengeSlug}`} replace />;
}

function App() {
  const { mode } = useThemeMode();
  return (
    <Box sx={{bgcolor: mode === 'fancy' ? 'transparent' : 'background.default' }}>
      <Routes>
        <Route path="/" element={<Suspense fallback={<RouteFallback />}><Home /></Suspense>} />
        <Route element={<MainLayout />}>
          <Route path="/courses/:courseId" element={<CourseLessons />} />
          <Route path="/courses/:courseId/:lessonId" element={<LessonPage />} />
          <Route path="/courses/:courseId/:lessonId/topic" element={<LessonTopic />} />
          <Route path="/courses/:courseId/test/:challengeSlug" element={<TopicTestPage />} />
          <Route path="/courses/:courseId/exam/:challengeSlug" element={<LegacyExamRedirect />} />
          <Route path="/courses/:courseId/stats" element={<LegacyStatsRedirect />} />
          <Route path="/courses/:courseId/surveys" element={<SurveysPage />} />
          <Route path="/courses/:courseId/surveys/:surveySlug" element={<SurveyPage />} />
          <Route path="/courses/:courseId/drive" element={<DrivePage />} />
          <Route path="/courses/:courseId/drive/:folderId" element={<DrivePage />} />
          <Route path="/courses/:courseId/challenges" element={<ChallengesPage />} />
          <Route path="/courses/:courseId/challenges/:challengeSlug" element={<ChallengePage />} />
          <Route path="/courses/:courseId/exams" element={<ExamsPage />} />
          <Route path="/courses/:courseId/exams/:examSlug" element={<ExamPage />} />
          <Route path="/courses/:courseId/exams/:examSlug/:lessonId" element={<LessonPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/dashboards/student" element={<StudentDashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherIndex />} />
          <Route path="students" element={<Students />} />
          <Route path="courses" element={<Courses />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="exercises/list" element={<ExerciseList />} />
          <Route path="test" element={<Test />} />
          <Route path="hackathon" element={<Hackathon />} />
          <Route path="invite" element={<InviteStudents />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Box>
  );
}

export default App;
