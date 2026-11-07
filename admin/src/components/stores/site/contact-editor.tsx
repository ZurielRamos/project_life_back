import type { ContactPageConfig } from "@/types/api"

import {
  Card,
  RepeatableList,
  SwitchField,
  TextAreaField,
  TextField,
} from "./fields"

interface Props {
  value: ContactPageConfig
  onChange: (value: ContactPageConfig) => void
}

/**
 * Página /contacto. Los datos de contacto (teléfono, correo, dirección y
 * redes) se toman de la sección «Contacto y redes» de la tienda.
 */
export function ContactEditor({ value, onChange }: Props) {
  const set = (patch: Partial<ContactPageConfig>) =>
    onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Página de contacto"
        description="Disponible en /contacto. Muestra los canales de la tienda configurados en «Contacto y redes»."
      >
        <SwitchField
          label="Activar página de contacto"
          description="Si la desactivas, /contacto deja de existir."
          checked={value.enabled}
          onChange={(enabled) => set({ enabled })}
        />
        <TextField
          label="Título"
          value={value.title}
          onChange={(title) => set({ title })}
          maxLength={80}
        />
        <TextAreaField
          label="Introducción"
          value={value.intro}
          onChange={(intro) => set({ intro })}
          maxLength={500}
          rows={3}
        />
        <TextAreaField
          label="Horario de atención"
          value={value.hours}
          onChange={(hours) => set({ hours })}
          maxLength={400}
          rows={3}
          placeholder={"Lunes a viernes: 9:00 a 18:00\nSábados: 9:00 a 13:00"}
          hint="Cada línea se muestra por separado."
        />
        <TextField
          label="Mapa (URL de inserción de Google Maps)"
          value={value.mapEmbedUrl}
          onChange={(mapEmbedUrl) => set({ mapEmbedUrl })}
          placeholder="https://www.google.com/maps/embed?pb=…"
          maxLength={2048}
          hint="En Google Maps: Compartir → Insertar un mapa → copia el valor de src del iframe."
        />
      </Card>

      <Card
        title="Formulario"
        description="El mensaje se envía por WhatsApp al número de la tienda, con los datos que el cliente escribe."
      >
        <SwitchField
          label="Mostrar formulario de contacto"
          description="Solo se muestra si la tienda tiene un WhatsApp configurado."
          checked={value.showForm}
          onChange={(showForm) => set({ showForm })}
        />
        <TextField
          label="Texto del botón"
          value={value.formButtonLabel}
          onChange={(formButtonLabel) => set({ formButtonLabel })}
          maxLength={40}
        />
        <TextField
          label="Mensaje inicial de WhatsApp"
          value={value.whatsappMessage}
          onChange={(whatsappMessage) => set({ whatsappMessage })}
          maxLength={200}
          hint="Se usa en el botón directo de WhatsApp de la página."
        />
      </Card>

      <Card
        title="Preguntas frecuentes"
        description="Responde las dudas habituales para reducir consultas."
      >
        <TextField
          label="Título de la sección"
          value={value.faqTitle}
          onChange={(faqTitle) => set({ faqTitle })}
          maxLength={80}
        />
        <RepeatableList
          items={value.faqs}
          onChange={(faqs) => set({ faqs })}
          createItem={() => ({ question: "", answer: "" })}
          max={12}
          itemLabel="pregunta"
          addLabel="Agregar pregunta"
          emptyLabel="Sin preguntas frecuentes: la sección no se muestra."
          renderItem={(faq, update) => (
            <div className="flex flex-col gap-3">
              <TextField
                label="Pregunta"
                value={faq.question}
                onChange={(question) => update({ question })}
                maxLength={160}
              />
              <TextAreaField
                label="Respuesta"
                value={faq.answer}
                onChange={(answer) => update({ answer })}
                maxLength={1000}
                rows={3}
              />
            </div>
          )}
        />
      </Card>
    </div>
  )
}
