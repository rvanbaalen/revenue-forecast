import { describe, it, expect } from 'vitest';
import { router } from './router';

describe('router', () => {
  it('should use hash-based history for GitHub Pages compatibility', () => {
    // Hash history creates hrefs with '#' in the path
    const href = router.history.createHref('/accounts');
    expect(href).toBe('/#/accounts');
  });
});
