import React from "react";
import {
  List,
  Maximize,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Save,
  Sun,
  X,
} from "lucide-react";

import { toast } from "../../components/common/Toast";
import { useWorkspaceStore } from "../../app/workspaceStore";
import { useSettingsStore } from "./settingsStore";
import type { DefaultViewMode, ThemeMode } from "../../types/settings";

export const SettingsPage: React.FC = () => {
  const settings = useSettingsStore((s) => s.settings);
  const isSaving = useSettingsStore((s) => s.isSaving);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);

  const saveSetting = async (patch: Parameters<typeof updateSettings>[0]) => {
    try {
      await updateSettings(patch);
      toast.success("设置已保存");
    } catch (error) {
      toast.error(`设置保存失败: ${String(error)}`);
    }
  };


  return (
    <section className="settings-page flex h-full flex-col bg-[var(--color-surface-soft)] text-[var(--color-charcoal)] dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-hairline)] bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <Save size={16} className="text-zinc-700 dark:text-zinc-200" />
          <h1 className="text-sm font-semibold">设置</h1>
          {isSaving && (
            <RefreshCw size={13} className="animate-spin text-zinc-400" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setActiveView("editor")}
          aria-label="关闭设置"
          title="关闭面板"
          className="ui-icon-button"
        >
          <X size={16} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <SettingsSection title="编辑">
            <SettingRow title="自动保存" description="关闭后只保留手动保存。">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  checked={settings.autoSaveEnabled}
                  onChange={(event) =>
                    void saveSetting({ autoSaveEnabled: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                />
                {settings.autoSaveEnabled ? "已开启" : "已关闭"}
              </label>
            </SettingRow>

            <SettingRow
              title="自动保存延迟"
              description="编辑停止后等待多久写入当前文件。"
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={100}
                  value={settings.autoSaveIntervalMs}
                  disabled={!settings.autoSaveEnabled}
                  onChange={(event) =>
                    void saveSetting({
                      autoSaveIntervalMs: Number(event.target.value),
                    })
                  }
                  className="w-44 accent-zinc-900 disabled:opacity-40"
                />
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={100}
                  value={settings.autoSaveIntervalMs}
                  disabled={!settings.autoSaveEnabled}
                  onChange={(event) =>
                    void saveSetting({
                      autoSaveIntervalMs: Number(event.target.value),
                    })
                  }
                  className="h-8 w-24 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus:border-zinc-400 disabled:opacity-40"
                />
                <span className="text-xs text-zinc-400">毫秒</span>
              </div>
            </SettingRow>

            <SettingRow
              title="默认打开视图"
              description="新建文档和应用初始加载时使用。"
            >
              <div className="grid w-72 grid-cols-3 gap-1 rounded-md border border-zinc-200 bg-white p-0.5">
                {[
                  { key: "outline", label: "大纲", icon: List },
                  { key: "mindmap", label: "导图", icon: PanelLeftOpen },
                  { key: "split", label: "分屏", icon: PanelLeftOpen },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = settings.defaultViewMode === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        void saveSetting({
                          defaultViewMode: item.key as DefaultViewMode,
                        })
                      }
                      className={`flex h-8 items-center justify-center gap-1 rounded-[4px] text-xs font-medium ${
                        isActive
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-500 hover:bg-zinc-100"
                      }`}
                    >
                      <Icon size={13} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </SettingRow>
          </SettingsSection>

          <SettingsSection title="界面">
            <SettingRow
              title="主题"
              description="控制应用外观，可跟随系统或手动固定。"
            >
              <div className="grid w-72 grid-cols-3 gap-1 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
                {[
                  { key: "system", label: "系统", icon: Monitor },
                  { key: "light", label: "浅色", icon: Sun },
                  { key: "dark", label: "深色", icon: Moon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = settings.theme === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        void saveSetting({ theme: item.key as ThemeMode })
                      }
                      className={`flex h-8 items-center justify-center gap-1 rounded-[4px] text-xs font-medium ${
                        isActive
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon size={13} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </SettingRow>

            <SettingRow
              title="专注模式"
              description="隐藏侧栏、顶部工具栏和状态栏，只保留编辑画布。"
            >
              <div className="grid w-44 grid-cols-2 gap-1 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => void saveSetting({ focusMode: true })}
                  className={`flex h-8 items-center justify-center gap-1 rounded-[4px] text-xs font-medium ${
                    settings.focusMode
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Maximize size={13} />
                  开启
                </button>
                <button
                  type="button"
                  onClick={() => void saveSetting({ focusMode: false })}
                  className={`flex h-8 items-center justify-center gap-1 rounded-[4px] text-xs font-medium ${
                    !settings.focusMode
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  关闭
                </button>
              </div>
            </SettingRow>

            <SettingRow
              title="侧栏默认状态"
              description="下次启动后继续使用同样的展开状态。"
            >
              <div className="grid w-44 grid-cols-2 gap-1 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => void saveSetting({ sidebarCollapsed: false })}
                  className={`flex h-8 items-center justify-center gap-1 rounded-[4px] text-xs font-medium ${
                    !settings.sidebarCollapsed
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <PanelLeftOpen size={13} />
                  展开
                </button>
                <button
                  type="button"
                  onClick={() => void saveSetting({ sidebarCollapsed: true })}
                  className={`flex h-8 items-center justify-center gap-1 rounded-[4px] text-xs font-medium ${
                    settings.sidebarCollapsed
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <PanelLeftClose size={13} />
                  收起
                </button>
              </div>
            </SettingRow>
          </SettingsSection>

        </div>
      </main>
    </section>
  );
};
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-card overflow-hidden dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="border-b border-[var(--color-hairline-soft)] px-5 py-4 text-sm font-semibold text-[var(--color-ink)] dark:border-zinc-800 dark:text-zinc-100">
        {title}
      </div>
      <div className="divide-y divide-[var(--color-hairline-soft)] dark:divide-zinc-800">
        {children}
      </div>
    </section>
  );
}
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {title}
        </div>
        <div className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {description}
        </div>
      </div>
      <div className="md:justify-self-end">{children}</div>
    </div>
  );
}
