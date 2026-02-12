import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvatarSelector } from './avatar-selector';

const participants = [
  { id: 'u1', name: 'Alice', avatar_url: null },
  { id: 'u2', name: 'Bob', avatar_url: null },
  { id: 'u3', name: 'Carol', avatar_url: null },
];

describe('AvatarSelector', () => {
  it('renders all participants', () => {
    render(<AvatarSelector participants={participants} selected="u1" onSelect={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('marks selected participant with aria-checked', () => {
    render(<AvatarSelector participants={participants} selected="u1" onSelect={vi.fn()} />);
    const selected = screen.getByRole('radio', { name: /alice/i });
    expect(selected).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onSelect when clicking a participant', () => {
    const onSelect = vi.fn();
    render(<AvatarSelector participants={participants} selected="u1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('radio', { name: /bob/i }));
    expect(onSelect).toHaveBeenCalledWith('u2');
  });

  it('has radiogroup role on container', () => {
    render(<AvatarSelector participants={participants} selected="u1" onSelect={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('navigates with arrow keys', () => {
    const onSelect = vi.fn();
    render(<AvatarSelector participants={participants} selected="u1" onSelect={onSelect} />);
    const first = screen.getByRole('radio', { name: /alice/i });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('u2');
  });
});
