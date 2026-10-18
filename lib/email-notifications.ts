const RESEND_ENDPOINT = "https://api.resend.com/emails"
const BRAND_BLUE = "#2563eb"

export interface NotificationEmail {
  title: string
  message: string
  /** App-relative path, e.g. "/?needId=123". */
  url?: string
  ctaLabel?: string
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://freejob.services").replace(/\/$/, "")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderEmail({ title, message, url, ctaLabel }: NotificationEmail): string {
  const link = `${siteUrl()}${url || "/"}`
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:${BRAND_BLUE};padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">Freejob</td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;">${escapeHtml(title)}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(message)}</p>
            <a href="${escapeHtml(link)}" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:bold;">${escapeHtml(ctaLabel || "Abrir no Freejob")}</a>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">
            Você recebeu este e-mail porque tem uma conta no Freejob.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

/**
 * Sends a transactional notification email through Resend.
 * Silently skipped when RESEND_API_KEY is missing, and never throws: an email failure
 * must not break the action (proposal, payment, rating) that triggered it.
 */
export async function sendNotificationEmail(to: string, email: NotificationEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !to) return

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Freejob <notificacoes@freejob.services>",
        to: [to],
        subject: email.title,
        html: renderEmail(email),
        text: `${email.title}\n\n${email.message}\n\n${siteUrl()}${email.url || "/"}`,
      }),
    })
    if (!response.ok) {
      console.error("[email] Resend rejected the email:", response.status, await response.text())
    }
  } catch (error) {
    console.error("[email] Failed to send:", error)
  }
}
