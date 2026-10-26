import { getProductById } from "@/lib/api";
import type { CatalogProduct } from "@/lib/catalog";
import ProductCardClient from "@/components/ProductCardClient";

export default async function ProductCard({ productId }: { productId: string }) {
  const product = (await getProductById(productId)) as CatalogProduct | null;
  if (!product) return null;
  return <ProductCardClient product={product} />;
}
