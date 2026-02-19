import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatContainer } from './components/chat/ChatContainer';
import { CompareContainer } from './components/compare/CompareContainer';
import { SettingsModal } from './components/settings/SettingsModal';
import { useChatStore } from './stores/chatStore';
import { initializeModelConfigs } from './stores/modelStore';
import { ToastContainer, useToast } from './components/common/Toast';
import { PanelLeft } from 'lucide-react';
import './styles/index.css';

function App() {
  const { 
    currentConversationId, 
    getCurrentConversation,
    createConversation,
    setCurrentConversation,
    conversations,
    isLoaded,
    loadConversations
  } = useChatStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const { toasts, removeToast } = useToast();
  
  const currentConversation = getCurrentConversation();
  const mode = currentConversation?.mode || 'single';

  // 初始化：加载配置和对话
  useEffect(() => {
    initializeModelConfigs();
    loadConversations();
  }, []);

  // 初始化：如果没有对话，创建一个
  useEffect(() => {
    if (!isLoaded) return;
    if (conversations.length === 0) {
      const newId = createConversation('single');
      setCurrentConversation(newId);
    } else if (!currentConversationId) {
      setCurrentConversation(conversations[0].id);
    }
  }, [isLoaded]);

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
      {isSidebarVisible && (
        <Sidebar 
          className="w-64 flex-shrink-0" 
          onCollapse={() => setIsSidebarVisible(false)} 
        />
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 侧边栏展开按钮 */}
        {!isSidebarVisible && (
          <button
            onClick={() => setIsSidebarVisible(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-800 text-white rounded-r-lg hover:bg-gray-700 transition-colors"
            title="展开侧边栏"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

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
