import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Skeleton,
  useMediaQuery,
  useTheme
} from "@mui/material";
import Dialog from "@mui/material/Dialog";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MetricCard from "../components/dashboard/MetricCard.jsx";
import ShipmentTable from "../components/dashboard/ShipmentTable.jsx";
import BulkEditTable from "../components/dashboard/BulkEditTable.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { dataApi } from "../services/api";
import { createShipmentsStream } from "../services/socket.js";
import "./DashboardPage.css";

const STATUS_FILTERS = [
  { label: "All status", value: "all" },
  { label: "New", value: "New" },
  { label: "Assigned", value: "Assigned" },
  { label: "Picked up", value: "PickedUp" },
  { label: "Delivered", value: "Delivered" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" }
];

const initialCreateForm = {
  customer_name: "",
  collection_from: "",
  deliver_to: "",
  pickup_date: null,
  delivery_date: null,
  shipment_type: "In-House",
  revenue_amount: "0",
  cost_amount: "0",
  driver_commission: "0",
  lorry_no: "",
  lorry_company: "",
  driver_name: "",
  delivery_order_no: "",
  company_invoice_no: "",
  creditor_invoice_no: "",
  pod_image_url: "",
  creditor_invoice_file_url: "",
  remarks: ""
};

const statusLabelMap = {
  New: "New",
  Assigned: "Assigned",
  PickedUp: "Picked up",
  Delivered: "Delivered",
  Completed: "Completed",
  Cancelled: "Cancelled"
};

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "--";
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function describeFile(url) {
  if (!url) return { label: "--", isPdf: false };
  const lower = url.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  return { label: isPdf ? "PDF" : "Image", isPdf };
}

function normalizeStartOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeEndOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getRangeDates(preset) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  if (preset === "today") return { from: start, to: end };

  if (preset === "week") {
    const day = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { from: weekStart, to: weekEnd };
  }

  if (preset === "month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    return { from: monthStart, to: monthEnd };
  }

  return { from: null, to: null }; // "all" or unknown
}

function formatLiveTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutePad = minutes.toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${hour12}:${minutePad}${ampm} ${day}/${month}/${year}`;
}

function getStatusColor(status) {
  if (status === "Delivered" || status === "Completed") return "success";
  if (status === "Cancelled") return "error";
  if (status === "PickedUp" || status === "Assigned") return "info";
  return "warning";
}

function DashboardPage() {
  const { token, user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const searchInputRef = useRef(null);
  const [shipments, setShipments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [etaFrom, setEtaFrom] = useState(null);
  const [etaTo, setEtaTo] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveState, setLiveState] = useState(token ? "connecting" : "offline");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [uploading, setUploading] = useState({ pod: false, vendor: false });
  const [editingShipment, setEditingShipment] = useState(null);
  const [selectionModel, setSelectionModel] = useState([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [liveNow, setLiveNow] = useState(new Date());
  const [quickRange, setQuickRange] = useState("today");

  const sortShipments = useCallback((items) => {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, []);

  const normalizeShipment = useCallback((item) => ({
    id: item.id,
    booking_reference: item.booking_reference,
    job_number: item.booking_reference,
    customer_name: item.customer_name,
    pickup_address: item.collection_from,
    dropoff_address: item.deliver_to,
    collection_from: item.collection_from,
    deliver_to: item.deliver_to,
    cargo_description: item.remarks,
    pickup_datetime: item.pickup_date,
    dropoff_datetime_est: item.delivery_date,
    pickup_date: item.pickup_date,
    delivery_date: item.delivery_date,
    status: item.status,
    shipment_type: item.shipment_type,
    revenue_amount: item.revenue_amount,
    cost_amount: item.cost_amount,
    driver_commission: item.driver_commission,
    lorry_no: item.lorry_no,
    lorry_company: item.lorry_company,
    driver_name: item.driver_name,
    delivery_order_no: item.delivery_order_no,
    company_invoice_no: item.company_invoice_no,
    creditor_invoice_no: item.creditor_invoice_no,
    pod_image_url: item.pod_image_url,
    creditor_invoice_file_url: item.creditor_invoice_file_url,
    remarks: item.remarks,
    created_at: item.created_at,
    updated_at: item.updated_at,
    updated_by_user_id: item.updated_by_user_id
  }), []);

  const loadShipments = useCallback(async () => {
    if (!token) {
      setShipments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await dataApi.getShipments({ limit: 500 });
      const mapped = (data || []).map(normalizeShipment);
      setShipments(sortShipments(mapped));
    } catch (err) {
      setError(err.message || "Unable to load shipments");
    } finally {
      setLoading(false);
    }
  }, [normalizeShipment, sortShipments, token]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  useEffect(() => {
    const id = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Persist filters to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_filters");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
      if (parsed.search) setSearch(parsed.search);
      if (parsed.quickRange) setQuickRange(parsed.quickRange);
      if (parsed.etaFrom) setEtaFrom(new Date(parsed.etaFrom));
      if (parsed.etaTo) setEtaTo(new Date(parsed.etaTo));
    } catch (_) {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard_filters", JSON.stringify({
      statusFilter,
      search,
      quickRange,
      etaFrom: etaFrom ? etaFrom.toISOString() : null,
      etaTo: etaTo ? etaTo.toISOString() : null
    }));
  }, [etaFrom, etaTo, quickRange, search, statusFilter]);

  // Keyboard: focus search on "/"
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        const tag = target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (quickRange === "custom") return;
    const { from, to } = getRangeDates(quickRange);
    setEtaFrom(from);
    setEtaTo(to);
  }, [quickRange]);

  const upsertShipment = useCallback((incoming) => {
    setShipments((prev) => {
      const next = [...prev];
      const index = next.findIndex((item) => item.id === incoming.id);
      if (index >= 0) {
        next[index] = { ...next[index], ...incoming };
      } else {
        next.unshift(incoming);
      }
      return sortShipments(next);
    });
  }, [sortShipments]);

  const removeShipment = useCallback((shipmentId) => {
    setShipments((prev) => prev.filter((item) => item.id !== shipmentId));
  }, []);

  useEffect(() => {
    if (!token) {
      setLiveState("offline");
      return undefined;
    }

    setLiveState("connecting");
    const source = createShipmentsStream(token);
    source.onopen = () => setLiveState("online");
    source.onerror = () => setLiveState("offline");
    source.onmessage = (event) => {
      if (!event.data) return;
      try {
        const data = JSON.parse(event.data);
        if (data.channel === "shipments" && data.payload) {
          if (data.event === "deleted") {
            removeShipment(data.payload.id);
          } else {
            upsertShipment(normalizeShipment(data.payload));
          }
        }
      } catch (_) {
        // Ignore malformed SSE payloads
      }
    };

    return () => {
      source.close();
    };
  }, [normalizeShipment, removeShipment, token, upsertShipment]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      if (!matchesStatus) return false;

      const term = search.trim().toLowerCase();
      if (term) {
        const searchable = [
          item.job_number,
          item.booking_reference,
          item.customer_name,
          item.pickup_address,
          item.dropoff_address,
          item.cargo_description,
          item.shipment_type,
          item.status,
          item.lorry_no,
          item.lorry_company,
          item.driver_name,
          item.delivery_order_no,
          item.company_invoice_no,
          item.creditor_invoice_no,
          item.remarks,
          item.pickup_date,
          item.delivery_date,
          item.revenue_amount,
          item.cost_amount,
          item.driver_commission
        ]
          .filter((val) => val !== null && val !== undefined)
          .map((val) => String(val))
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(term)) return false;
      }

      const etaDate = item.dropoff_datetime_est ? new Date(item.dropoff_datetime_est) : null;
      if (etaFrom) {
        if (!etaDate || etaDate < normalizeStartOfDay(etaFrom)) return false;
      }
      if (etaTo) {
        if (!etaDate || etaDate > normalizeEndOfDay(etaTo)) return false;
      }
      return true;
    });
  }, [etaFrom, etaTo, search, shipments, statusFilter]);

  const NoRowsOverlay = () => (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 4, px: 2 }} spacing={1}>
      <Typography variant="subtitle1">No shipments match these filters</Typography>
      <Typography variant="body2" color="text.secondary">Try clearing filters or pick a different date range.</Typography>
      <Button variant="outlined" size="small" onClick={handleClearFilters}>Clear filters</Button>
    </Stack>
  );

  const LoadingOverlay = () => (
    <Stack spacing={1.5} sx={{ p: 2 }}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <Skeleton key={idx} variant="rounded" height={48} />
      ))}
    </Stack>
  );

  const selectedShipments = useMemo(
    () => shipments.filter((item) => selectionModel.includes(item.id)),
    [selectionModel, shipments]
  );

  const handleRemoveFromBulkEdit = useCallback((id) => {
    setSelectionModel((prev) => prev.filter((itemId) => itemId !== id));
  }, []);

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditShipment = (shipment) => {
    setEditingShipment(shipment);
    setCreateForm({
      customer_name: shipment.customer_name || "",
      collection_from: shipment.collection_from || shipment.pickup_address || "",
      deliver_to: shipment.deliver_to || shipment.dropoff_address || "",
      pickup_date: shipment.pickup_date ? new Date(shipment.pickup_date) : null,
      delivery_date: shipment.delivery_date ? new Date(shipment.delivery_date) : null,
      shipment_type: shipment.shipment_type || "In-House",
      revenue_amount: shipment.revenue_amount ?? "0",
      cost_amount: shipment.cost_amount ?? "0",
      driver_commission: shipment.driver_commission ?? "0",
      lorry_no: shipment.lorry_no || "",
      lorry_company: shipment.lorry_company || "",
      driver_name: shipment.driver_name || "",
      delivery_order_no: shipment.delivery_order_no || "",
      company_invoice_no: shipment.company_invoice_no || "",
      creditor_invoice_no: shipment.creditor_invoice_no || "",
      pod_image_url: shipment.pod_image_url || "",
      creditor_invoice_file_url: shipment.creditor_invoice_file_url || "",
      remarks: shipment.remarks || ""
    });
    setShowCreatePanel(true);
  };

  const handleDeleteShipment = async (shipmentId) => {
    if (!window.confirm("Delete this shipment? This cannot be undone.")) return;
    try {
      await dataApi.deleteShipment(shipmentId);
      removeShipment(shipmentId);
    } catch (err) {
      setError(err.message || "Unable to delete shipment");
    }
  };

  const handleFileUpload = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCreateError("");
    setUploading((prev) => ({ ...prev, [field === "pod_image_url" ? "pod" : "vendor"]: true }));
    try {
      const result = await dataApi.uploadFile(file);
      if (result?.url) {
        setCreateForm((prev) => ({ ...prev, [field]: result.url }));
      }
    } catch (err) {
      setCreateError(err.message || "File upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [field === "pod_image_url" ? "pod" : "vendor"]: false }));
    }
  };

  const handleCreateShipment = async (event) => {
    event.preventDefault();
    setCreateError("");
    setCreateLoading(true);
    try {
      if (!createForm.pickup_date || !createForm.delivery_date) {
        throw new Error("Pickup and delivery dates are required");
      }
      const payload = {
        customer_name: createForm.customer_name,
        collection_from: createForm.collection_from,
        deliver_to: createForm.deliver_to,
        pickup_date: createForm.pickup_date.toISOString().split("T")[0],
        delivery_date: createForm.delivery_date.toISOString().split("T")[0],
        shipment_type: createForm.shipment_type,
        revenue_amount: toNumber(createForm.revenue_amount),
        cost_amount: toNumber(createForm.cost_amount),
        driver_commission: toNumber(createForm.driver_commission),
        lorry_no: createForm.lorry_no || null,
        lorry_company: createForm.lorry_company || null,
        driver_name: createForm.driver_name || null,
        delivery_order_no: createForm.delivery_order_no || null,
        company_invoice_no: createForm.company_invoice_no || null,
        creditor_invoice_no: createForm.creditor_invoice_no || null,
        pod_image_url: createForm.pod_image_url || null,
        creditor_invoice_file_url: createForm.creditor_invoice_file_url || null,
        remarks: createForm.remarks || ""
      };
      if (!isAdmin) {
        delete payload.revenue_amount;
        delete payload.cost_amount;
        delete payload.driver_commission;
      }
      if (editingShipment) {
        const updated = await dataApi.updateShipment(editingShipment.id, payload);
        upsertShipment(normalizeShipment(updated));
      } else {
        const created = await dataApi.createShipment(payload);
        upsertShipment(normalizeShipment(created));
      }
      setShowCreatePanel(false);
      setCreateForm(initialCreateForm);
      setEditingShipment(null);
    } catch (err) {
      setCreateError(err.message || "Unable to create shipment");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExport = () => {
    if (!filteredShipments.length) return;
    const header = [
      "Booking Reference",
      "Customer",
      "Collection From",
      "Deliver To",
      "Pickup Date",
      "Delivery Date",
      "Status",
      "Shipment Type",
      ...(isAdmin ? ["Revenue", "Cost", "Driver Commission"] : []),
      "Lorry No",
      "Lorry Company",
      "Driver Name",
      "Delivery Order #",
      "Company Invoice #",
      "Creditor Invoice #",
      "POD URL",
      "Creditor Invoice URL",
      "Remarks"
    ];
    const rows = filteredShipments.map((item) => [
      item.booking_reference || item.job_number || item.id,
      item.customer_name,
      item.collection_from,
      item.deliver_to,
      formatDate(item.pickup_date),
      formatDate(item.delivery_date),
      statusLabelMap[item.status] || item.status,
      item.shipment_type,
      ...(isAdmin ? [
        formatCurrency(item.revenue_amount),
        formatCurrency(item.cost_amount),
        formatCurrency(item.driver_commission)
      ] : []),
      item.lorry_no,
      item.lorry_company,
      item.driver_name,
      item.delivery_order_no,
      item.company_invoice_no,
      item.creditor_invoice_no,
      item.pod_image_url,
      item.creditor_invoice_file_url,
      item.remarks
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipments");
    XLSX.writeFile(workbook, `shipments-export-${Date.now()}.xlsx`);
  };

  const handleLogout = () => {
    logout();
    setShipments([]);
    setStatusFilter("all");
    setSearch("");
    setEtaFrom(null);
    setEtaTo(null);
    setShowCreatePanel(false);
    setCreateForm(initialCreateForm);
  };

  const handleOpenUserMenu = (event) => setUserMenuAnchor(event.currentTarget);
  const handleCloseUserMenu = () => setUserMenuAnchor(null);
  const handleLogoutClick = () => {
    handleCloseUserMenu();
    handleLogout();
  };

  const handleOpenBulkEdit = () => {
    setBulkError("");
    setBulkEditOpen(true);
  };

  const handleBulkUpdate = async (updates) => {
    // updates is an object: { shipmentId: { field: value, ... }, ... }
    if (!Object.keys(updates).length) {
      setBulkError("No changes to apply");
      return;
    }

    setBulkLoading(true);
    setBulkError("");
    try {
      // Update each shipment with its specific changes
      await Promise.all(Object.entries(updates).map(async ([id, payload]) => {
        const updated = await dataApi.updateShipment(id, payload);
        upsertShipment(normalizeShipment(updated));
      }));
      setBulkEditOpen(false);
      setSelectionModel([]);
    } catch (err) {
      setBulkError(err.message || "Unable to bulk update");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setQuickRange("all");
    setEtaFrom(null);
    setEtaTo(null);
  };

  const metrics = useMemo(() => {
    const total = shipments.length;
    const deliveredCount = shipments.filter((s) => s.status === "Delivered" || s.status === "Completed").length;
    const inTransitCount = shipments.filter((s) => s.status === "PickedUp" || s.status === "Assigned").length;
    const activeCount = shipments.filter((s) => !["Delivered", "Completed", "Cancelled"].includes(s.status)).length;
    const etaSoonCount = shipments.filter((s) => {
      if (!s.dropoff_datetime_est) return false;
      const eta = new Date(s.dropoff_datetime_est).getTime();
      if (Number.isNaN(eta)) return false;
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      return eta >= now && eta <= now + sixHours;
    }).length;
    const completionRate = total ? Math.round((deliveredCount / total) * 100) : 0;
    return {
      total,
      deliveredCount,
      inTransitCount,
      activeCount,
      etaSoonCount,
      completionRate
    };
  }, [shipments]);

  const criticalShipments = useMemo(() => {
    const activeStatuses = new Set(["New", "Assigned", "PickedUp"]);
    return [...shipments]
      .filter((item) => activeStatuses.has(item.status))
      .sort((a, b) => {
        const aEta = new Date(a.dropoff_datetime_est || a.created_at || 0).getTime();
        const bEta = new Date(b.dropoff_datetime_est || b.created_at || 0).getTime();
        return aEta - bEta;
      })
      .slice(0, 6);
  }, [shipments]);

  const timelineEvents = useMemo(() => {
    return [...shipments]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .slice(0, 8)
      .map((item) => {
        const type = item.status === "Delivered" || item.status === "Completed"
          ? "customer"
          : item.status === "PickedUp" || item.status === "Assigned"
            ? "dispatch"
            : item.status === "New"
              ? "checkpoint"
              : "alert";
        return {
          id: item.id,
          type,
          title: `${statusLabelMap[item.status] || item.status} · ${item.job_number || item.id}`,
          timestamp: formatTime(item.updated_at || item.pickup_datetime || item.created_at)
        };
      });
  }, [shipments]);

  const completionStatus = metrics.completionRate >= 85 ? "up" : metrics.completionRate >= 60 ? "neutral" : "down";

  const isAdmin = user?.role === "admin";
  const canCreate = user?.role === "admin" || user?.role === "staff";
  const userInitial = (user?.name || user?.email || "U").slice(0, 1).toUpperCase();

  const activeFilterCount = useMemo(() => {
    const status = statusFilter !== "all";
    const searchActive = Boolean(search.trim());
    const dateActive = quickRange !== "all" || etaFrom || etaTo;
    return [status, searchActive, dateActive].filter(Boolean).length;
  }, [etaFrom, etaTo, quickRange, search, statusFilter]);

  const dataGridColumns = useMemo(() => {
    const renderDocChip = (url, label) => {
      const { label: fileLabel, isPdf } = describeFile(url);
      if (!url) {
        return <Typography variant="caption" color="text.secondary">--</Typography>;
      }
      return (
        <Chip
          size="small"
          variant="outlined"
          color={isPdf ? "default" : "primary"}
          label={`${label} (${fileLabel})`}
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          clickable
          sx={{ mr: 0.5, cursor: "pointer" }}
        />
      );
    };

    const columns = [
      {
        field: "job",
        headerName: "Job",
        minWidth: 180,
        flex: 1,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography fontWeight={600}>{row.booking_reference || row.job_number || row.id}</Typography>
            <Typography variant="caption" color="text.secondary">{formatDate(row.created_at)}</Typography>
          </Stack>
        )
      },
      {
        field: "customer_name",
        headerName: "Customer",
        minWidth: 200,
        flex: 1.2,
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography noWrap title={row.customer_name || "--"}>{row.customer_name || "--"}</Typography>
            <Typography variant="caption" color="text.secondary">{row.shipment_type || "--"}</Typography>
          </Stack>
        )
      },
      {
        field: "collection_from",
        headerName: "Route",
        minWidth: 260,
        flex: 1.5,
        renderCell: ({ row }) => (
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography noWrap title={row.collection_from || "--"}>{row.collection_from || "--"}</Typography>
            <Typography noWrap title={row.deliver_to || "--"}>{row.deliver_to || "--"}</Typography>
            <Typography variant="caption" color="text.secondary">
              Pickup {formatDate(row.pickup_date)} · Delivery {formatDate(row.delivery_date)}
            </Typography>
          </Stack>
        )
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        flex: 0.8,
        renderCell: ({ value }) => (
          <Chip
            size="small"
            color={getStatusColor(value)}
            label={statusLabelMap[value] || value || "--"}
          />
        )
      },
      {
        field: "delivery_date",
        headerName: "Dates",
        minWidth: 190,
        flex: 0.9,
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography>Delivery: {formatDate(row.delivery_date)}</Typography>
            <Typography variant="caption" color="text.secondary">Pickup: {formatDate(row.pickup_date)}</Typography>
          </Stack>
        )
      },
      {
        field: "lorry_no",
        headerName: "Fleet / Driver",
        minWidth: 200,
        flex: 1,
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography noWrap title={row.lorry_company || row.lorry_no || "--"}>{row.lorry_no || row.lorry_company || "--"}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap title={row.driver_name || ""}>{row.driver_name || ""}</Typography>
          </Stack>
        )
      },
      {
        field: "revenue_amount",
        headerName: "Finance",
        minWidth: 230,
        flex: 1.2,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack spacing={0.25}>
            <Typography>Revenue: {formatCurrency(row.revenue_amount)}</Typography>
            <Typography variant="caption" color="text.secondary">
              Cost: {formatCurrency(row.cost_amount)} · Driver: {formatCurrency(row.driver_commission)}
            </Typography>
          </Stack>
        )
      },
      {
        field: "documents",
        headerName: "Document #",
        minWidth: 220,
        flex: 1.1,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="caption">DO: {row.delivery_order_no || "--"}</Typography>
            <Typography variant="caption">Inv (Company): {row.company_invoice_no || "--"}</Typography>
            <Typography variant="caption">Inv (Creditor): {row.creditor_invoice_no || "--"}</Typography>
          </Stack>
        )
      },
      {
        field: "attachments",
        headerName: "Files",
        minWidth: 230,
        flex: 1.1,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center">
            {renderDocChip(row.pod_image_url, "POD")}
            {renderDocChip(row.creditor_invoice_file_url, "Vendor")}
          </Stack>
        )
      },
      {
        field: "updated_at",
        headerName: "Updated",
        minWidth: 180,
        flex: 0.9,
        renderCell: ({ value, row }) => (
          <Stack spacing={0.25}>
            <Typography>{formatDate(value || row.created_at)}</Typography>
            <Typography variant="caption" color="text.secondary">{formatTime(value || row.created_at)}</Typography>
          </Stack>
        )
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 160,
        flex: 0.8,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit">
              <span>
                <IconButton size="small" onClick={() => handleEditShipment(row)} disabled={!canCreate}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => handleDeleteShipment(row.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )
      }
    ];

    return isAdmin ? columns : columns.filter((col) => col.field !== "revenue_amount");
  }, [canCreate, handleDeleteShipment, handleEditShipment, isAdmin]);

  const defaultColumnVisibility = useMemo(() => ({
    lorry_no: !isMobile,
    documents: isDesktop,
    attachments: false,
    ...(isAdmin ? { revenue_amount: false } : {})
  }), [isAdmin, isDesktop, isMobile]);

  const [columnVisibilityModel, setColumnVisibilityModel] = useState(defaultColumnVisibility);

  useEffect(() => {
    // Reset visibility when layout breakpoint changes so mobile/desktop defaults stay sensible
    setColumnVisibilityModel(defaultColumnVisibility);
  }, [defaultColumnVisibility]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="dashboard-shell">
        <div className="dashboard-main">
          {error && <div className="banner error">{error}</div>}

          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
            <div>
              <Typography variant="h4">Dashboard</Typography>
            </div>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                color={liveState === "online" ? "success" : liveState === "connecting" ? "warning" : "default"}
                label={` ${formatLiveTimestamp(liveNow)}`}
              />
              <Tooltip title={user?.email || "Account"}>
                <IconButton onClick={handleOpenUserMenu} size="small">
                  <Avatar sx={{ width: 36, height: 36 }}>{userInitial}</Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleCloseUserMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              >
                <MenuItem disabled>{user?.email || "User"}</MenuItem>
                <MenuItem onClick={handleLogoutClick}>Logout</MenuItem>
              </Menu>
            </Stack>
          </Box>

          <section className="metric-grid">
            <MetricCard label="Active loads" value={metrics.activeCount.toLocaleString()} trend={metrics.completionRate} status={completionStatus} />
            <MetricCard label="In transit" value={metrics.inTransitCount.toLocaleString()} trend={metrics.inTransitCount} status="neutral" />
            <MetricCard label="Delivered" value={metrics.deliveredCount.toLocaleString()} trend={metrics.completionRate} status="up" />
          </section>

          <Paper className="filter-row" elevation={0}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
                <FilterAltIcon fontSize="small" />
                <Typography variant="body2">Filters</Typography>
                <Chip
                  size="small"
                  variant={activeFilterCount ? "filled" : "outlined"}
                  color={activeFilterCount ? "primary" : "default"}
                  label={`Filters · ${activeFilterCount}`}
                  onDelete={activeFilterCount ? handleClearFilters : undefined}
                  sx={{ ml: 1 }}
                />
              </Stack>
              <TextField
                size="small"
                label="Search"
                placeholder="Job #, location, cargo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                inputRef={searchInputRef}
                sx={{ minWidth: 220 }}
              />
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                {STATUS_FILTERS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Date range"
                value={quickRange === "custom" ? "custom" : quickRange}
                onChange={(e) => setQuickRange(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This week</MenuItem>
                <MenuItem value="month">This month</MenuItem>
                <MenuItem value="all">All dates</MenuItem>
                <MenuItem value="custom" disabled>Custom (pick below)</MenuItem>
              </TextField>
              <DatePicker
                label="Starting Date"
                value={etaFrom}
                onChange={(value) => { setEtaFrom(value); setQuickRange("custom"); }}
                slotProps={{ textField: { size: "small" } }}
              />
              <DatePicker
                label="Ending Date"
                value={etaTo}
                onChange={(value) => { setEtaTo(value); setQuickRange("custom"); }}
                slotProps={{ textField: { size: "small" } }}
              />
              <Box flexGrow={1} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleClearFilters}>
                  Reset
                </Button>
                {canCreate && (
                  <Button variant="contained" onClick={() => { setEditingShipment(null); setCreateForm(initialCreateForm); setShowCreatePanel(true); }}>
                    New shipment
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>

          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12} lg={12}>
              <Paper className="data-grid-card" elevation={0}>
                <Box className="panel-header">
                  <div>
                    <Typography variant="h5">Shipments</Typography>
                  </div>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                    {selectionModel.length > 0 && (
                      <Chip size="small" color="primary" label={`${selectionModel.length} selected`} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {filteredShipments.length} showing
                    </Typography>
                  </Stack>
                </Box>
                {selectionModel.length > 0 && (
                  <Box sx={{ px: 2, py: 1, bgcolor: "grey.50", borderRadius: 1, mb: 1, display: "flex", alignItems: "center", gap: 1, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <Typography variant="body2" color="text.secondary">{selectionModel.length} selected</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" onClick={handleOpenBulkEdit} disabled={!canCreate}>Bulk edit</Button>
                      <Button size="small" variant="outlined" onClick={handleExport}>Export</Button>
                    </Stack>
                  </Box>
                )}
                <Divider sx={{ mb: 2 }} />
                <DataGrid
                  autoHeight
                  rows={filteredShipments}
                  columns={dataGridColumns}
                  columnVisibilityModel={columnVisibilityModel}
                  onColumnVisibilityModelChange={setColumnVisibilityModel}
                  checkboxSelection
                  rowSelectionModel={selectionModel}
                  onRowSelectionModelChange={(model) => setSelectionModel(model)}
                  density={isMobile ? "compact" : "standard"}
                  rowHeight={68}
                  headerHeight={52}
                  getRowId={(row) => row.id}
                  onRowDoubleClick={({ row }) => handleEditShipment(row)}
                  loading={loading}
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  slots={{
                    noRowsOverlay: NoRowsOverlay,
                    loadingOverlay: LoadingOverlay
                  }}
                  sx={{
                    "& .MuiDataGrid-cell": { fontSize: 15, lineHeight: 1.6 },
                    "& .MuiDataGrid-columnHeaders": { fontSize: 15, fontWeight: 700 },
                    "& .MuiTypography-root": { fontSize: "0.98rem" },
                    "& .MuiTypography-caption": { fontSize: "0.88rem" },
                    "& .MuiDataGrid-row": { minHeight: 68 }
                  }}
                />
              </Paper>
            </Grid>

          </Grid>
        </div>

        <Dialog open={bulkEditOpen} onClose={() => setBulkEditOpen(false)} maxWidth="lg" fullWidth>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Bulk Edit Shipments</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Edit individual rows or apply common values to multiple shipments at once. Only rows with changes will be updated.
            </Typography>
            {bulkError && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: "error.light", color: "error.contrastText", borderRadius: 1 }}>
                {bulkError}
              </Box>
            )}
            {selectedShipments.length > 0 ? (
              <BulkEditTable
                shipments={selectedShipments}
                onUpdate={handleBulkUpdate}
                onRemove={handleRemoveFromBulkEdit}
              />
            ) : (
              <Typography color="text.secondary">No shipments selected</Typography>
            )}
          </Box>
        </Dialog>

        <Dialog open={showCreatePanel} onClose={() => { setShowCreatePanel(false); setEditingShipment(null); }} maxWidth="md" fullWidth fullScreen={isMobile}>
          <Box component="form" onSubmit={handleCreateShipment} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              {editingShipment ? "Edit shipment" : "Create shipment"}
            </Typography>
            {createError && <div className="banner error">{createError}</div>}
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Customer name"
                name="customer_name"
                value={createForm.customer_name}
                onChange={handleCreateChange}
                required
              />
              <TextField
                label="Pickup (collection from)"
                name="collection_from"
                value={createForm.collection_from}
                onChange={handleCreateChange}
                required
                multiline
              />
              <TextField
                label="Dropoff (deliver to)"
                name="deliver_to"
                value={createForm.deliver_to}
                onChange={handleCreateChange}
                required
                multiline
              />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Pickup date"
                    value={createForm.pickup_date}
                    onChange={(value) => setCreateForm((prev) => ({ ...prev, pickup_date: value }))}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Delivery date"
                    value={createForm.delivery_date}
                    onChange={(value) => setCreateForm((prev) => ({ ...prev, delivery_date: value }))}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Shipment type"
                    name="shipment_type"
                    value={createForm.shipment_type}
                    onChange={handleCreateChange}
                    fullWidth
                  >
                    <MenuItem value="In-House">In-House</MenuItem>
                    <MenuItem value="Outsource">Outsource</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Remarks (optional)"
                    name="remarks"
                    value={createForm.remarks}
                    onChange={handleCreateChange}
                    fullWidth
                    multiline
                  />
                </Grid>
              </Grid>
              {isAdmin && (
                <>
                  <Divider>Finance</Divider>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Revenue amount"
                        name="revenue_amount"
                        value={createForm.revenue_amount}
                        onChange={handleCreateChange}
                        type="number"
                        inputProps={{ step: "0.01", min: "0" }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Cost amount"
                        name="cost_amount"
                        value={createForm.cost_amount}
                        onChange={handleCreateChange}
                        type="number"
                        inputProps={{ step: "0.01", min: "0" }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Driver commission"
                        name="driver_commission"
                        value={createForm.driver_commission}
                        onChange={handleCreateChange}
                        type="number"
                        inputProps={{ step: "0.01", min: "0" }}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </>
              )}
              <Divider>Fleet</Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Lorry number"
                    name="lorry_no"
                    value={createForm.lorry_no}
                    onChange={handleCreateChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Lorry company"
                    name="lorry_company"
                    value={createForm.lorry_company}
                    onChange={handleCreateChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Driver name"
                    name="driver_name"
                    value={createForm.driver_name}
                    onChange={handleCreateChange}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Divider>Documents</Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Delivery order #"
                    name="delivery_order_no"
                    value={createForm.delivery_order_no}
                    onChange={handleCreateChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Company invoice #"
                    name="company_invoice_no"
                    value={createForm.company_invoice_no}
                    onChange={handleCreateChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Creditor invoice #"
                    name="creditor_invoice_no"
                    value={createForm.creditor_invoice_no}
                    onChange={handleCreateChange}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Divider>Files (URL)</Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.75}>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={uploading.pod}
                    >
                      {uploading.pod ? "Uploading..." : "Upload POD (image/PDF)"}
                      <input
                        hidden
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(event) => handleFileUpload(event, "pod_image_url")}
                      />
                    </Button>
                    <TextField
                      label="POD URL"
                      name="pod_image_url"
                      value={createForm.pod_image_url}
                      onChange={handleCreateChange}
                      placeholder="https://.../pod.jpg"
                      fullWidth
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Uploaded URL is stored for the record and can be edited.
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.75}>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={uploading.vendor}
                    >
                      {uploading.vendor ? "Uploading..." : "Upload Vendor Invoice (PDF/image)"}
                      <input
                        hidden
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(event) => handleFileUpload(event, "creditor_invoice_file_url")}
                      />
                    </Button>
                    <TextField
                      label="Vendor invoice URL"
                      name="creditor_invoice_file_url"
                      value={createForm.creditor_invoice_file_url}
                      onChange={handleCreateChange}
                      placeholder="https://.../invoice.pdf"
                      fullWidth
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Supports image or PDF. Upload fills the URL automatically.
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
              <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
                <Button variant="text" onClick={() => { setShowCreatePanel(false); setEditingShipment(null); }}>
                  Cancel
                </Button>
                <Button variant="contained" type="submit" disabled={createLoading}>
                  {createLoading ? "Saving..." : editingShipment ? "Update" : "Create"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Dialog>
      </div>
    </LocalizationProvider>
  );
}

export default DashboardPage;
