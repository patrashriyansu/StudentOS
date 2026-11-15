import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../theme/ThemeContext'

export default function ThemeControl({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  return (
    <div className={compact ? 'theme-control theme-control-compact' : 'theme-control'} role="group" aria-label="Choose appearance">
      <span className="theme-control-label">Theme</span>
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label="Use light theme"
        className={theme === 'light' ? 'theme-choice theme-choice-active' : 'theme-choice'}
        title="Light theme"
      >
        <Sun size={compact ? 15 : 16} />
        {!compact && <span>Light</span>}
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label="Use dark theme"
        className={theme === 'dark' ? 'theme-choice theme-choice-active' : 'theme-choice'}
        title="Dark theme"
      >
        <Moon size={compact ? 15 : 16} />
        {!compact && <span>Dark</span>}
      </button>
    </div>
  )
}
