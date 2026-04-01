import React from 'react';

interface Props {
  size?: number;
  className?: string;
}

export default function HiringLogo({ size = 48, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AI Hiring Platform logo"
    >
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="shineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="56" height="56" rx="14" fill="url(#bgGrad)" />
      {/* Shine overlay */}
      <rect width="56" height="28" rx="14" fill="url(#shineGrad)" />

      {/* Briefcase body */}
      <rect x="13" y="24" width="30" height="20" rx="3.5" fill="white" fillOpacity="0.95" />
      {/* Briefcase handle */}
      <path
        d="M22 24v-3a6 6 0 0 1 12 0v3"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Briefcase center bar */}
      <rect x="13" y="31" width="30" height="2.5" rx="1.25" fill="#6366F1" fillOpacity="0.35" />
      {/* Briefcase clasp */}
      <rect x="25.5" y="29.5" width="5" height="5" rx="2.5" fill="#6366F1" />

      {/* AI spark — top right */}
      <circle cx="43" cy="13" r="8" fill="#F0ABFC" />
      <circle cx="43" cy="13" r="8" fill="url(#bgGrad)" fillOpacity="0.7" />
      {/* Lightning bolt inside spark */}
      <path
        d="M44.5 9l-3 4.5h2.5l-2 4.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
