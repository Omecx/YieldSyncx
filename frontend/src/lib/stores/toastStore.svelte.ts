// toastStore.svelte.ts

// Define the ToastItem interface
interface ToastItem {
  id: string;
  message: string;
  background: string;
  timeout: number;
}

// Create reactive state for toasts
export const toasts = $state<ToastItem[]>([]);

// Function to trigger a new toast notification
export function trigger({
  message,
  background = 'preset-filled-primary', // Updated from variant-* to preset-*
  timeout = 5000,
}: {
  message: string;
  background?: string;
  timeout?: number;
}) {
  const id = Date.now().toString();
  const newToast: ToastItem = { id, message, background, timeout };
  
  // Add the new toast to the array
  toasts.unshift(newToast);
  
  // Auto-remove the toast after the specified timeout
  if (timeout > 0) {
    setTimeout(() => {
      remove(id);
    }, timeout);
  }
  
  return id;
}

// Function to remove a toast by its id
export function remove(id: string) {
  const index = toasts.findIndex(toast => toast.id === id);
  if (index !== -1) {
    toasts.splice(index, 1);
  }
}