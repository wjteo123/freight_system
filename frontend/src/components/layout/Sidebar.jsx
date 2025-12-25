import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const navItems = [
  { key: "users", label: "Users" },
  { key: "shipments", label: "Shipments" }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__glyph">FT</div>
        <div>
          <p className="sidebar__title">Freight Tower</p>
          <p className="sidebar__subtitle">Control Room</p>
        </div>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink key={item.key} to={`/dashboard#${item.key}`} className="sidebar__link">
            <span>#</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <p>Ops status: <strong>Green</strong></p>
        <small>Next audit 09 Dec, 09:00</small>
      </div>
    </aside>
  );
}

export default Sidebar;
