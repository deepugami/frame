import domtoimage from 'dom-to-image-more'

export async function exportNodeToPng(node: HTMLElement, width: number, height: number, filename: string) {
  const dataUrl = await domtoimage.toPng(node, {
    width,
    height,
    style: {
      transform: 'none',
      width: `${width}px`,
      height: `${height}px`,
    },
    cacheBust: true,
    quality: 1,
    bgcolor: '#ffffff',
  })
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
  return dataUrl
}


