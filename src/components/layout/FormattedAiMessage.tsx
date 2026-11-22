import React from "react";

interface FormattedAiMessageProps {
  content: string;
  className?: string;
}

// Safely format inline markdown (bold, italic, code, links) into React nodes without dangerouslySetInnerHTML
function renderInlineContent(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex to match inline patterns: links, bold, italic, code
  const inlineRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+|\/[^\s)]*)\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Markdown link [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      const isExternal = linkUrl.startsWith("http");
      nodes.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="underline font-semibold hover:opacity-80 transition-opacity"
        >
          {linkText}
        </a>
      );
    } else if (match[4] || match[6]) {
      // Bold **text** or __text__
      const boldText = match[5] || match[7];
      nodes.push(
        <strong key={`bold-${match.index}`} className="font-semibold">
          {boldText}
        </strong>
      );
    } else if (match[8]) {
      // Italic *text*
      const italicText = match[9];
      nodes.push(
        <em key={`italic-${match.index}`} className="italic">
          {italicText}
        </em>
      );
    } else if (match[10]) {
      // Inline code `code`
      const codeText = match[11];
      nodes.push(
        <code
          key={`code-${match.index}`}
          className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[11px]"
        >
          {codeText}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

// Clean and normalize table rows into structured readable key-value bullets
function normalizeTablesAndArtifacts(raw: string): string {
  const lines = raw.split("\n");
  const cleaned: string[] = [];
  let tableHeaders: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this is a table separator line e.g. |---|---| or |:---|:---|
    if (/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line)) {
      inTable = true;
      continue; // Skip the separator line
    }

    // Check if this is a table row e.g. | col 1 | col 2 |
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (!inTable && cells.length > 0) {
        // First line of a potential table is header
        tableHeaders = cells;
        continue;
      } else if (inTable && cells.length > 0) {
        // Data row
        if (tableHeaders.length > 0) {
          const parts = cells.map((cell, idx) => {
            const header = tableHeaders[idx] ? `**${tableHeaders[idx]}:** ` : "";
            return `${header}${cell}`;
          });
          cleaned.push(`- ${parts.join(" — ")}`);
        } else {
          cleaned.push(`- ${cells.join(" — ")}`);
        }
        continue;
      }
    } else {
      inTable = false;
      tableHeaders = [];
    }

    // Clean any stray table bar delimiters
    const normalizedLine = line.replace(/\|---+\|/g, "").replace(/^\|\s*|\s*\|$/g, "");
    cleaned.push(normalizedLine);
  }

  return cleaned.join("\n");
}

export const FormattedAiMessage: React.FC<FormattedAiMessageProps> = ({
  content,
  className = "",
}) => {
  const normalized = normalizeTablesAndArtifacts(content);
  const rawParagraphs = normalized.split(/\n\s*\n/);

  return (
    <div className={`space-y-2 leading-relaxed text-sm ${className}`}>
      {rawParagraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);

        // Check if paragraph is a numbered list
        const isNumberedList = lines.every((l) => /^\d+[\.\)]\s+/.test(l));
        if (isNumberedList) {
          return (
            <ol key={pIdx} className="list-decimal list-outside pl-4 space-y-1 my-1">
              {lines.map((l, lIdx) => {
                const textWithoutNumber = l.replace(/^\d+[\.\)]\s+/, "");
                return (
                  <li key={lIdx} className="text-xs sm:text-sm pl-0.5">
                    {renderInlineContent(textWithoutNumber)}
                  </li>
                );
              })}
            </ol>
          );
        }

        // Check if paragraph is a bullet list
        const isBulletList = lines.every((l) => /^[-*•]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={pIdx} className="list-disc list-outside pl-4 space-y-1 my-1">
              {lines.map((l, lIdx) => {
                const textWithoutBullet = l.replace(/^[-*•]\s+/, "");
                return (
                  <li key={lIdx} className="text-xs sm:text-sm pl-0.5">
                    {renderInlineContent(textWithoutBullet)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Check if heading
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={pIdx} className="font-semibold text-xs sm:text-sm text-foreground mt-2 mb-1">
              {renderInlineContent(trimmed.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={pIdx} className="font-serif font-bold text-sm sm:text-base text-foreground mt-2 mb-1">
              {renderInlineContent(trimmed.replace(/^##\s+/, ""))}
            </h3>
          );
        }

        // Regular paragraph with potential soft line breaks
        return (
          <p key={pIdx} className="text-xs sm:text-sm">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInlineContent(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

export default FormattedAiMessage;
