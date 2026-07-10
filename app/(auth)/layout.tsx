import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--auth-bg-base)' }}>
      {children}
    </div>
  );
}
