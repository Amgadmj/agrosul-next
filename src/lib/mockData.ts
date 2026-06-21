import { Mission, PurchasedReport } from "@/types/agrosul";

// ============================================================================
//  AGROSUL TECH — MASTER MOCK DATA STORE
//  Contains all field geometry, AI agent personas, swarm debate logs,
//  per-plot vigor & stand statistics, report catalog, pilot equipment,
//  and scenario-driven conversation trees.
// ============================================================================

// ---------------------------------------------------------------------------
//  AI Agent Personas (used by the Multi-Agent Swarm Terminal)
// ---------------------------------------------------------------------------
export const AI_AGENTS = {
  solis: {
    id: "agent-solis",
    name: "Solis",
    role: "Remote Sensing Core",
    tag: "[CORE_SYS]",
    color: "#38BDF8",      // Sky Blue
    description: "Satellite imagery processing — Sentinel-2, CBERS-4A, Landsat-9. Handles NDVI, LST, and EVI band math.",
  },
  fauna: {
    id: "agent-fauna",
    name: "Fauna",
    role: "Agricultural Database",
    tag: "[FARM_DATA]",
    color: "#34D399",      // Mint Green
    description: "Cross-references historical climate, soil maps, and crop phenology databases.",
  },
  ceres: {
    id: "agent-ceres",
    name: "Ceres",
    role: "Agronomist AI",
    tag: "[AGRO_AI]",
    color: "#34D399",      // Mint Green
    description: "PhD-level plant pathology reasoning. Generates actionable agronomic recommendations.",
  },
  aero: {
    id: "agent-aero",
    name: "Aero",
    role: "Airspace & Drone Ops",
    tag: "[DRONE_SWARM]",
    color: "#FBBF24",      // Amber Gold
    description: "Monitors SARPAS/DECEA airspace, battery levels, weather windows, and flight dispatch.",
  },
  hydra: {
    id: "agent-hydra",
    name: "Hydra",
    role: "Hydrology & Irrigation",
    tag: "[HYDRO_SYS]",
    color: "#60A5FA",      // Light Blue
    description: "DEM analysis, drainage mapping, soil moisture modeling, and irrigation scheduling.",
  },
} as const;

// ---------------------------------------------------------------------------
//  Per-Plot Vigor Statistics (NDVI analysis panel)
// ---------------------------------------------------------------------------
export const PLOT_VIGOR_STATS: Record<string, {
  overallHealth: number;
  excellent: { pct: number; color: string };
  good: { pct: number; color: string };
  regular: { pct: number; color: string };
  bareSoil: { pct: number; color: string };
  cropType: string;
  cropStage: string;
  comment: string;
  commentSeverity: "healthy" | "warning" | "critical";
}> = {
  "plot-a": {
    overallHealth: 94,
    excellent: { pct: 28.3, color: "#2563EB" },
    good:      { pct: 58.1, color: "#16A34A" },
    regular:   { pct: 12.4, color: "#EAB308" },
    bareSoil:  { pct: 1.2,  color: "#DC2626" },
    cropType: "Cana-de-Açúcar",
    cropStage: "Cana-Planta (85d)",
    comment: "Vigor Saudável",
    commentSeverity: "healthy",
  },
  "plot-b": {
    overallHealth: 81,
    excellent: { pct: 10.1, color: "#2563EB" },
    good:      { pct: 60.7, color: "#16A34A" },
    regular:   { pct: 27.9, color: "#EAB308" },
    bareSoil:  { pct: 1.3,  color: "#DC2626" },
    cropType: "Cana-de-Açúcar",
    cropStage: "Cana-Soca (120d)",
    comment: "Área de Atenção",
    commentSeverity: "warning",
  },
  "plot-c": {
    overallHealth: 91,
    excellent: { pct: 22.0, color: "#2563EB" },
    good:      { pct: 61.5, color: "#16A34A" },
    regular:   { pct: 14.8, color: "#EAB308" },
    bareSoil:  { pct: 1.7,  color: "#DC2626" },
    cropType: "Soja",
    cropStage: "V6 (42d)",
    comment: "Vigor Saudável",
    commentSeverity: "healthy",
  },
  "plot-d": {
    overallHealth: 74,
    excellent: { pct: 5.2,  color: "#2563EB" },
    good:      { pct: 38.6, color: "#16A34A" },
    regular:   { pct: 41.8, color: "#EAB308" },
    bareSoil:  { pct: 14.4, color: "#DC2626" },
    cropType: "Cana-de-Açúcar",
    cropStage: "Cana-Soca (95d)",
    comment: "Estresse Hídrico Severo",
    commentSeverity: "critical",
  },
};

// ---------------------------------------------------------------------------
//  Per-Plot Stand Count Statistics (Plant counting panel)
// ---------------------------------------------------------------------------
export const PLOT_STAND_STATS: Record<string, {
  plantsPerHa: number;
  totalEstimated: number;
  gapPercentage: number;
  rowSpacing: string;
  plantSpacing: string;
  standStatus: "excellent" | "warning" | "critical";
  auditNote: string;
}> = {
  "plot-a": {
    plantsPerHa: 3650,
    totalEstimated: 438000,
    gapPercentage: 2.1,
    rowSpacing: "1.50m",
    plantSpacing: "0.20m",
    standStatus: "excellent",
    auditNote: "População uniforme. Sem necessidade de replantio.",
  },
  "plot-b": {
    plantsPerHa: 3420,
    totalEstimated: 513000,
    gapPercentage: 21.0,
    rowSpacing: "1.50m",
    plantSpacing: "0.20m",
    standStatus: "warning",
    auditNote: "Falhas detectadas no quadrante NE. Provável competição com Brachiaria.",
  },
  "plot-c": {
    plantsPerHa: 250000,
    totalEstimated: 27500000,
    gapPercentage: 3.8,
    rowSpacing: "0.50m",
    plantSpacing: "0.05m",
    standStatus: "excellent",
    auditNote: "Soja em stand ideal. Densidade dentro da faixa recomendada.",
  },
  "plot-d": {
    plantsPerHa: 2890,
    totalEstimated: 289000,
    gapPercentage: 34.5,
    rowSpacing: "1.50m",
    plantSpacing: "0.20m",
    standStatus: "critical",
    auditNote: "Falhas severas por estresse hídrico. Replantio recomendado em 40% da área.",
  },
};

// ---------------------------------------------------------------------------
//  AI Swarm Multi-Agent Debate Conversations
//  Each key maps to a scenario triggered by plot selection or layer state.
// ---------------------------------------------------------------------------
export const SWARM_DEBATES = {
  // ---- Plot B: Weed Infestation Scenario ----
  weed: [
    {
      agent: "Solis",
      icon: "Solis",
      text: "Setor B apresenta crescimento anômalo em falhas foliares. Padrão não condiz com CTC 4.",
    },
    {
      agent: "Fauna",
      icon: "Fauna",
      text: "Cruzamento com histórico climático aponta alta probabilidade de infestação por Brachiaria decumbens.",
    },
    {
      agent: "Ceres",
      icon: "Ceres",
      text: "Recomendação: Voo mapeador para geração de shapefile de pulverização localizada (Spot Spraying).",
    },
    {
      agent: "Solis",
      icon: "Solis",
      text: "Banda RED EDGE (B5) confirma assinatura espectral divergente na região NE do talhão. Não é cultura principal.",
    },
    {
      agent: "Aero",
      icon: "Aero",
      text: "Janela de voo ideal: amanhã 06:00–09:30. Vento < 12km/h. Solicitar reserva SARPAS.",
    },
    {
      agent: "Ceres",
      icon: "Ceres",
      text: "Se confirmada Brachiaria, aplicar Glifosato 2L/ha via pulverização localizada. Economia estimada: 68% vs. aplicação total.",
    },
  ],

  // ---- Plot D: Moisture Stress Scenario ----
  moisture: [
    {
      agent: "Solis",
      icon: "Solis",
      text: "Temperatura de superfície (LST) anômala no Setor D. Evapotranspiração baixa.",
    },
    {
      agent: "Fauna",
      icon: "Fauna",
      text: "Ondas de calor previstas para a semana. O estresse localizado se tornará severo.",
    },
    {
      agent: "Ceres",
      icon: "Ceres",
      text: "Possível entupimento de linha de irrigação gotejadora ou compactação de solo severa no vale.",
    },
    {
      agent: "Hydra",
      icon: "Hydra",
      text: "Modelo DEM indica acúmulo hídrico no quadrante SW, mas déficit no centro-leste. Verificar válvula V-12.",
    },
    {
      agent: "Solis",
      icon: "Solis",
      text: "NDWI (Normalized Difference Water Index) caiu 0.18 em 14 dias no setor afetado. Tendência crítica.",
    },
    {
      agent: "Aero",
      icon: "Aero",
      text: "Voo térmico (sensor FLIR) pode mapear a extensão exata do estresse. Custo estimado: R$ 280/talhão.",
    },
    {
      agent: "Ceres",
      icon: "Ceres",
      text: "Recomendação urgente: Irrigação de resgate 15mm + coleta de solo para análise de compactação (penetrômetro).",
    },
  ],

  // ---- Plot A: Healthy Sector Scenario ----
  healthy: [
    {
      agent: "Solis",
      icon: "Solis",
      text: "Setor A apresenta NDVI médio de 0.82. Dentro da faixa ótima para cana-planta no estágio atual.",
    },
    {
      agent: "Fauna",
      icon: "Fauna",
      text: "Precipitação acumulada: 48mm nos últimos 15 dias. Ideal para perfilhamento ativo.",
    },
    {
      agent: "Ceres",
      icon: "Ceres",
      text: "Vigor foliar excelente. Recomendação: manter monitoramento quinzenal padrão. Sem intervenção necessária.",
    },
    {
      agent: "Aero",
      icon: "Aero",
      text: "Próximo voo programado em 12 dias. Drone DJI M3M com sensor multiespectral calibrado.",
    },
  ],

  // ---- Plot C: Soy Monitoring Scenario ----
  soy: [
    {
      agent: "Solis",
      icon: "Solis",
      text: "Setor C (Soja V6): Índice de área foliar (LAI) estimado em 3.2. Cobertura do solo atingida.",
    },
    {
      agent: "Fauna",
      icon: "Fauna",
      text: "Previsão: sem geadas até julho. Janela segura para floração (R1) prevista em 18 dias.",
    },
    {
      agent: "Ceres",
      icon: "Ceres",
      text: "Aplicar fungicida preventivo contra ferrugem-asiática em R1. Monitorar armadilhas de esporos.",
    },
    {
      agent: "Hydra",
      icon: "Hydra",
      text: "Balanço hídrico positivo. Solo com 72% da capacidade de campo. Irrigação não necessária.",
    },
  ],

  // ---- General Overview (no plot selected) ----
  general: [
    {
      agent: "Solis",
      icon: "Solis",
      text: "Monitoramento ativo via satélite sobre 2 fazendas. Última passagem Sentinel-2: há 3 dias.",
    },
    {
      agent: "Aero",
      icon: "Aero",
      text: "Pilotos operacionais e aeronaves prontas para decolagem (Baterias 100%).",
    },
    {
      agent: "Ceres",
      icon: "Ceres",
      text: "Aguardando novos ortomosaicos para rodar algoritmos agronômicos.",
    },
    {
      agent: "Fauna",
      icon: "Fauna",
      text: "Base de dados atualizada: 480 ha mapeados, 4 talhões registrados, 2 safras no histórico.",
    },
    {
      agent: "Hydra",
      icon: "Hydra",
      text: "Sistema de irrigação monitorado. Pressão nominal em todas as linhas exceto V-12 (Setor D).",
    },
    {
      agent: "Aero",
      icon: "Aero",
      text: "Espaço aéreo SARPAS/DECEA: liberado até 90m AGL em Ribeirão Preto. Sem restrições temporárias.",
    },
  ],
};

// ---------------------------------------------------------------------------
//  Pilot Equipment & Telemetry
// ---------------------------------------------------------------------------
export const PILOT_EQUIPMENT = {
  drone: {
    model: "DJI Mavic 3 Multispectral",
    serialNumber: "M3M-2024-BR-0847",
    status: "connected" as const,
    firmwareVersion: "v01.00.0700",
    sensors: ["RGB 20MP", "Multispectral 5-band", "RTK GNSS"],
    maxFlightTime: "43 min",
    maxAltitude: "120m AGL",
  },
  batteries: [
    { id: "bat-01", level: 100, cycles: 42, health: "good" as const },
    { id: "bat-02", level: 100, cycles: 38, health: "good" as const },
    { id: "bat-03", level: 78, cycles: 91, health: "fair" as const },
  ],
  storage: {
    total: 256,     // GB
    used: 138,      // GB
    free: 118,      // GB
    format: "microSD V30",
  },
  pilot: {
    name: "João Pedro Silva",
    license: "BR-9831",
    rating: 4.9,
    completedFlights: 142,
    certifications: ["ANAC RPAS", "DJI Enterprise Certified", "SARPAS Registered"],
  },
};

// ---------------------------------------------------------------------------
//  Report Service Catalog
// ---------------------------------------------------------------------------
export const REPORT_CATALOG = [
  {
    id: "PRE_PLANT_TOPO",
    titleKey: "mockData.reports.PRE_PLANT_TOPO.title",
    title: "Topography & Hydrology 3D",
    pricePerHectare: 2.80,
    descKey: "mockData.reports.PRE_PLANT_TOPO.desc",
    description: "Digital Elevation Model (DEM) and Hydrological Flow simulation for pre-planting terraforming.",
    deliveryTime: "24 hours",
    icon: "🗺️",
  },
  {
    id: "STAND_COUNT_EMERGENCE",
    titleKey: "mockData.reports.STAND_COUNT_EMERGENCE.title",
    title: "Stand Count & Gap Analysis",
    pricePerHectare: 1.80,
    descKey: "mockData.reports.STAND_COUNT_EMERGENCE.desc",
    description: "Exact plant population metrics and germination gap mapping for replanting operations.",
    deliveryTime: "12 hours",
    icon: "🌱",
  },
  {
    id: "WEED_SCOUTING",
    titleKey: "mockData.reports.WEED_SCOUTING.title",
    title: "Weed Mapping & Spot Spraying",
    pricePerHectare: 1.50,
    descKey: "mockData.reports.WEED_SCOUTING.desc",
    description: "AI-driven weed cluster detection. Generates Spot-Spraying prescription map for DJI drones and Tractors.",
    deliveryTime: "8 hours",
    icon: "🌾",
  },
  {
    id: "CROP_HEALTH_NDVI",
    titleKey: "mockData.reports.CROP_HEALTH_NDVI.title",
    title: "Vigor & Nutritional VRT",
    pricePerHectare: 1.20,
    descKey: "mockData.reports.CROP_HEALTH_NDVI.desc",
    description: "Multispectral biomass assessment. Outputs Zoned Variable Rate Technology (VRT) Nitrogen prescription.",
    deliveryTime: "6 hours",
    icon: "🔆",
  },
  {
    id: "PEST_DAMAGE_ASSESSMENT",
    titleKey: "mockData.reports.PEST_DAMAGE_ASSESSMENT.title",
    title: "Pest & Disease Damage",
    pricePerHectare: 2.50,
    descKey: "mockData.reports.PEST_DAMAGE_ASSESSMENT.desc",
    description: "Severity heatmap of foliar damage for agricultural insurance and emergency pesticide prescriptions.",
    deliveryTime: "6 hours",
    icon: "🐛",
  },
  {
    id: "HARVEST_ROUTING",
    titleKey: "mockData.reports.HARVEST_ROUTING.title",
    title: "Auto-Steer Harvest Routing",
    pricePerHectare: 3.50,
    descKey: "mockData.reports.HARVEST_ROUTING.desc",
    description: "Computer vision row mapping to generate precise A-B routing lines (ISO-XML) for heavy harvesters.",
    deliveryTime: "18 hours",
    icon: "🚜",
  },
];

// ---------------------------------------------------------------------------
//  Farm & Plot GeoJSON Geometry
// ---------------------------------------------------------------------------
const FARM_PLOTS = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "plot-a", name: "Setor A (Norte)", size: 120, health: 94 },
      geometry: {
        type: "Polygon",
        coordinates: [[[0.1, 0.1], [0.45, 0.1], [0.4, 0.375], [0.1, 0.325], [0.1, 0.1]]],
      },
    },
    {
      type: "Feature",
      properties: { id: "plot-b", name: "Setor B (Leste)", size: 150, health: 81 },
      geometry: {
        type: "Polygon",
        coordinates: [[[0.475, 0.1], [0.95, 0.1], [0.875, 0.4], [0.425, 0.375], [0.475, 0.1]]],
      },
    },
    {
      type: "Feature",
      properties: { id: "plot-c", name: "Setor C (Sul)", size: 110, health: 91 },
      geometry: {
        type: "Polygon",
        coordinates: [[[0.1, 0.36], [0.375, 0.41], [0.3, 0.9], [0.1, 0.9], [0.1, 0.36]]],
      },
    },
    {
      type: "Feature",
      properties: { id: "plot-d", name: "Setor D (Vale)", size: 100, health: 74 },
      geometry: {
        type: "Polygon",
        coordinates: [[[0.41, 0.41], [0.85, 0.43], [0.95, 0.9], [0.325, 0.9], [0.41, 0.41]]],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
//  Master Data Export (backwards-compatible with existing imports)
// ---------------------------------------------------------------------------
export const AGROSUL_DATA = {
  users: [
    {
      id: "usr-prod-01",
      email: "carlos@fazenda.com.br",
      password: "123",
      name: "Carlos Henrique Souza",
      role: "producer",
      company: "Fazenda Santa Elisa",
      avatar: "C",
    },
    {
      id: "usr-pilot-01",
      email: "joao@agrosul.com.br",
      password: "123",
      name: "João Pedro Silva",
      role: "pilot",
      company: "Agrosul Tech (Ribeirão Preto)",
      avatar: "J",
    },
    {
      id: "usr-agent-01",
      email: "swarm@agrosul.com.br",
      password: "123",
      name: "Dr. Marcos Lourenço",
      role: "agents",
      company: "Agrosul Command Center",
      avatar: "M",
    },
  ],

  farms: [
    {
      id: "farm-santa-elisa",
      name: "Fazenda Santa Elisa",
      location: "Ribeirão Preto, SP",
      totalArea: 480,
      plots: FARM_PLOTS,
    },
  ],

  reportCatalog: REPORT_CATALOG,

  pilots: [PILOT_EQUIPMENT.pilot],

  flightQueue: [] as Mission[],
  purchasedReports: [] as PurchasedReport[],

  // Legacy agent logs (system init messages)
  agentLogs: [
    { timestamp: "08:15", agent: "Solis", icon: "Solis", message: "Sentinel-2 L2A Tile (T22KGV) processado. Nuvem 0%." },
    { timestamp: "08:17", agent: "Fauna", icon: "Fauna", message: "Base climática ERA5-Land sincronizada. Precipitação 15d: 48mm." },
    { timestamp: "08:22", agent: "Aero", icon: "Aero", message: "SARPAS/DECEA: Espaço aéreo liberado em Ribeirão Preto (90m AGL)." },
    { timestamp: "08:25", agent: "Hydra", icon: "Hydra", message: "Telemetria de irrigação recebida. Linha V-12 com pressão 18% abaixo do nominal." },
    { timestamp: "08:30", agent: "Ceres", icon: "Ceres", message: "Pipeline ML carregado. Modelos NDVI, LST e NDWI prontos para inferência." },
  ],

  // Context-aware multi-agent conversations keyed by scenario
  swarmDebates: SWARM_DEBATES,

  // Per-plot detailed statistics
  vigorStats: PLOT_VIGOR_STATS,
  standStats: PLOT_STAND_STATS,

  // AI Agent directory
  agents: AI_AGENTS,

  // Pilot equipment
  equipment: PILOT_EQUIPMENT,
};

// ---------------------------------------------------------------------------
//  Helper: Get the appropriate debate topic for a given plot + layer
// ---------------------------------------------------------------------------
export function getDebateTopic(
  plotId: string | null,
  activeLayer: string
): keyof typeof SWARM_DEBATES {
  if (!plotId) return "general";

  switch (plotId) {
    case "plot-b":
      return "weed";
    case "plot-d":
      return "moisture";
    case "plot-a":
      return "healthy";
    case "plot-c":
      return "soy";
    default:
      return "general";
  }
}

// ---------------------------------------------------------------------------
//  Helper: Get vigor stats for a plot (with safe fallback)
// ---------------------------------------------------------------------------
export function getVigorStats(plotId: string) {
  if (Object.prototype.hasOwnProperty.call(PLOT_VIGOR_STATS, plotId)) {
    return PLOT_VIGOR_STATS[plotId];
  }
  return PLOT_VIGOR_STATS["plot-a"];
}

// ---------------------------------------------------------------------------
//  Helper: Get stand count stats for a plot (with safe fallback)
// ---------------------------------------------------------------------------
export function getStandStats(plotId: string) {
  if (Object.prototype.hasOwnProperty.call(PLOT_STAND_STATS, plotId)) {
    return PLOT_STAND_STATS[plotId];
  }
  return PLOT_STAND_STATS["plot-a"];
}
