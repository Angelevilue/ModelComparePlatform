import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatContainer } from './components/chat/ChatContainer';
import { CompareContainer } from './components/compare/CompareContainer';
import { SettingsModal } from './components/settings/SettingsModal';
import { useChatStore } from './stores/chatStore';
import { ToastContainer, useToast } from './components/common/Toast';
import './styles/index.css';

function App() {
  const { 
    currentConversationId, 
    getCurrentConversation,
    createConversation,
    setCurrentConversation,
    conversations 
  } = useChatStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toasts, removeToast } = useToast();
  
  const currentConversation = getCurrentConversation();
  const mode = currentConversation?.mode || 'single';

  // 初始化：如果没有对话，创建一个
  useEffect(() => {
    if (conversations.length === 0) {
      const newId = createConversation('single');
      setCurrentConversation(newId);
    } else if (!currentConversationId) {
      setCurrentConversation(conversations[0].id);
    }
  }, []);

  // 监听错误
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('应用错误:', event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* 侧边栏 */}
      <Sidebar className="w-64 flex-shrink-0 hidden md:flex" />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentConversationId ? (
          mode === 'single' ? (
            <ChatContainer
              conversationId={currentConversationId}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <CompareContainer
              conversationId={currentConversationId}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            选择一个对话或创建新对话
          </div>
        )}
      </div>

      {/* 设置弹窗 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Toast 通知 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
