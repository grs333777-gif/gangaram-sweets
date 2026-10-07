export const apiOrigin = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, headers } = {}) {
  const response = await fetch(`${apiOrigin}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const details = Array.isArray(data.error?.details)
      ? [...new Set(data.error.details.map((item) => item?.message).filter(Boolean))]
      : [];
    const message = details.length
      ? details.join('. ')
      : typeof data.error === 'string'
        ? data.error
        : data.error?.message;
    const error = new Error(message || 'Something went wrong. Please try again.');
    error.code = data.error?.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  me: () => request('/api/auth/me'),
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  refresh: () => request('/api/auth/refresh', { method: 'POST' }),
  checkout: (payload, idempotencyKey) =>
    request('/api/orders/checkout', {
      method: 'POST',
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  myOrders: () => request('/api/orders?limit=50'),
  trackOrder: (orderNumber, phone) => request('/api/orders/track', { method: 'POST', body: { orderNumber, phone } }),
  nearbyAddress: (latitude, longitude) => request('/api/orders/nearby-address', { method: 'POST', body: { latitude, longitude } }),
  cancelOrder: (orderId) => request(`/api/orders/${orderId}/cancel`, { method: 'POST', body: {} }),
  deskOrders: ({ status, paymentStatus } = {}) => {
    const params = new URLSearchParams({ limit: '50' });
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    return request(`/api/orders/desk?${params}`);
  },
  deskStatus: (orderId, status) => request(`/api/orders/desk/${orderId}/status`, { method: 'PATCH', body: { status } }),
  deskCancel: (orderId) => request(`/api/orders/desk/${orderId}/cancel`, { method: 'POST', body: { reason: 'Cancelled by shop' } }),
  deskRefund: (orderId) => request(`/api/orders/desk/${orderId}/refund`, { method: 'POST', body: {} }),
};
