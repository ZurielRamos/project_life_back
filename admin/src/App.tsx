import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/context/auth-provider"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { HomePage } from "@/pages/home-page"
import { LoginPage } from "@/pages/login-page"
import { ProductsPage } from "@/pages/products-page"
import { ProductDetailPage } from "@/pages/product-detail-page"
import { DesignsPage } from "@/pages/designs-page"
import { DesignNewPage } from "@/pages/design-new-page"
import { DesignDetailPage } from "@/pages/design-detail-page"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas dentro del layout de la app */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/designs" element={<DesignsPage />} />
              <Route path="/designs/new" element={<DesignNewPage />} />
              <Route path="/designs/:id" element={<DesignDetailPage />} />
            </Route>
          </Route>

          {/* Cualquier otra ruta redirige al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
