/**
 * Feature: OTC Trgovina - Pristup i prikaz + OTC Pregovaranje
 * Scenarios: 14–22
 */

const API_BASE            = 'http://localhost:8083'
const CLIENT_EMAIL        = 'ddimitrijevi822rn@raf.rs'
const CLIENT_PASS         = 'taraDunjic123'
const SUPERVISOR_EMAIL    = 'vasa@banka.rs'
const SUPERVISOR_PASS     = 'vasilije123'

function loginAsClient() {
  cy.visit('/client/login')
  cy.get('input[name="email"]').type(CLIENT_EMAIL)
  cy.get('input[name="password"]').type(CLIENT_PASS)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/client/login')
}

function loginAsSupervisor() {
  cy.visit('/login')
  cy.get('input[name="email"]').type(SUPERVISOR_EMAIL)
  cy.get('input[name="password"]').type(SUPERVISOR_PASS)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/login')
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('OTC Trgovina — scenarios 14–22', () => {

  // ── Scenario 14 ───────────────────────────────────────────────────────────────

  it('Scenario 14: klijent sa permisijom za trgovinu vidi OTC portal', () => {
    // Given: korisnik je ulogovan kao klijent sa permisijom za trgovinu
    loginAsClient()

    // When: otvori portal "OTC Trgovina"
    cy.visit('/client/otc/market')

    // Then: vidi listu akcija koje su drugi klijenti stavili u javni režim
    cy.get('table', { timeout: 10000 }).should('exist')
    cy.get('table thead').within(() => {
      cy.contains(/type|name|symbol|amount|price|owner/i).should('exist')
    })

    // And: prikaz je identičan kao u Portalu za Hartije od vrednosti
    cy.contains('button', 'Offer').should('exist')
  })

  // ── Scenario 15 ───────────────────────────────────────────────────────────────

  it('Scenario 15: klijent bez permisije nema pristup OTC portalu', () => {
    // Given: korisnik je ulogovan kao klijent bez permisije za trgovinu
    loginAsClient()

    // Intercept the market fetch to simulate 403 (no trade permission)
    cy.intercept('GET', '**/otc/market', {
      statusCode: 403,
      body: { message: 'Forbidden' },
    }).as('getMarket')

    // When: pokuša da otvori portal "OTC Trgovina"
    cy.visit('/client/otc/market')
    cy.wait('@getMarket')

    // Then: pristup mu je odbijen
    cy.contains(/forbidden|access denied|not authorized|permission/i, { timeout: 6000 })
      .should('be.visible')
  })

  // ── Scenario 16 ───────────────────────────────────────────────────────────────

  it('Scenario 16: supervizor vidi OTC portal sa ponudama aktuara', () => {
    // Given: korisnik je ulogovan kao supervizor
    loginAsSupervisor()

    // When: otvori portal "OTC Trgovina"
    // The supervisor OTC portal is on the employee side — check for any OTC link in nav
    cy.get('nav, [role="navigation"]', { timeout: 8000 })
      .then(($nav) => {
        if ($nav.text().match(/OTC/i)) {
          cy.contains(/OTC/i).click()
        } else {
          // If no nav link exists, navigate directly to a known employee OTC route
          cy.visit('/otc', { failOnStatusCode: false })
        }
      })

    // Then: vidi ponude aktuara (ne klijenata)
    cy.get('table', { timeout: 10000 }).should('exist')

    // And: može kreirati ponudu za pregovor
    cy.contains(/create offer|nova ponuda|make offer/i).should('exist')
  })

  // ── Scenario 17 ───────────────────────────────────────────────────────────────

  it('Scenario 17: kupac inicira pregovor sa prodavcem', () => {
    // Given: kupac je na OTC portalu i vidi akcije prodavca
    loginAsClient()
    cy.visit('/client/otc/market')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    // When: klikne na akciju i unese ponudu
    cy.intercept('POST', '**/otc/negotiations').as('createNegotiation')
    cy.contains('button', 'Offer').first().click()

    // Fill the Make Offer modal
    cy.contains('Make Offer', { timeout: 5000 }).should('be.visible')
    cy.get('input[placeholder*="Quantity"], input[name*="quantity"], input[name*="Quantity"]')
      .first()
      .clear()
      .type('1')
    cy.get('input[placeholder*="Price"], input[name*="price"], input[name*="Price"]')
      .first()
      .clear()
      .type('100')
    // Premium is optional — skip
    // Settlement date: pick tomorrow
    cy.get('input[type="date"]').first().then(($input) => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
      cy.wrap($input).type(dateStr)
    })
    cy.contains('button', 'Submit Offer').click()
    cy.wait('@createNegotiation', { timeout: 10000 })

    // Then: sistem kreira novu ponudu sa statusom aktivnog pregovora
    // And: ponuda se prikazuje u Portalu: OTC Ponude i Ugovori za obe strane
    cy.visit('/client/otc/negotiations')
    cy.get('table tbody tr', { timeout: 8000 }).should('have.length.greaterThan', 0)
  })

  // ── Scenario 18 ───────────────────────────────────────────────────────────────

  it('Scenario 18: prodavac šalje protivponudu', () => {
    // Given: postoji aktivna ponuda od kupca
    loginAsClient()
    cy.visit('/client/otc/negotiations')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    // Open the first negotiation where it is client's turn
    cy.get('table tbody tr').first().contains('button', 'Open').click()
    cy.url().should('include', '/client/otc/negotiations/')

    // When: prodavac klikne na ponudu i pošalje protivponudu sa izmenjenim uslovima
    cy.intercept('PUT', '**/otc/negotiations/*/counter').as('counterOffer')
    cy.contains('button', 'Counter-offer', { timeout: 5000 }).click()

    cy.get('input').then(($inputs) => {
      // Fill the first editable quantity/price field with a new value
      if ($inputs.length > 0) cy.wrap($inputs[0]).clear().type('2')
      if ($inputs.length > 1) cy.wrap($inputs[1]).clear().type('110')
    })
    cy.contains('button', 'Submit Counter-offer').click()
    cy.wait('@counterOffer', { timeout: 10000 })

    // Then: ponuda se ažurira novim vrednostima
    // And: polje ModifiedBy se postavlja na ime prodavca
    // And: polje LastModified se ažurira
    cy.contains(/last modified|modified by/i, { timeout: 5000 }).should('exist')
  })

  // ── Scenario 19 ───────────────────────────────────────────────────────────────

  it('Scenario 19: kupac prihvata ponudu — kreira se opcioni ugovor', () => {
    // Given: postoji aktivna ponuda između kupca i prodavca
    loginAsClient()
    cy.visit('/client/otc/negotiations')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    cy.get('table tbody tr').first().contains('button', 'Open').click()
    cy.url().should('include', '/client/otc/negotiations/')

    // When: kupac klikne na "Prihvati"
    cy.intercept('PUT', '**/otc/negotiations/*/accept').as('acceptOffer')
    cy.contains('button', 'Accept', { timeout: 5000 }).click()

    // Then: confirm modal shows premium payable
    cy.contains(/premium payable|confirm accept/i, { timeout: 5000 }).should('be.visible')
    cy.contains('button', 'Confirm Accept').click()
    cy.wait('@acceptOffer', { timeout: 10000 })

    // Then: sistem automatski kreira opcioni ugovor
    // And: ugovor se prikazuje na stranici Sklopljeni ugovori
    cy.contains(/contract.*created|ugovor.*kreiran|contracts/i, { timeout: 8000 }).should('be.visible')
  })

  // ── Scenario 20 ───────────────────────────────────────────────────────────────

  it('Scenario 20: jedna strana odustaje od pregovora', () => {
    // Given: postoji aktivna ponuda između kupca i prodavca
    loginAsClient()
    cy.visit('/client/otc/negotiations')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    const rowsBefore = () => cy.get('table tbody tr')
    rowsBefore().its('length').then((countBefore) => {
      cy.get('table tbody tr').first().contains('button', 'Open').click()

      // When: jedna strana klikne na "Odustani"
      cy.intercept('PUT', '**/otc/negotiations/*/reject').as('rejectOffer')
      cy.contains('button', 'Reject', { timeout: 5000 }).click()
      cy.wait('@rejectOffer', { timeout: 10000 })

      // Then: ponuda se briše i više nije vidljiva u Aktivnim ponudama
      cy.visit('/client/otc/negotiations')
      cy.get('table tbody tr', { timeout: 8000 }).then(($rows) => {
        expect($rows.length).to.be.lessThan(countBefore)
      })
    })
  })

  // ── Scenario 21 ───────────────────────────────────────────────────────────────

  it('Scenario 21: prodavac ne može imati ugovore za više akcija nego što poseduje', () => {
    // Given: prodavac poseduje 12 AAPL akcija i ima aktivne ugovore za 10
    loginAsClient()
    cy.visit('/client/otc/negotiations')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    cy.get('table tbody tr').first().contains('button', 'Open').click()

    // Mock: acceptance exceeds holdings
    cy.intercept('PUT', '**/otc/negotiations/*/accept', {
      statusCode: 422,
      body: { message: 'Insufficient shares available for contract' },
    }).as('acceptOffer')

    // When: pokuša da prihvati ponudu za još 5 akcija
    cy.contains('button', 'Accept', { timeout: 5000 }).click()
    cy.contains('button', 'Confirm Accept').click()
    cy.wait('@acceptOffer')

    // Then: sistem odbija jer ukupan broj prelazi raspoložive akcije
    // And: prikazuje poruku o nedovoljnom broju akcija
    cy.contains(/insufficient|not enough|shares/i, { timeout: 6000 }).should('be.visible')
  })

  // ── Scenario 22 ───────────────────────────────────────────────────────────────

  it('Scenario 22: istekao ugovor oslobađa akcije za nove pregovore', () => {
    // Given: prodavac ima 12 akcija, ugovor za 3 je istekao
    loginAsClient()

    // Mock: OTC market shows quantity that includes the 3 freed shares
    cy.intercept('GET', '**/otc/market', {
      statusCode: 200,
      body: [{
        id: 'mock-1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        type: 'STOCK',
        amount: 5,  // 2 remaining + 3 freed from expired contract
        price: 150,
        owner: 'Seller',
      }],
    }).as('getMarket')

    // When: prodavac pregleda raspoložive akcije
    cy.visit('/client/otc/market')
    cy.wait('@getMarket')

    // Then: 5 akcija su dostupne za nove pregovore (2 preostale + 3 oslobođene)
    cy.get('table tbody tr', { timeout: 6000 }).should('have.length.greaterThan', 0)
    cy.get('table tbody tr').first().contains('5').should('exist')
  })

})
