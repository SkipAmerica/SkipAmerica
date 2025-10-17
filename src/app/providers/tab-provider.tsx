import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

type TabContextValue = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const TabContext = createContext<TabContextValue | null>(null);

export const TabProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState('discover');
  
  const value = useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);
  
  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
};

export const useTab = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTab must be used within TabProvider');
  return ctx;
};
