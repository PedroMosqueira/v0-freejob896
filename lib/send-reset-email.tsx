export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  // For now, we'll use Supabase's email system
  // In production, you might want to use a service like SendGrid or Resend

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Redefinir Senha - Freejob</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Redefinir Senha</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Olá,</p>
          
          <p style="font-size: 16px;">Você solicitou a redefinição de senha da sua conta no Freejob.</p>
          
          <p style="font-size: 16px;">Clique no botão abaixo para criar uma nova senha:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Este link expira em 1 hora por segurança.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Se você não solicitou esta redefinição, ignore este email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Freejob - Conectando profissionais a oportunidades
          </p>
        </div>
      </body>
    </html>
  `

  return emailHtml
}
