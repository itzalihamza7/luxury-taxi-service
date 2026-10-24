import type { ReactNode } from 'react'

/** A display headline; with two lines, the second is set in italic. */
export function Headline({ lines, as: Tag = 'h2', className = '' }: { lines: readonly string[]; as?: 'h1' | 'h2'; className?: string }) {
  return (
    <Tag className={`l-display ${className}`}>
      {lines.map((line, index) => (
        <span key={line} className={`block ${index > 0 ? 'italic' : ''}`}>
          {line}
        </span>
      ))}
    </Tag>
  )
}

/** The small spaced-capital label above a headline. */
export function Eyebrow({ className = '', children }: { className?: string; children: ReactNode }) {
  return <p className={`l-eyebrow ${className}`}>{children}</p>
}
