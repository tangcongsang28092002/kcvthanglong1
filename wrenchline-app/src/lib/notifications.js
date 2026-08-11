// Helper to handle real-time notifications for paint orders across tabs/windows
const CHANNEL_NAME = 'isuzu_paint_notifications'

let broadcastChannel = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
  } catch (e) {
    console.error('BroadcastChannel initialization error:', e)
  }
}

export function notifyPaintCompleted(order) {
  const payload = {
    type: 'PAINT_COMPLETED',
    order,
    timestamp: new Date().toISOString(),
    message: `🎉 Xe ${order.so_thung} - Model ${order.model} (${order.so_khung}) đã hoàn thành sơn!`,
  }

  // 1. Dispatch custom event for current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('paint_completed_event', { detail: payload }))
  }

  // 2. Broadcast to other open browser tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload)
    } catch (e) {
      console.error('Error broadcasting paint notification:', e)
    }
  }
}

export function subscribePaintNotifications(callback) {
  if (typeof window === 'undefined') return () => {}

  const handleCustomEvent = (e) => {
    if (e.detail) callback(e.detail)
  }

  window.addEventListener('paint_completed_event', handleCustomEvent)

  const handleBroadcast = (event) => {
    if (event.data && event.data.type === 'PAINT_COMPLETED') {
      callback(event.data)
    }
  }

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast)
  }

  return () => {
    window.removeEventListener('paint_completed_event', handleCustomEvent)
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast)
    }
  }
}
