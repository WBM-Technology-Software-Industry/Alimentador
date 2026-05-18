"use client"

export function LoadingScreen({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-6">
      {/* Logo */}
      <img
        src="https://wbmtechnology.com.br/wp-content/uploads/2024/10/logo041.png"
        alt="WBM Technology"
        className="h-16 w-auto object-contain opacity-90 dark:invert"
      />

      {/* Spinner */}
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground tracking-wide">{message}</p>
    </div>
  )
}
