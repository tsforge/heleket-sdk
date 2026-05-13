export interface ICommandResponse<T> {
  isSuccess: boolean;
  data?: T;
  code?: string;
  message?: string;
  errors?: unknown;
}
