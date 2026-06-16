import { clientApiClient } from './clientApiClient'

export const clientNotificationService = {
  async getNotifications({ unreadOnly = false, page = 1, pageSize = 10 } = {}) {
    const { data } = await clientApiClient.get('/notifications', {
      params: { unread_only: unreadOnly, page, page_size: pageSize },
    })
    return data
  },

  async getUnreadCount() {
    const { data } = await clientApiClient.get('/notifications/unread-count')
    return data.count ?? 0
  },

  async markRead(id) {
    const { data } = await clientApiClient.put(`/notifications/${id}/read`)
    return data
  },

  async markAllRead() {
    const { data } = await clientApiClient.put('/notifications/read-all')
    return data
  },
}
