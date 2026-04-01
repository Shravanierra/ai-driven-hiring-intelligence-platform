import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'selected_job_id';

interface JobContextValue {
  jobId: string | null;
  setJobId: (id: string | null) => void;
}

const JobContext = createContext<JobContextValue>({ jobId: null, setJobId: () => {} });

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobId, setJobIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );

  const setJobId = (id: string | null) => {
    setJobIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <JobContext.Provider value={{ jobId, setJobId }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  return useContext(JobContext);
}
