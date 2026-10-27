import {
  ChevronRight,
  ImageIcon,
  Minus,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cartItems, orderSummary, type CartItem as CartItemType } from "@/data/products"

function CartItem({ item }: { item: CartItemType }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="flex gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
          <ImageIcon className="size-6 text-neutral-300" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-neutral-900">
              {item.name}
            </h4>
            <button
              type="button"
              aria-label="Eliminar"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
            <span className="rounded-md bg-neutral-100 px-2 py-0.5">
              {item.size}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-neutral-400" />
              {item.color}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Disminuir"
                className="flex size-6 items-center justify-center rounded-full border text-neutral-600 hover:bg-neutral-100"
              >
                <Minus className="size-3" />
              </button>
              <span className="w-6 text-center text-sm font-medium">
                {String(item.qty).padStart(2, "0")}
              </span>
              <button
                type="button"
                aria-label="Aumentar"
                className="flex size-6 items-center justify-center rounded-full bg-lime-400 text-neutral-900 hover:bg-lime-500"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div className="text-xs text-neutral-500">
              Total{" "}
              <span className="font-semibold text-neutral-900">
                ${item.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SummaryRowProps {
  label: string
  value: string
  muted?: boolean
}

function SummaryRow({ label, value, muted }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={muted ? "text-neutral-500" : "font-medium text-neutral-900"}>
        {value}
      </span>
    </div>
  )
}

export function TransactionPanel() {
  const { subtotal, tax, taxRate, discount, totalPayment, promoLabel } =
    orderSummary

  return (
    <div className="flex w-[360px] shrink-0 flex-col rounded-2xl border bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">
          Detail Transaction
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          <RotateCcw className="size-3.5" />
          Reset Order
        </button>
      </div>

      {/* Items */}
      <div className="mt-4 flex flex-col gap-3 overflow-y-auto">
        {cartItems.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>

      {/* Promo + resumen */}
      <div className="mt-4 rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
            <Tag className="size-4 text-neutral-500" />
            {promoLabel}
          </span>
          <button
            type="button"
            className="rounded-full bg-lime-400 px-3 py-1 text-xs font-medium text-neutral-900 hover:bg-lime-500"
          >
            Change Promo
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <SummaryRow label="Sub-Total" value={`$${subtotal.toFixed(2)}`} />
          <SummaryRow label={`Tax (${taxRate}%)`} value={`$${tax.toFixed(2)}`} />
          <SummaryRow
            label="Discount"
            value={`-$${Math.abs(discount).toFixed(2)}`}
          />
          <div className="mt-1 flex items-center justify-between border-t pt-3">
            <span className="text-sm text-neutral-500">Total Payment</span>
            <span className="text-base font-semibold text-neutral-900">
              ${totalPayment.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Método de pago */}
      <button
        type="button"
        className="mt-3 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm hover:bg-neutral-50"
      >
        <span className="inline-flex items-center gap-3">
          <span className="flex h-6 w-9 items-center justify-center rounded bg-neutral-100">
            <span className="flex">
              <span className="size-3 rounded-full bg-red-500" />
              <span className="-ml-1.5 size-3 rounded-full bg-amber-400" />
            </span>
          </span>
          <span className="font-medium text-neutral-900">Credit Card</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
          Change Method
          <ChevronRight className="size-3.5" />
        </span>
      </button>

      {/* Continuar */}
      <Button className="mt-3 h-12 w-full rounded-2xl bg-lime-400 text-base font-semibold text-neutral-900 hover:bg-lime-500">
        Continue
      </Button>
    </div>
  )
}
