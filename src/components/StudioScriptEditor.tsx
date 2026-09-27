import React, { useState } from 'react';
import {
  FileCode,
  Play,
  Save,
  X,
  Sparkles,
  ChevronDown,
  Check,
  AlertCircle,
  Copy,
  Terminal,
  Trash2
} from 'lucide-react';
import { StudioScript } from '../types/experience';
import { LUA_PRESET_TEMPLATES, ScriptLogMessage } from '../utils/luaScriptEngine';

interface StudioScriptEditorProps {
  script: StudioScript;
  parentName: string;
  onSaveScript: (updatedScript: StudioScript) => void;
  onClose: () => void;
  logs?: ScriptLogMessage[];
  onClearLogs?: () => void;
}

export default function StudioScriptEditor({
  script,
  parentName,
  onSaveScript,
  onClose,
  logs = [],
  onClearLogs,
}: StudioScriptEditorProps) {
  const [code, setCode] = useState(script.code || '');
  const [scriptName, setScriptName] = useState(script.name || 'Script');
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'output'>('editor');

  const handleSave = () => {
    onSaveScript({
      ...script,
      name: scriptName.trim() || 'Script',
      code,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleApplyTemplate = (tmplCode: string) => {
    setCode(tmplCode);
    setTemplateDropdownOpen(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 12) }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#1a1429] border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#120d20] border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-white/20 focus:border-purple-400 focus:outline-none px-1"
                />
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                  .lua
                </span>
              </div>
              <p className="text-[11px] text-white/50 px-1">
                Parent: <span className="text-purple-300 font-semibold">{parentName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Presets Dropdown */}
            <div className="relative">
              <button
                onClick={() => setTemplateDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Script Templates</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {templateDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#1c1530] border border-purple-500/30 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-purple-300 uppercase tracking-wider border-b border-white/10">
                    Quick Lua Presets
                  </div>
                  {LUA_PRESET_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      onClick={() => handleApplyTemplate(tmpl.code)}
                      className="w-full text-left p-2 rounded-lg hover:bg-purple-600/30 transition-colors group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-purple-200">
                        {tmpl.name}
                      </div>
                      <div className="text-[10px] text-white/50 leading-tight mt-0.5">
                        {tmpl.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Copy Lua Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved!' : 'Save Script'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center px-4 bg-[#140e24] border-b border-white/5">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'border-purple-400 text-purple-300 bg-purple-900/20'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Lua Code</span>
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'output'
                ? 'border-purple-400 text-purple-300 bg-purple-900/20'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console Output ({logs.length})</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'editor' ? (
            <div className="flex-1 flex overflow-hidden font-mono text-xs">
              {/* Line Numbers Column */}
              <div className="w-12 py-3 bg-[#110d1c] border-r border-white/5 select-none text-right pr-3 text-white/30 font-mono space-y-0 leading-6">
                {lineNumbers.map((n) => (
                  <div key={n} className="h-6">
                    {n}
                  </div>
                ))}
              </div>

              {/* Code Textarea */}
              <div className="flex-1 relative bg-[#171126] p-3 overflow-auto">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  placeholder="-- Write your Roblox Lua code here&#10;local part = script.Parent&#10;&#10;part.Touched:Connect(function(hit)&#10;    print('Touched!')&#10;end)"
                  className="w-full h-full bg-transparent text-slate-100 focus:outline-none resize-none font-mono text-xs leading-6 selection:bg-purple-600/40"
                  style={{ tabSize: 4 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-[#110d1c] p-4 overflow-hidden font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <span className="text-white/60 font-semibold">Studio Script Output:</span>
                {onClearLogs && (
                  <button
                    onClick={onClearLogs}
                    className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Output</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto space-y-1.5 scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="text-white/30 italic py-6 text-center">
                    No output messages yet. Run playtest to execute scripts.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-1.5 rounded flex items-start gap-2 ${
                        log.type === 'error'
                          ? 'bg-red-950/40 text-red-300 border border-red-500/20'
                          : log.type === 'warn'
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-500/20'
                          : 'text-slate-200'
                      }`}
                    >
                      <span className="text-[10px] text-white/40 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      {log.source && (
                        <span className="text-[10px] px-1 rounded bg-white/10 text-purple-300 font-bold shrink-0">
                          [{log.source}]
                        </span>
                      )}
                      <span className="flex-1 break-words">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="px-4 py-2 bg-[#120d20] border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
          <div className="flex items-center gap-3">
            <span>Lines: {lineCount}</span>
            <span>Language: Lua 5.1 / Luau</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 font-semibold">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
