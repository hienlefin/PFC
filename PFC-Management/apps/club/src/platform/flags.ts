export type ClubFlags = {
  jobs: boolean;
  signedDownload: boolean;
  notify: boolean;
  rateLimit: boolean;
  sso: boolean;
  eventEngine: boolean;
};

export function clubFlags(
  env: Record<string, string | undefined> = process.env,
): ClubFlags {
  return {
    jobs: env.CLUB_FLAG_JOBS !== "0",
    signedDownload: env.CLUB_FLAG_SIGNED_DOWNLOAD !== "0",
    notify: env.CLUB_FLAG_NOTIFY !== "0",
    rateLimit: env.CLUB_FLAG_RATE_LIMIT !== "0",
    sso: env.CLUB_FLAG_SSO !== "0",
    eventEngine: env.CLUB_FLAG_EVENT_ENGINE !== "0",
  };
}
