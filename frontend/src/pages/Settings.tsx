import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Moon, Shield, UserRound, Download, Save, Target, Trash2, XCircle } from 'lucide-react'
import ThemeControl from '../components/theme/ThemeControl'
import { api } from '../services/api'

type NotificationSettings = {
  email_enabled: boolean
  email_delivery_available: boolean
  push_available: boolean
  in_app_enabled: boolean
  assignment_reminders: boolean
  exam_reminders: boolean
  attendance_alerts: boolean
  placement_updates: boolean
  quiet_hours_start: string
  quiet_hours_end: string
}
type CareerProfile = {
  career_goal: string
  target_role: string
  target_industries: string
  preferred_locations: string
  employment_types: string[]
  work_mode: string
  target_start_date: string
  onboarding_completed: boolean
}

const defaultNotifications: NotificationSettings = {
  email_enabled: true,
  email_delivery_available: false,
  push_available: false,
  in_app_enabled: true,
  assignment_reminders: true,
  exam_reminders: true,
  attendance_alerts: true,
  placement_updates: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
}
const defaultCareer: CareerProfile = {
  career_goal: '',
  target_role: '',
  target_industries: '',
  preferred_locations: '',
  employment_types: [],
  work_mode: 'any',
  target_start_date: '',
  onboarding_completed: false,
}
const Toggle = ({label,description,checked,onChange}:{label:string;description:string;checked:boolean;onChange:(value:boolean)=>void}) => (
  <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-dark-border p-3">
    <span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-dark-muted">{description}</span></span>
    <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-primary"/>
  </label>
)

export default function Settings() {
  const [notifications,setNotifications]=useState(defaultNotifications)
  const [career,setCareer]=useState(defaultCareer)
  const [deletionRequest,setDeletionRequest]=useState<any>(null)
  const [deletionReason,setDeletionReason]=useState('')
  const [deletionConfirmation,setDeletionConfirmation]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [feedback,setFeedback]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{
    Promise.all([
      api.get('/notifications/settings'),
      api.get('/users/career-profile'),
      api.get('/users/account/deletion-request'),
    ]).then(([n,c,d])=>{
      setNotifications({...defaultNotifications,...n.data})
      const data=c.data||{}
      setCareer({
        career_goal:data.career_goal||'',
        target_role:data.target_role||'',
        target_industries:(data.target_industries||[]).join(', '),
        preferred_locations:(data.preferred_locations||[]).join(', '),
        employment_types:data.employment_types||[],
        work_mode:data.work_mode||'any',
        target_start_date:data.target_start_date||'',
        onboarding_completed:Boolean(data.onboarding_completed),
      })
      setDeletionRequest(d.data||null)
    }).catch(err=>{
      setError(err?.response?.data?.detail||'Could not load all account preferences.')
    }).finally(()=>setLoading(false))
  },[])

  const saveNotifications=async()=>{
    setSaving(true);setError('');setFeedback('')
    try{
      const payload={
        email_enabled:notifications.email_enabled,
        in_app_enabled:notifications.in_app_enabled,
        assignment_reminders:notifications.assignment_reminders,
        exam_reminders:notifications.exam_reminders,
        attendance_alerts:notifications.attendance_alerts,
        placement_updates:notifications.placement_updates,
        quiet_hours_start:notifications.quiet_hours_start,
        quiet_hours_end:notifications.quiet_hours_end,
      }
      const response=await api.put('/notifications/settings',payload)
      setNotifications({...defaultNotifications,...response.data})
      setFeedback('Notification preferences saved to your account.')
    }catch(err:any){setError(err?.response?.data?.detail||'Could not save notification preferences.')}
    finally{setSaving(false)}
  }

  const saveCareer=async()=>{
    setSaving(true);setError('');setFeedback('')
    const target_industries=career.target_industries.split(',').map(x=>x.trim()).filter(Boolean)
    const preferred_locations=career.preferred_locations.split(',').map(x=>x.trim()).filter(Boolean)
    const complete=Boolean(career.career_goal.trim()&&career.target_role.trim()&&preferred_locations.length)
    try{
      const response=await api.put('/users/career-profile',{
        career_goal:career.career_goal.trim(),
        target_role:career.target_role.trim(),
        target_industries,
        preferred_locations,
        employment_types:career.employment_types,
        work_mode:career.work_mode,
        target_start_date:career.target_start_date||null,
        onboarding_completed:complete,
      })
      setCareer(current=>({...current,onboarding_completed:Boolean(response.data.onboarding_completed)}))
      setFeedback(complete?'Career onboarding saved as complete.':'Career preferences saved. Add a goal, target role and location to complete onboarding.')
    }catch(err:any){setError(err?.response?.data?.detail||'Could not save career goals.')}
    finally{setSaving(false)}
  }

  const exportAccount=async()=>{
    setSaving(true);setError('');setFeedback('')
    try{
      const response=await api.get('/users/export',{responseType:'blob'})
      const url=window.URL.createObjectURL(new Blob([response.data],{type:'application/json'}))
      const anchor=document.createElement('a')
      anchor.href=url
      anchor.download='studentos-account-export.json'
      anchor.click()
      window.URL.revokeObjectURL(url)
      setFeedback('Your account export has been generated.')
    }catch(err:any){setError(err?.response?.data?.detail||'Could not export your account data.')}
    finally{setSaving(false)}
  }

  const requestDeletion=async()=>{
    if(deletionConfirmation!=='DELETE MY ACCOUNT'){
      setError('Type DELETE MY ACCOUNT exactly to submit this request.')
      return
    }
    setSaving(true);setError('');setFeedback('')
    try{
      const response=await api.post('/users/account/deletion-request',{confirmation:deletionConfirmation,reason:deletionReason})
      setDeletionRequest(response.data)
      setDeletionConfirmation('')
      setFeedback('Your deletion request is recorded for review. Your account remains active until it is processed.')
    }catch(err:any){setError(err?.response?.data?.detail||'Could not submit your deletion request.')}
    finally{setSaving(false)}
  }

  const cancelDeletion=async()=>{
    setSaving(true);setError('');setFeedback('')
    try{
      await api.delete('/users/account/deletion-request')
      setDeletionRequest(null)
      setDeletionReason('')
      setFeedback('Your pending deletion request was cancelled.')
    }catch(err:any){setError(err?.response?.data?.detail||'Could not cancel the request.')}
    finally{setSaving(false)}
  }

  const toggleEmployment=(value:string)=>{
    setCareer(current=>({...current,employment_types:current.employment_types.includes(value)?current.employment_types.filter(x=>x!==value):[...current.employment_types,value]}))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-dark-muted">Manage your account preferences, career goals and personal data.</p>
      </div>
      {error&&<div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {feedback&&<div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback}</div>}
      {loading?<div className="glass rounded-2xl border border-dark-border p-6 text-sm text-dark-muted">Loading your saved settings…</div>:<>
        <section className="glass space-y-4 rounded-2xl border border-dark-border p-5">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Moon size={19}/></div><div className="min-w-0 flex-1"><h2 className="font-semibold">Appearance</h2><p className="mt-1 text-xs text-dark-muted">Choose the theme used throughout StudentOS. Your selection is saved in this browser.</p></div></div>
          <ThemeControl/>
        </section>

        <section className="glass space-y-4 rounded-2xl border border-dark-border p-5">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Target size={19}/></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Career goals & onboarding</h2>{career.onboarding_completed&&<span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Complete</span>}</div><p className="mt-1 text-xs text-dark-muted">Tell StudentOS what you are aiming for so your career workspace can become more relevant. These preferences are private to your account.</p></div></div>
          <label className="block text-xs text-dark-muted">Career goal<textarea rows={2} value={career.career_goal} onChange={e=>setCareer({...career,career_goal:e.target.value})} placeholder="e.g. Become a software engineer and secure a product-company internship." className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-3 text-sm text-white"/></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-dark-muted">Target role<input value={career.target_role} onChange={e=>setCareer({...career,target_role:e.target.value})} placeholder="e.g. Full-Stack Developer" className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
            <label className="text-xs text-dark-muted">Target start date<input type="date" value={career.target_start_date} onChange={e=>setCareer({...career,target_start_date:e.target.value})} className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
            <label className="text-xs text-dark-muted">Target industries · comma separated<input value={career.target_industries} onChange={e=>setCareer({...career,target_industries:e.target.value})} placeholder="Software, FinTech, AI/ML" className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
            <label className="text-xs text-dark-muted">Preferred locations · comma separated<input value={career.preferred_locations} onChange={e=>setCareer({...career,preferred_locations:e.target.value})} placeholder="Bengaluru, Hyderabad, Remote" className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label>
            <label className="text-xs text-dark-muted">Work mode<select value={career.work_mode} onChange={e=>setCareer({...career,work_mode:e.target.value})} className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"><option value="any">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label>
          </div>
          <div><p className="mb-2 text-xs text-dark-muted">Employment types</p><div className="flex flex-wrap gap-2">{['Internship','Full-time','Part-time','Contract'].map(value=><label key={value} className="flex items-center gap-2 rounded-lg border border-dark-border px-3 py-2 text-xs"><input type="checkbox" checked={career.employment_types.includes(value)} onChange={()=>toggleEmployment(value)} className="accent-primary"/>{value}</label>)}</div></div>
          <div className="flex justify-end"><button onClick={()=>void saveCareer()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>Save career goals</button></div>
        </section>

        <section className="glass space-y-4 rounded-2xl border border-dark-border p-5">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Bell size={19}/></div><div className="flex-1"><h2 className="font-semibold">Notification preferences</h2><p className="mt-1 text-xs text-dark-muted">These preferences are saved to your account and apply across sessions.</p></div></div>
          {!notifications.email_delivery_available&&<p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Email delivery is not configured on the server. Your preference will be saved, but email messages cannot be sent until SMTP is configured.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Email notifications" description="Receive supported reminders by email when delivery is configured." checked={notifications.email_enabled} onChange={v=>setNotifications({...notifications,email_enabled:v})}/>
            <Toggle label="In-app notifications" description="Show alerts in your StudentOS notification centre." checked={notifications.in_app_enabled} onChange={v=>setNotifications({...notifications,in_app_enabled:v})}/>
            <Toggle label="Assignment reminders" description="Notify about assignment deadlines." checked={notifications.assignment_reminders} onChange={v=>setNotifications({...notifications,assignment_reminders:v})}/>
            <Toggle label="Exam reminders" description="Notify about upcoming exams." checked={notifications.exam_reminders} onChange={v=>setNotifications({...notifications,exam_reminders:v})}/>
            <Toggle label="Attendance alerts" description="Notify about attendance and shortage warnings." checked={notifications.attendance_alerts} onChange={v=>setNotifications({...notifications,attendance_alerts:v})}/>
            <Toggle label="Placement updates" description="Notify about application and interview activity." checked={notifications.placement_updates} onChange={v=>setNotifications({...notifications,placement_updates:v})}/>
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-dark-muted">Quiet hours start<input type="time" value={notifications.quiet_hours_start} onChange={e=>setNotifications({...notifications,quiet_hours_start:e.target.value})} className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label><label className="text-xs text-dark-muted">Quiet hours end<input type="time" value={notifications.quiet_hours_end} onChange={e=>setNotifications({...notifications,quiet_hours_end:e.target.value})} className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label></div>
          <p className="text-xs text-dark-muted">Browser push notifications are not available in this deployment yet.</p>
          <div className="flex justify-end"><button onClick={()=>void saveNotifications()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>Save preferences</button></div>
        </section>

        <section className="glass space-y-4 rounded-2xl border border-dark-border p-5">
          <h2 className="font-semibold">Account and notifications</h2>
          <Link to="/profile" className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-lighter p-3 hover:border-primary/40"><UserRound size={18} className="text-primary"/><span className="flex-1 text-sm">Profile information</span><span className="text-sm text-dark-muted">Open →</span></Link>
          <Link to="/notifications" className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-lighter p-3 hover:border-primary/40"><Bell size={18} className="text-primary"/><span className="flex-1 text-sm">Notifications and reminders</span><span className="text-sm text-dark-muted">Open →</span></Link>
        </section>

        <section className="glass space-y-3 rounded-2xl border border-dark-border p-5">
          <div><h2 className="font-semibold">Your account data</h2><p className="mt-1 text-xs text-dark-muted">Download a JSON export of your saved StudentOS records. Password hashes and raw resume/document file bytes are never included.</p></div>
          <button onClick={()=>void exportAccount()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-dark-border px-4 py-2.5 text-sm font-semibold"><Download size={15}/>Export my data</button>
        </section>

        <section className="space-y-3 rounded-2xl border border-rose-500/30 p-5">
          <h2 className="font-semibold text-rose-300">Request account deletion</h2>
          <p className="text-xs text-dark-muted">This submits a deletion request for review; it does not immediately deactivate or erase your account. You can cancel a pending request below. An administrator must process the request.</p>
          {deletionRequest && deletionRequest.status !== 'pending' ? <div className="rounded-xl bg-dark-lighter p-3"><p className="text-sm font-medium">Deletion request: {String(deletionRequest.status).replace(/_/g, ' ')}</p><p className="mt-1 text-xs text-dark-muted">Your account remains active until deletion is completed. Contact your administrator for the current processing status.</p></div> : deletionRequest?.status==='pending'?<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-dark-lighter p-3"><div><p className="text-sm font-medium">Deletion request pending</p><p className="text-xs text-dark-muted">Submitted {deletionRequest.created_at?.slice(0,10)}</p></div><button onClick={()=>void cancelDeletion()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-dark-border px-3 py-2 text-xs"><XCircle size={14}/>Cancel request</button></div>:<><textarea rows={2} value={deletionReason} onChange={e=>setDeletionReason(e.target.value)} placeholder="Optional reason for your request" className="w-full rounded-xl border border-dark-border bg-dark-lighter p-3 text-sm text-white"/><label className="block text-xs text-dark-muted">Type DELETE MY ACCOUNT to confirm<input value={deletionConfirmation} onChange={e=>setDeletionConfirmation(e.target.value)} className="mt-1 w-full rounded-xl border border-dark-border bg-dark-lighter p-2.5 text-sm text-white"/></label><button onClick={()=>void requestDeletion()} disabled={saving||deletionConfirmation!=='DELETE MY ACCOUNT'} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2.5 text-sm font-semibold text-rose-300 disabled:opacity-50"><Trash2 size={15}/>Submit deletion request</button></>}
        </section>
      </>}
      <section className="flex items-start gap-3 rounded-2xl border border-dark-border p-4"><Shield size={18} className="mt-0.5 shrink-0 text-dark-muted"/><p className="text-xs text-dark-muted">Sign-in security changes remain managed by the existing authentication system. Account deletion requests enter a review queue; submitted applications and records are not silently removed.</p></section>
    </div>
  )
}
