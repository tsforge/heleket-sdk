export const HTTP_METHOD = {
  GET: 'get',
  POST: 'post',
} as const;

export type THttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];
