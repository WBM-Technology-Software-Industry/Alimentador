import { useDeviceStore, type DeviceType } from './deviceStore'

type DeviceContext = {
  label: string
  foodLabel: string
  stockLabel: string
  feedLabel: string
  icon: string
}

const contexts: Record<DeviceType, DeviceContext> = {
  cao: {
    label:      'Cão',
    foodLabel:  'Ração',
    stockLabel: 'Nível de Ração',
    feedLabel:  'Alimentar Agora',
    icon:       '🐾',
  },
  peixe: {
    label:      'Peixe',
    foodLabel:  'Ração de Peixe',
    stockLabel: 'Nível do Estoque',
    feedLabel:  'Alimentar Agora',
    icon:       '🐟',
  },
}

export function useDeviceContext(): DeviceContext {
  const deviceType = useDeviceStore((s) => s.deviceType)
  return contexts[deviceType]
}
