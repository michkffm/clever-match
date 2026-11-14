// === useApi Hook ===
// React hook for API calls with error handling & retry logic

import { useCallback, useEffect, useState } from 'react';
import { ApiError, retryWithBackoff, createApiError, formatErrorLog } from '../utils/errors';
import { useAppStore } from '../store/appStore';

interface UseApiOptions {
  autoFetch?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
}

/**
 * Hook for API calls with automatic error handling
 *
 * @example
 * const { data, isLoading, error } = useApi(
 *   () => apiClient.getProfiles(),
 *   { autoFetch: true }
 * );
 */
export function useApi<T>(
  apiFn: () => Promise<any>,
  options: UseApiOptions = {}
): UseApiState<T> {
  const {
    autoFetch = true,
    retryOnError = true,
    maxRetries = 3,
    onSuccess,
    onError,
  } = options;

  const { showNotification } = useAppStore();

  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: ApiError | null;
  }>({
    data: null,
    isLoading: autoFetch,
    error: null,
  });

  // Fetch function
  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use retry logic
      const fetchFn = retryOnError
        ? () =>
            retryWithBackoff(apiFn, {
              maxRetries,
              onRetry: (attempt) => {
                console.log(`[API] Retry attempt ${attempt}/${maxRetries}`);
              },
            })
        : apiFn;

      const result = await fetchFn();

      // Check for API response errors
      if (result.error) {
        const error = createApiError(result.status || 500, result);
        setState((prev) => ({ ...prev, error, isLoading: false }));
        onError?.(error);
        showNotification(error.getUserMessage(), 'error');
        return;
      }

      setState((prev) => ({ ...prev, data: result.data, isLoading: false }));
      onSuccess?.(result.data);
    } catch (err) {
      const error =
        err instanceof ApiError
          ? err
          : new ApiError(500, err instanceof Error ? err : undefined);

      setState((prev) => ({ ...prev, error, isLoading: false }));
      onError?.(error);

      showNotification(error.getUserMessage(), 'error');
      console.error(formatErrorLog(error));
    }
  }, [apiFn, retryOnError, maxRetries, onSuccess, onError, showNotification]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    retry: fetch,
  };
}

/**
 * Hook for lazy API calls (manual trigger)
 *
 * @example
 * const { execute, isLoading } = useLazyApi(
 *   (email, pass) => apiClient.login(email, pass)
 * );
 *
 * // Then trigger:
 * await execute("user@example.com", "password");
 */
export function useLazyApi<T, Args extends any[]>(
  apiFn: (...args: Args) => Promise<any>,
  options: UseApiOptions = {}
) {
  const {
    retryOnError = true,
    maxRetries = 3,
    onSuccess,
    onError,
  } = options;

  const { showNotification } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchFn = retryOnError
          ? () =>
              retryWithBackoff(() => apiFn(...args), {
                maxRetries,
              })
          : () => apiFn(...args);

        const result = await fetchFn();

        // Check for API response errors
        if (result.error) {
          const apiError = createApiError(result.status || 500, result);
          setError(apiError);
          onError?.(apiError);
          showNotification(apiError.getUserMessage(), 'error');
          setIsLoading(false);
          return null;
        }

        setData(result.data);
        onSuccess?.(result.data);
        setIsLoading(false);
        return result.data;
      } catch (err) {
        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError(500, err instanceof Error ? err : undefined);

        setError(apiError);
        onError?.(apiError);
        showNotification(apiError.getUserMessage(), 'error');
        console.error(formatErrorLog(apiError));
        setIsLoading(false);
        return null;
      }
    },
    [apiFn, retryOnError, maxRetries, onSuccess, onError, showNotification]
  );

  return {
    execute,
    isLoading,
    error,
    data,
  };
}
