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

interface ConfirmationEmailProps {
  userName: string;
  confirmationUrl: string;
}

export function ConfirmationEmail({ userName, confirmationUrl }: ConfirmationEmailProps) {
  const previewText = `Confirme seu email para ativar sua conta no Half Trip`;

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
            <Heading style={heading}>Confirme seu email</Heading>

            <Text style={paragraph}>
              Ola <strong>{userName}</strong>,
            </Text>

            <Text style={paragraph}>
              Obrigado por criar sua conta no Half Trip! Para ativar sua conta e comecar a planejar
              suas viagens, confirme seu email clicando no botao abaixo:
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={confirmationUrl}>
                Confirmar email
              </Button>
            </Section>

            <Text style={footnote}>
              Este link expira em 24 horas. Se voce nao criou uma conta no Half Trip, pode ignorar
              este email.
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
