type Props = {
  ep: number   // ep: porcentagem 0-100 (tópico status)
  eg: number   // eg: gramas atual   (tópico status)
  cp: number   // capacidade total em gramas
}

export default function StockGauge({ ep, eg, cp }: Props) {
  const radius = 100
  const stroke = 14
  const normalizedR = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedR
  const sweep = 270
  const dashArray = (circumference * sweep) / 360
  const dashOffset = dashArray - (dashArray * Math.min(ep, 100)) / 100

  // WBM green → amber → red conforme nível
  const color =
    ep > 50 ? '#28CC08'   // brand-600
    : ep > 20 ? '#f59e0b'
    : '#ef4444'

  const kgCurrent = (eg / 1000).toFixed(2)
  const kgTotal   = (cp / 1000).toFixed(1)

  return (
    <div className="flex flex-col items-center">
      <svg width={radius * 2 + stroke} height={radius * 2 + stroke} className="-rotate-[135deg]">
        <circle
          cx={radius + stroke / 2}
          cy={radius + stroke / 2}
          r={normalizedR}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
          strokeDasharray={`${dashArray} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx={radius + stroke / 2}
          cy={radius + stroke / 2}
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

      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: radius - 16 }}>
        <span className="text-4xl font-bold text-gray-800">{Math.round(ep)}%</span>
        <span className="text-sm text-gray-500">{kgCurrent} kg</span>
        <span className="text-xs text-gray-400">de {kgTotal} kg</span>
      </div>
    </div>
  )
}
