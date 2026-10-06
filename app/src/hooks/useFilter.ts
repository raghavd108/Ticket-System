import { useState } from 'react';

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
        item => item.status === statusFilter,
      );
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

    displayComplain,

    getOrganisations,
  };
};
