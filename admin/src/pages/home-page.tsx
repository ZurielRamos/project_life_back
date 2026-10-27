import { PosHeader } from "@/components/pos/pos-header"
import { ProductPanel } from "@/components/pos/product-panel"
import { TransactionPanel } from "@/components/pos/transaction-panel"

/**
 * Home: dashboard POS de placeholder. El sidebar vive en AppLayout.
 */
export function HomePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <PosHeader />
      <div className="flex min-h-0 flex-1 gap-6">
        <ProductPanel />
        <TransactionPanel />
      </div>
    </div>
  )
}
