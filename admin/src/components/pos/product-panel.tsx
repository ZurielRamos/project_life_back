import { useState } from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { categories, products } from "@/data/products"
import { ProductCard } from "@/components/pos/product-card"

export function ProductPanel() {
  const [activeCategory, setActiveCategory] = useState("all")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tabs de categorías */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const active = cat.id === activeCategory
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-neutral-900 bg-white text-neutral-900 shadow-sm"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                )}
              >
                {cat.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    active
                      ? "bg-lime-400 text-neutral-900"
                      : "bg-neutral-200 text-neutral-600"
                  )}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          aria-label="Buscar"
          className="flex size-10 items-center justify-center rounded-full border bg-white text-neutral-500 hover:text-neutral-900"
        >
          <Search className="size-4" />
        </button>
      </div>

      {/* Grilla de productos */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
