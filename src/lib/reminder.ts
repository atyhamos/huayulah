/** A daily practice reminder as a calendar event (free, works on every phone — no push server needed). */

const pad = (n: number) => String(n).padStart(2, '0')

/** Next occurrence of HH:MM from `now`, as a floating local time like 20261017T200000. */
function nextStart(time: string, now: Date): Date {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  if (d <= now) d.setDate(d.getDate() + 1)
  return d
}

const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

const TITLE = 'Huayulah — 10 minutes of Mandarin'
const BODY = 'Keep your lantern lit: one stop on the line map, or clear your flashcards.'

/** iCalendar file text for a repeating daily event with an alert. */
export function reminderIcs(time: string, appUrl: string, now = new Date()): string {
  const start = nextStart(time, now)
  const utc = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Huayulah//Daily reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:daily-practice@${new URL(appUrl).host}`,
    `DTSTAMP:${utc}`,
    `DTSTART:${stamp(start)}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${TITLE}`,
    `DESCRIPTION:${BODY} ${appUrl}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time for Mandarin!',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

/** "Add to Google Calendar" link for the same daily event. */
export function googleCalendarUrl(time: string, appUrl: string, now = new Date()): string {
  const start = nextStart(time, now)
  const end = new Date(start.getTime() + 10 * 60_000)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: TITLE,
    dates: `${stamp(start)}/${stamp(end)}`,
    recur: 'RRULE:FREQ=DAILY',
    details: `${BODY}\n${appUrl}`,
  })
  return `https://calendar.google.com/calendar/render?${q}`
}

export function downloadIcs(time: string, appUrl: string) {
  const blob = new Blob([reminderIcs(time, appUrl)], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'huayu-lah-reminder.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
