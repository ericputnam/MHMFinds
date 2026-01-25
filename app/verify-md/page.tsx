'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownVerification() {
    const testMarkdown = `
# Test Markdown
This is a **bold** statement and this is *italic*.

## Lists
- Item 1
- Item 2
- Item 3

## Tables
| Feature | Supported |
| --- | --- |
| Bold | Yes |
| Lists | Yes |
| Tables | Yes |

[Link to ModVault](https://musthavemods.com)
`;

    return (
        <div className="p-8 bg-mhm-dark min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-8">Markdown Rendering Verification</h1>

            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Rendered Output</h2>
                <div className="prose prose-slate max-w-none text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {testMarkdown}
                    </ReactMarkdown>
                </div>
            </div>

            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4">Raw Markdown</h2>
                <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                    {testMarkdown}
                </pre>
            </div>
        </div>
    );
}
