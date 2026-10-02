import axios, { AxiosResponse, AxiosError } from 'axios';

type SubscriptionWarningType = '14_DAYS' | '7_DAYS_BLINKING' | null;

interface SubscriptionListener {
  onWarning: (warning: SubscriptionWarningType, daysLeft: number | null) => void;
  onBlocked: () => void;
  onUnblocked: () => void;
}

const listeners = new Set<SubscriptionListener>();

export function subscribeToSubscriptionEvents(listener: SubscriptionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyWarning(warning: SubscriptionWarningType, daysLeft: number | null) {
  listeners.forEach((l) => l.onWarning(warning, daysLeft));
}

export function notifyBlocked() {
  listeners.forEach((l) => l.onBlocked());
}

export function notifyUnblocked() {
  listeners.forEach((l) => l.onUnblocked());
}

/**
 * Global Axios Instance for helibar API calls
 */
export const apiClient = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Read X-Sub-Warning & catch 403 SUBSCRIPTION_EXPIRED
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    handleSubscriptionHeaders(response.headers);
    return response;
  },
  (error: AxiosError<any>) => {
    if (error.response) {
      const { status, data, headers } = error.response;
      handleSubscriptionHeaders(headers);

      const isSubExpired =
        status === 403 &&
        (data?.detail === 'SUBSCRIPTION_EXPIRED' ||
          headers?.['x-sub-warning'] === 'SUBSCRIPTION_EXPIRED' ||
          data?.message?.includes('اشتراک'));

      if (isSubExpired) {
        notifyBlocked();
      }
    }
    return Promise.reject(error);
  }
);

export function handleSubscriptionHeaders(headers: any) {
  if (!headers) return;
  let subWarningHeader: string | null = null;
  let daysLeftHeader: string | null = null;

  if (typeof headers.get === 'function') {
    subWarningHeader = headers.get('x-sub-warning') || headers.get('X-Sub-Warning');
    daysLeftHeader = headers.get('x-sub-days-left') || headers.get('X-Sub-Days-Left');
  } else {
    subWarningHeader =
      headers['x-sub-warning'] || headers['X-Sub-Warning'] || headers['x-sub-warning'.toLowerCase()];
    daysLeftHeader =
      headers['x-sub-days-left'] || headers['X-Sub-Days-Left'] || headers['x-sub-days-left'.toLowerCase()];
  }

  const daysLeft =
    daysLeftHeader !== undefined && daysLeftHeader !== null && !isNaN(Number(daysLeftHeader))
      ? Number(daysLeftHeader)
      : null;

  if (subWarningHeader === '14_DAYS') {
    notifyWarning('14_DAYS', daysLeft);
  } else if (subWarningHeader === '7_DAYS_BLINKING') {
    notifyWarning('7_DAYS_BLINKING', daysLeft);
  } else if (subWarningHeader === 'SUBSCRIPTION_EXPIRED') {
    notifyBlocked();
  }
}

/**
 * Safely attempt to hook into window.fetch if writable in this environment.
 * If window.fetch has only a getter (e.g. in some iframe/sandbox browser environments),
 * safely ignore without throwing an Uncaught TypeError.
 */
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  try {
    const originalFetch = window.fetch.bind(window);

    const wrappedFetch: typeof window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        handleSubscriptionHeaders(response.headers);

        if (response.status === 403) {
          try {
            const clone = response.clone();
            clone
              .json()
              .then((data) => {
                if (data?.detail === 'SUBSCRIPTION_EXPIRED') {
                  notifyBlocked();
                }
              })
              .catch(() => {});
          } catch {}
        }

        return response;
      } catch (err) {
        throw err;
      }
    };

    try {
      window.fetch = wrappedFetch;
    } catch {
      try {
        Object.defineProperty(window, 'fetch', {
          value: wrappedFetch,
          writable: true,
          configurable: true,
        });
      } catch {
        // window.fetch is non-writable and getter-only in this environment; safely continue.
      }
    }
  } catch {
    // Ignore any environment-level restriction
  }
}

