import { Outlet } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"

/**
 * Layout de la aplicación autenticada: sidebar fija a la izquierda y el
 * contenido de cada ruta dentro del contenedor redondeado.
 */
export function AppLayout() {
  return (
    <div className="flex h-svh w-full bg-neutral-950 p-2.5">
      <div className="flex w-full overflow-hidden rounded-3xl bg-neutral-950">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col rounded-3xl bg-neutral-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
