import React, { useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, ChevronDown } from 'lucide-react';
import api from '../api/client';
import { useJob } from '../context/JobContext';

interface JobOption {
  id: string;
  title: string;
  status: string;
}

/**
 * Displays the active JD name with a dropdown to switch to any other parsed JD.
 * Fetches the JD list itself so callers don't need to manage it.
 */
export default function JdSwitcher() {
  const { jobId, jobTitle, setJob } = useJob();
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/jobs')
      .then(({ data }) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const parsed = jobs.filter((j) => j.status === 'parsed');
  const activeTitle = jobTitle ?? jobs.find((j) => j.id === jobId)?.title ?? jobId ?? 'No JD selected';

  return (
    <div ref={ref} className="relative">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-200 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <BriefcaseBusiness size={16} className="text-indigo-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wide leading-none mb-0.5">Active job description</p>
            <p className="text-sm font-semibold text-indigo-700 truncate">{activeTitle}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex-shrink-0"
        >
          Switch
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
            Select job description
          </p>
          {parsed.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No parsed JDs yet.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
              {parsed.map((j) => (
                <li
                  key={j.id}
                  onClick={() => { setJob(j.id, j.title); setOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors text-sm ${
                    j.id === jobId ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-700'
                  }`}
                >
                  <BriefcaseBusiness size={13} className="text-indigo-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{j.title}</span>
                  {j.id === jobId && (
                    <span className="text-xs text-indigo-400 flex-shrink-0">active</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
