import { dump, load } from 'js-yaml';

export function stringifyYaml(obj: any): string {
  try {
    return dump(obj, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      forceQuotes: false
    });
  } catch (err) {
    console.error('Failed to stringify YAML', err);
    return JSON.stringify(obj, null, 2);
  }
}

export function parseYaml<T = any>(str: string): T {
  if (!str || typeof str !== 'string' || !str.trim()) {
    return {} as T;
  }
  try {
    const parsed = load(str);
    if (parsed !== null && typeof parsed === 'object') {
      return parsed as T;
    }
    return {} as T;
  } catch (err) {
    try {
      const jsonParsed = JSON.parse(str);
      if (jsonParsed !== null && typeof jsonParsed === 'object') {
        return jsonParsed as T;
      }
    } catch {
      console.error('Failed to parse YAML and JSON fallback', err);
    }
    return {} as T;
  }
}
