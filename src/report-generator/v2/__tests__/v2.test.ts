/**
 * @packageDocumentation
 * Teste básico dos componentes V2
 */

import { getTheme, ComponentFactoryV2, defaultTheme } from "../index";
import { ReportGeneratorV2 } from "../report-generator-v2";

describe("Report Generator V2", () => {
  describe("Temas", () => {
    it("deve carregar tema padrão", () => {
      const theme = getTheme("default");
      expect(theme.name).toBe("default");
      expect(theme.colors.primary).toBeDefined();
    });

    it("deve carregar tema escuro", () => {
      const theme = getTheme("dark");
      expect(theme.name).toBe("dark");
      expect(theme.colors.background).toBe("#111827");
    });

    it("deve retornar tema padrão para nome inválido", () => {
      const theme = getTheme("inexistente");
      expect(theme.name).toBe("default");
    });
  });

  describe("ComponentFactory", () => {
    let factory: ComponentFactoryV2;

    beforeEach(() => {
      factory = new ComponentFactoryV2(defaultTheme);
    });

    it("deve criar componente de layout principal", () => {
      const layout = factory.createMainLayout();
      expect(layout).toBeDefined();
      expect(typeof layout.render).toBe("function");
    });

    it("deve criar componente de navegação", () => {
      const navigation = factory.createNavigation();
      expect(navigation).toBeDefined();
      expect(typeof navigation.renderNavigation).toBe("function");
    });

    it("deve criar componente de assertions", () => {
      const assertions = factory.createAssertions();
      expect(assertions).toBeDefined();
      expect(typeof assertions.renderAssertions).toBe("function");
    });
  });

  describe("ReportGeneratorV2", () => {
    let generator: ReportGeneratorV2;

    beforeEach(() => {
      generator = new ReportGeneratorV2();
    });

    it("deve ser criado com configuração padrão", () => {
      expect(generator).toBeDefined();
    });

    it("deve aceitar configuração customizada", () => {
      const customGenerator = new ReportGeneratorV2({
        layout: {
          showSidebar: false,
          sidebarWidth: 400,
          theme: defaultTheme,
          navigation: {
            autoExpand: false,
            showCounters: false,
            showPriorityIcons: false,
            filters: {},
          },
        },
      });

      expect(customGenerator).toBeDefined();
    });
  });
});
