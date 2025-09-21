import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type {
  ReportData,
  DashboardConfig,
  SuiteResult,
  StepResult,
  UIState,
} from "../types/dashboard.types";

interface ReportContextType {
  reportData: ReportData | null;
  dashboardConfig: DashboardConfig | null;
  uiState: UIState;
  setUIState: (updates: Partial<UIState>) => void;
  setCurrentSuite: (suite: SuiteResult | null) => void;
  setCurrentStep: (step: StepResult | null) => void;
  toggleSidebar: () => void;
  toggleMenu: (menuId: string) => void;
  setTheme: (theme: string) => void;
  loading: boolean;
  error: string | null;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";
const UI_STATE_STORAGE_KEY = "flowtest-ui-state";

interface ReportProviderProps {
  children: ReactNode;
  reportData?: ReportData;
  dashboardConfig?: DashboardConfig;
}

export function ReportProvider({
  children,
  reportData,
  dashboardConfig,
}: ReportProviderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(reportData || null);
  const [config, setConfig] = useState<DashboardConfig | null>(
    dashboardConfig || null
  );

  const getInitialTheme = () => {
    if (typeof window !== "undefined") {
      try {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme) {
          return storedTheme;
        }

        const storedState = localStorage.getItem(UI_STATE_STORAGE_KEY);
        if (storedState) {
          const parsed = JSON.parse(storedState);
          if (typeof parsed?.theme === "string") {
            return parsed.theme;
          }
        }
      } catch (error) {
        console.warn("Failed to recover theme from storage", error);
      }

      if (window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }

      return "light";
    }

    return dashboardConfig?.themes?.default || "light";
  };

  const [uiState, setUIStateInternal] = useState<UIState>(() => ({
    sidebarCollapsed: false,
    activeSection: "overview",
    currentSuite: null,
    currentStep: null,
    theme: getInitialTheme(),
    expandedMenus: [],
  }));

  // Load data on client side if not provided via props
  useEffect(() => {
    if (!data || !config) {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  // Persist UI state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(UI_STATE_STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setUIStateInternal((prev) => ({
            ...prev,
            ...parsed,
            theme: parsed?.theme ?? prev.theme,
            // Don't persist current suite/step as they might not exist in new data
            currentSuite: null,
            currentStep: null,
          }));
        } catch (e) {
          console.warn("Failed to parse saved UI state");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const nextTheme = customEvent.detail;
      if (typeof nextTheme !== "string") {
        return;
      }

      setUIStateInternal((prev) =>
        prev.theme === nextTheme ? prev : { ...prev, theme: nextTheme }
      );
    };

    window.addEventListener("flowtest:theme-change", handleThemeChange);

    return () => {
      window.removeEventListener("flowtest:theme-change", handleThemeChange);
    };
  }, []);

  // Save UI state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        UI_STATE_STORAGE_KEY,
        JSON.stringify({
          sidebarCollapsed: uiState.sidebarCollapsed,
          activeSection: uiState.activeSection,
          theme: uiState.theme,
        })
      );
      localStorage.setItem(THEME_STORAGE_KEY, uiState.theme);
    }
  }, [uiState.sidebarCollapsed, uiState.activeSection, uiState.theme]);

  // Apply theme to document
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", uiState.theme);
    }
  }, [uiState.theme]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load report data
      if (!data) {
        const reportResponse = await fetch("/src/data/latest.json");
        if (!reportResponse.ok) {
          throw new Error("Failed to load report data");
        }
        const reportData = await reportResponse.json();
        setData(reportData);
      }

      // Load dashboard config
      if (!config) {
        const configResponse = await fetch("/src/config/dashboard.json");
        if (!configResponse.ok) {
          throw new Error("Failed to load dashboard config");
        }
        const configData = await configResponse.json();
        setConfig(configData);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const setUIState = (updates: Partial<UIState>) => {
    setUIStateInternal((prev) => ({ ...prev, ...updates }));
  };

  const setCurrentSuite = (suite: SuiteResult | null) => {
    setUIState({ currentSuite: suite, currentStep: null });
  };

  const setCurrentStep = (step: StepResult | null) => {
    setUIState({ currentStep: step });
  };

  const toggleSidebar = () => {
    setUIState({ sidebarCollapsed: !uiState.sidebarCollapsed });
  };

  const setTheme = (theme: string) => {
    setUIState({ theme });
  };

  const toggleMenu = (menuId: string) => {
    setUIStateInternal((prev) => ({
      ...prev,
      expandedMenus: prev.expandedMenus.includes(menuId)
        ? prev.expandedMenus.filter((id) => id !== menuId)
        : [...prev.expandedMenus, menuId],
    }));
  };

  const value: ReportContextType = {
    reportData: data,
    dashboardConfig: config,
    uiState,
    setUIState,
    setCurrentSuite,
    setCurrentStep,
    toggleSidebar,
    toggleMenu,
    setTheme,
    loading,
    error,
  };

  return (
    <ReportContext.Provider value={value}>{children}</ReportContext.Provider>
  );
}

export function useReport() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error("useReport must be used within a ReportProvider");
  }
  return context;
}

// Hook para gerenciar navegação
export function useNavigation() {
  const { uiState, setUIState, dashboardConfig } = useReport();

  const navigateTo = (sectionId: string) => {
    setUIState({ activeSection: sectionId });
  };

  const getActiveNavItem = () => {
    return dashboardConfig?.navigation.find(
      (item) => item.id === uiState.activeSection
    );
  };

  const getBreadcrumbs = () => {
    const activeItem = getActiveNavItem();
    if (!activeItem) return [];

    const breadcrumbs = [activeItem];

    // Add current suite to breadcrumbs if selected
    if (uiState.currentSuite) {
      breadcrumbs.push({
        id: uiState.currentSuite.node_id,
        label: uiState.currentSuite.suite_name,
        route: `/suites/${uiState.currentSuite.node_id}`,
        path: `/suites/${uiState.currentSuite.node_id}`,
        icon: "folder",
      });
    }

    // Add current step to breadcrumbs if selected
    if (uiState.currentStep) {
      breadcrumbs.push({
        id: "step",
        label: uiState.currentStep.step_name,
        route: "#",
        path: "#",
        icon: "play",
      });
    }

    return breadcrumbs;
  };

  return {
    activeSection: uiState.activeSection,
    navigateTo,
    getActiveNavItem,
    getBreadcrumbs,
  };
}
