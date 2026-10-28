import { useState } from 'react';
import { normalizeStatusCode } from './useTicketStatuses';

// all | today | 7d | 30d | month | custom
export type DateFilter = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom';

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Returns the inclusive [from, to] range for a date filter, or null.
export const getDateRange = (
  filter: DateFilter,
  customFrom: Date | null,
  customTo: Date | null,
): { from: Date | null; to: Date | null } | null => {
  const today = new Date();

  switch (filter) {
    case 'today':
      return { from: startOfDay(today), to: endOfDay(today) };
    case '7d': {
      const from = startOfDay(today);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(today) };
    }
    case '30d': {
      const from = startOfDay(today);
      from.setDate(from.getDate() - 29);
      return { from, to: endOfDay(today) };
    }
    case 'month':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: endOfDay(today),
      };
    case 'custom':
      return {
        from: customFrom ? startOfDay(customFrom) : null,
        to: customTo ? endOfDay(customTo) : null,
      };
    default:
      return null;
  }
};

type Complaint = {
  _id: string;
  module: string;
  problem: string;

  image: {
    url: string;
  }[];

  status: string;

  organisation: {
    _id: string;
    orgType: string;
    name: string;
  };

  createdAt: string;

  user?: {
    _id: string;
    userName: string;
    email: string;
  };
};

export const useFilter = (complaints: Complaint[]) => {
  const [softwareFilter, setSoftwareFilter] = useState('all');

  const [organisationFilter, setorganisationFilter] = useState('all');

  const [orgTypeFilter, setOrgTypeFilter] = useState('all');

  const [statusFilter, setStatusFilter] = useState('all');

  // newest | oldest
  const [sortFilter, setSortFilter] = useState('newest');

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);

  const getFilter = () => {
    let filteredComplaints = [...complaints];

    // SOFTWARE / MODULE FILTER
    if (softwareFilter !== 'all') {
      filteredComplaints = filteredComplaints.filter(
        item => item.module === softwareFilter,
      );
    }

    // ORGANISATION FILTER
    if (organisationFilter !== 'all') {
      filteredComplaints = filteredComplaints.filter(
        item => item.organisation?.name === organisationFilter,
      );
    }

    // ORGANISATION TYPE FILTER
    if (orgTypeFilter !== 'all') {
      filteredComplaints = filteredComplaints.filter(
        item => item.organisation?.orgType === orgTypeFilter,
      );
    }

    // STATUS FILTER
    if (statusFilter !== 'all') {
      filteredComplaints = filteredComplaints.filter(
        item => normalizeStatusCode(item.status) === statusFilter,
      );
    }

    // DATE RANGE FILTER
    const range = getDateRange(dateFilter, customFrom, customTo);

    if (range) {
      filteredComplaints = filteredComplaints.filter(item => {
        const created = new Date(item.createdAt).getTime();

        if (range.from && created < range.from.getTime()) return false;
        if (range.to && created > range.to.getTime()) return false;

        return true;
      });
    }

    // SORTING
    filteredComplaints.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      if (sortFilter === 'newest') {
        return dateB - dateA;
      }

      if (sortFilter === 'oldest') {
        return dateA - dateB;
      }

      return 0;
    });

    return filteredComplaints;
  };

  const displayComplain = getFilter();

  const getOrganisations = () => {
    const organisations = complaints
      .map(item => item.organisation)
      .filter(Boolean);

    const uniqueOrganisations = organisations.filter(
      (organisation, index, self) =>
        index === self.findIndex(item => item._id === organisation._id),
    );

    if (orgTypeFilter === 'all') {
      return uniqueOrganisations;
    }

    return uniqueOrganisations.filter(
      organisation => organisation.orgType === orgTypeFilter,
    );
  };

  return {
    softwareFilter,
    setSoftwareFilter,

    organisationFilter,
    setorganisationFilter,

    orgTypeFilter,
    setOrgTypeFilter,

    statusFilter,
    setStatusFilter,

    sortFilter,
    setSortFilter,

    dateFilter,
    setDateFilter,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,

    displayComplain,

    getOrganisations,
  };
};
