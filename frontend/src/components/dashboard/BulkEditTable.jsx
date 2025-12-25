import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import "./BulkEditTable.css";

const STATUS_OPTIONS = [
  { label: "New", value: "New" },
  { label: "Assigned", value: "Assigned" },
  { label: "Picked up", value: "PickedUp" },
  { label: "Delivered", value: "Delivered" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" }
];

const SHIPMENT_TYPES = [
  { label: "In-House", value: "In-House" },
  { label: "Outsource", value: "Outsource" }
];

function BulkEditTable({ shipments, onUpdate, onRemove }) {
  // Track which shipments are selected for update and their edited values
  const [editedData, setEditedData] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set(shipments.map(s => String(s.id))));
  const [applyToAllField, setApplyToAllField] = useState("");
  const [applyToAllValue, setApplyToAllValue] = useState("");

  const handleToggleSelection = (id) => {
    const key = String(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === shipments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(shipments.map(s => String(s.id))));
    }
  };

  const handleFieldChange = (id, field, value) => {
    const key = String(id);
    setEditedData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value
      }
    }));
  };

  const handleApplyToAll = () => {
    if (!applyToAllField || applyToAllValue === "") return;
    
    const updates = {};
    selectedIds.forEach(id => {
      updates[id] = {
        ...(editedData[id] || {}),
        [applyToAllField]: applyToAllValue
      };
    });
    setEditedData(prev => ({ ...prev, ...updates }));
    setApplyToAllField("");
    setApplyToAllValue("");
  };

  const handleCopyFromFirst = () => {
    if (selectedIds.size === 0) return;
    const firstId = Array.from(selectedIds)[0];
    const firstEdits = editedData[firstId];
    if (!firstEdits) return;

    const updates = {};
    selectedIds.forEach(id => {
      if (id !== firstId) {
        const key = String(id);
        updates[key] = { ...(editedData[key] || {}), ...firstEdits };
      }
    });
    setEditedData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = () => {
    // Only include shipments that are selected and have edits
    const updates = {};
    selectedIds.forEach(id => {
      const idKey = String(id);
      if (editedData[idKey] && Object.keys(editedData[idKey]).length > 0) {
        updates[idKey] = editedData[idKey];
      }
    });
    
    console.log('Submitting updates:', updates);
    console.log('Selected IDs:', Array.from(selectedIds));
    console.log('Edited data:', editedData);
    
    if (Object.keys(updates).length === 0) {
      console.warn('No updates to send - no changes detected');
      return; // No updates to send
    }
    
    onUpdate(updates);
  };

  const hasEdits = Object.keys(editedData).some(idKey => {
    return selectedIds.has(idKey) &&
           editedData[idKey] &&
           Object.keys(editedData[idKey]).length > 0;
  });

  const allSelected = selectedIds.size === shipments.length && shipments.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < shipments.length;

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {selectedIds.size} of {shipments.length} will be updated
        </Typography>
        <Button 
          size="small" 
          variant="outlined" 
          onClick={handleCopyFromFirst}
          disabled={selectedIds.size < 2 || !editedData[Array.from(selectedIds)[0]]}
        >
          Copy first row to all
        </Button>
      </Stack>

      {/* Apply to all section */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
        <Typography variant="subtitle2" gutterBottom>
          Quick apply to all selected rows
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            value={applyToAllField}
            onChange={(e) => setApplyToAllField(e.target.value)}
            sx={{ minWidth: 200 }}
            placeholder="Select field"
          >
            <MenuItem value="">Select field...</MenuItem>
            <MenuItem value="status">Status</MenuItem>
            <MenuItem value="shipment_type">Shipment Type</MenuItem>
            <MenuItem value="lorry_no">Lorry Number</MenuItem>
            <MenuItem value="lorry_company">Lorry Company</MenuItem>
            <MenuItem value="driver_name">Driver Name</MenuItem>
          </TextField>
          
          {applyToAllField === "status" && (
            <TextField
              select
              size="small"
              value={applyToAllValue}
              onChange={(e) => setApplyToAllValue(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              {STATUS_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          )}
          
          {applyToAllField === "shipment_type" && (
            <TextField
              select
              size="small"
              value={applyToAllValue}
              onChange={(e) => setApplyToAllValue(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              {SHIPMENT_TYPES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          )}
          
          {applyToAllField && applyToAllField !== "status" && applyToAllField !== "shipment_type" && (
            <TextField
              size="small"
              value={applyToAllValue}
              onChange={(e) => setApplyToAllValue(e.target.value)}
              placeholder="Enter value"
              sx={{ minWidth: 200 }}
            />
          )}
          
          <Button 
            variant="contained" 
            size="small"
            onClick={handleApplyToAll}
            disabled={!applyToAllField || applyToAllValue === "" || selectedIds.size === 0}
          >
            Apply
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleToggleAll}
                />
              </TableCell>
              <TableCell>Job Ref</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Lorry No</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shipments.map((shipment) => {
              const isSelected = selectedIds.has(shipment.id);
              const edited = editedData[shipment.id] || {};
              const hasRowEdits = Object.keys(edited).length > 0;

              return (
                <TableRow 
                  key={shipment.id}
                  sx={{ 
                    bgcolor: hasRowEdits ? "primary.50" : "inherit",
                    opacity: isSelected ? 1 : 0.5
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleToggleSelection(shipment.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={hasRowEdits ? 600 : 400}>
                      {shipment.booking_reference || shipment.job_number || shipment.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {shipment.customer_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={edited.customer_name ?? shipment.customer_name ?? ""}
                      onChange={(e) => handleFieldChange(shipment.id, "customer_name", e.target.value)}
                      disabled={!isSelected}
                      sx={{ minWidth: 150 }}
                      placeholder={shipment.customer_name || "Enter customer"}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={edited.status ?? shipment.status ?? ""}
                      onChange={(e) => handleFieldChange(shipment.id, "status", e.target.value)}
                      disabled={!isSelected}
                      sx={{ minWidth: 120 }}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={edited.shipment_type ?? shipment.shipment_type ?? ""}
                      onChange={(e) => handleFieldChange(shipment.id, "shipment_type", e.target.value)}
                      disabled={!isSelected}
                      sx={{ minWidth: 110 }}
                    >
                      {SHIPMENT_TYPES.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={edited.lorry_no ?? shipment.lorry_no ?? ""}
                      onChange={(e) => handleFieldChange(shipment.id, "lorry_no", e.target.value)}
                      disabled={!isSelected}
                      placeholder={shipment.lorry_no || "Lorry no"}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={edited.driver_name ?? shipment.driver_name ?? ""}
                      onChange={(e) => handleFieldChange(shipment.id, "driver_name", e.target.value)}
                      disabled={!isSelected}
                      placeholder={shipment.driver_name || "Driver name"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove from selection">
                      <IconButton size="small" onClick={() => onRemove(shipment.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {hasEdits ? `Changes detected - ready to update` : "No changes yet - edit fields above"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {Object.keys(editedData).length} row(s) with edits · {selectedIds.size} row(s) selected
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={!hasEdits || selectedIds.size === 0}
        >
          Update {selectedIds.size} shipment{selectedIds.size !== 1 ? "s" : ""}
        </Button>
      </Stack>
    </Box>
  );
}

BulkEditTable.propTypes = {
  shipments: PropTypes.array.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default BulkEditTable;
