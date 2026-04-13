describe('Admin Dashboard Flow', () => {
  it('should block unauthenticated access to admin dashboard routes', () => {
    cy.visit('/admin/dashboard');
    cy.url().should('include', '/login');
  });

  it('should block unauthenticated access to system jobs route', () => {
    cy.visit('/admin/jobs');
    cy.url().should('include', '/login');
  });

  it('should block unauthenticated access to user management', () => {
    cy.visit('/admin/users');
    cy.url().should('include', '/login');
  });
});
