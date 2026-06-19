# Documentación de Componentes: `@kodan-apps/ui-core`

Esta guía detalla los componentes visuales disponibles en el paquete `@kodan-apps/ui-core`, incluyendo sus interfaces, parámetros (props) y casos de uso comunes.

---

## Índice de Componentes

1. [AdminLayout](#1-adminlayout)
2. [AuthLoading](#2-authloading)
3. [Breadcrumb](#3-breadcrumb)
4. [Button](#4-button)
5. [Card](#5-card)
6. [ColorPicker](#6-colorpicker)
7. [ConfirmDialog](#7-confirmdialog)
8. [CustomFieldsForm](#8-customfieldsform)
9. [DateTimeLive](#9-datetimelive)
10. [EntityCard](#10-entitycard)
11. [Input](#11-input)
12. [Login](#12-login)
13. [Modal](#13-modal)
14. [MultiSelect](#14-multiselect)
15. [NotificationBell](#15-notificationbell)
16. [SetPassword](#16-setpassword)
17. [Sidebar](#17-sidebar)
18. [SlidePanel](#18-slidepanel)
19. [Table](#19-table)
20. [Toaster](#20-toaster)
21. [Toggle](#21-toggle)
22. [TopBar](#22-topbar)
23. [UserMenu](#23-usermenu)

---

## 1. AdminLayout

Diseño de contenedor de pestañas para paneles de administración y configuración del sistema.

### Props (`AdminLayoutProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `sections` | `AdminSection[]` | Sí | Array de secciones disponibles. Cada sección requiere `{ key, label, icon, href, count? }`. |
| `activeSection` | `string` | Sí | `key` de la pestaña activa en la vista. |
| `onNavigate` | `(section: string) => void` | Sí | Callback disparado al pulsar una sección. |
| `children` | `ReactNode` | Sí | El contenido dinámico que se renderizará dentro de la pestaña activa. |

---

## 2. AuthLoading

Componente de spinner de carga centrado para estados de autenticación y carga inicial.

### Props
*Este componente no recibe parámetros.*

---

## 3. Breadcrumb

Navegación jerárquica horizontal (miga de pan) para orientar al usuario en la estructura de la aplicación.

### Props (`BreadcrumbProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `items` | `BreadcrumbItem[]` | Sí | Lista de nodos. Cada item requiere `{ label: string, href?: string, onClick?: () => void }`. |
| `separator` | `ReactNode` | No | Icono separador entre nodos. Por defecto es un Chevron derecho (`<ChevronRight size={12} />`). |

---

## 4. Button

Botón estándar de la plataforma con variaciones de color y comportamiento de hover/active.

### Props (`ButtonProps`)
*Extiende los atributos estándar de `<button>` de HTML.*
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | No | Estética del botón. Por defecto: `'primary'`. |
| `children` | `ReactNode` | Sí | Texto o iconos dentro del botón. |

---

## 5. Card

Tarjeta base para encapsular contenido. Soporta diseño plano e interactivo en formato de volteo (flip).

### Props (`CardProps`)
*Extiende los atributos estándar de `<div>` de HTML.*
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `variant` | `'flat' \| 'flip'` | No | Tipo de tarjeta. Por defecto `'flat'`. |
| `front` | `ReactNode` | No | Contenido de la cara frontal (solo para `variant="flip"`). |
| `back` | `ReactNode` | No | Contenido de la cara posterior (solo para `variant="flip"`). |

---

## 6. ColorPicker

Selector de colores compacto en formato dropdown, con presets y soporte para código Hexadecimal personalizado.

### Props (`ColorPickerProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `value` | `string` | Sí | Código de color hexadecimal activo (Ej: `#6366F1`). |
| `onChange` | `(color: string) => void` | Sí | Callback que recibe el nuevo color seleccionado. |

---

## 7. ConfirmDialog

Cuadro de diálogo modal diseñado para solicitar confirmación del usuario en operaciones de riesgo (ej: eliminaciones).

### Props (`ConfirmDialogProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `open` | `boolean` | Sí | Si el diálogo está visible en pantalla. |
| `onClose` | `() => void` | Sí | Callback disparado al cerrar el modal (sin confirmar). |
| `title` | `string` | Sí | Título del cuadro de diálogo. |
| `message` | `string` | Sí | Texto de descripción explicativa de la acción. |
| `confirmLabel` | `string` | No | Texto del botón de confirmar. Por defecto: `'Confirmar'`. |
| `cancelLabel` | `string` | No | Texto del botón de cancelar. Por defecto: `'Cancelar'`. |
| `variant` | `'danger' \| 'warning' \| 'info'` | No | Nivel de gravedad del diálogo. Por defecto: `'info'`. |
| `onConfirm` | `() => void` | Sí | Callback ejecutado al pulsar el botón de confirmación. |
| `loading` | `boolean` | No | Si está en estado de carga (deshabilita interacciones y muestra loader). |

---

## 8. CustomFieldsForm

Genera de manera dinámica inputs del formulario a partir de un listado de definiciones de campos personalizados de base de datos.

### Props (`CustomFieldsFormProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `definitions` | `FieldDefinition[]` | Sí | Listado de definiciones (`{ id, field_key, field_label, field_type, options, is_required }`). |
| `values` | `Record<string, any>` | Sí | Mapa llave-valor con el estado actual de los valores de los campos. |
| `onChange` | `(key: string, value: any) => void` | Sí | Callback disparado al cambiar el valor de cualquier campo. |

---

## 9. DateTimeLive

Muestra la fecha y la hora actual formateada en español, con actualización automática del segundero minuto a minuto.

### Props
*Este componente no recibe parámetros.*

---

## 10. EntityCard

Tarjeta enriquecida (Double-Bevel Card) diseñada inicialmente para Negociaciones/Oportunidades y adaptada para representar colecciones interactivas como los Canales de Venta.

### Props (`EntityCardProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `title` | `string` | Sí | Título principal de la tarjeta. |
| `icon` | `ReactNode` | No | Icono decorativo. |
| `amount` | `number` | No | Monto económico (se formatea automáticamente a moneda). |
| `badge` | `ReactNode` | No | Insignia o tag superior. |
| `accountName` | `string` | No | Nombre de la cuenta/empresa. |
| `startDate` | `string` | No | Fecha de inicio. |
| `closeDate` | `string` | No | Fecha estimada de cierre. |
| `lineItemsCount` | `number` | No | Conteo de productos cotizados. |
| `ownerName` | `string` | No | Nombre del operador asignado. |
| `ownerAvatar` | `string \| null` | No | Imagen de perfil del operador. |
| `stageColor` | `string` | No | Color de borde representativo. |
| `isDropped` | `boolean` | No | Activa la animación de reordenamiento tras drag-and-drop. |
| `selected` | `boolean` | No | Activa el borde y fondo de selección activa permanente. |
| `onClick` | `() => void` | No | Callback al hacer clic en la tarjeta. |
| `onChat` | `() => void` | No | Callback para mensajería interna. |
| `onCheck` | `() => void` | No | Callback para motivos de ganancia/pérdida (check). |
| `onClone` | `() => void` | No | Callback para clonar entidad (copy). |
| `onEdit` | `() => void` | No | Callback para ver/editar (lápiz). |
| `onDelete` | `() => void` | No | Callback para eliminar (basura). |

---

## 11. Input

Entrada de texto estándar con soporte para renderizar iconos embebidos a la izquierda con padding inteligente.

### Props (`InputProps`)
*Extiende los atributos estándar de `<input>` de HTML.*
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `icon` | `ReactNode` | No | Icono visual a renderizar en la parte izquierda interna del input. |

---

## 12. Login

Pantalla y tarjeta completa de inicio de sesión con soporte para logos 3D y redirecciones a recuperación de contraseña.

### Props
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `appId` | `string` | Sí | Identificador de la aplicación en la suite CRM. |
| `title` | `string` | Sí | Nombre de la aplicación. |
| `subtitle` | `string` | No | Descripción de bienvenida. |
| `cardClassName` | `string` | No | Clase CSS de la tarjeta. |
| `labelClassName` | `string` | No | Clase CSS de los labels. |
| `logoIcon` | `ReactNode` | No | Icono o animación a renderizar en cabecera. |
| `onLoginSuccess` | `(data: any) => void` | Sí | Callback disparado tras autenticación exitosa. |
| `onGoToSetPassword` | `() => void` | Sí | Callback para redirigir a establecer contraseña. |

---

## 13. Modal

Caja de diálogo emergente clásica con fondo oscuro translúcido y botón de cierre en esquina superior derecha.

### Props (`ModalProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `open` | `boolean` | Sí | Si el modal está visible. |
| `onClose` | `() => void` | Sí | Callback de cierre del modal. |
| `children` | `ReactNode` | Sí | Elementos a renderizar en el cuerpo del modal. |
| `title` | `string` | No | Título de la cabecera. |

---

## 14. MultiSelect

Selector múltiple interactivo con buscador integrado a tiempo real y visualización de elementos seleccionados mediante chips (tags) eliminables.

### Props (`MultiSelectProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `options` | `Option[]` | Sí | Lista de opciones seleccionables (`{ value: string, label: string }`). |
| `values` | `string[]` | Sí | Array con los `value` seleccionados actualmente. |
| `onChange` | `(values: string[]) => void` | Sí | Callback disparado al cambiar la selección. |
| `placeholder` | `string` | No | Texto informativo por defecto. |

---

## 15. NotificationBell

Icono de campana de notificaciones con burbuja roja indicadora de mensajes pendientes.

### Props
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `count` | `number` | No | Cantidad de notificaciones pendientes (muestra el badge si es > 0). |
| `onClick` | `() => void` | No | Callback al pulsar la campana. |

---

## 16. SetPassword

Formulario dedicado a establecer la contraseña de usuario a través de enlace de verificación/token.

### Props
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `title` | `string` | Sí | Título de cabecera. |
| `emailPlaceholder` | `string` | No | Marcador de correo. |
| `cardClassName` | `string` | No | Clase CSS de la tarjeta. |
| `labelClassName` | `string` | No | Clase CSS de las etiquetas. |
| `logoIcon` | `ReactNode` | No | Icono o animación 3D. |
| `onBackToLogin` | `() => void` | Sí | Callback para volver a la pantalla de Login. |

---

## 17. Sidebar

Menú de navegación vertical completo. Gestiona enlaces de la aplicación, perfil de usuario actual, alternador de modo claro/oscuro y cierre de sesión.

### Props (`SidebarProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `title` | `string` | Sí | Nombre de la aplicación a mostrar. |
| `navItems` | `NavItem[]` | Sí | Enlaces de navegación (`{ key, label, icon }`). |
| `activeKey` | `string` | Sí | `key` del enlace activo actualmente en pantalla. |
| `onNavigate` | `(key: string) => void` | Sí | Callback al hacer clic en un enlace de navegación. |
| `user` | `{ display_name?, email? } \| null` | Sí | Información de perfil del usuario. |
| `onLogout` | `() => void` | Sí | Callback al hacer clic en Cerrar Sesión. |
| `theme` | `'light' \| 'dark'` | Sí | Tema actual de visualización. |
| `onThemeToggle` | `() => void` | Sí | Callback para conmutar el tema (claro/oscuro). |
| `logo` | `string` | No | URL de la imagen de logo. |
| `logoIcon` | `ReactNode` | No | Componente de logo personalizado (ej: 3D). |
| `extraItems` | `ReactNode` | No | Contenido adicional inyectado al pie del Sidebar. |
| `version` | `string` | No | Versión actual de la app. Por defecto: `'v1.0.0'`. |
| `headerClassName` | `string` | No | Clase CSS adicional para el encabezado. |
| `showUserSection` | `boolean` | No | Si se dibuja el panel de perfil en el pie. Por defecto: `true`. |

---

## 18. SlidePanel

Panel lateral deslizante desde el borde derecho de la pantalla (Drawer) para formularios complejos y flujos de edición rápida.

### Props (`SlidePanelProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `open` | `boolean` | Sí | Si el panel está expandido. |
| `onClose` | `() => void` | Sí | Callback disparado al cerrar el panel. |
| `title` | `string` | No | Título de la cabecera. |
| `children` | `ReactNode` | Sí | Contenido interno a renderizar en el scroll central. |
| `width` | `string` | No | Ancho CSS del panel. Por defecto: `'32rem'`. |

---

## 19. Table

Grilla avanzada altamente interactiva. Soporta paginado local/remoto, ordenamiento por columnas, filtros rápidos integrados por celda, filas seleccionables con checkbox, acciones individuales por fila y acciones masivas en lote (Bulk Actions).

### Props (`TableProps<T>`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `data` | `T[]` | Sí | Colección de datos a renderizar. |
| `columns` | `TableColumn<T>[]` | Sí | Configuración de columnas (`{ key, header, render, align, width, sortable, filterKey }`). |
| `keyExtractor` | `(item: T) => string \| number` | Sí | Generador de llaves únicas por fila. |
| `loading` | `boolean` | No | Muestra esqueleto animado (Skeleton UI) si está cargando. |
| `skeletonRows` | `number` | No | Cantidad de filas temporales del esqueleto. Por defecto: `5`. |
| `emptyState` | `{ icon, title, description }` | Sí | UI para mostrar si el listado `data` está vacío. |
| `editable` | `{ onClick: (item: T) => void }` | No | Habilita acción de edición por fila. |
| `deletable` | `{ onClick: (item: T) => void }` | No | Habilita acción de eliminación por fila. |
| `actions` | `TableAction<T>[]` | No | Array de acciones adicionales de menú por fila. |
| `pageSize` | `number` | No | Cantidad de items por página de la tabla. |
| `currentPage` | `number` | No | Página seleccionada actual. |
| `totalRecords` | `number` | No | Conteo total para paginado en servidor. |
| `onPageChange` | `(page: number) => void` | No | Callback al cambiar de página. |
| `maxHeight` | `string` | No | Límite de alto para forzar scrollbar interno de la tabla. |
| `onRowClick` | `(item: T) => void` | No | Callback disparado al hacer clic sobre una fila completa. |
| `onSort` | `(key, direction) => void` | No | Callback disparado al reordenar columnas. |
| `selectable` | `boolean` | No | Habilita checkboxes a la izquierda para selección múltiple. |
| `selectedKeys` | `(string \| number)[]` | No | Llaves de los elementos seleccionados. |
| `onSelectionChange` | `(keys) => void` | No | Callback disparado al cambiar elementos seleccionados. |
| `bulkActions` | `BulkAction<T>[]` | No | Acciones masivas aplicables a los elementos seleccionados. |
| `filterable` | `boolean` | No | Muestra fila de inputs de filtrado debajo de cabeceras. |
| `filters` | `Record<string, string>` | No | Valores activos de los inputs de filtrado. |
| `onFilterChange` | `(filters) => void` | No | Callback disparado al modificar cualquier filtro. |

---

## 20. Toaster

Contenedor global para renderizar notificaciones emergentes animadas (Toasts) a través de la librería `sonner`.

### Props
*Este componente no recibe parámetros.*

---

## 21. Toggle

Interruptor de activación estilizado tipo interruptor (switch), compatible con estados de formulario estándar.

### Props (`ToggleProps`)
*Extiende los atributos de `<input>` de tipo checkbox de HTML, omitiendo `type`.*
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `label` | `string` | No | Texto descriptivo a la derecha del interruptor. |

---

## 22. TopBar

Barra de herramientas fija superior. Integra el componente `DateTimeLive`, botón de notificaciones y el menú desplegable del perfil.

### Props (`TopBarProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `title` | `string` | No | Título principal de la sección. |
| `user` | `UserMenuUser \| null` | Sí | Datos del usuario activo para el menú de perfil. |
| `theme` | `'light' \| 'dark'` | Sí | Tema de visualización actual. |
| `onThemeToggle` | `() => void` | Sí | Callback para alternar el tema visual de la app. |
| `onLogout` | `() => void` | Sí | Callback disparado al solicitar cerrar sesión. |
| `onChangePassword` | `() => void` | No | Callback opcional para abrir cambio de contraseña. |
| `userMenuExtraItems` | `UserMenuItem[]` | No | Items adicionales en el dropdown de perfil. |
| `notificationCount` | `number` | No | Cantidad de notificaciones pendientes para la campana. |
| `onNotificationClick` | `() => void` | No | Callback disparado al pulsar la campana. |
| `children` | `ReactNode` | No | Elemento inyectado en el centro del encabezado. |

---

## 23. UserMenu

Botón y menú desplegable del perfil de usuario actual que se coloca a la derecha del encabezado general.

### Props (`UserMenuProps`)
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `user` | `UserMenuUser \| null` | Sí | Datos del perfil de usuario (`{ display_name, email, avatar_url }`). |
| `theme` | `'light' \| 'dark'` | Sí | Tema de color activo actual. |
| `onThemeToggle` | `() => void` | Sí | Callback para alternar modos. |
| `onLogout` | `() => void` | Sí | Callback para cerrar sesión. |
| `onChangePassword` | `() => void` | No | Callback opcional para cambiar clave. |
| `extraItems` | `UserMenuItem[]` | No | Enlaces de menú personalizados (`{ label, icon, onClick, danger?, dividerBefore? }`). |
