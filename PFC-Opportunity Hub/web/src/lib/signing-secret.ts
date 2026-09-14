export function signingSecret(): string | null {
  const secret = process.env.CV_SIGNING_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}
