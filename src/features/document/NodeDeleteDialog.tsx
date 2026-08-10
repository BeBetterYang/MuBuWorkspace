import React from 'react'
import { Dialog } from '../../components/common/Dialog'

interface NodeDeleteDialogProps {
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export const NodeDeleteDialog: React.FC<NodeDeleteDialogProps> = ({
  message,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog isOpen onClose={onCancel} title="删除节点">
      <div className="space-y-5">
        <p className="text-sm leading-6 text-zinc-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="ui-button ui-button-secondary h-10 min-h-0"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="ui-button ui-button-danger h-10 min-h-0"
            onClick={onConfirm}
          >
            删除
          </button>
        </div>
      </div>
    </Dialog>
  )
}
