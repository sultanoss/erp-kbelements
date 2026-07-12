import { DialogComponent } from '@theme/dialog';
import { CartAddEvent, CartUpdateEvent } from '@theme/events';
import { sectionRenderer } from '@theme/section-renderer';

/**
 * A custom element that manages a cart drawer.
 *
 * @extends {DialogComponent}
 */
class CartDrawerComponent extends DialogComponent {
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(CartAddEvent.eventName, this.#handleCartAdd);
    document.addEventListener(CartUpdateEvent.eventName, this.#handleCartChange);
    window.addEventListener('pageshow', this.#handlePageShow);
    this.#ensureMobileCheckout();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(CartAddEvent.eventName, this.#handleCartAdd);
    document.removeEventListener(CartUpdateEvent.eventName, this.#handleCartChange);
    window.removeEventListener('pageshow', this.#handlePageShow);
  }

  #handleCartChange = () => {
    requestAnimationFrame(this.#ensureMobileCheckout);
  };

  #handlePageShow = (event) => {
    if (!event.persisted) return;

    const sectionId = this.querySelector('cart-items-component')?.dataset?.sectionId;
    if (!sectionId) return;

    sectionRenderer.renderSection(sectionId, { cache: false });
  };

  #ensureMobileCheckout = () => {
    const cartItems = this.querySelector('cart-items-component');
    if (!cartItems?.querySelector('.cart-form')) return;
    if (cartItems.querySelector('[data-mobile-checkout-footer]')) return;

    const sourceButton = cartItems.querySelector('.cart-drawer__summary .kb-checkout-btn');
    if (!(sourceButton instanceof HTMLButtonElement)) return;

    const footer = document.createElement('div');
    footer.className = 'kb-cart-mobile-checkout';
    footer.dataset.mobileCheckoutFooter = '';

    const button = sourceButton.cloneNode(true);
    button.id = 'checkout-mobile';
    footer.appendChild(button);
    cartItems.appendChild(footer);
  };

  #handleCartAdd = (event) => {
    // CartAddEvent and CartUpdateEvent intentionally share `cart:update`.
    // Ignore ordinary updates so the update emitted below cannot recurse.
    if (!(event instanceof CartAddEvent)) return;

    const cartItemsComponent = this.querySelector('cart-items-component');
    const sectionId = cartItemsComponent?.dataset?.sectionId;

    if (sectionId) {
      const sectionsData = event?.detail?.data?.sections;
      if (sectionsData?.[sectionId]) {
        this.dispatchEvent(
          new CartUpdateEvent({}, sectionId, {
            itemCount: event?.detail?.data?.itemCount ?? 1,
            source: 'cart-drawer',
            sections: sectionsData,
          })
        );
      } else {
        sectionRenderer.renderSection(sectionId, { cache: false });
      }
    }

    if (this.hasAttribute('auto-open')) {
      this.showDialog();
    }
  };

  open() {
    // Nur neu laden wenn Drawer im leeren State ist aber Cart Items hat
    const dialog = this.querySelector('dialog');
    const isEmpty = dialog?.classList.contains('cart-drawer--empty');

    this.showDialog();

    if (isEmpty) {
      fetch('/cart.js')
        .then(r => r.json())
        .then(cart => {
          if (cart.item_count > 0) {
            const cartItemsComponent = this.querySelector('cart-items-component');
            const sectionId = cartItemsComponent?.dataset?.sectionId;
            if (sectionId) {
              sectionRenderer.renderSection(sectionId, { cache: false });
            }
          }
        })
        .catch(() => {});
    }

    customElements.whenDefined('shopify-payment-terms').then(() => {
      const installmentsContent = document.querySelector('shopify-payment-terms')?.shadowRoot;
      const cta = installmentsContent?.querySelector('#shopify-installments-cta');
      cta?.addEventListener('click', this.closeDialog, { once: true });
    });
  }

  close() {
    this.closeDialog();
  }
}

if (!customElements.get('cart-drawer-component')) {
  customElements.define('cart-drawer-component', CartDrawerComponent);
}
