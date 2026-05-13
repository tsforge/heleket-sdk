export type HttpMethod = 'post' | 'get' | 'put' | 'delete' | 'patch';

export interface IEndpointDetails {
  CONTROLLER_URL: string;
  REQUEST_METHOD: HttpMethod;
  METHOD_DESCRIPTION: string;
  METHOD_LONG_DESCRIPTION?: string;
}

export function getEndpointDetails(
  controllerUrl: string,
  requestMethod: HttpMethod,
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
