import React, { useEffect, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PRESETS = [
  {
    id: "blog-intro",
    title: "Blog intro",
    prompt:
      "Write an engaging 3-paragraph introduction about the mental health benefits of daily walks. Keep it friendly and informative.",
  },
  {
    id: "tweet",
    title: "Tweet (280 chars)",
    prompt:
      "Share a short, punchy tweet about a new open-source project that helps developers automate boring tasks.",
  },
  {
    id: "email",
    title: "Professional Email",
    prompt:
      "Write a concise professional email applying for a front-end developer internship, mentioning a GitHub portfolio and eagerness to learn.",
  },
  {
    id: "product",
    title: "Product Description",
    prompt:
      "Write a short product description for a compact, eco-friendly reusable notebook. Highlight features and a call-to-action.",
  },
];

const TONES = ["Friendly", "Professional", "Casual", "Persuasive"];

const uid = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

export default function ChatContentGenerator() {
  const [messages, setMessages] = useLocalStorage("ccg:messages:v1", []);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const listRef = useRef(null);

  // ✅ Initialize Gemini API
  const genAI = new GoogleGenerativeAI("AIzaSyBLqv_ngEOqpg4ZudZ0WF3c-3vd_EotuR8");

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role, text) => {
    setMessages((m) => [
      ...m,
      { id: uid(role), role, text, createdAt: Date.now() },
    ]);
  };

  const handleSend = async (fromPreset) => {
    const userPrompt = fromPreset ? fromPreset.prompt : prompt.trim();
    if (!userPrompt) return;

    addMessage("user", userPrompt);
    setPrompt("");
    setIsGenerating(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // ✅ Include tone and length in the prompt
      const fullPrompt = `${userPrompt}\n\nTone: ${tone}\nLength: ${length}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      console.log(text);
      

      addMessage("assistant", text);
    } catch (err) {
      console.error(err);
      addMessage("assistant", "⚠️ Error: Failed to generate content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePresetClick = (p) => {
    setSelectedPreset(p.id);
    handleSend(p);
  };

  const clearHistory = () => {
    if (window.confirm("Clear all conversation history?")) setMessages([]);
  };

  const downloadTxt = () => {
    const content = messages
      .map(
        (m) =>
          `${m.role.toUpperCase()} - ${new Date(
            m.createdAt
          ).toLocaleString()}\n${m.text}\n\n`
      )
      .join("");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content_${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    const full = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(full);
      alert("Copied conversation to clipboard ✅");
    } catch {
      alert("⚠️ Copy failed — please select and copy manually.");
    }
  };

  const handleKeyDownPrompt = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-65 fixed left-0 top-0 h-full bg-white/90 p-4 shadow-lg overflow-y-auto z-10">
        <h3 className="text-lg font-semibold mb-2">Presets</h3>
        <div className="flex flex-col gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetClick(p)}
              className={`text-left p-2 rounded-xl transition focus:outline-none ${
                selectedPreset === p.id
                  ? "bg-indigo-100"
                  : "bg-gray-50 hover:bg-indigo-50"
              }`}
            >
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-slate-500 truncate">{p.prompt}</div>
            </button>
          ))}
        </div>

        <hr className="my-3" />

        <label className="block text-sm font-medium">Tone</label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full mt-1 p-2 rounded-lg"
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mt-3">Length</label>
        <div className="mt-1 flex gap-2">
          {["short", "medium", "long"].map((l) => (
            <button
              key={l}
              onClick={() => setLength(l)}
              className={`px-3 py-1 rounded-full ${
                length === l ? "bg-indigo-600 text-white" : "bg-gray-100"
              }`}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button onClick={downloadTxt} className="p-2 rounded-lg bg-slate-100">
            Download TXT
          </button>
          <button onClick={copyAll} className="p-2 rounded-lg bg-slate-100">
            Copy Conversation
          </button>
          <button onClick={clearHistory} className="p-2 rounded-lg bg-rose-100">
            Clear
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Tip: Press <kbd className="border rounded px-1">Ctrl</kbd>+
          <kbd className="border rounded px-1">Enter</kbd> to send.
        </p>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 ml-0 md:ml-64 flex flex-col h-screen">
        <header className="p-4 bg-white/80 shadow-md flex items-center justify-between">
          <h2 className="text-xl font-semibold">Content Generator</h2>
          <div className="text-sm text-slate-500">Powered by Gemini API 🚀</div>
        </header>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-auto p-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              No messages yet. Try a preset or type a prompt.
            </div>
          ) : (
            messages.map((m) => (
              <article
                key={m.id}
                className={`mb-4 p-3 rounded-xl shadow-sm ${
                  m.role === "user"
                    ? "bg-white text-slate-800"
                    : "bg-indigo-50 text-slate-900"
                }`}
              >
                <div className="text-xs text-slate-400 mb-1">
                  {m.role.toUpperCase()} •{" "}
                  {new Date(m.createdAt).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </article>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="p-4 bg-white/90 border-t shadow-lg sticky bottom-0">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDownPrompt}
            placeholder="Enter a prompt..."
            className="w-full p-3 rounded-xl resize-y min-h-[84px] border"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleSend()}
                disabled={isGenerating}
                className="px-4 py-2 rounded-2xl bg-indigo-600 text-white disabled:opacity-60"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </button>
              <button
                onClick={() => setPrompt("")}
                className="px-4 py-2 rounded-2xl bg-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="text-sm text-slate-500">
              Characters: {prompt.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
