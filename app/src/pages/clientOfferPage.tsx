import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = String(Config.API_URL || '')
  .trim()
  .replace(/\/+$/, '');
const CLIENT_OFFERS_ENDPOINT = '/api/offers/client';

type OfferImage = { id?: string; url: string };
type ClientOffer = {
  id: string;
  title: string;
  description?: string | null;
  audience?: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  images: OfferImage[];
};

interface ClientOffersPageProps {
  token?: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const ClientOffersPage: React.FC<ClientOffersPageProps> = ({
  token: propToken,
}) => {
  const { theme, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [token, setToken] = useState<string | null>(propToken || null);
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<ClientOffer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const getToken = useCallback(async () => {
    if (propToken) return propToken;
    if (token) return token;
    const stored =
      (await AsyncStorage.getItem('token')) ||
      (await AsyncStorage.getItem('userToken')) ||
      (await AsyncStorage.getItem('authToken'));
    if (stored) setToken(stored);
    return stored;
  }, [propToken, token]);

  const getAuthHeaders = useCallback(async () => {
    if (!API_BASE_URL) {
      throw new Error(
        'API_URL is missing. Set API_URL in your frontend .env file.',
      );
    }
    const authToken = await getToken();
    if (!authToken)
      throw new Error('Your login session was not found. Please log in again.');
    return { Authorization: `Bearer ${authToken}`, Accept: 'application/json' };
  }, [getToken]);

  const fetchOffers = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        const headers = await getAuthHeaders();
        const requestUrl = `${API_BASE_URL}${CLIENT_OFFERS_ENDPOINT}`;
        const response = await axios.get(requestUrl, {
          headers,
          timeout: 20000,
        });

        // Current backend response: { success: true, count, offers: [...] }
        const responseData = response.data;
        const list = Array.isArray(responseData?.offers)
          ? responseData.offers
          : Array.isArray(responseData?.data)
          ? responseData.data
          : Array.isArray(responseData?.data?.offers)
          ? responseData.data.offers
          : [];

        console.log('CLIENT OFFERS RESPONSE:', {
          url: requestUrl,
          status: response.status,
          count: list.length,
        });

        setOffers(
          list
            .map((item: any) => ({
              ...item,
              id: String(item.id || item._id || ''),
              images: Array.isArray(item.images) ? item.images : [],
            }))
            .filter((item: ClientOffer) => !!item.id),
        );
      } catch (error: any) {
        const status = error?.response?.status;
        const serverMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.details;

        console.log('CLIENT OFFERS FETCH FAILED:', {
          url: `${API_BASE_URL}${CLIENT_OFFERS_ENDPOINT}`,
          status: status || 'NO HTTP RESPONSE',
          response: error?.response?.data,
          message: error?.message,
          apiBaseUrlConfigured: !!API_BASE_URL,
        });

        let message = serverMessage || error?.message || 'Please try again.';

        if (!API_BASE_URL) {
          message =
            'API_URL is missing. Check your frontend .env configuration.';
        } else if (status === 401) {
          message =
            'Your login session is invalid or expired. Please log in again.';
        } else if (status === 403) {
          message =
            'Your account does not have permission to view client offers.';
        } else if (status === 404) {
          message =
            'Offers API route was not found. Check that the offers router is mounted at /api/offers.';
        }

        Alert.alert('Unable to load offers', String(message));
        setOffers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getAuthHeaders],
  );

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const openOffer = async (offer: ClientOffer) => {
    setSelectedOffer(offer);
    setActiveImage(0);
    setDetailLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}${CLIENT_OFFERS_ENDPOINT}/${offer.id}`,
        { headers },
      );
      const detail =
        response.data?.offer ?? response.data?.data ?? response.data;
      if (detail?.id) setSelectedOffer(detail);
    } catch (error: any) {
      console.log(
        'Client offer detail error:',
        error?.response?.data || error?.message,
      );
      // Keep the list response visible if the detail request fails.
      Alert.alert(
        'Offer details',
        error?.response?.data?.message ||
          'Showing the available offer information.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return offers;
    return offers.filter(item =>
      `${item.title || ''} ${item.description || ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [offers, search]);

  const renderOffer = ({ item }: { item: ClientOffer }) => {
    const firstImage = item.images?.[0]?.url;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.offerCard}
        onPress={() => openOffer(item)}
      >
        {firstImage ? (
          <Image
            source={{ uri: firstImage }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="pricetag-outline" size={35} color={theme.primary} />
            <Text style={styles.placeholderText}>Special offer</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>AVAILABLE</Text>
            </View>
            {!!item.expiresAt && (
              <Text style={styles.expiryText}>
                Until {formatDate(item.expiresAt)}
              </Text>
            )}
          </View>
          <Text style={styles.offerTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {!!item.description && (
            <Text style={styles.offerDescription} numberOfLines={3}>
              {item.description}
            </Text>
          )}
          <View style={styles.cardFooter}>
            <Text style={styles.publishedText}>
              {item.publishedAt
                ? `Published ${formatDate(item.publishedAt)}`
                : 'Recently published'}
            </Text>
            <View style={styles.viewOffer}>
              <Text style={styles.viewOfferText}>View offer</Text>
              <Ionicons name="arrow-forward" size={15} color={theme.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedOffer) return null;
    const images = selectedOffer.images || [];
    const currentImage = images[activeImage]?.url;
    return (
      <Modal
        visible={!!selectedOffer}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOffer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>CLIENT OFFER</Text>
                <Text style={styles.modalTitle}>Offer details</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedOffer(null)}
              >
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            {detailLoading && (
              <View style={styles.detailLoading}>
                <ActivityIndicator color={theme.primary} />
                <Text style={styles.helperText}>Loading latest details...</Text>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              {currentImage ? (
                <Image
                  source={{ uri: currentImage }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.detailImage, styles.cardImagePlaceholder]}>
                  <Ionicons
                    name="pricetag-outline"
                    size={42}
                    color={theme.primary}
                  />
                </View>
              )}
              {images.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.imageThumbs}
                >
                  {images.map((image, index) => (
                    <TouchableOpacity
                      key={image.id || `${image.url}-${index}`}
                      onPress={() => setActiveImage(index)}
                    >
                      <Image
                        source={{ uri: image.url }}
                        style={[
                          styles.detailThumb,
                          activeImage === index && styles.detailThumbActive,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <View style={styles.detailContent}>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>
                    AVAILABLE TO YOUR ORGANISATION
                  </Text>
                </View>
                <Text style={styles.detailTitle}>{selectedOffer.title}</Text>
                {!!selectedOffer.description ? (
                  <Text style={styles.detailDescription}>
                    {selectedOffer.description}
                  </Text>
                ) : (
                  <Text style={styles.detailDescription}>
                    Contact your service representative for more information
                    about this offer.
                  </Text>
                )}
                <View style={styles.detailInfoRow}>
                  <View style={styles.detailInfoIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoLabel}>Published</Text>
                    <Text style={styles.detailInfoValue}>
                      {formatDate(selectedOffer.publishedAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailInfoRow}>
                  <View style={styles.detailInfoIcon}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoLabel}>
                      Offer valid until
                    </Text>
                    <Text style={styles.detailInfoValue}>
                      {formatDate(selectedOffer.expiresAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.noticeBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={theme.primary}
                  />
                  <Text style={styles.noticeText}>
                    This offer is shared with your organisation. Contact your SP
                    Infocom representative if you need help redeeming or
                    applying it.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="gift-outline" size={23} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Offers & benefits</Text>
          <Text style={styles.headerSubtitle}>
            Exclusive updates shared with your organisation
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchOffers()}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.introCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.introEyebrow}>MADE FOR YOUR ORGANISATION</Text>
          <Text style={styles.introTitle}>Discover what’s new.</Text>
          <Text style={styles.introSubtitle}>
            Browse current offers and important promotions in one place.
          </Text>
        </View>
        <View style={styles.introIcon}>
          <Ionicons name="sparkles-outline" size={28} color={theme.primary} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={19} color={theme.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search offers..."
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.muted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Available offers</Text>
          <Text style={styles.sectionSubtitle}>
            {offers.length} {offers.length === 1 ? 'offer' : 'offers'} for your
            organisation
          </Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{filteredOffers.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.stateText}>Loading available offers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOffers}
          keyExtractor={item => item.id}
          renderItem={renderOffer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchOffers(false);
              }}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="gift-outline" size={34} color={theme.muted} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'No matching offers' : 'No offers available yet'}
              </Text>
              <Text style={styles.emptyDescription}>
                {search
                  ? 'Try another search term.'
                  : 'When an offer is published for your organisation, it will appear here.'}
              </Text>
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.clearSearchText}>Clear search</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
      {renderDetailModal()}
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,

      paddingTop: 25,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 17,
      paddingBottom: 16,
      gap: 11,
    },
    headerIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { color: theme.ink, fontSize: 20, fontWeight: '800' },
    headerSubtitle: { color: theme.muted, fontSize: 11, marginTop: 4 },
    refreshButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 19,
      padding: 17,
      backgroundColor: theme.primarySoft,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    introEyebrow: {
      color: theme.primary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
    },
    introTitle: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 7,
    },
    introSubtitle: {
      color: theme.text,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 5,
      maxWidth: 245,
    },
    introIcon: {
      width: 53,
      height: 53,
      borderRadius: 18,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    searchContainer: {
      marginHorizontal: 20,
      marginBottom: 18,
      height: 47,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.white,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontSize: 13,
      paddingVertical: 0,
    },
    sectionHeading: {
      paddingHorizontal: 20,
      marginBottom: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: { color: theme.ink, fontSize: 16, fontWeight: '800' },
    sectionSubtitle: { color: theme.muted, fontSize: 10, marginTop: 4 },
    countPill: {
      minWidth: 30,
      height: 28,
      paddingHorizontal: 8,
      borderRadius: 9,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: { color: theme.primary, fontSize: 12, fontWeight: '800' },
    listContent: { paddingHorizontal: 20, paddingBottom: 35, flexGrow: 1 },
    offerCard: {
      backgroundColor: theme.white,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      marginBottom: 14,
    },
    cardImage: {
      width: '100%',
      height: 175,
      backgroundColor: theme.primarySoft,
    },
    cardImagePlaceholder: {
      width: '100%',
      height: 145,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 7,
    },
    cardBody: { padding: 15 },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 10,
    },
    livePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.primarySoft,
      borderRadius: 7,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.success,
    },
    liveText: {
      color: theme.primary,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    expiryText: { color: theme.muted, fontSize: 10 },
    offerTitle: {
      color: theme.ink,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '800',
    },
    offerDescription: {
      color: theme.text,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 7,
    },
    cardFooter: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    publishedText: { color: theme.muted, fontSize: 9 },
    viewOffer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    viewOfferText: { color: theme.primary, fontSize: 11, fontWeight: '800' },
    stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stateText: { color: theme.muted, fontSize: 12, marginTop: 12 },
    emptyState: {
      flex: 1,
      minHeight: 280,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 16,
    },
    emptyDescription: {
      color: theme.muted,
      fontSize: 11,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 7,
    },
    clearSearchText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 13,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.58)',
      justifyContent: 'flex-end',
    },
    detailModal: {
      height: '91%',
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      overflow: 'hidden',
      paddingTop: 18,
    },
    modalHeader: {
      paddingHorizontal: 20,
      paddingBottom: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalEyebrow: {
      color: theme.primary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
    },
    modalTitle: {
      color: theme.ink,
      fontSize: 19,
      fontWeight: '800',
      marginTop: 3,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    detailLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingBottom: 10,
    },
    helperText: { color: theme.muted, fontSize: 10 },
    detailImage: {
      width: '100%',
      height: 220,
      backgroundColor: theme.primarySoft,
    },
    imageThumbs: { paddingHorizontal: 18, paddingTop: 10, gap: 8 },
    detailThumb: {
      width: 58,
      height: 48,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    detailThumbActive: { borderColor: theme.primary },
    detailContent: { padding: 20 },
    detailTitle: {
      color: theme.ink,
      fontSize: 22,
      lineHeight: 29,
      fontWeight: '800',
      marginTop: 14,
    },
    detailDescription: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 21,
      marginTop: 10,
    },
    detailInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    detailInfoIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailInfoLabel: { color: theme.muted, fontSize: 10 },
    detailInfoValue: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 3,
    },
    noticeBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      backgroundColor: theme.primarySoft,
      borderRadius: 12,
      padding: 12,
      marginTop: 17,
    },
    noticeText: { flex: 1, color: theme.text, fontSize: 10, lineHeight: 16 },
  });

export default ClientOffersPage;
