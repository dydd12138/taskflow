import React, { useEffect, useCallback, useRef } from 'react'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { clipboard } from '@milkdown/plugin-clipboard'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'
import '@milkdown/theme-nord/style.css'

interface NoteEditorProps {
  projectId: number
  initialContent: string
  onSave: (content: string) => void
  saving?: boolean
}

function EditorComponent({ initialContent, onChange }: {
  initialContent: string
  onChange: (markdown: string) => void
}) {
  useEditor((root) => {
    return Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, initialContent)
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onChange(markdown)
        })
      })
      .use(nord)
      .use(commonmark)
      .use(gfm)
      .use(clipboard)
      .use(history)
      .use(listener)
  }, [initialContent])

  return <Milkdown />
}

export default function NoteEditor({ projectId, initialContent, onSave, saving }: NoteEditorProps) {
  const contentRef = useRef(initialContent)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleChange = useCallback((markdown: string) => {
    contentRef.current = markdown
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      onSave(markdown)
    }, 1500)
  }, [onSave])

  // 组件卸载时立即保存未保存的内容
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current)
      if (contentRef.current !== initialContent) {
        onSave(contentRef.current)
      }
    }
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 状态栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '6px 16px',
        borderBottom: '1px solid #F3F4F6',
        fontSize: 12,
        color: '#9CA3AF',
        flexShrink: 0,
      }}>
        <span style={{ marginRight: 'auto', color: '#D1D5DB' }}>
          输入 <kbd style={{ background: '#F3F4F6', padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace' }}>|3x2|</kbd> + 空格插入表格，或直接粘贴 Markdown 表格
        </span>
        {saving ? '保存中...' : '已自动保存'}
      </div>

      {/* 编辑器主体 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
        <MilkdownProvider>
          <EditorComponent
            initialContent={initialContent}
            onChange={handleChange}
          />
        </MilkdownProvider>
      </div>
    </div>
  )
}
