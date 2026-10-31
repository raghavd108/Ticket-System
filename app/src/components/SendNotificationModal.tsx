import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { useTheme } from '../context/ThemeContext';

const BASE_URL = `${Config.API_URL}/api`;

interface Recipient {
  id: string;
  name: string;
  designation?: string;
  organisation?: string;
}

type Audience = 'ALL' | 'SELECTED';
type RecipientType = 'EMPLOYEE' | 'CLIENT';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SendNotificationModal: React.FC<Props> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('EMPLOYEE');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [audience, setAudience] = useState<Audience>('ALL');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const getToken = async () => AsyncStorage.getItem('token');

  const fetchDirectory = async (type: RecipientType = recipientType) => {
    try {
      setDirectoryLoading(true);
      const token = await getToken();
      if (!token) {
        setRecipients([]);
        Alert.alert('Authentication', 'Please sign in again.');
        return;
      }

      const response = await axios.get(
        `${BASE_URL}/notification/employee-directory`,
        {
          params: { recipientType: type },
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const list =
        response.data?.recipients ||
        (type === 'EMPLOYEE'
          ? response.data?.employees
          : response.data?.clients) ||
        response.data?.data ||
        [];

      setRecipients(
        list.map((item: any) => ({
          id: String(item.id || item._id),
          name: item.name || item.userName || 'Unknown',
          designation: item.designation || undefined,
          organisation:
            item.organisation?.name ||
            item.organisationName ||
            item.organisation ||
            undefined,
        })),
      );
    } catch (error: any) {
      console.log('RECIPIENT DIRECTORY ERROR:', error?.response?.data || error);
      setRecipients([]);
      Alert.alert(
        'Unable to load recipients',
        error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setDirectoryLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      setTitle('');
      setMessage('');
      setRecipientType('EMPLOYEE');
      setAudience('ALL');
      setSelectedRecipients([]);
      setSearch('');
      setSelectedFilter('All');
      fetchDirectory('EMPLOYEE');
    }
  }, [visible]);

  const filters = useMemo(() => {
    const values = recipients.map(item =>
      recipientType === 'EMPLOYEE'
        ? item.designation || 'Unassigned'
        : item.organisation || 'Unassigned Organisation',
    );
    return ['All', ...Array.from(new Set(values)).sort()];
  }, [recipients, recipientType]);

  const filteredRecipients = useMemo(
    () =>
      recipients.filter(item => {
        const query = [
          item.name,
          item.designation || '',
          item.organisation || '',
        ]
          .join(' ')
          .toLowerCase();
        const group =
          recipientType === 'EMPLOYEE'
            ? item.designation || 'Unassigned'
            : item.organisation || 'Unassigned Organisation';
        return (
          query.includes(search.toLowerCase()) &&
          (selectedFilter === 'All' || selectedFilter === group)
        );
      }),
    [recipients, search, selectedFilter, recipientType],
  );

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id],
    );
  };

  const selectAllVisible = () => {
    setSelectedRecipients(current =>
      Array.from(
        new Set([...current, ...filteredRecipients.map(item => item.id)]),
      ),
    );
  };

  const close = () => {
    if (!sending) onClose();
  };

  const send = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a notification title.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required', 'Please enter a notification message.');
      return;
    }
    if (audience === 'SELECTED' && selectedRecipients.length === 0) {
      Alert.alert(
        'Select Recipients',
        `Please select at least one ${
          recipientType === 'EMPLOYEE' ? 'employee' : 'client'
        }.`,
      );
      return;
    }

    const count =
      audience === 'ALL' ? recipients.length : selectedRecipients.length;
    if (!count) {
      Alert.alert('No Recipients', 'No eligible recipients were found.');
      return;
    }

    Alert.alert(
      'Confirm Notification',
      `You are about to send this notification to ${count} ${
        recipientType === 'EMPLOYEE' ? 'employee' : 'client'
      }${count !== 1 ? 's' : ''}.\n\nTitle: ${title.trim()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setSending(true);
              const token = await getToken();
              if (!token) {
                Alert.alert('Error', 'Authentication token not found.');
                return;
              }

              const response = await axios.post(
                `${BASE_URL}/notification/employees`,
                {
                  title: title.trim(),
                  message: message.trim(),
                  audience,
                  recipientType,
                  employeeIds:
                    recipientType === 'EMPLOYEE' && audience === 'SELECTED'
                      ? selectedRecipients
                      : [],
                  clientIds:
                    recipientType === 'CLIENT' && audience === 'SELECTED'
                      ? selectedRecipients
                      : [],
                },
                { headers: { Authorization: `Bearer ${token}` } },
              );

              const sentCount = response.data?.recipientCount ?? count;
              Alert.alert(
                'Notification Sent',
                `Successfully sent to ${sentCount} ${
                  recipientType === 'EMPLOYEE' ? 'employee' : 'client'
                }${sentCount !== 1 ? 's' : ''}.`,
              );
              setTitle('');
              setMessage('');
              setSelectedRecipients([]);
              onClose();
            } catch (error: any) {
              console.log(
                'SEND NOTIFICATION ERROR:',
                error?.response?.data || error,
              );
              Alert.alert(
                'Failed',
                error?.response?.data?.message ||
                  'Unable to send notification.',
              );
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  const recipientCount =
    audience === 'ALL' ? recipients.length : selectedRecipients.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.notificationModal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Send Notification</Text>
              <Text style={styles.modalSubtitle}>
                Choose who should receive this notification
              </Text>
            </View>
            <TouchableOpacity
              onPress={close}
              disabled={sending}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={21} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            <Text style={styles.inputLabel}>Notification Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter notification title"
              placeholderTextColor={theme.light}
              style={styles.notificationInput}
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write your notification..."
              placeholderTextColor={theme.light}
              style={[styles.notificationInput, styles.messageInput]}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />

            <Text style={styles.sectionLabel}>Send To</Text>
            <View style={styles.audienceContainer}>
              {(['EMPLOYEE', 'CLIENT'] as RecipientType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.8}
                  onPress={() => {
                    setRecipientType(type);
                    setSelectedRecipients([]);
                    setSearch('');
                    setSelectedFilter('All');
                    fetchDirectory(type);
                  }}
                  style={[
                    styles.audienceOption,
                    recipientType === type && styles.audienceSelected,
                  ]}
                >
                  <Ionicons
                    name={
                      type === 'EMPLOYEE'
                        ? 'people-outline'
                        : 'business-outline'
                    }
                    size={21}
                    color={recipientType === type ? theme.primary : theme.muted}
                  />
                  <View style={styles.audienceTextContainer}>
                    <Text
                      style={[
                        styles.audienceTitle,
                        recipientType === type && styles.selectedText,
                      ]}
                    >
                      {type === 'EMPLOYEE' ? 'Employees' : 'Clients'}
                    </Text>
                    <Text style={styles.audienceSubtitle}>
                      {type === 'EMPLOYEE'
                        ? 'Notify company employees'
                        : 'Notify client users'}
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      recipientType === type
                        ? 'radio-button-on'
                        : 'radio-button-off'
                    }
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Select Audience</Text>
            <View style={styles.audienceContainer}>
              {(['ALL', 'SELECTED'] as Audience[]).map(value => (
                <TouchableOpacity
                  key={value}
                  activeOpacity={0.8}
                  onPress={() => setAudience(value)}
                  style={[
                    styles.audienceOption,
                    audience === value && styles.audienceSelected,
                  ]}
                >
                  <Ionicons
                    name={
                      value === 'ALL' ? 'people-outline' : 'person-add-outline'
                    }
                    size={21}
                    color={audience === value ? theme.primary : theme.muted}
                  />
                  <View style={styles.audienceTextContainer}>
                    <Text
                      style={[
                        styles.audienceTitle,
                        audience === value && styles.selectedText,
                      ]}
                    >
                      {value === 'ALL'
                        ? `All ${
                            recipientType === 'EMPLOYEE'
                              ? 'Employees'
                              : 'Clients'
                          }`
                        : `Selected ${
                            recipientType === 'EMPLOYEE'
                              ? 'Employees'
                              : 'Clients'
                          }`}
                    </Text>
                    <Text style={styles.audienceSubtitle}>
                      {value === 'ALL'
                        ? `Send to all eligible ${
                            recipientType === 'EMPLOYEE'
                              ? 'employees'
                              : 'clients'
                          }`
                        : 'Choose specific recipients'}
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      audience === value
                        ? 'radio-button-on'
                        : 'radio-button-off'
                    }
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {audience === 'SELECTED' && (
              <View style={styles.employeeSection}>
                <View style={styles.employeeHeader}>
                  <Text style={styles.sectionLabel}>
                    Select{' '}
                    {recipientType === 'EMPLOYEE' ? 'Employees' : 'Clients'}
                  </Text>
                  <Text style={styles.selectedCount}>
                    {selectedRecipients.length} selected
                  </Text>
                </View>

                <View style={styles.searchContainer}>
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={theme.muted}
                  />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={`Search ${
                      recipientType === 'EMPLOYEE' ? 'employees' : 'clients'
                    }...`}
                    placeholderTextColor={theme.muted}
                    style={styles.searchInput}
                  />
                  {!!search && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={theme.muted}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.filterLabel}>
                  Filter by{' '}
                  {recipientType === 'EMPLOYEE'
                    ? 'designation'
                    : 'organisation'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.designationList}
                >
                  {filters.map(filter => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setSelectedFilter(filter)}
                      style={[
                        styles.designationChip,
                        selectedFilter === filter &&
                          styles.designationChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.designationChipText,
                          selectedFilter === filter &&
                            styles.designationChipTextActive,
                        ]}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.selectionActions}>
                  <Text style={styles.employeeCount}>
                    {filteredRecipients.length} found
                  </Text>
                  <View style={styles.selectionButtons}>
                    <TouchableOpacity onPress={selectAllVisible}>
                      <Text style={styles.actionText}>Select visible</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSelectedRecipients([])}>
                      <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {directoryLoading ? (
                  <ActivityIndicator
                    style={{ marginVertical: 20 }}
                    color={theme.primary}
                  />
                ) : (
                  <View style={styles.employeeList}>
                    {filteredRecipients.length === 0 ? (
                      <Text style={styles.noEmployees}>
                        No{' '}
                        {recipientType === 'EMPLOYEE' ? 'employees' : 'clients'}{' '}
                        found.
                      </Text>
                    ) : (
                      filteredRecipients.map(item => {
                        const selected = selectedRecipients.includes(item.id);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.75}
                            onPress={() => toggleRecipient(item.id)}
                            style={styles.employeeRow}
                          >
                            <View style={styles.employeeAvatar}>
                              <Text style={styles.avatarText}>
                                {item.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.employeeDetails}>
                              <Text
                                style={styles.employeeName}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <Text style={styles.employeeDesignation}>
                                {recipientType === 'EMPLOYEE'
                                  ? item.designation || 'Unassigned'
                                  : item.organisation || 'Client'}
                              </Text>
                            </View>
                            <Ionicons
                              name={selected ? 'checkbox' : 'square-outline'}
                              size={23}
                              color={selected ? theme.primary : theme.muted}
                            />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.recipientInfo}>
              <View style={styles.recipientIconContainer}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View style={styles.recipientDetails}>
                <Text style={styles.recipientHeading}>
                  Notification Recipients
                </Text>
                <Text style={styles.recipientText}>
                  {recipientCount}{' '}
                  {recipientType === 'EMPLOYEE' ? 'employee' : 'client'}
                  {recipientCount !== 1 ? 's' : ''} will receive this
                  notification.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={close}
                disabled={sending}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={send}
                disabled={sending || directoryLoading}
                style={[
                  styles.sendButton,
                  (sending || directoryLoading) && { opacity: 0.65 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane-outline"
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.sendButtonText}>Send Notification</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.48)',
      justifyContent: 'flex-end',
    },
    notificationModal: {
      maxHeight: '94%',
      backgroundColor: theme.white,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 25 : 15,
      overflow: 'hidden',
    },
    modalHandle: {
      width: 42,
      height: 4,
      borderRadius: 5,
      backgroundColor: theme.light,
      alignSelf: 'center',
      marginBottom: 17,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    modalTitle: { fontSize: 21, fontWeight: '800', color: theme.ink },
    modalSubtitle: { marginTop: 4, fontSize: 12, color: theme.muted },
    closeButton: {
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalScroll: { paddingBottom: 10 },
    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 7,
    },
    notificationInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.background,
      marginBottom: 16,
    },
    messageInput: { height: 95, paddingTop: 12 },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.ink,
      marginBottom: 10,
    },
    audienceContainer: { gap: 9, marginBottom: 20 },
    audienceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 13,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      gap: 11,
    },
    audienceSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },
    audienceTextContainer: { flex: 1 },
    audienceTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
    selectedText: { color: theme.primary },
    audienceSubtitle: { marginTop: 3, fontSize: 11, color: theme.muted },
    employeeSection: { marginBottom: 18 },
    employeeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectedCount: { fontSize: 12, fontWeight: '700', color: theme.primary },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      marginBottom: 14,
    },
    searchInput: {
      flex: 1,
      height: 43,
      fontSize: 13,
      color: theme.text,
      paddingVertical: 0,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.muted,
      marginBottom: 9,
    },
    designationList: { gap: 7, paddingBottom: 13 },
    designationChip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    designationChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    designationChipText: { fontSize: 11, fontWeight: '600', color: theme.text },
    designationChipTextActive: { color: theme.white },
    selectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },
    employeeCount: { fontSize: 11, color: theme.muted, fontWeight: '600' },
    selectionButtons: { flexDirection: 'row', gap: 15 },
    actionText: { fontSize: 11, fontWeight: '700', color: theme.primary },
    clearText: { fontSize: 11, fontWeight: '700', color: theme.muted },
    employeeList: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 13,
      overflow: 'hidden',
    },
    employeeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    employeeAvatar: {
      width: 37,
      height: 37,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
      marginRight: 11,
    },
    avatarText: { fontSize: 14, fontWeight: '800', color: theme.primary },
    employeeDetails: { flex: 1 },
    employeeName: { fontSize: 13, fontWeight: '700', color: theme.text },
    employeeDesignation: { marginTop: 3, fontSize: 11, color: theme.muted },
    noEmployees: {
      textAlign: 'center',
      padding: 20,
      color: theme.muted,
      fontSize: 12,
    },
    recipientInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primarySoft,
      borderRadius: 13,
      padding: 13,
      marginBottom: 18,
      gap: 11,
    },
    recipientIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.white,
    },
    recipientDetails: { flex: 1 },
    recipientHeading: { fontSize: 12, fontWeight: '800', color: theme.text },
    recipientText: { marginTop: 3, fontSize: 11, color: theme.muted },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 3 },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cancelButtonText: { fontSize: 13, fontWeight: '700', color: theme.text },
    sendButton: {
      flex: 1.5,
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    sendButtonText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  });

export default SendNotificationModal;
