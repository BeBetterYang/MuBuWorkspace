import React from 'react'
import { toast } from '../../components/common/Toast'
import { useDocumentStore } from '../../features/document/documentStore'
import { useSettingsStore } from '../../features/settings/settingsStore'
import { getServerWorkspace } from '../../services/siweiApi'

export function useAppInitialization() {
  const newDoc = useDocumentStore((s) => s.newDoc)
  const loadDoc = useDocumentStore((s) => s.loadDoc)
  const setViewMode = useDocumentStore((s) => s.setViewMode)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const didInitializeRef = React.useRef(false)

  React.useEffect(() => {
    if (didInitializeRef.current) return
    didInitializeRef.current = true

    void getServerWorkspace()
      .then(async ({ items }) => {
        const requestedDocumentId = new URLSearchParams(window.location.search).get('document')
        const requestedDocument = requestedDocumentId && items.find((item) => item.type === 'document' && item.id === requestedDocumentId)
        const latestDocument = items
          .filter((item) => item.type === 'document')
          .sort((left, right) => right.updatedAt - left.updatedAt)[0]
        if (requestedDocument) await loadDoc(requestedDocument.id)
        else if (latestDocument) await loadDoc(latestDocument.id)
        else await newDoc()
      })
      .catch((error) => toast.error(`加载服务器文档失败: ${String(error)}`))
    void loadSettings()
      .then(() => {
        const defaultViewMode = useSettingsStore.getState().settings.defaultViewMode
        setViewMode(defaultViewMode)
      })
      .catch((error) => {
        toast.error(`加载设置失败: ${String(error)}`)
      })
  }, [loadDoc, loadSettings, newDoc, setViewMode])
}
