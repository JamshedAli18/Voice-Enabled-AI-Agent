'use client'

import { useState } from 'react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import RecordButton from '@/components/RecordButton'
import ModelCard from '@/components/ModelCard'
import TranscriptBox from '@/components/TranscriptBox'

const API = process.env.NEXT_PUBLIC_API_URL

interface ModelState {
  answer: string
  done: boolean
  error: string | null
  model: string
}

const initialModel = (model: string): ModelState => ({
  answer: '',
  done: false,
  error: null,
  model,
})

export default function Home() {
  const { recording, startRecording, stopRecording } = useVoiceRecorder()
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gemini, setGemini] = useState<ModelState | null>(null)
  const [kimi, setKimi] = useState<ModelState | null>(null)
  const [deepseek, setDeepseek] = useState<ModelState | null>(null)
  const [geminiModel, setGeminiModel] = useState<'gemini' | 'llama'>('gemini')

  const setModel = (model: string, updater: (prev: ModelState) => ModelState) => {
    if (model === 'gemini') setGemini(prev => updater(prev ?? initialModel('gemini')))
    if (model === 'kimi') setKimi(prev => updater(prev ?? initialModel('kimi')))
    if (model === 'openai') setDeepseek(prev => updater(prev ?? initialModel('openai')))
  }

  const handleStop = async () => {
    const audioBlob = await stopRecording()
    setLoading(true)
    setError('')
    setGemini(null)
    setKimi(null)
    setDeepseek(null)
    setTranscript('')

    try {
      // Step 1 — Transcribe
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      const transcribeRes = await fetch(`${API}/transcribe`, {
        method: 'POST',
        body: formData,
      })
      if (!transcribeRes.ok) throw new Error('Transcription failed')
      const { text } = await transcribeRes.json()
      setTranscript(text)

      if (!text.trim()) {
        setError('No speech detected. Please try again.')
        setLoading(false)
        return
      }

      // Initialize all 3 cards
      setGemini(initialModel('gemini'))
      setKimi(initialModel('kimi'))
      setDeepseek(initialModel('openai'))
      setLoading(false)

      // Step 2 — Stream query
      const queryRes = await fetch(`${API}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          gemini_model: geminiModel,  // send selected model
        }),
      })

      if (!queryRes.ok) throw new Error('Query failed')
      if (!queryRes.body) throw new Error('No response body')

      const reader = queryRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            const { model, token, done: isDone, full_answer, error: modelError } = event

            if (modelError) {
              setModel(model, prev => ({ ...prev, error: modelError, done: true }))
            } else if (isDone && full_answer) {
              setModel(model, prev => ({ ...prev, answer: full_answer, done: true }))
            } else if (token) {
              setModel(model, prev => ({ ...prev, answer: prev.answer + token }))
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const hasResults = gemini || kimi || deepseek

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">Sun Marke Assistant</h1>
              <p className="text-xs text-gray-400">Voice-enabled AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-xs text-gray-400">3 models active</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Ask anything about Sun Marke School
          </h2>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Press the microphone, speak your question, and get answers from
            Gemini, Kimi, and DeepSeek simultaneously
          </p>
        </div>

        {/* Record button */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-12 py-8">
            <RecordButton
              recording={recording}
              loading={loading}
              onStart={startRecording}
              onStop={handleStop}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="max-w-2xl mx-auto mb-8">
            <TranscriptBox transcript={transcript} />
          </div>
        )}

        {/* Model cards */}
        {hasResults && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                AI Responses
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ModelCard
                data={gemini}
                color="blue"
                selectedModel={geminiModel}
                onModelChange={(val) => setGeminiModel(val as 'gemini' | 'llama')}
              />
              <ModelCard data={kimi} color="purple" />
              <ModelCard data={deepseek} color="green" />
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-xs text-gray-300">
            Powered by RAG · PGVector · Gemini · Kimi · DeepSeek
          </p>
        </div>
      </div>
    </main>
  )
}