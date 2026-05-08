import { useDeviceStore, type DeviceType } from './deviceStore'

type DeviceContext = {
  label: string         // "Cão" | "Peixe"
  foodLabel: string     // "Ração" | "Ração de Peixe"
  stockLabel: string    // "Nível de Ração" | "Nível do Estoque"
  feedLabel: string     // "Alimentar Agora" | "Alimentar Agora"
  icon: string          // emoji
  alertLowStock: string
  alertMotor: string
}

const contexts: Record<DeviceType, DeviceContext> = {
  cao: {
    label:        'Cão',
    foodLabel:    'Ração',
    stockLabel:   'Nível de Ração',
    feedLabel:    'Alimentar Agora',
    icon:         '🐾',
    alertLowStock:'Estoque baixo! Reponha a ração.',
    alertMotor:   'Alerta no motor do alimentador.',
  },
  peixe: {
    label:        'Peixe',
    foodLabel:    'Ração de Peixe',
    stockLabel:   'Nível do Estoque',
    feedLabel:    'Alimentar Agora',
    icon:         '🐟',
    alertLowStock:'Estoque baixo! Reponha a ração de peixe.',
    alertMotor:   'Alerta no motor do alimentador.',
  },
}

export function useDeviceContext(): DeviceContext {
  const deviceType = useDeviceStore((s) => s.deviceType)
  return contexts[deviceType]
}
