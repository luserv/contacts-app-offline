- [x] Ajustar `components/contact/EditContactModal.tsx` para respetar safe area inferior y evitar superposición de botones.
- [ ] Ajustar estilos en `components/contact/contactStyles.ts` para soportar correctamente el layout del modal en móvil.
- [ ] Ejecutar verificación de critical-path del flujo de edición del contacto.
- [x] Actualizar este TODO con el progreso completado.
- [ ] Extender `utils/contactList.ts` para parsear filtro de documentos (with/without/tipo) y chips.
- [ ] Extender `utils/contactsActions.core.ts` para aplicar filtro SQL por documentos.
- [ ] Actualizar `app/(tabs)/index.tsx` para incluir filtro visual de documentos (Todos/Con/Sin).
- [ ] Actualizar traducciones necesarias en `utils/i18n.tsx`.

## Plan aprobado: filtro por documento en lista de contactos
- [x] Implementar `DocumentFilter` y `filterContactsByDocument` en `utils/contactList.ts`.
- [x] Integrar filtro visual (Todos / Con documento / Sin documento / Tipo) en `app/(tabs)/index.tsx`.
- [x] Añadir claves i18n faltantes para el nuevo filtro en `utils/i18n.tsx`.
- [x] Marcar progreso al completar cada paso.
