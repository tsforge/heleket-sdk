/**
 * Same output as PHP `json_encode($value, JSON_UNESCAPED_UNICODE)`:
 * forward slashes are escaped, and Heleket signatures depend on that.
 */
export const phpJsonEncode = (value: unknown): string =>
  JSON.stringify(value).replace(/\//g, '\\/');
