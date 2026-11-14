import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import en from '../i18n/en';

interface OrganisationType {
  _id: string;
  id?: string;
  name: string;
}

interface Organisation {
  _id: string;
  orgType: string;
  name: string;
}

interface CurrentUser {
  id?: string;
  _id?: string;
  role?: string;
  isSuperAdmin?: boolean;
  permissions?: {
    canManageUsers?: boolean;
  };
}

interface OrganisationManagementProps {
  visible: boolean;
  currentUser: CurrentUser | null;
  onClose: () => void;
  onCreated?: (organisation: Organisation) => void;
}

const OrganisationManagement: React.FC<OrganisationManagementProps> = ({
  visible,
  currentUser,
  onClose,
  onCreated,
}) => {
  const { theme } = useTheme();
  const copy = en.clientPage;

  const [organisationName, setOrganisationName] = useState('');
  const [organisationType, setOrganisationType] = useState('');
  const [showTypeList, setShowTypeList] = useState(false);
  const [types, setTypes] = useState<OrganisationType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [creating, setCreating] = useState(false);

  const isSuperAdmin = currentUser?.isSuperAdmin === true;
  const canAddType =
    currentUser?.role === 'admin' ||
    isSuperAdmin ||
    currentUser?.permissions?.canManageUsers === true;

  useEffect(() => {
    if (visible) {
      setOrganisationName('');
      setOrganisationType('');
      setNewTypeName('');
      setShowTypeList(false);
      loadOrganisationTypes();
    }
  }, [visible]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert(copy.authenticationErrorTitle, copy.loginAgain);
      return null;
    }
    return { Authorization: `Bearer ${token}` };
  };

  const loadOrganisationTypes = async () => {
    try {
      setLoadingTypes(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await axios.get(`${Config.API_URL}/api/org/types`, {
        headers,
      });

      const list = Array.isArray(response.data?.types)
        ? response.data.types
        : [];

      setTypes(
        list
          .map((item: any) => ({
            ...item,
            _id: String(item._id || item.id || ''),
            name: String(item.name || ''),
          }))
          .filter((item: OrganisationType) => item._id && item.name),
      );
    } catch (error: any) {
      console.log(
        'GET ORGANISATION TYPES ERROR:',
        error?.response?.data || error,
      );
      Alert.alert(
        'Organisation types',
        error?.response?.data?.message || 'Unable to load organisation types.',
      );
    } finally {
      setLoadingTypes(false);
    }
  };

  const addOrganisationType = async () => {
    const cleanName = newTypeName.trim().replace(/\s+/g, ' ');

    if (!canAddType) {
      Alert.alert(
        'Permission required',
        'You do not have permission to add organisation types.',
      );
      return;
    }

    if (!cleanName) {
      Alert.alert('Type required', 'Enter an organisation type.');
      return;
    }

    try {
      setAddingType(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await axios.post(
        `${Config.API_URL}/api/org/add-type`,
        { name: cleanName },
        { headers },
      );

      const createdName = String(response.data?.type?.name || cleanName);
      await loadOrganisationTypes();
      setOrganisationType(createdName);
      setNewTypeName('');
      setShowTypeList(false);

      Alert.alert(
        'Organisation type added',
        `${createdName} has been added successfully.`,
      );
    } catch (error: any) {
      console.log(
        'ADD ORGANISATION TYPE ERROR:',
        error?.response?.data || error,
      );
      Alert.alert(
        'Unable to add type',
        error?.response?.data?.message || 'Unable to add organisation type.',
      );
    } finally {
      setAddingType(false);
    }
  };

  const getCurrentUserId = async () => {
    const headers = await getAuthHeaders();
    if (!headers) return null;

    const response = await axios.get(`${Config.API_URL}/api/auth/me`, {
      headers,
    });

    return (
      response.data?.user?._id ||
      response.data?.user?.id ||
      response.data?._id ||
      response.data?.id ||
      currentUser?._id ||
      currentUser?.id
    );
  };

  const createOrganisation = async () => {
    const cleanName = organisationName.trim();
    const cleanType = organisationType.trim();

    if (!cleanType) {
      Alert.alert(
        copy.organisationTypeRequiredTitle,
        copy.enterOrganisationType,
      );
      return;
    }

    if (!cleanName) {
      Alert.alert(
        copy.organisationNameRequiredTitle,
        copy.enterOrganisationName,
      );
      return;
    }

    try {
      setCreating(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const userId = await getCurrentUserId();
      if (!userId) {
        Alert.alert(copy.userIdMissingTitle, copy.identifySignedInUser);
        return;
      }

      const response = await axios.post(
        `${Config.API_URL}/api/org/add-org/${userId}`,
        {
          orgType: cleanType,
          name: cleanName,
        },
        { headers },
      );

      console.log('CREATE ORGANISATION RESPONSE:', response.data);
      const created = response.data?.org || response.data?.organisation;

      Alert.alert(copy.organisationCreatedTitle, copy.organisationCreated);
      setOrganisationName('');
      setOrganisationType('');
      setNewTypeName('');
      setShowTypeList(false);

      if (created) {
        onCreated?.({
          ...created,
          _id: String(created._id || created.id || ''),
        });
      }
      onClose();
    } catch (error: any) {
      console.log('CREATE ORGANISATION ERROR:', error?.response?.data || error);
      Alert.alert(
        copy.createOrganisationErrorTitle,
        error?.response?.data?.message || copy.createOrganisationError,
      );
    } finally {
      setCreating(false);
    }
  };

  const close = () => {
    if (creating || addingType) return;
    setShowTypeList(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={close}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: theme.background,
            borderRadius: 22,
            padding: 22,
            borderWidth: 1,
            borderColor: theme.border,
            maxHeight: '90%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 22,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.primarySoft,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  marginBottom: 9,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: theme.primary,
                    letterSpacing: 1,
                  }}
                >
                  {copy.newOrganisationEyebrow}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 23,
                  fontWeight: '800',
                  color: theme.ink,
                }}
              >
                {copy.addOrganisationTitle}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 20,
                  color: theme.muted,
                  marginTop: 6,
                }}
              >
                {copy.createOrganisationSubtitle}
              </Text>
            </View>

            <TouchableOpacity
              onPress={close}
              disabled={creating || addingType}
              activeOpacity={0.7}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: theme.primarySoft,
                borderWidth: 1,
                borderColor: theme.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={23} color={theme.ink} />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: theme.text,
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            {copy.organisationTypeLabel}
          </Text>

          <TouchableOpacity
            onPress={() =>
              setShowTypeList(previous => {
                const next = !previous;
                if (next) loadOrganisationTypes();
                return next;
              })
            }
            disabled={creating}
            activeOpacity={0.8}
            style={{
              minHeight: 52,
              borderWidth: 1,
              borderColor: showTypeList ? theme.primary : theme.border,
              borderRadius: 12,
              paddingHorizontal: 15,
              backgroundColor: theme.background,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: showTypeList ? 8 : 18,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: organisationType ? theme.ink : theme.muted,
                fontWeight: organisationType ? '600' : '400',
                flex: 1,
              }}
            >
              {organisationType || 'Select organization type'}
            </Text>
            <Ionicons
              name={showTypeList ? 'chevron-up' : 'chevron-down'}
              size={19}
              color={theme.muted}
            />
          </TouchableOpacity>

          {showTypeList && (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.background,
                overflow: 'hidden',
                marginBottom: 18,
                maxHeight: 260,
              }}
            >
              {loadingTypes ? (
                <View
                  style={{
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={{ marginLeft: 9, color: theme.muted }}>
                    Loading organisation types...
                  </Text>
                </View>
              ) : types.length === 0 ? (
                <Text
                  style={{
                    padding: 15,
                    color: theme.muted,
                    textAlign: 'center',
                  }}
                >
                  No organisation types available.
                </Text>
              ) : (
                types.map((item, index) => {
                  const selected = organisationType === item.name;
                  return (
                    <TouchableOpacity
                      key={item._id}
                      activeOpacity={0.7}
                      disabled={creating || addingType}
                      onPress={() => {
                        setOrganisationType(item.name);
                        setShowTypeList(false);
                      }}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: index === types.length - 1 ? 0 : 1,
                        borderBottomColor: theme.divider,
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.background,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: selected ? theme.primary : theme.ink,
                          fontWeight: selected ? '700' : '500',
                        }}
                      >
                        {item.name}
                      </Text>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color={theme.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}

              {canAddType && (
                <View
                  style={{
                    padding: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.divider,
                    backgroundColor: theme.background,
                  }}
                >
                  <Text
                    style={{
                      color: theme.ink,
                      fontSize: 12,
                      fontWeight: '700',
                      marginBottom: 8,
                    }}
                  >
                    Add a new organisation type
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      value={newTypeName}
                      onChangeText={setNewTypeName}
                      placeholder="Enter new type"
                      placeholderTextColor={theme.muted}
                      autoCapitalize="words"
                      editable={!addingType && !creating}
                      returnKeyType="done"
                      onSubmitEditing={addOrganisationType}
                      style={{
                        flex: 1,
                        height: 46,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        color: theme.ink,
                        backgroundColor: theme.background,
                        fontSize: 13,
                      }}
                    />
                    <TouchableOpacity
                      onPress={addOrganisationType}
                      disabled={addingType || creating || !newTypeName.trim()}
                      activeOpacity={0.8}
                      style={{
                        height: 46,
                        minWidth: 76,
                        marginLeft: 8,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: theme.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: addingType || !newTypeName.trim() ? 0.6 : 1,
                      }}
                    >
                      {addingType ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.everWhite}
                        />
                      ) : (
                        <Text
                          style={{
                            color: theme.everWhite,
                            fontWeight: '800',
                            fontSize: 13,
                          }}
                        >
                          Add
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: theme.text,
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            {copy.organisationNameLabel}
          </Text>
          <TextInput
            value={organisationName}
            onChangeText={setOrganisationName}
            placeholder={copy.organisationNamePlaceholder}
            placeholderTextColor={theme.muted}
            autoCapitalize="words"
            editable={!creating}
            returnKeyType="done"
            style={{
              height: 52,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              paddingHorizontal: 15,
              fontSize: 14,
              color: theme.ink,
              backgroundColor: theme.background,
              marginBottom: 20,
            }}
          />

          <TouchableOpacity
            onPress={createOrganisation}
            disabled={creating}
            activeOpacity={0.8}
            style={{
              height: 52,
              borderRadius: 14,
              backgroundColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? (
              <>
                <ActivityIndicator size="small" color={theme.everWhite} />
                <Text
                  style={{
                    color: theme.everWhite,
                    fontWeight: '800',
                    marginLeft: 9,
                    fontSize: 14,
                  }}
                >
                  {copy.creating}
                </Text>
              </>
            ) : (
              <Text
                style={{
                  color: theme.everWhite,
                  fontWeight: '800',
                  fontSize: 14,
                }}
              >
                {copy.createOrganisationButton}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={close}
            disabled={creating || addingType}
            activeOpacity={0.7}
            style={{
              height: 46,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 5,
            }}
          >
            <Text
              style={{
                color: theme.muted,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              {copy.cancel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default OrganisationManagement;
