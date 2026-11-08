
import type { ReactNode } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({
  children,
  activePage,
  onNavigate,
}: LayoutProps) {
  return (
    <div className="app-layout">
      <Header />

      <div className="app-body">
        <Sidebar
          activePage={activePage}
          onNavigate={onNavigate}
        />

        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
