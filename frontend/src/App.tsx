import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { JobProvider } from './context/JobContext';
import JobsPage from './pages/JobsPage';
import CandidatesPage from './pages/CandidatesPage';
import ShortlistPage from './pages/ShortlistPage';
import AssistantPage from './pages/AssistantPage';
import InterviewKitsPage from './pages/InterviewKitsPage';

function App() {
  return (
    <JobProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/jobs" replace />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="shortlist" element={<ShortlistPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="interview-kits" element={<InterviewKitsPage />} />
        </Route>
      </Routes>
    </JobProvider>
  );
}

export default App;
