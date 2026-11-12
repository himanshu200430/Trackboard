import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext({
  isMobileOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleSidebar: () => {},
});

export const SidebarProvider = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        openSidebar: () => setIsMobileOpen(true),
        closeSidebar: () => setIsMobileOpen(false),
        toggleSidebar: () => setIsMobileOpen((prev) => !prev),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);

export default SidebarContext;

