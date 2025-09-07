/// <reference types="vite/client" />

declare module 'dom-to-image-more' {
  const domtoimage: {
    toPng(node: HTMLElement, options?: {
      width?: number
      height?: number
      style?: Record<string, string>
      cacheBust?: boolean
      quality?: number
      bgcolor?: string
    }): Promise<string>
    toJpeg?(node: HTMLElement, options?: any): Promise<string>
    toBlob?(node: HTMLElement, options?: any): Promise<Blob>
  }
  export default domtoimage
}
