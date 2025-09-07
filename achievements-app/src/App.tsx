import { useEffect, useRef, useState } from 'react'
import EditorCanvas from './components/EditorCanvas'
import TopBar from './components/TopBar'
import InfoModal from './components/InfoModal'
import { useEditorStore } from './store/editorStore'
import { exportNodeToPng } from './utils/exporter'
import './App.css'

function useContainerScale(containerRef: { current: HTMLElement | null }, frameW: number, frameH: number) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const availW = Math.max(320, el.clientWidth)
      const availH = Math.max(320, el.clientHeight)
      const scaleX = availW / frameW
      const scaleY = availH / frameH
      setScale(Math.min(scaleX, scaleY, 1))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, frameW, frameH])
  return scale
}

function App() {
  const frameWidth = useEditorStore((s) => s.frameWidth)
  const frameHeight = useEditorStore((s) => s.frameHeight)
  const saveToStorage = useEditorStore((s) => s.saveToStorage)
  const loadFromStorage = useEditorStore((s) => s.loadFromStorage)
  const [infoOpen, setInfoOpen] = useState(false)
  const stageWrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scale = useContainerScale(containerRef, frameWidth, frameHeight)
  const userScale = 0.9 // scale down by 60%
  const finalScale = scale * userScale

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe(() => {
      saveToStorage()
    })
    return () => unsubscribe()
  }, [saveToStorage])

  const onExport = async () => {
    const node = stageWrapperRef.current
    if (!node) return
    const prev = node.style.transform
    const prevRadius = (node.style as any).borderRadius
    const prevOverflow = node.style.overflow
    node.style.transform = 'none'
    node.style.borderRadius = '0px'
    node.style.overflow = 'hidden'
    await exportNodeToPng(node, frameWidth, frameHeight, 'achievements.png')
    node.style.transform = prev
    node.style.borderRadius = prevRadius
    node.style.overflow = prevOverflow
  }

  const onShare = () => {
    const text = encodeURIComponent('Celebrating my achievements! #BoundlessAchievements')
    const url = `https://twitter.com/intent/tweet?text=${text}`
    window.open(url, '_blank')
  }

  // Keyboard delete support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId } = useEditorStore.getState()
        if (selectedId) {
          useEditorStore.getState().removeItem(selectedId)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app" style={{ backgroundImage: 'url(/background_main.png)' }}>
      <TopBar onExport={onExport} onShare={onShare} onOpenInfo={() => setInfoOpen(true)} />
      <div className="frameHost" ref={containerRef}>
        <div className="stageOuter" style={{ width: frameWidth * finalScale, height: frameHeight * finalScale }}>
          <div
            className="stageWrapper"
            ref={stageWrapperRef}
            style={{ width: frameWidth, height: frameHeight, transform: `scale(${finalScale})`, transformOrigin: 'top left' }}
          >
            <div className="frameLogo">
              <img src="/frame_logo_small_corner.gif" alt="logo" />
            </div>
            <EditorCanvas onDeselect={() => {}} />
          </div>
        </div>
      </div>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  )
}

export default App
