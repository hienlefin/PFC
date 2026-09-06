export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorEnvelope(err: unknown, correlationId?: string) {
  if (err instanceof AppError) {
    return {
      ok: false as const,
      error: { code: err.code, message: err.message },
      correlationId,
      status: err.status,
    };
  }
  console.error(err);
  return {
    ok: false as const,
    error: { code: "INTERNAL", message: "Internal server error" },
    correlationId,
    status: 500,
  };
}
