import { apiClient } from './apiClient'

export const notificationService = {
  async getNotifications({ unreadOnly = false, page = 1, pageSize = 10 } = {}) {
    const { data } = await apiClient.get('/notifications', {
      params: { unread_only: unreadOnly, page, page_size: pageSize },
    })
    return data
  },

  async getUnreadCount() {
    const { data } = await apiClient.get('/notifications/unread-count')
    return data.count ?? 0
  },

  async markRead(id) {
    const { data } = await apiClient.put(`/notifications/${id}/read`)
    return data
  },

  async markAllRead() {
    const { data } = await apiClient.put('/notifications/read-all')
    return data
  },
}
