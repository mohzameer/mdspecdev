const fs = require('fs');
function escape(file) {
  const content = fs.readFileSync(file, 'utf8');
  return content.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$');
}
const vscode = escape('EXT_USERGUIDE.md');
const cli = escape('EXT_CLI.md');

const vscodeTemplate = `import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownContent = \`${vscode}\`;

export default function VSCodeGuidePage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-4xl prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
}`;

const cliTemplate = `import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownContent = \`${cli}\`;

export default function CLIGuidePage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-4xl prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
}`;

fs.writeFileSync('src/app/guide/vscode/page.tsx', vscodeTemplate);
fs.writeFileSync('src/app/guide/cli/page.tsx', cliTemplate);
