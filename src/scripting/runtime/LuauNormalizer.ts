/**
 * LuauNormalizer:
 * Normalizes Luau syntax features into standard Lua 5.3 that can be parsed
 * by luaparse without altering line numbers (crucial for exact line error reporting).
 */

export function normalizeLuauSource(source: string): string {
  // Normalize line endings
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const normalizedLines = lines.map((line) => {
    // If line starts with Luau pragma comment, e.g. --!strict or --!nonstrict, keep it as empty comment
    if (line.trim().startsWith('--!')) {
      return '-- [luau pragma]';
    }

    // Luau type definitions: "type Point = ..." or "export type Point = ..."
    if (/^\s*(?:export\s+)?type\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:<[^>]*>)?\s*=/.test(line)) {
      return '-- [type definition]';
    }

    let processed = line;

    // Luau continue statement
    processed = processed.replace(/^(\s*)continue(\s*(?:;.*)?)$/, '$1__continue__()$2');

    // Luau string interpolation: `Hello {name}!` -> ("Hello " .. tostring(name) .. "!")
    if (processed.includes('`')) {
      processed = processed.replace(/`([^`]*)`/g, (_, content) => {
        // Replace {expr} inside with " .. tostring(expr) .. "
        const parts: string[] = [];
        let lastIndex = 0;
        const interpRegex = /\{([^}]+)\}/g;
        let match: RegExpExecArray | null;

        while ((match = interpRegex.exec(content)) !== null) {
          const literal = content.substring(lastIndex, match.index);
          if (literal.length > 0) {
            parts.push(JSON.stringify(literal));
          }
          const expr = match[1].trim();
          parts.push(`tostring(${expr})`);
          lastIndex = interpRegex.lastIndex;
        }

        const remaining = content.substring(lastIndex);
        if (remaining.length > 0 || parts.length === 0) {
          parts.push(JSON.stringify(remaining));
        }

        return `(${parts.join(' .. ')})`;
      });
    }

    // Strip type casts: expr :: Type
    processed = processed.replace(/::\s*[A-Za-z_][A-Za-z0-9_.]*(?:<[^>]*>)?/g, '');

    // Strip function return type annotation: function foo(): Type -> function foo()
    processed = processed.replace(/\)\s*:\s*[A-Za-z_][A-Za-z0-9_.]*(?:<[^>]*>)?\s*$/g, ')');

    // Strip parameter type annotations: function foo(x: number, y: string) -> function foo(x, y)
    processed = processed.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*[A-Za-z_][A-Za-z0-9_.]*(?:<[^>]*>)?(?=[,\)])/g, '$1');

    // Strip variable type annotations: local x: Type = val
    processed = processed.replace(
      /(\blocal\s+[A-Za-z_][A-Za-z0-9_]*)\s*:\s*[A-Za-z_][A-Za-z0-9_.]*(?:<[^>]*>)?\s*(=|\n|$)/g,
      '$1 $2'
    );

    // Compound assignment operators: +=, -=, *=, /=, %=, ^=, ..=
    // Match: target [op]= expr
    if (
      processed.includes('+=') ||
      processed.includes('-=') ||
      processed.includes('*=') ||
      processed.includes('/=') ||
      processed.includes('%=') ||
      processed.includes('^=') ||
      processed.includes('..=')
    ) {
      const compoundMatch = processed.match(
        /^(\s*)([a-zA-Z_][a-zA-Z0-9_.]*(?:\[[^\]]*\])?)\s*(\+=|-=|\*=|\/=|\%=|\^=|\.\.=)\s*(.*)$/
      );
      if (compoundMatch) {
        const indent = compoundMatch[1];
        const lhs = compoundMatch[2];
        const op = compoundMatch[3].slice(0, -1); // remove '='
        const rhs = compoundMatch[4];
        processed = `${indent}${lhs} = ${lhs} ${op} (${rhs})`;
      }
    }

    return processed;
  });

  return normalizedLines.join('\n');
}

