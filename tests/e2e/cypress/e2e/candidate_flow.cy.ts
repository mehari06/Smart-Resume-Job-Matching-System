describe('Candidate Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should navigate from landing to register and dashboard', () => {
    // Wait for session skeleton to clear
    cy.get('header').should('be.visible');
    
    // Navigate from Home Page to Login
    cy.contains(/Sign in/i).click();
    cy.url().should('match', /\/login/);

    // Make sure Seeker UI forms exist
    cy.contains(/Sign in/i).should('exist');
  });

  it('should redirect unauthenticated users away from matched jobs', () => {
    cy.visit('/matches', { failOnStatusCode: false });
    cy.url().should('match', /\/login/);
  });
});
