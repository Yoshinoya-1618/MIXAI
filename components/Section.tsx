// components/Section.tsx
'use client';
import * as React from 'react';

export function Section({
  className = '',
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return <section id={id} className={`py-14 md:py-20 ${className}`}>{children}</section>;
}

export function Container({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
