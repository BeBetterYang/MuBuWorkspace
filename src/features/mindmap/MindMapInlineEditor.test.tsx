import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MindMapInlineEditor } from './MindMapInlineEditor'

function renderEditorWithParentHandlers(value = '第二节点') {
  const parentPointerDown = vi.fn()
  const parentMouseDown = vi.fn()
  const parentClick = vi.fn()
  const parentKeyDown = vi.fn()
  const onDeleteEmpty = vi.fn()
  const onChange = vi.fn()
  const onInsertSibling = vi.fn()
  const onCommit = vi.fn()

  render(
    <div
      onPointerDown={parentPointerDown}
      onMouseDown={parentMouseDown}
      onClick={parentClick}
      onKeyDown={parentKeyDown}
    >
      <MindMapInlineEditor
        value={value}
        onChange={onChange}
        onCommit={onCommit}
        onCancel={vi.fn()}
        onDeleteEmpty={onDeleteEmpty}
        onIndent={vi.fn()}
        onOutdent={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    </div>,
  )

  return {
    input: screen.getByRole('textbox', { name: '编辑节点文本' }) as HTMLTextAreaElement,
    parentPointerDown,
    parentMouseDown,
    parentClick,
    parentKeyDown,
    onDeleteEmpty,
    onChange,
    onInsertSibling,
    onCommit,
  }
}

describe('MindMapInlineEditor', () => {
  it('keeps mouse positioning events inside the editor input', () => {
    const { input, parentPointerDown, parentMouseDown, parentClick } = renderEditorWithParentHandlers()

    expect(input).toHaveClass('nodrag')
    expect(input).toHaveClass('nopan')
    expect(input).toHaveClass('w-auto', 'max-w-[556px]', '[field-sizing:content]')

    fireEvent.pointerDown(input)
    fireEvent.mouseDown(input)
    fireEvent.click(input)

    expect(parentPointerDown).not.toHaveBeenCalled()
    expect(parentMouseDown).not.toHaveBeenCalled()
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('keeps Backspace and Delete inside the input so selected text can be removed natively', () => {
    const { input, parentKeyDown, onDeleteEmpty } = renderEditorWithParentHandlers('408 数据结构')

    input.setSelectionRange(0, input.value.length)
    const backspaceAllowed = fireEvent.keyDown(input, { key: 'Backspace' })

    expect(backspaceAllowed).toBe(true)
    expect(parentKeyDown).not.toHaveBeenCalled()
    expect(onDeleteEmpty).not.toHaveBeenCalled()

    input.setSelectionRange(0, input.value.length)
    const deleteAllowed = fireEvent.keyDown(input, { key: 'Delete' })

    expect(deleteAllowed).toBe(true)
    expect(parentKeyDown).not.toHaveBeenCalled()
    expect(onDeleteEmpty).not.toHaveBeenCalled()
  })

  it('supports multiline text with Shift+Enter without inserting a sibling', () => {
    const { input, onChange, onInsertSibling } = renderEditorWithParentHandlers('第一行')

    expect(fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })).toBe(true)
    fireEvent.change(input, { target: { value: '第一行\n第二行' } })

    expect(onInsertSibling).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith('第一行\n第二行')
  })

  it('commits editing on Enter without inserting a sibling', () => {
    const { input, onCommit, onInsertSibling } = renderEditorWithParentHandlers('节点内容')

    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false)

    expect(onCommit).toHaveBeenCalledOnce()
    expect(onInsertSibling).not.toHaveBeenCalled()
  })
})
