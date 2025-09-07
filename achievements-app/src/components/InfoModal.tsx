type InfoModalProps = {
  open: boolean
  onClose: () => void
}

export default function InfoModal({ open, onClose }: InfoModalProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>How to add a Tweet</h2>
        <ol>
          <li>Go to <a href="https://publish.twitter.com/#" target="_blank" rel="noreferrer">publish.twitter.com</a>.</li>
          <li>Paste your tweet URL and choose an embed format.</li>
          <li>Copy the generated embed HTML (or the tweet URL).</li>
          <li>Click "Add Tweet" and paste it here. We render a clean tweet card for export.</li>
        </ol>
        <p>
          Alternatively, take a screenshot of your tweet and upload it as an image.
        </p>
        <h3>Tips</h3>
        <ul>
          <li>Drag to move items inside the frame. Use corner handles to resize.</li>
          <li>Aspect ratio is preserved; items won’t leave the frame.</li>
          <li>Videos export as a still image with a play icon overlay.</li>
          <li>Use Download to save the exact frame content at high quality.</li>
        </ul>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}


