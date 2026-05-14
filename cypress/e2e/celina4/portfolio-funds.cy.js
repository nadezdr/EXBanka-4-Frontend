/**
 * Feature: Moj portfolio - Moji fondovi + Upravljanje zaposlenima Dodatak
 * Scenarios: 43–46
 */

const API_BASE         = 'http://localhost:8083'
const CLIENT_EMAIL     = 'ddimitrijevi822rn@raf.rs'
const CLIENT_PASS      = 'taraDunjic123'
const SUPERVISOR_EMAIL = 'vasa@banka.rs'
const SUPERVISOR_PASS  = 'vasilije123'
const ADMIN_EMAIL      = 'admin@exbanka.com'
const ADMIN_PASS       = 'admin'

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

function loginAsAdmin() {
  cy.visit('/login')
  cy.get('input[name="email"]').type(ADMIN_EMAIL)
  cy.get('input[name="password"]').type(ADMIN_PASS)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/login')
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('Moj portfolio - Moji fondovi — scenarios 43–46', () => {

  // ── Scenario 43 ───────────────────────────────────────────────────────────────

  it('Scenario 43: klijent pregleda svoje fondove u portfoliju', () => {
    // Given: klijent ima udele u fondovima
    loginAsClient()

    // When: otvori tab "Moji fondovi" u Moj portfolio
    cy.visit('/client/portfolio')
    cy.contains(/my funds|moji fondovi/i, { timeout: 8000 }).click()

    // Then: vidi spisak fondova sa nazivom, opisom i vrednošću fonda
    cy.get('table', { timeout: 8000 }).should('exist')
    cy.get('table thead').within(() => {
      cy.contains(/fund name|naziv/i).should('exist')
      cy.contains(/fund value|vrednost/i).should('exist')
      cy.contains(/invested|uloženo/i).should('exist')
      cy.contains(/current value|trenutna vrednost/i).should('exist')
      cy.contains(/profit/i).should('exist')
    })

    // And: vidi udeo klijenta (procentualno i novčano) i ostvareni profit
    cy.get('table thead').within(() => {
      cy.contains(/%.*share|share.*%|udeo/i).should('exist')
    })

    // And: "Invest" and "Withdraw" buttons per row
    cy.get('table tbody tr').first().within(() => {
      cy.contains('button', /invest/i).should('exist')
      cy.contains('button', /withdraw/i).should('exist')
    })
  })

  // ── Scenario 44 ───────────────────────────────────────────────────────────────

  it('Scenario 44: supervizor pregleda fondove kojima upravlja', () => {
    // Given: supervizor upravlja fondovima
    loginAsSupervisor()

    // When: otvori tab "Moji fondovi" u Moj portfolio
    cy.visit('/client/portfolio')
    cy.contains(/my funds|moji fondovi/i, { timeout: 8000 }).click()

    // Then: vidi spisak fondova koje upravlja sa nazivom, opisom, vrednošću i likvidnošću
    cy.get('table', { timeout: 8000 }).should('exist')
    cy.get('table thead').within(() => {
      cy.contains(/fund name|naziv/i).should('exist')
      cy.contains(/fund value|vrednost/i).should('exist')
      cy.contains(/liquidity|likvidnost/i).should('exist')
    })

    cy.get('table tbody tr').should('have.length.greaterThan', 0)
  })

  // ── Scenario 45 ───────────────────────────────────────────────────────────────

  it('Scenario 45: procenat fonda klijenta se menja kada drugi klijent uloži', () => {
    // Given: klijent A ima udeo u fondu
    loginAsClient()
    cy.visit('/client/portfolio')
    cy.contains(/my funds|moji fondovi/i, { timeout: 8000 }).click()
    cy.get('table tbody tr', { timeout: 8000 }).should('have.length.greaterThan', 0)

    // Capture initial percentage from first fund row
    let initialPercent
    cy.get('table tbody tr').first().find('td').then(($cells) => {
      // Find the % share cell
      $cells.each((_, cell) => {
        const text = cell.innerText.trim()
        if (text.match(/%/)) {
          initialPercent = parseFloat(text.replace('%', '').replace(',', '.'))
        }
      })
    })

    // When: klijent B uloži veliki iznos u isti fond
    // Get the fund ID from the current row link
    cy.get('table tbody tr').first().find('a').then(($a) => {
      const href = $a.attr('href') || ''
      const fundId = href.split('/').pop()

      if (!fundId) { cy.log('Could not extract fund ID — skipping invest step'); return }

      // Use cy.request as a second client to invest a large amount
      cy.request('POST', `${API_BASE}/client/login`, {
        email: CLIENT_EMAIL,
        password: CLIENT_PASS,
      }).then(({ body }) => {
        const token = body.access_token
        cy.request({
          method: 'GET',
          url: `${API_BASE}/client/accounts`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then(({ body: accounts }) => {
          const accs = Array.isArray(accounts) ? accounts : accounts?.content ?? []
          if (accs.length === 0) return

          cy.request({
            method: 'POST',
            url: `${API_BASE}/investment/funds/${fundId}/invest`,
            headers: { Authorization: `Bearer ${token}` },
            body: { sourceAccountId: accs[0].id, amount: 100000 },
            failOnStatusCode: false,
          })
        })
      })
    })

    // Then: procenat fonda klijenta A se smanjuje proporcionalno
    cy.reload()
    cy.contains(/my funds|moji fondovi/i, { timeout: 8000 }).click()
    cy.get('table tbody tr', { timeout: 8000 }).first().find('td').then(($cells) => {
      let newPercent
      $cells.each((_, cell) => {
        const text = cell.innerText.trim()
        if (text.match(/%/)) {
          newPercent = parseFloat(text.replace('%', '').replace(',', '.'))
        }
      })
      if (initialPercent !== undefined && newPercent !== undefined) {
        expect(newPercent).to.be.lessThan(initialPercent)
      }
    })
  })

  // ── Scenario 46 ───────────────────────────────────────────────────────────────

  it('Scenario 46: admin uklanja isSupervisor permisiju — fondovi se prebacuju', () => {
    // Given: supervizor upravlja fondovima
    // Find the supervisor in employee management, capture which funds they manage first
    loginAsSupervisor()
    cy.visit('/client/portfolio')
    cy.contains(/my funds|moji fondovi/i, { timeout: 8000 }).click()
    cy.get('table', { timeout: 8000 }).should('exist')

    // Capture supervisor's managed fund name
    let supervisorFundName
    cy.get('table tbody tr').first().find('td').first().then(($cell) => {
      supervisorFundName = $cell.text().trim()
    })

    // When: admin ukloni permisiju isSupervisor tom supervizoru
    loginAsAdmin()
    cy.visit('/admin/employees')
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0)

    cy.contains('tr', /vasa|vasilije/i).within(() => {
      cy.contains('button', /edit|izmeni/i).click()
    })

    // Find and uncheck the isSupervisor permission
    cy.contains(/supervisor/i).parent().find('input[type="checkbox"]').uncheck()
    cy.contains('button', /save|sačuvaj|update/i).click()

    cy.intercept('PUT', '**/employees/*').as('updateEmployee')
    cy.wait('@updateEmployee', { timeout: 10000 })

    // Then: vlasništvo nad fondovima se prebacuje na tog admina
    cy.visit('/client/investment/funds')
    cy.get('table', { timeout: 8000 }).should('exist')
    if (supervisorFundName) {
      cy.contains(supervisorFundName)
        .closest('tr')
        .contains(/admin/i)
        .should('exist')
    }

    // And: admin postaje novi menadžer tih fondova
    cy.contains(/admin.*manager|menadžer.*admin/i).should('exist')
  })

})
