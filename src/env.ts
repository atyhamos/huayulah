/** Built with `--mode artifact`: a guest-only demo hosted as a claude.ai artifact. */
export const IS_ARTIFACT = import.meta.env.MODE === 'artifact'

/** The theme the host page asked for before the app touched <html> (artifact viewers set data-theme). */
export const HOST_THEME = typeof document !== 'undefined' ? document.documentElement.dataset.theme : undefined
