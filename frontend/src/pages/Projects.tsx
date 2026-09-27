import { useState } from 'react'
import { FolderGit2, Github, Plus, ExternalLink, Calendar, Users, Star, GitBranch } from 'lucide-react'

const projects = [
  { id: 1, name: 'StudentOS', desc: 'AI-powered student productivity platform', tech: ['React', 'FastAPI', 'PostgreSQL'], stars: 24, forks: 8, updated: '2d ago', status: 'active' },
  { id: 2, name: 'ML Model Hub', desc: 'Collection of ML models for academic research', tech: ['Python', 'TensorFlow', 'Jupyter'], stars: 18, forks: 5, updated: '1w ago', status: 'completed' },
  { id: 3, name: 'Chat App', desc: 'Real-time messaging app with WebSocket', tech: ['React', 'Node.js', 'Socket.io'], stars: 12, forks: 3, updated: '2w ago', status: 'active' },
]

export default function Projects() {
  const [tab, setTab] = useState('all')

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Projects</h1><p className="text-dark-muted">Showcase your work and track progress</p></div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl transition-all"><Plus size={18} /> New Project</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => (
          <div key={p.id} className="glass rounded-xl p-6 hover:border-primary/50 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"><FolderGit2 size={24} className="text-primary" /></div>
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{p.status}</span>
            </div>
            <h3 className="font-semibold mb-1">{p.name}</h3>
            <p className="text-sm text-dark-muted mb-3">{p.desc}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {p.tech.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-dark-lighter text-dark-muted">{t}</span>)}
            </div>
            <div className="flex items-center justify-between text-dark-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs"><Star size={12} />{p.stars}</span>
                <span className="flex items-center gap-1 text-xs"><GitBranch size={12} />{p.forks}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">{p.updated}</span>
                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-dark-lighter border border-dark-border flex items-center justify-center mx-auto mb-4"><Github size={32} className="text-dark-muted" /></div>
        <h3 className="text-lg font-semibold mb-2">Connect GitHub</h3>
        <p className="text-dark-muted text-sm mb-4">Sync your repositories and showcase your contributions</p>
        <button className="bg-dark-lighter border border-dark-border hover:border-primary/50 text-white px-6 py-3 rounded-xl transition-all">Connect GitHub</button>
      </div>
    </div>
  )
}
