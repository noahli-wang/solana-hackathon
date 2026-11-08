
import {
  LayoutGrid,
  Bookmark,
  BriefcaseBusiness,
  Settings,
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({
  activePage,
  onNavigate,
}: SidebarProps) {
  const navigation = [
    { id: "browse", label: "Browse", icon: LayoutGrid },
    { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
    { id: "my-bounties", label: "My Bounties", icon: BriefcaseBusiness },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="app-sidebar">
      <nav aria-label="Main navigation">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${
                activePage === item.id ? "active" : ""
              }`}
              onClick={() => onNavigate(item.id)}
              aria-current={
                activePage === item.id ? "page" : undefined
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
