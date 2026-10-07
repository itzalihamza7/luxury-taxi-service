import type { Question, TextSection } from './types'

/*
 * The console edits lists and long texts as plain text, which is quicker than a
 * form field per paragraph. These functions turn that text into the stored
 * shape and back.
 */

const clean = (line: string) => line.replace(/\s+/g, ' ').trim()

/** One item per line. */
export const linesToText = (items: string[]) => items.join('\n')
export const textToLines = (text: string) => text.split('\n').map(clean).filter(Boolean)

/** Paragraphs separated by an empty line. */
export const paragraphsToText = (paragraphs: string[]) => paragraphs.join('\n\n')
export const textToParagraphs = (text: string) => text.split(/\n\s*\n/).map(clean).filter(Boolean)

/**
 * Sections of text:
 *
 *     An opening paragraph.
 *
 *     ## A heading
 *     A paragraph under it.
 *     - a bullet point
 *     - another
 */
export function sectionsToText(sections: TextSection[]): string {
  return sections
    .map((section) => [section.heading ? `## ${section.heading}` : null, section.paragraphs.join('\n\n') || null, section.list?.map((item) => `- ${item}`).join('\n') ?? null].filter((part) => part !== null).join('\n'))
    .join('\n\n')
}

export function textToSections(text: string): TextSection[] {
  const sections: TextSection[] = []
  let current: TextSection | null = null
  let paragraph: string[] = []

  const endParagraph = () => {
    if (paragraph.length === 0) return
    current ??= { paragraphs: [] }
    current.paragraphs.push(clean(paragraph.join(' ')))
    paragraph = []
  }
  const endSection = () => {
    endParagraph()
    if (current && (current.heading || current.paragraphs.length > 0 || current.list)) sections.push(current)
    current = null
  }

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      endSection()
      current = { heading: clean(line.slice(3)), paragraphs: [] }
    } else if (/^[-•*]\s+/.test(line)) {
      endParagraph()
      current ??= { paragraphs: [] }
      current.list = [...(current.list ?? []), clean(line.replace(/^[-•*]\s+/, ''))]
    } else if (line === '') {
      endParagraph()
    } else {
      paragraph.push(line)
    }
  }
  endSection()
  return sections
}

/** Questions: `## The question` followed by its answer on the lines below. */
export const questionsToText = (questions: Question[]) => questions.map((item) => `## ${item.question}\n${item.answer}`).join('\n\n')

export function textToQuestions(text: string): Question[] {
  return textToSections(text)
    .filter((section) => section.heading)
    .map((section) => ({ question: section.heading ?? '', answer: [...section.paragraphs, ...(section.list ?? [])].join(' ') }))
    .filter((item) => item.answer)
}
