import React from 'react';
import type { StampDesign } from '../types';

export function YosCrestLogo({
  className = 'w-9 h-9',
  strokeColor = '#C9A34E',
  textColor = 'currentColor',
}: {
  className?: string;
  strokeColor?: string;
  textColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer octagonal architectural frame */}
      <polygon
        points="20,4 44,4 60,20 60,44 44,60 20,60 4,44 4,20"
        stroke={strokeColor}
        strokeWidth="1.75"
      />
      <polygon
        points="22,8.5 42,8.5 55.5,22 55.5,42 42,55.5 22,55.5 8.5,42 8.5,22"
        stroke={strokeColor}
        strokeWidth="0.75"
        strokeOpacity="0.65"
      />
      {/* Interlocking Y O S minimal atelier monogram */}
      <path
        d="M21 20L32 32.5L43 20"
        stroke={textColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 32.5V46"
        stroke={textColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle
        cx="32"
        cy="32"
        r="12"
        stroke={strokeColor}
        strokeWidth="1.25"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

export function YosStampGraphic({
  design,
  inkColor = '#E3C168',
  accentColor = '#FAF8F4',
  className = 'w-11 h-11',
}: {
  design: StampDesign;
  inkColor?: string;
  accentColor?: string;
  className?: string;
}) {
  if (design === 'crown') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="28" stroke={inkColor} strokeWidth="1.6" />
        <circle cx="32" cy="32" r="23.5" stroke={inkColor} strokeWidth="0.8" strokeDasharray="2 2" />
        <path
          d="M17 40L15 23L25 30L32 19L39 30L49 23L47 40H17Z"
          stroke={inkColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <line x1="17" y1="44.5" x2="47" y2="44.5" stroke={accentColor} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="32" cy="16" r="1.6" fill={accentColor} />
        <circle cx="15" cy="20" r="1.4" fill={inkColor} />
        <circle cx="49" cy="20" r="1.4" fill={inkColor} />
      </svg>
    );
  }

  if (design === 'diamond') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="28" stroke={inkColor} strokeWidth="1.6" />
        <polygon
          points="32,12 50,32 32,52 14,32"
          stroke={inkColor}
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <polygon
          points="32,19 43,32 32,45 21,32"
          stroke={accentColor}
          strokeWidth="1"
          strokeOpacity="0.8"
        />
        <text
          x="32"
          y="35.5"
          textAnchor="middle"
          fill={accentColor}
          fontSize="10"
          fontWeight="600"
          fontFamily="Cormorant Garamond, Georgia, serif"
          letterSpacing="1.6"
        >
          YOS
        </text>
      </svg>
    );
  }

  if (design === 'laurel') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="28" stroke={inkColor} strokeWidth="1.6" />
        <path
          d="M20 44C14 37 14 25 21 18M44 44C50 37 50 25 43 18"
          stroke={inkColor}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M17 31L13 28M18 24L15 20M22 41L17 41M47 31L51 28M46 24L49 20M42 41L47 41"
          stroke={inkColor}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <text
          x="32"
          y="34"
          textAnchor="middle"
          fill={accentColor}
          fontSize="12"
          fontWeight="700"
          fontFamily="Cormorant Garamond, Georgia, serif"
          letterSpacing="2"
        >
          YOS
        </text>
        <text
          x="32"
          y="43"
          textAnchor="middle"
          fill={inkColor}
          fontSize="5.5"
          fontWeight="600"
          letterSpacing="1.8"
        >
          STAMP
        </text>
      </svg>
    );
  }

  // Default: 'monogram'
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke={inkColor} strokeWidth="1.8" />
      <circle cx="32" cy="32" r="24" stroke={inkColor} strokeWidth="0.75" strokeDasharray="2.5 2" />
      <polygon
        points="24,14 40,14 50,24 50,40 40,50 24,50 14,40 14,24"
        stroke={inkColor}
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <text
        x="32"
        y="33.5"
        textAnchor="middle"
        fill={accentColor}
        fontSize="13.5"
        fontWeight="700"
        fontFamily="Cormorant Garamond, Georgia, serif"
        letterSpacing="2"
      >
        YOS
      </text>
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fill={inkColor}
        fontSize="5.2"
        fontWeight="600"
        letterSpacing="1.7"
      >
        COLLECTION
      </text>
    </svg>
  );
}
