import { useState } from 'react'
import { MessageSquare, Users, Search, Plus, ThumbsUp, MessageCircle, Share2 } from 'lucide-react'

const posts = [
  { id: 1, author: 'Rahul K.', avatar: 'R', role: 'Student', title: 'Tips for DSA interview prep?', content: 'I have interviews coming up next month. Any resources or strategies that worked for you?', likes: 24, comments: 12, time: '2h ago', tags: ['DSA', 'Interview'] },
  { id: 2, author: 'Priya S.', avatar: 'P', role: 'Student', title: 'ML project collaboration', content: 'Looking for teammates for an NLP-based project for the upcoming hackathon.', likes: 18, comments: 8, time: '5h ago', tags: ['ML', 'Projects'] },
  { id: 3, author: 'Dr. Sharma', avatar: 'D', role: 'Faculty', title: 'Study group for OS exam', content: 'Forming a group for Operating Systems revision. Interested students please reach out.', likes: 31, comments: 15, time: '1d ago', tags: ['OS', 'Study Group'] },
]

export default function Community() {
  const [tab, setTab] = useState('feed')

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Community</h1><p className="text-dark-muted">Connect, collaborate, and learn together</p></div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl transition-all"><Plus size={18} /> New Post</button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} /><input className="w-full bg-dark-lighter border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-white" placeholder="Search discussions..." /></div>
      </div>

      <div className="space-y-4">
        {posts.map(p => (
          <div key={p.id} className="glass rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center font-bold shrink-0">{p.avatar}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><span className="font-medium">{p.author}</span><span className="text-xs px-2 py-0.5 rounded-full bg-dark-lighter text-dark-muted">{p.role}</span><span className="text-xs text-dark-muted">{p.time}</span></div>
                <h3 className="font-semibold text-lg">{p.title}</h3>
                <p className="text-dark-muted text-sm mt-1">{p.content}</p>
                <div className="flex gap-2 mt-3">
                  {p.tags.map(t => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">{t}</span>)}
                </div>
                <div className="flex items-center gap-6 mt-4 text-dark-muted">
                  <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"><ThumbsUp size={16} />{p.likes}</button>
                  <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"><MessageCircle size={16} />{p.comments}</button>
                  <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"><Share2 size={16} />Share</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
