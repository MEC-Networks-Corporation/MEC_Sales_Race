import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance = null;

function getEcho() {
  if (echoInstance) return echoInstance;

  window.Pusher = Pusher;
  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
  });

  return echoInstance;
}

/**
 * Subscribes to the public "race" channel and calls onUpdate(team) whenever
 * an admin change is broadcast. Returns an unsubscribe function for cleanup.
 */
export function subscribeToRaceUpdates(onUpdate) {
  const echo = getEcho();
  const channel = echo.channel('race');
  channel.listen('.team.updated', (payload) => {
    if (payload && Array.isArray(payload.team)) onUpdate(payload.team);
  });

  return () => {
    echo.leaveChannel('race');
  };
}
