import { useChatStore } from '@/stores/chatStore';
import { cn, truncateText } from '@/utils/helpers';
import { MessageSquare, Users, Plus, Trash2, PanelLeftClose } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  className?: string;
  onCollapse?: () => void;
}

export function Sidebar({ className, onCollapse }: SidebarProps) {
  const { 
    conversations, 
    currentConversationId, 
    setCurrentConversation, 
    createConversation,
    deleteConversation,
 
  } = useChatStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);



  const handleNewChat = (mode: 'single' | 'compare' = 'single') => {
    const count = mode === 'compare' ? 2 : 1;
    const newId = createConversation(mode, count);
    setCurrentConversation(newId);
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-900 text-white', className)}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-semibold text-lg">ModelCompare</span>
        </div>
        <button
          onClick={onCollapse}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="隐藏侧边栏"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* 新建按钮 */}
      <div className="p-3 space-y-2">
        <button
          onClick={() => handleNewChat('single')}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新对话
        </button>
        <button
          onClick={() => handleNewChat('compare')}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
        >
          <Users className="w-4 h-4" />
          模型对比
        </button>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-2 text-xs font-medium text-gray-500 uppercase">
          对话历史
        </div>
        <div className="space-y-0.5 px-2">
          {conversations.map((conversation) => {
            const isActive = conversation.id === currentConversationId;
            const isHovered = conversation.id === hoveredId;
            const isCompare = conversation.mode === 'compare';

            return (
              <div
                key={conversation.id}
                onClick={() => setCurrentConversation(conversation.id)}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  isActive 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                )}
              >
                {isCompare ? (
                  <Users className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="flex-1 text-sm truncate text-left">
                  {truncateText(conversation.title, 20)}
                </span>
                {(isActive || isHovered) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        {conversations.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            暂无对话记录
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-3 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          ModelCompare v1.0.0
        </div>
      </div>
    </div>
  );
}
