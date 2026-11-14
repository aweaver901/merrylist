import { useState } from 'react'
import { Gift } from 'lucide-react'

export default function GiftImage({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  return failedSource === src
    ? <span className="gift-image-fallback" role="img" aria-label={alt || 'Gift photo unavailable'}><Gift size={32} aria-hidden="true" /><span>Photo taking a holiday</span><small>Gift details are still available</small></span>
    : <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSource(src)} />
}
