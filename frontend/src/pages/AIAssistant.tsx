import { useState } from 'react'
import { Bot, Send, FileText, Sparkles, Lightbulb, Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { api } from '../services/api'

const suggestions = [
  'Explain Dijkstra’s algorithm step-by-step',
  'What is database normalization (1NF to BCNF)?',
  'How does the virtual DOM work in React?',
  'Explain backpropagation in deep learning',
  'What are ACID properties in DBMS?',
]

export default function AIAssistant() {
  const [tab, setTab] = useState<'chat' | 'summarize' | 'quiz' | 'flashcards'>('chat')

  // Chat State
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState('default')
  const [chat, setChat] = useState<{ role: 'ai' | 'user'; content: string }[]>([
    {
      role: 'ai',
      content: "Hello Arjun! I'm your AI Academic Copilot. Ask me any concept doubt, request code explanations, or generate practice quizzes!",
    },
  ])
  const [chatLoading, setChatLoading] = useState(false)

  // Summarize State
  const [summaryInput, setSummaryInput] = useState('')
  const [summaryOutput, setSummaryOutput] = useState('')
  const [summarizeLoading, setSummarizeLoading] = useState(false)

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('Data Structures')
  const [quizDifficulty, setQuizDifficulty] = useState('medium')
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [quizSelectedAnswers, setQuizSelectedAnswers] = useState<Record<number, number>>({})
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  // Flashcards State
  const [flashcardTopic, setFlashcardTopic] = useState('Operating Systems')
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([
    { front: 'What is a Semaphore?', back: 'A synchronization variable used to manage concurrent processes and avoid race conditions.' },
    { front: 'Explain Thrashing', back: 'A state where the CPU spends more time swapping pages in and out than executing instructions.' },
    { front: 'What is Deadlock?', back: 'A situation where a set of processes are blocked because each process is holding a resource and waiting for another.' },
  ])
  const [revealedCards, setRevealedCards] = useState<Record<number, boolean>>({})
  const [flashcardLoading, setFlashcardLoading] = useState(false)

  // Chat Handler
  const handleSend = async (userMsg?: string) => {
    const textToSend = userMsg || message
    if (!textToSend.trim()) return

    setChat((prev) => [...prev, { role: 'user', content: textToSend }])
    if (!userMsg) setMessage('')
    setChatLoading(true)

    try {
      const res = await api.post('/ai/chat', { message: textToSend, mode })
      setChat((prev) => [...prev, { role: 'ai', content: res.data.response }])
    } catch {
      setChat((prev) => [
        ...prev,
        {
          role: 'ai',
          content: 'Sorry, I encountered an error connecting to the AI backend. Please verify your connection.',
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // Summarize Handler
  const handleSummarize = async () => {
    if (!summaryInput.trim()) return
    setSummarizeLoading(true)
    try {
      const res = await api.post('/ai/summarize', { content: summaryInput, max_length: 400 })
      setSummaryOutput(res.data.summary)
    } catch {
      setSummaryOutput('Failed to summarize text. Please try again.')
    } finally {
      setSummarizeLoading(false)
    }
  }

  // Quiz Generator Handler
  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim()) return
    setQuizLoading(true)
    setQuizSubmitted(false)
    setQuizSelectedAnswers({})
    try {
      const res = await api.post('/ai/generate-quiz', {
        topic: quizTopic,
        count: 5,
        difficulty: quizDifficulty,
      })
      setQuizQuestions(res.data.questions || [])
    } catch {
      console.error('Quiz generation failed')
    } finally {
      setQuizLoading(false)
    }
  }

  // Flashcards Handler
  const handleGenerateFlashcards = async () => {
    if (!flashcardTopic.trim()) return
    setFlashcardLoading(true)
    setRevealedCards({})
    try {
      const res = await api.post('/ai/generate-flashcards', {
        topic: flashcardTopic,
        count: 6,
      })
      setFlashcards(res.data.cards || [])
    } catch {
      console.error('Flashcard generation failed')
    } finally {
      setFlashcardLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="text-primary" /> AI Academic Copilot
          </h1>
          <p className="text-dark-muted">Instant concept tutoring, smart summaries, adaptive quizzes & flashcards</p>
        </div>
        <div className="flex gap-1 glass rounded-xl p-1">
          {(['chat', 'summarize', 'quiz', 'flashcards'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dark-muted hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Chat */}
      {tab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-2xl flex flex-col h-[650px] border border-dark-border">
            {/* Mode Selector */}
            <div className="px-6 py-3 border-b border-dark-border flex items-center justify-between text-xs">
              <span className="text-dark-muted">Tutoring Mode:</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'default', label: 'General' },
                  { id: 'exam', label: 'Exam Prep' },
                  { id: 'interview', label: 'Technical Interview' },
                  { id: 'beginner', label: 'Simple' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      mode === m.id ? 'bg-primary/20 text-primary border border-primary/30' : 'text-dark-muted hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chat.map((c, i) => (
                <div key={i} className={`flex gap-3 ${c.role === 'user' ? 'justify-end' : ''}`}>
                  {c.role === 'ai' && (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      c.role === 'user'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-dark-lighter border border-dark-border text-slate-100'
                    }`}
                  >
                    {c.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Bot size={16} className="text-primary" />
                  </div>
                  <div className="bg-dark-lighter border border-dark-border p-4 rounded-2xl flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-xs text-dark-muted">Thinking & formulating answer...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-dark-border">
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1 bg-dark-lighter border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                  placeholder="Ask a technical concept, formula, algorithm or code doubt..."
                />
                <button
                  onClick={() => handleSend()}
                  disabled={chatLoading || !message.trim()}
                  className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Suggestions & Actions */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border border-dark-border">
              <h3 className="font-semibold text-sm mb-3">Popular Doubt Prompts</h3>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="w-full text-left p-3 rounded-xl bg-dark-lighter border border-dark-border hover:border-primary/50 transition-all text-xs text-dark-muted hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-dark-border">
              <h3 className="font-semibold text-sm mb-3">Quick AI Generators</h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => setTab('quiz')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-lighter border border-dark-border hover:border-primary/50 transition-all text-left"
                >
                  <Sparkles size={16} className="text-secondary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Generate Practice Quiz</p>
                    <p className="text-[11px] text-dark-muted">Adaptive MCQs on any subject</p>
                  </div>
                </button>
                <button
                  onClick={() => setTab('flashcards')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-lighter border border-dark-border hover:border-primary/50 transition-all text-left"
                >
                  <Lightbulb size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Create Revision Flashcards</p>
                    <p className="text-[11px] text-dark-muted">Spaced repetition key terms</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Summarize */}
      {tab === 'summarize' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 border border-dark-border flex flex-col justify-between h-[520px]">
            <div>
              <h3 className="font-semibold text-base mb-2">Input Academic Text</h3>
              <p className="text-xs text-dark-muted mb-4">Paste notes, lecture transcripts, textbook paragraphs or paper abstracts</p>
              <textarea
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                placeholder="Paste your study content here (up to 5,000 words)..."
                className="w-full h-80 bg-dark-lighter border border-dark-border rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <button
              onClick={handleSummarize}
              disabled={summarizeLoading || !summaryInput.trim()}
              className="bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4"
            >
              {summarizeLoading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              Generate Structured Summary
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-dark-border flex flex-col justify-between h-[520px]">
            <div>
              <h3 className="font-semibold text-base mb-2">AI-Generated Summary</h3>
              <p className="text-xs text-dark-muted mb-4">Bullet points and key exam takeaways</p>
              <div className="w-full h-96 bg-dark-lighter/50 border border-dark-border rounded-xl p-5 text-sm overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {summaryOutput || <span className="text-dark-muted italic">Generated summary will appear here...</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Quiz */}
      {tab === 'quiz' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="glass rounded-2xl p-6 border border-dark-border">
            <h3 className="font-semibold text-base mb-4">Generate Custom Quiz</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-dark-muted block mb-1">Subject / Topic</label>
                <input
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="e.g. Database Normalization"
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-dark-muted block mb-1">Difficulty</label>
                <select
                  value={quizDifficulty}
                  onChange={(e) => setQuizDifficulty(e.target.value)}
                  className="w-full bg-dark-lighter border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard / Gate Level</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {quizLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Generate 5 Questions
                </button>
              </div>
            </div>
          </div>

          {/* Questions display */}
          {quizQuestions.length > 0 && (
            <div className="space-y-4">
              {quizQuestions.map((q, qIndex) => {
                const isSelected = quizSelectedAnswers[qIndex] !== undefined
                return (
                  <div key={qIndex} className="glass rounded-2xl p-6 border border-dark-border">
                    <p className="font-semibold text-sm mb-3">
                      {qIndex + 1}. {q.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options?.map((opt: string, optIndex: number) => {
                        const selected = quizSelectedAnswers[qIndex] === optIndex
                        let btnStyle = 'bg-dark-lighter border-dark-border hover:border-primary/40'
                        if (quizSubmitted) {
                          if (optIndex === q.correct) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                          else if (selected && optIndex !== q.correct) btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-400'
                        } else if (selected) {
                          btnStyle = 'bg-primary/20 border-primary text-primary font-semibold'
                        }

                        return (
                          <button
                            key={optIndex}
                            disabled={quizSubmitted}
                            onClick={() => setQuizSelectedAnswers({ ...quizSelectedAnswers, [qIndex]: optIndex })}
                            className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {quizSubmitted && optIndex === q.correct && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                            {quizSubmitted && selected && optIndex !== q.correct && <XCircle size={16} className="text-rose-400 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                    {quizSubmitted && q.explanation && (
                      <p className="text-xs text-dark-muted mt-3 pt-3 border-t border-dark-border">
                        <span className="font-semibold text-primary">Explanation:</span> {q.explanation}
                      </p>
                    )}
                  </div>
                )
              })}

              <div className="flex justify-end gap-3 pt-2">
                {!quizSubmitted ? (
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-all"
                  >
                    Submit Quiz & Check Score
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-emerald-400">
                      Score:{' '}
                      {
                        quizQuestions.filter((q, i) => quizSelectedAnswers[i] === q.correct).length
                      }{' '}
                      / {quizQuestions.length}
                    </span>
                    <button
                      onClick={handleGenerateQuiz}
                      className="bg-primary hover:bg-primary/90 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Try Another
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Flashcards */}
      {tab === 'flashcards' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-dark-border flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <label className="text-xs text-dark-muted block mb-1">Subject / Concept for Flashcards</label>
              <input
                value={flashcardTopic}
                onChange={(e) => setFlashcardTopic(e.target.value)}
                placeholder="e.g. Operating Systems"
                className="w-full bg-dark-lighter border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleGenerateFlashcards}
              disabled={flashcardLoading}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all mt-auto"
            >
              {flashcardLoading ? <Loader2 size={16} className="animate-spin" /> : <Lightbulb size={16} />}
              Generate Flashcards
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {flashcards.map((c, i) => {
              const isFlipped = revealedCards[i]
              return (
                <div
                  key={i}
                  onClick={() => setRevealedCards({ ...revealedCards, [i]: !isFlipped })}
                  className={`glass rounded-2xl p-6 min-h-[220px] flex flex-col items-center justify-center text-center cursor-pointer border transition-all duration-300 ${
                    isFlipped ? 'border-primary bg-primary/10' : 'border-dark-border hover:border-primary/50'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wider text-dark-muted mb-2">
                    {isFlipped ? 'Answer / Concept' : 'Question / Term'}
                  </p>
                  <p className="text-base font-semibold px-2">{isFlipped ? c.back : c.front}</p>
                  <span className="text-[11px] text-primary/80 mt-4 font-medium">
                    {isFlipped ? 'Click to show question' : 'Click to reveal answer'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
