import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

function createReferenceCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  const suffix = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `ML-${Date.now().toString(36).toUpperCase()}-${suffix}`
}

export default function ActionErrorNotice({ action, message }: { action: string; message: string }) {
  const [referenceCode] = useState(createReferenceCode)
  const [copyMessage, setCopyMessage] = useState('')
  const report = `Merrylist issue report\nReference: ${referenceCode}\nAction: ${action}\nWhat happened: ${message}`

  const copyReport = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage('Copy is unavailable here. Open “Report text” below to copy it manually.')
      return
    }
    try {
      await navigator.clipboard.writeText(report)
      setCopyMessage('Report copied. Text it to the list owner.')
    } catch {
      setCopyMessage('The report could not be copied. Open “Report text” below to copy it manually.')
    }
  }

  return <div className="action-error" role="alert">
    <div className="action-error-heading"><strong>Something went wrong</strong><span>Reference: <code>{referenceCode}</code></span></div>
    <p>{message}</p>
    <button className="action-error-copy" type="button" onClick={() => void copyReport()}>
      {copyMessage.startsWith('Report copied') ? <Check size={14} /> : <Copy size={14} />}
      Copy report for texting
    </button>
    {copyMessage && <p className="action-error-copy-status" role="status">{copyMessage}</p>}
    <details><summary>Report text</summary><pre>{report}</pre></details>
  </div>
}
