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

interface TripReminderEmailProps {
  userName: string;
  tripName: string;
  tripDestination: string;
  startDate: string;
  daysUntil: number;
  tripUrl: string;
  pendingItems: {
    incompleteChecklists: number;
    pendingSettlements: number;
    activitiesWithoutTime: number;
  };
  budgetSummary: {
    spent: number;
    total: number | null;
    currency: string;
  } | null;
}

export function TripReminderEmail({
  userName,
  tripName,
  tripDestination,
  startDate,
  daysUntil,
  tripUrl,
  pendingItems,
  budgetSummary,
}: TripReminderEmailProps) {
  const previewText = `${tripName} começa em ${daysUntil} dias! Veja o que preparar.`;

  const hasPending =
    pendingItems.incompleteChecklists > 0 ||
    pendingItems.pendingSettlements > 0 ||
    pendingItems.activitiesWithoutTime > 0;

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
            <Heading style={heading}>
              Faltam {daysUntil} dia{daysUntil !== 1 ? 's' : ''} para sua viagem!
            </Heading>

            <Text style={paragraph}>
              Oi, <strong>{userName}</strong>! Sua viagem está quase chegando:
            </Text>

            <Section style={tripCard}>
              <Heading as="h2" style={tripNameStyle}>
                {tripName}
              </Heading>
              <Text style={tripDetail}>
                <strong>Destino:</strong> {tripDestination}
              </Text>
              <Text style={tripDetail}>
                <strong>Início:</strong> {startDate}
              </Text>
            </Section>

            {hasPending && (
              <>
                <Heading as="h3" style={subheading}>
                  Itens pendentes
                </Heading>
                {pendingItems.incompleteChecklists > 0 && (
                  <Text style={listItem}>
                    {'☐'} {pendingItems.incompleteChecklists} ite
                    {pendingItems.incompleteChecklists === 1 ? 'm' : 'ns'} de checklist incompleto
                    {pendingItems.incompleteChecklists !== 1 ? 's' : ''}
                  </Text>
                )}
                {pendingItems.pendingSettlements > 0 && (
                  <Text style={listItem}>
                    {'💰'} {pendingItems.pendingSettlements} acerto
                    {pendingItems.pendingSettlements !== 1 ? 's' : ''} pendente
                    {pendingItems.pendingSettlements !== 1 ? 's' : ''}
                  </Text>
                )}
                {pendingItems.activitiesWithoutTime > 0 && (
                  <Text style={listItem}>
                    {'🕐'} {pendingItems.activitiesWithoutTime} atividade
                    {pendingItems.activitiesWithoutTime !== 1 ? 's' : ''} sem horário definido
                  </Text>
                )}
              </>
            )}

            {budgetSummary?.total && (
              <>
                <Heading as="h3" style={subheading}>
                  Orçamento
                </Heading>
                <Text style={paragraph}>
                  Gasto até agora:{' '}
                  <strong>{formatBrl(budgetSummary.spent, budgetSummary.currency)}</strong> de{' '}
                  <strong>{formatBrl(budgetSummary.total, budgetSummary.currency)}</strong>
                </Text>
              </>
            )}

            <Section style={buttonSection}>
              <Button style={button} href={tripUrl}>
                Ver viagem
              </Button>
            </Section>

            <Text style={footnote}>Bom planejamento e boa viagem!</Text>
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

function formatBrl(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
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

const logoSection = { padding: '24px 40px' };

const logoText = {
  color: '#0d9488',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
};

const contentSection = { padding: '0 40px' };

const heading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const subheading = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '24px 0 8px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const listItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 8px',
  paddingLeft: '8px',
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

const buttonSection = { textAlign: 'center' as const, margin: '32px 0' };

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

const hr = { borderColor: '#e5e7eb', margin: '32px 40px' };

const footer = { padding: '0 40px' };

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
};

const link = { color: '#0d9488', textDecoration: 'underline' };
