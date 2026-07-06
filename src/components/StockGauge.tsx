type Props = {
  ep: number   // ep: porcentagem 0-100 (tópico status)
  eg: number   // eg: gramas atual   (tópico status)
}

export default function StockGauge({ ep, eg }: Props) {
  const radius = 100
  const stroke = 14
  const normalizedR = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedR
  const sweep = 270
  const dashArray = (circumference * sweep) / 360
  const dashOffset = dashArray - (dashArray * Math.min(ep, 100)) / 100
  const size = radius * 2 + stroke

  // WBM green → amber → red conforme nível
  const color =
    ep > 50 ? '#28CC08'   // brand-600
    : ep > 20 ? '#f59e0b'
    : '#ef4444'

  const kgCurrent = (eg / 1000).toFixed(3)

  return (
    <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={normalizedR}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth={stroke}
          strokeDasharray={`${dashArray} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={normalizedR}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dashArray} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{Math.round(ep)}%</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{kgCurrent} kg</span>
      </div>
    </div>
  )
}
