import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import createStyles from '../style/searchStyle';
import { useTheme } from '../context/ThemeContext';

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
  createdAt?: string;

  organisation?: Organisation | null;
  user?: User | null;
}

const SearchPage = () => {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const { theme } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  // =====================================================
  // SEARCH
  // =====================================================

  const onSearch = async () => {
    const query = search.trim();

    if (!query) {
      setResult([]);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.log('Authentication token not found');

        setResult([]);
        setSearched(true);

        return;
      }

      const response = await axios.get(
        'http://10.0.2.2:3000/api/complain/search',
        {
          params: {
            q: query,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('SEARCH RESPONSE:', response.data);

      setResult(response.data?.complaint || []);
      setSearched(true);
    } catch (error: any) {
      console.log('SEARCH ERROR:', error.response?.data || error.message);

      setResult([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CLEAR SEARCH
  // =====================================================

  const clearSearch = () => {
    setSearch('');
    setResult([]);
    setSearched(false);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <View style={styles.container}>
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <Text style={styles.heading}>Search Complaints</Text>

      <Text style={styles.subtitle}>
        Search complaints by organisation or module
      </Text>

      {/* ================================================= */}
      {/* SEARCH AREA */}
      {/* ================================================= */}

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

      {/* ================================================= */}
      {/* RESULT COUNT */}
      {/* ================================================= */}

      {searched && !loading && (
        <Text style={styles.resultCount}>
          {result.length} {result.length === 1 ? 'complaint' : 'complaints'}{' '}
          found
        </Text>
      )}

      {/* ================================================= */}
      {/* RESULTS */}
      {/* ================================================= */}

      <FlatList
        data={result}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          result.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
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
        }
        renderItem={({ item }) => (
          <View style={styles.resultCard}>
            {/* ================================================= */}
            {/* CARD HEADER */}
            {/* ================================================= */}

            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.organisation?.name || 'Unknown Organisation'}
                </Text>

                {/* Organisation Type */}
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
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {item.status || 'pending'}
                </Text>
              </View>
            </View>

            {/* ================================================= */}
            {/* PROBLEM */}
            {/* ================================================= */}

            <Text style={styles.problem} numberOfLines={3}>
              {item.problem || 'No problem description'}
            </Text>

            <View style={styles.divider} />

            {/* ================================================= */}
            {/* MODULE */}
            {/* ================================================= */}

            <Text style={styles.module}>Module: {item.module || 'N/A'}</Text>

            {/* ================================================= */}
            {/* CLIENT / USER */}
            {/* ================================================= */}

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

            {/* ================================================= */}
            {/* DATE */}
            {/* ================================================= */}

            {item.createdAt && (
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
};

export default SearchPage;
