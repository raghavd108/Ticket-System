import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import Config from 'react-native-config';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  pick,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import createstyles from '../style/userManagement';
import AttendanceHistory from '../components/AttendanceHistory';
import DesignationPicker from '../components/DesignationPicker';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface AssignedEmployee {
  _id: string;
  userName: string;
  email: string;
  designation?: string;
  mobileNumber?: string;
  organisation?:
    | string
    | {
        _id: string;
        orgType?: string;
        name?: string;
      };
}

interface User {
  id: string;
  _id?: string;
  userName: string;
  email: string;
  mobileNumber?: string;
  role: string;
  organisation: {
    _id: string;
    orgType?: string;
    name: string;
  };
  designation?: string;
  assignedEmployee?: AssignedEmployee[];
  isRevoked?: boolean;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

interface CurrentUser {
  id?: string;
  _id?: string;
  role?: string;
  designation?: string;
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);

  // USER FORM

  const [organisation, setOrganisation] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'client' | 'employee' | 'revoked'
  >('all');
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [changingAccess, setChangingAccess] = useState(false);

  // DATA

  const [client, setClient] = useState<User[]>([]);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const userPageRef = useRef(1);
  const hasMoreUsersRef = useRef(false);
  const loadingMoreUsersRef = useRef(false);
  const USER_PAGE_SIZE = 10;
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assignedEmployee, setAssignedEmployee] = useState<string[]>([]);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Selected employee attendance and admin editing
  const [attendanceVisible, setAttendanceVisible] = useState(false);
  const [editEmployeeVisible, setEditEmployeeVisible] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [editEmployeeEmail, setEditEmployeeEmail] = useState('');
  const [editEmployeeMobile, setEditEmployeeMobile] = useState('');
  const [editEmployeeDesignation, setEditEmployeeDesignation] = useState('');
  const [editEmployeePassword, setEditEmployeePassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editAssignedEmployees, setEditAssignedEmployees] = useState<string[]>(
    [],
  );
  const [documentFiles, setDocumentFiles] = useState<any[]>([]);

  // UI

  // Separate modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const DEFAULT_EMPLOYEE_ORGANISATION = 'SP Infocom';

  const { theme } = useTheme();
  const styles = useMemo(() => createstyles(theme), [theme]);

  // INITIAL LOAD

  useEffect(() => {
    getCurrentUser();
    getUser();
    getOrganisations();
    getEmployees();
  }, []);

  // GET THE SIGNED-IN USER AND CHECK PAGE ACCESS
  const getCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setCurrentUser(null);
        return;
      }

      const response = await axios.get(`${Config.API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCurrentUser(response.data?.user || null);
    } catch (error: any) {
      console.log('GET CURRENT USER ERROR:', error?.response?.data || error);
      setCurrentUser(null);
    } finally {
      setAccessLoading(false);
    }
  };

  const currentRole = String(currentUser?.role || '')
    .trim()
    .toLowerCase();
  const currentDesignation = String(currentUser?.designation || '')
    .trim()
    .toLowerCase();

  const canAccessUserManagement =
    currentRole === 'admin' ||
    (currentRole === 'employee' && ['ceo', 'cto'].includes(currentDesignation));

  // GET USERS WITH SERVER-SIDE PAGINATION

  const getUser = async (page: number = 1, append: boolean = false) => {
    if (append) {
      if (loadingMoreUsersRef.current || !hasMoreUsersRef.current) {
        return;
      }
      loadingMoreUsersRef.current = true;
      setLoadingMoreUsers(true);
    } else {
      setLoading(true);
      userPageRef.current = 1;
      hasMoreUsersRef.current = false;
      setHasMoreUsers(false);
      setLoadingMoreUsers(false);
    }

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        if (!append) {
          setClient([]);
          setTotalUserCount(0);
        }
        return;
      }

      const res = await axios.get(`${Config.API_URL}/api/auth/getUser`, {
        params: {
          page,
          limit: USER_PAGE_SIZE,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('GET USERS RESPONSE:', res.data);

      const users = Array.isArray(res.data?.users) ? res.data.users : [];

      const normalizedUsers: User[] = users.map((item: any) => ({
        ...item,
        id: String(item.id || item._id || ''),
        _id: String(item._id || item.id || ''),
        mobileNumber:
          item.mobileNumber ?? item.phoneNumber ?? item.mobile ?? '',
        isRevoked: Boolean(item.isRevoked),
        revokedAt: item.revokedAt ?? null,
        revokedReason: item.revokedReason ?? null,
        organisation:
          typeof item.organisation === 'object' && item.organisation
            ? {
                ...item.organisation,
                _id: String(
                  item.organisation._id || item.organisation.id || '',
                ),
              }
            : item.organisation
            ? { _id: String(item.organisation), name: '' }
            : { _id: '', name: '' },
        assignedEmployee: (Array.isArray(item.assignedEmployee)
          ? item.assignedEmployee
          : Array.isArray(item.assignedEmployees)
          ? item.assignedEmployees
          : []
        ).map((entry: any) => {
          const employee = entry?.employee || entry;
          if (typeof employee === 'string') {
            return { _id: employee, userName: 'Employee', email: '' };
          }
          return {
            ...employee,
            _id: String(employee?._id || employee?.id || ''),
            userName: employee?.userName || 'Employee',
            email: employee?.email || '',
          };
        }),
      }));

      if (append) {
        setClient(previous => {
          const existingIds = new Set(
            previous.map(item => String(item._id || item.id)),
          );
          return [
            ...previous,
            ...normalizedUsers.filter(
              item => !existingIds.has(String(item._id || item.id)),
            ),
          ];
        });
      } else {
        setClient(normalizedUsers);
      }

      const pagination = res.data?.pagination;
      const nextPageAvailable =
        pagination?.hasNextPage ?? normalizedUsers.length === USER_PAGE_SIZE;

      userPageRef.current = page;
      hasMoreUsersRef.current = nextPageAvailable;
      setHasMoreUsers(nextPageAvailable);

      setTotalUserCount(
        Number.isFinite(Number(pagination?.totalRecords))
          ? Number(pagination.totalRecords)
          : append
          ? previousTotal => previousTotal + normalizedUsers.length
          : normalizedUsers.length,
      );
    } catch (error: any) {
      console.log('GET USERS ERROR:', error?.response?.data || error);

      if (!append) {
        setClient([]);
        setTotalUserCount(0);
        Alert.alert(
          'Unable to Load Users',
          error.response?.data?.message ||
            'Something went wrong while loading users.',
        );
      } else {
        Alert.alert(
          'Unable to Load More Users',
          error.response?.data?.message ||
            'Please try loading more users again.',
        );
      }
    } finally {
      if (append) {
        loadingMoreUsersRef.current = false;
        setLoadingMoreUsers(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadMoreUsers = () => {
    if (loading || loadingMoreUsersRef.current || !hasMoreUsersRef.current) {
      return;
    }

    getUser(userPageRef.current + 1, true);
  };

  // GET ORGANISATIONS

  const getOrganisations = async () => {
    try {
      setLoadingOrganisations(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return;
      }

      const res = await axios.get(`${Config.API_URL}/api/org/get-org`, {
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

      const res = await axios.get(`${Config.API_URL}/api/auth/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('GET EMPLOYEES RESPONSE:', res.data);

      const list = Array.isArray(res.data?.employees) ? res.data.employees : [];
      setEmployees(
        list.map((item: any) => ({
          ...item,
          _id: String(item._id || item.id || ''),
          mobileNumber:
            item.mobileNumber ?? item.phoneNumber ?? item.mobile ?? '',
          organisation:
            typeof item.organisation === 'object' && item.organisation
              ? {
                  ...item.organisation,
                  _id: String(
                    item.organisation._id || item.organisation.id || '',
                  ),
                }
              : item.organisation
              ? { _id: String(item.organisation), name: '' }
              : { _id: '', name: '' },
        })),
      );
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
    return organisations.find(
      item =>
        String(item.name || '')
          .trim()
          .toLowerCase() === DEFAULT_EMPLOYEE_ORGANISATION.toLowerCase(),
    );
  };

  // GET CURRENT USER ID

  const getCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const res = await axios.get(`${Config.API_URL}/api/auth/me`, {
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
      console.log('GET CURRENT USER ID ERROR:', error);
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
    // Client users are assigned SP Infocom employees, regardless of the
    // client's own organisation. Keep this existing business rule.
    if (!organisation) {
      return [];
    }

    const spinfocomOrganisation = getSpinfocomOrganisation();
    const spinfocomId = String(spinfocomOrganisation?._id || '');

    if (!spinfocomId) {
      return [];
    }

    return employees.filter(employee => {
      const employeeOrganisationId =
        typeof employee.organisation === 'object'
          ? employee.organisation?._id
          : employee.organisation;

      return String(employeeOrganisationId || '') === spinfocomId;
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
    const cleanMobileNumber = mobileNumber.trim();

    if (cleanRole === 'client' && !organisation) {
      Alert.alert('Organisation Required', 'Please select an organisation.');
      return;
    }

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

    if (!cleanUserName) {
      Alert.alert('Username Required', 'Please enter a username.');
      return;
    }

    if (!cleanEmail) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter a password.');
      return;
    }

    if (cleanRole === 'employee' && !cleanMobileNumber) {
      Alert.alert('Mobile Number Required', 'Please enter a mobile number.');
      return;
    }

    if (cleanRole === 'employee' && !/^\d{10}$/.test(cleanMobileNumber)) {
      Alert.alert(
        'Invalid Mobile Number',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    if (cleanRole === 'employee' && !cleanDesignation) {
      Alert.alert(
        'Designation Required',
        'Please select a designation for the employee.',
      );
      return;
    }

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

      const payload: any = {
        organisation: employeeOrganisationId,
        userName: cleanUserName,
        email: cleanEmail,
        password,
        role: cleanRole,
      };

      if (cleanRole === 'employee') {
        payload.designation = cleanDesignation;
        payload.mobileNumber = cleanMobileNumber;
      }

      if (cleanRole === 'client') {
        payload.assignedEmployee = assignedEmployee;
      }

      const res = await axios.post(
        `${Config.API_URL}/api/auth/register`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('CREATE USER RESPONSE:', res.data);

      Alert.alert(
        'Account Created',
        `${getRoleLabel(cleanRole)} account has been created successfully.`,
      );

      resetUserForm();

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

    if (!cleanOrgType) {
      Alert.alert(
        'Organisation Type Required',
        'Please enter the organisation type.',
      );
      return;
    }

    if (!cleanName) {
      Alert.alert(
        'Organisation Name Required',
        'Please enter the organisation name.',
      );
      return;
    }

    try {
      setCreatingOrganisation(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Authentication Error', 'Please login again.');
        return;
      }

      const currentUserId = await getCurrentUserId();

      if (!currentUserId) {
        Alert.alert(
          'User ID Missing',
          'Unable to identify the signed-in user.',
        );
        return;
      }

      const res = await axios.post(
        `${Config.API_URL}/api/org/add-org/${currentUserId}`,
        {
          orgType: cleanOrgType,
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
    setMobileNumber('');
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

  const revokedUsers = useMemo(
    () => client.filter(item => item.isRevoked === true),
    [client],
  );

  const filteredClients = useMemo(() => {
    const value = search.trim().toLowerCase();

    return client.filter(item => {
      const isRevoked = item.isRevoked === true;

      // Revoked accounts are shown only in the Revoked tab.
      if (activeFilter === 'revoked' && !isRevoked) return false;
      if (activeFilter !== 'revoked' && isRevoked) return false;

      const matchesRole =
        activeFilter === 'all' ||
        activeFilter === 'revoked' ||
        item.role === activeFilter;

      const matchesSearch =
        !value ||
        item.userName?.toLowerCase().includes(value) ||
        item.email?.toLowerCase().includes(value) ||
        item.organisation?.name?.toLowerCase().includes(value) ||
        item.role?.toLowerCase().includes(value);

      return matchesRole && matchesSearch;
    });
  }, [client, search, activeFilter]);

  // REFRESH

  const onRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all([getUser(), getOrganisations(), getEmployees()]);
    } finally {
      setRefreshing(false);
    }
  };

  // OPEN CLIENT MODAL

  const openClientModal = () => {
    setShowEmployeeModal(false);
    setShowClientModal(false);
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

    setShowClientModal(false);
    setShowEmployeeModal(false);
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

  // OPEN UPLOAD MODAL
  const openUploadModal = () => {
    if (selectedClient?.role !== 'employee') {
      Alert.alert(
        'Employee Required',
        'Please select an employee before uploading documents.',
      );
      return;
    }

    setDocumentTitle('');
    setDocumentFiles([]);
    setShowUploadModal(true);
  };

  // CLOSE UPLOAD MODAL
  const closeUploadModal = () => {
    if (uploadingDocuments) {
      return;
    }

    setShowUploadModal(false);
    setDocumentTitle('');
    setDocumentFiles([]);
  };

  // PICK DOCUMENTS
  const pickDocuments = async () => {
    try {
      const remainingSlots = 10 - documentFiles.length;

      if (remainingSlots <= 0) {
        Alert.alert('File Limit', 'You can select a maximum of 10 files.');
        return;
      }

      const result = await pick({
        allowMultiSelection: true,
      });

      const pickedFiles = Array.isArray(result) ? result : [];

      setDocumentFiles(previous => {
        const existingUris = new Set(previous.map(file => file.uri));
        const newFiles = pickedFiles.filter(
          file => Boolean(file?.uri) && !existingUris.has(file.uri),
        );
        const availableSlots = Math.max(0, 10 - previous.length);

        if (newFiles.length > availableSlots) {
          Alert.alert(
            'File Limit',
            'Only the first 10 unique files can be selected.',
          );
        }

        return [...previous, ...newFiles.slice(0, availableSlots)];
      });
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }

      console.log('DOCUMENT PICKER ERROR:', error);
      Alert.alert('Error', 'Unable to select documents.');
    }
  };

  // REMOVE SELECTED FILE
  const removeDocument = (uri: string) => {
    setDocumentFiles(previous => previous.filter(file => file.uri !== uri));
  };

  // UPLOAD DOCUMENTS
  const uploadDocuments = async () => {
    const employeeId = selectedClient?._id || selectedClient?.id;

    if (selectedClient?.role !== 'employee' || !employeeId) {
      Alert.alert('Employee Required', 'Please select a valid employee.');
      return;
    }

    if (!documentTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a document title.');
      return;
    }

    if (documentFiles.length === 0) {
      Alert.alert('Files Required', 'Please select at least one file.');
      return;
    }

    if (documentFiles.length > 10) {
      Alert.alert('File Limit', 'You can upload a maximum of 10 files.');
      return;
    }

    try {
      setUploadingDocuments(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again.');
        return;
      }

      const formData = new FormData();

      // Selected employee's ID is sent automatically.
      formData.append('employeeId', employeeId);
      formData.append('title', documentTitle.trim());

      documentFiles.forEach((file, index) => {
        formData.append('files', {
          uri: file.uri,
          name: file.name || `document-${index + 1}`,
          type: file.type || 'application/octet-stream',
        } as any);
      });

      const response = await axios.post(
        `${Config.API_URL}/api/documents/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      console.log('DOCUMENT UPLOAD RESPONSE:', response.data);

      Alert.alert(
        'Upload Successful',
        'Documents have been assigned to the selected employee.',
      );

      setShowUploadModal(false);
      setDocumentTitle('');
      setDocumentFiles([]);
    } catch (error: any) {
      console.log(
        'DOCUMENT UPLOAD ERROR:',
        error.response?.data || error.message,
      );

      Alert.alert(
        'Upload Failed',
        error.response?.data?.message ||
          'Unable to upload documents. Please try again.',
      );
    } finally {
      setUploadingDocuments(false);
    }
  };

  const loadEmployeeAttendance = () => {
    const employeeId = selectedClient?._id || selectedClient?.id;

    if (!employeeId || selectedClient?.role !== 'employee') {
      Alert.alert('Employee Required', 'Please select a valid employee.');
      return;
    }

    setAttendanceVisible(true);
  };

  const openEditEmployee = () => {
    if (
      !selectedClient ||
      !['employee', 'client'].includes(selectedClient.role)
    )
      return;
    setEditEmployeeName(selectedClient.userName || '');
    setEditEmployeeEmail(selectedClient.email || '');
    setEditEmployeeMobile(selectedClient.mobileNumber || '');
    setEditEmployeeDesignation(selectedClient.designation || '');
    setEditEmployeePassword('');
    setShowEditPassword(false);
    setEditAssignedEmployees(
      (selectedClient.assignedEmployee || [])
        .map(item => String(item._id || (item as any).id || ''))
        .filter(Boolean),
    );
    setEditEmployeeVisible(true);
  };

  const closeEditEmployeeModal = () => {
    if (savingEmployee) {
      return;
    }

    setEditEmployeeVisible(false);
    setEditEmployeePassword('');
    setShowEditPassword(false);
  };

  const updateSelectedEmployee = async () => {
    const userId = selectedClient?._id || selectedClient?.id;
    const isEmployee = selectedClient?.role === 'employee';
    const isClient = selectedClient?.role === 'client';
    const cleanName = editEmployeeName.trim();
    const cleanEmail = editEmployeeEmail.trim().toLowerCase();
    const cleanMobile = editEmployeeMobile.trim();
    const cleanDesignation = editEmployeeDesignation.trim();
    const newPassword = editEmployeePassword;

    if (!userId || (!isEmployee && !isClient)) return;
    if (newPassword.length > 0 && newPassword.trim().length === 0) {
      Alert.alert('Invalid password', 'Password cannot contain only spaces.');
      return;
    }
    if (newPassword.length > 0 && newPassword.length < 8) {
      Alert.alert(
        'Invalid password',
        'Password must be at least 8 characters long.',
      );
      return;
    }
    if (!cleanName || !cleanEmail) {
      Alert.alert('Missing details', 'Username and email are required.');
      return;
    }
    if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
      Alert.alert(
        'Invalid mobile number',
        'Enter a valid 10-digit mobile number.',
      );
      return;
    }
    if (isEmployee && (!cleanMobile || !cleanDesignation)) {
      Alert.alert(
        'Missing details',
        'Employee mobile number and designation are required.',
      );
      return;
    }
    if (
      isClient &&
      editAssignedEmployees.some(
        id => !employees.some(employee => employee._id === id),
      )
    ) {
      Alert.alert(
        'Invalid employee selection',
        'Refresh the employee list and try again.',
      );
      return;
    }

    try {
      setSavingEmployee(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const payload: any = {
        userName: cleanName,
        email: cleanEmail,
        mobileNumber: cleanMobile || null,
      };
      // Only send a password when the admin entered a new one.
      if (newPassword.length > 0) payload.password = newPassword;
      if (isEmployee) payload.designation = cleanDesignation;
      if (isClient) payload.assignedEmployee = editAssignedEmployees;

      const response = await axios.patch(
        `${Config.API_URL}/api/auth/update-user/${userId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updated = response.data?.user || response.data?.updatedUser || {};
      const nextUser = {
        ...selectedClient,
        ...updated,
        id: updated.id || updated._id || userId,
        _id: updated._id || updated.id || userId,
        userName: updated.userName ?? cleanName,
        email: updated.email ?? cleanEmail,
        mobileNumber: updated.mobileNumber ?? cleanMobile,
        designation:
          updated.designation ??
          (isEmployee ? cleanDesignation : selectedClient?.designation),
        assignedEmployee:
          updated.assignedEmployee ??
          (isClient
            ? employees.filter(item => editAssignedEmployees.includes(item._id))
            : selectedClient?.assignedEmployee),
      } as User;

      setSelectedClient(nextUser);
      setClient(previous =>
        previous.map(item =>
          String(item._id || item.id) === String(userId)
            ? { ...item, ...nextUser }
            : item,
        ),
      );
      setEditEmployeeVisible(false);
      setEditEmployeePassword('');
      setShowEditPassword(false);
      Alert.alert(
        'Details updated',
        `${isEmployee ? 'Employee' : 'Client'} details have been updated.`,
      );
      await Promise.all([getUser(), getEmployees()]);
    } catch (error: any) {
      console.log('ADMIN UPDATE USER ERROR:', error?.response?.data || error);
      Alert.alert(
        'Update failed',
        error?.response?.data?.message ||
          error?.message ||
          'Could not update user details. Check the backend route and permissions.',
      );
    } finally {
      setSavingEmployee(false);
    }
  };

  // VIEW USER
  const viewClient = (item: User) => {
    setSelectedClient(item);
    setDetailsVisible(true);
  };

  // REVOKE OR RESTORE CLIENT / EMPLOYEE ACCESS
  const changeUserAccess = (action: 'revoke' | 'restore') => {
    const userId = selectedClient?._id || selectedClient?.id;

    if (!selectedClient || !userId) {
      Alert.alert('User not found', 'Please close this window and try again.');
      return;
    }

    const isRestore = action === 'restore';
    const title = isRestore
      ? 'Restore account access?'
      : 'Revoke account access?';
    const message = isRestore
      ? `Allow ${selectedClient.userName} to log in again?`
      : `This will prevent ${selectedClient.userName} from logging in and invalidate their active sessions.`;

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isRestore ? 'Restore Access' : 'Revoke Access',
        style: isRestore ? 'default' : 'destructive',
        onPress: async () => {
          try {
            setChangingAccess(true);
            const token = await AsyncStorage.getItem('token');

            if (!token) {
              Alert.alert('Authentication Error', 'Please log in again.');
              return;
            }

            const endpoint = isRestore ? 'restore-user' : 'revoke-user';
            const response = await axios.patch(
              `${Config.API_URL}/api/auth/${endpoint}/${userId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } },
            );

            const responseUser = response.data?.user || {};
            const nextUser = {
              ...selectedClient,
              ...responseUser,
              id: responseUser.id || responseUser._id || userId,
              _id: responseUser._id || responseUser.id || userId,
              isRevoked: isRestore ? false : true,
              revokedAt: isRestore
                ? null
                : responseUser.revokedAt || new Date().toISOString(),
              revokedReason: isRestore
                ? null
                : responseUser.revokedReason ??
                  selectedClient.revokedReason ??
                  null,
            } as User;

            setSelectedClient(nextUser);
            setClient(previous =>
              previous.map(item =>
                String(item._id || item.id) === String(userId)
                  ? { ...item, ...nextUser }
                  : item,
              ),
            );

            if (isRestore && activeFilter === 'revoked') {
              setActiveFilter('all');
            }

            Alert.alert(
              isRestore ? 'Access Restored' : 'Access Revoked',
              response.data?.message ||
                (isRestore
                  ? 'The account can log in again.'
                  : 'The account can no longer log in.'),
            );

            await getUser();
          } catch (error: any) {
            console.log(
              'CHANGE USER ACCESS ERROR:',
              error?.response?.data || error,
            );
            Alert.alert(
              isRestore ? 'Restore Failed' : 'Revoke Failed',
              error?.response?.data?.message ||
                'Unable to change account access. Please try again.',
            );
          } finally {
            setChangingAccess(false);
          }
        },
      },
    ]);
  };

  const closeDetailsModal = () => {
    setDetailsVisible(false);
    setSelectedClient(null);
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

              <View
                style={[
                  styles.activeBadge,
                  item.isRevoked && {
                    backgroundColor: '#FEE2E2',
                  },
                ]}
              >
                <View
                  style={[
                    styles.activeDot,
                    item.isRevoked && { backgroundColor: '#DC2626' },
                  ]}
                />

                <Text
                  style={[
                    styles.activeText,
                    item.isRevoked && { color: '#B91C1C' },
                  ]}
                >
                  {item.isRevoked ? 'Revoked' : getRoleLabel(item.role)}
                </Text>
              </View>
            </View>

            <Text style={styles.clientEmail} numberOfLines={1}>
              {item.email}
            </Text>

            <View style={styles.hospitalRow}>
              <Ionicons
                name="business-outline"
                size={14}
                color={theme.primary}
              />

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
              setSelectedClient(item);
              setEditEmployeeName(item.userName || '');
              setEditEmployeeEmail(item.email || '');
              setEditEmployeeMobile(item.mobileNumber || '');
              setEditEmployeeDesignation(item.designation || '');
              setEditEmployeePassword('');
              setShowEditPassword(false);
              setEditAssignedEmployees(
                (item.assignedEmployee || []).map(employee => employee._id),
              );
              setEditEmployeeVisible(true);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.ink} />
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
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={[
          styles.modalScrollContent,
          { flexGrow: 1, paddingBottom: 50 },
        ]}
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
                  color: theme.primary,
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
              borderColor: organisation ? theme.primary : theme.border,
              borderRadius: 12,
              paddingHorizontal: 15,
              justifyContent: 'center',
              backgroundColor: theme.background,
            }}
          >
            {loadingOrganisations ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size="small" color={theme.primary} />

                <Text
                  style={{
                    marginLeft: 9,
                    color: theme.muted,
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
                    color: selectedOrganisation ? theme.ink : theme.muted,
                    fontSize: 15,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {selectedOrganisation
                    ? selectedOrganisation.name
                    : 'Select organisation'}
                </Text>

                <Ionicons
                  name={showOrganisationList ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.muted}
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Organisation dropdown */}

          {showOrganisationList && (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.background,
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
                      color: theme.muted,
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
                        color: theme.primary,
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
                        borderBottomColor: theme.divider,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          color: selected ? theme.primary : theme.ink,
                          fontWeight: selected ? '700' : '500',
                        }}
                      >
                        {item.name}
                      </Text>

                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={theme.primary}
                        />
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
                  backgroundColor: theme.background,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
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
              borderColor:
                assignedEmployee.length > 0 ? theme.primary : theme.border,
              borderRadius: 12,
              paddingHorizontal: 15,
              justifyContent: 'center',
              backgroundColor: theme.background,
            }}
          >
            {loadingEmployees ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <ActivityIndicator size="small" color={theme.primary} />

                <Text
                  style={{
                    marginLeft: 9,
                    color: theme.muted,
                  }}
                >
                  Loading employees...
                </Text>
              </View>
            ) : !organisation ? (
              <Text
                style={{
                  color: theme.muted,
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
                    color:
                      assignedEmployee.length > 0 ? theme.ink : theme.muted,
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

                <Ionicons
                  name={showEmployeeList ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.muted}
                />
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
                    backgroundColor: theme.primarySoft,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 20,
                    paddingVertical: 7,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                    numberOfLines={1}
                  >
                    {employee.userName}
                  </Text>

                  <Text
                    style={{
                      color: theme.primary,
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
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.background,
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
                      color: theme.muted,
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
                        borderBottomColor: theme.divider,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            color: selected ? theme.primary : theme.ink,
                            fontWeight: selected ? '700' : '600',
                          }}
                          numberOfLines={1}
                        >
                          {employee.userName}
                        </Text>

                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.muted,
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
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected
                            ? theme.primary
                            : theme.background,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {selected && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={theme.everWhite}
                          />
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
                    backgroundColor: theme.background,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: theme.primary,
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
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.primary}
              />
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
              <Ionicons
                name="person-add-outline"
                size={19}
                color={theme.everWhite}
              />

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
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={[
          styles.modalScrollContent,
          { paddingBottom: 50, flexGrow: 1 },
        ]}
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
            returnKeyType="next"
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
            returnKeyType="next"
            editable={!creating}
          />
        </View>

        {/* =====================================================
            MOBILE NUMBER
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>MOBILE NUMBER</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter employee mobile number"
            placeholderTextColor="#A1A1AA"
            value={mobileNumber}
            onChangeText={text =>
              setMobileNumber(text.replace(/\D/g, '').slice(0, 10))
            }
            keyboardType="phone-pad"
            maxLength={10}
            autoCapitalize="none"
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
              autoCorrect={false}
              returnKeyType="next"
              editable={!creating}
            />

            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(previous => !previous)}
              disabled={creating}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* =====================================================
            DESIGNATION
        ===================================================== */}

        <View style={styles.field}>
          <Text style={styles.label}>DESIGNATION</Text>

          <DesignationPicker
            value={designation}
            onChange={setDesignation}
            disabled={creating}
            allowCreate
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
              <Ionicons
                name="person-add-outline"
                size={19}
                color={theme.everWhite}
              />

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

  if (accessLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text
          style={{
            color: theme.ink,
            marginTop: 12,
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          Checking access...
        </Text>
      </SafeAreaView>
    );
  }

  if (!canAccessUserManagement) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: theme.background,
        }}
      >
        <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />
        <Text
          style={{
            color: theme.ink,
            fontSize: 18,
            fontWeight: '800',
            marginTop: 14,
          }}
        >
          Access restricted
        </Text>
        <Text
          style={{
            color: theme.muted,
            fontSize: 13,
            lineHeight: 20,
            textAlign: 'center',
            marginTop: 7,
          }}
        >
          User Management is available to Admin, CEO and CTO accounts only.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { flex: 1 }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
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
              <Text style={styles.eyebrow}>USER ADMINISTRATION</Text>

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
                <Ionicons name="person-add" size={19} color={theme.everWhite} />

                <Text style={styles.createButtonText}>Create Client</Text>
              </TouchableOpacity>

              {/* CREATE EMPLOYEE */}

              <TouchableOpacity
                style={[styles.createButton, styles.employeeCreateButton]}
                activeOpacity={0.8}
                onPress={openEmployeeModal}
              >
                <Ionicons name="person-add" size={19} color={theme.everWhite} />

                <Text style={styles.createButtonText}>Create Employee</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* =================================================
              STATS
          ================================================= */}

          <View style={styles.statsRow}>
            {/* Total Users */}
            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={[styles.statIcon, styles.statIconPrimary]}>
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.statValue}>{totalUserCount}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
            </View>

            {/* Organisations */}
            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={[styles.statIcon, styles.statIconGreen]}>
                <Ionicons name="business" size={24} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.statValue}>{organisations.length}</Text>
                <Text style={styles.statLabel}>Organisations</Text>
              </View>
            </View>
          </View>

          {/* =================================================
              SEARCH
          ================================================= */}

          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={21}
              color={theme.primary}
              style={{ marginRight: 10 }}
            />

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
                <Ionicons name="close-circle" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* =================================================
              LIST HEADER
          ================================================= */}

          <View style={styles.listHeader}>
            <View style={styles.filterTabs}>
              {[
                { label: 'All Users', value: 'all' as const },
                { label: 'Clients', value: 'client' as const },
                { label: 'Employees', value: 'employee' as const },
                ...(revokedUsers.length > 0
                  ? [
                      {
                        label: `Revoked (${revokedUsers.length})`,
                        value: 'revoked' as const,
                      },
                    ]
                  : []),
              ].map(tab => {
                const selected = activeFilter === tab.value;

                return (
                  <TouchableOpacity
                    key={tab.value}
                    onPress={() => setActiveFilter(tab.value)}
                    activeOpacity={0.8}
                    style={[
                      styles.filterTab,
                      selected && styles.filterTabSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        selected && styles.filterTabTextSelected,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* =================================================
              USER LIST
          ================================================= */}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />

              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : filteredClients.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="people-outline"
                  size={25}
                  color={theme.primary}
                />
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
                    <Ionicons
                      name="person-add-outline"
                      size={16}
                      color={theme.everWhite}
                    />
                    <Text style={styles.emptyButtonText}>Client</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.emptyButton,
                      {
                        backgroundColor: theme.ink,
                      },
                    ]}
                    onPress={openEmployeeModal}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={theme.everWhite}
                    />
                    <Text style={styles.emptyButtonText}>Employee</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View>{filteredClients.map(renderClient)}</View>
          )}

          {/* LOAD MORE USERS */}

          {!loading && client.length > 0 && hasMoreUsers && (
            <TouchableOpacity
              onPress={loadMoreUsers}
              disabled={loadingMoreUsers}
              activeOpacity={0.8}
              style={{
                marginTop: 14,
                marginBottom: 8,
                minHeight: 46,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              {loadingMoreUsers ? (
                <>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text
                    style={{
                      marginLeft: 9,
                      color: theme.primary,
                      fontWeight: '700',
                    }}
                  >
                    Loading more users...
                  </Text>
                </>
              ) : (
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: '800',
                  }}
                >
                  Load More Users ({client.length} of {totalUserCount})
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!loading && client.length > 0 && !hasMoreUsers && (
            <Text
              style={{
                textAlign: 'center',
                color: theme.muted,
                fontSize: 12,
                paddingVertical: 12,
              }}
            >
              All users loaded
            </Text>
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
        statusBarTranslucent
        onRequestClose={closeClientModal}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { flex: 1, justifyContent: 'flex-end' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.modalContainer,
              {
                height: '90%',
                maxHeight: '90%',
                flexShrink: 1,
                overflow: 'hidden',
              },
            ]}
          >
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
                <Ionicons name="close" size={24} color={theme.ink} />
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
        statusBarTranslucent
        onRequestClose={closeEmployeeModal}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { flex: 1, justifyContent: 'flex-end' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.modalContainer,
              {
                height: '90%',
                maxHeight: '90%',
                flexShrink: 1,
                overflow: 'hidden',
              },
            ]}
          >
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
                <Ionicons name="close" size={24} color={theme.ink} />
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
        statusBarTranslucent
        onRequestClose={() => {
          if (!creatingOrganisation) {
            setShowOrganisationModal(false);
          }
        }}
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
                    NEW ORGANISATION
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 23,
                    fontWeight: '800',
                    color: theme.ink,
                  }}
                >
                  Add Organisation
                </Text>

                <Text
                  style={{
                    fontSize: 13,
                    lineHeight: 20,
                    color: theme.muted,
                    marginTop: 6,
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
              ORGANISATION TYPE
            </Text>

            <TextInput
              value={newOrganisationType}
              onChangeText={setNewOrganisationType}
              placeholder="Enter organisation type"
              placeholderTextColor={theme.muted}
              autoCapitalize="words"
              editable={!creatingOrganisation}
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                paddingHorizontal: 15,
                fontSize: 14,
                color: theme.ink,
                backgroundColor: theme.background,
                marginBottom: 18,
              }}
            />

            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: theme.text,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              ORGANISATION NAME
            </Text>

            <TextInput
              value={newOrganisationName}
              onChangeText={setNewOrganisationName}
              placeholder="Enter organisation name"
              placeholderTextColor={theme.muted}
              autoCapitalize="words"
              editable={!creatingOrganisation}
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
              disabled={creatingOrganisation}
              activeOpacity={0.8}
              style={{
                height: 52,
                borderRadius: 14,
                backgroundColor: theme.primary,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                opacity: creatingOrganisation ? 0.7 : 1,
              }}
            >
              {creatingOrganisation ? (
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
                    Creating...
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
                  Create Organisation
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!creatingOrganisation) {
                  setShowOrganisationModal(false);
                }
              }}
              disabled={creatingOrganisation}
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
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDetailsModal}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: 'rgba(0,0,0,0.55)',
              justifyContent: 'center',
              padding: 20,
            },
          ]}
        >
          <View
            style={[
              styles.clientModalCard,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                borderWidth: 1,
                maxHeight: '88%',
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 2 }}
            >
              <View style={styles.clientModalHeader}>
                <View
                  style={[
                    styles.clientAvatar,
                    {
                      backgroundColor: theme.primarySoft,
                    },
                  ]}
                >
                  <Text
                    style={[styles.clientAvatarText, { color: theme.primary }]}
                  >
                    {selectedClient?.userName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>

                <View style={styles.clientHeaderInfo}>
                  <Text style={[styles.clientModalName, { color: theme.ink }]}>
                    {selectedClient?.userName}
                  </Text>

                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: theme.primarySoft,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.roleBadgeText, { color: theme.primary }]}
                    >
                      {selectedClient && getRoleLabel(selectedClient.role)}
                    </Text>
                  </View>

                  {selectedClient?.isRevoked && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: 7,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 20,
                        backgroundColor: '#FEE2E2',
                      }}
                    >
                      <Text
                        style={{
                          color: '#B91C1C',
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        ACCESS REVOKED
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={closeDetailsModal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.closeButtonText, { color: theme.ink }]}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.modalDivider,
                  { backgroundColor: theme.divider },
                ]}
              />

              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <View
                    style={[
                      styles.detailIcon,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={theme.primary}
                    />
                  </View>

                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme.muted }]}>
                      EMAIL
                    </Text>

                    <Text style={[styles.detailValue, { color: theme.ink }]}>
                      {selectedClient?.email || 'Not available'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View
                    style={[
                      styles.detailIcon,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color={theme.primary}
                    />
                  </View>

                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme.muted }]}>
                      PHONE NUMBER
                    </Text>

                    <Text style={[styles.detailValue, { color: theme.ink }]}>
                      {selectedClient?.mobileNumber || 'Not available'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View
                    style={[
                      styles.detailIcon,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color={theme.primary}
                    />
                  </View>

                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme.muted }]}>
                      ORGANISATION
                    </Text>

                    <Text style={[styles.detailValue, { color: theme.ink }]}>
                      {selectedClient?.organisation?.name || 'No Organisation'}
                    </Text>
                  </View>
                </View>

                {(selectedClient?.role === 'employee' ||
                  selectedClient?.role === 'client') && (
                  <View
                    style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}
                  >
                    <TouchableOpacity
                      onPress={openEditEmployee}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: theme.primarySoft,
                        borderColor: theme.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        paddingVertical: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: theme.primary, fontWeight: '800' }}>
                        Edit{' '}
                        {selectedClient?.role === 'employee'
                          ? 'Employee'
                          : 'Client'}
                      </Text>
                    </TouchableOpacity>
                    {selectedClient?.role === 'employee' && (
                      <TouchableOpacity
                        onPress={loadEmployeeAttendance}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          backgroundColor: theme.primary,
                          borderRadius: 10,
                          paddingVertical: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{ color: theme.everWhite, fontWeight: '800' }}
                        >
                          Attendance History
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {(selectedClient?.role === 'employee' ||
                  selectedClient?.role === 'client') && (
                  <TouchableOpacity
                    disabled={changingAccess}
                    onPress={() =>
                      changeUserAccess(
                        selectedClient?.isRevoked ? 'restore' : 'revoke',
                      )
                    }
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: selectedClient?.isRevoked
                        ? '#15803D'
                        : '#B91C1C',
                      borderRadius: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                      opacity: changingAccess ? 0.65 : 1,
                    }}
                  >
                    {changingAccess ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            selectedClient?.isRevoked
                              ? 'checkmark-circle-outline'
                              : 'ban-outline'
                          }
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 14,
                            fontWeight: '800',
                            marginLeft: 8,
                          }}
                        >
                          {selectedClient?.isRevoked
                            ? 'Restore Account Access'
                            : 'Revoke Account Access'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {selectedClient?.isRevoked && (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      backgroundColor: theme.background,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: '#B91C1C',
                        fontSize: 12,
                        fontWeight: '800',
                        marginBottom: 4,
                      }}
                    >
                      Account access is disabled
                    </Text>
                    {!!selectedClient.revokedAt && (
                      <Text style={{ color: theme.muted, fontSize: 12 }}>
                        Revoked:{' '}
                        {new Date(selectedClient.revokedAt).toLocaleString()}
                      </Text>
                    )}
                    {!!selectedClient.revokedReason && (
                      <Text
                        style={{
                          color: theme.muted,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        Reason: {selectedClient.revokedReason}
                      </Text>
                    )}
                  </View>
                )}

                {selectedClient?.role === 'employee' && (
                  <TouchableOpacity
                    onPress={openUploadModal}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: theme.primary,
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.everWhite,
                        fontSize: 14,
                        fontWeight: '800',
                      }}
                    >
                      + Upload Documents
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedClient?.role === 'client' && (
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.detailIcon,
                        { backgroundColor: theme.primarySoft },
                      ]}
                    >
                      <Text>👨‍💼</Text>
                    </View>

                    <View style={styles.detailContent}>
                      <Text
                        style={[styles.detailLabel, { color: theme.muted }]}
                      >
                        ASSIGNED EMPLOYEES
                      </Text>

                      {selectedClient?.assignedEmployee &&
                      selectedClient.assignedEmployee.length > 0 ? (
                        <View style={styles.employeeList}>
                          {selectedClient.assignedEmployee.map(employee => (
                            <View
                              key={employee._id}
                              style={[
                                styles.employeeChip,
                                {
                                  backgroundColor: theme.primarySoft,
                                  borderWidth: 1,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.employeeDot,
                                  { backgroundColor: theme.primary },
                                ]}
                              />

                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.employeeName,
                                    { color: theme.ink },
                                  ]}
                                >
                                  {employee.userName}
                                </Text>

                                {employee.designation && (
                                  <Text
                                    style={[
                                      styles.employeeDesignation,
                                      { color: theme.muted },
                                    ]}
                                  >
                                    {employee.designation}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.noEmployeeText,
                            { color: theme.muted },
                          ]}
                        >
                          No employee assigned
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={closeDetailsModal}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: theme.everWhite,
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ADMIN EDIT EMPLOYEE MODAL */}

      <Modal
        visible={editEmployeeVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeEditEmployeeModal}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            {
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
            },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '100%',
              alignSelf: 'center',
              backgroundColor: theme.background,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {/* HEADER */}
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: theme.divider,
              }}
            >
              <Text
                style={{
                  color: theme.ink,
                  fontSize: 20,
                  fontWeight: '800',
                }}
              >
                Edit{' '}
                {selectedClient?.role === 'employee' ? 'Employee' : 'Client'}
              </Text>

              <Text
                style={{
                  color: theme.muted,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Update account details and assignments.
              </Text>
            </View>

            {/* SCROLLABLE FORM */}
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingTop: 14,
                paddingBottom: 20,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {[
                {
                  label: 'USERNAME',
                  value: editEmployeeName,
                  set: setEditEmployeeName,
                  placeholder: 'Username',
                  keyboard: 'default',
                },
                {
                  label: 'EMAIL',
                  value: editEmployeeEmail,
                  set: setEditEmployeeEmail,
                  placeholder: 'Email address',
                  keyboard: 'email-address',
                },
                {
                  label: 'MOBILE NUMBER',
                  value: editEmployeeMobile,
                  set: (value: string) =>
                    setEditEmployeeMobile(
                      value.replace(/\D/g, '').slice(0, 10),
                    ),
                  placeholder: '10-digit mobile number',
                  keyboard: 'phone-pad',
                },
              ].map(field => (
                <View key={field.label} style={{ marginBottom: 13 }}>
                  <Text
                    style={{
                      color: theme.muted,
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.7,
                      marginBottom: 6,
                    }}
                  >
                    {field.label}
                  </Text>

                  <TextInput
                    value={field.value}
                    onChangeText={field.set}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.muted}
                    keyboardType={field.keyboard as any}
                    autoCapitalize={
                      field.keyboard === 'email-address' ? 'none' : 'sentences'
                    }
                    editable={!savingEmployee}
                    returnKeyType="next"
                    style={{
                      minHeight: 46,
                      color: theme.ink,
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 11,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                    }}
                  />
                </View>
              ))}

              {selectedClient?.role === 'employee' && (
                <View style={{ marginBottom: 13 }}>
                  <Text
                    style={{
                      color: theme.muted,
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.7,
                      marginBottom: 6,
                    }}
                  >
                    DESIGNATION
                  </Text>
                  <DesignationPicker
                    value={editEmployeeDesignation}
                    onChange={setEditEmployeeDesignation}
                    disabled={savingEmployee}
                    allowCreate
                  />
                </View>
              )}

              {/* OPTIONAL PASSWORD UPDATE */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 0.7,
                    marginBottom: 6,
                  }}
                >
                  NEW PASSWORD (OPTIONAL)
                </Text>

                <View
                  style={{
                    minHeight: 46,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 11,
                    paddingRight: 12,
                    backgroundColor: theme.background,
                  }}
                >
                  <TextInput
                    value={editEmployeePassword}
                    onChangeText={setEditEmployeePassword}
                    placeholder="Enter a new password"
                    placeholderTextColor={theme.muted}
                    secureTextEntry={!showEditPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    editable={!savingEmployee}
                    returnKeyType="done"
                    blurOnSubmit
                    style={{
                      flex: 1,
                      minHeight: 44,
                      color: theme.ink,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => setShowEditPassword(previous => !previous)}
                    disabled={savingEmployee}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showEditPassword ? 'Hide password' : 'Show password'
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      width: 34,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={
                        showEditPassword ? 'eye-off-outline' : 'eye-outline'
                      }
                      size={20}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                </View>

                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 11,
                    lineHeight: 16,
                    marginTop: 6,
                  }}
                >
                  Leave blank to keep the current password.
                </Text>
              </View>

              {/* ASSIGNED EMPLOYEES */}
              {selectedClient?.role === 'client' && (
                <View style={{ marginBottom: 14 }}>
                  <Text
                    style={{
                      color: theme.muted,
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.7,
                      marginBottom: 7,
                    }}
                  >
                    ASSIGNED EMPLOYEES
                  </Text>

                  <View
                    style={{
                      maxHeight: 160,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 11,
                      paddingHorizontal: 10,
                    }}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator
                    >
                      {employees.map(employee => {
                        const checked = editAssignedEmployees.includes(
                          employee._id,
                        );

                        return (
                          <TouchableOpacity
                            key={employee._id}
                            onPress={() =>
                              setEditAssignedEmployees(previous =>
                                checked
                                  ? previous.filter(id => id !== employee._id)
                                  : [...previous, employee._id],
                              )
                            }
                            disabled={savingEmployee}
                            activeOpacity={0.7}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.divider,
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text
                                style={{
                                  color: theme.ink,
                                  fontWeight: '700',
                                  fontSize: 13,
                                }}
                              >
                                {employee.userName}
                              </Text>

                              <Text
                                style={{
                                  color: theme.muted,
                                  fontSize: 11,
                                  marginTop: 3,
                                }}
                              >
                                {employee.designation || 'Employee'} ·{' '}
                                {employee.email}
                              </Text>
                            </View>

                            <Ionicons
                              name={
                                checked ? 'checkmark-circle' : 'ellipse-outline'
                              }
                              size={21}
                              color={checked ? theme.primary : theme.muted}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* FIXED ACTION BUTTONS */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: 14,
                borderTopWidth: 1,
                borderTopColor: theme.divider,
                backgroundColor: theme.background,
              }}
            >
              <TouchableOpacity
                onPress={closeEditEmployeeModal}
                disabled={savingEmployee}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ color: theme.ink, fontWeight: '700', fontSize: 13 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={updateSelectedEmployee}
                disabled={savingEmployee}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  minHeight: 44,
                  backgroundColor: theme.primary,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  opacity: savingEmployee ? 0.7 : 1,
                }}
              >
                {savingEmployee ? (
                  <ActivityIndicator color={theme.everWhite} />
                ) : (
                  <Text
                    style={{
                      color: theme.everWhite,
                      fontWeight: '800',
                      fontSize: 13,
                    }}
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EMPLOYEE ATTENDANCE HISTORY */}

      {/* EMPLOYEE ATTENDANCE HISTORY MODAL */}
      <Modal
        visible={attendanceVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
        onRequestClose={() => {
          setAttendanceVisible(false);
        }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: theme.background,
          }}
          edges={['top', 'left', 'right']}
        >
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            {/* HEADER */}
            <View
              style={{
                minHeight: 76,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: theme.ink,
                    fontSize: 19,
                    fontWeight: '800',
                  }}
                >
                  Attendance History
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.muted,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {selectedClient?.userName || 'Employee'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAttendanceVisible(false)}
                activeOpacity={0.6}
                disabled={false}
                accessibilityRole="button"
                accessibilityLabel="Close attendance history"
                style={{
                  width: 76,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.primarySoft,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            {/* ATTENDANCE HISTORY CONTENT */}
            <View style={{ flex: 1 }}>
              {selectedClient ? (
                <AttendanceHistory
                  key={selectedClient._id || selectedClient.id}
                  employeeId={selectedClient._id || selectedClient.id}
                  employeeName={selectedClient.userName}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.muted }}>
                    No employee selected.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (!uploadingDocuments) {
            setShowUploadModal(false);
          }
        }}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: 'rgba(0,0,0,0.55)',
              justifyContent: 'flex-end',
            },
          ]}
        >
          <View
            style={[
              styles.uploadModal,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                borderWidth: 1,
                maxHeight: '92%',
              },
            ]}
          >
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.modalTitle, { color: theme.ink }]}>
                    Upload Documents
                  </Text>

                  <Text style={[styles.modalSubtitle, { color: theme.muted }]}>
                    Assign documents directly to this employee.
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={uploadingDocuments}
                  onPress={() => setShowUploadModal(false)}
                  activeOpacity={0.7}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: theme.primarySoft,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.closeText, { color: theme.ink }]}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  backgroundColor: theme.primarySoft,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 15,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 0.8,
                    color: theme.primary,
                    marginBottom: 6,
                  }}
                >
                  ASSIGNED EMPLOYEE
                </Text>

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: theme.ink,
                  }}
                >
                  {selectedClient?.userName || 'Unknown employee'}
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: theme.muted,
                    marginTop: 4,
                  }}
                >
                  ID:{' '}
                  {selectedClient?._id || selectedClient?.id || 'Unavailable'}
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                DOCUMENT TITLE
              </Text>

              <TextInput
                value={documentTitle}
                onChangeText={setDocumentTitle}
                placeholder="e.g. Employment Documents"
                placeholderTextColor={theme.muted}
                editable={!uploadingDocuments}
                style={[
                  styles.titleInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.ink,
                    borderWidth: 1,
                  },
                ]}
              />

              <TouchableOpacity
                onPress={pickDocuments}
                disabled={uploadingDocuments}
                activeOpacity={0.8}
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: theme.primary,
                  backgroundColor: theme.primarySoft,
                  borderRadius: 15,
                  paddingVertical: 23,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="attach-outline"
                  size={28}
                  color={theme.primary}
                  style={{ marginBottom: 8 }}
                />

                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: theme.primary,
                  }}
                >
                  Select Files
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: theme.muted,
                    marginTop: 5,
                    textAlign: 'center',
                  }}
                >
                  Choose multiple documents
                </Text>
              </TouchableOpacity>

              {documentFiles.map((file, index) => (
                <View
                  key={`${file.uri}-${index}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    backgroundColor: theme.background,
                    marginBottom: 9,
                  }}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={23}
                    color={theme.primary}
                    style={{ marginRight: 11 }}
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: theme.ink,
                      }}
                    >
                      {file.name || 'Unnamed document'}
                    </Text>

                    {typeof file.size === 'number' && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.muted,
                          marginTop: 4,
                        }}
                      >
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    disabled={uploadingDocuments}
                    onPress={() => removeDocument(file.uri)}
                    activeOpacity={0.7}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: theme.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 21,
                        color: theme.primary,
                      }}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text
                style={{
                  fontSize: 11,
                  color: theme.muted,
                  marginBottom: 17,
                  marginTop: 3,
                }}
              >
                {documentFiles.length} file(s) selected · Maximum 10 files
              </Text>

              <TouchableOpacity
                onPress={uploadDocuments}
                disabled={uploadingDocuments}
                activeOpacity={0.8}
                style={{
                  minHeight: 52,
                  borderRadius: 14,
                  backgroundColor: theme.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  opacity: uploadingDocuments ? 0.7 : 1,
                }}
              >
                {uploadingDocuments ? (
                  <>
                    <ActivityIndicator color={theme.everWhite} size="small" />

                    <Text
                      style={{
                        color: theme.everWhite,
                        fontSize: 14,
                        fontWeight: '800',
                        marginLeft: 9,
                      }}
                    >
                      Uploading...
                    </Text>
                  </>
                ) : (
                  <Text
                    style={{
                      color: theme.everWhite,
                      fontSize: 14,
                      fontWeight: '800',
                    }}
                  >
                    Upload Documents
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={uploadingDocuments}
                onPress={() => setShowUploadModal(false)}
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
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ClientPage;
