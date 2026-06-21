export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
}

export interface PlotProperties {
  id: string;
  name: string;
  size: number;
  health: number;
}

export interface PlotFeature {
  type: string;
  properties: PlotProperties;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  totalArea: number;
  plots: {
    type: string;
    features: PlotFeature[];
  };
}

export interface Mission {
  id: string;
  plotId: string;
  plotName: string;
  farmName: string;
  areaSize: number;
  crop: string;
  reportId: string;
  reportTitle: string;
  reportPrice: number;
  status: string;
  reportType?: string;
}

export interface PurchasedReport {
  id: string;
  plotId: string;
  reportId: string;
  title: string;
  crop: string;
  completedAt: string;
}

export interface ReportService {
  id: string;
  title: string;
  pricePerHectare: number;
  description: string;
  deliveryTime: string;
}

export interface AgentLog {
  timestamp: string;
  agent: string;
  icon: string;
  message: string;
}

export interface SwarmChat {
  agent: string;
  icon: string;
  text: string;
}
