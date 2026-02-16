import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageContainer } from './page-container';

describe('PageContainer', () => {
  it('does not duplicate mobile footer spacing when bottom nav is enabled', () => {
    render(
      <PageContainer bottomNav>
        <span>conteudo</span>
      </PageContainer>
    );

    const content = screen.getByText('conteudo');
    const container = content.parentElement;
    expect(container).toHaveClass('md:pb-6');
    expect(container).not.toHaveClass('pb-24');
    expect(container).not.toHaveClass('pb-8');
  });
});
