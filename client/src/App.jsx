import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import Welcome from './pages/Welcome.jsx'
import Auth from './pages/Auth.jsx'
import Home from './pages/Home.jsx'
import Stats from './pages/Stats.jsx'
import ExamDetail from './pages/ExamDetail.jsx'
import Quiz from './pages/Quiz.jsx'
import Result from './pages/Result.jsx'
import Profile from './pages/Profile.jsx'
import Subscription from './pages/Subscription.jsx'
import Panel from './pages/Panel.jsx'
import Layout from './components/Layout.jsx'

function Private({ children }) {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="size-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  return user ? children : <Navigate to="/welcome" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route index element={<Home />} />
        <Route path="stats" element={<Stats />} />
        <Route path="exam/:examId" element={<ExamDetail />} />
        <Route path="exam/:examId/quiz" element={<Quiz />} />
        <Route path="result" element={<Result />} />
        <Route path="result/:attemptId" element={<Result />} />
        <Route path="profile" element={<Profile />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="panel" element={<Panel />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
