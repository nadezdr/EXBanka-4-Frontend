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
    const { data } = await clientApiClient.get('/client/funds/positions')
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

  async setPublicMode(ticker, isPublic) {
    const { data } = await clientApiClient.put(`/client/portfolio/${ticker}/public-mode`, { isPublic })
    return data
  },

  async getFunds() {
    const { data } = await clientApiClient.get('/investment/funds')
    return Array.isArray(data) ? data : (data.funds ?? data.items ?? [])
  },

  async getFund(id) {
    const { data } = await clientApiClient.get(`/investment/funds/${id}`)
    return data
  },

  async getFundSecurities(id) {
    const { data } = await clientApiClient.get(`/investment/funds/${id}/securities`)
    return Array.isArray(data) ? data : []
  },

  async getFundPerformance(id, from, to) {
    const { data } = await clientApiClient.get(`/investment/funds/${id}/performance`, { params: { from, to } })
    return Array.isArray(data) ? data : []
  },

  async getAveragePerformance(from, to) {
    const { data } = await clientApiClient.get('/investment/funds/average-performance', { params: { from, to } })
    return Array.isArray(data) ? data : []
  },
}
