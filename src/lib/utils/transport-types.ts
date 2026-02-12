import {
  Car,
  Plane,
  Bus,
  TrainFront,
  Ship,
  Bike,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export type ActivityTransportType = 'car' | 'plane' | 'bus' | 'train' | 'ship' | 'bike' | 'other';

export type TransportTypeInfo = {
  value: ActivityTransportType;
  label: string;
  icon: LucideIcon;
};

export const transportTypeMap: Record<ActivityTransportType, TransportTypeInfo> = {
  car: { value: 'car', label: 'Carro', icon: Car },
  plane: { value: 'plane', label: 'Avião', icon: Plane },
  bus: { value: 'bus', label: 'Ônibus', icon: Bus },
  train: { value: 'train', label: 'Trem', icon: TrainFront },
  ship: { value: 'ship', label: 'Barco', icon: Ship },
  bike: { value: 'bike', label: 'Bicicleta', icon: Bike },
  other: { value: 'other', label: 'Outro', icon: MoreHorizontal },
};

export const transportTypeList: TransportTypeInfo[] = Object.values(transportTypeMap);

export function getTransportIcon(transportType?: string): LucideIcon {
  if (transportType && transportType in transportTypeMap) {
    return transportTypeMap[transportType as ActivityTransportType].icon;
  }
  return Plane;
}

export function getTransportLabel(transportType?: string): string {
  if (transportType && transportType in transportTypeMap) {
    return transportTypeMap[transportType as ActivityTransportType].label;
  }
  return 'Transporte';
}
