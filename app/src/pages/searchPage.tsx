import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import createStyles from '../style/searchStyle';
import { useTheme } from '../context/ThemeContext';
import { Config } from 'react-native-config';
import { getStatusColor, getStatusName } from '../hooks/useTicketStatuses';

interface Organisation {
  _id: string;
  name: string;
  orgType?: string;
}

interface User {
  _id: string;
  userName: string;
  email?: string;
}

interface Complaint {
  _id: string;
  module: string;
  problem: string;
  status: string;
  statusName?: string | null;
  createdAt?: string;

  organisation?: Organisation | null;
  user?: User | null;
}

interface Pagination {
  currentPage: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const PAGE_SIZE = 10;

const SearchPage = () => {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<Complaint[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const currentPageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const searchRequestRef = useRef(0);

  const { theme } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  // =====================================================
  // RESET PAGINATION
  // =====================================================

  const resetPagination = () => {
    currentPageRef.current = 1;
    hasMoreRef.current = false;
    loadingMoreRef.current = false;

    setHasMore(false);
    setLoadingMore(false);
    setTotalRecords(0);
  };

  // =====================================================
  // FETCH SEARCH RESULTS
  // =====================================================

  const fetchSearchResults = async (
    page: number,
    query: string,
    append: boolean = false,
    requestId?: number,
  ) => {
    try {
      if (append) {
        if (loadingMoreRef.current || !hasMoreRef.current) {
          return;
        }

        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.log('Authentication token not found');

        if (!append) {
          setResult([]);
          setSearched(true);
        }

        return;
      }

      const response = await axios.get(
        `${Config.API_URL}/api/complain/search`,
        {
          params: {
            q: query,
            page,
            limit: PAGE_SIZE,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Ignore an outdated search response.
      if (requestId !== undefined && requestId !== searchRequestRef.current) {
        return;
      }

      console.log('SEARCH RESPONSE:', response.data);

      const complaints: Complaint[] =
        response.data?.complaint ?? response.data?.complains ?? [];

      const pagination: Pagination | undefined = response.data?.pagination;

      if (append) {
        setResult(previous => {
          const existingIds = new Set(previous.map(item => item._id));

          const newComplaints = complaints.filter(
            item => !existingIds.has(item._id),
          );

          return [...previous, ...newComplaints];
        });
      } else {
        setResult(complaints);
      }

      const nextPageAvailable =
        pagination?.hasNextPage ?? complaints.length === PAGE_SIZE;

      hasMoreRef.current = nextPageAvailable;
      setHasMore(nextPageAvailable);

      currentPageRef.current = page;

      setTotalRecords(
        pagination?.totalRecords ??
          (append ? result.length + complaints.length : complaints.length),
      );

      setSearched(true);
    } catch (error: any) {
      console.log('SEARCH ERROR:', error.response?.data || error.message);

      if (!append) {
        setResult([]);
        setTotalRecords(0);
        setSearched(true);
      }
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // =====================================================
  // SEARCH FIRST PAGE
  // =====================================================

  const onSearch = async () => {
    const query = search.trim();

    if (!query) {
      searchRequestRef.current += 1;

      setResult([]);
      setSearched(false);
      resetPagination();

      return;
    }

    const requestId = ++searchRequestRef.current;

    resetPagination();
    setResult([]);
    setSearched(false);

    await fetchSearchResults(1, query, false, requestId);
  };

  // =====================================================
  // LOAD NEXT PAGE
  // =====================================================

  const loadMoreComplaints = useCallback(() => {
    const query = search.trim();

    if (!query || loading || loadingMoreRef.current || !hasMoreRef.current) {
      return;
    }

    const nextPage = currentPageRef.current + 1;

    fetchSearchResults(nextPage, query, true, searchRequestRef.current);
  }, [search, loading]);

  // =====================================================
  // CLEAR SEARCH
  // =====================================================

  const clearSearch = () => {
    searchRequestRef.current += 1;

    setSearch('');
    setResult([]);
    setSearched(false);

    resetPagination();
  };

  // =====================================================
  // RENDER FOOTER
  // =====================================================

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text
            style={{
              marginTop: 8,
              color: theme.muted,
              fontSize: 12,
            }}
          >
            Loading more complaints...
          </Text>
        </View>
      );
    }

    if (result.length > 0 && hasMore) {
      return (
        <Text
          style={{
            textAlign: 'center',
            paddingVertical: 15,
            color: theme.muted,
            fontSize: 12,
          }}
        >
          Scroll down to load more
        </Text>
      );
    }

    if (result.length > 0 && !hasMore) {
      return (
        <Text
          style={{
            textAlign: 'center',
            paddingVertical: 15,
            color: theme.muted,
            fontSize: 12,
          }}
        >
          All complaints loaded
        </Text>
      );
    }

    return null;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]}>
      <Text style={styles.heading}>Search Complaints</Text>

      <Text style={styles.subtitle}>
        Search complaints by organisation or module
      </Text>

      {/* SEARCH INPUT */}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search complaints..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {search.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* RESULT COUNT */}

      {searched && !loading && (
        <Text style={styles.resultCount}>
          {totalRecords} {totalRecords === 1 ? 'complaint' : 'complaints'} found
        </Text>
      )}

      {/* RESULTS */}

      <FlatList
        data={result}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          result.length === 0 ? styles.emptyList : styles.list
        }
        onEndReached={loadMoreComplaints}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading ? (
            searched ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>⌕</Text>
                </View>

                <Text style={styles.emptyTitle}>No complaints found</Text>

                <Text style={styles.emptyText}>
                  We couldn't find any complaints matching "{search}". Try
                  searching for another organisation or module.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>⌕</Text>
                </View>

                <Text style={styles.emptyTitle}>Search your complaints</Text>

                <Text style={styles.emptyText}>
                  Enter an organisation or module above to find relevant
                  complaints.
                </Text>
              </View>
            )
          ) : (
            <View style={{ paddingVertical: 30 }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.resultCard}>
            {/* CARD HEADER */}

            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.organisation?.name || 'Unknown Organisation'}
                </Text>

                {item.organisation?.orgType && (
                  <Text
                    style={{
                      marginTop: 3,
                      color: theme.muted,
                      fontSize: 12,
                    }}
                  >
                    {item.organisation.orgType}
                  </Text>
                )}
              </View>

              {/* STATUS */}

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(item.status) + '22',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {item.statusName || getStatusName(item.status)}
                </Text>
              </View>
            </View>

            {/* PROBLEM */}

            <Text style={styles.problem} numberOfLines={3}>
              {item.problem || 'No problem description'}
            </Text>

            <View style={styles.divider} />

            {/* MODULE */}

            <Text style={styles.module}>Module: {item.module || 'N/A'}</Text>

            {/* CLIENT */}

            {item.user?.userName && (
              <Text
                style={{
                  marginTop: 5,
                  color: theme.muted,
                  fontSize: 13,
                }}
              >
                Client: {item.user.userName}
              </Text>
            )}

            {/* DATE */}

            {item.createdAt && (
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default SearchPage;
