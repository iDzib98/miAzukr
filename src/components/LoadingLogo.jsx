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
          <linearGradient id="g1Loading" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#2D9CDB" />
            <stop offset="100%" stopColor="#6A3FD5" />
          </linearGradient>
        </defs>

        {/* Background rect — animates rx between rounded and square to simulate maskable */}
        <rect id="bgRect" width="500" height="500" rx="64" fill="url(#g1Loading)" x="0" y="0">
           <animate attributeName="rx" values="256;200;256" dur="2s" repeatCount="indefinite" />
           <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            values="0 256 256;360 256 256"
            dur="6s"
            repeatCount="indefinite"
           />
        </rect>

        <g transform="translate(-24,32)">
          {/* Soft halo for depth */}
          <circle cx="256" cy="200" r="160" fill="#ffffff" opacity="0.06" />

          {/* Droplet shape (blood drop) */}
          <path
            d="m 256,112 c -34,60 -76,95 -76,150 0,74 60,134 136,134 76,0 136,-60 136,-134 0,-55 -42,-90 -76,-150 -28,-48 -60,-66 -120,-34 -12,6 -24,18 -36,34 z"
            fill="#ffffff"
            opacity="0.98"
          />

          {/* Inner core circle to suggest focus/measurement */}
          <circle className="core" cx="256" cy="260" r="44" fill="#ff6b6b" />

          {/* Heartbeat / glucose line inside droplet */}
          <path
            className="heartbeat"
            d="m 192,256 28,-16 20,36 28,-56 32,48 32,-20"
            fill="none"
            stroke="#6a0dad"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Small check mark to suggest tracking/record */}
          <polyline
            className="check"
            points="210,322 240,352 302,290"
            fill="none"
            stroke="#1b998b"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </g>
      </svg>
      <span className="sr-only">Cargando aplicación</span>
    </div>
  )
}
