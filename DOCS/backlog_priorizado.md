# kodanCRM — Backlog Priorizado de Faltantes
> Actualizado: 2026-06-22 | Solo lo que falta. Ordenado por impacto y esfuerzo.

## Leyenda de Estado

| Símbolo | Significado |
|:-------:|-------------|
| `[ ]` | Pendiente |
| `[/]` | En progreso |
| `[x]` | Completado |

---

## 🟠 PARCIALES — Iniciados pero incompletos (terminar primero)

| Estado | # | Feature | Qué falta exactamente |
|:------:|---|---------|----------------------|
| `[x]` | P1 | **Quote Builder UI** | Backend `QuoteController.php` existe. Falta: componente React de armado visual dentro del `OpportunityDetailSlider`, integración con `dompdf` para generar PDF, y botón de descarga. |
| `[ ]` | P2 | **Custom Fields avanzados** | Motor existe (`CustomFieldController.php` + UI). Faltan tipos: `file/image upload`, `multi_select con dependencias`, y renderizado en grillas. |
| `[ ]` | P3 | **WebForms / Captura pública de leads** | `PublicController.php` tiene endpoint. Falta: constructor visual en Settings, embed snippet, y mapeo de campos al pipeline. |
| `[x]` | P4 | **Dashboard con gráficos reales** | `Dashboard.tsx` existe pero solo muestra contadores texto. Faltan: funnel de pipeline, win rate, revenue por etapa, tareas vencidas. |
| `[ ]` | P5 | **Audit Logs por Tenant** | Existen en SuperAdmin global. Falta: hacerlos accesibles desde el panel del Admin del tenant con filtros por entidad y usuario. |

---

## 🔴 CRITICAL TO HAVE — Sin esto no es CRM competitivo

| Estado | # | Feature | Por qué es crítico | Esfuerzo |
|:------:|---|---------|-------------------|----------|
| `[ ]` | C1 | **Vista Lista / DataGrid** | El Kanban no escala a +200 registros. Sin vista lista, Leads, Contacts y Opportunities son inutilizables en volumen. | Alto |
| `[ ]` | C2 | **Exportación CSV** | Requerido en toda revisión de pipeline. Los gerentes viven en Excel. | Medio |
| `[ ]` | C3 | **Importación masiva CSV/Excel** | Sin esto, migrar desde otro CRM es imposible. Bloquea onboarding de cualquier equipo nuevo. | Alto |
| `[ ]` | C4 | **Conversión Lead → Oportunidad (1-click)** | El flujo de prospección está roto. El vendedor debe re-ingresar datos manualmente al crear una Oportunidad desde un Lead. | Medio |
| `[ ]` | C5 | **Motivo de Pérdida obligatorio** | Modal que se dispara al mover a "Closed Lost". Dato estratégico irreemplazable para mejorar el proceso comercial. | Bajo |
| `[ ]` | C6 | **Pronóstico de Ventas (Forecasting)** | `Ingreso Esperado = Monto × Probabilidad`. El campo `probability` ya existe en `PipelineStage`. Solo falta calcular y mostrar. | Medio |
| `[ ]` | C7 | **Vista 360° del Cliente (Account Detail)** | Pantalla de detalle de Account: datos, timeline de actividades, oportunidades asociadas, contactos, chat. Actualmente solo hay cards en Kanban. | Alto |
| `[ ]` | C8 | **Notificaciones por Email del sistema** | El CRM solo funciona si el vendedor tiene la pestaña abierta. Sin emails de alerta (tarea vencida, mención, opp actualizada), la retención cae. | Medio |
| `[ ]` | C9 | **Motor de Automatizaciones / Workflows** | Spec técnica completa en `missing_modules_specification.md`. BD y evaluador diseñados. Falta implementar backend + UI del builder de reglas. | Alto |
| `[ ]` | C10 | **Vista Calendario Compartida del equipo** | El calendario actual solo muestra tareas propias. Sin visibilidad del equipo, el manager no puede gestionar carga de trabajo. | Medio |

---

## 🟡 NICE TO HAVE — Diferenciadores y retención a largo plazo

| Estado | # | Feature | Valor | Esfuerzo |
|:------:|---|---------|-------|----------|
| `[ ]` | N1 | **Email Inbox Integrado (OAuth Gmail/Outlook)** | Muy alto — vendedores viven en email | Muy alto |
| `[ ]` | N2 | **AI Lead Scoring** | Alto — prioriza automáticamente el pipeline con IA | Alto |
| `[ ]` | N3 | **Contactos múltiples en Oportunidad + Roles** | Alto — B2B real tiene comités de compra | Medio |
| `[ ]` | N4 | **Deduplicación automática** | Medio — crítico post-importación masiva | Medio |
| `[ ]` | N5 | **Plantillas de Email con Merge Fields** | Alto — complementa el Inbox y las automatizaciones | Medio |
| `[ ]` | N6 | **Permisos a nivel de campo (Field-Level ACL)** | Medio — requerido para equipos con financiero separado | Alto |
| `[ ]` | N7 | **2FA / Autenticación de dos factores** | Alto — requerido para clientes enterprise | Medio |
| `[ ]` | N8 | **SSO Google / Microsoft** | Alto — requerido para corporativos | Alto |
| `[ ]` | N9 | **Soporte Multidivisa por Oportunidad** | Medio — para operaciones internacionales | Medio |
| `[ ]` | N10 | **Sequencias de Outreach automatizadas** | Alto — cadencia email/llamada por prospecto | Alto |
| `[ ]` | N11 | **Conversational Intelligence (transcripción de llamadas)** | Alto — tendencia fuerte 2025 | Muy alto |
| `[ ]` | N12 | **Agentic AI — Siguiente Mejor Acción** | Alto — diferenciador de próxima generación | Muy alto |
| `[ ]` | N13 | **Marketplace de Integraciones (Slack, Stripe, Jira)** | Medio — ecosistema largo plazo | Muy alto |
| `[ ]` | N14 | **Respaldo y Exportación Total de Datos** | Medio — compliance GDPR / migración futura | Bajo |

---

## Orden de ejecución recomendado

```
─── AHORA (Parciales — cerrar deuda) ──────────────────────
 P1 → Quote Builder UI + PDF
 P4 → Dashboard con gráficos (Recharts)
 P5 → Audit Logs accesibles por tenant admin

─── SPRINT 1 ───────────────────────────────────────────────
 C1 → Vista Lista / DataGrid (Leads, Contacts, Opportunities)
 C2 → Exportación CSV desde DataGrid

─── SPRINT 2 ───────────────────────────────────────────────
 C3 → Importación masiva CSV con mapeo de columnas
 C5 → Motivo de Pérdida obligatorio (bajo esfuerzo, alto valor)
 C4 → Conversión Lead → Oportunidad 1-click

─── SPRINT 3 ───────────────────────────────────────────────
 C7 → Vista 360° del Cliente (Account Detail page)
 C6 → Forecasting (usa datos ya existentes en BD)
 P2 → Custom Fields avanzados (file upload, multi_select)

─── SPRINT 4 ───────────────────────────────────────────────
 C9 → Motor de Automatizaciones / Workflows
 C8 → Notificaciones por Email del sistema
 C10 → Calendario compartido del equipo

─── SPRINT 5+ ──────────────────────────────────────────────
 P3 → WebForms constructor visual
 N3 → Contactos + roles en Oportunidad
 N5 → Plantillas de Email con Merge Fields
 N4 → Deduplicación automática
 N7 → 2FA
 N1 → Email Inbox (OAuth) ← más complejo, para el final
```
