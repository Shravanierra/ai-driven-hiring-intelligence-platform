import React, { createContext, useContext, useState } from 'react';

const ID_KEY    = 'selected_job_id';
const TITLE_KEY = 'selected_job_title';

interface JobContextValue {
  jobId: string | null;
  jobTitle: string | null;
  setJob: (id: string | null, title?: string | null) => void;
  /** @deprecated use setJob */
  setJobId: (id: string | null) => void;
}

const JobContext = createContext<JobContextValue>({
  jobId: null,
  jobTitle: null,
  setJob: () => {},
  setJobId: () => {},
});

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobId, setJobIdState]       = useState<string | null>(() => localStorage.getItem(ID_KEY));
  const [jobTitle, setJobTitleState] = useState<string | null>(() => localStorage.getItem(TITLE_KEY));

  const setJob = (id: string | null, title?: string | null) => {
    setJobIdState(id);
    const t = title ?? null;
    setJobTitleState(t);
    if (id) {
      localStorage.setItem(ID_KEY, id);
      if (t) localStorage.setItem(TITLE_KEY, t);
      else    localStorage.removeItem(TITLE_KEY);
    } else {
      localStorage.removeItem(ID_KEY);
      localStorage.removeItem(TITLE_KEY);
    }
  };

  // backwards-compat shim
  const setJobId = (id: string | null) => setJob(id);

  return (
    <JobContext.Provider value={{ jobId, jobTitle, setJob, setJobId }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  return useContext(JobContext);
}
