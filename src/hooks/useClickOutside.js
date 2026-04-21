import { useEffect, useRef } from 'react'

export function useClickOutside(ref, handler) {
  const savedHandler = useRef(handler)
  savedHandler.current = handler
  useEffect(() => {
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) savedHandler.current()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [ref])
}
