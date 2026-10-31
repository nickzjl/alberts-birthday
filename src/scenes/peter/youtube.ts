/**
 * Just enough of YouTube's IFrame Player API (https://developers.google.com/youtube/iframe_api_reference),
 * loaded on demand — only when the birthday video is about to show.
 */

export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getDuration(): number
  destroy(): void
}

export interface YTStateEvent {
  data: number
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      events?: {
        onReady?: () => void
        onStateChange?: (e: YTStateEvent) => void
        onError?: (e: YTStateEvent) => void
      }
    },
  ) => YTPlayer
}

/** YT.PlayerState */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let api: Promise<YTNamespace> | null = null

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!api) {
    api = new Promise<YTNamespace>((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        if (window.YT?.Player) resolve(window.YT)
      }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.async = true
      s.onerror = () => {
        api = null
        s.remove()
        reject(new Error('YouTube player failed to load'))
      }
      document.head.appendChild(s)
    })
  }
  return api
}

/**
 * The embed iframe, built by hand so we control its attributes:
 *  - youtube-nocookie.com: YouTube's privacy-enhanced mode
 *  - referrerpolicy: the page itself sends no referrer (it keeps its unlisted URL private), but YouTube refuses
 *    to play embeds without one ("Error 153") — so the player alone sends the bare origin, never the path
 */
export function createEmbed(videoId: string, title: string): HTMLIFrameElement {
  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    playsinline: '1',
    modestbranding: '1',
    iv_load_policy: '3',
    color: 'white',
    origin: window.location.origin,
  })
  const f = document.createElement('iframe')
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`
  f.title = title
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
  f.allowFullscreen = true
  f.referrerPolicy = 'strict-origin-when-cross-origin'
  f.className = 'pt-yt__frame'
  return f
}
