import { describe, expect, it } from 'vitest';
import { hasPlaceholder, splitLegalText } from './legalText';
import { LEGAL_DOCS } from '@/content/legal';

describe('legalText', () => {
  it('splits text, tokens and placeholders', () => {
    expect(splitLegalText('Email {email} or write to [Registered address].')).toEqual([
      { type: 'text', text: 'Email ' },
      { type: 'token', name: 'email' },
      { type: 'text', text: ' or write to ' },
      { type: 'placeholder', text: '[Registered address]' },
      { type: 'text', text: '.' },
    ]);
    expect(splitLegalText('Plain text')).toEqual([{ type: 'text', text: 'Plain text' }]);
    expect(hasPlaceholder('Run by [Registered business name]')).toBe(true);
    expect(hasPlaceholder('Run by Hungrr Foods')).toBe(false);
  });

  it('uses only tokens the policy pages know, and unique section ids', () => {
    const known = ['email', 'whatsapp', 'campus', 'hours', 'privacy', 'terms', 'refunds'];
    Object.values(LEGAL_DOCS).forEach((doc) => {
      const lines = [doc.lead, ...doc.summary];
      doc.sections.forEach((section) =>
        section.blocks.forEach((block) => {
          if (typeof block === 'string') lines.push(block);
          else if (block.list) lines.push(...block.list);
          else if (block.details) lines.push(...block.details.map((d) => d.value));
        }),
      );
      lines.forEach((line) =>
        splitLegalText(line)
          .filter((part) => part.type === 'token')
          .forEach((part) => expect(known).toContain(part.name)),
      );
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
