export type PluginTab = {
  id: string
  title: string
  load: () => Promise<{ default: React.FC }>
}

export const pluginTabs: PluginTab[] = [
  { id: 'files', title: 'Files', load: () => import('./tabs/FilesTab') },
  { id: 'links', title: 'Links & Notes', load: () => import('./tabs/LinksTab') },
  { id: 'anims', title: 'Animations', load: () => import('./tabs/AnimationsTab') },
  { id: 'admin', title: 'Admin', load: () => import('./tabs/AdminTab') }
]
