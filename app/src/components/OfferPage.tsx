import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
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

import { Asset, launchImageLibrary } from 'react-native-image-picker';

import { useTheme } from '../context/ThemeContext';

// Android emulator reaches the development machine through 10.0.2.2.
// Config.API_URL reads the value from the React Native .env file.
const API_BASE_URL = String(Config.API_URL || 'http://10.0.2.2:3002')
  .trim()
  .replace(/\/+$/, '');

const IMAGE_UPLOAD_ENDPOINT = '/api/offers/upload-images';

const MAX_IMAGES = 5;

type OfferStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

type OfferAudience =
  | 'ALL_CLIENTS'
  | 'ORGANISATION_CATEGORIES'
  | 'SELECTED_ORGANISATIONS';

interface OfferImage {
  id?: string;
  fileName: string;
  url?: string;
}

interface OfferOrganisation {
  id: string;
  name: string;
  orgType?: string;
}

interface Offer {
  id: string;
  title: string;
  description?: string | null;
  status: OfferStatus;
  audience: OfferAudience;
  expiresAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  images: OfferImage[];
  categories?: string[];
  organisations?: OfferOrganisation[];
}

interface OfferFormPayload {
  title: string;
  description: string;
  audience: OfferAudience;
  expiresAt: string | null;
  images: string[];
  categories: string[];
  organisationIds: string[];
}

// Fixed: OfferPreview no longer inherits the string[] images property.
interface OfferPreview extends Omit<OfferFormPayload, 'images'> {
  id?: string;
  status?: OfferStatus;
  images: OfferImage[];
}

interface OfferUser {
  id?: string;
  role?: string;
  designation?: string;
  isSuperAdmin?: boolean;
  canPublishOffers?: boolean;
  designationRef?: {
    name?: string;
    canPublishOffers?: boolean;
  };
  permissions?: {
    canPublishOffers?: boolean;
  };
}

interface OfferPageProps {
  user?: OfferUser | null;
  token?: string;
}

interface UploadedImageResponse {
  success?: boolean;
  message?: string;

  fileName?: string;

  images?: Array<{
    fileName?: string;
    url?: string;
  }>;

  url?: string;

  image?: {
    fileName?: string;
    url?: string;
  };

  data?: {
    fileName?: string;
    url?: string;
    image?: {
      fileName?: string;
      url?: string;
    };
  };
}
const EMPTY_FORM: OfferFormPayload = {
  title: '',
  description: '',
  audience: 'ALL_CLIENTS',
  expiresAt: null,
  images: [],
  categories: [],
  organisationIds: [],
};

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseISODate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
};

const formatDDMMYYYY = (value: string): string => {
  const date = parseISODate(value);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
};

const OfferPage: React.FC<OfferPageProps> = ({ user, token: propToken }) => {
  const { theme, isDarkMode } = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [token, setToken] = useState<string | null>(propToken || null);

  const [activeTab, setActiveTab] = useState<OfferStatus>('DRAFT');

  const [offers, setOffers] = useState<Offer[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  const [previewOffer, setPreviewOffer] = useState<OfferPreview | null>(null);

  const [form, setForm] = useState<OfferFormPayload>(EMPTY_FORM);
  const [uploadedImageDetails, setUploadedImageDetails] = useState<
    OfferImage[]
  >([]);

  const [categoryInput, setCategoryInput] = useState('');

  // expiryInput stays YYYY-MM-DD internally; every visible date uses DD-MM-YYYY.
  const [expiryInput, setExpiryInput] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [organisationPickerVisible, setOrganisationPickerVisible] =
    useState(false);
  const [organisations, setOrganisations] = useState<OfferOrganisation[]>([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(false);
  const [organisationSearch, setOrganisationSearch] = useState('');

  // --------------------------------------------------
  // PERMISSION
  // --------------------------------------------------

  // Read the permission returned by the authenticated-user API.
  // Do not infer access from role or designation names (for example CEO/CTO).
  // SuperAdmin is explicitly trusted by the application permission model.
  const canManageOffers =
    user?.isSuperAdmin === true ||
    user?.permissions?.canPublishOffers === true ||
    user?.designationRef?.canPublishOffers === true ||
    user?.canPublishOffers === true;

  // This check controls frontend visibility only.
  // The backend must independently enforce canPublishOffers for every
  // offer create, update, publish, and archive endpoint.

  // --------------------------------------------------
  // AUTH TOKEN
  // --------------------------------------------------

  const getToken = useCallback(async (): Promise<string | null> => {
    if (propToken) {
      return propToken;
    }

    if (token) {
      return token;
    }

    const storedToken =
      (await AsyncStorage.getItem('token')) ||
      (await AsyncStorage.getItem('userToken')) ||
      (await AsyncStorage.getItem('authToken'));

    if (storedToken) {
      setToken(storedToken);
    }

    return storedToken;
  }, [propToken, token]);

  const getHeaders = useCallback(async () => {
    if (!API_BASE_URL) {
      throw new Error(
        'API_URL is missing. Set API_URL in your React Native environment configuration.',
      );
    }
    const authToken = await getToken();

    if (!authToken) {
      throw new Error('Authentication token not found');
    }

    return {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };
  }, [getToken]);

  // --------------------------------------------------
  // FETCH OFFERS
  // --------------------------------------------------

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);

      const headers = await getHeaders();

      const response = await axios.get(`${API_BASE_URL}/api/offers/admin`, {
        headers,
        params: {
          status: activeTab,
        },
      });

      const responseData = response.data;

      const offerList: Offer[] = Array.isArray(responseData)
        ? responseData
        : responseData.offers || responseData.data || [];

      setOffers(offerList);
    } catch (error: any) {
      console.log(
        'Fetch offers error:',
        error?.response?.data || error.message,
      );

      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Unable to fetch offers',
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, getHeaders]);

  useEffect(() => {
    if (canManageOffers) {
      fetchOffers();
    }
  }, [canManageOffers, fetchOffers]);

  // --------------------------------------------------
  // FETCH ALL ORGANISATIONS FOR OFFER TARGETING
  // Uses the existing app endpoint: GET /api/org/get-org
  // --------------------------------------------------

  const fetchOrganisations = useCallback(async () => {
    try {
      setLoadingOrganisations(true);
      const authToken = await getToken();

      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(`${API_BASE_URL}/api/org/get-org`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const rawList =
        response.data?.org ??
        response.data?.organisations ??
        response.data?.data ??
        [];

      const normalized: OfferOrganisation[] = Array.isArray(rawList)
        ? rawList
            .map((item: any) => ({
              id: String(item?.id || item?._id || ''),
              name: String(item?.name || 'Unnamed organisation'),
              orgType: String(item?.orgType || ''),
            }))
            .filter((item: OfferOrganisation) => Boolean(item.id))
        : [];

      setOrganisations(normalized);
    } catch (error: any) {
      console.log(
        'Fetch organisations error:',
        error?.response?.data || error.message,
      );
      Alert.alert(
        'Unable to load organisations',
        error?.response?.data?.message ||
          'Could not load the organisation list. Check GET /api/org/get-org.',
      );
      setOrganisations([]);
    } finally {
      setLoadingOrganisations(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (canManageOffers) {
      fetchOrganisations();
    }
  }, [canManageOffers, fetchOrganisations]);

  // --------------------------------------------------
  // FORM HELPERS
  // --------------------------------------------------

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setUploadedImageDetails([]);
    setCategoryInput('');
    setExpiryInput('');
    setOrganisationSearch('');
    setEditingOfferId(null);
  };

  const updateForm = <K extends keyof OfferFormPayload>(
    key: K,
    value: OfferFormPayload[K],
  ) => {
    setForm(previous => ({
      ...previous,
      [key]: value,
    }));
  };

  const openCreateForm = () => {
    resetForm();
    setFormVisible(true);
  };

  const openEditForm = (offer: Offer) => {
    if (offer.status !== 'DRAFT') {
      Alert.alert('Not allowed', 'Only draft offers can be edited.');
      return;
    }

    setEditingOfferId(offer.id);

    setUploadedImageDetails(offer.images || []);
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      audience: offer.audience,
      expiresAt: offer.expiresAt || null,
      images: (offer.images || []).map(image => image.fileName),
      categories: offer.categories || [],
      organisationIds: (offer.organisations || []).map(
        organisation => organisation.id,
      ),
    });

    setCategoryInput((offer.categories || []).join(', '));

    setExpiryInput(
      offer.expiresAt ? toLocalISODate(new Date(offer.expiresAt)) : '',
    );
    setCalendarMonth(offer.expiresAt ? new Date(offer.expiresAt) : new Date());

    setFormVisible(true);
  };

  // --------------------------------------------------
  // IMAGE PICKER
  // --------------------------------------------------

  const pickImages = async () => {
    try {
      const remaining = MAX_IMAGES - form.images.length;

      if (remaining <= 0) {
        Alert.alert(
          'Image limit',
          `You can upload a maximum of ${MAX_IMAGES} images.`,
        );
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Image picker error',
          result.errorMessage || 'Unable to select images',
        );
        return;
      }

      const assets: Asset[] = result.assets || [];

      if (!assets.length) {
        return;
      }

      await uploadSelectedImages(assets);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to select images');
    }
  };

  // --------------------------------------------------
  // IMAGE UPLOAD
  // --------------------------------------------------

  const uploadSelectedImages = async (assets: Asset[]) => {
    if (uploading) return;

    try {
      const remaining = MAX_IMAGES - form.images.length;
      const selectedAssets = assets.slice(0, remaining);

      if (!selectedAssets.length) {
        Alert.alert(
          'Image limit',
          `You can upload a maximum of ${MAX_IMAGES} images.`,
        );
        return;
      }

      if (!API_BASE_URL) {
        throw new Error(
          'API URL is missing. Set API_URL=http://10.0.2.2:3002 in frontend .env.',
        );
      }

      const authToken = await getToken();
      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      setUploading(true);

      const formData = new FormData();

      selectedAssets.forEach((asset, index) => {
        if (!asset.uri) {
          throw new Error(`Selected image ${index + 1} has no URI.`);
        }

        const mimeType = asset.type || 'image/jpeg';
        const extensionFromMime =
          mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        const fileName =
          asset.fileName || `offer-${Date.now()}-${index}.${extensionFromMime}`;

        // Field name MUST be "image" because backend uses upload.array("image", 5).
        formData.append('image', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);
      });

      const uploadUrl = `${API_BASE_URL}${IMAGE_UPLOAD_ENDPOINT}`;
      console.log('Offer image upload URL:', uploadUrl);
      console.log('Offer image count:', selectedAssets.length);

      const response = await axios.post<UploadedImageResponse>(
        uploadUrl,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
            // Do not set Content-Type manually; React Native/Axios must
            // generate the multipart boundary for this FormData request.
          },
          timeout: 120000,
          // Avoid treating the FormData payload as JSON.
          transformRequest: data => data,
        },
      );

      const responseImages = Array.isArray(response.data?.images)
        ? response.data.images
        : [];

      const uploadedImages: OfferImage[] = responseImages
        .filter(
          item => typeof item?.fileName === 'string' && item.fileName.trim(),
        )
        .map(item => ({
          fileName: String(item.fileName).trim(),
          url: item.url,
        }));

      if (
        !response.data?.success ||
        uploadedImages.length !== selectedAssets.length
      ) {
        throw new Error(
          response.data?.message ||
            `The server returned ${uploadedImages.length} uploaded image(s), but ${selectedAssets.length} were selected.`,
        );
      }

      setUploadedImageDetails(previous => [...previous, ...uploadedImages]);
      setForm(previous => ({
        ...previous,
        images: [
          ...previous.images,
          ...uploadedImages.map(image => image.fileName),
        ].slice(0, MAX_IMAGES),
      }));

      Alert.alert(
        'Success',
        `${uploadedImages.length} image(s) uploaded successfully.`,
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      const message =
        serverMessage || error?.message || 'Unable to upload images.';

      console.log('OFFER IMAGE UPLOAD ERROR:', {
        url: `${API_BASE_URL}${IMAGE_UPLOAD_ENDPOINT}`,
        status,
        response: error?.response?.data,
        message: error?.message,
        code: error?.code,
      });

      Alert.alert('Image upload failed', message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (fileName: string) => {
    setForm(previous => ({
      ...previous,
      images: previous.images.filter(image => image !== fileName),
    }));
    setUploadedImageDetails(previous =>
      previous.filter(image => image.fileName !== fileName),
    );
  };

  // --------------------------------------------------
  // FORM VALIDATION
  // --------------------------------------------------

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter an offer title.');
      return false;
    }

    if (form.title.trim().length > 191) {
      Alert.alert(
        'Invalid title',
        'Offer title must be 191 characters or fewer.',
      );
      return false;
    }

    if (form.audience === 'ORGANISATION_CATEGORIES' && !categoryInput.trim()) {
      Alert.alert('Required', 'Enter at least one organisation category.');
      return false;
    }

    if (
      form.audience === 'SELECTED_ORGANISATIONS' &&
      form.organisationIds.length === 0
    ) {
      Alert.alert('Required', 'Please select at least one organisation.');
      return false;
    }

    if (expiryInput.trim()) {
      const date = parseISODate(expiryInput);

      if (!date) {
        Alert.alert(
          'Invalid expiry date',
          'Please select a valid date using the calendar.',
        );
        return false;
      }
    }

    return true;
  };

  const getPayload = (): OfferFormPayload => {
    const categories = categoryInput
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      audience: form.audience,
      // Keep the API date as ISO 8601; display dates are DD-MM-YYYY.
      expiresAt: expiryInput.trim()
        ? new Date(`${expiryInput.trim()}T23:59:59.000+05:30`).toISOString()
        : null,
      images: form.images,
      categories: form.audience === 'ORGANISATION_CATEGORIES' ? categories : [],
      organisationIds:
        form.audience === 'SELECTED_ORGANISATIONS' ? form.organisationIds : [],
    };
  };

  const openCalendar = () => {
    const selectedDate = expiryInput ? parseISODate(expiryInput) : null;
    setCalendarMonth(selectedDate || new Date());
    setCalendarVisible(true);
  };

  const selectExpiryDate = (date: Date) => {
    setExpiryInput(toLocalISODate(date));
    setCalendarVisible(false);
  };

  const toggleOrganisation = (organisationId: string) => {
    setForm(previous => {
      const exists = previous.organisationIds.includes(organisationId);
      return {
        ...previous,
        organisationIds: exists
          ? previous.organisationIds.filter(id => id !== organisationId)
          : [...previous.organisationIds, organisationId],
      };
    });
  };

  const availableOrganisationTypes = Array.from(
    new Set(
      organisations
        .map(organisation => String(organisation.orgType || '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const toggleOrganisationType = (type: string) => {
    const selectedTypes = categoryInput
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const exists = selectedTypes.some(
      value => value.toLowerCase() === type.toLowerCase(),
    );
    const nextTypes = exists
      ? selectedTypes.filter(
          value => value.toLowerCase() !== type.toLowerCase(),
        )
      : [...selectedTypes, type];
    setCategoryInput(nextTypes.join(', '));
  };

  const filteredOrganisations = organisations.filter(organisation => {
    const search = organisationSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      organisation.name.toLowerCase().includes(search) ||
      (organisation.orgType || '').toLowerCase().includes(search)
    );
  });

  const calendarDays = (() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  })();

  // --------------------------------------------------
  // CREATE / UPDATE OFFER
  // --------------------------------------------------

  const saveOffer = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const headers = await getHeaders();
      const payload = getPayload();

      if (editingOfferId) {
        await axios.patch(
          `${API_BASE_URL}/api/offers/${editingOfferId}`,
          payload,
          {
            headers,
          },
        );

        Alert.alert('Updated', 'Offer draft updated successfully.');
      } else {
        await axios.post(`${API_BASE_URL}/api/offers`, payload, { headers });

        Alert.alert('Created', 'Offer draft created successfully.');
      }

      setFormVisible(false);
      resetForm();

      await fetchOffers();
    } catch (error: any) {
      console.log('Save offer error:', error?.response?.data || error.message);

      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Unable to save offer',
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // PREVIEW
  // --------------------------------------------------

  const openPreview = (offer: Offer) => {
    setPreviewOffer({
      id: offer.id,
      title: offer.title,
      description: offer.description || '',
      audience: offer.audience,
      expiresAt: offer.expiresAt || null,
      status: offer.status,
      images: offer.images || [],
      categories: offer.categories || [],
      organisationIds: (offer.organisations || []).map(
        organisation => organisation.id,
      ),
    });

    setPreviewVisible(true);
  };

  const openFormPreview = () => {
    if (!validateForm()) {
      return;
    }

    const payload = getPayload();

    setPreviewOffer({
      id: editingOfferId || undefined,
      title: payload.title,
      description: payload.description,
      audience: payload.audience,
      expiresAt: payload.expiresAt,
      images: form.images.map(fileName => ({
        fileName,
      })),
      categories: payload.categories,
      organisationIds: payload.organisationIds,
      status: 'DRAFT',
    });

    setPreviewVisible(true);
  };

  // --------------------------------------------------
  // PUBLISH OFFER
  // --------------------------------------------------

  const publishOffer = async (offerId: string) => {
    Alert.alert(
      'Publish offer',
      'Are you sure you want to publish this offer? Notifications will be sent to the targeted clients.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Publish',
          onPress: async () => {
            try {
              setSaving(true);

              const headers = await getHeaders();

              const response = await axios.post(
                `${API_BASE_URL}/api/offers/${offerId}/publish`,
                {},
                { headers },
              );

              const recipientCount =
                response.data?.notifiedClients ??
                response.data?.recipientCount ??
                0;

              setPreviewVisible(false);

              Alert.alert(
                'Published',
                `Offer published successfully. Targeted clients: ${recipientCount}.`,
              );

              setActiveTab('PUBLISHED');
              await fetchOffers();
            } catch (error: any) {
              console.log(
                'Publish offer error:',
                error?.response?.data || error.message,
              );

              Alert.alert(
                'Publish failed',
                error?.response?.data?.message || 'Unable to publish offer',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  // --------------------------------------------------
  // ARCHIVE OFFER
  // --------------------------------------------------

  const archiveOffer = async (offerId: string) => {
    Alert.alert(
      'Archive offer',
      'Are you sure you want to archive this offer?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);

              const headers = await getHeaders();

              await axios.patch(
                `${API_BASE_URL}/api/offers/${offerId}/archive`,
                {},
                { headers },
              );

              Alert.alert('Archived', 'Offer archived successfully.');

              setPreviewVisible(false);
              setActiveTab('ARCHIVED');

              await fetchOffers();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.response?.data?.message || 'Unable to archive offer',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  // --------------------------------------------------
  // LABEL HELPERS
  // --------------------------------------------------

  const getAudienceLabel = (audience: OfferAudience) => {
    switch (audience) {
      case 'ALL_CLIENTS':
        return 'All clients';

      case 'ORGANISATION_CATEGORIES':
        return 'Organisation categories';

      case 'SELECTED_ORGANISATIONS':
        return 'Selected organisations';

      default:
        return 'Unknown audience';
    }
  };

  const getStatusColor = (status: OfferStatus) => {
    switch (status) {
      case 'DRAFT':
        return theme.warning;

      case 'PUBLISHED':
        return theme.success;

      case 'ARCHIVED':
        return theme.muted;

      default:
        return theme.muted;
    }
  };

  // --------------------------------------------------
  // AUDIENCE SELECTOR
  // --------------------------------------------------

  const renderAudienceOption = (
    value: OfferAudience,
    label: string,
    icon: string,
  ) => {
    const selected = form.audience === value;

    return (
      <TouchableOpacity
        key={value}
        activeOpacity={0.8}
        style={[
          styles.audienceOption,
          selected && styles.audienceOptionSelected,
        ]}
        onPress={() => updateForm('audience', value)}
      >
        <Ionicons
          name={icon}
          size={19}
          color={selected ? theme.primary : theme.muted}
        />

        <Text
          style={[styles.audienceText, selected && styles.audienceTextSelected]}
        >
          {label}
        </Text>

        {selected && (
          <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  };

  // --------------------------------------------------
  // OFFER CARD
  // --------------------------------------------------

  const renderOffer = ({ item }: { item: Offer }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.offerCard}
        onPress={() => openPreview(item)}
      >
        <View style={styles.offerCardTop}>
          <View style={styles.offerTitleContainer}>
            <Text style={styles.offerTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.offerAudience}>
              {getAudienceLabel(item.audience)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${getStatusColor(item.status)}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {!!item.description && (
          <Text style={styles.offerDescription} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        {item.images?.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
          >
            {item.images.map((image, index) => (
              <Image
                key={image.id || `${image.fileName}-${index}`}
                source={image.url ? { uri: image.url } : undefined}
                style={styles.offerThumbnail}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.offerFooter}>
          <View>
            <Text style={styles.footerLabel}>Expires</Text>

            <Text style={styles.footerValue}>
              {item.expiresAt
                ? formatDDMMYYYY(toLocalISODate(new Date(item.expiresAt)))
                : 'No expiry'}
            </Text>
          </View>

          <View style={styles.cardActions}>
            {item.status === 'DRAFT' && (
              <>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => openEditForm(item)}
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color={theme.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => publishOffer(item.id)}
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={19}
                    color={theme.success}
                  />
                </TouchableOpacity>
              </>
            )}

            {item.status === 'PUBLISHED' && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => archiveOffer(item.id)}
              >
                <Ionicons
                  name="archive-outline"
                  size={19}
                  color={theme.danger}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => openPreview(item)}
            >
              <Ionicons name="eye-outline" size={19} color={theme.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --------------------------------------------------
  // FORM MODAL
  // --------------------------------------------------

  const renderFormModal = () => (
    <Modal
      visible={formVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setFormVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.formModal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {editingOfferId ? 'Edit offer' : 'Create offer'}
              </Text>

              <Text style={styles.modalSubtitle}>
                Create an offer for your clients
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setFormVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={23} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>Offer title *</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter offer title"
              placeholderTextColor={theme.muted}
              value={form.title}
              onChangeText={value => updateForm('title', value)}
              maxLength={191}
            />

            <Text style={styles.inputLabel}>Description</Text>

            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Write offer details..."
              placeholderTextColor={theme.muted}
              value={form.description}
              onChangeText={value => updateForm('description', value)}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Offer images</Text>

            <View style={styles.imageUploadContainer}>
              {form.images.map((fileName, index) => {
                const imageDetails = uploadedImageDetails.find(
                  image => image.fileName === fileName,
                );
                return (
                  <View
                    key={`${fileName}-${index}`}
                    style={styles.selectedImage}
                  >
                    {imageDetails?.url ? (
                      <Image
                        source={{ uri: imageDetails.url }}
                        style={styles.selectedImagePreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons
                          name="image-outline"
                          size={24}
                          color={theme.primary}
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(fileName)}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={theme.danger}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {form.images.length < MAX_IMAGES && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={pickImages}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="add" size={28} color={theme.primary} />

                      <Text style={styles.addImageText}>Add image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.helperText}>Maximum {MAX_IMAGES} images.</Text>

            <Text style={styles.inputLabel}>Expiry date</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.datePickerButton}
              onPress={openCalendar}
            >
              <Text
                style={[
                  styles.datePickerText,
                  !expiryInput && { color: theme.muted },
                ]}
              >
                {expiryInput
                  ? formatDDMMYYYY(expiryInput)
                  : 'DD-MM-YYYY (optional)'}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
            {!!expiryInput && (
              <Text style={styles.selectedDateCaption}>
                Selected expiry date: {formatDDMMYYYY(expiryInput)}
              </Text>
            )}
            {!!expiryInput && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => setExpiryInput('')}
              >
                <Text style={styles.clearDateText}>Clear date</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Select audience *</Text>

            {renderAudienceOption(
              'ALL_CLIENTS',
              'All clients',
              'people-outline',
            )}

            {renderAudienceOption(
              'ORGANISATION_CATEGORIES',
              'Organisation types',
              'business-outline',
            )}

            {renderAudienceOption(
              'SELECTED_ORGANISATIONS',
              'Selected organisations',
              'list-outline',
            )}

            {form.audience === 'ORGANISATION_CATEGORIES' && (
              <>
                <Text style={styles.inputLabel}>
                  Choose organisation types *
                </Text>

                {loadingOrganisations ? (
                  <View style={styles.organisationLoading}>
                    <ActivityIndicator color={theme.primary} />
                    <Text style={styles.helperText}>
                      Loading organisation types...
                    </Text>
                  </View>
                ) : availableOrganisationTypes.length > 0 ? (
                  <View style={styles.selectedOrganisationTags}>
                    {availableOrganisationTypes.map(type => {
                      const selected = categoryInput
                        .split(',')
                        .map(value => value.trim().toLowerCase())
                        .includes(type.toLowerCase());
                      return (
                        <TouchableOpacity
                          key={type}
                          activeOpacity={0.8}
                          style={[
                            styles.categoryTypeChip,
                            selected && styles.categoryTypeChipSelected,
                          ]}
                          onPress={() => toggleOrganisationType(type)}
                        >
                          <Text
                            style={[
                              styles.categoryTypeChipText,
                              selected && styles.categoryTypeChipTextSelected,
                            ]}
                          >
                            {type}
                          </Text>
                          <Ionicons
                            name={
                              selected
                                ? 'checkmark-circle'
                                : 'add-circle-outline'
                            }
                            size={17}
                            color={selected ? theme.primary : theme.muted}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    No organisation types are available. Add an organisation
                    with an organisation type first.
                  </Text>
                )}

                {!!categoryInput && (
                  <Text style={styles.helperText}>
                    Selected types: {categoryInput}
                  </Text>
                )}
              </>
            )}

            {form.audience === 'SELECTED_ORGANISATIONS' && (
              <>
                <Text style={styles.inputLabel}>Select organisations *</Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.organisationSelectButton}
                  onPress={() => {
                    if (organisations.length === 0) {
                      fetchOrganisations();
                    }
                    setOrganisationPickerVisible(true);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.organisationSelectTitle}>
                      {form.organisationIds.length > 0
                        ? `${form.organisationIds.length} organisation(s) selected`
                        : 'Choose organisations'}
                    </Text>
                    <Text style={styles.organisationSelectSubtitle}>
                      {organisations.length} organisations available
                    </Text>
                  </View>
                  {loadingOrganisations ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.primary}
                    />
                  )}
                </TouchableOpacity>

                {form.organisationIds.length > 0 && (
                  <View style={styles.selectedOrganisationTags}>
                    {form.organisationIds.map(id => {
                      const organisation = organisations.find(
                        item => item.id === id,
                      );
                      return (
                        <View key={id} style={styles.selectedOrganisationTag}>
                          <Text style={styles.selectedOrganisationTagText}>
                            {organisation?.name || id}
                          </Text>
                          <TouchableOpacity
                            onPress={() => toggleOrganisation(id)}
                          >
                            <Ionicons
                              name="close-circle"
                              size={17}
                              color={theme.danger}
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
                <Text style={styles.helperText}>
                  Select one or more organisations. Only their client users will
                  be targeted.
                </Text>
              </>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={openFormPreview}
                disabled={saving || uploading}
              >
                <Text style={styles.secondaryButtonText}>Preview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={saveOffer}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {editingOfferId ? 'Update draft' : 'Save draft'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCalendarModal = () => (
    <Modal
      visible={calendarVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setCalendarVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarModal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Select expiry date</Text>
              <Text style={styles.modalSubtitle}>Date format: DD-MM-YYYY</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCalendarVisible(false)}
            >
              <Ionicons name="close" size={23} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarMonthHeader}>
            <TouchableOpacity
              style={styles.calendarArrow}
              onPress={() =>
                setCalendarMonth(
                  new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
            >
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>
              {calendarMonth.toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              style={styles.calendarArrow}
              onPress={() =>
                setCalendarMonth(
                  new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
            >
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <View key={day} style={styles.calendarCell}>
                <Text style={styles.calendarWeekday}>{day}</Text>
              </View>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <View key={`blank-${index}`} style={styles.calendarCell} />
                );
              }
              const date = new Date(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth(),
                day,
              );
              const selected = expiryInput === toLocalISODate(date);
              const isPast =
                date <
                new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  new Date().getDate(),
                );
              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  disabled={isPast}
                  style={[
                    styles.calendarCell,
                    styles.calendarDayCell,
                    selected && styles.calendarDaySelected,
                    isPast && styles.calendarDayDisabled,
                  ]}
                  onPress={() => selectExpiryDate(date)}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      selected && styles.calendarDaySelectedText,
                      isPast && styles.calendarDayDisabledText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.calendarTodayButton}
            onPress={() => selectExpiryDate(new Date())}
          >
            <Text style={styles.calendarTodayText}>Select today</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderOrganisationPicker = () => (
    <Modal
      visible={organisationPickerVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setOrganisationPickerVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.organisationPickerModal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Select organisations</Text>
              <Text style={styles.modalSubtitle}>
                {form.organisationIds.length} selected · {organisations.length}{' '}
                total
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setOrganisationPickerVisible(false)}
            >
              <Ionicons name="close" size={23} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Search organisation or type..."
            placeholderTextColor={theme.muted}
            value={organisationSearch}
            onChangeText={setOrganisationSearch}
          />

          {loadingOrganisations ? (
            <View style={styles.organisationLoading}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.helperText}>Loading organisations...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOrganisations}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.organisationList}
              ListEmptyComponent={
                <Text style={styles.organisationEmpty}>
                  {organisations.length === 0
                    ? 'No organisations found.'
                    : 'No matching organisations.'}
                </Text>
              }
              renderItem={({ item }) => {
                const selected = form.organisationIds.includes(item.id);
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.organisationRow,
                      selected && styles.organisationRowSelected,
                    ]}
                    onPress={() => toggleOrganisation(item.id)}
                  >
                    <View style={styles.organisationDetails}>
                      <Text style={styles.organisationName}>{item.name}</Text>
                      <Text style={styles.organisationType}>
                        Type: {item.orgType || 'Not set'}
                      </Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={23}
                      color={selected ? theme.primary : theme.muted}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setOrganisationPickerVisible(false)}
          >
            <Text style={styles.primaryButtonText}>
              Done ({form.organisationIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // --------------------------------------------------
  // PREVIEW MODAL
  // --------------------------------------------------

  const renderPreviewModal = () => {
    if (!previewOffer) {
      return null;
    }

    return (
      <Modal
        visible={previewVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Offer preview</Text>

                <Text style={styles.modalSubtitle}>Review offer details</Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPreviewVisible(false)}
              >
                <Ionicons name="close" size={23} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.previewTitle}>{previewOffer.title}</Text>

              {!!previewOffer.description && (
                <Text style={styles.previewDescription}>
                  {previewOffer.description}
                </Text>
              )}

              {previewOffer.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {previewOffer.images.map((image, index) => (
                    <View
                      key={`${image.fileName}-${index}`}
                      style={styles.previewImageContainer}
                    >
                      {image.url ? (
                        <Image
                          source={{ uri: image.url }}
                          style={styles.previewImage}
                        />
                      ) : (
                        <View style={styles.previewImagePlaceholder}>
                          <Ionicons
                            name="image-outline"
                            size={32}
                            color={theme.primary}
                          />

                          <Text style={styles.helperText}>Uploaded image</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}

              <View style={styles.previewInfo}>
                <Text style={styles.previewInfoLabel}>Audience</Text>

                <Text style={styles.previewInfoValue}>
                  {getAudienceLabel(previewOffer.audience)}
                </Text>
              </View>

              {!!previewOffer.categories?.length && (
                <View style={styles.previewInfo}>
                  <Text style={styles.previewInfoLabel}>Categories</Text>

                  <Text style={styles.previewInfoValue}>
                    {previewOffer.categories.join(', ')}
                  </Text>
                </View>
              )}

              {!!previewOffer.organisationIds?.length && (
                <View style={styles.previewInfo}>
                  <Text style={styles.previewInfoLabel}>
                    Selected organisations
                  </Text>

                  <Text style={styles.previewInfoValue}>
                    {previewOffer.organisationIds.join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.previewInfo}>
                <Text style={styles.previewInfoLabel}>Expiry</Text>

                <Text style={styles.previewInfoValue}>
                  {previewOffer.expiresAt
                    ? formatDDMMYYYY(
                        toLocalISODate(new Date(previewOffer.expiresAt)),
                      )
                    : 'No expiry'}
                </Text>
              </View>

              {previewOffer.id && previewOffer.status === 'DRAFT' && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => publishOffer(previewOffer.id!)}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Publish offer</Text>
                  )}
                </TouchableOpacity>
              )}

              {previewOffer.id && previewOffer.status === 'PUBLISHED' && (
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={() => archiveOffer(previewOffer.id!)}
                  disabled={saving}
                >
                  <Text style={styles.primaryButtonText}>Archive offer</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // --------------------------------------------------
  // MAIN SCREEN
  // --------------------------------------------------

  if (!canManageOffers) {
    return (
      <View style={styles.noPermissionContainer}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />

        <Text style={styles.noPermissionTitle}>Access restricted</Text>

        <Text style={styles.noPermissionText}>
          You do not have permission to manage offers.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* StatusBar: backgroundColor removed to match your installed type. */}
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Offers</Text>

          <Text style={styles.headerSubtitle}>
            Manage client offers and promotions
          </Text>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={openCreateForm}>
          <Ionicons name="add" size={21} color="#FFFFFF" />

          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* TABS */}

      <View style={styles.tabs}>
        {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as OfferStatus[]).map(status => {
          const selected = activeTab === status;

          return (
            <TouchableOpacity
              key={status}
              style={[styles.tab, selected && styles.activeTab]}
              onPress={() => setActiveTab(status)}
            >
              <Text style={[styles.tabText, selected && styles.activeTabText]}>
                {status === 'DRAFT'
                  ? 'Drafts'
                  : status === 'PUBLISHED'
                  ? 'Published'
                  : 'Archived'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* OFFER LIST */}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />

          <Text style={styles.loaderText}>Loading offers...</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={item => item.id}
          renderItem={renderOffer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchOffers}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={42} color={theme.muted} />

              <Text style={styles.emptyTitle}>
                No {activeTab.toLowerCase()} offers
              </Text>

              <Text style={styles.emptyText}>
                Offers in this section will appear here.
              </Text>

              {activeTab === 'DRAFT' && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={openCreateForm}
                >
                  <Text style={styles.primaryButtonText}>
                    Create your first offer
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {renderFormModal()}
      {renderCalendarModal()}
      {renderOrganisationPicker()}
      {renderPreviewModal()}
    </View>
  );
};

// ==================================================
// THEME-BASED STYLES
// ==================================================

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    headerTitle: {
      fontSize: 25,
      fontWeight: '800',
      color: theme.ink,
    },

    headerSubtitle: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 5,
    },

    createButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 15,
      paddingVertical: 11,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    createButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },

    tabs: {
      flexDirection: 'row',
      marginHorizontal: 20,
      padding: 4,
      borderRadius: 13,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },

    tab: {
      flex: 1,
      paddingVertical: 11,
      alignItems: 'center',
      borderRadius: 10,
    },

    activeTab: {
      backgroundColor: theme.primarySoft,
    },

    tabText: {
      fontSize: 12,
      color: theme.muted,
      fontWeight: '600',
    },

    activeTabText: {
      color: theme.primary,
      fontWeight: '800',
    },

    listContent: {
      paddingHorizontal: 20,
      paddingTop: 5,
      paddingBottom: 35,
      flexGrow: 1,
    },

    offerCard: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 17,
      padding: 15,
      marginBottom: 13,
    },

    offerCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },

    offerTitleContainer: {
      flex: 1,
    },

    offerTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '800',
    },

    offerAudience: {
      fontSize: 11,
      color: theme.muted,
      marginTop: 6,
    },

    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },

    statusText: {
      fontSize: 9,
      fontWeight: '800',
    },

    offerDescription: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 13,
    },

    imageScroll: {
      marginTop: 13,
    },

    offerThumbnail: {
      width: 85,
      height: 75,
      borderRadius: 10,
      marginRight: 8,
      backgroundColor: theme.primarySoft,
    },

    offerFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },

    footerLabel: {
      color: theme.muted,
      fontSize: 10,
    },

    footerValue: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },

    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    iconButton: {
      width: 35,
      height: 35,
      borderRadius: 10,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loaderText: {
      marginTop: 12,
      color: theme.muted,
      fontSize: 13,
    },

    emptyContainer: {
      flex: 1,
      minHeight: 300,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 25,
    },

    emptyTitle: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: '800',
      marginTop: 15,
    },

    emptyText: {
      color: theme.muted,
      fontSize: 12,
      marginTop: 7,
      textAlign: 'center',
      marginBottom: 18,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },

    formModal: {
      height: '92%',
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    },

    previewModal: {
      height: '85%',
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },

    modalTitle: {
      color: theme.ink,
      fontSize: 21,
      fontWeight: '800',
    },

    modalSubtitle: {
      color: theme.muted,
      fontSize: 12,
      marginTop: 4,
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
    },

    inputLabel: {
      fontSize: 13,
      color: theme.ink,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 15,
    },

    input: {
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 12,
      color: theme.text,
      fontSize: 13,
    },

    descriptionInput: {
      minHeight: 100,
      textAlignVertical: 'top',
    },

    helperText: {
      color: theme.muted,
      fontSize: 10,
      marginTop: 7,
    },

    imageUploadContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },

    selectedImage: {
      width: 75,
      height: 75,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
      position: 'relative',
    },

    imagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    removeImageButton: {
      position: 'absolute',
      top: -7,
      right: -7,
      backgroundColor: theme.white,
      borderRadius: 15,
    },

    addImageButton: {
      width: 75,
      height: 75,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
    },

    addImageText: {
      color: theme.primary,
      fontSize: 9,
      fontWeight: '700',
    },

    selectedImagePreview: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },

    selectedDateCaption: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 8,
    },

    categoryTypeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.white,
      marginRight: 7,
      marginBottom: 7,
    },

    categoryTypeChipSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },

    categoryTypeChipText: {
      color: theme.text,
      fontSize: 11,
      fontWeight: '700',
    },

    categoryTypeChipTextSelected: {
      color: theme.primary,
    },

    audienceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 13,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      marginBottom: 9,
      backgroundColor: theme.white,
      gap: 10,
    },

    audienceOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },

    audienceText: {
      flex: 1,
      color: theme.text,
      fontSize: 12,
      fontWeight: '600',
    },

    audienceTextSelected: {
      color: theme.primary,
      fontWeight: '800',
    },

    formButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 25,
      marginBottom: 25,
    },

    primaryButton: {
      flex: 0,
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      minHeight: 48,
      borderRadius: 14,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
      marginLeft: 8,
      textAlign: 'center',
    },

    secondaryButton: {
      flex: 1,
      backgroundColor: theme.primarySoft,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },

    secondaryButtonText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '800',
    },

    dangerButton: {
      backgroundColor: theme.danger,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },

    previewTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.ink,
      marginBottom: 10,
    },

    previewDescription: {
      fontSize: 13,
      lineHeight: 21,
      color: theme.text,
      marginBottom: 15,
    },

    previewImageContainer: {
      width: 220,
      height: 160,
      borderRadius: 13,
      overflow: 'hidden',
      marginRight: 10,
      backgroundColor: theme.primarySoft,
      marginBottom: 15,
    },

    previewImage: {
      width: '100%',
      height: '100%',
    },

    previewImagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    previewInfo: {
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },

    previewInfoLabel: {
      color: theme.muted,
      fontSize: 11,
      marginBottom: 5,
    },

    previewInfoValue: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
    },

    datePickerButton: {
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    datePickerText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
    },

    clearDateButton: {
      alignSelf: 'flex-end',
      paddingVertical: 7,
      paddingHorizontal: 4,
    },

    clearDateText: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '700',
    },

    calendarModal: {
      width: '100%',
      backgroundColor: theme.background,
      borderRadius: 22,
      padding: 20,
    },

    calendarMonthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    calendarArrow: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: theme.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },

    calendarMonthText: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '800',
    },

    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },

    calendarCell: {
      width: '14.2857%',
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },

    calendarDayCell: {
      borderRadius: 12,
    },

    calendarWeekday: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '800',
    },

    calendarDayText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
    },

    calendarDaySelected: {
      backgroundColor: theme.primary,
    },

    calendarDaySelectedText: {
      color: '#FFFFFF',
      fontWeight: '800',
    },

    calendarDayDisabled: {
      opacity: 0.35,
    },

    calendarDayDisabledText: {
      color: theme.muted,
    },

    calendarTodayButton: {
      marginTop: 16,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
    },

    calendarTodayText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '800',
    },

    organisationSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
    },

    organisationSelectTitle: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
    },

    organisationSelectSubtitle: {
      color: theme.muted,
      fontSize: 10,
      marginTop: 4,
    },

    selectedOrganisationTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 10,
    },

    selectedOrganisationTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: theme.primarySoft,
    },

    selectedOrganisationTagText: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: '700',
    },

    organisationPickerModal: {
      height: '82%',
      backgroundColor: theme.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 18,
    },

    organisationList: {
      paddingTop: 12,
      paddingBottom: 15,
    },

    organisationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 13,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.white,
    },

    organisationRowSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },

    organisationDetails: {
      flex: 1,
    },

    organisationName: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
    },

    organisationType: {
      color: theme.muted,
      fontSize: 10,
      marginTop: 4,
    },

    organisationLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    organisationEmpty: {
      color: theme.muted,
      textAlign: 'center',
      paddingVertical: 30,
      fontSize: 13,
    },

    noPermissionContainer: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 25,
    },

    noPermissionTitle: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 15,
    },

    noPermissionText: {
      color: theme.muted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 8,
    },
  });

export default OfferPage;
