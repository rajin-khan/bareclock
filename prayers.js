export const prayers = [
  ['Fajr', 'Fajr'], ['Dhuhr', 'Zuhr'], ['Asr', 'Asr'], ['Maghrib', 'Maghrib'], ['Isha', 'Isha'],
];

function shiftDate(date, offset) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset);
  return next.toISOString().slice(0, 10);
}
export const followingDate = date => shiftDate(date, 1);

export function prayerRequest(p, zone, date) {
  // Never infer geographic position from a timezone. UTC is not a place either.
  if (!p.zone || !p.cityName || !p.cityCountry || p.cityName === 'UTC' || p.cityId === 'utc') return null;
  const format = value => value.split('-').reverse().join('-');
  const parameters = new URLSearchParams({
    address: [p.cityName, p.cityRegion, p.cityCountry].filter(Boolean).join(', '),
    timezonestring: zone, iso8601: 'true',
  });
  return {
    date, yesterday: shiftDate(date, -1), tomorrow: followingDate(date), zone,
    url: `https://api.aladhan.com/v1/calendarByAddress/from/${format(shiftDate(date, -1))}/to/${format(followingDate(date))}?${parameters}`,
  };
}

export function parsePrayerCalendar(payload, request) {
  if (payload?.code !== 200 || !Array.isArray(payload.data)) throw new Error('Prayer times are unavailable.');
  const days = [request.yesterday, request.date, request.tomorrow].map(date => {
    const apiDate = date.split('-').reverse().join('-');
    const day = payload.data.find(item => item?.date?.gregorian?.date === apiDate);
    if (!day?.timings) throw new Error('The prayer calendar did not include the requested date.');
    const times = prayers.map(([id]) => {
      const value = day.timings[id];
      // Explicit offsets keep DST and Isha after midnight tied to real instants.
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
        throw new Error('This location or method has no usable prayer times for the requested date.');
      }
      return value;
    });
    if (times.some((time, index) => index && Date.parse(time) <= Date.parse(times[index - 1]))) throw new Error('The prayer times are out of order.');
    return { date, times };
  });
  const metadata = payload.data.find(day => day?.date?.gregorian?.date === request.date.split('-').reverse().join('-'))?.meta;
  return { days, method: typeof metadata?.method?.name === 'string' ? metadata.method.name : 'Source default', school: typeof metadata?.school === 'string' ? metadata.school : 'Source default' };
}

export function prayerDisplay(calendar, date, now) {
  const today = calendar?.days.find(day => day.date === date);
  if (!today) return null;
  let current, next;
  for (const day of calendar.days) {
    day.times.forEach((time, index) => {
      const timestamp = Date.parse(time);
      const prayer = { time, index, date: day.date, timestamp };
      if (timestamp <= now.getTime() && (!current || timestamp > current.timestamp)) current = prayer;
      if (timestamp > now.getTime() && (!next || timestamp < next.timestamp)) next = prayer;
    });
  }
  return {
    currentIndex: current?.index ?? -1, currentDate: current?.date,
    nextIndex: next?.index ?? -1, nextTime: next?.time,
    tomorrow: Boolean(next && next.date > date), lastNight: Boolean(next && next.date < date),
    times: today.times.map((time, index) => {
      if (current && index === current.index && current.date !== date) return current.time;
      if (next && index === next.index && next.date !== date) return next.time;
      return time;
    }),
  };
}

export function createPrayerCache(fetcher, storage) {
  const key = 'bareclock.prayers.v1';
  const requests = new Map();
  let saved = [];
  try {
    const value = JSON.parse(storage?.getItem(key));
    if (Array.isArray(value)) saved = value.filter(entry => entry && typeof entry.url === 'string' && entry.payload);
  } catch {}
  return {
    get(request, retry = false) {
      if (retry) requests.delete(request.url);
      if (requests.has(request.url)) return requests.get(request.url);
      const promise = (async () => {
        const cached = saved.find(entry => entry.url === request.url);
        if (cached) {
          try {
            const calendar = parsePrayerCalendar(cached.payload, request);
            cached.date = request.date;
            return calendar;
          }
          catch { saved = saved.filter(entry => entry !== cached); }
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetcher(request.url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
          if (!response.ok) throw new Error('The prayer-time service could not be reached.');
          const payload = await response.json();
          const calendar = parsePrayerCalendar(payload, request);
          // Keep every loaded city for recent local dates, including the date line.
          const oldest = shiftDate(request.date, -2);
          saved = [...saved.filter(entry => entry.url !== request.url && entry.date >= oldest && entry.date <= request.tomorrow), { url: request.url, date: request.date, payload }];
          try { storage?.setItem(key, JSON.stringify(saved)); } catch {}
          return calendar;
        } finally { clearTimeout(timeout); }
      })();
      // Failed requests wait for an explicit retry or a different local day.
      requests.set(request.url, promise);
      return promise;
    },
  };
}
