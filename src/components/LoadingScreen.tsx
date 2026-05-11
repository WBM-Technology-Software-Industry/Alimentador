import wbmLogo from '../assets/LOGO-OFC-WBM-2.0.PNG'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#1A1A1A] flex flex-col items-center justify-center gap-6 z-50">
      <img src={wbmLogo} alt="WBM Technology" className="h-16 w-auto" />

      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-gray-400 text-sm">Conectando ao dispositivo...</p>
      </div>
    </div>
  )
}
