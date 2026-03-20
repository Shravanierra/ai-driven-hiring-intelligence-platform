import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useJob } from '../context/JobContext';

interface ShortlistEntry {
  candidate_id: string;
  rank: number;
  fit_score: number;
  reasoning: string;
  decision: 'pending' | 'accepted' | 'rejected' | 'deferred';
  candidate_name?: string;
}

interface Filters {
  minScore: string;
  minExperience: string;
  requiredSkill: string;
}

export default function ShortlistPage() {
  const { jobId } = useJob();
  const [entries, setEntries] = useState<ShortlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [size, setSize] = useState(10);
  const [filters, setFilters] = useState<Filters>({ minScore: '', minExperience: '', requiredSkill: '' });

  const loadShortlist = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/jobs/${jobId}/shortlist`);
      setEntries(data);
    } catch {
      setError('Failed to load shortlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShortlist(); }, [jobId]);

  const generate = async () => {
    if (!jobId) return;
    setGenerating(true);
    setError('');
    const body: Record<string, any> = { size };
    const f: Record<string, any> = {};
    if (filters.minScore) f.min_score = Number(filters.minScore);
    if (filters.minExperience) f.min_years_experience = Number(filters.minExperience);
    if (filters.requiredSkill) f.required_skill = filters.requiredSkill;
    if (Object.keys(f).length) body.filters = f;
    try {
      await api.post(`/jobs/${jobId}/shortlist`, body);
      await loadShortlist();
    } catch {
      setError('Failed to generate shortlist');
    } finally {
      setGenerating(false);
    }
  };

  const decide = async (candidateId: string, decision: 'accepted' | 'rejected' | 'deferred') => {
    if (!jobId) return;
    try {
      await api.patch(`/jobs/${jobId}/shortlist/${candidateId}`, { decision });
      setEntries((prev) =>
        prev.map((e) => (e.candidate_id === candidateId ? { ...e, decision } : e)),
      );
    } catch {
      setError('Failed to update decision');
    }
  };

  if (!jobId) {
    return <EmptyState message="Upload a job description first to generate a shortlist." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Shortlist</h1>

      {/* Filter panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Generate Shortlist</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max size (1–50)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min score</label>
            <input
              type="number"
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
              placeholder="e.g. 60"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min years exp.</label>
            <input
              type="number"
              value={filters.minExperience}
              onChange={(e) => setFilters({ ...filters, minExperience: e.target.value })}
              placeholder="e.g. 3"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Required skill</label>
            <input
              type="text"
              value={filters.requiredSkill}
              onChange={(e) => setFilters({ ...filters, requiredSkill: e.target.value })}
              placeholder="e.g. Kubernetes"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate Shortlist'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loading && <p className="text-gray-500">Loading…</p>}

      {/* Ranked list */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <ShortlistCard key={entry.candidate_id} entry={entry} onDecide={decide} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShortlistCard({
  entry,
  onDecide,
}: {
  entry: ShortlistEntry;
  onDecide: (id: string, d: 'accepted' | 'rejected' | 'deferred') => void;
}) {
  const decisionColor: Record<string, string> = {
    accepted: 'bg-green-50 border-green-300',
    rejected: 'bg-red-50 border-red-300',
    deferred: 'bg-yellow-50 border-yellow-300',
    pending: 'bg-white border-gray-200',
  };

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${decisionColor[entry.decision]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400">#{entry.rank}</span>
          <span className="font-medium text-gray-800">
            {entry.candidate_name ?? entry.candidate_id}
          </span>
        </div>
        <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
          {Math.round(entry.fit_score)}
        </span>
      </div>

      <p className="text-sm text-gray-600">{entry.reasoning}</p>

      <div className="flex gap-2">
        {(['accepted', 'rejected', 'deferred'] as const).map((d) => (
          <button
            key={d}
            onClick={() => onDecide(entry.candidate_id, d)}
            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
              entry.decision === d
                ? decisionButtonActive(d)
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function decisionButtonActive(d: string) {
  if (d === 'accepted') return 'bg-green-600 text-white border-green-600';
  if (d === 'rejected') return 'bg-red-600 text-white border-red-600';
  return 'bg-yellow-500 text-white border-yellow-500';
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <p>{message}</p>
    </div>
  );
}
