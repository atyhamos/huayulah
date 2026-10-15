import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../ui'

/** Footer with the Check button, portalled so animated (transformed) parents don't break `fixed`. Enter also checks. */
export function CheckBar({ disabled, onCheck, label = 'Check', extra }: { disabled: boolean; onCheck: () => void; label?: string; extra?: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !disabled) {
        e.preventDefault()
        onCheck()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [disabled, onCheck])
  return createPortal(
    <div className="safe-bottom fixed inset-x-0 bottom-0 border-t-2 border-slate-100 bg-surface px-4 pt-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        {extra}
        <Button className="flex-1" disabled={disabled} onClick={onCheck} data-testid="check">
          {label}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
