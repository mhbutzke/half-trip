import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  const previewText = `Bem-vindo ao Half Trip, ${userName}! Comece a planejar sua próxima viagem.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logoText}>Half Trip</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>Bem-vindo ao Half Trip!</Heading>

            <Text style={paragraph}>
              Olá <strong>{userName}</strong>,
            </Text>

            <Text style={paragraph}>
              Sua conta foi criada com sucesso! Agora você pode planejar viagens em grupo, criar
              roteiros colaborativos e dividir despesas de forma justa.
            </Text>

            <Section style={featureCard}>
              <Text style={featureTitle}>O que você pode fazer:</Text>
              <Text style={featureItem}>Criar e organizar viagens em grupo</Text>
              <Text style={featureItem}>Montar itinerários colaborativos</Text>
              <Text style={featureItem}>Registrar e dividir despesas</Text>
              <Text style={featureItem}>Acompanhar orçamentos e checklists</Text>
              <Text style={featureItem}>Exportar relatórios em PDF e CSV</Text>
            </Section>

            <Section style={buttonSection}>
              <Button style={button} href={loginUrl}>
                Começar a planejar
              </Button>
            </Section>

            <Text style={footnote}>
              Dica: convide seus amigos para participar das viagens e aproveitar ao máximo a
              plataforma!
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              <Link href="https://halftrip.com" style={link}>
                Half Trip
              </Link>{' '}
              - Planeje junto. Viaje melhor. Divida justo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const logoSection = {
  padding: '24px 40px',
};

const logoText = {
  color: '#0d9488',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
};

const contentSection = {
  padding: '0 40px',
};

const heading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const featureCard = {
  backgroundColor: '#f0fdfa',
  borderRadius: '8px',
  border: '1px solid #99f6e4',
  padding: '20px',
  margin: '24px 0',
};

const featureTitle = {
  color: '#0f766e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const featureItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 6px',
  paddingLeft: '12px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0d9488',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
  display: 'inline-block',
};

const footnote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '24px 0 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 40px',
};

const footer = {
  padding: '0 40px',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
};

const link = {
  color: '#0d9488',
  textDecoration: 'underline',
};
