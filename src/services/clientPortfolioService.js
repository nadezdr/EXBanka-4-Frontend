import { clientApiClient } from './clientApiClient'

export const clientPortfolioService = {
  async getPortfolio() {
    const { data } = await clientApiClient.get('/client/portfolio')
    return data
  },

  async getProfit() {
    const { data } = await clientApiClient.get('/client/portfolio/profit')
    return data
  },

  async getMyFundPositions() {
    const { data } = await clientApiClient.get('/investment/funds/my-positions')
    return Array.isArray(data) ? data : (data.positions ?? data.items ?? [])
  },

  async investInFund(fundId, { sourceAccountId, amount }) {
    const { data } = await clientApiClient.post(`/investment/funds/${fundId}/invest`, { sourceAccountId, amount })
    return data
  },

  async withdrawFromFund(fundId, { destinationAccountId, amount }) {
    const { data } = await clientApiClient.post(`/investment/funds/${fundId}/withdraw`, { destinationAccountId, amount })
    return data
  },
}
