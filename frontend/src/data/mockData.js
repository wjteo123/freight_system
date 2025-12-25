export const kpiCards = [
  { id: "shipments", label: "Active Shipments", value: 42, trend: 18, status: "up" },
  { id: "otd", label: "On-Time Delivery", value: "96%", trend: 4, status: "up" },
  { id: "capacity", label: "Fleet Utilization", value: "82%", trend: -6, status: "down" },
  { id: "issues", label: "Exceptions Open", value: 7, trend: 2, status: "neutral" }
];

export const shipmentRows = [
  {
    id: "JOB-2025-104",
    route: "Port Klang → Tuas",
    cargo: "Electronic components",
    status: "in_transit",
    eta: "14:20"
  },
  {
    id: "JOB-2025-098",
    route: "Penang → Johor",
    cargo: "Industrial sensors",
    status: "picked_up",
    eta: "18:40"
  },
  {
    id: "JOB-2025-087",
    route: "KLIA → Cyberjaya",
    cargo: "Cold-chain reagents",
    status: "pending",
    eta: "--"
  },
  {
    id: "JOB-2025-082",
    route: "Senai → Pasir Gudang",
    cargo: "Steel coils",
    status: "delivered",
    eta: "09:30"
  }
];

export const timelineEvents = [
  { id: 1, title: "Shipment JOB-2025-104 cleared SG customs", timestamp: "13:05", type: "checkpoint" },
  { id: 2, title: "New consignment booked: JOB-2025-118", timestamp: "12:47", type: "dispatch" },
  { id: 3, title: "Exception filed: damaged pallet", timestamp: "11:12", type: "alert" },
  { id: 4, title: "Customer updated delivery instructions", timestamp: "10:05", type: "customer" }
];
