import matter from 'gray-matter';

export interface ParsedDocument {
  frontmatter: Record<string, unknown>;
  content: string;
  title: string;
}

export function parseMarkdown(raw: string): ParsedDocument {
  const { data, content } = matter(raw);

  // Extract title from first heading or frontmatter
  let title = (data.id as string) || '';
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    title = headingMatch[1].trim();
  }

  return { frontmatter: data, content: content.trim(), title };
}

export interface ChunkedSection {
  heading: string;
  text: string;
  index: number;
}

export function chunkMarkdown(content: string): ChunkedSection[] {
  const sections: ChunkedSection[] = [];
  const lines = content.split('\n');
  let currentHeading = '';
  let currentLines: string[] = [];
  let index = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (currentLines.length > 0) {
        const text = currentLines.join('\n').trim();
        if (text.length > 0) {
          sections.push({ heading: currentHeading, text, index: index++ });
        }
      }
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Last section
  if (currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    if (text.length > 0) {
      sections.push({ heading: currentHeading, text, index: index++ });
    }
  }

  // If no sections found, treat entire content as one chunk
  if (sections.length === 0 && content.trim().length > 0) {
    sections.push({ heading: '', text: content.trim(), index: 0 });
  }

  return sections;
}
