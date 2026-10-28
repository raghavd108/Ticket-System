import { useEffect, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from 'react-native-config';

export type TicketStatus = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isFinal: boolean;
};

// Matches the defaults seeded by the backend. Used until the list loads
// (or if it cannot be loaded) so the UI never renders without statuses.
export const DEFAULT_TICKET_STATUSES: TicketStatus[] = [
  { id: 1, code: 'pending', name: 'Pending', sortOrder: 1, isFinal: false },
  { id: 2, code: 'assigned', name: 'Assigned', sortOrder: 2, isFinal: false },
  {
    id: 3,
    code: 'in-progress',
    name: 'In Progress',
    sortOrder: 3,
    isFinal: false,
  },
  {
    id: 4,
    code: 'work-completed',
    name: 'Work Completed',
    sortOrder: 4,
    isFinal: false,
  },
  {
    id: 5,
    code: 'release-updated',
    name: 'Release Updated',
    sortOrder: 5,
    isFinal: true,
  },
  { id: 6, code: 'cancelled', name: 'Cancelled', sortOrder: 6, isFinal: true },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#D99A43',
  assigned: '#9B7BC8',
  'in-progress': '#7295C6',
  'work-completed': '#55A582',
  'release-updated': '#2F8F6B',
  cancelled: '#B0645A',
};

const STATUS_ICONS: Record<string, string> = {
  pending: 'time-outline',
  assigned: 'person-outline',
  'in-progress': 'sync-outline',
  'work-completed': 'checkmark-circle-outline',
  'release-updated': 'rocket-outline',
  cancelled: 'close-circle-outline',
};

// Older API responses used these codes.
const LEGACY_CODES: Record<string, string> = {
  in_progress: 'in-progress',
  resolved: 'work-completed',
};

export const normalizeStatusCode = (status: unknown): string => {
  if (typeof status !== 'string' || !status) return 'pending';
  return LEGACY_CODES[status] ?? status;
};

export const getStatusColor = (status: string) =>
  STATUS_COLORS[normalizeStatusCode(status)] ?? '#8A8494';

export const getStatusIcon = (status: string) =>
  STATUS_ICONS[normalizeStatusCode(status)] ?? 'ellipse-outline';

export const getStatusName = (
  status: string,
  statuses: TicketStatus[] = DEFAULT_TICKET_STATUSES,
) => {
  const code = normalizeStatusCode(status);
  return statuses.find(item => item.code === code)?.name ?? code;
};

export const useTicketStatuses = () => {
  const [statuses, setStatuses] = useState<TicketStatus[]>(
    DEFAULT_TICKET_STATUSES,
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const response = await axios.get(
          `${Config.API_URL}/api/complain/statuses`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const list = response.data?.statuses;

        if (mounted && Array.isArray(list) && list.length > 0) {
          setStatuses(list);
        }
      } catch (error) {
        console.log('GET TICKET STATUSES ERROR:', error);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return statuses;
};
