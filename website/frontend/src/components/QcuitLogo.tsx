import React from 'react';

type QcuitLogoProps = {
  size?: number;
  className?: string;
  title?: string;
  decorative?: boolean;
};

export function QcuitLogo({ size = 32, className = '', title = 'Qcuit', decorative = false }: QcuitLogoProps) {
  const titleId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : titleId}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!decorative && <title id={titleId}>{title}</title>}
      <rect x="7" y="7" width="50" height="50" rx="10" fill="#0A1F1C" />
      <path
        d="M47.4 45.5C43.7 49.1 38.6 51.3 32.9 51.3C21.8 51.3 12.8 42.7 12.8 32C12.8 21.3 21.8 12.7 32.9 12.7C44 12.7 53 21.3 53 32C53 35.8 51.9 39.4 49.9 42.4"
        stroke="#C5A059"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M36.8 39.4L49.3 51.2"
        stroke="#F5F2EA"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M21 33.2C24.2 28.7 27 26.5 29.5 26.5C33.8 26.5 35.4 36 39.6 36C41.9 36 44.4 33.9 47 29.8"
        stroke="#F5F2EA"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="33.2" r="3.1" fill="#C5A059" />
      <circle cx="29.5" cy="26.5" r="3.1" fill="#C5A059" />
      <circle cx="39.6" cy="36" r="3.1" fill="#C5A059" />
      <circle cx="47" cy="29.8" r="3.1" fill="#C5A059" />
    </svg>
  );
}

export default QcuitLogo;
