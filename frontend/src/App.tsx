import React from 'react';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center min-h-screen">
              <h1 className="text-3xl font-bold text-gray-800">
                AI Hiring Platform
              </h1>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
