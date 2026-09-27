import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../services/api'

// ── Thunks ─────────────────────────────────────────────────────────────────────
export const fetchSubjects = createAsyncThunk('academics/fetchSubjects', async () => {
  const res = await api.get('/academics/subjects')
  return res.data
})
export const fetchTimetable = createAsyncThunk('academics/fetchTimetable', async () => {
  const res = await api.get('/academics/timetable')
  return res.data
})
export const fetchAssignments = createAsyncThunk('academics/fetchAssignments', async () => {
  const res = await api.get('/academics/assignments')
  return res.data
})
export const fetchExams = createAsyncThunk('academics/fetchExams', async () => {
  const res = await api.get('/academics/exams')
  return res.data
})
export const fetchNotes = createAsyncThunk('academics/fetchNotes', async () => {
  const res = await api.get('/academics/notes')
  return res.data
})
export const fetchGrades = createAsyncThunk('academics/fetchGrades', async (semester?: number) => {
  const url = semester ? `/academics/grades/${semester}` : '/academics/grades'
  const res = await api.get(url)
  return res.data
})
export const fetchCGPA = createAsyncThunk('academics/fetchCGPA', async () => {
  const res = await api.get('/academics/cgpa')
  return res.data
})
export const createSubject = createAsyncThunk('academics/createSubject', async (data: any) => {
  const res = await api.post('/academics/subjects', data)
  return res.data
})
export const markAttendance = createAsyncThunk('academics/markAttendance', async (data: { subject_id: number; status: string; date?: string }) => {
  const res = await api.post('/academics/attendance', data)
  return res.data
})
export const createAssignment = createAsyncThunk('academics/createAssignment', async (data: any) => {
  const res = await api.post('/academics/assignments', data)
  return res.data
})
export const updateAssignment = createAsyncThunk('academics/updateAssignment', async ({ id, data }: { id: number; data: any }) => {
  const res = await api.put(`/academics/assignments/${id}`, data)
  return res.data
})
export const createExam = createAsyncThunk('academics/createExam', async (data: any) => {
  const res = await api.post('/academics/exams', data)
  return res.data
})
export const createNote = createAsyncThunk('academics/createNote', async (data: any) => {
  const res = await api.post('/academics/notes', data)
  return res.data
})

// ── Slice ───────────────────────────────────────────────────────────────────────
interface AcademicsState {
  subjects: any[]
  timetable: any[]
  assignments: any[]
  exams: any[]
  notes: any[]
  grades: any[]
  cgpa: any
  loading: boolean
  error: string | null
}

const initialState: AcademicsState = {
  subjects: [], timetable: [], assignments: [], exams: [], notes: [], grades: [], cgpa: null,
  loading: false, error: null,
}

const academicsSlice = createSlice({
  name: 'academics',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    const loading = (state: AcademicsState) => { state.loading = true; state.error = null }
    const failed = (state: AcademicsState, action: any) => { state.loading = false; state.error = action.error.message || 'Error' }
    builder
      .addCase(fetchSubjects.pending, loading)
      .addCase(fetchSubjects.fulfilled, (state, action) => { state.loading = false; state.subjects = action.payload })
      .addCase(fetchSubjects.rejected, failed)
      .addCase(fetchTimetable.fulfilled, (state, action) => { state.timetable = action.payload })
      .addCase(fetchAssignments.fulfilled, (state, action) => { state.assignments = action.payload })
      .addCase(fetchExams.fulfilled, (state, action) => { state.exams = action.payload })
      .addCase(fetchNotes.fulfilled, (state, action) => { state.notes = action.payload })
      .addCase(fetchGrades.fulfilled, (state, action) => { state.grades = action.payload })
      .addCase(fetchCGPA.fulfilled, (state, action) => { state.cgpa = action.payload })
      .addCase(createSubject.fulfilled, (state, action) => { state.subjects.push(action.payload) })
      .addCase(createAssignment.fulfilled, (state, action) => { state.assignments.unshift(action.payload) })
      .addCase(createExam.fulfilled, (state, action) => { state.exams.unshift(action.payload) })
      .addCase(createNote.fulfilled, (state, action) => { state.notes.unshift(action.payload) })
  },
})

export const { clearError } = academicsSlice.actions
export default academicsSlice.reducer
