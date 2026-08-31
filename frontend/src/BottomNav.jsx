import "./App.css";

// Clean SVG icon components
const HomeIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#6366f1" : "none"} stroke={active ? "#6366f1" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const SearchIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366f1" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const BellIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366f1" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const UserIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366f1" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

function BottomNav({ activePage, onNavigate, currentUser }) {

  const items = [
    { id: "feed",    Icon: HomeIcon,   label: "Feed"    },
    { id: "explore", Icon: SearchIcon, label: "Explore" },
    { id: "report",  Icon: null,       label: "",  isPlus: true },
    { id: "alerts",  Icon: BellIcon,   label: "Alerts"  },
    { id: "profile", Icon: UserIcon,   label: "Profile" },
  ];

  const handleClick = (id) => {
    if (!currentUser && !["feed", "explore"].includes(id)) {
      onNavigate("login");
      return;
    }
    onNavigate(id);
  };

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            className={`bottom-nav-item ${item.isPlus ? "bottom-nav-plus" : ""} ${isActive ? "bottom-nav-active" : ""}`}
            onClick={() => handleClick(item.id)}
            aria-label={item.label || "Report Issue"}
          >
            {item.isPlus ? (
              <span className="plus-icon">+</span>
            ) : (
              <>
                <item.Icon active={isActive} />
                <span className="bottom-nav-label">{item.label}</span>
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
