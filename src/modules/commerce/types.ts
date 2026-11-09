/**
 * TITA Commerce Engine — contrato normalizado de catálogo, carrito y checkout.
 *
 * Estado: INTERFAZ DEFINIDA EN FASE 1. Sin adaptadores implementados.
 *   - ShopifyAdapter: Fase 4 (Admin API para catálogo + Storefront API para carrito).
 *   - VtexAdapter:    Fase 5 (Catalog/Search API + Checkout API orderForm).
 *   - ManualAdapter:  catálogo manual/CSV solo para modo promocional.
 *
 * Principios:
 *  - Las plataformas NO se comportan igual. El contrato expone `capabilities`
 *    y cada adaptador declara lo que soporta en vez de simular lo que no.
 *  - Los importes se representan como enteros en unidades menores + moneda ISO
 *    para evitar errores de coma flotante.
 *  - El contexto comercial (VTEX: salesChannel/seller/región; Shopify: país/idioma
 *    del mercado) viaja explícito en cada llamada.
 *  - Los datos de catálogo pueden venir de caché; las operaciones de carrito
 *    SIEMPRE revalidan precio y disponibilidad en la plataforma.
 */

export type CommercePlatform = "shopify" | "vtex" | "manual";

export interface Money {
  /** Entero en unidades menores (ej. centavos). COP sin decimales usa factor 1 según la plataforma. */
  amountMinor: number;
  currency: string; // ISO 4217
  /** Dígitos decimales de la moneda (COP=0 en VTEX típicamente, USD=2). */
  scale: number;
}

export type Availability =
  | { status: "in_stock"; quantity?: number }
  | { status: "low_stock"; quantity: number }
  | { status: "out_of_stock" }
  | { status: "unknown" };

export interface ProductImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface VariantOption {
  name: string; // "Talla"
  value: string; // "M"
}

export interface ProductVariant {
  /** Shopify: ProductVariant GID. VTEX: skuId. */
  id: string;
  sku: string | null;
  title: string;
  options: VariantOption[];
  price: Money | null;
  compareAtPrice: Money | null;
  availability: Availability;
  image: ProductImage | null;
  /** VTEX: seller que ofrece el SKU en el contexto consultado. */
  sellerId?: string;
}

export interface Product {
  /** Shopify: Product GID. VTEX: productId. */
  id: string;
  platform: CommercePlatform;
  handle: string; // Shopify handle / VTEX linkText
  title: string;
  description: string; // texto plano (HTML de la plataforma se sanea antes)
  vendor: string | null;
  images: ProductImage[];
  options: { name: string; values: string[] }[];
  variants: ProductVariant[];
  /** URL de la ficha en la tienda oficial (modo promocional). */
  storefrontUrl: string;
  fetchedAt: string; // ISO; útil para mostrar frescura del caché
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
  productCount: number | null;
  storefrontUrl: string;
}

/** Contexto comercial de una consulta u operación. */
export interface CommerceContext {
  /** Shopify: país del mercado (ISO 3166-1). */
  country?: string;
  language?: string;
  /** VTEX: política comercial. */
  salesChannel?: string;
  /** VTEX: región / regionId para sellers por geolocalización. */
  regionId?: string;
  postalCode?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CatalogSearchParams {
  query?: string;
  collectionId?: string;
  first?: number; // máx. 50
  cursor?: string | null;
}

export interface CartLine {
  lineId: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  image: ProductImage | null;
  availability: Availability;
}

export interface Cart {
  /** Shopify: Cart GID. VTEX: orderFormId. Opaco para la landing. */
  id: string;
  lines: CartLine[];
  subtotal: Money | null;
  total: Money | null;
  /** Mensajes de la plataforma (precio cambió, sin stock, cantidad ajustada). */
  warnings: CartWarning[];
}

export type CartWarning =
  | { code: "price_changed"; lineId: string }
  | { code: "quantity_adjusted"; lineId: string; available: number }
  | { code: "unavailable"; lineId: string }
  | { code: "platform_message"; text: string };

export interface CartLineInput {
  variantId: string;
  quantity: number;
  /** VTEX: seller del SKU. */
  sellerId?: string;
}

export interface CheckoutHandoff {
  /** URL del checkout oficial de la plataforma. La landing redirige allí. */
  url: string;
  /** VTEX puede requerir cookie checkout.vtex.com=__ofid=<orderFormId> en el dominio de la tienda. */
  strategy: "redirect" | "redirect_with_orderform";
}

export interface ConnectionHealth {
  status: "healthy" | "degraded" | "unauthorized" | "unreachable";
  checkedAt: string;
  detail?: string;
}

export interface AdapterCapabilities {
  catalog: boolean;
  search: boolean;
  collections: boolean;
  cart: boolean; // modo transaccional disponible
  webhooks: boolean;
  multiSeller: boolean;
}

/** Errores normalizados del Commerce Engine. */
export type CommerceErrorCode =
  | "unauthorized" // credenciales revocadas => requiere reconexión
  | "rate_limited"
  | "not_found"
  | "unavailable"
  | "invalid_quantity"
  | "platform_error"
  | "not_supported";

export class CommerceError extends Error {
  constructor(
    public readonly code: CommerceErrorCode,
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}

/** Lectura de catálogo: usada por el editor (selección) y el renderer. */
export interface CatalogAdapter {
  readonly platform: CommercePlatform;
  readonly capabilities: AdapterCapabilities;
  health(): Promise<ConnectionHealth>;
  searchProducts(params: CatalogSearchParams, ctx: CommerceContext): Promise<Page<Product>>;
  getProducts(ids: string[], ctx: CommerceContext): Promise<Product[]>;
  listCollections(params: { first?: number; cursor?: string | null }): Promise<Page<Collection>>;
}

/** Carrito y checkout: solo landings transaccionales. Se ejecuta en servidor. */
export interface CartAdapter {
  createCart(lines: CartLineInput[], ctx: CommerceContext): Promise<Cart>;
  getCart(cartId: string, ctx: CommerceContext): Promise<Cart>;
  addLines(cartId: string, lines: CartLineInput[], ctx: CommerceContext): Promise<Cart>;
  updateLine(cartId: string, lineId: string, quantity: number, ctx: CommerceContext): Promise<Cart>;
  removeLine(cartId: string, lineId: string, ctx: CommerceContext): Promise<Cart>;
  checkout(cartId: string, ctx: CommerceContext): Promise<CheckoutHandoff>;
}

export interface CommerceAdapter extends CatalogAdapter {
  /** null cuando la plataforma/conexión no soporta modo transaccional (p. ej. manual). */
  readonly cart: CartAdapter | null;
}
