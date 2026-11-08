
import { useState } from "react";
import type { ReactNode } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [activePage, setActivePage] = useState("browse");

  return (
    <div className="app-layout">
      <Header />

      <div className="app-body">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
        />

        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
