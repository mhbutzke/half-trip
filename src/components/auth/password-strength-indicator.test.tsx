import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordStrengthIndicator } from './password-strength-indicator';

describe('PasswordStrengthIndicator', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Fraca" for a weak password', () => {
    render(<PasswordStrengthIndicator password="abc" />);
    expect(screen.getByText('Fraca')).toBeInTheDocument();
  });

  it('shows "Forte" for a password meeting all criteria', () => {
    render(<PasswordStrengthIndicator password="Str0ng!Pass" />);
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('shows "Média" for a password with 3 criteria met', () => {
    render(<PasswordStrengthIndicator password="abcdefgh1" />);
    // 8+ chars, lowercase, number = 3 criteria
    expect(screen.getByText('Média')).toBeInTheDocument();
  });

  it('shows "Boa" for a password with 4 criteria met', () => {
    render(<PasswordStrengthIndicator password="Abcdefgh1" />);
    // 8+ chars, uppercase, lowercase, number = 4 criteria
    expect(screen.getByText('Boa')).toBeInTheDocument();
  });

  it('renders all 5 criteria labels', () => {
    render(<PasswordStrengthIndicator password="a" />);
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Letra maiúscula')).toBeInTheDocument();
    expect(screen.getByText('Letra minúscula')).toBeInTheDocument();
    expect(screen.getByText('Número')).toBeInTheDocument();
    expect(screen.getByText('Caractere especial')).toBeInTheDocument();
  });

  it('has accessible role and label', () => {
    render(<PasswordStrengthIndicator password="test" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Força da senha')
    );
  });
});
