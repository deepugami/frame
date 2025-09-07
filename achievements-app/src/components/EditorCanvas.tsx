import { useEffect, useRef } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Group, Text as KonvaText, Transformer } from 'react-konva'
import useImage from 'use-image'
import { useEditorStore } from '../store/editorStore'
import type { EditorItem, ImageItem, VideoItem, TweetItem } from '../store/editorStore'

type EditorCanvasProps = { onDeselect: () => void }

function PlayOverlay({ width, height }: { width: number; height: number }) {
  const triangleSize = Math.min(width, height) * 0.25
  const overlayRadius = Math.min(width, height) * 0.16
  const centerX = width / 2
  const centerY = height / 2
  return (
    <Group>
      <Rect x={centerX - overlayRadius} y={centerY - overlayRadius} width={overlayRadius * 2} height={overlayRadius * 2} cornerRadius={overlayRadius} fill="rgba(0,0,0,0.5)" />
      {/* Simple triangle play icon using Konva shape via Path-like approach is limited; approximate with wedge via polygon path using Text is not ideal. Use Konva's Path is unavailable without importing Path; using Rects to fake triangle is complex. For simplicity, use Text glyph as play icon. */}
      <KonvaText x={centerX - overlayRadius + 8} y={centerY - overlayRadius + 4} text="▶" fontSize={overlayRadius * 2 - 8} fill="#fff" />
    </Group>
  )
}

function DraggableItem({ item, isSelected, onSelect }: { item: EditorItem; isSelected: boolean; onSelect: () => void }) {
  const updateItem = useEditorStore((s) => s.updateItem)
  const moveWithinBounds = useEditorStore((s) => s.moveItemWithinBounds)
  const removeItem = useEditorStore((s) => s.removeItem)
  const frameWidth = useEditorStore((s) => s.frameWidth)
  const frameHeight = useEditorStore((s) => s.frameHeight)

  const [imgEl] = useImage((item as ImageItem).type === 'image' ? (item as ImageItem).src : (item as VideoItem).type === 'video' ? (item as VideoItem).snapshotSrc : '')
  const [avatarImg] = useImage((item as TweetItem).type === 'tweet' && (item as TweetItem).avatarUrl ? (item as TweetItem).avatarUrl! : '', 'anonymous')

  const handleDragEnd = (e: any) => {
    updateItem(item.id, { x: e.target.x(), y: e.target.y() })
    moveWithinBounds(item.id)
  }

  const handleTransform = (node: any) => {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const newWidth = Math.max(32, item.width * scaleX)
    const newHeight = Math.max(32, item.height * scaleY)
    node.scaleX(1)
    node.scaleY(1)
    updateItem(item.id, { width: newWidth, height: newHeight, x: node.x(), y: node.y() })
    moveWithinBounds(item.id)
  }

  const borderColor = isSelected ? '#4f46e5' : 'transparent'

  const deleteSize = 20
  const onDeleteClick = () => removeItem(item.id)

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    const maxX = frameWidth - item.width
    const maxY = frameHeight - item.height
    return { x: Math.max(0, Math.min(pos.x, maxX)), y: Math.max(0, Math.min(pos.y, maxY)) }
  }

  return (
    <Group
      id={item.id}
      x={item.x}
      y={item.y}
      draggable
      dragBoundFunc={dragBoundFunc}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      onTap={onSelect}
      onTransformEnd={(e) => handleTransform(e.target)}
    >
      {item.type !== 'tweet' && (
        <KonvaImage image={imgEl || undefined} width={item.width} height={item.height} cornerRadius={12} listening={true} />
      )}
      {item.type === 'tweet' && (
        <Group>
          {(() => {
            const t = item as TweetItem
            const isDark = t.theme === 'dark'
            const bg = isDark ? '#0f172a' : '#ffffff'
            const text = isDark ? '#e5e7eb' : '#111827'
            const sub = isDark ? '#9ca3af' : '#6b7280'
            const avatarSize = 32
            const contentTop = 16
            const contentLeft = 16 + (t.avatarUrl ? avatarSize + 12 : 0)
            return (
              <Group>
                <Rect width={item.width} height={item.height} fill={bg} cornerRadius={12} shadowColor="#000" shadowOpacity={0.18} shadowBlur={14} />
                {t.avatarUrl && (
                  <KonvaImage x={16} y={contentTop} width={avatarSize} height={avatarSize} cornerRadius={avatarSize / 2} image={avatarImg || undefined} />
                )}
                <KonvaText x={contentLeft} y={contentTop} text={t.author || ''} fontStyle="bold" fontSize={18} fill={text} />
                <KonvaText x={contentLeft} y={contentTop + 24} text={t.handle || ''} fontSize={14} fill={sub} />
                <KonvaText x={16} y={contentTop + 52} width={item.width - 32} text={t.tweetText} fontSize={16} fill={text} />
                {t.dateText && (
                  <KonvaText x={16} y={item.height - 28} text={t.dateText!} fontSize={12} fill={sub} />
                )}
              </Group>
            )
          })()}
        </Group>
      )}
      {item.type === 'video' && <PlayOverlay width={item.width} height={item.height} />}
      {/* selection border */}
      <Rect width={item.width} height={item.height} stroke={borderColor} strokeWidth={2} cornerRadius={12} listening={false} />
      {isSelected && (
        <Group x={item.width - deleteSize - 6} y={6} onClick={onDeleteClick} onTap={onDeleteClick}>
          <Rect width={deleteSize} height={deleteSize} cornerRadius={6} fill="#ef4444" />
          <KonvaText x={4} y={0} text="✕" fontSize={14} fill="#fff" />
        </Group>
      )}
    </Group>
  )
}

function SelectionTransformer({ selectedId }: { selectedId: string | null }) {
  const transformerRef = useRef<any>(null)
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const stage = transformer.getStage()
    if (!stage) return
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedId])
  return <Transformer ref={transformerRef} rotateEnabled={false} keepRatio={true} boundBoxFunc={(_oldBox, newBox) => {
    const min = 48
    const width = Math.max(min, newBox.width)
    const height = Math.max(min, newBox.height)
    return { ...newBox, width, height }
  }} />
}

export default function EditorCanvas({ onDeselect }: EditorCanvasProps) {
  const { items, selectedId, setSelected, frameWidth, frameHeight } = useEditorStore()
  const onBackgroundClick = () => {
    setSelected(null)
    onDeselect()
  }
  const [frameImg] = useImage('/frame_bg.jpg')

  return (
    <Stage width={frameWidth} height={frameHeight} style={{ borderRadius: 24, overflow: 'hidden' }}>
      <Layer onClick={onBackgroundClick} onTap={onBackgroundClick}>
        <KonvaImage image={frameImg || undefined} width={frameWidth} height={frameHeight} />
      </Layer>
      <Layer>
        {items.map((item) => (
          <DraggableItem key={item.id} item={item} isSelected={selectedId === item.id} onSelect={() => setSelected(item.id)} />
        ))}
        <SelectionTransformer selectedId={selectedId} />
      </Layer>
    </Stage>
  )
}


