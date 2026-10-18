import Link from "next/link"
import type { Metadata } from "next"
import { LegalPage, LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Freejob coleta, usa e protege seus dados pessoais, de acordo com a LGPD.",
  alternates: { canonical: "/privacidade" },
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      updatedAt="18 de outubro de 2026"
      intro={
        <p>
          Esta política explica quais dados pessoais o Freejob coleta, para que usa, com quem compartilha e quais são os
          seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
        </p>
      }
    >
      <LegalSection title="1. Dados que coletamos">
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail, senha (guardada de forma criptografada), telefone, cidade e, para
            profissionais, CPF, telefone profissional e descrição.
          </li>
          <li>
            <strong>Pedidos e conversas:</strong> descrição do serviço, fotos enviadas, endereço ou região do serviço,
            mensagens do chat, propostas e avaliações.
          </li>
          <li>
            <strong>Localização:</strong> quando você autoriza no navegador, usamos sua localização para mostrar pedidos
            próximos e calcular distâncias. Você pode negar ou revogar essa permissão a qualquer momento.
          </li>
          <li>
            <strong>Câmera:</strong> usada apenas quando você escolhe tirar uma foto para um pedido. Não gravamos nada fora
            desse momento.
          </li>
          <li>
            <strong>Pagamentos:</strong> valor, status e identificadores do pagamento e da assinatura. Os dados do cartão
            ficam com a Stripe e não passam pelos nossos servidores.
          </li>
          <li>
            <strong>Uso do site:</strong> páginas visitadas, tipo de aparelho e origem do acesso, de forma agregada e sem
            cookies de rastreamento (Vercel Analytics), além de registros técnicos para segurança.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Para que usamos">
        <ul>
          <li>Criar e manter sua conta e permitir que clientes e profissionais se encontrem e conversem (execução de contrato).</li>
          <li>Processar pagamentos e assinaturas e emitir comprovantes (execução de contrato e obrigação legal).</li>
          <li>Enviar avisos sobre seus pedidos, propostas, pagamentos e avaliações por e-mail, notificação e no aplicativo.</li>
          <li>Verificar identidade e telefone de profissionais e prevenir fraudes e abusos (legítimo interesse e segurança).</li>
          <li>Entender o uso do site para melhorar o serviço (legítimo interesse, com dados agregados).</li>
          <li>Cumprir obrigações legais e responder a autoridades quando exigido por lei.</li>
        </ul>
        <p>Não vendemos seus dados pessoais.</p>
      </LegalSection>

      <LegalSection title="3. O que outros usuários veem">
        <p>
          Seu nome, foto, cidade e avaliações podem aparecer para outros usuários. Seu telefone e e-mail não são exibidos
          publicamente. Eles só são compartilhados com a outra parte de um serviço quando isso é necessário para combinar
          ou executar o trabalho.
        </p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <p>Usamos empresas parceiras que tratam dados em nosso nome, apenas para operar o Freejob:</p>
        <ul>
          <li><strong>Supabase:</strong> banco de dados e login.</li>
          <li><strong>Vercel:</strong> hospedagem do site, armazenamento de fotos e métricas de acesso.</li>
          <li><strong>Stripe:</strong> pagamentos e assinaturas.</li>
          <li><strong>Resend:</strong> envio de e-mails.</li>
          <li><strong>Z-API:</strong> envio de mensagens de verificação pelo WhatsApp.</li>
          <li><strong>Groq:</strong> processamento por inteligência artificial do texto de pedidos, para sugerir categoria e informações do serviço.</li>
        </ul>
        <p>
          Alguns desses parceiros armazenam dados fora do Brasil. Nesses casos, a transferência segue o que a LGPD permite,
          com parceiros que adotam padrões adequados de proteção.
        </p>
      </LegalSection>

      <LegalSection title="5. Por quanto tempo guardamos">
        <p>
          Guardamos os dados enquanto sua conta estiver ativa. Quando você exclui a conta, apagamos seus dados pessoais,
          notificações, interesses e inscrições de notificação. Pedidos concluídos e avaliações são mantidos sem
          identificar você, para não apagar o histórico de outros usuários. Registros de pagamento podem ser guardados
          pelo prazo exigido pela legislação fiscal.
        </p>
      </LegalSection>

      <LegalSection title="6. Seus direitos">
        <p>Pela LGPD, você pode a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos seus dados e pedir uma cópia deles;</li>
          <li>corrigir dados incompletos ou desatualizados (a maioria pode ser editada no seu perfil);</li>
          <li>pedir a exclusão dos seus dados (você mesmo pode excluir a conta no perfil);</li>
          <li>revogar consentimentos, como localização e notificações, nas configurações do navegador;</li>
          <li>pedir informações sobre com quem compartilhamos seus dados.</li>
        </ul>
        <p>
          Para exercer esses direitos, escreva para <a href="mailto:contato@freejob.services">contato@freejob.services</a>.
          Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="7. Segurança">
        <p>
          Usamos conexão criptografada (HTTPS), senhas criptografadas, controle de acesso por usuário no banco de dados e
          limites contra tentativas abusivas. Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente que
          possa causar risco relevante, avisaremos os afetados e a ANPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Usamos apenas cookies necessários para manter você conectado e o site funcionando. Não usamos cookies de
          publicidade nem de rastreamento entre sites.
        </p>
      </LegalSection>

      <LegalSection title="9. Menores de idade">
        <p>O Freejob é destinado a maiores de 18 anos. Se soubermos que uma conta pertence a um menor, ela será excluída.</p>
      </LegalSection>

      <LegalSection title="10. Alterações e contato">
        <p>
          Podemos atualizar esta política. Mudanças importantes serão avisadas no aplicativo ou por e-mail. Dúvidas:{" "}
          <a href="mailto:contato@freejob.services">contato@freejob.services</a> ou pela página de{" "}
          <Link href="/suporte">suporte</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
