import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import { JobProvider } from './context/JobContext';
import LoginPage from './pages/LoginPage';
import JobsPage from './pages/JobsPage';
import CandidatesPage from './pages/CandidatesPage';
import ShortlistPage from './pages/ShortlistPage';
import AssistantPage from './pages/AssistantPage';
import InterviewKitsPage from './pages/InterviewKitsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <JobProvider>
              <Layout />
            </JobProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/jobs" replace />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="shortlist" element={<ShortlistPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="interview-kits" element={<InterviewKitsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
