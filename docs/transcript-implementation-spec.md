# 字幕编辑器实现规范
Technical Implementation Specification

## 1. 组件实现详细说明

### 1.1 TranscriptEditor 主容器

#### 文件路径
`/src/features/editor/transcript/TranscriptEditor.tsx`

#### 实现细节
```typescript
const TranscriptEditor: React.FC = () => {
  // 状态管理
  const { segments, activeSegmentId, editingSegmentId } = useTranscriptStore();
  const { currentFrame, fps } = useStore();
  
  // Refs
  const listRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // 自动滚动到活动段落
  useEffect(() => {
    if (activeSegmentId && segmentRefs.current.has(activeSegmentId)) {
      const element = segmentRefs.current.get(activeSegmentId);
      element?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [activeSegmentId]);
  
  // 监听播放位置变化
  useEffect(() => {
    const currentTime = (currentFrame / fps) * 1000;
    useTranscriptStore.getState().setActiveSegmentByTime(currentTime);
  }, [currentFrame, fps]);
  
  return (
    <div className="transcript-editor">
      <TranscriptToolbar />
      <TranscriptSearchBar />
      <div className="transcript-list" ref={listRef}>
        {segments.map(segment => (
          <TranscriptSegment
            key={segment.id}
            segment={segment}
            isActive={segment.id === activeSegmentId}
            isEditing={segment.id === editingSegmentId}
            ref={(el) => {
              if (el) segmentRefs.current.set(segment.id, el);
              else segmentRefs.current.delete(segment.id);
            }}
          />
        ))}
      </div>
      <TranscriptStatusBar />
    </div>
  );
};
```

#### 样式要求
```css
.transcript-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--background);
  border-left: 1px solid var(--border);
}

.transcript-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;
}
```

### 1.2 TranscriptSegment 段落组件

#### 文件路径
`/src/features/editor/transcript/TranscriptSegment.tsx`

#### 核心功能实现
```typescript
const TranscriptSegment = forwardRef<HTMLDivElement, TranscriptSegmentProps>(
  ({ segment, isActive, isEditing }, ref) => {
    const [localText, setLocalText] = useState(segment.text);
    const [localHtml, setLocalHtml] = useState(segment.html || segment.text);
    const editableRef = useRef<HTMLDivElement>(null);
    const { selectSegment, updateSegment, setEditingSegment } = useTranscriptStore();
    
    // 处理点击事件
    const handleClick = () => {
      if (!isEditing) {
        selectSegment(segment.id);
      }
    };
    
    // 进入编辑模式
    const handleDoubleClick = () => {
      setEditingSegment(segment.id);
      setTimeout(() => {
        editableRef.current?.focus();
        // 选中全部文本
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editableRef.current!);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }, 0);
    };
    
    // 保存编辑
    const handleBlur = () => {
      const newText = editableRef.current?.innerText || '';
      const newHtml = editableRef.current?.innerHTML || '';
      
      updateSegment(segment.id, {
        text: newText,
        html: newHtml
      });
      
      setEditingSegment(null);
    };
    
    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 取消编辑，恢复原文本
        if (editableRef.current) {
          editableRef.current.innerHTML = localHtml;
        }
        setEditingSegment(null);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Enter 保存并跳到下一段
        e.preventDefault();
        handleBlur();
        // 选中下一段落逻辑
        const nextSegment = useTranscriptStore.getState()
          .getNextSegment(segment.id);
        if (nextSegment) {
          selectSegment(nextSegment.id);
          setEditingSegment(nextSegment.id);
        }
      }
    };
    
    // 格式化时间显示
    const formatTime = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const milliseconds = Math.floor((ms % 1000) / 10);
      return `${minutes.toString().padStart(2, '0')}:${
        remainingSeconds.toString().padStart(2, '0')
      }.${milliseconds.toString().padStart(2, '0')}`;
    };
    
    return (
      <div 
        ref={ref}
        className={`transcript-segment ${isActive ? 'active' : ''} ${
          isEditing ? 'editing' : ''
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div className="segment-header">
          <span className="time-range">
            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
          </span>
          {segment.speaker && (
            <span className="speaker">{segment.speaker}</span>
          )}
        </div>
        
        <div 
          ref={editableRef}
          className="segment-content"
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            setLocalText((e.target as HTMLDivElement).innerText);
            setLocalHtml((e.target as HTMLDivElement).innerHTML);
          }}
          style={{
            fontWeight: segment.style?.bold ? 'bold' : 'normal',
            fontStyle: segment.style?.italic ? 'italic' : 'normal',
            textDecoration: segment.style?.underline ? 'underline' : 'none',
            color: segment.style?.color || 'inherit',
            backgroundColor: segment.style?.backgroundColor || 'transparent',
            fontSize: segment.style?.fontSize ? `${segment.style.fontSize}px` : 'inherit',
            textAlign: segment.style?.textAlign || 'left'
          }}
          dangerouslySetInnerHTML={{ __html: localHtml }}
        />
      </div>
    );
  }
);
```

### 1.3 TranscriptToolbar 工具栏

#### 文件路径
`/src/features/editor/transcript/TranscriptToolbar.tsx`

#### 实现要点
```typescript
const TranscriptToolbar: React.FC = () => {
  const { editingSegmentId, updateSegment, segments } = useTranscriptStore();
  const editingSegment = segments.find(s => s.id === editingSegmentId);
  
  // 应用格式
  const applyFormat = (command: string, value?: string) => {
    if (!editingSegmentId) return;
    
    // 使用 document.execCommand 应用格式
    document.execCommand(command, false, value);
    
    // 更新段落样式
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer.parentElement;
      
      // 获取当前样式
      const computedStyle = window.getComputedStyle(container!);
      
      updateSegment(editingSegmentId, {
        style: {
          ...editingSegment?.style,
          bold: computedStyle.fontWeight === 'bold' || 
                parseInt(computedStyle.fontWeight) >= 700,
          italic: computedStyle.fontStyle === 'italic',
          underline: computedStyle.textDecoration.includes('underline'),
          color: rgbToHex(computedStyle.color),
          fontSize: parseInt(computedStyle.fontSize)
        }
      });
    }
  };
  
  return (
    <div className="transcript-toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => applyFormat('bold')}
          disabled={!editingSegmentId}
          aria-label="Bold"
        >
          <Bold size={18} />
        </button>
        
        <button
          className="toolbar-btn"
          onClick={() => applyFormat('italic')}
          disabled={!editingSegmentId}
          aria-label="Italic"
        >
          <Italic size={18} />
        </button>
        
        <button
          className="toolbar-btn"
          onClick={() => applyFormat('underline')}
          disabled={!editingSegmentId}
          aria-label="Underline"
        >
          <Underline size={18} />
        </button>
      </div>
      
      <Separator orientation="vertical" />
      
      <div className="toolbar-group">
        <ColorPicker
          value={editingSegment?.style?.color || '#000000'}
          onChange={(color) => applyFormat('foreColor', color)}
          disabled={!editingSegmentId}
        />
        
        <ColorPicker
          value={editingSegment?.style?.backgroundColor || '#ffffff'}
          onChange={(color) => applyFormat('backColor', color)}
          disabled={!editingSegmentId}
          label="Background"
        />
      </div>
      
      <Separator orientation="vertical" />
      
      <div className="toolbar-group">
        <Select
          value={editingSegment?.style?.fontSize?.toString() || '16'}
          onValueChange={(value) => applyFormat('fontSize', value)}
          disabled={!editingSegmentId}
        >
          {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(size => (
            <SelectItem key={size} value={size.toString()}>
              {size}px
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
};
```

### 1.4 同步机制实现

#### 文件路径
`/src/features/editor/hooks/use-transcript-sync.ts`

#### 核心逻辑
```typescript
export const useTranscriptSync = () => {
  const { playerRef, fps, timeline } = useStore();
  const { segments, activeSegmentId, setActiveSegmentByTime, selectSegment } = 
    useTranscriptStore();
  
  // 监听播放器时间更新
  useEffect(() => {
    if (!playerRef?.current) return;
    
    const handleTimeUpdate = () => {
      const currentFrame = playerRef.current?.getCurrentFrame() || 0;
      const currentTimeMs = (currentFrame / fps) * 1000;
      setActiveSegmentByTime(currentTimeMs);
    };
    
    // 使用 requestAnimationFrame 优化性能
    let animationFrameId: number;
    const updateLoop = () => {
      handleTimeUpdate();
      animationFrameId = requestAnimationFrame(updateLoop);
    };
    
    // 只在播放时启动循环
    if (playerRef.current.isPlaying()) {
      updateLoop();
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [playerRef, fps, setActiveSegmentByTime]);
  
  // 监听 Transcript 选择事件
  useEffect(() => {
    const handleTranscriptSelect = (event: CustomEvent) => {
      const { segmentId } = event.detail;
      const segment = segments.find(s => s.id === segmentId);
      
      if (segment && playerRef?.current) {
        const targetFrame = (segment.startTime / 1000) * fps;
        playerRef.current.seekTo(targetFrame);
        
        // 同步 Timeline
        if (timeline) {
          timeline.setTime(segment.startTime);
          timeline.scrollToTime(segment.startTime);
        }
      }
    };
    
    window.addEventListener('transcript:select', handleTranscriptSelect);
    return () => {
      window.removeEventListener('transcript:select', handleTranscriptSelect);
    };
  }, [segments, playerRef, fps, timeline]);
  
  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + 上/下箭头：导航段落
      if (e.altKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevSegment = useTranscriptStore.getState()
            .getPreviousSegment(activeSegmentId!);
          if (prevSegment) {
            selectSegment(prevSegment.id);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextSegment = useTranscriptStore.getState()
            .getNextSegment(activeSegmentId!);
          if (nextSegment) {
            selectSegment(nextSegment.id);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeSegmentId, selectSegment]);
};
```

## 2. Editor 集成

### 2.1 修改主编辑器布局

#### 文件
`/src/features/editor/editor.tsx`

#### 修改内容
```typescript
// 添加 import
import TranscriptEditor from './transcript/TranscriptEditor';
import { useTranscriptSync } from './hooks/use-transcript-sync';

// 在组件内添加
const [showTranscript, setShowTranscript] = useState(true);
useTranscriptSync(); // 启用同步

// 修改 JSX 结构
<ResizablePanel className="relative" defaultSize={70}>
  <FloatingControl />
  <ResizablePanelGroup direction="horizontal">
    <ResizablePanel defaultSize={showTranscript ? 70 : 100}>
      <div className="flex h-full flex-1">
        <div style={{...}}>
          <CropModal />
          <Scene ref={sceneRef} stateManager={stateManager} />
        </div>
      </div>
    </ResizablePanel>
    
    {showTranscript && (
      <>
        <ResizableHandle />
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <TranscriptEditor />
        </ResizablePanel>
      </>
    )}
  </ResizablePanelGroup>
</ResizablePanel>
```

## 3. Timeline 集成

### 3.1 创建 Subtitle 轨道类型

#### 文件路径
`/src/features/editor/timeline/items/subtitle.ts`

#### 实现
```typescript
import { Resizable, ResizableProps } from "@designcombo/timeline";

interface SubtitleProps extends ResizableProps {
  text: string;
  speaker?: string;
  segmentId: string;
}

class Subtitle extends Resizable {
  static type = "Subtitle";
  declare segmentId: string;
  declare text: string;
  declare speaker?: string;
  
  constructor(props: SubtitleProps) {
    super(props);
    this.fill = "#4CAF50"; // 绿色表示字幕
    this.segmentId = props.segmentId;
    this.text = props.text;
    this.speaker = props.speaker;
  }
  
  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    
    // 绘制文本预览
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "12px sans-serif";
    
    // 截断过长文本
    const maxWidth = this.width - 16;
    let displayText = this.text;
    
    if (ctx.measureText(displayText).width > maxWidth) {
      while (ctx.measureText(displayText + '...').width > maxWidth && 
             displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      displayText += '...';
    }
    
    ctx.fillText(displayText, -this.width / 2 + 8, 0);
    ctx.restore();
  }
}

export default Subtitle;
```

### 3.2 注册到 Timeline

#### 文件
`/src/features/editor/timeline/items/index.ts`

#### 添加
```typescript
import Subtitle from './subtitle';

// 在 CanvasTimeline.registerItems 中添加
CanvasTimeline.registerItems({
  Text,
  Image,
  Audio,
  Video,
  Subtitle, // 新增
});
```

## 4. 事件系统扩展

### 4.1 添加事件常量

#### 文件
`/src/features/editor/constants/events.ts`

#### 新增
```typescript
// Transcript Events
export const TRANSCRIPT_PREFIX = "TRANSCRIPT_";
export const TRANSCRIPT_SELECT = `${TRANSCRIPT_PREFIX}SELECT`;
export const TRANSCRIPT_UPDATE = `${TRANSCRIPT_PREFIX}UPDATE`;
export const TRANSCRIPT_SYNC = `${TRANSCRIPT_PREFIX}SYNC`;
export const TRANSCRIPT_STYLE_CHANGE = `${TRANSCRIPT_PREFIX}STYLE_CHANGE`;
export const TRANSCRIPT_TIME_ADJUST = `${TRANSCRIPT_PREFIX}TIME_ADJUST`;
```

## 5. 性能优化实现

### 5.1 虚拟滚动

#### 使用 react-window
```bash
pnpm add react-window @types/react-window
```

#### 实现
```typescript
import { FixedSizeList } from 'react-window';

const VirtualTranscriptList = () => {
  const { segments } = useTranscriptStore();
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TranscriptSegment segment={segments[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={segments.length}
      itemSize={100} // 估算的段落高度
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 5.2 防抖和节流

#### 工具函数
```typescript
// utils/performance.ts
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};
```

## 6. 测试用例

### 6.1 单元测试示例

```typescript
// __tests__/transcript-store.test.ts
describe('TranscriptStore', () => {
  it('should select segment and dispatch seek event', () => {
    const { selectSegment, segments } = useTranscriptStore.getState();
    const mockDispatch = jest.fn();
    
    const testSegment = {
      id: 'test-1',
      text: 'Test segment',
      startTime: 1000,
      endTime: 3000
    };
    
    useTranscriptStore.setState({ segments: [testSegment] });
    selectSegment('test-1');
    
    expect(mockDispatch).toHaveBeenCalledWith(PLAYER_SEEK, {
      payload: { time: 1000 }
    });
  });
});
```

## 7. 样式规范

### 7.1 CSS 变量
```css
:root {
  --transcript-bg: var(--background);
  --transcript-border: var(--border);
  --transcript-active: var(--primary);
  --transcript-hover: var(--accent);
  --transcript-text: var(--foreground);
  --transcript-time: var(--muted-foreground);
}
```

### 7.2 响应式设计
```css
/* 移动端适配 */
@media (max-width: 768px) {
  .transcript-editor {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40vh;
    z-index: 100;
  }
}
```

## 8. 错误处理

### 8.1 边界情况
```typescript
// 处理空段落
if (!segment.text?.trim()) {
  return <EmptySegmentPlaceholder />;
}

// 处理时间重叠
const checkTimeOverlap = (segments: TranscriptSegment[]) => {
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].endTime > segments[i + 1].startTime) {
      console.warn(`Time overlap detected between segments ${i} and ${i + 1}`);
    }
  }
};

// 处理超长文本
const MAX_SEGMENT_LENGTH = 5000;
if (text.length > MAX_SEGMENT_LENGTH) {
  text = text.substring(0, MAX_SEGMENT_LENGTH);
  showWarning('Segment text truncated to maximum length');
}
```

## 9. 部署检查清单

- [ ] 所有组件已创建并导出
- [ ] Store 集成到主应用
- [ ] 事件监听器已注册
- [ ] 样式文件已导入
- [ ] Timeline 轨道类型已注册
- [ ] 键盘快捷键已实现
- [ ] 性能优化已应用
- [ ] 错误边界已添加
- [ ] 测试用例通过
- [ ] 文档已更新