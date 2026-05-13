import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function CodeBlock({ className, children, inline }) {
  const codeText = String(children || '').replace(/\n$/, '');

  if (inline) {
    return <code className="inline-code">{codeText}</code>;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codeText);
    } catch (_error) {
      // Clipboard access can fail silently on older browsers.
    }
  }

  return (
    <div className="code-block">
      <button className="copy-button" type="button" onClick={handleCopy}>
        Copy
      </button>
      <pre className={className}>
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

export function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
