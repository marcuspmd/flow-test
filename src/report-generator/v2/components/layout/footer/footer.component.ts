import { BaseComponentV2 } from "../../common/base-component-v2";

export class FooterComponent extends BaseComponentV2 {
  render(): string {
    return this.html`
      <footer class="bg-white p-4 text-center text-sm text-gray-500 border-t border-gray-200">
        <p>Flow Test Report © 2025</p>
      </footer>
    `;
  }
}
