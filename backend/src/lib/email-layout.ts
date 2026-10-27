/*
 * The look of every email the site sends: plain and readable, the same text as HTML, with at most
 * one button. Kept simple so it renders the same in every mail app.
 */

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`)

export interface LayoutOptions {
  button?: { label: string; url: string }
  /** Rows of a small table (e.g. a booking's date, places and vehicle), after the paragraphs. */
  details?: [label: string, value: string][]
  /** A code the reader types in somewhere, set apart so it is easy to find and copy. */
  code?: { label: string; value: string }
  /** Paragraphs after the button, in a smaller type. */
  footer?: string[]
}

export function layout(paragraphs: string[], { button, details, code, footer }: LayoutOptions = {}): string {
  const body = paragraphs.map((paragraph) => `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(paragraph)}</p>`).join('')
  const table = details?.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:4px 0 20px;font-size:14px">${details
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #eee;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px 0;border-top:1px solid #eee;vertical-align:top">${escapeHtml(value)}</td></tr>`,
        )
        .join('')}</table>`
    : ''
  const codeBox = code
    ? `<p style="margin:0 0 6px;font-size:13px;color:#666">${escapeHtml(code.label)}</p><p style="margin:0 0 20px;font-family:'Courier New',monospace;font-size:24px;letter-spacing:4px;font-weight:700;background:#f7efdf;border-radius:8px;padding:12px 16px;display:inline-block">${escapeHtml(code.value)}</p>`
    : ''
  const action = button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#080c13;color:#e3cc9f;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${escapeHtml(button.label)}</a></p><p style="margin:0 0 16px;font-size:13px;color:#555;word-break:break-all">${escapeHtml(button.url)}</p>`
    : ''
  const after = (footer ?? []).map((paragraph) => `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#555">${escapeHtml(paragraph)}</p>`).join('')
  return `<!doctype html><html><body style="margin:0;background:#f2eee6;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0c121b;font-size:15px"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;padding:28px"><p style="margin:0 0 20px;font-family:Georgia,serif;font-size:20px;letter-spacing:2px">SIGNATUREMILE</p>${body}${table}${codeBox}${action}${after}</div></body></html>`
}
