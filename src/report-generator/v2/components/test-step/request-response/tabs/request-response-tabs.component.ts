/**
 * @packageDocumentation
 * Componente de tabs para request/response
 */

import { BaseComponentV2 } from "../../../common/base-component-v2";
import { ThemeConfig, RequestData, ResponseData } from "../../../../types";
import { RequestDetailsComponent } from "../request/request-details.component";
import { ResponseDetailsComponent } from "../response/response-details.component";
import { CurlCommandComponent } from "../curl/curl-command.component";

export interface RequestResponseTabsComponentProps {
  tabId: string;
  request?: RequestData;
  response?: ResponseData;
  curlCommand?: string;
}

/**
 * Gerencia as tabs de request, response e curl
 */
export class RequestResponseTabsComponent extends BaseComponentV2 {
  private requestComponent: RequestDetailsComponent;
  private responseComponent: ResponseDetailsComponent;
  private curlComponent: CurlCommandComponent;

  constructor(theme: ThemeConfig) {
    super(theme);
    this.requestComponent = new RequestDetailsComponent(theme);
    this.responseComponent = new ResponseDetailsComponent(theme);
    this.curlComponent = new CurlCommandComponent(theme);
  }

  render(): string {
    return ""; // Implementação padrão vazia
  }

  renderTabs(props: RequestResponseTabsComponentProps): string {
    const { tabId, request, response, curlCommand } = props;

    return this.html`
      ${this.renderTabNavigation(tabId, request, response, curlCommand)}
      ${this.renderTabContents(tabId, request, response, curlCommand)}
    `;
  }

  private renderTabNavigation(
    tabId: string,
    request?: RequestData,
    response?: ResponseData,
    curlCommand?: string
  ): string {
    const tabs: string[] = [];

    if (request) {
      tabs.push(this.html`
        <button class="tab-button active" onclick="showTab('${tabId}', 'request')" data-tab="request">
          📤 Request
        </button>
      `);
    }

    if (response) {
      tabs.push(this.html`
        <button class="tab-button" onclick="showTab('${tabId}', 'response')" data-tab="response">
          📥 Response
        </button>
      `);
    }

    if (curlCommand) {
      tabs.push(this.html`
        <button class="tab-button" onclick="showTab('${tabId}', 'curl')" data-tab="curl">
          💻 cURL
        </button>
      `);
    }

    return this.html`
      <div class="flex border-b bg-gray-50" role="tablist">
        ${tabs.join("")}
      </div>
    `;
  }

  private renderTabContents(
    tabId: string,
    request?: RequestData,
    response?: ResponseData,
    curlCommand?: string
  ): string {
    const contents: string[] = [];

    if (request) {
      contents.push(this.html`
        <div id="${tabId}-request" class="tab-content active" role="tabpanel">
          ${this.requestComponent.renderRequest({ request })}
        </div>
      `);
    }

    if (response) {
      contents.push(this.html`
        <div id="${tabId}-response" class="tab-content hidden" role="tabpanel">
          ${this.responseComponent.renderResponse({ response })}
        </div>
      `);
    }

    if (curlCommand) {
      contents.push(this.html`
        <div id="${tabId}-curl" class="tab-content hidden" role="tabpanel">
          ${this.curlComponent.renderCurl({ curlCommand })}
        </div>
      `);
    }

    return this.html`<div class="tab-contents">${contents.join("")}</div>`;
  }
}
