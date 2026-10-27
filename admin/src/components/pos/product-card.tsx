import { ImageIcon, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Product } from "@/data/products"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border bg-white p-3">
      {/* Imagen con badge de stock */}
      <div className="relative mb-3 flex h-36 items-center justify-center rounded-xl bg-neutral-100">
        <Badge className="absolute left-2 top-2 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white">
          {product.stock} Stock
        </Badge>
        <ImageIcon className="size-10 text-neutral-300" />
      </div>

      <h3 className="text-sm font-semibold text-neutral-900">{product.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
        {product.description}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-900">
          ${product.price.toFixed(2)}
        </span>
      </div>

      <Button
        variant="outline"
        className="mt-3 w-full rounded-full border-neutral-200 text-neutral-700"
      >
        <Plus className="size-4" />
        Add to Cart
      </Button>
    </div>
  )
}
