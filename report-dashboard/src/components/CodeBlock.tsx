import React, { useState } from "react";

interface CodeBlockProps {
  code: unknown;
  language?: string;
  title?: string;
  maxHeight?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "text",
  title,
  maxHeight = "300px",
}) => {
  const [copied, setCopied] = useState(false);

  const formatCode = (value: unknown): string => {
    if (value === null || value === undefined) {
      return String(value);
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch (error) {
        console.warn("Failed to stringify object for CodeBlock", error);
        return String(value);
      }
    }

    return String(value);
  };

  const formattedCode = formatCode(code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="relative bg-base-200 rounded-lg border border-base-300">
      {/* Header with title and copy button */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-base-300">
        <span className="text-sm font-medium text-base-content/70">
          {title || language}
        </span>
        <button
          onClick={handleCopy}
          className={`btn btn-xs ${
            copied ? "btn-success" : "btn-ghost"
          } transition-all duration-200`}
          title="Copiar código"
        >
          {copied ? (
            <>
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copiado!
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Code content - no horizontal scroll, word wrap instead */}
      <div className="overflow-y-auto bg-base-300" style={{ maxHeight }}>
        <pre className="p-4 text-xs leading-relaxed text-base-content whitespace-pre-wrap break-all">
          <code className={`language-${language}`}>{formattedCode}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
