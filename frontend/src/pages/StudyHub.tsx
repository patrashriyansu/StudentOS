import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Download, FileText, Image as ImageIcon, Layers, Loader2, Plus,
  Search, Sparkles, Trash2, Upload, Wand2, X,
} from 'lucide-react'
import { api } from '../services/api'

type StudyDocument = {
  id: number
  filename: string
  content_type: string
  file_size: number
  extracted_characters: number
  index_status: 'indexed' | 'no_text_found' | 'needs_ocr' | string
  created_at: string
  snippet?: string
}
type StudyNote = { id: number; title: string; content: string; subject?: string; tags?: string[]; updated_at?: string }
type ChapterProgress = { id: number; subject: string; chapter_title: string; status: string; completion_percent: number; notes: string }
type Tab = 'library' | 'notes' | 'practice' | 'revision'

const formatBytes = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export default function StudyHub() {
  const [tab, setTab] = useState<Tab>('library')
  const [documents, setDocuments] = useState<StudyDocument[]>([])
  const [notes, setNotes] = useState<StudyNote[]>([])
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteSubject, setNoteSubject] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('')
  const [practiceKind, setPracticeKind] = useState<'quiz' | 'flashcards'>('quiz')
  const [practiceResult, setPracticeResult] = useState<any>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10)
  const [secondsRemaining, setSecondsRemaining] = useState(600)
  const [chapterProgress, setChapterProgress] = useState<ChapterProgress[]>([])
  const [chapterSubject, setChapterSubject] = useState('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterNotes, setChapterNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [docs, savedNotes, chapters] = await Promise.all([
        api.get('/study/documents'),
        api.get('/academics/notes'),
        api.get('/study/chapters'),
      ])
      setDocuments(Array.isArray(docs.data) ? docs.data : [])
      setNotes(Array.isArray(savedNotes.data) ? savedNotes.data : [])
      setChapterProgress(Array.isArray(chapters.data) ? chapters.data : [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load your study library.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const indexedCount = useMemo(() => documents.filter((doc) => ['indexed', 'partial_indexed'].includes(doc.index_status)).length, [documents])

  useEffect(() => {
    if (!quizStarted || quizSubmitted) return
    const timer = window.setInterval(() => setSecondsRemaining((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [quizStarted, quizSubmitted])

  useEffect(() => {
    if (quizStarted && secondsRemaining === 0) {
      setQuizStarted(false)
      setQuizSubmitted(true)
      setMessage('Time is up. Your practice test has been submitted automatically.')
    }
  }, [quizStarted, secondsRemaining])

  const search = async (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      try {
        const response = await api.get('/study/documents')
        setDocuments(Array.isArray(response.data) ? response.data : [])
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Could not load documents.')
      }
      return
    }
    if (value.trim().length < 2) return
    try {
      const response = await api.get('/study/documents/search', { params: { q: value.trim() } })
      setDocuments(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Document search failed.')
    }
  }

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Each study document must be 10 MB or smaller.')
      event.target.value = ''
      return
    }
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    setError('')
    setMessage('')
    try {
      await api.post('/study/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage(`Added ${file.name} to your private study library.`)
      await load()
      setTab('library')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed. Try a PDF, DOCX or supported image.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const download = async (doc: StudyDocument) => {
    try {
      const response = await api.get(`/study/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: doc.content_type }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = doc.filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not download this document.')
    }
  }

  const remove = async (doc: StudyDocument) => {
    try {
      await api.delete(`/study/documents/${doc.id}`)
      setDocuments((current) => current.filter((item) => item.id !== doc.id))
      setMessage(`Deleted ${doc.filename}.`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not delete this document.')
    }
  }

  const runOcr = async (doc: StudyDocument) => {
    setLoading(true)
    setError('')
    try {
      const response = await api.post(`/study/documents/${doc.id}/ocr`)
      setMessage(response.data.index_message || `Text extraction completed for ${doc.filename}.`)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'PDF/image OCR failed. Check that Gemini is configured.')
    } finally {
      setLoading(false)
    }
  }

  const saveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      setError('A note title and content are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const body = { title: noteTitle.trim(), content: noteContent, subject: noteSubject.trim(), tags: ['study-hub'] }
      if (selectedNote) {
        await api.put(`/academics/notes/${selectedNote.id}`, body)
        setMessage('Note updated.')
      } else {
        await api.post('/academics/notes', body)
        setMessage('Note saved.')
      }
      setSelectedNote(null)
      setNoteTitle('')
      setNoteSubject('')
      setNoteContent('')
      const response = await api.get('/academics/notes')
      setNotes(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save the note.')
    } finally {
      setLoading(false)
    }
  }

  const openNote = async (note: StudyNote) => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/academics/notes/${note.id}`)
      const full = response.data
      setSelectedNote(full)
      setNoteTitle(full.title || '')
      setNoteSubject(full.subject || '')
      setNoteContent(full.content || '')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not open this note.')
    } finally {
      setLoading(false)
    }
  }

  const summarize = async (doc: StudyDocument) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const document = await api.get(`/study/documents/${doc.id}/text`)
      const summary = await api.post('/ai/summarize', {
        content: document.data.text.slice(0, 30000),
        style: 'exam',
        max_length: 650,
      })
      const title = `Exam notes — ${doc.filename}`
      await api.post('/academics/notes', {
        title,
        subject: '',
        content: summary.data.summary,
        tags: ['ai-summary', 'study-hub'],
      })
      setMessage('AI exam summary was saved in your Notes.')
      const savedNotes = await api.get('/academics/notes')
      setNotes(Array.isArray(savedNotes.data) ? savedNotes.data : [])
      setTab('notes')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not summarize this document.')
    } finally {
      setLoading(false)
    }
  }

  const generatePractice = async () => {
    if (!topic.trim()) {
      setError('Enter a subject or topic first.')
      return
    }
    setLoading(true)
    setError('')
    setPracticeResult(null)
    try {
      const response = practiceKind === 'quiz'
        ? await api.post('/ai/generate-quiz', { topic: topic.trim(), count: 5, difficulty: 'medium' })
        : await api.post('/ai/generate-flashcards', { topic: topic.trim(), count: 8 })
      setPracticeResult({ ...response.data, kind: practiceKind })
      setQuizStarted(false)
      setQuizSubmitted(false)
      setQuizAnswers({})
      setSecondsRemaining(timeLimitMinutes * 60)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'AI practice generation failed. Check Gemini configuration.')
    } finally {
      setLoading(false)
    }
  }


  const saveChapter = async () => {
    if (!chapterSubject.trim() || !chapterTitle.trim()) {
      setError('Enter both a subject and a chapter name.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/study/chapters', {
        subject: chapterSubject.trim(),
        chapter_title: chapterTitle.trim(),
        status: 'not_started',
        completion_percent: 0,
        notes: chapterNotes.trim(),
      })
      setChapterTitle('')
      setChapterNotes('')
      const response = await api.get('/study/chapters')
      setChapterProgress(Array.isArray(response.data) ? response.data : [])
      setMessage('Chapter added to your revision tracker.')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save chapter progress.')
    } finally {
      setLoading(false)
    }
  }

  const updateChapter = async (item: ChapterProgress, values: Partial<ChapterProgress>) => {
    try {
      const response = await api.patch('/study/chapters/' + item.id, values)
      setChapterProgress((current) => current.map((chapter) => chapter.id === item.id ? response.data : chapter))
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not update this chapter.')
    }
  }

  const deleteChapter = async (item: ChapterProgress) => {
    try {
      await api.delete('/study/chapters/' + item.id)
      setChapterProgress((current) => current.filter((chapter) => chapter.id !== item.id))
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not delete this chapter.')
    }
  }

  const startTimedQuiz = () => {
    setQuizAnswers({})
    setQuizSubmitted(false)
    setSecondsRemaining(timeLimitMinutes * 60)
    setQuizStarted(true)
  }

  const submitTimedQuiz = () => {
    setQuizStarted(false)
    setQuizSubmitted(true)
  }

  const quizScore = practiceResult?.kind === 'quiz'
    ? practiceResult.questions.reduce((score: number, question: any, index: number) => score + (quizAnswers[index] === question.correct ? 1 : 0), 0)
    : 0

  const savePractice = async () => {
    if (!practiceResult) return
    if (practiceResult.kind === 'quiz' && !quizSubmitted) {
      setError('Submit your timed test before saving its result.')
      return
    }
    const text = practiceResult.kind === 'quiz'
      ? practiceResult.questions.map((item: any, index: number) => `${index + 1}. ${item.question}\n${item.options.map((option: string, i: number) => ` ${String.fromCharCode(65 + i)}. ${option}`).join('\n')}\nAnswer: ${item.options[item.correct]}\nExplanation: ${item.explanation || ''}`).join('\n\n')
      : practiceResult.cards.map((card: any, index: number) => `${index + 1}. ${card.front}\nAnswer: ${card.back}`).join('\n\n')
    setLoading(true)
    try {
      await api.post('/academics/notes', {
        title: `${practiceResult.kind === 'quiz' ? 'Practice Quiz' : 'Flashcards'} — ${practiceResult.topic}`,
        subject: practiceResult.topic,
        content: text,
        tags: ['ai-practice', practiceResult.kind],
      })
      const response = await api.get('/academics/notes')
      setNotes(Array.isArray(response.data) ? response.data : [])
      setMessage('Practice set saved in your Notes.')
      setTab('notes')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save this practice set.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Learn · Organise · Revise</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold"><BookOpen className="text-primary"/> Study Hub</h1>
          <p className="mt-1 text-sm text-dark-muted">Your private library, subject notes and AI-powered revision workspace.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          {uploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
          {uploading ? 'Uploading…' : 'Upload study material'}
          <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={upload} disabled={uploading} className="hidden"/>
        </label>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl border border-dark-border p-4"><p className="text-xs text-dark-muted">Saved documents</p><p className="mt-1 text-2xl font-bold">{documents.length}</p></div>
        <div className="glass rounded-2xl border border-dark-border p-4"><p className="text-xs text-dark-muted">Searchable materials</p><p className="mt-1 text-2xl font-bold">{indexedCount}</p></div>
        <div className="glass rounded-2xl border border-dark-border p-4"><p className="text-xs text-dark-muted">Saved notes</p><p className="mt-1 text-2xl font-bold">{notes.length}</p></div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div>}

      <div className="flex flex-wrap gap-2 border-b border-dark-border pb-3">
        {([
          ['library', 'Document library'],
          ['notes', 'My notes'],
          ['practice', 'Timed practice'],
          ['revision', 'Chapter tracker'],
        ] as Array<[Tab, string]>).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === value ? 'bg-primary text-white' : 'bg-dark-lighter text-dark-muted hover:text-white'}`}>{label}</button>
        ))}
      </div>

      {tab === 'library' && (
        <section className="space-y-4">
          <div className="relative max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"/>
            <input value={query} onChange={(event) => void search(event.target.value)} placeholder="Search inside your uploaded documents…" className="w-full rounded-xl border border-dark-border bg-dark-lighter py-3 pl-10 pr-4 text-sm text-white"/>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {documents.map((doc) => (
              <article key={doc.id} className="glass space-y-3 rounded-2xl border border-dark-border p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">{doc.content_type.startsWith('image/') ? <ImageIcon size={20}/> : <FileText size={20}/>}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold">{doc.filename}</h3>
                    <p className="mt-1 text-xs text-dark-muted">{formatBytes(doc.file_size)} · {doc.extracted_characters.toLocaleString()} searchable characters</p>
                    <p className="mt-2 text-xs">{doc.index_status === 'indexed' ? <span className="text-emerald-400">Text indexed</span> : doc.index_status === 'partial_indexed' ? <span className="text-amber-300">Partially OCR-indexed · first 20 PDF pages</span> : doc.index_status === 'needs_ocr' ? <span className="text-amber-300">OCR required · scanned PDF/image</span> : <span className="text-amber-300">No selectable text found</span>}</p>
                  </div>
                </div>
                {doc.snippet && <p className="rounded-lg bg-dark-lighter p-3 text-xs leading-relaxed text-dark-muted">{doc.snippet}</p>}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void download(doc)} className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-2 text-xs"><Download size={13}/>Download</button>
                  {doc.index_status === 'needs_ocr' && <button onClick={() => void runOcr(doc)} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-2 text-xs text-primary"><Sparkles size={13}/>Run OCR</button>}
                  {['indexed', 'partial_indexed'].includes(doc.index_status) && <button onClick={() => void summarize(doc)} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-2 text-xs text-primary"><Wand2 size={13}/>Create exam notes</button>}
                  <button onClick={() => void remove(doc)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300"><Trash2 size={13}/>Delete</button>
                </div>
              </article>
            ))}
          </div>
          {!loading && documents.length === 0 && <div className="rounded-2xl border border-dashed border-dark-border p-10 text-center"><FileText size={30} className="mx-auto text-dark-muted"/><h3 className="mt-3 font-semibold">Your library is empty</h3><p className="mt-1 text-sm text-dark-muted">Upload PDFs, DOCX files, lecture images or handwritten notes to get started.</p></div>}
        </section>
      )}

      {tab === 'notes' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <section className="glass space-y-3 rounded-2xl border border-dark-border p-4">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Your notes</h2><button onClick={() => {setSelectedNote(null);setNoteTitle('');setNoteSubject('');setNoteContent('')}} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-white"><Plus size={13}/>New note</button></div>
            {notes.map((note) => <button key={note.id} onClick={() => void openNote(note)} className={`block w-full rounded-xl border p-3 text-left ${selectedNote?.id === note.id ? 'border-primary bg-primary/10' : 'border-dark-border hover:bg-dark-lighter'}`}><p className="font-medium">{note.title}</p><p className="mt-1 line-clamp-2 text-xs text-dark-muted">{note.content}</p></button>)}
            {notes.length === 0 && <p className="py-8 text-center text-sm text-dark-muted">Saved notes and AI summaries will appear here.</p>}
          </section>
          <section className="glass space-y-3 rounded-2xl border border-dark-border p-4">
            <div className="flex items-center justify-between"><h2 className="font-semibold">{selectedNote ? 'Edit note' : 'Create a note'}</h2>{selectedNote && <button onClick={() => {setSelectedNote(null);setNoteTitle('');setNoteSubject('');setNoteContent('')}} aria-label="Close note editor"><X size={17}/></button>}</div>
            <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Note title" className="w-full rounded-xl border border-dark-border bg-dark-lighter px-3 py-2.5 text-sm text-white"/>
            <input value={noteSubject} onChange={(event) => setNoteSubject(event.target.value)} placeholder="Subject (optional)" className="w-full rounded-xl border border-dark-border bg-dark-lighter px-3 py-2.5 text-sm text-white"/>
            <textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} rows={15} placeholder="Write your notes here…" className="w-full resize-y rounded-xl border border-dark-border bg-dark-lighter px-3 py-3 text-sm text-white"/>
            <button onClick={() => void saveNote()} disabled={loading} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Saving…' : 'Save note'}</button>
          </section>
        </div>
      )}


      {tab === 'revision' && (
        <section className="space-y-4">
          <div className="glass space-y-3 rounded-2xl border border-dark-border p-5">
            <h2 className="text-lg font-semibold">Build your chapter revision tracker</h2>
            <p className="text-sm text-dark-muted">Track what you have completed for each subject. Your progress is private to your account.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={chapterSubject} onChange={(event) => setChapterSubject(event.target.value)} placeholder="Subject, e.g. Data Structures" className="rounded-xl border border-dark-border bg-dark-lighter px-3 py-2.5 text-sm text-white"/>
              <input value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} placeholder="Chapter, e.g. Trees" className="rounded-xl border border-dark-border bg-dark-lighter px-3 py-2.5 text-sm text-white"/>
            </div>
            <textarea value={chapterNotes} onChange={(event) => setChapterNotes(event.target.value)} rows={2} placeholder="Optional revision note or weak topic" className="w-full rounded-xl border border-dark-border bg-dark-lighter px-3 py-2.5 text-sm text-white"/>
            <button onClick={() => void saveChapter()} disabled={loading} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Add chapter</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {chapterProgress.map((chapter) => <article key={chapter.id} className="glass space-y-3 rounded-2xl border border-dark-border p-4">
              <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-primary">{chapter.subject}</p><h3 className="font-semibold">{chapter.chapter_title}</h3></div><button onClick={() => void deleteChapter(chapter)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10" aria-label="Delete chapter"><Trash2 size={15}/></button></div>
              <div className="flex items-center justify-between text-xs text-dark-muted"><span className="capitalize">{chapter.status.replace('_', ' ')}</span><span>{chapter.completion_percent}% complete</span></div>
              <input aria-label="Chapter completion" type="range" min={0} max={100} step={5} value={chapter.completion_percent} onChange={(event) => setChapterProgress((current) => current.map((item) => item.id === chapter.id ? { ...item, completion_percent: Number(event.target.value) } : item))} onMouseUp={(event) => void updateChapter(chapter, { completion_percent: Number((event.target as HTMLInputElement).value), status: Number((event.target as HTMLInputElement).value) === 100 ? 'completed' : 'in_progress' })} onTouchEnd={(event) => void updateChapter(chapter, { completion_percent: Number((event.target as HTMLInputElement).value), status: Number((event.target as HTMLInputElement).value) === 100 ? 'completed' : 'in_progress' })} className="w-full accent-primary"/>
              <select value={chapter.status} onChange={(event) => void updateChapter(chapter, { status: event.target.value, completion_percent: event.target.value === 'completed' ? 100 : chapter.completion_percent })} className="w-full rounded-lg border border-dark-border bg-dark-lighter px-3 py-2 text-xs text-white">
                <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="needs_revision">Needs revision</option><option value="completed">Completed</option>
              </select>
              {chapter.notes && <p className="text-xs text-dark-muted">{chapter.notes}</p>}
            </article>)}
          </div>
          {chapterProgress.length === 0 && <p className="rounded-xl border border-dashed border-dark-border p-8 text-center text-sm text-dark-muted">No chapters yet. Add your subjects and chapters to start tracking your revision.</p>}
        </section>
      )}
\n      {tab === 'practice' && (
        <section className="glass max-w-4xl space-y-4 rounded-2xl border border-dark-border p-5">
          <div className="flex items-center gap-2"><Layers className="text-primary"/><h2 className="text-lg font-semibold">Generate revision practice</h2></div>
          <p className="text-sm text-dark-muted">Create practice questions or active-recall cards from a topic. AI-generated material is saved only when you choose Save to notes.</p>
          <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Operating Systems — Process Synchronization" className="w-full rounded-xl border border-dark-border bg-dark-lighter px-3 py-3 text-sm text-white"/>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPracticeKind('quiz')} className={`rounded-xl px-4 py-2 text-sm ${practiceKind === 'quiz' ? 'bg-primary text-white' : 'bg-dark-lighter text-dark-muted'}`}>5-question quiz</button>
            <button onClick={() => setPracticeKind('flashcards')} className={`rounded-xl px-4 py-2 text-sm ${practiceKind === 'flashcards' ? 'bg-primary text-white' : 'bg-dark-lighter text-dark-muted'}`}>8 flashcards</button>
            <button onClick={() => void generatePractice()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 size={15} className="animate-spin"/> : <Sparkles size={15}/>}Generate</button>
          </div>
          {practiceResult && <div className="space-y-4 border-t border-dark-border pt-4">
            {practiceResult.kind === 'quiz' ? <>
              {!quizStarted && !quizSubmitted && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-dark-lighter p-3">
                <label className="text-sm text-dark-muted">Time limit</label>
                <select value={timeLimitMinutes} onChange={(event) => setTimeLimitMinutes(Number(event.target.value))} className="rounded-lg border border-dark-border bg-dark px-3 py-2 text-sm text-white">
                  <option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option>
                </select>
                <button onClick={startTimedQuiz} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Start timed test</button>
              </div>}
              {quizStarted && <div className="sticky top-2 z-10 flex items-center justify-between rounded-xl border border-primary/30 bg-dark-lighter p-3">
                <span className="text-sm font-semibold">Timed test in progress</span>
                <span className="font-mono text-lg font-bold tabular-nums">{Math.floor(secondsRemaining / 60).toString().padStart(2, '0')}:{(secondsRemaining % 60).toString().padStart(2, '0')}</span>
                <button onClick={submitTimedQuiz} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Submit test</button>
              </div>}
              {quizSubmitted && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="font-semibold">Your result: {quizScore}/{practiceResult.questions.length}</p>
                <p className="mt-1 text-xs text-dark-muted">Correct answers are shown below. Save this attempt to your notes to keep a revision record.</p>
              </div>}
              {practiceResult.questions.map((item: any, index: number) => <article key={index} className="space-y-3 rounded-xl border border-dark-border p-4">
                <p className="font-semibold">{index + 1}. {item.question}</p>
                <div className="grid gap-2">
                  {item.options.map((option: string, i: number) => <button
                    key={i}
                    type="button"
                    disabled={!quizStarted || quizSubmitted}
                    aria-pressed={quizAnswers[index] === i}
                    onClick={() => setQuizAnswers((current) => ({ ...current, [index]: i }))}
                    className={`rounded-lg border p-3 text-left text-sm ${quizAnswers[index] === i ? 'border-primary bg-primary/10 text-white' : 'border-dark-border text-dark-muted'} ${!quizStarted || quizSubmitted ? 'cursor-default' : 'hover:border-primary/60'} `}
                  >{String.fromCharCode(65 + i)}. {option}</button>)}
                </div>
                {quizSubmitted && <div className="rounded-lg bg-dark-lighter p-3 text-sm">
                  <p className={quizAnswers[index] === item.correct ? 'text-emerald-300' : 'text-amber-300'}>{quizAnswers[index] === item.correct ? 'Correct' : 'Incorrect or unanswered'} · Answer: {item.options[item.correct]}</p>
                  {item.explanation && <p className="mt-1 text-xs text-dark-muted">{item.explanation}</p>}
                </div>}
              </article>)}
              {quizSubmitted && <button onClick={() => void savePractice()} disabled={loading} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Save test result to notes</button>}
            </> : <>
              {practiceResult.cards.map((card: any, index: number) => <article key={index} className="rounded-xl border border-dark-border p-4"><p className="font-semibold">{index+1}. {card.front}</p><p className="mt-2 text-sm text-dark-muted">{card.back}</p></article>)}
              <button onClick={() => void savePractice()} disabled={loading} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Save flashcards to notes</button>
            </>}
          </div>}
        </section>
      )}
    </div>
  )
}
