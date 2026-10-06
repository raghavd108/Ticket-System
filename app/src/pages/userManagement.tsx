import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import createstyles from '../style/clientManager';

interface AssignedEmployee {
  _id: string;
  userName: string;
  email: string;
  designation?: string;
  organisation?: {
    _id: string;
    orgType: string;
    name: string;
  };
}

interface User {
  id: string;
  _id?: string;
  userName: string;
  email: string;
  role: string;
  organisation: {
    _id: string;
    orgType: string;
    name: string;
  };
  assignedEmployee?: AssignedEmployee[];
}

interface Organisation {
  _id: string;
  orgType: string;
  name: string;
  createdBy?: {
    _id: string;
    userName?: string;
    email?: string;
    role?: string;
  };
}

const ClientPage = () => {
  // USER FORM

  const [organisation, setOrganisation] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');

  // DATA

  const [client, setClient] = useState<User[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assignedEmployee, setAssignedEmployee] = useState<string[]>([]);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);

  // UI

  // Separate modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // Existing organisation modal
  const [showOrganisationModal, setShowOrganisationModal] = useState(false);

  const [showOrganisationList, setShowOrganisationList] = useState(false);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingOrganisations, setLoadingOrganisations] = useState(false);
  const [creatingOrganisation, setCreatingOrganisation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [newOrganisationName, setNewOrganisationName] = useState('');
  const [newOrganisationType, setNewOrganisationType] = useState('');

  // THE DEFAULT EMPLOYEE ORGANISATION

  const DEFAULT_EMPLOYEE_ORGANISATION = 'spinfocom';

  const { theme } = useTheme();
  const styles = useMemo(() => createstyles(theme), [theme]);

  // INITIAL LOAD

  useEffect(() => {
    getUser();
    getOrganisations();
    getEmployees();
  }, []);

  // GET USERS

  const getUser = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return;
      }

      const res = await axios.get('http://10.0.2.2:3000/api/auth/getUser', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('GET USERS RESPONSE:', res.data);

      setClient(res.data.users || []);
    } catch (error: any) {
      console.log('GET USERS ERROR:', error);

      Alert.alert(
        'Unable to Load Users',
        error.response?.data?.message ||
          'Something went wrong while loading users.',
      );
    } finally {
      setLoading(false);
    }
  };

  // GET ORGANISATIONS

  const getOrganisations = async () => {
    try {
      setLoadingOrganisations(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return;
      }

      const res = await axios.get('http://10.0.2.2:3000/api/org/get-org', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('ORGANISATIONS:', res.data);

      setOrganisations(res.data.org || []);
    } catch (error: any) {
      console.log('GET ORGANISATIONS ERROR:', error);

      Alert.alert(
        'Unable to Load Organisations',
        error.response?.data?.message ||
          'Something went wrong while loading organisations.',
      );
    } finally {
      setLoadingOrganisations(false);
    }
  };

  // GET EMPLOYEES

  const getEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return;
      }

      const res = await axios.get('http://10.0.2.2:3000/api/auth/employees', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('GET EMPLOYEES RESPONSE:', res.data);

      setEmployees(res.data?.employees || []);
    } catch (error: any) {
      console.log('GET EMPLOYEES ERROR:', error);

      Alert.alert(
        'Unable to Load Employees',
        error.response?.data?.message ||
          'Something went wrong while loading employees.',
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  // FIND SPINFOCOM ORGANISATION

  const getSpinfocomOrganisation = () => {
    const spinfocomOrganisation = organisations.find(
      item =>
        item.name?.trim().toLowerCase() ===
        DEFAULT_EMPLOYEE_ORGANISATION.toLowerCase(),
    );

    return spinfocomOrganisation;
  };

  // GET ADMIN ID

  const getAdminId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const res = await axios.get('http://10.0.2.2:3000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return (
        res.data?.user?._id ||
        res.data?.user?.id ||
        res.data?._id ||
        res.data?.id
      );
    } catch (error) {
      console.log('GET ADMIN ID ERROR:', error);
      throw error;
    }
  };

  // CREATE CLIENT

  const createClient = async () => {
    await signUp('client');
  };

  // EMPLOYEE SELECTION

  const toggleEmployee = (employeeId: string) => {
    setAssignedEmployee(previous => {
      if (previous.includes(employeeId)) {
        return previous.filter(id => id !== employeeId);
      }

      return [...previous, employeeId];
    });
  };

  const getEmployeesForSelectedOrganisation = () => {
    if (!organisation) {
      return [];
    }

    const spinfocomOrganisation = getSpinfocomOrganisation();

    if (!spinfocomOrganisation?._id) {
      return [];
    }

    return employees.filter(employee => {
      return employee.organisation?._id === spinfocomOrganisation._id;
    });
  };

  const selectedEmployees = employees.filter(employee =>
    assignedEmployee.includes(employee._id),
  );

  // CREATE EMPLOYEE

  const createEmployee = async () => {
    await signUp('employee');
  };

  // CREATE USER

  const signUp = async (selectedRole: 'client' | 'employee') => {
    const cleanUserName = userName.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = selectedRole.trim().toLowerCase();
    const cleanDesignation = designation.trim();

    // CLIENT ORGANISATION VALIDATION

    if (cleanRole === 'client' && !organisation) {
      Alert.alert('Organisation Required', 'Please select an organisation.');
      return;
    }

    // EMPLOYEE DEFAULT ORGANISATION

    let employeeOrganisationId = organisation;

    if (cleanRole === 'employee') {
      const spinfocomOrganisation = getSpinfocomOrganisation();

      if (!spinfocomOrganisation?._id) {
        Alert.alert(
          'Spinfocom Organisation Not Found',
          'The Spinfocom organisation was not found. Please create/add Spinfocom organisation first.',
        );
        return;
      }

      employeeOrganisationId = spinfocomOrganisation._id;
    }

    // USERNAME

    if (!cleanUserName) {
      Alert.alert('Username Required', 'Please enter a username.');
      return;
    }

    // EMAIL

    if (!cleanEmail) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }

    // PASSWORD

    if (!password) {
      Alert.alert('Password Required', 'Please enter a password.');
      return;
    }

    // EMPLOYEE DESIGNATION

    if (cleanRole === 'employee' && !cleanDesignation) {
      Alert.alert(
        'Designation Required',
        'Please enter designation for the employee.',
      );
      return;
    }

    // CLIENT EMPLOYEE VALIDATION

    if (cleanRole === 'client') {
      const employeesForOrganisation = getEmployeesForSelectedOrganisation();

      const invalidSelectedEmployees = assignedEmployee.some(
        employeeId =>
          !employeesForOrganisation.some(
            employee => employee._id === employeeId,
          ),
      );

      if (invalidSelectedEmployees) {
        Alert.alert(
          'Invalid Employee Selection',
          'Please select employees belonging to the selected organisation.',
        );
        return;
      }
    }

    try {
      setCreating(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Authentication Error', 'Please login again.');
        return;
      }

      // PAYLOAD

      const payload: any = {
        organisation: employeeOrganisationId,
        userName: cleanUserName,
        email: cleanEmail,
        password,
        role: cleanRole,
      };

      // Only send designation for Employee
      if (cleanRole === 'employee') {
        payload.designation = cleanDesignation;
      }

      // Send selected employee IDs for Client
      if (cleanRole === 'client') {
        payload.assignedEmployee = assignedEmployee;
      }

      console.log('CREATE USER PAYLOAD:', payload);

      // API CALL

      const res = await axios.post(
        'http://10.0.2.2:3000/api/auth/register',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('CREATE USER RESPONSE:', res.data);

      // SUCCESS

      Alert.alert(
        'Account Created',
        `${getRoleLabel(cleanRole)} account has been created successfully.`,
      );

      resetUserForm();

      // Close correct modal
      if (cleanRole === 'client') {
        setShowClientModal(false);
      }

      if (cleanRole === 'employee') {
        setShowEmployeeModal(false);
      }

      await getUser();
    } catch (error: any) {
      console.log('CREATE ACCOUNT ERROR:', error);

      Alert.alert(
        'Unable to Create Account',
        error.response?.data?.message ||
          'Something went wrong while creating the account.',
      );
    } finally {
      setCreating(false);
    }
  };

  // CREATE ORGANISATION

  const createOrganisation = async () => {
    const cleanName = newOrganisationName.trim();
    const cleanOrgType = newOrganisationType.trim();

    if (!cleanName) {
      Alert.alert('Organisation Required', 'Please enter organisation name.');
      return;
    }

    try {
      setCreatingOrganisation(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Authentication Error', 'Please login again.');
        return;
      }

      const adminId = await getAdminId();

      if (!adminId) {
        Alert.alert(
          'Admin ID Missing',
          'Unable to identify the current admin.',
        );
        return;
      }

      const res = await axios.post(
        `http://10.0.2.2:3000/api/org/add-org/${adminId}`,
        {
          orgType: newOrganisationType,
          name: cleanName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('CREATE ORGANISATION RESPONSE:', res.data);

      const createdOrganisation = res.data?.org || res.data?.organisation;

      Alert.alert(
        'Organisation Created',
        'Organisation has been created successfully.',
      );

      setNewOrganisationName('');
      setShowOrganisationModal(false);

      await getOrganisations();

      if (createdOrganisation?._id) {
        setOrganisation(createdOrganisation._id);
      }
    } catch (error: any) {
      console.log('CREATE ORGANISATION ERROR:', error);

      Alert.alert(
        'Unable to Create Organisation',
        error.response?.data?.message ||
          'Something went wrong while creating the organisation.',
      );
    } finally {
      setCreatingOrganisation(false);
    }
  };

  // RESET USER FORM

  const resetUserForm = () => {
    setOrganisation('');
    setUserName('');
    setEmail('');
    setPassword('');
    setRole('');
    setDesignation('');
    setAssignedEmployee([]);
    setShowPassword(false);
    setShowOrganisationList(false);
    setShowEmployeeList(false);
  };

  // ROLE LABEL

  const getRoleLabel = (value: string) => {
    switch (value) {
      case 'admin':
        return 'Admin';

      case 'employee':
        return 'Employee';

      case 'client':
        return 'Client';

      default:
        return 'User';
    }
  };

  // SELECT ORGANISATION

  const selectOrganisation = (item: Organisation) => {
    setOrganisation(item._id);
    setAssignedEmployee([]);
    setShowEmployeeList(false);
    setShowOrganisationList(false);
  };

  // SEARCH

  const filteredClients = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return client;
    }

    return client.filter(item => {
      return (
        item.userName?.toLowerCase().includes(value) ||
        item.email?.toLowerCase().includes(value) ||
        item.organisation?.name?.toLowerCase().includes(value) ||
        item.role?.toLowerCase().includes(value)
      );
    });
  }, [client, search]);

  // REFRESH

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getUser(), getOrganisations(), getEmployees()]);
    setRefreshing(false);
  };

  // OPEN CLIENT MODAL

  const openClientModal = () => {
    resetUserForm();
    setRole('client');
    setShowClientModal(true);
  };

  // OPEN EMPLOYEE MODAL

  const openEmployeeModal = () => {
    const spinfocomOrganisation = getSpinfocomOrganisation();

    if (!spinfocomOrganisation?._id) {
      Alert.alert(
        'Spinfocom Organisation Not Found',
        'The Spinfocom organisation was not found. Please make sure an organisation named "spinfocom" exists.',
      );

      return;
    }

    resetUserForm();

    // Automatically assign Spinfocom
    setOrganisation(spinfocomOrganisation._id);

    // Employee role is fixed
    setRole('employee');

    setShowEmployeeModal(true);
  };

  // CLOSE CLIENT MODAL

  const closeClientModal = () => {
    if (creating) {
      return;
    }

    setShowClientModal(false);
    setShowPassword(false);
    setShowOrganisationList(false);
    setShowEmployeeList(false);

    resetUserForm();
  };

  // CLOSE EMPLOYEE MODAL

  const closeEmployeeModal = () => {
    if (creating) {
      return;
    }

    setShowEmployeeModal(false);
    setShowPassword(false);
    setShowEmployeeList(false);

    resetUserForm();
  };

  // OPEN ADD ORGANISATION

  const openOrganisationModal = () => {
    setNewOrganisationName('');
    setShowOrganisationModal(true);
  };

  // VIEW USER

  const viewClient = (item: User) => {
    setSelectedClient(item);
  };

  // USER CARD

  const renderClient = (item: User) => {
    const initial = item.userName ? item.userName.charAt(0).toUpperCase() : 'U';

    return (
      <View style={styles.clientCard} key={item._id || item.id}>
        <View style={styles.clientMain}>
          {/* Avatar */}

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          {/* User information */}

          <View style={styles.clientInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.clientName} numberOfLines={1}>
                {item.userName}
              </Text>

              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />

                <Text style={styles.activeText}>{getRoleLabel(item.role)}</Text>
              </View>
            </View>

            <Text style={styles.clientEmail} numberOfLines={1}>
              {item.email}
            </Text>

            <View style={styles.hospitalRow}>
              <Text style={styles.hospitalIcon}>+</Text>

              <Text style={styles.hospitalText} numberOfLines={1}>
                {item.organisation?.name}
              </Text>
            </View>

            {item.role === 'client' && (
              <Text
                style={{
                  marginTop: 5,
                  color: '#71717A',
                  fontSize: 11,
                  fontWeight: '600',
                }}
                numberOfLines={1}
              >
                {item.assignedEmployee?.length || 0} assigned employee
                {(item.assignedEmployee?.length || 0) === 1 ? '' : 's'}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}

        <View style={styles.clientActions}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.75}
            onPress={() => viewClient(item)}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            activeOpacity={0.75}
            onPress={() => {
              Alert.alert(
                'User Actions',
                'Edit and delete actions can be connected to your backend.',
              );
            }}
          >
            <Text style={styles.moreButtonText}>•••</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // SELECTED ORGANISATION

  const selectedOrganisation = organisations.find(
    item => item._id === organisation,
  );

  // CLIENT FORM

  const renderClientForm = () => {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.modalScrollContent}
      >
        {/* =====================================================
            USERNAME
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>USERNAME</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#A1A1AA"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!creating}
          />
        </View>

        {/* =====================================================
            EMAIL
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#A1A1AA"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!creating}
          />
        </View>

        {/* =====================================================
            ORGANISATION
        ===================================================== */}

        <View style={styles.field}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={[styles.label, { marginBottom: 0 }]}>
              ORGANISATION
            </Text>

            <TouchableOpacity
              onPress={openOrganisationModal}
              disabled={creating}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: '#7357E8',
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                + Add Organisation
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected organisation */}

          <TouchableOpacity
            onPress={() => setShowOrganisationList(previous => !previous)}
            disabled={creating || loadingOrganisations}
            activeOpacity={0.8}
            style={{
              minHeight: 52,
              borderWidth: 1,
              borderColor: organisation ? '#7357E8' : '#E4E4E7',
              borderRadius: 12,
              paddingHorizontal: 15,
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
            }}
          >
            {loadingOrganisations ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size="small" color="#7357E8" />

                <Text
                  style={{
                    marginLeft: 9,
                    color: '#71717A',
                  }}
                >
                  Loading organisations...
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: selectedOrganisation ? '#18181B' : '#A1A1AA',
                    fontSize: 15,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {selectedOrganisation
                    ? selectedOrganisation.name
                    : 'Select organisation'}
                </Text>

                <Text
                  style={{
                    fontSize: 18,
                    color: '#71717A',
                  }}
                >
                  {showOrganisationList ? '▲' : '▼'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Organisation dropdown */}

          {showOrganisationList && (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 12,
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {organisations.length === 0 ? (
                <View
                  style={{
                    padding: 18,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#71717A',
                      marginBottom: 10,
                    }}
                  >
                    No organisations found.
                  </Text>

                  <TouchableOpacity
                    onPress={openOrganisationModal}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: '#7357E8',
                        fontWeight: '700',
                      }}
                    >
                      + Add Organisation
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                organisations.map(item => {
                  const selected = organisation === item._id;

                  return (
                    <TouchableOpacity
                      key={item._id}
                      onPress={() => selectOrganisation(item)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F4F4F5',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          color: selected ? '#7357E8' : '#18181B',
                          fontWeight: selected ? '700' : '500',
                        }}
                      >
                        {item.name}
                      </Text>

                      {selected && (
                        <Text
                          style={{
                            color: '#7357E8',
                            fontWeight: '700',
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}

              <TouchableOpacity
                onPress={openOrganisationModal}
                activeOpacity={0.7}
                style={{
                  padding: 15,
                  backgroundColor: '#FAFAFA',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#7357E8',
                    fontWeight: '700',
                  }}
                >
                  + Add New Organisation
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* =====================================================
            ASSIGN EMPLOYEES
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>ASSIGN EMPLOYEES</Text>

          <TouchableOpacity
            onPress={() => setShowEmployeeList(previous => !previous)}
            disabled={creating || !organisation || loadingEmployees}
            activeOpacity={0.8}
            style={{
              minHeight: 52,
              borderWidth: 1,
              borderColor: assignedEmployee.length > 0 ? '#7357E8' : '#E4E4E7',
              borderRadius: 12,
              paddingHorizontal: 15,
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
            }}
          >
            {loadingEmployees ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size="small" color="#7357E8" />

                <Text
                  style={{
                    marginLeft: 9,
                    color: '#71717A',
                  }}
                >
                  Loading employees...
                </Text>
              </View>
            ) : !organisation ? (
              <Text
                style={{
                  color: '#A1A1AA',
                  fontSize: 15,
                }}
              >
                Select organisation first
              </Text>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: assignedEmployee.length > 0 ? '#18181B' : '#A1A1AA',
                    fontSize: 15,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {assignedEmployee.length > 0
                    ? `${assignedEmployee.length} employee${
                        assignedEmployee.length > 1 ? 's' : ''
                      } selected`
                    : 'Select employees'}
                </Text>

                <Text
                  style={{
                    fontSize: 18,
                    color: '#71717A',
                  }}
                >
                  {showEmployeeList ? '▲' : '▼'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Selected employee chips */}
          {selectedEmployees.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginTop: 10,
                gap: 8,
              }}
            >
              {selectedEmployees.map(employee => (
                <TouchableOpacity
                  key={employee._id}
                  onPress={() => toggleEmployee(employee._id)}
                  disabled={creating}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F5F3FF',
                    borderWidth: 1,
                    borderColor: '#DDD6FE',
                    borderRadius: 20,
                    paddingVertical: 7,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text
                    style={{
                      color: '#5B43C6',
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                    numberOfLines={1}
                  >
                    {employee.userName}
                  </Text>

                  <Text
                    style={{
                      color: '#7357E8',
                      fontSize: 16,
                      fontWeight: '700',
                      marginLeft: 6,
                    }}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Employee dropdown */}
          {showEmployeeList && (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 12,
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {getEmployeesForSelectedOrganisation().length === 0 ? (
                <View
                  style={{
                    padding: 18,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#71717A',
                      textAlign: 'center',
                      lineHeight: 20,
                    }}
                  >
                    {employees.length === 0
                      ? 'No employees found. Create an employee first.'
                      : 'No employees are available for this organisation.'}
                  </Text>
                </View>
              ) : (
                getEmployeesForSelectedOrganisation().map(employee => {
                  const selected = assignedEmployee.includes(employee._id);

                  return (
                    <TouchableOpacity
                      key={employee._id}
                      onPress={() => toggleEmployee(employee._id)}
                      disabled={creating}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 13,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F4F4F5',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            color: selected ? '#7357E8' : '#18181B',
                            fontWeight: selected ? '700' : '600',
                          }}
                          numberOfLines={1}
                        >
                          {employee.userName}
                        </Text>

                        <Text
                          style={{
                            fontSize: 12,
                            color: '#71717A',
                            marginTop: 3,
                          }}
                          numberOfLines={1}
                        >
                          {employee.designation || 'Employee'} •{' '}
                          {employee.email}
                        </Text>
                      </View>

                      <View
                        style={{
                          width: 23,
                          height: 23,
                          borderRadius: 6,
                          borderWidth: 1.5,
                          borderColor: selected ? '#7357E8' : '#D4D4D8',
                          backgroundColor: selected ? '#7357E8' : '#FFFFFF',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {selected && (
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 15,
                              fontWeight: '800',
                            }}
                          >
                            ✓
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {getEmployeesForSelectedOrganisation().length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowEmployeeList(false)}
                  activeOpacity={0.7}
                  style={{
                    padding: 13,
                    backgroundColor: '#FAFAFA',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#7357E8',
                      fontWeight: '700',
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* =====================================================
            PASSWORD
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>PASSWORD</Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Create password"
              placeholderTextColor="#A1A1AA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!creating}
            />

            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(previous => !previous)}
              disabled={creating}
              activeOpacity={0.7}
            >
              <Text style={styles.passwordToggleText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* =====================================================
            SUBMIT
        ===================================================== */}

        <TouchableOpacity
          style={[styles.submitButton, creating && styles.submitButtonDisabled]}
          onPress={createClient}
          disabled={creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />

              <Text style={[styles.submitText, { marginLeft: 9 }]}>
                Creating...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.submitIcon}>+</Text>

              <Text style={styles.submitText}>Create Client Account</Text>
            </>
          )}
        </TouchableOpacity>

        {/* =====================================================
            CANCEL
        ===================================================== */}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={closeClientModal}
          disabled={creating}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // EMPLOYEE FORM

  const renderEmployeeForm = () => {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.modalScrollContent}
      >
        {/* =====================================================
            DEFAULT ORGANISATION INFO
        ===================================================== */}

        <View
          style={{
            backgroundColor: '#F5F3FF',
            borderWidth: 1,
            borderColor: '#DDD6FE',
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: '#7357E8',
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.8,
              marginBottom: 5,
            }}
          >
            DEFAULT ORGANISATION
          </Text>

          <Text
            style={{
              color: '#18181B',
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            Spinfocom
          </Text>

          <Text
            style={{
              color: '#71717A',
              fontSize: 12,
              marginTop: 4,
            }}
          >
            Employees are automatically assigned to Spinfocom.
          </Text>
        </View>

        {/* =====================================================
            USERNAME
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>USERNAME</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter employee username"
            placeholderTextColor="#A1A1AA"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!creating}
          />
        </View>

        {/* =====================================================
            EMAIL
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter employee email"
            placeholderTextColor="#A1A1AA"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!creating}
          />
        </View>

        {/* =====================================================
            PASSWORD
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>PASSWORD</Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Create password"
              placeholderTextColor="#A1A1AA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!creating}
            />

            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(previous => !previous)}
              disabled={creating}
              activeOpacity={0.7}
            >
              <Text style={styles.passwordToggleText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* =====================================================
            DESIGNATION
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>DESIGNATION</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter employee designation"
            placeholderTextColor="#A1A1AA"
            value={designation}
            onChangeText={setDesignation}
            autoCapitalize="words"
            editable={!creating}
          />
        </View>

        {/* =====================================================
            SUBMIT
        ===================================================== */}

        <TouchableOpacity
          style={[styles.submitButton, creating && styles.submitButtonDisabled]}
          onPress={createEmployee}
          disabled={creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />

              <Text style={[styles.submitText, { marginLeft: 9 }]}>
                Creating...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.submitIcon}>+</Text>

              <Text style={styles.submitText}>Create Employee Account</Text>
            </>
          )}
        </TouchableOpacity>

        {/* =====================================================
            CANCEL
        ===================================================== */}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={closeEmployeeModal}
          disabled={creating}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // RETURN

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7357E8"
          />
        }
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* =================================================
              HEADER
          ================================================= */}

          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.eyebrow}>ADMINISTRATION</Text>

              <Text style={styles.title}>User Management</Text>

              <Text style={styles.subtitle}>
                Manage users, roles, access and organisation details.
              </Text>
            </View>

            {/* =================================================
                CREATE BUTTONS
            ================================================= */}

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                flexWrap: 'wrap',
                marginTop: 15,
              }}
            >
              {/* CREATE CLIENT */}

              <TouchableOpacity
                style={styles.createButton}
                activeOpacity={0.8}
                onPress={openClientModal}
              >
                <Text style={styles.createIcon}>+</Text>

                <Text style={styles.createButtonText}>Create Client</Text>
              </TouchableOpacity>

              {/* CREATE EMPLOYEE */}

              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: 'black' }]}
                activeOpacity={0.8}
                onPress={openEmployeeModal}
              >
                <Text style={styles.createIcon}>+</Text>

                <Text style={styles.createButtonText}>Create Employee</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* =================================================
              STATS
          ================================================= */}

          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>U</Text>
              </View>

              <View>
                <Text style={styles.statLabel}>TOTAL USERS</Text>

                <Text style={styles.statValue}>{client.length}</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>O</Text>
              </View>

              <View>
                <Text style={styles.statLabel}>ORGANISATIONS</Text>

                <Text style={styles.statValue}>{organisations.length}</Text>
              </View>
            </View>
          </View>

          {/* =================================================
              SEARCH
          ================================================= */}

          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, organisation or role"
              placeholderTextColor="#A1A1AA"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />

            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                style={styles.clearSearch}
                activeOpacity={0.7}
              >
                <Text style={styles.clearSearchText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* =================================================
              LIST HEADER
          ================================================= */}

          <View style={styles.listHeader}>
            <View>
              <Text style={styles.sectionTitle}>All Users</Text>

              <Text style={styles.sectionSubtitle}>
                {filteredClients.length}{' '}
                {filteredClients.length === 1 ? 'user' : 'users'}{' '}
                {search ? 'matching your search' : 'in your organisation'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onRefresh}
              style={styles.refreshButton}
              activeOpacity={0.7}
            >
              <Text style={styles.refreshText}>↻</Text>
            </TouchableOpacity>
          </View>

          {/* =================================================
              USER LIST
          ================================================= */}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7357E8" />

              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : filteredClients.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>U</Text>
              </View>

              <Text style={styles.emptyTitle}>No users found</Text>

              <Text style={styles.emptyText}>
                {search
                  ? 'Try another name, email, organisation or role.'
                  : 'Create your first user account to get started.'}
              </Text>

              {!search && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={openClientModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyButtonText}>+ Client</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.emptyButton,
                      {
                        backgroundColor: '#18181B',
                      },
                    ]}
                    onPress={openEmployeeModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyButtonText}>+ Employee</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View>{filteredClients.map(renderClient)}</View>
          )}

          {/* =================================================
              FOOTER
          ================================================= */}

          <Text style={styles.footerText}>
            User Management • Secure Account Administration
          </Text>
        </View>
      </ScrollView>

      {/* =====================================================
          CREATE CLIENT MODAL
      ===================================================== */}

      <Modal
        visible={showClientModal}
        animationType="slide"
        transparent
        onRequestClose={closeClientModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalEyebrow}>
                  <Text style={styles.modalEyebrowText}>NEW CLIENT</Text>
                </View>

                <Text style={styles.modalTitle}>Create Client</Text>

                <Text style={styles.modalSubtitle}>
                  Create a client account, assign an organisation and select
                  employees.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeClientModal}
                disabled={creating}
                activeOpacity={0.7}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {renderClientForm()}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================
          CREATE EMPLOYEE MODAL
      ===================================================== */}

      <Modal
        visible={showEmployeeModal}
        animationType="slide"
        transparent
        onRequestClose={closeEmployeeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalEyebrow}>
                  <Text style={styles.modalEyebrowText}>NEW EMPLOYEE</Text>
                </View>

                <Text style={styles.modalTitle}>Create Employee</Text>

                <Text style={styles.modalSubtitle}>
                  Create an employee account. Organisation is automatically set
                  to Spinfocom.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeEmployeeModal}
                disabled={creating}
                activeOpacity={0.7}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {renderEmployeeForm()}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================
          ADD ORGANISATION MODAL
      ===================================================== */}

      <Modal
        visible={showOrganisationModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!creatingOrganisation) {
            setShowOrganisationModal(false);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 22,
            }}
          >
            {/* Header */}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 22,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#7357E8',
                    letterSpacing: 1,
                    marginBottom: 7,
                  }}
                >
                  NEW ORGANISATION
                </Text>

                <Text
                  style={{
                    fontSize: 23,
                    fontWeight: '800',
                    color: '#18181B',
                  }}
                >
                  Add Organisation
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: '#71717A',
                    marginTop: 5,
                  }}
                >
                  Create an organisation that can be assigned to users.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (!creatingOrganisation) {
                    setShowOrganisationModal(false);
                  }
                }}
                disabled={creatingOrganisation}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#F4F4F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 23,
                    color: '#52525B',
                  }}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
            {/* org type */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#52525B',
                marginBottom: 8,
              }}
            >
              ORGANISATION TYPE
            </Text>

            <TextInput
              value={newOrganisationType}
              onChangeText={setNewOrganisationType}
              placeholder="Enter organisation Type"
              placeholderTextColor="#A1A1AA"
              autoCapitalize="words"
              editable={!creatingOrganisation}
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 12,
                paddingHorizontal: 15,
                fontSize: 15,
                color: '#18181B',
                marginBottom: 18,
              }}
            />

            {/* Organisation name */}

            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#52525B',
                marginBottom: 8,
              }}
            >
              ORGANISATION NAME
            </Text>

            <TextInput
              value={newOrganisationName}
              onChangeText={setNewOrganisationName}
              placeholder="Enter organisation name"
              placeholderTextColor="#A1A1AA"
              autoCapitalize="words"
              editable={!creatingOrganisation}
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: '#E4E4E7',
                borderRadius: 12,
                paddingHorizontal: 15,
                fontSize: 15,
                color: '#18181B',
                marginBottom: 18,
              }}
            />

            {/* Create */}

            <TouchableOpacity
              onPress={createOrganisation}
              disabled={creatingOrganisation}
              activeOpacity={0.8}
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: creatingOrganisation ? '#A1A1AA' : '#7357E8',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
              }}
            >
              {creatingOrganisation ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />

                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontWeight: '700',
                      marginLeft: 8,
                    }}
                  >
                    Creating...
                  </Text>
                </>
              ) : (
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 15,
                  }}
                >
                  Create Organisation
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel */}

            <TouchableOpacity
              onPress={() => {
                if (!creatingOrganisation) {
                  setShowOrganisationModal(false);
                }
              }}
              disabled={creatingOrganisation}
              activeOpacity={0.7}
              style={{
                height: 48,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 5,
              }}
            >
              <Text
                style={{
                  color: '#71717A',
                  fontWeight: '600',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!selectedClient}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedClient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.clientModalCard}>
            {/* Header */}
            <View style={styles.clientModalHeader}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>
                  {selectedClient?.userName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>

              <View style={styles.clientHeaderInfo}>
                <Text style={styles.clientModalName}>
                  {selectedClient?.userName}
                </Text>

                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {selectedClient && getRoleLabel(selectedClient.role)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedClient(null)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Details */}
            <View style={styles.detailsSection}>
              {/* Email */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Text>✉️</Text>
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>EMAIL</Text>
                  <Text style={styles.detailValue}>
                    {selectedClient?.email || 'Not available'}
                  </Text>
                </View>
              </View>

              {/* Organisation */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Text>🏢</Text>
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>ORGANISATION</Text>
                  <Text style={styles.detailValue}>
                    {selectedClient?.organisation?.name || 'No Organisation'}
                  </Text>
                </View>
              </View>

              {/* Assigned Employees */}
              {selectedClient?.role === 'client' && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Text>👨‍💼</Text>
                  </View>

                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>ASSIGNED EMPLOYEES</Text>

                    {selectedClient?.assignedEmployee &&
                    selectedClient.assignedEmployee.length > 0 ? (
                      <View style={styles.employeeList}>
                        {selectedClient.assignedEmployee.map(employee => (
                          <View key={employee._id} style={styles.employeeChip}>
                            <View style={styles.employeeDot} />

                            <View>
                              <Text style={styles.employeeName}>
                                {employee.userName}
                              </Text>

                              {employee.designation && (
                                <Text style={styles.employeeDesignation}>
                                  {employee.designation}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noEmployeeText}>
                        No employee assigned
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Footer */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setSelectedClient(null)}
            >
              <Text style={styles.doneButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ClientPage;
