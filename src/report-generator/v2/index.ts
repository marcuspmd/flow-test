/**
 * @packageDocumentation
 * Index de componentes do Report Generator V2
 *
 * @remarks
 * Este módulo exporta todos os componentes da versão V2 do report generator,
 * que oferece uma arquitetura mais modular e layout moderno inspirado em design systems.
 */

// Tipos e interfaces
export * from "./types";

// Sistema de temas
export * from "./themes";

// Componentes base
export {
  BaseComponentV2,
  ComponentV2,
} from "./components/common/base-component-v2";

// Componentes de layout
export { MainLayoutComponent } from "./components/layout/main-layout.component";
export { DetailsPanelComponent } from "./components/layout/details-panel.component";

// Componentes de navegação
export { NavigationComponent } from "./components/navigation/navigation.component";

// Componentes de test step
export { AssertionsComponent } from "./components/test-step/assertions.component";
export { RequestResponseComponent } from "./components/test-step/request-response.component";

// Imports para a factory
import { MainLayoutComponent } from "./components/layout/main-layout.component";
import { DetailsPanelComponent } from "./components/layout/details-panel.component";
import { NavigationComponent } from "./components/navigation/navigation.component";
import { AssertionsComponent } from "./components/test-step/assertions.component";
import { RequestResponseComponent } from "./components/test-step/request-response.component";
import { ThemeConfig } from "./types";

/**
 * Factory para instanciar componentes V2 com tema
 */
export class ComponentFactoryV2 {
  private theme: ThemeConfig;

  constructor(theme: ThemeConfig) {
    this.theme = theme;
  }

  createMainLayout(): MainLayoutComponent {
    return new MainLayoutComponent(this.theme);
  }

  createDetailsPanel(): DetailsPanelComponent {
    return new DetailsPanelComponent(this.theme);
  }

  createNavigation(): NavigationComponent {
    return new NavigationComponent(this.theme);
  }

  createAssertions(): AssertionsComponent {
    return new AssertionsComponent(this.theme);
  }

  createRequestResponse(): RequestResponseComponent {
    return new RequestResponseComponent(this.theme);
  }
}
