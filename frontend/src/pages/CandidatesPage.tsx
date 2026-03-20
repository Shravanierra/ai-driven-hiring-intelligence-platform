import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useJob } from '../context/JobContext';

interface BreakdownItem {
  criterion_label: string;
  status: 'met' | 'partial' | 'not_met';
  contribution: number;
  explanation: string;
}

interface FitScore {
  score: number;
  breakdown: BreakdownItem[];
}

interface BiasFlag {
  signal_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface Candidate {
  id: string;
  name: string;
  summary: string;
  fitScore?: FitScore;
  biasFlags?: BiasFlag[];
}

export default function CandidatesPage() {
  const { jobId } = useJob();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setError('');
    api
      .get(`/jobs/${jobId}/candidates`)
      .then(async ({ data }) => {
        const list: Candidate[] = data;
        // Fetch scores and bias flags in parallel
        const enriched = await Promise.all(
          list.map(async (c) => {
            const [scoreRes, biasRes] = await Promise.allSettled([
              api.get(`/jobs/${jobId}/candidates/${c.id}/score`),
              api.get(`/jobs/${jobId}/candidates/${c.id}/bias`),
            ]);
            return {
              ...c,
              fitScore: scoreRes.status === 'fulfilled' ? scoreRes.value.data : undefined,
              biasFlags: biasRes.status === 'fulfilled' ? biasRes.value.data : [],
            };
          }),
        );
        setCandidates(enriched);
      })
      .catch(() => setError('Failed to load candidates'))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (!jobId) {
    return <EmptyState message="Upload a job description first to see candidates." />;
  }

  if (loading) return <p className="text-gray-500">Loading candidates…</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!candidates.length) return <EmptyState message="No candidates found for this job." />;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Candidates</h1>
      {candidates.map((c) => (
        <CandidateCard
          key={c.id}
          candidate={c}
          expanded={expanded === c.id}
          onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
        />
      ))}
    </div>
  );
}

function CandidateCard({
  candidate,
  expanded,
  onToggle,
}: {
  candidate: Candidate;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasBias = (candidate.biasFlags?.length ?? 0) > 0;
  const score = candidate.fitScore?.score;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
            {candidate.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-800">{candidate.name}</p>
            <p className="text-xs text-gray-500 line-clamp-1">{candidate.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasBias && (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full border border-yellow-300">
              ⚠ Bias flags
            </span>
          )}
          {score !== undefined && (
            <ScoreBadge score={score} />
          )}
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Score breakdown */}
          {candidate.fitScore && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Score Breakdown</h3>
              <div className="space-y-2">
                {candidate.fitScore.breakdown.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <StatusDot status={item.status} />
                    <div>
                      <span className="font-medium text-gray-700">{item.criterion_label}</span>
                      <span className="text-gray-400 ml-2 text-xs">
                        ({item.status.replace('_', ' ')}, +{item.contribution.toFixed(1)})
                      </span>
                      <p className="text-gray-500 text-xs mt-0.5">{item.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bias flags */}
          {hasBias && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bias Warnings</h3>
              <div className="space-y-2">
                {candidate.biasFlags!.map((flag, i) => (
                  <div
                    key={i}
                    className={`rounded-md px-3 py-2 text-xs border ${severityClass(flag.severity)}`}
                  >
                    <span className="font-semibold">{flag.signal_type}</span>: {flag.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-100 text-green-800' :
    score >= 50 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';
  return (
    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${color}`}>
      {Math.round(score)}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'met' ? 'bg-green-500' :
    status === 'partial' ? 'bg-yellow-400' :
    'bg-red-400';
  return <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}

function severityClass(severity: string) {
  if (severity === 'high') return 'bg-red-50 border-red-200 text-red-700';
  if (severity === 'medium') return 'bg-orange-50 border-orange-200 text-orange-700';
  return 'bg-yellow-50 border-yellow-200 text-yellow-700';
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <p>{message}</p>
    </div>
  );
}
