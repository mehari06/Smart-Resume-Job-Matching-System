describe('Recruiter Flow', () => {
  it('should block non-recruiters from accessing recruiter dashboard', () => {
    cy.visit('/recruiter');
    cy.url().should('include', '/login');
  });

  it('verifies the job posting form restricts unauthenticated users', () => {
    cy.visit('/jobs/new');
    cy.url().should('include', '/login');
  });
});
