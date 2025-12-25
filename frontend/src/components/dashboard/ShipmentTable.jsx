import PropTypes from "prop-types";
import "./ShipmentTable.css";

const statusMap = {
  New: { label: "New", color: "pending" },
  Assigned: { label: "Assigned", color: "picked" },
  PickedUp: { label: "Picked Up", color: "transit" },
  Delivered: { label: "Delivered", color: "delivered" },
  Completed: { label: "Completed", color: "delivered" },
  Cancelled: { label: "Cancelled", color: "cancelled" }
};

function formatCurrency(value) {
  if (value === null || value === undefined) return "--";
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderDocLink(url, label) {
  if (!url) return <span className="doc-chip doc-chip--empty">--</span>;
  const isPdf = url.toLowerCase().endsWith(".pdf");
  const suffix = isPdf ? "PDF" : "Image";
  return (
    <a className={`doc-chip ${isPdf ? "doc-chip--pdf" : "doc-chip--img"}`} href={url} target="_blank" rel="noopener noreferrer">
      {label} ({suffix})
    </a>
  );
}

function ShipmentTable({ shipments = [], loading = false }) {
  return (
    <section className="shipment-table" id="shipments">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Customer</th>
              <th>Pickup → Dropoff</th>
              <th>Type</th>
              <th>Status</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Driver Comm.</th>
              <th>DO #</th>
              <th>Company Inv #</th>
              <th>Creditor Inv #</th>
              <th>POD</th>
              <th>Vendor Bill</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length ? (
              shipments.map((row) => (
                <tr key={row.id}>
                  <td>{row.booking_reference || row.job_number || row.id}</td>
                  <td>{row.customer_name || "--"}</td>
                  <td>
                    <div className="route-cell">
                      <span>{row.collection_from || row.pickup_address || "--"}</span>
                      <span className="route-arrow">→</span>
                      <span>{row.deliver_to || row.dropoff_address || "--"}</span>
                    </div>
                  </td>
                  <td>{row.shipment_type || "--"}</td>
                  <td>
                    <span className={`pill pill--${statusMap[row.status]?.color || "pending"}`}>
                      {statusMap[row.status]?.label || row.status || "--"}
                    </span>
                  </td>
                  <td>{formatCurrency(row.revenue_amount)}</td>
                  <td>{formatCurrency(row.cost_amount)}</td>
                  <td>{formatCurrency(row.driver_commission)}</td>
                  <td>{row.delivery_order_no || "--"}</td>
                  <td>{row.company_invoice_no || "--"}</td>
                  <td>{row.creditor_invoice_no || "--"}</td>
                  <td>{renderDocLink(row.pod_image_url, "POD")}</td>
                  <td>{renderDocLink(row.creditor_invoice_file_url, "Vendor")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13}>{loading ? "Loading shipments..." : "No shipments to display"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ShipmentTable;

ShipmentTable.propTypes = {
  shipments: PropTypes.array,
  loading: PropTypes.bool
};
