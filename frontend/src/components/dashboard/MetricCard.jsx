import "./MetricCard.css";

function MetricCard({ label, value }) {
  return (
    <article className="metric-card">
      <p className="metric-card__label">{label}</p>
      <div className="metric-card__value">{value}</div>
    </article>
  );
}

export default MetricCard;
