/**
 * Feature: Portal Profit Banke
 * Scenarios: 47–50 (+ mislabeled Scenario 40 in PDF = bank fund positions)
 */

const API_BASE         = 'http://localhost:8083'
const SUPERVISOR_EMAIL = 'vasa@banka.rs'
const SUPERVISOR_PASS  = 'vasilije123'
const AGENT_EMAIL      = 'elezovic@banka.rs'
const AGENT_PASS       = 'denis123'
const ADMIN_EMAIL      = 'admin@exbanka.com'
const ADMIN_PASS       = 'admin'

function loginAsSupervisor() {
  cy.visit('/login')
  cy.get('input[name="email"]').type(SUPERVISOR_EMAIL)
  cy.get('input[name="password"]').type(SUPERVISOR_PASS)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/login')
}

function loginAsAgent() {
  cy.visit('/login')
  cy.get('input[name="email"]').type(AGENT_EMAIL)
  cy.get('input[name="password"]').type(AGENT_PASS)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/login')
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('Portal Profit Banke — scenarios 47–50', () => {

  before(() => {
    // Restore supervisor's isSupervisor permission (portfolio-funds Sc46 may have removed it)
    cy.request({
      method: 'POST',
      url: 'http://localhost:8083/login',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASS },
      failOnStatusCode: false,
    }).then(({ body }) => {
      const token = body.access_token
      if (!token) return
      cy.request({
        method: 'GET',
        url: 'http://localhost:8083/employees',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then(({ body: data }) => {
        const emps = Array.isArray(data) ? data : (data.employees ?? [])
        const sup = emps.find(e => e.email === SUPERVISOR_EMAIL)
        if (!sup) return
        cy.request({
          method: 'PUT',
          url: `http://localhost:8083/employees/${sup.id}`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            first_name:    sup.first_name,
            last_name:     sup.last_name,
            date_of_birth: sup.date_of_birth,
            gender:        sup.gender,
            email:         sup.email,
            phone_number:  sup.phone_number,
            address:       sup.address,
            username:      sup.username,
            position:      sup.position,
            department:    sup.department,
            active:        sup.active !== false,
            permissions:   ['SUPERVISOR'],
            jmbg:          sup.jmbg ?? '',
          },
          failOnStatusCode: false,
        })
      })
    })
  })

  // ── Scenario 47 ───────────────────────────────────────────────────────────────

  it('Scenario 47: supervizor vidi spisak aktuara sa profitom', () => {
    // Given: supervizor je na stranici "Profit aktuara"
    cy.intercept('GET', 'http://localhost:8083/bank/profit/actuaries', {
      statusCode: 200,
      body: [{ id: 1, firstName: 'Denis', lastName: 'Elezovic', position: 'AGENT', profit: 15000 }],
    }).as('getActuaries')
    loginAsSupervisor()

    // When: stranica se učita
    cy.visit('/admin/bank-profit/actuaries')

    // Then: vidi listu svih aktuara (agenata i supervizora)
    cy.get('table', { timeout: 10000 }).should('exist')
    cy.get('table tbody tr').should('have.length.greaterThan', 0)

    // And: za svakog aktuara vidi ime, prezime i ostvareni profit u RSD
    cy.get('table thead').within(() => {
      cy.contains(/name|ime/i).should('exist')
      cy.contains(/position|role|pozicija/i).should('exist')
      cy.contains(/profit/i).should('exist')
    })

    // Search box is present
    cy.get('input[placeholder*="Search"]').should('exist')

    // Footer shows count
    cy.contains(/actuar/i).should('exist')
  })

  // ── Scenario 48 ───────────────────────────────────────────────────────────────

  it('Scenario 48: agent nema pristup portalu Profit Banke', () => {
    // Given: korisnik je ulogovan kao agent
    loginAsAgent()

    // When: pokuša da pristupi portalu "Profit Banke"
    cy.visit('/admin/bank-profit/actuaries', { failOnStatusCode: false })

    // Then: pristup mu je odbijen
    cy.url().then((url) => {
      const isOnPage = url.includes('/admin/bank-profit/actuaries')
      if (isOnPage) {
        cy.get('body').then(($body) => {
          const hasMsg = !!$body.text().match(/access denied|forbidden|not authorized|permission/i)
          const emptyTable = $body.find('table tbody tr').length === 0
          expect(hasMsg || emptyTable, 'access denied or no data rows').to.be.ok
        })
      } else {
        // Redirected away — correct behavior
        expect(url).not.to.include('/admin/bank-profit/actuaries')
      }
    })
  })

  // ── PDF Scenario 40 (mislabeled) — Supervizor vidi pozicije banke u fondovima ──

  it('Scenario (PDF 40): supervizor vidi pozicije banke u fondovima', () => {
    // Given: supervizor je na stranici "Pozicije u fondovima"
    cy.intercept('GET', 'http://localhost:8083/investment/funds', {
      statusCode: 200,
      body: [{ id: 1, name: 'Alpha Fund', active: true, managerName: 'Manager', minimumContribution: 1000 }],
    })
    cy.intercept('GET', 'http://localhost:8083/bank/profit/fund-positions', {
      statusCode: 200,
      body: [{ fundId: 1, bankSharePercent: 5.0, bankShareRSD: 5000, profitRSD: 250 }],
    }).as('getFundPositions')
    loginAsSupervisor()

    // When: stranica se učita
    cy.visit('/admin/bank-profit/fund-positions')

    // Then: vidi listu fondova u kojima banka ima udele
    cy.get('table', { timeout: 10000 }).should('exist')
    cy.get('table tbody tr').should('have.length.greaterThan', 0)

    // And: za svaki fond vidi naziv, menadžera, udeo banke (% i RSD) i profit
    cy.get('table thead').within(() => {
      cy.contains(/fund|fond/i).should('exist')
      cy.contains(/manager|menadžer/i).should('exist')
      cy.contains(/bank share|udeo|%/i).should('exist')
      cy.contains(/profit/i).should('exist')
    })

    // Actions column: Invest and Withdraw buttons per row
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', /invest/i).should('exist')
      cy.contains('button', /withdraw/i).should('exist')
    })
  })

  // ── Scenario 49 ───────────────────────────────────────────────────────────────

  it('Scenario 49: supervizor uplaćuje novac u fond u ime banke', () => {
    // Given: supervizor je na stranici Pozicije u fondovima
    loginAsSupervisor()
    cy.visit('/admin/bank-profit/fund-positions')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    cy.intercept('POST', '**/bank/profit/fund-positions/*/invest', { statusCode: 200, body: {} }).as('bankInvest')

    // When: klikne na "Uplata u fond" i izabere bankovni račun i unese iznos
    cy.get('table tbody tr').first().contains('button', /invest/i).click({ force: true })

    cy.contains('label', /amount|bank account/i, { timeout: 5000 }).should('be.visible')
    cy.get('input[placeholder*="Amount"], input[name*="amount"], input[type="number"]')
      .first()
      .clear()
      .type('10000')
    cy.get('select').first().select(0)

    cy.get('.fixed.inset-0').contains('button', /invest/i).click()
    cy.wait('@bankInvest', { timeout: 10000 })

    // Then: novac se prebacuje sa bankovnog računa na račun fonda
    cy.contains(/success|invested|uplaćeno/i, { timeout: 8000 }).should('be.visible')
  })

  // ── Scenario 50 ───────────────────────────────────────────────────────────────

  it('Scenario 50: supervizor povlači novac iz fonda za banku — bez provizije', () => {
    // Given: supervizor je na stranici Pozicije u fondovima
    loginAsSupervisor()
    cy.visit('/admin/bank-profit/fund-positions')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    cy.intercept('POST', '**/bank/profit/fund-positions/*/redeem', { statusCode: 200, body: {} }).as('bankRedeem')

    // When: klikne na "Povlačenje novca iz fonda" i selektuje bankovni račun i unese iznos
    cy.get('table tbody tr').first().contains('button', /withdraw/i).click({ force: true })

    cy.contains(/withdraw|povlačenje/i, { timeout: 5000 }).should('be.visible')
    cy.get('input[placeholder*="Amount"], input[name*="amount"], input[type="number"]')
      .first()
      .clear()
      .type('5000')
    cy.get('select').first().select(0)

    cy.get('.fixed.inset-0').contains('button', /withdraw/i).click()
    cy.wait('@bankRedeem', { timeout: 10000 })

    // Then: novac se prebacuje na bankovni račun
    cy.contains(/success|withdrawn|povučeno/i, { timeout: 8000 }).should('be.visible')

    // And: konverzija se vrši bez provizije
    cy.contains(/commission|provizija/i).should('not.exist')
  })

})
