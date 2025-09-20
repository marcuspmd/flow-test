import { BaseComponentV2 } from "../../common/base-component-v2";

export class NavScriptComponent extends BaseComponentV2 {
  render(): string {
    return this.html`
      <script>
        function selectNavItem(itemId, options = {}) {
          try {
            // Update URL hash if not already there
            const currentHash = window.location.hash.substring(1);
            if (currentHash !== itemId) {
              window.history.pushState({ nav: itemId }, '', '#' + itemId);
            }

            // Update state
            window.reportV2State = window.reportV2State || {};
            window.reportV2State.selectedItemId = itemId;

            // Call the main content update functions
            if (typeof window.reportV2UpdateContent === 'function') {
              window.reportV2UpdateContent(itemId);
            }
            if (typeof window.reportV2EnsureExpanded === 'function') {
              window.reportV2EnsureExpanded(itemId);
            }

            // Update navigation UI - remove previous active states
            document.querySelectorAll('.nav-item a').forEach(link => {
              link.classList.remove('bg-blue-100', 'text-blue-900', 'font-semibold');
            });

            // Add active state to current item
            const currentLink = document.querySelector(\`[onclick*="selectNavItem('\${itemId}')"]\`);
            if (currentLink) {
              currentLink.classList.add('bg-blue-100', 'text-blue-900', 'font-semibold');
            }

            // Auto-collapse sidebar on mobile
            if (window.innerWidth <= 768 && typeof window.toggleSidebar === 'function') {
              window.toggleSidebar(true);
            }

            // Scroll to selected item with smooth behavior
            if (options.behavior === 'smooth') {
              const targetElement = document.querySelector(\`[data-item-id="\${itemId}"]\`);
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }

            console.log('✅ Successfully navigated to:', itemId);
          } catch (error) {
            console.error('❌ Error in selectNavItem:', error);
          }
        }

        function toggleNavItem(itemId) {
          try {
            const item = document.querySelector(\`[data-item-id="\${itemId}"]\`);
            if (!item) return;

            const children = item.querySelector('ul');
            const toggleIcon = item.querySelector('.toggle-icon');

            if (children) {
              const isHidden = children.classList.contains('hidden');
              children.classList.toggle('hidden');

              // Update toggle icon
              if (toggleIcon) {
                toggleIcon.textContent = isHidden ? '▼' : '▶';
              }
            }
          } catch (error) {
            console.error('❌ Error in toggleNavItem:', error);
          }
        }

        // Theme toggle function
        function toggleTheme() {
          try {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('flow-test-theme', newTheme);

            console.log('🎨 Theme changed to:', newTheme);
          } catch (error) {
            console.error('❌ Error in toggleTheme:', error);
          }
        }

        // Sidebar toggle function for mobile
        function toggleSidebar(forceClose = false) {
          try {
            const overlay = document.getElementById('mobile-sidebar-overlay');
            if (!overlay) return;

            if (forceClose || !overlay.classList.contains('hidden')) {
              overlay.classList.add('hidden');
            } else {
              overlay.classList.remove('hidden');
            }
          } catch (error) {
            console.error('❌ Error in toggleSidebar:', error);
          }
        }

        // Initialize theme from localStorage
        function initializeTheme() {
          try {
            const savedTheme = localStorage.getItem('flow-test-theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
          } catch (error) {
            console.error('❌ Error initializing theme:', error);
          }
        }

        // Filter functions
        function handleGlobalSearch(searchTerm) {
          try {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
              const text = item.textContent.toLowerCase();
              const matches = !searchTerm || text.includes(searchTerm.toLowerCase());
              item.style.display = matches ? '' : 'none';
            });
            console.log('🔍 Global search applied:', searchTerm);
          } catch (error) {
            console.error('❌ Error in global search:', error);
          }
        }

        function handleFilterChange(filterId, value, checked = true) {
          try {
            const filters = window.reportV2State.filters || {};

            if (checked !== undefined) {
              // Checkbox filter
              filters[filterId] = filters[filterId] || [];
              if (checked) {
                if (!filters[filterId].includes(value)) {
                  filters[filterId].push(value);
                }
              } else {
                filters[filterId] = filters[filterId].filter(v => v !== value);
              }
            } else {
              // Text or select filter
              filters[filterId] = value;
            }

            window.reportV2State.filters = filters;
            console.log('🔧 Filter changed:', filterId, value, checked);
          } catch (error) {
            console.error('❌ Error in filter change:', error);
          }
        }

        function applyFilters() {
          try {
            const filters = window.reportV2State.filters || {};

            // Apply status filters
            if (filters.status && filters.status.length > 0) {
              const navItems = document.querySelectorAll('.nav-item');
              navItems.forEach(item => {
                const status = item.dataset.status;
                const matches = filters.status.includes(status);
                item.style.display = matches ? '' : 'none';
              });
            }

            console.log('✅ Filters applied:', filters);
          } catch (error) {
            console.error('❌ Error applying filters:', error);
          }
        }

        function clearFilters() {
          try {
            // Clear filter state
            window.reportV2State.filters = {};

            // Reset all checkboxes and inputs
            document.querySelectorAll('.filters-panel input, .filters-panel select').forEach(input => {
              if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
              } else {
                input.value = '';
              }
            });

            // Show all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
              item.style.display = '';
            });

            console.log('🧹 Filters cleared');
          } catch (error) {
            console.error('❌ Error clearing filters:', error);
          }
        }

        // Auto-initialize theme when DOM loads
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initializeTheme);
        } else {
          initializeTheme();
        }

        // Export functions to global scope
        window.selectNavItem = selectNavItem;
        window.toggleNavItem = toggleNavItem;
        window.toggleTheme = toggleTheme;
        window.toggleSidebar = toggleSidebar;
        window.handleGlobalSearch = handleGlobalSearch;
        window.handleFilterChange = handleFilterChange;
        window.applyFilters = applyFilters;
        window.clearFilters = clearFilters;
      </script>
    `;
  }
}
