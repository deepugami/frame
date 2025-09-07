import { create } from 'zustand'
import { produce } from 'immer'

export type EditorItemType = 'image' | 'video' | 'tweet'

export type EditorItemBase = {
  id: string
  type: EditorItemType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export type ImageItem = EditorItemBase & {
  type: 'image'
  src: string // dataURL
}

export type VideoItem = EditorItemBase & {
  type: 'video'
  // We keep only the latest snapshot as dataURL for rendering/export/persistence
  snapshotSrc: string
}

export type TweetItem = EditorItemBase & {
  type: 'tweet'
  tweetText: string
  author?: string
  handle?: string
  dateText?: string
  theme?: 'light' | 'dark'
  avatarUrl?: string
}

export type EditorItem = ImageItem | VideoItem | TweetItem

export type EditorState = {
  frameWidth: number
  frameHeight: number
  items: EditorItem[]
  selectedId: string | null
  addItems: (items: EditorItem[]) => void
  addItem: (item: EditorItem) => void
  updateItem: (id: string, updater: Partial<EditorItem>) => void
  removeItem: (id: string) => void
  setSelected: (id: string | null) => void
  moveItemWithinBounds: (id: string) => void
  loadFromStorage: () => void
  saveToStorage: () => void
  clearAll: () => void
}

const STORAGE_KEY = 'achievements_editor_state_v1'

export const useEditorStore = create<EditorState>((set, get) => ({
  frameWidth: 1536,
  frameHeight: 1024,
  items: [],
  selectedId: null,
  addItems: (newItems) => set(produce<EditorState>((draft) => {
    draft.items.push(...newItems)
  })),
  addItem: (item) => set(produce<EditorState>((draft) => {
    draft.items.push(item)
  })),
  updateItem: (id, updater) => set(produce<EditorState>((draft) => {
    const idx = draft.items.findIndex((i) => i.id === id)
    if (idx !== -1) {
      draft.items[idx] = { ...(draft.items[idx] as EditorItem), ...(updater as Partial<EditorItem>) } as EditorItem
    }
  })),
  removeItem: (id) => set(produce<EditorState>((draft) => {
    draft.items = draft.items.filter((i) => i.id !== id)
    if (draft.selectedId === id) draft.selectedId = null
  })),
  setSelected: (id) => set({ selectedId: id }),
  moveItemWithinBounds: (id) => set(produce<EditorState>((draft) => {
    const item = draft.items.find((i) => i.id === id)
    if (!item) return
    const maxX = draft.frameWidth - item.width
    const maxY = draft.frameHeight - item.height
    if (item.x < 0) item.x = 0
    if (item.y < 0) item.y = 0
    if (item.x > maxX) item.x = maxX
    if (item.y > maxY) item.y = maxY
  })),
  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { items: EditorItem[] }
      set({ items: parsed.items || [] })
    } catch (_) {
      // ignore
    }
  },
  saveToStorage: () => {
    const { items } = get()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }))
    } catch (_) {
      // ignore
    }
  },
  clearAll: () => set({ items: [], selectedId: null })
}))

export function generateId(prefix: string = 'item'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}


