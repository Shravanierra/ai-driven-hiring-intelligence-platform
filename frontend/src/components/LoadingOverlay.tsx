import React from 'react';

interface Props {
  message?: string;
}

export default function LoadingOverlay({ message = 'Processing…' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/10 border border-white/20 rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
        {/* Spinner */}
        <svg
          className="animate-spin h-10 w-10 text-indigo-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <p className="text-white text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
