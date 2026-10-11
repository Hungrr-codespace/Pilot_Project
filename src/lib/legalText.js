// Splits a line of policy text into parts: plain text, {tokens} that the page fills in (links such as {email},
// values such as {hours}) and [placeholders] for details still to be filled in (shown highlighted).
const PARTS = /(\{[a-z]+\}|\[[^\]\n]+\])/;

export function splitLegalText(text) {
  return String(text)
    .split(PARTS)
    .filter(Boolean)
    .map((part) => {
      if (/^\{[a-z]+\}$/.test(part)) return { type: 'token', name: part.slice(1, -1) };
      if (/^\[[^\]\n]+\]$/.test(part)) return { type: 'placeholder', text: part };
      return { type: 'text', text: part };
    });
}

// Whether a line still has details to fill in.
export const hasPlaceholder = (text) => splitLegalText(text).some((part) => part.type === 'placeholder');
