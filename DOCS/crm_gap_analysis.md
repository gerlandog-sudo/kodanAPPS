# kodanCRM — Gap Analysis & Feature Backlog
> Análisis ejecutado: 2026-06-22 | Stack: React 19 + PHP 8.3 Medoo + Zustand

---

## PARTE 1 — INVENTARIO: ¿Qué tiene implementado kodanCRM HOY?

### ✅ Módulos Operativos Confirmados (código verificado)

| Módulo | Implementación | Estado |
|--------|----------------|--------|
| **Auth / Login** | JWT + forgot-password con temp password | ✅ Completo |
| **Multi-tenancy SaaS** | `tenant_id` en todos los recursos, SuperAdmin console | ✅ Completo |
| **Leads (Accounts)** | Kanban 4 etapas: Nuevo → Contacto → Enriquecido → Ganado | ✅ Completo |
| **Contacts** | CRUD + asociación a Account | ✅ Completo |
| **Prospects** | Tab separado con ProspectsTab.tsx | ✅ Funcional |
| **Opportunities (Pipeline)** | Kanban dinámico con multi-pipeline | ✅ Completo |
| **Pipeline Builder** | Etapas configurables, colores, probabilidad | ✅ Completo |
| **Catálogo de Productos** | SKU, precio, activo/inactivo | ✅ Completo |
| **Line Items** | Oportunidad con N productos, cálculo automático | ✅ Completo |
| **Quotes (Cotizaciones)** | Backend + model existentes (QuoteController.php) | ⚠️ Parcial — sin UI completa |
| **Tasks (Tareas)** | Kanban + Calendario, tipos, vencimiento, participantes | ✅ Completo |
| **Komand Center** | Dashboard de productividad diaria del vendedor | ✅ Completo |
| **Chat Interno** | WebSocket Pusher, mensajes por entidad, menciones | ✅ Completo |
| **AI Enrichment** | kodanHUB → datos corporativos por dominio | ✅ Completo |
| **Custom Fields** | Motor de campos dinámicos para Accounts/Contacts/Opps | ⚠️ Básico — sin tipos avanzados |
| **Themes** | 5+ paletas de color, dark mode, por usuario | ✅ Completo |
| **SuperAdmin Panel** | Tenants, planes, billing logs, audit logs | ✅ Completo |
| **Subscription Plans** | Límites por plan (users, negociaciones) | ✅ Completo |
| **Dashboard** | KPIs básicos (Dashboard.tsx) | ⚠️ Muy básico |
| **Audit Logs** | Existe en SuperAdmin, no por tenant | ⚠️ Solo SuperAdmin |

---

## PARTE 2 — LO QUE FALTA (Brechas detectadas)

### 🔴 CRÍTICO — Bloqueantes de madurez funcional

#### 1. Vista de Perfil 360° del Cliente
**Qué es:** Pantalla de detalle por Account con 3 columnas — datos del cliente, timeline cronológico de interacciones, y oportunidades/contactos relacionados.  
**Impacto:** Sin esto, el vendedor no tiene contexto completo al hacer seguimiento. Es la feature más copiada de Salesforce y HubSpot.  
**Estado actual:** No existe ninguna página de detalle de cuenta. Solo hay cards en Kanban.

#### 2. Generador de PDF para Cotizaciones (Quote Builder UI)
**Qué es:** La UI completa del QuoteBuilder en el detalle de oportunidad. El backend `QuoteController.php` existe pero no hay componente React para armado visual + descarga de PDF.  
**Impacto:** Los vendedores no pueden entregar documentos formales. Sin PDF de propuesta, el ciclo de venta queda incompleto.  
**Estado actual:** Backend parcial, UI inexistente, sin integración dompdf.

#### 3. Importación Masiva CSV/Excel de Contactos/Cuentas
**Qué es:** Asistente de 3 pasos: subir archivo → mapear columnas → importar con validación de duplicados.  
**Impacto:** Cualquier equipo que migre desde otro CRM necesita esto el día 1. Sin importación, el onboarding es un cuello de botella fatal.  
**Estado actual:** No existe. Solo alta manual 1 a 1.

#### 4. Conversión de Lead a Oportunidad (1-click)
**Qué es:** Flujo donde un Account en stage "Ganado" puede convertirse en Oportunidad formal sin re-ingresar datos.  
**Impacto:** Flujo roto: el vendedor debe crear la Oportunidad manualmente desde cero referenciando el mismo Account.  
**Estado actual:** No existe. Proceso completamente manual.

#### 5. Dashboards con Gráficos Reales
**Qué es:** KPIs visuales: pipeline por etapa (funnel chart), win rate, revenue forecast, deals cerrados por vendedor, tareas vencidas.  
**Impacto:** El `Dashboard.tsx` tiene 9,675 bytes — no hay gráficos reales, solo datos textuales básicos. Un CRM sin analytics es un formulario glorificado.  
**Estado actual:** Muy básico. Sin librerías de charting integradas.

#### 6. Motor de Automatizaciones / Workflow Triggers
**Qué es:** Reglas tipo "Si oportunidad pasa a Cerrado Ganado → crear tarea de Onboarding + enviar email de bienvenida".  
**Impacto:** Los CRMs modernos requieren esto. Sin automatizaciones, el equipo de ventas hace trabajo manual repetitivo.  
**Estado actual:** Especificado en DOCS pero no implementado ni en backend ni frontend.

#### 7. Análisis de Motivo de Pérdida (Loss Reason)
**Qué es:** Modal obligatorio al marcar oportunidad como "Cerrado Perdido" que fuerza categorizar el motivo (precio, competencia, timing, etc.).  
**Impacto:** Sin esto, es imposible mejorar el proceso de venta. Dato estratégico para el equipo gerencial.  
**Estado actual:** No existe. Etapa "Closed Lost" se aplica sin fricción y sin data.

---

### 🟡 IMPORTANTE — Frenan la adopción y retención

#### 8. Cliente de Email Integrado (Sales Inbox)
**Qué es:** Sincronización OAuth2 con Gmail/Outlook para leer y enviar emails desde la ficha del contacto, con registro automático en el timeline.  
**Impacto:** Los vendedores viven en su email. Si el CRM no está ahí, lo ignoran.  
**Estado actual:** Especificado en DOCS. No implementado.

#### 9. Grillas de Datos Avanzadas con Filtros y Exportación CSV
**Qué es:** Vista de lista para Accounts, Contacts, y Opportunities con filtros multi-columna, ordenamiento, selección en bloque, y exportación CSV/Excel.  
**Impacto:** Requerimiento fundamental en cualquier revisión de pipeline semanal. Actualmente solo hay Kanban, sin vista de tabla.  
**Estado actual:** Solo vista Kanban. Sin vista lista. Sin exportación. Sin filtros avanzados.

#### 10. Permisos a Nivel de Campo (Field-Level Permissions)
**Qué es:** El role "viewer" puede ver precio de lista pero no margen de descuento. Solo Admin puede editar campos financieros.  
**Impacto:** En empresas medianas, el gerente necesita restringir qué puede modificar un vendedor junior.  
**Estado actual:** Solo 2 roles reales (admin/viewer). Sin granularidad de campo.

#### 11. Pistas de Auditoría por Tenant (Audit Logs)
**Qué es:** Registro cronológico de quién creó/editó/eliminó qué registro, visible por el admin del tenant.  
**Impacto:** Requerimiento de cumplimiento. Sin esto, si alguien borra datos críticos no hay forma de rastrearlo.  
**Estado actual:** Audit logs existen solo en la consola SuperAdmin global. No accesible por tenant admin.

#### 12. Pronósticos de Venta (Sales Forecasting)
**Qué es:** Cálculo de `Ingreso Esperado = Monto × Probabilidad de Etapa` por vendedor y por mes.  
**Impacto:** El Dashboard no puede mostrar "¿Cuánto vamos a cerrar este mes?" sin esto.  
**Estado actual:** El campo `probability` existe en `PipelineStage` pero no hay ningún cálculo de forecast.

#### 13. Asociación de Múltiples Contactos a Oportunidad con Roles
**Qué es:** Vincular varios contactos a una oportunidad con roles (Decisor, Influenciador, Campeón técnico).  
**Impacto:** En ventas B2B, el proceso de compra involucra múltiples stakeholders. El CRM no lo modela.  
**Estado actual:** Una oportunidad está ligada a un Account, sin relación directa con contactos + roles.

#### 14. Notificaciones Push / Email del Sistema
**Qué es:** Alertas por email cuando: una tarea vence, te mencionan en un chat, una oportunidad cambia de etapa.  
**Impacto:** El polling de menciones es cada 4 segundos — esto es polling bruto, no notificaciones reales. Sin email notifications, el CRM solo funciona si el vendedor tiene la pestaña abierta.  
**Estado actual:** Solo polling en-app. Sin email de sistema. Sin push notifications.

---

### 🟢 BRECHAS MENORES — Mejoras de UX y completitud

#### 15. Deduplicación de Registros
**Qué es:** Algoritmo que detecta duplicados por email o dominio al crear una cuenta/contacto y ofrece fusionarlos.  
**Estado actual:** No existe. Datos duplicados se crean silenciosamente.

#### 16. Formularios Web Públicos (WebForms / Landing Page Lead Capture)
**Qué es:** Formulario embebible en sitio web del cliente que al completarse crea un lead directamente en el CRM.  
**Estado actual:** Existe `PublicController.php` con endpoint de prospects público, pero sin constructor visual de formularios.

#### 17. Plantillas de Email Dinámicas
**Qué es:** Templates con merge fields (`{{contact.first_name}}`, `{{opportunity.amount}}`) para envío masivo o automatizado.  
**Estado actual:** No existe.

#### 18. SSO (Single Sign-On) — Google / Microsoft
**Qué es:** Login con cuenta corporativa de Google o Microsoft en lugar de usuario/contraseña.  
**Estado actual:** Solo usuario/contraseña con JWT propio.

#### 19. Vista Calendario Global
**Qué es:** Calendario compartido del equipo mostrando todas las tareas y reuniones de todos los vendedores.  
**Estado actual:** Solo existe `TasksCalendarView.tsx` que muestra las tareas del usuario logueado, sin visibilidad de equipo.

#### 20. Soporte Multidivisa por Oportunidad
**Qué es:** Permitir que cada oportunidad tenga una moneda diferente (USD, EUR, MXN) con conversión automática.  
**Estado actual:** Todo en moneda única implícita. Sin símbolo, sin conversión.

---

## PARTE 3 — FEATURES DEL MERCADO 2025/2026: PRIORIZACIÓN

> Basado en análisis de HubSpot, Salesforce, Pipedrive, Close, Freshsales y Clay.

### 🔴 MUST HAVE — Sin esto no eres CRM competitivo

| # | Feature | Referencia en mercado | Por qué es crítico |
|---|---------|----------------------|-------------------|
| 1 | **Vista 360° del Cliente** | Salesforce, HubSpot, Pipedrive | Estándar de industria. El cliente espera ver TODO en una pantalla |
| 2 | **Importación CSV/Excel** | Todos los CRM top | Sin esto, migración desde otro CRM es imposible → bloqueo de onboarding |
| 3 | **Quote Builder con PDF** | Salesforce CPQ, Pipedrive, Krayin | Cierre de ciclo de venta. Sin propuesta formal, no hay negocio |
| 4 | **Dashboard con Gráficos Reales** | HubSpot Analytics, Pipedrive Insights | Dirección general exige KPIs visuales. Sin gráficos, no lo usan |
| 5 | **Exportación CSV de Listas** | Universal | Requerido para reportería fuera del CRM, auditorías, reuniones |
| 6 | **Vista Lista (DataGrid)** | Todos | El Kanban solo no escala. Con 500+ oportunidades el kanban es inutilizable |
| 7 | **Conversión Lead → Oportunidad** | HubSpot, Salesforce | Flujo fundamental del funnel. Sin esto el proceso está roto |
| 8 | **Motivo de Pérdida obligatorio** | Salesforce, Pipedrive | Dato estratégico irreemplazable. Si no lo capturas, no puedes mejorar |
| 9 | **Notificaciones por Email del sistema** | Universal | Sin esto el CRM solo funciona con la pestaña abierta |
| 10 | **Audit Logs por Tenant** | HubSpot, Salesforce | Compliance básico. Requerido para ventas a empresas medianas |

---

### 🟡 NICE TO HAVE — Diferenciadores y retención

| # | Feature | Referencia en mercado | Impacto |
|---|---------|----------------------|---------|
| 11 | **Motor de Automatizaciones / Workflows** | HubSpot Workflows, Pipedrive Automations | Ahorra 2-4h/semana por vendedor. Fuerte retención |
| 12 | **Sales Forecasting (Probabilidad × Monto)** | Salesforce Forecasting, Pipedrive | Permite reuniones de pipeline semanales con proyección real |
| 13 | **Email Inbox Integrado (OAuth Google/Outlook)** | Salesforce, HubSpot, Close | Alta complejidad. Diferenciador enorme vs competidores básicos |
| 14 | **Inteligencia Artificial de Scoring de Leads** | HubSpot Breeze, Freshsales AI | Ordena las oportunidades por probabilidad de cierre con IA |
| 15 | **Contactos múltiples en Oportunidad + Roles** | Salesforce, HubSpot | Esencial para ventas B2B complejas con comités de compra |
| 16 | **Formularios Web Públicos (WebForms)** | HubSpot Forms, Typeform integrado | Generación de leads inbound directo al CRM |
| 17 | **2FA / Autenticación de Dos Factores** | Universal | Requerido para sectores financieros y grandes empresas |
| 18 | **Deduplicación Automática** | HubSpot, Salesforce | Reduce ruido de datos. Crítico tras importaciones masivas |
| 19 | **Plantillas de Email con Merge Fields** | HubSpot, Pipedrive | Aumenta velocidad de outreach. Complementa el Inbox |
| 20 | **SSO Google / Microsoft** | Salesforce, HubSpot Enterprise | Requerido para clientes corporativos |
| 21 | **Permisos a Nivel de Campo** | Salesforce | Requerido para equipos de ventas + finanzas sin conflicto |
| 22 | **Soporte Multidivisa** | Salesforce, HubSpot | Esencial para empresas con operaciones internacionales |
| 23 | **Conversational Intelligence (transcripción de llamadas)** | Gong, HubSpot, Salesforce | Tendencia fuerte 2025. Alta complejidad de implementación |
| 24 | **Vista Calendario Compartida del equipo** | HubSpot, Monday | Visibilidad de carga de trabajo del equipo de ventas |
| 25 | **Agentic AI — Siguiente Mejor Acción** | Salesforce Agentforce, HubSpot Breeze | Tendencia 2025/2026. IA que recomienda qué hacer ahora |
| 26 | **Sequencias de Outreach automatizadas** | Close, Apollo.io, Outreach | Cadencia de emails/llamadas programadas por prospecto |
| 27 | **Respaldo y Exportación Total de Datos** | Universal | Requerido para compliance GDPR y migración futura |
| 28 | **Marketplace de Integraciones** | HubSpot App Marketplace, Zapier | Conectar con Slack, Stripe, Jira, etc. |

---

## RESUMEN EJECUTIVO

### Estado actual: **Madurez Media** (5.5/10 vs mercado)

**Lo que tiene kodanCRM que pocos tienen:**
- ✅ AI Enrichment en 1 clic (diferenciador real)
- ✅ Multi-tenancy SaaS nativo (ya monetizable)
- ✅ Chat contextual con WebSockets (superior a Pipedrive)
- ✅ Komand Center (unique selling point)
- ✅ Diseño premium (supera a Krayin, Freshsales)

**Las 3 brechas fatales que bloquean adopción:**
1. ❌ Sin importación CSV → imposible migrar equipos
2. ❌ Sin vista lista/DataGrid → no escala más allá de 200 registros  
3. ❌ Sin Dashboard con gráficos reales → management no lo adopta

**Hoja de ruta recomendada (orden de implementación):**
```
Sprint 1: Vista Lista + Exportación CSV + Filtros avanzados
Sprint 2: Dashboard con Recharts (pipeline funnel, win rate, forecast)
Sprint 3: Importación CSV con mapeo de columnas
Sprint 4: Quote Builder UI completo + generación PDF
Sprint 5: Motor de Automatizaciones (backend existente, falta UI)
Sprint 6: Email Inbox (OAuth Google/Outlook)
```
