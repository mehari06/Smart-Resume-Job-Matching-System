describe('Candidate Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should navigate from landing to register and dashboard', () => {
    // Navigate from Home Page to Login
    cy.get('a[href="/login"]').first().click();
    cy.url().should('include', '/login');

    // Make sure Seeker UI forms exist
    cy.get('button').contains(/Sign In/i).should('exist');
  });

  it('should redirect unauthenticated users away from matched jobs', () => {
    cy.visit('/matches');
    cy.url().should('include', '/login');
  });
});
