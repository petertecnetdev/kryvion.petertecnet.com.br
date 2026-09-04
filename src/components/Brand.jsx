import React from 'react';

export function KryvionMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 72 72" role="img" aria-label="Kryvion">
      <defs>
        <linearGradient id="kryvionGradient" x1="8" y1="12" x2="64" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6d35ff" />
          <stop offset="0.5" stopColor="#8f5cff" />
          <stop offset="1" stopColor="#35b8ff" />
        </linearGradient>
        <filter id="kryvionGlow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="36" cy="36" r="30" fill="none" stroke="url(#kryvionGradient)" strokeWidth="6.2" strokeLinecap="round" strokeDasharray="126 32" transform="rotate(-42 36 36)" opacity=".95" filter="url(#kryvionGlow)" />
      <path d="M23 17v38M24 37l19-18M27 34l22 23" fill="none" stroke="url(#kryvionGradient)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" filter="url(#kryvionGlow)" />
      <path d="M46 14c5 2 9 6 12 11" fill="none" stroke="#a46cff" strokeWidth="4.5" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export default function Brand({ compact = false, light = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''} ${light ? 'brand-light' : ''}`}>
      <div className="brand-mark"><KryvionMark /></div>
      <div className="brand-copy">
        <strong>KRYVION</strong>
        {!compact && <small>by Peter Tecnet</small>}
      </div>
    </div>
  );
}
