/**
 * Tiny safe markdown renderer — no dependencies, no dangerouslySetInnerHTML.
 * Supports: headings, bold, italic, inline code, code blocks, bullet &
 * numbered lists, links, paragraphs. HTML is escaped by React's default
 * text handling (we never inject raw strings as HTML).
 */
import React from "react";

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Order: code spans first (protected), then links, bold, italic, inline code.
  const parts: React.ReactNode[] = [];
  const codeSpans: string[] = [];
  let t = text.replace(/`([^`]+)`/g, (_m, c: string) => {
    codeSpans.push(c);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  const re = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const pushText = (s: string) => {
    if (!s) return;
    // restore code spans
    const sub = s.split(/(\d+)/g);
    sub.forEach((chunk, i) => {
      if (i % 2 === 1) {
        parts.push(
          <code
            key={`${keyBase}-c${k++}`}
            className="rounded bg-ink-3 px-1 py-0.5 font-mono text-[0.85em] text-molten-soft"
          >
            {codeSpans[Number(chunk)]}
          </code>
        );
      } else if (chunk) {
        parts.push(<React.Fragment key={`${keyBase}-t${k++}`}>{chunk}</React.Fragment>);
      }
    });
  };

  while ((m = re.exec(t)) !== null) {
    pushText(t.slice(last, m.index));
    if (m[1]) {
      parts.push(
        <a
          key={`${keyBase}-a${k++}`}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-molten underline decoration-molten/40 underline-offset-2 hover:decoration-molten"
        >
          {m[2]}
        </a>
      );
    } else if (m[4]) {
      parts.push(
        <strong key={`${keyBase}-b${k++}`} className="font-semibold text-paper">
          {m[5]}
        </strong>
      );
    } else {
      parts.push(<em key={`${keyBase}-i${k++}`}>{m[6] ?? m[7]}</em>);
    }
    last = m.index + m[0].length;
  }
  pushText(t.slice(last));
  return parts;
}

export function Markdown({ text }: { text: string }): React.ReactElement {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre
          key={`b${k++}`}
          className="my-2 overflow-x-auto rounded-xl border border-line bg-ink-2 p-3 font-mono text-xs leading-relaxed text-paper"
        >
          {buf.join("\n")}
        </pre>
      );
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1
          ? "text-base font-bold"
          : level === 2
            ? "text-sm font-bold"
            : "text-sm font-semibold";
      blocks.push(
        <p key={`b${k++}`} className={`${cls} mt-3 first:mt-0 text-paper`}>
          {renderInline(h[2], `h${k}`)}
        </p>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`b${k++}`} className="my-1.5 space-y-1 pl-4">
          {items.map((it, j) => (
            <li key={j} className="relative text-sm leading-relaxed text-fog">
              <span className="absolute -left-3.5 text-molten" aria-hidden="true">
                •
              </span>
              {renderInline(it, `li${k}-${j}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`b${k++}`} className="my-1.5 space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j} className="list-decimal text-sm leading-relaxed text-fog">
              {renderInline(it, `ol${k}-${j}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    blocks.push(
      <p key={`b${k++}`} className="my-1.5 text-sm leading-relaxed text-fog">
        {renderInline(line, `p${k}`)}
      </p>
    );
    i++;
  }

  return <div className="min-w-0">{blocks}</div>;
}
