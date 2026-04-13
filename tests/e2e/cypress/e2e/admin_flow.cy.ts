describe('Admin Dashboard Flow', () => {
  it('should block unauthenticated access to admin dashboard routes', () => {
    cy.visit('/admin/dashboard', { failOnStatusCode: false });
    cy.url().should('include', '/login?callbackUrl=%2Fadmin%2Fdashboard');
  });

  it('should block unauthenticated access to system jobs route', () => {
    cy.visit('/admin/jobs', { failOnStatusCode: false });
    cy.url().should('include', '/login?callbackUrl=%2Fadmin%2Fjobs');
  });

  it('should block unauthenticated access to user management', () => {
    cy.visit('/admin/users', { failOnStatusCode: false });
    cy.url().should('match', /\/login/);
  });
});
