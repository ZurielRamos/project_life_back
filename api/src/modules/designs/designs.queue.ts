/** Nombre de la cola de generación de renders de diseños. */
export const DESIGN_QUEUE = 'design-renders';

/** Payloads de los jobs de la cola de diseños. */
export type DesignJob =
  | { type: 'render'; designId: string; renderId: string }
  | { type: 'finalize'; designId: string };
