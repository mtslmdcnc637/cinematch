import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Eye, Share2, Cookie, Clock, UserCheck, Mail } from 'lucide-react';

const SECTIONS = [
  {
    icon: Database,
    title: '1. Dados que Coletamos',
    content: `Coletamos os seguintes tipos de dados para fornecer e melhorar nosso serviço:

Dados fornecidos por você:
• Nome e endereço de e-mail no cadastro
• Respostas do quiz de perfil cinematográfico
• Preferências de gêneros, eras e streamings
• Consentimentos LGPD registrados

Dados coletados automaticamente:
• Informações de uso: páginas visitadas, funcionalidades utilizadas, tempo de interação
• Dados do dispositivo: tipo de navegador, sistema operacional, resolução de tela
• Dados de localização: país e cidade (baseados em IP, não GPS)
• Cookies e tecnologias similares (detalhados na seção 4)

Dados de pagamento (processados pelo Stripe):
• Não armazenamos dados de cartão de crédito
• O Stripe processa pagamentos de forma segura e isolada
• Recebemos apenas confirmação de transação e status de assinatura

Dados de terceiros:
• Informações de autenticação quando você faz login via Google ou outros provedores
• Dados de disponibilidade de conteúdos via APIs de plataformas de streaming`,
  },
  {
    icon: Eye,
    title: '2. Como Usamos Seus Dados',
    content: `Utilizamos seus dados pessoais para as seguintes finalidades:

Fornecimento do serviço:
• Gerar seu perfil cinematográfico personalizado
• Produzir recomendações de filmes e séries baseadas em seus gostos
• Funcionamento do Oráculo de IA com respostas contextuais
• Verificar disponibilidade de conteúdos nos seus streamings

Comunicação:
• Enviar o resultado do quiz e seu perfil cinematográfico por e-mail
• Notificações sobre alterações nos termos de uso (obrigatório)
• Dicas diárias e novidades (apenas com seu consentimento)
• Alertas sobre novos recursos relevantes ao seu perfil

Melhoria do serviço:
• Análise agregada e anônima de padrões de uso
• Treinamento e aprimoramento dos algoritmos de recomendação
• Testes A/B para melhorar a experiência do usuário
• Prevenção de fraudes e abuso da plataforma

Base legal para processamento:
• Consentimento (Art. 7º, I da LGPD) — para comunicações de marketing e coleta opcional
• Execução de contrato (Art. 7º, V) — para fornecer o serviço contratado
• Legítimo interesse (Art. 7º, IX) — para melhorias e segurança do serviço
• Obrigação legal (Art. 7º, II) — para cumprir obrigações fiscais e regulatórias`,
  },
  {
    icon: Share2,
    title: '3. Compartilhamento de Dados',
    content: `Seus dados podem ser compartilhados apenas nas seguintes situações:

Processadores essenciais:
• Supabase — infraestrutura de banco de dados e autenticação (EUA/Irlanda)
• Stripe — processamento seguro de pagamentos (EUA)
• OpenAI — processamento de IA para o Oráculo (EUA)

Compartilhamos apenas os dados estritamente necessários para cada serviço executar sua função. Todos os processadores estão vinculados a acordos de processamento de dados em conformidade com a LGPD.

Obrigações legais:
• Autoridades públicas quando exigido por lei ou ordem judicial
• Órgãos reguladores em caso de auditoria

Não compartilhamos com:
• Plataformas de publicidade ou ad networks
• Corretores de dados (data brokers)
• Qualquer terceiro para fins não especificados nestes termos

Transferências internacionais:
• Alguns processadores operam fora do Brasil. Garantimos que todas as transferências internacionais seguem as salvaguardas adequadas previstas na LGPD (Art. 33), incluindo cláusulas contratuais padrão.`,
  },
  {
    icon: Cookie,
    title: '4. Cookies e Rastreamento',
    content: `Utilizamos cookies e tecnologias similares para:

Cookies essenciais (sempre ativos):
• Sessão de autenticação e segurança
• Preferências de idioma e tema
• Token de consentimento LGPD

Cookies de desempenho:
• Análise de uso e métricas de desempenho
• Identificação de erros e problemas técnicos
• Dados agregados e anônimos

Cookies de personalização:
• Lembrar suas preferências e configurações
• Personalizar recomendações e conteúdo

Você pode gerenciar cookies:
• Através das configurações do seu navegador
• Nas configurações de privacidade da sua conta CineMatch
• Cookies essenciais não podem ser desabilitados sem comprometer o funcionamento do serviço

Não utilizamos cookies de rastreamento de terceiros para publicidade direcionada.`,
  },
  {
    icon: Clock,
    title: '5. Retenção de Dados',
    content: `Mantemos seus dados pessoais pelo tempo necessário para as finalidades declaradas:

• Dados de conta: enquanto sua conta estiver ativa ou pelo período necessário para obrigações legais
• Dados de quiz e perfil: enquanto você manter a conta, ou até solicitar exclusão
• Histórico de pagamentos: 5 anos (exigência fiscal brasileira)
• Logs de acesso: 90 dias para fins de segurança
• Consentimentos: 5 anos a partir da coleta (comprovação LGPD)
• Dados de comunicação: até revogação do consentimento

Quando os dados não são mais necessários:
• Dados são anonimizados para fins estatísticos, OU
• Dados são excluídos de forma segura e irreversível

Contas inativas:
• Após 12 meses sem login, enviaremos um aviso por e-mail
• Após 30 dias do aviso sem resposta, os dados podem ser excluídos
• Dados de pagamento são mantidos conforme exigência fiscal`,
  },
  {
    icon: UserCheck,
    title: '6. Seus Direitos (LGPD)',
    content: `Em conformidade com a Lei Geral de Proteção de Dados, você tem os seguintes direitos:

Direito de acesso (Art. 18, II):
• Solicitar uma cópia de todos os dados pessoais que mantemos sobre você

Direito de correção (Art. 18, III):
• Solicitar a correção de dados incompletos, inexatos ou desatualizados

Direito de exclusão (Art. 18, VI):
• Solicitar a exclusão de seus dados pessoais (exceto quando retenção for obrigatória por lei)

Direito de portabilidade (Art. 18, V):
• Receber seus dados em formato estruturado e de uso corrente

Direito de revogação do consentimento (Art. 8º, §5º):
• Revogar a qualquer momento consentimentos previamente dados, sem comprometer a licitude do processamento anterior

Direito de oposição (Art. 18, IV):
• Opor-se ao processamento baseado em legítimo interesse

Direito de informação (Art. 18, I):
• Ser informado sobre quais dados são coletados e como são utilizados

Como exercer seus direitos:
• Acesse as configurações de privacidade da sua conta CineMatch
• Envie um e-mail para privacidade@cinematch.com.br
• Responderemos sua solicitação em até 15 dias úteis, conforme previsto na LGPD`,
  },
  {
    icon: Mail,
    title: '7. Contato do Encarregado',
    content: `Para exercer seus direitos LGPD, esclarecer dúvidas sobre esta política ou reportar preocupações sobre o tratamento de seus dados pessoais:

Encarregado de Proteção de Dados (DPO)
E-mail: privacidade@cinematch.com.br
Assunto: "Solicitação LGPD — [seu nome]"

Prazo de resposta: até 15 dias úteis

Autoridade de Proteção de Dados:
Se você entender que o tratamento de seus dados viola a LGPD, poderá apresentar uma reclamação perante a Autoridade Nacional de Proteção de Dados (ANPD):

• Site: www.gov.br/anpd
• E-mail: ouvidoria@anpd.gov.br

Endereço do CineMatch:
CineMatch Tecnologia Ltda.
CNPJ: [inserir CNPJ]
Endereço: [inserir endereço da sede]

Alterações nesta política:
• Notificaremos você por e-mail sobre alterações significativas
• A versão atualizada estará sempre disponível em cinematch.com.br/privacy
• O uso continuado após notificação constitui aceitação das alterações`,
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans overflow-y-auto selection:bg-purple-500/30 custom-scrollbar">
      {/* Background Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/8 blur-[100px]" />
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
            <Shield className="w-4 h-4" />
            Proteção de Dados
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Política de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">
              Privacidade
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            Última atualização: 4 de março de 2025
          </p>
        </div>

        {/* Intro */}
        <div className="glass-card rounded-2xl p-6 mb-8 border border-white/10">
          <p className="text-gray-300 leading-relaxed">
            A privacidade dos seus dados é fundamental para nós. Esta Política de Privacidade
            descreve como o CineMatch coleta, usa, armazena e protece suas informações pessoais,
            em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            Leia atentamente para entender como tratamos seus dados.
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
            Dúvidas sobre privacidade? Fale com nosso Encarregado de Dados.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/terms"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-400/40 hover:decoration-purple-300/60 transition-colors text-sm"
            >
              Termos de Uso
            </Link>
            <span className="text-gray-600">•</span>
            <a
              href="mailto:privacidade@cinematch.com.br"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-400/40 hover:decoration-purple-300/60 transition-colors text-sm"
            >
              privacidade@cinematch.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
