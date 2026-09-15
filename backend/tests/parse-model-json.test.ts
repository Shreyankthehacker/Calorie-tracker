import { describe, expect, it } from 'vitest';
import { parseModelJson } from '../src/ai/parse-model-json.js';

describe('parseModelJson', () => {
  it('parses a plain JSON object', () => {
    expect(parseModelJson('{"foodName":"Oats","calories":320}')).toEqual({
      foodName: 'Oats',
      calories: 320,
    });
  });

  it('parses fenced JSON', () => {
    const text = '```json\n{"foodName":"Rice"}\n```';
    expect(parseModelJson(text)).toEqual({ foodName: 'Rice' });
  });

  it('extracts the first object when the model adds prose', () => {
    expect(parseModelJson('Here you go: {"ok":true} thanks')).toEqual({ ok: true });
  });

  it('rejects empty output', () => {
    expect(() => parseModelJson('   ')).toThrow('empty_model_output');
  });

  it('rejects output that is not JSON', () => {
    expect(() => parseModelJson('not json at all')).toThrow('invalid_model_json');
  });
});
