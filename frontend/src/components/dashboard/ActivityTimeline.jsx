import PropTypes from "prop-types";
import "./ActivityTimeline.css";

function ActivityTimeline({ events = [], loading = false }) {
  return (
    <section className="timeline" id="shipments-timeline">
      <p className="section-tag">Ops pulse</p>
      <h2>Field Activity</h2>
      <div className="timeline__list">
        {!events.length && (
          <article className="timeline__item timeline__item--empty">
            <span className="timeline__time">--</span>
            <p>{loading ? "Compiling telemetry..." : "No recent activity"}</p>
          </article>
        )}
        {events.map((event) => (
          <article key={event.id} className={`timeline__item timeline__item--${event.type}`}>
            <span className="timeline__time">{event.timestamp}</span>
            <p>{event.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

ActivityTimeline.propTypes = {
  events: PropTypes.array,
  loading: PropTypes.bool
};

export default ActivityTimeline;
