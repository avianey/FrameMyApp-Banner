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
  try {
    return (load(str) as T) || ({} as T);
  } catch (err) {
    console.error('Failed to parse YAML, fallback to JSON parse', err);
    return JSON.parse(str) as T;
  }
}
