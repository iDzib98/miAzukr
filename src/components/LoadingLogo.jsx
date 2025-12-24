import React from 'react'
import './loading.css'

export default function LoadingLogo({ size = 96 }) {
  return (
    <div className="loading-wrapper" aria-hidden="false" aria-label="Cargando">
      <svg
        className="loading-logo"
        width={size}
        height={size}
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="miAzTitle"
      >
        <title id="miAzTitle">miAzukr - Cargando</title>
        <defs>
          <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#2D9CDB" />
            <stop offset="100%" stopColor="#6A3FD5" />
          </linearGradient>
        </defs>

        <rect width="512" height="512" rx="64" fill="url(#g1)" />
        <circle cx="256" cy="200" r="160" fill="#ffffff" opacity="0.06" />

        <path
          d="M256 112c-34 60-76 95-76 150 0 74 60 134 136 134s136-60 136-134c0-55-42-90-76-150-28-48-60-66-120-34-12 6-24 18-36 34z"
          fill="#fff"
          opacity="0.98"
        />

        <circle className="core" cx="256" cy="260" r="44" fill="#FF6B6B" />

        <path
          className="heartbeat"
          d="M192 256 L220 240 L240 276 L268 220 L300 268 L332 248"
          fill="none"
          stroke="#6A0DAD"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          className="check"
          points="210,322 240,352 302,290"
          fill="none"
          stroke="#1B998B"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
      </svg>
      <span className="sr-only">Cargando aplicación</span>
    </div>
  )
}
