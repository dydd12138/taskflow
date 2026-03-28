import AiPanel from '../components/AiPanel'

export default function GlobalChatView() {
  return (
    <div className="flex h-full justify-center bg-white dark:bg-slate-900">
      <div className="w-full max-w-3xl flex flex-col h-full">
        <AiPanel
          contextType="global"
          contextId="global"
          contextLabel="全局"
          fullWidth
        />
      </div>
    </div>
  )
}
