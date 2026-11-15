export function passwordResetConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.APP_ORIGIN);
}

export async function sendPasswordReset(email: string, token: string, language: 'de' | 'en'): Promise<void> {
  const origin = new URL(process.env.APP_ORIGIN!);
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') {
    throw new Error('APP_ORIGIN must use HTTPS');
  }
  const url = new URL('/reset-password', origin);
  // Fragments stay out of HTTP request logs and Referer headers.
  url.hash = new URLSearchParams({ token }).toString();
  const en = language === 'en';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject: en ? 'Reset your Clever Match password' : 'Clever Match-Passwort zurücksetzen',
      text: en
        ? `Use this link within 30 minutes to reset your password:\n${url}\n\nIf you did not request this, ignore this email.`
        : `Mit diesem Link kannst du innerhalb von 30 Minuten dein Passwort zurücksetzen:\n${url}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail.`,
    }),
  });
  if (!response.ok) throw new Error('Email delivery failed');
}

export async function sendEmailVerification(email: string, token: string, language: 'de' | 'en'): Promise<void> {
  if (!passwordResetConfigured()) throw new Error('Email is not configured');
  const origin = new URL(process.env.APP_ORIGIN!);
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('HTTPS required');
  const url = new URL('/verify-email', origin);
  url.hash = new URLSearchParams({ token }).toString();
  const en = language === 'en';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email],
      subject: en ? 'Confirm your Clever Match email address' : 'Clever Match – E-Mail-Adresse bestätigen',
      text: en ? `Confirm your email address within 30 minutes:\n${url}\n\nIf you did not register, ignore this email.`
        : `Bestätige deine E-Mail-Adresse innerhalb von 30 Minuten:\n${url}\n\nWenn du dich nicht registriert hast, ignoriere diese E-Mail.` }),
  });
  if (!response.ok) throw new Error('Email delivery failed');
}
