'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface ModelState {
    answer: string
    done: boolean
    error: string | null
    model: string
}

interface Props {
    data: ModelState | null
    color: 'blue' | 'purple' | 'green'
    onModelChange?: (model: string) => void
    selectedModel?: string
}

const STYLES = {
    blue: {
        card: 'border-blue-100 bg-white',
        badge: 'bg-blue-50 text-blue-600 border border-blue-100',
        accent: 'bg-blue-500',
        playBtn: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200',
        stopBtn: 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200',
        dot: 'bg-blue-400',
        skeleton: 'bg-blue-50',
        label: 'Gemini',
        sublabel: 'Google',
    },
    purple: {
        card: 'border-purple-100 bg-white',
        badge: 'bg-purple-50 text-purple-600 border border-purple-100',
        accent: 'bg-purple-500',
        playBtn: 'bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200',
        stopBtn: 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200',
        dot: 'bg-purple-400',
        skeleton: 'bg-purple-50',
        label: 'Kimi',
        sublabel: 'Moonshot AI',
    },
    green: {
        card: 'border-green-100 bg-white',
        badge: 'bg-green-50 text-green-600 border border-green-100',
        accent: 'bg-green-500',
        playBtn: 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200',
        stopBtn: 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200',
        dot: 'bg-green-400',
        skeleton: 'bg-green-50',
        label: 'OpenAI',
        sublabel: 'GPT-OSS Groq',
    },
}

const GEMINI_MODELS = [
    { label: 'Gemini 2.5 Flash', value: 'gemini' },
    { label: 'Llama 3.1 8b (Groq)', value: 'llama' },
]

export default function ModelCard({ data, color, onModelChange, selectedModel }: Props) {
    const [playing, setPlaying] = useState(false)
    const s = STYLES[color]

    const isLoading = data !== null && !data.done && !data.error && data.answer === ''
    const isStreaming = data !== null && !data.done && data.answer !== ''

    const speak = (text: string) => {
        const plain = text
            .replace(/#{1,6}\s*/g, '')
            .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/`{1,3}.*?`{1,3}/g, '')
            .replace(/\n+/g, ' ')
            .trim()

        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(plain)
        utterance.rate = 1
        utterance.pitch = 1
        const voices = window.speechSynthesis.getVoices()
        const preferred = voices.find(v =>
            v.name.includes('Google') || v.name.includes('Microsoft')
        )
        if (preferred) utterance.voice = preferred
        utterance.onstart = () => setPlaying(true)
        utterance.onend = () => setPlaying(false)
        utterance.onerror = () => setPlaying(false)
        window.speechSynthesis.speak(utterance)
    }

    const stopSpeaking = () => {
        window.speechSynthesis.cancel()
        setPlaying(false)
    }

    useEffect(() => {
        return () => window.speechSynthesis.cancel()
    }, [])

    return (
        <div className={`rounded-2xl border shadow-sm flex flex-col min-h-[280px] overflow-hidden ${s.card}`}>

            {/* Accent top bar */}
            <div className={`h-1 w-full ${s.accent}`} />

            <div className="p-5 flex flex-col gap-4 flex-1">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isStreaming ? 'animate-pulse' : ''} ${s.dot}`} />

                        {/* Gemini card only — show dropdown */}
                        {color === 'blue' && onModelChange ? (
                            <select
                                value={selectedModel}
                                onChange={(e) => onModelChange(e.target.value)}
                                className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 cursor-pointer outline-none"
                            >
                                {GEMINI_MODELS.map(m => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.badge}`}>
                                {s.label}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isStreaming && (
                            <span className="text-xs text-gray-400 animate-pulse">streaming...</span>
                        )}
                        <span className="text-xs text-gray-400">
                            {color === 'blue'
                                ? selectedModel === 'llama' ? 'Groq' : 'Google'
                                : s.sublabel}
                        </span>
                    </div>
                </div>

                {/* Loading skeleton */}
                {isLoading && (
                    <div className="flex flex-col gap-2 flex-1 justify-center">
                        <div className={`h-2.5 rounded-full animate-pulse w-full ${s.skeleton}`} />
                        <div className={`h-2.5 rounded-full animate-pulse w-5/6 ${s.skeleton}`} />
                        <div className={`h-2.5 rounded-full animate-pulse w-4/6 ${s.skeleton}`} />
                        <div className={`h-2.5 rounded-full animate-pulse w-5/6 ${s.skeleton}`} />
                        <div className={`h-2.5 rounded-full animate-pulse w-3/6 ${s.skeleton}`} />
                        <p className="text-xs text-gray-400 mt-3 text-center">Generating answer...</p>
                    </div>
                )}

                {/* Error */}
                {data?.error && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 w-full text-center">
                            <p className="text-red-400 text-xs font-medium">Model unavailable</p>
                            {color === 'blue' && (
                                <p className="text-red-300 text-xs mt-1">
                                    Switch to Llama 3.1 using the dropdown above
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Answer */}
                {data?.answer && (
                    <div className="flex flex-col gap-4 flex-1">
                        <div className="text-gray-600 text-sm leading-relaxed flex-1 prose prose-sm max-w-none
              prose-headings:text-gray-700 prose-headings:font-semibold prose-headings:text-sm
              prose-p:text-gray-600 prose-p:text-sm prose-p:leading-relaxed prose-p:my-1
              prose-ul:my-1 prose-ul:pl-4
              prose-ol:my-1 prose-ol:pl-4
              prose-li:text-gray-600 prose-li:text-sm prose-li:my-0.5
              prose-strong:text-gray-700 prose-strong:font-semibold">
                            <ReactMarkdown>{data.answer}</ReactMarkdown>
                            {isStreaming && (
                                <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                            )}
                        </div>

                        {/* Audio controls — only show when done */}
                        {data.done && (
                            <div className="flex gap-2">
                                {!playing ? (
                                    <button
                                        onClick={() => speak(data.answer)}
                                        className={`flex items-center gap-2 text-xs font-medium rounded-xl px-4 py-2.5 transition-all flex-1 justify-center ${s.playBtn}`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Play audio
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopSpeaking}
                                        className={`flex items-center gap-2 text-xs font-medium rounded-xl px-4 py-2.5 transition-all flex-1 justify-center ${s.stopBtn}`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                            <rect x="6" y="6" width="12" height="12" rx="1" />
                                        </svg>
                                        Stop audio
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {!data && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className={`w-10 h-10 rounded-full ${s.skeleton} flex items-center justify-center mx-auto mb-3`}>
                                <div className={`w-4 h-4 rounded-full ${s.dot} opacity-40`} />
                            </div>
                            <p className="text-gray-400 text-xs">Waiting for question</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}