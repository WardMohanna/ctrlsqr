"use client";

import Image from "next/image";
import type { MouseEvent } from "react";

function buildDummyPortrait(name: string, start: string, end: string) {
  const initials = name.slice(0, 1).toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 560" role="img" aria-label="${name} placeholder portrait">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="20%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="560" rx="36" fill="url(#bg)" />
      <rect width="480" height="560" rx="36" fill="url(#glow)" />
      <circle cx="240" cy="190" r="92" fill="rgba(255,255,255,0.82)" />
      <path d="M126 446c18-92 86-136 114-136s96 44 114 136" fill="rgba(255,255,255,0.78)" />
      <circle cx="374" cy="98" r="54" fill="rgba(255,255,255,0.2)" />
      <text x="374" y="112" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const engineers = [
  {
    name: "Ward",
    role: "Software Engineer",
    placeholder: "Details coming soon",
    image: buildDummyPortrait("Ward", "#ffe48b", "#d6a400"),
  },
  {
    name: "Mohamad",
    role: "Software Engineer",
    placeholder: "Details coming soon",
    image: buildDummyPortrait("Mohamad", "#f5d96f", "#b98f14"),
  },
  {
    name: "Emeer",
    role: "Software Engineer",
    placeholder: "Details coming soon",
    image: buildDummyPortrait("Emeer", "#fce58e", "#caa228"),
  },
  {
    name: "Bian",
    role: "Software Engineer",
    placeholder: "Details coming soon",
    image: buildDummyPortrait("Bian", "#f2d874", "#af8612"),
  },
];

export default function AboutUsPage() {
  const handlePointerMove = (event: MouseEvent<HTMLElement>) => {
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    card.style.setProperty("--pointer-x", `${x}%`);
    card.style.setProperty("--pointer-y", `${y}%`);
  };

  const handlePointerLeave = (event: MouseEvent<HTMLElement>) => {
    const card = event.currentTarget;
    card.style.setProperty("--pointer-x", "50%");
    card.style.setProperty("--pointer-y", "50%");
  };

  return (
    <div className="about-us-page">
      <div className="about-us-header">
        <h1>About Us</h1>
        <p>The engineers behind CtrlSqr.</p>
      </div>

      <section className="about-profile-grid" aria-label="Engineering team">
        {engineers.map((engineer) => (
          <article
            key={engineer.name}
            className="about-profile-card"
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
          >
            <div className="about-profile-card__border" aria-hidden="true" />
            <div className="about-profile-card__surface">
              <div className="about-profile-card__shine" aria-hidden="true" />
              <div className="about-profile-card__content">
                <div className="about-profile-media">
                  <Image
                    src={engineer.image}
                    alt={`${engineer.name} placeholder portrait`}
                    className="about-profile-image"
                    width={480}
                    height={560}
                    unoptimized
                  />
                  <span className="about-profile-tag">CtrlSqr Team</span>
                </div>

                <div className="about-profile-card__body">
                  <h2>{engineer.name}</h2>
                  <p className="about-profile-role">{engineer.role}</p>
                  <p className="about-profile-placeholder">
                    {engineer.placeholder}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
