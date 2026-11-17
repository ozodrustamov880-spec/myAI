import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Code2, FileCode, CheckCircle2 } from 'lucide-react';

interface GetCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  systemInstruction?: string;
  temperature?: number;
}

export const GetCodeModal: React.FC<GetCodeModalProps> = ({
  isOpen,
  onClose,
  model,
  systemInstruction = '',
  temperature = 0.7,
}) => {
  const [activeTab, setActiveTab] = useState<'ts' | 'python' | 'curl' | 'json'>('ts');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonCode = `import os
from google import genai
from google.genai import types

# Initialize client using environment variable GEMINI_API_KEY
client = genai.Client()

response = client.models.generate_content(
    model="${model}",
    contents="Hello Gemini, summarize the future of multimodal AI.",
    config=types.GenerateContentConfig(
        ${systemInstruction ? `system_instruction="${systemInstruction.replace(/"/g, '\\"')}",\n        ` : ''}temperature=${temperature},
    ),
)

print(response.text)
`;

  const tsCode = `import { GoogleGenAI } from "@google/genai";

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function main() {
  const response = await ai.models.generateContent({
    model: "${model}",
    contents: "Hello Gemini, summarize the future of multimodal AI.",
    config: {
      ${systemInstruction ? `systemInstruction: "${systemInstruction.replace(/"/g, '\\"')}",\n      ` : ''}temperature: ${temperature},
    },
  });

  console.log(response.text);
}

main();
`;

  const curlCode = `curl "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=$GEMINI_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -X POST \\
  -d '{
    "contents": [
      {
        "parts": [
          { "text": "Hello Gemini, summarize the future of multimodal AI." }
        ]
      }
    ]${systemInstruction ? `,\n    "systemInstruction": { "parts": [{ "text": "${systemInstruction.replace(/"/g, '\\"')}" }] }` : ''}
  }'
`;

  const jsonPayload = JSON.stringify(
    {
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello Gemini, summarize the future of multimodal AI.' }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    },
    null,
    2
  );

  const getCodeContent = () => {
    switch (activeTab) {
      case 'ts':
        return tsCode;
      case 'python':
        return pythonCode;
      case 'curl':
        return curlCode;
      case 'json':
        return jsonPayload;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="max-w-3xl w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Get Code &amp; API Snippet
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Run this prompt directly in your own backend or workflow
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-variant)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ts')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'ts'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              TypeScript (@google/genai)
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'python'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Python (google-genai)
            </button>
            <button
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'curl'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              cURL (REST)
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'json'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              JSON Payload
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-variant)] hover:bg-blue-500/10 hover:text-blue-500 text-xs font-medium text-[var(--text-secondary)] transition-colors mb-2"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#141518]">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto p-2">
            <code>{getCodeContent()}</code>
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-tertiary)] flex items-center justify-between">
          <span>Target model: <strong className="text-[var(--text-primary)]">{model}</strong></span>
          <span>Requires <code className="bg-[var(--bg-surface-variant)] px-1 py-0.5 rounded">GEMINI_API_KEY</code></span>
        </div>
      </div>
    </div>
  );
};
