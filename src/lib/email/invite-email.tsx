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

interface InviteEmailProps {
  inviteUrl: string;
  tripName: string;
  tripDestination: string;
  tripStartDate: string;
  tripEndDate: string;
  inviterName: string;
  recipientEmail: string;
}

export function InviteEmail({
  inviteUrl,
  tripName,
  tripDestination,
  tripStartDate,
  tripEndDate,
  inviterName,
}: InviteEmailProps) {
  const previewText = `${inviterName} te convidou para participar da viagem "${tripName}"`;

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
            <Heading style={heading}>Convite para viagem</Heading>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> te convidou para participar de uma viagem no Half Trip!
            </Text>

            <Section style={tripCard}>
              <Heading as="h2" style={tripNameStyle}>
                {tripName}
              </Heading>
              <Text style={tripDetail}>
                <strong>Destino:</strong> {tripDestination}
              </Text>
              <Text style={tripDetail}>
                <strong>Datas:</strong> {tripStartDate} - {tripEndDate}
              </Text>
            </Section>

            <Text style={paragraph}>
              Clique no botao abaixo para ver os detalhes da viagem e participar:
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={inviteUrl}>
                Ver convite e participar
              </Button>
            </Section>

            <Text style={footnote}>
              O link expira em 7 dias. Se voce nao esperava receber este email, pode ignora-lo.
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

// Email-safe inline styles (no CSS variables, no modern CSS)
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

const tripCard = {
  backgroundColor: '#f0fdfa',
  borderRadius: '8px',
  border: '1px solid #99f6e4',
  padding: '20px',
  margin: '24px 0',
};

const tripNameStyle = {
  color: '#0f766e',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const tripDetail = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px',
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
