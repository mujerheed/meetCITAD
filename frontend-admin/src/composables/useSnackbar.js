import { reactive } from 'vue'

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
  timeout: 4000,
})

function notify(message, color = 'success', timeout = 4000) {
  snackbar.message = message
  snackbar.color = color
  snackbar.timeout = timeout
  snackbar.show = true
}

export function useSnackbar() {
  return {
    snackbar,
    notify,
    notifySuccess: (message) => notify(message, 'success'),
    notifyError: (message) => notify(message, 'error', 6000),
    notifyInfo: (message) => notify(message, 'info'),
  }
}
