import type { ErrorEntry } from '../../constants';

export class TransportError extends Error {
  public readonly error: ErrorEntry;

  constructor(error: ErrorEntry, message?: string) {
    super(message ?? error.message);
    this.error = error;
    this.name = 'TransportError';
  }
}
