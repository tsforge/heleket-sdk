export const tryParseJson = <T>(body: string): T | null => {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};
