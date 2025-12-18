import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';
import { CheckCircle2 } from 'lucide-react';

describe('Button', () => {
  it('should be clickable when not disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button onClick={onClick}>
        Click me
      </Button>
    );

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be clickable when size is lg and contains an SVG icon', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button size="lg" onClick={onClick}>
        <CheckCircle2 className="size-5" />
        Import 5 Transactions
      </Button>
    );

    const button = screen.getByRole('button', { name: /import 5 transactions/i });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be clickable when clicking directly on the SVG icon area', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button size="lg" onClick={onClick} data-testid="import-button">
        <CheckCircle2 className="size-5" data-testid="button-icon" />
        Import 5 Transactions
      </Button>
    );

    // Click on the icon element directly
    const icon = screen.getByTestId('button-icon');
    await user.click(icon);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not be clickable when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button size="lg" onClick={onClick} disabled>
        <CheckCircle2 className="size-5" />
        Import 5 Transactions
      </Button>
    );

    const button = screen.getByRole('button', { name: /import 5 transactions/i });
    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });
});
