import { useRef } from 'react'
import { useEditorStore, generateId } from '../store/editorStore'
import type { EditorItem, TweetItem } from '../store/editorStore'

type TopBarProps = {
  onExport: () => void
  onShare: () => void
  onOpenInfo: () => void
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function captureVideoSnapshot(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.muted = true
    await video.play().catch(() => {})
    await new Promise<void>((resolve) => {
      if (video.readyState >= 2) return resolve()
      video.onloadeddata = () => resolve()
    })
    video.pause()
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    return { dataUrl, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function parsePublishEmbed(htmlOrUrl: string): { text: string; author?: string; handle?: string; dateText?: string; theme?: 'light' | 'dark'; avatarUrl?: string } {
  const trimmed = htmlOrUrl.trim()
  if (trimmed.startsWith('<')) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(trimmed, 'text/html')
      const block = doc.querySelector('blockquote.twitter-tweet') || doc.querySelector('blockquote')
      if (block) {
        // Prefer the main paragraph for tweet text
        const p = block.querySelector('p')
        const text = (p?.textContent || '').trim() || (block.textContent || '').trim() || trimmed

        // Extract author and handle from the em-dash line, support em dash and regular dash
        const blockText = block.textContent || ''
        const dashMatch = /[—-]\s*([^(@]+)\s*\(@([^\)]+)\)/.exec(blockText)
        const author = dashMatch ? dashMatch[1].trim() : undefined
        const handle = dashMatch ? `@${dashMatch[2].trim()}` : undefined

        // Date is typically the last anchor's text in the blockquote
        const anchors = block.querySelectorAll('a')
        const dateText = anchors.length ? (anchors[anchors.length - 1].textContent || undefined) : undefined

        // Theme: honor data-theme if provided
        const themeAttr = (block as HTMLElement).getAttribute('data-theme')
        const theme = themeAttr === 'dark' ? 'dark' : 'light'

        // Attempt to derive avatar URL from handle via unavatar (no external fetch now; store the URL string)
        let avatarUrl: string | undefined
        if (handle) {
          const h = handle.replace(/^@/, '')
          avatarUrl = `https://unavatar.io/twitter/${encodeURIComponent(h)}`
        }

        return { text, author, handle, dateText, theme, avatarUrl }
      }
    } catch (_) {
      // ignore and fallback below
    }
  }
  // If it's a URL or unrecognized HTML, keep the raw text as the tweet content
  return { text: trimmed }
}

export default function TopBar({ onExport, onShare, onOpenInfo }: TopBarProps) {
  const addItems = useEditorStore((s) => s.addItems)
  const clearAll = useEditorStore((s) => s.clearAll)
  const frameWidth = useEditorStore((s) => s.frameWidth)
  const frameHeight = useEditorStore((s) => s.frameHeight)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const onUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const images: EditorItem[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const dataUrl = await readFileAsDataURL(file)
      const img = new Image()
      img.src = dataUrl
      await new Promise((res) => (img.onload = () => res(null)))
      const maxWidth = frameWidth * 0.8
      const maxHeight = frameHeight * 0.8
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
      const width = Math.max(64, img.width * ratio)
      const height = Math.max(64, img.height * ratio)
      images.push({ id: generateId('img'), type: 'image', src: dataUrl, x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height })
    }
    addItems(images)
  }

  const onUploadVideos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const vids: EditorItem[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) continue
      const { dataUrl, width: vw, height: vh } = await captureVideoSnapshot(file)
      const maxWidth = frameWidth * 0.8
      const maxHeight = frameHeight * 0.8
      const ratio = Math.min(maxWidth / vw, maxHeight / vh, 1)
      const width = Math.max(96, vw * ratio)
      const height = Math.max(96, vh * ratio)
      vids.push({ id: generateId('vid'), type: 'video', snapshotSrc: dataUrl, x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height })
    }
    addItems(vids)
  }

  const onAddTweet = () => {
    const input = prompt('Paste Twitter embed HTML (blockquote) or a tweet URL:')
    if (!input) return
    const parsed = parsePublishEmbed(input)
    const width = Math.min(560, frameWidth * 0.8)
    const height = Math.max(180, Math.min(400, frameHeight * 0.6))
    const tweet: TweetItem = {
      id: generateId('twt'),
      type: 'tweet',
      x: (frameWidth - width) / 2,
      y: (frameHeight - height) / 2,
      width,
      height,
      tweetText: parsed.text,
      author: parsed.author,
      handle: parsed.handle,
      dateText: parsed.dateText,
      theme: parsed.theme,
      avatarUrl: parsed.avatarUrl,
    }
    addItems([tweet])
  }

  return (
    <div className="topbar">
      <div className="actions">
        <button className="btn" aria-label="Upload Images" onClick={() => fileInputRef.current?.click()}>Upload Images</button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => onUploadImages(e.target.files)} />
        <button className="btn" aria-label="Upload Videos" onClick={() => videoInputRef.current?.click()}>Upload Videos</button>
        <input ref={videoInputRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={(e) => onUploadVideos(e.target.files)} />
        <button className="btn" aria-label="Add Tweet" onClick={onAddTweet}>Add Tweet</button>
        <button className="btn" aria-label="Clear Layout" onClick={clearAll}>Clear</button>
      </div>
      <div className="spacer" />
      <div className="actions">
        <button className="btn" aria-label="Information" onClick={onOpenInfo}>Info</button>
        <button className="btn" aria-label="Share on Twitter" onClick={onShare}>Share</button>
        <button className="btn primary" aria-label="Download Image" onClick={onExport}>Download</button>
      </div>
    </div>
  )
}


