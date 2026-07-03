import apiClient from './apiClient';

const fallbackOrder = { id: 'demo-order-1', totalAmount: 120000, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), items: [{ name: 'Vé xem phim demo', price: 120000 }] };

export async function getOrder(orderId) {
  if (!orderId || orderId === 'demo-order-1') return JSON.parse(localStorage.getItem('lastOrder') || 'null') || fallbackOrder;
  return apiClient.get(`/orders/${orderId}`);
}
export async function getPaymentMethods() {
  try { return await apiClient.get('/payment-methods'); } catch { return [{ id: 'zalopay', name: 'ZaloPay' }, { id: 'momo', name: 'MoMo' }, { id: 'banking', name: 'Chuyển khoản' }]; }
}
export async function payOrder({ orderId, methodId }) {
  return apiClient.post(`/orders/${orderId}/pay`, { paymentMethod: methodId });
}
export async function getTickets() { return apiClient.get('/tickets'); }
export async function getTicketDetail(ticketId) { return apiClient.get(`/tickets/${ticketId}`); }
