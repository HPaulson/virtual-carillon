import { ScheduleEntry } from './types.js';

/** Optional starting point; importing it never replaces an existing schedule. */
export const MONASTERY_PROFILE: ScheduleEntry[] = [
  { id: 'monastery-morning-bell', name: 'Monastery · Morning bell', enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: '06:00', asset: 'large-church-bell' },
  { id: 'monastery-lauds', name: 'Monastery · Lauds', enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: '07:00', asset: 'divine-office-lauds' },
  { id: 'monastery-angelus-noon', name: 'Monastery · Angelus at noon', enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: '12:00', asset: 'angelus' },
  { id: 'monastery-sext', name: 'Monastery · Sext signal', enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: '12:05', asset: 'divine-office-lauds' },
  { id: 'monastery-angelus-evening', name: 'Monastery · Angelus in the evening', enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: '18:00', asset: 'angelus' },
  { id: 'monastery-vespers', name: 'Monastery · Vespers', enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: '18:15', asset: 'divine-office-vespers' },
  { id: 'monastery-compline', name: 'Monastery · Compline', enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: '21:00', asset: 'divine-office-compline' },
];
