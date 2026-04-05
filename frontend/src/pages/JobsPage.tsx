import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useJob } from '../context/JobContext';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';

interface Criterion {
  label: string;
  weight: number;
  description: string;
}

interface Criteria {
  required_skills: string[];
  preferred_skills: string[];
  experience_level: string;
  responsibilities: string[];
  custom_criteria: Criterion[];
}

interface JobDescription {
  id: string;
  title: string;
  status: 'pending' | 'parsed' | 'error';
  parsedAt: string | null;
  errorMessage: string | null;
}

type UploadStatus = 'idle' | 'uploading' | 'polling' | 'parsed' | 'error';

export default function JobsPage() {
  const { jobId, setJob } = useJob();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadJobs = async () => {
    try {
      const { data } = await api.get('/jobs');
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => () => stopPolling(), []);

  const pollJob = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        if (data.status === 'parsed') {
          stopPolling();
          setStatus('parsed');
          const { data: crit } = await api.get(`/jobs/${id}/criteria`);
          setCriteria({
            required_skills: crit.required_skills ?? crit.requiredSkills ?? [],
            preferred_skills: crit.preferred_skills ?? crit.preferredSkills ?? [],
            experience_level: crit.experience_level ?? crit.experienceLevel ?? 'mid',
            responsibilities: crit.responsibilities ?? [],
            custom_criteria: crit.custom_criteria ?? crit.customCriteria ?? [],
          });
        } else if (data.status === 'error') {
          stopPolling();
          setStatus('error');
          setErrorMsg(data.error_message || 'Parsing failed');
        }
      } catch {
        stopPolling();
        setStatus('error');
        setErrorMsg('Failed to check job status');
      }
    }, 2000);
  };

  const uploadFile = async (file: File) => {
    setStatus('uploading');
    setErrorMsg('');
    setCriteria(null);
    setSaved(false);
    const form = new FormData();
    form.append('file', file);
    // Use filename (without extension) as the initial title
    const titleFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    form.append('title', titleFromFile);
    try {
      const { data } = await api.post('/jobs', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setJob(data.id, titleFromFile);
      setStatus('polling');
      pollJob(data.id);
      loadJobs();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.detail || 'Upload failed');
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const updateSkill = (
    field: 'required_skills' | 'preferred_skills',
    idx: number,
    value: string,
  ) => {
    if (!criteria) return;
    const arr = [...criteria[field]];
    arr[idx] = value;
    setCriteria({ ...criteria, [field]: arr });
  };

  const addSkill = (field: 'required_skills' | 'preferred_skills') => {
    if (!criteria) return;
    setCriteria({ ...criteria, [field]: [...criteria[field], ''] });
  };

  const removeSkill = (field: 'required_skills' | 'preferred_skills', idx: number) => {
    if (!criteria) return;
    setCriteria({ ...criteria, [field]: criteria[field].filter((_, i) => i !== idx) });
  };

  const saveCriteria = async () => {
    if (!jobId || !criteria) return;
    setSaving(true);
    try {
      await api.put(`/jobs/${jobId}/criteria`, criteria);
      setSaved(true);
    } catch {
      setErrorMsg('Failed to save criteria');
    } finally {
      setSaving(false);
    }
  };

  const selectJob = async (id: string) => {
    const job = jobs.find((j) => j.id === id);
    setJob(id, job?.title ?? null);
    setCriteria(null);
    setStatus('idle');
    setErrorMsg('');
    setSaved(false);
    try {
      const { data: crit } = await api.get(`/jobs/${id}/criteria`);
      setCriteria({
        required_skills: crit.required_skills ?? crit.requiredSkills ?? [],
        preferred_skills: crit.preferred_skills ?? crit.preferredSkills ?? [],
        experience_level: crit.experience_level ?? crit.experienceLevel ?? 'mid',
        responsibilities: crit.responsibilities ?? [],
        custom_criteria: crit.custom_criteria ?? crit.customCriteria ?? [],
      });
      setStatus('parsed');
    } catch {
      // no criteria yet
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {status === 'uploading' && <LoadingOverlay message="Uploading job description…" />}
      {status === 'polling'   && <LoadingOverlay message="Parsing with AI — this may take a moment…" />}
      <h1 className="text-2xl font-bold text-white text-center">Job Descriptions</h1>

      {/* Uploaded JDs list */}
      {jobs.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Uploaded JDs</span>
            <span className="text-xs text-gray-400">{jobs.length} total</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <li
                key={job.id}
                onClick={() => selectJob(job.id)}
                className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors hover:bg-indigo-50 ${
                  jobId === job.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                }`}
              >
                <FileText size={16} className="text-indigo-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">{job.title}</span>
                <JobStatusIcon status={job.status} />
                {job.parsedAt && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(job.parsedAt).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={onFileChange}
        />
        <p className="text-gray-500 text-sm">
          Drag &amp; drop a PDF, DOCX, or TXT file here, or{' '}
          <span className="text-indigo-600 font-medium">click to browse</span>
        </p>
      </div>

      {/* Status */}
      {status === 'uploading' && <StatusBadge color="blue" text="Uploading…" />}
      {status === 'polling' && <StatusBadge color="yellow" text="Parsing job description…" />}
      {status === 'error' && <StatusBadge color="red" text={`Error: ${errorMsg}`} />}
      {status === 'parsed' && !criteria && <StatusBadge color="green" text="Parsed — loading criteria…" />}

      {/* Criteria editor */}
      {criteria && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">Screening Criteria</h2>

          <SkillList
            label="Required Skills"
            skills={criteria.required_skills}
            onChange={(i, v) => updateSkill('required_skills', i, v)}
            onAdd={() => addSkill('required_skills')}
            onRemove={(i) => removeSkill('required_skills', i)}
          />

          <SkillList
            label="Preferred Skills"
            skills={criteria.preferred_skills}
            onChange={(i, v) => updateSkill('preferred_skills', i, v)}
            onAdd={() => addSkill('preferred_skills')}
            onRemove={(i) => removeSkill('preferred_skills', i)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Experience Level</label>
            <select
              value={criteria.experience_level}
              onChange={(e) => setCriteria({ ...criteria, experience_level: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-48"
            >
              {['entry', 'mid', 'senior', 'lead'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Responsibilities</label>
            {criteria.responsibilities.map((r, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={r}
                  onChange={(e) => {
                    const arr = [...criteria.responsibilities];
                    arr[i] = e.target.value;
                    setCriteria({ ...criteria, responsibilities: arr });
                  }}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() =>
                    setCriteria({
                      ...criteria,
                      responsibilities: criteria.responsibilities.filter((_, j) => j !== i),
                    })
                  }
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setCriteria({ ...criteria, responsibilities: [...criteria.responsibilities, ''] })
              }
              className="text-indigo-600 text-sm hover:underline"
            >
              + Add responsibility
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={saveCriteria}
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Criteria'}
            </button>
            {saved && <span className="text-green-600 text-sm">Saved!</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function JobStatusIcon({ status }: { status: string }) {
  if (status === 'parsed') return <CheckCircle size={14} className="text-green-500 flex-shrink-0" />;
  if (status === 'error')  return <AlertCircle size={14} className="text-red-400 flex-shrink-0" />;
  return <Clock size={14} className="text-yellow-400 flex-shrink-0" />;
}

function StatusBadge({ color, text }: { color: string; text: string }) {  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <div className={`border rounded-md px-4 py-2 text-sm ${colors[color] ?? ''}`}>{text}</div>
  );
}

function SkillList({
  label,
  skills,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  skills: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      {(skills ?? []).map((s, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            value={s}
            onChange={(e) => onChange(i, e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
          <button onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600 text-xs">
            Remove
          </button>
        </div>
      ))}
      <button onClick={onAdd} className="text-indigo-600 text-sm hover:underline">
        + Add skill
      </button>
    </div>
  );
}
