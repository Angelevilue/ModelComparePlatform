import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bot, 
  ChevronDown, 
  Settings, 
  FileText, 
  PenTool, 
  Search, 
  Presentation, 
  Blocks, 
  Wrench,
  Code,
  BookOpen,
  MessageSquare,
  Lightbulb,
  BarChart3,
  Globe,
  Zap,
  X
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { Modal } from '../common/Modal';

interface AgentConfigButtonProps {
  onSelectAgent: (agentType: string, systemPrompt: string) => void;
  disabled?: boolean;
}

// 子代理类型定义
interface SubAgent {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  systemPrompt: string;
  color: string;
  category: string;
}

const SUB_AGENTS: SubAgent[] = [
  // 文档处理类
  {
    id: 'docx-expert',
    name: 'DOCX 文档专家',
    icon: FileText,
    description: 'Word 文档处理、格式调整、排版优化',
    color: 'blue',
    category: '文档',
    systemPrompt: `你是一位专业的 DOCX 文档处理专家。你的专长包括：
1. Word 文档格式调整与优化
2. 文档结构梳理与排版
3. 标题样式、段落格式、页眉页脚设置
4. 目录生成与更新
5. 文档审阅与修订建议
6. 模板创建与应用

在回复时，你会提供具体的 Word 操作步骤和格式建议。`,
  },
  {
    id: 'ppt-maker',
    name: 'PPT 制作专家',
    icon: Presentation,
    description: '幻灯片内容规划、视觉设计、演讲稿撰写',
    color: 'orange',
    category: '文档',
    systemPrompt: `你是一位专业的 PPT 制作专家。你的专长包括：
1. PPT 内容架构设计
2. 幻灯片逻辑梳理与排版
3. 视觉设计建议（配色、字体、图表）
4. 演讲稿撰写与备注
5. 数据可视化呈现
6. 模板选择与定制建议

你会确保 PPT 内容精炼、逻辑清晰、视觉美观。`,
  },
  // 写作类
  {
    id: 'report-writer',
    name: '报告撰写专家',
    icon: PenTool,
    description: '商务/技术/研究报告、项目文档',
    color: 'green',
    category: '写作',
    systemPrompt: `你是一位专业的报告撰写专家。你的专长包括：
1. 商务报告撰写（年度/季度报告、市场分析报告）
2. 技术报告编写（技术方案、可行性分析）
3. 研究报告撰写（学术/行业研究）
4. 项目报告（立项报告、结项报告、进度报告）
5. 财务报告分析与解读
6. 报告结构规划与逻辑梳理

你会确保报告内容专业、结构清晰、逻辑严谨。`,
  },
  {
    id: 'content-creator',
    name: '内容创作专家',
    icon: MessageSquare,
    description: '营销文案、社交媒体、创意写作',
    color: 'pink',
    category: '写作',
    systemPrompt: `你是一位专业的内容创作专家。你的专长包括：
1. 营销文案撰写（广告、推广、活动策划）
2. 社交媒体内容（微博、公众号、短视频脚本）
3. 品牌故事与企业文化文案
4. 创意写作与叙事设计
5. SEO 优化内容
6. 多平台内容适配

你会根据目标受众创作有吸引力、有传播力的内容。`,
  },
  // 研究分析类
  {
    id: 'deep-research',
    name: '深度调研专家',
    icon: Search,
    description: '市场/竞品/行业调研、数据分析',
    color: 'purple',
    category: '研究',
    systemPrompt: `你是一位专业的深度调研分析师。你的专长包括：
1. 市场调研（市场规模、趋势分析、用户画像）
2. 竞品分析（功能对比、优劣势分析、差异化策略）
3. 行业研究（产业链分析、政策解读、发展前景）
4. 用户调研（需求分析、痛点挖掘、满意度研究）
5. 数据收集与整理
6. 调研报告撰写与可视化建议

你会提供全面、深入、有洞察力的调研分析。`,
  },
  {
    id: 'data-analyst',
    name: '数据分析师',
    icon: BarChart3,
    description: '数据解读、可视化建议、商业洞察',
    color: 'cyan',
    category: '研究',
    systemPrompt: `你是一位专业的数据分析师。你的专长包括：
1. 数据清洗与预处理建议
2. 统计分析（描述性统计、相关性分析）
3. 数据可视化（图表选择、配色方案）
4. 商业指标解读（KPI、转化率、留存率）
5. 趋势预测与异常检测
6. 数据驱动的决策建议

你会将复杂数据转化为清晰易懂的分析结论。`,
  },
  // 技术类
  {
    id: 'code-expert',
    name: '代码专家',
    icon: Code,
    description: '编程助手、代码审查、技术方案',
    color: 'indigo',
    category: '技术',
    systemPrompt: `你是一位专业的编程专家。你的专长包括：
1. 代码编写与优化（Python、JavaScript、Java 等）
2. 代码审查与重构建议
3. 算法设计与复杂度分析
4. 技术方案设计（架构、选型、实现）
5. Bug 调试与性能优化
6. 技术文档编写

你会提供高质量的代码和详细的技术解释。`,
  },
  {
    id: 'knowledge-expert',
    name: '知识库专家',
    icon: BookOpen,
    description: '知识整理、文档结构化、FAQ 生成',
    color: 'teal',
    category: '技术',
    systemPrompt: `你是一位专业的知识库管理专家。你的专长包括：
1. 知识分类与标签体系设计
2. 文档结构化与标准化
3. FAQ 生成与优化
4. 知识检索与推荐
5. 知识图谱构建
6. 企业内部培训材料制作

你会帮助构建清晰、易用、可维护的知识体系。`,
  },
  // 通用类
  {
    id: 'brainstorm',
    name: '头脑风暴助手',
    icon: Lightbulb,
    description: '创意激发、问题解决、思路拓展',
    color: 'yellow',
    category: '通用',
    systemPrompt: `你是一位专业的头脑风暴助手。你的专长包括：
1. 创意激发与联想拓展
2. 问题拆解与多角度分析
3. 头脑风暴引导（头脑写作、思维导图）
4. 创新方案生成
5. 风险评估与可行性分析
6. SWOT 分析与决策建议

你会通过提问和引导帮助用户打开思路。`,
  },
  {
    id: 'translation-expert',
    name: '翻译专家',
    icon: Globe,
    description: '多语言翻译、本地化、跨文化沟通',
    color: 'emerald',
    category: '通用',
    systemPrompt: `你是一位专业的翻译专家。你的专长包括：
1. 多语言翻译（中英日韩法等）
2. 专业术语翻译（技术、法律、医学）
3. 本地化与文化适配
4. 翻译质量评估
5. 多语言内容创作
6. 跨文化沟通建议

你会确保翻译准确、地道、符合目标语言习惯。`,
  },
  {
    id: 'learning-tutor',
    name: '学习导师',
    icon: Zap,
    description: '知识讲解、学习计划、答疑解惑',
    color: 'amber',
    category: '通用',
    systemPrompt: `你是一位专业的学习导师。你的专长包括：
1. 知识点讲解（由浅入深、通俗易懂）
2. 学习计划制定
3. 习题解析与答疑
4. 学习方法指导（记忆技巧、思维导图）
5. 考试复习策略
6. 学习资源推荐

你会根据学习者的水平提供个性化的学习指导。`,
  },
];

// 按类别分组
const CATEGORIES = ['全部', '文档', '写作', '研究', '技术', '通用'];

// MCP 工具配置
interface MCPTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function AgentConfigButton({ onSelectAgent, disabled = false }: AgentConfigButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMCPModal, setShowMCPModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, bottom: 0 });

  // MCP 工具列表
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([
    { id: 'web-search', name: '网络搜索', description: '实时搜索网络信息', enabled: false },
    { id: 'code-execution', name: '代码执行', description: '执行 Python 代码', enabled: false },
    { id: 'file-reader', name: '文件读取', description: '读取本地文件内容', enabled: true },
    { id: 'image-generation', name: '图像生成', description: '生成 AI 图像', enabled: false },
  ]);

  // 计算下拉菜单位置
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 420;
      
      // 计算水平位置，确保不超出屏幕
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth) {
        left = rect.right - dropdownWidth;
      }
      if (left < 10) {
        left = 10;
      }
      
      setDropdownPosition({
        left,
        bottom: window.innerHeight - rect.top + 8,
      });
    }
  }, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleSelectAgent = (agent: SubAgent) => {
    onSelectAgent(agent.id, agent.systemPrompt);
    setIsOpen(false);
  };

  const toggleMCPTool = (toolId: string) => {
    setMcpTools(prev => prev.map(tool => 
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    ));
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    };
    return colors[color] || colors.blue;
  };

  const filteredAgents = selectedCategory === '全部' 
    ? SUB_AGENTS 
    : SUB_AGENTS.filter(agent => agent.category === selectedCategory);

  // 下拉菜单内容
  const dropdownContent = isOpen && (
    <div 
      ref={dropdownRef}
      className="fixed z-[9999] w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in"
      style={{
        left: dropdownPosition.left,
        bottom: dropdownPosition.bottom,
      }}
    >
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-100 rounded-lg">
              <Bot className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <span className="font-semibold text-gray-900">选择子代理</span>
              <p className="text-[10px] text-gray-500">共 {SUB_AGENTS.length} 个专业代理</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setIsOpen(false); setShowMCPModal(true); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <Blocks className="w-3.5 h-3.5" />
              MCP
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all',
                selectedCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 子代理列表 */}
      <div className="p-2 max-h-[320px] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {filteredAgents.map((agent) => {
            const colors = getColorClasses(agent.color);
            const Icon = agent.icon;
            return (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent)}
                className={cn(
                  'flex flex-col items-start gap-2 p-3 rounded-xl transition-all duration-200',
                  'border hover:shadow-md text-left group',
                  'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg transition-transform group-hover:scale-110',
                  colors.bg, colors.text
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 leading-tight">
                    {agent.name}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 text-center">
          💡 选择代理将自动配置对应的系统提示词
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-all duration-200',
            'border hover:shadow-sm',
            isOpen 
              ? 'border-primary-400 bg-primary-50 text-primary-600' 
              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="选择子代理"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">代理</span>
          <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
        </button>
      </div>

      {/* 使用 Portal 渲染下拉菜单 */}
      {createPortal(dropdownContent, document.body)}

      {/* MCP 配置弹窗 */}
      <Modal
        isOpen={showMCPModal}
        onClose={() => setShowMCPModal(false)}
        title="MCP 工具配置"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            配置 Model Context Protocol (MCP) 工具，扩展 AI 的能力
          </div>
          
          <div className="space-y-2">
            {mcpTools.map((tool) => (
              <div 
                key={tool.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  tool.enabled 
                    ? 'bg-primary-50 border-primary-200' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    tool.enabled ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
                  )}>
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={cn(
                      'font-medium text-sm',
                      tool.enabled ? 'text-primary-700' : 'text-gray-700'
                    )}>
                      {tool.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tool.description}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleMCPTool(tool.id)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors duration-200',
                    tool.enabled ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                      tool.enabled && 'translate-x-5'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Settings className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <strong>什么是 MCP？</strong>
                <br />
                Model Context Protocol (模型上下文协议) 是一种开放标准，允许 AI 模型安全地访问外部工具和数据源。
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
