import type { THttpMethod } from './http-method';

export interface IEndpointDetails {
  CONTROLLER_URL: string;
  REQUEST_METHOD: THttpMethod;
  METHOD_DESCRIPTION: string;
  METHOD_LONG_DESCRIPTION?: string;
}

export function getEndpointDetails(
  controllerUrl: string,
  requestMethod: THttpMethod,
  methodDescription: string,
  methodLongDescription?: string,
): IEndpointDetails {
  return {
    CONTROLLER_URL: controllerUrl,
    REQUEST_METHOD: requestMethod,
    METHOD_DESCRIPTION: methodDescription,
    ...(methodLongDescription !== undefined && {
      METHOD_LONG_DESCRIPTION: methodLongDescription,
    }),
  };
}
