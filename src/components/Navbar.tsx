import { cn } from '@/utils/helpers';
import { MessageSquare, Users, Settings as SettingsIcon, Github } from 'lucide-react';


interface NavbarProps {
  mode: 'single' | 'compare';
  onModeChange: (mode: 'single' | 'compare') => void;
  onOpenSettings: () => void;
  className?: string;
}

export function Navbar({ mode, onModeChange, onOpenSettings, className }: NavbarProps) {
  return (
    <nav className={cn('flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200', className)}>
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => onModeChange('single')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === 'single'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          单模型对话
        </button>
        <button
          onClick={() => onModeChange('compare')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === 'compare'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Users className="w-4 h-4" />
          模型对比
        </button>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Github className="w-5 h-5" />
        </a>
        <button
          onClick={onOpenSettings}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
