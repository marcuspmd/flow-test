import { BaseComponentV2 } from "../../common/base-component-v2";

export class NavScriptComponent extends BaseComponentV2 {
  render(): string {
    return this.html`
      <script>
        function selectNavItem(itemId) {
          // Logic to handle item selection
          console.log('Selected:', itemId);
          const event = new CustomEvent('nav-item-selected', { detail: { itemId } });
          document.dispatchEvent(event);
        }

        function toggleNavItem(itemId) {
          // Logic to expand/collapse children
          const item = document.querySelector(\`[data-item-id="\${itemId}"]\`);
          const children = item.querySelector('ul');
          if (children) {
            children.classList.toggle('hidden');
          }
        }
      </script>
    `;
  }
}
