// API Status checker - generic endpoint monitoring
export async function checkApiStatus(url, timeout = 10000) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { method: 'HEAD', signal });
    clearTimeout(timer);
    return res.ok ? 'online' : 'error';
  } catch (err) {
    clearTimeout(timer);
    return err.name === 'AbortError' ? 'timeout' : 'offline';
  }
}

// ETH Mensa API checker - uses GET + JSON parsing (from Pommes2_0 code)
export async function checkEthMensaApi(timeout = 10000) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const today = new Date();
    const weekday = today.getDay();
    const offset = (weekday + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offset);
    const mondayStr = monday.toISOString().split("T")[0];
    const mondayPlus7 = new Date(monday);
    mondayPlus7.setDate(monday.getDate() + 7);
    const mondayPlus7Str = mondayPlus7.toISOString().split("T")[0];

    const url = `https://idapps.ethz.ch/cookpit-pub-services/v1/weeklyrotas?client-id=ethz-wcms&lang=de&rs-first=0&rs-size=1&valid-after=${mondayStr}&valid-before=${mondayPlus7Str}`;
    
    const res = await fetch(url, { signal });
    clearTimeout(timer);
    
    if (res.ok) {
      await res.json(); // verify it's valid JSON
      return 'online';
    }
    return 'error';
  } catch (err) {
    clearTimeout(timer);
    return err.name === 'AbortError' ? 'timeout' : 'offline';
  }
}

// Track multiple API statuses
export class ApiStatusTracker {
  constructor() {
    this.apis = []; // Array of { name, url, status }
  }

  addApi(name, url) {
    this.apis.push({ name, url, status: 'pending' });
  }

  async checkAll() {
    await Promise.all(
      this.apis.map(async (api) => {
        // Use special ETH checker for ETH Mensa
        if (api.name.toLowerCase().includes('eth')) {
          api.status = await checkEthMensaApi();
        } else {
          api.status = await checkApiStatus(api.url);
        }
      })
    );
  }

  getStatuses() {
    return this.apis;
  }
}

// Create a status dot (pill) - just a colored circle
export function createStatusDot(status) {
  const dot = document.createElement('span');
  dot.className = 'w-3 h-3 rounded-full inline-block cursor-pointer transition-all hover:w-4 hover:h-4';
  
  switch (status) {
    case 'online':
      dot.className += ' bg-green-500';
      dot.title = 'Online';
      break;
    case 'offline':
      dot.className += ' bg-red-500';
      dot.title = 'Offline';
      break;
    case 'timeout':
      dot.className += ' bg-yellow-500';
      dot.title = 'Timeout';
      break;
    case 'error':
      dot.className += ' bg-orange-500';
      dot.title = 'Error';
      break;
    default:
      dot.className += ' bg-gray-500';
      dot.title = 'Pending';
  }

  return dot;
}
