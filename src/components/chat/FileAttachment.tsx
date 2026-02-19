import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, File, FileCode, FileSpreadsheet, FileImage, File as FilePdf } from 'lucide-react';
import { cn } from '@/utils/helpers';

// 附件类型定义
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string; // 文本内容（如果是文本文件）
  url?: string; // 如果是图片，可以预览
}

interface FileAttachmentProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

// 文件类型配置
const FILE_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  'text/plain': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'text/markdown': { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  'application/json': { icon: FileCode, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  'application/pdf': { icon: FilePdf, color: 'text-red-600', bgColor: 'bg-red-50' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'application/msword': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-green-600', bgColor: 'bg-green-50' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-600', bgColor: 'bg-green-50' },
  'text/html': { icon: FileCode, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  'image/png': { icon: FileImage, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'image/jpeg': { icon: FileImage, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'image/gif': { icon: FileImage, color: 'text-purple-600', bgColor: 'bg-purple-50' },
};

// 获取文件图标配置
const getFileConfig = (type: string, name: string) => {
  // 先尝试匹配 MIME 类型
  if (FILE_TYPE_CONFIG[type]) {
    return FILE_TYPE_CONFIG[type];
  }
  
  // 根据扩展名匹配
  const ext = name.split('.').pop()?.toLowerCase();
  const extMap: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    'txt': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    'md': { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' },
    'json': { icon: FileCode, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    'pdf': { icon: FilePdf, color: 'text-red-600', bgColor: 'bg-red-50' },
    'docx': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    'doc': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    'csv': { icon: FileSpreadsheet, color: 'text-green-600', bgColor: 'bg-green-50' },
    'xlsx': { icon: FileSpreadsheet, color: 'text-green-600', bgColor: 'bg-green-50' },
    'html': { icon: FileCode, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    'png': { icon: FileImage, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    'jpg': { icon: FileImage, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    'jpeg': { icon: FileImage, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    'gif': { icon: FileImage, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  };
  
  return extMap[ext || ''] || { icon: File, color: 'text-gray-600', bgColor: 'bg-gray-50' };
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 读取文件内容
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = reject;
    
    // 图片文件返回 base64 用于预览
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      // 文本文件读取内容
      reader.readAsText(file);
    }
  });
};

// 单个附件标签组件
function AttachmentTag({ 
  attachment, 
  onRemove 
}: { 
  attachment: Attachment; 
  onRemove: () => void;
}) {
  const config = getFileConfig(attachment.type, attachment.name);
  const Icon = config.icon;
  const [showPreview, setShowPreview] = useState(false);
  const isImage = attachment.type.startsWith('image/');

  return (
    <>
      <div 
        className={cn(
          'group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200',
          'hover:shadow-sm cursor-pointer',
          config.bgColor,
          'border-transparent hover:border-gray-200'
        )}
        onClick={() => isImage && setShowPreview(true)}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-700 truncate max-w-[100px]" title={attachment.name}>
            {attachment.name}
          </div>
          <div className="text-[10px] text-gray-400">
            {formatFileSize(attachment.size)}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* 图片预览弹窗 */}
      {showPreview && isImage && attachment.content && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <img 
              src={attachment.content} 
              alt={attachment.name}
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
            />
            <div className="text-center text-white mt-2 text-sm">
              {attachment.name} ({formatFileSize(attachment.size)})
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 主组件
export function FileAttachment({
  attachments,
  onAttachmentsChange,
  disabled = false,
  maxFiles = 5,
}: FileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || disabled) return;
    
    // 检查数量限制
    if (attachments.length + files.length > maxFiles) {
      alert(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      try {
        // 检查文件大小（最大 10MB）
        if (file.size > 10 * 1024 * 1024) {
          alert(`文件 "${file.name}" 超过 10MB 限制`);
          continue;
        }

        const content = await readFileContent(file);
        
        newAttachments.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          content,
        });
      } catch (error) {
        console.error('文件读取失败:', error);
        alert(`文件 "${file.name}" 读取失败`);
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }

    setIsUploading(false);
    
    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachments, disabled, maxFiles, onAttachmentsChange]);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="flex items-center gap-2">
      {/* 已上传附件标签列表 */}
      {attachments.map((attachment) => (
        <AttachmentTag
          key={attachment.id}
          attachment={attachment}
          onRemove={() => handleRemove(attachment.id)}
        />
      ))}

      {/* 上传按钮 */}
      {attachments.length < maxFiles && (
        <button
          onClick={handleClick}
          disabled={disabled || isUploading}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-all duration-200',
            'border hover:shadow-sm',
            isDragging 
              ? 'border-primary-400 bg-primary-50 text-primary-600' 
              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
          )}
          title={`上传文件 (最多 ${maxFiles} 个)`}
        >
          {isUploading ? (
            <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">上传</span>
          {attachments.length > 0 && (
            <span className="ml-0.5 text-[10px] text-gray-400">
              {attachments.length}/{maxFiles}
            </span>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.json,.pdf,.docx,.doc,.csv,.xlsx,.html,.png,.jpg,.jpeg,.gif"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
