export function formatErrorMessage(
  error: unknown,
  defaultMessage: string = 'An unknown error occurred',
): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return defaultMessage;
  }
}
