// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de Envío de Email
// ─────────────────────────────────────────────────────────────
//
// Interfaz genérica para el envío de correos electrónicos de
// notificación. Actualmente usa un adaptador placeholder que
// solo loguea en consola. Cuando se configure un proveedor real
// (Resend, SendGrid, AWS SES, etc.), crear una clase que
// implemente `IEmailService` y cambiar el factory.
//
// PUNTO DE EXTENSIÓN n8n:
// En el futuro, el envío de correos podría delegarse a un
// workflow de n8n en lugar de hacerlo directamente desde la app.
// En ese caso, la implementación de `IEmailService` haría un
// POST al webhook de n8n con los datos del correo, y n8n se
// encargaría del envío real + reintentos + plantillas HTML.
// Ver: integrations/n8n/config.ts
// ─────────────────────────────────────────────────────────────

/**
 * Resultado del intento de envío de un correo.
 */
export interface EmailResult {
  /** Si el correo fue enviado exitosamente. */
  sent: boolean;
  /** Razón del resultado (útil para debugging). */
  reason: string;
  /** ID del mensaje del proveedor (si aplica). */
  messageId?: string;
}

/**
 * Datos de un correo de notificación.
 */
export interface NotificationEmail {
  /** Dirección(es) de correo del destinatario. */
  to: string | string[];
  /** Asunto del correo. */
  subject: string;
  /** Cuerpo del correo en texto plano. */
  textBody: string;
  /** Cuerpo del correo en HTML (opcional). */
  htmlBody?: string;
}

/**
 * Interfaz del servicio de envío de correos.
 *
 * TODO: Implementar con proveedor real cuando esté configurado.
 * Candidatos:
 * - Resend (https://resend.com) — simple, buena DX
 * - SendGrid — robusto, alto volumen
 * - AWS SES — económico, requiere setup
 * - n8n webhook — delegar a workflow externo
 */
export interface IEmailService {
  /**
   * Envía un correo de notificación.
   *
   * @param email - Datos del correo a enviar.
   * @returns Resultado del envío.
   */
  send(email: NotificationEmail): Promise<EmailResult>;
}

// ─────────────────────────────────────────────────────────────
// Implementación Placeholder — Loguea en consola sin enviar
// ─────────────────────────────────────────────────────────────

/**
 * Adaptador placeholder que no envía correos reales.
 * Loguea los datos en consola para desarrollo y testing.
 *
 * Para activar envío real:
 * 1. Instalar el SDK del proveedor (e.g., `npm i resend`).
 * 2. Crear una clase que implemente `IEmailService`.
 * 3. Configurar las credenciales en `.env.local`.
 * 4. Cambiar el factory `getEmailService()` abajo.
 */
export class PlaceholderEmailService implements IEmailService {
  async send(email: NotificationEmail): Promise<EmailResult> {
    const recipients = Array.isArray(email.to) ? email.to.join(', ') : email.to;

    console.log(
      `[FleetIQ Email Placeholder] Correo NO enviado (placeholder activo)\n` +
      `  Para: ${recipients}\n` +
      `  Asunto: ${email.subject}\n` +
      `  Cuerpo: ${email.textBody.substring(0, 200)}...`,
    );

    return {
      sent: false,
      reason: 'Placeholder activo — no hay proveedor de email configurado. ' +
              'Ver lib/services/email.ts para instrucciones de configuración.',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Factory — Punto único de instanciación
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve la implementación activa del servicio de email.
 *
 * TODO: Cambiar a la implementación real cuando esté configurada.
 * Ejemplo con Resend:
 *   return new ResendEmailService(process.env.RESEND_API_KEY!);
 *
 * Ejemplo delegando a n8n:
 *   return new N8NEmailService(n8nWebhookUrl);
 */
export function getEmailService(): IEmailService {
  return new PlaceholderEmailService();
}
