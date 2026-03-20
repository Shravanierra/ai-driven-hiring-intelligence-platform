import React, { createContext, useContext, useState } from 'react';

interface JobContextValue {
  jobId: string | null;
  setJobId: (id: string | null) => void;
}

const JobContext = createContext<JobContextValue>({ jobId: null, setJobId: () => {} });

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobId, setJobId] = useState<string | null>(null);
  return (
    <JobContext.Provider value={{ jobId, setJobId }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  return useContext(JobContext);
}
