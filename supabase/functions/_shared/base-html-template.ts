export interface BaseEmailTemplateProps {
  previewText: string;
  heading: string;
  bodyHtml: string;
  unsubscribeUrl?: string;
}

export function generateBaseEmailHtml({
  previewText,
  heading,
  bodyHtml,
  unsubscribeUrl,
}: BaseEmailTemplateProps): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;margin:0;padding:0;">
<div style="display:none;font-size:1px;color:#f6f9fc;max-height:0;overflow:hidden;">${previewText}</div>
<div style="background-color:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px;">
  <div style="padding:24px 40px;"><h1 style="color:#0d9488;font-size:28px;font-weight:700;margin:0;text-align:center;">Half Trip</h1></div>
  <div style="padding:0 40px;">
    <h1 style="color:#1f2937;font-size:24px;font-weight:600;line-height:1.3;margin:0 0 24px;">${heading}</h1>
    ${bodyHtml}
  </div>
  <hr style="border-color:#e5e7eb;margin:32px 40px;border-width:1px 0 0 0;border-style:solid;" />
  <div style="padding:0 40px;">
    <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;text-align:center;">
      <a href="https://halftrip.com" style="color:#0d9488;text-decoration:underline;">Half Trip</a> - Planeje junto. Viaje melhor. Divida justo.
    </p>
    ${unsubscribeUrl ? `<p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:8px 0 0;text-align:center;"><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Cancelar inscrição</a></p>` : ''}
  </div>
</div>
</body></html>`;
}

export const emailStyles = {
  paragraph: 'color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;',
  card: 'background-color:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;padding:20px;margin:24px 0;',
  cardTitle: 'color:#0f766e;font-size:20px;font-weight:600;margin:0 0 12px;',
  cardText: 'color:#374151;font-size:14px;line-height:1.5;margin:0 0 8px;',
  button:
    'background-color:#0d9488;border-radius:6px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;text-align:center;padding:12px 24px;display:inline-block;',
  buttonContainer: 'text-align:center;margin:32px 0;',
  subheading: 'color:#1f2937;font-size:16px;font-weight:600;margin:24px 0 8px;',
  listItem: 'color:#374151;font-size:14px;line-height:1.6;margin:0 0 8px;padding-left:8px;',
  footnote: 'color:#6b7280;font-size:14px;line-height:1.5;margin:24px 0 0;',
};
