import PropTypes from "prop-types";
import "./TopBar.css";

function TopBar({
  searchValue = "",
  onSearchChange,
  onToggleLive,
  onNewShipment,
  onExport,
  onLogout
}) {
  const handleSearchChange = (event) => {
    if (onSearchChange) onSearchChange(event.target.value);
  };

  return (
    <header className="topbar">

      <div className="topbar__actions">
        <div className="topbar__search">
          <input
            type="text"
            placeholder="Search job # or location"
            value={searchValue}
            onChange={handleSearchChange}
          />
        </div>
        {onExport && (
          <button className="btn ghost" type="button" onClick={onExport}>
            Export
          </button>
        )}
        {onLogout && (
          <button className="btn ghost" type="button" onClick={onLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

TopBar.propTypes = {
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  onToggleLive: PropTypes.func,
  onNewShipment: PropTypes.func,
  onExport: PropTypes.func,
  onLogout: PropTypes.func
};

export default TopBar;
