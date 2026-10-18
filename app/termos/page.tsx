import Link from "next/link"
import type { Metadata } from "next"
import { LegalPage, LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso do Freejob para clientes e profissionais.",
  alternates: { canonical: "/termos" },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      updatedAt="18 de outubro de 2026"
      intro={
        <p>
          Estes termos explicam as regras para usar o Freejob. Ao criar uma conta, você declara que leu e concorda com
          eles e com a nossa <Link href="/privacidade" className="text-[#4F7CFF] underline underline-offset-4">Política de Privacidade</Link>.
        </p>
      }
    >
      <LegalSection title="1. O que é o Freejob">
        <p>
          O Freejob é uma plataforma que aproxima pessoas que precisam de um serviço (clientes) de pessoas que prestam
          serviços (profissionais). Clientes publicam pedidos, profissionais demonstram interesse, conversam pelo chat e
          enviam propostas.
        </p>
        <p>
          <strong>O Freejob não presta os serviços anunciados</strong> e não é empregador, sócio ou representante dos
          profissionais. O acordo sobre o serviço (o que será feito, prazo, preço e garantia) é feito diretamente entre
          cliente e profissional.
        </p>
      </LegalSection>

      <LegalSection title="2. Conta e cadastro">
        <ul>
          <li>Você precisa ter pelo menos 18 anos e informar dados verdadeiros e atualizados.</li>
          <li>Cada pessoa pode ter uma única conta. A conta é pessoal e não pode ser vendida ou emprestada.</li>
          <li>
            Você é responsável por manter sua senha em segredo e por tudo o que for feito com a sua conta. Se perceber
            um acesso indevido, fale com o <Link href="/suporte">suporte</Link>.
          </li>
          <li>Profissionais podem precisar verificar telefone e documento antes de enviar propostas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Pedidos, propostas e prazos">
        <ul>
          <li>Pedidos devem descrever um serviço real e lícito, com fotos e informações verdadeiras.</li>
          <li>Propostas devem refletir o valor e as condições que o profissional realmente pretende cumprir.</li>
          <li>
            A plataforma tem prazos para visualizar, responder e confirmar etapas. Quando um prazo vence, o Freejob pode
            avançar, encerrar ou liberar o pedido automaticamente, conforme as regras mostradas na própria tela.
          </li>
          <li>O chat existe para combinar o serviço. Não use o chat para assédio, spam ou para pedir dados desnecessários.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Pagamentos">
        <p>
          Pagamentos feitos pelo Freejob são processados pela <strong>Stripe</strong>. O Freejob não armazena os dados
          completos do seu cartão. Quando o pagamento é feito pela plataforma, o valor fica registrado no pedido e as duas
          partes são avisadas da confirmação.
        </p>
        <p>
          Problemas com a execução do serviço (atraso, qualidade, não comparecimento) devem ser resolvidos primeiro entre
          cliente e profissional. Se não houver acordo, fale com o <Link href="/suporte">suporte</Link> para analisarmos o
          caso.
        </p>
      </LegalSection>

      <LegalSection title="5. Planos e assinaturas">
        <ul>
          <li>
            Os recursos e preços de cada plano estão em <Link href="/planos">/planos</Link>. A assinatura é mensal e
            renova automaticamente no cartão cadastrado até ser cancelada.
          </li>
          <li>
            Você pode cancelar a qualquer momento em <Link href="/planos">/planos</Link>. A renovação é interrompida e
            todos os recursos continuam disponíveis até o fim do período já pago. Depois disso, a conta volta ao plano
            gratuito.
          </li>
          <li>
            Pelo Código de Defesa do Consumidor (art. 49), quem contrata pela internet pode desistir em até 7 dias da
            primeira contratação e receber o valor de volta. Para isso, fale com o <Link href="/suporte">suporte</Link>{" "}
            dentro desse prazo.
          </li>
          <li>Fora desse prazo não há reembolso proporcional de períodos já pagos.</li>
          <li>Podemos alterar preços e recursos dos planos. Mudanças de preço valem só a partir da renovação seguinte e serão avisadas com antecedência.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. O que não é permitido">
        <ul>
          <li>Publicar conteúdo falso, ofensivo, discriminatório, sexual ou que viole direitos de terceiros.</li>
          <li>Oferecer ou pedir serviços ilegais.</li>
          <li>Criar contas falsas, se passar por outra pessoa ou manipular avaliações.</li>
          <li>Tentar burlar limites dos planos, prazos ou medidas de segurança da plataforma.</li>
          <li>Usar robôs, raspagem de dados ou qualquer meio automatizado sem autorização.</li>
        </ul>
        <p>
          Se uma dessas regras for descumprida, podemos remover conteúdos, limitar recursos, suspender ou encerrar a conta,
          sem prejuízo de outras medidas legais.
        </p>
      </LegalSection>

      <LegalSection title="7. Avaliações">
        <p>
          Depois de um serviço, cliente e profissional podem se avaliar. As avaliações devem ser honestas e se referir ao
          serviço prestado. Podemos remover avaliações que violem estes termos.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilidades">
        <p>
          Trabalhamos para manter o Freejob disponível e seguro, mas não garantimos funcionamento ininterrupto. Como o
          serviço é combinado e executado entre cliente e profissional, o Freejob não se responsabiliza pela qualidade,
          segurança ou resultado do serviço prestado, nem por danos causados por um usuário a outro, nos limites
          permitidos pela lei.
        </p>
      </LegalSection>

      <LegalSection title="9. Encerramento da conta">
        <p>
          Você pode excluir sua conta a qualquer momento na página de perfil, desde que não haja serviço em andamento ou
          pagamento pendente. Ao excluir, uma assinatura ativa é cancelada. O que acontece com os seus dados está explicado
          na <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações e foro">
        <p>
          Podemos atualizar estes termos. Mudanças importantes serão avisadas no aplicativo ou por e-mail antes de entrarem
          em vigor. Estes termos seguem as leis do Brasil. Para consumidores, vale o foro do domicílio do consumidor.
        </p>
      </LegalSection>

      <LegalSection title="11. Contato">
        <p>
          Dúvidas sobre estes termos: <a href="mailto:contato@freejob.services">contato@freejob.services</a> ou pela página
          de <Link href="/suporte">suporte</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
