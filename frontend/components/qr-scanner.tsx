"use client"

import * as React from "react"
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser"

interface QrScannerProps {
  onResult: (text: string) => void
  onError?: (err: string) => void
}

export function QrScanner({ onResult, onError }: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const controlsRef = React.useRef<IScannerControls | null>(null)

  React.useEffect(() => {
    const reader = new BrowserQRCodeReader()
    let active = true

    reader.decodeFromConstraints(
      { video: { facingMode: "environment" } },
      videoRef.current!,
      (result, error) => {
        if (!active) return
        if (result) {
          onResult(result.getText())
        } else if (error && !(error.message?.includes("No MultiFormat"))) {
          // silencia erros de frame sem QR code detectado
        }
      }
    ).then(controls => {
      if (!active) { controls.stop(); return }
      controlsRef.current = controls
    }).catch(err => {
      onError?.(err?.message ?? "Não foi possível acessar a câmera.")
    })

    return () => {
      active = false
      controlsRef.current?.stop()
    }
  }, [onResult, onError])

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-square max-w-[280px] mx-auto">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 relative">
          <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl" />
          <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr" />
          <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl" />
          <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-white/40 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
