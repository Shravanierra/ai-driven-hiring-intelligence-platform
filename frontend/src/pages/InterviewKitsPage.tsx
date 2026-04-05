import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useJob } from '../context/JobContext';
import JdSwitcher from '../components/JdSwitcher';
import LoadingOverlay from '../components/LoadingOverlay';
import { useToast } from '../components/Toast';

interface Rubric {
  strong: string;
  adequate: string;
  weak: string;
}

interface Question {
  id: string;
  type: 'behavioral' | 'technical' | 'gap';
  text: string;
  rubric: Rubric;
}

interface InterviewKit {
  id: string;
  questions: Question[];
  generated_at: string;
  updated_at: string;
}

interface Candidate {
  id: string;
  name: string;
}

export default function InterviewKitsPage() {
  const { jobId } = useJob();
  const { showError, showSuccess } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [kit, setKit] = useState<InterviewKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    api.get(`/jobs/${jobId}/candidates`).then(({ data }) => setCandidates(data));
  }, [jobId]);

  const loadKit = async (candidateId: string) => {
    if (!jobId) return;
    setLoading(true);
    setKit(null);
    try {
      const { data } = await api.get(`/jobs/${jobId}/candidates/${candidateId}/interview-kit`);
      setKit(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setKit(null);
      } else {
        showError('Failed to load interview kit');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectCandidate = (id: string) => {
    setSelectedCandidate(id);
    loadKit(id);
    setSaved(false);
  };

  const generateKit = async () => {
    if (!jobId || !selectedCandidate) return;
    setGenerating(true);
    try {
      const { data } = await api.post(
        `/jobs/${jobId}/candidates/${selectedCandidate}/interview-kit`,
      );
      setKit(data);
    } catch {
      showError('Failed to generate interview kit');
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (idx: number, field: keyof Question | keyof Rubric, value: string, isRubric = false) => {
    if (!kit) return;
    const questions = kit.questions.map((q, i) => {
      if (i !== idx) return q;
      if (isRubric) return { ...q, rubric: { ...q.rubric, [field]: value } };
      return { ...q, [field]: value };
    });
    setKit({ ...kit, questions });
    setSaved(false);
  };

  const addQuestion = () => {
    if (!kit) return;
    const newQ: Question = {
      id: `new-${Date.now()}`,
      type: 'behavioral',
      text: '',
      rubric: { strong: '', adequate: '', weak: '' },
    };
    setKit({ ...kit, questions: [...kit.questions, newQ] });
    setSaved(false);
  };

  const removeQuestion = (idx: number) => {
    if (!kit) return;
    setKit({ ...kit, questions: kit.questions.filter((_, i) => i !== idx) });
    setSaved(false);
  };

  const saveKit = async () => {
    if (!jobId || !selectedCandidate || !kit) return;
    setSaving(true);
    try {
      await api.put(`/jobs/${jobId}/candidates/${selectedCandidate}/interview-kit`, {
        questions: kit.questions,
      });
      setSaved(true);
      showSuccess('Interview kit saved');
    } catch {
      showError('Failed to save interview kit');
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    if (!jobId || !selectedCandidate) return;
    setExporting(true);
    try {
      const response = await api.get(
        `/jobs/${jobId}/candidates/${selectedCandidate}/interview-kit/export`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-kit-${selectedCandidate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (!jobId) {
    return (
      <div className="max-w-5xl mx-auto pt-8">
        <JdSwitcher />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {generating && <LoadingOverlay message="Generating interview kit with AI…" />}
      {loading    && <LoadingOverlay message="Loading interview kit…" />}
      {saving     && <LoadingOverlay message="Saving…" />}
      {exporting  && <LoadingOverlay message="Exporting PDF…" />}
      <JdSwitcher />
      <h1 className="text-2xl font-bold text-white text-center">Interview Kits</h1>

      {/* Candidate selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Candidate</label>
        <select
          value={selectedCandidate ?? ''}
          onChange={(e) => selectCandidate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72"
        >
          <option value="">— choose a candidate —</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCandidate && !kit && !loading && !generating && (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">No interview kit yet for this candidate.</p>
          <button
            onClick={generateKit}
            disabled={generating}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate Interview Kit'}
          </button>
        </div>
      )}

      {kit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {kit.questions.length} question{kit.questions.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-3">
              <button
                onClick={saveKit}
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && <span className="text-green-600 text-sm self-center">Saved!</span>}
              <button
                onClick={exportPdf}
                disabled={exporting}
                className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {exporting ? 'Exporting…' : '⬇ Export PDF'}
              </button>
            </div>
          </div>

          {kit.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              onChange={updateQuestion}
              onRemove={() => removeQuestion(i)}
            />
          ))}

          <button
            onClick={addQuestion}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            + Add Question
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: Question;
  index: number;
  onChange: (idx: number, field: any, value: string, isRubric?: boolean) => void;
  onRemove: () => void;
}) {
  const typeColors: Record<string, string> = {
    behavioral: 'bg-blue-50 text-blue-700',
    technical: 'bg-purple-50 text-purple-700',
    gap: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-bold text-gray-400">Q{index + 1}</span>
          <select
            value={question.type}
            onChange={(e) => onChange(index, 'type', e.target.value)}
            className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${typeColors[question.type]}`}
          >
            <option value="behavioral">Behavioral</option>
            <option value="technical">Technical</option>
            <option value="gap">Gap</option>
          </select>
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-xs">
          Remove
        </button>
      </div>

      <textarea
        value={question.text}
        onChange={(e) => onChange(index, 'text', e.target.value)}
        placeholder="Question text…"
        rows={2}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
      />

      <div className="grid grid-cols-3 gap-3">
        {(['strong', 'adequate', 'weak'] as const).map((level) => (
          <div key={level}>
            <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">
              {level} answer
            </label>
            <textarea
              value={question.rubric[level]}
              onChange={(e) => onChange(index, level, e.target.value, true)}
              placeholder={`${level} answer criteria…`}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
