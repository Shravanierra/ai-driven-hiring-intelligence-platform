import React, { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';

interface CandidateResult {
  id: string;
  name: string;
  fit_score?: number;
}

interface Turn {
  query: string;
  interpretation: string;
  candidates: CandidateResult[];
  timestamp: string;
  clarification?: string;
  suggestions?: string[];
}

export default function AssistantPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Create session on mount
  useEffect(() => {
    api.post('/assistant/sessions').then(({ data }) => {
      setSessionId(data.id);
      setSessionLoading(false);
    }).catch(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const submit = async () => {
    if (!sessionId || !query.trim()) return;
    const q = query.trim();
    setQuery('');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/assistant/sessions/${sessionId}/query`, { query: q });
      const turn: Turn = {
        query: q,
        interpretation: data.interpretation ?? '',
        candidates: data.results ?? [],
        timestamp: new Date().toISOString(),
        clarification: data.clarification,
        suggestions: data.suggestions,
      };
      setTurns((prev) => [...prev, turn]);
    } catch {
      setError('Failed to submit query');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {sessionLoading && <LoadingOverlay message="Starting session…" />}
      <h1 className="text-2xl font-bold text-white text-center mb-4">Conversational Assistant</h1>

      {/* Session history */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {turns.length === 0 && !loading && (
          <p className="text-gray-400 text-sm text-center mt-16">
            Ask anything about your candidate pipeline.
          </p>
        )}
        {turns.map((turn, i) => (
          <TurnCard key={i} turn={turn} />
        ))}
        {/* Inline thinking indicator */}
        {loading && (
          <div className="flex items-center gap-3 pl-1">
            <div className="bg-white/10 border border-white/20 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex gap-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. Show top backend engineers with Kubernetes experience"
            rows={2}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={submit}
            disabled={loading || !sessionId}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 self-end"
          >
            {loading ? '…' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Press Enter to send, Shift+Enter for newline</p>
      </div>
    </div>
  );
}

function TurnCard({ turn }: { turn: Turn }) {
  return (
    <div className="space-y-3">
      {/* User query */}
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-md">
          {turn.query}
        </div>
      </div>

      {/* Assistant response */}
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 space-y-3">
        {turn.interpretation && (
          <div className="text-xs text-gray-500 italic border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-600">Interpretation: </span>
            {turn.interpretation}
          </div>
        )}

        {turn.clarification && (
          <p className="text-sm text-yellow-700 bg-yellow-50 rounded-md px-3 py-2">
            {turn.clarification}
          </p>
        )}

        {turn.suggestions && turn.suggestions.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">Suggestions: </span>
            {turn.suggestions.join(' · ')}
          </div>
        )}

        {turn.candidates.length > 0 && (
          <div className="space-y-1">
            {turn.candidates.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0"
              >
                <span className="text-gray-700">{c.name ?? c.id}</span>
                {c.fit_score !== undefined && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {Math.round(c.fit_score)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {turn.candidates.length === 0 && !turn.clarification && (
          <p className="text-sm text-gray-400">No results found.</p>
        )}
      </div>
    </div>
  );
}
