import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Scale, Shield, CreditCard, Lightbulb, AlertTriangle, RefreshCw, Lock } from 'lucide-react';

const SECTIONS = [
  {
    icon: FileText,
    title: '1. Descrição do Serviço',
    content: `O CineMatch é uma plataforma de recomendação de filmes e séries que utiliza inteligência artificial e algoritmos de personalização para sugerir conteúdos adequados ao seu perfil cinematográfico. O serviço inclui, mas não se limita a:

• Quiz de perfil cinematográfico para mapear suas preferências
• Recomendações personalizadas baseadas em seus gostos e humor
• Funcionalidade "Oráculo" com IA para sugestões contextuais
• Feed diário com dicas curadas
• Integração com plataformas de streaming para verificar disponibilidade
• Perfil público compartilhável

O CineMatch não hospeda, distribui ou exibe conteúdo audiovisual. Apenas recomenda e direciona o usuário para as plataformas oficiais onde o conteúdo está disponível.`
  },
  {
    icon: Scale,
    title: '2. Contas e Registros',
    content: `Para utilizar os recursos completos do CineMatch, você precisa criar uma conta. Ao se registrar, você concorda que:

• Fornecerá informações verdadeiras, precisas e completas
• Manterá seus dados atualizados
• É responsável pela segurança de sua conta e senha
• Notificará imediatamente qualquer uso não autorizado
• Tem pelo menos 13 anos de idade (ou a idade mínima exigida em sua jurisdição)

Podemos suspender ou encerrar contas que violem estes termos ou que permaneçam inativas por mais de 12 meses consecutivos.`
  },
  {
    icon: Shield,
    title: '3. Uso Aceitável',
    content: `Ao usar o CineMatch, você se compromete a NÃO:

• Violar qualquer lei ou regulamento aplicável
• Copiar, modificar ou distribuir o conteúdo da plataforma sem autorização
• Utilizar robôs, scrapers ou meios automatizados para acessar o serviço
• Tentar acessar contas de outros usuários sem autorização
• Interferir no funcionamento adequado da plataforma
• Publicar conteúdo ofensivo, difamatório ou ilegal
• Utilizar o serviço para fins comerciais não autorizados
• Burlar, descompilar ou realizar engenharia reversa de qualquer parte do serviço

Violações destas regras podem resultar em advertência, suspensão temporária ou encerramento permanente da conta, sem reembolso de valores pagos.`
  },
  {
    icon: CreditCard,
    title: '4. Pagamentos e Assinaturas',
    content: `O CineMatch oferece planos gratuitos e pagos (PRO). Sobre os planos pagos:

• Os preços são exibidos em Reais (R$) e incluem todos os impostos aplicáveis
• O pagamento é processado de forma segura via Stripe
• A assinatura é renovada automaticamente ao final de cada período
• Você pode cancelar a qualquer momento nas configurações da conta
• Após o cancelamento, o acesso PRO permanece ativo até o fim do período já pago
• Oferecemos garantia de 7 dias — se não estiver satisfeito, devolvemos 100% do valor
• Promoções e descontos são válidos apenas para o período especificado
• Não realizamos reembolsos parciais para períodos não utilizados após os 7 dias de garantia`
  },
  {
    icon: Lightbulb,
    title: '5. Propriedade Intelectual',
    content: `Todo o conteúdo do CineMatch — incluindo mas não limitado a textos, gráficos, logos, ícones, imagens, clipes de áudio, software e compilação de dados — é propriedade do CineMatch ou de seus licenciadores e é protegido pelas leis brasileiras e internacionais de propriedade intelectual.

• Você não adquire nenhum direito de propriedade sobre o conteúdo ao usar o serviço
• Pôsters, títulos e descrições de filmes são propriedade de seus respectivos estúdios e distribuidores
• Seu perfil cinematográfico e dados de quiz são de sua propriedade, mas você nos concede licença para processá-los conforme necessário para fornecer o serviço
• Feedback e sugestões enviados por você podem ser utilizados para melhorar o serviço sem obrigação de compensação`
  },
  {
    icon: AlertTriangle,
    title: '6. Limitação de Responsabilidade',
    content: `O CineMatch é fornecido "como está" e "conforme disponível". Na máxima extensão permitida por lei:

• Não garantimos que o serviço estará disponível de forma ininterrupta ou livre de erros
• As recomendações são sugestões baseadas em algoritmos e não constituem garantia de satisfação
• Não nos responsabilizamos pela disponibilidade ou qualidade dos conteúdos nas plataformas de streaming parceiras
• Não nos responsabilizamos por decisões de assinatura de plataformas de streaming baseadas em nossas recomendações
• Nossa responsabilidade total é limitada ao valor pago por você nos últimos 12 meses de assinatura
• Não nos responsabilizamos por danos indiretos, incidentais, especiais ou consequentes

Esta limitação não se aplica a danos causados por dolo ou negligência grave do CineMatch.`
  },
  {
    icon: RefreshCw,
    title: '7. Alterações nos Termos',
    content: `Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. Quando houver alterações significativas:

• Notificaremos você por e-mail com pelo menos 15 dias de antecedência
• As alterações serão publicadas nesta página com a data de atualização
• O uso continuado do serviço após a notificação constitui aceitação dos novos termos
• Se você não concordar com as alterações, pode cancelar sua assinatura sem multa
• Alterações que reduzam seus direitos só entram em vigor após o período de notificação

A versão mais recente destes termos estará sempre disponível em cinematch.com.br/terms.`
  },
  {
    icon: Lock,
    title: '8. LGPD e Proteção de Dados',
    content: `Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), informamos que:

• Coletamos apenas os dados necessários para fornecer e melhorar nosso serviço
• Seus dados são processados com base no seu consentimento ou legítimo interesse
• Você pode acessar, corrigir, excluir ou portar seus dados a qualquer momento
• Não vendemos seus dados pessoais a terceiros
• Compartilhamos dados apenas com processadores essenciais ao serviço (Stripe, Supabase)
• Seus dados são armazenados em servidores seguros com criptografia
• Mantemos seus dados apenas pelo tempo necessário para as finalidades declaradas
• Você pode revogar seu consentimento a qualquer momento nas configurações da conta

Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, consulte nossa Política de Privacidade completa ou entre em contato conosco.`
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans overflow-y-auto selection:bg-purple-500/30 custom-scrollbar">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/8 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-6 border border-purple-500/20">
            <FileText className="w-4 h-4" />
            Documento Legal
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Termos de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">
              Uso
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            Última atualização: 4 de março de 2025
          </p>
        </div>

        {/* Intro */}
        <div className="glass-card rounded-2xl p-6 mb-8 border border-white/10">
          <p className="text-gray-300 leading-relaxed">
            Bem-vindo ao CineMatch! Ao acessar e utilizar nossa plataforma, você concorda com os
            seguintes Termos de Uso. Recomendamos que leia este documento com atenção antes de
            utilizar nossos serviços. Se você não concordar com qualquer parte destes termos, por
            favor, não utilize o CineMatch.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="glass-card rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">{section.title}</h2>
                </div>
                <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Dúvidas sobre estes termos? Entre em contato conosco.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/privacy"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-400/40 hover:decoration-purple-300/60 transition-colors text-sm"
            >
              Política de Privacidade
            </Link>
            <span className="text-gray-600">•</span>
            <a
              href="mailto:contato@cinematch.com.br"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-400/40 hover:decoration-purple-300/60 transition-colors text-sm"
            >
              contato@cinematch.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
